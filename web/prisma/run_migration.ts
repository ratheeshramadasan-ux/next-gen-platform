import { Client } from 'pg';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

// Load from project root .env
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '../.env') });

const connectionString = process.env.DATABASE_URL;

async function run() {
  if (!connectionString) {
    console.error("DATABASE_URL not found in environment.");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log("Connected. Reading migration script...");
    
    const sqlPath = path.join(__dirname, 'migrate_to_platform.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Executing migration. This may take a moment...");
    
    // Split by DO blocks or just run the whole thing
    // pg client can run multiple statements
    const res = await client.query(sql);
    
    console.log("Migration executed successfully.");
    
    // Log notices if any
    client.on('notice', (msg) => console.log('NOTICE:', msg.message));
    
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
