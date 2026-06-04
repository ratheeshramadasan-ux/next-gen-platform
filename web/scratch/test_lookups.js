const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ log: ['query', 'error'] });

async function test() {
  try {
    console.log("Starting test...");
    const where = { isActive: true };
    const orderBy = { label: "asc" };

    const [industries, regions, classifications, priorities, currencies, timezones, customerTypes] = await Promise.all([
      prisma.lookupIndustry.findMany({ where, orderBy }),
      prisma.lookupRegion.findMany({ where, orderBy }),
      prisma.lookupClassification.findMany({ where, orderBy }),
      prisma.lookupPriority.findMany({ where, orderBy }),
      prisma.lookupCurrency.findMany({ where, orderBy }),
      prisma.lookupTimezone.findMany({ where, orderBy }),
      prisma.lookupCustomerType.findMany({ where, orderBy })
    ]);

    console.log("Success!");
    console.log("Industries:", industries.length);
    console.log("Regions:", regions.length);
  } catch (e) {
    console.error("Failed:", e);
  } finally {
    await prisma.$disconnect();
  }
}

test();
