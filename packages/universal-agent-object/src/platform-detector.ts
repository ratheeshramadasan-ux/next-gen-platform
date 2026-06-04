/**
 * ============================================================
 * PLATFORM DETECTOR
 * ============================================================
 * Auto-detects the current runtime environment.
 * Works in: Node.js (Windows/macOS/Linux), Docker, Kubernetes
 * ============================================================
 */

import os from "os";
import { AgentPlatform, AgentCapability, RuntimeEnvironment } from "./types";

// ─────────────────────────────────────────────
// Detect base OS
// ─────────────────────────────────────────────
export function detectOS(): AgentPlatform {
  // Kubernetes / Docker pods always run on linux
  if (isInsideKubernetes()) return "kubernetes";
  if (isInsideDocker()) return "docker";

  const platform = process.platform;
  if (platform === "win32") return "windows";
  if (platform === "darwin") return "macos";
  return "linux";
}

// ─────────────────────────────────────────────
// Docker detection
// ─────────────────────────────────────────────
export function isInsideDocker(): boolean {
  try {
    const fs = require("fs") as typeof import("fs");
    // Canonical Docker fingerprint
    if (fs.existsSync("/.dockerenv")) return true;
    // Check cgroup v1 for docker
    const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");
    return cgroup.includes("docker") || cgroup.includes("containerd");
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────
// Kubernetes detection
// ─────────────────────────────────────────────
export function isInsideKubernetes(): boolean {
  return (
    !!process.env["KUBERNETES_SERVICE_HOST"] ||
    !!process.env["KUBERNETES_PORT"]
  );
}

// ─────────────────────────────────────────────
// Architecture normalisation
// ─────────────────────────────────────────────
export function detectArch(): "x64" | "arm64" | "x86" {
  const arch = process.arch as string;
  if (arch === "x64" || arch === "x86_64") return "x64";
  if (arch === "arm64" || arch === "aarch64") return "arm64";
  return "x86";
}

// ─────────────────────────────────────────────
// Container runtime detection
// ─────────────────────────────────────────────
export function detectContainerRuntime(): RuntimeEnvironment["containerRuntime"] {
  if (isInsideKubernetes() || isInsideDocker()) {
    try {
      const fs = require("fs") as typeof import("fs");
      const cgroup = fs.readFileSync("/proc/1/cgroup", "utf8");
      if (cgroup.includes("containerd")) return "containerd";
      if (cgroup.includes("podman")) return "podman";
      if (cgroup.includes("docker")) return "docker";
    } catch {
      // can't read cgroup — fall through
    }
    return "docker";
  }
  return "none";
}

// ─────────────────────────────────────────────
// Detect capabilities based on platform
// ─────────────────────────────────────────────
export function detectCapabilities(platform: AgentPlatform): AgentCapability {
  const base: AgentCapability = {
    webCapture: false,
    desktopCapture: false,
    terminalCapture: false,
    imageCapture: false,
    apiExecution: true,   // Always supported
    fileExecution: true,  // Always supported
    aiHealing: true,      // Always supported (delegates to AI service)
    headless: false,
  };

  switch (platform) {
    case "windows":
      return {
        ...base,
        webCapture: true,
        desktopCapture: true,   // UIA + Win32
        terminalCapture: true,  // ConPTY / CMD / PowerShell
        imageCapture: true,     // GDI+ screenshot + OCR
        headless: true,
      };

    case "macos":
      return {
        ...base,
        webCapture: true,
        desktopCapture: true,   // AXUIElement API
        terminalCapture: true,  // PTY / zsh / bash
        imageCapture: true,     // Core Graphics screenshot
        headless: true,
      };

    case "linux":
      return {
        ...base,
        webCapture: true,
        desktopCapture: true,   // AT-SPI / X11 / Wayland
        terminalCapture: true,  // PTY / bash / zsh / IBM TN3270
        imageCapture: true,
        headless: true,
      };

    case "docker":
      return {
        ...base,
        webCapture: true,       // Chromium headless
        desktopCapture: false,  // No display server in base image
        terminalCapture: true,
        imageCapture: true,
        headless: true,
      };

    case "kubernetes":
      return {
        ...base,
        webCapture: true,       // Sidecar Chromium pod
        desktopCapture: false,
        terminalCapture: true,
        imageCapture: true,
        headless: true,
      };

    default:
      return base;
  }
}

// ─────────────────────────────────────────────
// Build full RuntimeEnvironment
// ─────────────────────────────────────────────
export function buildRuntimeEnvironment(): RuntimeEnvironment {
  const os_platform = detectOS();
  const containerRuntime = detectContainerRuntime();

  const env: RuntimeEnvironment = {
    os: os_platform,
    arch: detectArch(),
    hostname: os.hostname(),
    nodeVersion: process.version,
    containerRuntime,
    environmentVariables: {
      // Expose safe env vars only
      NODE_ENV: process.env["NODE_ENV"] ?? "production",
      NEXTGEN_REGION: process.env["NEXTGEN_REGION"] ?? "",
      NEXTGEN_TIER: process.env["NEXTGEN_TIER"] ?? "standard",
    },
  };

  // Kubernetes-specific metadata
  if (os_platform === "kubernetes") {
    env.kubernetesNamespace =
      process.env["POD_NAMESPACE"] ??
      process.env["KUBERNETES_NAMESPACE"] ??
      "default";
    env.podName =
      process.env["POD_NAME"] ??
      process.env["HOSTNAME"] ??
      os.hostname();
    env.nodePoolName = process.env["NODE_POOL_NAME"];
  }

  return env;
}
