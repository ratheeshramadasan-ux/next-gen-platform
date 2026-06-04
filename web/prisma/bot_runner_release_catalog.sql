CREATE TABLE IF NOT EXISTS platform.bot_runner_release_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  agent_type TEXT NOT NULL,
  platform TEXT NOT NULL,
  distribution_type TEXT NOT NULL,
  runtime_family TEXT,
  scope TEXT NOT NULL DEFAULT 'GLOBAL',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform.bot_runner_release_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES platform.bot_runner_release_packages(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  artifact_file_name TEXT,
  artifact_relative_path TEXT,
  checksum_sha256 TEXT,
  signature_status TEXT NOT NULL DEFAULT 'UNSIGNED',
  release_notes TEXT,
  release_status TEXT NOT NULL DEFAULT 'PUBLISHED',
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(package_id, version)
);

CREATE TABLE IF NOT EXISTS platform.bot_runner_release_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES platform.bot_runner_release_versions(id) ON DELETE CASCADE,
  supported_os TEXT,
  supported_arch TEXT,
  execution_mode TEXT,
  min_runtime_version TEXT,
  max_runtime_version TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform.bot_runner_release_tenant_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES platform.bot_runner_release_packages(id) ON DELETE CASCADE,
  pinned_version_id UUID REFERENCES platform.bot_runner_release_versions(id) ON DELETE SET NULL,
  rollout_state TEXT NOT NULL DEFAULT 'ALLOWED',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, package_id)
);

CREATE TABLE IF NOT EXISTS platform.bot_runner_download_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES platform.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  package_id UUID REFERENCES platform.bot_runner_release_packages(id) ON DELETE SET NULL,
  version_id UUID REFERENCES platform.bot_runner_release_versions(id) ON DELETE SET NULL,
  target_platform TEXT NOT NULL,
  version TEXT,
  file_name TEXT,
  request_ip TEXT,
  user_agent TEXT,
  download_status TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bot_runner_release_versions_package
  ON platform.bot_runner_release_versions(package_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_bot_runner_release_versions_status
  ON platform.bot_runner_release_versions(release_status, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_bot_runner_release_compatibility_version
  ON platform.bot_runner_release_compatibility(version_id);

CREATE INDEX IF NOT EXISTS idx_bot_runner_release_tenant_policies_tenant
  ON platform.bot_runner_release_tenant_policies(tenant_id);

CREATE INDEX IF NOT EXISTS idx_bot_runner_download_audit_created
  ON platform.bot_runner_download_audit(created_at DESC);

