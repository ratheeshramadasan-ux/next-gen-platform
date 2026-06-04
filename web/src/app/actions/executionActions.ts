"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createStudioJobAction(payload: {
  workflowId: string;
  tenantId: string;
  botSessionId?: string;
  priority?: number;
  triggerType?: string;
  role: string;
}) {
  try {
    // 1. Validation (Section 4.5 & 6.4)
    // Enforce no cross-tenant execution
    const workflow = await prisma.studioWorkflow.findUnique({
      where: { id: payload.workflowId }
    });

    if (!workflow) throw new Error("Workflow not found.");
    
    // Check if workflow belongs to the tenant
    // (Assuming StudioWorkflow is linked to Project/Folder which are linked to Tenant)
    if ((workflow as any).folder?.tenantId !== payload.tenantId) {
      throw new Error(`Execution Scope Violation: Workflow ${payload.workflowId} does not belong to Tenant ${payload.tenantId}.`);
    }

    // 2. Resource mapping: Check if VM (BotSession) belongs to the tenant
    if (payload.botSessionId) {
       const session = await prisma.botSession.findUnique({
          where: { id: payload.botSessionId },
          include: { botHost: true }
       });
       
       if (!session || session.botHost.tenantId !== payload.tenantId) {
          throw new Error(`Resource Bound Violation: VM Session ${payload.botSessionId} is not registered under Tenant ${payload.tenantId}.`);
       }

       if (session.botHost.status !== "Active") {
          throw new Error(`Execution Denied: Target VM is in ${session.botHost.status} state. Secure activation required.`);
       }
    }

    // 3. Create Job (Atomic Operation)
    const job = await prisma.studioJob.create({
      data: {
        workflowId: payload.workflowId,
        tenantId: payload.tenantId,
        botSessionId: payload.botSessionId || null,
        status: "Pending",
        priority: payload.priority || 1,
        triggerType: payload.triggerType || "Manual"
      }
    });

    // 4. Record Audit (Observability First)
    await (prisma as any).auditLog.create({
       data: {
          role: payload.role,
          action: "EXECUTION_JOB_CREATED",
          target: workflow.name,
          metadata: JSON.stringify({
             jobId: job.id,
             tenantId: payload.tenantId,
             workflowId: payload.workflowId
          })
       }
    });

    revalidatePath("/next-gen/orchestrator/jobs");
    return { success: true, jobId: (job as any).id };
  } catch (e: any) {
    console.error("Job Creation failed:", e);
    return { success: false, error: e.message };
  }
}

export async function getWorkflowExecutions(tenantId: string, limit = 50) {
  try {
    return await prisma.studioJob.findMany({
      where: { tenantId },
      include: {
        workflow: true,
        executionLog: {
          include: {
            stepLogs: {
              orderBy: { startTime: "asc" }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: limit
    });
  } catch (e) {
    console.error("Failed to fetch executions:", e);
    return [];
  }
}

export async function getExecutionMetrics(tenantId: string) {
  try {
    const [total, success, failed, running] = await Promise.all([
      prisma.studioJob.count({ where: { tenantId } }),
      prisma.studioJob.count({ where: { tenantId, status: "SUCCESS" } }),
      prisma.studioJob.count({ where: { tenantId, status: "FAILED" } }),
      prisma.studioJob.count({ where: { tenantId, status: "RUNNING" } })
    ]);

    return {
      total,
      success,
      failed,
      liveRuns: running,
      successRate: total > 0 ? ((success / total) * 100).toFixed(2) : "100"
    };
  } catch (e) {
    console.error("Failed to fetch execution metrics:", e);
    return { total: 0, success: 0, failed: 0, liveRuns: 0, successRate: "100" };
  }
}

export async function getWorkflowDefinitions(tenantId: string) {
  try {
    return await prisma.studioWorkflow.findMany({
      where: { project: { tenantId } },
      orderBy: { name: "asc" }
    });
  } catch (e) {
    console.error("Failed to fetch workflow definitions:", e);
    return [];
  }
}

export async function triggerWorkflow(payload: {
  definitionId: string;
  tenantId: string;
  context?: any;
}) {
  try {
    // 1. Verify Definition (Mapped to StudioWorkflow)
    const definition = await prisma.studioWorkflow.findUnique({
      where: { id: payload.definitionId }
    });

    if (!definition) {
      throw new Error("Invalid Workflow Definition Scope.");
    }

    // 2. Create Job (Atomic Trigger)
    const job = await prisma.studioJob.create({
      data: {
        workflowId: payload.definitionId,
        tenantId: payload.tenantId,
        status: "Pending",
        triggerType: "Manual"
      }
    });

    revalidatePath("/next-gen/runs");
    return { success: true, executionId: job.id };
  } catch (e: any) {
    console.error("Workflow trigger failed:", e);
    return { success: false, error: e.message };
  }
}
