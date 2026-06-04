"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import nodemailer from "nodemailer";
import { createAuditLog } from "./tenantActions";

/**
 * Placeholder Encryption (In production, use a dedicated KMS or env-managed secret)
 */
const ENCRYPTION_KEY = process.env.SMTP_SECRET || "nextgen-platform-master-key-32ch"; 

function encrypt(text: string) {
  // Mock encryption: Base64 + Simple Prefix
  return `enc:${Buffer.from(text).toString("base64")}`;
}

function decrypt(text: string) {
  if (!text.startsWith("enc:")) return text;
  return Buffer.from(text.replace("enc:", ""), "base64").toString("utf-8");
}

export async function getSmtpConfig(customerId?: string | null) {
  try {
    const effectiveCustomerId = customerId && customerId !== "null" ? customerId : null;

    // 1. Try to find customer-specific config
    if (effectiveCustomerId) {
      const customerConfig = await prisma.smtpConfig.findUnique({
        where: { customerId: effectiveCustomerId }
      });
      if (customerConfig) {
        return { 
          ...customerConfig, 
          password: decrypt(customerConfig.password || ""),
          isOverride: true 
        };
      }
    }

    // 2. Fallback to Platform Default
    const defaultConfig = await prisma.smtpConfig.findFirst({
      where: { isDefault: true }
    });

    if (!defaultConfig) return null;

    return { 
      ...defaultConfig, 
      password: decrypt(defaultConfig.password || ""),
      isOverride: false 
    };
  } catch (error) {
    console.error("Error fetching SMTP config:", error);
    return null;
  }
}

export async function saveSmtpConfig(data: {
  id?: string;
  host: string;
  port: number;
  username?: string;
  password?: string;
  secure: boolean;
  fromEmail: string;
  fromName?: string;
  customerId?: string | null;
  isDefault?: boolean;
}, actorEmail: string = "System Operator") {
  try {
    const effectiveCustomerId = data.customerId && data.customerId !== "null" ? data.customerId : null;
    const encryptedPassword = data.password ? encrypt(data.password) : undefined;
    
    // Determine a stable lookup key
    let existingRecord: any = null;
    if (effectiveCustomerId) {
      existingRecord = await prisma.smtpConfig.findUnique({ where: { customerId: effectiveCustomerId } });
    } else {
      existingRecord = await prisma.smtpConfig.findFirst({ where: { isDefault: true } });
    }

    // If we have an existing record, update it. Otherwise create.
    const config = existingRecord
      ? await prisma.smtpConfig.update({
          where: { id: existingRecord.id },
          data: {
            host: data.host,
            port: data.port,
            username: data.username || null,
            password: encryptedPassword,
            secure: data.secure,
            fromEmail: data.fromEmail,
            fromName: data.fromName || null,
            isDefault: effectiveCustomerId ? false : true, // Platform default is only for null customerId
          }
        })
      : await prisma.smtpConfig.create({
          data: {
            host: data.host,
            port: data.port,
            username: data.username || null,
            password: encryptedPassword,
            secure: data.secure,
            fromEmail: data.fromEmail,
            fromName: data.fromName || null,
            isDefault: effectiveCustomerId ? false : true,
            customerId: effectiveCustomerId,
          }
        });

    const targetType = effectiveCustomerId ? `Customer [${effectiveCustomerId}] Override` : "Platform Global Settings";
    await createAuditLog(
      actorEmail,
      existingRecord ? "UPDATE_SMTP_CONFIG" : "CREATE_SMTP_CONFIG",
      `${data.host}:${data.port}`,
      JSON.stringify({
        targetScope: targetType,
        host: data.host,
        port: data.port,
        secure: data.secure,
        fromEmail: data.fromEmail,
        fromName: data.fromName || "—",
        username: data.username || "—"
      })
    );

    revalidatePath("/next-gen/admin/access");
    return { success: true, config };
  } catch (error) {
    console.error("Error saving SMTP config:", error);
    return { success: false, error: "Database operation failed. Ensure all required fields are valid." };
  }
}

export async function restorePlatformSmtpDefault(customerId: string, actorEmail: string = "System Operator") {
  try {
    const isGlobalReset = customerId === "__platform_global__";
    
    const targetRecord = isGlobalReset
      ? await prisma.smtpConfig.findFirst({ where: { isDefault: true } })
      : await prisma.smtpConfig.findFirst({ where: { customerId: customerId } });

    if (targetRecord) {
      await prisma.smtpConfig.delete({
        where: { id: targetRecord.id }
      });

      await createAuditLog(
        actorEmail,
        isGlobalReset ? "RESET_SMTP_CONFIG" : "RESTORE_SMTP_DEFAULT",
        isGlobalReset ? "Platform Global" : `Customer [${customerId}]`,
        JSON.stringify({ 
          targetScope: isGlobalReset ? "Global platform configuration wiped" : `Customer [${customerId}] reverted to global protocol`,
          previousHost: targetRecord.host,
          previousPort: targetRecord.port
        })
      );
    }
    
    revalidatePath("/next-gen/admin/access");
    return { success: true };
  } catch (e) {
    console.error("Failed to restore SMTP:", e);
    return { success: false };
  }
}

export async function testSmtpConnection(data: any, targetEmail: string) {
  try {
    const portNum = Number(data.port);
    const useDirectTLS = portNum === 465;

    // 1. Establish Transporter with properly aligned TLS expectation protocols
    const transporter = nodemailer.createTransport({
      host: data.host,
      port: portNum,
      secure: useDirectTLS, // Automatically forces direct TLS for 465, STARTTLS (secure: false) for others
      auth: (data.username && data.password) ? {
        user: data.username,
        pass: data.password // The UI sends the raw typed password, or the decrypted loaded password
      } : undefined,
    });

    // 2. Verify handshake
    await transporter.verify();

    // 3. Dispatch validation email
    const configuredRecipient = data.fromEmail || data.username || targetEmail;
    await transporter.sendMail({
      from: `"${data.fromName || 'Next Gen Automation'}" <${data.fromEmail}>`,
      to: configuredRecipient,
      subject: "Welcome to Next Gen — SMTP Integration Established",
      html: `
        <div style="font-family: 'Inter', system-ui, -apple-system, sans-serif; padding: 40px; background-color: #f7f9fc; border-radius: 16px; border: 1px solid #e2e8f0; max-width: 650px; margin: 0 auto; color: #1e293b;">
          <div style="text-align: center; margin-bottom: 30px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background-color: #2563eb; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; margin-bottom: 15px;">
              &#10003;
            </div>
            <h1 style="color: #0f172a; margin: 0; font-size: 24px; font-weight: 800;">SMTP Service Successfully Connected</h1>
          </div>
          
          <p style="font-size: 15px; line-height: 1.6; color: #475569; margin-bottom: 25px;">
            This email address has been formally verified and integrated as the official outbound communications relay for the <strong>Next Gen Platform</strong>. Your orchestration engine is now fully authorized to dispatch system alerts, workflow notifications, and security protocols through this gateway.
          </p>

          <div style="background-color: #ffffff; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0; margin: 30px 0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <h3 style="margin-top: 0; margin-bottom: 15px; color: #0f172a; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Configuration Summary</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600; width: 40%;">Configured By (Operator)</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${targetEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Platform Environment</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${data.customerId ? 'Customer Dedicated Tenant' : 'Platform Global Master'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Target Gateway</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${data.host}:${data.port}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b; font-weight: 600;">Transport Layer Security</td>
                <td style="padding: 8px 0; color: #0f172a; font-weight: 700;">${useDirectTLS ? 'Strict TLS (Port 465)' : 'STARTTLS Engine Assumed'}</td>
              </tr>
            </table>
          </div>

          <p style="font-size: 14px; color: #64748b; line-height: 1.6; text-align: center;">
            No further action is required. If this configuration was not authorized by your security team, please revoke the App Password or API Key immediately via your provider vault.
          </p>

          <hr style="border: none; border-top: 1px dashed #cbd5e1; margin: 30px 0;" />
          <div style="text-align: center;">
            <p style="font-size: 11px; color: #94a3b8; margin: 0; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700;">
              Next Gen Autonomous Operations
            </p>
          </div>
        </div>
      `
    });

    await createAuditLog(
      targetEmail,
      "TEST_SMTP_CONNECTION",
      data.host,
      JSON.stringify({ port: portNum, secure: useDirectTLS, status: "Success", sentTo: configuredRecipient })
    );

    return { success: true, message: `Connection verified. Platform confirmation dispatched to ${configuredRecipient}.` };
  } catch (error: any) {
    console.error("SMTP Test Failed:", error);
    
    await createAuditLog(
      targetEmail,
      "TEST_SMTP_CONNECTION",
      data.host,
      JSON.stringify({ port: Number(data.port), secure: Number(data.port) === 465, status: "Failure", reason: error.message || "Gateway unreachable" })
    );

    return { success: false, error: error.message || "Gateway unreachable or authentication rejected." };
  }
}
