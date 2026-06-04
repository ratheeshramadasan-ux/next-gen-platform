
import { prisma } from "./src/lib/prisma";

async function main() {
  const dbInfo: any = await prisma.$queryRaw`SELECT inet_server_addr() as addr, inet_server_port() as port, current_database() as db`;
  console.log("DB Connection Info:", dbInfo);
}

main().catch(console.error).finally(() => prisma.$disconnect());
