import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- STARTING COMPREHENSIVE DATA PURGE ---");

  try {
    const models = [
      "folderPermission", "studioVariable", "studioArgument", "studioConnection", "studioNode", 
      "studioExecutionLog", "studioWorkflow", "asset", "project", "folder", "workspace",
      "automationExecutionLog", "automationStep", "automationWorkflow", "automationComponent",
      "groupMapping", "appGroup", "appRole", "appUser", "securityCredential",
      "tenantConfig", "tenantService", "botHost", "workflowQueue", "studioJob", "tenant",
      "customerLogFile", "auditLog", "tenantAdmin", "smtpConfig", "customer", "resource"
    ];

    for (const model of models) {
      if (prisma[model]) {
        console.log(`Purging ${model}...`);
        await prisma[model].deleteMany({});
      } else {
        console.warn(`Model ${model} not found in PrismaClient, skipping.`);
      }
    }

    console.log("--- PURGE COMPLETED SUCCESSFULLY ---");
  } catch (error) {
    console.error("--- PURGE FAILED ---");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
