"use server";

import { prisma } from "@/lib/prisma";

/**
 * Fetches ELAK compute contracts for the marketplace.
 */
export async function getComputeContracts(tenantId: string) {
  try {
    return await prisma.computeContract.findMany({
      where: { tenantId },
      include: {
        bids: true
      },
      orderBy: { deadline: "asc" }
    });
  } catch (e) {
    console.error("Failed to fetch compute contracts:", e);
    return [];
  }
}

/**
 * Aggregates market clearing metrics for the ELAK layer.
 */
export async function getMarketMetrics(tenantId: string) {
  try {
    const activeContracts = await prisma.computeContract.count({
      where: { tenantId, status: "OPEN" }
    });

    const bidsCount = await prisma.kernelBid.count({
      where: { contract: { tenantId } }
    });

    return {
      activeContracts,
      bidsCount,
      marketStatus: "STABLE",
      avgClearingPrice: "0.0012" // ELAK dynamic pricing placeholder
    };
  } catch (e) {
    console.error("Failed to fetch market metrics:", e);
    return { activeContracts: 0, bidsCount: 0, marketStatus: "IDLE", avgClearingPrice: "0.0000" };
  }
}
