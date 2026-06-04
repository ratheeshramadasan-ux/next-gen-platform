import { prisma } from '../src/lib/prisma';

async function main() {
  const tiers = ['Enterprise', 'Professional', 'SMB', 'Legacy'];
  console.log('[BOOTSTRAP] Hydrating Engagement Tiers...');
  
  for (const tier of tiers) {
    await prisma.lookupEngagementTier.upsert({
      where: { label: tier },
      update: {},
      create: { 
        label: tier,
        isActive: true 
      }
    });
  }
  
  console.log('[BOOTSTRAP] Engagement Tiers hydrated successfully.');
}

main().catch(console.error);
