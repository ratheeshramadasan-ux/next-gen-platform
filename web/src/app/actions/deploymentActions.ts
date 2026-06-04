"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { CICDFactory } from "@/lib/cicd/factory";

/**
 * Triggers a new deployment for a specific tenant.
 */
export async function triggerDeployment(payload: {
  tenantId: string;
  customerId: string;
  version: string; // branch or tag
  initiatedBy: string;
}) {
  try {
    // 1. Fetch Org Settings to determine mode
    const settings = await prisma.organizationSettings.findUnique({
      where: { customerId: payload.customerId }
    });

    if (!settings) throw new Error("Organization settings not found.");

    // 2. Create the Deployment record in DRAFT/PENDING_APPROVAL
    const deployment = await prisma.deployment.create({
      data: {
        tenantId: payload.tenantId,
        customerId: payload.customerId,
        version: payload.version,
        status: settings.approvalRequired ? "PENDING_APPROVAL" : "APPROVED",
        initiatedBy: payload.initiatedBy,
        metadata: {
          cicdMode: settings.cicdMode,
          provider: settings.provider,
          repoUrl: settings.repoUrl
        }
      }
    });

    // 3. If approval is not required, proceed to dispatch immediately
    if (!settings.approvalRequired) {
      return await dispatchDeploymentAction(deployment.id);
    }

    revalidatePath("/next-gen/admin/organization/tenants");
    return { success: true, deploymentId: deployment.id, status: deployment.status };
  } catch (e: any) {
    console.error("Deployment trigger failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Approves a pending deployment.
 */
export async function approveDeploymentAction(deploymentId: string, approvedBy: string) {
  try {
    const deployment = await prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        approvedBy
      }
    });

    // Dispatch after approval
    return await dispatchDeploymentAction(deployment.id);
  } catch (e: any) {
    console.error("Deployment approval failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Internal helper to dispatch the deployment to the configured provider.
 */
async function dispatchDeploymentAction(deploymentId: string) {
  try {
    const deployment = await prisma.deployment.findUnique({
      where: { id: deploymentId },
      include: { tenant: true }
    });

    if (!deployment) throw new Error("Deployment not found");

    const settings = await prisma.organizationSettings.findUnique({
      where: { customerId: deployment.customerId }
    });

    if (!settings) throw new Error("Org settings not found");

    // Update status to DEPLOYING
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: "DEPLOYING" }
    });

    if (settings.cicdMode === "EXTERNAL" && settings.provider) {
       // Dispatch to External Provider (GitHub, etc.)
       const provider = CICDFactory.getProvider(settings.provider);
       const result = await provider.dispatchDeployment({
          repoName: settings.repoName || "next-gen-repo",
          repoUrl: settings.repoUrl || "",
          branch: deployment.version,
          version: deployment.version,
          metadata: { deploymentId: deployment.id, tenant: deployment.tenant.name }
       });

       if (!result.success) throw new Error(result.error);

       await prisma.deployment.update({
         where: { id: deploymentId },
         data: { 
           status: "SUCCESS", // Simplification: assuming dispatch success = success for now if internal
           metadata: { ...(deployment.metadata as any), externalId: result.externalId }
         }
       });
    } else {
       // INTERNAL Mode simulation
       await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate work
       await prisma.deployment.update({
         where: { id: deploymentId },
         data: { status: "SUCCESS" }
       });
    }

    revalidatePath("/next-gen/admin/organization/tenants");
    return { success: true };
  } catch (e: any) {
    await prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: "FAILED", metadata: { error: e.message } }
    });
    return { success: false, error: e.message };
  }
}

/**
 * Fetches recent deployments for a customer dashboard.
 */
export async function getRecentDeployments(customerId: string, limit = 5) {
  try {
    return await prisma.deployment.findMany({
      where: { customerId },
      include: { tenant: true },
      orderBy: { initiatedAt: "desc" },
      take: limit
    });
  } catch (e) {
    console.error("Failed to fetch recent deployments:", e);
    return [];
  }
}

/**
 * Fetches recent administrative audit logs for a customer.
 */
export async function getRecentAuditLogs(customerId: string, limit = 10) {
  try {
    // Assuming AuditLog is linked to Customer in schema.prisma as implemented earlier
    return await (prisma as any).auditLog.findMany({
      where: { customerId },
      orderBy: { timestamp: "desc" },
      take: limit
    });
  } catch (e) {
    console.error("Failed to fetch audit logs:", e);
    return [];
  }
}
