import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("--- BOOTSTRAPPING LOOKUP CLASSIFICATIONS ---");
  
  const items = [
    { label: "Customer" },
    { label: "Partner" },
    { label: "Vendor" },
    { label: "Internal" },
    { label: "Government" }
  ];

  for (const item of items) {
    try {
      await prisma.lookupClassification.upsert({
        where: { label: item.label },
        update: {},
        create: {
          label: item.label,
          isActive: true
        }
      });
      console.log(`[SUCCESS] Boostrapped: ${item.label}`);
    } catch (e: any) {
      console.error(`[ERROR] Failed to bootstrap ${item.label}: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
