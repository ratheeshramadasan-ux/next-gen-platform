"use server";

import { prisma } from "@/lib/prisma";

export interface ModuleDossier {
  id: string;
  label: string;
  schema: string[];
  status: "HEALTHY" | "WARNING" | "ERROR";
  activeAgents: number;
  lastSync: string;
  description: string;
}

export interface BlueprintState {
  modules: ModuleDossier[];
  connections: { from: string; to: string; label: string }[];
}

/**
 * Aggregates platform-wide telemetry to hydrate the Sovereign Blueprint.
 */
export async function getBlueprintState(tenantId: string): Promise<BlueprintState> {
  try {
    // In a real system, this would query metadata for all 15 schemas.
    // For now, we synthesize the state based on active records.
    
    const [agentCount, workflowCount, metricCount] = await Promise.all([
      prisma.agentInstance.count({ where: { tenantId } }),
      prisma.workflowDefinition.count({ where: { tenantId } }),
      prisma.metric.count({ where: { tenantId, status: "CRITICAL" } })
    ]);

    const modules: ModuleDossier[] = [
      {
        id: "ai_hub",
        label: "AI Assistant Hub",
        schema: ["AgentInstance", "AgentRun", "Intent", "MemoryLedger"],
        status: "HEALTHY",
        activeAgents: agentCount,
        lastSync: new Date().toISOString(),
        description: "Core intelligence and LLM orchestration layer."
      },
      {
        id: "automation",
        label: "Automation Builder",
        schema: ["WorkflowDefinition", "WorkflowExecution", "WorkflowStep"],
        status: "HEALTHY",
        activeAgents: 0,
        lastSync: new Date().toISOString(),
        description: "Sovereign DAG designer and execution engine."
      },
      {
        id: "governance",
        label: "Rules & Controls",
        schema: ["PolicyDefinition", "PolicyBinding", "ApprovalRequest"],
        status: "HEALTHY",
        activeAgents: 2,
        lastSync: new Date().toISOString(),
        description: "Constitutional ARL policy enforcement layer."
      },
      {
        id: "monitoring",
        label: "Monitoring",
        schema: ["Metric", "Log", "Trace", "HealingEvent"],
        status: metricCount > 0 ? "ERROR" : "HEALTHY",
        activeAgents: 1,
        lastSync: new Date().toISOString(),
        description: "Global cluster health and predictive telemetry."
      },
      {
        id: "billing",
        label: "Usage & Billing",
        schema: ["UsageReport", "Invoice", "PaymentMethod"],
        status: "HEALTHY",
        activeAgents: 0,
        lastSync: new Date().toISOString(),
        description: "ELAK-integrated compute pricing and invoicing."
      }
    ];

    const connections = [
      { from: "ai_hub", to: "automation", label: "Intent Lowering" },
      { from: "automation", to: "governance", label: "Policy Intercept" },
      { from: "governance", to: "monitoring", label: "Compliance Stream" },
      { from: "monitoring", to: "billing", label: "Consumption Data" }
    ];

    return { modules, connections };
  } catch (e) {
    console.error("Blueprint state extraction failure:", e);
    return { modules: [], connections: [] };
  }
}
