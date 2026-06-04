import { prisma } from '../src/lib/prisma';

async function main() {
  const models = [
    'lookupIndustry', 'lookupRegion', 'lookupClassification', 'lookupPriority', 
    'lookupCurrency', 'lookupTimezone', 'lookupCustomerType', 'lookupEngagementTier'
  ];
  
  for (const modelName of models) {
    const data = await (prisma as any)[modelName].findFirst();
    if (data) {
      console.log(`Types for ${modelName}:`);
      for (const [key, value] of Object.entries(data)) {
        console.log(`  - ${key}: ${typeof value} (${value})`);
      }
    } else {
      console.log(`No data for ${modelName}`);
    }
  }
}

main().catch(console.error);
