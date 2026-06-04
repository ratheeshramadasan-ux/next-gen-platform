"use server";

import { prisma } from "@/lib/prisma";

/**
 * Fetches SEPS evolution logs (meta-verification history).
 */
export async function getEvolutionLogs(limit = 20) {
  try {
    return await prisma.evolutionLog.findMany({
      include: {
        rule: true
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  } catch (e) {
    console.error("Failed to fetch evolution logs:", e);
    return [];
  }
}

/**
 * Fetches active proof rules.
 */
export async function getProofRules() {
  try {
    return await prisma.proofRule.findMany({
      where: { isActive: true },
      orderBy: { version: "desc" }
    });
  } catch (e) {
    console.error("Failed to fetch proof rules:", e);
    return [];
  }
}
