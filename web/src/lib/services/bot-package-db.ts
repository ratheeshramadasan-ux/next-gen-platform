import { prisma } from "@/lib/prisma";
import {
  getAgentInstallerByTarget,
  getAgentInstallers,
  type AgentInstaller,
  type AgentTarget,
  type AgentVersion
} from "@/lib/agent-installers";

type ReleaseRow = {
  package_id: string;
  package_key: string;
  package_name: string;
  package_description: string | null;
  platform: AgentTarget;
  version_id: string | null;
  version: string | null;
  artifact_file_name: string | null;
  artifact_relative_path: string | null;
  signature_status: string | null;
  release_status: string | null;
  published_at: Date | null;
  compatibility_notes: string | null;
  supported_os: string | null;
  supported_arch: string | null;
  execution_mode: string | null;
  min_runtime_version: string | null;
  max_runtime_version: string | null;
};

type ReleaseVersion = AgentVersion & {
  versionId: string;
  artifactRelativePath: string | null;
  signatureStatus: string | null;
  releaseStatus: string | null;
  compatibility: Array<{ label: string; value: string }>;
};

type ReleaseAgent = AgentInstaller & {
  packageId: string | null;
  packageKey: string;
  availableVersions: ReleaseVersion[];
  selectedVersion: string | null;
};

type FallbackAgent = Awaited<ReturnType<typeof getAgentInstallers>>[number];

export async function getBotPackageCatalog() {
  const fallbackAgents = await buildFallbackAgents();

  try {
    const rows = await readReleaseRows();

    if (rows.length === 0) {
      return {
        source: "artifact-fallback" as const,
        agents: fallbackAgents
      };
    }

    return {
      source: "database" as const,
      agents: mergeReleaseRowsWithFallback(rows, fallbackAgents)
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return {
        source: "artifact-fallback" as const,
        agents: fallbackAgents
      };
    }

    throw error;
  }
}

export async function getBotPackageByTarget(
  target: AgentTarget,
  version?: string | null
) {
  const { agents } = await getBotPackageCatalog();
  const agent = agents.find((entry) => entry.target === target) ?? null;

  if (!agent) {
    return getAgentInstallerByTarget(target, version);
  }

  if (!version) {
    return { ...agent, versionLookupFailed: false };
  }

  const matchedVersion = agent.availableVersions.find(
    (entry) => entry.version === version
  );

  if (!matchedVersion) {
    return {
      ...agent,
      selectedVersion: version,
      status: "pending" as const,
      statusText: "Requested version not found",
      versionLookupFailed: true
    };
  }

  return {
    ...agent,
    selectedVersion: matchedVersion.version,
    versionLookupFailed: false
  };
}

export async function syncBotPackagesToDb() {
  const agents = await getAgentInstallers();

  for (const agent of agents) {
    const packageKey = `bot-runner-${agent.target}`;
    const packageResult = await prisma.$queryRaw<Array<{ id: string }>>`
      INSERT INTO platform.bot_runner_release_packages
        (package_key, name, description, agent_type, platform, distribution_type, runtime_family, scope, status, updated_at)
      VALUES
        (${packageKey}, ${agent.title}, ${agent.description}, ${agent.kind === "installer" ? "VM_AGENT" : "RUNTIME_BUNDLE"}, ${agent.target}, ${agent.format}, ${"dotnet-8"}, ${"GLOBAL"}, ${"ACTIVE"}, NOW())
      ON CONFLICT (package_key)
      DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        agent_type = EXCLUDED.agent_type,
        platform = EXCLUDED.platform,
        distribution_type = EXCLUDED.distribution_type,
        runtime_family = EXCLUDED.runtime_family,
        scope = EXCLUDED.scope,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id
    `;

    const packageId = packageResult[0]?.id;
    if (!packageId) {
      continue;
    }

    for (const version of agent.availableVersions) {
      const artifactRelativePath = version.fileName
        ? `${agent.target}/${version.fileName}`
        : null;

      const versionResult = await prisma.$queryRaw<Array<{ id: string }>>`
        INSERT INTO platform.bot_runner_release_versions
          (package_id, version, artifact_file_name, artifact_relative_path, published_at, release_status, signature_status, metadata, updated_at)
        VALUES
          (${packageId}, ${version.version}, ${version.fileName}, ${artifactRelativePath}, ${version.publishedAt ? new Date(version.publishedAt) : new Date()}, ${"PUBLISHED"}, ${agent.kind === "installer" ? "INTERNAL" : "N/A"}, ${JSON.stringify({ target: agent.target, kind: agent.kind })}::jsonb, NOW())
        ON CONFLICT (package_id, version)
        DO UPDATE SET
          artifact_file_name = EXCLUDED.artifact_file_name,
          artifact_relative_path = EXCLUDED.artifact_relative_path,
          published_at = EXCLUDED.published_at,
          release_status = EXCLUDED.release_status,
          signature_status = EXCLUDED.signature_status,
          metadata = EXCLUDED.metadata,
          updated_at = NOW()
        RETURNING id
      `;

      const versionId = versionResult[0]?.id;
      if (!versionId) {
        continue;
      }

      await prisma.$executeRaw`
        DELETE FROM platform.bot_runner_release_compatibility
        WHERE version_id = ${versionId}
      `;

      for (const row of buildCompatibilityRows(agent)) {
        await prisma.$executeRaw`
          INSERT INTO platform.bot_runner_release_compatibility
            (version_id, supported_os, supported_arch, execution_mode, min_runtime_version, max_runtime_version, notes, metadata, updated_at)
          VALUES
            (${versionId}, ${row.supportedOs}, ${row.supportedArch}, ${row.executionMode}, ${row.minRuntimeVersion}, ${row.maxRuntimeVersion}, ${row.notes}, ${JSON.stringify({ platform: agent.target })}::jsonb, NOW())
        `;
      }
    }
  }
}

export async function recordBotPackageDownloadAudit(payload: {
  target: AgentTarget;
  version: string | null;
  packageId: string | null;
  versionId: string | null;
  fileName: string | null;
  status: "SUCCESS" | "FAILED";
  requestIp: string | null;
  userAgent: string | null;
  tenantId?: string | null;
  userId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await prisma.$executeRaw`
      INSERT INTO platform.bot_runner_download_audit
        (tenant_id, user_id, package_id, version_id, target_platform, version, file_name, request_ip, user_agent, download_status, metadata)
      VALUES
        (${payload.tenantId ?? null}, ${payload.userId ?? null}, ${payload.packageId}, ${payload.versionId}, ${payload.target}, ${payload.version}, ${payload.fileName}, ${payload.requestIp}, ${payload.userAgent}, ${payload.status}, ${JSON.stringify(payload.metadata ?? {})}::jsonb)
    `;
  } catch (error) {
    if (!isMissingTableError(error)) {
      console.error("Failed to record bot package download audit:", error);
    }
  }
}

async function buildFallbackAgents() {
  const fallbackAgents = await getAgentInstallers();

  return fallbackAgents.map((agent) => ({
    ...agent,
    packageId: null,
    packageKey: `bot-runner-${agent.target}`,
    availableVersions: agent.availableVersions.map((entry) => ({
      ...entry,
      versionId: `${agent.target}-${entry.version}`,
      artifactRelativePath: entry.fileName
        ? `${agent.target}/${entry.fileName}`
        : null,
      signatureStatus: agent.kind === "installer" ? "INTERNAL" : "N/A",
      releaseStatus: "PUBLISHED",
      compatibility: buildCompatibilityLabels(agent)
    }))
  })) as ReleaseAgent[];
}

function mergeReleaseRowsWithFallback(
  rows: ReleaseRow[],
  fallbackAgents: ReleaseAgent[]
) {
  const grouped = new Map<AgentTarget, ReleaseRow[]>();
  for (const row of rows) {
    if (!grouped.has(row.platform)) {
      grouped.set(row.platform, []);
    }
    grouped.get(row.platform)!.push(row);
  }

  return fallbackAgents.map((fallback) => {
    const rowsForTarget = grouped.get(fallback.target) ?? [];
    if (rowsForTarget.length === 0) {
      return fallback;
    }

    const versionMap = new Map<string, ReleaseVersion>();
    const packageRow = rowsForTarget[0];

    for (const row of rowsForTarget) {
      if (!row.version || !row.version_id) {
        continue;
      }

      const compatibility = buildCompatibilityLabelsFromRow(row);
      const existing = versionMap.get(row.version);
      if (existing) {
        existing.compatibility.push(...compatibility);
        continue;
      }

      versionMap.set(row.version, {
        version: row.version,
        fileName: row.artifact_file_name,
        publishedAt: row.published_at?.toISOString().slice(0, 10),
        versionId: row.version_id,
        artifactRelativePath: row.artifact_relative_path,
        signatureStatus: row.signature_status,
        releaseStatus: row.release_status,
        compatibility
      });
    }

    const availableVersions = Array.from(versionMap.values()).sort(
      compareVersionsDesc
    );

    // Merge: start with DB versions, then backfill any versions from the
    // manifest / filesystem that the DB doesn't have yet.  This ensures
    // newly-published artifacts are available immediately without a sync.
    const dbVersionSet = new Set(availableVersions.map((v) => v.version));
    const backfilledVersions: ReleaseVersion[] = fallback.availableVersions
      .filter((v) => !dbVersionSet.has(v.version))
      .map((v) => ({
        ...v,
        versionId: `${fallback.target}-${v.version}`,
        artifactRelativePath: v.fileName ? `${fallback.target}/${v.fileName}` : null,
        signatureStatus: fallback.kind === "installer" ? "INTERNAL" : "N/A",
        releaseStatus: "PUBLISHED",
        compatibility: buildCompatibilityLabels(fallback),
      }));
    const effectiveVersions: ReleaseVersion[] =
      [...availableVersions, ...backfilledVersions].sort(compareVersionsDesc);
    const selected = effectiveVersions[0];

    return {
      ...fallback,
      packageId: packageRow.package_id,
      packageKey: packageRow.package_key,
      title: packageRow.package_name,
      description: packageRow.package_description ?? fallback.description,
      status:
        fallback.kind === "installer"
          ? effectiveVersions.length > 0
            ? "available"
            : "pending"
          : fallback.status,
      statusText:
        fallback.kind === "installer"
          ? effectiveVersions.length > 0
            ? `${fallback.format} available`
            : "Installer build pending"
          : effectiveVersions.length > 0
            ? `${fallback.format} available`
            : fallback.statusText,
      availableVersions: effectiveVersions,
      selectedVersion: selected?.version ?? null,
      fileName: selected?.fileName ?? fallback.fileName,
      specs: mergeCompatibilityIntoSpecs(fallback, selected)
    } satisfies ReleaseAgent;
  });
}

async function readReleaseRows() {
  return prisma.$queryRaw<ReleaseRow[]>`
    SELECT
      p.id AS package_id,
      p.package_key,
      p.name AS package_name,
      p.description AS package_description,
      p.platform,
      v.id AS version_id,
      v.version,
      v.artifact_file_name,
      v.artifact_relative_path,
      v.signature_status,
      v.release_status,
      v.published_at,
      c.notes AS compatibility_notes,
      c.supported_os,
      c.supported_arch,
      c.execution_mode,
      c.min_runtime_version,
      c.max_runtime_version
    FROM platform.bot_runner_release_packages p
    LEFT JOIN platform.bot_runner_release_versions v
      ON v.package_id = p.id
    LEFT JOIN platform.bot_runner_release_compatibility c
      ON c.version_id = v.id
    WHERE p.status = 'ACTIVE'
      AND (v.release_status IS NULL OR v.release_status = 'PUBLISHED')
    ORDER BY p.platform ASC, v.version DESC, v.published_at DESC
  `;
}

function buildCompatibilityRows(agent: FallbackAgent) {
  switch (agent.target) {
    case "windows":
      return [
        {
          supportedOs: "Windows",
          supportedArch: "x64",
          executionMode: "ATTENDED,UNATTENDED",
          minRuntimeVersion: "self-contained (net8.0)",
          maxRuntimeVersion: null,
          notes: "Fully self-contained — no external dependencies"
        }
      ];
    case "linux":
      return [
        {
          supportedOs: "Linux",
          supportedArch: "x64",
          executionMode: "UNATTENDED",
          minRuntimeVersion: "self-contained (net8.0)",
          maxRuntimeVersion: null,
          notes: "Fully self-contained — no external dependencies"
        }
      ];
    case "mac":
      return [
        {
          supportedOs: "macOS",
          supportedArch: "arm64,x64",
          executionMode: "ATTENDED,UNATTENDED",
          minRuntimeVersion: "self-contained (net8.0)",
          maxRuntimeVersion: null,
          notes: "Fully self-contained — no external dependencies"
        }
      ];
    case "docker":
      return [
        {
          supportedOs: "Container",
          supportedArch: "x64",
          executionMode: "UNATTENDED",
          minRuntimeVersion: "dotnet-runtime-8.0",
          maxRuntimeVersion: null,
          notes: "Container bundle"
        }
      ];
    case "k8s":
      return [
        {
          supportedOs: "Kubernetes",
          supportedArch: "x64",
          executionMode: "UNATTENDED",
          minRuntimeVersion: "cluster-hpa",
          maxRuntimeVersion: null,
          notes: "Kubernetes deployment"
        }
      ];
    case "alo":
      return [
        {
          supportedOs: "macOS,Windows,Linux",
          supportedArch: "arm64,x64",
          executionMode: "ATTENDED",
          minRuntimeVersion: "self-contained (net8.0 + electron-28)",
          maxRuntimeVersion: null,
          notes: "Fully self-contained — no external dependencies"
        }
      ];
    case "uao-sdk":
      return [
        {
          supportedOs: "Windows,macOS,Linux,Docker,Kubernetes",
          supportedArch: "x64,arm64",
          executionMode: "ATTENDED,UNATTENDED",
          minRuntimeVersion: "Node.js 18+",
          maxRuntimeVersion: null,
          notes: "Install via pnpm add @nextgen/universal-agent-object"
        }
      ];
  }
}

function buildCompatibilityLabels(agent: FallbackAgent) {
  return buildCompatibilityRows(agent).flatMap((row) =>
    buildCompatibilityLabelsFromValues(row)
  );
}

function buildCompatibilityLabelsFromRow(row: ReleaseRow) {
  return buildCompatibilityLabelsFromValues({
    supportedOs: row.supported_os,
    supportedArch: row.supported_arch,
    executionMode: row.execution_mode,
    minRuntimeVersion: row.min_runtime_version,
    maxRuntimeVersion: row.max_runtime_version,
    notes: row.compatibility_notes
  });
}

function buildCompatibilityLabelsFromValues(values: {
  supportedOs: string | null;
  supportedArch: string | null;
  executionMode: string | null;
  minRuntimeVersion: string | null;
  maxRuntimeVersion: string | null;
  notes: string | null;
}) {
  const labels: Array<{ label: string; value: string }> = [];
  if (values.supportedOs) labels.push({ label: "Supported OS", value: values.supportedOs });
  if (values.supportedArch) labels.push({ label: "Supported Arch", value: values.supportedArch });
  if (values.executionMode) labels.push({ label: "Execution Mode", value: values.executionMode });
  if (values.minRuntimeVersion) labels.push({ label: "Min Runtime", value: values.minRuntimeVersion });
  if (values.maxRuntimeVersion) labels.push({ label: "Max Runtime", value: values.maxRuntimeVersion });
  if (values.notes) labels.push({ label: "Compatibility", value: values.notes });
  return labels;
}

function mergeCompatibilityIntoSpecs(
  fallback: FallbackAgent,
  selected?: ReleaseVersion
) {
  if (!selected || selected.compatibility.length === 0) {
    return fallback.specs;
  }

  const base = new Map(fallback.specs.map((entry) => [entry.label, entry.value]));
  for (const item of selected.compatibility) {
    if (!base.has(item.label)) {
      base.set(item.label, item.value);
    }
  }

  return Array.from(base.entries()).map(([label, value]) => ({ label, value }));
}

function compareVersionsDesc(left: AgentVersion, right: AgentVersion) {
  return right.version.localeCompare(left.version, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function isMissingTableError(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return (
      error.message.includes("bot_runner_release_packages") ||
      error.message.includes("does not exist")
    );
  }

  return false;
}
