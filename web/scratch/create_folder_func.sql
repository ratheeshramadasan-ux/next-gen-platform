-- 🚀 PRODUCTION-READY FOLDER CREATION LOGIC
-- Handles Root and Sub-folder creation with path and level inheritance.

CREATE OR REPLACE FUNCTION platform.create_folder(
    p_tenant_id UUID,
    p_customer_id UUID,
    p_workspace_id UUID,
    p_resource_id UUID,
    p_name TEXT,
    p_parent_id UUID DEFAULT NULL
)
RETURNS TABLE (
    folder_id UUID,
    name TEXT,
    path TEXT,
    level INT
)
AS $$
DECLARE
    v_parent_path TEXT := '';
    v_level INT := 0;
    v_new_path TEXT;
    v_exists INT;
BEGIN
    -- 🔒 1. Integrity Check: Prevent duplicate naming at the same hierarchical layer
    SELECT COUNT(1)
    INTO v_exists
    FROM platform.folders
    WHERE workspaceId = p_workspace_id
      AND name = p_name
      AND (parentId IS NOT DISTINCT FROM p_parent_id);

    IF v_exists > 0 THEN
        RAISE EXCEPTION 'A scope with this name already exists in the target location.';
    END IF;

    -- 📁 2. Inheritance Logic: Resolve relative path and level depth
    IF p_parent_id IS NOT NULL THEN
        SELECT folders.path, folders.level + 1
        INTO v_parent_path, v_level
        FROM platform.folders
        WHERE id = p_parent_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Parent scope could not be resolved.';
        END IF;
    END IF;

    -- 🧠 3. Path Reconstruction
    IF v_parent_path = '' OR v_parent_path = '/' THEN
        v_new_path := '/' || p_name;
    ELSE
        -- Ensure only single slashes
        v_new_path := rtrim(v_parent_path, '/') || '/' || p_name;
    END IF;

    -- 🚀 4. Transactional Persistence
    RETURN QUERY
    INSERT INTO platform.folders (
        id,
        "resourceId",
        "workspaceId",
        "tenantId",
        "customerId",
        name,
        "parentId",
        path,
        level,
        "updatedAt"
    )
    VALUES (
        gen_random_uuid(), -- Generate Folder ID (linked to Resource separately in Action)
        p_resource_id,
        p_workspace_id,
        p_tenant_id,
        p_customer_id,
        p_name,
        p_parent_id,
        v_new_path,
        v_level,
        now()
    )
    RETURNING id, folders.name, folders.path, folders.level;

END;
$$ LANGUAGE plpgsql;
