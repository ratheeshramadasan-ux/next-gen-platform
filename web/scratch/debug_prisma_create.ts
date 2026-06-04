import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function test() {
  console.log("Testing Create for REGION...");
  try {
    const res = await prisma.lookupRegion.create({
      data: {
        label: "Test Region " + Date.now(),
        value: "test_region_" + Date.now(),
        category: "Test Category",
        icon: "MapPin"
      }
    });
    console.log("Success:", res);
  } catch (e: any) {
    console.error("Prisma Error:", e);
    if (e.code) console.log("Error Code:", e.code);
    if (e.meta) console.log("Meta:", e.meta);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

test();
