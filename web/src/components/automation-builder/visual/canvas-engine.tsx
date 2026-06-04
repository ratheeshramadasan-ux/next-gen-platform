import React, { useRef, useCallback, useContext } from "react";
import { 
  ReactFlow, 
  Controls, 
  Background, 
  BackgroundVariant, 
  Panel,
  XYPosition
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useWorkflow } from "./workflow-store";
import { nodeTypes } from "./custom-nodes";
import { Play, Save, ShieldCheck, Zap, History } from "lucide-react";
import { saveWorkflow, executeWorkflow } from "@/app/actions/workflowActions";
import { useAppContext } from "@/lib/context";
import { toast } from "sonner";

export const CanvasEngine = () => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { state, dispatch, onNodesChange, onEdgesChange, onConnect } = useWorkflow();
  const { tenantId } = useAppContext();

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/reactflow");
      const label = event.dataTransfer.getData("application/label");

      if (!type || !reactFlowWrapper.current) return;

      const position: XYPosition = {
        x: event.clientX - (reactFlowWrapper.current.getBoundingClientRect().left || 0),
        y: event.clientY - (reactFlowWrapper.current.getBoundingClientRect().top || 0),
      };

      const newNode = {
        id: `node_${Date.now()}`,
        type,
        position,
        data: { label, config: {} },
      };

      dispatch({ type: "ADD_NODE", payload: newNode });
    },
    [dispatch]
  );

  const handleSave = async () => {
    if (!tenantId) return;
    const res = await saveWorkflow({
        name: "Untitle Workflow",
        tenantId,
        nodes: state.nodes,
        edges: state.edges,
        definition: { nodes: state.nodes, edges: state.edges }
    });
    if (res.success) toast.success("Workflow persisted to Sovereign Kernel.");
    else toast.error("Persistence failed: " + res.error);
  };

  const handleRun = async () => {
     if (!tenantId) return;
     dispatch({ type: "EXECUTION_START" });
     
     // Note: We need a saved workflow ID to run. For this demo, we'll try to save first or use a mock ID.
     // In a real flow, saving is a prerequisite for the orchestrator.
     const saveRes = await saveWorkflow({
        name: "Active Simulation",
        tenantId,
        nodes: state.nodes,
        edges: state.edges,
        definition: { nodes: state.nodes, edges: state.edges }
     });

     if (!saveRes.success) {
        dispatch({ type: "EXECUTION_FAILED", payload: saveRes.error || "Save failure before run" });
        return;
     }

     const res = await executeWorkflow(saveRes.workflowId!, tenantId);
     if (res.success) {
        dispatch({ type: "EXECUTION_SUCCESS" });
        toast.success("Execution Completed Successfully");
     } else {
        dispatch({ type: "EXECUTION_FAILED", payload: res.error || "Unknown Failure" });
        toast.error("Execution Failed");
     }
  };

  return (
    <div className="flex-1 h-full relative" ref={reactFlowWrapper}>
      <ReactFlow
        nodes={state.nodes}
        edges={state.edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={(instance) => instance.fitView()}
        nodeTypes={nodeTypes}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => dispatch({ type: "SELECT_NODE", payload: node.id })}
        onPaneClick={() => dispatch({ type: "SELECT_NODE", payload: null })}
        colorMode="dark"
        style={{ background: "#020202" }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="rgba(255,255,255,0.05)" />
        <Controls 
          showInteractive={false} 
          className="bg-background border border-border/40 !shadow-2xl"
        />
        
        {/* Top Control Panel */}
        <Panel position="top-center" className="bg-background/80 backdrop-blur-3xl p-2 rounded-sm border border-border/40 m-4 flex items-center gap-2 shadow-2xl">
           <button 
             onClick={handleRun}
             disabled={state.isExecuting}
             className="flex items-center gap-3 px-6 py-2.5 bg-primary text-primary-foreground rounded-sm text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
           >
              <Play className="w-4 h-4" />
              Run Kernel
           </button>
           <div className="w-[1px] h-4 bg-white/10 mx-2" />
           <button 
             onClick={handleSave}
             className="p-2.5 hover:bg-white/5 rounded-sm text-muted-foreground hover:text-foreground transition-all"
           >
              <Save className="w-4 h-4" />
           </button>
           <button className="p-2.5 hover:bg-white/5 rounded-sm text-muted-foreground hover:text-foreground transition-all">
              <ShieldCheck className="w-4 h-4" />
           </button>
           <button className="p-2.5 hover:bg-white/5 rounded-sm text-muted-foreground hover:text-foreground transition-all">
              <History className="w-4 h-4" />
           </button>
        </Panel>

        {/* Global Status Panel */}
        <Panel position="bottom-right" className="mb-16 mr-4">
           <div className="bg-background/40 backdrop-blur-3xl border border-border/40 rounded-full px-4 py-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                 <Zap className="w-3.5 h-3.5 text-primary" />
                 <span className="text-[10px] font-black uppercase tracking-widest text-foreground">AOS-v1.4</span>
              </div>
              <div className="w-[1px] h-3 bg-white/10" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50">Local Simulation Mode</span>
           </div>
        </Panel>
      </ReactFlow>
    </div>
  );
};
