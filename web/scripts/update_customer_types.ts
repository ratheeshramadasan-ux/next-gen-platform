import { db } from '../src/lib/prisma';

async function main() {
  console.log("Truncating platform.lookup_customer_types and populating enterprise-grade segments...");
  
  await db.$executeRawUnsafe(`TRUNCATE TABLE platform.lookup_customer_types CASCADE;`);
  
  const customerTypes = [
    { 
      label: 'Enterprise', 
      description: 'Large organization with complex processes, high automation demand, and strict governance requirements.' 
    },
    { 
      label: 'SME (Small & Medium Business)', 
      description: 'Mid-sized or small organization with limited scale, typically requiring cost-effective and simpler automation solutions.' 
    },
    { 
      label: 'Government / Public Sector', 
      description: 'Federal, provincial, or municipal entities with strict compliance, security, and data residency requirements.' 
    },
    { 
      label: 'Non-Profit / NGO', 
      description: 'Mission-driven organizations with budget constraints, focused on operational efficiency rather than scale.' 
    },
    { 
      label: 'Partner / Reseller', 
      description: 'Third-party organization that resells or delivers automation services using the platform.' 
    },
    { 
      label: 'Internal Business Unit', 
      description: 'Internal department or division using the platform for enterprise-wide automation initiatives.' 
    }
  ];

  for (const ct of customerTypes) {
    try {
      await db.lookupCustomerType.create({
        data: {
          ...ct,
          isActive: true,
          isGovernanceLocked: true
        }
      });
      console.log(`Inserted ${ct.label}`);
    } catch (e: any) {
      console.error(`Failed to insert ${ct.label}:`, e.message);
    }
  }

  console.log("Customer Type population complete.");
}

main().catch(console.error).finally(() => db.$disconnect());
