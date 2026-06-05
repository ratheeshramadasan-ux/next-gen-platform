/**
 * Enterprise Flow Tool Node Interfaces — all 28 node types
 */
import type { FlowNode, RetryPolicy, CircuitBreakerPolicy } from "../base";

// ─── Start ────────────────────────────────────────────────────────────────────

export interface StartNode extends FlowNode {
  type: "START";
  trigger: {
    type: "MANUAL_START" | "SCHEDULE_START" | "API_START" | "QUEUE_START"
        | "FILE_START" | "EMAIL_START" | "EVENT_START" | "AGENT_START";
    config: Record<string, unknown>;
  };
  inputSchema?: object;
  validation?: FlowNode["validation"] & {
    mode: "none" | "lenient" | "strict";
    haltOnError: boolean;
    defaults?: Record<string, unknown>;
  };
  security: {
    allowedRoles?: string[];
    allowedGroups?: string[];
    apiAuth?: {
      type: "api_key" | "oauth2" | "jwt" | "mutual_tls";
      scopes?: string[];
      certificateRef?: string;
    };
  };
  execution: {
    maxConcurrentRuns?: number;
    singletonEnforced?: boolean;
    queueBehavior?: "fifo" | "priority" | "lifo";
    throttleLimit?: number;
    throttleWindow?: string;
    staleExecutionTimeout?: string;
  };
}

// ─── End ──────────────────────────────────────────────────────────────────────

export interface EndNode extends FlowNode {
  type: "END";
  status: "SUCCESS" | "FAILURE" | "CANCELLED" | "ESCALATED" | "TERMINATED";
  returnPayload?: boolean;
  payloadTransform?: {
    include?: string[];
    exclude?: string[];
    maskSensitiveFields?: boolean;
  };
  cleanup?: {
    deleteTempData?: boolean;
    archiveAfterDays?: number;
    retainAuditLog?: boolean;
    releaseLocks?: boolean;
    clearIdempotencyKeys?: boolean;
  };
  notifications?: {
    onSuccess?: string[];
    onFailure?: string[];
    onCancelled?: string[];
    channels?: ("email" | "slack" | "teams" | "dashboard" | "webhook")[];
  };
}

// ─── Decision ─────────────────────────────────────────────────────────────────

export interface DecisionNode extends FlowNode {
  type: "DECISION";
  condition: {
    type: "VISUAL_RULE" | "EXPRESSION" | "DMN" | "FEEL" | "AI_ASSISTED";
    engine?: "javascript" | "python" | "feel" | "dmn";
    expression?: string;
    variables?: Record<string, unknown>;
  };
  branches: {
    name: string;
    condition: boolean | string;
    targetNode: string;
    priority?: number;
  }[];
  executionMode: "FIRST_MATCH" | "ALL_MATCHES" | "PRIORITY_MATCH";
  testing?: {
    simulationEnabled?: boolean;
    testCases?: { input: object; expected: string }[];
  };
  audit?: {
    decisionExplanation?: boolean;
    conditionTrace?: boolean;
    variableSnapshot?: boolean;
  };
}

// ─── Switch ───────────────────────────────────────────────────────────────────

export interface SwitchNode extends FlowNode {
  type: "SWITCH";
  source: "CONTEXT" | "PAYLOAD" | "HEADER" | "VARIABLE";
  path: string;
  strategy: "EXACT" | "PATTERN" | "RANGE" | "CONTENT" | "REGEX";
  cases: {
    value: string;
    target: string;
    transform?: boolean;
    priority?: number;
  }[];
  defaultPath?: string;
  transform?: {
    caseSensitive?: boolean;
    trimWhitespace?: boolean;
    normalizeEncoding?: "UTF-8" | "ASCII";
  };
  fallback?: {
    onNoMatch: "DEFAULT" | "ERROR" | "MANUAL_REVIEW";
    onError: "ERROR_HANDLER" | "FAIL" | "DEFAULT";
  };
}

// ─── Rule Decision ────────────────────────────────────────────────────────────

export interface RuleDecisionNode extends FlowNode {
  type: "RULE_DECISION";
  ruleSet: {
    id: string;
    version?: string;
    resolution: "EXACT" | "LATEST_ACTIVE" | "LATEST_COMPATIBLE";
    type?: "DECISION_TABLE" | "RULE_FLOW" | "DECISION_TREE" | "SCORECARD";
  };
  inputMapping: Record<string, string>;
  outputMapping: Record<string, string>;
  execution: {
    mode: "STATELESS" | "STATEFUL";
    cacheRules?: boolean;
    cacheTTL?: string;
  };
  audit: {
    logRuleExecution: boolean;
    trackRuleVersions: boolean;
    captureInputSnapshot: boolean;
  };
}

// ─── AI Decision ──────────────────────────────────────────────────────────────

export interface AIDecisionNode extends FlowNode {
  type: "AI_DECISION";
  model: {
    provider: "openai" | "azure_openai" | "bedrock" | "vertex" | "custom";
    modelRef: string;
    version?: string;
    endpoint?: string;
  };
  prompt?: {
    template: string;
    variables: Record<string, string>;
  };
  parameters?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
  };
  thresholds: {
    confidenceThreshold: number;
    lowConfidenceAction: "HUMAN_REVIEW" | "DEFAULT_ROUTE" | "QUEUE_FOR_RETRY";
    highConfidenceAction: "AUTO_ROUTE" | "RULE_VALIDATE";
  };
  governance: FlowNode["governance"] & {
    groundingRequired?: boolean;
    biasCheckRequired?: boolean;
    explainabilityRequired?: boolean;
  };
  fallback: {
    onModelError: "DEFAULT_ROUTE" | "HUMAN_REVIEW" | "QUEUE_FOR_RETRY";
    onTimeout: "DEFAULT_ROUTE" | "QUEUE_FOR_RETRY";
    onPolicyViolation: "BLOCK" | "HUMAN_REVIEW";
  };
  routing: {
    highConfidence: string;
    lowConfidence: string;
    fallback: string;
  };
}

// ─── Parallel Split ───────────────────────────────────────────────────────────

export interface ParallelSplitNode extends FlowNode {
  type: "PARALLEL_SPLIT";
  maxParallel?: number;
  executionLimit?: { type: "SOFT" | "HARD"; maxThreads: number };
  waitStrategy: "ALL_COMPLETE" | "ANY_COMPLETE" | "N_OF_M" | "PERCENTAGE";
  completionCriteria?: {
    type: "COUNT" | "PERCENTAGE" | "CONDITION";
    threshold?: number;
    expression?: string;
  };
  threadManagement?: {
    poolSize: "AUTO" | number;
    threadPriority?: "LOW" | "NORMAL" | "HIGH";
    threadIsolation?: boolean;
  };
  errorHandling?: {
    onBranchFailure: "CONTINUE" | "FAIL_FAST" | "COMPENSATE" | "ESCALATE";
    failFast?: boolean;
    errorAggregation?: boolean;
  };
  context: {
    shareContext: "READ_ONLY" | "COPY" | "SHARED_MUTABLE";
    mergeResults?: boolean;
    conflictResolution?: "LAST_WRITE" | "FIRST_WRITE" | "ERROR" | "CUSTOM";
  };
}

// ─── Parallel Join ────────────────────────────────────────────────────────────

export interface ParallelJoinNode extends FlowNode {
  type: "PARALLEL_JOIN";
  completionMode: "ALL_COMPLETE" | "N_OF_M" | "PERCENTAGE_COMPLETE" | "FIRST_RESPONSE" | "PRIORITY_RESPONSE";
  configuration?: {
    requiredCompletions?: number;
    totalBranches?: number;
    percentage?: number;
  };
  timeout?: {
    duration: string;
    onTimeout: "FAIL" | "PROCEED_WITH_COMPLETED" | "ESCALATE" | "COMPENSATE";
  };
  aggregation?: {
    strategy: "MERGE" | "ARRAY" | "MAP" | "BEST_SCORE" | "CUSTOM";
    resultType?: "OBJECT" | "ARRAY";
    deduplication?: boolean;
    sortBy?: string;
  };
  cleanup?: {
    cancelPendingBranches?: boolean;
    releaseResources?: boolean;
  };
}

// ─── Loop ─────────────────────────────────────────────────────────────────────

export interface LoopNode extends FlowNode {
  type: "LOOP";
  loopType: "FOR_EACH" | "WHILE" | "DO_WHILE" | "COLLECTION_ITERATOR";
  collection?: string;
  condition?: string;
  itemAlias?: string;
  indexAlias?: string;
  iterationConfig: {
    maxIterations: number;
    timeout: string;
    batchSize?: number;
    parallelism?: number;
  };
  safetyControls: {
    infiniteLoopDetection: boolean;
    cpuGuardrail?: string;
    memoryGuardrail?: string;
    stackDepthLimit?: number;
  };
  errorHandling: {
    onError: "CONTINUE" | "ABORT" | "RETRY_ITEM" | "SEND_TO_EXCEPTION_QUEUE";
    errorThreshold?: string;
    errorAction?: "ABORT" | "ESCALATE" | "COMPENSATE";
  };
  stateManagement: {
    checkpointEnabled: boolean;
    checkpointInterval?: number;
    resumeEnabled: boolean;
  };
}

// ─── Retry ────────────────────────────────────────────────────────────────────

export interface RetryNode extends FlowNode {
  type: "RETRY";
  maxRetries: number;
  backoff: "FIXED" | "LINEAR" | "EXPONENTIAL";
  backoffConfig: {
    initialDelay: string;
    maxDelay: string;
    multiplier?: number;
    jitter?: boolean;
  };
  retryableErrors: string[];
  nonRetryableErrors: string[];
  circuitBreaker?: CircuitBreakerPolicy;
  notification?: {
    onRetryExhaustion?: string[];
    onCircuitOpen?: string[];
  };
}

// ─── Wait ─────────────────────────────────────────────────────────────────────

export interface WaitNode extends FlowNode {
  type: "WAIT";
  waitMode: "FIXED_DURATION" | "UNTIL_DATETIME" | "BUSINESS_HOURS" | "SLA_WINDOW" | "CONDITIONAL_WAIT";
  configuration: {
    waitDuration?: string;
    untilDateTime?: string;
    businessCalendar?: string;
    condition?: string;
  };
  calendar?: {
    timezone: string;
    businessHours?: string;
    workingDays?: string[];
    holidays?: string[];
  };
  timeout?: {
    maxWait: string;
    onTimeout: "ESCALATE" | "FAIL" | "CONTINUE" | "COMPENSATE";
  };
  interruption?: {
    interruptible: boolean;
    interruptSignals?: string[];
  };
}

// ─── Wait For Event ───────────────────────────────────────────────────────────

export interface WaitForEventNode extends FlowNode {
  type: "WAIT_FOR_EVENT";
  eventPattern: {
    type: "API" | "MESSAGE" | "USER" | "SYSTEM" | "TIME" | "EXTERNAL";
    eventName: string;
    source?: string;
  };
  correlation: {
    key: string;
    source: string;
    matchType: "EXACT" | "PATTERN" | "COMPOSITE";
  };
  stateManagement: {
    dehydrateOnWait: boolean;
    priorityOnWake: "LOW" | "NORMAL" | "HIGH" | "CRITICAL";
    checkpointBeforeWait?: boolean;
  };
  eventFilter: {
    schemaValidation: "NONE" | "WARN" | "STRICT";
    dropMalformedEvents: boolean;
    conditions?: { field: string; operator: string; value: string }[];
  };
  orphanHandling: {
    onInstanceNotFound: "LOG_AND_DISCARD" | "CREATE_EXCEPTION" | "START_NEW_INSTANCE";
    onInstanceCompleted: "LOG_AND_DISCARD" | "TRIGGER_COMPENSATION" | "CREATE_AUDIT_EVENT";
  };
  timeout: {
    duration: string;
    onTimeout: "FOLLOW_UP_REQUIRED" | "ESCALATE" | "FAIL" | "COMPENSATE";
  };
  multipleEvents?: {
    mode: "ANY" | "ALL" | "FIRST_MATCH" | "PRIORITY";
    eventNames: string[];
    timeout?: string;
  };
}

// ─── User Task ────────────────────────────────────────────────────────────────

export interface UserTaskNode extends FlowNode {
  type: "USER_TASK";
  assignment: {
    primary: {
      type: "USER" | "ROLE" | "GROUP" | "QUEUE" | "ROUND_ROBIN" | "LOAD_BALANCED" | "SKILL_BASED" | "AI_SUGGESTED";
      value: string;
    };
    escalation?: {
      type: "USER" | "ROLE" | "GROUP" | "QUEUE";
      value: string;
      after: string;
    };
  };
  form: {
    id: string;
    version: string;
    context: Record<string, string>;
  };
  actions: ("APPROVE" | "REJECT" | "DELEGATE" | "ESCALATE" | "REQUEST_INFO" | "SUSPEND" | "SKIP")[];
  sla?: {
    duration: string;
    warning?: string;
    escalation?: string;
  };
  notifications?: {
    onAssignment?: string[];
    reminders?: string[];
    overdue?: string[];
  };
}

// ─── Approval Task ────────────────────────────────────────────────────────────

export interface ApprovalTaskNode extends FlowNode {
  type: "APPROVAL_TASK";
  approvalType: "SINGLE" | "SEQUENTIAL" | "PARALLEL" | "MULTI_LEVEL";
  levels: {
    name: string;
    requiredApprovals: number;
    pool: string;
    timeout: string;
    condition?: string;
  }[];
  rules: {
    minimumApprovals?: number;
    consensusRequired?: boolean;
    majorityThreshold?: number;
    vetoEnabled?: boolean;
    makerCheckerEnforced: boolean;
    preventSelfApproval: boolean;
    delegationAllowed: boolean;
  };
  compliance: FlowNode["compliance"] & {
    requireAuthenticationOnAction: boolean;
    cryptographicSignatureRequired: boolean;
    auditReasonRequired: boolean;
  };
  autoApproval?: {
    enabled: boolean;
    conditions: Record<string, unknown>[];
  };
}

// ─── Service Task ─────────────────────────────────────────────────────────────

export interface ServiceTaskNode extends FlowNode {
  type: "SERVICE_TASK";
  service: {
    type: "REST" | "SOAP" | "GRPC" | "GRAPHQL" | "DATABASE" | "MESSAGE_QUEUE" | "BOT_RPA" | "CONNECTOR" | "MICROSERVICE";
    connector?: string;
    version?: string;
    endpoint?: string;
  };
  method?: {
    verb?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
  };
  authentication: {
    type: "NONE" | "API_KEY" | "OAUTH2_CLIENT_CREDENTIALS" | "JWT" | "BASIC" | "MUTUAL_TLS";
    credentialRef?: string;
    certificateRef?: string;
    scopes?: string[];
    tokenRotation?: "MANUAL" | "AUTOMATIC";
  };
  request: {
    inputMapping?: Record<string, string>;
    validation?: boolean;
    idempotencyKey?: string;
    headers?: Record<string, string>;
  };
  response: {
    outputMapping?: Record<string, string>;
    errorMapping?: Record<string, string>;
    schemaValidation?: boolean;
  };
  resilience: {
    timeout: { connect: string; read: string };
    retry?: RetryPolicy;
    circuitBreaker?: CircuitBreakerPolicy;
    degradation?: {
      onHighLatency: "RETURN_CACHED_LAST_KNOWN" | "USE_FALLBACK_SERVICE" | "QUEUE_FOR_LATER" | "FAIL_FAST";
      cacheTTL?: string;
      fallbackServiceRef?: string;
    };
  };
}

// ─── Agent Task ───────────────────────────────────────────────────────────────

export interface AgentTaskNode extends FlowNode {
  type: "AGENT_TASK";
  agent: {
    id: string;
    version: string;
    model?: string;
    architecture?: "REACT" | "PLAN_EXECUTE" | "TOOL_CALLING" | "MULTI_AGENT";
    delegation?: {
      allowed: boolean;
      maxSubAgents?: number;
      allowedSubAgents?: string[];
    };
  };
  goal: {
    description: string;
    successCriteria: string;
  };
  tools: string[];
  knowledgeBase?: {
    vectorStoreRef: string;
    semanticSearch: { topK: number; similarityThreshold: number };
  };
  memory?: {
    type: "NONE" | "SHORT_TERM" | "THREADED" | "LONG_TERM";
    windowSize?: number;
    persistence?: "NONE" | "CHECKPOINT_STORE" | "VECTOR_STORE";
  };
  guardrails: {
    maxCost: string;
    maxIterations: number;
    maxTime?: string;
    hallucinationTolerance?: "LOW" | "MEDIUM" | "STRICT";
    groundingRequired?: boolean;
    piiEgressBlocked?: boolean;
    allowedActions: string[];
    blockedActions: string[];
  };
  humanOversight: {
    requiredFor: string[];
    confidenceThreshold: number;
    escalationContact: string;
  };
  output: {
    format: "TEXT" | "STRUCTURED" | "JSON" | "ARTIFACT";
    schema?: string;
    artifacts?: string[];
  };
}

// ─── Sub Process ──────────────────────────────────────────────────────────────

export interface SubProcessNode extends FlowNode {
  type: "SUB_PROCESS";
  subProcess: {
    flow: string;
    version?: string;
    resolutionStrategy: "EXACT" | "LATEST_ACTIVE" | "LATEST_COMPATIBLE";
  };
  invocation: {
    mode: "EMBEDDED" | "ISOLATED";
    execution: "SYNCHRONOUS" | "ASYNCHRONOUS";
  };
  context: {
    sharing: "SHARED" | "ISOLATED" | "COPY";
    inputMapping: Record<string, string>;
    outputMapping: Record<string, string>;
  };
  errorHandling: {
    propagateErrors: boolean;
    errorMapping?: Record<string, string>;
  };
  monitoring?: {
    trackProgress?: boolean;
    reportMilestones?: boolean;
    includeInSLA?: boolean;
  };
}

// ─── Script Task ──────────────────────────────────────────────────────────────

export interface ScriptTaskNode extends FlowNode {
  type: "SCRIPT_TASK";
  script: {
    language: "JAVASCRIPT" | "PYTHON" | "POWERSHELL" | "SQL" | "GROOVY" | "EXPRESSION";
    version?: string;
    source: "INLINE" | "REPOSITORY" | "PACKAGE";
    code?: string;
    scriptRef?: string;
  };
  inputs: Record<string, string>;
  outputs: Record<string, string>;
  security: {
    sandbox: boolean;
    maxExecutionTime: string;
    maxMemory: string;
    allowedModules?: string[];
    blockedModules?: string[];
    networkAccess?: boolean;
    fileSystemAccess?: boolean;
  };
  audit: {
    logScriptExecution: boolean;
    logInputsOutputs: boolean;
    maskPII: boolean;
  };
}

// ─── Data Transformation ──────────────────────────────────────────────────────

export interface DataTransformationNode extends FlowNode {
  type: "DATA_TRANSFORMATION";
  engine: "JSONATA" | "JMESPATH" | "XSLT" | "MAPPING_DESIGNER" | "SQL_PROJECTION";
  schema: { input: string; output: string };
  mapping: {
    source: string;
    target: string;
    expression?: string;
    mappingRef?: string;
  };
  validation: {
    validateInputSchema?: boolean;
    validateOutputSchema: boolean;
    onValidationError: "HALT_AND_CATCH" | "SEND_TO_REVIEW" | "USE_DEFAULTS" | "WARN_ONLY";
  };
  transformationOptions?: {
    nullHandling?: "PRESERVE" | "DROP" | "DEFAULT";
    typeCoercion?: boolean;
    dateFormat?: string;
    currencyNormalization?: boolean;
    locale?: string;
  };
  audit?: {
    captureBeforeAfter?: boolean;
    maskSensitiveFields?: boolean;
    storeMappingVersion?: boolean;
  };
}

// ─── Compensation ─────────────────────────────────────────────────────────────

export interface CompensationNode extends FlowNode {
  type: "COMPENSATION";
  compensationScope: "NODE" | "TRANSACTION_BOUNDARY" | "PROCESS";
  compensationActions: {
    action: string;
    compensation: string;
    parameters: Record<string, string | number | boolean>;
  }[];
  execution: {
    order: "REVERSE" | "DEFINED";
    mode: "BEST_EFFORT" | "STRICT";
    timeout: string;
    onCompensationFailure: "MANUAL_INTERVENTION" | "ESCALATE" | "RETRY";
  };
}

// ─── Escalation ───────────────────────────────────────────────────────────────

export interface EscalationNode extends FlowNode {
  type: "ESCALATION";
  triggers: {
    type: "SLA_BREACH" | "APPROVAL_DELAY" | "AI_CONFIDENCE" | "REPEATED_FAILURE" | "BUSINESS_CONDITION" | "EXTERNAL_SIGNAL";
    condition: string;
    priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  }[];
  escalationPath: Record<string, { target: string; timeout: string }>;
  notification: {
    channels: string[];
    includeContext: boolean;
    urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  };
}

// ─── Milestone ────────────────────────────────────────────────────────────────

export interface MilestoneNode extends FlowNode {
  type: "MILESTONE";
  milestones: {
    name: string;
    progress: number;
    criteria: string;
    gateCheck?: string;
  }[];
  reporting: {
    trackElapsedTime: boolean;
    trackBetweenMilestones: boolean;
    alertOnDelay: boolean;
    delayThreshold?: string;
  };
}

// ─── Timer Boundary Event ─────────────────────────────────────────────────────

export interface TimerBoundaryEventNode extends FlowNode {
  type: "TIMER_BOUNDARY_EVENT";
  attachedTo: string;
  timer: {
    type: "DURATION" | "CYCLE" | "DATE";
    value: string;
    startOn: "TASK_START" | "TASK_CREATED" | "CUSTOM";
  };
  behavior: {
    interruptActivity: boolean;
    cancelActivity: boolean;
    onTimeout: "ESCALATE" | "COMPENSATE" | "FAIL" | "CONTINUE";
  };
  escalation?: {
    target: string;
    includeContext: boolean;
  };
}

// ─── Error Boundary Event ─────────────────────────────────────────────────────

export interface ErrorBoundaryEventNode extends FlowNode {
  type: "ERROR_BOUNDARY_EVENT";
  attachedTo: string;
  errorHandlers: {
    errorType: "SYSTEM_ERROR" | "BUSINESS_ERROR" | "TIMEOUT" | "INTEGRATION_ERROR";
    pattern?: string;
    action: "RETRY" | "MANUAL_REVIEW" | "FALLBACK_SERVICE" | "COMPENSATE" | "ESCALATE" | "FAIL";
    maxRetries?: number;
    fallbackEndpoint?: string;
  }[];
  defaultHandler: {
    action: "COMPENSATE" | "FAIL" | "ESCALATE" | "MANUAL_REVIEW";
    compensationScope?: "NODE" | "TRANSACTION" | "PROCESS";
  };
}

// ─── Message Event ────────────────────────────────────────────────────────────

export interface MessageEventNode extends FlowNode {
  type: "MESSAGE_EVENT";
  direction: "PUBLISH" | "SUBSCRIBE";
  message: {
    type: "COMMAND" | "EVENT" | "QUERY";
    name: string;
    payload: Record<string, string>;
  };
  broker: {
    type: "KAFKA" | "RABBITMQ" | "AZURE_EVENT_HUB" | "AZURE_SERVICE_BUS" | "AWS_SNS_SQS" | "WEBHOOK";
    topic?: string;
    queue?: string;
    partition?: string;
  };
  qualityOfService: {
    delivery: "AT_MOST_ONCE" | "AT_LEAST_ONCE" | "EXACTLY_ONCE";
    compression?: "NONE" | "GZIP" | "SNAPPY";
    retention?: string;
  };
}

// ─── Signal Event ─────────────────────────────────────────────────────────────

export interface SignalEventNode extends FlowNode {
  type: "SIGNAL_EVENT";
  signal: {
    name: string;
    scope: "LOCAL" | "TENANT" | "GLOBAL";
    payload: Record<string, string>;
  };
  targeting: {
    processTypes?: string[];
    instances: "ALL" | "MATCHING";
    filter?: string;
  };
  reliability: {
    deliveryGuarantee: "BEST_EFFORT" | "AT_LEAST_ONCE";
    timeout: string;
    retryOnFailure: boolean;
  };
}

// ─── Business Calendar ────────────────────────────────────────────────────────

export interface BusinessCalendarNode extends FlowNode {
  type: "BUSINESS_CALENDAR";
  calendar: {
    id: string;
    timezone: string;
    workingHours: Record<string, string | null>;
    holidays: { date: string; name: string }[];
    maintenanceWindows?: { day: string; time: string; recurring: boolean }[];
    exceptions?: { date: string; hours: string; reason: string }[];
  };
  usage: {
    slaCalculation: boolean;
    scheduling: boolean;
    escalation: boolean;
    reporting: boolean;
  };
}

// ─── Process Checkpoint ───────────────────────────────────────────────────────

export interface ProcessCheckpointNode extends FlowNode {
  type: "PROCESS_CHECKPOINT";
  checkpoint: {
    strategy: "MANUAL" | "AUTOMATIC";
    frequency: "AFTER_EACH_NODE" | "BEFORE_WAIT" | "ON_MILESTONE" | "CUSTOM";
    storage: {
      type: "PERSISTENT" | "IN_MEMORY" | "EXTERNAL";
      location: string;
      retention: string;
    };
  };
  data: {
    variables: boolean;
    attachments: boolean;
    executionState: boolean;
    nodePosition: boolean;
    timers: boolean;
    compensationState: boolean;
    correlationKeys: boolean;
  };
  recovery: {
    autoResume: boolean;
    resumeFrom: "LAST_CHECKPOINT" | "NAMED_CHECKPOINT";
    maxResumeAttempts: number;
  };
  replay: {
    enabled: boolean;
    retention: string;
    includeAudit: boolean;
  };
}

// ─── Union type ───────────────────────────────────────────────────────────────

export type AnyFlowNode =
  | StartNode | EndNode | DecisionNode | SwitchNode
  | RuleDecisionNode | AIDecisionNode
  | ParallelSplitNode | ParallelJoinNode
  | LoopNode | RetryNode
  | WaitNode | WaitForEventNode
  | UserTaskNode | ApprovalTaskNode
  | ServiceTaskNode | AgentTaskNode | SubProcessNode | ScriptTaskNode | DataTransformationNode
  | CompensationNode | EscalationNode | MilestoneNode
  | TimerBoundaryEventNode | ErrorBoundaryEventNode
  | MessageEventNode | SignalEventNode
  | BusinessCalendarNode | ProcessCheckpointNode;
