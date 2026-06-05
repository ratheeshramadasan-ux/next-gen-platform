import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { userId, ...updates } = body;
    
    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const currentSettings = await prisma.userPersonalization.findFirst({
      where: { userId }
    });

    if (!currentSettings) {
      return NextResponse.json({ error: "Preferences not found" }, { status: 404 });
    }

    const updated = await prisma.userPersonalization.update({
      where: { id: currentSettings.id },
      data: updates
    });

    return NextResponse.json({ success: true, personalization: updated });
  } catch (error: any) {
    console.error("Preferences API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
