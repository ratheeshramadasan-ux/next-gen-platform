import { v4 as uuid } from "uuid";
import { Node, Edge } from "@xyflow/react";
import { FlowParser } from "./FlowParser";
import { ExecutionContext } from "./Context";
import { activities } from "./activities";
import { retry } from "./utils/retry";
import { executionLogger } from "./utils/logger";
import { runParallelBranches } from "./utils/parallelExecutor";

export class ExecutionEngine {
  private flow: { nodes: Node[]; edges: Edge[] };
  private parser: FlowParser;
  private context: ExecutionContext;
  public executionId: string;

  constructor(nodes: Node[], edges: Edge[], options?: { onPrompt?: (config: any) => Promise<string> }) {
    this.flow = { nodes, edges };
    this.parser = new FlowParser(nodes, edges);
    this.executionId = uuid();
    this.context = new ExecutionContext(this.executionId);
    if (options?.onPrompt) {
      (this.context as any).onPrompt = options.onPrompt;
    }
  }

  async execute() {
    let activeNodes: Node[] = [this.parser.getStartNode()].filter(Boolean) as Node[];
    executionLogger.clear();
    const visited = new Set<string>();

    while (activeNodes.length > 0) {
      const currentNode = activeNodes.shift()!;
      const nodeId = currentNode.id;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const nodeLabel = String(currentNode.data?.label || currentNode.type || "Unnamed Node");
      const startTime = Date.now();

      try {
        executionLogger.log({
          executionId: this.executionId,
          nodeId,
          nodeLabel,
          status: "STARTED"
        });

        let result: any = null;

        // Handle Parallel Nodes (Explicit Block)
        if (currentNode.data?.type === "PARALLEL" || currentNode.type === "parallelNode") {
          const branches = (currentNode.data as any).branches || [];
          result = await runParallelBranches(
            branches,
            this,
            this.context,
            (currentNode.data as any).properties
          );
        } 
        // Handle Standard Activities (including Message Box)
        else if (currentNode.data?.subType !== "start" && currentNode.data?.subType !== "end") {
          const dragType = (currentNode.data as any).dragType || currentNode.data?.subType || currentNode.data?.label;
          
          // Special Case: Message Box needs onPrompt
          if ((dragType === "Message Box" || dragType === "MsgBox") && (this.context as any).onPrompt) {
             const message = (currentNode.data as any).inputs?.message || (currentNode.data as any).dialogMessage || nodeLabel;
             const title = (currentNode.data as any).inputs?.title || (currentNode.data as any).dialogTitle || "Message";
             result = await (this.context as any).onPrompt({ message, title, node: currentNode });
          } else {
            const executor = activities[dragType];
            if (executor) {
              const retryCount = (currentNode.data as any).properties?.retryCount || 1;
              result = await retry(
                () => executor(currentNode, this.context),
                retryCount
              );
            } else {
              console.warn(`No executor found for activity: ${dragType}`);
            }
          }
        }

        this.context.setLast(result);

        executionLogger.log({
          executionId: this.executionId,
          nodeId,
          nodeLabel,
          status: "SUCCESS",
          output: result,
          durationMs: Date.now() - startTime
        });

        // Termination check
        if (currentNode.data?.subType === "end") {
          console.log("Terminal node reached.");
        } else {
          // Routing (Multi-path)
          const nextNodes = this.parser.getNextNodes(currentNode, result);
          activeNodes.push(...nextNodes);
        }

      } catch (err: any) {
        executionLogger.log({
          executionId: this.executionId,
          nodeId,
          nodeLabel,
          status: "FAILED",
          error: err.message,
          durationMs: Date.now() - startTime
        });
        // Stop this branch but allow others to continue? 
        // For now, let's keep it simple.
      }
    }

    return {
      executionId: this.executionId,
      logs: executionLogger.getLogs(),
      variables: this.context.variables
    };
  }

  // Branch execution for parallel blocks
  async executeBranch(nodeIds: string[], context: ExecutionContext) {
    let lastResult: any = null;
    for (const nodeId of nodeIds) {
      const node = this.flow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const dragType = (node.data as any).dragType || node.data?.subType || node.data?.label;
      const executor = activities[dragType];
      
      if (executor) {
        lastResult = await executor(node, context);
      }
    }
    return lastResult;
  }
}
