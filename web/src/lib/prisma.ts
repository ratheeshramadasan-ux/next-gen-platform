import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

// Use absolute paths for environment variables to ensure stability across server contexts
dotenv.config({ path: '/Users/ratheesh/next-gen-platform/.env' });

const prismaClientSingleton = () => {
  const dbUrl = process.env.DATABASE_URL || "";
  console.log(`[PRISMA_INIT_V2] Establishing Connection: ${dbUrl.substring(0, 15)}... (Asset Support Enabled)`);
  
  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: ['error', 'warn'],
  });
};

declare global {
  var prisma_v2: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma_v2 ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma_v2 = prisma;
}

export const baseDb = prisma;
export { prisma };
export default prisma;

