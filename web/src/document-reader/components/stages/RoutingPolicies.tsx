"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Upload, Layers, CheckCircle2, FileText, X, AlertCircle, Plus, Info, Search, 
  Database, Rocket, Cpu, BrainCircuit, Zap, Activity, PencilLine, Sun, 
  FileType, Anchor, FileSearch, Trash2, ChevronRight, Sparkles, Filter, ChevronLeft,
  Cloud, HardDrive, Gauge, ShieldCheck, ZapOff, Workflow,
  ExternalLink, BookOpen, Clock, Tag, History as HistoryIcon, Globe, Terminal,
  Settings, Server, Grid2X2, Scissors, Split, Merge, MoreVertical,
  Type, Layout, Hash, ShieldAlert, ListFilter, Clock3, AlertTriangle, CheckCircle,
  Eye, MousePointer2, Settings2, BarChart3, Binary, Link2, Target, Calendar,
  IterationCcw, Eraser, Fingerprint, Crosshair, Wand2, Lightbulb, Check, Share2, Shield, BarChart2, 
  CheckCircle as CheckCircleIcon, ArrowRight, UploadCloud, Power, Network, EyeOff, RefreshCw, Lock,
  ClipboardCheck, ArrowLeft, Download, Mail, Database as DbIcon, Terminal as ApiIcon, 
  FolderTree, ScanLine, AlertCircle as ErrorIcon, ChevronRight as ChevronIcon, Check as CheckIcon,
  ShieldCheck as ShieldIcon, RefreshCw as NormalizingIcon, HardDrive as S3Icon, Globe as WebIcon,
  Search as SearchIcon, Cpu as CpuIcon, Activity as PulseIcon, BarChart2 as StatsIcon, Trash2 as DeleteIcon,
  Plus as PlusIcon, X as XIcon, Settings as ConfigIcon, Wand2 as AIAutoIcon, Clock as TimeIcon, Eye as ViewIcon,
  Lock as SecureIcon
} from "lucide-react";
import { useDocumentReader } from "../../store/documentReaderContext";
import { 
  TrainingStage, 
  OCREngine, 
  OfflineModel, 
  BenchmarkResult, 
  RoutingPolicy, 
  TrainingDocument, 
  TrainingPage,
  Annotation,
  SupportLevel,
  SegregationLogicGroup
} from "../../types";
import { DocumentNormalizer } from "../../services/documentNormalizer";
import { mockIQAScore } from "../../services/iqaService";
import { mockEnhancementResult } from "../../services/imageEnhancementService";
import { mockStructuralAnalysis } from "../../services/structuralElementDetector";
import { usePipelineStore } from "../../store/studioStore";
import { 
  IngestionSource, 
  IngestionSourceType, 
  IngestionBatch 
} from "../../types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";

export function RoutingPolicies({ 
  policies, 
  engines, 
  onSave, 
  onBatchSave,
  onDelete 
}: { 
  policies: RoutingPolicy[], 
  engines: OCREngine[],
  onSave: (policy: RoutingPolicy) => void,
  onBatchSave: (policies: RoutingPolicy[]) => void,
  onDelete: (id: string) => void
}) {
  const [editingPolicy, setEditingPolicy] = useState<RoutingPolicy | null>(null);
  const activeEngines = engines.filter(e => e.status === "active");

  const loadMatrixTemplates = () => {
    const matrixData = [
      { type: "Passport", primary: "paddle-ocr-v4", failover: "easy-ocr-pro", threshold: 0.92 },
      { type: "Driver License", primary: "paddle-ocr-v4", failover: "tesseract-ocr-v5", threshold: 0.90 },
      { type: "National ID", primary: "doctr", failover: "easy-ocr-pro", threshold: 0.90 },
      { type: "Visa", primary: "paddle-ocr-v4", failover: "doctr", threshold: 0.88 },
      { type: "Bank Statement", primary: "layout-lm-v3-engine", failover: "paddle-ocr-v4", threshold: 0.85 },
      { type: "Credit Card Statement", primary: "layout-lm-v3-engine", failover: "doctr", threshold: 0.85 },
      { type: "Invoice", primary: "paddle-ocr-v4", failover: "layout-lm-v3-engine", threshold: 0.87 },
      { type: "Utility Bill", primary: "layout-lm-v3-engine", failover: "paddle-ocr-v4", threshold: 0.85 },
      { type: "Telecom Bill", primary: "doctr", failover: "paddle-ocr-v4", threshold: 0.84 },
      { type: "Retail Receipt", primary: "paddle-ocr-v4", failover: "easy-ocr-pro", threshold: 0.82 },
      { type: "Restaurant Receipt", primary: "easy-ocr-pro", failover: "tesseract-ocr-v5", threshold: 0.80 },
      { type: "Fuel Receipt", primary: "paddle-ocr-v4", failover: "easy-ocr-pro", threshold: 0.80 },
      { type: "Medical Claim Form", primary: "donut-engine", failover: "layout-lm-v3-engine", threshold: 0.86 },
      { type: "Lab Report", primary: "paddle-ocr-v4", failover: "doctr", threshold: 0.88 },
      { type: "Prescription", primary: "trocr", failover: "easy-ocr-pro", threshold: 0.75 },
      { type: "Insurance Claim", primary: "layout-lm-v3-engine", failover: "paddle-ocr-v4", threshold: 0.85 },
      { type: "Loan Application", primary: "layout-lm-v3-engine", failover: "doctr", threshold: 0.85 },
      { type: "Mortgage Package", primary: "layout-lm-v3-engine", failover: "donut-engine", threshold: 0.82 },
      { type: "Purchase Order", primary: "paddle-ocr-v4", failover: "layout-lm-v3-engine", threshold: 0.88 },
      { type: "Contract", primary: "layout-lm-v3-engine", failover: "donut-engine", threshold: 0.83 },
      { type: "NDA", primary: "donut-engine", failover: "layout-lm-v3-engine", threshold: 0.82 },
      { type: "Resume / CV", primary: "doctr", failover: "easy-ocr-pro", threshold: 0.80 },
      { type: "Payslip", primary: "paddle-ocr-v4", failover: "layout-lm-v3-engine", threshold: 0.88 },
      { type: "Timesheet", primary: "easy-ocr-pro", failover: "paddle-ocr-v4", threshold: 0.85 },
      { type: "Shipping Label", primary: "doctr", failover: "paddle-ocr-v4", threshold: 0.90 },
      { type: "Bill of Lading", primary: "layout-lm-v3-engine", failover: "doctr", threshold: 0.84 },
      { type: "Airway Bill", primary: "paddle-ocr-v4", failover: "layout-lm-v3-engine", threshold: 0.85 },
      { type: "Handwritten Form", primary: "trocr", failover: "easy-ocr-pro", threshold: 0.72 },
      { type: "Handwritten Notes", primary: "trocr", failover: "doctr", threshold: 0.70 },
      { type: "Multi-page Table PDF", primary: "layout-lm-v3-engine", failover: "donut-engine", threshold: 0.82 },
      { type: "Scanned PDF", primary: "paddle-ocr-v4", failover: "doctr", threshold: 0.85 },
      { type: "Low Quality Image", primary: "easy-ocr-pro", failover: "paddle-ocr-v4", threshold: 0.78 },
      { type: "Multi-language Document", primary: "easy-ocr-pro", failover: "paddle-ocr-v4", threshold: 0.84 }
    ];

    const templates: RoutingPolicy[] = matrixData.map((item, idx) => ({
      id: `policy-${item.type.toLowerCase().replace(/\s+/g, '-')}`,
      name: `${item.type} Steering`,
      documentType: item.type,
      priority: idx + 1,
      isEnabled: true,
      primaryEngineId: item.primary,
      failoverEngineId: item.failover,
      threshold: item.threshold,
      isFailoverEnabled: true
    }));

    onBatchSave(templates);
  };

  const handleCreateDefault = () => {
    const newPolicy: RoutingPolicy = {
      id: Math.random().toString(36).substr(2, 9),
      name: "New Routing Policy",
      documentType: "Invoice",
      priority: policies.length + 1,
      isEnabled: true,
      primaryEngineId: activeEngines[0]?.id || "",
      failoverEngineId: activeEngines[1]?.id || null,
      threshold: 0.85,
      isFailoverEnabled: true
    };
    setEditingPolicy(newPolicy);
  };

  const handleSave = () => {
    if (editingPolicy) {
      onSave(editingPolicy);
      setEditingPolicy(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative min-h-[400px] h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Intelligent Steering & Failover</h3>
             <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60 mt-1">
                Define automated routing logic for extraction runtimes
             </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); loadMatrixTemplates(); }}
              className="h-9 px-4 rounded-md bg-muted text-muted-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-card hover:text-foreground transition-all cursor-pointer z-10"
            >
               <Database size={14} />
               Load Matrix Templates
            </button>
            <button 
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCreateDefault(); }}
              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-lg shadow-primary/20 cursor-pointer z-10"
            >
               <Plus size={14} />
               Add Policy
            </button>
          </div>
       </div>

       <div className="grid grid-cols-1 gap-4">
          {policies.map((policy) => (
            <div key={policy.id} className="p-6 rounded-md bg-card border border-border hover:border-primary/40 transition-all group relative overflow-hidden">
               <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                        <Share2 size={20} />
                     </div>
                     <div>
                        <h4 className="text-sm font-black text-foreground uppercase tracking-tight">{policy.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                           <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1.5 py-0.5 rounded bg-muted">Priority {policy.priority}</span>
                           <span className={cn(
                             "text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded",
                             policy.isEnabled ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                           )}>
                              {policy.isEnabled ? "Active" : "Disabled"}
                           </span>
                        </div>
                     </div>
                  </div>
                  <div className="flex items-center gap-2 relative z-20">
                     <button 
                       onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingPolicy(policy); }}
                       className="p-2 rounded-md hover:bg-muted text-muted-foreground transition-all cursor-pointer"
                       title="Edit Policy"
                     >
                        <Settings size={18} />
                     </button>
                     <button 
                       onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(policy.id); }}
                       className="p-2 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all cursor-pointer"
                       title="Delete Policy"
                     >
                        <Trash2 size={18} />
                     </button>
                  </div>
               </div>

               <div className="grid grid-cols-4 gap-6">
                  <div className="space-y-2">
                     <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Document Type</span>
                     <div className="p-3 rounded-md bg-muted/30 border border-border/50">
                        <span className="text-[10px] font-black text-foreground uppercase tracking-tight">{policy.documentType}</span>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Primary Target</span>
                     <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 border border-primary/20">
                        <Zap size={14} className="text-primary" />
                        <span className="text-[10px] font-black text-foreground uppercase truncate">
                           {engines.find(e => e.id === policy.primaryEngineId)?.name || "Unknown Engine"}
                        </span>
                     </div>
                  </div>

                  <div className="space-y-2">
                     <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Failover Policy</span>
                        <div className={cn(
                          "w-10 h-5 rounded-full p-1 transition-all cursor-pointer",
                          policy.isFailoverEnabled ? "bg-emerald-500" : "bg-muted"
                        )}
                        onClick={() => onSave({ ...policy, isFailoverEnabled: !policy.isFailoverEnabled })}
                        >
                           <div className={cn("w-3 h-3 rounded-full bg-white transition-all", policy.isFailoverEnabled ? "translate-x-5" : "translate-x-0")} />
                        </div>
                     </div>
                     {policy.failoverEngineId ? (
                        <div className={cn(
                          "flex items-center gap-3 p-3 rounded-md border transition-all",
                          policy.isFailoverEnabled ? "bg-amber-500/5 border-amber-500/20" : "bg-muted/30 border-border/50 grayscale opacity-40"
                        )}>
                           <Shield size={14} className={policy.isFailoverEnabled ? "text-amber-500" : "text-muted-foreground"} />
                           <span className="text-[10px] font-black text-foreground uppercase truncate">
                              {engines.find(e => e.id === policy.failoverEngineId)?.name}
                           </span>
                        </div>
                     ) : (
                        <div className="p-3 rounded-md border border-dashed border-border flex items-center justify-center text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                           No Failover Defined
                        </div>
                     )}
                  </div>

                  <div className="space-y-2">
                     <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Failover Threshold</span>
                     <div className={cn(
                       "p-3 rounded-md border flex items-center justify-between transition-all",
                       policy.isFailoverEnabled ? "bg-card border-border shadow-sm" : "bg-muted/20 border-border/30 opacity-40"
                     )}>
                        <span className="text-[11px] font-black text-foreground">{(policy.threshold * 100).toFixed(0)}%</span>
                        <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Confidence</span>
                     </div>
                  </div>
               </div>

               {/* Activity Monitor Pulse - Moved and set to pointer-events-none */}
               <div className="absolute bottom-4 right-4 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Routing Traffic</span>
                  </div>
               </div>
            </div>
          ))}

          {policies.length === 0 && (
             <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 border-2 border-dashed border-border rounded-md bg-muted/20">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                   <Share2 size={32} className="text-muted-foreground/30" />
                </div>
                <div className="space-y-1">
                   <h4 className="text-sm font-black text-foreground uppercase tracking-tight">No Active Routing Policies</h4>
                   <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60 max-w-xs">
                      Provision intelligent steering to automatically direct extraction requests based on document type or confidence.
                   </p>
                </div>
                <button 
                   onClick={handleCreateDefault}
                   className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg"
                >
                   Provision Initial Policy
                </button>
             </div>
          )}
       </div>

       {/* POLICY EDITOR OVERLAY */}
       <AnimatePresence>
          {editingPolicy && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-background/80 backdrop-blur-sm">
               <motion.div 
                 initial={{ opacity: 0, scale: 0.95, y: 20 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 20 }}
                 className="w-full max-w-xl bg-card border border-border shadow-sm rounded-md overflow-hidden flex flex-col max-h-[80vh]"
                 onClick={(e) => e.stopPropagation()}
               >
                  <header className="px-8 py-6 border-b border-border bg-muted/30 flex items-center justify-between">
                     <div>
                        <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Policy Designer</h3>
                        <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Configuring {editingPolicy.name}</p>
                     </div>
                     <button 
                       onClick={() => setEditingPolicy(null)}
                       className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-all"
                     >
                        <X size={20} />
                     </button>
                  </header>

                  <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Policy Identity</label>
                        <input 
                          type="text" 
                          value={editingPolicy.name}
                          onChange={(e) => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                          className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary outline-none" 
                          placeholder="e.g., Invoice Auto-Route"
                        />
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Execution Priority</label>
                           <input 
                             type="number" 
                             value={editingPolicy.priority}
                             onChange={(e) => setEditingPolicy({ ...editingPolicy, priority: parseInt(e.target.value) })}
                             className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary outline-none" 
                           />
                        </div>
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Operational State</label>
                           <button 
                             onClick={() => setEditingPolicy(prev => prev ? { ...prev, isEnabled: !prev.isEnabled } : null)}
                             className={cn(
                               "w-full h-[42px] rounded-md border transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest",
                               editingPolicy.isEnabled ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-muted border-border text-muted-foreground"
                             )}
                           >
                              {editingPolicy.isEnabled ? <CheckCircle2 size={14} /> : <X size={14} />}
                              {editingPolicy.isEnabled ? "Enabled" : "Disabled"}
                           </button>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Document Type Steering</label>
                        <input 
                          list="document-types"
                          type="text" 
                          value={editingPolicy.documentType}
                          onChange={(e) => setEditingPolicy(prev => prev ? { ...prev, documentType: e.target.value } : null)}
                          className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary" 
                          placeholder="e.g. Passport, Invoice, etc."
                        />
                        <datalist id="document-types">
                           <option value="Passport" />
                           <option value="Driver License" />
                           <option value="National ID" />
                           <option value="Visa" />
                           <option value="Bank Statement" />
                           <option value="Credit Card Statement" />
                           <option value="Invoice" />
                           <option value="Utility Bill" />
                           <option value="Telecom Bill" />
                           <option value="Retail Receipt" />
                           <option value="Restaurant Receipt" />
                           <option value="Fuel Receipt" />
                           <option value="Medical Claim Form" />
                           <option value="Lab Report" />
                           <option value="Prescription" />
                           <option value="Insurance Claim" />
                           <option value="Loan Application" />
                           <option value="Mortgage Package" />
                           <option value="Purchase Order" />
                           <option value="Contract" />
                           <option value="NDA" />
                           <option value="Resume / CV" />
                           <option value="Payslip" />
                           <option value="Timesheet" />
                           <option value="Shipping Label" />
                           <option value="Bill of Lading" />
                           <option value="Airway Bill" />
                           <option value="Handwritten Form" />
                           <option value="Handwritten Notes" />
                           <option value="Multi-page Table PDF" />
                           <option value="Scanned PDF" />
                           <option value="Low Quality Image" />
                           <option value="Multi-language Document" />
                        </datalist>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                           <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Primary Extraction Model</label>
                           <select 
                             value={editingPolicy.primaryEngineId}
                             onChange={(e) => setEditingPolicy(prev => prev ? { ...prev, primaryEngineId: e.target.value } : null)}
                             className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary"
                           >
                              {activeEngines.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                           </select>
                        </div>
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Failover Model</label>
                              <div className="flex items-center gap-2">
                                 <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Enable Failover</span>
                                 <div className={cn(
                                   "w-8 h-4 rounded-full p-0.5 transition-all cursor-pointer",
                                   editingPolicy.isFailoverEnabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                                 )}
                                 onClick={() => setEditingPolicy(prev => prev ? { ...prev, isFailoverEnabled: !prev.isFailoverEnabled } : null)}
                                 >
                                    <div className={cn("w-3 h-3 rounded-full bg-white transition-all", editingPolicy.isFailoverEnabled ? "translate-x-4" : "translate-x-0")} />
                                 </div>
                              </div>
                           </div>
                           <select 
                             value={editingPolicy.failoverEngineId || ""}
                             onChange={(e) => setEditingPolicy(prev => prev ? { ...prev, failoverEngineId: e.target.value || null } : null)}
                             className="w-full bg-muted border border-border rounded-md px-3 py-2.5 text-[10px] font-black uppercase outline-none focus:ring-1 focus:ring-primary"
                             disabled={!editingPolicy.isFailoverEnabled}
                           >
                              <option value="">No Failover</option>
                              {activeEngines.map(e => (
                                <option key={e.id} value={e.id}>{e.name}</option>
                              ))}
                           </select>
                        </div>
                     </div>

                     {editingPolicy.isFailoverEnabled && (
                       <div className="space-y-4">
                          <div className="flex items-center justify-between">
                             <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Failover Confidence Threshold</label>
                             <span className="text-sm font-black text-primary">{(editingPolicy.threshold * 100).toFixed(0)}%</span>
                          </div>
                          <input 
                            type="range" 
                            min="50" 
                            max="99" 
                            value={editingPolicy.threshold * 100}
                            onChange={(e) => setEditingPolicy(prev => prev ? { ...prev, threshold: parseInt(e.target.value) / 100 } : null)}
                            className="w-full accent-primary h-1.5 bg-muted rounded-md appearance-none cursor-pointer"
                          />
                          <div className="flex justify-between text-[8px] font-black text-muted-foreground uppercase tracking-widest px-1">
                             <span>Low Confidence (50%)</span>
                             <span>Enterprise Standard (85%)</span>
                             <span>Critical High (99%)</span>
                          </div>
                       </div>
                     )}
                  </div>

                  <footer className="px-8 py-6 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                     <button 
                       onClick={() => setEditingPolicy(null)}
                       className="h-10 px-6 rounded-md border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
                     >
                        Cancel
                     </button>
                     <button 
                       onClick={handleSave}
                       className="h-10 px-8 rounded-md bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                     >
                        Commit Changes
                     </button>
                  </footer>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
     </div>
  );
}
