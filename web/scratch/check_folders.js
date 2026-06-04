const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const dotenv = require('dotenv');

dotenv.config({ path: '/Users/ratheesh/next-gen-platform/.env' });

const dbUrl = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  const customer = await prisma.customer.findFirst({
    where: { companyName: { contains: 'CanadaLife' } }
  });
  
  const tenants = await prisma.tenant.findMany({
    where: { customerId: customer.id }
  });
  
  const prodTenant = tenants.find(t => t.type === 'PROD');
  const folders = await prisma.folder.findMany({
    where: { customerId: customer.id, tenantId: prodTenant.id, isArchived: false }
  });
  console.log('Folders in PROD with parentId:');
  folders.forEach(f => {
    console.log(`- ${f.name} (ID: ${f.id}, parentId: ${f.parentId})`);
  });
  
  await prisma.$disconnect();
}

check().catch(console.error);
