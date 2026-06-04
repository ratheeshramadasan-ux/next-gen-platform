import { z } from "zod";

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["API", "SCRIPT", "UI", "AI"]),
  action: z.string(),
  dependsOn: z.array(z.string()).default([]),
  input: z.record(z.string(), z.unknown()).default({})
});

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  intent: z.string(),
  steps: z.array(WorkflowStepSchema).min(1)
});

export const RunIntentRequestSchema = z.object({
  tenantId: z.string().min(1),
  intent: z.string().min(10)
});

export const QueuedJobSchema = z.object({
  tenantId: z.string(),
  workflowId: z.string(),
  type: WorkflowStepSchema.shape.type,
  payload: WorkflowStepSchema,
  dependsOn: z.array(z.string()).default([])
});

export const RunIntentResponseSchema = z.object({
  status: z.literal("QUEUED"),
  workflow: WorkflowDefinitionSchema,
  queuedJobs: z.number().int().nonnegative()
});

export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type RunIntentRequest = z.infer<typeof RunIntentRequestSchema>;
export type QueuedJob = z.infer<typeof QueuedJobSchema>;
export type RunIntentResponse = z.infer<typeof RunIntentResponseSchema>;

