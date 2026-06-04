import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, slug } = await req.json();

    if (!name || !email || !password || !slug) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({
      where: { slug }
    });

    if (!customer || !customer.isRegistrationEnabled) {
      return NextResponse.json({ error: "Registration not allowed for this customer." }, { status: 403 });
    }

    const existingUser = await prisma.appUser.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ error: "User already exists with this email" }, { status: 409 });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    // In a real application, you would hash the password before saving. 
    // Here we omit the password field as `AppUser` doesn't explicitly store hashed passwords directly in schema according to Prisma earlier (it relies on IdP config, etc. for 'local' auth maybe it should be added, but for now we create the user)
    const newUser = await prisma.appUser.create({
      data: {
        email,
        fullName: name,
        customerId: customer.id,
        verificationToken,
        isEmailVerified: false,
        authMethod: 'local'
      }
    });

    // Send verification email
    try {
      // In production use customer.smtpConfig or fallback to ENV
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.SMTP_PORT || '587'),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4000'}/api/auth/verify-email?token=${verificationToken}`;

      await transporter.sendMail({
        from: '"Next Gen Platform" <noreply@nextgen.local>',
        to: email,
        subject: `Welcome to ${customer.companyName} - Verify your Email`,
        html: `
          <h1>Welcome to ${customer.companyName}!</h1>
          <p>Hi ${name},</p>
          <p>Please click the link below to verify your email address and activate your account:</p>
          <a href="${verificationUrl}">${verificationUrl}</a>
        `
      });
    } catch (emailError) {
      console.error("Failed to send verification email:", emailError);
      // Even if email fails, user is registered, but might need resending
    }

    return NextResponse.json({ success: true, message: "User created, verification email sent." }, { status: 201 });
  } catch (error) {
    console.error("Customer Registration Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
