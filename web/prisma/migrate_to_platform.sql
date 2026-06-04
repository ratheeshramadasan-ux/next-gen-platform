-- Migrate all tables to the 'platform' schema and clean up public/legacy schemas
-- This script ensures no data is lost during the consolidation.

-- 1. Create the platform schema if it doesn't already exist
CREATE SCHEMA IF NOT EXISTS platform;

-- 2. Move tables from legacy schemas to platform
DO $$
DECLARE
    schema_names text[] := ARRAY['security', 'execution', 'governance', 'observability', 'orchestration', 'ci_cd', 'ai', 'arl', 'elak', 'seps'];
    s text;
    r record;
BEGIN
    FOREACH s IN ARRAY schema_names LOOP
        -- Check if schema exists
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
            RAISE NOTICE 'Processing schema: %', s;
            FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = s) LOOP
                RAISE NOTICE 'Moving table %.% to platform', s, r.tablename;
                EXECUTE format('ALTER TABLE %I.%I SET SCHEMA platform', s, r.tablename);
            END LOOP;
        END IF;
    END LOOP;
END $$;

-- 3. Move registry/lookup tables from public to platform if they exist there
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND (
            tablename LIKE 'lookup_%' 
            OR tablename = 'standard_dictionaries'
            OR tablename IN (
                'resources', 'customers', 'tenants', 'tenant_configs', 
                'tenant_services', 'tenant_admins', 'audit_logs', 'users', 
                'roles', 'groups', 'identity_providers', 'group_mappings',
                'workspaces', 'folders', 'folder_permissions', 'projects',
                'studio_assets', 'studio_variables', 'studio_arguments',
                'automation_workflows', 'automation_steps', 'automation_components',
                'automation_execution_logs', 'studio_workflows', 'studio_nodes',
                'studio_connections', 'studio_objects', 'studio_execution_logs',
                'studio_step_logs', 'bot_hosts', 'bot_sessions', 'studio_jobs',
                'workflow_queues', 'queue_items', 'rag_collections', 'rag_documents',
                'ai_models', 'workflow_definitions', 'workflow_nodes', 'workflow_edges',
                'execution_runs', 'execution_logs'
            )
        )
    ) LOOP
        -- Only move if the table doesn't already exist in platform (to avoid collision if partially migrated)
        IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'platform' AND tablename = r.tablename) THEN
            RAISE NOTICE 'Moving table public.% to platform', r.tablename;
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA platform', r.tablename);
        ELSE
            RAISE NOTICE 'Table % already exists in platform, skipping move from public (manual cleanup may be required)', r.tablename;
        END IF;
    END LOOP;
END $$;

-- 4. Final cleanup: Drop empty legacy schemas
DO $$
DECLARE
    schema_names text[] := ARRAY['security', 'execution', 'governance', 'observability', 'orchestration', 'ci_cd', 'ai', 'arl', 'elak', 'seps'];
    s text;
BEGIN
    FOREACH s IN ARRAY schema_names LOOP
        IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = s) THEN
            -- Only drop if it has no tables left
            IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = s) THEN
                EXECUTE format('DROP SCHEMA %I CASCADE', s);
                RAISE NOTICE 'Dropped empty schema: %', s;
            ELSE
                RAISE NOTICE 'Schema % still contains tables, skipping drop', s;
            END IF;
        END IF;
    END LOOP;
END $$;
