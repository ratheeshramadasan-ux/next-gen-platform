import { prisma } from "../lib/prisma.js";
import { randomUUID } from "crypto";

type CommitPayload = {
  executionId: string;
  generationId: string;
  eventType: string;
  payload: any;
  correlationId?: string;
  causationId?: string;
  rootExecutionId?: string;
};

export async function commitExecutionEvent(data: CommitPayload) {
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch current execution run and lock it
    const run = await tx.executionRun.findUnique({
      where: { id: data.executionId },
    });

    if (!run) {
      throw new Error(`ExecutionRun not found: ${data.executionId}`);
    }

    // 2. Validate Generation ID (Fencing)
    if (run.generationId !== data.generationId) {
      throw new Error(`Fencing Token Mismatch: expected ${run.generationId}, got ${data.generationId}. The lease has expired or was preempted.`);
    }

    // 3. Append to Event Store (Source of Truth)
    const event = await tx.executionEvent.create({
      data: {
        executionId: data.executionId,
        eventType: data.eventType,
        payload: data.payload,
        correlationId: data.correlationId || randomUUID(),
        causationId: data.causationId || randomUUID(),
        rootExecutionId: data.rootExecutionId || run.id,
      },
    });

    // 4. Update the Projection (ExecutionRun is only a mutable projection)
    // You should never overwrite destructively outside of appending the event first.
    let nextStatus = run.status;
    let nextFinishedAt = run.finishedAt;
    
    // Simplistic projection logic based on event type
    if (data.eventType === 'WorkflowCompleted' || data.eventType === 'WorkflowFailed') {
      nextStatus = data.eventType === 'WorkflowCompleted' ? 'COMPLETED' : 'FAILED';
      nextFinishedAt = new Date();
    }

    await tx.executionRun.update({
      where: { id: run.id },
      data: {
        status: nextStatus,
        finishedAt: nextFinishedAt,
        // Depending on event, we might update outputData etc.
        // We do NOT change generationId here unless we are explicitly handing off the lease
      },
    });

    return event;
  });
}

export async function acquireExecutionLease(executionId: string) {
  // Generates a new generation ID and assigns the lease
  return await prisma.$transaction(async (tx) => {
    const newGenerationId = randomUUID();

    const run = await tx.executionRun.update({
      where: { id: executionId },
      data: {
        generationId: newGenerationId,
      },
    });

    // Record the lease acquisition event
    await tx.executionEvent.create({
      data: {
        executionId,
        eventType: "LeaseAcquired",
        payload: { newGenerationId },
        correlationId: randomUUID(),
        causationId: randomUUID(),
        rootExecutionId: run.id,
      },
    });

    return run;
  });
}
