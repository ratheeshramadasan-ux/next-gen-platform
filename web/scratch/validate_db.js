const { PrismaClient } = require('@prisma/client');
const { PrismaMssql } = require('@prisma/adapter-mssql');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL || "";
const adapter = new PrismaMssql(connectionString);
const prisma = new PrismaClient({ adapter });

async function validate() {
  console.log("-----------------------------------------");
  console.log("MSSQL Connection Validation Utility");
  console.log("-----------------------------------------");
  console.log(`Target URL: ${connectionString.split(';password=')[0]}...`);
  
  try {
    const start = Date.now();
    await prisma.$connect();
    const end = Date.now();
    console.log(`[SUCCESS] Connected to MSSQL in ${end - start}ms`);
    
    const count = await prisma.customer.count();
    console.log(`[SUCCESS] Verified 'Customer' table. Record count: ${count}`);
    
    // Check if seed data exists
    if (count > 0) {
      const first = await prisma.customer.findFirst({
        select: { companyName: true }
      });
      console.log(`[DATA] Sample Record: ${first.companyName}`);
    } else {
      console.warn("[WARNING] Database is reachable but appears to be empty.");
    }

  } catch (e) {
    console.error("[FAILURE] Database connection failed.");
    console.error("Error Name:", e.name);
    console.error("Error Message:", e.message);
    if (e.message.includes("Login failed")) {
      console.error("Recommendation: Check credentials in .env");
    } else if (e.message.includes("ENOTFOUND") || e.message.includes("ETIMEDOUT")) {
      console.error("Recommendation: Ensure the SQL Server is running and port 1434 is open.");
    }
  } finally {
    await prisma.$disconnect();
    console.log("-----------------------------------------");
  }
}

validate();
