import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  const customer = await prisma.customer.findFirst({ where: { companyName: "Canada Life" } })
  console.log(customer?.createdBy)
}
main().catch(console.error).finally(() => prisma.$disconnect())
