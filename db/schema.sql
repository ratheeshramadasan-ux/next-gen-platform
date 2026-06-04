CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE bots (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL
);

CREATE TABLE workflows (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  intent TEXT NOT NULL,
  definition JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE jobs (
  id UUID PRIMARY KEY,
  workflow_id UUID NOT NULL REFERENCES workflows(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  status TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE executions (
  id UUID PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES jobs(id),
  logs TEXT,
  status TEXT NOT NULL,
  duration FLOAT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

