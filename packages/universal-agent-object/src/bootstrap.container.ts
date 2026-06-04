#!/usr/bin/env node
/**
 * ============================================================
 * BOOTSTRAP — Docker / Kubernetes Runner
 * ============================================================
 * Entry point for containerised bot runner pods.
 * Config comes ENTIRELY from environment variables:
 *   NEXTGEN_TENANT_ID
 *   NEXTGEN_ORCHESTRATOR_URL
 *   NEXTGEN_ACTIVATION_TOKEN
 *   NEXTGEN_AGENT_NAME       (optional)
 *   NEXTGEN_AGENT_VERSION    (optional)
 *   NEXTGEN_HEARTBEAT_MS     (optional, default 10000)
 *   NEXTGEN_AGENT_TAGS       (optional, JSON string)
 *   POD_NAME                 (auto from K8s downward API)
 *   POD_NAMESPACE            (auto from K8s downward API)
 *
 * Usage (Docker):
 *   docker run \
 *     -e NEXTGEN_TENANT_ID=... \
 *     -e NEXTGEN_ORCHESTRATOR_URL=https://portal.example.com \
 *     -e NEXTGEN_ACTIVATION_TOKEN=... \
 *     nextgen/bot-runner:latest
 *
 * Usage (Kubernetes):
 *   kubectl apply -f infra/kubernetes/bot-runner-pod.yaml
 * ============================================================
 */

import { UniversalAgentFactory } from "./factory";
import { RuntimeAgent } from "./runtime-agent";
import { createDefaultExecutors } from "./executors";
import type { AgentRegistrationResponse, AgentHeartbeat } from "./types";

// ─────────────────────────────────────────────
// Validate required env vars
// ─────────────────────────────────────────────
function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val) {
    console.error(`[Container] FATAL: Missing required env var: ${name}`);
    process.exit(1);
  }
  return val;
}

async function main() {
  // ───────────────────────────────────────────
  // 1. Build the Universal Agent Object
  //    Factory auto-detects Docker vs Kubernetes
  //    from KUBERNETES_SERVICE_HOST env var
  // ───────────────────────────────────────────
  const agentObject = UniversalAgentFactory.create({
    tenantId: requireEnv("NEXTGEN_TENANT_ID"),
    orchestratorUrl: requireEnv("NEXTGEN_ORCHESTRATOR_URL"),
    activationToken: requireEnv("NEXTGEN_ACTIVATION_TOKEN"),
    agentName:
      process.env["NEXTGEN_AGENT_NAME"] ??
      process.env["POD_NAME"] ??
      "container-runner",
    version: process.env["NEXTGEN_AGENT_VERSION"] ?? "1.0.0",
    heartbeatIntervalMs: process.env["NEXTGEN_HEARTBEAT_MS"]
      ? parseInt(process.env["NEXTGEN_HEARTBEAT_MS"], 10)
      : 10_000,
    tags: {
      environment: "container",
      runtime: process.env["KUBERNETES_SERVICE_HOST"] ? "kubernetes" : "docker",
      podName: process.env["POD_NAME"] ?? "",
      podNamespace: process.env["POD_NAMESPACE"] ?? "",
      nodePool: process.env["NODE_POOL_NAME"] ?? "",
    },
  });

  console.log("[Container] Universal Agent Object:");
  console.log(JSON.stringify(UniversalAgentFactory.redact(agentObject), null, 2));

  // ───────────────────────────────────────────
  // 2. Wire executors
  //    In containers: web + terminal + api + file
  //    (no desktop UIA — no display server)
  // ───────────────────────────────────────────
  const agent = new RuntimeAgent(agentObject);

  const executors = createDefaultExecutors({
    // Playwright page injected when a web execution starts
    execFn: (cmd: string) =>
      new Promise((resolve, reject) => {
        const { exec } = require("child_process");
        exec(
          cmd,
          { timeout: 60_000, shell: "/bin/sh" },
          (err: Error | null, stdout: string, stderr: string) => {
            if (err) reject(new Error(stderr || err.message));
            else resolve(stdout);
          }
        );
      }),
  });

  for (const executor of executors) {
    agent.registerExecutor(executor);
  }

  // ───────────────────────────────────────────
  // 3. Event wiring
  // ───────────────────────────────────────────
  agent.on("registered", (reg: AgentRegistrationResponse) => {
    console.log(`[Container] Registered: ${reg.agentName} (${reg.agentId})`);
  });

  agent.on("heartbeat", (hb: AgentHeartbeat) => {
    // In K8s, logs go to stdout → collected by Fluentd / Loki
    process.stdout.write(
      JSON.stringify({
        level: "info",
        msg: "heartbeat",
        agentId: hb.agentId,
        status: hb.status,
        cpu: hb.metrics.cpuPercent,
        memMb: hb.metrics.memoryMb,
        uptime: hb.metrics.uptimeSeconds,
        ts: hb.timestamp,
      }) + "\n"
    );
  });

  agent.on("error", (err: Error) => {
    process.stderr.write(
      JSON.stringify({ level: "error", msg: err.message }) + "\n"
    );
  });

  agent.on("shutdown", () => {
    console.log(JSON.stringify({ level: "info", msg: "agent-shutdown" }));
    process.exit(0);
  });

  // ───────────────────────────────────────────
  // 4. Start
  // ───────────────────────────────────────────
  await agent.start();

  console.log(JSON.stringify({
    level: "info",
    msg: "agent-started",
    platform: agentObject.identity.platform,
    agentId: agentObject.identity.agentId,
  }));

  // Keep the process alive
  // Shutdown is triggered by SIGTERM (K8s) or SIGINT (Docker)
}

main().catch((err) => {
  process.stderr.write(
    JSON.stringify({ level: "fatal", msg: err.message }) + "\n"
  );
  process.exit(1);
});
