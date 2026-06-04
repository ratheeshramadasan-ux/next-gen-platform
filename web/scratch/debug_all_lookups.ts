import { prisma } from '../src/lib/prisma';

async function testModel(name: string, model: any) {
  try {
    process.stdout.write(`[DEBUG] Testing ${name}... `);
    const count = await model.count();
    const data = await model.findMany({ take: 5 });
    console.log(`✅ Success! (Count: ${count}, Sample: ${data.length})`);
  } catch (e: any) {
    console.log(`❌ FAILED! Error: ${e.message}`);
    if (e.message.includes('usize') || e.message.includes('unit')) {
      console.log(`   >>> FOUND CULPRIT: ${name}`);
    }
  }
}

async function main() {
  await testModel('Industry', prisma.lookupIndustry);
  await testModel('Region', prisma.lookupRegion);
  await testModel('Classification', prisma.lookupClassification);
  await testModel('Priority', prisma.lookupPriority);
  await testModel('Currency', prisma.lookupCurrency);
  await testModel('Timezone', prisma.lookupTimezone);
  await testModel('CustomerType', prisma.lookupCustomerType);
  await testModel('EngagementTier', prisma.lookupEngagementTier);
}

main().catch(console.error);
