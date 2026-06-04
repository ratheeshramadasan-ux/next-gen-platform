import { getPlatformLookups } from "../src/app/actions/lookupActions";

async function main() {
  console.log("--- VERIFYING SERVER ACTION: getPlatformLookups ---");
  const res = await getPlatformLookups(true);
  if (res.success) {
    console.log("SUCCESS: Data retrieved from DB.");
    console.log(`Industries: ${res.industries.length}`);
    console.log(`Regions: ${res.regions.length}`);
    console.log(`Classifications: ${res.classifications.length}`);
    console.log(`Priorities: ${res.priorities.length}`);
    console.log(`Currencies: ${res.currencies.length}`);
    console.log(`Timezones: ${res.timezones.length}`);
    console.log(`CustomerTypes: ${res.customerTypes.length}`);
  } else {
    console.error("FAILURE:", res.error);
  }
}

main().catch(console.error);
