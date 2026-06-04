"use client";

import React, { useState } from "react";
import { Table, Sliders, Settings2, Sparkles, HelpCircle, Layers, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableDesignerProps {
  tableName?: string;
  onConfigChange?: (config: any) => void;
}

export function TableDesigner({ tableName = "Line Items Table", onConfigChange }: TableDesignerProps) {
  const [config, setConfig] = useState({
    allowMultiPage: true,
    detectContinuation: true,
    headerRepeatDetection: true,
    footerIgnore: true,
    mergePartialRows: false,
    dynamicColumns: true,
    nestedRows: false,
    aiRepair: true
  });

  const toggleOption = (key: keyof typeof config) => {
    const updated = { ...config, [key]: !config[key] };
    setConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  const columnsMock = [
    { name: "Item ID", type: "alphanumeric", width: "15%" },
    { name: "Description", type: "text", width: "45%" },
    { name: "Quantity", type: "numeric", width: "12%" },
    { name: "Unit Price", type: "currency", width: "13%" },
    { name: "Total Amount", type: "currency", width: "15%" }
  ];

  return (
    <div className="flex flex-col gap-4 p-3.5 rounded-xl border border-border/40 bg-card/40 shadow-lg text-foreground/80">
      
      {/* Header Info */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div className="flex items-center gap-2">
          <Table size={13} className="text-primary" />
          <span className="text-[10px] font-black text-foreground/80 uppercase tracking-widest">
            {tableName} Config
          </span>
        </div>
        <span className="text-[7px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase">
          Continuation Engine
        </span>
      </div>

      {/* Grid Settings Switchex */}
      <div className="grid grid-cols-1 gap-2.5">
        
        {/* Toggle options */}
        {[
          { key: "allowMultiPage", label: "Allow Multi-page Table", desc: "Scan and track grid rows across page boundaries" },
          { key: "detectContinuation", label: "Detect Grid Continuation", desc: "Recognize continuation patterns dynamically" },
          { key: "headerRepeatDetection", label: "Header Repeat Detection", desc: "Ignore repeated titles on consecutive pages" },
          { key: "footerIgnore", label: "Footer Ignore & Truncate", desc: "Ignore page numbers, summaries, and legal blocks" },
          { key: "mergePartialRows", label: "Merge Partial Rows", desc: "Combine multiline columns into single semantic row" },
          { key: "dynamicColumns", label: "Dynamic Column Adapters", desc: "Adjust column coordinate boundaries page by page" },
          { key: "nestedRows", label: "Nested Row Parsing", desc: "Support child rows inside merged main descriptions" },
          { key: "aiRepair", label: "AI Auto-Repair Matrix", desc: "Repair missing cell outlines and text overflows using LLM" }
        ].map((opt) => {
          const isEnabled = config[opt.key as keyof typeof config];
          return (
            <div 
              key={opt.key}
              onClick={() => toggleOption(opt.key as keyof typeof config)}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all group select-none",
                isEnabled 
                  ? "border-primary/20 bg-primary/5 hover:bg-primary/10" 
                  : "border-border/50 bg-muted/10 hover:bg-muted/20"
              )}
            >
              <div className="flex flex-col gap-0.5 min-w-0 pr-2">
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-tight",
                  isEnabled ? "text-primary" : "text-muted-foreground"
                )}>
                  {opt.label}
                </span>
                <span className="text-[7px] text-muted-foreground leading-tight">
                  {opt.desc}
                </span>
              </div>

              <div className={cn(
                "w-7 h-4 rounded-full p-0.5 transition-colors flex items-center shrink-0",
                isEnabled ? "bg-primary justify-end" : "bg-muted justify-start"
              )}>
                <div className="w-3 h-3 rounded-full bg-white shadow-md" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Dynamic Columns Alignments */}
      <div className="border-t border-border/40 pt-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
            Column Grid Taxonomy
          </span>
          <span className="text-[7px] font-bold text-muted-foreground">5 Columns Configured</span>
        </div>

        <div className="bg-muted/30 border border-border/40 rounded-lg p-2 flex flex-col gap-1.5 font-mono text-[8px]">
          {columnsMock.map((col, idx) => (
            <div key={idx} className="flex items-center justify-between bg-background/50 p-1.5 rounded border border-border/30">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground/75">C{idx+1}</span>
                <span className="font-extrabold text-foreground/80 uppercase">{col.name}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground text-[7px]">
                <span className="bg-indigo-500/10 text-indigo-400 px-1 py-0.2 rounded uppercase">{col.type}</span>
                <span>{col.width}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
export default TableDesigner;
