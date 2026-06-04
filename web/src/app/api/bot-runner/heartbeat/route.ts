import { NextRequest, NextResponse } from "next/server";
import { heartbeatBotRunner } from "@/lib/services/bot-runner-portal";
import { prisma } from "@/lib/prisma";

async function getHeartbeatInterval(tenantId: string): Promise<number> {
  try {
    const cfg = await prisma.tenantConfig.findUnique({
      where: { tenantId_key: { tenantId, key: "HEARTBEAT_INTERVAL_SECONDS" } }
    });
    return cfg ? parseInt(cfg.value, 10) : 30;
  } catch {
    return 30;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── UAO-shaped heartbeat (from @nextgen/universal-agent-object) ──
    // New agent sends: { agentId, tenantId, status, timestamp, metrics, platform, version }
    // Legacy agent sends: { botHostId, fingerprint, agentVersion, sessionId }
    const isUAO = !!body.agentId && !body.botHostId;

    const result = await heartbeatBotRunner({
      botHostId:    isUAO ? body.agentId    : body.botHostId,
      sessionId:    body.sessionId          ?? null,
      fingerprint:  body.fingerprint        ?? body.agentId ?? null,
      agentVersion: isUAO ? body.version    : body.agentVersion,
    });

    if (!result.success) {
      return NextResponse.json(
        { code: result.code, message: result.message },
        { status: result.status },
      );
    }

    // Look up the configured interval for this host's tenant
    const tenantId = body.tenantId ?? null;
    const host = tenantId
      ? null
      : await prisma.botHost.findUnique({
          where: { id: isUAO ? body.agentId : body.botHostId },
          select: { tenantId: true }
        });

    const resolvedTenantId = tenantId ?? host?.tenantId ?? null;
    const nextIntervalSeconds = resolvedTenantId
      ? await getHeartbeatInterval(resolvedTenantId)
      : 30;

    return NextResponse.json({ ...result, nextIntervalSeconds });
  } catch (error: any) {
    console.error("Bot Runner heartbeat route failure:", error);
    return NextResponse.json(
      { code: "HEARTBEAT_FAILED", message: error?.message ?? "Bot Runner heartbeat failed." },
      { status: 500 },
    );
  }
}
