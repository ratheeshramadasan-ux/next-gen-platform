import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Preview before migrating
    const preview = await prisma.$queryRaw<any[]>`
      SELECT id, label, value, category FROM platform.lookup_timezones LIMIT 5
    `;
    return NextResponse.json({ preview });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    // Split label like "America/New_York (Eastern Time)" into:
    //   value  = "America/New_York"   (IANA identifier — the part BEFORE " (")
    //   label  = "Eastern Time"        (friendly name   — the part BETWEEN "(" and ")")
    // Records without parentheses are left unchanged
    const result = await prisma.$executeRaw`
      UPDATE platform.lookup_timezones
      SET
        value = TRIM(SPLIT_PART(label, ' (', 1)),
        label = TRIM(TRAILING ')' FROM TRIM(SPLIT_PART(label, ' (', 2)))
      WHERE label LIKE '% (%)'
    `;

    const sample = await prisma.$queryRaw<any[]>`
      SELECT label, value, category FROM platform.lookup_timezones ORDER BY category, label LIMIT 10
    `;

    return NextResponse.json({ success: true, rowsUpdated: result, sample });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
