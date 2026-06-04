"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/app/actions/tenantActions";

type ServiceAction =
  | "start"
  | "stop"
  | "restart"
  | "scale_up"
  | "scale_down"
  | "drain_traffic";

type HealthState = "healthy" | "warning" | "critical";
type ServiceStatus = "Running" | "Stopped" | "Degraded";

type ServiceControlState = {
  desiredInstances: number;
  drained: boolean;
  lastAction: string;
  lastActionAt: string;
  lastActionBy: string;
};

const DEFAULT_CONTROL_STATE: ServiceControlState = {
  desiredInstances: 1,
  drained: false,
  lastAction: "bootstrap",
  lastActionAt: new Date(0).toISOString(),
  lastActionBy: "System",
};

type CanonicalServiceDefinition = {
  serviceName: string;
  defaultEnabled: boolean;
  module: string;
};

const CANONICAL_PLATFORM_SERVICES: CanonicalServiceDefinition[] = [
  { serviceName: "Mail Service", defaultEnabled: true, module: "Notifications" },
  { serviceName: "Authentication Service", defaultEnabled: true, module: "Identity" },
  { serviceName: "AI Service", defaultEnabled: true, module: "Intelligence" },
  { serviceName: "Attended Bot Service", defaultEnabled: true, module: "Automation" },
  { serviceName: "Unattended Bot Service", defaultEnabled: true, module: "Automation" },
  { serviceName: "API Automation", defaultEnabled: true, module: "Orchestration" },
  { serviceName: "Web Automation", defaultEnabled: true, module: "Automation" },
  { serviceName: "Logging & Audit", defaultEnabled: true, module: "Governance" },
];

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function parseJsonRecord(value: string | null | undefined) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function hashSeed(input: string) {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function serviceTypeForName(serviceName: string) {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes("authentication")) return "API";
  if (normalized.includes("mail")) return "Integration";
  if (normalized.includes("attended bot") || normalized.includes("unattended bot")) return "Worker";
  if (normalized.includes("ai service")) return "UI";
  if (normalized.includes("api")) return "API";
  if (normalized.includes("webhook") || normalized.includes("smtp") || normalized.includes("external")) return "Integration";
  if (normalized.includes("desktop") || normalized.includes("bot")) return "Worker";
  if (normalized.includes("logging") || normalized.includes("compliance")) return "Scheduler";
  if (normalized.includes("studio") || normalized.includes("vision") || normalized.includes("nlp") || normalized.includes("llm")) return "UI";
  return "Worker";
}

function dependencyMapForName(serviceName: string) {
  const normalized = serviceName.toLowerCase();
  if (normalized.includes("authentication")) return ["User Directory", "Session Store", "Audit Logs"];
  if (normalized.includes("mail")) return ["SMTP Config", "Alert Policies", "Audit Logs"];
  if (normalized.includes("attended bot")) return ["Bot Hosts", "User Sessions", "Execution Queue"];
  if (normalized.includes("unattended bot")) return ["Bot Hosts", "Scheduler", "Execution Queue"];
  if (normalized.includes("ai service")) return ["Model Nodes", "Prompt Runtime", "RAG Collections"];
  if (normalized.includes("web")) return ["Bot Hosts", "Execution Queue", "Workspace Projects"];
  if (normalized.includes("api")) return ["API Gateway", "Workflow Engine", "Deployments"];
  if (normalized.includes("ai") || normalized.includes("llm")) return ["Model Nodes", "RAG Collections", "Execution Queue"];
  if (normalized.includes("email") || normalized.includes("smtp")) return ["SMTP Config", "Notification Policies", "Audit Logs"];
  if (normalized.includes("logging") || normalized.includes("audit")) return ["Audit Ledger", "Retention Policy", "Alert Center"];
  return ["Tenant Config", "Workspace Layer", "Platform Audit"];
}

function formatUptime(date: Date | null | undefined) {
  if (!date) return "n/a";
  const elapsed = Math.max(0, Date.now() - new Date(date).getTime());
  const minutes = Math.floor(elapsed / (1000 * 60));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

function buildMetricSeries(seed: number, baseline: number, spread: number) {
  return Array.from({ length: 12 }, (_, index) => {
    const wave = Math.sin((index + 1 + (seed % 5)) / 2.4);
    const drift = ((seed >> (index % 8)) & 7) - 3;
    return clamp(Math.round(baseline + wave * spread + drift), 2, 99);
  });
}

function getControlState(configEntries: Array<{ key: string; value: string }>, serviceName: string) {
  const key = `service:${serviceName}:control`;
  const config = configEntries.find((entry) => entry.key === key);
  const parsed = parseJsonRecord(config?.value) as Partial<ServiceControlState> | null;
  return {
    ...DEFAULT_CONTROL_STATE,
    ...(parsed ?? {}),
  };
}

function determineServiceStatus(args: {
  enabled: boolean;
  drained: boolean;
  cpuUsage: number;
  memoryUsage: number;
  errorRate: number;
  recentFailures: number;
}) {
  if (!args.enabled) {
    return { status: "Stopped" as ServiceStatus, health: "critical" as HealthState };
  }

  if (
    args.drained ||
    args.cpuUsage >= 85 ||
    args.memoryUsage >= 80 ||
    args.errorRate >= 5 ||
    args.recentFailures > 0
  ) {
    return { status: "Degraded" as ServiceStatus, health: args.errorRate >= 8 ? "critical" as HealthState : "warning" as HealthState };
  }

  return { status: "Running" as ServiceStatus, health: "healthy" as HealthState };
}

function alertChannelsForService(serviceType: string) {
  if (serviceType === "Integration") return ["Email", "Slack", "In-app"];
  return ["Slack", "Email", "In-app"];
}

function buildTenantServiceCatalog(
  tenantServices: Array<{ id: string; serviceName: string; enabled: boolean; enabledAt: Date; enabledBy: string | null }>,
) {
  const seeded = new Map(tenantServices.map((service) => [service.serviceName, service]));

  for (const definition of CANONICAL_PLATFORM_SERVICES) {
    if (!seeded.has(definition.serviceName)) {
      seeded.set(definition.serviceName, {
        id: `virtual:${definition.serviceName}`,
        serviceName: definition.serviceName,
        enabled: definition.defaultEnabled,
        enabledAt: new Date(),
        enabledBy: "System",
      });
    }
  }

  return Array.from(seeded.values());
}

export async function getPlatformServicesSnapshot(customerId?: string | null) {
  try {
    const [tenants, auditLogs] = await Promise.all([
      prisma.tenant.findMany({
        where: customerId ? { customerId } : undefined,
        include: {
          customer: {
            select: {
              id: true,
              companyName: true,
              location: true,
            },
          },
          services: true,
          config: {
            where: {
              category: "SERVICE_MONITORING",
            },
          },
          botHosts: {
            select: {
              id: true,
              hostname: true,
              status: true,
              lastHeartbeat: true,
            },
          },
          deployments: {
            orderBy: {
              initiatedAt: "desc",
            },
            take: 5,
          },
          workspaces: {
            select: {
              id: true,
              region: true,
            },
          },
          jobs: {
            select: {
              id: true,
              status: true,
              createdAt: true,
            },
          },
          studioQueues: {
            select: {
              id: true,
              transactions: {
                select: {
                  id: true,
                  status: true,
                },
              },
            },
          },
          users: {
            select: {
              id: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      }),
      prisma.auditLog.findMany({
        where: {
          OR: [
            { action: { startsWith: "PLATFORM_SERVICE_" } },
            { action: "SERVICE_TOGGLED" },
          ],
        },
        orderBy: {
          timestamp: "desc",
        },
        take: 200,
      }),
    ]);

    const services = tenants.flatMap((tenant) => {
      const queueDepth = (tenant.studioQueues || []).reduce((total, queue) => {
        return total + (queue.transactions || []).filter((item) => item.status === "New" || item.status === "Processing").length;
      }, 0);
      const activeSessions = tenant.jobs.filter((job) => job.status === "Running").length + tenant.botHosts.filter((host) => host.status === "Online").length;
      const recentFailures = tenant.deployments.filter((deployment) => deployment.status === "FAILED").length;
      const latestDeployment = tenant.deployments[0] ?? null;
      const latestVersion = latestDeployment?.version ?? "1.0.0";
      const hostNames = tenant.botHosts.slice(0, 3).map((host) => host.hostname);

      const tenantServiceCatalog = buildTenantServiceCatalog(tenant.services);

      return tenantServiceCatalog.map((service) => {
        const seed = hashSeed(`${tenant.id}:${service.serviceName}`);
        const control = getControlState(tenant.config, service.serviceName);
        const canonical = CANONICAL_PLATFORM_SERVICES.find((entry) => entry.serviceName === service.serviceName);
        const recentRequestCount = tenant.jobs.filter((job) => {
          return Date.now() - new Date(job.createdAt).getTime() < 60 * 60 * 1000;
        }).length;
        const requestRate = Number((recentRequestCount / 60 + (seed % 7) * 0.2 + control.desiredInstances * 0.35).toFixed(1));
        const responseTime = clamp(55 + (seed % 50) + control.desiredInstances * 3 + Math.round(queueDepth * 0.8), 35, 420);
        const errorRate = Number(clamp((recentFailures * 2.4) + (seed % 5) * 0.35 + (control.drained ? 2 : 0), 0, 12).toFixed(1));
        const cpuUsage = clamp(
          Math.round(24 + (seed % 28) + requestRate * 1.4 + queueDepth * 0.8 - control.desiredInstances * 4),
          8,
          98,
        );
        const memoryUsage = clamp(
          Math.round(26 + ((seed >> 3) % 26) + activeSessions * 3 + control.desiredInstances * 5),
          10,
          96,
        );
        const statusInfo = determineServiceStatus({
          enabled: service.enabled,
          drained: control.drained,
          cpuUsage,
          memoryUsage,
          errorRate,
          recentFailures,
        });
        const serviceType = serviceTypeForName(service.serviceName);
        const region = tenant.workspaces.find((workspace) => workspace.region)?.region || tenant.customer.location || "Global";
        const host = hostNames.length > 0 ? hostNames.join(", ") : `${tenant.name.toUpperCase()} cluster`;
        const detailTarget = `${tenant.name} :: ${service.serviceName}`;
        const serviceLogs = auditLogs
          .filter((log) => {
            if (log.target === detailTarget) return true;
            if (log.target === service.serviceName) return true;
            return log.details?.includes(service.serviceName) && log.details?.includes(tenant.id);
          })
          .slice(0, 8);

        return {
          id: `${tenant.id}::${service.serviceName}`,
          persistedServiceId: service.id.startsWith("virtual:") ? null : service.id,
          tenantId: tenant.id,
          tenantName: tenant.name,
          customerId: tenant.customerId,
          customerName: tenant.customer.companyName,
          region,
          environment: tenant.type,
          serviceName: service.serviceName,
          serviceType,
          module: canonical?.module ?? (serviceType === "API" ? "Orchestration" : serviceType === "Integration" ? "Connectivity" : "Execution"),
          status: statusInfo.status,
          health: statusInfo.health,
          uptime: formatUptime(service.enabledAt),
          uptimeStartedAt: service.enabledAt?.toISOString() ?? null,
          version: latestVersion,
          host,
          dependencies: dependencyMapForName(service.serviceName),
          desiredInstances: control.desiredInstances,
          drainTraffic: control.drained,
          alertChannels: alertChannelsForService(serviceType),
          metrics: {
            cpuUsage,
            memoryUsage,
            requestRate,
            responseTime,
            p95Latency: clamp(Math.round(responseTime * 1.55), 65, 650),
            errorRate,
            activeSessions,
            queueDepth,
            series: {
              cpu: buildMetricSeries(seed, cpuUsage, 10),
              memory: buildMetricSeries(seed + 11, memoryUsage, 8),
              latency: buildMetricSeries(seed + 23, clamp(Math.round(responseTime / 2), 20, 95), 12),
            },
          },
          logs: serviceLogs.map((log) => ({
            id: log.id,
            timestamp: log.timestamp.toISOString(),
            severity: log.severity,
            action: log.action,
            details: log.details ?? "",
          })),
          deploymentHistory: tenant.deployments.map((deployment) => ({
            id: deployment.id,
            version: deployment.version,
            status: deployment.status,
            initiatedAt: deployment.initiatedAt.toISOString(),
            initiatedBy: deployment.initiatedBy ?? "System",
          })),
          controlState: {
            ...control,
          },
        };
      });
    });

    const alerts = services
      .filter((service) => {
        return (
          service.metrics.cpuUsage > 80 ||
          service.metrics.memoryUsage > 75 ||
          service.metrics.errorRate > 5 ||
          service.drainTraffic ||
          service.status !== "Running"
        );
      })
      .map((service) => ({
        id: service.id,
        serviceName: service.serviceName,
        tenantName: service.tenantName,
        environment: service.environment,
        severity:
          service.metrics.errorRate > 5 || service.status === "Stopped"
            ? "Critical"
            : service.metrics.cpuUsage > 80 || service.metrics.memoryUsage > 75
              ? "Warning"
              : "Info",
        message:
          service.status === "Stopped"
            ? "Service is not running."
            : service.drainTraffic
              ? "Traffic draining is active for maintenance."
              : service.metrics.errorRate > 5
                ? `Error rate is ${service.metrics.errorRate}%.`
                : service.metrics.cpuUsage > 80
                  ? `CPU usage is ${service.metrics.cpuUsage}%.`
                  : `Memory usage is ${service.metrics.memoryUsage}%.`,
        channels: service.alertChannels,
      }));

    const summary = {
      totalServices: services.length,
      running: services.filter((service) => service.status === "Running").length,
      failed: services.filter((service) => service.status === "Stopped" || service.health === "critical").length,
      highLoad: services.filter((service) => service.metrics.cpuUsage > 80 || service.metrics.memoryUsage > 75).length,
      degraded: services.filter((service) => service.status === "Degraded").length,
    };

    return {
      success: true,
      summary,
      services,
      alerts,
      generatedAt: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error("[PlatformServices] Snapshot build failed:", error);
    return {
      success: false,
      error: getErrorMessage(error, "Failed to build service monitoring snapshot."),
      summary: {
        totalServices: 0,
        running: 0,
        failed: 0,
        highLoad: 0,
        degraded: 0,
      },
      services: [],
      alerts: [],
      generatedAt: new Date().toISOString(),
    };
  }
}

export async function controlPlatformServiceAction(args: {
  tenantId: string;
  serviceName: string;
  action: ServiceAction;
  actorRole: string;
  actorEmail: string;
}) {
  const { tenantId, serviceName, action, actorRole, actorEmail } = args;

  try {
    if (actorRole !== "Platform Admin") {
      throw new Error("Only Platform Admin users can execute platform service actions.");
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        config: true,
        services: true,
      },
    });

    if (!tenant) {
      throw new Error("Tenant not found.");
    }

    const persistedService = tenant.services.find((service) => service.serviceName === serviceName) ?? null;
    const controlKey = `service:${serviceName}:control`;
    const currentState = getControlState(tenant.config, serviceName);
    let nextEnabled = persistedService?.enabled ?? true;
    const nextState = { ...currentState };

    switch (action) {
      case "start":
        nextEnabled = true;
        nextState.drained = false;
        break;
      case "stop":
        nextEnabled = false;
        break;
      case "restart":
        nextEnabled = true;
        nextState.drained = false;
        break;
      case "scale_up":
        nextEnabled = true;
        nextState.desiredInstances = clamp(nextState.desiredInstances + 1, 1, 12);
        break;
      case "scale_down":
        nextState.desiredInstances = clamp(nextState.desiredInstances - 1, 1, 12);
        break;
      case "drain_traffic":
        nextEnabled = true;
        nextState.drained = !nextState.drained;
        break;
      default:
        throw new Error("Unsupported service action.");
    }

    nextState.lastAction = action;
    nextState.lastActionAt = new Date().toISOString();
    nextState.lastActionBy = actorEmail;

    await prisma.$transaction([
      prisma.tenantService.upsert({
        where: {
          tenantId_serviceName: {
            tenantId,
            serviceName,
          },
        },
        update: {
          enabled: nextEnabled,
          enabledBy: actorEmail,
          enabledAt: new Date(),
        },
        create: {
          tenantId,
          serviceName,
          enabled: nextEnabled,
          enabledBy: actorEmail,
          enabledAt: new Date(),
        },
      }),
      prisma.tenantConfig.upsert({
        where: {
          tenantId_key: {
            tenantId,
            key: controlKey,
          },
        },
        update: {
          category: "SERVICE_MONITORING",
          value: JSON.stringify(nextState),
        },
        create: {
          tenantId,
          key: controlKey,
          category: "SERVICE_MONITORING",
          value: JSON.stringify(nextState),
        },
      }),
    ]);

    await createAuditLog(
      actorEmail,
      `PLATFORM_SERVICE_${action.toUpperCase()}`,
      `${tenant.name} :: ${serviceName}`,
      JSON.stringify({
        tenantId,
        serviceName,
        previousEnabled: persistedService?.enabled ?? null,
        nextEnabled,
        desiredInstances: nextState.desiredInstances,
        drained: nextState.drained,
        actorRole,
      }),
      action === "stop" ? "Warning" : "Info",
      true,
      tenant.customerId,
    );

    revalidatePath("/next-gen/control-center/services");
    revalidatePath("/next-gen/control-center");

    return { success: true };
  } catch (error: unknown) {
    console.error("[PlatformServices] Control action failed:", error);
    return { success: false, error: getErrorMessage(error, "Failed to execute service action.") };
  }
}
