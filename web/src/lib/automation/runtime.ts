import { prisma } from "@/lib/prisma";
import { WorkflowCompiler } from "./compiler";
import { NodeExecutors, ExecutionContext } from "./executors";
import { Node, Edge } from "@xyflow/react";

/**
 * Sovereign Execution Runtime (Kernel Orchestrator)
 * 
 * Orchestrates the full lifecycle of a workflow execution.
 * Handles graph traversal, checkpointing, and real-time telemetry.
 */
export class KernelOrchestrator {
  /**
   * Triggers the execution of a workflow.
   */
  public static async execute(
    workflowId: string, 
    tenantId: string, 
    inputData: any = {}
  ) {
    // 1. Fetch Workflow from DB
    const workflow = await (prisma as any).workflow.findUnique({
      where: { id: workflowId },
      include: { nodes: true, edges: true }
    });

    if (!workflow) throw new Error("Workflow not found.");

    // 2. Map DB models to React Flow format for compiler
    const nodes: Node[] = workflow.nodes.map(n => ({
      id: n.id,
      type: n.type,
      position: { x: n.positionX, y: n.positionY },
      data: { label: n.label, config: n.config }
    }));

    const edges: Edge[] = workflow.edges.map(e => ({
      id: e.id,
      source: e.sourceNodeId,
      target: e.targetNodeId,
      data: { condition: e.condition }
    }));

    // 3. Compile & Validate
    const compiled = WorkflowCompiler.compile(nodes, edges);
    if (!compiled.isValid) {
      throw new Error(`Compilation failed: ${compiled.errors.join(", ")}`);
    }

    // 4. Create Execution Run
    const run = await (prisma as any).executionRun.create({
      data: {
        workflowId,
        status: "Running",
        inputData
      }
    });

    const context: ExecutionContext = {
      tenantId,
      executionId: run.id,
      globalInputs: inputData,
      nodeResults: {}
    };

    let finalStatus: "Success" | "Failed" | "Cancelled" = "Success";
    let finalOutput: any = {};

    try {
      // 5. Sequential Execution (based on topological order)
      // Note: In an enterprise cluster, we would use a queue and parallelize branches.
      for (const nodeId of compiled.executionOrder) {
        const node = compiled.nodesById[nodeId];
        
        // Log node start
        const log = await (prisma as any).executionLog.create({
          data: {
            executionId: run.id,
            nodeId,
            nodeName: node.data.label as string || node.type,
            status: "Running",
            input: context.nodeResults // Simplified: pass all previous results
          }
        });

        const start = Date.now();
        const result = await NodeExecutors.execute(node, context);
        const duration = Date.now() - start;

        // Store result for downstream nodes
        context.nodeResults[nodeId] = result.output;

        // Update Log
        await (prisma as any).executionLog.update({
          where: { id: log.id },
          data: {
            status: result.status === "success" ? "Success" : "Failed",
            output: result.output,
            error: result.error,
            durationMs: duration
          }
        });

        if (result.status === "failed") {
          finalStatus = "Failed";
          break; // Stop execution on failure unless "Continue on Error" logic is implemented
        }

        if (node.type === "output") {
          finalOutput = result.output;
        }
      }
    } catch (e: any) {
      finalStatus = "Failed";
      console.error("Critical Runtime Failure:", e);
    }

    // 6. Finalize Run
    await (prisma as any).executionRun.update({
      where: { id: run.id },
      data: {
        status: finalStatus,
        outputData: finalOutput,
        finishedAt: new Date()
      }
    });

    return { runId: run.id, status: finalStatus, output: finalOutput };
  }
}
