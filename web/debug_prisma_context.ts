
import { prisma } from "./src/lib/prisma";
import * as dotenv from 'dotenv';
import path from 'path';

async function main() {
  console.log("--- DEBUG CONTEXT ---");
  console.log("CWD:", process.cwd());
  
  // Checking .env files manually
  const rootEnv = path.join(__dirname, "../.env");
  const webEnv = path.join(__dirname, ".env");
  
  dotenv.config({ path: rootEnv });
  console.log("Root ENV DATABASE_URL:", process.env.DATABASE_URL);
  
  const industries = await prisma.lookupIndustry.count();
  const regions = await prisma.lookupRegion.count();
  
  console.log(`Industries found: ${industries}`);
  console.log(`Regions found: ${regions}`);

  if (industries > 0) {
    const samples = await prisma.lookupIndustry.findMany({ take: 3 });
    console.log("Sample Industries:", samples.map(s => s.label).join(", "));
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
