import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  getArtifactAbsolutePath,
  type AgentTarget
} from "@/lib/agent-installers";
import {
  getBotPackageByTarget,
  recordBotPackageDownloadAudit
} from "@/lib/services/bot-package-db";

const runnerRoot = path.join(
  process.cwd(),
  "..",
  "services",
  "bot-runner-dotnet"
);
const dockerRoot = path.join(process.cwd(), "..", "docker");
const k8sRoot = path.join(process.cwd(), "..", "infra", "k8s");

const filesToBundle = [
  "BotRunner.csproj",
  "Program.cs",
  "BotWorker.cs",
  "JobProcessor.cs",
  "OrchestratorClient.cs",
  "RunnerJob.cs"
];

export async function GET(request: NextRequest) {
  const requestedTarget = request.nextUrl.searchParams.get("target");
  const requestedVersion = request.nextUrl.searchParams.get("version");
  const target = normalizeTarget(requestedTarget);

  if (!target) {
    return NextResponse.json(
      {
        status: "INVALID_TARGET",
        message: "The requested Bot Runner target is not supported.",
        requestedTarget
      },
      { status: 400 }
    );
  }

  const installer = await getBotPackageByTarget(
    target as AgentTarget,
    requestedVersion
  );

  const requestIp = request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");

  if (!installer) {
    await recordBotPackageDownloadAudit({
      target,
      version: requestedVersion,
      packageId: null,
      versionId: null,
      fileName: null,
      status: "FAILED",
      requestIp,
      userAgent,
      metadata: {
        error: "PACKAGE_NOT_FOUND"
      }
    });

    return NextResponse.json(
      {
        status: "PACKAGE_NOT_FOUND",
        message: "No Bot Runner package is registered for this target.",
        target,
        requestedVersion
      },
      { status: 404 }
    );
  }

  if ("versionLookupFailed" in installer && installer.versionLookupFailed) {
    await recordBotPackageDownloadAudit({
      target,
      version: requestedVersion,
      packageId: "packageId" in installer ? installer.packageId : null,
      versionId: null,
      fileName: null,
      status: "FAILED",
      requestIp,
      userAgent,
      metadata: {
        error: "VERSION_NOT_FOUND",
        availableVersions: installer.availableVersions.map((entry) => entry.version)
      }
    });

    return NextResponse.json(
      {
        status: "VERSION_NOT_FOUND",
        message: "The requested Bot Runner version is not published for this target.",
        target,
        requestedVersion,
        availableVersions: installer.availableVersions.map((entry) => entry.version)
      },
      { status: 404 }
    );
  }

  if (installer?.kind === "installer") {
    if (installer.status !== "available") {
      await recordBotPackageDownloadAudit({
        target,
        version: installer.selectedVersion,
        packageId: "packageId" in installer ? installer.packageId : null,
        versionId: getSelectedVersionId(installer),
        fileName: installer.fileName,
        status: "FAILED",
        requestIp,
        userAgent,
        metadata: {
          error: "INSTALLER_NOT_PUBLISHED"
        }
      });

      return NextResponse.json(
        {
          status: "INSTALLER_NOT_PUBLISHED",
          message:
            "A real unattended installer has not been published for this target yet.",
          target,
          requestedVersion,
          expectedFormat: installer.format,
          expectedArtifact: installer.fileName,
          silentInstall: installer.silentInstall ?? null
        },
        { status: 404 }
      );
    }

    const artifactPath = getArtifactAbsolutePath(installer);

    if (!artifactPath) {
      await recordBotPackageDownloadAudit({
        target,
        version: installer.selectedVersion,
        packageId: "packageId" in installer ? installer.packageId : null,
        versionId: getSelectedVersionId(installer),
        fileName: installer.fileName,
        status: "FAILED",
        requestIp,
        userAgent,
        metadata: {
          error: "ARTIFACT_PATH_MISSING"
        }
      });

      return NextResponse.json(
        {
          status: "INSTALLER_NOT_PUBLISHED",
          message: "Installer metadata is incomplete for this target.",
          target,
          requestedVersion
        },
        { status: 500 }
      );
    }

    const bytes = await fs.readFile(artifactPath);

    await recordBotPackageDownloadAudit({
      target,
      version: installer.selectedVersion,
      packageId: "packageId" in installer ? installer.packageId : null,
      versionId: getSelectedVersionId(installer),
      fileName: installer.fileName,
      status: "SUCCESS",
      requestIp,
      userAgent,
      metadata: {
        delivery: "installer"
      }
    });

    return new NextResponse(bytes, {
      headers: {
        "Content-Type": getInstallerContentType(installer.fileName ?? ""),
        "Content-Disposition": `attachment; filename="${installer.fileName}"`
      }
    });
  }

  const bundle = await buildBundle(target);

  await recordBotPackageDownloadAudit({
    target,
    version: installer.selectedVersion,
    packageId: "packageId" in installer ? installer.packageId : null,
    versionId: getSelectedVersionId(installer),
    fileName: installer.fileName,
    status: "SUCCESS",
    requestIp,
    userAgent,
    metadata: {
      delivery: "bundle"
    }
  });

  return new NextResponse(bundle, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="bot-runner-vm-agent-${target}.txt"`
    }
  });
}

function normalizeTarget(value: string | null): AgentTarget | null {
  if (
    value === "windows" ||
    value === "linux" ||
    value === "mac" ||
    value === "docker" ||
    value === "k8s" ||
    value === "alo" ||
    value === "uao-sdk"
  ) {
    return value;
  }

  return null;
}

function getSelectedVersionId(installer: {
  selectedVersion: string | null;
  availableVersions: Array<{ version: string; versionId?: string }>;
}) {
  return (
    installer.availableVersions.find(
      (entry) => entry.version === installer.selectedVersion
    )?.versionId ?? null
  );
}

function getInstallerContentType(fileName: string) {
  if (fileName.endsWith(".exe")) {
    return "application/vnd.microsoft.portable-executable";
  }

  if (fileName.endsWith(".deb")) {
    return "application/vnd.debian.binary-package";
  }

  if (fileName.endsWith(".pkg")) {
    return "application/octet-stream";
  }

  return "application/octet-stream";
}

async function buildBundle(
  target: "windows" | "linux" | "mac" | "docker" | "k8s" | "alo"
) {
  if (target === "docker") {
    return buildDockerBundle();
  }

  if (target === "k8s") {
    return buildK8sBundle();
  }

  const fileContents = await Promise.all(
    filesToBundle.map(async (fileName) => {
      const content = await fs.readFile(path.join(runnerRoot, fileName), "utf8");
      return `===== ${fileName} =====\n${content.trim()}\n`;
    })
  );

  const installGuide =
    target === "windows"
      ? windowsInstallGuide
      : target === "linux"
        ? linuxInstallGuide
        : macInstallGuide;

  return [
    "Bot Runner VM Agent Starter Package",
    `Target: ${target.toUpperCase()}`,
    "",
    "This bundle contains the universal .NET runner source and a setup guide.",
    "Compile it for your VM, then install it as a Windows Service or systemd service.",
    "",
    "===== INSTALL.md =====",
    installGuide.trim(),
    "",
    ...fileContents
  ].join("\n");
}

const windowsInstallGuide = `
# Windows VM install

1. Install the .NET 8 SDK on the target VM.
2. Save the included files into a folder named \`bot-runner-dotnet\`.
3. Publish the service:
   \`dotnet publish -c Release -r win-x64 --self-contained false -o publish\`
4. Set environment variables such as \`ORCHESTRATOR_URL\` and \`RUNNER_MODE=VM\`.
5. Register the service:
   \`sc create BotRunner binPath= "C:\\\\path\\\\to\\\\publish\\\\BotRunner.exe"\`
`;

const linuxInstallGuide = `
# Linux VM install

1. Install the .NET 8 SDK or runtime on the target VM.
2. Save the included files into a folder named \`bot-runner-dotnet\`.
3. Publish the service:
   \`dotnet publish -c Release -r linux-x64 --self-contained false -o publish\`
4. Set environment variables such as \`ORCHESTRATOR_URL\` and \`RUNNER_MODE=VM\`.
5. Create a systemd unit:

   [Unit]
   Description=Bot Runner Agent

   [Service]
   WorkingDirectory=/opt/bot-runner
   ExecStart=/usr/bin/dotnet /opt/bot-runner/BotRunner.dll
   Restart=always

   [Install]
   WantedBy=multi-user.target
`;

const macInstallGuide = `
# macOS agent install

1. Install the .NET 8 SDK on the target Mac.
2. Save the included files into a folder named \`bot-runner-dotnet\`.
3. Publish the service:
   \`dotnet publish -c Release -r osx-arm64 --self-contained false -o publish\`
   For Intel Macs use:
   \`dotnet publish -c Release -r osx-x64 --self-contained false -o publish\`
4. Set environment variables such as \`ORCHESTRATOR_URL\` and \`RUNNER_MODE=VM\`.
5. Create a LaunchAgent or LaunchDaemon plist that runs:
   \`/usr/local/share/dotnet/dotnet /path/to/publish/BotRunner.dll\`

Example label:
   \`com.nextgen.botrunner\`
`;

async function buildDockerBundle() {
  const [dockerfile, ...runnerFiles] = await Promise.all([
    fs.readFile(path.join(dockerRoot, "runner.Dockerfile"), "utf8"),
    ...filesToBundle.map((fileName) =>
      fs.readFile(path.join(runnerRoot, fileName), "utf8")
    )
  ]);

  const formattedRunnerFiles = filesToBundle.map(
    (fileName, index) => `===== ${fileName} =====\n${runnerFiles[index].trim()}\n`
  );

  return [
    "Bot Runner Docker Agent Package",
    "Target: DOCKER",
    "",
    "This bundle contains the container runtime definition and the universal .NET runner source.",
    "",
    "===== INSTALL.md =====",
    dockerInstallGuide.trim(),
    "",
    `===== runner.Dockerfile =====\n${dockerfile.trim()}\n`,
    ...formattedRunnerFiles
  ].join("\n");
}

async function buildK8sBundle() {
  const [runnerManifest, hpaManifest] = await Promise.all([
    fs.readFile(path.join(k8sRoot, "runner.yaml"), "utf8"),
    fs.readFile(path.join(k8sRoot, "runner-hpa.yaml"), "utf8")
  ]);

  return [
    "Bot Runner Kubernetes Agent Package",
    "Target: KUBERNETES",
    "",
    "This bundle contains the deployment manifests for scaling the bot runner on Kubernetes.",
    "",
    "===== INSTALL.md =====",
    k8sInstallGuide.trim(),
    "",
    `===== runner.yaml =====\n${runnerManifest.trim()}\n`,
    `===== runner-hpa.yaml =====\n${hpaManifest.trim()}\n`
  ].join("\n");
}

const dockerInstallGuide = `
# Docker agent install

1. Build the runner image:
   \`docker build -f docker/runner.Dockerfile -t bot-runner:latest .\`
2. Set runtime variables such as \`ORCHESTRATOR_URL\` and \`RUNNER_MODE=DOCKER\`.
3. Start the container:
   \`docker run -e ORCHESTRATOR_URL=http://host.docker.internal:3001 -e RUNNER_MODE=DOCKER bot-runner:latest\`
4. Push the image to your registry if you plan to run it in shared environments.
`;

const k8sInstallGuide = `
# Kubernetes agent install

1. Build and publish the runner image used by the manifests.
2. Update the image reference and orchestrator URL in \`runner.yaml\` if needed.
3. Apply the deployment:
   \`kubectl apply -f runner.yaml\`
4. Apply autoscaling:
   \`kubectl apply -f runner-hpa.yaml\`
5. Confirm pods are healthy and able to reach the orchestrator service.
`;
