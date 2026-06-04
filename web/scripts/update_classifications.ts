import { db } from '../src/lib/prisma';

async function main() {
  console.log("Truncating platform.lookup_classifications and populating tiered assessment data...");
  
  await db.$executeRawUnsafe(`TRUNCATE TABLE platform.lookup_classifications CASCADE;`);
  
  const classifications = [
    // Revenue
    { category: 'Revenue', label: 'Revenue Tier 1 (Strategic / Key Account)', description: 'High-value customer with significant revenue contribution and strategic partnership importance.' },
    { category: 'Revenue', label: 'Revenue Tier 2 (Growth)', description: 'Expanding customer with strong potential for increased automation adoption and revenue growth.' },
    { category: 'Revenue', label: 'Revenue Tier 3 (Standard)', description: 'Regular customer with stable usage and moderate engagement.' },
    { category: 'Revenue', label: 'Revenue Tier 4 (Low-touch / Self-service)', description: 'Small-scale customer with minimal support needs and primarily self-managed usage.' },
    
    // Maturity
    { category: 'Maturity', label: 'Maturity Beginner', description: 'Minimal automation; processes are largely manual or ad-hoc.' },
    { category: 'Maturity', label: 'Maturity Intermediate', description: 'Initial RPA adoption with limited scaling across departments.' },
    { category: 'Maturity', label: 'Maturity Advanced', description: 'Mature automation practice with integrated RPA, AI, and orchestration capabilities.' },
    { category: 'Maturity', label: 'Maturity Transformational', description: 'Enterprise-wide automation strategy aiming toward autonomous operations and continuous optimization.' },
    
    // Risk
    { category: 'Risk', label: 'Risk High Regulated', description: 'Subject to strict regulatory frameworks requiring auditability, security, and compliance controls.' },
    { category: 'Risk', label: 'Risk Moderate', description: 'Some regulatory requirements with standard governance and security controls.' },
    { category: 'Risk', label: 'Risk Low', description: 'Minimal regulatory constraints with flexible governance requirements.' }
  ];

  for (const c of classifications) {
    try {
      await db.lookupClassification.create({
        data: {
          ...c,
          isActive: true,
          isGovernanceLocked: true
        }
      });
      console.log(`Inserted ${c.label}`);
    } catch (e: any) {
      console.error(`Failed to insert ${c.label}:`, e.message);
    }
  }

  console.log("Classification population complete.");
}

main().catch(console.error).finally(() => db.$disconnect());
