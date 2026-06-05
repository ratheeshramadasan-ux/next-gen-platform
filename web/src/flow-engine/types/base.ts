/**
 * Enterprise Flow Tools — Base Contract
 * Every Flow Tool node inherits from this contract.
 */

// ─── Shared Enums ─────────────────────────────────────────────────────────────

export type FlowNodeType =
  | "START"
  | "END"
  | "DECISION"
  | "SWITCH"
  | "RULE_DECISION"
  | "AI_DECISION"
  | "PARALLEL_SPLIT"
  | "PARALLEL_JOIN"
  | "LOOP"
  | "RETRY"
  | "WAIT"
  | "WAIT_FOR_EVENT"
  | "USER_TASK"
  | "APPROVAL_TASK"
  | "SERVICE_TASK"
  | "AGENT_TASK"
  | "SUB_PROCESS"
  | "SCRIPT_TASK"
  | "DATA_TRANSFORMATION"
  | "COMPENSATION"
  | "ESCALATION"
  | "MILESTONE"
  | "TIMER_BOUNDARY_EVENT"
  | "ERROR_BOUNDARY_EVENT"
  | "MESSAGE_EVENT"
  | "SIGNAL_EVENT"
  | "BUSINESS_CALENDAR"
  | "PROCESS_CHECKPOINT";

// ─── Shared Policies ──────────────────────────────────────────────────────────

export interface RetryPolicy {
  enabled: boolean;
  maxRetries: number;
  backoff: "fixed" | "linear" | "exponential";
  initialDelay?: string;   // ISO 8601 duration e.g. "PT5S"
  maxDelay?: string;
  multiplier?: number;
  jitter?: boolean;
  retryableErrors?: string[];
  nonRetryableErrors?: string[];
}

export interface TimeoutPolicy {
  duration: string;         // ISO 8601 duration e.g. "PT30S"
  onTimeout: "fail" | "retry" | "escalate" | "compensate" | "continue" | "wait_for_manual_review";
}

export interface CircuitBreakerPolicy {
  enabled: boolean;
  failureThreshold: number;   // % or count
  successThreshold?: number;
  openTimeout: string;        // duration before half-open
  halfOpenMaxRequests?: number;
}

export interface SLAPolicy {
  enabled: boolean;
  duration: string;
  warningAt?: string;
  escalationAt?: string;
  businessCalendarRef?: string;
}

// ─── Base FlowNode ─────────────────────────────────────────────────────────────

export interface FlowNode {
  id: string;
  name: string;
  type: FlowNodeType;
  description?: string;

  topology: {
    incomingConnections: string[];
    outgoingConnections: string[];
    parentNodeId?: string;
    attachedToNodeId?: string;
    lane?: string;
    stage?: string;
  };

  lifecycle: {
    status: "draft" | "active" | "deprecated" | "archived";
    version: string;
    createdBy: string;
    createdDate: string;
    modifiedBy?: string;
    modifiedDate?: string;
    effectiveDate?: string;
    expirationDate?: string;
    changeDescription?: string;
  };

  executionPolicy?: {
    executionMode?: "sync" | "async" | "event_driven" | "human_in_loop";
    priority?: "low" | "normal" | "high" | "critical";
    transactionBoundary?: boolean;
    retryPolicy?: RetryPolicy;
    timeoutPolicy?: TimeoutPolicy;
    circuitBreakerPolicy?: CircuitBreakerPolicy;
    slaPolicy?: SLAPolicy;
  };

  governance: {
    auditEnabled: boolean;
    metricsEnabled?: boolean;
    tracingEnabled?: boolean;
    requiredPermissions?: string[];
    dataClassification?: "public" | "internal" | "confidential" | "restricted";
    costCenter?: string;
    tenantIdExpression?: string;
    makerCheckerRequired?: boolean;
    approvalPolicyRef?: string;
  };

  compliance?: {
    piiFields?: string[];
    pciFields?: string[];
    phiFields?: string[];
    secretsFields?: string[];
    dataResidency?: "local" | "global" | "eu-only" | "ca-only" | "us-only";
    maskingPolicy?: "none" | "partial" | "full" | "tokenized";
    encryptionRequired?: boolean;
    retentionPolicyRef?: string;
    legalHoldAware?: boolean;
  };

  idempotency?: {
    enabled: boolean;
    keyExpression?: string;
    ttl?: string;
    conflictBehavior?: "return_existing" | "reject" | "replay_safe" | "manual_review";
  };

  telemetry?: {
    traceIdExpression?: string;
    spanId?: string;
    traceInjection?: boolean;
    logLevel?: "debug" | "info" | "warn" | "error" | "fatal";
    captureInput?: boolean;
    captureOutput?: boolean;
    maskSensitiveData?: boolean;
    customTags?: Record<string, string>;
  };

  validation?: {
    schemaValidation?: "none" | "warn" | "strict";
    requiredProperties?: string[];
    designTimeValidation?: boolean;
    runtimeValidation?: boolean;
  };

  ui?: {
    icon?: string;
    color?: string;
    category?: string;
    displayOrder?: number;
    helpText?: string;
    propertyPanelSchemaRef?: string;
  };
}

// ─── Execution Status Model ────────────────────────────────────────────────────

export type FlowInstanceStatus =
  | "CREATED"
  | "QUEUED"
  | "RUNNING"
  | "WAITING"
  | "HUMAN_ACTION_REQUIRED"
  | "APPROVAL_PENDING"
  | "SUSPENDED"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"
  | "ESCALATED"
  | "COMPENSATING"
  | "COMPENSATED"
  | "TERMINATED";

export type NodeExecutionStatus =
  | "PENDING"
  | "READY"
  | "RUNNING"
  | "WAITING"
  | "SKIPPED"
  | "COMPLETED"
  | "FAILED"
  | "RETRYING"
  | "TIMED_OUT"
  | "ESCALATED"
  | "COMPENSATED";
