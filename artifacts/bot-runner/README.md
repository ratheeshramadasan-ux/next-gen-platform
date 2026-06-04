# Bot Runner Release Artifacts

Place publishable Bot Runner artifacts in this directory so the dashboard can
serve real unattended installers instead of source bundles.

Expected paths:

- `windows/BotRunnerSetup-win-x64.exe`
- `linux/bot-runner_0.1.0_amd64.deb`
- `mac/BotRunnerSetup-macos-universal.pkg`

Container targets remain deployment bundles and are generated from:

- `docker/runner.Dockerfile`
- `infra/k8s/runner.yaml`
- `infra/k8s/runner-hpa.yaml`

Suggested future release metadata to expose on the downloads page:

- semantic version
- build number
- release date
- sha256 checksum
- signing status

Use `scripts/release-bot-runner.sh` with the templates under
`packaging/bot-runner/` to produce these artifacts.
