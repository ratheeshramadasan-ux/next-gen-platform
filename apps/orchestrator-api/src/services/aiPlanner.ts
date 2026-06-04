import OpenAI from "openai";
import {
  type WorkflowDefinition,
  WorkflowDefinitionSchema
} from "@rpa/shared-contracts";
import { randomUUID } from "node:crypto";

const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const plannerSystemPrompt = `
You are an RPA workflow planner.
Convert a user intent into a JSON workflow DAG.
Return valid JSON only.
Each step must include:
- id
- name
- type (API, SCRIPT, UI, or AI)
- action
- dependsOn (array of step ids)
- input (object)
`;

export async function generateWorkflow(intent: string): Promise<WorkflowDefinition> {
  if (!client) {
    return buildFallbackWorkflow(intent);
  }

  const response = await client.responses.create({
    model,
    input: [
      {
        role: "system",
        content: plannerSystemPrompt
      },
      {
        role: "user",
        content: intent
      }
    ]
  });

  const rawText = response.output_text.trim();
  const parsed = WorkflowDefinitionSchema.safeParse(JSON.parse(rawText));

  if (!parsed.success) {
    throw new Error(`Planner returned invalid workflow: ${parsed.error.message}`);
  }

  return parsed.data;
}

function buildFallbackWorkflow(intent: string): WorkflowDefinition {
  return {
    id: randomUUID(),
    name: "Fallback workflow",
    intent,
    steps: [
      {
        id: "step-1",
        name: "Review intent",
        type: "AI",
        action: "summarize_intent",
        dependsOn: [],
        input: {
          intent
        }
      },
      {
        id: "step-2",
        name: "Queue execution",
        type: "SCRIPT",
        action: "dispatch_job",
        dependsOn: ["step-1"],
        input: {
          strategy: "manual-review"
        }
      }
    ]
  };
}

