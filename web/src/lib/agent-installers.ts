import { promises as fs } from "node:fs";
import path from "node:path";

export type AgentTarget =
  | "windows"
  | "linux"
  | "mac"
  | "docker"
  | "k8s"
  | "alo"
  | "uao-sdk";

export type AgentKind = "installer" | "bundle";

export type AgentVersion = {
  version: string;
  fileName: string | null;
  publishedAt?: string;
  changelog?: string;
};

export type AgentInstaller = {
  target: AgentTarget;
  title: string;
  description: string;
  detail: string;
  kind: AgentKind;
  format: string;
  artifactRelativePath: string | null;
  fileName: string | null;
  downloadLabel: string;
  status: "available" | "pending";
  statusText: string;
  silentInstall?: string;
  specs: Array<{ label: string; value: string }>;
  availableVersions: AgentVersion[];
  selectedVersion: string | null;
};

type ManifestShape = {
  agents: Partial<Record<AgentTarget, AgentVersion[]>>;
};

const repoRoot = path.join(process.cwd(), "..");
const artifactsRoot = path.join(repoRoot, "artifacts", "bot-runner");
const manifestPath = path.join(artifactsRoot, "manifest.json");

const installerCatalog: Omit<
  AgentInstaller,
  "availableVersions" | "selectedVersion"
>[] = [
  {
    target: "windows",
    title: "Windows VM Agent",
    description:
      "Self-contained installer for Windows Server — all dependencies bundled, no external prerequisites.",
    detail:
      "Ships with the embedded .NET 8 runtime, orchestrator client, and heartbeat service. Designed for silent deployment through endpoint tooling without manual setup or prerequisite installation.",
    kind: "installer",
    format: ".exe self-contained installer",
    artifactRelativePath: "windows/BotRunnerSetup-win-x64.exe",
    fileName: "BotRunnerSetup-win-x64.exe",
    downloadLabel: "Download Installer",
    status: "pending",
    statusText: "Installer build pending",
    silentInstall: "BotRunnerSetup-win-x64.exe /quiet /norestart",
    specs: [
      { label: "Supported host", value: "Windows Server / Windows x64" },
      { label: "Embedded runtime", value: ".NET 8.0 (self-contained)" },
      { label: "Installer format", value: ".exe" },
      { label: "Dependencies", value: "None — fully self-contained" }
    ]
  },
  {
    target: "linux",
    title: "Linux VM Agent",
    description:
      "Self-contained package for headless Linux VMs — all dependencies bundled, no external prerequisites.",
    detail:
      "Ships with the embedded .NET 8 runtime, orchestrator client, and systemd service unit. Designed for unattended deployment through apt-compatible provisioning workflows without manual runtime installation.",
    kind: "installer",
    format: ".deb self-contained package",
    artifactRelativePath: "linux/bot-runner_1.0.0_amd64.deb",
    fileName: "bot-runner_1.0.0_amd64.deb",
    downloadLabel: "Download Installer",
    status: "pending",
    statusText: "Installer build pending",
    silentInstall: "sudo dpkg -i bot-runner_1.0.0_amd64.deb",
    specs: [
      { label: "Supported host", value: "Linux x64 VM" },
      { label: "Embedded runtime", value: ".NET 8.0 (self-contained)" },
      { label: "Installer format", value: ".deb" },
      { label: "Service model", value: "systemd" },
      { label: "Dependencies", value: "None — fully self-contained" }
    ]
  },
  {
    target: "mac",
    title: "Mac Agent",
    description:
      "Self-contained installer for macOS — all dependencies bundled, no external prerequisites.",
    detail:
      "Ships with the embedded .NET 8 runtime, Electron 28 shell, and orchestrator client. Supports real-time heartbeat telemetry and system tray management on both Apple Silicon and Intel with zero manual dependency installation.",
    kind: "installer",
    format: ".pkg self-contained installer",
    artifactRelativePath: "mac/BotRunnerSetup-macos-universal.pkg",
    fileName: "BotRunnerSetup-macos-universal.pkg",
    downloadLabel: "Download Installer",
    status: "pending",
    statusText: "Installer build pending",
    silentInstall:
      "sudo installer -pkg BotRunnerSetup-macos-universal.pkg -target /",
    specs: [
      { label: "Supported host", value: "macOS Apple Silicon / Intel" },
      { label: "Embedded runtime", value: ".NET 8.0 (self-contained)" },
      { label: "Embedded shell", value: "Electron 28 + Tray UI" },
      { label: "Installer format", value: ".pkg" },
      { label: "Service model", value: "launchd + Desktop App" },
      { label: "Dependencies", value: "None — fully self-contained" }
    ]
  },
  {
    target: "docker",
    title: "Docker Agent",
    description:
      "Containerized runner package for portable deployment in Docker environments.",
    detail:
      "Distributed as a deployment bundle because Docker targets images rather than host installers.",
    kind: "bundle",
    format: "Container bundle",
    artifactRelativePath: null,
    fileName: null,
    downloadLabel: "Download Bundle",
    status: "available",
    statusText: "Deployment bundle available",
    specs: [
      { label: "Base image", value: "mcr.microsoft.com/dotnet/runtime:8.0" },
      { label: "Container entrypoint", value: "dotnet BotRunner.dll" },
      { label: "Mode", value: "RUNNER_MODE=DOCKER" },
      { label: "Best for", value: "Portable unattended workloads" }
    ]
  },
  {
    target: "k8s",
    title: "Kubernetes Agent",
    description:
      "Manifest bundle for running the bot runner as a Kubernetes deployment.",
    detail:
      "Distributed as a manifest bundle because Kubernetes targets cluster rollout assets rather than local installers.",
    kind: "bundle",
    format: "YAML manifest bundle",
    artifactRelativePath: null,
    fileName: null,
    downloadLabel: "Download Bundle",
    status: "available",
    statusText: "Manifest bundle available",
    specs: [
      { label: "Image ref", value: "rpa/bot-runner:latest" },
      { label: "Default replicas", value: "3" },
      { label: "Autoscaling", value: "2-20 pods" },
      { label: "Mode", value: "RUNNER_MODE=K8S" }
    ]
  },
  {
    target: "uao-sdk" as AgentTarget,
    title: "Universal Agent SDK",
    description:
      "TypeScript/Node.js SDK for embedding the Universal Automation Capture & Execution Layer into any runtime environment.",
    detail:
      "Install via npm/pnpm to embed agent identity, heartbeat, step dispatching, and cross-platform executor wiring directly into your Node.js or Electron application. Supports Windows, macOS, Linux, Docker, and Kubernetes out of the box.",
    kind: "bundle",
    format: "npm package",
    artifactRelativePath: null,
    fileName: null,
    downloadLabel: "Install Package",
    status: "available",
    statusText: "npm package available",
    specs: [
      { label: "Package", value: "@nextgen/universal-agent-object" },
      { label: "Runtime", value: "Node.js 18+ / TypeScript 5+" },
      { label: "Platforms", value: "Windows · macOS · Linux · Docker · K8s" },
      { label: "Install", value: "pnpm add @nextgen/universal-agent-object" },
      { label: "Schema", value: "Zod-validated UAO contract" },
      { label: "Executors", value: "Web · UIA · AX · AT-SPI · Terminal · API" }
    ]
  },
];


export async function getAgentInstallers(): Promise<AgentInstaller[]> {
  const manifest = await loadManifest();

  return Promise.all(
    installerCatalog.map(async (agent) => {
      const availableVersions = await resolveAvailableVersions(
        agent.target,
        manifest
      );
      const selectedVersion = availableVersions[0]?.version ?? null;

      if (agent.kind === "bundle") {
        return {
          ...agent,
          availableVersions,
          selectedVersion
        };
      }

      if (availableVersions.length === 0) {
        return {
          ...agent,
          availableVersions: [],
          selectedVersion: null
        };
      }

      return {
        ...agent,
        fileName: availableVersions[0]?.fileName ?? agent.fileName,
        status: "available" as const,
        statusText: `${agent.format} available`,
        availableVersions,
        selectedVersion
      };
    })
  );
}

export async function getAgentInstallerByTarget(
  target: AgentTarget,
  version?: string | null
) {
  const agents = await getAgentInstallers();
  const agent = agents.find((item) => item.target === target) ?? null;

  if (!agent) {
    return null;
  }

  const resolvedVersion =
    version ??
    agent.selectedVersion ??
    agent.availableVersions[0]?.version ??
    null;

  return {
    ...agent,
    selectedVersion: resolvedVersion
  };
}

export function getArtifactAbsolutePath(
  agent: Pick<AgentInstaller, "target" | "selectedVersion" | "availableVersions">
) {
  const selected = agent.availableVersions.find(
    (entry) => entry.version === agent.selectedVersion
  );

  if (!selected?.fileName) {
    return null;
  }

  return path.join(artifactsRoot, agent.target, selected.fileName);
}

async function resolveAvailableVersions(
  target: AgentTarget,
  manifest: ManifestShape
): Promise<AgentVersion[]> {
  const manifestVersions = manifest.agents[target] ?? [];

  if (manifestVersions.length > 0) {
    return manifestVersions
      .map((entry) => ({ ...entry }))
      .sort(compareVersionsDesc);
  }

  return scanVersionsFromFilesystem(target);
}

async function scanVersionsFromFilesystem(
  target: AgentTarget
): Promise<AgentVersion[]> {
  const targetDir = path.join(artifactsRoot, target);

  let entries: string[];
  try {
    entries = await fs.readdir(targetDir);
  } catch {
    return [];
  }

  if (target === "linux") {
    return entries
      .filter((fileName) => fileName.endsWith(".deb"))
      .map((fileName): AgentVersion | null => {
        const match = fileName.match(/bot-runner_(.+)_amd64\.deb$/);
        return match ? { version: match[1], fileName } : null;
      })
      .filter((entry): entry is AgentVersion => entry !== null)
      .sort(compareVersionsDesc);
  }

  if (target === "mac") {
    const hasPkg = entries.includes("BotRunnerSetup-macos-universal.pkg");
    return hasPkg
      ? [{ version: "0.1.0", fileName: "BotRunnerSetup-macos-universal.pkg" }]
      : [];
  }

  if (target === "windows") {
    const exes = entries.filter((fileName) => fileName.endsWith(".exe"));
    return exes.map((fileName) => ({
      version: "0.1.0",
      fileName
    }));
  }

  return [];
}

async function loadManifest(): Promise<ManifestShape> {
  try {
    const raw = await fs.readFile(manifestPath, "utf8");
    return JSON.parse(raw) as ManifestShape;
  } catch {
    return { agents: {} };
  }
}

function compareVersionsDesc(left: AgentVersion, right: AgentVersion) {
  return right.version.localeCompare(left.version, undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

