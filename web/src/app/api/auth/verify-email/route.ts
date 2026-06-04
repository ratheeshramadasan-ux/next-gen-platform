import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: "Missing verification token" }, { status: 400 });
    }

    const user = await prisma.appUser.findFirst({
      where: { verificationToken: token }
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired verification token" }, { status: 400 });
    }

    // Verify email & clean up token
    await prisma.appUser.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
      }
    });

    // Optionally redirect to login or success page
    const customer = user.customerId ? await prisma.customer.findUnique({ where: { id: user.customerId } }) : null;
    
    if (customer && customer.slug) {
        return NextResponse.redirect(new URL(`/${customer.slug}/login?verified=true`, req.url));
    }

    return NextResponse.redirect(new URL('/login?verified=true', req.url));

  } catch (error) {
    console.error("Email Verification Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
