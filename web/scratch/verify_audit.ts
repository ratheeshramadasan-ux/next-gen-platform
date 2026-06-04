import { prisma } from "../src/lib/prisma";

async function testAudit() {
  console.log("--- Testing Reference Data Audit System ---");

  const testLabel = `Audit Test ${Date.now()}`;
  
  try {
    // 1. Create a new industry record (Application level)
    console.log(`[PRISMA] Creating test industry: ${testLabel}`);
    const newIndustry = await prisma.lookupIndustry.create({
      data: {
        label: testLabel,
        value: "AUDIT_TEST",
        icon: "Shield",
        isActive: true
      }
    });

    console.log(`[PRISMA] Created ID: ${newIndustry.id}`);

    // Wait 2 seconds for triggers and async logging to settle
    await new Promise(r => setTimeout(r, 2000));

    // 2. Fetch Audit Logs for this target
    console.log(`[PRISMA] Fetching audit logs for target: ${testLabel}`);
    const logs = await prisma.auditLog.findMany({
      where: {
        target: {
          contains: testLabel
        }
      },
      orderBy: { timestamp: "desc" }
    });

    console.log(`[AUDIT] Found ${logs.length} log entries.`);
    
    logs.forEach((log: any, i: number) => {
      console.log(`Log #${i+1}:`);
      console.log(`  Actor: ${log.actor}`);
      console.log(`  Action: ${log.action}`);
      console.log(`  Timestamp: ${log.timestamp}`);
      console.log(`  Details: ${log.details}`);
      console.log("---");
    });

    // 3. Cleanup
    await prisma.lookupIndustry.delete({ where: { id: newIndustry.id } });
    console.log("[CLEANUP] Test record deleted.");

  } catch (e) {
    console.error("Test failed:", e);
  }
}

testAudit();
