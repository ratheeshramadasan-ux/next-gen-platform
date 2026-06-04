"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Sovereign Quota Guard
 * Enforces quantitative discipline before resource creation.
 */
export async function enforceResourceQuota(customerId: string, type: any) {
  try {
    // 1. Fetch effective quota for this customer
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        subscriptionPlan: true,
        resourceQuotas: {
          where: { resourceType: type }
        }
      }
    });

    if (!customer) throw new Error("Customer registry not found.");

    // 2. Resolve Limit (Priority: Overrides > Subscription Plan Defaults > System Hard Floor)
    let limit = 0;
    
    if (customer.resourceQuotas.length > 0) {
      limit = customer.resourceQuotas[0].maxCount;
    } else if (customer.subscriptionPlan) {
      const planQuotas = JSON.parse(customer.subscriptionPlan.defaultQuotas || "{}");
      limit = planQuotas[type] || 0;
    } else {
      // Default System Hard Floor (Safe Mode)
      const DEFAULTS: Record<string, number> = {
        TENANT: 4,
        PROJECT: 5,
        STUDIO_WORKFLOW: 10,
        IAM_ROLE: 10
      };
      limit = DEFAULTS[type] || 0;
    }

    // 3. Check Current Registry Count
    const currentCount = await prisma.resource.count({
      where: { 
        ownerId: customerId, 
        resourceType: type,
        status: { not: "DELETED" }
      }
    });

    if (currentCount >= limit) {
      throw new Error(`Governance Violation: Quota exceeded for ${type}. Current: ${currentCount}, Limit: ${limit}. Please upgrade your licensing tier to provision more resources.`);
    }

    return { success: true, count: currentCount, limit };
  } catch (error: any) {
    console.error("[QuotaGuard] Enforcement failure:", error.message);
    throw error; // Bubble up to interceptor
  }
}

/**
 * Fetch usage metrics for the Licensing Hub
 */
export async function getLicensingMetrics(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        subscriptionPlan: true,
        resourceQuotas: true
      }
    });

    if (!customer) return [];

    const types = ["TENANT", "PROJECT", "STUDIO_WORKFLOW", "IAM_ROLE"];
    const metrics = await Promise.all(types.map(async (type) => {
      const count = await prisma.resource.count({
        where: { ownerId: customerId, resourceType: type as any, status: { not: "DELETED" } }
      });
      
      const override = customer.resourceQuotas.find(q => q.resourceType === type);
      const planQuotas = JSON.parse(customer.subscriptionPlan?.defaultQuotas || "{}");
      const limit = override?.maxCount || planQuotas[type] || 5;

      return {
        type,
        label: type.replace(/_/g, ' '),
        count,
        limit,
        percentage: Math.min((count / limit) * 100, 100)
      };
    }));

    return metrics;
  } catch (error) {
    console.error("[Licensing] Failed to fetch metrics:", error);
    return [];
  }
}

/**
 * Seed Default Licensing Tiers
 */
export async function seedLicensingTiers() {
  try {
    const plans = [
      { 
        name: "Community (Free)", 
        code: "FREE", 
        quotas: { TENANT: 2, PROJECT: 3, STUDIO_WORKFLOW: 5, IAM_ROLE: 5 } 
      },
      { 
        name: "Enterprise Core", 
        code: "ENTERPRISE", 
        quotas: { TENANT: 10, PROJECT: 50, STUDIO_WORKFLOW: 100, IAM_ROLE: 100 } 
      },
      { 
        name: "Sovereign Ultimate", 
        code: "SOVEREIGN", 
        quotas: { TENANT: 100, PROJECT: 1000, STUDIO_WORKFLOW: 5000, IAM_ROLE: 5000 } 
      }
    ];

    for (const p of plans) {
      await prisma.subscriptionPlan.upsert({
        where: { code: p.code },
        update: { defaultQuotas: JSON.stringify(p.quotas) },
        create: {
          name: p.name,
          code: p.code,
          defaultQuotas: JSON.stringify(p.quotas)
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("[Licensing] Seeding failed:", error);
    return { success: false };
  }
}

export async function updateCustomerTier(customerId: string, planCode: string) {
  try {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { code: planCode } });
    if (!plan) throw new Error("Plan not found");

    await prisma.customer.update({
      where: { id: customerId },
      data: { subscriptionPlanId: plan.id, planType: planCode }
    });

    revalidatePath("/next-gen/control-center/licensing");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
