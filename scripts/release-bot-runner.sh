#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNNER_DIR="$ROOT_DIR/services/bot-runner-dotnet"
PACKAGING_DIR="$ROOT_DIR/packaging/bot-runner"
ARTIFACTS_DIR="$ROOT_DIR/artifacts/bot-runner"
MANIFEST_PATH="$ARTIFACTS_DIR/manifest.json"
VERSION="${BOT_RUNNER_VERSION:-0.1.0}"
CONFIGURATION="${BOT_RUNNER_CONFIGURATION:-Release}"
DOTNET_BIN="${DOTNET_BIN:-}"

usage() {
  cat <<'EOF'
Usage:
  scripts/release-bot-runner.sh <windows|linux|mac|all>

Environment variables:
  BOT_RUNNER_VERSION         Release version to stamp into artifacts
  BOT_RUNNER_CONFIGURATION   dotnet publish configuration (default: Release)

Expected external tools:
  - dotnet
  - Windows: Inno Setup Compiler (iscc)
  - Linux: dpkg-deb
  - macOS: pkgbuild
EOF
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
}

resolve_dotnet() {
  if [[ -n "$DOTNET_BIN" && -x "$DOTNET_BIN" ]]; then
    return
  fi

  if command -v dotnet >/dev/null 2>&1; then
    DOTNET_BIN="$(command -v dotnet)"
    return
  fi

  if [[ -x "/usr/local/share/dotnet/dotnet" ]]; then
    DOTNET_BIN="/usr/local/share/dotnet/dotnet"
    return
  fi

  if [[ -x "/opt/homebrew/share/dotnet/dotnet" ]]; then
    DOTNET_BIN="/opt/homebrew/share/dotnet/dotnet"
    return
  fi

  echo "Missing required command: dotnet" >&2
  exit 1
}

publish_runner() {
  local rid="$1"
  local output_dir="$2"

  resolve_dotnet
  mkdir -p "$output_dir"

  "$DOTNET_BIN" publish "$RUNNER_DIR/BotRunner.csproj" \
    -c "$CONFIGURATION" \
    -r "$rid" \
    --self-contained false \
    -o "$output_dir" \
    /p:Version="$VERSION"
}

build_windows() {
  require_command iscc

  local publish_dir="$ROOT_DIR/.release/bot-runner/windows/publish"
  local artifact_dir="$ARTIFACTS_DIR/windows"
  mkdir -p "$artifact_dir"

  publish_runner "win-x64" "$publish_dir"

  iscc \
    "/DMyAppVersion=$VERSION" \
    "/DSourcePublishDir=$publish_dir" \
    "/DOutputDir=$artifact_dir" \
    "$PACKAGING_DIR/windows/BotRunner.iss"

  update_manifest "windows" "$VERSION" "BotRunnerSetup-win-x64.exe"

  echo "Windows installer written to $artifact_dir/BotRunnerSetup-win-x64.exe"
}

build_linux() {
  local staging_dir="$ROOT_DIR/.release/bot-runner/linux/staging"
  local publish_dir="$staging_dir/opt/bot-runner"
  local artifact_dir="$ARTIFACTS_DIR/linux"
  local package_name="bot-runner_${VERSION}_amd64.deb"
  local package_path="$artifact_dir/$package_name"

  rm -rf "$staging_dir"
  mkdir -p "$staging_dir/DEBIAN" "$staging_dir/etc/systemd/system" "$artifact_dir"

  publish_runner "linux-x64" "$publish_dir"

  cp "$PACKAGING_DIR/linux/control" "$staging_dir/DEBIAN/control"
  cp "$PACKAGING_DIR/linux/bot-runner.service" "$staging_dir/etc/systemd/system/bot-runner.service"

  sed -i.bak "s/__VERSION__/$VERSION/g" "$staging_dir/DEBIAN/control"
  rm -f "$staging_dir/DEBIAN/control.bak"

  if command -v dpkg-deb >/dev/null 2>&1; then
    dpkg-deb --build "$staging_dir" "$package_path"
  else
    build_deb_manually "$staging_dir" "$package_path"
  fi

  update_manifest "linux" "$VERSION" "$package_name"

  echo "Linux installer written to $package_path"
}

build_mac() {
  require_command pkgbuild

  local staging_dir="$ROOT_DIR/.release/bot-runner/mac/staging"
  local publish_dir="$staging_dir/usr/local/share/bot-runner"
  local app_dir="$staging_dir/Applications"
  local scripts_dir="$PACKAGING_DIR/mac/scripts"
  local artifact_dir="$ARTIFACTS_DIR/mac"
  local pkg_name="BotRunnerSetup-macos-universal.pkg"

  rm -rf "$staging_dir"
  mkdir -p "$staging_dir/Library/LaunchDaemons" "$app_dir" "$artifact_dir"

  # Build the .NET worker
  publish_runner "osx-arm64" "$publish_dir"

  # Build the Electron Alo Agent
  (
    cd "$ROOT_DIR/apps/alo-agent-shell"
    npm install
    npm run build
  )
  cp -R "$ROOT_DIR/apps/alo-agent-shell/dist/mac-arm64/Alo Agent.app" "$app_dir/"

  cp "$PACKAGING_DIR/mac/com.nextgen.botrunner.plist" \
    "$staging_dir/Library/LaunchDaemons/com.nextgen.botrunner.plist"

  pkgbuild \
    --root "$staging_dir" \
    --identifier "com.nextgen.botrunner" \
    --version "$VERSION" \
    --scripts "$scripts_dir" \
    "$artifact_dir/$pkg_name"

  update_manifest "mac" "$VERSION" "$pkg_name"

  echo "macOS installer written to $artifact_dir/$pkg_name"
}

main() {
  if [[ $# -ne 1 ]]; then
    usage
    exit 1
  fi

  case "$1" in
    windows)
      build_windows
      ;;
    linux)
      build_linux
      ;;
    mac)
      build_mac
      ;;
    all)
      build_windows
      build_linux
      build_mac
      ;;
    *)
      usage
      exit 1
      ;;
  esac
}

build_deb_manually() {
  local staging_dir="$1"
  local package_path="$2"
  local temp_dir="$ROOT_DIR/.release/bot-runner/linux/package"

  require_command tar
  require_command python3

  rm -rf "$temp_dir"
  mkdir -p "$temp_dir/control" "$temp_dir/data"

  cp "$staging_dir/DEBIAN/control" "$temp_dir/control/control"
  if [[ -f "$staging_dir/etc/systemd/system/bot-runner.service" ]]; then
    mkdir -p "$temp_dir/data/etc/systemd/system"
    cp "$staging_dir/etc/systemd/system/bot-runner.service" \
      "$temp_dir/data/etc/systemd/system/bot-runner.service"
  fi
  if [[ -d "$staging_dir/opt" ]]; then
    mkdir -p "$temp_dir/data/opt"
    cp -R "$staging_dir/opt/bot-runner" "$temp_dir/data/opt/bot-runner"
  fi

  printf '2.0\n' > "$temp_dir/debian-binary"
  (
    cd "$temp_dir/control"
    tar -czf "$temp_dir/control.tar.gz" .
  )
  (
    cd "$temp_dir/data"
    tar -czf "$temp_dir/data.tar.gz" .
  )

  python3 - "$temp_dir" "$package_path" <<'PY'
import os
import sys

temp_dir = sys.argv[1]
package_path = sys.argv[2]
members = ["debian-binary", "control.tar.gz", "data.tar.gz"]

with open(package_path, "wb") as out:
    out.write(b"!<arch>\n")
    for name in members:
      file_path = os.path.join(temp_dir, name)
      data = open(file_path, "rb").read()
      header = (
          f"{name}/".ljust(16)
          + f"{int(os.path.getmtime(file_path))}".ljust(12)
          + "0".ljust(6)
          + "0".ljust(6)
          + "100644".ljust(8)
          + f"{len(data)}".ljust(10)
          + "`\n"
      )
      out.write(header.encode("ascii"))
      out.write(data)
      if len(data) % 2 == 1:
          out.write(b"\n")
PY
}

update_manifest() {
  local target="$1"
  local version="$2"
  local file_name="$3"

  python3 - "$MANIFEST_PATH" "$target" "$version" "$file_name" <<'PY'
import json
import sys
from pathlib import Path

manifest_path = Path(sys.argv[1])
target = sys.argv[2]
version = sys.argv[3]
file_name = sys.argv[4]

if manifest_path.exists():
    data = json.loads(manifest_path.read_text())
else:
    data = {"agents": {}}

agents = data.setdefault("agents", {})
versions = agents.setdefault(target, [])

filtered = [entry for entry in versions if entry.get("version") != version]
filtered.append(
    {
        "version": version,
        "fileName": file_name,
        "publishedAt": "2026-04-26"
    }
)
filtered.sort(key=lambda item: item["version"], reverse=True)
agents[target] = filtered

manifest_path.write_text(json.dumps(data, indent=2) + "\n")
PY
}

main "$@"
