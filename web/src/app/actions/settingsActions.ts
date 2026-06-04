"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Fetches organization settings for a customer.
 * If none exist, it initializes them.
 */
export async function getOrgSettings(customerId: string) {
  try {
    let settings = await prisma.organizationSettings.findUnique({
      where: { customerId }
    });

    if (!settings) {
      // Default initialization
      settings = await prisma.organizationSettings.create({
        data: {
          customerId,
          cicdMode: "INTERNAL",
          branchMapping: {
            dev: "main",
            uat: "uat",
            prod: "prod"
          }
        }
      });
    }

    return JSON.parse(JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to fetch org settings:", e);
    return null;
  }
}

/**
 * Updates organization-level configurations.
 */
export async function updateOrgSettings(customerId: string, data: any) {
  try {
    const settings = await prisma.organizationSettings.upsert({
      where: { customerId },
      update: data,
      create: {
        ...data,
        customerId
      }
    });

    revalidatePath("/next-gen/admin/organization/settings");
    return { success: true, settings: JSON.parse(JSON.stringify(settings)) };
  } catch (e: any) {
    console.error("Failed to update org settings:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Fetches SMTP configuration.
 * If customerId is provided, looks for customer-specific SMTP.
 * If includeFallback is true and no customer config found, returns platform default.
 */
export async function getSmtpConfig(customerId?: string | null, includeFallback: boolean = true) {
  try {
    if (customerId) {
      const config = await prisma.smtpConfig.findUnique({
        where: { customerId }
      });
      if (config) return JSON.parse(JSON.stringify(config));
    }

    if (!includeFallback) return null;

    // Fallback to platform default
    const platformConfig = await prisma.smtpConfig.findFirst({
      where: { isDefault: true, customerId: null }
    });

    return platformConfig ? JSON.parse(JSON.stringify(platformConfig)) : null;
  } catch (e) {
    console.error("Failed to fetch SMTP config:", e);
    return null;
  }
}

/**
 * Updates or creates SMTP configuration.
 */
export async function updateSmtpConfig(data: any) {
  try {
    const { id, ...rest } = data;
    
    let config;
    if (id) {
      config = await prisma.smtpConfig.update({
        where: { id },
        data: rest
      });
    } else {
      // If customerId is null, ensure it's the default
      if (!rest.customerId) {
        rest.isDefault = true;
      }
      config = await prisma.smtpConfig.create({
        data: rest
      });
    }

    return { success: true, config: JSON.parse(JSON.stringify(config)) };
  } catch (e: any) {
    console.error("Failed to update SMTP config:", e);
    return { success: false, error: e.message };
  }
}

