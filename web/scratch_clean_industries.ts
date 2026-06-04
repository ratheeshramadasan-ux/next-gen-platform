import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env explicitly
dotenv.config({ path: path.join(__dirname, '../.env') });
console.log('Targeting:', process.env.DATABASE_URL);

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.lookupIndustry.deleteMany({});
  console.log(`Successfully purged ${result.count} industry records.`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
