import fs from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";
import { Pool } from "pg";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const repoRoot = process.cwd();
const artifactsRoot = path.join(repoRoot, "artifacts", "bot-runner");
const manifestPath = path.join(artifactsRoot, "manifest.json");

const packageCatalog = {
  windows: {
    title: "Windows VM Agent",
    description:
      "Best for Windows Server based attended or unattended bot hosts.",
    kind: "installer",
    format: ".exe silent installer",
    compatibility: [
      {
        supportedOs: "Windows",
        supportedArch: "x64",
        executionMode: "ATTENDED,UNATTENDED",
        minRuntimeVersion: "net8.0",
        maxRuntimeVersion: null,
        notes: "Windows Service runtime"
      }
    ]
  },
  linux: {
    title: "Linux VM Agent",
    description:
      "Best for headless Linux virtual machines and private cloud workers.",
    kind: "installer",
    format: ".deb package",
    compatibility: [
      {
        supportedOs: "Linux",
        supportedArch: "x64",
        executionMode: "UNATTENDED",
        minRuntimeVersion: "net8.0",
        maxRuntimeVersion: null,
        notes: "systemd-based runtime"
      }
    ]
  },
  mac: {
    title: "Mac Agent",
    description:
      "Best for macOS bot hosts, test machines, and Apple Silicon or Intel developer devices.",
    kind: "installer",
    format: ".pkg installer",
    compatibility: [
      {
        supportedOs: "macOS",
        supportedArch: "arm64,x64",
        executionMode: "ATTENDED,UNATTENDED",
        minRuntimeVersion: "net8.0",
        maxRuntimeVersion: null,
        notes: "launchd-based runtime"
      }
    ]
  },
  docker: {
    title: "Docker Agent",
    description:
      "Containerized runner package for portable deployment in Docker environments.",
    kind: "bundle",
    format: "Container bundle",
    compatibility: [
      {
        supportedOs: "Container",
        supportedArch: "x64",
        executionMode: "UNATTENDED",
        minRuntimeVersion: "dotnet-runtime-8.0",
        maxRuntimeVersion: null,
        notes: "Container bundle"
      }
    ]
  },
  k8s: {
    title: "Kubernetes Agent",
    description:
      "Manifest bundle for running the bot runner as a Kubernetes deployment.",
    kind: "bundle",
    format: "YAML manifest bundle",
    compatibility: [
      {
        supportedOs: "Kubernetes",
        supportedArch: "x64",
        executionMode: "UNATTENDED",
        minRuntimeVersion: "cluster-hpa",
        maxRuntimeVersion: null,
        notes: "Kubernetes deployment"
      }
    ]
  }
};

async function main() {
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    for (const [target, metadata] of Object.entries(packageCatalog)) {
      const packageKey = `bot-runner-${target}`;
      const packageResult = await client.query(
        `
          INSERT INTO platform.bot_runner_release_packages
            (package_key, name, description, agent_type, platform, distribution_type, runtime_family, scope, status, updated_at)
          VALUES
            ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
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
        `,
        [
          packageKey,
          metadata.title,
          metadata.description,
          metadata.kind === "installer" ? "VM_AGENT" : "RUNTIME_BUNDLE",
          target,
          metadata.format,
          "dotnet-8",
          "GLOBAL",
          "ACTIVE"
        ]
      );

      const packageId = packageResult.rows[0]?.id;
      if (!packageId) {
        continue;
      }

      const versions = manifest.agents?.[target] ?? [];
      for (const version of versions) {
        const artifactRelativePath = version.fileName
          ? `${target}/${version.fileName}`
          : null;

        const versionResult = await client.query(
          `
            INSERT INTO platform.bot_runner_release_versions
              (package_id, version, artifact_file_name, artifact_relative_path, published_at, release_status, signature_status, metadata, updated_at)
            VALUES
              ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
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
          `,
          [
            packageId,
            version.version,
            version.fileName,
            artifactRelativePath,
            version.publishedAt ?? new Date().toISOString(),
            "PUBLISHED",
            metadata.kind === "installer" ? "INTERNAL" : "N/A",
            JSON.stringify({ target, kind: metadata.kind })
          ]
        );

        const versionId = versionResult.rows[0]?.id;
        if (!versionId) {
          continue;
        }

        await client.query(
          `
            DELETE FROM platform.bot_runner_release_compatibility
            WHERE version_id = $1
          `,
          [versionId]
        );

        for (const compatibility of metadata.compatibility) {
          await client.query(
            `
              INSERT INTO platform.bot_runner_release_compatibility
                (version_id, supported_os, supported_arch, execution_mode, min_runtime_version, max_runtime_version, notes, metadata, updated_at)
              VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
            `,
            [
              versionId,
              compatibility.supportedOs,
              compatibility.supportedArch,
              compatibility.executionMode,
              compatibility.minRuntimeVersion,
              compatibility.maxRuntimeVersion,
              compatibility.notes,
              JSON.stringify({ platform: target })
            ]
          );
        }
      }
    }

    await client.query("COMMIT");
    console.log("Bot Runner release catalog synced.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Failed to sync Bot Runner release catalog:", error);
  process.exitCode = 1;
});
