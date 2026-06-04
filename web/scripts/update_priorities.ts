import { db } from '../src/lib/prisma';

async function main() {
  console.log("Truncating platform.lookup_priorities and populating global urgency standards...");
  
  await db.$executeRawUnsafe(`TRUNCATE TABLE platform.lookup_priorities CASCADE;`);
  
  const priorities = [
    { label: 'Critical', description: 'Immediate response required; production-blocking issue with no workaround.' },
    { label: 'Urgent', description: 'High-priority task or issue significantly impacting operations; requires rapid resolution.' },
    { label: 'High', description: 'Important business requirement or functional issue with moderate operational impact.' },
    { label: 'Medium', description: 'Standard task or minor functional issue with existing workarounds.' },
    { label: 'Low', description: 'Minor request, cosmetic enhancement, or long-term backlog item.' }
  ];

  for (const p of priorities) {
    try {
      await db.lookupPriority.create({
        data: {
          ...p,
          isActive: true,
          isGovernanceLocked: true
        }
      });
      console.log(`Inserted ${p.label}`);
    } catch (e: any) {
      console.error(`Failed to insert ${p.label}:`, e.message);
    }
  }

  console.log("Priority population complete.");
}

main().catch(console.error).finally(() => db.$disconnect());
