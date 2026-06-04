import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Direct test using the SAME prisma client the app uses
export async function GET() {
  try {
    const industries = await prisma.lookupIndustry.findMany({ take: 3, orderBy: { label: "asc" } });
    const regions = await prisma.lookupRegion.findMany({ take: 3, orderBy: { label: "asc" } });
    const currencies = await prisma.lookupCurrency.findMany({ take: 3, orderBy: { label: "asc" } });
    const timezones = await prisma.lookupTimezone.findMany({ take: 3, orderBy: { label: "asc" } });
    const customerTypes = await prisma.lookupCustomerType.findMany({ take: 3 });
    const priorities = await prisma.lookupPriority.findMany({ take: 3 });

    const [ic, rc, cc, tc, ctc, pc] = await Promise.all([
      prisma.lookupIndustry.count(),
      prisma.lookupRegion.count(),
      prisma.lookupCurrency.count(),
      prisma.lookupTimezone.count(),
      prisma.lookupCustomerType.count(),
      prisma.lookupPriority.count(),
    ]);

    return NextResponse.json({
      counts: { industries: ic, regions: rc, currencies: cc, timezones: tc, customerTypes: ctc, priorities: pc },
      samples: { industries, regions, currencies, timezones, customerTypes, priorities }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, stack: e.stack?.slice(0, 500) }, { status: 500 });
  }
}
