import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const customers = await prisma.customer.findMany();
    return NextResponse.json({ success: true, count: customers.length, data: customers });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}
