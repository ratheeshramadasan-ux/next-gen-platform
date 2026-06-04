import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = dbUrl;

const prisma = new PrismaClient();

async function check() {
  try {
    console.log("Running raw query select 1...");
    const res = await prisma.$queryRaw`SELECT 1 as result`;
    console.log("Raw query result:", res);
    
    console.log("Fetching one industry...");
    const ind = await (prisma as any).lookupIndustry.findFirst();
    console.log("Industry:", ind);
  } catch (e) {
    console.error("FAILURE:", e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
