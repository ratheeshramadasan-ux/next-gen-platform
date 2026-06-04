import type { Request, Response } from "express";
import { registerOrActivateBotRunner, heartbeatBotRunner, fetchNextBotRunnerJob } from "../services/bot-runner-portal.js";

export async function registerRoute(req: Request, res: Response) {
  try {
    const body = req.body;
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
      return res.status(result.status || 400).json({
        code: result.code,
        message: result.message,
        botHostId: result.botHostId ?? null,
      });
    }

    return res.status(200).json({
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
    return res.status(500).json({
      code: "REGISTER_FAILED",
      message: error?.message ?? "Bot Runner registration failed.",
    });
  }
}

export async function heartbeatRoute(req: Request, res: Response) {
  try {
    const result = await heartbeatBotRunner(req.body);
    if (!result.success) {
      return res.status(result.status || 400).json({
        code: result.code,
        message: result.message,
      });
    }
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      code: "HEARTBEAT_FAILED",
      message: error?.message ?? "Heartbeat failed."
    });
  }
}

export async function jobsNextRoute(req: Request, res: Response) {
  try {
    const result = await fetchNextBotRunnerJob(req.body);
    if (!result.success) {
      return res.status(result.status || 400).json({
        code: result.code,
        message: result.message,
      });
    }
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({
      code: "FETCH_JOB_FAILED",
      message: error?.message ?? "Failed to fetch next job."
    });
  }
}
