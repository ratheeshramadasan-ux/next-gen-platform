import "dotenv/config";
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Seeding Hierarchical IAM data using existing prisma client...");

  try {
    // 1. Create Roles
    const superAdminRole = await prisma.appRole.upsert({
      where: { name: "Super Admin" },
      update: {},
      create: { 
        name: "Super Admin", 
        isSystem: true,
        permissions: JSON.stringify(["GLOBAL_ADMIN"]) 
      }
    });

    const adminRole = await prisma.appRole.upsert({
      where: { name: "Admin User" },
      update: {},
      create: { 
        name: "Admin User", 
        isSystem: true,
        permissions: JSON.stringify(["CUSTOMER_ADMIN"]) 
      }
    });

    const tenantRole = await prisma.appRole.upsert({
      where: { name: "Tenant Admin" },
      update: {},
      create: { 
        name: "Tenant Admin", 
        isSystem: true,
        permissions: JSON.stringify(["TENANT_ADMIN"]) 
      }
    });

    // 2. Create Customers & Tenants
    const apex = await prisma.customer.upsert({
      where: { id: "00000000-0000-0000-0000-000000000001" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000001",
        companyName: "Apex Financial",
        industry: "Banking",
        location: "New York, USA",
        status: "Active"
      }
    });

    const globalHealth = await prisma.customer.upsert({
      where: { id: "00000000-0000-0000-0000-000000000002" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000002",
        companyName: "Global Health Inc",
        industry: "Healthcare",
        location: "London, UK",
        status: "Active"
      }
    });

    const apexNyc = await prisma.tenant.upsert({
      where: { id: "00000000-0000-0000-0000-000000000011" },
      update: {},
      create: {
        id: "00000000-0000-0000-0000-000000000011",
        name: "Apex NYC Region",
        code: "APEX-NYC",
        customerId: apex.id
      }
    });

    // 3. Create Users with different scopes
    
    // User A: Global (No Customer/Tenant)
    await prisma.appUser.upsert({
      where: { email: "ratheesh@zohomail.ca" },
      update: {},
      create: {
        email: "ratheesh@zohomail.ca",
        fullName: "Global Admin (Ratheesh)",
        status: "Protected",
        roles: { connect: { id: superAdminRole.id } }
      }
    });

    // User B: Apex Customer Level
    await prisma.appUser.upsert({
      where: { email: "apex.admin@financial.com" },
      update: { customerId: apex.id },
      create: {
        email: "apex.admin@financial.com",
        fullName: "Apex Fin Regional Admin",
        customerId: apex.id,
        roles: { connect: { id: adminRole.id } }
      }
    });

    // User C: Apex NYC Tenant Level
    await prisma.appUser.upsert({
      where: { email: "nyc.tenant@apex.com" },
      update: { customerId: apex.id, tenantId: apexNyc.id },
      create: {
        email: "nyc.tenant@apex.com",
        fullName: "NYC Branch Manager",
        customerId: apex.id,
        tenantId: apexNyc.id,
        roles: { connect: { id: tenantRole.id } }
      }
    });

    // User D: Global Health User (Isolation test)
    await prisma.appUser.upsert({
      where: { email: "health.admin@global.com" },
      update: { customerId: globalHealth.id },
      create: {
        email: "health.admin@global.com",
        fullName: "Global Health Admin",
        customerId: globalHealth.id,
        roles: { connect: { id: adminRole.id } }
      }
    });


    // 4. Seed Industry Dictionary
    const industries = [
      "Banking & Finance", "Insurance", "Retail & E-commerce", "Manufacturing", 
      "Healthcare & Pharmaceuticals", "Logistics & Warehousing", "Automotive", 
      "Energy & Utilities", "Hospitality & Tourism", "Agriculture", 
      "Telecommunications", "Construction", "Professional & Public Services"
    ];

    for (const industry of industries) {
      await prisma.lookupIndustry.upsert({
        where: { label: industry },
        update: {},
        create: { label: industry }
      });
    }
    console.log("Industry dictionary synchronization completed.");

    // 5. Seed Regions
    const regions = [
      { label: "North America", value: "NA", icon: "Globe" },
      { label: "Europe", value: "EU", icon: "Map" },
      { label: "Asia Pacific", value: "APAC", icon: "Compass" },
      { label: "Latin America", value: "LATAM", icon: "Sun" },
      { label: "Middle East & Africa", value: "MEA", icon: "Moon" }
    ];
    for (const region of regions) {
      await prisma.lookupRegion.upsert({
        where: { label: region.label },
        update: { value: region.value, icon: region.icon },
        create: { label: region.label, value: region.value, icon: region.icon }
      });
    }
    console.log("Region dictionary synchronization completed.");

    // 6. Seed Timezones
    const timezones = ["UTC", "PST", "EST", "CET", "IST", "SGT", "JST", "AEST"];
    for (const tz of timezones) {
      await prisma.lookupTimezone.upsert({
        where: { label: tz },
        update: {},
        create: { label: tz }
      });
    }
    console.log("Timezone dictionary synchronization completed.");

    // 7. Seed Currencies
    const currencies = [
      { label: "USD - US Dollar", code: "USD", symbol: "$" },
      { label: "EUR - Euro", code: "EUR", symbol: "€" },
      { label: "GBP - British Pound", code: "GBP", symbol: "£" },
      { label: "JPY - Japanese Yen", code: "JPY", symbol: "¥" },
      { label: "INR - Indian Rupee", code: "INR", symbol: "₹" }
    ];
    for (const curr of currencies) {
      await prisma.lookupCurrency.upsert({
        where: { label: curr.label },
        update: { code: curr.code, symbol: curr.symbol },
        create: { label: curr.label, code: curr.code, symbol: curr.symbol }
      });
    }
    console.log("Currency dictionary synchronization completed.");

    // 8. Seed Customer Types
    const customerTypes = ["Enterprise", "Mid-Market", "SMB", "Government", "Partner"];
    for (const type of customerTypes) {
      await prisma.lookupCustomerType.upsert({
        where: { label: type },
        update: {},
        create: { label: type }
      });
    }
    console.log("Customer Type dictionary synchronization completed.");

    // 9. Seed Priorities
    const priorities = ["Low", "Standard", "High", "Critical"];
    for (const priority of priorities) {
      await prisma.lookupPriority.upsert({
        where: { label: priority },
        update: {},
        create: { label: priority }
      });
    }
    console.log("Priority dictionary synchronization completed.");

    // 10. Seed AI Infrastructure (Local Ollama Node)
    await prisma.aiModel.upsert({
      where: { id: "00000000-0000-0000-0000-0000000000a1" },
      update: {
        name: 'Local Ollama Cluster',
        provider: 'OLLAMA',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        modelIdentifier: process.env.OLLAMA_DEFAULT_MODEL || 'llama3',
        isLocal: true,
        isActive: true,
        status: 'ONLINE'
      },
      create: {
        id: "00000000-0000-0000-0000-0000000000a1",
        name: 'Local Ollama Cluster',
        provider: 'OLLAMA',
        endpoint: process.env.OLLAMA_ENDPOINT || 'http://localhost:11434',
        modelIdentifier: process.env.OLLAMA_DEFAULT_MODEL || 'llama3',
        isLocal: true,
        isActive: true,
        status: 'UNKNOWN'
      }
    });

    console.log("AI Infrastructure synchronization completed.");
    console.log("Hierarchical seeding completed.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
