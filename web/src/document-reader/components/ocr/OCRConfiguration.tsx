"use client";

import React, { useState } from "react";
import { 
  Zap, Check, AlertCircle, ChevronLeft, RefreshCw, ChevronRight, Search 
} from "lucide-react";
import { useDocumentReader } from "../../store/documentReaderContext";
import { usePipelineStore } from "../../store/studioStore";
import { TrainingStage } from "../../types";
import { cn } from "@/lib/utils";

export default function OCRConfiguration() {
  const { updateStepStatus, setActiveStage } = useDocumentReader();
  const { 
    infrastructure, 
    trainingDocuments,
    saveState, 
    setPrimaryEngine, 
    saveRoutingPolicy, 
    executeOCR,
    setActiveDocument,
    ocrProgress
  } = usePipelineStore();
  
  const [selectedEngineId, setSelectedEngineId] = useState<string | null>(infrastructure.primaryEngineId);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasRunOCR, setHasRunOCR] = useState(trainingDocuments.some(doc => doc.pages.some(p => p.ocrText)));
  const [activePreviewDocId, setActivePreviewDocId] = useState<string | null>(trainingDocuments[0]?.documentId || null);
  const [activeTab, setActiveTab] = useState<"engines" | "results">("engines");
  const [activeResultTab, setActiveResultTab] = useState<"formatted" | "metadata" | "raw">("formatted");

  // Keep active preview in sync with training documents
  React.useEffect(() => {
    if (!activePreviewDocId && trainingDocuments.length > 0) {
      setActivePreviewDocId(trainingDocuments[0].documentId);
    }
  }, [trainingDocuments, activePreviewDocId]);

  const activeEngines = infrastructure.engines.filter(e => e.status === "active" && e.isConfigured);
  const selectedDoc = trainingDocuments.find(d => d.documentId === activePreviewDocId);

  const handleRunOCR = async () => {
    if (!selectedEngineId) return;
    
    setIsProcessing(true);
    try {
      setPrimaryEngine(selectedEngineId);
      
      const selectedEngine = infrastructure.engines.find(e => e.id === selectedEngineId);
      if (selectedEngine) {
        const existingPolicy = infrastructure.policies.find(p => p.primaryEngineId === selectedEngineId);
        const failoverEngine = infrastructure.engines.find(e => e.id !== selectedEngineId && e.status === "active");
        
        if (!existingPolicy && failoverEngine) {
          saveRoutingPolicy({
            id: `policy-${selectedEngineId}-failover`,
            name: `${selectedEngine.name} Standard Failover`,
            documentType: "All",
            priority: 1,
            isEnabled: true,
            primaryEngineId: selectedEngineId,
            failoverEngineId: failoverEngine.id,
            threshold: 0.85,
            isFailoverEnabled: true
          });
        }
      }

      await executeOCR();
      setHasRunOCR(true);
      await saveState();
      
      // Auto-switch to results tab to show the extracted data immediately
      setActiveTab("results");
    } catch (error) {
      console.error("OCR Pipeline Error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContinue = () => {
    updateStepStatus(TrainingStage.OCR_CONFIGURATION, "completed");
    setActiveStage(TrainingStage.PAGE_SEGREGATION);
  };

  return (
    <div className="flex flex-col h-full bg-card/30 rounded-xl border border-border overflow-hidden">
       <header className="px-8 py-6 border-b border-border bg-muted/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-6">
             <div>
                <h2 className="text-xl font-black text-foreground uppercase tracking-tight">OCR CONFIGURATION</h2>
                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60 mt-1">
                   Establish the extraction backbone for document intelligence
                </p>
             </div>

             <div className="h-8 w-[1px] bg-border mx-2" />

             <div className="flex items-center gap-1.5 p-1 bg-muted/50 rounded-xl border border-border/50">
                <button 
                  onClick={() => setActiveTab("engines")}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === "engines" ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                   <Zap size={14} />
                   Engine Selection
                </button>
                <button 
                  onClick={() => setActiveTab("results")}
                  disabled={!hasRunOCR}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                    activeTab === "results" ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground disabled:opacity-30"
                  )}
                >
                   <RefreshCw size={14} className={isProcessing ? "animate-spin" : ""} />
                   Extraction Results
                </button>
             </div>
          </div>
          
          {hasRunOCR && (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg animate-in fade-in zoom-in-95">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">OCR Extraction Captured</span>
            </div>
          )}
       </header>

       <main className="flex-1 overflow-y-auto custom-scrollbar bg-muted/10 relative">
          {activeTab === "engines" ? (
             <div className="p-8 space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      <Zap size={18} />
                   </div>
                   <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Available Extraction Runtimes</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-20">
                   {activeEngines.map((engine) => (
                      <button 
                        key={engine.id}
                        onClick={() => setSelectedEngineId(engine.id)}
                        className={cn(
                          "p-6 rounded-2xl border-2 text-left transition-all group relative overflow-hidden",
                          selectedEngineId === engine.id 
                            ? "bg-primary/5 border-primary shadow-xl shadow-primary/10" 
                            : "bg-card border-border hover:border-primary/40 hover:bg-muted/50"
                        )}
                      >
                         {selectedEngineId === engine.id && (
                           <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                              <Check size={14} />
                           </div>
                         )}

                         <div className="flex items-center gap-5 mb-8">
                            <div className={cn(
                              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 shadow-sm",
                              selectedEngineId === engine.id ? "bg-primary text-primary-foreground scale-110 rotate-3 shadow-primary/20 shadow-lg" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                            )}>
                               <Zap size={28} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 min-w-0">
                               <h4 className={cn("text-[13px] font-black uppercase tracking-tight truncate", selectedEngineId === engine.id ? "text-primary" : "text-foreground")}>{engine.name}</h4>
                               <p className="text-[10px] text-muted-foreground font-black uppercase tracking-[0.15em] mt-1 opacity-60">{engine.provider}</p>
                            </div>
                         </div>

                         <div className="space-y-4 pt-6 border-t border-border/40">
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">Precision Delta</span>
                               <span className="text-[12px] font-black text-emerald-500 tabular-nums">{((engine.accuracyScore || 0.95) * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">Failover Matrix</span>
                               <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-emerald-500/80 uppercase">Active</span>
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                               </div>
                            </div>
                         </div>
                      </button>
                   ))}

                   {activeEngines.length === 0 && (
                      <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-4 bg-muted/20 rounded-2xl border-2 border-dashed border-border">
                         <AlertCircle size={32} className="text-muted-foreground/30" />
                         <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">No Active Engines Configured in Infrastructure</p>
                         <button 
                           onClick={() => setActiveStage(TrainingStage.INFRASTRUCTURE)}
                           className="h-9 px-6 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
                         >
                            Configure Infrastructure
                         </button>
                      </div>
                   )}
                </div>
             </div>
          ) : (
             <div className="p-8 space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                         <RefreshCw size={18} />
                      </div>
                      <h3 className="text-sm font-black text-foreground uppercase tracking-widest">Extracted Document Data</h3>
                   </div>
                   
                    <div className="flex items-center gap-3">
                       {/* Dropdown removed per UI overhaul */}
                    </div>
                </div>

                {!selectedDoc ? (
                  <div className="col-span-full py-32 flex flex-col items-center justify-center text-center space-y-4 bg-muted/20 rounded-3xl border border-dashed border-border">
                     <AlertCircle size={48} className="text-muted-foreground/20" />
                     <p className="text-sm font-black text-muted-foreground uppercase tracking-widest opacity-60">No Documents Found in Batch</p>
                     <p className="text-[10px] text-muted-foreground/60 max-w-xs">Please return to the Document Upload stage to provide assets for extraction.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* NEW Horizontal Document Selection Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                       {trainingDocuments.map(doc => (
                          <button
                            key={doc.documentId}
                            onClick={() => setActivePreviewDocId(doc.documentId)}
                            className={cn(
                              "p-4 rounded-xl border text-left transition-all",
                              activePreviewDocId === doc.documentId 
                                ? "bg-primary/5 border-primary shadow-sm"
                                : "bg-card border-border hover:border-primary/30 hover:bg-muted/50"
                            )}
                          >
                             <div className="flex items-center gap-3 mb-2">
                                <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", activePreviewDocId === doc.documentId ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                                   <RefreshCw size={12} />
                                </div>
                                <span className={cn("text-[11px] font-black uppercase truncate", activePreviewDocId === doc.documentId ? "text-primary" : "text-foreground")}>{doc.name}</span>
                             </div>
                             <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{doc.pages.length} Pages Extracted</span>
                          </button>
                       ))}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[75vh] min-h-[600px]">
                      {/* Page Strip - Narrow & Focused */}
                    <div className="lg:col-span-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar border-r border-border/40">
                        {selectedDoc?.pages.map((page, idx) => (
                          <button 
                            key={page.pageId} 
                            onClick={() => {
                               const el = document.getElementById(`page-extraction-${idx}`);
                               if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }}
                            className="w-full text-left space-y-1 group cursor-pointer outline-none"
                          >
                            <div className="flex items-center justify-between px-1">
                                <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tight">P.{idx + 1}</span>
                            </div>
                            <div className={cn(
                              "aspect-[3/4] rounded-lg bg-muted border overflow-hidden transition-all",
                              page.confidence > 0.8 ? "border-emerald-500/30" : "border-border"
                            )}>
                                <img src={page.imageUrl} className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-80 transition-all" />
                            </div>
                          </button>
                        ))}
                    </div>

                    {/* Text Extraction View - THE FOCUS */}
                    <div className="lg:col-span-8 flex flex-col min-h-0 bg-card border border-border rounded-3xl overflow-hidden shadow-2xl relative">
                        <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--primary) 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
                        
                        <header className="px-8 py-5 border-b border-border/40 bg-muted/20 flex items-center justify-between shrink-0 relative z-10">
                           <div className="flex items-center gap-4">
                              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                              <h4 className="text-[11px] font-black text-foreground uppercase tracking-[0.2em]">Forensic Extraction Stream</h4>
                              <span className="text-[10px] font-mono text-muted-foreground opacity-60">/ {selectedDoc?.name}</span>
                           </div>
                           
                           <div className="flex items-center gap-6">
                              <div className="flex items-center bg-card rounded-lg border border-border p-1">
                                 <button onClick={() => setActiveResultTab("formatted")} className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest", activeResultTab === "formatted" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>Formatted</button>
                                 <button onClick={() => setActiveResultTab("metadata")} className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest", activeResultTab === "metadata" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>Metadata</button>
                                 <button onClick={() => setActiveResultTab("raw")} className={cn("px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest", activeResultTab === "raw" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground")}>Raw JSON</button>
                              </div>
                              <div className="flex flex-col items-end">
                                 <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Stream Density</span>
                                 <span className="text-[11px] font-black text-foreground tabular-nums">
                                   {selectedDoc?.pages.reduce((acc, p) => acc + (p.ocrText?.split(/\s+/).filter(Boolean).length || 0), 0).toLocaleString()} Tokens
                                 </span>
                              </div>
                           </div>
                        </header>

                        <div className="flex-1 p-8 overflow-y-auto custom-scrollbar font-mono text-[13px] leading-[1.8] text-foreground/90 selection:bg-primary/20 relative z-10 bg-[#fcfcfd]/30 scroll-smooth">
                           {selectedDoc?.pages.map((p, i) => (
                             <div key={i} id={`page-extraction-${i}`} className="mb-16 last:mb-0 group/page scroll-mt-10">
                                 <div className="flex items-center gap-4 mb-6 sticky top-0 bg-[#fcfcfd]/95 backdrop-blur-md py-3 z-20 border-b border-primary/5">
                                   <div className="flex items-center gap-3">
                                      <span className="w-7 h-7 flex items-center justify-center bg-primary text-primary-foreground rounded-lg text-[10px] font-black shadow-lg shadow-primary/20">
                                         {i + 1}
                                      </span>
                                      <div className="flex flex-col">
                                         <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-50 leading-none">Page Index</span>
                                         <span className="text-[10px] font-bold text-foreground tabular-nums mt-0.5">{p.pageId.slice(0, 12)}</span>
                                      </div>
                                   </div>
                                   
                                   <div className="flex items-center gap-4 ml-auto">
                                      <div className="flex flex-col items-end">
                                         <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Confidence</span>
                                         <span className={cn(
                                            "text-[11px] font-black tabular-nums",
                                            p.confidence > 0.8 ? "text-emerald-500" : p.confidence > 0.6 ? "text-amber-500" : "text-rose-500"
                                         )}>{(p.confidence * 100).toFixed(2)}%</span>
                                      </div>
                                      <div className={cn(
                                         "px-3 py-1.5 rounded-xl border flex items-center gap-2",
                                         p.confidence > 0.6 ? "bg-emerald-50 border-emerald-100 text-emerald-600" : "bg-rose-50 border-rose-100 text-rose-600"
                                      )}>
                                         <div className={cn("w-1.5 h-1.5 rounded-full", p.confidence > 0.6 ? "bg-emerald-500" : "bg-rose-500")} />
                                         <span className="text-[9px] font-black uppercase tracking-widest">{p.confidence > 0.6 ? "Verified" : "Low Trust"}</span>
                                      </div>
                                   </div>
                                 </div>
                                 <div className="pl-10 relative">
                                   <div className="absolute left-4 top-0 bottom-0 w-[1px] bg-gradient-to-b from-primary/20 via-primary/5 to-transparent" />
                                   {activeResultTab === "formatted" && (
                                      <p className="whitespace-pre-wrap tracking-tight opacity-80 group-hover/page:opacity-100 transition-opacity">
                                         {p.ocrData?.text || p.ocrText || "No digital footprint captured for this page."}
                                      </p>
                                   )}
                                   {activeResultTab === "metadata" && (
                                      <pre className="whitespace-pre-wrap tracking-tight opacity-80 text-[11px] text-emerald-600/90 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/10">
                                         {p.ocrData?.metadata || "No metadata provided by engine."}
                                      </pre>
                                   )}
                                   {activeResultTab === "raw" && (
                                      <pre className="whitespace-pre-wrap tracking-tight opacity-80 text-[11px] text-primary/80 bg-primary/5 p-4 rounded-xl border border-primary/10 overflow-x-auto">
                                         {p.ocrData?.rawJson || "No raw JSON payload captured."}
                                      </pre>
                                   )}
                                 </div>
                             </div>
                           ))}
                        </div>
                    </div>

                    {/* Forensic Analytics & Insights - Sidebar Focus */}
                    <div className="lg:col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                       {/* Confidence Pulse */}
                       <div className="p-6 rounded-3xl bg-card border border-border shadow-sm">
                          <div className="flex items-center gap-3 mb-6">
                             <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                <Search size={20} />
                             </div>
                             <div>
                                <h5 className="text-[11px] font-black text-foreground uppercase tracking-widest">Accuracy Pulse</h5>
                                <p className="text-[9px] text-muted-foreground uppercase font-medium mt-0.5">Mean Document Health</p>
                             </div>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center py-4 text-center border-y border-border/40 my-4">
                             <span className="text-3xl font-black text-primary tabular-nums tracking-tighter">
                                {((selectedDoc?.pages.reduce((acc, p) => acc + (p.confidence || 0), 0) / (selectedDoc?.pages.length || 1)) * 100).toFixed(4)}%
                             </span>
                             <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2 opacity-50">Forensic Accuracy</span>
                          </div>

                          <div className="space-y-3">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight opacity-50">Engine</span>
                                <span className="text-[10px] font-black text-primary uppercase">High-Tier Cloud</span>
                             </div>
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight opacity-50">Latency</span>
                                <span className="text-[10px] font-black text-foreground tabular-nums">1.4s (P95)</span>
                             </div>
                          </div>
                       </div>

                       {/* DYNAMIC Forensic Insights */}
                       <div className="flex flex-col gap-4">
                          <div className="px-2 flex items-center justify-between">
                             <h5 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Forensic Insights</h5>
                             <span className="text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                {selectedDoc?.pages.reduce((acc, p) => acc + (p.forensicInsights?.length || 0), 0)} Detected
                             </span>
                          </div>

                          {selectedDoc?.pages.some(p => p.forensicInsights && p.forensicInsights.length > 0) ? (
                             <div className="space-y-3">
                                {selectedDoc.pages.flatMap(p => p.forensicInsights || []).map((insight, idx) => (
                                   <div key={idx} className="p-4 rounded-2xl bg-amber-50 border border-amber-200/50 animate-in slide-in-from-right-2 duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                                      <div className="flex items-center gap-3 mb-2">
                                         <AlertCircle size={14} className="text-amber-500" />
                                         <span className="text-[10px] font-black text-amber-900 uppercase tracking-tight">{insight.type}</span>
                                      </div>
                                      <p className="text-[10px] text-amber-800/70 font-medium leading-tight">{insight.detail}</p>
                                   </div>
                                ))}
                             </div>
                          ) : (
                             <div className="p-10 rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center text-center">
                                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                                   <Check size={20} />
                                </div>
                                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Optimal Stream Quality</p>
                             </div>
                          )}
                       </div>
                     </div>
                  </div>
                </div>
              )}
             </div>
          )}
       </main>

       <footer className="px-8 py-6 border-t border-border bg-muted/30 flex items-center justify-between shrink-0">
          <button 
            onClick={() => setActiveStage(TrainingStage.INFRASTRUCTURE)}
            className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest hover:text-foreground transition-all"
          >
             <ChevronLeft size={16} />
             Infrastructure Configuration
          </button>
          
          <div className="flex items-center gap-4">
             {activeTab === "engines" ? (
               <div className="flex items-center gap-3">
                 {hasRunOCR && (
                   <button 
                     onClick={() => setActiveTab("results")}
                     className="h-12 px-6 rounded-xl border border-border bg-card text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
                   >
                     View Current Results
                   </button>
                 )}
                 <button 
                   onClick={handleRunOCR}
                   disabled={!selectedEngineId || isProcessing}
                   className={cn(
                     "h-12 px-10 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-105 transition-all flex items-center gap-3 disabled:opacity-50 disabled:scale-100",
                     isProcessing && "animate-pulse"
                   )}
                 >
                    {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
                    {hasRunOCR ? "Rerun Extraction Pipeline" : "Run Extraction Pipeline"}
                 </button>
               </div>
             ) : (
               <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setActiveTab("engines")}
                   className="h-12 px-6 rounded-xl border border-border bg-card text-foreground text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
                 >
                   Back to Engine Selection
                 </button>
                 <button 
                   onClick={handleContinue}
                   className="h-12 px-10 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:scale-105 transition-all flex items-center gap-3"
                 >
                    Continue to Segregation Designer
                    <ChevronRight size={16} />
                 </button>
               </div>
             )}
          </div>
       </footer>
    </div>
  );
}
