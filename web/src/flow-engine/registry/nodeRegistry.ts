/**
 * Enterprise Flow Node Registry
 * Metadata, icons, categories, default configurations for every node type.
 */
import type { FlowNodeType } from "../types/base";

export interface NodeMeta {
  type: FlowNodeType;
  label: string;
  category: FlowCategory;
  subCategory?: string;
  icon: string;           // Lucide icon name
  color: string;          // Tailwind CSS colour token
  bgColor: string;
  description: string;
  tags: string[];
  isTerminal?: boolean;
  isBoundary?: boolean;
  minIncoming?: number;
  maxIncoming?: number;
  minOutgoing?: number;
  maxOutgoing?: number;
  defaultConfig: Record<string, unknown>;
  helpText: string;
  exampleUseCase: string;
}

export type FlowCategory =
  | "Start"
  | "End"
  | "Routing"
  | "Parallel"
  | "Loop"
  | "Human"
  | "Approval"
  | "Service"
  | "Agent"
  | "Event"
  | "Error"
  | "SLA"
  | "Lifecycle";

export const FLOW_CATEGORIES: FlowCategory[] = [
  "Start", "End", "Routing", "Parallel", "Loop",
  "Human", "Approval", "Service", "Agent", "Event",
  "Error", "SLA", "Lifecycle",
];

const defaultLifecycle = {
  status: "draft",
  version: "1.0.0",
  createdBy: "system",
  createdDate: new Date().toISOString(),
};

const defaultGovernance = {
  auditEnabled: true,
  metricsEnabled: true,
  tracingEnabled: true,
};

const defaultTopology = {
  incomingConnections: [],
  outgoingConnections: [],
};

export const NODE_REGISTRY: Record<FlowNodeType, NodeMeta> = {

  // ── Start Events ─────────────────────────────────────────────────────────────
  START: {
    type: "START",
    label: "Start",
    category: "Start",
    icon: "PlayCircle",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
    description: "Workflow entry point. Defines what triggers execution and sets the initial context.",
    tags: ["entry", "trigger", "begin"],
    minIncoming: 0, maxIncoming: 0, minOutgoing: 1,
    helpText: "Every flow must begin with a Start node. Choose a trigger type: manual, schedule, API, queue, file, email, event, or agent.",
    exampleUseCase: "Email arrives → Email Start → begin invoice processing",
    defaultConfig: {
      trigger: { type: "MANUAL_START", config: {} },
      security: {},
      execution: { maxConcurrentRuns: 10, singletonEnforced: false, queueBehavior: "fifo" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: { ...defaultTopology, incomingConnections: [] },
    },
  },

  // ── End Events ───────────────────────────────────────────────────────────────
  END: {
    type: "END",
    label: "End",
    category: "End",
    icon: "StopCircle",
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    description: "Workflow terminal state. Closes the execution context, triggers cleanup and notifications.",
    tags: ["end", "terminal", "complete", "finish"],
    isTerminal: true,
    minIncoming: 1, maxIncoming: 999, minOutgoing: 0, maxOutgoing: 0,
    helpText: "Add multiple End nodes for different exit paths (success, failure, cancelled).",
    exampleUseCase: "Invoice approved → payment processed → Success End",
    defaultConfig: {
      status: "SUCCESS",
      returnPayload: true,
      cleanup: { deleteTempData: false, retainAuditLog: true, releaseLocks: true, clearIdempotencyKeys: false },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  // ── Routing ───────────────────────────────────────────────────────────────────
  DECISION: {
    type: "DECISION",
    label: "Decision",
    category: "Routing",
    icon: "GitBranch",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Evaluates an expression or rule and routes to one or more branches.",
    tags: ["if", "else", "condition", "branch", "route"],
    minIncoming: 1, minOutgoing: 2,
    helpText: "Use {variable} syntax in the expression. Always define a default/false path to prevent deployment blocking.",
    exampleUseCase: "invoice.amount > 10000 → requires high-level approval",
    defaultConfig: {
      condition: { type: "EXPRESSION", engine: "javascript", expression: "", variables: {} },
      branches: [
        { name: "Yes", condition: true,  targetNode: "", priority: 1 },
        { name: "No",  condition: false, targetNode: "", priority: 2 },
      ],
      executionMode: "FIRST_MATCH",
      audit: { decisionExplanation: true, conditionTrace: true, variableSnapshot: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  SWITCH: {
    type: "SWITCH",
    label: "Switch",
    category: "Routing",
    icon: "Shuffle",
    color: "text-amber-500",
    bgColor: "bg-amber-50",
    description: "Routes by discrete value, pattern, or range — like a multi-way if/else.",
    tags: ["switch", "case", "match", "pattern"],
    minIncoming: 1, minOutgoing: 2,
    helpText: "Always define a default path for unmatched cases.",
    exampleUseCase: "document.type → route to Invoice | PO | Receipt processor",
    defaultConfig: {
      source: "PAYLOAD",
      path: "",
      strategy: "EXACT",
      cases: [],
      defaultPath: "",
      fallback: { onNoMatch: "DEFAULT", onError: "ERROR_HANDLER" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  RULE_DECISION: {
    type: "RULE_DECISION",
    label: "Rule Decision",
    category: "Routing",
    icon: "BookCheck",
    color: "text-violet-600",
    bgColor: "bg-violet-50",
    description: "Invokes a centralized rule set from the enterprise rule engine without modifying workflow logic.",
    tags: ["rule", "policy", "drools", "decision-table", "dmn"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Reference a published rule set by ID. Use LATEST_ACTIVE to auto-pick the approved version.",
    exampleUseCase: "Credit scoring rule set → approve/reject loan application",
    defaultConfig: {
      ruleSet: { id: "", version: "", resolution: "LATEST_ACTIVE", type: "DECISION_TABLE" },
      inputMapping: {},
      outputMapping: {},
      execution: { mode: "STATELESS", cacheRules: true, cacheTTL: "PT5M" },
      audit: { logRuleExecution: true, trackRuleVersions: true, captureInputSnapshot: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  AI_DECISION: {
    type: "AI_DECISION",
    label: "AI Decision",
    category: "Routing",
    icon: "BrainCircuit",
    color: "text-fuchsia-600",
    bgColor: "bg-fuchsia-50",
    description: "Uses an AI/ML model to make routing decisions where deterministic rules are insufficient.",
    tags: ["ai", "ml", "llm", "predict", "classify"],
    minIncoming: 1, minOutgoing: 3,
    helpText: "Always define high-confidence, low-confidence, and fallback routes. Never allow AI to silently approve high-risk actions.",
    exampleUseCase: "Classify support ticket sentiment → route to appropriate team",
    defaultConfig: {
      model: { provider: "azure_openai", modelRef: "", version: "latest" },
      thresholds: { confidenceThreshold: 0.85, lowConfidenceAction: "HUMAN_REVIEW", highConfidenceAction: "AUTO_ROUTE" },
      fallback: { onModelError: "HUMAN_REVIEW", onTimeout: "DEFAULT_ROUTE", onPolicyViolation: "BLOCK" },
      routing: { highConfidence: "", lowConfidence: "", fallback: "" },
      governance: { ...defaultGovernance, groundingRequired: true, explainabilityRequired: true },
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  // ── Parallelization ───────────────────────────────────────────────────────────
  PARALLEL_SPLIT: {
    type: "PARALLEL_SPLIT",
    label: "Parallel Split",
    category: "Parallel",
    icon: "SplitSquareHorizontal",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    description: "Splits workflow into multiple concurrent branches that execute simultaneously.",
    tags: ["fork", "concurrent", "parallel", "split", "branches"],
    minIncoming: 1, minOutgoing: 2,
    helpText: "Pair with a Parallel Join to merge branches. Define error handling for branch failures.",
    exampleUseCase: "Notify manager + Update CRM + Post to ERP simultaneously",
    defaultConfig: {
      waitStrategy: "ALL_COMPLETE",
      context: { shareContext: "READ_ONLY", mergeResults: true, conflictResolution: "LAST_WRITE" },
      errorHandling: { onBranchFailure: "FAIL_FAST", errorAggregation: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  PARALLEL_JOIN: {
    type: "PARALLEL_JOIN",
    label: "Parallel Join",
    category: "Parallel",
    icon: "Merge",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
    description: "Waits for all (or N-of-M) parallel branches to complete before continuing.",
    tags: ["join", "merge", "sync", "aggregate"],
    minIncoming: 2, minOutgoing: 1,
    helpText: "Use N_OF_M completion mode when some branches are optional.",
    exampleUseCase: "Wait for all three approval stages before releasing payment",
    defaultConfig: {
      completionMode: "ALL_COMPLETE",
      aggregation: { strategy: "MERGE", resultType: "OBJECT", deduplication: false },
      cleanup: { cancelPendingBranches: false, releaseResources: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  // ── Iteration ─────────────────────────────────────────────────────────────────
  LOOP: {
    type: "LOOP",
    label: "Loop",
    category: "Loop",
    icon: "RefreshCw",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    description: "Iterates over a collection or repeats until a condition is met. Supports For Each, While, Do While.",
    tags: ["loop", "iterate", "foreach", "repeat", "collection"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Always set maxIterations. Enable infinite loop detection in safety controls.",
    exampleUseCase: "For each row in invoice table → validate → post to ERP",
    defaultConfig: {
      loopType: "FOR_EACH",
      collection: "",
      itemAlias: "item",
      indexAlias: "index",
      iterationConfig: { maxIterations: 1000, timeout: "PT1H", batchSize: 100, parallelism: 1 },
      safetyControls: { infiniteLoopDetection: true, stackDepthLimit: 50 },
      errorHandling: { onError: "ABORT" },
      stateManagement: { checkpointEnabled: true, checkpointInterval: 100, resumeEnabled: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  RETRY: {
    type: "RETRY",
    label: "Retry",
    category: "Error",
    icon: "RotateCcw",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    description: "Retries a failed operation with configurable backoff and circuit breaker protection.",
    tags: ["retry", "backoff", "circuit-breaker", "resilience"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Use exponential backoff for external services. Define non-retryable errors explicitly.",
    exampleUseCase: "Payment API timeout → retry 3× with exponential backoff",
    defaultConfig: {
      maxRetries: 3,
      backoff: "EXPONENTIAL",
      backoffConfig: { initialDelay: "PT1S", maxDelay: "PT30S", multiplier: 2, jitter: true },
      retryableErrors: ["TIMEOUT", "NETWORK_ERROR", "SERVICE_UNAVAILABLE"],
      nonRetryableErrors: ["AUTHENTICATION_FAILED", "BUSINESS_VALIDATION_ERROR"],
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  // ── Human Workflow ────────────────────────────────────────────────────────────
  USER_TASK: {
    type: "USER_TASK",
    label: "User Task",
    category: "Human",
    icon: "UserCheck",
    color: "text-sky-600",
    bgColor: "bg-sky-50",
    description: "Pauses the workflow and assigns a task to a human actor for review, decision, or data entry.",
    tags: ["human", "manual", "review", "task", "action"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Configure SLA to auto-escalate if the task is not completed within the deadline.",
    exampleUseCase: "Invoice requires manager review → create Action Center task → wait for response",
    defaultConfig: {
      assignment: {
        primary: { type: "ROLE", value: "" },
      },
      form: { id: "", version: "1.0.0", context: {} },
      actions: ["APPROVE", "REJECT", "DELEGATE", "REQUEST_INFO"],
      sla: { duration: "PT24H", warning: "PT20H", escalation: "PT23H" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  APPROVAL_TASK: {
    type: "APPROVAL_TASK",
    label: "Approval Task",
    category: "Approval",
    icon: "ClipboardCheck",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
    description: "Multi-level approval gate with maker-checker enforcement, delegation, and cryptographic signing.",
    tags: ["approval", "sign-off", "maker-checker", "compliance"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Enable preventSelfApproval and makerCheckerEnforced for financial and compliance workflows.",
    exampleUseCase: "Purchase order > $50,000 → 3-level parallel approval with CFO veto right",
    defaultConfig: {
      approvalType: "SEQUENTIAL",
      levels: [{ name: "Level 1", requiredApprovals: 1, pool: "", timeout: "PT24H" }],
      rules: {
        makerCheckerEnforced: true,
        preventSelfApproval: true,
        delegationAllowed: true,
        consensusRequired: false,
        vetoEnabled: false,
      },
      compliance: {
        requireAuthenticationOnAction: true,
        cryptographicSignatureRequired: false,
        auditReasonRequired: true,
      },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  // ── Service Execution ─────────────────────────────────────────────────────────
  SERVICE_TASK: {
    type: "SERVICE_TASK",
    label: "Service Task",
    category: "Service",
    icon: "Zap",
    color: "text-cyan-600",
    bgColor: "bg-cyan-50",
    description: "Calls an external service, API, database, message queue, or connector.",
    tags: ["api", "rest", "http", "service", "integration", "connector"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Never store credentials in the node config. Use credentialRef to reference vault assets.",
    exampleUseCase: "POST invoice data to SAP ERP via REST connector",
    defaultConfig: {
      service: { type: "REST", endpoint: "" },
      method: { verb: "POST", headers: {} },
      authentication: { type: "OAUTH2_CLIENT_CREDENTIALS", credentialRef: "" },
      request: { validation: true },
      response: { schemaValidation: true },
      resilience: {
        timeout: { connect: "PT5S", read: "PT30S" },
        retry: { enabled: true, maxRetries: 3, backoff: "exponential" },
      },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  AGENT_TASK: {
    type: "AGENT_TASK",
    label: "Agent Task",
    category: "Agent",
    icon: "Bot",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    description: "Delegates work to an AI agent with defined tools, goals, guardrails, and human oversight thresholds.",
    tags: ["ai", "agent", "llm", "autonomous", "tool-calling"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Define allowedActions and blockedActions explicitly. Set confidenceThreshold for human oversight.",
    exampleUseCase: "Agent extracts invoice line items, validates against PO, flags discrepancies",
    defaultConfig: {
      agent: { id: "", version: "latest", architecture: "TOOL_CALLING" },
      goal: { description: "", successCriteria: "" },
      tools: [],
      memory: { type: "SHORT_TERM", windowSize: 10, persistence: "CHECKPOINT_STORE" },
      guardrails: {
        maxCost: "USD 0.50",
        maxIterations: 20,
        hallucinationTolerance: "STRICT",
        groundingRequired: true,
        piiEgressBlocked: true,
        allowedActions: [],
        blockedActions: ["DELETE_RECORD", "SEND_EXTERNAL_EMAIL"],
      },
      humanOversight: { requiredFor: ["destructive_actions"], confidenceThreshold: 0.90, escalationContact: "" },
      output: { format: "STRUCTURED" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  SUB_PROCESS: {
    type: "SUB_PROCESS",
    label: "Sub Process",
    category: "Service",
    icon: "Boxes",
    color: "text-cyan-500",
    bgColor: "bg-cyan-50",
    description: "Calls another workflow as a reusable component. Supports embedded and isolated execution modes.",
    tags: ["subprocess", "reusable", "embedded", "call-activity"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Use LATEST_ACTIVE resolution to always run the approved version of the sub-process.",
    exampleUseCase: "Reuse 'Vendor Onboarding' sub-process across Purchase and Service workflows",
    defaultConfig: {
      subProcess: { flow: "", resolutionStrategy: "LATEST_ACTIVE" },
      invocation: { mode: "ISOLATED", execution: "SYNCHRONOUS" },
      context: { sharing: "COPY", inputMapping: {}, outputMapping: {} },
      errorHandling: { propagateErrors: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  SCRIPT_TASK: {
    type: "SCRIPT_TASK",
    label: "Script Task",
    category: "Service",
    icon: "Code2",
    color: "text-slate-600",
    bgColor: "bg-slate-50",
    description: "Executes controlled lightweight logic in a sandboxed environment.",
    tags: ["script", "code", "transform", "custom-logic"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Sandbox is mandatory. Prefer Data Transformation for schema mapping. Require approval for production scripts.",
    exampleUseCase: "Calculate VAT based on region-specific tax rules",
    defaultConfig: {
      script: { language: "JAVASCRIPT", source: "INLINE", code: "" },
      inputs: {},
      outputs: {},
      security: {
        sandbox: true,
        maxExecutionTime: "PT10S",
        maxMemory: "256MB",
        networkAccess: false,
        fileSystemAccess: false,
      },
      audit: { logScriptExecution: true, logInputsOutputs: true, maskPII: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  DATA_TRANSFORMATION: {
    type: "DATA_TRANSFORMATION",
    label: "Data Transformation",
    category: "Service",
    icon: "ArrowLeftRight",
    color: "text-cyan-700",
    bgColor: "bg-cyan-50",
    description: "Transforms data between schemas using JSONata, JMESPath, XSLT, or visual mapping designer.",
    tags: ["transform", "map", "convert", "schema", "etl"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Always define input and output schemas. Version every mapping for rollback capability.",
    exampleUseCase: "Map SAP IDOC format → platform canonical invoice schema",
    defaultConfig: {
      engine: "MAPPING_DESIGNER",
      schema: { input: "", output: "" },
      mapping: { source: "", target: "", expression: "" },
      validation: { validateInputSchema: true, validateOutputSchema: true, onValidationError: "HALT_AND_CATCH" },
      transformationOptions: { nullHandling: "PRESERVE", typeCoercion: false },
      audit: { captureBeforeAfter: true, maskSensitiveFields: true, storeMappingVersion: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  // ── Event Processing ──────────────────────────────────────────────────────────
  WAIT: {
    type: "WAIT",
    label: "Wait",
    category: "Event",
    icon: "Clock",
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    description: "Suspends workflow execution for a fixed duration, until a datetime, or during business hours.",
    tags: ["wait", "delay", "pause", "timer"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Use BUSINESS_HOURS mode to avoid sending notifications outside working hours.",
    exampleUseCase: "Wait 48 business hours for vendor response before escalating",
    defaultConfig: {
      waitMode: "FIXED_DURATION",
      configuration: { waitDuration: "PT1H" },
      timeout: { maxWait: "PT24H", onTimeout: "ESCALATE" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  WAIT_FOR_EVENT: {
    type: "WAIT_FOR_EVENT",
    label: "Wait for Event",
    category: "Event",
    icon: "Antenna",
    color: "text-yellow-500",
    bgColor: "bg-yellow-50",
    description: "Suspends workflow and waits for an external event to resume it, identified by a correlation key.",
    tags: ["event", "correlation", "resume", "async", "webhook"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Always define a correlation key and timeout. Dehydrate on wait to release worker resources.",
    exampleUseCase: "Wait for payment confirmation webhook from payment gateway",
    defaultConfig: {
      eventPattern: { type: "API", eventName: "" },
      correlation: { key: "", source: "PAYLOAD", matchType: "EXACT" },
      stateManagement: { dehydrateOnWait: true, priorityOnWake: "HIGH", checkpointBeforeWait: true },
      eventFilter: { schemaValidation: "WARN", dropMalformedEvents: false },
      orphanHandling: { onInstanceNotFound: "LOG_AND_DISCARD", onInstanceCompleted: "LOG_AND_DISCARD" },
      timeout: { duration: "PT24H", onTimeout: "ESCALATE" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  MESSAGE_EVENT: {
    type: "MESSAGE_EVENT",
    label: "Message Event",
    category: "Event",
    icon: "MessageSquare",
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
    description: "Publishes or subscribes to messages on a broker (Kafka, RabbitMQ, Azure Service Bus, etc.).",
    tags: ["kafka", "rabbitmq", "event-bus", "message", "pub-sub"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Choose EXACTLY_ONCE delivery for financial or compliance-critical messages.",
    exampleUseCase: "Publish PaymentCompleted event to Kafka → notify downstream services",
    defaultConfig: {
      direction: "PUBLISH",
      message: { type: "EVENT", name: "", payload: {} },
      broker: { type: "KAFKA", topic: "" },
      qualityOfService: { delivery: "AT_LEAST_ONCE", compression: "NONE" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  SIGNAL_EVENT: {
    type: "SIGNAL_EVENT",
    label: "Signal Event",
    category: "Event",
    icon: "Radio",
    color: "text-lime-600",
    bgColor: "bg-lime-50",
    description: "Broadcasts a signal to all matching workflow instances within a scope (local, tenant, global).",
    tags: ["signal", "broadcast", "notify", "cross-process"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Use TENANT scope for cross-process signals. Use LOCAL for within-process coordination.",
    exampleUseCase: "Broadcast 'emergency_stop' signal to cancel all running invoice batch instances",
    defaultConfig: {
      signal: { name: "", scope: "TENANT", payload: {} },
      targeting: { instances: "MATCHING" },
      reliability: { deliveryGuarantee: "AT_LEAST_ONCE", timeout: "PT10S", retryOnFailure: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  // ── Error Handling ────────────────────────────────────────────────────────────
  ERROR_BOUNDARY_EVENT: {
    type: "ERROR_BOUNDARY_EVENT",
    label: "Error Handler",
    category: "Error",
    icon: "ShieldAlert",
    color: "text-red-600",
    bgColor: "bg-red-50",
    description: "Attaches to a node to intercept errors and route them to recovery paths.",
    tags: ["error", "exception", "fault", "handler", "boundary"],
    isBoundary: true,
    minIncoming: 0, maxIncoming: 0, minOutgoing: 1,
    helpText: "Attach to a Service Task or Approval Task. Define handlers for each error type.",
    exampleUseCase: "SAP connector timeout → retry 2× → manual review queue",
    defaultConfig: {
      attachedTo: "",
      errorHandlers: [
        { errorType: "TIMEOUT", action: "RETRY", maxRetries: 2 },
        { errorType: "SYSTEM_ERROR", action: "ESCALATE" },
        { errorType: "BUSINESS_ERROR", action: "MANUAL_REVIEW" },
      ],
      defaultHandler: { action: "ESCALATE", compensationScope: "NODE" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: { ...defaultTopology, incomingConnections: [] },
    },
  },

  COMPENSATION: {
    type: "COMPENSATION",
    label: "Compensation",
    category: "Error",
    icon: "Undo2",
    color: "text-rose-600",
    bgColor: "bg-rose-50",
    description: "Executes compensating transactions to undo completed steps when a process fails or is cancelled.",
    tags: ["undo", "rollback", "saga", "compensate", "reverse"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Use REVERSE order to undo steps in the reverse order they were executed (saga pattern).",
    exampleUseCase: "Payment failed after inventory deducted → reverse inventory → notify supplier",
    defaultConfig: {
      compensationScope: "TRANSACTION_BOUNDARY",
      compensationActions: [],
      execution: { order: "REVERSE", mode: "BEST_EFFORT", timeout: "PT10M", onCompensationFailure: "ESCALATE" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  // ── SLA & Escalation ──────────────────────────────────────────────────────────
  ESCALATION: {
    type: "ESCALATION",
    label: "Escalation",
    category: "SLA",
    icon: "TrendingUp",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
    description: "Escalates to higher authority or alternate path when SLA, confidence, or business conditions are breached.",
    tags: ["escalate", "sla", "alert", "override"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Define escalation paths at multiple priority levels. Include context in notifications for actionable alerts.",
    exampleUseCase: "Invoice unpaid 30 days → escalate to collections team with full payment history",
    defaultConfig: {
      triggers: [{ type: "SLA_BREACH", condition: "", priority: "HIGH" }],
      escalationPath: { HIGH: { target: "", timeout: "PT4H" } },
      notification: { channels: ["email", "dashboard"], includeContext: true, urgency: "HIGH" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  MILESTONE: {
    type: "MILESTONE",
    label: "Milestone",
    category: "SLA",
    icon: "Flag",
    color: "text-teal-600",
    bgColor: "bg-teal-50",
    description: "Marks a significant progress point in the workflow for reporting and SLA tracking.",
    tags: ["milestone", "checkpoint", "progress", "stage", "gate"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Use milestones to define process stages for dashboard reporting and SLA measurement.",
    exampleUseCase: "Invoice Received → Validated → Approved → Paid (4 milestones for AP dashboard)",
    defaultConfig: {
      milestones: [{ name: "", progress: 0, criteria: "" }],
      reporting: { trackElapsedTime: true, trackBetweenMilestones: true, alertOnDelay: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  TIMER_BOUNDARY_EVENT: {
    type: "TIMER_BOUNDARY_EVENT",
    label: "Timer",
    category: "SLA",
    icon: "Timer",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
    description: "Attaches to a task and fires after a duration, cancelling or interrupting the task if needed.",
    tags: ["timer", "timeout", "deadline", "sla", "boundary"],
    isBoundary: true,
    minIncoming: 0, maxIncoming: 0, minOutgoing: 1,
    helpText: "Attach to User Task or Approval Task to enforce SLA deadlines.",
    exampleUseCase: "Approval task not completed in 24h → interrupt → escalate to manager",
    defaultConfig: {
      attachedTo: "",
      timer: { type: "DURATION", value: "PT24H", startOn: "TASK_START" },
      behavior: { interruptActivity: true, cancelActivity: true, onTimeout: "ESCALATE" },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: { ...defaultTopology, incomingConnections: [] },
    },
  },

  // ── Process Lifecycle ──────────────────────────────────────────────────────────
  BUSINESS_CALENDAR: {
    type: "BUSINESS_CALENDAR",
    label: "Business Calendar",
    category: "Lifecycle",
    icon: "CalendarClock",
    color: "text-sky-700",
    bgColor: "bg-sky-50",
    description: "Defines working hours, holidays, and maintenance windows for SLA calculation and scheduling.",
    tags: ["calendar", "business-hours", "sla", "holidays", "timezone"],
    minIncoming: 0, minOutgoing: 0,
    helpText: "Reference this calendar in SLA policies and Wait nodes to respect working hours.",
    exampleUseCase: "UK business calendar (Mon-Fri 9-17 GMT, excluding bank holidays) for SLA calculation",
    defaultConfig: {
      calendar: {
        id: "",
        timezone: "UTC",
        workingHours: {
          MONDAY: "09:00-17:00", TUESDAY: "09:00-17:00", WEDNESDAY: "09:00-17:00",
          THURSDAY: "09:00-17:00", FRIDAY: "09:00-17:00", SATURDAY: null, SUNDAY: null,
        },
        holidays: [],
        maintenanceWindows: [],
      },
      usage: { slaCalculation: true, scheduling: true, escalation: true, reporting: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },

  PROCESS_CHECKPOINT: {
    type: "PROCESS_CHECKPOINT",
    label: "Checkpoint",
    category: "Lifecycle",
    icon: "Save",
    color: "text-slate-700",
    bgColor: "bg-slate-50",
    description: "Persists complete workflow state for crash recovery, resume, and replay capability.",
    tags: ["checkpoint", "snapshot", "recovery", "replay", "resume"],
    minIncoming: 1, minOutgoing: 1,
    helpText: "Place checkpoints before long-running operations and wait nodes to enable safe resume on failure.",
    exampleUseCase: "Checkpoint before each external API call in a 50-step batch process",
    defaultConfig: {
      checkpoint: {
        strategy: "AUTOMATIC",
        frequency: "BEFORE_WAIT",
        storage: { type: "PERSISTENT", location: "checkpoint_store", retention: "P30D" },
      },
      data: { variables: true, attachments: false, executionState: true, nodePosition: true, timers: true, compensationState: true, correlationKeys: true },
      recovery: { autoResume: true, resumeFrom: "LAST_CHECKPOINT", maxResumeAttempts: 3 },
      replay: { enabled: true, retention: "P90D", includeAudit: true },
      governance: defaultGovernance,
      lifecycle: defaultLifecycle,
      topology: defaultTopology,
    },
  },
};

// ─── Helper utilities ─────────────────────────────────────────────────────────

export function getNodesByCategory(category: FlowCategory): NodeMeta[] {
  return Object.values(NODE_REGISTRY).filter(n => n.category === category);
}

export function getAllCategories(): { category: FlowCategory; nodes: NodeMeta[] }[] {
  return FLOW_CATEGORIES.map(cat => ({
    category: cat,
    nodes: getNodesByCategory(cat),
  })).filter(c => c.nodes.length > 0);
}

export function getNodeMeta(type: FlowNodeType): NodeMeta {
  return NODE_REGISTRY[type];
}

export function searchNodes(query: string): NodeMeta[] {
  const q = query.toLowerCase();
  return Object.values(NODE_REGISTRY).filter(n =>
    n.label.toLowerCase().includes(q) ||
    n.description.toLowerCase().includes(q) ||
    n.tags.some(t => t.includes(q)) ||
    n.helpText.toLowerCase().includes(q)
  );
}
