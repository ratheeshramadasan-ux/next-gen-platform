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
