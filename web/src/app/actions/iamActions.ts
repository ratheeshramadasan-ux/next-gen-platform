"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─── Permissions ─────────────────────────────────────────────────────────────

export async function getPermissionDefinitions() {
  try {
    const perms = await prisma.permissionDefinition.findMany({
      orderBy: [{ category: "asc" }, { resource: "asc" }, { action: "asc" }],
    });
    return JSON.parse(JSON.stringify(perms));
  } catch (e) {
    console.error("[IAM] getPermissionDefinitions:", e);
    return [];
  }
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function getRoleCatalog(scope?: { customerId?: string | null }) {
  try {
    const roles = await prisma.appRole.findMany({
      where: scope?.customerId
        ? { OR: [{ isSystem: true }, { customerId: scope.customerId }] }
        : undefined,
      include: {
        rolePermissions: {
          include: { permission: true },
        },
        tenantScopes: {
          include: { tenant: { select: { id: true, name: true, code: true } } },
        },
        sodRulesA: { include: { roleB: { select: { id: true, name: true } } } },
        sodRulesB: { include: { roleA: { select: { id: true, name: true } } } },
        _count: { select: { users: true } },
      },
      orderBy: [{ isSystem: "desc" }, { scope: "asc" }, { name: "asc" }],
    });
    return JSON.parse(JSON.stringify(roles));
  } catch (e) {
    console.error("[IAM] getRoleCatalog:", e);
    return [];
  }
}

export async function createCustomRole(payload: {
  name: string;
  description: string;
  scope: string;
  color: string;
  icon: string;
  parentRoleId?: string;
  customerId?: string;
  createdBy: string;
  permissionIds: string[];      // array of permission_definition ids with ALLOW
  denyPermissionIds?: string[]; // optional DENY overrides
  tenantScopeIds?: string[];    // replicate to these tenants
}) {
  try {
    const role = await prisma.appRole.create({
      data: {
        name: payload.name,
        description: payload.description,
        scope: payload.scope,
        color: payload.color,
        icon: payload.icon,
        parentRoleId: payload.parentRoleId || null,
        customerId: payload.customerId || null,
        createdBy: payload.createdBy,
        isCustom: true,
        isSystem: false,
        rolePermissions: {
          create: [
            ...payload.permissionIds.map(pid => ({ permissionId: pid, effect: "ALLOW" })),
            ...(payload.denyPermissionIds || []).map(pid => ({ permissionId: pid, effect: "DENY" })),
          ],
        },
        tenantScopes: payload.tenantScopeIds?.length
          ? { create: payload.tenantScopeIds.map(tid => ({ tenantId: tid })) }
          : undefined,
      },
    });
    revalidatePath("/next-gen/admin/iam");
    return { success: true, role: JSON.parse(JSON.stringify(role)) };
  } catch (e: any) {
    console.error("[IAM] createCustomRole:", e);
    return { success: false, error: e.message };
  }
}

export async function updateCustomRole(
  roleId: string,
  payload: {
    name: string;
    description: string;
    scope: string;
    color: string;
    icon: string;
    permissionIds: string[];
    denyPermissionIds?: string[];
    tenantScopeIds?: string[];
  }
) {
  try {
    // Replace all permissions
    await prisma.rolePermission.deleteMany({ where: { roleId } });
    await prisma.roleTenantScope.deleteMany({ where: { roleId } });

    const role = await prisma.appRole.update({
      where: { id: roleId },
      data: {
        name: payload.name,
        description: payload.description,
        scope: payload.scope,
        color: payload.color,
        icon: payload.icon,
        rolePermissions: {
          create: [
            ...payload.permissionIds.map(pid => ({ permissionId: pid, effect: "ALLOW" })),
            ...(payload.denyPermissionIds || []).map(pid => ({ permissionId: pid, effect: "DENY" })),
          ],
        },
        tenantScopes: payload.tenantScopeIds?.length
          ? { create: payload.tenantScopeIds.map(tid => ({ tenantId: tid })) }
          : undefined,
      },
    });
    revalidatePath("/next-gen/admin/iam");
    return { success: true, role: JSON.parse(JSON.stringify(role)) };
  } catch (e: any) {
    console.error("[IAM] updateCustomRole:", e);
    return { success: false, error: e.message };
  }
}

export async function deleteCustomRole(roleId: string) {
  try {
    const role = await prisma.appRole.findUnique({ where: { id: roleId } });
    if (role?.isSystem) return { success: false, error: "System roles cannot be deleted." };
    await prisma.appRole.delete({ where: { id: roleId } });
    revalidatePath("/next-gen/admin/iam");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function replicateRoleToTenants(roleId: string, tenantIds: string[]) {
  try {
    for (const tid of tenantIds) {
      await prisma.roleTenantScope.upsert({
        where: { roleId_tenantId: { roleId, tenantId: tid } },
        create: { roleId, tenantId: tid },
        update: {},
      });
    }
    revalidatePath("/next-gen/admin/iam");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function cloneRole(sourceRoleId: string, newName: string, createdBy: string) {
  try {
    const source = await prisma.appRole.findUnique({
      where: { id: sourceRoleId },
      include: { rolePermissions: true },
    });
    if (!source) return { success: false, error: "Source role not found." };

    const cloned = await prisma.appRole.create({
      data: {
        name: newName,
        description: `Clone of ${source.name}`,
        scope: source.scope,
        color: source.color || "#6366f1",
        icon: source.icon || "copy",
        isCustom: true,
        isSystem: false,
        createdBy,
        customerId: source.customerId || null,
        rolePermissions: {
          create: source.rolePermissions.map(rp => ({
            permissionId: rp.permissionId,
            effect: rp.effect,
          })),
        },
      },
    });
    revalidatePath("/next-gen/admin/iam");
    return { success: true, role: JSON.parse(JSON.stringify(cloned)) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── SoD Rules ────────────────────────────────────────────────────────────────

export async function getSodRules() {
  try {
    const rules = await prisma.sodRule.findMany({
      include: {
        roleA: { select: { id: true, name: true, color: true } },
        roleB: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ severity: "asc" }, { createdAt: "desc" }],
    });
    return JSON.parse(JSON.stringify(rules));
  } catch (e) {
    return [];
  }
}

export async function upsertSodRule(payload: {
  roleAId: string;
  roleBId: string;
  severity: string;
  description: string;
}) {
  try {
    await prisma.sodRule.upsert({
      where: { roleAId_roleBId: { roleAId: payload.roleAId, roleBId: payload.roleBId } },
      create: { ...payload, isActive: true },
      update: { severity: payload.severity, description: payload.description },
    });
    revalidatePath("/next-gen/admin/iam");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteSodRule(id: string) {
  try {
    await prisma.sodRule.delete({ where: { id } });
    revalidatePath("/next-gen/admin/iam");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── MFA Policy ───────────────────────────────────────────────────────────────

export async function getMfaPolicy(customerId: string) {
  try {
    const policy = await prisma.mfaPolicy.findUnique({ where: { customerId } });
    return JSON.parse(JSON.stringify(policy));
  } catch (e) {
    return null;
  }
}

export async function upsertMfaPolicy(payload: {
  customerId: string;
  isEnforced: boolean;
  allowedMethods: string[];
  gracePeriodDays: number;
}) {
  try {
    await prisma.mfaPolicy.upsert({
      where: { customerId: payload.customerId },
      create: {
        customerId: payload.customerId,
        isEnforced: payload.isEnforced,
        allowedMethods: payload.allowedMethods,
        gracePeriodDays: payload.gracePeriodDays,
      },
      update: {
        isEnforced: payload.isEnforced,
        allowedMethods: payload.allowedMethods,
        gracePeriodDays: payload.gracePeriodDays,
      },
    });
    revalidatePath("/next-gen/admin/iam");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Session Policy ───────────────────────────────────────────────────────────

export async function getSessionPolicy(customerId: string) {
  try {
    const policy = await prisma.sessionPolicy.findUnique({ where: { customerId } });
    return JSON.parse(JSON.stringify(policy));
  } catch (e) {
    return null;
  }
}

export async function upsertSessionPolicy(payload: {
  customerId: string;
  sessionTimeoutMinutes: number;
  idleTimeoutMinutes: number;
  maxConcurrentSessions: number;
  requireDeviceTrust: boolean;
  allowedIpRanges: string[];
  riskBasedAuthEnabled: boolean;
}) {
  try {
    await prisma.sessionPolicy.upsert({
      where: { customerId: payload.customerId },
      create: { ...payload },
      update: { ...payload },
    });
    revalidatePath("/next-gen/admin/iam");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
