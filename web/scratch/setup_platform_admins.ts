import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import * as dotenv from 'dotenv';

dotenv.config({ path: '/Users/ratheesh/next-gen-platform/.env' });

const dbUrl = process.env.DATABASE_URL || "";
const pool = new Pool({ connectionString: dbUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const groupName = "Platform Admin";
  const adminEmails = ["Ratheesh.ramadasan@gmail.com", "Lachureshmi6@gmail.com"];

  console.log(`Ensuring group "${groupName}" exists...`);
  
  const group = await prisma.appGroup.upsert({
    where: { name: groupName },
    update: {},
    create: {
      name: groupName,
      description: "Platform-wide Super Administrators",
    }
  });

  console.log(`Group ID: ${group.id}`);

  for (const email of adminEmails) {
    console.log(`Processing user: ${email}`);
    
    // Find or create user
    const user = await prisma.appUser.upsert({
      where: { email: email.toLowerCase() },
      update: { status: "active" },
      create: {
        email: email.toLowerCase(),
        fullName: email.split('@')[0],
        status: "active",
      }
    });

    console.log(`User ID: ${user.id}`);

    // Assign user to group
    await prisma.appGroup.update({
      where: { id: group.id },
      data: {
        users: {
          connect: { id: user.id }
        }
      }
    });

    console.log(`User ${email} assigned to ${groupName}`);
  }

  console.log("Super Admin group assignment complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
