-- 🏗️ 1. SCHEMA LAYOUT (CANONICAL FOUNDATION LAYER)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE SCHEMA IF NOT EXISTS platform;      -- Resource Graph, Tenancy
CREATE SCHEMA IF NOT EXISTS security;      -- Identity Kernel, RBAC, Sessions
CREATE SCHEMA IF NOT EXISTS execution;     -- Jobs, Queues (Anchors)
CREATE SCHEMA IF NOT EXISTS governance;    -- Policy, Approvals (Anchors)
CREATE SCHEMA IF NOT EXISTS observability; -- Logs, Metrics, Audit
CREATE TABLE observability.processed_events (
    event_id UUID PRIMARY KEY,
    processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE platform.regions (
    region_id TEXT PRIMARY KEY, -- us-east-1, eu-west-1
    name TEXT NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    latency_profile JSONB DEFAULT '{}',
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE SCHEMA IF NOT EXISTS arl;
CREATE SCHEMA IF NOT EXISTS elak;
CREATE SCHEMA IF NOT EXISTS seps;

-- ==========================================
-- 🏢 2. RESOURCE GRAPH (CANONICAL)
-- ==========================================

-- 2.1 Resource Type Registry
CREATE TYPE platform.resource_type AS ENUM (
    'ORGANIZATION',
    'TENANT',
    'WORKSPACE',
    'FOLDER',
    'PROJECT',
    'PROCESS',
    'QUEUE',
    'JOB',
    'VM',
    'POLICY',
    'APPROVAL',
    'ARTIFACT',
    'AGENT', -- Phase 2: Autonomous Intelligence node
    'ANOMALY', -- Phase 2: Performance regression node
    'OPTIMIZATION_SUGGESTION', -- Phase 2: Rewrite proposal
    'MEMORY_CHUNK' -- Phase 2: Semantic state fragment
);

-- 2.2 Canonical Resource Table
CREATE TABLE platform.resources (
    resource_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID, -- NULL for Organization root

    parent_resource_id UUID REFERENCES platform.resources(resource_id) ON DELETE CASCADE,

    resource_type platform.resource_type NOT NULL,
    name TEXT NOT NULL,

    owner_type TEXT CHECK (owner_type IN ('USER', 'GROUP', 'SYSTEM')),
    owner_id UUID,

    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'LOCKED', 'ARCHIVED', 'DELETED')),

    metadata JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_resources_tenant ON platform.resources(tenant_id);
CREATE INDEX idx_resources_parent ON platform.resources(parent_resource_id);
CREATE INDEX idx_resources_type ON platform.resources(resource_type);
CREATE INDEX idx_resources_owner ON platform.resources(owner_id);

-- 2.3 Resource State Tracking
CREATE TABLE platform.resource_states (
    resource_id UUID PRIMARY KEY REFERENCES platform.resources(resource_id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    version INT DEFAULT 1,
    is_locked BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2.4 Resource Event Stream (Observability Foundation)
CREATE TABLE platform.resource_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    resource_id UUID NOT NULL REFERENCES platform.resources(resource_id) ON DELETE CASCADE,

    event_type TEXT NOT NULL, -- CREATED | UPDATED | DELETED | MOVED | EXECUTED | APPROVED
    payload JSONB DEFAULT '{}',

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_resource_events_res ON platform.resource_events(resource_id);
CREATE INDEX idx_resource_events_tenant ON platform.resource_events(tenant_id);

-- 2.5 Outbox Pattern (Reliable Event Bus Pillar)
CREATE TABLE platform.outbox_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    aggregate_type TEXT NOT NULL, -- RESOURCE | EXECUTION | USER
    aggregate_id UUID NOT NULL,

    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',

    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),

    created_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX idx_outbox_pending ON platform.outbox_events(status) WHERE status = 'PENDING';
CREATE INDEX idx_outbox_aggregate ON platform.outbox_events(aggregate_type, aggregate_id);
CREATE INDEX idx_outbox_tracker ON platform.outbox_events(created_at, status);

-- 2.6 Automatic Event Triggers (Rule 4: No Silent Updates)
CREATE OR REPLACE FUNCTION platform.fn_log_resource_outbox()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO platform.outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload)
    VALUES (
        NEW.tenant_id, 
        'RESOURCE',
        NEW.resource_id,
        'RESOURCE_' || TG_OP, 
        jsonb_build_object('type', NEW.resource_type, 'name', NEW.name)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_resource_outbox
AFTER INSERT OR UPDATE ON platform.resources
FOR EACH ROW EXECUTE FUNCTION platform.fn_log_resource_outbox();

-- 2.7 Execution Outbox Trigger 
CREATE OR REPLACE FUNCTION execution.fn_log_execution_outbox()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO platform.outbox_events (tenant_id, aggregate_type, aggregate_id, event_type, payload)
    VALUES (
        NEW.tenant_id, 
        'EXECUTION',
        NEW.execution_id,
        'EXECUTION_' || NEW.state, 
        jsonb_build_object('request_id', NEW.request_id, 'resource_id', NEW.resource_id)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_execution_outbox
AFTER INSERT OR UPDATE ON execution.execution_instances
FOR EACH ROW EXECUTE FUNCTION execution.fn_log_execution_outbox();

-- ==========================================
-- 🏢 3. FOUNDATION ENTITIES (COMPOSITION)
-- ==========================================

CREATE TABLE platform.organizations (
    resource_id UUID PRIMARY KEY REFERENCES platform.resources(resource_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE platform.tenants (
    resource_id UUID PRIMARY KEY REFERENCES platform.resources(resource_id) ON DELETE CASCADE,
    home_region_id TEXT REFERENCES platform.regions(region_id),
    
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- ⚖️ 15. SLO & SLA TRACKING
-- ==========================================

CREATE TABLE observability.slo_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    region_id TEXT REFERENCES platform.regions(region_id),
    
    service_name TEXT NOT NULL, -- GATEWAY | EXECUTION | DISPATCH
    metric_type TEXT NOT NULL, -- LATENCY | SUCCESS_RATE
    value DECIMAL(10,5) NOT NULL,
    
    sla_target DECIMAL(10,5),
    is_compliant BOOLEAN,
    
    timestamp TIMESTAMPTZ DEFAULT now()
);

-- platform.tenants (canonical) is already defined at line 177.

CREATE TABLE platform.environments (
    environment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCEs platform.tenants(resource_id) ON DELETE CASCADE,
    name TEXT CHECK (name IN ('DEV','UAT','PROD')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE platform.workspaces (
    resource_id UUID PRIMARY KEY REFERENCES platform.resources(resource_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE platform.folders (
    resource_id UUID PRIMARY KEY REFERENCES platform.resources(resource_id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES platform.workspaces(resource_id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 👤 4. IDENTITY KERNEL (UNIFIED AUTH)
-- ==========================================

CREATE TABLE security.users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES platform.tenants(resource_id), -- NULL for Super Admins
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    
    first_name TEXT,
    last_name TEXT,
    date_of_birth DATE,
    
    status TEXT DEFAULT 'PENDING_ACTIVATION' CHECK (status IN ('PENDING_ACTIVATION', 'ACTIVE', 'SUSPENDED', 'DISABLED')),
    role_type TEXT DEFAULT 'USER',
    
    is_mfa_enabled BOOLEAN DEFAULT true,
    mfa_secret TEXT,
    
    last_login_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE security.auth_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES security.users(user_id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    device_id TEXT,
    ip_address INET,
    metadata JSONB DEFAULT '{}',
    
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4.1 Canonical Access Control (ABAC/PBAC Layer)
CREATE TABLE security.access_control (
    access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES platform.resources(resource_id) ON DELETE CASCADE,

    subject_type TEXT NOT NULL CHECK (subject_type IN ('USER', 'ROLE', 'GROUP', 'SERVICE_ACCOUNT')),
    subject_id UUID NOT NULL,

    action TEXT NOT NULL CHECK (action IN ('VIEW', 'EDIT', 'DELETE', 'EXECUTE', 'APPROVE')),
    effect TEXT DEFAULT 'ALLOW' CHECK (effect IN ('ALLOW', 'DENY')),
    
    -- Inheritance control: LOCAL_ONLY | RECURSIVE
    scope TEXT DEFAULT 'RECURSIVE',

    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_access_control_res ON security.access_control(resource_id);
CREATE INDEX idx_access_control_subject ON security.access_control(subject_id);

-- ==========================================
-- 📁 5. CI/CD + PROJECT MODEL (RESOURCES)
-- ==========================================

CREATE TABLE ci_cd.projects (
    resource_id UUID PRIMARY KEY REFERENCES platform.resources(resource_id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ci_cd.project_versions (
    version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES ci_cd.projects(resource_id) ON DELETE CASCADE,
    version_number TEXT NOT NULL,
    environment TEXT,
    is_active BOOLEAN DEFAULT false,
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ci_cd.gold_copies (
    gold_copy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES ci_cd.projects(resource_id) ON DELETE CASCADE,
    prod_version_id UUID REFERENCES ci_cd.project_versions(version_id),
    locked_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- ⚙️ 6. EXECUTION & GOVERNANCE ANCHORS
-- ==========================================

CREATE TABLE execution.queues (
    resource_id UUID PRIMARY KEY REFERENCES platform.resources(resource_id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    priority_weight INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE execution.execution_requests (
    request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES platform.resources(resource_id) ON DELETE CASCADE, -- Process/Project

    requested_by UUID REFERENCES security.users(user_id),
    trigger_type TEXT CHECK (trigger_type IN ('MANUAL', 'SCHEDULED', 'EVENT', 'API')),
    input_payload JSONB DEFAULT '{}',

    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'QUEUED', 'PAUSED_FOR_APPROVAL', 'FAILED', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6.2 Workflow & DAG Definitions
CREATE TABLE execution.workflow_definitions (
    workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    version TEXT DEFAULT '1.0.0',
    definition JSONB NOT NULL, -- DAG Nodes and Edges
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE execution.workflow_executions (
    workflow_execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_id UUID NOT NULL REFERENCES execution.workflow_definitions(workflow_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'PAUSED', 'RESUMED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE execution.workflow_steps (
    step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_execution_id UUID NOT NULL REFERENCES execution.workflow_executions(workflow_execution_id) ON DELETE CASCADE,
    node_id TEXT NOT NULL,
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'READY', 'RUNNING', 'COMPLETED', 'FAILED', 'SKIPPED')),
    depends_on JSONB DEFAULT '[]', -- Array of node_ids
    
    vm_id UUID, -- Assigned VM
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_workflow_exec_status ON execution.workflow_executions(status);
CREATE INDEX idx_workflow_step_status ON execution.workflow_steps(status);

CREATE INDEX idx_exec_req_tenant ON execution.execution_requests(tenant_id);
CREATE INDEX idx_exec_req_status ON execution.execution_requests(status);

CREATE TABLE execution.queue_items (
    queue_item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    request_id UUID REFERENCES execution.execution_requests(request_id) ON DELETE CASCADE,
    
    priority INT DEFAULT 1,
    status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),
    
    retry_count INT DEFAULT 0,
    lock_expires_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_queue_status ON execution.queue_items(status, priority);
CREATE INDEX idx_queue_tenant ON execution.queue_items(tenant_id);

CREATE TABLE execution.execution_instances (
    execution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES execution.execution_requests(request_id) ON DELETE CASCADE,
    
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    resource_id UUID NOT NULL REFERENCES platform.resources(resource_id) ON DELETE CASCADE,

    state TEXT NOT NULL CHECK (state IN ('PENDING', 'QUEUED', 'ASSIGNED', 'RUNNING', 'PAUSED', 'FAILED', 'COMPLETED', 'CANCELLED')),
    current_step INT DEFAULT 0,
    retry_count INT DEFAULT 0,

    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_exec_status ON execution.execution_instances(state);
CREATE INDEX idx_exec_tenant ON execution.execution_instances(tenant_id);

CREATE TABLE execution.execution_steps (
    step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES execution.execution_instances(execution_id) ON DELETE CASCADE,
    
    step_index INT NOT NULL,
    step_type TEXT CHECK (step_type IN ('ACTION', 'API_CALL', 'SCRIPT', 'APPROVAL_GATE', 'CONDITION')),
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'FAILED', 'COMPLETED', 'SKIPPED')),
    
    input JSONB DEFAULT '{}',
    output JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE execution.execution_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID REFERENCES execution.execution_instances(execution_id) ON DELETE CASCADE,
    
    event_type TEXT CHECK (event_type IN ('STARTED', 'STEP_STARTED', 'STEP_COMPLETED', 'VM_ASSIGNED', 'RETRY', 'FAILED', 'COMPLETED')),
    payload JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orchestration.vm_instances (
    resource_id UUID PRIMARY KEY REFERENCES platform.resources(resource_id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    vm_type TEXT,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DRAINING', 'OFFLINE', 'FAILED')),
    
    total_slots INT DEFAULT 4,
    available_slots INT DEFAULT 4,
    
    last_heartbeat TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_vm_available_slots ON orchestration.vm_instances(available_slots) WHERE status = 'ACTIVE';

CREATE TABLE orchestration.vm_leases (
    lease_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vm_id UUID REFERENCES orchestration.vm_instances(resource_id) ON DELETE CASCADE,
    workflow_step_id UUID REFERENCES execution.workflow_steps(step_id) ON DELETE CASCADE,
    
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'RELEASED')),
    leased_at TIMESTAMPTZ DEFAULT now(),
    expires_at TIMESTAMPTZ,
    
    UNIQUE(vm_id, workflow_step_id)
);

-- ==========================================
-- ⚖️ 11. GOVERNANCE & POLICY ORCHESTRATION
-- ==========================================

CREATE TABLE governance.policy_definitions (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    scope TEXT NOT NULL CHECK (scope IN ('WORKFLOW', 'PROJECT', 'STEP')),
    rule_json JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE governance.policy_evaluations (
    evaluation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    execution_id UUID NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('ALLOW', 'DENY', 'REQUIRE_APPROVAL')),
    triggered_policies JSONB DEFAULT '[]',
    context JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE governance.approval_flows (
    flow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    workflow_execution_id UUID NOT NULL REFERENCES execution.workflow_executions(workflow_execution_id) ON DELETE CASCADE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PARTIAL')),
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE governance.approval_nodes (
    node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES governance.approval_flows(flow_id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    
    approver_type TEXT NOT NULL CHECK (approver_type IN ('USER', 'ROLE', 'SYSTEM')),
    approver_id UUID NOT NULL,
    
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'APPROVED', 'REJECTED')),
    depends_on JSONB DEFAULT '[]', -- DAG dependencies
    
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE governance.approval_actions (
    action_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID NOT NULL REFERENCES governance.approval_nodes(node_id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES security.users(user_id),
    action TEXT NOT NULL CHECK (action IN ('APPROVE', 'REJECT', 'ESCALATE', 'DELEGATE')),
    comments TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_policy_tenant ON governance.policy_definitions(tenant_id);
CREATE INDEX idx_approval_flow_exec ON governance.approval_flows(workflow_execution_id);
CREATE INDEX idx_approval_node_status ON governance.approval_nodes(status);

-- 6.2 Policy Engine (Conditional Access)
CREATE TABLE governance.policies (
    policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    
    name TEXT NOT NULL,
    effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY', 'REQUIRE_APPROVAL', 'CONDITIONAL')),
    priority INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE governance.policy_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES governance.policies(policy_id) ON DELETE CASCADE,
    
    condition JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE governance.policy_bindings (
    binding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID REFERENCES governance.policies(policy_id) ON DELETE CASCADE,
    resource_id UUID REFERENCES platform.resources(resource_id) ON DELETE CASCADE,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE observability.traces (
    span_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL,
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    workflow_execution_id UUID,
    parent_span_id UUID,
    operation TEXT NOT NULL,
    status TEXT NOT NULL,
    latency_ms INT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE observability.metrics_series (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    metric_name TEXT NOT NULL,
    value FLOAT NOT NULL,
    labels JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE observability.healing_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_type TEXT NOT NULL, -- VM | WORKFLOW | STEP
    entity_id UUID NOT NULL,
    failure_type TEXT NOT NULL,
    action_taken TEXT NOT NULL,
    status TEXT DEFAULT 'RESOLVED',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- 🔐 7. TRIPLE LAYER ISOLATION (DB - RLS)
-- ==========================================

CREATE OR REPLACE FUNCTION security.current_tenant_id() RETURNS UUID AS $$
    SELECT current_setting('app.current_tenant_id', true)::UUID;
$$ LANGUAGE SQL STABLE;

-- Enable RLS across All Schemas
ALTER TABLE platform.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution.workflow_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance.policy_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance.approval_flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance.approval_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestration.vm_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE orchestration.vm_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability.traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability.metrics_series ENABLE ROW LEVEL SECURITY;

-- 7.1 Hard Isolation Policies
CREATE POLICY tenant_isolation_on_resources ON platform.resources
    FOR ALL USING (tenant_id = security.current_tenant_id());

CREATE POLICY tenant_isolation_on_workflows ON execution.workflow_executions
    FOR ALL USING (tenant_id = security.current_tenant_id());

CREATE POLICY tenant_isolation_on_steps ON execution.workflow_steps
    FOR ALL USING (tenant_id = security.current_tenant_id());

CREATE POLICY tenant_isolation_on_approvals ON governance.approval_flows
    FOR ALL USING (tenant_id = security.current_tenant_id());

CREATE POLICY tenant_isolation_on_traces ON observability.traces
    FOR ALL USING (tenant_id = security.current_tenant_id());

-- ==========================================
-- ⚙️ 8. CORE STORED PROCEDURES (ADAPTED)
-- ==========================================

-- 8.1 Dispatch Logic: Acquire and Lease Engine
CREATE OR REPLACE FUNCTION execution.dispatch_next_execution(p_vm_id UUID)
RETURNS TABLE (execution_id UUID, payload JSONB) 
LANGUAGE plpgsql AS $$
DECLARE
    v_exec_id UUID;
    v_req_id UUID;
    v_tenant_id UUID;
    v_payload JSONB;
BEGIN
    -- 1. Find the next pending request (Intent Layer)
    -- This handles the Single Writer Principle via SKIP LOCKED
    WITH selected_req AS (
        SELECT r.request_id, r.tenant_id, r.input_payload
        FROM execution.execution_requests r
        WHERE r.status = 'QUEUED'
        ORDER BY r.created_at ASC
        LIMIT 1 FOR UPDATE SKIP LOCKED
    )
    SELECT request_id, tenant_id, input_payload 
    INTO v_req_id, v_tenant_id, v_payload 
    FROM selected_req;

    IF v_req_id IS NOT NULL THEN
        -- 2. Create Instance (Runtime Layer)
        INSERT INTO execution.execution_instances (
            request_id, tenant_id, resource_id, state
        ) VALUES (
            v_req_id, v_tenant_id, v_req_id, 'IN_PROGRESS'
        ) RETURNING execution_id INTO v_exec_id;

        -- 3. Update VM Status
        UPDATE orchestration.vm_instances 
        SET status = 'BUSY', last_heartbeat = now()
        WHERE resource_id = p_vm_id;

        -- 4. Create Lease (Control Plane)
        INSERT INTO orchestration.vm_leases (
            vm_id, execution_id, expires_at
        ) VALUES (
            p_vm_id, v_exec_id, now() + interval '5 minutes'
        );

        -- 5. Finalize Request Status
        UPDATE execution.execution_requests 
        SET status = 'QUEUED' -- Request is now in the pipeline
        WHERE request_id = v_req_id;

        RETURN QUERY SELECT v_exec_id, v_payload;
    END IF;
END;
$$;

-- ==========================================
-- 🧠 18. AI ORCHESTRATION & SEMANTIC MEMORY
-- ==========================================

CREATE SCHEMA IF NOT EXISTS ai;

CREATE TABLE ai.agent_instances (
    agent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    model_provider TEXT DEFAULT 'NEXTGEN_AI',
    system_prompt TEXT,
    
    autonomy_level TEXT DEFAULT 'ADVISORY' CHECK (autonomy_level IN ('ADVISORY', 'ASSISTED', 'AUTONOMOUS')),
    agent_type TEXT DEFAULT 'PLANNER' CHECK (agent_type IN ('PLANNER', 'EXECUTOR', 'OPTIMIZER', 'AUDITOR')),
    status TEXT DEFAULT 'ACTIVE',
    
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai.intents (
    intent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    parsed_graph JSONB,
    status TEXT DEFAULT 'NEW' CHECK (status IN ('NEW', 'PLANNED', 'EXECUTING', 'COMPLETED', 'FAILED')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai.agent_runs (
    run_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES ai.agent_instances(agent_id) ON DELETE CASCADE,
    intent_id UUID REFERENCES ai.intents(intent_id),
    
    input_payload JSONB,
    reasoning_trace JSONB, -- LLM thoughts
    actions_taken JSONB, -- Tools called
    observations JSONB, -- Outcome
    
    status TEXT DEFAULT 'RUNNING' CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
    started_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_runs_intent ON ai.agent_runs(intent_id);
CREATE INDEX idx_intents_tenant ON ai.intents(tenant_id);

-- Enable RLS for Swarm Plane
ALTER TABLE ai.intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.agent_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_on_intents ON ai.intents FOR ALL USING (tenant_id = security.current_tenant_id());
CREATE POLICY tenant_isolation_on_agent_runs ON ai.agent_runs FOR ALL USING (
    EXISTS (SELECT 1 FROM ai.agent_instances WHERE agent_id = ai.agent_runs.agent_id AND tenant_id = security.current_tenant_id())
);

CREATE TABLE ai.optimization_suggestions (
    suggestion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    
    resource_id UUID NOT NULL, -- Target WORKFLOW or PROCESS
    suggestion_type TEXT NOT NULL, -- COST | LATENCY | PARALLELISM
    
    original_dag JSONB,
    optimized_dag JSONB,
    
    estimated_impact JSONB, -- { 'cost_save': 0.15, 'latency_reduction': 0.40 }
    
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPLIED', 'REJECTED', 'SUPERSEDED')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ai.memory_ledger (
    memory_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    
    entity_id UUID, -- Link to any resource
    memory_type TEXT NOT NULL, -- FAILURE_PATTERN | SUCCESS_CONTEXT | OPTIMIZATION_RESULT
    
    content TEXT NOT NULL,
    semantic_vector JSONB, -- Placeholder for embedding metadata
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for AI Plane
ALTER TABLE ai.agent_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.optimization_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.memory_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_on_ai_agents ON ai.agent_instances FOR ALL USING (tenant_id = security.current_tenant_id());
CREATE POLICY tenant_isolation_on_ai_opt ON ai.optimization_suggestions FOR ALL USING (tenant_id = security.current_tenant_id());
CREATE POLICY tenant_isolation_on_ai_mem ON ai.memory_ledger FOR ALL USING (tenant_id = security.current_tenant_id());

-- ==========================================
-- 🛡️ 9. AUTHORIZATION DECISION ENGINE (RULE 5)
-- ==========================================

-- 9.1 Path-based Access Evaluation (Recursive)
CREATE OR REPLACE FUNCTION security.evaluate_access(
    p_subject_id UUID,
    p_resource_id UUID,
    p_action TEXT
)
RETURNS TEXT -- ALLOW | DENY | UNDEFINED
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_result TEXT;
BEGIN
    -- Logic: Standard Decision Rule (Rule 5.2)
    -- 1. Traverse up the tree
    -- 2. Fetch all matching access_control records
    -- 3. Apply DENY override and specificity logic
    
    WITH RECURSIVE resource_path AS (
        -- Root: Start at the requested resource
        SELECT resource_id, parent_resource_id, 0 as depth
        FROM platform.resources
        WHERE resource_id = p_resource_id
        
        UNION ALL
        
        -- Recursive: Move up to parents
        SELECT r.resource_id, r.parent_resource_id, rp.depth + 1
        FROM platform.resources r
        JOIN resource_path rp ON r.resource_id = rp.parent_resource_id
    )
    SELECT ac.effect INTO v_result
    FROM resource_path rp
    JOIN security.access_control ac ON ac.resource_id = rp.resource_id
    WHERE ac.subject_id = p_subject_id
      AND ac.action = p_action
      -- Handle scope: LOCAL_ONLY at depth 0, or RECURSIVE anywhere
      AND (rp.depth = 0 OR ac.scope = 'RECURSIVE')
    ORDER BY 
        (ac.effect = 'DENY') DESC, -- DENY overrides everything (Rule 5.2.1)
        rp.depth ASC               -- Most specific resource wins (Rule 5.2.2)
    LIMIT 1;

    RETURN COALESCE(v_result, 'UNDEFINED');
END;
$$;

-- ==========================================
-- ⚙️ 10. EXECUTION STATE MACHINE CONTROL
-- ==========================================

-- 10.1 Stateful Transition with Lease Enforcement
CREATE OR REPLACE FUNCTION execution.update_instance_state(
    p_execution_id UUID,
    p_vm_id UUID,
    p_new_state TEXT,
    p_payload JSONB DEFAULT '{}'
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    -- 1. Verify Active Lease (Rule 2.4 / 5)
    IF NOT EXISTS (
        SELECT 1 FROM orchestration.vm_leases 
        WHERE execution_id = p_execution_id 
          AND vm_id = p_vm_id 
          AND status = 'ACTIVE' 
          AND (expires_at IS NULL OR expires_at > now())
    ) THEN
        RAISE EXCEPTION 'Lease Violation: VM % does not hold a valid lease for execution %', p_vm_id, p_execution_id;
    END IF;

    -- 2. Atomic Pillar Transition
    UPDATE execution.execution_instances
    SET state = p_new_state,
        started_at = CASE WHEN p_new_state = 'RUNNING' THEN now() ELSE started_at END,
        ended_at = CASE WHEN p_new_state IN ('COMPLETED', 'FAILED', 'CANCELLED') THEN now() ELSE ended_at END
    WHERE execution_id = p_execution_id;

    -- 3. High-Resolution Event Audit
    INSERT INTO execution.execution_events (
        execution_id, event_type, payload
    ) VALUES (
        p_execution_id, p_new_state, p_payload
    );

    -- 4. Automatic Lease Release on Termination

-- ==========================================
-- ==========================================
-- ⚖️ 11. ARL (AUTONOMOUS REGULATION LAYER)
-- ==========================================

-- 11.1 Policy Core
CREATE TABLE arl.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    scope TEXT NOT NULL CHECK (scope IN ('GLOBAL', 'TENANT', 'WORKSPACE', 'FOLDER', 'EXECUTION')),
    name TEXT NOT NULL,
    version INT DEFAULT 1,
    status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'DEPRECATED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE arl.policy_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES arl.policies(id) ON DELETE CASCADE,
    expression JSONB NOT NULL,
    effect TEXT NOT NULL CHECK (effect IN ('ALLOW', 'DENY', 'THROTTLE', 'ROUTE', 'PRICE_ADJUST')),
    priority INT DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE arl.policy_graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID UNIQUE NOT NULL REFERENCES arl.policies(id) ON DELETE CASCADE,
    graph_json JSONB NOT NULL,
    checksum TEXT NOT NULL,
    validated_by_seps BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11.2 Decision & Enforcement Ledgers
CREATE TABLE arl.policy_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES platform.tenants(resource_id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES arl.policies(id),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('ALLOW', 'DENY', 'ROUTE', 'THROTTLE', 'PRICE_ADJUST')),
    reason JSONB NOT NULL,
    evaluated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE arl.policy_enforcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    decision_id UUID NOT NULL REFERENCES arl.policy_decisions(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('BLOCK', 'REDIRECT', 'QUEUE', 'MODIFY', 'ESCALATE')),
    payload JSONB NOT NULL,
    executed_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE arl.policy_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hash_key TEXT UNIQUE NOT NULL,
    policy_id UUID NOT NULL,
    result TEXT NOT NULL,
    ttl_seconds INT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 11.3 ARL Indexes
CREATE INDEX idx_arl_policies_tenant ON arl.policies(tenant_id);
CREATE INDEX idx_arl_decisions_entity ON arl.policy_decisions(entity_id);
CREATE INDEX idx_arl_decisions_tenant ON arl.policy_decisions(tenant_id);

-- 11.4 ARL RLS Policies
ALTER TABLE arl.policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE arl.policy_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE arl.policy_graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE arl.policy_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE arl.policy_enforcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE arl.policy_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_on_arl_policies ON arl.policies FOR ALL USING (tenant_id = security.current_tenant_id() OR scope = 'GLOBAL');
CREATE POLICY tenant_isolation_on_arl_rules ON arl.policy_rules FOR ALL USING (EXISTS (SELECT 1 FROM arl.policies p WHERE p.id = arl.policy_rules.policy_id AND (p.tenant_id = security.current_tenant_id() OR p.scope = 'GLOBAL')));
CREATE POLICY tenant_isolation_on_arl_decisions ON arl.policy_decisions FOR ALL USING (tenant_id = security.current_tenant_id());
CREATE POLICY tenant_isolation_on_arl_cache ON arl.policy_cache FOR ALL USING (EXISTS (SELECT 1 FROM arl.policies p WHERE p.id = arl.policy_cache.policy_id AND p.tenant_id = security.current_tenant_id()));

-- ==========================================
-- 💰 12. ELAK (ECONOMIC LAYER)
-- ==========================================
CREATE TABLE elak.compute_contracts (
    contract_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(resource_id),
    instruction_batch_id UUID,
    max_price DECIMAL(10,5),
    deadline TIMESTAMPTZ,
    status TEXT DEFAULT 'OPEN'
);

CREATE TABLE elak.kernel_bids (
    bid_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_id UUID REFERENCES elak.compute_contracts(contract_id) ON DELETE CASCADE,
    kernel_id UUID,
    bid_price DECIMAL(10,5),
    trust_multiplier DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE elak.compute_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE elak.kernel_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_on_elak_contracts ON elak.compute_contracts FOR ALL USING (tenant_id = security.current_tenant_id());

-- ==========================================
-- 🧠 13. SEPS (SELF-EVOLVING PROOF SYSTEM)
-- ==========================================
CREATE TABLE seps.proof_rules (
    rule_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description TEXT,
    logic JSONB,
    version INT DEFAULT 1,
    is_active BOOLEAN DEFAULT true
);

CREATE TABLE seps.evolution_log (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gap_detected_trace_id UUID,
    induced_rule_id UUID REFERENCES seps.proof_rules(rule_id),
    validation_status TEXT, -- SIMULATED | VERIFIED | REJECTED
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE seps.proof_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE seps.evolution_log ENABLE ROW LEVEL SECURITY;
