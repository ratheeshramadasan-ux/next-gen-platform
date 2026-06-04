import { prisma } from "../src/lib/prisma";

async function main() {
  const tables = ['lookupIndustry', 'lookupRegion', 'lookupPriority', 'lookupCurrency', 'lookupTimezone', 'lookupCustomerType'];
  for (const table of tables) {
    const total = await (prisma as any)[table].count();
    const active = await (prisma as any)[table].count({ where: { isActive: true } });
    console.log(`[${table}]: Total=${total}, Active=${active}`);
  }
}
main().catch(console.error).finally(() => prisma.$disconnect());
