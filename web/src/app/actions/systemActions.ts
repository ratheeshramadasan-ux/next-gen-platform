"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getSystemConfig() {
  try {
    const smtp = await prisma.smtpConfig.findFirst({
      where: { isDefault: true, customerId: null }
    });
    return JSON.parse(JSON.stringify(smtp));
  } catch (e) {
    console.error("Failed to fetch system config:", e);
    return null;
  }
}

export async function updateSystemSmtp(data: any) {
  try {
    const { id, ...rest } = data;
    let config;
    
    if (id) {
      config = await prisma.smtpConfig.update({
        where: { id },
        data: { ...rest, isDefault: true, customerId: null }
      });
    } else {
      config = await prisma.smtpConfig.create({
        data: { ...rest, isDefault: true, customerId: null }
      });
    }
    
    revalidatePath("/next-gen/control-center/config");
    return { success: true, config: JSON.parse(JSON.stringify(config)) };
  } catch (e: any) {
    console.error("Failed to update system SMTP:", e);
    return { success: false, error: e.message };
  }
}
