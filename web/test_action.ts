
import { getPlatformLookups } from "./src/app/actions/lookupActions";

async function main() {
  console.log("Calling getPlatformLookups() Action...");
  const res = await getPlatformLookups();
  
  if (res.success) {
    console.log("SUCCESS!");
    console.log(`Industries: ${res.industries.length}`);
    console.log(`Regions: ${res.regions.length}`);
    
    if (res.regions.length > 0) {
      console.log("First Region:", res.regions[0].label);
    } else {
      console.log("REGIONS ARRAY IS EMPTY.");
    }
  } else {
    console.error("Action failed:", res);
  }
}

main().catch(console.error);
