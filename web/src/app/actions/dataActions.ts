"use server";

import { prisma } from "@/lib/prisma";

/**
 * Fetches data artifacts (resources of type ARTIFACT) for the Data Center.
 */
export async function getDataArtifacts(tenantId: string) {
  try {
    return await prisma.resource.findMany({
      where: { 
        tenantId,
        resourceType: "ARTIFACT"
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (e) {
    console.error("Failed to fetch data artifacts:", e);
    return [];
  }
}
