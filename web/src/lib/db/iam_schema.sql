-- Next Gen Platform: Identity & Access Management (IAM) Schema
-- Production DDL for PostgreSQL

-- 1. Identity Providers (IdP) Config
CREATE TABLE identity_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    provider_type VARCHAR(20) NOT NULL, -- 'SAML', 'OIDC', 'LDAP'
    config_json JSONB NOT NULL, -- ClientID, Secrets, Metadata URLs
    certificate_thumbprint TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. External Groups (Mirror from IdP via SCIM/SAML)
CREATE TABLE external_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES identity_providers(id) ON DELETE CASCADE,
    external_id VARCHAR(255) NOT NULL, -- Object ID in Entra ID / Okta
    name VARCHAR(255) NOT NULL,
    UNIQUE(provider_id, external_id)
);

-- 3. Internal Roles
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    UNIQUE(tenant_id, name)
);

-- 4. Internal Groups (Collaborative Structures)
CREATE TABLE internal_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT
);

-- 5. Permissions Catalog
CREATE TABLE permissions (
    id VARCHAR(100) PRIMARY KEY, -- e.g. 'PRJ_EDIT', 'USER_INVITE'
    category VARCHAR(50),
    description TEXT
);

-- 6. Role-Permission Matrix
CREATE TABLE role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES permissions(id),
    PRIMARY KEY (role_id, permission_id)
);

-- 7. Group Mapping Engine Rules
CREATE TABLE group_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID REFERENCES identity_providers(id) ON DELETE CASCADE,
    external_group_name VARCHAR(255) NOT NULL, -- regex or exact match
    internal_role_id UUID REFERENCES roles(id),
    internal_group_id UUID REFERENCES internal_groups(id),
    mapping_type VARCHAR(20) DEFAULT 'static', -- 'static', 'regex'
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Core User Registry
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(255),
    external_id VARCHAR(255), -- Reference for SCIM/SSO
    auth_method VARCHAR(20) DEFAULT 'local', -- 'local', 'sso'
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. User-Join Tables
CREATE TABLE user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE user_groups (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    group_id UUID REFERENCES internal_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

-- 10. Audit Ledger
CREATE TABLE audit_chronicle (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_mappings_provider ON group_mappings(provider_id);
CREATE INDEX idx_audit_timestamp ON audit_chronicle(timestamp DESC);
