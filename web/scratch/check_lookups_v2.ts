import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("--- LOOKUP DATA AUDIT (V2) ---");
  
  const tables = [
    'lookupIndustry',
    'lookupRegion',
    'lookupClassification',
    'lookupPriority',
    'lookupCurrency',
    'lookupTimezone',
    'lookupCustomerType'
  ];

  for (const table of tables) {
    try {
      const count = await (prisma as any)[table].count();
      console.log(`[${table}]: ${count} records`);
      if (count > 0) {
        const samples = await (prisma as any)[table].findMany({ take: 3 });
        console.log(`  Samples: ${samples.map((s: any) => s.label).join(', ')}`);
      }
    } catch (e: any) {
      console.error(`[${table}]: FAILED to query. Error: ${e.message}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
