import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customerId = searchParams.get("customerId");
  if (!customerId) return NextResponse.json({ mfa: null, session: null });

  try {
    const [mfa, session] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT id, customer_id as "customerId", tenant_id as "tenantId",
               is_enforced as "isEnforced", allowed_methods as "allowedMethods",
               grace_period_days as "gracePeriodDays", bypass_roles as "bypassRoles"
        FROM platform.mfa_policies
        WHERE customer_id = ${customerId}::uuid
        LIMIT 1
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, customer_id as "customerId",
               session_timeout_minutes as "sessionTimeoutMinutes",
               idle_timeout_minutes as "idleTimeoutMinutes",
               max_concurrent_sessions as "maxConcurrentSessions",
               require_device_trust as "requireDeviceTrust",
               allowed_ip_ranges as "allowedIpRanges",
               risk_based_auth_enabled as "riskBasedAuthEnabled"
        FROM platform.session_policies
        WHERE customer_id = ${customerId}::uuid
        LIMIT 1
      `,
    ]);

    return NextResponse.json({
      mfa: mfa[0] || null,
      session: session[0] || null,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, mfa: null, session: null }, { status: 500 });
  }
}
