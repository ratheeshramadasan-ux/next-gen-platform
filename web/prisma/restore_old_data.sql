-- Restore Old Data Migration Script (V6 - Join Table Fixed)
-- Handles mapping, hashing, foreign keys, and join table column types

-- 1. Create helper function for stable UUID conversion
CREATE OR REPLACE FUNCTION public.safe_uuid(input_val text) RETURNS uuid AS $$
BEGIN
    IF input_val ~ '^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$' THEN
        RETURN input_val::uuid;
    ELSIF input_val IS NULL OR input_val = '' THEN
        RETURN NULL;
    ELSE
        RETURN cast(md5(input_val) as uuid);
    END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

DO $$
DECLARE
    -- Table mappings: PascalCase -> snake_case
    mappings jsonb := '{
        "Customer": "customers",
        "Tenant": "tenants",
        "LookupIndustry": "lookup_industries",
        "LookupRegion": "lookup_regions",
        "LookupClassification": "lookup_classifications",
        "LookupPriority": "lookup_priorities",
        "LookupCurrency": "lookup_currencies",
        "LookupTimezone": "lookup_timezones",
        "LookupCustomerType": "lookup_customer_types",
        "AppUser": "users",
        "AppRole": "roles",
        "AppGroup": "groups",
        "IdentityProvider": "identity_providers",
        "GroupMapping": "group_mappings",
        "StandardDictionary": "standard_dictionaries",
        "Resource": "resources",
        "Workspace": "workspaces",
        "Folder": "folders",
        "Project": "projects",
        "StudioAsset": "studio_assets",
        "StudioVariable": "studio_variables",
        "StudioArgument": "studio_arguments",
        "AutomationWorkflow": "automation_workflows",
        "AutomationStep": "automation_steps",
        "AutomationComponent": "automation_components",
        "AutomationExecutionLog": "automation_execution_logs",
        "AuditLog": "audit_logs",
        "TenantConfig": "tenant_configs",
        "TenantService": "tenant_services",
        "TenantAdmin": "tenant_admins",
        "SecurityCredential": "security_credentials",
        "CustomerLogFile": "customer_log_files",
        "SmtpConfig": "smtp_configs",
        "FolderPermission": "folder_permissions",
        "StudioWorkflow": "studio_workflows",
        "StudioNode": "studio_nodes",
        "StudioConnection": "studio_connections",
        "StudioObject": "studio_objects",
        "StudioExecutionLog": "studio_execution_logs",
        "StudioStepLog": "studio_step_logs",
        "BotHost": "bot_hosts",
        "BotSession": "bot_sessions",
        "StudioJob": "studio_jobs",
        "WorkflowQueue": "workflow_queues",
        "QueueItem": "queue_items",
        "RagCollection": "rag_collections",
        "RagDocument": "rag_documents",
        "AiModel": "ai_models",
        "Workflow": "workflow_definitions",
        "WorkflowNode": "workflow_nodes",
        "WorkflowEdge": "workflow_edges",
        "ExecutionRun": "execution_runs",
        "ExecutionLog": "execution_logs"
    }';
    pascal_name text;
    snake_name text;
    select_clause text;
    insert_clause text;
    col record;
    row_count bigint;
BEGIN
    -- SUSPEND CONSTRAINTS
    SET session_replication_role = 'replica';
    
    FOR pascal_name, snake_name IN SELECT * FROM jsonb_each_text(mappings) LOOP
        IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = pascal_name) THEN
            RAISE NOTICE 'Restoring % to platform.%', pascal_name, snake_name;

            select_clause := '';
            insert_clause := '';
            
            FOR col IN (
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_schema = 'platform' AND table_name = snake_name
                ORDER BY ordinal_position
            ) LOOP
                
                DECLARE
                    matching_source_col text;
                    source_type text;
                BEGIN
                    SELECT column_name, data_type INTO matching_source_col, source_type
                    FROM information_schema.columns 
                    WHERE table_schema = 'public' AND table_name = pascal_name
                    AND (
                        column_name = col.column_name 
                        OR 
                        lower(regexp_replace(column_name, '([A-Z])', '_\1', 'g')) = col.column_name
                    )
                    LIMIT 1;

                    IF matching_source_col IS NOT NULL THEN
                        IF select_clause <> '' THEN
                            select_clause := select_clause || ', ';
                            insert_clause := insert_clause || ', ';
                        END IF;

                        IF col.data_type = 'uuid' AND source_type = 'text' THEN
                            select_clause := select_clause || format('public.safe_uuid(%I)', matching_source_col);
                        ELSE
                            select_clause := select_clause || format('%I', matching_source_col);
                        END IF;
                        
                        insert_clause := insert_clause || format('%I', col.column_name);
                    END IF;
                END;
            END LOOP;

            IF select_clause <> '' THEN
                IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'platform' AND tablename = snake_name) THEN
                    EXECUTE format('TRUNCATE TABLE platform.%I CASCADE', snake_name);
                    EXECUTE format('INSERT INTO platform.%I (%s) SELECT %s FROM public.%I', 
                        snake_name, insert_clause, select_clause, pascal_name);
                    EXECUTE format('SELECT count(*) FROM platform.%I', snake_name) INTO row_count;
                ELSE
                    EXECUTE format('ALTER TABLE public.%I SET SCHEMA platform', pascal_name);
                    EXECUTE format('ALTER TABLE platform.%I RENAME TO %I', pascal_name, snake_name);
                    EXECUTE format('SELECT count(*) FROM platform.%I', snake_name) INTO row_count;
                END IF;
                
                IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = pascal_name) THEN
                    EXECUTE format('DROP TABLE public.%I CASCADE', pascal_name);
                END IF;
                
                RAISE NOTICE 'Successfully restored % rows for %', row_count, snake_name;
            END IF;
        END IF;
    END LOOP;

    -- Clean up many-to-many tables (with proper casting)
    DECLARE
        m2m_table text;
    BEGIN
        FOR m2m_table IN SELECT unnest(ARRAY['_AppRoleToAppUser', '_AppGroupToAppUser']) LOOP
            IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = m2m_table) THEN
                IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'platform' AND tablename = m2m_table) THEN
                    EXECUTE format('TRUNCATE TABLE platform.%I CASCADE', m2m_table);
                    EXECUTE format('INSERT INTO platform.%I ("A", "B") SELECT public.safe_uuid("A"), public.safe_uuid("B") FROM public.%I', m2m_table, m2m_table);
                    EXECUTE format('DROP TABLE public.%I CASCADE', m2m_table);
                    RAISE NOTICE 'Successfully restored join table %', m2m_table;
                ELSE
                    EXECUTE format('ALTER TABLE public.%I SET SCHEMA platform', m2m_table);
                    RAISE NOTICE 'Moved join table % to platform', m2m_table;
                END IF;
            END IF;
        END LOOP;
    END;
    
    -- RE-ENABLE CONSTRAINTS
    SET session_replication_role = 'origin';
    
END $$;

DROP FUNCTION IF EXISTS public.safe_uuid(text);
