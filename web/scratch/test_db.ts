import { PrismaClient } from '@prisma/client';
import "dotenv/config";

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL
});

async function main() {
  try {
    console.log('Attempting to connect to PostgreSQL...');
    const count = await prisma.customer.count();
    console.log('Connection successful! Total customers: ' + count);
  } catch (e: any) {
    console.log('Connection failed!');
    console.log(e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
