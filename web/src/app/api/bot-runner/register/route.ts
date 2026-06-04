import { NextRequest, NextResponse } from "next/server";
import { registerOrActivateBotRunner } from "@/lib/services/bot-runner-portal";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── UAO-shaped payload (from @nextgen/universal-agent-object) ──
    // The new agent sends: { activationToken, identity: { ... } }
    // Legacy agents send flat fields directly.
    const isUAO = !!body.identity;

    const identity = isUAO ? body.identity : body;
    const runtime  = identity.runtime ?? {};

    const result = await registerOrActivateBotRunner({
      tenantId:        identity.tenantId        ?? body.tenantId,
      hostname:        runtime.hostname         ?? body.hostname,
      osType:          runtime.os               ?? identity.platform ?? body.osType,
      osVersion:       runtime.nodeVersion      ?? body.osVersion ?? null,
      ipAddress:       body.ipAddress           ?? null,
      macAddress:      body.macAddress          ?? null,
      fingerprint:     body.fingerprint         ?? identity.agentId ?? null,
      agentVersion:    identity.version         ?? body.agentVersion,
      runnerMode:      identity.platform        ?? body.runnerMode ?? null,
      activationToken: body.activationToken     ?? null,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          code: result.code,
          message: result.message,
          botHostId: result.botHostId ?? null,
        },
        { status: result.status },
      );
    }

    // Return a UAO-compatible response so the new agent can read agentId
    return NextResponse.json({
      ...result,
      agentId: result.botHostId,
      agentName: identity.agentName ?? result.botHostId,
      tenantId: identity.tenantId ?? body.tenantId,
      status: "ACTIVE",
      registeredAt: new Date().toISOString(),
      orchestratorWsUrl: `${process.env["NEXTGEN_PORTAL_URL"] ?? ""}/ws/agent`,
    });
  } catch (error: any) {
    console.error("Bot Runner register route failure:", error);
    return NextResponse.json(
      {
        code: "REGISTER_FAILED",
        message: error?.message ?? "Bot Runner registration failed.",
      },
      { status: 500 },
    );
  }
}

