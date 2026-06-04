import type { Request, Response } from "express";
import { RunIntentRequestSchema } from "@rpa/shared-contracts";
import { generateWorkflow } from "../services/aiPlanner.js";
import { enqueueJobs } from "../services/queue.js";

export async function runIntentRoute(req: Request, res: Response) {
  const parseResult = RunIntentRequestSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({
      status: "INVALID_REQUEST",
      errors: parseResult.error.flatten()
    });
  }

  try {
    const { intent, tenantId } = parseResult.data;
    const workflow = await generateWorkflow(intent);
    const jobs = workflow.steps.map((step) => ({
      tenantId,
      workflowId: workflow.id,
      type: step.type,
      payload: step,
      dependsOn: step.dependsOn ?? []
    }));

    await enqueueJobs(jobs);

    return res.status(202).json({
      status: "QUEUED",
      workflow,
      queuedJobs: jobs.length
    });
  } catch (error) {
    console.error("Failed to process intent", error);
    return res.status(500).json({
      status: "FAILED",
      message: "Unable to generate workflow"
    });
  }
}

