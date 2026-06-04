import { prisma } from "./src/lib/prisma";

async function main() {
  const providers = await prisma.identityProvider.findMany();
  console.log("Providers:", providers);
}

main();
