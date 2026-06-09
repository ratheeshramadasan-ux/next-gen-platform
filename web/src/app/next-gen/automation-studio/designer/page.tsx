"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { StudioLayout } from "@/components/studio/StudioLayout";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import { StudioToolbox, StudioInspector, StudioDock } from "@/components/studio/StudioPanels";
import { useSearchParams } from "next/navigation";
import { saveStudioWorkflow, getStudioWorkflow } from "@/app/actions/tenantActions";
import { toast } from "sonner";
import {
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
  ReactFlowProvider,
  useReactFlow
} from "@xyflow/react";
import {
  Globe,
  MousePointer2,
  Type,
  FileText,
  Zap,
  LayoutGrid,
  FolderOpen,
  FileCode,
  Target,
  Split,
  ArrowRightLeft,
  Repeat,
  ClipboardCheck,
  Clock,
  Database,
  ShieldCheck
} from "lucide-react";

export default function StudioDesignerPage() {
  return (
    <ReactFlowProvider>
      <Suspense fallback={
        <div className="h-screen w-full bg-background flex items-center justify-center">
          <div className="text-sm font-bold uppercase tracking-widest animate-pulse opacity-20">Loading Designer...</div>
        </div>
      }>
        <InnerDesigner />
      </Suspense>
    </ReactFlowProvider>
  );
}

function InnerDesigner() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get("projectId");
  const workspaceId = searchParams.get("workspaceId");
  const workflowIdQuery = searchParams.get("workflowId");

  const [workflowId, setWorkflowId] = useState<string | null>(workflowIdQuery);

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);

  // --- React Flow State: BPM Invoice Processing Flow ---
  const initialNodes: Node[] = [
    {
      id: "n-start", type: "studioNode", position: { x: 420, y: 40 },
      data: { type: "start", label: "Start", icon: Zap, color: "text-emerald-500 bg-emerald-500/10", status: "success" }
    },
    {
      id: "n-extract", type: "studioNode", position: { x: 370, y: 180 },
      data: { label: "Extract Invoice PDF", icon: FileText, color: "text-blue-500 bg-blue-500/10", sublabel: "OCR Processing", status: "success", filePath: "strDocumentPath", ocrEngine: "GPT-4o Vision", extractedData: "dtInvoiceDetails", confidence: "numOcrScore" }
    },
    {
      id: "n-decision", type: "studioNode", position: { x: 400, y: 340 },
      data: { type: "condition", label: "Amount > $10,000?", icon: Split, color: "text-amber-500 bg-amber-500/10", status: "none" }
    },
    {
      id: "n-validate", type: "studioNode", position: { x: 200, y: 470 },
      data: { label: "Validate Invoice", icon: ShieldCheck, color: "text-blue-500 bg-blue-500/10", sublabel: "Rule Engine", status: "none" }
    },
    {
      id: "n-approval", type: "studioNode", position: { x: 550, y: 470 },
      data: { type: "subflow", label: "Approval Subflow", icon: ClipboardCheck, color: "text-teal-500 bg-teal-500/10", sublabel: "Human Review", status: "none" }
    },
    {
      id: "n-update", type: "studioNode", position: { x: 400, y: 600 },
      data: { label: "Update SAP", icon: Database, color: "text-blue-500 bg-blue-500/10", sublabel: "ERP Integration", status: "none" }
    },
    {
      id: "n-end", type: "studioNode", position: { x: 430, y: 720 },
      data: { type: "end", label: "End", icon: Zap, color: "text-rose-500 bg-rose-500/10", status: "none" }
    },
  ];

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  const initialEdges: Edge[] = [
    { id: "e-start-extract", source: "n-start", target: "n-extract", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "e-extract-decision", source: "n-extract", target: "n-decision", animated: true, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "e-decision-validate", source: "n-decision", target: "n-validate", sourceHandle: "no", animated: false, label: "No", markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "e-decision-approval", source: "n-decision", target: "n-approval", sourceHandle: "yes", animated: false, label: "Yes", markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "e-validate-update", source: "n-validate", target: "n-update", animated: false, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "e-approval-update", source: "n-approval", target: "n-update", animated: false, markerEnd: { type: MarkerType.ArrowClosed } },
    { id: "e-update-end", source: "n-update", target: "n-end", animated: false, markerEnd: { type: MarkerType.ArrowClosed } },
  ];
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNodeId(nodes[0]?.id || null);
  }, []);

  const handleUpdateNodeData = useCallback((id: string, newData: any) => {
    const msgboxNode = nodes.find((n) => n.id === id);
    if (
      msgboxNode &&
      (msgboxNode.data as any).label?.toLowerCase().includes("msgbox") &&
      newData.inputs?.buttons === "YesNoCancel" &&
      (msgboxNode.data as any).inputs?.buttons !== "YesNoCancel"
    ) {
      const hasDecisionConnection = edges.some(
        (e) => e.source === id && (nodes.find((n) => n.id === e.target)?.data as any).type === "condition"
      );
      if (!hasDecisionConnection) {
        const decisionNodeId = `n-decision-${Date.now()}`;
        const decisionNode = {
          id: decisionNodeId,
          type: "studioNode",
          position: { x: msgboxNode.position.x, y: msgboxNode.position.y + 150 },
          data: {
            label: "Decision",
            icon: Split,
            color: "text-amber-500 bg-amber-500/10",
            type: "condition",
            sublabel: "LOGIC BRANCH",
            status: "none",
            branches: [
              { name: "Yes", condition: "{userResponse} == 'Yes'", targetNode: "", priority: 1 },
              { name: "No", condition: "{userResponse} == 'No'", targetNode: "", priority: 2 },
              { name: "Cancel", condition: "{userResponse} == 'Cancel'", targetNode: "", priority: 3 }
            ]
          }
        };

        const newEdge = {
          id: `e-${id}-${decisionNodeId}`,
          source: id,
          target: decisionNodeId,
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed }
        };

        setNodes((nds) => nds.concat(decisionNode as any));
        setEdges((eds) => eds.concat(newEdge as any));
      }
    }

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === id) {
          return { ...node, data: { ...node.data, ...newData } };
        }
        return node;
      })
    );
  }, [nodes, edges, setNodes, setEdges]);

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== id));
    setEdges((eds) => eds.filter((edge) => edge.source !== id && edge.target !== id));
    setSelectedNodeId(null);
  }, [setNodes, setEdges]);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || null;

  const { screenToFlowPosition } = useReactFlow();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const toolMap: any = {
        "Click": { icon: MousePointer2, color: "text-blue-500 bg-blue-500/10", sublabel: "UI CLICK" },
        "Type Into": { icon: Type, color: "text-emerald-500 bg-emerald-500/10", sublabel: "KEYBOARD INPUT", hasInput: true },
        "Select Item": { icon: LayoutGrid, color: "text-blue-400 bg-blue-400/10", sublabel: "DROPDOWN SELECT" },
        "Extract Data": { icon: FileText, color: "text-indigo-500 bg-indigo-500/10", sublabel: "DATA SCRAPING" },
        "Excel": { icon: FileText, color: "text-emerald-500 bg-emerald-500/10", sublabel: "EXCEL OPERATION" },
        "File": { icon: FolderOpen, color: "text-amber-500 bg-amber-500/10", sublabel: "FILESYSTEM" },
        "JSON": { icon: FileCode, color: "text-blue-400 bg-blue-400/10", sublabel: "DATA TRANSFORM" },
        "Assign": { icon: Target, color: "text-rose-400 bg-rose-400/10", sublabel: "VARIABLE ASSIGN" },
        "If": { icon: Split, color: "text-amber-500 bg-amber-500/10", type: "condition", sublabel: "LOGIC BRANCH" },
        "Switch": { icon: ArrowRightLeft, color: "text-amber-600 bg-amber-600/10", sublabel: "MULTI BRANCH" },
        "For Each": { icon: Repeat, color: "text-amber-500 bg-amber-500/10", sublabel: "ITERATION LOOP" },
        "API Call": { icon: Globe, color: "text-indigo-400 bg-indigo-400/10", sublabel: "HTTP REQUEST" },
        "Run Task": { icon: Zap, color: "text-amber-400 bg-amber-400/10", sublabel: "SUB-PROCESS" },
        "Create Action": { icon: ClipboardCheck, color: "text-purple-500 bg-purple-500/10", sublabel: "HUMAN TASK" },
        "Wait for Action": { icon: Clock, color: "text-purple-400 bg-purple-400/10", sublabel: "AWAIT APPROVAL" },
        "Transform Data": { icon: ArrowRightLeft, color: "text-cyan-500 bg-cyan-500/10", sublabel: "DATA TRANSFORM" },
        "Try Catch": { icon: ShieldCheck, color: "text-rose-500 bg-rose-500/10", sublabel: "ERROR HANDLER" },
        "SAP": { icon: Database, color: "text-blue-600 bg-blue-600/10", sublabel: "SAP CONNECTOR" },
        "AWS S3": { icon: Database, color: "text-amber-500 bg-amber-500/10", sublabel: "CLOUD STORAGE" },
      };

      const config = toolMap[type] || { icon: Zap, color: "text-primary bg-primary/10", sublabel: "GENERIC NODE" };

      const newNode: Node = {
        id: `n-${Date.now()}`,
        type: "studioNode",
        position,
        data: {
          label: type,
          icon: config.icon,
          color: config.color,
          sublabel: config.sublabel,
          type: config.type,
          hasInput: config.hasInput,
          status: "none"
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes]
  );

  // --- Real-Time Recording Engine ---
  useEffect(() => {
    if (isRecording) {
      (window as any).__recorderAgent__sendEvent = (eventJson: string) => {
        const event = JSON.parse(eventJson);
        const { type, elementInfo, value } = event;

        let nodeConfig: any = {
          label: "Action",
          icon: Zap,
          color: "text-primary bg-primary/10",
          sublabel: "CAPTURED STEP"
        };

        if (type === 'click') {
          nodeConfig = {
            label: `Click ${elementInfo.tagName}`,
            icon: MousePointer2,
            color: "text-blue-500 bg-blue-500/10",
            sublabel: elementInfo.innerText || elementInfo.cssPath
          };
        } else if (type === 'type' || type === 'select') {
          nodeConfig = {
            label: `Type into ${elementInfo.tagName}`,
            icon: Type,
            color: "text-emerald-500 bg-emerald-500/10",
            sublabel: elementInfo.placeholder || elementInfo.cssPath,
            hasInput: true,
            value: value
          };
        }

        const newNodeId = `n-recorded-${Date.now()}`;

        setNodes((nds) => {
          const lastNode = nds[nds.length - 1];
          const newNode: Node = {
            id: newNodeId,
            type: "studioNode",
            position: { x: 400, y: (lastNode?.position?.y || 0) + 180 },
            data: {
              ...nodeConfig,
              selector: elementInfo.cssPath,
              xpath: elementInfo.xpath,
              status: "success"
            }
          };

          if (lastNode) {
            setEdges((eds) => [
              ...eds,
              {
                id: `e-${lastNode.id}-${newNodeId}`,
                source: lastNode.id,
                target: newNodeId,
                animated: true,
                type: 'studioEdge'
              }
            ]);
          }

          return [...nds, newNode];
        });
      };
    } else {
      delete (window as any).__recorderAgent__sendEvent;
    }

    return () => {
      delete (window as any).__recorderAgent__sendEvent;
    };
  }, [isRecording, setNodes, setEdges]);

  // Hydration
  useEffect(() => {
    async function load() {
      if (workflowId) {
        const data = await getStudioWorkflow(workflowId);
        if (data) {
          setNodes(data.nodes);
          setEdges(data.edges);
          setProject({ id: projectId || "loaded", name: data.name });
        }
      } else if (projectId) {
        setProject({ id: projectId, name: "Invoice Processing Workflow", workspaceId: workspaceId });
      } else {
        setProject({ id: "sandbox", name: "Invoice Processing Project", isSandbox: true });
      }
      setLoading(false);
    }
    load();
  }, [projectId, workspaceId, workflowId, setNodes, setEdges]);

  const handleSave = async () => {
    const payload = {
      workflowId,
      name: project?.name || "Untitled Workflow",
      nodes,
      edges,
      projectId
    };

    const res = await saveStudioWorkflow(payload);
    if (res.success) {
      setWorkflowId(res.workflowId ?? null);
      toast.success("Workflow saved to database");
    } else {
      toast.error("Failed to save workflow");
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-background/50 backdrop-blur-xl flex flex-col items-center justify-center text-center">
        <div className="relative mb-8">
          <div className="w-16 h-16 rounded-sm border-2 border-primary/20 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </div>
        </div>
        <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-foreground/20">Hydrating Studio Context</h2>
        <p className="text-[10px] font-semibold text-primary/40 uppercase mt-2 tracking-widest">Preparing Orchestration Engine...</p>
      </div>
    );
  }

  return (
    <StudioLayout
      projectName={project?.name || "Untitled Studio Project"}
      onSave={handleSave}
      sidebar={<StudioToolbox />}
      properties={
        <StudioInspector
          selectedNode={selectedNode}
          onUpdateNode={(data) => selectedNodeId && handleUpdateNodeData(selectedNodeId, data)}
          onDeleteNode={() => selectedNodeId && handleDeleteNode(selectedNodeId)}
          onStartRecording={() => setIsRecording(true)}
          isRecording={isRecording}
        />
      }
      bottomDock={<StudioDock />}
    >
      <StudioCanvas
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelectionChange}
        isRecording={isRecording}
        onStopRecording={() => setIsRecording(false)}
      />
    </StudioLayout>
  );
}
