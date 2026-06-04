import { PrismaClient } from '../src/generated/prisma-client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/Users/ratheesh/next-gen-platform/.env' });

async function checkTable() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    const result = await prisma.$queryRaw`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'resources' AND table_schema = 'platform'
    `;
    console.log("Resources table columns:", result);
  } catch (e) {
    console.error("Error checking table:", e);
  } finally {
    await prisma.$disconnect();
  }
}

checkTable();
