"use server";

import { prisma } from "@/lib/prisma";

export interface PulseEvent {
  id: string;
  type: "KERNEL" | "AGENT" | "GOVERNANCE" | "RESOURCE";
  label: string;
  message: string;
  timestamp: string;
  status: "SUCCESS" | "WARNING" | "ERROR" | "INFO";
  metadata?: any;
}

/**
 * Fetches the most recent platform events to populate the Executive Pulse.
 */
export async function getLiveEventStream(tenantId: string): Promise<PulseEvent[]> {
  try {
    // 1. Fetch recent Resource Events
    const resourceEvents = await prisma.resourceEvent.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // 2. Fetch recent Workflow Executions
    const executions = await prisma.workflowExecution.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // 3. Fetch recent Agent Runs
    const agentRuns = await prisma.agentRun.findMany({
      where: { agent: { tenantId } },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Map to PulseEvents
    const events: PulseEvent[] = [
      ...resourceEvents.map(e => ({
        id: e.id,
        type: "RESOURCE" as const,
        label: e.eventType,
        message: `Resource event triggered on ${e.resourceId}`,
        timestamp: e.createdAt.toISOString(),
        status: "INFO" as const
      })),
      ...executions.map(e => ({
        id: e.id,
        type: "KERNEL" as const,
        label: "Workflow Execution",
        message: `Workflow in state ${e.status}`,
        timestamp: e.createdAt.toISOString(),
        status: e.status === "COMPLETED" ? "SUCCESS" as const : e.status === "FAILED" ? "ERROR" as const : "INFO" as const
      })),
      ...agentRuns.map(r => ({
        id: r.id,
        type: "AGENT" as const,
        label: "Agent Reasoning",
        message: `Agent ${r.agentId} is ${r.status}`,
        timestamp: r.createdAt.toISOString(),
        status: r.status === "SUCCESS" ? "SUCCESS" as const : r.status === "FAILED" ? "ERROR" as const : "INFO" as const
      }))
    ];

    return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  } catch (e) {
    console.error("Failed to fetch event stream:", e);
    return [];
  }
}
