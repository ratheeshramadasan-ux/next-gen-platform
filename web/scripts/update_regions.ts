import { db } from '../src/lib/prisma';

async function main() {
  console.log("Updating platform.lookup_regions with Category (Country/Continent)...");
  
  await db.$transaction([
    db.$executeRawUnsafe(`TRUNCATE TABLE platform.lookup_regions CASCADE;`),
    db.$executeRawUnsafe(`
      INSERT INTO platform.lookup_regions (label, value, icon, category, "isActive", "isGovernanceLocked") VALUES
      ('East US', 'eastus', '🇺🇸', 'United States', true, true),
      ('West US', 'westus', '🇺🇸', 'United States', true, true),
      ('Central US', 'centralus', '🇺🇸', 'United States', true, true),
      ('South Central US', 'southcentralus', '🇺🇸', 'United States', true, true),
      ('North Europe', 'northeurope', '🇮🇪', 'Ireland / Europe', true, true),
      ('West Europe', 'westeurope', '🇳🇱', 'Netherlands / Europe', true, true),
      ('Southeast Asia', 'southeastasia', '🇸🇬', 'Singapore / Asia', true, true),
      ('East Asia', 'eastasia', '🇭🇰', 'Hong Kong / Asia', true, true),
      ('Australia East', 'australiaeast', '🇦🇺', 'Australia / Oceania', true, true),
      ('Australia Southeast', 'australiasoutheast', '🇦🇺', 'Australia / Oceania', true, true),
      ('Brazil South', 'brazilsouth', '🇧🇷', 'Brazil / South America', true, true),
      ('Canada Central', 'canadacentral', '🇨🇦', 'Canada / North America', true, true),
      ('Central India', 'centralindia', '🇮🇳', 'India / Asia', true, true),
      ('South India', 'southindia', '🇮🇳', 'India / Asia', true, true),
      ('Japan East', 'japaneast', '🇯🇵', 'Japan / Asia', true, true),
      ('Japan West', 'japanwest', '🇯🇵', 'Japan / Asia', true, true),
      ('UK South', 'uksouth', '🇬🇧', 'United Kingdom / Europe', true, true),
      ('UK West', 'ukwest', '🇬🇧', 'United Kingdom / Europe', true, true),
      ('France Central', 'francecentral', '🇫🇷', 'France / Europe', true, true),
      ('Germany West Central', 'germanywestcentral', '🇩🇪', 'Germany / Europe', true, true),
      ('Korea Central', 'koreacentral', '🇰🇷', 'South Korea / Asia', true, true),
      ('South Africa North', 'southafricanorth', '🇿🇦', 'South Africa / Africa', true, true),
      ('UAE North', 'uaenorth', '🇦🇪', 'UAE / Middle East', true, true),
      ('Switzerland North', 'switzerlandnorth', '🇨🇭', 'Switzerland / Europe', true, true),
      ('Norway East', 'norwayeast', '🇳🇴', 'Norway / Europe', true, true);
    `)
  ]);

  console.log("Azure Regions with Categories successfully populated.");
}

main().catch(console.error).finally(() => db.$disconnect());
