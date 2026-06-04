import { prisma } from '../src/lib/prisma';
import 'dotenv/config';

async function diagnose() {
  console.log("--- APP PRISMA DIAGNOSIS ---");
  try {
    const industries = await prisma.lookupIndustry.findMany();
    console.log(`Industries found via app prisma: ${industries.length}`);
    if (industries.length > 0) {
      console.log(`Example: ${industries[0].label}`);
    } else {
      console.log("NO INDUSTRIES FOUND via app prisma.");
      // Check if it's looking at public still?
      // Prisma doesn't easily show the raw SQL without middleware/logging
    }
  } catch (e: any) {
    console.error("DIAGNOSIS FAILED:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
