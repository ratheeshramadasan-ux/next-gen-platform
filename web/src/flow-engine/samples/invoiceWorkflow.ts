/**
 * Sample Enterprise Invoice Processing Workflow
 * Demonstrates: Email Start → Data Transformation → Rule Decision →
 *               AI Decision → Approval Task → Service Task →
 *               Wait For Event → Compensation → Success/Failure End
 */

export const INVOICE_WORKFLOW_SAMPLE = {
  id: "sample-invoice-processing",
  name: "Enterprise Invoice Processing",
  description: "End-to-end AP invoice processing with AI-assisted validation, multi-level approval, ERP posting, and payment confirmation.",
  nodes: [
    // ── 1. Email Start ─────────────────────────────────────────────────────
    {
      id: "start-email",
      name: "Invoice Email Received",
      type: "START",
      trigger: {
        type: "EMAIL_START",
        config: {
          mailbox: "ap-invoices@company.com",
          filter: { subject: { contains: ["invoice", "bill", "remittance"] } },
          extractAttachments: true,
        },
      },
      security: {
        allowedRoles: ["ap_processor", "ap_manager"],
      },
      execution: { maxConcurrentRuns: 50, queueBehavior: "fifo" },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: [], outgoingConnections: ["transform-invoice"] },
    },

    // ── 2. Data Transformation ─────────────────────────────────────────────
    {
      id: "transform-invoice",
      name: "Extract & Normalise Invoice",
      type: "DATA_TRANSFORMATION",
      engine: "MAPPING_DESIGNER",
      schema: {
        input: "schema:email-attachment-multiformat",
        output: "schema:canonical-invoice-v2",
      },
      mapping: {
        source: "emailAttachment",
        target: "canonicalInvoice",
        mappingRef: "mapping:invoice-normaliser-v3",
      },
      validation: {
        validateInputSchema: true,
        validateOutputSchema: true,
        onValidationError: "HALT_AND_CATCH",
      },
      audit: { captureBeforeAfter: true, maskSensitiveFields: true, storeMappingVersion: true },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["start-email"], outgoingConnections: ["rule-decision-validation"] },
    },

    // ── 3. Rule Decision — Policy Validation ──────────────────────────────
    {
      id: "rule-decision-validation",
      name: "AP Policy Validation Rules",
      type: "RULE_DECISION",
      ruleSet: {
        id: "ap-policy-validation",
        resolution: "LATEST_ACTIVE",
        type: "DECISION_TABLE",
      },
      inputMapping: {
        invoiceAmount: "canonicalInvoice.totalAmount",
        vendorId: "canonicalInvoice.vendorId",
        currency: "canonicalInvoice.currency",
        invoiceDate: "canonicalInvoice.invoiceDate",
      },
      outputMapping: {
        policyDecision: "validation.policyDecision",
        requiresApproval: "validation.requiresApproval",
        approvalLevel: "validation.approvalLevel",
        flaggedReasons: "validation.flaggedReasons",
      },
      execution: { mode: "STATELESS", cacheRules: true, cacheTTL: "PT5M" },
      audit: { logRuleExecution: true, trackRuleVersions: true, captureInputSnapshot: true },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["transform-invoice"], outgoingConnections: ["decision-valid-or-reject"] },
    },

    // ── 4. Decision — Route Valid vs Rejected ──────────────────────────────
    {
      id: "decision-valid-or-reject",
      name: "Invoice Valid?",
      type: "DECISION",
      condition: {
        type: "EXPRESSION",
        engine: "javascript",
        expression: "validation.policyDecision === 'VALID'",
      },
      branches: [
        { name: "Valid — continue", condition: true, targetNode: "ai-decision-routing" },
        { name: "Invalid — reject", condition: false, targetNode: "end-rejected" },
      ],
      executionMode: "FIRST_MATCH",
      audit: { decisionExplanation: true, conditionTrace: true, variableSnapshot: true },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["rule-decision-validation"], outgoingConnections: ["ai-decision-routing", "end-rejected"] },
    },

    // ── 5. AI Decision — Risk Classification ──────────────────────────────
    {
      id: "ai-decision-routing",
      name: "AI Risk Classification",
      type: "AI_DECISION",
      model: {
        provider: "azure_openai",
        modelRef: "gpt-4o-ap-classifier",
        version: "2024-08",
      },
      prompt: {
        template: "Classify invoice risk. Vendor: {vendorId}, Amount: {invoiceAmount} {currency}, Historical anomalies: {vendorAnomalies}. Return: HIGH_RISK | STANDARD | EXPEDITE",
        variables: { vendorId: "canonicalInvoice.vendorId", invoiceAmount: "canonicalInvoice.totalAmount", currency: "canonicalInvoice.currency", vendorAnomalies: "vendor.anomalyScore" },
      },
      parameters: { temperature: 0.1, maxTokens: 100 },
      thresholds: {
        confidenceThreshold: 0.85,
        lowConfidenceAction: "HUMAN_REVIEW",
        highConfidenceAction: "AUTO_ROUTE",
      },
      fallback: {
        onModelError: "HUMAN_REVIEW",
        onTimeout: "DEFAULT_ROUTE",
        onPolicyViolation: "BLOCK",
      },
      routing: {
        highConfidence: "approval-task",
        lowConfidence: "milestone-manual-review",
        fallback: "milestone-manual-review",
      },
      governance: {
        auditEnabled: true, metricsEnabled: true, tracingEnabled: true,
        groundingRequired: true, explainabilityRequired: true,
      },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["decision-valid-or-reject"], outgoingConnections: ["approval-task", "milestone-manual-review"] },
    },

    // ── 6. Milestone — Validation Complete ────────────────────────────────
    {
      id: "milestone-validation-complete",
      name: "Milestone: Validated",
      type: "MILESTONE",
      milestones: [{ name: "Validated", progress: 25, criteria: "policyDecision === VALID" }],
      reporting: { trackElapsedTime: true, trackBetweenMilestones: true, alertOnDelay: false },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["approval-task"], outgoingConnections: ["service-post-erp"] },
    },

    // ── 7. Manual Review milestone ─────────────────────────────────────────
    {
      id: "milestone-manual-review",
      name: "Manual Review Required",
      type: "USER_TASK",
      assignment: {
        primary: { type: "ROLE", value: "ap_senior_analyst" },
        escalation: { type: "ROLE", value: "ap_manager", after: "PT4H" },
      },
      form: { id: "invoice-manual-review-form", version: "2.1.0", context: { invoiceId: "canonicalInvoice.id" } },
      actions: ["APPROVE", "REJECT", "REQUEST_INFO"],
      sla: { duration: "PT8H", warning: "PT6H", escalation: "PT7H30M" },
      notifications: { onAssignment: ["email", "dashboard"], reminders: ["PT4H", "PT6H"], overdue: ["email", "slack"] },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["ai-decision-routing"], outgoingConnections: ["approval-task"] },
    },

    // ── 8. Approval Task — Multi-level ────────────────────────────────────
    {
      id: "approval-task",
      name: "Invoice Approval",
      type: "APPROVAL_TASK",
      approvalType: "MULTI_LEVEL",
      levels: [
        { name: "AP Manager", requiredApprovals: 1, pool: "role:ap_manager", timeout: "PT24H", condition: "validation.approvalLevel >= 1" },
        { name: "Finance Director", requiredApprovals: 1, pool: "role:finance_director", timeout: "PT48H", condition: "canonicalInvoice.totalAmount > 50000" },
        { name: "CFO", requiredApprovals: 1, pool: "user:cfo", timeout: "PT72H", condition: "canonicalInvoice.totalAmount > 500000" },
      ],
      rules: {
        makerCheckerEnforced: true,
        preventSelfApproval: true,
        delegationAllowed: true,
        vetoEnabled: true,
        consensusRequired: false,
      },
      compliance: {
        requireAuthenticationOnAction: true,
        cryptographicSignatureRequired: true,
        auditReasonRequired: true,
      },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true, makerCheckerRequired: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["ai-decision-routing", "milestone-manual-review"], outgoingConnections: ["milestone-validation-complete", "end-rejected"] },
    },

    // ── 9. Service Task — Post to ERP ──────────────────────────────────────
    {
      id: "service-post-erp",
      name: "Post Invoice to SAP",
      type: "SERVICE_TASK",
      service: { type: "CONNECTOR", connector: "sap-erp-v2", endpoint: "/api/invoice/post" },
      method: { verb: "POST" },
      authentication: { type: "OAUTH2_CLIENT_CREDENTIALS", credentialRef: "asset:sap-erp-credentials", tokenRotation: "AUTOMATIC" },
      request: {
        inputMapping: {
          "body.invoiceNumber": "canonicalInvoice.invoiceNumber",
          "body.vendorId": "canonicalInvoice.vendorId",
          "body.amount": "canonicalInvoice.totalAmount",
          "body.currency": "canonicalInvoice.currency",
          "body.lineItems": "canonicalInvoice.lineItems",
        },
        validation: true,
        idempotencyKey: "{correlationId}-erp-post",
      },
      response: {
        outputMapping: { "erpDocumentNumber": "erp.documentNumber", "erpStatus": "erp.status" },
        schemaValidation: true,
      },
      resilience: {
        timeout: { connect: "PT5S", read: "PT30S" },
        retry: { enabled: true, maxRetries: 3, backoff: "exponential", initialDelay: "PT2S", maxDelay: "PT30S", jitter: true },
        circuitBreaker: { enabled: true, failureThreshold: 50, openTimeout: "PT60S" },
      },
      idempotency: { enabled: true, keyExpression: "{correlationId}-erp-post", ttl: "PT1H", conflictBehavior: "return_existing" },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["milestone-validation-complete"], outgoingConnections: ["wait-payment-confirmation"] },
    },

    // ── 10. Wait For Event — Payment Confirmation ──────────────────────────
    {
      id: "wait-payment-confirmation",
      name: "Wait: Payment Gateway Webhook",
      type: "WAIT_FOR_EVENT",
      eventPattern: { type: "API", eventName: "payment.confirmed", source: "payment-gateway" },
      correlation: { key: "{erp.documentNumber}", source: "PAYLOAD", matchType: "EXACT" },
      stateManagement: { dehydrateOnWait: true, priorityOnWake: "HIGH", checkpointBeforeWait: true },
      eventFilter: {
        schemaValidation: "STRICT",
        dropMalformedEvents: false,
        conditions: [{ field: "status", operator: "eq", value: "CONFIRMED" }],
      },
      orphanHandling: {
        onInstanceNotFound: "LOG_AND_DISCARD",
        onInstanceCompleted: "CREATE_AUDIT_EVENT",
      },
      timeout: { duration: "P30D", onTimeout: "ESCALATE" },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["service-post-erp"], outgoingConnections: ["milestone-paid", "compensation-erp-reversal"] },
    },

    // ── 11. Milestone — Paid ───────────────────────────────────────────────
    {
      id: "milestone-paid",
      name: "Milestone: Paid",
      type: "MILESTONE",
      milestones: [{ name: "Paid", progress: 100, criteria: "paymentEvent.status === CONFIRMED" }],
      reporting: { trackElapsedTime: true, trackBetweenMilestones: true, alertOnDelay: false },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["wait-payment-confirmation"], outgoingConnections: ["end-success"] },
    },

    // ── 12. Compensation — ERP Reversal ────────────────────────────────────
    {
      id: "compensation-erp-reversal",
      name: "Compensate: Reverse ERP Posting",
      type: "COMPENSATION",
      compensationScope: "TRANSACTION_BOUNDARY",
      compensationActions: [
        {
          action: "sap-erp-v2/reverse-posting",
          compensation: "Reverse SAP document {erp.documentNumber}",
          parameters: { documentNumber: "{erp.documentNumber}", reason: "payment_timeout_compensation" },
        },
      ],
      execution: { order: "REVERSE", mode: "STRICT", timeout: "PT10M", onCompensationFailure: "ESCALATE" },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["wait-payment-confirmation"], outgoingConnections: ["end-failed"] },
    },

    // ── End nodes ──────────────────────────────────────────────────────────
    {
      id: "end-success",
      name: "Invoice Processed",
      type: "END",
      status: "SUCCESS",
      returnPayload: true,
      payloadTransform: { include: ["erp.documentNumber", "canonicalInvoice.id"], maskSensitiveFields: true },
      cleanup: { retainAuditLog: true, releaseLocks: true, clearIdempotencyKeys: false },
      notifications: { onSuccess: ["ap.team@company.com"], channels: ["email", "dashboard"] },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["milestone-paid"], outgoingConnections: [] },
    },
    {
      id: "end-rejected",
      name: "Invoice Rejected",
      type: "END",
      status: "FAILURE",
      returnPayload: true,
      cleanup: { retainAuditLog: true, releaseLocks: true },
      notifications: { onFailure: ["ap.team@company.com", "vendor.notifications@company.com"], channels: ["email", "dashboard"] },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["decision-valid-or-reject", "approval-task"], outgoingConnections: [] },
    },
    {
      id: "end-failed",
      name: "Processing Failed",
      type: "END",
      status: "FAILURE",
      returnPayload: true,
      cleanup: { retainAuditLog: true, releaseLocks: true },
      governance: { auditEnabled: true, metricsEnabled: true, tracingEnabled: true },
      lifecycle: { status: "active", version: "1.0.0", createdBy: "system", createdDate: "2026-01-01" },
      topology: { incomingConnections: ["compensation-erp-reversal"], outgoingConnections: [] },
    },
  ],

  edges: [
    { id: "e1",  source: "start-email",                target: "transform-invoice" },
    { id: "e2",  source: "transform-invoice",          target: "rule-decision-validation" },
    { id: "e3",  source: "rule-decision-validation",   target: "decision-valid-or-reject" },
    { id: "e4",  source: "decision-valid-or-reject",   target: "ai-decision-routing",         label: "Valid" },
    { id: "e5",  source: "decision-valid-or-reject",   target: "end-rejected",                label: "Invalid" },
    { id: "e6",  source: "ai-decision-routing",        target: "approval-task",               label: "High Confidence" },
    { id: "e7",  source: "ai-decision-routing",        target: "milestone-manual-review",     label: "Low Confidence / Fallback" },
    { id: "e8",  source: "milestone-manual-review",    target: "approval-task" },
    { id: "e9",  source: "approval-task",              target: "milestone-validation-complete", label: "Approved" },
    { id: "e10", source: "approval-task",              target: "end-rejected",                label: "Rejected" },
    { id: "e11", source: "milestone-validation-complete", target: "service-post-erp" },
    { id: "e12", source: "service-post-erp",           target: "wait-payment-confirmation" },
    { id: "e13", source: "wait-payment-confirmation",  target: "milestone-paid",              label: "Confirmed" },
    { id: "e14", source: "wait-payment-confirmation",  target: "compensation-erp-reversal",   label: "Timeout" },
    { id: "e15", source: "milestone-paid",             target: "end-success" },
    { id: "e16", source: "compensation-erp-reversal",  target: "end-failed" },
  ],
};
