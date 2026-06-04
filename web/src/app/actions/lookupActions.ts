"use server";

import { revalidatePath } from "next/cache";
import { createAuditLog } from "./tenantActions";
import { prisma, baseDb } from "@/lib/prisma";

export async function getPlatformLookups(activeOnly: boolean = true) {
  const lookups: any = {
    industries: [], regions: [], classifications: [], priorities: [],
    currencies: [], timezones: [], customerTypes: [], engagementTiers: []
  };

  try {
    console.log(`[MASTER_DATA] Diagnostic Fetch (ActiveOnly: ${activeOnly})`);
    const where = activeOnly ? { isActive: true } : {};

    console.log(`[MASTER_DATA] Querying Industry...`);
    try {
      const indData = await prisma.lookupIndustry.findMany({ where });
      lookups.industries = indData.map((item: any) => ({
        id: item.id, label: item.label, isActive: item.isActive, icon: item.icon
      }));
    } catch(e) { console.error("Industry lookup failed", e); }

    console.log(`[MASTER_DATA] Querying Region...`);
    try {
      const regData = await prisma.lookupRegion.findMany({ where });
      lookups.regions = regData.map((item: any) => ({
        id: item.id, label: item.label, isActive: item.isActive, icon: item.icon, category: item.category
      }));
    } catch(e) { console.error("Region lookup failed", e); }

    console.log(`[MASTER_DATA] Querying Classification...`);
    try {
      const classData = await prisma.lookupClassification.findMany({ where });
      lookups.classifications = classData.map((item: any) => ({
        id: item.id, label: item.label, isActive: item.isActive, category: item.category, description: item.description
      }));
    } catch(e) { console.error("Classification lookup failed", e); }

    console.log(`[MASTER_DATA] Querying Priority...`);
    try {
      const prioData = await prisma.lookupPriority.findMany({ where });
      lookups.priorities = prioData.map((item: any) => ({
        id: item.id, label: item.label, isActive: item.isActive, description: item.description
      }));
    } catch(e) { console.error("Priority lookup failed", e); }

    console.log(`[MASTER_DATA] Querying Currency...`);
    try {
      const curData = await prisma.lookupCurrency.findMany({ where });
      lookups.currencies = curData.map((item: any) => ({
        id: item.id, label: item.label, code: item.code, symbol: item.symbol
      }));
    } catch(e) { console.error("Currency lookup failed", e); }

    console.log(`[MASTER_DATA] Querying Timezone...`);
    try {
      const tzData = await prisma.lookupTimezone.findMany({ where });
      lookups.timezones = tzData.map((item: any) => ({
        id: item.id, label: item.label, category: item.category
      }));
    } catch(e) { console.error("Timezone lookup failed", e); }

    console.log(`[MASTER_DATA] Querying CustomerType...`);
    try {
      const ctData = await prisma.lookupCustomerType.findMany({ where });
      lookups.customerTypes = ctData.map((item: any) => ({
        id: item.id, label: item.label, description: item.description
      }));
    } catch(e) { console.error("CustomerType lookup failed", e); }

    // Engagement Tier
    console.log("[DEBUG] Fetching EngagementTier...");
    try {
      const etData = await prisma.lookupEngagementTier.findMany({ 
        where: { isActive: activeOnly ? true : undefined }
      });
      lookups.engagementTiers = etData.map((t: any) => ({
        id: t.id, label: t.label, category: t.category, description: t.description, isActive: t.isActive
      }));
    } catch (tierErr: any) {
      console.error("[DEBUG] EngagementTier Hydration Failed:", tierErr.message);
      lookups.engagementTiers = [];
    }


    // Defensive diagnostic entry if registry is still empty
    if (lookups.engagementTiers.length === 0) {
       lookups.engagementTiers.push({
         id: "diag-1",
         label: "Registry Synchronization Check Required",
         category: "System",
         isActive: true
       });
    }

    console.log("[MASTER_DATA] Diagnostic Fetch Complete. Keys:", Object.keys(lookups));

    // ENSURE MINIMUM DEFAULTS TO PREVENT UI CRASHES
    if (lookups.industries.length === 0) {
      lookups.industries = [
        { id: "def-1", label: "Technology", isActive: true, icon: "Cpu" },
        { id: "def-2", label: "Finance", isActive: true, icon: "Wallet" },
        { id: "def-3", label: "Healthcare", isActive: true, icon: "Activity" }
      ];
    }
    if (lookups.regions.length === 0) {
      lookups.regions = [
        { id: "reg-1", label: "North America", isActive: true, icon: "Globe" },
        { id: "reg-2", label: "Europe", isActive: true, icon: "Globe" }
      ];
    }
    if (lookups.engagementTiers.length === 0) {
      lookups.engagementTiers = [
        { id: "tier-1", label: "Standard", category: "Standard", isActive: true },
        { id: "tier-2", label: "Enterprise", category: "Premium", isActive: true }
      ];
    }

    return { success: true, ...lookups };
  } catch (e: any) {
    console.error("[MASTER_DATA] Global lookup failure:", e);
    return { success: false, error: e.message, ...lookups };
  }
}

export type LookupType = "INDUSTRY" | "REGION" | "CLASSIFICATION" | "PRIORITY" | "CURRENCY" | "TIMEZONE" | "CUSTOMER_TYPE" | "ENGAGEMENT_TIER";

// --- ICON INTELLIGENCE HUB ---
function getIndustryIcon(label: string): string {
  const l = label.toLowerCase();
  if (l.includes("tech") || l.includes("software") || l.includes("digital") || l.includes("it")) return "Cpu";
  if (l.includes("finance") || l.includes("bank") || l.includes("invest") || l.includes("money") || l.includes("treasury")) return "Wallet";
  if (l.includes("health") || l.includes("medical") || l.includes("pharma") || l.includes("biotech")) return "Activity";
  if (l.includes("retail") || l.includes("store") || l.includes("shop") || l.includes("commerce")) return "ShoppingBag";
  if (l.includes("manufact") || l.includes("factory") || l.includes("industrial")) return "Factory";
  if (l.includes("edu") || l.includes("school") || l.includes("learn") || l.includes("academic")) return "BookOpen";
  if (l.includes("construct") || l.includes("build") || l.includes("real estate") || l.includes("archi")) return "HardHat";
  if (l.includes("food") || l.includes("restau") || l.includes("bever") || l.includes("hospitality")) return "Utensils";
  if (l.includes("energy") || l.includes("oil") || l.includes("gas") || l.includes("solar") || l.includes("utilit")) return "Zap";
  if (l.includes("logistics") || l.includes("warehous") || l.includes("shipping") || l.includes("supply")) return "Truck";
  if (l.includes("telecom") || l.includes("network") || l.includes("communicat")) return "Rss";
  if (l.includes("insuranc")) return "ShieldCheck";
  if (l.includes("automotiv") || l.includes("car") || l.includes("transport")) return "CarFront";
  if (l.includes("agri") || l.includes("farm") || l.includes("food production")) return "Sprout";
  return "Building2"; // Global Standard Fallback
}

export async function addLookupItem(
  type: LookupType, 
  label: string, 
  role: string, 
  icon?: string, 
  category?: string,
  code?: string,
  description?: string,
  symbol?: string
) {
  try {
    let finalIcon = icon;
    if (type === "INDUSTRY" && !finalIcon) {
      finalIcon = getIndustryIcon(label);
    }

    const cleanData = (d: any, t: LookupType) => {
      const base = { label: d.label, isActive: d.isActive ?? true };
      if (t === "INDUSTRY") return { ...base, value: d.value, icon: d.icon };
      if (t === "REGION") return { ...base, value: d.value, icon: d.icon, category: d.category };
      if (t === "CURRENCY") return { ...base, code: d.code, symbol: d.symbol, icon: d.icon };
      if (["CUSTOMER_TYPE", "PRIORITY", "CLASSIFICATION", "ENGAGEMENT_TIER"].includes(t)) {
        return { ...base, description: d.description, category: d.category };
      }
      return base;
    };

    const data = cleanData({ 
      label, 
      value: code || label, 
      icon: finalIcon, 
      isActive: true,
      description,
      code,
      category,
      symbol
    }, type);
    
    let res;
    switch (type) {
      case "INDUSTRY": res = await prisma.lookupIndustry.create({ data: { label, icon: finalIcon } }); break;
      case "REGION": res = await prisma.lookupRegion.create({ data: { label, icon, category } }); break;
      case "CLASSIFICATION": res = await prisma.lookupClassification.create({ data: { label, category, description } }); break;
      case "PRIORITY": res = await prisma.lookupPriority.create({ data: { label, description } }); break;
      case "CURRENCY": res = await prisma.lookupCurrency.create({ data: { label, code, symbol, icon } }); break;
      case "TIMEZONE": res = await prisma.lookupTimezone.create({ data: { label, category } }); break;
      case "CUSTOMER_TYPE": res = await prisma.lookupCustomerType.create({ data: { label, description } }); break;
      case "ENGAGEMENT_TIER": res = await prisma.lookupEngagementTier.create({ data: { label, category, description } }); break;
    }
    
    await createAuditLog(role, `ADD_DICTIONARY_${type}`, label, `Added to Platform Dictionaries: ${label}`, "Info", false, null);
    revalidatePath("/next-gen/control-center/masters");
    return { success: true };
  } catch (e) {
    console.error(`Failed to add lookup ${type}`, e);
    return { success: false, error: "Validation failed or label/code already exists." };
  }
}

export async function updateLookupItem(
  type: LookupType, 
  id: string, 
  oldLabel: string, 
  newLabel: string, 
  isActive: boolean, 
  role: string,
  icon?: string,
  category?: string,
  code?: string,
  description?: string,
  symbol?: string
) {
  try {
    console.log(`[MASTER_DATA] Updating ${type} (${id}): Icon Payload = "${icon}"`);
    
    let finalIcon = icon;
    // For Industry: If the icon was cleared or left as default, intelligently suggest one
    if (type === "INDUSTRY" && (!finalIcon || finalIcon === "Building2" || finalIcon === "")) {
      finalIcon = getIndustryIcon(newLabel);
      console.log(`[MASTER_DATA] Intelligence Override: Suggesting "${finalIcon}" for "${newLabel}"`);
    }

    const cleanData = (d: any, t: LookupType) => {
      const base = { label: d.label, isActive: d.isActive ?? true };
      if (t === "INDUSTRY") return { ...base, value: d.value, icon: d.icon };
      if (t === "REGION") return { ...base, value: d.value, icon: d.icon, category: d.category };
      if (t === "CURRENCY") return { ...base, code: d.code, symbol: d.symbol, icon: d.icon };
      if (["CUSTOMER_TYPE", "PRIORITY", "CLASSIFICATION", "ENGAGEMENT_TIER"].includes(t)) {
        return { ...base, description: d.description, category: d.category };
      }
      return base;
    };

    const data = cleanData({ label: newLabel, isActive, icon: finalIcon || undefined, description, code, category, symbol, value: code || newLabel }, type);
    
    // 🛡️ USE baseDb for direct updates to avoid metadata/serialization mismatch in extended client
    switch (type) {
      case "INDUSTRY": await prisma.lookupIndustry.update({ where: { id }, data }); break;
      case "REGION": await prisma.lookupRegion.update({ where: { id }, data }); break;
      case "CLASSIFICATION": await prisma.lookupClassification.update({ where: { id }, data }); break;
      case "PRIORITY": await prisma.lookupPriority.update({ where: { id }, data }); break;
      case "CURRENCY": await prisma.lookupCurrency.update({ where: { id }, data }); break;
      case "TIMEZONE": await prisma.lookupTimezone.update({ where: { id }, data }); break;
      case "CUSTOMER_TYPE": await prisma.lookupCustomerType.update({ where: { id }, data }); break;
      case "ENGAGEMENT_TIER": await prisma.lookupEngagementTier.update({ where: { id }, data }); break;
    }
    
    // ... cascading updates same ...
    if (oldLabel !== newLabel) {
      if (type === "INDUSTRY") {
        await prisma.customer.updateMany({ where: { industry: oldLabel }, data: { industry: newLabel } });
      } else if (type === "REGION") {
        await prisma.customer.updateMany({ where: { location: oldLabel }, data: { location: newLabel } });
      } else if (type === "ENGAGEMENT_TIER") {
        await prisma.customer.updateMany({ where: { engagementTier: oldLabel }, data: { engagementTier: newLabel } });
      }
    }

    await createAuditLog(role, `UPDATE_DICTIONARY_${type}`, newLabel, JSON.stringify({ oldLabel, isActive }), "Info", false, null);
    revalidatePath("/next-gen/control-center/masters");
    return { success: true };
  } catch (e) {
    console.error("Failed to update lookup item:", e);
    return { success: false, error: "Failed to update item or identifier already exists." };
  }
}

export async function removeLookupItem(type: LookupType, id: string, label: string, role: string) {
  try {
    // Check for dependencies
    if (["INDUSTRY", "REGION", "CUSTOMER_TYPE", "ENGAGEMENT_TIER"].includes(type)) {
      const checkField = type === "INDUSTRY" ? "industry" : type === "REGION" ? "location" : type === "CUSTOMER_TYPE" ? "customerType" : "engagementTier";
      const count = await prisma.customer.count({
        where: { [checkField]: label }
      });

      if (count > 0) {
        return { 
          success: false, 
          error: `Safeguard: ${count} Customer(s) are bound to '${label}'. Disable it instead.` 
        };
      }
    }

    switch (type) {
      case "INDUSTRY": await prisma.lookupIndustry.delete({ where: { id } }); break;
      case "REGION": await prisma.lookupRegion.delete({ where: { id } }); break;
      case "CLASSIFICATION": await prisma.lookupClassification.delete({ where: { id } }); break;
      case "PRIORITY": await prisma.lookupPriority.delete({ where: { id } }); break;
      case "CURRENCY": await prisma.lookupCurrency.delete({ where: { id } }); break;
      case "TIMEZONE": await prisma.lookupTimezone.delete({ where: { id } }); break;
      case "CUSTOMER_TYPE": await prisma.lookupCustomerType.delete({ where: { id } }); break;
      case "ENGAGEMENT_TIER": await prisma.lookupEngagementTier.delete({ where: { id } }); break;
    }
    
    await createAuditLog(role, `PURGE_DICTIONARY_${type}`, label, "Permanently purged from Platform Governance.", "Info", false, null);
    revalidatePath("/next-gen/control-center/masters");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to remove lookup item:", e);
    return { success: false, error: "Safeguard triggered: Cannot delete records with platform dependencies." };
  }
}

export async function purgeDisabledLookups(role: string) {
  try {
    const where = { isActive: false };
    await Promise.all([
      prisma.lookupIndustry.deleteMany({ where }),
      prisma.lookupRegion.deleteMany({ where }),
      prisma.lookupClassification.deleteMany({ where }),
      prisma.lookupPriority.deleteMany({ where }),
      prisma.lookupCurrency.deleteMany({ where }),
      prisma.lookupTimezone.deleteMany({ where }),
      prisma.lookupCustomerType.deleteMany({ where }),
      prisma.lookupEngagementTier.deleteMany({ where })
    ]);
    
    await createAuditLog(role, "PURGE_DISABLED_LOOKUPS", "Global", "Permanently removed all inactive platform lookups.", "Info", false, null);
    revalidatePath("/next-gen/control-center/masters");
    return { success: true };
  } catch (e) {
    console.error("Purge failed:", e);
    return { success: false, error: "Purge partially failed due to database constraints." };
  }
}

export async function addLookupItemsBulk(type: LookupType, rawData: string, role: string) {
  try {
    let items: any[] = [];
    const lines = rawData.split("\n").map(l => l.trim()).filter(l => l.length > 0);

    for (const line of lines) {
      const parts = line.split(",").map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length === 0) continue;

      if (["INDUSTRY", "TIMEZONE", "CUSTOMER_TYPE", "PRIORITY", "ENGAGEMENT_TIER"].includes(type)) {
        for (const part of parts) {
          let item: any = { label: part };
          if (type === "INDUSTRY") {
            item.icon = getIndustryIcon(part);
          }
          items.push(item);
        }
      } else {
        let item: any = { label: parts[0] };
        switch (type) {
          case "REGION":
            item.category = parts[1];
            item.icon = parts[2];
            break;
          case "CURRENCY":
            item.code = parts[1];
            item.symbol = parts[2];
            item.icon = parts[3];
            break;
        }
        items.push(item);
      }
    }

    let addedCount = 0;
    let skippedCount = 0;

    for (const item of items) {
      try {
        const cleanData = (d: any, t: LookupType) => {
          const base = { label: d.label, isActive: d.isActive ?? true };
          if (t === "INDUSTRY") return { ...base, value: d.value, icon: d.icon };
          if (t === "REGION") return { ...base, value: d.value, icon: d.icon, category: d.category };
          if (t === "CURRENCY") return { ...base, code: d.code, symbol: d.symbol, icon: d.icon };
          if (["CUSTOMER_TYPE", "PRIORITY", "CLASSIFICATION", "ENGAGEMENT_TIER"].includes(t)) {
            return { ...base, description: d.description, category: d.category };
          }
          return base;
        };

        const data = cleanData(item, type);

        let existing: any = null;
        const where: any = { label: item.label };
        if (item.code) where.OR = [{ label: item.label }, { code: item.code }];

        switch (type) {
          case "INDUSTRY": 
            existing = await prisma.lookupIndustry.findFirst({ where });
            if (!existing) {
              await prisma.lookupIndustry.create({ data });
              addedCount++;
            } else {
              const suggestedIcon = getIndustryIcon(item.label);
              if (suggestedIcon !== "Building2") {
                await prisma.lookupIndustry.update({ where: { id: existing.id }, data: { icon: suggestedIcon } });
              }
              skippedCount++;
            }
            break;
          case "REGION":
            existing = await prisma.lookupRegion.findFirst({ where });
            if (!existing) await prisma.lookupRegion.create({ data });
            break;
          case "CURRENCY":
            existing = await prisma.lookupCurrency.findFirst({ where });
            if (!existing) await prisma.lookupCurrency.create({ data });
            break;
          case "TIMEZONE":
            existing = await prisma.lookupTimezone.findFirst({ where });
            if (!existing) await prisma.lookupTimezone.create({ data });
            break;
          case "CUSTOMER_TYPE":
            existing = await prisma.lookupCustomerType.findFirst({ where });
            if (!existing) await prisma.lookupCustomerType.create({ data });
            break;
          case "PRIORITY":
            existing = await prisma.lookupPriority.findFirst({ where });
            if (!existing) await prisma.lookupPriority.create({ data });
            break;
          case "CLASSIFICATION":
            existing = await prisma.lookupClassification.findFirst({ where });
            if (!existing) await prisma.lookupClassification.create({ data });
            break;
          case "ENGAGEMENT_TIER":
            existing = await prisma.lookupEngagementTier.findFirst({ where });
            if (!existing) await prisma.lookupEngagementTier.create({ data });
            break;
        }
        
        if (type !== "INDUSTRY") {
          if (existing) skippedCount++;
          else addedCount++;
        }
      } catch (e) {
        console.error("Bulk item failure:", item.label || "unknown", e);
      }
    }

    revalidatePath("/next-gen/control-center/masters");
    return { success: true, addedCount, skippedCount };
  } catch (e) {
    return { success: false, error: "Bulk sync failure." };
  }
}
