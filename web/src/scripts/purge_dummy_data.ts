import { baseDb as prisma } from '../lib/prisma';

async function main() {
  console.log('--- PURGING DUMMY CUSTOMER DATA ---');
  
  // Order matters due to foreign keys
  const admins = await prisma.tenantAdmin.deleteMany({});
  console.log(`Deleted ${admins.count} Tenant Admins`);
  
  const tenants = await prisma.tenant.deleteMany({});
  console.log(`Deleted ${tenants.count} Tenants`);
  
  const customers = await prisma.customer.deleteMany({});
  console.log(`Deleted ${customers.count} Customers`);

  console.log('--- PURGE COMPLETE ---');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
