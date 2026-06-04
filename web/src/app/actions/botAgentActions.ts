"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

export async function activateBotHostAction(hostId: string, tenantId: string, role: string, agentMode: string = "Unattended") {
  try {
    const activationToken = `ACT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const host = await prisma.botHost.update({
      where: { id: hostId },
      data: {
        status: "Active",
        tenantId: tenantId,
        activationToken: activationToken,
        updatedAt: new Date()
      },
      include: {
        tenant: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actor: role,
        action: "BOT_HOST_ACTIVATED",
        target: host.hostname,
        details: JSON.stringify({ hostId, tenantId, tenantName: host.tenant.name, token: activationToken, agentMode }),
        severity: "High",
        customerId: host.tenant.customerId
      }
    });

    revalidatePath("/next-gen/bot-agents");
    revalidatePath("/next-gen/bot-agents/activation");
    return { success: true, token: activationToken };
  } catch (e: any) {
    console.error("Failed to activate bot host:", e);
    return { success: false, error: e.message };
  }
}

export async function updateOrchestratorPortAction(customerId: string, port: number, role: string) {
  try {
    // Store in TenantConfig for all tenants of this customer, or just a generic key
    // For now, let's assume we store it in a new Customer field or generic TenantConfig
    // Since we don't want to change schema right now, we'll use TenantConfig for the default tenant
    
    const tenants = await prisma.tenant.findMany({
      where: { customerId }
    });

    for (const tenant of tenants) {
      await prisma.tenantConfig.upsert({
        where: {
          tenantId_key: { tenantId: tenant.id, key: "ORCHESTRATOR_PORT" }
        },
        update: { value: port.toString() },
        create: {
          tenantId: tenant.id,
          key: "ORCHESTRATOR_PORT",
          value: port.toString(),
          category: "CONNECTION"
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        actor: role,
        action: "ORCHESTRATOR_PORT_UPDATED",
        target: "Global Config",
        details: JSON.stringify({ customerId, port }),
        severity: "Medium",
        customerId: customerId
      }
    });

    revalidatePath("/next-gen/bot-agents/activation");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to update orchestrator port:", e);
    return { success: false, error: e.message };
  }
}

export async function getTenantsForCustomerAction(customerId: string) {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { customerId },
      select: { id: true, name: true, code: true }
    });
    return JSON.parse(JSON.stringify(tenants));
  } catch (e) {
    console.error("Failed to fetch tenants:", e);
    return [];
  }
}

/** Read the heartbeat interval (seconds) for a given tenant. Falls back to 30s. */
export async function getHeartbeatIntervalAction(tenantId: string): Promise<number> {
  try {
    const cfg = await prisma.tenantConfig.findUnique({
      where: { tenantId_key: { tenantId, key: "HEARTBEAT_INTERVAL_SECONDS" } }
    });
    return cfg ? parseInt(cfg.value, 10) : 30;
  } catch {
    return 30;
  }
}

/** Persist the heartbeat interval (seconds) for a given tenant. */
export async function updateHeartbeatIntervalAction(
  tenantId: string,
  intervalSeconds: number,
  role: string
) {
  try {
    if (intervalSeconds < 10 || intervalSeconds > 300) {
      return { success: false, error: "Interval must be between 10 and 300 seconds." };
    }

    await prisma.tenantConfig.upsert({
      where: { tenantId_key: { tenantId, key: "HEARTBEAT_INTERVAL_SECONDS" } },
      update: { value: intervalSeconds.toString() },
      create: {
        tenantId,
        key: "HEARTBEAT_INTERVAL_SECONDS",
        value: intervalSeconds.toString(),
        category: "RUNTIME"
      }
    });

    await prisma.auditLog.create({
      data: {
        actor: role,
        action: "BOT_RUNNER_HEARTBEAT_INTERVAL_UPDATED",
        target: tenantId,
        details: JSON.stringify({ tenantId, intervalSeconds }),
        severity: "Medium"
      }
    });

    revalidatePath("/next-gen/bot-agents/profile");
    revalidatePath("/next-gen/bot-agents");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to update heartbeat interval:", e);
    return { success: false, error: e.message };
  }
}

