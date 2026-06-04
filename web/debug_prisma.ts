
import { prisma } from "./src/lib/prisma";

async function main() {
  const regions = [
    "🇨🇦 Canada|Globe",
    "Canada Central (Toronto)|MapPin",
    "Canada East (Quebec)|MapPin",
    "🇺🇸 United States|Globe",
    "East US (Virginia)|MapPin",
    "East US 2 (Virginia)|MapPin",
    "Central US (Iowa)|MapPin",
    "North Central US (Illinois)|MapPin",
    "South Central US (Texas)|MapPin",
    "West US (California)|MapPin",
    "West US 2 (Washington)|MapPin",
    "West US 3 (Arizona)|MapPin",
    "🇪🇺 Europe|Globe",
    "UK South (London)|MapPin",
    "UK West (Cardiff)|MapPin",
    "West Europe (Netherlands)|MapPin",
    "North Europe (Ireland)|MapPin",
    "France Central (Paris)|MapPin",
    "Germany West Central|MapPin",
    "Switzerland North|MapPin",
    "Norway East|MapPin",
    "Sweden Central|MapPin",
    "🇦🇸 Asia Pacific|Globe",
    "East Asia (Hong Kong)|MapPin",
    "Southeast Asia (Singapore)|MapPin",
    "Japan East (Tokyo)|MapPin",
    "Japan West (Osaka)|MapPin",
    "Australia East (Sydney)|MapPin",
    "Australia Southeast (Melbourne)|MapPin",
    "Central India (Pune)|MapPin",
    "South India (Chennai)|MapPin",
    "West India (Mumbai)|MapPin",
    "Korea Central (Seoul)|MapPin",
    "🌍 Other / Special|Globe",
    "Brazil South (São Paulo)|MapPin",
    "South Africa North (Johannesburg)|MapPin",
    "UAE North (Dubai)|MapPin"
  ];

  console.log(`Prisma Population: Starting for ${regions.length} items...`);

  for (const raw of regions) {
    const [label, icon] = raw.split('|');
    try {
      await prisma.lookupRegion.upsert({
        where: { label },
        update: { icon },
        create: { label, value: label, icon, isActive: true }
      });
      console.log(`✅ ${label}`);
    } catch (e: any) {
      console.error(`❌ ${label}: ${e.message}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
