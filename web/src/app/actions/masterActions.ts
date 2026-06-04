"use server";

import { prisma } from "@/lib/prisma";

/**
 * Retrieves all values for a specific master category.
 */
export async function getMasterValues(categoryName: string) {
  try {
    const category = await prisma.masterCategory.findUnique({
      where: { name: categoryName },
      include: {
        values: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          include: {
            childValues: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' }
            }
          }
        }
      }
    });

    if (!category) {
      return { success: false, error: `Category ${categoryName} not found.` };
    }

    return { success: true, values: category.values };
  } catch (error: any) {
    console.error(`getMasterValues (${categoryName}) Error:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Seeds initial master data for the Discovery module.
 */
export async function seedDiscoveryMasters() {
  try {
    const masters = [
      {
        category: "platform_types",
        label: "Platform Types",
        values: [
          { name: "Windows", code: "WIN" },
          { name: "Linux", code: "LINUX" },
          { name: "Unix", code: "UNIX" },
          { name: "Database", code: "DB" },
          { name: "Kubernetes", code: "K8S" },
          { name: "Cloud", code: "CLOUD" },
          { name: "Network", code: "NET" },
          { name: "Mainframe", code: "MF" }
        ]
      },
      {
        category: "compliance_frameworks",
        label: "Compliance Frameworks",
        values: [
          { name: "NIST SP 800-53", code: "NIST" },
          { name: "ISO/IEC 27001", code: "ISO" },
          { name: "SOC 2 Type II", code: "SOC2" },
          { name: "PCI-DSS v4.0", code: "PCI" },
          { name: "HIPAA", code: "HIPAA" },
          { name: "GDPR", code: "GDPR" },
          { name: "OSFI", code: "OSFI" }
        ]
      },
      {
        category: "risk_types",
        label: "Risk Types",
        values: [
          { name: "Shared Account", code: "SHARED" },
          { name: "Weak Password", code: "WEAK_PWD" },
          { name: "Orphan Account", code: "ORPHAN" },
          { name: "No MFA", code: "NO_MFA" },
          { name: "Internet Facing", code: "INTERNET" },
          { name: "Unsupported OS", code: "EOL_OS" }
        ]
      },
      {
        category: "environment_types",
        label: "Environment Types",
        values: [
          { name: "Production", code: "PROD" },
          { name: "Staging", code: "STG" },
          { name: "Development", code: "DEV" },
          { name: "UAT", code: "UAT" },
          { name: "DR", code: "DR" }
        ]
      },
      {
        category: "pam_platforms",
        label: "PAM Platforms",
        values: [
          { name: "CyberArk", code: "CYBERARK" },
          { name: "BeyondTrust", code: "BEYONDTRUST" },
          { name: "Delinea", code: "DELINEA" },
          { name: "HashiCorp Vault", code: "HASHICORP" },
          { name: "Microsoft Entra ID", code: "ENTRA" }
        ]
      }
    ];

    for (const m of masters) {
      const category = await prisma.masterCategory.upsert({
        where: { name: m.category },
        update: { label: m.label },
        create: { name: m.category, label: m.label, isSystem: true }
      });

      for (const [index, val] of m.values.entries()) {
        await prisma.masterValue.upsert({
          where: { 
            // Composite key would be better but we'll use find + upsert
            id: (await prisma.masterValue.findFirst({ 
              where: { categoryId: category.id, name: val.name } 
            }))?.id || "00000000-0000-0000-0000-000000000000"
          },
          update: { code: val.code, sortOrder: index },
          create: { 
            categoryId: category.id, 
            name: val.name, 
            code: val.code, 
            sortOrder: index 
          }
        });
      }
    }

    return { success: true };
  } catch (error: any) {
    console.error("seedDiscoveryMasters Error:", error);
    return { success: false, error: error.message };
  }
}
