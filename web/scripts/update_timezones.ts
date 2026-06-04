import { db } from '../src/lib/prisma';

async function main() {
  console.log("Truncating platform.lookup_timezones and populating global timezone data...");
  
  await db.$executeRawUnsafe(`TRUNCATE TABLE platform.lookup_timezones CASCADE;`);
  
  const timezones = [
    // North America
    { label: 'Eastern Standard Time (EST)', category: 'North America' },
    { label: 'Central Standard Time (CST)', category: 'North America' },
    { label: 'Mountain Standard Time (MST)', category: 'North America' },
    { label: 'Pacific Standard Time (PST)', category: 'North America' },
    { label: 'Alaska Standard Time (AKST)', category: 'North America' },
    { label: 'Hawaii-Aleutian Standard Time (HST)', category: 'North America' },
    
    // Europe
    { label: 'Greenwich Mean Time (GMT)', category: 'Europe' },
    { label: 'Central European Time (CET)', category: 'Europe' },
    { label: 'Eastern European Time (EET)', category: 'Europe' },
    { label: 'Western European Time (WET)', category: 'Europe' },
    
    // Asia
    { label: 'India Standard Time (IST)', category: 'Asia' },
    { label: 'China Standard Time (CST)', category: 'Asia' },
    { label: 'Japan Standard Time (JST)', category: 'Asia' },
    { label: 'Singapore Standard Time (SGT)', category: 'Asia' },
    { label: 'Gulf Standard Time (GST)', category: 'Asia' },
    { label: 'Korea Standard Time (KST)', category: 'Asia' },
    
    // Australia / Oceania
    { label: 'Australian Eastern Standard Time (AEST)', category: 'Australia / Oceania' },
    { label: 'Australian Central Standard Time (ACST)', category: 'Australia / Oceania' },
    { label: 'Australian Western Standard Time (AWST)', category: 'Australia / Oceania' },
    { label: 'New Zealand Standard Time (NZST)', category: 'Australia / Oceania' },
    
    // Africa
    { label: 'South Africa Standard Time (SAST)', category: 'Africa' },
    { label: 'East Africa Time (EAT)', category: 'Africa' },
    { label: 'West Africa Time (WAT)', category: 'Africa' },
    
    // South America
    { label: 'Brasilia Time (BRT)', category: 'South America' },
    { label: 'Argentina Time (ART)', category: 'South America' },
    
    // Middle East
    { label: 'Arabia Standard Time (AST)', category: 'Middle East' },
    { label: 'Israel Standard Time (IST)', category: 'Middle East' }
  ];

  for (const tz of timezones) {
    try {
      await db.lookupTimezone.create({
        data: {
          ...tz,
          isActive: true,
          isGovernanceLocked: true
        }
      });
      console.log(`Inserted ${tz.label}`);
    } catch (e: any) {
      console.error(`Failed to insert ${tz.label}:`, e.message);
    }
  }

  console.log("Timezone population complete.");
}

main().catch(console.error).finally(() => db.$disconnect());
