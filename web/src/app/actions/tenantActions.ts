"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { prisma, baseDb } from "@/lib/prisma";
import { ResourceType } from "@prisma/client";
import { AuditBundleService } from "@/lib/services/AuditBundleService";
import { EmailService } from "@/lib/services/EmailService";
import { syncToLocalFileSystem } from "@/lib/studio/sync";

export async function getCustomers() {
  try {
    console.log("[DB] Fetching all customers from PostgreSQL...");
    const customers = await prisma.customer.findMany();
    console.log(`[DB] Successfully retrieved ${customers.length} customers.`);
    return JSON.parse(JSON.stringify(customers));
  } catch (e: any) {
    console.error("[DB ERROR] getCustomers failed:", e.message);
    console.error("[DB ERROR] Stack trace:", e.stack);
    return [];
  }
}

export async function getPendingRequests() {
  try {
    const customers = await prisma.customer.findMany({
      where: { status: "Pending Approval" },
      include: {
        tenantAdmins: {
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return JSON.parse(
      JSON.stringify(
        customers.map((c) => {
          const admin = c.tenantAdmins[0];
          return {
            ...c,
            firstName: admin?.firstName,
            lastName: admin?.lastName,
            adminEmail: admin?.email,
            jobTitle: admin?.jobTitle,
            department: admin?.department,
            employeeId: admin?.employeeId,
            employmentType: admin?.employmentType,
            workLocation: admin?.workLocation,
            mfaEnabled: admin?.mfaEnabled,
          };
        }),
      ),
    );
  } catch (e) {
    console.error("Failed to fetch pending requests:", e);
    return [];
  }
}

export async function onboardTenantAction(payload: any) {
  try {
    const customer = await prisma.$transaction(async (tx) => {
      // 1. Create the Organization (Customer) Master Record
      const newCustomer = await tx.customer.create({
        data: {
          resource: {
            create: {
              resourceType: ResourceType.CUSTOMER,
              name: payload.companyName,
            },
          },
          companyName: payload.companyName,
          displayName: payload.displayName || payload.companyName,
          slug: payload.slug || null,
          industry: payload.industry,
          location: payload.location,
          status: payload.status || "Pending Approval",
          classification: payload.classification || "Customer",
          priority: payload.priority || "Standard",
          description: payload.description || "",
          createdBy: payload.createdByEmail || "System",
          customerType: payload.customerType || "Enterprise",
          customerTier: payload.customerTier || "Enterprise",

          // Identity & Localization
          currency: payload.currency || "USD",
          timezone: payload.timezone || "UTC",

          // Access & Security Baseline
          authType: payload.authType || "Email + Password",
          allowedDomains: payload.allowedDomains || null,
          mfaEnforced: !!payload.mfaEnforced,

          // Governance & Compliance (Early Control Plane)
          complianceMode: payload.complianceMode || "Standard",
          retentionPolicyDays: payload.retentionPolicyDays || 30,
          dataResidencyRegion: payload.location, // Default to registration region

          // Commercials
          planType: payload.planType || "Free",
          contractStartDate: payload.contractStartDate
            ? new Date(payload.contractStartDate)
            : new Date(),
          billingEntity: payload.billingEntity || payload.companyName,
          billingEmail: payload.billingEmail || null,

          // Capabilities (Feature Toggles)
          aiEnabled: payload.aiEnabled !== undefined ? payload.aiEnabled : true,
          studioAccess:
            payload.studioAccess !== undefined ? payload.studioAccess : true,
          apiAccess: payload.apiAccess !== undefined ? payload.apiAccess : true,
          marketplaceAccess:
            payload.marketplaceAccess !== undefined
              ? payload.marketplaceAccess
              : true,

          // Ops Metadata
          tags: payload.tags || "",
          accountOwner: payload.accountOwner || "Unassigned",
          onboardingSource: payload.onboardingSource || "Direct",
          engagementTier: payload.engagementTier || "Bronze",

          logoUrl: payload.logoUrl || null,
          tenantAdmins: {
            create: payload.tenantAdmins.map((admin: any) => ({
              firstName: admin.firstName,
              lastName: admin.lastName,
              email: admin.email,
              phone: admin.phone || null,
              role: admin.role || "Admin",
              employmentType: admin.employmentType || "Full-time",
              workLocation: admin.workLocation || "Remote",
              mfaEnabled: !!admin.mfaEnabled,
              activationToken: randomUUID(),
              status: "Pending Activation",
            })),
          },
        },
      });

      // 2. Provision High-Availability Workspace Lifecycle
      const customerCode = payload.companyName
        .toUpperCase()
        .replace(/\s+/g, "-")
        .substring(0, 10);
      const aliases = payload.tenantAliases || {};
      const tenantDefaults = [
        {
          name: aliases.DEV || "Development",
          code: `${customerCode}-DEV`,
          type: "DEV",
          isProtected: true,
          isDefault: false,
          description: "Build and integration environment.",
        },
        {
          name: aliases.UAT || "UAT",
          code: `${customerCode}-UAT`,
          type: "UAT",
          isProtected: true,
          isDefault: false,
          description: "User Acceptance Testing.",
        },
        {
          name: aliases.STAGING || "Staging",
          code: `${customerCode}-STG`,
          type: "STAGING",
          isProtected: true,
          isDefault: false,
          description: "Pre-production staging environment.",
        },
        {
          name: aliases.PROD || "Production",
          code: `${customerCode}-PROD`,
          type: "PROD",
          isProtected: true,
          isDefault: true,
          description: "Live execution environment.",
        },
      ];

      for (const t of tenantDefaults) {
        const tenantResource = await tx.resource.create({
          data: {
            resourceType: ResourceType.TENANT,
            name: String(t.name),
            ownerId: newCustomer.id,
          },
        });

        const tenant = await tx.tenant.create({
          data: {
            name: String(t.name),
            code: String(t.code),
            type: String(t.type),
            description: String(t.description),
            isDefault: t.isDefault,
            isProtected: t.isProtected,
            status: "ACTIVE",
            customerId: newCustomer.id,
            resourceId: tenantResource.id,
          },
        });

        // Create Workspace Resource
        const workspaceResource = await tx.resource.create({
          data: {
            resourceType: ResourceType.WORKSPACE,
            name: payload.workspaceName
              ? `${payload.workspaceName} [${t.name}]`
              : `${t.name} Workspace`,
            tenantId: tenant.id,
            ownerId: newCustomer.id,
          },
        });

        const workspace = await tx.workspace.create({
          data: {
            name: payload.workspaceName
              ? `${payload.workspaceName} [${t.name}]`
              : `${t.name} Workspace`,
            customerId: newCustomer.id,
            tenantId: tenant.id,
            slug: payload.workspaceSlug
              ? `${payload.workspaceSlug}-${t.type.toLowerCase()}`
              : `${customerCode.toLowerCase()}-${t.type.toLowerCase()}-root`,
            language: payload.workspaceLanguage || "en",
            region: payload.workspaceRegion || payload.location,
            resourceId: workspaceResource.id,
          },
        });

        // Create Root Folder Resource
        const rootFolderResource = await tx.resource.create({
          data: {
            resourceType: ResourceType.FOLDER,
            name: "Root",
            tenantId: tenant.id,
            ownerId: newCustomer.id,
            metadata: JSON.stringify({ path: "/" }),
          },
        });

        // Use Native Prisma Create for Root Folder (Safe and Schema-Aware)
        const rootFolder = await tx.folder.create({
          data: {
            name: "Root",
            tenantId: tenant.id,
            customerId: newCustomer.id,
            workspaceId: workspace.id,
            resourceId: rootFolderResource.id,
          },
        });

        // 3. Project Bootstrap (Immediate Value Injection)
        if (payload.bootstrapTemplate && payload.bootstrapTemplate !== "None") {
          const projectResource = await tx.resource.create({
            data: {
              resourceType: ResourceType.PROJECT,
              name: String(payload.projectName || "Initial Automation"),
              tenantId: tenant.id,
              ownerId: newCustomer.id,
              metadata: JSON.stringify({
                description: `Automated bootstrap via ${payload.bootstrapTemplate} template.`,
                workspaceId: workspace.id,
                folderId: rootFolder.id,
              }),
            },
          });

          await tx.project.create({
            data: {
              name: String(payload.projectName || "Initial Automation"),
              customerId: newCustomer.id,
              workspaceId: workspace.id,
              tenantId: tenant.id,
              folderId: rootFolder.id,
              resourceId: projectResource.id,
            },
          });
        }

        // Initialize Default Services based on Capabilities
        const defaultServices = [
          { name: "Web Automation", category: "Automation", enabled: true },
          {
            name: "API Automation",
            category: "Automation",
            enabled: payload.apiAccess !== false,
          },
          {
            name: "AI Studio",
            category: "AI",
            enabled: payload.aiEnabled !== false,
          },
        ];

        for (const s of defaultServices) {
          await tx.tenantService.create({
            data: {
              tenantId: tenant.id,
              serviceName: s.name,
              enabled: s.enabled,
              enabledBy: payload.createdByEmail || "System",
            },
          });
        }
      }

      return newCustomer;
    });

    // Record Audit Log
    await createAuditLog(
      payload.createdBy || "Platform Admin",
      "ONBOARDING_INITIATED",
      payload.companyName,
      JSON.stringify({
        location: payload.location,
        adminCount: payload.tenantAdmins.length,
        createdByEmail: payload.createdByEmail,
      }),
      "Info",
      false,
      customer.id,
    );

    // 3. Dispatch Activation Emails with Customer-Specific URLs
    const createdAdmins = await prisma.tenantAdmin.findMany({
      where: { customerId: customer.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        activationToken: true,
      },
    });

    for (const admin of createdAdmins) {
      if (admin.activationToken) {
        await EmailService.sendAdminActivation({
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          organization: payload.companyName,
          activationToken: admin.activationToken,
          customerSlug: payload.slug || null,
          customerId: customer.id,
        });

        console.log(
          `[ONBOARDING] Activation email dispatched → ${admin.email} (Token: ${admin.activationToken})`,
        );
      }
    }

    revalidatePath("/next-gen/control-center/customer");
    return { success: true, customer };
  } catch (e: any) {
    console.error("Onboarding failed:", e);
    try {
      await createAuditLog(
        payload.createdByEmail || "System",
        "ONBOARDING_FAILED",
        payload.companyName || "Unknown Customer",
        JSON.stringify({
          error: e.message || String(e),
          stack: e.stack,
          payload: payload.companyName,
        }),
        "Critical",
        true,
      );
    } catch (auditError) {
      console.error(
        "Failed to write audit log for onboarding failure:",
        auditError,
      );
    }
    return { success: false, error: e.message || String(e) };
  }
}

export async function toggleTenantServiceAction(
  tenantId: string,
  serviceName: string,
  enabled: boolean,
  role: string,
) {
  try {
    // Enforcement: Only Admin User or Platform Admin allowed to toggle
    if (role !== "Platform Admin" && role !== "Admin User") {
      throw new Error("Unauthorized: Admin User privileges required.");
    }

    await prisma.tenantService.upsert({
      where: {
        tenantId_serviceName: { tenantId, serviceName },
      },
      update: { enabled, enabledBy: role, enabledAt: new Date() },
      create: {
        tenantId,
        serviceName,
        enabled,
        enabledBy: role,
      },
    });

    await createAuditLog(
      role,
      "SERVICE_TOGGLED",
      serviceName,
      JSON.stringify({ tenantId, enabled }),
    );
    revalidatePath("/next-gen/tenants/manage");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to toggle service:", e);
    return { success: false, error: e.message };
  }
}

export async function updateTenantConfigAction(
  tenantId: string,
  payload: { key: string; value: any; category: string },
  role: string,
) {
  try {
    await prisma.tenantConfig.upsert({
      where: {
        tenantId_key: { tenantId, key: payload.key },
      },
      update: {
        value: JSON.stringify(payload.value),
        category: payload.category,
      },
      create: {
        tenantId,
        key: payload.key,
        value: JSON.stringify(payload.value),
        category: payload.category,
      },
    });

    await createAuditLog(
      role,
      "TENANT_CONFIG_UPDATED",
      payload.key,
      JSON.stringify({ tenantId }),
    );
    return { success: true };
  } catch (e: any) {
    console.error("Failed to update config:", e);
    return { success: false, error: e.message };
  }
}

export async function updateTenantStatusAction(
  customerId: string,
  status: string,
  role: string,
) {
  try {
    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: { status },
    });

    await createAuditLog(
      role,
      `TASK_${status.toUpperCase()}`,
      customer.companyName,
      JSON.stringify({ customerId }),
      "Info",
      false,
      customerId,
    );

    revalidatePath("/next-gen/task-center");
    return { success: true };
  } catch (e) {
    console.error("Status update failed:", e);
    return { success: false };
  }
}

import { unstable_noStore as noStore } from "next/cache";

export async function getPendingCustomersAction() {
  noStore();
  try {
    return await prisma.customer.findMany({
      where: { status: "Pending Approval" },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("Failed to fetch pending customers:", e);
    return [];
  }
}

export async function approveCustomerActivationAction(
  customerId: string,
  approverEmail: string,
  role: string,
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new Error("Customer not found");
    if (customer.status !== "Pending Approval")
      throw new Error("Customer is not in a pending state.");

    // Dual Custody Check: Cannot approve your own request
    const creator = customer.createdBy?.toLowerCase() || "";
    const approver = approverEmail?.toLowerCase() || "";
    const approverName = role?.toLowerCase() || "";
    if (creator === approver || creator === approverName) {
      throw new Error(
        `Security Violation: Dual-custody required. Creator (${customer.createdBy}) cannot be the Approver (${approverEmail}).`,
      );
    }

    await prisma.customer.update({
      where: { id: customerId },
      data: { status: "Active" },
    });

    await createAuditLog(
      role,
      "CUSTOMER_ACTIVATED",
      customer.companyName,
      JSON.stringify({ customerId, approvedBy: approverEmail }),
      "High",
      true, // Mark for Chronicle
      customerId,
    );

    revalidatePath("/next-gen/control-center/customer");
    revalidatePath("/next-gen/control-center/approvals");
    return { success: true };
  } catch (e: any) {
    console.error("Activation failed:", e);
    return { success: false, error: e.message };
  }
}

export async function offboardCustomerAction(
  customerId: string,
  mode: "SOFT" | "HARD",
  role: string,
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: { tenants: true },
    });

    if (!customer) throw new Error("Customer not found");

    if (mode === "SOFT") {
      // SOFT OFFBOARDING: Suspend access
      await prisma.$transaction([
        prisma.customer.update({
          where: { id: customerId },
          data: { status: "Suspended", offboardingMode: "SOFT" },
        }),
        prisma.tenant.updateMany({
          where: { customerId },
          data: { status: "DISABLED" },
        }),
        prisma.tenantService.updateMany({
          where: {
            tenantId: { in: (customer.tenants || []).map((t) => t.id) },
          },
          data: { enabled: false },
        }),
      ]);
    } else {
      // 1. Calculate Retention Window based on Tiered Policy
      const RETENTION_POLICY: Record<string, number> = {
        PROD: 14,
        UAT: 7,
        DEV: 5,
        SANDBOX: 3,
      };

      const highestTier = customer.tenants.reduce((highest, t) => {
        const tiers = ["SANDBOX", "DEV", "UAT", "PROD"];
        return tiers.indexOf(t.type) > tiers.indexOf(highest)
          ? t.type
          : highest;
      }, "SANDBOX");

      const retentionDays = RETENTION_POLICY[highestTier] || 7;
      const expiryDate = new Date(
        Date.now() + retentionDays * 24 * 60 * 60 * 1000,
      );

      // 2. Freeze tenant (Suspend + Record status)
      await prisma.$transaction([
        prisma.customer.update({
          where: { id: customerId },
          data: {
            status: "Suspended",
            offboardingMode: "HARD",
            offboardingStatus: "OFFBOARDING_IN_PROGRESS",
            offboardingInitiatedAt: new Date(),
            offboardingExpiresAt: expiryDate,
          },
        }),
        prisma.tenant.updateMany({
          where: { customerId },
          data: { status: "DISABLED" },
        }),
        prisma.tenantService.updateMany({
          where: {
            tenantId: { in: (customer.tenants || []).map((t) => t.id) },
          },
          data: { enabled: false },
        }),
      ]);

      // 3. Propagate Materialized Lock State
      await syncGovernanceLock(customerId, true);

      // 4. Queue audit export job (Phase 2 simulated)
      const bundle =
        await AuditBundleService.generateComplianceBundle(customerId);

      // 3. Status: COMPLIANCE_PACKAGE_READY
      await prisma.customer.update({
        where: { id: customerId },
        data: {
          offboardingStatus: "COMPLIANCE_PACKAGE_READY",
          compliancePackagePath: bundle.filename,
          compliancePackageHash: bundle.bundleHash,
        },
      });

      console.log(
        `[OFFBOARD] Audit Bundle ready: ${bundle.filename} (Hash: ${bundle.bundleHash})`,
      );
    }

    await createAuditLog(
      role,
      `OFFBOARDING_${mode}`,
      customer.companyName,
      JSON.stringify({ customerId, mode }),
    );

    revalidatePath("/next-gen/control-center/customer");
    return { success: true };
  } catch (e: any) {
    console.error(`Offboarding (${mode}) failed:`, e);
    return { success: false, error: e.message };
  }
}

export async function createAuditLog(
  role: string,
  action: string,
  target: string,
  metadata: string,
  severity: string = "Info",
  isChronicle: boolean = false,
  customerId?: string | null,
) {
  try {
    await prisma.auditLog.create({
      data: {
        actor: role,
        action,
        target,
        details: metadata,
        severity,
        isChronicle,
        customerId: customerId || null,
      },
    });
    return { success: true };
  } catch (e: any) {
    console.error("Audit log creation failed:", e);
    return { success: false, error: e.message };
  }
}

export async function getAuditLogsForTarget(targetName: string) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: { target: targetName },
      orderBy: { timestamp: "desc" },
    });
    return JSON.parse(JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to fetch audit logs:", e);
    return [];
  }
}

export async function getGlobalAuditLogs(
  customerId?: string | null,
  module?: string,
  targetId?: string | null,
) {
  try {
    const where: any = {};

    // 1. Role-based Access Control: Filter by Customer if scoped
    if (customerId) {
      where.customerId = customerId;
    }

    // 2. Hierarchical Filtering for Folders
    if (module === "Folder" && targetId) {
      // Find all subfolders to include their logs as well
      const descendants = await prisma.folder.findMany({
        where: {
          OR: [
            { id: targetId },
            { path: { contains: targetId } }, // Assuming path contains ancestor IDs
          ],
        },
        select: { id: true },
      });
      const folderIds = descendants.map((d) => d.id);

      where.OR = [
        { details: { contains: targetId } },
        ...folderIds.map((id) => ({ details: { contains: id } })),
      ];
    }

    // 2. Module-specific Filtering
    if (module === "Customer") {
      where.action = {
        in: [
          "ONBOARDING_INITIATED",
          "ONBOARDING_FAILED",
          "CUSTOMER_ACTIVATED",
          "OFFBOARDING_INITIATED",
          "HARD_OFFBOARDING_COMPLETED",
          "OFFBOARDING_CANCELLED",
          "TASK_PENDING",
          "TASK_APPROVED",
          "TASK_REJECTED",
        ],
      };
    } else if (module === "Folder") {
      where.action = {
        in: [
          "SCOPE_CREATED",
          "SCOPE_DELETED",
          "FOLDER_LOCKED",
          "FOLDER_UNLOCKED",
        ],
      };
    } else if (module === "ReferenceData") {
      where.action = {
        startsWith: "ADD_DICTIONARY_",
        OR: [
          { action: { startsWith: "UPDATE_DICTIONARY_" } },
          { action: { startsWith: "PURGE_DICTIONARY_" } },
          { action: "PURGE_DISABLED_LOOKUPS" },
        ],
      };
      // Note: Prisma startsWith with OR requires slightly different structure if using many.
      // Simplified for now:
      where.OR = [
        { action: { startsWith: "ADD_DICTIONARY_" } },
        { action: { startsWith: "UPDATE_DICTIONARY_" } },
        { action: { startsWith: "PURGE_DICTIONARY_" } },
        { action: "PURGE_DISABLED_LOOKUPS" },
      ];
      delete where.action;
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: "desc" },
      take: 100,
    });
    return JSON.parse(JSON.stringify(logs));
  } catch (e) {
    console.error("Failed to fetch global audit logs:", e);
    return [];
  }
}

export async function getCustomerFullDetail(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        tenantAdmins: true,
        tenants: {
          include: {
            services: true,
          },
        },
      },
    });

    return JSON.parse(JSON.stringify(customer));
  } catch (e) {
    console.error("Failed to fetch customer detail:", e);
    return null;
  }
}

export async function getTenantsForCustomer(customerId: string) {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { customerId },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        type: true,
        status: true,
        isDefault: true,
        isProtected: true,
        isGovernanceLocked: true,
        customerId: true,
        resourceId: true,
        createdAt: true,
        updatedAt: true,
        services: {
          select: {
            id: true,
            tenantId: true,
            serviceName: true,
            enabled: true,
            enabledBy: true,
            enabledAt: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return JSON.parse(JSON.stringify(tenants));
  } catch (e) {
    console.error("Failed to fetch tenants:", e);
    return [];
  }
}

export async function getTenantWithServices(tenantId: string) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        services: true,
        config: true,
      },
    });
    return JSON.parse(JSON.stringify(tenant));
  } catch (e) {
    console.error("Failed to fetch tenant detail:", e);
    return null;
  }
}

export async function updateCustomerAction(payload: any) {
  try {
    // 1. Update Customer and Sync Tenant Admins
    // Note: Prisma's 'update' with nested 'deleteMany' and 'create' ensures transactional consistency
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: payload.customerId },
        data: {
          companyName: payload.companyName,
          industry: payload.industry,
          location: payload.location,
          classification: payload.classification,
          priority: payload.priority,
          description: payload.description,
          customerType: payload.customerType,
          customerTier: payload.customerTier,
          logoUrl: payload.logoUrl,
        },
      }),
      prisma.tenantAdmin.deleteMany({
        where: { customerId: payload.customerId },
      }),
      prisma.tenantAdmin.createMany({
        data: payload.tenantAdmins.map((admin: any) => ({
          firstName: admin.firstName,
          lastName: admin.lastName,
          dob: admin.dob || null,
          gender: admin.gender || null,
          email: admin.email,
          employeeId: admin.employeeId || null,
          jobTitle: admin.jobTitle || null,
          department: admin.department || null,
          manager: admin.manager || null,
          employmentType: admin.employmentType,
          workLocation: admin.workLocation,
          startDate: admin.startDate || null,
          endDate: admin.endDate || null,
          mfaEnabled: !!admin.mfaEnabled,
          customerId: payload.customerId,
        })),
      }),
    ]);

    await createAuditLog(
      payload.updatedBy || "Platform Admin",
      "UPDATE_CUSTOMER_DATA",
      payload.companyName,
      JSON.stringify({ customerId: payload.customerId }),
    );

    revalidatePath("/next-gen/control-center/customer");
    revalidatePath("/next-gen/task-center");
    return { success: true };
  } catch (e) {
    console.error("Failed to update customer:", e);
    return { success: false, error: "Database update failure" };
  }
}

// ── Customer Locale & Defaults ─────────────────────────────────────────────────
// These 5 fields override the platform-level defaults for this specific customer only.

export async function getCustomerLocaleSettings(customerId: string) {
  try {
    // Use raw SQL — new fields not yet in Prisma generated client
    const rows = await prisma.$queryRaw<any[]>`
      SELECT id, language, timezone, currency, support_email AS "supportEmail"
      FROM platform.customers WHERE id = ${customerId}::uuid LIMIT 1
    `;
    const c = rows[0] || null;
    const sessionPolicy = await prisma.sessionPolicy.findUnique({
      where: { customerId },
      select: { sessionTimeoutMinutes: true },
    });
    return JSON.parse(JSON.stringify({
      ...c,
      sessionTimeoutMinutes: sessionPolicy?.sessionTimeoutMinutes ?? null,
    }));
  } catch (e) {
    console.error("getCustomerLocaleSettings:", e);
    return null;
  }
}

export async function updateCustomerLocaleSettings(payload: {
  customerId: string;
  language: string;
  timezone: string;
  currency: string;
  supportEmail: string;
  sessionTimeoutMinutes: number;
}) {
  try {
    // Update core locale fields on the customer
    await prisma.$queryRawUnsafe(
      `UPDATE platform.customers
       SET language = $1, timezone = $2, currency = $3, support_email = $4, updated_at = now()
       WHERE id = $5::uuid`,
      payload.language,
      payload.timezone,
      payload.currency,
      payload.supportEmail || null,
      payload.customerId
    );

    // Upsert the session policy for this customer
    await prisma.sessionPolicy.upsert({
      where: { customerId: payload.customerId },
      create: {
        customerId: payload.customerId,
        sessionTimeoutMinutes: payload.sessionTimeoutMinutes,
      },
      update: {
        sessionTimeoutMinutes: payload.sessionTimeoutMinutes,
      },
    });

    revalidatePath("/next-gen/admin/organization/settings");
    revalidatePath("/next-gen/admin/organization/general");
    return { success: true };
  } catch (e: any) {
    console.error("updateCustomerLocaleSettings:", e);
    return { success: false, error: e.message };
  }
}

// --- Next Gen Studio Actions ---

export async function createStudioProject(payload: {
  name: string;
  description?: string;
  folderId: string;
  customerId: string;
  tenantId: string;
  workspaceId: string;
  nodes: any[];
  edges: any[];
  variables?: any[];
  arguments?: any[];
  projectType?: string;
}) {
    const { name, folderId, customerId, tenantId, nodes, edges, projectType } = payload;
    let { workspaceId } = payload;

    // Auto-discover workspace if not provided or empty
    if (!workspaceId || workspaceId.trim() === "") {
      const workspace = await prisma.workspace.findFirst({
        where: { customerId, tenantId },
        select: { id: true },
      });
      if (workspace) {
        workspaceId = workspace.id;
      } else {
        // Create a default workspace
        const newWs = await prisma.workspace.create({
          data: { name: `${name} Workspace`, customerId, tenantId },
        });
        workspaceId = newWs.id;
      }
    }

    // Sanitize folderId
    const safeFolderId = folderId && folderId.trim() !== "" ? folderId : undefined;

    // --- UNIQUE NAME CHECK ---
    const existingProject = await prisma.project.findFirst({
      where: {
        folderId: safeFolderId || null,
        name: { equals: name, mode: "insensitive" },
      },
    });

    if (existingProject) {
      return {
        success: false,
        error: `A project named "${name}" already exists in this folder. Please choose a unique name.`,
      };
    }

    if (!customerId || customerId === "") {
      return { success: false, error: "Active customer context missing. Please select a customer." };
    }

    const projectId = randomUUID();
    const workflowId = randomUUID();

    try {
      await prisma.$transaction(async (tx) => {
        // 1. Create Project Resource
        const projectResource = await tx.resource.create({
          data: {
            resourceType: ResourceType.PROJECT,
            name: name,
            tenantId: tenantId,
            ownerId: customerId,
            metadata: JSON.stringify({ folderId: safeFolderId, workspaceId }),
          },
        });

        // 2. Create the Project
        await tx.project.create({
          data: {
            id: projectId,
            name,
            description: payload.description,
            folderId: safeFolderId,
            customerId,
            tenantId,
            workspaceId,
            resourceId: projectResource.id,
            metadata: JSON.stringify({ projectType: projectType || "WORKFLOW" }),
          },
        });

        const defaultWorkflowName = projectType === "APP" ? "App Workspace.xaml" : "Main Process";

        // 3. Create StudioWorkflow Resource
        const workflowResource = await tx.resource.create({
          data: {
            resourceType: ResourceType.STUDIO_WORKFLOW,
            name: defaultWorkflowName,
            tenantId: tenantId,
            ownerId: customerId,
            metadata: JSON.stringify({ projectId }),
          },
        });

        // 4. Create the StudioWorkflow linked to the project
        await tx.studioWorkflow.create({
          data: {
            id: workflowId,
            name: defaultWorkflowName,
            projectId,
            folderId: safeFolderId,
            type: "WORKFLOW",
            isMain: true,
            resourceId: workflowResource.id,
            studioNodes: {
              create: (nodes.length > 0
                ? nodes
                : [
                    {
                      id: randomUUID(),
                      nodeType: "event",
                      name: "Start",
                      configJson: {
                        label: "Start",
                        type: "event",
                        subType: "start",
                        icon: "CirclePlay",
                        theme: {
                          bgColor: "#10b98120",
                          borderColor: "#10b981",
                          iconColor: "#633F2E",
                        },
                      },
                      positionX: 400,
                      positionY: 200,
                    },
                  ]
              ).map((node: any) => ({
                id: (node.id && node.id.includes("-")) ? node.id : randomUUID(),
                nodeType: String(node.data?.type || node.nodeType || "action").toLowerCase(),
                name: String(node.data?.label || node.name || "Action"),
                configJson: node.data || node.configJson || {},
                positionX: node.position?.x || node.positionX || 0,
                positionY: node.position?.y || node.positionY || 0,
              })),
            },
            connections: {
              create: edges.map((edge: any) => ({
                id: (edge.id && edge.id.includes("-")) ? edge.id : randomUUID(),
                fromNodeId: (edge.source && edge.source.includes("-")) ? edge.source : randomUUID(),
                toNodeId: (edge.target && edge.target.includes("-")) ? edge.target : randomUUID(),
                conditionType: edge.data?.condition || "DEFAULT",
              })),
            },
            variables: payload.variables
              ? {
                  create: payload.variables.map((v: any) => ({
                    projectId,
                    name: v.name,
                    dataType: v.type,
                    defaultValue: v.value,
                    scope: v.scope,
                  })),
                }
              : undefined,
            arguments: payload.arguments
              ? {
                  create: payload.arguments.map((a: any) => ({
                    projectId,
                    name: a.name,
                    direction: a.direction,
                    dataType: a.type,
                    defaultValue: a.defaultValue,
                  })),
                }
              : undefined,
          },
        });

        // 5. Create Default Input/Output folders in the database
        await tx.studioWorkflow.createMany({
          data: [
            {
              id: randomUUID(),
              name: "Input",
              projectId,
              type: "FOLDER",
              status: "ACTIVE"
            },
            {
              id: randomUUID(),
              name: "Output",
              projectId,
              type: "FOLDER",
              status: "ACTIVE"
            }
          ]
        } as any);
      }, {
        maxWait: 5000,
        timeout: 10000,
      });

      // 5. Sync to local file system
      try {
        await syncToLocalFileSystem(name, payload);
      } catch (syncErr) {
        console.error("[TenantAction] Local sync failed:", syncErr);
      }

      return {
        success: true,
        projectId,
        workflowId,
      };
    } catch (e: any) {
      console.error("Failed to create studio project:", e);
      return { success: false, error: e.message || "Internal Database Error" };
    }
}

export async function saveStudioWorkflow(payload: any) {
  try {
    const {
      workflowId,
      name,
      nodes,
      edges,
      projectId,
      variables,
      arguments: args,
      flowJson,
    } = payload;

    // We MUST have a project context
    if (!projectId) {
      return {
        success: false,
        error: "Project ID is required. Please create a project first.",
      };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Find or verify the workflow
      let workflow = workflowId
        ? await tx.studioWorkflow.findUnique({ where: { id: workflowId } })
        : await tx.studioWorkflow.findFirst({ where: { projectId } });

      if (!workflow) {
        // Provision Platform Resource Entry for new Workflow
        const workflowResource = await tx.resource.create({
          data: {
            resourceType: ResourceType.STUDIO_WORKFLOW,
            name: name || "Main Process",
            tenantId: payload.tenantId || "", // We should ideally get this from the project
            ownerId: payload.customerId || "",
            metadata: JSON.stringify({ projectId }),
          },
        });

        // Create it if it doesn't exist
        workflow = await tx.studioWorkflow.create({
          data: {
            name: name || "Main Process",
            projectId,
            resourceId: workflowResource.id,
          },
        });
      }

      const activeWorkflowId = workflow.id;

      // 2. Generate new version
      const project = await tx.project.findUnique({
        where: { id: projectId },
        select: { version: true },
      });
      const currentVersion = project?.version || "1.0.0";
      const versionParts = currentVersion.split(".").map(Number);
      versionParts[2] = (versionParts[2] || 0) + 1;
      const newVersion = versionParts.join(".");

      await tx.project.update({
        where: { id: projectId },
        data: { version: newVersion },
      });

      // 3. Surgical Sync for Nodes
      if (nodes && nodes.length > 0) {
        const newNodeIds = nodes.map((n: any) => n.id);
        
        await tx.studioNode.deleteMany({
          where: { 
            workflowId: activeWorkflowId,
            id: { notIn: newNodeIds }
          }
        });

        for (const node of nodes) {
          await tx.studioNode.upsert({
            where: { id: node.id },
            update: {
              nodeType: String(node.data?.type || node.type || "action"),
              positionX: node.position.x,
              positionY: node.position.y,
              configJson: JSON.stringify(node.data || {}),
            },
            create: {
              id: node.id,
              workflowId: activeWorkflowId,
              nodeType: String(node.data?.type || node.type || "action"),
              name: String(node.data?.label || "Action"),
              positionX: node.position.x,
              positionY: node.position.y,
              configJson: JSON.stringify(node.data || {}),
            }
          });
        }
      } else {
        await tx.studioNode.deleteMany({ where: { workflowId: activeWorkflowId } });
      }

      // 4. Surgical Sync for Connections
      if (edges && edges.length > 0) {
        const newEdgeIds = edges.map((e: any) => e.id);
        
        await tx.studioConnection.deleteMany({
          where: {
            workflowId: activeWorkflowId,
            id: { notIn: newEdgeIds }
          }
        });

        for (const edge of edges) {
          await tx.studioConnection.upsert({
            where: { id: edge.id },
            update: {
              fromNodeId: edge.source,
              toNodeId: edge.target,
              conditionType: edge.data?.condition || "DEFAULT",
            },
            create: {
              id: edge.id,
              workflowId: activeWorkflowId,
              fromNodeId: edge.source,
              toNodeId: edge.target,
              conditionType: edge.data?.condition || "DEFAULT",
            }
          });
        }
      } else {
        await tx.studioConnection.deleteMany({ where: { workflowId: activeWorkflowId } });
      }

      // 5. Update workflow metadata
      const updatedWorkflow = await tx.studioWorkflow.update({
        where: { id: activeWorkflowId },
        data: {
          name: name || workflow.name,
          version: newVersion,
          flowJson: flowJson || JSON.stringify({
            nodes,
            edges,
            variables,
            arguments: args,
          }),
        },
      });

      // 6. Project History Snapshot
      await (tx as any).projectVersion.create({
        data: {
          projectId,
          versionNumber: newVersion,
          config: flowJson || JSON.stringify({ nodes, edges, variables, arguments: args }),
          isActive: true,
        },
      });

      return {
        success: true,
        workflowId: updatedWorkflow.id,
        version: newVersion,
      };
    });

    // 7. Sync to local file system (NextGen folder)
    try {
      const projectData = await prisma.project.findUnique({ 
        where: { id: projectId }, 
        select: { name: true } 
      });
      if (projectData) {
        await syncToLocalFileSystem(projectData.name, payload);
      }
    } catch (syncErr) {
      console.error("[TenantAction] Local sync failed:", syncErr);
    }

    revalidatePath("/next-gen/studio");
    return result;
  } catch (e: any) {
    console.error("Failed to save studio workflow:", e);
    return { success: false, error: e.message };
  }
}

export async function getAppProjectAction(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        studioWorkflows: {
          where: { isMain: true },
          take: 1
        }
      }
    });
    
    if (!project) {
      return { success: false, error: "Project not found" };
    }
    
    const workflow = project.studioWorkflows[0] || null;
    
    return { 
      success: true, 
      project: JSON.parse(JSON.stringify(project)), 
      workflow: workflow ? JSON.parse(JSON.stringify(workflow)) : null 
    };
  } catch (e: any) {
    console.error("Failed to fetch app project:", e);
    return { success: false, error: e.message };
  }
}

export async function getStudioWorkflow(workflowId: string) {
  try {
    const workflow = await prisma.studioWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        studioNodes: true,
        connections: true,
        project: true,
        variables: true,
        arguments: true,
      },
    });

    if (!workflow) return null;

    let flowData: any = {};
    try {
      if (workflow.flowJson) {
        flowData = typeof workflow.flowJson === 'string' ? JSON.parse(workflow.flowJson) : workflow.flowJson;
      }
    } catch (e) {
      console.error("Failed to parse flowJson for workflow:", workflow.id, e);
    }


    // Map back to React Flow format
    const nodes = workflow.studioNodes.map((n) => {
      let nodeData = {};
      try {
        nodeData =
          typeof n.configJson === "string"
            ? JSON.parse(n.configJson)
            : n.configJson;
      } catch (e) {
        console.error("Failed to parse configJson for node:", n.id, e);
      }

      return {
        id: n.id,
        type: n.nodeType?.toLowerCase().includes("gateway")
          ? "gatewayNode"
          : n.nodeType?.toLowerCase().includes("event")
            ? "eventNode"
            : "taskNode",

        position: { x: n.positionX, y: n.positionY },
        data: {
          ...nodeData,
          type: n.nodeType || (nodeData as any).type || "action",
          dragType:
            (nodeData as any).dragType ||
            n.nodeType ||
            (nodeData as any).type ||
            "action",
        },
      };
    });

    const edges = workflow.connections.map((c) => {
      const savedEdge = flowData.edges?.find((e: any) => e.id === c.id);
      return {
        id: c.id,
        source: c.fromNodeId,
        target: c.toNodeId,
        type: "studioEdge",
        animated: true,
        data: {
          condition: c.conditionType,
          edgeType: savedEdge?.data?.edgeType || "smoothstep"
        },
      };
    });


    return {
      id: workflow.id,
      name: workflow.name,
      activeEdgeType: flowData.activeEdgeType || "smoothstep",

      projectName: (workflow as any).project?.name,
      projectId: workflow.projectId,
      projectType: (workflow as any).project?.metadata ? JSON.parse((workflow as any).project.metadata).projectType : null,
      folderId: (workflow as any).project?.folderId,
      nodes,
      edges,
      variables:
        (workflow as any).variables?.map((v: any) => ({
          name: v.name,
          type: v.dataType,
          scope: v.scope,
          value: v.defaultValue,
        })) || [],
      arguments:
        (workflow as any).arguments?.map((a: any) => ({
          name: a.name,
          direction: a.direction,
          type: a.dataType,
          defaultValue: a.defaultValue,
        })) || [],
    };
  } catch (e) {
    console.error("Failed to fetch studio workflow:", e);
    return null;
  }
}

export async function getStudioFolders(customerId: string, tenantId?: string) {
  // Guard: Prisma WASM panics bypass JS try/catch — never let invalid input reach the query.
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!customerId || !uuidRe.test(customerId)) return [];

  try {
    const where: any = { customerId, isArchived: false };
    if (tenantId && uuidRe.test(tenantId)) {
      where.tenantId = tenantId;
    }

    // 1. Fetch flat list — use explicit select to avoid the nullable Int `level`
    //    field which causes Prisma WASM to throw "invalid type: unit value, expected usize"
    //    on rows that have level = NULL from before the column was added.
    const flatFolders = await prisma.folder.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        parentId: true,
        workspaceId: true,
        customerId: true,
        tenantId: true,
        path: true,
        isArchived: true,
        isGovernanceLocked: true,
        createdAt: true,
        updatedAt: true,
        // NOTE: `level` intentionally omitted — it can be NULL in older rows
        // (Prisma Int but DB column nullable) and WASM deserializer crashes on null Int.
        // We recompute depth from the tree structure below.
        workspace: {
          select: { id: true, name: true },
        },
        projects: {
          select: {
            id: true,
            name: true,
            version: true,
            isGovernanceLocked: true,
            createdAt: true,
            updatedAt: true,
            studioWorkflows: {
              select: { id: true, status: true, name: true, version: true },
            },
            variables: { select: { id: true, name: true, dataType: true } },
            arguments: {
              select: { id: true, name: true, direction: true, dataType: true },
            },
            assets: { select: { id: true, name: true, type: true } },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // 2. Perform safe, blazing-fast, O(N) in-memory tree reconstruction
    const folderMap = new Map<string, any>();

    // Initialize the mapping index (no `level` from DB — we derive it)
    flatFolders.forEach((f) => {
      folderMap.set(f.id, {
        ...JSON.parse(JSON.stringify(f)),
        level: 0,       // will be set correctly in the depth pass below
        subfolders: [],
      });
    });

    const topLevel: any[] = [];

    // Construct hierarchy links in linear time
    flatFolders.forEach((f) => {
      const folderObj = folderMap.get(f.id);
      if (f.parentId) {
        const parentObj = folderMap.get(f.parentId);
        if (parentObj) {
          folderObj.level = (parentObj.level ?? 0) + 1;
          parentObj.subfolders.push(folderObj);
        } else {
          topLevel.push(folderObj);
        }
      } else {
        topLevel.push(folderObj);
      }
    });

    // Return the perfectly reconstructed tree structure
    return topLevel;
  } catch (e: any) {
    console.error("Failed to fetch studio folders:", e);
    return [];
  }
}

export async function executeFinalDecommissionAction(
  customerId: string,
  role: string,
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) throw new Error("Customer not found");
    if (customer.offboardingStatus !== "COMPLIANCE_PACKAGE_READY") {
      throw new Error(
        "Safety violation: Compliance package must be verified before final deletion.",
      );
    }

    // Phase 4: Final Deletion
    await prisma.customer.delete({
      where: { id: customerId },
    });

    await createAuditLog(
      role,
      "HARD_OFFBOARDING_COMPLETED",
      customer.companyName,
      JSON.stringify({ customerId }),
    );

    revalidatePath("/next-gen/control-center/customer");
    return { success: true };
  } catch (e: any) {
    console.error("Final decommission failed:", e);
    return { success: false, error: e.message };
  }
}

export async function cancelHardOffboardingAction(
  customerId: string,
  role: string,
) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) throw new Error("Customer not found.");

    // 1. Restore isGovernanceLocked State
    await syncGovernanceLock(customerId, false);

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        status: "Active",
        offboardingStatus: null,
        offboardingMode: null,
        compliancePackagePath: null,
        compliancePackageHash: null,
        offboardingInitiatedAt: null,
        offboardingExpiresAt: null,
      },
    });

    await createAuditLog(
      role,
      "OFFBOARDING_CANCELLED",
      customer.companyName,
      JSON.stringify({ customerId }),
    );

    revalidatePath("/next-gen/control-center/customer");
    return { success: true };
  } catch (e: any) {
    console.error("Cancellation failed:", e);
    return { success: false, error: e.message };
  }
}

export async function processOffboardingExpiryAction() {
  try {
    const now = new Date();

    // Find all COMPLIANCE_PACKAGE_READY customers that have expired
    const expiredCustomers = await prisma.customer.findMany({
      where: {
        offboardingStatus: "COMPLIANCE_PACKAGE_READY",
        offboardingExpiresAt: { lt: now },
      },
      include: { tenants: true },
    });

    if (expiredCustomers.length === 0) return { success: true, count: 0 };

    for (const customer of expiredCustomers) {
      // 1. Restore isGovernanceLocked State
      await syncGovernanceLock(customer.id, false);

      await prisma.$transaction([
        // 1. Unfreeze Customer
        prisma.customer.update({
          where: { id: customer.id },
          data: {
            status: "Active",
            offboardingStatus: null,
            offboardingMode: null,
            compliancePackagePath: null,
            compliancePackageHash: null,
            offboardingInitiatedAt: null,
            offboardingExpiresAt: null,
          },
        }),
        // 2. Unfreeze Tenants
        prisma.tenant.updateMany({
          where: { customerId: customer.id },
          data: { status: "ACTIVE" },
        }),
      ]);

      await createAuditLog(
        "System",
        "OFFBOARDING_CANCELLED",
        customer.companyName,
        JSON.stringify({
          reason: "USER_INACTION_TIMEOUT",
          expiryDate: customer.offboardingExpiresAt,
        }),
      );

      console.log(
        `[GOVERNANCE] Auto-cancelled expired offboarding for ${customer.companyName}`,
      );
    }

    revalidatePath("/next-gen/customers");
    return { success: true, count: expiredCustomers.length };
  } catch (e: any) {
    console.error("Housekeeping failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * syncGovernanceLock - Materialized State Propagation
 * Efficiently syncs the isGovernanceLocked flag across all child resources.
 */
export async function syncGovernanceLock(
  customerId: string,
  isLocked: boolean,
) {
  try {
    // Perform O(1) bunch updates for all resource models
    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { isGovernanceLocked: isLocked },
      }),
      prisma.tenant.updateMany({
        where: { customerId },
        data: { isGovernanceLocked: isLocked },
      }),
      prisma.appUser.updateMany({
        where: { customerId },
        data: { isGovernanceLocked: isLocked },
      }),
      prisma.workspace.updateMany({
        where: { customerId },
        data: { isGovernanceLocked: isLocked },
      }),
      prisma.folder.updateMany({
        where: { customerId },
        data: { isGovernanceLocked: isLocked },
      }),
      prisma.project.updateMany({
        where: { customerId },
        data: { isGovernanceLocked: isLocked },
      }),
      prisma.automationWorkflow.updateMany({
        where: { customerId },
        data: { isGovernanceLocked: isLocked },
      }),
      prisma.studioWorkflow.updateMany({
        where: { project: { customerId } },
        data: { isGovernanceLocked: isLocked },
      }),
      prisma.studioJob.updateMany({
        where: { tenant: { customerId } },
        data: { isGovernanceLocked: isLocked },
      }),
      prisma.botHost.updateMany({
        where: { tenant: { customerId } },
        data: { isGovernanceLocked: isLocked },
      }),
    ]);

    console.log(
      `[GOVERNANCE] Propagated isGovernanceLocked=${isLocked} across hierarchy for customerId=${customerId}`,
    );
    return { success: true };
  } catch (e: any) {
    console.error("Governance propagation failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * monitorOffboardingThresholdsAction - 24h / 6h / 1h Compliance Monitoring
 */
export async function monitorOffboardingThresholdsAction() {
  try {
    const now = new Date();
    const customers = await prisma.customer.findMany({
      where: { offboardingStatus: "COMPLIANCE_PACKAGE_READY" },
    });

    for (const customer of customers) {
      if (!customer.offboardingExpiresAt) continue;

      const remainingMs =
        customer.offboardingExpiresAt.getTime() - now.getTime();
      const remainingHrs = remainingMs / (1000 * 60 * 60);

      let threshold: "1h" | "6h" | "24h" | null = null;
      if (remainingHrs <= 1 && remainingHrs > 0) threshold = "1h";
      else if (remainingHrs <= 6 && remainingHrs > 5.9)
        threshold = "6h"; // Narrow window for simulation
      else if (remainingHrs <= 24 && remainingHrs > 23.9) threshold = "24h";

      if (threshold) {
        // 1. FORENSIC AUDIT LOG (Internal Compliance)
        await createAuditLog(
          "System",
          "OFFBOARDING_EXPIRY_THRESHOLD_REACHED",
          customer.companyName,
          JSON.stringify({
            threshold,
            expiresAt: customer.offboardingExpiresAt,
            customerId: customer.id,
            status: customer.offboardingStatus,
          }),
          "Info",
          false,
        );

        // 2. CHRONICLE TIMELINE EVENT (UX Awareness & Escalation)
        const severityMap: Record<string, string> = {
          "24h": "Warning",
          "6h": "High",
          "1h": "Critical",
        };

        await createAuditLog(
          "System",
          `COMPLIANCE_ESCALATION_${threshold.toUpperCase()}`,
          customer.companyName,
          `Customer ${customer.companyName} data deletion in ${threshold}. Final verification pending.`,
          severityMap[threshold] || "Info",
          true, // Mark as Chronicle event for the UI Timeline
        );

        console.log(
          `[GOVERNANCE] Dual-layer escalation events emitted for ${customer.companyName} (${threshold})`,
        );
      }
    }

    return { success: true };
  } catch (e: any) {
    console.error("Threshold monitoring failed:", e);
    return { success: false, error: e.message };
  }
}
export async function uploadCustomerLogAction(
  customerId: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  actor: string,
) {
  try {
    const logFile = await prisma.customerLogFile.create({
      data: {
        customerId,
        fileName,
        fileType,
        fileSize,
        uploadedBy: actor,
        blobUrl: `/uploads/${customerId}/${fileName}`, // Simulated path
      },
    });

    await createAuditLog(
      actor,
      "LOG_UPLOADED",
      customerId,
      `Uploaded artifact: ${fileName} (${(fileSize / 1024).toFixed(2)} KB)`,
    );

    revalidatePath("/next-gen/control-center/customers");
    return { success: true, logFile };
  } catch (e) {
    console.error("Failed to upload customer log:", e);
    return { success: false, error: "Database registration failed." };
  }
}

export async function getCustomerLogFiles(customerId: string) {
  try {
    const files = await prisma.customerLogFile.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
    return JSON.parse(JSON.stringify(files));
  } catch (e) {
    console.error("Failed to fetch customer log files:", e);
    return [];
  }
}
export async function createTenantAction(
  payload: {
    name: string;
    type: string;
    code: string;
    customerId: string;
    description?: string;
  },
  actor: string,
) {
  try {
    const tenant = await prisma.tenant.create({
      data: {
        name: payload.name,
        type: payload.type,
        code: payload.code,
        customerId: payload.customerId,
        description:
          payload.description || `Provisioned ${payload.type} environment.`,
        status: "ACTIVE",
      },
    });

    await createAuditLog(
      actor,
      "TENANT_PROVISIONED",
      payload.name,
      JSON.stringify({
        tenantId: tenant.id,
        type: payload.type,
        code: payload.code,
      }),
    );

    // Send Notification
    const customer = await prisma.customer.findUnique({
      where: { id: payload.customerId },
      select: { billingEmail: true },
    });

    if (customer?.billingEmail) {
      await EmailService.sendTenantProvisionedNotification(
        customer.billingEmail,
        tenant.name,
        payload.customerId,
      );
    }

    revalidatePath("/next-gen/control-center/tenants");
    return { success: true, tenant };
  } catch (e: any) {
    console.error("Failed to create tenant:", e);
    return { success: false, error: e.message || "Failed to provision node." };
  }
}

export async function getCustomerAdminsAction(customerId: string) {
  try {
    return await prisma.tenantAdmin.findMany({
      where: { customerId },
      orderBy: { createdAt: "desc" },
    });
  } catch (e) {
    console.error("Failed to fetch customer admins:", e);
    return [];
  }
}

export async function addCustomerAdminAction(
  customerId: string,
  payload: any,
  actor: string,
) {
  try {
    const activationToken = randomUUID();

    const admin = await prisma.tenantAdmin.create({
      data: {
        ...payload,
        customerId,
        status: "Pending Activation",
        activationToken,
      },
    });

    // Fetch customer details for email context
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { companyName: true, slug: true },
    });

    // Dispatch Activation Email
    await EmailService.sendAdminActivation({
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
      organization: customer?.companyName || "Unknown Organization",
      activationToken,
      customerSlug: customer?.slug || null,
      customerId,
    });

    console.log(
      `[ADMIN] Activation email dispatched → ${payload.email} (Token: ${activationToken})`,
    );

    await createAuditLog(
      actor,
      "ADMIN_ONBOARDED",
      `${payload.firstName} ${payload.lastName}`,
      JSON.stringify({
        adminId: admin.id,
        role: payload.role,
        customerId,
        activationEmailSent: true,
      }),
      "Info",
      true,
      customerId,
    );

    revalidatePath("/next-gen/control-center/customer");
    return { success: true, admin };
  } catch (e: any) {
    console.error("Failed to add admin:", e);
    return {
      success: false,
      error: e.message || "Failed to provision administrator.",
    };
  }
}

export async function updateCustomerAdminAction(
  adminId: string,
  payload: any,
  actor: string,
) {
  try {
    // Whitelist only fields that exist on TenantAdmin and are safe to update
    const allowedFields = [
      "firstName",
      "lastName",
      "email",
      "dob",
      "gender",
      "employeeId",
      "jobTitle",
      "department",
      "manager",
      "employmentType",
      "workLocation",
      "phone",
      "role",
      "status",
      "startDate",
      "endDate",
      "mfaEnabled",
    ];

    const sanitized: Record<string, any> = {};
    for (const key of allowedFields) {
      if (key in payload) {
        sanitized[key] = payload[key];
      }
    }

    const admin = await prisma.tenantAdmin.update({
      where: { id: adminId },
      data: sanitized,
    });

    await createAuditLog(
      actor,
      "ADMIN_MODIFIED",
      `${admin.firstName} ${admin.lastName}`,
      JSON.stringify({
        adminId,
        role: admin.role,
        customerId: admin.customerId,
      }),
      "Info",
      true,
      admin.customerId,
    );

    revalidatePath("/next-gen/control-center/customer");
    return { success: true, admin };
  } catch (e: any) {
    console.error("Failed to update admin:", e);
    return {
      success: false,
      error: e.message || "Failed to modify administrator.",
    };
  }
}

export async function deleteCustomerAdminAction(
  adminId: string,
  actor: string,
) {
  try {
    const admin = await prisma.tenantAdmin.delete({
      where: { id: adminId },
    });

    await createAuditLog(
      actor,
      "ADMIN_REMOVED",
      `${admin.firstName} ${admin.lastName}`,
      JSON.stringify({ adminId, customerId: admin.customerId }),
      "Warning",
      true,
      admin.customerId,
    );

    revalidatePath("/next-gen/control-center/customer");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to delete admin:", e);
    return {
      success: false,
      error: e.message || "Failed to remove administrator.",
    };
  }
}

export async function toggleAdminStatusAction(
  adminId: string,
  currentStatus: string,
  actor: string,
) {
  try {
    const newStatus = currentStatus === "Active" ? "Disabled" : "Active";
    const admin = await prisma.tenantAdmin.update({
      where: { id: adminId },
      data: { status: newStatus },
    });

    await createAuditLog(
      actor,
      `ADMIN_${newStatus.toUpperCase()}`,
      `${admin.firstName} ${admin.lastName}`,
      JSON.stringify({
        adminId,
        status: newStatus,
        customerId: admin.customerId,
      }),
      newStatus === "Disabled" ? "Warning" : "Info",
      true,
      admin.customerId,
    );

    revalidatePath("/next-gen/control-center/customer");
    return { success: true, admin };
  } catch (e: any) {
    console.error("Failed to toggle admin status:", e);
    return {
      success: false,
      error: e.message || "Failed to update administrator status.",
    };
  }
}

// --- NEW Access Control & Dashboard Aggregation ---

export async function getUserAccess(email: string) {
  try {
    console.log(`[DB] getUserAccess for ${email}`);
    const customers = await prisma.customer.findMany();
    console.log(`[DB] Found ${customers.length} customers.`);
    return JSON.parse(JSON.stringify(customers));
  } catch (e: any) {
    console.error("[DB ERROR] getUserAccess failed:", e.message);
    return [];
  }
}

export async function updateCustomerThemeAction(
  customerId: string,
  theme: string,
) {
  try {
    await prisma.customer.update({
      where: { id: customerId },
      data: { theme },
    });
    return { success: true };
  } catch (e: any) {
    console.error("Failed to update theme:", e.message);
    return { success: false, error: e.message };
  }
}

export async function getAggregatedDashboardMetrics(tenantIds: string[]) {
  try {
    if (!tenantIds || tenantIds.length === 0) {
      return {
        totalProjects: 0,
        runningJobs: 0,
        queueItems: 0,
        successfulRuns: 0,
        failedRuns: 0,
        recentLogs: [],
      };
    }

    const [projectCount, jobCount, queueCount, executionStats, recentLogs] =
      await Promise.all([
        prisma.project.count({ where: { tenantId: { in: tenantIds } } }),
        prisma.studioJob.count({
          where: { tenantId: { in: tenantIds }, status: "Running" },
        }),
        prisma.studioTransaction.count({
          where: {
            queue: { tenantId: { in: tenantIds } },
            status: "New",
          },
        }),
        prisma.executionRun.groupBy({
          by: ["status"],
          where: { workflow: { tenantId: { in: tenantIds } } },
          _count: true,
        }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { timestamp: "desc" },
          // Filtering audit logs by customer link since some don't have tenantId directly
          // In a real multi-tenant app, AuditLog should have tenantId.
        }),
      ]);

    const stats = executionStats.reduce((acc: any, curr) => {
      acc[curr.status.toLowerCase()] = curr._count;
      return acc;
    }, {});

    return {
      totalProjects: projectCount,
      runningJobs: jobCount,
      queueItems: queueCount,
      successfulRuns: stats.success || 0,
      failedRuns: stats.failed || 0,
      recentLogs: JSON.parse(JSON.stringify(recentLogs)),
    };
  } catch (e) {
    console.error("Failed to aggregate metrics:", e);
    return null;
  }
}

export async function updateTenantActivationAction(
  tenantId: string,
  status: "ACTIVE" | "DISABLED",
  role: string,
) {
  try {
    // 1. Safety Check: Verify this isn't a PROD tenant if disabling
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { type: true, name: true, status: true },
    });

    if (!tenant) throw new Error("Tenant not found.");

    if (tenant.type === "PROD" && status === "DISABLED") {
      throw new Error(
        "Security Violation: Production environments cannot be disabled through standard lifecycle controls.",
      );
    }

    // 2. Perform Update
    const updated = await prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    });

    // 3. Audit Log
    await createAuditLog(
      role,
      `TENANT_${status}`,
      tenant.name,
      JSON.stringify({
        tenantId,
        previousStatus: tenant.status,
        newStatus: status,
      }),
      status === "DISABLED" ? "Warning" : "Info",
      true,
    );

    revalidatePath("/next-gen/admin/organization/tenants");
    revalidatePath("/next-gen/control-center/tenants");

    return { success: true, tenant: updated };
  } catch (e: any) {
    console.error("[TenantAction] Activation update failed:", e);
    return { success: false, error: e.message };
  }
}

// --- Blueprint & Provisioning Actions ---

/**
 * Simulates cloning an existing tenant (Deep Copy)
 * @param sourceId Original tenant ID
 * @param config New configuration and parameters
 */
export async function cloneTenantAction(sourceId: string, config: any) {
  try {
    console.log(
      `[PROVISION] Starting Environment Clone from Source: ${sourceId}`,
    );

    // Simulate lookup of source tenant
    const sourceTenant = await prisma.tenant.findUnique({
      where: { id: sourceId },
      include: {
        config: true,
        services: true,
        workspaces: true,
      },
    });

    if (!sourceTenant) throw new Error("Source Environment not found");

    // Start simulated transaction (We'll only insert the top-level tenant for the scaffold)
    const newTenant = await prisma.tenant.create({
      data: {
        name: config.name,
        code: config.code,
        type: config.type || "DEV",
        status: "ACTIVE", // Or DISABLED based on approval rules
        customerId: sourceTenant.customerId,
        description: `Cloned from ${sourceTenant.name} on ${new Date().toLocaleDateString()}`,
      },
    });

    // Send Notification
    const customer = await prisma.customer.findUnique({
      where: { id: sourceTenant.customerId },
      select: { billingEmail: true },
    });

    if (customer?.billingEmail) {
      await EmailService.sendTenantProvisionedNotification(
        customer.billingEmail,
        newTenant.name,
        sourceTenant.customerId,
      );
    }

    // Simulated Deep Copy Delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Emit Audit Log
    // Simplified audit log for scaffold since signature doesn't match perfectly
    console.log(`Cloned to ${newTenant.id}`);

    revalidatePath("/next-gen/admin/organization/tenants");
    return { success: true, tenant: newTenant };
  } catch (e: any) {
    console.error("Clone Tenant Error:", e);
    return {
      success: false,
      error: e.message || "Failed to clone environment",
    };
  }
}

/**
 * Simulates importing a structural blueprint into a target tenant
 * @param targetId The tenant to apply the structure to
 * @param payload Parsed structural definition
 */
export async function importTenantStructureAction(
  targetId: string,
  payload: any,
  actor: string,
) {
  try {
    console.log(`[PROVISION] Starting Blueprint Import to Target: ${targetId}`);

    const targetTenant = await prisma.tenant.findUnique({
      where: { id: targetId },
    });

    if (!targetTenant) throw new Error("Target Environment not found");

    // In a real implementation, we would recursively parse `payload.folders`
    // and use `prisma.folder.upsert` to achieve idempotency.

    // Simulated parsing delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Emit Audit Log
    console.log(`Imported structure by ${actor}`);

    return { success: true, message: "Structure imported successfully" };
  } catch (e: any) {
    console.error("Import Structure Error:", e);
    return {
      success: false,
      error: e.message || "Failed to import structural blueprint",
    };
  }
}

/**
 * Activate an administrator account using a one-time activation token.
 * Called from the /activate page when an admin clicks the activation link in their email.
 */
export async function activateAdminByTokenAction(token: string, dob?: string) {
  try {
    // 1. Look up the admin by activation token
    const admin = await prisma.tenantAdmin.findFirst({
      where: { activationToken: token },
      include: { customer: { select: { companyName: true, id: true } } },
    });

    if (!admin) {
      return {
        success: false,
        error:
          "Invalid or expired activation token. Please contact your administrator.",
      };
    }

    if (admin.status === "Active") {
      return {
        success: false,
        error: "This account has already been activated.",
      };
    }

    // 2. Optional DOB verification (dual-factor)
    if (dob && admin.dob && admin.dob !== dob) {
      return {
        success: false,
        error:
          "Identity verification failed. Date of birth does not match our records.",
      };
    }

    // 3. Activate the admin and clear the one-time token
    await prisma.tenantAdmin.update({
      where: { id: admin.id },
      data: {
        status: "Active",
        activationToken: null, // One-time use — clear after activation
      },
    });

    // 4. Record audit trail
    await createAuditLog(
      admin.email,
      "ADMIN_ACTIVATED",
      `${admin.firstName} ${admin.lastName}`,
      JSON.stringify({
        adminId: admin.id,
        customerId: admin.customerId,
        organization: admin.customer.companyName,
        activatedAt: new Date().toISOString(),
      }),
      "High",
      true,
      admin.customerId,
    );

    console.log(
      `[ACTIVATION] Admin activated: ${admin.email} for ${admin.customer.companyName}`,
    );

    return {
      success: true,
      admin: {
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        organization: admin.customer.companyName,
      },
    };
  } catch (e: any) {
    console.error("[ACTIVATION] Failed to activate admin:", e);
    return {
      success: false,
      error: e.message || "Activation failed. Please try again.",
    };
  }
}

export async function deleteStudioProject(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { resource: true },
    });

    if (!project) {
      return { success: true };
    }

    if ((project.resource as any)?.isLocked) {
      return {
        success: false,
        error:
          "Project is currently locked (possibly being edited by another user).",
      };
    }

    // Delete the project first to clean up foreign keys and cascade delete children, 
    // then delete the associated explorer resource
    await prisma.$transaction([
      prisma.project.delete({
        where: { id: projectId },
      }),
      ...(project.resourceId
        ? [
            prisma.resource.delete({
              where: { id: project.resourceId },
            }),
          ]
        : []),
    ]);

    return { success: true };
  } catch (e: any) {
    console.error("Failed to delete studio project:", e);
    return { success: false, error: e.message };
  }
}

export async function moveStudioProject(
  projectId: string,
  targetFolderId: string | null,
) {
  try {
    await prisma.project.update({
      where: { id: projectId },
      data: { folderId: targetFolderId === "root" ? null : targetFolderId },
    });
    return { success: true };
  } catch (e: any) {
    console.error("Failed to move studio project:", e);
    return { success: false, error: e.message };
  }
}
