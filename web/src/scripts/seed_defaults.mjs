import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import * as dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- SEEDING SYSTEM DEFAULTS ---");

  const customer = await prisma.customer.create({
    data: {
      companyName: "Main Enterprise Corp",
      industry: "Technology",
      location: "New York",
      status: "Active",
      displayName: "Main Enterprise"
    }
  });
  console.log("Created Customer:", customer.id);

  const tenant = await prisma.tenant.create({
    data: {
      name: "Default Production",
      code: "PROD-001",
      type: "PRODUCTION",
      status: "Active",
      customerId: customer.id
    }
  });
  console.log("Created Tenant:", tenant.id);

  const user = await prisma.appUser.create({
    data: {
      email: "ratheesh@platform.com",
      fullName: "Ratheesh Admin",
      status: "Active",
      customerId: customer.id,
      tenantId: tenant.id
    }
  });
  console.log("Created User:", user.id);

  const workspace = await prisma.workspace.create({
    data: {
      name: "Default Workspace",
      tenantId: tenant.id,
      customerId: customer.id,
      isGovernanceLocked: false
    }
  });
  console.log("Created Workspace:", workspace.id);

  // Create a root folder
  const resource = await prisma.resource.create({
    data: {
      resourceType: "FOLDER",
      name: "Root",
      tenantId: tenant.id,
      ownerId: customer.id
    }
  });

  const folder = await prisma.folder.create({
    data: {
      name: "Workflow Builder",
      resourceId: resource.id,
      workspaceId: workspace.id,
      tenantId: tenant.id,
      customerId: customer.id,
      level: 0,
      path: "/Workflow Builder"
    }
  });
  console.log("Created Root Folder:", folder.id);

  console.log("--- SEEDING COMPLETED ---");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
