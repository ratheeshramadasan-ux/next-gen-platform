"use client";

import React from "react";
import { WorkflowProvider } from "@/components/automation-builder/visual/workflow-store";
import { NodePalette } from "@/components/automation-builder/visual/node-palette";
import { CanvasEngine } from "@/components/automation-builder/visual/canvas-engine";
import { DossierPanel } from "@/components/automation-builder/visual/dossier-panel";
import { ExecutionConsole } from "@/components/automation-builder/visual/execution-console";
import { ReactFlowProvider } from "@xyflow/react";

/**
 * The Sovereign Automation Studio main entry point.
 * Hosts the modular three-panel IDE layout with a centralized state container.
 */
export default function VisualBuilderPage() {
  return (
    <WorkflowProvider>
      <div className="fixed inset-0 flex flex-col pt-16 h-screen overflow-hidden">
        {/* Top Control Bar could go here if not in CanvasEngine Panel */}
        
        <div className="flex-1 flex overflow-hidden">
          {/* Left Toolbox */}
          <NodePalette />

          {/* Main Workspace (Canvas + Console) */}
          <div className="flex-1 relative flex flex-col overflow-hidden">
             <ReactFlowProvider>
                <CanvasEngine />
             </ReactFlowProvider>
             
             {/* Bottom Debug Console */}
             <ExecutionConsole />
          </div>

          {/* Right Properties Panel */}
          <DossierPanel />
        </div>
      </div>
    </WorkflowProvider>
  );
}
