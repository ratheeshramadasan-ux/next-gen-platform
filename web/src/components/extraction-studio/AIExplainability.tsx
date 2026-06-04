"use client";

import React from "react";
import { Sparkles, CheckCircle2, AlertTriangle, ShieldCheck, Anchor, Network } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIExplainabilityProps {
  fieldName?: string;
  extractedValue?: string;
  confidenceScore?: number;
  anchorsUsed?: string[];
  reasonsList?: string[];
  status?: "success" | "warning" | "error";
}

export function AIExplainability({
  fieldName = "Selected Field",
  extractedValue = "-",
  confidenceScore = 0.0,
  anchorsUsed = [],
  reasonsList = [
    "Awaiting field extraction",
    "Select an anchor to view explainability"
  ],
  status = "warning"
}: AIExplainabilityProps) {
  return (
    <div className="flex flex-col gap-3.5 p-4 rounded-xl border border-border/50 bg-card/60 shadow-lg text-foreground/80">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-emerald-400 animate-pulse" />
          <span className="text-[10px] font-black text-foreground/80 uppercase tracking-widest">
            AI Extraction Analysis
          </span>
        </div>
        <span className={cn(
          "text-[7px] font-black px-2 py-0.5 rounded-full uppercase",
          status === "success" && "text-emerald-400 bg-emerald-500/10",
          status === "warning" && "text-amber-400 bg-amber-500/10",
          status === "error" && "text-rose-400 bg-rose-500/10"
        )}>
          {status === "success" ? "Confidence Resolved" : "Low Confidence Warning"}
        </span>
      </div>
 
      {/* Structured Extraction Explanation */}
      <div className="bg-muted/30 border border-border/50 rounded-lg p-3 space-y-2 text-[9px] uppercase tracking-tight">
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Active Variable</span>
          <span className="font-extrabold text-foreground">{fieldName}</span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Extracted String</span>
          <span className="font-mono text-emerald-400 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 font-bold">
            {extractedValue}
          </span>
        </div>
        <div className="flex justify-between items-center text-muted-foreground">
          <span>Final confidence</span>
          <span className="font-extrabold text-emerald-400">{Math.round(confidenceScore * 100)}% Match</span>
        </div>
      </div>
 
      {/* Hybrid Anchor Nodes */}
      <div className="space-y-1.5">
        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
          Connected Neighbors & Anchors
        </span>
        <div className="grid grid-cols-1 gap-1.5 font-mono text-[8px]">
          {anchorsUsed.map((anchor, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-background/40 p-2 rounded-lg border border-border/40">
              <Anchor size={11} className="text-amber-500" />
              <span className="text-foreground/80 uppercase leading-none">{anchor}</span>
            </div>
          ))}
        </div>
      </div>
 
      {/* Logic Breakdown Reasoning list */}
      <div className="space-y-1.5">
        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">
          Extraction Rationale
        </span>
        <div className="space-y-1">
          {reasonsList.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-2.5 text-[8.5px] leading-tight">
              <CheckCircle2 size={11} className="text-emerald-500 mt-0.5 shrink-0" />
              <span className="text-muted-foreground uppercase tracking-tight">{reason}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
export default AIExplainability;
