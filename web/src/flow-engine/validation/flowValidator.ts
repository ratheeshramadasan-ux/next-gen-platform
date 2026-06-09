/**
 * Enterprise Flow Validator
 * Design-time validation for all 28 node types and flow-level rules.
 */
import type { FlowNode, FlowNodeType } from "../types/base";
import type { AnyFlowNode, StartNode, EndNode, DecisionNode, WaitForEventNode,
  LoopNode, ScriptTaskNode, AgentTaskNode, AIDecisionNode, DataTransformationNode,
  ApprovalTaskNode, ParallelSplitNode, TimerBoundaryEventNode, ErrorBoundaryEventNode,
  ServiceTaskNode } from "../types/nodes";

export type ValidationSeverity = "error" | "warning" | "info";

export interface ValidationIssue {
  nodeId?: string;
  nodeName?: string;
  nodeType?: FlowNodeType;
  field?: string;
  message: string;
  severity: ValidationSeverity;
  code: string;
  fix?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  infos: ValidationIssue[];
  summary: string;
}

// ─── Flow-level structure ─────────────────────────────────────────────────────

interface FlowDefinition {
  id: string;
  nodes: AnyFlowNode[];
  edges: Array<{ id: string; source: string; target: string; label?: string }>;
  tenantId?: string;
  dataResidency?: string;
}

export function validateFlow(flow: FlowDefinition): ValidationResult {
  const issues: ValidationIssue[] = [];

  // ── 1. Flow-level rules ────────────────────────────────────────────────────
  const startNodes = flow.nodes.filter(n => n.type === "START");
  const endNodes   = flow.nodes.filter(n => n.type === "END");

  if (startNodes.length === 0) {
    issues.push({ severity: "error", code: "FLOW_NO_START",
      message: "Flow must have at least one Start node.",
      fix: "Drag a Start node from the Flow Tools panel onto the canvas." });
  }
  if (startNodes.length > 1) {
    issues.push({ severity: "warning", code: "FLOW_MULTIPLE_STARTS",
      message: `Flow has ${startNodes.length} Start nodes. Ensure each represents a distinct entry point.` });
  }
  if (endNodes.length === 0 && flow.nodes.length > 0) {
    issues.push({ severity: "error", code: "FLOW_NO_END",
      message: "Flow must have at least one End node.",
      fix: "Add an End node and connect it to the final step." });
  }

  // Orphan nodes (no connections)
  flow.nodes.forEach(node => {
    if (node.type === "START" || node.type === "TIMER_BOUNDARY_EVENT" || node.type === "ERROR_BOUNDARY_EVENT" || node.type === "BUSINESS_CALENDAR") return;
    const hasIn  = flow.edges.some(e => e.target === node.id);
    const hasOut = flow.edges.some(e => e.source === node.id);
    if (!hasIn) {
      issues.push({ nodeId: node.id, nodeName: node.name, nodeType: node.type,
        severity: "warning", code: "NODE_NO_INCOMING",
        message: `"${node.name}" has no incoming connections — it is unreachable.` });
    }
    if (!hasOut && node.type !== "END") {
      issues.push({ nodeId: node.id, nodeName: node.name, nodeType: node.type,
        severity: "error", code: "NODE_NO_OUTGOING",
        message: `"${node.name}" has no outgoing connections — the flow will dead-end here.`,
        fix: "Connect this node to the next step or an End node." });
    }
  });

  // ── 2. Per-node validation ─────────────────────────────────────────────────
  flow.nodes.forEach(node => {
    const nodeIssues = validateNode(node, flow);
    issues.push(...nodeIssues);
  });

  // ── 3. Parallel split/join pairing ────────────────────────────────────────
  const splits = flow.nodes.filter(n => n.type === "PARALLEL_SPLIT");
  const joins  = flow.nodes.filter(n => n.type === "PARALLEL_JOIN");
  if (splits.length > joins.length) {
    issues.push({ severity: "warning", code: "FLOW_PARALLEL_MISMATCH",
      message: `${splits.length} Parallel Split node(s) but only ${joins.length} Join node(s). Ensure every split has a matching join unless intentional fan-out.` });
  }

  // ── 4. Data residency ─────────────────────────────────────────────────────
  if (flow.dataResidency) {
    flow.nodes.forEach(node => {
      if (node.compliance?.dataResidency && node.compliance.dataResidency !== "global"
          && node.compliance.dataResidency !== flow.dataResidency) {
        issues.push({ nodeId: node.id, nodeType: node.type, severity: "error",
          code: "NODE_DATA_RESIDENCY_CONFLICT",
          message: `"${node.name}" requires ${node.compliance.dataResidency} data residency but flow is configured for ${flow.dataResidency}. Deployment blocked.` });
      }
    });
  }

  const errors   = issues.filter(i => i.severity === "error");
  const warnings = issues.filter(i => i.severity === "warning");
  const infos    = issues.filter(i => i.severity === "info");

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
    summary: errors.length > 0
      ? `${errors.length} error(s) must be fixed before deployment.`
      : warnings.length > 0
        ? `Flow is valid with ${warnings.length} warning(s).`
        : "Flow is valid and ready for deployment.",
  };
}

// ─── Per-node validators ──────────────────────────────────────────────────────

function validateNode(node: AnyFlowNode, flow: FlowDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ctx = { nodeId: node.id, nodeName: node.name, nodeType: node.type };

  // Common: name required
  if (!node.name?.trim()) {
    issues.push({ ...ctx, severity: "warning", code: "NODE_NO_NAME", field: "name",
      message: `Node of type "${node.type}" has no display name. Add one for readability.` });
  }

  // Common: audit always on for production
  if (!node.governance?.auditEnabled) {
    issues.push({ ...ctx, severity: "warning", code: "NODE_AUDIT_DISABLED", field: "governance.auditEnabled",
      message: `"${node.name}" has audit disabled. Recommended for all production nodes.` });
  }

  switch (node.type) {
    case "START":         issues.push(...validateStart(node as StartNode, ctx)); break;
    case "END":           issues.push(...validateEnd(node as EndNode, ctx)); break;
    case "DECISION":      issues.push(...validateDecision(node as DecisionNode, ctx, flow)); break;
    case "WAIT_FOR_EVENT":issues.push(...validateWaitForEvent(node as WaitForEventNode, ctx)); break;
    case "LOOP":          issues.push(...validateLoop(node as LoopNode, ctx)); break;
    case "SCRIPT_TASK":   issues.push(...validateScriptTask(node as ScriptTaskNode, ctx)); break;
    case "AGENT_TASK":    issues.push(...validateAgentTask(node as AgentTaskNode, ctx)); break;
    case "AI_DECISION":   issues.push(...validateAIDecision(node as AIDecisionNode, ctx)); break;
    case "DATA_TRANSFORMATION": issues.push(...validateDataTransform(node as DataTransformationNode, ctx)); break;
    case "APPROVAL_TASK": issues.push(...validateApprovalTask(node as ApprovalTaskNode, ctx)); break;
    case "PARALLEL_SPLIT":issues.push(...validateParallelSplit(node as ParallelSplitNode, ctx)); break;
    case "TIMER_BOUNDARY_EVENT": issues.push(...validateTimerBoundary(node as TimerBoundaryEventNode, ctx, flow)); break;
    case "ERROR_BOUNDARY_EVENT": issues.push(...validateErrorBoundary(node as ErrorBoundaryEventNode, ctx, flow)); break;
    case "SERVICE_TASK":  issues.push(...validateServiceTask(node as ServiceTaskNode, ctx)); break;
  }

  // Compliance check: PII fields must have masking
  if (node.compliance?.piiFields && node.compliance.piiFields.length > 0) {
    if (!node.compliance.maskingPolicy || node.compliance.maskingPolicy === "none") {
      issues.push({ ...ctx, severity: "error", code: "NODE_PII_NO_MASKING",
        message: `"${node.name}" declares PII fields but masking policy is 'none'. Set at least 'partial' masking.` });
    }
  }

  return issues;
}

type IssueCtx = { nodeId: string; nodeName: string; nodeType: FlowNodeType };

function validateStart(node: StartNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.trigger?.type) {
    issues.push({ ...ctx, severity: "error", code: "START_NO_TRIGGER", field: "trigger.type",
      message: "Start node must have a trigger type configured." });
  }
  if (node.trigger?.type === "API_START" && !node.security?.apiAuth) {
    issues.push({ ...ctx, severity: "warning", code: "START_API_NO_AUTH",
      message: "API Start node should define an authentication strategy.",
      fix: "Configure apiAuth in the Security section." });
  }
  return issues;
}

function validateEnd(node: EndNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.status) {
    issues.push({ ...ctx, severity: "error", code: "END_NO_STATUS", field: "status",
      message: "End node must have a completion status (SUCCESS, FAILURE, etc.)." });
  }
  return issues;
}

function validateDecision(node: DecisionNode, ctx: IssueCtx, flow: FlowDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.condition?.expression && node.condition?.type === "EXPRESSION") {
    issues.push({ ...ctx, severity: "error", code: "DECISION_NO_EXPRESSION", field: "condition.expression",
      message: "Decision node has no condition expression defined." });
  }
  if (!node.branches || node.branches.length < 2) {
    issues.push({ ...ctx, severity: "error", code: "DECISION_INSUFFICIENT_BRANCHES",
      message: "Decision node must have at least 2 branches (Yes/No or equivalent).",
      fix: "Add a 'No' or 'Default' branch." });
  }
  const hasFalseBranch = node.branches?.some(b => b.condition === false || b.name.toLowerCase().includes("no") || b.name.toLowerCase().includes("default") || b.name.toLowerCase().includes("else"));
  if (!hasFalseBranch) {
    issues.push({ ...ctx, severity: "error", code: "DECISION_NO_DEFAULT_BRANCH",
      message: "Decision node has no default/false branch. Deployment blocked.",
      fix: "Add a default 'No' branch to handle unmatched conditions." });
  }
  return issues;
}

function validateWaitForEvent(node: WaitForEventNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.correlation?.key) {
    issues.push({ ...ctx, severity: "error", code: "WAIT_EVENT_NO_CORRELATION",
      message: "Wait For Event node must define a correlation key to match incoming events.",
      fix: "Set correlation.key to an expression like '{invoiceId}'." });
  }
  if (!node.timeout?.duration) {
    issues.push({ ...ctx, severity: "error", code: "WAIT_EVENT_NO_TIMEOUT",
      message: "Wait For Event must have a timeout to prevent permanently waiting instances." });
  }
  return issues;
}

function validateLoop(node: LoopNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.iterationConfig?.maxIterations || node.iterationConfig.maxIterations <= 0) {
    issues.push({ ...ctx, severity: "error", code: "LOOP_NO_MAX_ITERATIONS",
      message: "Loop node must have a positive maxIterations guardrail.",
      fix: "Set iterationConfig.maxIterations to a reasonable upper bound (e.g. 10000)." });
  }
  if (!node.safetyControls?.infiniteLoopDetection) {
    issues.push({ ...ctx, severity: "warning", code: "LOOP_INFINITE_DETECTION_OFF",
      message: "Infinite loop detection is disabled. Enable safetyControls.infiniteLoopDetection." });
  }
  if (node.loopType === "FOR_EACH" && !node.collection) {
    issues.push({ ...ctx, severity: "error", code: "LOOP_NO_COLLECTION",
      message: "For Each loop must specify a collection expression." });
  }
  return issues;
}

function validateScriptTask(node: ScriptTaskNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.security?.sandbox) {
    issues.push({ ...ctx, severity: "error", code: "SCRIPT_SANDBOX_DISABLED",
      message: "Script Task sandbox must be enabled. Scripts run with unrestricted access pose a security risk.",
      fix: "Set security.sandbox = true." });
  }
  if (node.security?.networkAccess && !node.governance?.requiredPermissions?.includes("NETWORK_EGRESS")) {
    issues.push({ ...ctx, severity: "warning", code: "SCRIPT_NETWORK_ACCESS",
      message: "Script has network access enabled without explicit NETWORK_EGRESS permission declared." });
  }
  return issues;
}

function validateAgentTask(node: AgentTaskNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.guardrails?.allowedActions || node.guardrails.allowedActions.length === 0) {
    issues.push({ ...ctx, severity: "error", code: "AGENT_NO_ALLOWED_ACTIONS",
      message: "Agent Task must define at least one allowed action.",
      fix: "Specify the exact tool actions the agent is permitted to perform." });
  }
  if (!node.guardrails?.blockedActions || node.guardrails.blockedActions.length === 0) {
    issues.push({ ...ctx, severity: "warning", code: "AGENT_NO_BLOCKED_ACTIONS",
      message: "Agent Task has no blocked actions defined. Explicitly block destructive operations." });
  }
  if (!node.humanOversight?.confidenceThreshold) {
    issues.push({ ...ctx, severity: "warning", code: "AGENT_NO_OVERSIGHT_THRESHOLD",
      message: "Agent Task has no human oversight confidence threshold. Set a threshold to route low-confidence decisions to humans." });
  }
  if (!node.goal?.description) {
    issues.push({ ...ctx, severity: "error", code: "AGENT_NO_GOAL",
      message: "Agent Task must have a goal description." });
  }
  return issues;
}

function validateAIDecision(node: AIDecisionNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.routing?.fallback) {
    issues.push({ ...ctx, severity: "error", code: "AI_DECISION_NO_FALLBACK",
      message: "AI Decision must define a fallback route for errors, timeouts, and policy violations.",
      fix: "Set routing.fallback to point to a Human Review or Safe Default node." });
  }
  if (!node.model?.modelRef) {
    issues.push({ ...ctx, severity: "error", code: "AI_DECISION_NO_MODEL",
      message: "AI Decision must reference a model." });
  }
  if (!node.thresholds?.confidenceThreshold) {
    issues.push({ ...ctx, severity: "error", code: "AI_DECISION_NO_THRESHOLD",
      message: "AI Decision must define a confidence threshold." });
  }
  return issues;
}

function validateDataTransform(node: DataTransformationNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.schema?.input) {
    issues.push({ ...ctx, severity: "error", code: "TRANSFORM_NO_INPUT_SCHEMA",
      message: "Data Transformation must define an input schema reference." });
  }
  if (!node.schema?.output) {
    issues.push({ ...ctx, severity: "error", code: "TRANSFORM_NO_OUTPUT_SCHEMA",
      message: "Data Transformation must define an output schema reference." });
  }
  if (!node.transformationValidation?.validateOutputSchema) {
    issues.push({ ...ctx, severity: "warning", code: "TRANSFORM_NO_OUTPUT_VALIDATION",
      message: "Output schema validation is disabled. Enable it to catch mapping errors at runtime." });
  }
  return issues;
}

function validateApprovalTask(node: ApprovalTaskNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.levels || node.levels.length === 0) {
    issues.push({ ...ctx, severity: "error", code: "APPROVAL_NO_LEVELS",
      message: "Approval Task must have at least one approval level with an assignee pool.",
      fix: "Add an approval level and set a role or group as the approver pool." });
  }
  node.levels?.forEach((level, i) => {
    if (!level.pool) {
      issues.push({ ...ctx, severity: "error", code: "APPROVAL_LEVEL_NO_POOL",
        message: `Approval level "${level.name || i + 1}" has no approver pool defined.` });
    }
  });
  return issues;
}

function validateParallelSplit(node: ParallelSplitNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.context?.shareContext) {
    issues.push({ ...ctx, severity: "error", code: "PARALLEL_NO_CONTEXT_MODE",
      message: "Parallel Split must define a context sharing mode (READ_ONLY / COPY / SHARED_MUTABLE)." });
  }
  if (node.context?.shareContext === "SHARED_MUTABLE") {
    issues.push({ ...ctx, severity: "warning", code: "PARALLEL_SHARED_MUTABLE_CONTEXT",
      message: "SHARED_MUTABLE context mode can cause race conditions. Prefer READ_ONLY or COPY." });
  }
  return issues;
}

function validateTimerBoundary(node: TimerBoundaryEventNode, ctx: IssueCtx, flow: FlowDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.attachedTo) {
    issues.push({ ...ctx, severity: "error", code: "TIMER_NO_ATTACHMENT",
      message: "Timer Boundary Event must be attached to a valid task node.",
      fix: "Set attachedTo to the ID of the task this timer governs." });
  } else {
    const target = flow.nodes.find(n => n.id === node.attachedTo);
    if (!target) {
      issues.push({ ...ctx, severity: "error", code: "TIMER_ATTACHMENT_NOT_FOUND",
        message: `Timer Boundary Event is attached to node ID "${node.attachedTo}" which does not exist in this flow.` });
    }
  }
  if (!node.timer?.value) {
    issues.push({ ...ctx, severity: "error", code: "TIMER_NO_VALUE",
      message: "Timer Boundary Event must have a duration/date value." });
  }
  return issues;
}

function validateErrorBoundary(node: ErrorBoundaryEventNode, ctx: IssueCtx, flow: FlowDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.attachedTo) {
    issues.push({ ...ctx, severity: "error", code: "ERROR_BOUNDARY_NO_ATTACHMENT",
      message: "Error Boundary Event must be attached to a valid task node." });
  } else {
    const target = flow.nodes.find(n => n.id === node.attachedTo);
    if (!target) {
      issues.push({ ...ctx, severity: "error", code: "ERROR_BOUNDARY_ATTACHMENT_NOT_FOUND",
        message: `Error Boundary Event is attached to node "${node.attachedTo}" which does not exist.` });
    }
  }
  if (!node.errorHandlers || node.errorHandlers.length === 0) {
    issues.push({ ...ctx, severity: "warning", code: "ERROR_BOUNDARY_NO_HANDLERS",
      message: "Error Boundary Event has no specific error handlers. Only the default handler will be used." });
  }
  return issues;
}

function validateServiceTask(node: ServiceTaskNode, ctx: IssueCtx): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!node.authentication?.type) {
    issues.push({ ...ctx, severity: "error", code: "SERVICE_NO_AUTH",
      message: "Service Task must define an authentication strategy. Use NONE only if the service is explicitly public.",
      fix: "Set authentication.type and point credentialRef to a vault asset." });
  }
  if (node.authentication?.type === "NONE") {
    issues.push({ ...ctx, severity: "warning", code: "SERVICE_AUTH_NONE",
      message: "Service Task uses no authentication. Confirm this service is intentionally public." });
  }
  const mutatingVerbs = ["POST", "PUT", "PATCH", "DELETE"];
  if (node.method?.verb && mutatingVerbs.includes(node.method.verb) && !node.request?.idempotencyKey) {
    issues.push({ ...ctx, severity: "warning", code: "SERVICE_NO_IDEMPOTENCY",
      message: `Service Task uses ${node.method.verb} but has no idempotency key. Duplicate execution could cause data corruption.`,
      fix: "Set request.idempotencyKey to an expression like '{correlationId}_{nodeId}'." });
  }
  if (!node.service?.endpoint && !node.service?.connector) {
    issues.push({ ...ctx, severity: "error", code: "SERVICE_NO_ENDPOINT",
      message: "Service Task must have either an endpoint URL or a connector reference." });
  }
  return issues;
}
