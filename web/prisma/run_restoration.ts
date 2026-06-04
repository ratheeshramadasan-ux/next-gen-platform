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
    console.log("Connected. Reading restoration script...");
    
    // Listen for notices
    client.on('notice', (msg) => console.log('NOTICE:', msg.message));

    const sqlPath = path.join(__dirname, 'restore_old_data.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log("Executing restoration. This may take a moment...");
    await client.query(sql);
    
    console.log("Restoration executed successfully.");
    
  } catch (err) {
    console.error("Restoration failed:", err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
