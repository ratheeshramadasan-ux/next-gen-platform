"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSecurityOverview() {
  try {
    // Fetch Root CA
    const rootCA = await (prisma as any).securityCredential.findFirst({
      where: { ownerType: "PLATFORM", type: "ROOT_CA" },
      select: {
        id: true,
        displayName: true,
        algorithm: true,
        fingerprint: true,
        expiresAt: true,
        status: true,
        metadata: true
      }
    });

    // Fetch Tenant CAs
    const tenantCAs = await (prisma as any).securityCredential.findMany({
      where: { type: "TENANT_CA" },
      select: {
        id: true,
        displayName: true,
        ownerId: true,
        algorithm: true,
        fingerprint: true,
        expiresAt: true,
        status: true
      }
    });

    // Fetch Recent VM Certificates
    const vmCertificates = await (prisma as any).securityCredential.findMany({
      where: { type: "VM_IDENTITY" },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        displayName: true,
        ownerId: true,
        fingerprint: true,
        expiresAt: true,
        status: true,
        createdAt: true
      }
    });

    // Stats
    const totalCerts = await (prisma as any).securityCredential.count({ where: { type: "VM_IDENTITY" } });
    const activeTenantsWithCA = new Set(tenantCAs.map((ca: any) => ca.ownerId)).size;

    return {
      success: true,
      rootCA,
      tenantCAs,
      vmCertificates,
      stats: {
        totalIssued: totalCerts,
        securedTenants: activeTenantsWithCA,
        health: "OPERATIONAL"
      }
    };
  } catch (e: any) {
    console.error("Failed to fetch security overview:", e);
    return { success: false, error: e.message };
  }
}

export async function rotateRootCAAction() {
  // This would be a highly sensitive action. For now, we'll return a stub.
  return { success: false, error: "Root CA rotation must be performed via secure CLI or break-glass procedure." };
}
