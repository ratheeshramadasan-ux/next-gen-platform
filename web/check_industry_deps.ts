import { prisma } from './src/lib/prisma';
async function main() {
  const industries = await prisma.lookupIndustry.findMany({ select: { label: true } });
  const customers = await prisma.customer.findMany({ 
    select: { industry: true },
    where: { industry: { in: industries.map(i => i.label) } }
  });
  
  console.log('--- Industry Dependency Report ---');
  console.log('Total Industries:', industries.length);
  console.log('Active Dependencies:', customers.length);
  console.log('Industries in use:', [...new Set(customers.map(c => c.industry))]);
  
  if (customers.length === 0) {
    console.log('No dependencies found. Safe to purge.');
  } else {
    console.log('Dependences found. Cannot purge via standard delete.');
  }
}
main().catch(console.error);
