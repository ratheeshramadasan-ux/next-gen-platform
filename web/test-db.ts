import { prisma } from './src/lib/prisma';

async function main() {
  const customers = await prisma.customer.findMany();
  console.log(JSON.stringify(customers.map((c: any) => ({ name: c.companyName, logoUrl: c.logoUrl ? c.logoUrl.substring(0, 30) + '...' : null })), null, 2));
}

main().finally(() => prisma.$disconnect());
