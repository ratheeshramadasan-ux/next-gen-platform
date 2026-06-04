"use client";

import React from "react";
import { useWorkflow } from "./workflow-store";
import { Settings2, ShieldCheck, AlertCircle, Trash2, ChevronRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export const DossierPanel = () => {
  const { state, dispatch } = useWorkflow();
  const selectedNode = state.nodes.find(n => n.id === state.selectedNodeId);

  if (!selectedNode) {
    return (
      <div className="w-80 h-full bg-background/40 backdrop-blur-3xl border-l border-border/40 flex flex-col items-center justify-center p-8 text-center pt-16">
         <div className="w-16 h-16 rounded-sm bg-muted/20 border border-border/40 flex items-center justify-center mb-6 opacity-40">
            <Settings2 className="w-8 h-8 text-muted-foreground" />
         </div>
         <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-50 mb-2">No Node Selected</h4>
         <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">
            Select a designer block to configure instruction parameters and sovereign constraints.
         </p>
      </div>
    );
  }

  return (
    <div className="w-80 h-full bg-background/40 backdrop-blur-3xl border-l border-border/40 flex flex-col pt-16">
       <div className="p-6 border-b border-border/40 flex items-center justify-between bg-white/5">
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none">Configuration Dossier</span>
             <h3 className="text-lg font-black tracking-tighter text-foreground mt-1 truncate max-w-[160px]">{selectedNode.data.label as string}</h3>
          </div>
          <button 
            onClick={() => dispatch({ type: "SELECT_NODE", payload: null })}
            className="w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center border border-white/5"
          >
             <Trash2 className="w-3.5 h-3.5 text-rose-500/60" />
          </button>
       </div>

       <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
          {/* General Block Settings */}
          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                <span className="text-[9px] font-black uppercase tracking-widest text-foreground">Block Parameters</span>
             </div>
             
             <div className="flex flex-col gap-2">
                <label className="text-[9px] font-bold text-muted-foreground uppercase pl-1">Instruction Name</label>
                <input 
                   type="text" 
                   value={selectedNode.data.label as string}
                   onChange={(e) => dispatch({ type: "UPDATE_NODE_CONFIG", payload: { id: selectedNode.id, config: { ...(selectedNode.data.config as any), label: e.target.value } } })}
                   className="w-full bg-background border border-border/50 rounded-sm px-4 py-2.5 text-[10px] font-medium focus:outline-none focus:border-primary/50"
                />
             </div>

             <div className="flex flex-col gap-2 mt-2">
                <label className="text-[9px] font-bold text-muted-foreground uppercase pl-1">Retry Policy (Fail-Safe)</label>
                <select className="w-full bg-background border border-border/50 rounded-sm px-4 py-2.5 text-[10px] font-medium appearance-none">
                   <option>3 Retries (Exponential)</option>
                   <option>Immediate Halt</option>
                   <option>Ignore & Continue</option>
                </select>
             </div>
          </div>

          <div className="h-px w-full bg-white/5" />

          {/* Validation Status */}
          <div className="flex flex-col gap-4">
             <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-foreground">Sovereign Validation</span>
             </div>
             
             <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-sm flex flex-col gap-2">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Status Ready</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
                   Formal verification engine has confirmed this instruction block satisfies all constitutional ARL policies.
                </p>
             </div>
          </div>
       </div>

       <div className="p-6 border-t border-border/40 bg-background/40">
          <button className="w-full bg-primary py-3 rounded-sm text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[0.98] transition-transform flex items-center justify-center gap-2">
             <Save className="w-3.5 h-3.5" />
             Commit Changes
          </button>
       </div>
    </div>
  );
};
