const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRoles() {
  const roles = await prisma.appRole.findMany({
    include: {
      _count: {
        select: { users: true }
      }
    }
  });
  console.log('Roles and User Counts:');
  console.log(JSON.stringify(roles, null, 2));

  const users = await prisma.appUser.findMany({
    include: {
      roles: true
    }
  });
  console.log('\nUsers and their Roles:');
  console.log(JSON.stringify(users.map(u => ({ email: u.email, roles: u.roles.map(r => r.name) })), null, 2));
}

checkRoles()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
