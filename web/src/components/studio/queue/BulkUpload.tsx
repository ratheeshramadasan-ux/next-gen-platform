"use client";

import React, { useState } from "react";
import { 
  Upload, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  X, 
  Check, 
  Settings2,
  Table,
  Zap,
  Info,
  ChevronDown
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function BulkUpload({ onCancel, onComplete }: { onCancel: () => void, onComplete: () => void }) {
  const [step, setStep] = useState(1);
  const [dragActive, setDragActive] = useState(false);
  
  const steps = [
    { id: 1, name: "Upload File" },
    { id: 2, name: "Map Fields" },
    { id: 3, name: "Validate & Preview" },
  ];

  return (
    <div className="w-full h-full flex flex-col bg-background font-sans animate-in fade-in duration-500">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border/40 flex items-center justify-between bg-card/20 shrink-0">
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Upload className="text-primary" size={20} />
            Bulk Transaction Ingestion
          </h2>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Import work items from CSV or Excel</p>
        </div>
        <button onClick={onCancel} className="p-2 hover:bg-foreground/5 rounded-full transition-colors text-muted-foreground">
          <X size={20} />
        </button>
      </div>

      {/* Stepper */}
      <div className="px-12 py-8 shrink-0 bg-primary/5 border-b border-border/10">
        <div className="flex items-center justify-between max-w-2xl mx-auto relative">
          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border/40 -translate-y-1/2 z-0" />
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-2">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all border-2",
                step === s.id ? "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110" : 
                step > s.id ? "bg-primary/20 border-primary/20 text-primary" : "bg-card border-border/40 text-muted-foreground"
              )}>
                {step > s.id ? <Check size={14} /> : s.id}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                step === s.id ? "text-primary" : "text-muted-foreground/60"
              )}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-12 overflow-y-auto custom-scrollbar flex items-center justify-center">
        
        {step === 1 && (
          <div className="max-w-xl w-full space-y-8 animate-in zoom-in-95 duration-500">
             <div 
               onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
               onDragLeave={() => setDragActive(false)}
               onDrop={(e) => { e.preventDefault(); setDragActive(false); setStep(2); }}
               className={cn(
                 "aspect-video rounded-sm border-4 border-dashed transition-all flex flex-col items-center justify-center gap-6 cursor-pointer group",
                 dragActive ? "border-primary bg-primary/5 scale-105" : "border-border/40 bg-muted/10 hover:border-primary/20 hover:bg-primary/5"
               )}
             >
                <div className="w-20 h-20 rounded-full bg-background border border-border/20 flex items-center justify-center group-hover:scale-110 transition-transform shadow-2xl">
                   <Upload size={32} className="text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <div className="text-center space-y-2">
                   <h3 className="text-lg font-bold text-foreground/80">Drag & Drop your file</h3>
                   <p className="text-xs text-muted-foreground/60">Supported formats: CSV, XLSX (Max 10MB)</p>
                </div>
                <Button variant="outline" className="h-10 px-8 rounded-sm border-primary/20 bg-primary/5 text-primary font-bold text-xs uppercase tracking-widest hover:bg-primary/10">
                  Select File
                </Button>
             </div>

             <div className="bg-amber-500/5 border border-amber-500/20 rounded-sm p-6 flex gap-4">
                <Info size={20} className="text-amber-500 shrink-0" />
                <div className="space-y-1">
                   <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400">Import Limit</h4>
                   <p className="text-[10px] text-amber-600/60 leading-relaxed font-medium">You can import up to 5,000 transactions at once. For larger datasets, please use the API endpoint for bulk ingestion.</p>
                </div>
             </div>
          </div>
        )}

        {step === 2 && (
          <div className="w-full max-w-4xl space-y-8 animate-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                 <h3 className="text-lg font-bold text-foreground/80">Map Columns</h3>
                 <p className="text-xs text-muted-foreground/60">Align your file columns with the Queue schema fields.</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                 <Zap size={14} className="text-emerald-500" />
                 <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">90% Auto-mapped</span>
              </div>
            </div>

            <div className="bg-card/40 backdrop-blur-2xl border border-border/40 rounded-sm overflow-hidden shadow-2xl">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-border/10 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 bg-muted/10">
                    <th className="py-4 pl-8 text-left">Queue Field</th>
                    <th className="py-4 text-center">Status</th>
                    <th className="py-4 pr-8 text-right">Source Column (CSV)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/5">
                  {[
                    { queue: "Invoice Number", mapped: "inv_no", status: "mapped" },
                    { queue: "Vendor Name", mapped: "vendor", status: "mapped" },
                    { queue: "Amount", mapped: "total_amount", status: "mapped" },
                    { queue: "Due Date", mapped: null, status: "required" },
                  ].map((row, i) => (
                    <tr key={i} className="group hover:bg-foreground/5 transition-colors">
                      <td className="py-6 pl-8">
                        <div className="flex items-center gap-3">
                           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Settings2 size={14} className="text-primary" />
                           </div>
                           <span className="text-sm font-bold text-foreground/80">{row.queue}</span>
                        </div>
                      </td>
                      <td className="py-6 text-center">
                        {row.status === "mapped" ? (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[9px] font-black uppercase tracking-tighter">
                             <Check size={10} /> Mapped
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-500 rounded-full text-[9px] font-black uppercase tracking-tighter">
                             <AlertCircle size={10} /> Required
                          </div>
                        )}
                      </td>
                      <td className="py-6 pr-8 text-right">
                         <div className="relative inline-block w-64">
                            <select className="w-full h-10 bg-muted/20 border border-border/40 rounded-sm px-4 text-xs font-bold appearance-none outline-none focus:ring-2 focus:ring-primary/20">
                               <option>{row.mapped || "Select Column..."}</option>
                               <option>customer_id</option>
                               <option>date_created</option>
                            </select>
                            <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
                         </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* Footer Navigation */}
      <div className="px-8 py-6 border-t border-border/40 flex items-center justify-between bg-card/40 shrink-0">
        <Button variant="ghost" className="h-12 px-8 rounded-sm font-bold uppercase tracking-widest text-xs" onClick={onCancel}>Cancel Ingestion</Button>
        <div className="flex items-center gap-4">
           {step > 1 && (
             <Button variant="outline" className="h-12 px-8 rounded-sm border-border/60 font-bold uppercase tracking-widest text-xs" onClick={() => setStep(step - 1)}>Back</Button>
           )}
           <Button 
            className="h-12 px-10 rounded-sm gap-3 bg-primary text-white font-bold uppercase tracking-widest text-xs shadow-xl shadow-primary/30"
            onClick={() => step < 3 ? setStep(step + 1) : onComplete()}
           >
            {step === 3 ? "Process 524 Items" : "Continue"}
            <ArrowRight size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}
