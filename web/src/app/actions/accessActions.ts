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

export async function getIdentityRoles(userRole?: string) {
  try {
    const whereClause: any = {};
    
    // Hide Platform Admin role from everyone except Platform Admins
    if (userRole !== "Platform Admin") {
      whereClause.name = { not: "Platform Admin" };
    }

    const roles = await prisma.appRole.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    // Elevation-based weight map
    const weightMap: Record<string, number> = {
      "Platform Admin": 100,
      "Admin User": 90,
      "Tenant Admin": 80,
      "Executive / CXO": 70,
      "Business Unit Head": 65,
      "RPA CoE Lead / Automation Director": 60,
      "Solution Architect (RPA + AI)": 55,
      "Security & Compliance Officer": 50,
      "Technical Architect": 45,
      "RPA Developer (Senior / Junior)": 40,
      "AI/ML Engineer": 35,
      "QA / Test Engineer": 30,
      "Bot Controller / Operator": 25,
      "Support Engineer (L2/L3)": 20,
      "Infrastructure Admin": 15,
      "Business SME (Subject Matter Expert)": 10,
      "Process Owner": 5,
      "Business User (End User / Citizen User)": 1
    };

    return roles.sort((a, b) => (weightMap[b.name] || 0) - (weightMap[a.name] || 0));
  } catch (error) {
    console.error("Error fetching identity roles:", error);
    return [];
  }
}

// --- Groups ---

export async function getIdentityGroups() {
  try {
    return await prisma.appGroup.findMany({
      include: {
        _count: {
          select: { users: true }
        },
        mappings: {
          include: {
            internalRole: true
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching identity groups:", error);
    return [];
  }
}

// --- Integration & Security ---

export async function getIdentityProviders() {
  return [];
}

export async function getGroupMappings() {
  return [];
}

// --- Seeding (Internal Utility) ---

export async function seedIdentityData() {
  try {
    const existingRoles = await prisma.appRole.findMany({ select: { name: true } });
    const existingNames = new Set(existingRoles.map(r => r.name));

    console.log("Synchronizing Enterprise IAM Hierarchy...");

    await prisma.$transaction(async (tx) => {
      // Helper to create role with resource if missing
      const ensureRole = async (name: string, description: string, permissions: any[], isSystem: boolean = false) => {
        if (existingNames.has(name)) return;
        
        const resource = await tx.resource.create({
          data: {
            resourceType: "IAM_ROLE",
            name,
            status: "ACTIVE"
          }
        });
        return await tx.appRole.create({
          data: {
            name,
            description,
            permissions: JSON.stringify(permissions.map(p => typeof p === 'string' ? p : JSON.stringify(p))),
            isSystem,
            resourceId: resource.id
          }
        });
      };

      // --- Administrative Layer (NON-CONFIGURABLE) ---
      const platformAdmin = await ensureRole("Platform Admin", "Global sovereign with full orchestration authority across all pods.", ["GLOBAL_ADMIN", "IAM_ACCESS", "SYSTEM_CONFIG"], true);
      await ensureRole("Admin User", "Top-level administrative authority for a specific Customer organization.", ["TENANT_ADMIN", "USER_INVITE", "ORG_CONFIG"], true);
      await ensureRole("Tenant Admin", "Administrative control over a specific Tenant/Department instance.", ["TENANT_CONFIG", "USER_MANAGEMENT"], true);

      // --- Ensure Internal Identity Provider ---
      const existingProvider = await tx.identityProvider.findFirst({ where: { name: "Platform Internal" } });
      if (!existingProvider) {
        await tx.identityProvider.create({
          data: {
            name: "Platform Internal",
            type: "INTERNAL",
            configJson: "{}",
            syncStatus: "Active"
          }
        });
      }

      // --- Executive Layer ---
      await ensureRole("Executive / CXO", "Strategic visibility and ROI tracking. Portfolio-level analytics and financial metrics.", [{
        menus: ["LIFECYCLE"],
        functions: { "ASSESSMENT": ["View"], "ROI_CALC": ["View"], "PROJECTS": ["View"] },
        tenants: [], folders: []
      }]);
      await ensureRole("Business Unit Head", "Domain owner. Approves automation demand, monitors department KPIs and budgets.", [{
        menus: ["LIFECYCLE", "TENANT_HUB"],
        functions: { "ASSESSMENT": ["View", "Modify"], "ROI_CALC": ["View"], "REVIEW_APPROVAL": ["Execute"], "PROJECTS": ["View"] },
        tenants: [], folders: []
      }]);

      // --- Governance & Strategy ---
      await ensureRole("RPA CoE Lead / Automation Director", "Governance and scaling lead. Defines standards and governs license allocation.", [{
        menus: ["LIFECYCLE", "TENANT_HUB", "ADMIN"],
        functions: { "PROJECTS": ["View", "Modify", "Delete"], "USER_DIRECTORY": ["View", "Modify"], "ACCESS_GROUPS": ["View", "Modify"], "CUSTOM_ROLES": ["View", "Modify"], "FOLDERS": ["View", "Modify"] },
        tenants: [], folders: []
      }]);
      await ensureRole("Solution Architect (RPA + AI)", "End-to-end design across environments. Integration lead for APIs and AI models.", [{
        menus: ["LIFECYCLE", "TENANT_HUB", "STUDIO"],
        functions: { "ASSESSMENT": ["View", "Modify"], "STUDIO_DESIGNER": ["View", "Modify", "Execute"], "AI_BUILDER": ["View", "Modify", "Execute"], "DEPLOYMENT": ["View", "Execute"] },
        tenants: [], folders: []
      }]);
      await ensureRole("Security & Compliance Officer", "Risk and audit lead. Monitors credential usage and ensures regulatory compliance.", [{
        menus: ["ADMIN", "TENANT_HUB"],
        functions: { "LOGS": ["View"], "USER_DIRECTORY": ["View"], "FOLDERS": ["View"], "MONITORING": ["View"] },
        tenants: [], folders: []
      }]);

      // --- Delivery & Build ---
      await ensureRole("Technical Architect", "Platform and infrastructure design. Control Room admin and queue architect.", [{
        menus: ["STUDIO", "TENANT_HUB", "AGENTS"],
        functions: { "STUDIO_DESIGNER": ["View", "Modify", "Execute"], "QUEUES": ["View", "Modify", "Execute"], "SCHEDULES": ["View", "Modify", "Execute"], "AGENT_SETUP": ["View", "Modify", "Execute"] },
        tenants: [], folders: []
      }]);
      await ensureRole("RPA Developer", "Builds automations. Workflow design, exception handling, and API integration.", [{
        menus: ["STUDIO", "TENANT_HUB"],
        functions: { "STUDIO_DESIGNER": ["View", "Create", "Modify", "Execute"], "BOT_LIBRARY": ["View", "Upload"], "PROJECTS": ["View", "Create"], "LOGS": ["View"] },
        tenants: [], folders: []
      }]);
      await ensureRole("AI/ML Engineer", "Builds AI models and services. Manages AI pipelines and inference endpoints.", [{
        menus: ["STUDIO"],
        functions: { "AI_BUILDER": ["View", "Create", "Modify", "Execute"], "OBJECT_FINDER": ["View", "Execute"] },
        tenants: [], folders: []
      }]);
      await ensureRole("QA / Test Engineer", "Validates automations. Executes bots in UAT and manages regression testing.", [{
        menus: ["STUDIO", "TENANT_HUB"],
        functions: { "STUDIO_DESIGNER": ["View", "Execute"], "LOGS": ["View"], "PROJECTS": ["View"] },
        tenants: [], folders: []
      }]);

      // --- Operations ---
      await ensureRole("Bot Controller / Operator", "Run and monitor bots. Manages queues and retry policies.", [{
        menus: ["MONITORING", "TENANT_HUB"],
        functions: { "MONITORING": ["View", "Execute"], "QUEUES": ["View", "Execute"], "SCHEDULES": ["View", "Execute"], "LOGS": ["View"] },
        tenants: [], folders: []
      }]);
      await ensureRole("Support Engineer (L2/L3)", "Troubleshooting and root cause analysis. Incident management lead.", [{
        menus: ["MONITORING", "TENANT_HUB"],
        functions: { "LOGS": ["View", "Execute"], "QUEUES": ["View"], "PROCESSES": ["View"] },
        tenants: [], folders: []
      }]);
      await ensureRole("Infrastructure Admin", "Platform stability lead. Patch management, backups, and resource scaling.", [{
        menus: ["ADMIN", "AGENTS"],
        functions: { "AGENT_SETUP": ["View", "Modify", "Execute"], "FOLDERS": ["View", "Modify"] },
        tenants: [], folders: []
      }]);

      // --- Business Layer ---
      await ensureRole("Business SME", "Process knowledge lead. Defines business rules and validates logic.", [{
        menus: ["LIFECYCLE"],
        functions: { "ASSESSMENT": ["View", "Modify"], "REQUIREMENTS": ["View", "Modify"] },
        tenants: [], folders: []
      }]);
      await ensureRole("Process Owner", "Process lifecycle owner. Approves automation changes and defines SLAs.", [{
        menus: ["LIFECYCLE"],
        functions: { "REVIEW_APPROVAL": ["Execute"], "PROJECTS": ["View"] },
        tenants: [], folders: []
      }]);
      await ensureRole("Business User", "End user / Citizen developer. Runs attended bots and submits ideas.", [{
        menus: ["TENANT_HUB"],
        functions: { "PROJECTS": ["View"], "QUEUES": ["View", "Execute"] },
        tenants: [], folders: []
      }]);

      // 3. Create Initial Admin User (if platformAdmin was just created or if we need to link)
      const pAdmin = platformAdmin || await tx.appRole.findUnique({ where: { name: "Platform Admin" } });
      if (pAdmin) {
        await tx.appUser.upsert({
          where: { email: "ratheesh@zohomail.ca" },
          update: {},
          create: {
            email: "ratheesh@zohomail.ca",
            fullName: "Platform Admin (Ratheesh)",
            status: "Protected",
            roles: { connect: { id: pAdmin.id } }
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
