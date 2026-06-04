import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const industries = await prisma.lookupIndustry.findMany();
  console.log("CURRENT_INDUSTRIES:", JSON.stringify(industries));
}

main().finally(() => prisma.$disconnect());
