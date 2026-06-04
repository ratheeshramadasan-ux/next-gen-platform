import { db } from '../src/lib/prisma';

async function main() {
  console.log("Truncating platform.lookup_engagement_tiers and populating strategic models...");
  
  await db.$executeRawUnsafe(`TRUNCATE TABLE platform.lookup_engagement_tiers CASCADE;`);
  
  const tiers = [
    // A. Delivery Model
    { category: 'Delivery Model', label: 'Self-Service (DIY Automation)', description: 'Customer independently develops, deploys, and manages automations with minimal platform support.' },
    { category: 'Delivery Model', label: 'Co-Managed (Client + Platform Team)', description: 'Shared responsibility where both customer and platform team collaborate on automation delivery and governance.' },
    { category: 'Delivery Model', label: 'Fully Managed (RPA-as-a-Service)', description: 'Platform provider fully manages automation lifecycle including development, deployment, and operations.' },
    
    // B. Commercial Model
    { category: 'Commercial Model', label: 'Subscription-based', description: 'Fixed recurring fee for platform access and defined service tiers.' },
    { category: 'Commercial Model', label: 'Consumption-based', description: 'Billing based on usage metrics such as bot hours, runs, or transactions.' },
    { category: 'Commercial Model', label: 'Outcome-based', description: 'Pricing tied to business outcomes or process-level KPIs achieved through automation.' },
    { category: 'Commercial Model', label: 'Enterprise License Agreement (ELA)', description: 'Long-term contract with bundled pricing, typically covering large-scale enterprise usage.' },
    
    // C. Lifecycle Engagement
    { category: 'Lifecycle Engagement', label: 'Pilot / POC', description: 'Initial evaluation phase to validate platform capabilities and business value.' },
    { category: 'Lifecycle Engagement', label: 'Active Production', description: 'Automations are live and delivering business value in production environments.' },
    { category: 'Lifecycle Engagement', label: 'Scaling / Expansion', description: 'Increasing automation coverage across processes, departments, or geographies.' },
    { category: 'Lifecycle Engagement', label: 'Transformation Program', description: 'Strategic, enterprise-wide initiative driving large-scale automation and digital transformation.' },
    { category: 'Lifecycle Engagement', label: 'Sunset / Offboarding', description: 'Gradual reduction or termination of platform usage and services.' }
  ];

  for (const t of tiers) {
    try {
      await db.lookupEngagementTier.create({
        data: {
          ...t,
          isActive: true,
          isGovernanceLocked: true
        }
      });
      console.log(`Inserted ${t.label}`);
    } catch (e: any) {
      console.error(`Failed to insert ${t.label}:`, e.message);
    }
  }

  console.log("Engagement Tier population complete.");
}

main().catch(console.error).finally(() => db.$disconnect());
