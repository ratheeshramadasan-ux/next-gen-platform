import { prisma } from '../src/lib/prisma';

async function check() {
  const customers = await prisma.customer.findMany({
    where: { companyName: { contains: 'Apex', mode: 'insensitive' } },
    include: { tenants: true }
  });

  console.log(JSON.stringify(customers, null, 2));
}

check().catch(console.error);
