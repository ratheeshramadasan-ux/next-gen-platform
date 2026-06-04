"use server";

import { BotAgentLayout, ProfilePanel } from "@/components/next-gen/bot-agents/agent-hub";
import { prisma } from "@/lib/prisma";
import { HeartbeatConfigPanel } from "@/components/next-gen/bot-agents/heartbeat-config-panel";

async function getHeartbeatData() {
  try {
    // Get all bot hosts with their tenants to show per-host heartbeat status
    const hosts = await prisma.botHost.findMany({
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            customerId: true,
            config: {
              where: { key: "HEARTBEAT_INTERVAL_SECONDS" }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return hosts.map(h => ({
      id: h.id,
      hostname: h.hostname,
      osType: h.osType,
      status: h.status,
      lastHeartbeat: h.lastHeartbeat ? h.lastHeartbeat.toISOString() : null,
      tenantId: h.tenantId,
      tenantName: h.tenant.name,
      intervalSeconds: h.tenant.config[0]
        ? parseInt(h.tenant.config[0].value, 10)
        : 30,
    }));
  } catch (e) {
    console.error("Failed to load heartbeat data:", e);
    return [];
  }
}

async function getDistinctTenants() {
  try {
    const hosts = await prisma.botHost.findMany({
      select: {
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            config: { where: { key: "HEARTBEAT_INTERVAL_SECONDS" } }
          }
        }
      },
      distinct: ["tenantId"]
    });
    return hosts.map(h => ({
      id: h.tenant.id,
      name: h.tenant.name,
      intervalSeconds: h.tenant.config[0]
        ? parseInt(h.tenant.config[0].value, 10)
        : 30,
    }));
  } catch {
    return [];
  }
}

export default async function BotAgentProfilePage() {
  const [heartbeatHosts, tenants] = await Promise.all([
    getHeartbeatData(),
    getDistinctTenants()
  ]);

  return (
    <BotAgentLayout
      section="profile"
      title="Bot Agent Profile and Settings"
      description="See agent identity, runtime configuration, assigned environment, observability posture, and attended versus unattended execution settings."
    >
      <HeartbeatConfigPanel
        hosts={JSON.parse(JSON.stringify(heartbeatHosts))}
        tenants={JSON.parse(JSON.stringify(tenants))}
      />
      <div className="mt-6">
        <ProfilePanel />
      </div>
    </BotAgentLayout>
  );
}
