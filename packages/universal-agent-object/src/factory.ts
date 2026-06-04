/**
 * ============================================================
 * UNIVERSAL AGENT OBJECT — Factory & Builder
 * ============================================================
 * Creates a fully-hydrated UniversalAgentObject from
 * minimal config. Handles:
 *   - Platform auto-detection
 *   - Capability inference
 *   - Zod validation
 *   - Serialisation / deserialisation
 *   - Cross-environment config resolution
 *     (env vars → file → defaults)
 * ============================================================
 */

import { v4 as uuidv4 } from "uuid";
import {
  UniversalAgentObject,
  UniversalAgentObjectSchema,
  AgentIdentity,
  AgentConnectivity,
  AgentConnectivitySchema,
  AgentCapability,
  AgentPlatform,
} from "./types";
import {
  detectOS,
  detectCapabilities,
  buildRuntimeEnvironment,
} from "./platform-detector";

// ─────────────────────────────────────────────
// Builder Config — minimal required input
// ─────────────────────────────────────────────

export interface AgentFactoryConfig {
  /** Human-readable name for this agent instance */
  agentName?: string;

  /** Your tenant UUID from the NextGen portal */
  tenantId: string;

  /** Semver string, e.g. "1.0.0" */
  version?: string;

  /** Orchestrator base URL */
  orchestratorUrl: string;

  /** Activation token issued by the portal */
  activationToken: string;

  /**
   * Override detected platform.
   * Useful for testing or when running in emulation.
   */
  platformOverride?: AgentPlatform;

  /**
   * Override detected capabilities.
   * Merged over auto-detected values.
   */
  capabilityOverrides?: Partial<AgentCapability>;

  /** Extra tags for routing / filtering in the portal */
  tags?: Record<string, string>;

  /** Heartbeat interval in milliseconds */
  heartbeatIntervalMs?: number;
}

// ─────────────────────────────────────────────
// Environment-variable config resolution
// ─────────────────────────────────────────────
// In Docker / Kubernetes these are injected as env vars.
// In desktop agents they fall back to local file.

function resolveFromEnv(): Partial<AgentFactoryConfig> {
  return {
    tenantId: process.env["NEXTGEN_TENANT_ID"],
    orchestratorUrl: process.env["NEXTGEN_ORCHESTRATOR_URL"],
    activationToken: process.env["NEXTGEN_ACTIVATION_TOKEN"],
    agentName: process.env["NEXTGEN_AGENT_NAME"],
    version: process.env["NEXTGEN_AGENT_VERSION"],
    heartbeatIntervalMs: process.env["NEXTGEN_HEARTBEAT_MS"]
      ? parseInt(process.env["NEXTGEN_HEARTBEAT_MS"], 10)
      : undefined,
    tags: process.env["NEXTGEN_AGENT_TAGS"]
      ? JSON.parse(process.env["NEXTGEN_AGENT_TAGS"])
      : undefined,
  };
}

// ─────────────────────────────────────────────
// Main Factory — creates the Universal Agent Object
// ─────────────────────────────────────────────

export class UniversalAgentFactory {
  /**
   * Create a fully-validated UniversalAgentObject.
   *
   * Config resolution order (last wins):
   *   1. Environment variables
   *   2. Explicit factory config passed to create()
   */
  static create(input: AgentFactoryConfig): UniversalAgentObject {
    const envConfig = resolveFromEnv();

    // Merge: env → explicit input
    const cfg: AgentFactoryConfig = {
      agentName: input.agentName ?? envConfig.agentName ?? `agent-${os_hostname()}`,
      tenantId: input.tenantId ?? envConfig.tenantId!,
      version: input.version ?? envConfig.version ?? "1.0.0",
      orchestratorUrl: input.orchestratorUrl ?? envConfig.orchestratorUrl!,
      activationToken: input.activationToken ?? envConfig.activationToken!,
      platformOverride: input.platformOverride,
      capabilityOverrides: input.capabilityOverrides,
      tags: { ...(envConfig.tags ?? {}), ...(input.tags ?? {}) },
      heartbeatIntervalMs: input.heartbeatIntervalMs ?? envConfig.heartbeatIntervalMs ?? 10_000,
    };

    const platform = cfg.platformOverride ?? detectOS();
    const detectedCapabilities = detectCapabilities(platform);
    const capabilities: AgentCapability = {
      ...detectedCapabilities,
      ...(cfg.capabilityOverrides ?? {}),
    };

    const runtime = buildRuntimeEnvironment();
    const now = new Date().toISOString();

    const identity: AgentIdentity = {
      agentId: uuidv4(),
      agentName: cfg.agentName!,
      tenantId: cfg.tenantId,
      version: cfg.version!,
      platform,
      capabilities,
      runtime,
      tags: cfg.tags ?? {},
      registeredAt: now,
      lastSeenAt: now,
      status: "PENDING",
    };

    const connectivity: AgentConnectivity = AgentConnectivitySchema.parse({
      orchestratorUrl: cfg.orchestratorUrl,
      activationToken: cfg.activationToken,
      heartbeatIntervalMs: cfg.heartbeatIntervalMs,
      tlsEnabled: cfg.orchestratorUrl.startsWith("https"),
    });

    return UniversalAgentObjectSchema.parse({
      schemaVersion: "1.0.0",
      identity,
      connectivity,
    });
  }

  // ─────────────────────────────────────────
  // Serialisation helpers
  // ─────────────────────────────────────────

  /** Serialise to a canonical JSON string */
  static serialize(agent: UniversalAgentObject): string {
    return JSON.stringify(agent, null, 2);
  }

  /**
   * Deserialise + validate.
   * Throws a ZodError with clear messages if the shape is wrong.
   */
  static deserialize(raw: string | object): UniversalAgentObject {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return UniversalAgentObjectSchema.parse(parsed);
  }

  /**
   * Safe version — returns null instead of throwing.
   * Useful in agents that read from disk at startup.
   */
  static tryDeserialize(raw: string | object): UniversalAgentObject | null {
    try {
      return UniversalAgentFactory.deserialize(raw);
    } catch {
      return null;
    }
  }

  /**
   * Return a redacted copy — strips activation token.
   * Safe to log or include in telemetry.
   */
  static redact(agent: UniversalAgentObject): UniversalAgentObject {
    return {
      ...agent,
      connectivity: {
        ...agent.connectivity,
        activationToken: "***REDACTED***",
      },
    };
  }

  /**
   * Produce an updated agent with a new status / lastSeenAt.
   * Use this for heartbeat cycles.
   */
  static touch(
    agent: UniversalAgentObject,
    status?: UniversalAgentObject["identity"]["status"]
  ): UniversalAgentObject {
    return {
      ...agent,
      identity: {
        ...agent.identity,
        lastSeenAt: new Date().toISOString(),
        status: status ?? agent.identity.status,
      },
    };
  }
}

// ─────────────────────────────────────────────
// Tiny helper (avoids importing os at top level)
// ─────────────────────────────────────────────
function os_hostname(): string {
  try {
    return require("os").hostname();
  } catch {
    return "unknown-host";
  }
}
