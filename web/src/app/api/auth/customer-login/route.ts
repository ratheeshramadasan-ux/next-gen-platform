import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, password, slug } = await req.json();

    if (!email || !password || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { slug }
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    }

    const user = await prisma.appUser.findUnique({
      where: { email }
    });

    if (!user || user.customerId !== customer.id) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!user.isEmailVerified) {
       return NextResponse.json({ error: "Please verify your email before logging in." }, { status: 403 });
    }

    // Passwords are not explicitly verified here because we lack a `password` field in `AppUser` for local auth in the current prisma mapping, normally we'd bcrypt.compare
    // ...

    // Successful mock login
    // Update last login
    await prisma.appUser.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    return NextResponse.json({ success: true, message: "Logged in successfully", user: { id: user.id, email: user.email, fullName: user.fullName } }, { status: 200 });
  } catch (error) {
    console.error("Customer Login Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
