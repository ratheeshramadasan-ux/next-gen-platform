import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const hosts = await prisma.botHost.findMany({
    include: {
      tenant: true
    }
  });
  console.log(`Total BotHosts: ${hosts.length}`);
  hosts.forEach(host => {
    console.log(`Host: ${host.hostname}, TenantID: ${host.tenantId}, CustomerID: ${host.tenant.customerId}`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
