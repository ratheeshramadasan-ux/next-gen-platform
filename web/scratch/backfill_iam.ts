import { prisma } from '../src/lib/prisma';

async function backfillIAM() {
  console.log('[BACKFILL-IAM] Starting Registry Sync for Roles & Groups...');

  // 1. Roles
  const roles = await prisma.appRole.findMany({
    where: { resourceId: null }
  });
  console.log(`[BACKFILL-IAM] Found ${roles.length} unregistered Roles.`);

  for (const role of roles) {
    try {
      await prisma.$transaction(async (tx) => {
        const resource = await tx.resource.create({
          data: {
            resourceType: "IAM_ROLE",
            name: role.name,
            status: "ACTIVE"
          }
        });
        await tx.appRole.update({
          where: { id: role.id },
          data: { resourceId: resource.id }
        });
      });
      console.log(`[BACKFILL-IAM]   + Registered Role: ${role.name}`);
    } catch (e: any) {
      console.error(`[BACKFILL-IAM]   ! Failed Role ${role.name}: ${e.message}`);
    }
  }

  // 2. Groups
  const groups = await prisma.appGroup.findMany({
    where: { resourceId: null }
  });
  console.log(`[BACKFILL-IAM] Found ${groups.length} unregistered Groups.`);

  for (const group of groups) {
    try {
      await prisma.$transaction(async (tx) => {
        const resource = await tx.resource.create({
          data: {
            resourceType: "IAM_GROUP",
            name: group.name,
            status: "ACTIVE"
          }
        });
        await tx.appGroup.update({
          where: { id: group.id },
          data: { resourceId: resource.id }
        });
      });
      console.log(`[BACKFILL-IAM]   + Registered Group: ${group.name}`);
    } catch (e: any) {
      console.error(`[BACKFILL-IAM]   ! Failed Group ${group.name}: ${e.message}`);
    }
  }

  console.log('[BACKFILL-IAM] IAM Registry Sync Complete.');
}

backfillIAM().catch(console.error);
