import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany();
  if (tenants.length === 0) {
    console.log("No tenants found.");
    return;
  }

  const tenant = tenants[0];

  const host = await prisma.botHost.create({
    data: {
      hostname: "ALO-MAC-RUNNER-01",
      osType: "macOS",
      osVersion: "14.4",
      status: "Offline",
      tenantId: tenant.id,
    }
  });

  console.log("Created mock BotHost:", host);
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
