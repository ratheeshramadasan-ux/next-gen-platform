
import { prisma } from "./src/lib/prisma";

async function main() {
  const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_schema(), current_user`;
  console.log("DB Context:", dbInfo);
}

main().catch(console.error).finally(() => prisma.$disconnect());
