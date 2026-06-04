import nodemailer from "nodemailer";
import { getSmtpConfig } from "@/app/actions/settingsActions";

const PLATFORM_BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export class EmailService {
  private static async getTransporter(customerId?: string | null) {
    const config = await getSmtpConfig(customerId);
    
    if (!config) {
      console.warn("[EMAIL SERVICE] No SMTP configuration found. Falling back to console log.");
      return null;
    }

    return nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password,
      },
    });
  }

  static async sendEmail(options: { 
    to: string, 
    subject: string, 
    body: string, 
    customerId?: string | null 
  }) {
    const { to, subject, body, customerId } = options;
    const config = await getSmtpConfig(customerId);
    const transporter = await this.getTransporter(customerId);

    if (!transporter) {
      console.log(`[EMAIL MOCK] To: ${to} | Subject: ${subject} | Body: ${body}`);
      return { success: true, mock: true };
    }

    try {
      await transporter.sendMail({
        from: `"${config.fromName || 'Platform Support'}" <${config.fromEmail}>`,
        to,
        subject,
        html: body,
      });
      return { success: true };
    } catch (error) {
      console.error("[EMAIL SERVICE] Failed to send email:", error);
      return { success: false, error };
    }
  }

  /**
   * Send activation email to a newly onboarded admin with a customer-specific activation URL.
   * This is the primary identity verification email sent during customer onboarding.
   */
  static async sendAdminActivation(params: {
    email: string;
    firstName: string;
    lastName: string;
    organization: string;
    activationToken: string;
    customerSlug?: string | null;
    customerId: string;
  }) {
    const { email, firstName, lastName, organization, activationToken, customerSlug, customerId } = params;
    const fullName = `${firstName} ${lastName}`;
    
    // Build customer-specific activation URL
    const activationUrl = customerSlug
      ? `${PLATFORM_BASE_URL}/activate/${customerSlug}?token=${activationToken}`
      : `${PLATFORM_BASE_URL}/activate?token=${activationToken}&org=${customerId}`;

    console.log(`[EMAIL SERVICE] Dispatching Activation Email → ${email} | Token: ${activationToken} | URL: ${activationUrl}`);

    const body = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0b; color: #e4e4e7; border-radius: 12px; overflow: hidden;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #18181b 0%, #27272a 100%); padding: 40px 32px 32px; text-align: center; border-bottom: 1px solid #3f3f46;">
          <div style="width: 56px; height: 56px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border-radius: 14px; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 24px; font-weight: 800; color: white;">⚡</span>
          </div>
          <h1 style="margin: 0 0 8px; font-size: 22px; font-weight: 700; color: #fafafa; letter-spacing: -0.02em;">Identity Activation Required</h1>
          <p style="margin: 0; font-size: 13px; color: #a1a1aa; font-weight: 500;">NextGen Automation Platform • Secure Onboarding</p>
        </div>

        <!-- Body -->
        <div style="padding: 32px;">
          <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8; margin: 0 0 24px;">
            Hello <strong style="color: #fafafa;">${fullName}</strong>,
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8; margin: 0 0 24px;">
            You have been provisioned as an <strong style="color: #fafafa;">Administrator</strong> for 
            <strong style="color: #a78bfa;">${organization}</strong> on the NextGen Automation Platform.
          </p>
          <p style="font-size: 15px; line-height: 1.6; color: #d4d4d8; margin: 0 0 28px;">
            To complete your identity verification and activate your account, click the button below:
          </p>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 0 0 28px;">
            <a href="${activationUrl}" 
               style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 10px; font-size: 14px; font-weight: 700; letter-spacing: 0.02em; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4);">
              Activate My Account
            </a>
          </div>

          <!-- Activation Link Fallback -->
          <div style="background: #18181b; border: 1px solid #3f3f46; border-radius: 8px; padding: 16px; margin: 0 0 28px;">
            <p style="font-size: 11px; color: #71717a; margin: 0 0 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;">
              Or copy and paste this link into your browser:
            </p>
            <p style="font-size: 13px; color: #a78bfa; margin: 0; word-break: break-all; font-family: monospace;">
              ${activationUrl}
            </p>
          </div>

          <!-- Security Notice -->
          <div style="background: #1c1917; border: 1px solid #44403c; border-radius: 8px; padding: 16px; margin: 0 0 24px;">
            <p style="font-size: 12px; color: #a8a29e; margin: 0; line-height: 1.5;">
              🔒 <strong style="color: #d6d3d1;">Security Notice:</strong> This activation link is unique to your identity and expires after first use. 
              If you did not request this access, please disregard this email and notify your organization's security team immediately.
            </p>
          </div>

          <p style="font-size: 13px; color: #71717a; margin: 0; line-height: 1.5;">
            Organization: <strong style="color: #a1a1aa;">${organization}</strong><br/>
            Account: <strong style="color: #a1a1aa;">${email}</strong>
          </p>
        </div>

        <!-- Footer -->
        <div style="padding: 20px 32px; border-top: 1px solid #27272a; text-align: center;">
          <p style="font-size: 11px; color: #52525b; margin: 0; font-weight: 500;">
            NextGen Automation Platform — Enterprise Governance Engine<br/>
            This is an automated message. Do not reply directly.
          </p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: email,
      subject: `[Action Required] Activate Your Administrator Account — ${organization}`,
      body,
      customerId
    });
  }

  static async sendOnboardingValidation(email: string, name: string, organization: string) {
    return this.sendEmail({
      to: email,
      subject: "Action Required: Validate Your Organization Onboarding",
      body: `<h1>Welcome ${name}</h1><p>Please validate the onboarding for <b>${organization}</b>.</p>`
    });
  }

  static async sendOrganizationWelcome(email: string, organization: string) {
    return this.sendEmail({
      to: email,
      subject: `Welcome to ${organization}`,
      body: `<h1>Welcome!</h1><p>Your organization <b>${organization}</b> is now active on the platform.</p>`
    });
  }

  static async sendTenantProvisionedNotification(email: string, tenantName: string, customerId: string) {
    return this.sendEmail({
      to: email,
      subject: `Environment Provisioned: ${tenantName}`,
      body: `<h1>Provisioning Complete</h1><p>The environment <b>${tenantName}</b> has been successfully provisioned.</p>`,
      customerId
    });
  }
}
