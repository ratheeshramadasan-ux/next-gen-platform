import { getPlatformLookups } from '../src/app/actions/lookupActions';
import * as dotenv from 'dotenv';
import path from 'path';

// Mirroring the lib/prisma.ts env loading
dotenv.config({ path: path.join(process.cwd(), '../.env') });
dotenv.config();

async function run() {
  console.log("Fetching and verifying platform lookups...");
  const res = await getPlatformLookups();
  console.log("Success Status:", res.success);
  
  if (res.success) {
    console.log("Counts Found:");
    console.log("- Industries:", res.industries?.length);
    console.log("- Regions:", res.regions?.length);
    console.log("- Currencies:", res.currencies?.length);
    console.log("- Timezones:", res.timezones?.length);
    console.log("- Customer Types:", res.customerTypes?.length);
    
    if (res.currencies?.length > 0) {
      console.log("\nFirst Currency Sample:", JSON.stringify(res.currencies[0], null, 2));
    }
  } else {
    console.error("Fetch failed. This is likely the root cause of the UI showing 'No records'.");
  }
}

run().catch(console.error);
