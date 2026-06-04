import { db } from '../src/lib/prisma';

async function main() {
  const result = await db.$queryRawUnsafe(`
    SELECT trigger_name, event_manipulation, action_statement, action_timing
    FROM information_schema.triggers
    WHERE event_object_schema = 'platform' AND event_object_table = 'folders';
  `);
  console.log(JSON.stringify(result, null, 2));
}

main().finally(() => db.$disconnect());
