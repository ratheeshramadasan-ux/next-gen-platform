const prisma = require('../src/lib/prisma').prisma;

async function test() {
  try {
    console.log("Starting test with app prisma...");
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
    console.log("Stats:", {
      industries: industries.length,
      regions: regions.length,
      classifications: classifications.length,
      priorities: priorities.length,
      currencies: currencies.length,
      timezones: timezones.length,
      customerTypes: customerTypes.length
    });

    if (industries.length > 0) {
      console.log("First item:", JSON.stringify(industries[0], null, 2));
    }
  } catch (e) {
    console.error("Test failed:", e);
  } finally {
    if (prisma.$disconnect) await prisma.$disconnect();
  }
}

test();
