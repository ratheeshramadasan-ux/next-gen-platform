"use client";

import React, { useState } from "react";
import { Sparkles, MapPin, AlignLeft, Layers, CheckCircle, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartDetectionEngineProps {
  onApplyDetection?: (detectionId: string) => void;
  onApplyAll?: () => void;
}

export function SmartDetectionEngine({ onApplyDetection, onApplyAll }: SmartDetectionEngineProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const detections: any[] = [];

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="flex flex-col h-full bg-card/60 rounded-xl border border-border p-3 shadow-lg select-none">
      <div className="flex items-center justify-between mb-3 px-1 border-b border-border pb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles size={14} className="text-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-muted-foreground/80 uppercase tracking-widest">Smart Detect</span>
        </div>
        <span className="text-[7px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
          {detections.length} Found
        </span>
      </div>

      <div className="p-2 mb-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg text-[8px] text-emerald-600 leading-normal uppercase font-bold tracking-tight">
        AI Semantic Engine has scanned the active page and identified {detections.length} potential standard fields based on layout and keyword context.
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
        {detections.map((det) => {
          const isSelected = selectedIds.includes(det.id);
          const Icon = det.icon;
          return (
            <div 
              key={det.id}
              onClick={() => toggleSelection(det.id)}
              className={cn(
                "flex flex-col gap-1.5 p-2 rounded-lg border cursor-pointer transition-all group",
                isSelected ? "border-emerald-500/30 bg-emerald-500/10" : "border-border/50 bg-muted/30 hover:bg-muted"
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={cn("w-3 h-3 rounded-sm flex items-center justify-center border transition-colors", isSelected ? "bg-emerald-500 border-emerald-500 text-background" : "border-muted-foreground/50")}>
                    {isSelected && <CheckCircle size={8} />}
                  </div>
                  <span className={cn("text-[9px] font-black uppercase tracking-tight", isSelected ? "text-emerald-500" : "text-foreground/80")}>{det.name}</span>
                </div>
                <span className={cn("text-[8px] font-black", det.conf > 0.95 ? "text-emerald-500" : "text-amber-500")}>
                  {Math.round(det.conf * 100)}%
                </span>
              </div>
              
              <div className="flex items-center justify-between ml-5">
                <div className="flex items-center gap-1.5 bg-background px-1.5 py-0.5 rounded border border-border/50">
                  <Icon size={8} className={det.color} />
                  <span className="text-[7px] text-muted-foreground/80 font-bold uppercase">{det.type}</span>
                </div>
                <span className="text-[9px] font-mono font-bold text-emerald-400 bg-emerald-500/5 px-1.5 rounded">{det.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-border">
        <button 
          disabled={selectedIds.length === 0}
          onClick={onApplyAll}
          className={cn(
            "w-full h-8 rounded-lg text-[9px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-lg",
            selectedIds.length > 0 
              ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20" 
              : "bg-muted text-muted-foreground/60 cursor-not-allowed"
          )}
        >
          <Zap size={11} className={selectedIds.length > 0 ? "text-white" : "text-muted-foreground/60"} />
          Apply {selectedIds.length > 0 ? selectedIds.length : "0"} Fields
        </button>
      </div>
    </div>
  );
}
export default SmartDetectionEngine;
