"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// --- Users ---

export async function getIdentityUsers(scope: { 
  role: string; 
  customerId?: string | null; 
  tenantId?: string | null; 
}) {
  try {
    const whereClause: any = {};

    console.log(`[IAM FETCH] Role: ${scope.role}, Customer: ${scope.customerId}, Tenant: ${scope.tenantId}`);

    if (scope.role !== "Platform Admin") {
      // Non-Platform Admins can NEVER see Platform Admins
      whereClause.roles = {
        none: { name: "Platform Admin" }
      };

      if (scope.role === "Admin User" && scope.customerId) {
        whereClause.customerId = scope.customerId;
      } else if (scope.role === "Tenant Admin" && scope.tenantId) {
        whereClause.tenantId = scope.tenantId;
      }
    }

    const users = await prisma.appUser.findMany({
      where: whereClause,
      include: {
        roles: true,
        customer: true,
        tenant: true
      },
      orderBy: { createdAt: "desc" },
    });
    
    console.log(`[IAM FETCH] Found ${users.length} users`);
    return users;
  } catch (error) {
    console.error("Error fetching identity users:", error);
    return [];
  }
}

export async function createAppUser(data: { email: string; fullName: string; roleId?: string }) {
  try {
    const user = await prisma.appUser.create({
      data: {
        email: data.email,
        fullName: data.fullName,
        roles: data.roleId ? { connect: { id: data.roleId } } : undefined,
      },
    });
    revalidatePath("/next-gen/admin/access");
    return { success: true, user };
  } catch (error) {
    console.error("Error creating app user:", error);
    return { success: false, error: "Failed to create user" };
  }
}

// --- Roles ---

// Role elevation order — higher = more privileged (controls sort order in UI)
const ROLE_ELEVATION: Record<string, number> = {
  "Platform Admin": 100,
  "Customer Admin": 90,
  "Tenant Admin": 80,
  "Security Admin": 70,
  "Solution Architect": 60,
  "Business Approver": 50,
  "Developer": 45,
  "Analyst": 40,
  "Tester": 35,
  "Business User": 30,
  "Dashboard User": 25,
  "Auditor": 20,
  "User": 10,
};

export async function getIdentityRoles(userRole?: string) {
  try {
    const whereClause: any = {};
    // Platform Admin role only visible to Platform Admins
    if (userRole !== "Platform Admin") {
      whereClause.name = { not: "Platform Admin" };
    }

    const roles = await prisma.appRole.findMany({
      where: whereClause,
      include: { _count: { select: { users: true } } },
      orderBy: [{ isSystem: "desc" }, { scope: "asc" }, { name: "asc" }],
    });

    return JSON.parse(JSON.stringify(
      roles.sort((a, b) => (ROLE_ELEVATION[b.name] || 0) - (ROLE_ELEVATION[a.name] || 0))
    ));
  } catch (error) {
    console.error("Error fetching identity roles:", error);
    return [];
  }
}

// --- Groups ---

export async function getIdentityGroups() {
  try {
    const groups = await prisma.appGroup.findMany({
      include: {
        _count: { select: { users: true } },
        mappings: { include: { internalRole: true } },
      },
      orderBy: { name: "asc" },
    });

    // Parse structured description JSON (pre-built groups store metadata as JSON)
    return JSON.parse(JSON.stringify(groups.map(g => {
      let meta: any = {};
      try { if (g.description?.startsWith("{")) meta = JSON.parse(g.description); } catch {}
      return {
        ...g,
        displayDescription: meta.description || g.description || "",
        rationale: meta.rationale || "",
        category: meta.category || "Custom",
        isPrebuilt: meta.isPrebuilt || false,
        defaultRoles: meta.defaultRoles || [],
      };
    })));
  } catch (error) {
    console.error("Error fetching identity groups:", error);
    return [];
  }
}

// --- Integration & Security ---

export async function getIdentityProviders() {
  try {
    const providers = await prisma.identityProvider.findMany({ orderBy: { createdAt: "desc" } });
    return JSON.parse(JSON.stringify(providers));
  } catch { return []; }
}

export async function getGroupMappings() {
  try {
    const mappings = await prisma.groupMapping.findMany({
      include: {
        provider: { select: { id: true, name: true, type: true } },
        internalRole:  { select: { id: true, name: true } },
        internalGroup: { select: { id: true, name: true } },
      },
      orderBy: { priority: "asc" },
    });
    return JSON.parse(JSON.stringify(mappings));
  } catch { return []; }
}

export async function createGroupMappingAction(payload: {
  providerId: string;
  externalGroupName: string;
  internalRoleId?: string;
  internalGroupId?: string;
  priority?: number;
}) {
  try {
    const mapping = await prisma.groupMapping.create({
      data: {
        providerId: payload.providerId,
        externalGroupName: payload.externalGroupName,
        internalRoleId: payload.internalRoleId || null,
        internalGroupId: payload.internalGroupId || null,
        priority: payload.priority || 1,
      },
      include: {
        provider: { select: { id: true, name: true } },
        internalRole:  { select: { id: true, name: true } },
        internalGroup: { select: { id: true, name: true } },
      },
    });
    revalidatePath("/next-gen/admin/access");
    return { success: true, mapping: JSON.parse(JSON.stringify(mapping)) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteGroupMappingAction(id: string) {
  try {
    await prisma.groupMapping.delete({ where: { id } });
    revalidatePath("/next-gen/admin/access");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// --- Seeding (Internal Utility) ---

// Authoritative 13-role framework — single source of truth
const FRAMEWORK_ROLES = [
  {
    name: "Platform Admin",
    description: "Platform Super Administrator. Owns the entire platform. Responsible for platform governance, global configuration, customer onboarding, infrastructure management, and license control.",
    scope: "platform", color: "#ef4444", icon: "crown", isSystem: true,
  },
  {
    name: "Customer Admin",
    description: "Customer Organization Administrator. Represents the customer organization and is responsible for customer governance, tenant management, and customer-level security controls.",
    scope: "customer", color: "#f97316", icon: "building2", isSystem: true,
  },
  {
    name: "Tenant Admin",
    description: "Tenant Administrator. Owns a specific tenant environment. Responsible for user management, group management, tenant configuration, and workspace management within their tenant.",
    scope: "tenant", color: "#eab308", icon: "layers", isSystem: true,
  },
  {
    name: "Security Admin",
    description: "Security Administrator. Responsible for platform security policies, MFA enforcement, SSO configuration, audit reviews, and risk management across the organization.",
    scope: "tenant", color: "#22c55e", icon: "shield-check", isSystem: true,
  },
  {
    name: "Solution Architect",
    description: "Solution Architect. Responsible for solution design, platform standards, governance frameworks, and design approvals. Reviews and approves architectural decisions.",
    scope: "tenant", color: "#06b6d4", icon: "compass", isSystem: true,
  },
  {
    name: "Business User",
    description: "Business User. Business process owner responsible for process ownership, requirement definition, and automation requests. Executes authorized automated processes.",
    scope: "tenant", color: "#8b5cf6", icon: "briefcase", isSystem: true,
  },
  {
    name: "Business Approver",
    description: "Business Approver. Responsible for approving workflows, automation releases, production deployments, and AI model activations on behalf of the business.",
    scope: "tenant", color: "#6366f1", icon: "check-circle", isSystem: true,
  },
  {
    name: "Dashboard User",
    description: "Dashboard User. Read-only analytics consumer. Responsible for monitoring KPIs, reviewing operational reports, and tracking performance metrics.",
    scope: "tenant", color: "#14b8a6", icon: "bar-chart", isSystem: true,
  },
  {
    name: "Developer",
    description: "Developer. Responsible for building automation solutions, AI workflows, application integrations, and APIs. Works within the Automation Studio and AI builder.",
    scope: "tenant", color: "#3b82f6", icon: "code", isSystem: true,
  },
  {
    name: "Analyst",
    description: "Analyst. Responsible for business analysis, data analysis, process documentation, and requirement gathering. Bridges business and technical teams.",
    scope: "tenant", color: "#84cc16", icon: "search", isSystem: true,
  },
  {
    name: "Tester",
    description: "Tester. Responsible for quality assurance, test planning, functional testing, and UAT support. Validates automations and applications before production release.",
    scope: "tenant", color: "#f59e0b", icon: "flask", isSystem: true,
  },
  {
    name: "Auditor",
    description: "Auditor. Responsible for compliance reviews, security audits, and access certifications. Has read-only access to all audit trails, logs, and access records.",
    scope: "tenant", color: "#64748b", icon: "scroll", isSystem: true,
  },
  {
    name: "User",
    description: "Standard User. Basic operational user who consumes platform services. Accesses assigned applications, executes authorized functions, and submits requests.",
    scope: "tenant", color: "#94a3b8", icon: "user", isSystem: true,
  },
] as const;

export async function seedIdentityData() {
  try {
    const existingRoles = await prisma.appRole.findMany({ select: { name: true } });
    const existingNames = new Set(existingRoles.map(r => r.name));

    console.log("[IAM] Synchronizing framework roles...");

    await prisma.$transaction(async (tx) => {
      // Upsert all 13 framework roles — create if missing, update description/metadata if exists
      for (const r of FRAMEWORK_ROLES) {
        const existing = await tx.appRole.findUnique({ where: { name: r.name } });
        if (!existing) {
          const resource = await tx.resource.create({
            data: { resourceType: "IAM_ROLE", name: r.name, status: "ACTIVE" }
          });
          await tx.appRole.create({
            data: {
              name: r.name, description: r.description, isSystem: r.isSystem,
              scope: r.scope, color: r.color, icon: r.icon,
              isCustom: false, resourceId: resource.id,
            }
          });
        } else {
          await tx.appRole.update({
            where: { name: r.name },
            data: {
              description: r.description, isSystem: r.isSystem,
              scope: r.scope, color: r.color, icon: r.icon, isCustom: false,
            }
          });
        }
      }

      // Ensure internal identity provider
      const existingProvider = await tx.identityProvider.findFirst({ where: { name: "Platform Internal" } });
      if (!existingProvider) {
        await tx.identityProvider.create({
          data: { name: "Platform Internal", type: "INTERNAL", configJson: "{}", syncStatus: "Active" }
        });
      }

      // Ensure the platform admin user exists
      const platformAdminRole = await tx.appRole.findUnique({ where: { name: "Platform Admin" } });
      if (platformAdminRole) {
        await tx.appUser.upsert({
          where: { email: "ratheesh@zohomail.ca" },
          update: {},
          create: {
            email: "ratheesh@zohomail.ca",
            fullName: "Platform Admin (Ratheesh)",
            status: "Protected",
            roles: { connect: { id: platformAdminRole.id } }
          }
        });
      }
    });

    revalidatePath("/next-gen/admin/access");
    return { success: true };
  } catch (error) {
    console.error("Error seeding IAM data:", error);
    return { success: false, error: "Seeding failed" };
  }
}

/**
 * Enterprise Role Creation with Mandatory Registry Sync
 */
export async function createRoleAction(payload: { name: string; description: string; permissions: string[] }) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.create({
        data: {
          resourceType: "IAM_ROLE",
          name: payload.name,
          status: "ACTIVE"
        }
      });

      return await tx.appRole.create({
        data: {
          name: payload.name,
          description: payload.description,
          permissions: JSON.stringify(payload.permissions),
          resourceId: resource.id
        }
      });
    });

    revalidatePath("/next-gen/admin/access");
    return { success: true, role: result };
  } catch (error: any) {
    console.error("[IAM] Role creation failed:", error);
    return { success: false, error: error.message };
  }
}

export async function updateRoleAction(id: string, payload: { name: string; description: string; permissions: string[] }) {
  try {
    const role = await prisma.appRole.update({
      where: { id },
      data: {
        name: payload.name,
        description: payload.description,
        permissions: JSON.stringify(payload.permissions),
      }
    });
    revalidatePath("/next-gen/admin/access");
    return { success: true, role };
  } catch (error: any) {
    console.error("[IAM] Role update failed:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteRoleAction(id: string) {
  try {
    const role = await prisma.appRole.findUnique({ where: { id } });
    if (role?.isSystem) throw new Error("System roles cannot be deleted");
    
    await prisma.appRole.delete({ where: { id } });
    revalidatePath("/next-gen/admin/access");
    return { success: true };
  } catch (error: any) {
    console.error("[IAM] Role deletion failed:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Enterprise Group Creation with Mandatory Registry Sync
 */
export async function createGroupAction(payload: { name: string; description: string; roleIds?: string[] }) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const resource = await tx.resource.create({
        data: {
          resourceType: "IAM_GROUP",
          name: payload.name,
          status: "ACTIVE"
        }
      });

      const group = await tx.appGroup.create({
        data: {
          name: payload.name,
          description: payload.description,
          resourceId: resource.id
        }
      });

      if (payload.roleIds && payload.roleIds.length > 0) {
        // Find internal provider
        const internalProvider = await tx.identityProvider.findFirst({ where: { name: "Platform Internal" } });
        if (internalProvider) {
          await tx.groupMapping.createMany({
            data: payload.roleIds.map(roleId => ({
              internalGroupId: group.id,
              internalRoleId: roleId,
              providerId: internalProvider.id,
              externalGroupName: "INTERNAL",
              priority: 1
            }))
          });
        }
      }

      return group;
    });

    revalidatePath("/next-gen/admin/access");
    return { success: true, group: result };
  } catch (error: any) {
    console.error("[IAM] Group creation failed:", error);
    return { success: false, error: error.message };
  }
}
// --- Advanced Scoping Helpers ---

export async function getTenantsForCustomer(customerId: string) {
  try {
    return await prisma.tenant.findMany({
      where: { customerId },
      select: { id: true, name: true, type: true, status: true }
    });
  } catch (error) {
    console.error("Error fetching tenants for scoping:", error);
    return [];
  }
}

export async function getFoldersForCustomer(customerId: string) {
  try {
    return await prisma.folder.findMany({
      where: {
        customerId,
        isArchived: false
      },
      select: { id: true, name: true }
    });
  } catch (error) {
    console.error("Error fetching folders for scoping:", error);
    return [];
  }
}

// --- Registration & Onboarding ---

export async function registerUserAction(payload: { 
  email: string; 
  fullName: string; 
  tenantId: string;
  customerId: string;
}) {
  try {
    // Check if user already exists
    const existing = await prisma.appUser.findUnique({ where: { email: payload.email } });
    if (existing) {
      return { success: false, error: "Email already registered." };
    }

    const user = await prisma.appUser.create({
      data: {
        email: payload.email,
        fullName: payload.fullName,
        tenantId: payload.tenantId,
        customerId: payload.customerId,
        status: "Pending Approval",
      }
    });

    return { success: true, user };
  } catch (error: any) {
    console.error("Registration failed:", error);
    return { success: false, error: error.message };
  }
}

export async function getPendingUserRegistrations(scope: { 
  role: string; 
  customerId?: string | null; 
  tenantId?: string | null; 
}) {
  try {
    const whereClause: any = { status: "Pending Approval" };

    if (scope.role === "Admin User" && scope.customerId) {
      whereClause.customerId = scope.customerId;
    } else if (scope.role === "Tenant Admin" && scope.tenantId) {
      whereClause.tenantId = scope.tenantId;
    } else if (scope.role !== "Platform Admin") {
      // Other roles shouldn't see these
      return [];
    }

    return await prisma.appUser.findMany({
      where: whereClause,
      include: {
        customer: { select: { companyName: true } },
        tenant: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (error) {
    console.error("Error fetching pending registrations:", error);
    return [];
  }
}

export async function approveUserRegistration(userId: string, roleId: string) {
  try {
    const user = await prisma.appUser.update({
      where: { id: userId },
      data: {
        status: "Active",
        roles: { connect: { id: roleId } }
      }
    });

    revalidatePath("/next-gen/admin/access");
    return { success: true, user };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
