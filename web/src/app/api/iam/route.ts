import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Raw SQL — bypasses Prisma client type issues entirely
    const roles = await prisma.$queryRaw<any[]>`
      SELECT
        r.id,
        r.name,
        r.description,
        r."isSystem" as "isSystem",
        COALESCE(r.is_custom, false) as "isCustom",
        COALESCE(r.scope, 'tenant') as scope,
        r.color,
        r.icon,
        r.parent_role_id as "parentRoleId",
        r.customer_id as "customerId",
        r.created_by as "createdBy",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        COALESCE((SELECT COUNT(*) FROM platform."_AppRoleToAppUser" ru WHERE ru."A" = r.id), 0)::int as "userCount"
      FROM platform.roles r
      ORDER BY r."isSystem" DESC, r.name ASC
    `;

    const permissions = await prisma.$queryRaw<any[]>`
      SELECT id, resource, action, display_name as "displayName", description, category, is_system as "isSystem"
      FROM platform.permission_definitions
      ORDER BY category ASC, resource ASC, action ASC
    `;

    const rolePerms = await prisma.$queryRaw<any[]>`
      SELECT rp.id, rp.role_id as "roleId", rp.permission_id as "permissionId", rp.effect,
             pd.resource, pd.action, pd.display_name as "displayName", pd.category
      FROM platform.role_permissions rp
      JOIN platform.permission_definitions pd ON pd.id = rp.permission_id
      ORDER BY rp.role_id, pd.category, pd.action
    `;

    const tenantScopes = await prisma.$queryRaw<any[]>`
      SELECT rts.role_id as "roleId", rts.tenant_id as "tenantId",
             t.name as "tenantName", t.code as "tenantCode"
      FROM platform.role_tenant_scopes rts
      JOIN platform.tenants t ON t.id = rts.tenant_id
    `;

    const sodRules = await prisma.$queryRaw<any[]>`
      SELECT s.id, s.role_a_id as "roleAId", s.role_b_id as "roleBId",
             s.severity, s.description, s.is_active as "isActive",
             ra.name as "roleAName", ra.color as "roleAColor",
             rb.name as "roleBName", rb.color as "roleBColor"
      FROM platform.sod_rules s
      JOIN platform.roles ra ON ra.id = s.role_a_id
      JOIN platform.roles rb ON rb.id = s.role_b_id
      ORDER BY s.severity ASC
    `;

    // Assemble — attach permissions and scopes to each role
    const rpByRole = new Map<string, any[]>();
    for (const rp of rolePerms) {
      if (!rpByRole.has(rp.roleId)) rpByRole.set(rp.roleId, []);
      rpByRole.get(rp.roleId)!.push(rp);
    }

    const scopesByRole = new Map<string, any[]>();
    for (const ts of tenantScopes) {
      if (!scopesByRole.has(ts.roleId)) scopesByRole.set(ts.roleId, []);
      scopesByRole.get(ts.roleId)!.push(ts);
    }

    const sodByRole = new Map<string, { a: any[]; b: any[] }>();
    for (const sod of sodRules) {
      if (!sodByRole.has(sod.roleAId)) sodByRole.set(sod.roleAId, { a: [], b: [] });
      if (!sodByRole.has(sod.roleBId)) sodByRole.set(sod.roleBId, { a: [], b: [] });
      sodByRole.get(sod.roleAId)!.a.push(sod);
      sodByRole.get(sod.roleBId)!.b.push(sod);
    }

    const assembled = roles.map(r => ({
      ...r,
      isSystem: Boolean(r.isSystem),
      isCustom: Boolean(r.isCustom),
      rolePermissions: (rpByRole.get(r.id) || []).map(rp => ({
        id: rp.id,
        permissionId: rp.permissionId,
        effect: rp.effect,
        permission: {
          id: rp.permissionId,
          resource: rp.resource,
          action: rp.action,
          displayName: rp.displayName,
          category: rp.category,
        },
      })),
      tenantScopes: (scopesByRole.get(r.id) || []).map(ts => ({
        tenantId: ts.tenantId,
        tenant: { id: ts.tenantId, name: ts.tenantName, code: ts.tenantCode },
      })),
      sodRulesA: (sodByRole.get(r.id)?.a || []).map(s => ({ id: s.id, roleB: { id: s.roleBId, name: s.roleBName } })),
      sodRulesB: (sodByRole.get(r.id)?.b || []).map(s => ({ id: s.id, roleA: { id: s.roleAId, name: s.roleAName } })),
      _count: { users: Number(r.userCount) },
    }));

    const formattedSod = sodRules.map(s => ({
      id: s.id,
      severity: s.severity,
      description: s.description,
      isActive: Boolean(s.isActive),
      roleA: { id: s.roleAId, name: s.roleAName, color: s.roleAColor },
      roleB: { id: s.roleBId, name: s.roleBName, color: s.roleBColor },
    }));

    return NextResponse.json({ roles: assembled, permissions, sodRules: formattedSod });
  } catch (e: any) {
    console.error("[IAM API]", e.message);
    return NextResponse.json({ error: e.message, roles: [], permissions: [], sodRules: [] }, { status: 500 });
  }
}
