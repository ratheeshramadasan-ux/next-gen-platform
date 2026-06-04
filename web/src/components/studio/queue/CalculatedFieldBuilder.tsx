"use client";

import React, { useState } from "react";
import { 
  Variable, 
  FunctionSquare, 
  Zap, 
  Sparkles, 
  ChevronRight, 
  Info,
  Play,
  Check,
  Plus,
  Trash2,
  Code2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CalculatedFieldBuilder() {
  const [formula, setFormula] = useState("");
  const [selectedFunction, setSelectedFunction] = useState<any>(null);

  const availableFields = [
    { name: "Invoice Amount", key: "invoice_amount", type: "Currency" },
    { name: "Tax Rate", key: "tax_rate", type: "Number" },
    { name: "Due Date", key: "due_date", type: "Date" },
  ];

  const functions = [
    { name: "SUM", desc: "Adds all numbers in a range of cells.", usage: "SUM(field1, field2...)" },
    { name: "IF", desc: "Checks whether a condition is met.", usage: "IF(condition, true_val, false_val)" },
    { name: "DATE_DIFF", desc: "Calculates the number of days between two dates.", usage: "DATE_DIFF(start, end)" },
    { name: "MULTIPLY", desc: "Multiplies numbers.", usage: "MULTIPLY(val1, val2)" },
  ];

  return (
    <div className="w-full h-full flex gap-6 animate-in fade-in duration-500">
      
      {/* Left: Logic Canvas */}
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-card border border-border/60 rounded-sm shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center justify-between p-5 bg-muted/40 border-b border-border/60">
             <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
                   <Code2 className="text-primary" size={18} />
                </div>
                <div className="space-y-0.5">
                   <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Formula Canvas</h3>
                   <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">Define dynamic logic for this field</p>
                </div>
             </div>
             <Button variant="outline" size="sm" className="h-9 rounded-sm gap-2 border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10">
                <Sparkles size={12} />
                AI Suggest Formula
             </Button>
          </div>
          
          <div className="p-8 space-y-6 flex flex-col">
            <div className="relative group">
               <div className="absolute top-4 left-4 text-primary opacity-20 pointer-events-none group-focus-within:opacity-40 transition-opacity">
                  <FunctionSquare size={24} />
               </div>
               <textarea 
                 value={formula}
                 onChange={(e) => setFormula(e.target.value)}
                 placeholder="Enter your formula here... e.g. MULTIPLY([invoice_amount], [tax_rate])"
                 className="w-full min-h-[160px] bg-muted/20 border-2 border-border/20 rounded-sm p-6 pl-14 text-sm font-mono focus:ring-4 focus:ring-primary/10 focus:border-primary/40 outline-none transition-all resize-none"
               />
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border/10">
               <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Valid Syntax</span>
               </div>
               <Button className="h-10 px-6 gap-2 bg-primary text-white font-bold rounded-sm shadow-lg shadow-primary/20">
                  <Play size={14} fill="currentColor" />
                  Test Formula
               </Button>
            </div>
          </div>
        </div>

        {/* Preview / Results */}
        <div className="bg-muted/10 border border-border/10 rounded-sm p-6 flex flex-col gap-4">
           <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground/40 flex items-center gap-2">
             <Zap size={14} />
             Live Evaluation Result
           </h4>
           <div className="flex items-center justify-between px-4 py-3 bg-background/50 rounded-sm border border-border/10">
              <span className="text-sm font-bold text-foreground/60">Calculated Value (Sample)</span>
              <span className="text-lg font-black text-primary">$1,352.40</span>
           </div>
        </div>
      </div>

      {/* Right: Library */}
      <div className="w-80 shrink-0 flex flex-col gap-6">
        {/* Fields */}
        <div className="bg-card border border-border/60 rounded-sm shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 p-5 bg-muted/40 border-b border-border/60">
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
              <Variable className="text-primary" size={16} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Available Fields</h3>
          </div>
          <div className="p-6 space-y-2">
            <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
              {availableFields.map(f => (
                <button 
                  key={f.key}
                  onClick={() => setFormula(prev => prev + `[${f.key}]`)}
                  className="w-full flex items-center justify-between p-3 rounded-sm bg-muted/20 border border-border/10 hover:border-primary/20 hover:bg-primary/5 transition-all group"
                >
                  <span className="text-xs font-bold text-foreground/70 group-hover:text-primary transition-colors">{f.name}</span>
                  <Plus size={12} className="text-muted-foreground/40 group-hover:text-primary" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Functions */}
        <div className="flex-1 bg-card border border-border/60 rounded-sm shadow-2xl flex flex-col overflow-hidden">
          <div className="flex items-center gap-4 p-5 bg-muted/40 border-b border-border/60">
            <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20 shadow-sm">
              <FunctionSquare className="text-primary" size={16} />
            </div>
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Functions</h3>
          </div>
          <div className="p-6 flex-1 flex flex-col gap-4 overflow-hidden">
            <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar pr-1">
              {functions.map(f => (
                <div 
                  key={f.name}
                  onClick={() => setSelectedFunction(f)}
                  className={cn(
                    "p-4 rounded-sm border transition-all cursor-pointer group",
                    selectedFunction?.name === f.name ? "bg-primary/10 border-primary/20 shadow-inner" : "bg-muted/10 border-transparent hover:border-border/20"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-black text-foreground/80 group-hover:text-primary transition-colors">{f.name}</span>
                    <button onClick={(e) => { e.stopPropagation(); setFormula(prev => prev + `${f.name}()`); }} className="p-1.5 rounded-lg hover:bg-primary/20 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus size={14} />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
