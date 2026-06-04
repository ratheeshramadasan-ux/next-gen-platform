"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetches comprehensive tenant details including services and config.
 */
export async function getTenantDetails(tenantId: string) {
  try {
    return await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        workspaces: {
          include: { resource: true }
        },
        environments: true,
        workflowDefinitions: { take: 10 }
      }
    });
  } catch (e) {
    console.error("Failed to fetch tenant details:", e);
    return null;
  }
}

/**
 * Fetches users affiliated with a specific tenant.
 */
export async function getTenantUsers(tenantId: string) {
  try {
    return await prisma.user.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    });
  } catch (e) {
    console.error("Failed to fetch tenant users:", e);
    return [];
  }
}

/**
 * Updates a specific tenant configuration flag.
 */
export async function updateTenantConfig(tenantId: string, config: any) {
  try {
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { config }
    });
    revalidatePath("/next-gen/admin");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to update tenant config:", e);
    return { success: false, error: e.message };
  }
}
