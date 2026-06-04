import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function check() {
  console.log("Direct DB Check...");
  try {
    const counts = {
      industries: await (prisma as any).lookupIndustry.count(),
      regions: await (prisma as any).lookupRegion.count(),
      currencies: await (prisma as any).lookupCurrency.count(),
      customerTypes: await (prisma as any).lookupCustomerType.count()
    };
    console.log("Counts:", counts);
    
    if (counts.currencies > 0) {
      const currencies = await (prisma as any).lookupCurrency.findMany();
      console.log("Sample Currency:", currencies[0]);
    }
  } catch (e) {
    console.error("Error during check:", e);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

check();
