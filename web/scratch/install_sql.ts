import { prisma } from '../src/lib/prisma';
import fs from 'fs';
import path from 'path';

async function main() {
  const sql = fs.readFileSync(path.join(process.cwd(), 'scratch/create_folder_func.sql'), 'utf8');
  console.log('[SQL] Installing function...');
  await prisma.$executeRawUnsafe(sql);
  console.log('[SQL] Success!');
}

main().catch(e => {
  console.error('[SQL] Failed:', e);
  process.exit(1);
});
