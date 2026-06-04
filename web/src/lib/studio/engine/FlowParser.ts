import { Node, Edge } from "@xyflow/react";

export class FlowParser {
  private nodes: Node[];
  private edges: Edge[];

  constructor(nodes: Node[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;
  }

  getStartNode() {
    // Look for a node with subType 'start' or type 'event' and subType 'start'
    return this.nodes.find((n) => n.data?.subType === "start" || n.type === "startNode");
  }

  getNextNode(currentNode: Node, result: any): Node | null {
    const nodes = this.getNextNodes(currentNode, result);
    return nodes.length > 0 ? nodes[0] : null;
  }

  getNextNodes(currentNode: Node, result: any): Node[] {
    const possibleEdges = this.edges.filter((e) => e.source === currentNode.id);

    if (possibleEdges.length === 0) return [];

    const dragType = (currentNode.data as any)?.dragType || (currentNode.data as any)?.type || "";
    const isParallel = dragType.includes("Parallel") || dragType.includes("Fork") || (currentNode.data as any)?.type === "parallel_fork";

    if (isParallel) {
      return possibleEdges.map(edge => this.nodes.find((n) => n.id === edge.target)).filter(Boolean) as Node[];
    }

    // Handle decision nodes (diamond)
    if (currentNode.data?.type === "gateway" || currentNode.type === "gatewayNode" || currentNode.data?.type === "decision") {
      // Find edge where the result matches the condition
      for (const edge of possibleEdges) {
        const condition = edge.data?.condition || edge.label;
        if (!condition) continue;

        try {
          if (String(result) === String(condition)) {
            const target = this.nodes.find((n) => n.id === edge.target);
            if (target) return [target];
          }
          
          if (condition === "Yes" || condition === "No") {
             const boolResult = !!result;
             if ((condition === "Yes" && boolResult) || (condition === "No" && !boolResult)) {
                const target = this.nodes.find((n) => n.id === edge.target);
                if (target) return [target];
             }
          }
        } catch (err) {
          console.error("Condition evaluation error:", err);
        }
      }
    }

    // Default: first edge if only one, or fallback
    const targetId = possibleEdges[0].target;
    const target = this.nodes.find((n) => n.id === targetId);
    return target ? [target] : [];
  }

  validateFlow() {
    const errors: string[] = [];
    const startNode = this.getStartNode();
    if (!startNode) errors.push("Missing Start Node");

    const endNodes = this.nodes.filter(n => n.data?.subType === 'end');
    if (endNodes.length === 0) errors.push("Missing End Node (Terminal Point)");

    // Check for missing connections
    this.nodes.forEach(node => {
      const isStart = node.data?.subType === 'start';
      const isEnd = node.data?.subType === 'end';
      
      const hasInEdge = this.edges.some(e => e.target === node.id);
      const hasOutEdge = this.edges.some(e => e.source === node.id);

      if (!isStart && !hasInEdge) errors.push(`Node "${node.data?.label || node.id}" has no incoming connection.`);
      if (!isEnd && !hasOutEdge) errors.push(`Node "${node.data?.label || node.id}" has no outgoing connection.`);
      
      // Check for missing required inputs (generic check)
      if (node.type === 'taskNode' || node.type === 'serviceTask') {
        if (!node.data?.inputs || Object.keys(node.data.inputs).length === 0) {
          errors.push(`Activity "${node.data?.label || node.id}" is not configured.`);
        }
      }
    });

    return errors;
  }
}
