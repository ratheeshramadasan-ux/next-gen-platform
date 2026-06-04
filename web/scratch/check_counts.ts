import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const workflows = await prisma.studioWorkflow.count();
  const projects = await prisma.project.count();
  const folders = await prisma.folder.count();
  console.log(JSON.stringify({ workflows, projects, folders }));
}
main();
