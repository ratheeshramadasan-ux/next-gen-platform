import db from '../src/lib/prisma';

async function main() {
  const result = await db.$queryRawUnsafe(`
    SELECT routine_name 
    FROM information_schema.routines 
    WHERE routine_schema = 'platform' AND routine_name = 'create_folder';
  `);
  console.log(JSON.stringify(result, null, 2));
}

main().finally(() => db.$disconnect());
