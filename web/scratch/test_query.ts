import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('[TEST] Querying Engagement Tiers...');
    const tiers = await prisma.lookupEngagementTier.findMany();
    console.log('[TEST] Success! Found:', tiers.length);
  } catch (e: any) {
    console.error('[TEST] Query failed:', e);
  }
}

main().catch(console.error);
