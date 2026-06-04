#!/usr/bin/env node
/**
 * ============================================================
 * BOOTSTRAP — Desktop Agent (Windows / macOS / Linux)
 * ============================================================
 * Entry point for the installed Alo Agent desktop runtime.
 * Reads config from:
 *   1. agent-config.json (written by the activation UI)
 *   2. Environment variables (developer override)
 *
 * Usage:
 *   node bootstrap.desktop.js
 * ============================================================
 */

import path from "path";
import fs from "fs";
import { UniversalAgentFactory } from "./factory";
import { RuntimeAgent } from "./runtime-agent";
import { createDefaultExecutors } from "./executors";
import type { AgentRegistrationResponse, AgentHeartbeat } from "./types";

// ─────────────────────────────────────────────
// 1. Load config from disk (written by Alo Agent UI)
// ─────────────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, "agent-config.json");

function loadFileConfig(): Record<string, string> {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch {}
  return {};
}

async function main() {
  const fileConfig = loadFileConfig();

  // ───────────────────────────────────────────
  // 2. Build the Universal Agent Object
  // ───────────────────────────────────────────
  const agentObject = UniversalAgentFactory.create({
    tenantId: process.env["NEXTGEN_TENANT_ID"] ?? fileConfig["tenantId"] ?? "",
    orchestratorUrl:
      process.env["NEXTGEN_ORCHESTRATOR_URL"] ??
      fileConfig["orchestratorUrl"] ??
      "http://localhost:4000",
    activationToken:
      process.env["NEXTGEN_ACTIVATION_TOKEN"] ??
      fileConfig["activationToken"] ??
      "",
    agentName:
      process.env["NEXTGEN_AGENT_NAME"] ??
      fileConfig["agentName"],
    version: "1.0.0",
    tags: {
      environment: "desktop",
      runtime: "alo-agent",
    },
  });

  console.log("[Desktop] Universal Agent Object:", JSON.stringify(
    UniversalAgentFactory.redact(agentObject), null, 2
  ));

  // ───────────────────────────────────────────
  // 3. Create the runtime agent + wire executors
  // ───────────────────────────────────────────
  const agent = new RuntimeAgent(agentObject);

  // Wire platform-specific executors
  const executors = createDefaultExecutors({
    // Playwright page would be injected here when a web workflow starts
    // execFn is the PTY shell command runner
    execFn: (cmd: string) =>
      new Promise((resolve, reject) => {
        const { exec } = require("child_process");
        exec(cmd, { timeout: 30_000 }, (err: Error | null, stdout: string, stderr: string) => {
          if (err) reject(new Error(stderr || err.message));
          else resolve(stdout);
        });
      }),
  });

  for (const executor of executors) {
    agent.registerExecutor(executor);
  }

  // ───────────────────────────────────────────
  // 4. Start the agent
  // ───────────────────────────────────────────
  agent.on("heartbeat", (hb: AgentHeartbeat) => {
    console.log(`[Desktop] Heartbeat — status: ${hb.status} | cpu: ${hb.metrics.cpuPercent}%`);
  });

  agent.on("registered", (reg: AgentRegistrationResponse) => {
    console.log(`[Desktop] Registered as ${reg.agentName} (${reg.agentId})`);
  });

  agent.on("error", (err: Error) => {
    console.error("[Desktop] Agent error:", err.message);
  });

  agent.on("shutdown", () => {
    console.log("[Desktop] Agent shut down cleanly.");
    process.exit(0);
  });

  await agent.start();
  console.log("[Desktop] Agent running. Press Ctrl+C to stop.");
}

main().catch((err) => {
  console.error("[Desktop] Fatal startup error:", err);
  process.exit(1);
});
