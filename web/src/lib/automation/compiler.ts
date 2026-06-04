import { Node, Edge } from "@xyflow/react";

export interface CompiledWorkflow {
  executionOrder: string[];
  nodesById: Record<string, Node>;
  edgesBySource: Record<string, Edge[]>;
  isValid: boolean;
  errors: string[];
}

/**
 * Sovereign Workflow Compiler
 * Transforms a React Flow graph (nodes + edges) into a validated, sorted execution plan.
 */
export class WorkflowCompiler {
  /**
   * Compiles and validates the workflow graph.
   */
  public static compile(nodes: Node[], edges: Edge[]): CompiledWorkflow {
    const errors: string[] = [];
    const nodesById: Record<string, Node> = {};
    const edgesBySource: Record<string, Edge[]> = {};
    const inDegree: Record<string, number> = {};

    // 1. Initialize
    nodes.forEach(node => {
      nodesById[node.id] = node;
      inDegree[node.id] = 0;
      edgesBySource[node.id] = [];
    });

    // 2. Map Edges & Calculate In-Degrees
    edges.forEach(edge => {
      if (!nodesById[edge.source] || !nodesById[edge.target]) {
        errors.push(`Invalid edge detected: ${edge.source} -> ${edge.target}`);
        return;
      }
      edgesBySource[edge.source].push(edge);
      inDegree[edge.target] = (inDegree[edge.target] || 0) + 1;
    });

    // 3. Topological Sort (Kahn's Algorithm)
    const queue: string[] = [];
    const executionOrder: string[] = [];

    // Start with terminal trigger nodes (in-degree 0)
    Object.keys(inDegree).forEach(id => {
      if (inDegree[id] === 0) queue.push(id);
    });

    while (queue.length > 0) {
      const u = queue.shift()!;
      executionOrder.push(u);

      edgesBySource[u]?.forEach(edge => {
        inDegree[edge.target]--;
        if (inDegree[edge.target] === 0) {
          queue.push(edge.target);
        }
      });
    }

    // 4. Cycle Detection
    if (executionOrder.length !== nodes.length) {
      errors.push("Circular dependency detected. Workflows must be Directed Acyclic Graphs (DAGs).");
    }

    // 5. Validation Logic
    const hasTrigger = nodes.some(n => n.type === 'trigger');
    if (!hasTrigger) errors.push("No trigger node defined. Workflows must start with a trigger.");

    return {
      executionOrder,
      nodesById,
      edgesBySource,
      isValid: errors.length === 0,
      errors
    };
  }
}
