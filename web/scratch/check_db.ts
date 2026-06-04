import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });
dotenv.config();

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("DATABASE_URL not found in environment");
  process.exit(1);
}

// Ensure the environment variable is globally available for the engine
process.env.DATABASE_URL = dbUrl;

const prisma = new PrismaClient();

async function check() {
  try {
    const industries = await prisma.lookupIndustry.count();
    const customers = await prisma.customer.count();
    console.log(`Industries: ${industries}`);
    console.log(`Customers: ${customers}`);
  } catch (e) {
    console.error(e);
  } finally {
    await prisma.$disconnect();
  }
}

check();
