-- Reference Data Audit Triggers (PostgreSQL)
-- This script establishes a database-level audit trail for all Lookup tables.

-- 1. Create the Universal Audit Trigger Function
CREATE OR REPLACE FUNCTION platform.lookup_audit_trigger_func()
RETURNS TRIGGER AS $$
DECLARE
    audit_action TEXT;
    audit_target TEXT;
    audit_details JSONB;
BEGIN
    -- Determine the operation type
    IF (TG_OP = 'INSERT') THEN
        audit_action := 'DB_TRIGGER_INSERT_' || UPPER(TG_TABLE_NAME);
        audit_target := NEW.label;
        audit_details := jsonb_build_object(
            'operation', 'INSERT',
            'new_data', to_jsonb(NEW)
        );
    ELSIF (TG_OP = 'UPDATE') THEN
        audit_action := 'DB_TRIGGER_UPDATE_' || UPPER(TG_TABLE_NAME);
        audit_target := NEW.label;
        audit_details := jsonb_build_object(
            'operation', 'UPDATE',
            'old_data', to_jsonb(OLD),
            'new_data', to_jsonb(NEW),
            'changed_fields', (
                SELECT jsonb_object_agg(key, value)
                FROM jsonb_each(to_jsonb(NEW))
                WHERE to_jsonb(NEW) -> key IS DISTINCT FROM to_jsonb(OLD) -> key
            )
        );
    ELSIF (TG_OP = 'DELETE') THEN
        audit_action := 'DB_TRIGGER_DELETE_' || UPPER(TG_TABLE_NAME);
        audit_target := OLD.label;
        audit_details := jsonb_build_object(
            'operation', 'DELETE',
            'old_data', to_jsonb(OLD)
        );
    END IF;

    -- Insert the audit log entry
    INSERT INTO platform.audit_logs (
        id,
        timestamp,
        actor,
        action,
        target,
        details,
        severity,
        "isChronicle"
    ) VALUES (
        gen_random_uuid(),
        NOW(),
        'System (Database Trigger)',
        audit_action,
        audit_target,
        audit_details::text,
        CASE WHEN TG_OP = 'DELETE' THEN 'High' ELSE 'Info' END,
        TRUE
    );

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 2. Apply Triggers to all Lookup Tables
-- Cleanup existing triggers first if re-running
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'lookup_industries',
        'lookup_regions',
        'lookup_classifications',
        'lookup_priorities',
        'lookup_currencies',
        'lookup_timezones',
        'lookup_customer_types'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_audit_%I ON platform.%I', t, t);
        EXECUTE format('CREATE TRIGGER trg_audit_%I AFTER INSERT OR UPDATE OR DELETE ON platform.%I FOR EACH ROW EXECUTE FUNCTION platform.lookup_audit_trigger_func()', t, t);
    END LOOP;
END $$;
