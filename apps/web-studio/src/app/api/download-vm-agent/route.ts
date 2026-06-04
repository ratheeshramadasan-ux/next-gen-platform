import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

const runnerRoot = path.join(
  process.cwd(),
  "..",
  "services",
  "bot-runner-dotnet"
);

const filesToBundle = [
  "BotRunner.csproj",
  "Program.cs",
  "BotWorker.cs",
  "JobProcessor.cs",
  "OrchestratorClient.cs",
  "RunnerJob.cs"
];

export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("target") === "linux"
    ? "linux"
    : "windows";

  const bundle = await buildBundle(target);

  return new NextResponse(bundle, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="bot-runner-vm-agent-${target}.txt"`
    }
  });
}

async function buildBundle(target: "windows" | "linux") {
  const fileContents = await Promise.all(
    filesToBundle.map(async (fileName) => {
      const content = await fs.readFile(path.join(runnerRoot, fileName), "utf8");
      return `===== ${fileName} =====\n${content.trim()}\n`;
    })
  );

  const installGuide =
    target === "windows" ? windowsInstallGuide : linuxInstallGuide;

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

If you prefer a background service wrapper, update \`Program.cs\` to call \`UseWindowsService()\`.
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

