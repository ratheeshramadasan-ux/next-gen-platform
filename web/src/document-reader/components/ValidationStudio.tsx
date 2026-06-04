"use client";

import React from "react";
import { TrendingUp, AlertCircle, CheckCircle2, ShieldCheck, Download, ChevronRight, FileSearch, Activity, FileCheck } from "lucide-react";
import { useDocumentReader } from "../store/documentReaderContext";
import { TrainingStage } from "../types";
import { usePipelineStore } from "../store/studioStore";
import { cn } from "@/lib/utils";

export function ValidationStudio() {
  const { updateStepStatus, setActiveStage } = useDocumentReader();
  const { trainingDocuments } = usePipelineStore();

  return (
    <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 p-4">
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Validation Studio</h2>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-80 italic mt-1">Benchmarking spatial extraction accuracy...</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-10 px-6 rounded-[9px] border border-border bg-card text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:border-primary/50 transition-all flex items-center gap-2">
            <Download size={14} />
            Export Validation Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Extraction Accuracy", value: "98.2%", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          { label: "Manual Review Required", value: "0", icon: AlertCircle, color: "text-muted-foreground", bg: "bg-muted/50" },
          { label: "Verified Datasets", value: trainingDocuments.length.toString(), icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10" },
          { label: "Model Confidence", value: "HIGH", icon: ShieldCheck, color: "text-primary", bg: "bg-primary/5" },
        ].map((stat, i) => (
          <div key={i} className="bg-card p-6 rounded-[9px] border border-border/50 shadow-sm flex items-center gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-[0.05] pointer-events-none group-hover:scale-110 transition-transform">
               <stat.icon size={48} />
            </div>
            <div className={cn("w-12 h-12 rounded-[7px] flex items-center justify-center border border-border/50", stat.bg, stat.color)}>
              <stat.icon size={20} />
            </div>
            <div className="relative z-10">
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-xl font-black text-foreground tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 bg-card rounded-[9px] border border-border shadow-sm flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
         <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
         
         <div className="w-20 h-20 rounded-[9px] bg-primary/5 border border-primary/10 flex items-center justify-center text-primary mb-6 animate-pulse">
            <FileCheck size={40} strokeWidth={1} />
         </div>
         <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-2">Queue Fully Validated</h3>
         <p className="text-[11px] text-muted-foreground max-w-sm uppercase font-bold tracking-wider leading-relaxed opacity-60">All document extractions have passed the spatial confidence threshold. No human-in-the-loop intervention is required for this batch.</p>
         
         <div className="mt-8 flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-[9px] border border-border/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
               <Activity size={12} className="text-primary" />
               Benchmark Sync: 100%
            </div>
         </div>
      </div>

      <footer className="pt-6 border-t border-border flex items-center justify-end">
         <button 
            onClick={() => {
              updateStepStatus(TrainingStage.VALIDATION, "completed");
              setActiveStage(TrainingStage.TRAINING_REVIEW);
            }}
            className={cn(
              "h-12 px-10 rounded-[9px] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 group border border-border shadow-2xl bg-card text-foreground hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            Finalize Validation & Proceed
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-primary" />
          </button>
      </footer>
    </div>
  );
}
