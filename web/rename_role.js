const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function renameRole() {
  console.log('Renaming Super Admin to Platform Admin...');
  
  // 1. Check if Super Admin exists
  const superAdmin = await prisma.appRole.findUnique({
    where: { name: 'Super Admin' }
  });

  if (superAdmin) {
    // 2. Rename it
    await prisma.appRole.update({
      where: { id: superAdmin.id },
      data: { name: 'Platform Admin' }
    });
    console.log('Successfully renamed Super Admin to Platform Admin');
  } else {
    console.log('Super Admin role not found. Checking if Platform Admin already exists...');
    const platformAdmin = await prisma.appRole.findUnique({
      where: { name: 'Platform Admin' }
    });
    if (platformAdmin) {
      console.log('Platform Admin already exists.');
    } else {
      console.log('Neither Super Admin nor Platform Admin found. You may need to run seed.');
    }
  }

  // 3. Count users for Platform Admin
  const finalRole = await prisma.appRole.findUnique({
    where: { name: 'Platform Admin' },
    include: {
      _count: {
        select: { users: true }
      }
    }
  });

  if (finalRole) {
    console.log(`Platform Admin has ${finalRole._count.users} managed principals.`);
  }
}

renameRole()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
