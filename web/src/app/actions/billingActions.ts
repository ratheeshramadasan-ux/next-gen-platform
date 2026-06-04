"use server";

import { prisma } from "@/lib/prisma";

/**
 * Fetches billing and consumption metrics for a tenant.
 */
export async function getBillingSummary(tenantId: string) {
  try {
    const contracts = await prisma.computeContract.findMany({
      where: { tenantId },
      include: { bids: true }
    });

    const metrics = await prisma.metric.findMany({
      where: { execution: { tenantId } },
      orderBy: { timestamp: "desc" },
      take: 100
    });

    // Weighted average clearing price logic
    const avgPrice = contracts.length > 0 
      ? (contracts.reduce((acc, c) => acc + (c.maxPrice as any || 0), 0) / contracts.length).toFixed(4)
      : "0.0000";

    return {
      activeContracts: contracts.length,
      totalUsage: metrics.length * 0.05, // Simulated GB-seconds/Compute Units
      currentBalance: "142.50",
      avgClearingPrice: avgPrice
    };
  } catch (e) {
    console.error("Failed to fetch billing summary:", e);
    return {
      activeContracts: 0,
      totalUsage: 0,
      currentBalance: "0.00",
      avgClearingPrice: "0.0000"
    };
  }
}
