# Bot Runner Packaging

This directory contains the installer packaging templates used to produce the
artifact paths expected by the dashboard downloads page.

Installer outputs:

- `artifacts/bot-runner/windows/BotRunnerSetup-win-x64.exe`
- `artifacts/bot-runner/linux/bot-runner_<version>_amd64.deb`
- `artifacts/bot-runner/mac/BotRunnerSetup-macos-universal.pkg`

Release script:

- `scripts/release-bot-runner.sh windows`
- `scripts/release-bot-runner.sh linux`
- `scripts/release-bot-runner.sh mac`
- `scripts/release-bot-runner.sh all`

External tools required:

- `dotnet` for publishing the worker
- `iscc` for the Windows installer
- `dpkg-deb` for the Linux package
- `pkgbuild` for the macOS installer

Notes:

- Windows packaging uses Inno Setup.
- Linux packaging installs the runner under `/opt/bot-runner` and registers a
  `systemd` service.
- macOS packaging installs the runner under
  `/usr/local/share/bot-runner` and registers a `launchd` daemon.
- Portal pairing expects the runner environment to include:
  - `ORCHESTRATOR_URL`
  - `BOT_RUNNER_TENANT_ID`
  - `BOT_RUNNER_ACTIVATION_TOKEN` once the host is approved
  - `RUNNER_MODE=VM`
