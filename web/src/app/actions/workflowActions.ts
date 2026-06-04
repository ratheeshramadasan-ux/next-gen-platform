"use server";
 Broadway: 100

import { prisma } from "@/lib/prisma";
import { KernelOrchestrator } from "@/lib/automation/runtime";
import { Node, Edge } from "@xyflow/react";

/**
 * Persists a visual workflow graph into the Sovereign Execution Engine schema.
 */
export async function saveWorkflow(payload: {
  name: string;
  description?: string;
  tenantId: string;
  nodes: Node[];
  edges: Edge[];
  definition: any;
}) {
  try {
    // 1. Create/Update Workflow
    const workflow = await (prisma as any).workflow.create({
      data: {
        name: payload.name,
        description: payload.description,
        tenantId: payload.tenantId,
        status: "Published",
        definition: payload.definition,
        nodes: {
          create: payload.nodes.map(node => ({
            id: node.id,
            type: node.type || "action",
            name: node.id,
            label: (node.data?.label as string) || node.type,
            config: (node.data?.config as any) || {},
            positionX: node.position.x,
            positionY: node.position.y,
          }))
        },
        edges: {
          create: payload.edges.map(edge => ({
            id: edge.id,
            sourceNodeId: edge.source,
            targetNodeId: edge.target,
            condition: (edge.data?.condition as any) || {}
          }))
        }
      }
    });

    return { success: true, workflowId: workflow.id };
  } catch (error: any) {
    console.error("Save Workflow Failure:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Compiles and triggers a backend execution of the specified workflow.
 */
export async function executeWorkflow(workflowId: string, tenantId: string, inputs: any = {}) {
  try {
    const result = await KernelOrchestrator.execute(workflowId, tenantId, inputs);
    return { success: true, ...result };
  } catch (error: any) {
    console.error("Execution Trigger Failure:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetches the execution history for a workflow.
 */
export async function getExecutionHistory(workflowId: string) {
  return await (prisma as any).executionRun.findMany({
    where: { workflowId },
    orderBy: { startedAt: "desc" },
    include: { logs: { orderBy: { timestamp: "asc" } } },
    take: 10
  });
}

export async function getTenantsWorkflows(tenantId: string) {
  try {
    const workflows = await (prisma as any).workflow.findMany({
      where: { tenantId },
      orderBy: { updatedAt: "desc" }
    });
    return JSON.parse(JSON.stringify(workflows));
  } catch (e) {
    console.error("Failed to fetch workflows:", e);
    return [];
  }
}
