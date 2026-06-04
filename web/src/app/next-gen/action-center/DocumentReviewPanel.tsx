"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, ShieldCheck, AlertTriangle, CheckCircle2, XCircle, 
  ZoomIn, ZoomOut, Maximize2, RotateCw, Download, MoreHorizontal,
  Info, Sparkles, ChevronRight, Hash, Calendar, User, DollarSign,
  Check, X, Eye, FileSearch, Trash2, ListFilter, Play, Bookmark, Clock
} from "lucide-react";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { cn } from "@/lib/utils";

interface ExtractionField {
  id: string;
  label: string;
  value: string;
  confidence: number; // 0-100
  status: "pending" | "valid" | "invalid";
}

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  date: string;
  status: "Active" | "Pending" | "Flagged" | "Needs Info";
  fields: ExtractionField[];
}

const MOCK_QUEUE: DocumentItem[] = [
  { 
    id: "doc-1", 
    name: "Invoice #12345 - Acme Corp", 
    type: "PDF", 
    date: "2024-03-25", 
    status: "Active",
    fields: [
      { id: "1", label: "Vendor Name", value: "Acme Corp", confidence: 99.2, status: "valid" },
      { id: "2", label: "Invoice Date", value: "2024-03-25", confidence: 98.7, status: "valid" },
      { id: "3", label: "Invoice #", value: "12345", confidence: 97.5, status: "pending" },
      { id: "4", label: "Subtotal", value: "$1,500.00", confidence: 99.8, status: "pending" },
      { id: "5", label: "Total Amount", value: "$1,627.50", confidence: 99.9, status: "pending" },
    ]
  },
  { 
    id: "doc-2", 
    name: "ID Card / Passport (JPEG)", 
    type: "JPEG", 
    date: "2024-03-24", 
    status: "Pending",
    fields: [
      { id: "1", label: "Full Name", value: "John Doe", confidence: 94.2, status: "pending" },
      { id: "2", label: "ID Number", value: "ABC-992-110", confidence: 82.1, status: "pending" },
    ]
  },
  { 
    id: "doc-3", 
    name: "Bank Statement (PDF)", 
    type: "PDF", 
    date: "2024-03-22", 
    status: "Flagged",
    fields: [
      { id: "1", label: "Account Holder", value: "Global Logistics", confidence: 99.9, status: "pending" },
      { id: "2", label: "Ending Balance", value: "$45,000.00", confidence: 99.8, status: "pending" },
    ]
  },
  { 
    id: "doc-4", 
    name: "W-9 Form (PDF)", 
    type: "PDF", 
    date: "2024-03-20", 
    status: "Needs Info",
    fields: [
      { id: "1", label: "TIN", value: "Pending", confidence: 50.0, status: "pending" },
    ]
  },
];

export const DocumentReviewPanel = ({ onConfirm }: { onConfirm: () => void }) => {
  const [activeDocId, setActiveDocId] = useState(MOCK_QUEUE[0].id);
  const activeDoc = MOCK_QUEUE.find(d => d.id === activeDocId) || MOCK_QUEUE[0];
  const [fields, setFields] = useState<ExtractionField[]>(activeDoc.fields);
  const [zoom, setZoom] = useState(1);
  
  // Progress calc
  const totalDocs = MOCK_QUEUE.length;
  const completedDocs = 1; // Mocking 1 completion

  const toggleFieldStatus = (id: string, status: "valid" | "invalid") => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, status: f.status === status ? "pending" : status } : f));
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 95) return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    if (score >= 80) return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    return "text-rose-500 bg-rose-500/10 border-rose-500/20";
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case "Active": return "bg-primary text-white";
      case "Pending": return "bg-emerald-500/20 text-emerald-500 border border-emerald-500/20";
      case "Flagged": return "bg-amber-500/20 text-amber-500 border border-amber-500/20";
      case "Needs Info": return "bg-rose-500/20 text-rose-500 border border-rose-500/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const allValidated = fields.every(f => f.status !== "pending");
  const validationProgress = (fields.filter(f => f.status !== "pending").length / fields.length) * 100;

  return (
    <div className="flex h-full gap-4 overflow-hidden">
      {/* Pane 1: Document Queue */}
      <div className="w-72 flex flex-col bg-muted/10 border border-border rounded-sm overflow-hidden shrink-0">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <ListFilter size={14} className="text-primary"/> Document Queue
          </h3>
          <button className="p-1.5 hover:bg-muted rounded-sm text-muted-foreground transition-colors">
            <MoreHorizontal size={14}/>
          </button>
        </div>

        {/* Batch Progress */}
        <div className="p-4 bg-card/30 border-b border-border">
          <div className="flex justify-between items-end mb-2">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Batch Progress</span>
            <span className="text-[10px] font-black text-primary">{Math.round((completedDocs / totalDocs) * 100)}%</span>
          </div>
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
            <motion.div 
               initial={{ width: 0 }}
               animate={{ width: `${(completedDocs / totalDocs) * 100}%` }}
               className="h-full bg-primary rounded-full"
            />
          </div>
          <p className="text-[9px] text-muted-foreground mt-2 font-medium">Batch #42: {completedDocs}/{totalDocs} Complete</p>
        </div>

        {/* Queue Items */}
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 custom-scrollbar">
          {MOCK_QUEUE.map((item) => (
            <div 
              key={item.id}
              onClick={() => {
                setActiveDocId(item.id);
                setFields(item.fields);
              }}
              className={cn(
                "group p-3 rounded-sm border transition-all cursor-pointer relative",
                activeDocId === item.id 
                  ? "bg-primary/5 border-primary shadow-sm ring-1 ring-primary/20" 
                  : "bg-card border-border hover:border-primary/30"
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-8 h-10 rounded-sm flex flex-col items-center justify-center text-[8px] font-bold relative overflow-hidden",
                  item.type === "PDF" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500"
                )}>
                  <span className="mb-0.5">{item.type}</span>
                  <div className={cn("absolute bottom-0 inset-x-0 h-1", item.type === "PDF" ? "bg-rose-500" : "bg-amber-500")} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-[11px] font-bold truncate leading-tight",
                    activeDocId === item.id ? "text-primary" : "text-foreground"
                  )}>
                    {item.name}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[9px] text-muted-foreground font-medium">{item.date}</span>
                    <div className={cn(
                      "px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1",
                      getStatusStyle(item.status)
                    )}>
                      {item.status === "Active" && <div className="w-1 h-1 bg-white rounded-full animate-pulse" />}
                      {item.status}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-border bg-muted/20">
           <button className="w-full py-3 bg-primary text-white rounded-sm text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
              <Play size={12} fill="white"/> Start Review
           </button>
        </div>
      </div>

      {/* Pane 2: Document Viewer */}
      <div className="flex-1 flex flex-col bg-muted/20 border border-border rounded-sm overflow-hidden relative group">
        <div className="p-4 border-b border-border bg-card flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground leading-tight">{activeDoc.name}</h3>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Document View & Focal Points</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-muted rounded-sm">
             <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-background rounded-sm text-muted-foreground transition-colors"><ZoomOut size={16}/></button>
             <span className="text-[10px] font-bold w-12 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
             <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-background rounded-sm text-muted-foreground transition-colors"><ZoomIn size={16}/></button>
             <div className="w-[1px] h-4 bg-border mx-1" />
             <button className="p-2 hover:bg-background rounded-sm text-muted-foreground transition-colors"><RotateCw size={16}/></button>
             <button className="p-2 hover:bg-background rounded-sm text-muted-foreground transition-colors"><Maximize2 size={16}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-[#111] relative p-12 scrollbar-thin scrollbar-thumb-white/10 flex items-center justify-center">
           <motion.div 
             key={activeDocId}
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             style={{ scale: zoom }}
             className="w-full max-w-2xl aspect-[1/1.414] bg-white shadow-2xl rounded-sm p-12 text-black relative flex flex-col gap-8 overflow-hidden"
           >
              {/* Reference Design Content */}
              <div className="flex justify-between items-start border-b-4 border-black pb-8">
                 <div className="flex flex-col gap-2">
                    <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-primary rounded-sm flex items-center justify-center text-white font-black text-2xl">A</div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#555]">Acme Corporation</p>
                 </div>
                 <div className="text-right flex flex-col gap-1 ring-2 ring-primary/20 ring-offset-4 rounded p-2">
                    <h1 className="text-2xl font-black uppercase tracking-tighter leading-none">{activeDoc.type}</h1>
                    <p className="text-sm font-bold opacity-40">#12345</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-8 text-[11px]">
                 <div className="flex flex-col gap-1">
                    <span className="font-bold text-muted-foreground uppercase opacity-40">Vendor Reference</span>
                    <div className="font-extrabold text-lg flex items-center gap-2">Acme Corp <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"/></div>
                    <p className="opacity-70 leading-relaxed font-medium">1235 Montn Street<br/>Bannous, MA 33245</p>
                 </div>
                 <div className="flex flex-col gap-2">
                    <div className="flex justify-between border-b border-black/10 pb-1">
                       <span className="font-bold opacity-40 uppercase text-[9px]">Date</span>
                       <span className="font-bold text-primary">2023-10-27</span>
                    </div>
                    <div className="flex justify-between border-b border-black/10 pb-1">
                       <span className="font-bold opacity-40 uppercase text-[9px]">Type</span>
                       <span className="font-bold">Operational</span>
                    </div>
                 </div>
              </div>

              <div className="mt-4 flex-1 border-y-2 border-black flex flex-col">
                 <div className="p-3 bg-black/5 flex justify-between text-[9px] font-black uppercase tracking-wider">
                    <span>Description</span>
                    <div className="flex gap-8">
                       <span>Qty</span>
                       <span>Total</span>
                    </div>
                 </div>
                 {[1,2,3,4].map(i => (
                   <div key={i} className="px-3 py-2 border-b border-black/5 flex justify-between text-[11px]">
                      <span className="font-medium opacity-70">Infrastructure & Deployment Service</span>
                      <div className="flex gap-10">
                         <span className="font-bold">1</span>
                         <span className="font-black">$1,627.50</span>
                      </div>
                   </div>
                 ))}
              </div>

              {/* Reference Visual Focus */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.15 }}
                className="absolute inset-x-8 top-[330px] h-20 bg-emerald-500 pointer-events-none mix-blend-multiply rounded-sm"
              />

              <div className="flex justify-end pt-4">
                 <div className="flex flex-col gap-2 w-48 font-black uppercase text-right">
                    <div className="flex justify-between text-[10px] opacity-40">
                       <span>Subtotal</span>
                       <span>$1,627.50</span>
                    </div>
                    <div className="flex justify-between text-[20px] pt-1 border-t-2 border-black">
                       <span className="bg-emerald-500 text-white px-1">TOTAL</span>
                       <span className="text-primary font-black">$1,627.50</span>
                    </div>
                 </div>
              </div>

              {/* Float UI Mock */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 scale-75 origin-bottom">
                 <div className="flex items-center gap-4 bg-white/10 backdrop-blur-3xl border border-black/10 p-4 rounded-full shadow-2xl overflow-hidden ring-4 ring-black/[0.05]">
                    {[ '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#111'].map(c => (
                       <div key={c} className="w-8 h-8 rounded-full border border-black/5 cursor-pointer hover:scale-110 transition-transform" style={{ background: c }} />
                    ))}
                 </div>
              </div>
           </motion.div>
        </div>
      </div>

      {/* Pane 3: Data Validation Panel */}
      <div className="w-[340px] flex flex-col gap-4 shrink-0">
        <div className="bg-card border border-border rounded-sm p-6 shadow-sm flex flex-col gap-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-sm bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <Sparkles size={16} />
                </div>
                <h3 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest leading-none">AI Confidence Score</h3>
              </div>
              <span className="text-sm font-black text-emerald-500">98.7%</span>
           </div>

           <div className="flex flex-col gap-2 pb-2">
              <div className="flex justify-between items-end mb-1">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">Post-Processing Progress</span>
                 <span className="text-xs font-black tabular-nums">{Math.round(validationProgress)}%</span>
              </div>
              <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden p-0.5 border border-border">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${validationProgress}%` }}
                   className="h-full bg-primary rounded-full shadow-sm"
                 />
              </div>
           </div>
        </div>

        <div className="flex-1 bg-card border border-border rounded-sm overflow-hidden flex flex-col shadow-sm">
           <div className="p-4 border-b border-border bg-muted/10 flex items-center justify-between">
              <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                 <FileSearch size={14} className="text-primary"/> Data Attributes
              </h4>
           </div>

           <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {fields.map((field) => (
                <div 
                  key={field.id}
                  className={cn(
                    "group p-3 rounded-sm border transition-all duration-300",
                    field.status === "valid" ? "bg-emerald-500/[0.03] border-emerald-500/20 shadow-inner" :
                    field.status === "invalid" ? "bg-rose-500/[0.03] border-rose-500/20 shadow-inner" :
                    "bg-muted/20 border-border hover:border-primary/30"
                  )}
                >
                   <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-0.5 w-full">
                         <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight flex items-center justify-between">
                            <div className="flex items-center gap-1">
                               {field.label === "Invoice Number" ? <Hash size={10}/> : 
                                field.label.includes("Date") ? <Calendar size={10}/> :
                                field.label.includes("Amount") ? <DollarSign size={10}/> :
                                <Info size={10}/>}
                               {field.label}
                            </div>
                            <div className={cn(
                              "px-1.5 py-0.5 rounded-sm text-[8px] font-extrabold border uppercase tracking-widest flex items-center gap-1",
                              getConfidenceColor(field.confidence)
                            )}>
                               {field.confidence}% match
                            </div>
                         </span>
                         
                         <div className="relative mt-1 focus-within:ring-2 focus-within:ring-primary/20 rounded-sm">
                           <input 
                              type="text" 
                              value={field.value} 
                              onChange={(e) => {
                                const v = e.target.value;
                                setFields(prev => prev.map(f => f.id === field.id ? { ...f, value: v } : f));
                              }}
                              className="w-full bg-background border border-border rounded-sm px-3 py-2 text-xs font-bold focus:outline-none"
                           />
                           <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                              {field.status === "valid" ? (
                                <div className="p-1 bg-emerald-500 text-white rounded-sm flex items-center gap-1 text-[8px] font-black uppercase pr-2">
                                   <Check size={10} strokeWidth={4}/> Correct
                                </div>
                              ) : (
                                <button className="p-1 hover:bg-muted rounded text-muted-foreground"><Trash2 size={12}/></button>
                              )}
                           </div>
                         </div>
                      </div>
                   </div>

                   <div className="flex items-center gap-2 mt-3">
                      <button 
                         onClick={() => toggleFieldStatus(field.id, "valid")}
                         className={cn(
                           "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-sm text-[9px] font-bold uppercase tracking-wider transition-all",
                           field.status === "valid" 
                             ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                             : "bg-muted text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-500"
                         )}
                      >
                         <Check size={12} strokeWidth={3}/> {field.status === "valid" ? "Validated" : "Confirm"}
                      </button>
                      <button 
                         onClick={() => toggleFieldStatus(field.id, "invalid")}
                         className={cn(
                           "flex items-center justify-center p-1.5 rounded-sm transition-all",
                           field.status === "invalid"
                             ? "bg-rose-500 text-white"
                             : "bg-muted text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                         )}
                      >
                         <X size={14} strokeWidth={3}/>
                      </button>
                   </div>
                </div>
              ))}
           </div>

           <div className="p-4 border-t border-border bg-muted/10 grid grid-cols-2 gap-2">
              <button className="flex-1 py-3 bg-muted border border-border rounded-sm text-[9px] font-black uppercase tracking-widest">Flag</button>
              <button className="flex-1 py-3 bg-muted border border-border rounded-sm text-[9px] font-black uppercase tracking-widest">Hold</button>
              <button 
                 disabled={!allValidated}
                 onClick={onConfirm}
                 className={cn(
                   "col-span-2 py-4 rounded-sm text-xs font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3",
                   allValidated 
                     ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/40 active:scale-95" 
                     : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
                 )}
              >
                 {allValidated ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                 {allValidated ? "Approve & Next Document" : "Pending Validation"}
              </button>
           </div>
        </div>

        <div className="p-4 bg-muted/30 border border-border rounded-sm flex items-center gap-4">
           <div className="w-10 h-10 rounded-full bg-primary/10 overflow-hidden border border-primary/20 flex items-center justify-center font-black text-primary">SJ</div>
           <div className="flex-1 flex flex-col leading-none gap-1">
              <span className="text-[10px] font-black text-foreground">Sarah J. <span className="opacity-40 font-bold ml-1">Edit: PO Number</span></span>
              <span className="text-[9px] text-muted-foreground font-bold">Today, 10:22 AM • Document Auditor</span>
           </div>
        </div>
      </div>
    </div>
  );
};
