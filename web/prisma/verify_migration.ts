import { Client } from 'pg';
import path from 'path';
import 'dotenv/config';

// Load from project root .env
import * as dotenv from 'dotenv';
dotenv.config({ path: path.join(process.cwd(), '../.env') });

const connectionString = process.env.DATABASE_URL;

async function verify() {
  if (!connectionString) {
    console.error("DATABASE_URL not found in environment.");
    process.exit(1);
  }

  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const tables = [
      'lookup_industries', 'lookup_regions', 'lookup_currencies', 
      'lookup_timezones', 'lookup_customer_types', 'users', 'customers'
    ];

    console.log("--- VERIFYING PLATFORM SCHEMA ---");
    for (const table of tables) {
      const res = await client.query(`SELECT count(*) FROM platform.${table}`);
      console.log(`platform.${table}: ${res.rows[0].count} rows`);
    }

    console.log("\n--- CHECKING PUBLIC SCHEMA CLEANUP ---");
    for (const table of tables) {
      try {
        const res = await client.query(`SELECT count(*) FROM public.${table}`);
        console.log(`public.${table}: ${res.rows[0].count} rows (STILL EXISTS!)`);
      } catch (e) {
        console.log(`public.${table}: NOT FOUND (Cleanup successful)`);
      }
    }
    
  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await client.end();
  }
}

verify();
