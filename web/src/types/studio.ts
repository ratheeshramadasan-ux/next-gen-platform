export type ActivityType = 'event' | 'task' | 'gateway' | 'subprocess';

export type ActivitySubType = 
  | 'start' | 'intermediate' | 'end' // Events
  | 'userTask' | 'serviceTask' | 'scriptTask' | 'businessRuleTask' // Tasks
  | 'xorGateway' | 'andGateway' | 'orGateway' | 'eventGateway' // Gateways
  | 'tryCatch' | 'throwError' | 'break' // Error Handling & Flow Control
  | 'collapsedSubprocess' | 'expandedSubprocess'; // Subprocesses

export type ActivityCategory = 
  | 'UI' | 'API' | 'System' | 'Office365' | 'SAP' | 'OCR' 
  | 'Security' | 'PDF' | 'Data' | 'VM' | 'Logic' | 'Other';

export interface ExecutionProperties {
  enabled: boolean;
  critical: boolean;
  continueOnError: boolean;
  tags?: string[];
  notes?: string;
}

export interface RetryProperties {
  retryEnabled: boolean;
  retryCount: number;
  interval: string; // e.g. "00:00:10"
  backoff: 'Fixed' | 'Linear' | 'Exponential';
  maxDelay: string; // e.g. "00:05:00"
  retryCondition?: string;
}

export interface TimeoutProperties {
  timeout: string; // e.g. "00:10:00"
  warningAt: string; // e.g. "00:08:00"
  killActivity: boolean;
  action: 'Retry' | 'Fail' | 'Escalate';
}

export interface ExceptionProperties {
  errorType: 'Business' | 'System';
  continueOnException: boolean;
  raiseIncident: boolean;
  escalationQueue?: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  customMessage?: string;
}

export interface LoggingProperties {
  logLevel: 'Verbose' | 'Debug' | 'Info' | 'Warning' | 'Error';
  logInputs: boolean;
  logOutputs: boolean;
  logExecutionTime: boolean;
  captureScreenshot: boolean;
  capturePayload: boolean;
  maskSensitiveFields: boolean;
}

export interface SecurityProperties {
  runAsUser?: string;
  credentialAsset?: string;
  encryptInputs: boolean;
  encryptOutputs: boolean;
  maskFields?: string[];
  secretsReference?: string;
}

export interface ValidationProperties {
  validateInputs: boolean;
  requiredFields?: string[];
  nullCheck: boolean;
  regexValidation?: string;
  customValidationRule?: string;
}

export interface PerformanceProperties {
  maxExecutionTime?: number;
  memoryThreshold?: number;
  cpuThreshold?: number;
  batchSize?: number;
  parallelism: boolean;
  workerLimit?: number;
}

export interface GovernanceProperties {
  approvalRequired: boolean;
  makerChecker: boolean;
  changeTicket?: string;
  deploymentLock: boolean;
  productionOverride: boolean;
  environment?: string[];
}

export interface AuditProperties {
  auditEnabled: boolean;
  captureBeforeState: boolean;
  captureAfterState: boolean;
  storeAuditRecord: boolean;
  retention?: string;
}

export interface QueueTransactionProperties {
  transactionId?: string;
  correlationId?: string;
  queueReference?: string;
  reprocessAllowed: boolean;
  duplicateCheck: boolean;
  idempotencyKey?: string;
}

export interface AIControlProperties {
  modelSelection?: string;
  temperature?: number;
  maxTokens?: number;
  confidenceThreshold?: number;
  humanValidation: boolean;
  promptVersion?: string;
  fallbackModel?: string;
  costLimit?: number;
}

export interface ComplianceProperties {
  dataResidency?: string;
  piiFields?: string[];
  pciFields?: string[];
  gdprMode: boolean;
  hipaaMode: boolean;
  classification?: string;
}

export interface DistributedExecutionProperties {
  idempotentActivity: boolean;
  correlationId?: string;
  traceId?: string;
  spanId?: string;
  distributedLock: boolean;
  recoveryMode?: string;
}

export interface AdvancedOperationalProperties {
  maintenanceWindowAware: boolean;
  businessHoursOnly: boolean;
  blackoutCalendar?: string;
  holidayCalendar?: string;
  circuitBreaker: boolean;
  fallbackActivity?: string;
  alternateEndpoint?: string;
  drRegion?: string;
}

export interface ActivityBase {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  category: string;
  version: string;

  execution: ExecutionProperties;
  retry: RetryProperties;
  timeout: TimeoutProperties;
  exception: ExceptionProperties;
  logging: LoggingProperties;
  security: SecurityProperties;
  validation: ValidationProperties;
  performance: PerformanceProperties;
  governance: GovernanceProperties;
  audit: AuditProperties;
  aiControls?: AIControlProperties;
  compliance?: ComplianceProperties;
  queueTransaction?: QueueTransactionProperties;
  distributedExecution?: DistributedExecutionProperties;
  advancedOperations?: AdvancedOperationalProperties;
}

export interface ActivityProperties {
  timeout: number | string;
  retryCount: number | string;
  retryInterval: number | string;
  continueOnError: boolean;
  delayBefore: number | string;
  delayAfter: number | string;
  logLevel: 'Verbose' | 'Debug' | 'Info' | 'Warning' | 'Error';
  takeScreenshotOnError: boolean;
  maxExecutionTime?: number | string;
  memoryThreshold?: number | string;
  cpuThreshold?: number | string;
}

export interface NodeTheme {
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

export interface NodeExecution {
  async: boolean;
  retry: number;
  timeout: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

export interface NodeAudit {
  createdBy: string;
  createdOn: string;
  version: number;
}

export interface RiskMetadata {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  category?: 'Financial' | 'Operational' | 'Security' | 'Compliance' | 'Data';
  impact?: number; // 1-5
  likelihood?: number; // 1-5
  rpn?: number; // Risk Priority Number
  description?: string;
  why?: string;
  patterns?: string;
  mitigation?: string;
  supportNotes?: string;
  disabled?: boolean;
}

export interface UniversalActivity {
  id: string;
  activityId?: string; // System-level identifier
  type: ActivityType;
  subType: ActivitySubType;
  category: ActivityCategory;
  label: string;
  description?: string;
  icon?: string;
  theme?: {
    bgColor?: string;
    borderColor?: string;
    iconColor?: string;
  };
  position?: { x: number; y: number };
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  properties: ActivityProperties;
  execution: Record<string, any> & Partial<ExecutionProperties>;
  risk?: RiskMetadata;
  onSuccess?: string; // nextNodeId
  onFailure?: string; // errorNodeId
  parallelBranches?: string[]; // array of branch flow IDs or node IDs
  audit?: {
    createdBy: string;
    createdOn: string;
    version: number;
  } & Partial<AuditProperties>;
  
  retry?: Partial<RetryProperties>;
  timeout?: Partial<TimeoutProperties>;
  exception?: Partial<ExceptionProperties>;
  logging?: Partial<LoggingProperties>;
  security?: Partial<SecurityProperties>;
  validation?: Partial<ValidationProperties>;
  performance?: Partial<PerformanceProperties>;
  governance?: Partial<GovernanceProperties>;
  aiControls?: Partial<AIControlProperties>;
  compliance?: Partial<ComplianceProperties>;
  queueTransaction?: Partial<QueueTransactionProperties>;
  distributedExecution?: Partial<DistributedExecutionProperties>;
  advancedOperations?: Partial<AdvancedOperationalProperties>;

  // Parallel Split extensions
  parallelSplitProperties?: ParallelSplitProperties;
  parallelSplitState?: ParallelSplitState;
  
  [key: string]: any; // Add index signature for React Flow compatibility
}

export interface BranchDefinition {
  branchId: string;
  branchName: string;
  targetNodeId: string;
  priority?: number;
  weight?: number;
}

export interface ParallelSplitProperties {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  splitMode: "fire-and-forget" | "wait-all" | "wait-any" | "wait-n";
  requiredBranches?: number;
  branches: BranchDefinition[];
  concurrency: {
    maxParallelBranches: number;
    queueExcess: boolean;
  };
  timeout: {
    enabled: boolean;
    duration: string; // e.g. "30m"
    action: "fail" | "continue" | "escalate";
  };
  errorHandling: {
    strategy: "fail-workflow" | "continue" | "retry-failed" | "manual-review";
  };
  retry: {
    enabled: boolean;
    maxAttempts: number;
    delay: string; // e.g. "30s"
    backoff: "fixed" | "linear" | "exponential";
  };
  transaction: {
    isolation: "shared" | "independent";
  };
  inputMapping?: Record<string, string>;
  outputMerge: {
    strategy: "merge" | "overwrite" | "first-win" | "last-win";
  };
  governance: {
    approvalRequired: boolean;
    auditEnabled: boolean;
    makerChecker: boolean;
  };
  monitoring: {
    trackBranchMetrics: boolean;
    trackExecutionTime: boolean;
    trackResourceUsage: boolean;
  };
  cancelRemainingOnSuccess: boolean;
  executionMode: "local" | "remote-worker" | "kubernetes" | "serverless";
  affinity?: {
    region?: string;
    workerPool?: string;
  };
  telemetry: {
    traceEnabled: boolean;
    propagateContext: boolean;
  };
}

export interface BranchState {
  branchId: string;
  status: "running" | "completed" | "failed" | "skipped";
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface ParallelSplitState {
  splitId: string;
  workflowInstanceId: string;
  status: "running" | "completed" | "failed" | "partial";
  startedAt: string;
  completedAt?: string;
  branches: BranchState[];
  metrics?: {
    totalBranches: number;
    completedBranches: number;
    failedBranches: number;
    avgExecutionTime: number;
    maxExecutionTime: number;
    minExecutionTime: number;
  };
}

export interface StudioThemeTokens {
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  background: string;
  node: {
    task: string;
    event: string;
    gateway: string;
    subprocess: string;
  };
  [key: string]: any;
}

export interface ElementMetadata {
  selector?: string;
  text?: string;
  tag?: string;
  class?: string;
  attributes?: Record<string, string>;
  position?: { x: number; y: number };
}

export interface SelectorModel {
  primary: string;
  fallbacks: ElementMetadata[];
  context?: {
    parent?: string;
    nearbyText?: string;
  };
}

export const DEFAULT_STUDIO_THEME = {
  primary: "var(--primary)",
  node: {
    event: "var(--primary)",
    task: "var(--primary)",
    gateway: "var(--primary)",
    subprocess: "var(--primary)",
  } as Record<string, string>,
  edge: {
    sequence: "var(--primary)",
    message: "var(--muted-foreground)",
    association: "var(--border)",
  } as Record<string, string>
};
