import { Edge, Node } from "@xyflow/react";
import { UniversalActivity } from "@/types/studio";

export interface ValidationResult {
  isValid: boolean;
  errors: { nodeId?: string; message: string; severity: 'error' | 'warning' }[];
}

export function validateStudioFlow(nodes: Node[], edges: Edge[]): ValidationResult {
  const errors: { nodeId?: string; message: string; severity: 'error' | 'warning' }[] = [];

  // 1. Mandatory Start Node
  const hasStart = nodes.some(n => (n.data as any).subType === 'start');
  if (!hasStart) {
    errors.push({ message: "Flow must have at least one Start Event", severity: 'error' });
  }

  // 2. Mandatory End Node
  const hasEnd = nodes.some(n => (n.data as any).subType === 'end');
  if (!hasEnd && nodes.length > 0) {
    errors.push({ message: "Flow should have at least one End Event", severity: 'warning' });
  }

  // 3. Orphan Nodes Check
  nodes.forEach(node => {
    const data = node.data as any;
    if (data.subType === 'start') return; // Start nodes don't need incoming
    
    const hasIncoming = edges.some(e => e.target === node.id);
    if (!hasIncoming) {
      errors.push({ nodeId: node.id, message: `"${data.label}" is unreachable (no incoming connections)`, severity: 'warning' });
    }
  });

  // 4. Dead-end Check
  nodes.forEach(node => {
    const data = node.data as any;
    if (data.subType === 'end') return; // End nodes don't need outgoing
    
    const hasOutgoing = edges.some(e => e.source === node.id);
    if (!hasOutgoing) {
      errors.push({ nodeId: node.id, message: `"${data.label}" is a dead-end (no outgoing connections)`, severity: 'error' });
    }
  });

  // 5. Gateway Validation
  nodes.filter(n => (n.data as any).type === 'gateway').forEach(node => {
    const data = node.data as any;
    const outgoingCount = edges.filter(e => e.source === node.id).length;
    if (outgoingCount < 2 && data.subType !== 'andGateway') {
      errors.push({ nodeId: node.id, message: `Gateway "${data.label}" should have at least 2 branches`, severity: 'warning' });
    }
  });

  return {
    isValid: !errors.some(e => e.severity === 'error'),
    errors
  };
}
