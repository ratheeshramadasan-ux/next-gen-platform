import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("--- STUDIO WORKFLOW DATA CHECK ---");
  try {
    const workflows = await prisma.studioWorkflow.findMany();
    console.log(`Found ${workflows.length} workflows.`);
    workflows.forEach(w => {
      console.log(`ID: ${w.id}, ProjectId: ${w.projectId}`);
    });
  } catch (e: any) {
    console.error("FAILURE querying studioWorkflow:", e.message);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
