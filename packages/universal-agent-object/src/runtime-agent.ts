/**
 * ============================================================
 * UNIVERSAL AGENT OBJECT — Runtime Agent
 * ============================================================
 * The live, running agent instance.
 * Manages:
 *   - Heartbeat loop
 *   - WebSocket connection to orchestrator
 *   - Step dispatching (web / windows / mac / linux / terminal / api)
 *   - Execution event streaming
 *   - Graceful shutdown (Docker SIGTERM / K8s preStop)
 * ============================================================
 */

import { EventEmitter } from "eventemitter3";
import {
  UniversalAgentObject,
  AgentHeartbeat,
  ExecutionEvent,
  ExecutionContext,
  UniversalWorkflowStep,
  AgentRegistrationRequest,
  AgentRegistrationResponse,
  AgentRegistrationRequestSchema,
  AgentRegistrationResponseSchema,
} from "./types";
import { UniversalAgentFactory } from "./factory";

// ─────────────────────────────────────────────
// Events emitted by RuntimeAgent
// ─────────────────────────────────────────────
export interface RuntimeAgentEvents {
  heartbeat: (hb: AgentHeartbeat) => void;
  connected: () => void;
  disconnected: (reason: string) => void;
  registered: (response: AgentRegistrationResponse) => void;
  event: (event: ExecutionEvent) => void;
  error: (err: Error) => void;
  shutdown: () => void;
}

// ─────────────────────────────────────────────
// Platform-specific executor interface
// ─────────────────────────────────────────────
export interface PlatformExecutor {
  platform: string;
  execute(step: UniversalWorkflowStep, context: ExecutionContext): Promise<unknown>;
}

// ─────────────────────────────────────────────
// Runtime Agent
// ─────────────────────────────────────────────
export class RuntimeAgent extends EventEmitter<RuntimeAgentEvents> {
  private agentObject: UniversalAgentObject;
  private heartbeatTimer?: ReturnType<typeof setInterval>;
  private executors: Map<string, PlatformExecutor> = new Map();
  private startTime = Date.now();
  private wsConnection?: WebSocket;
  private isShuttingDown = false;

  constructor(agentObject: UniversalAgentObject) {
    super();
    this.agentObject = agentObject;
    this.registerShutdownHandlers();
  }

  // ─────────────────────────────────────────
  // Register a platform executor
  // ─────────────────────────────────────────
  registerExecutor(executor: PlatformExecutor): this {
    this.executors.set(executor.platform, executor);
    return this;
  }

  // ─────────────────────────────────────────
  // Start the agent
  // ─────────────────────────────────────────
  async start(): Promise<AgentRegistrationResponse> {
    const registration = await this.register();
    this.agentObject = UniversalAgentFactory.touch(this.agentObject, "ACTIVE");
    this.startHeartbeat();
    this.emit("connected");
    return registration;
  }

  // ─────────────────────────────────────────
  // Register with orchestrator
  // ─────────────────────────────────────────
  private async register(): Promise<AgentRegistrationResponse> {
    const { identity, connectivity } = this.agentObject;

    const payload: AgentRegistrationRequest =
      AgentRegistrationRequestSchema.parse({
        activationToken: connectivity.activationToken,
        identity: {
          agentName: identity.agentName,
          tenantId: identity.tenantId,
          version: identity.version,
          platform: identity.platform,
          capabilities: identity.capabilities,
          runtime: identity.runtime,
          tags: identity.tags,
        },
      });

    const res = await fetch(
      `${connectivity.orchestratorUrl}/api/agents/register`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Agent-Version": identity.version,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      throw new Error(`Registration failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const response = AgentRegistrationResponseSchema.parse(data);
    this.emit("registered", response);
    return response;
  }

  // ─────────────────────────────────────────
  // Heartbeat loop
  // ─────────────────────────────────────────
  private startHeartbeat(): void {
    const interval = this.agentObject.connectivity.heartbeatIntervalMs;

    this.heartbeatTimer = setInterval(async () => {
      if (this.isShuttingDown) return;

      const hb: AgentHeartbeat = this.buildHeartbeat();
      this.emit("heartbeat", hb);

      // Fire-and-forget heartbeat POST
      fetch(
        `${this.agentObject.connectivity.orchestratorUrl}/api/agents/${this.agentObject.identity.agentId}/heartbeat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(hb),
        }
      ).catch(() => {
        // Silently absorb — reconnect logic handles persistent failures
      });
    }, interval);
  }

  // ─────────────────────────────────────────
  // Build heartbeat payload
  // ─────────────────────────────────────────
  private buildHeartbeat(): AgentHeartbeat {
    const { identity } = this.agentObject;
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      agentId: identity.agentId,
      tenantId: identity.tenantId,
      status: identity.status,
      timestamp: new Date().toISOString(),
      metrics: {
        cpuPercent: this.getCpuUsage(),
        memoryMb: this.getMemoryMb(),
        uptimeSeconds,
        latencyMs: 0,   // Updated after first ping response
      },
      platform: identity.platform,
      version: identity.version,
    };
  }

  // ─────────────────────────────────────────
  // Execute a single workflow step
  // ─────────────────────────────────────────
  async executeStep(
    step: UniversalWorkflowStep,
    context: ExecutionContext
  ): Promise<unknown> {
    const platform = step.platform === "any"
      ? this.agentObject.identity.platform
      : step.platform;

    const executor = this.executors.get(platform);

    if (!executor) {
      throw new Error(
        `No executor registered for platform "${platform}" on this agent ` +
        `(${this.agentObject.identity.platform})`
      );
    }

    return executor.execute(step, context);
  }

  // ─────────────────────────────────────────
  // Emit an execution event to the orchestrator
  // ─────────────────────────────────────────
  async emitEvent(event: ExecutionEvent): Promise<void> {
    this.emit("event", event);

    await fetch(
      `${this.agentObject.connectivity.orchestratorUrl}/api/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      }
    ).catch(() => {/* buffering would go here */});
  }

  // ─────────────────────────────────────────
  // Graceful shutdown
  // ─────────────────────────────────────────
  async shutdown(reason = "manual"): Promise<void> {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    this.agentObject = UniversalAgentFactory.touch(this.agentObject, "DRAINING");

    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);

    // Notify orchestrator
    await fetch(
      `${this.agentObject.connectivity.orchestratorUrl}/api/agents/${this.agentObject.identity.agentId}/offline`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      }
    ).catch(() => {});

    this.emit("shutdown");
  }

  // ─────────────────────────────────────────
  // Read-only accessors
  // ─────────────────────────────────────────
  get id(): string { return this.agentObject.identity.agentId; }
  get platform() { return this.agentObject.identity.platform; }
  get capabilities() { return this.agentObject.identity.capabilities; }
  get status() { return this.agentObject.identity.status; }

  /** Returns a redacted, loggable snapshot of the agent object */
  toJSON(): UniversalAgentObject {
    return UniversalAgentFactory.redact(this.agentObject);
  }

  // ─────────────────────────────────────────
  // OS metric helpers
  // ─────────────────────────────────────────
  private getCpuUsage(): number {
    try {
      const os = require("os") as typeof import("os");
      const cpus = os.cpus();
      const total = cpus.reduce((acc, cpu) => {
        const times = Object.values(cpu.times).reduce((a, b) => a + b, 0);
        return acc + times;
      }, 0);
      const idle = cpus.reduce((acc, cpu) => acc + cpu.times.idle, 0);
      return Math.round(((total - idle) / total) * 100);
    } catch { return 0; }
  }

  private getMemoryMb(): number {
    try {
      const os = require("os") as typeof import("os");
      const used = os.totalmem() - os.freemem();
      return Math.round(used / 1024 / 1024);
    } catch { return 0; }
  }

  // ─────────────────────────────────────────
  // Process signal handlers (Docker / K8s)
  // ─────────────────────────────────────────
  private registerShutdownHandlers(): void {
    if (typeof process === "undefined") return;

    // K8s sends SIGTERM before killing the pod
    process.once("SIGTERM", () => this.shutdown("SIGTERM"));

    // Docker stop also sends SIGTERM, but some use SIGINT
    process.once("SIGINT", () => this.shutdown("SIGINT"));

    // Windows Ctrl+C / service stop
    if (process.platform === "win32") {
      process.once("SIGHUP", () => this.shutdown("SIGHUP"));
    }
  }
}
