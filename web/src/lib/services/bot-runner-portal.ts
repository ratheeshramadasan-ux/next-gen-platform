import { createHash, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { CAService } from "@/lib/services/CAService";

type RegisterPayload = {
  tenantId: string;
  hostname: string;
  osType: string;
  osVersion?: string | null;
  ipAddress?: string | null;
  macAddress?: string | null;
  fingerprint: string;
  agentVersion: string;
  runnerMode?: string | null;
  activationToken?: string | null;
};

type HeartbeatPayload = {
  botHostId: string;
  sessionId?: string | null;
  fingerprint: string;
  agentVersion: string;
};

function buildActivationToken() {
  return randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}

function normalizeHostStatus(status: string | null | undefined) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "active" || normalized === "online") return "Online";
  if (normalized === "disabled") return "Disabled";
  if (normalized === "registered" || normalized === "validated") return "Registered";
  return "Offline";
}

async function writeAuditLog(action: string, target: string, details: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({
      data: {
        actor: "Bot Runner Portal",
        action,
        target,
        details: JSON.stringify(details),
        severity: "Info",
        isChronicle: true,
      },
    });
  } catch (error) {
    console.error("Bot Runner audit log failure:", error);
  }
}

async function getOrCreateSession(botHostId: string, agentVersion: string, active: boolean) {
  const existing = await prisma.botSession.findFirst({
    where: {
      botHostId,
      endTime: null,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (existing) {
    return prisma.botSession.update({
      where: { id: existing.id },
      data: {
        agentVersion,
        status: active ? "Running" : "Idle",
      },
    });
  }

  return prisma.botSession.create({
    data: {
      botHostId,
      agentVersion,
      status: active ? "Running" : "Idle",
    },
  });
}

function buildActivationInstructions(botHostId: string, activationToken: string) {
  return {
    portalPath: "/next-gen/bot-agents/activation",
    message:
      "Approve this agent in the portal, then set BOT_RUNNER_ACTIVATION_TOKEN on the runner and restart it.",
    botHostId,
    activationToken,
  };
}

export async function registerOrActivateBotRunner(payload: RegisterPayload) {
  const fingerprintHash = createHash("sha256")
    .update(payload.fingerprint.trim().toLowerCase())
    .digest("hex");

  let botHost =
    (await prisma.botHost.findFirst({
      where: {
        tenantId: payload.tenantId,
        OR: [
          { fingerprint: fingerprintHash },
          {
            hostname: payload.hostname,
            osType: payload.osType,
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
    })) ??
    null;

  if (!botHost) {
    botHost = await prisma.botHost.create({
      data: {
        tenantId: payload.tenantId,
        hostname: payload.hostname,
        osType: payload.osType,
        osVersion: payload.osVersion ?? null,
        ipAddress: payload.ipAddress ?? null,
        macAddress: payload.macAddress ?? null,
        fingerprint: fingerprintHash,
        status: "Registered",
        activationToken: buildActivationToken(),
      },
    });

    await writeAuditLog("BOT_RUNNER_REGISTERED", payload.hostname, {
      botHostId: botHost.id,
      tenantId: payload.tenantId,
      osType: payload.osType,
      runnerMode: payload.runnerMode ?? null,
    });
  } else {
    botHost = await prisma.botHost.update({
      where: { id: botHost.id },
      data: {
        hostname: payload.hostname,
        osType: payload.osType,
        osVersion: payload.osVersion ?? botHost.osVersion,
        ipAddress: payload.ipAddress ?? botHost.ipAddress,
        macAddress: payload.macAddress ?? botHost.macAddress,
        fingerprint: fingerprintHash,
      },
    });
  }

  const normalizedStatus = normalizeHostStatus(botHost.status);

  if (!payload.activationToken) {
    const session = await getOrCreateSession(botHost.id, payload.agentVersion, false);

    return {
      success: true as const,
      registrationState:
        normalizedStatus === "Online" ? "ACTIVE" : "PENDING_ACTIVATION",
      botHostId: botHost.id,
      sessionId: session.id,
      status: botHost.status,
      tenantId: botHost.tenantId,
      activation: buildActivationInstructions(
        botHost.id,
        botHost.activationToken ?? buildActivationToken(),
      ),
    };
  }

  if (botHost.activationToken !== payload.activationToken) {
    return {
      success: false as const,
      status: 403,
      code: "INVALID_ACTIVATION_TOKEN",
      message: "The supplied activation token does not match this Bot Runner registration.",
      botHostId: botHost.id,
    };
  }

  if (botHost.status === "Disabled") {
    return {
      success: false as const,
      status: 403,
      code: "HOST_DISABLED",
      message: "This Bot Runner host has been disabled in the portal.",
      botHostId: botHost.id,
    };
  }

  const certResult = await CAService.issueVMCertificate(botHost.id, botHost.tenantId);

  botHost = await prisma.botHost.update({
    where: { id: botHost.id },
    data: {
      status: "Active",
      activationToken: null,
      fingerprint: fingerprintHash,
      mtlsCertThumbprint: certResult.id,
      lastHeartbeat: new Date(),
    },
  });

  const session = await getOrCreateSession(botHost.id, payload.agentVersion, true);

  await writeAuditLog("BOT_RUNNER_ACTIVATED", payload.hostname, {
    botHostId: botHost.id,
    tenantId: botHost.tenantId,
    sessionId: session.id,
    certificateId: certResult.id,
  });

  return {
    success: true as const,
    registrationState: "ACTIVE",
    botHostId: botHost.id,
    sessionId: session.id,
    status: botHost.status,
    tenantId: botHost.tenantId,
    certificate: certResult.certificate,
    certificateId: certResult.id,
  };
}

export async function heartbeatBotRunner(payload: HeartbeatPayload) {
  const botHost = await prisma.botHost.findUnique({
    where: { id: payload.botHostId },
  });

  if (!botHost) {
    return {
      success: false as const,
      status: 404,
      code: "HOST_NOT_FOUND",
      message: "Bot Runner host not found.",
    };
  }

  const fingerprintHash = createHash("sha256")
    .update(payload.fingerprint.trim().toLowerCase())
    .digest("hex");

  if (botHost.fingerprint && botHost.fingerprint !== fingerprintHash) {
    return {
      success: false as const,
      status: 403,
      code: "FINGERPRINT_MISMATCH",
      message: "Fingerprint mismatch for Bot Runner host.",
    };
  }

  if (botHost.status !== "Active") {
    return {
      success: false as const,
      status: 409,
      code: "HOST_NOT_ACTIVE",
      message: `Bot Runner host is ${botHost.status}.`,
    };
  }

  await prisma.botHost.update({
    where: { id: botHost.id },
    data: {
      lastHeartbeat: new Date(),
      status: "Active",
    },
  });

  const session = await getOrCreateSession(botHost.id, payload.agentVersion, true);

  return {
    success: true as const,
    status: "OK",
    botHostId: botHost.id,
    sessionId: payload.sessionId ?? session.id,
    hostStatus: "Active",
  };
}

export async function fetchNextBotRunnerJob(payload: {
  botHostId: string;
  sessionId?: string | null;
  fingerprint: string;
  agentVersion: string;
}) {
  const heartbeat = await heartbeatBotRunner(payload);
  if (!heartbeat.success) {
    return heartbeat;
  }

  return {
    success: true as const,
    sessionId: heartbeat.sessionId,
    job: null,
  };
}
