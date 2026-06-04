import { BotAgentLayout } from "@/components/next-gen/bot-agents/agent-hub";
import { prisma } from "@/lib/prisma";
import { ActivationClientContent } from "./activation-client-content";

async function getRecentRegistrations() {
  try {
    return await prisma.botHost.findMany({
      include: {
        tenant: {
          select: {
            name: true,
            customerId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });
  } catch (error) {
    console.error("Failed to load Bot Runner registrations:", error);
    return [];
  }
}

async function getOrchestratorPort(tenantId?: string) {
  if (!tenantId) return 4000;
  try {
    const config = await prisma.tenantConfig.findUnique({
      where: {
        tenantId_key: { tenantId, key: "ORCHESTRATOR_PORT" }
      }
    });
    return config ? parseInt(config.value) : 4000;
  } catch {
    return 4000;
  }
}

export default async function BotAgentActivationPage() {
  const registrations = await getRecentRegistrations();
  // Get port from the first registration's tenant or a default
  const defaultTenant = registrations[0]?.tenantId;
  const port = await getOrchestratorPort(defaultTenant);

  return (
    <BotAgentLayout
      section="activation"
      title="Agent Activation and Trust"
      description="Review fingerprint binding, approval state, short-lived token issuance, and mTLS certificate posture for secure Bot Runner enrollment."
    >
      <ActivationClientContent 
        initialRegistrations={JSON.parse(JSON.stringify(registrations))} 
        initialPort={port}
      />
    </BotAgentLayout>
  );
}
