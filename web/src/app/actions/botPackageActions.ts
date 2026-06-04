"use server";

import { revalidatePath } from "next/cache";
import { syncBotPackagesToDb } from "@/lib/services/bot-package-db";

export async function syncBotPackageCatalogAction() {
  try {
    await syncBotPackagesToDb();
    revalidatePath("/next-gen/downloads");
    return { success: true as const };
  } catch (error) {
    console.error("Failed to sync bot package catalog:", error);
    return { success: false as const };
  }
}
