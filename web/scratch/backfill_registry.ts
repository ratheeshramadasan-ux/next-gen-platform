import { prisma } from '../src/lib/prisma';

async function backfill() {
  console.log('[BACKFILL] Starting Registry Backfill for Projects & Workflows...');

  // 1. Projects
  const projects = await prisma.project.findMany({
    where: { resourceId: null }
  });
  console.log(`[BACKFILL] Found ${projects.length} unregistered Projects.`);

  for (const project of projects) {
    try {
      await prisma.$transaction(async (tx) => {
        const resource = await tx.resource.create({
          data: {
            resourceType: "PROJECT",
            name: project.name,
            ownerId: project.ownerId,
            tenantId: project.tenantId
          }
        });
        await tx.project.update({
          where: { id: project.id },
          data: { resourceId: resource.id }
        });
      });
      console.log(`[BACKFILL]   + Registered Project: ${project.name}`);
    } catch (e: any) {
      console.error(`[BACKFILL]   ! Failed Project ${project.name}: ${e.message}`);
    }
  }

  // 2. Studio Workflows
  const workflows = await prisma.studioWorkflow.findMany({
    where: { resourceId: null }
  });
  console.log(`[BACKFILL] Found ${workflows.length} unregistered Workflows.`);

  for (const wf of workflows) {
    try {
      const project = await prisma.project.findUnique({
        where: { id: wf.projectId },
        select: { tenantId: true, ownerId: true }
      });
      if (!project) continue;

      await prisma.$transaction(async (tx) => {
        const resource = await tx.resource.create({
          data: {
            resourceType: "STUDIO_WORKFLOW",
            name: wf.name,
            ownerId: project.ownerId,
            tenantId: project.tenantId
          }
        });
        await tx.studioWorkflow.update({
          where: { id: wf.id },
          data: { resourceId: resource.id }
        });
      });
      console.log(`[BACKFILL]   + Registered Workflow: ${wf.name}`);
    } catch (e: any) {
      console.error(`[BACKFILL]   ! Failed Workflow ${wf.name}: ${e.message}`);
    }
  }

  console.log('[BACKFILL] Registry Backfill Complete.');
}

backfill().catch(console.error);
