"use server";

import { prisma } from "@/lib/prisma";

type MonitorRole = "Platform Admin" | "Tenant Admin" | "Admin User";

function classifyBotMode(triggerType: string | null | undefined) {
  const normalized = (triggerType || "").toLowerCase();
  if (
    normalized.includes("manual") ||
    normalized.includes("desktop") ||
    normalized.includes("user")
  ) {
    return "Attended";
  }
  return "Unattended";
}

function normalizeHostStatus(status: string | null | undefined) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "active" || normalized === "online" || normalized === "approved") return "Online";
  if (normalized === "disabled") return "Disabled";
  if (normalized === "registered" || normalized === "validated" || normalized === "provisioning") return "Provisioning";
  return "Offline";
}

function normalizeSessionStatus(status: string | null | undefined) {
  const normalized = (status || "").toLowerCase();
  if (normalized === "running" || normalized === "active" || normalized === "busy") return "Running";
  if (normalized === "idle") return "Idle";
  return "Stopped";
}

function formatTimeAgo(date: Date | null | undefined, hostStatus?: string) {
  if (!date) {
    // Bot is active/approved but hasn't sent its first heartbeat yet
    if (hostStatus && normalizeHostStatus(hostStatus) === "Online") {
      return "Activated – awaiting heartbeat";
    }
    return "No heartbeat";
  }
  const elapsedMs = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds < 30) return "Just now";
  return `${seconds}s ago`;
}

export async function getCustomerBotVmMonitor(input: {
  customerId: string | null;
  tenantId?: string | null;
  role: MonitorRole;
  actorEmail: string;
}) {
  try {
    let scopedTenantIds: string[] | undefined;
    let accessibleFolders: Array<{
      id: string;
      name: string;
      path: string | null;
      tenantName: string;
      environment: string;
      workspaceName: string;
    }> = [];

    // ── Admin User: folder-scoped access ─────────────────────────
    if (input.role === "Admin User") {
      if (!input.customerId) {
        return {
          success: true,
          summary: { totalVms: 0, onlineVms: 0, runningBots: 0, attendedBots: 0, unattendedBots: 0 },
          vmCards: [],
          accessibleFolders: [],
          scopeMode: "folder-scoped" as const,
          generatedAt: new Date().toISOString(),
        };
      }

      const appUser = await prisma.appUser.findUnique({
        where: { email: input.actorEmail },
        include: { groups: { select: { id: true } } },
      });

      if (!appUser) {
        return {
          success: true,
          summary: { totalVms: 0, onlineVms: 0, runningBots: 0, attendedBots: 0, unattendedBots: 0 },
          vmCards: [],
          accessibleFolders: [],
          scopeMode: "folder-scoped" as const,
          generatedAt: new Date().toISOString(),
        };
      }

      const principalIds = [appUser.id, ...appUser.groups.map((g) => g.id)];

      // Step 1: get permitted folderIds
      const folderPermissions = await prisma.folderPermission.findMany({
        where: {
          canView: true,
          OR: [
            { principalType: "USER", principalId: appUser.id },
            {
              principalType: "GROUP",
              principalId: { in: appUser.groups.map((g) => g.id) },
            },
          ],
        },
        select: { folderId: true },
      });

      const folderIds = Array.from(new Set(folderPermissions.map((p) => p.folderId)));

      // Step 2: load the actual folder + tenant + workspace data
      const folders = await prisma.folder.findMany({
        where: {
          id: { in: folderIds },
          customerId: input.customerId!,
          ...(input.tenantId ? { tenantId: input.tenantId } : {}),
        },
        include: {
          workspace: { select: { name: true } },
        },
      });

      // Step 3: load tenant names for the found folders
      const tenantIds = Array.from(new Set(folders.map((f) => f.tenantId)));
      const tenants = await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, name: true, type: true },
      });
      const tenantMap = new Map(tenants.map((t) => [t.id, t]));

      accessibleFolders = folders.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path ?? null,
        tenantName: tenantMap.get(f.tenantId)?.name ?? "Unknown",
        environment: tenantMap.get(f.tenantId)?.type ?? "Unknown",
        workspaceName: f.workspace?.name ?? "Unknown",
      }));

      scopedTenantIds = Array.from(new Set(folders.map((f) => f.tenantId)));

      if (principalIds.length === 0 || scopedTenantIds.length === 0) {
        return {
          success: true,
          summary: { totalVms: 0, onlineVms: 0, runningBots: 0, attendedBots: 0, unattendedBots: 0 },
          vmCards: [],
          accessibleFolders,
          scopeMode: "folder-scoped" as const,
          generatedAt: new Date().toISOString(),
        };
      }
    }

    // ── Platform Admin / Tenant Admin: full visibility ──────────────
    // Tenant filter strategy:
    //   scopedTenantIds set  → Admin User folder scope
    //   customerId supplied  → all tenants under that customer (+ optional tenantId)
    //   no customerId        → Platform Admin global view: ALL bot hosts
    const tenantFilter = scopedTenantIds
      ? { id: { in: scopedTenantIds } }
      : input.customerId
      ? {
          customerId: input.customerId,
          ...(input.tenantId ? { id: input.tenantId } : {}),
        }
      : undefined; // Platform Admin with no customer selected → global view

    const botHosts = await prisma.botHost.findMany({
      where: tenantFilter ? { tenant: tenantFilter } : {},
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            type: true,
            customer: { select: { companyName: true } },
          },
        },
        sessions: {
          orderBy: { createdAt: "desc" },
          include: {
            jobs: {
              orderBy: { createdAt: "desc" },
              take: 8,
              include: { workflow: { select: { name: true } } },
            },
          },
        },
      },
      orderBy: [{ tenant: { name: "asc" } }, { hostname: "asc" }],
    });

    const vmCards = botHosts.map((host) => {
      const hostStatus = normalizeHostStatus(host.status);
      const sessions = host.sessions.map((session) => {
        const sessionStatus = normalizeSessionStatus(session.status);
        const latestJob = session.jobs[0] ?? null;
        const botMode = classifyBotMode(latestJob?.triggerType ?? session.status);
        return {
          id: session.id,
          agentVersion: session.agentVersion,
          status: sessionStatus,
          mode: botMode,
          startedAt: session.startTime.toISOString(),
          endedAt: session.endTime?.toISOString() ?? null,
          latestWorkflow: latestJob?.workflow?.name ?? "No workflow assigned",
          latestJobStatus: latestJob?.status ?? "Idle",
          latestJobTrigger: latestJob?.triggerType ?? "Manual",
          queueCount: session.jobs.filter((j) => j.status === "Pending").length,
        };
      });

      const runningBots = sessions.filter((s) => s.status === "Running").length;
      const attendedBots = sessions.filter((s) => s.mode === "Attended").length;
      const unattendedBots = sessions.filter((s) => s.mode === "Unattended").length;

      return {
        id: host.id,
        hostname: host.hostname,
        ipAddress: host.ipAddress ?? "Not registered",
        osType: host.osType,
        osVersion: host.osVersion ?? "Unknown",
        environment: host.tenant.type,
        tenantId: host.tenant.id,
        tenantName: host.tenant.name,
        customerName: host.tenant.customer.companyName,
        status: hostStatus,
        rawStatus: host.status,
        lastHeartbeat: formatTimeAgo(host.lastHeartbeat, host.status),
        fingerprint: host.fingerprint ?? "Pending fingerprint",
        mtlsCertThumbprint: host.mtlsCertThumbprint ?? "Certificate pending",
        runningBots,
        attendedBots,
        unattendedBots,
        sessions,
      };
    });

    const summary = {
      totalVms: vmCards.length,
      onlineVms: vmCards.filter((h) => h.status === "Online").length,
      runningBots: vmCards.reduce((total, h) => total + h.runningBots, 0),
      attendedBots: vmCards.reduce((total, h) => total + h.attendedBots, 0),
      unattendedBots: vmCards.reduce((total, h) => total + h.unattendedBots, 0),
    };

    return {
      success: true,
      summary,
      vmCards,
      accessibleFolders,
      scopeMode: input.role === "Admin User" ? "folder-scoped" : "customer-scoped",
      generatedAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("[BotMonitor] Failed to build VM monitor:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to load VM bot monitor.",
      summary: {
        totalVms: 0,
        onlineVms: 0,
        runningBots: 0,
        attendedBots: 0,
        unattendedBots: 0,
      },
      vmCards: [],
      accessibleFolders: [],
      scopeMode: input.role === "Admin User" ? "folder-scoped" : "customer-scoped",
      generatedAt: new Date().toISOString(),
    };
  }
}
