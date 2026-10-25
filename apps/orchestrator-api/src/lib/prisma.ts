import { PrismaClient } from "../../../../web/src/generated/prisma-client/index.js";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

let prismaInstance: PrismaClient | null = null;

export function getPrisma(): PrismaClient {
  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:5432/postgres";
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    prismaInstance = new PrismaClient({ adapter });
  }
  return prismaInstance;
}

export const prisma: PrismaClient = new Proxy({} as any, {
  get(_target, prop) {
    return (getPrisma() as any)[prop];
  }
});
