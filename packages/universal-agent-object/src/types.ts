/**
 * ============================================================
 * UNIVERSAL AGENT OBJECT — Core Type System
 * ============================================================
 * Central schema definitions for all environments:
 *   Windows | macOS | Linux | Docker | Kubernetes
 *
 * Every runtime reads / writes this same contract.
 * ============================================================
 */

import { z } from "zod";

// ─────────────────────────────────────────────
// 1. PLATFORM ENUMERATION
// ─────────────────────────────────────────────

export const AgentPlatformSchema = z.enum([
  "windows",
  "macos",
  "linux",
  "docker",
  "kubernetes",
]);
export type AgentPlatform = z.infer<typeof AgentPlatformSchema>;

// ─────────────────────────────────────────────
// 2. AGENT CAPABILITY FLAGS
// ─────────────────────────────────────────────

export const AgentCapabilitySchema = z.object({
  webCapture: z.boolean().default(false),        // DOM / Browser automation
  desktopCapture: z.boolean().default(false),    // UIA / AX / AT-SPI
  terminalCapture: z.boolean().default(false),   // PTY / SSH / IBM
  imageCapture: z.boolean().default(false),      // OCR / screenshot fallback
  apiExecution: z.boolean().default(false),      // REST / gRPC calls
  fileExecution: z.boolean().default(false),     // File read/write/move
  aiHealing: z.boolean().default(false),         // AI selector self-healing
  headless: z.boolean().default(false),          // Headless browser support
});
export type AgentCapability = z.infer<typeof AgentCapabilitySchema>;

// ─────────────────────────────────────────────
// 3. RUNTIME ENVIRONMENT DESCRIPTOR
// ─────────────────────────────────────────────

export const RuntimeEnvironmentSchema = z.object({
  os: AgentPlatformSchema,
  arch: z.enum(["x64", "arm64", "x86"]),
  hostname: z.string(),
  nodeVersion: z.string().optional(),
  dotnetVersion: z.string().optional(),
  containerRuntime: z.enum(["none", "docker", "containerd", "podman"]).default("none"),
  kubernetesNamespace: z.string().optional(),
  podName: z.string().optional(),
  nodePoolName: z.string().optional(),
  environmentVariables: z.record(z.string(), z.string()).default({}),
});
export type RuntimeEnvironment = z.infer<typeof RuntimeEnvironmentSchema>;

// ─────────────────────────────────────────────
// 4. AGENT IDENTITY & REGISTRATION
// ─────────────────────────────────────────────

export const AgentStatusSchema = z.enum([
  "PENDING",
  "ACTIVATING",
  "ACTIVE",
  "IDLE",
  "BUSY",
  "OFFLINE",
  "ERROR",
  "DRAINING",     // K8s graceful shutdown
  "DECOMMISSIONED",
]);
export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const AgentIdentitySchema = z.object({
  agentId: z.string().uuid(),
  agentName: z.string().min(1).max(128),
  tenantId: z.string().uuid(),
  version: z.string(),                    // semver e.g. "1.0.0"
  platform: AgentPlatformSchema,
  capabilities: AgentCapabilitySchema,
  runtime: RuntimeEnvironmentSchema,
  tags: z.record(z.string(), z.string()).default({}),  // arbitrary key/value metadata
  registeredAt: z.string().datetime(),
  lastSeenAt: z.string().datetime(),
  status: AgentStatusSchema,
});
export type AgentIdentity = z.infer<typeof AgentIdentitySchema>;

// ─────────────────────────────────────────────
// 5. CONNECTIVITY CONFIG
// ─────────────────────────────────────────────

export const AgentConnectivitySchema = z.object({
  orchestratorUrl: z.string().url(),
  activationToken: z.string().min(1),
  heartbeatIntervalMs: z.number().int().min(1000).default(10_000),
  reconnectAttempts: z.number().int().min(1).default(10),
  reconnectBackoffMs: z.number().int().min(500).default(2_000),
  tlsEnabled: z.boolean().default(true),
  proxyUrl: z.string().url().optional(),
  websocketPath: z.string().default("/ws/agent"),
});
export type AgentConnectivity = z.infer<typeof AgentConnectivitySchema>;

// ─────────────────────────────────────────────
// 6. EXECUTION CONTEXT
//    Passed into every step at runtime
// ─────────────────────────────────────────────

export const ExecutionContextSchema = z.object({
  executionId: z.string().uuid(),
  workflowId: z.string().uuid(),
  runId: z.string().uuid(),
  tenantId: z.string().uuid(),
  agentId: z.string().uuid(),
  stepIndex: z.number().int().nonnegative(),
  totalSteps: z.number().int().positive(),
  variables: z.record(z.string(), z.unknown()).default({}),
  sessionState: z.record(z.string(), z.unknown()).default({}),
  startedAt: z.string().datetime(),
  timeoutMs: z.number().int().min(1000).default(30_000),
});
export type ExecutionContext = z.infer<typeof ExecutionContextSchema>;

// ─────────────────────────────────────────────
// 7. WORKFLOW STEP (Universal)
// ─────────────────────────────────────────────

export const SelectorTypeSchema = z.enum([
  "css",
  "xpath",
  "id",
  "name",
  "aria-label",
  "data-testid",
  "uia-automation-id",   // Windows UIA
  "ax-role",             // macOS AXUIElement
  "at-spi",             // Linux AT-SPI
  "text",
  "image",
  "coordinate",
]);
export type SelectorType = z.infer<typeof SelectorTypeSchema>;

export const TargetSelectorSchema = z.object({
  type: SelectorTypeSchema,
  value: z.string(),
  fallbacks: z.array(z.object({
    type: SelectorTypeSchema,
    value: z.string(),
    confidence: z.number().min(0).max(1).default(1.0),
  })).default([]),
  stabilityScore: z.number().min(0).max(1).default(1.0),
});
export type TargetSelector = z.infer<typeof TargetSelectorSchema>;

export const RetryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).default(3),
  delayMs: z.number().int().min(0).default(1_000),
  backoffMultiplier: z.number().min(1).default(2.0),
  healSelector: z.boolean().default(true),
  screenshotOnFail: z.boolean().default(true),
});
export type RetryPolicy = z.infer<typeof RetryPolicySchema>;

export const WorkflowStepPlatformSchema = z.enum([
  "web",
  "windows",
  "macos",
  "linux",
  "terminal",
  "api",
  "file",
  "any",     // platform-agnostic step (e.g. variable set)
]);
export type WorkflowStepPlatform = z.infer<typeof WorkflowStepPlatformSchema>;

export const WorkflowStepActionSchema = z.enum([
  // UI actions
  "click",
  "double-click",
  "right-click",
  "type",
  "clear",
  "select",
  "check",
  "uncheck",
  "hover",
  "drag",
  "drop",
  "scroll",
  "focus",
  "screenshot",
  // Navigation
  "navigate",
  "reload",
  "go-back",
  "go-forward",
  "wait-for-element",
  "wait-for-navigation",
  "wait-for-network-idle",
  // Terminal
  "execute-command",
  "send-keystrokes",
  "read-screen",
  "wait-for-prompt",
  // API / System
  "http-request",
  "read-file",
  "write-file",
  "set-variable",
  "run-script",
  // Control Flow
  "if-condition",
  "loop-start",
  "loop-end",
  "break",
  "continue",
  "throw",
  "log",
]);
export type WorkflowStepAction = z.infer<typeof WorkflowStepActionSchema>;

export const UniversalWorkflowStepSchema = z.object({
  stepId: z.string().uuid(),
  sequence: z.number().int().nonnegative(),
  label: z.string().optional(),
  platform: WorkflowStepPlatformSchema,
  action: WorkflowStepActionSchema,
  target: TargetSelectorSchema.optional(),
  input: z.unknown().optional(),
  outputVariable: z.string().optional(),
  condition: z.string().optional(),             // JS expression evaluated at runtime
  retryPolicy: RetryPolicySchema.default({}),
  variableMapping: z.record(z.string(), z.string()).default({}),
  timeout: z.number().int().min(0).default(30_000),
  continueOnError: z.boolean().default(false),
  metadata: z.record(z.string(), z.unknown()).default({}),
});
export type UniversalWorkflowStep = z.infer<typeof UniversalWorkflowStepSchema>;

// ─────────────────────────────────────────────
// 8. THE UNIVERSAL AGENT OBJECT (root contract)
// ─────────────────────────────────────────────

export const UniversalAgentObjectSchema = z.object({
  /**
   * Schema version — allows deserializers to apply migrations.
   * Bump the minor for additive changes, major for breaking changes.
   */
  schemaVersion: z.string().default("1.0.0"),

  /** Stable identity of this agent instance */
  identity: AgentIdentitySchema,

  /** Network / auth wiring to the orchestrator */
  connectivity: AgentConnectivitySchema,
});

export type UniversalAgentObject = z.infer<typeof UniversalAgentObjectSchema>;

// ─────────────────────────────────────────────
// 9. HEARTBEAT PAYLOAD
// ─────────────────────────────────────────────

export const AgentHeartbeatSchema = z.object({
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  status: AgentStatusSchema,
  timestamp: z.string().datetime(),
  metrics: z.object({
    cpuPercent: z.number().min(0).max(100),
    memoryMb: z.number().nonnegative(),
    activeRunId: z.string().uuid().optional(),
    uptimeSeconds: z.number().nonnegative(),
    latencyMs: z.number().nonnegative(),
  }),
  platform: AgentPlatformSchema,
  version: z.string(),
});
export type AgentHeartbeat = z.infer<typeof AgentHeartbeatSchema>;

// ─────────────────────────────────────────────
// 10. EXECUTION EVENT (streamed via WebSocket)
// ─────────────────────────────────────────────

export const ExecutionEventTypeSchema = z.enum([
  "EXECUTION_STARTED",
  "STEP_STARTED",
  "STEP_COMPLETED",
  "STEP_FAILED",
  "STEP_HEALED",
  "STEP_RETRIED",
  "EXECUTION_COMPLETED",
  "EXECUTION_FAILED",
  "SESSION_RESET",
  "VARIABLE_RESOLVED",
  "AI_HEAL_REQUESTED",
  "AI_HEAL_APPLIED",
]);
export type ExecutionEventType = z.infer<typeof ExecutionEventTypeSchema>;

export const ExecutionEventSchema = z.object({
  eventId: z.string().uuid(),
  type: ExecutionEventTypeSchema,
  agentId: z.string().uuid(),
  tenantId: z.string().uuid(),
  executionId: z.string().uuid(),
  stepId: z.string().uuid().optional(),
  timestamp: z.string().datetime(),
  data: z.record(z.string(), z.unknown()).default({}),
  screenshotUrl: z.string().url().optional(),
  errorMessage: z.string().optional(),
});
export type ExecutionEvent = z.infer<typeof ExecutionEventSchema>;

// ─────────────────────────────────────────────
// 11. REGISTRATION REQUEST / RESPONSE
// ─────────────────────────────────────────────

export const AgentRegistrationRequestSchema = z.object({
  activationToken: z.string().min(1),
  identity: AgentIdentitySchema.omit({ agentId: true, registeredAt: true, lastSeenAt: true, status: true }),
});
export type AgentRegistrationRequest = z.infer<typeof AgentRegistrationRequestSchema>;

export const AgentRegistrationResponseSchema = z.object({
  agentId: z.string().uuid(),
  agentName: z.string(),
  tenantId: z.string().uuid(),
  status: AgentStatusSchema,
  registeredAt: z.string().datetime(),
  orchestratorWsUrl: z.string().url(),
});
export type AgentRegistrationResponse = z.infer<typeof AgentRegistrationResponseSchema>;
