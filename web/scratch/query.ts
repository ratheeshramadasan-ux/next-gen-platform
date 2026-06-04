import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });
const databaseUrl = process.env.DATABASE_URL;

const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } }, log: ['error'] });

async function check() {
  const c = await prisma.lookupIndustry.count();
  console.log("Industries count:", c);
  if (c === 0) {
     console.log("Adding some test industries...");
     await prisma.lookupIndustry.create({ data: { label: "Technology", value: "Technology", code: "TECH", isActive: true } });
     await prisma.lookupIndustry.create({ data: { label: "Finance", value: "Finance", code: "FIN", isActive: true } });
     console.log("Added test industries");
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
