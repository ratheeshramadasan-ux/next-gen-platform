"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetches all active agent instances for a tenant.
 */
export async function getAgentInstances(tenantId: string) {
  try {
    return await prisma.agentInstance.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" }
    });
  } catch (e) {
    console.error("Failed to fetch agent instances:", e);
    return [];
  }
}

/**
 * Deploys a new Agent Instance.
 */
export async function deployAgentAction(payload: {
  tenantId: string;
  name: string;
  agentType: string;
  autonomyLevel: string;
  systemPrompt?: string;
}) {
  try {
    const agent = await prisma.agentInstance.create({
      data: {
        tenantId: payload.tenantId,
        name: payload.name,
        agentType: payload.agentType,
        autonomyLevel: payload.autonomyLevel,
        systemPrompt: payload.systemPrompt,
        status: "ACTIVE"
      }
    });

    revalidatePath("/next-gen/ai-hub");
    return { success: true, agentId: agent.id };
  } catch (e: any) {
    console.error("Agent deployment failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Fetches agent run history.
 */
export async function getAgentRuns(tenantId: string, limit = 50) {
  try {
    return await prisma.agentRun.findMany({
      where: { tenantId },
      include: {
        agent: true
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  } catch (e) {
    console.error("Failed to fetch agent runs:", e);
    return [];
  }
}
