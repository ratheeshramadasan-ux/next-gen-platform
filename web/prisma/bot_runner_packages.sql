CREATE TABLE IF NOT EXISTS platform.bot_runner_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  kind TEXT NOT NULL,
  delivery_format TEXT NOT NULL,
  runtime_family TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform.bot_runner_package_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id UUID NOT NULL REFERENCES platform.bot_runner_packages(id) ON DELETE CASCADE,
  version TEXT NOT NULL,
  artifact_file_name TEXT,
  artifact_relative_path TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checksum_sha256 TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(package_id, version)
);

CREATE INDEX IF NOT EXISTS idx_bot_runner_package_versions_package
  ON platform.bot_runner_package_versions(package_id);

CREATE INDEX IF NOT EXISTS idx_bot_runner_package_versions_target_version
  ON platform.bot_runner_package_versions(version);

