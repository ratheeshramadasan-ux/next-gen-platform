const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.join(__dirname, "../../.env") });
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({ log: ['error'] });

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
