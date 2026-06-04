import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const customer = await prisma.customer.findFirst({
      where: { companyName: "Canada Life" }
    });
    return NextResponse.json(customer);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
