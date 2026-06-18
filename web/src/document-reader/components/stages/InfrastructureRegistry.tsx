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
import { RoutingPolicies } from "./RoutingPolicies";
import { LanguageRegistry, GovernanceDashboard, TransparencyLog } from "./DocumentIntake";

export function InfrastructureRegistry() {
  const { updateStepStatus, setActiveStage } = useDocumentReader();
  const { 
    infrastructure, 
    updateEngineStatus, 
    toggleModel, 
    executeBenchmark,
    saveRoutingPolicy,
    deleteRoutingPolicy,
    configureEngine,
    saveState,
    loadState,
    updateGovernance,
    setPrimaryEngine,
    runAllBenchmarks,
    trainingDocuments,
    updateEnginePort
  } = usePipelineStore();
  const [activeView, setActiveView] = useState<string>("engines");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showSettings, setShowSettings] = useState<{ type: "engine" | "model", id: string, name: string } | null>(null);
  const [confidence, setConfidence] = useState(96);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);
  const [showTopology, setShowTopology] = useState(false);
  const [showOCRReview, setShowOCRReview] = useState(false);
  const [systemPortConflict, setSystemPortConflict] = useState<boolean>(false);
  const [checkingPort, setCheckingPort] = useState<boolean>(false);

  const NAV_ITEMS = [
    { id: "engines", label: "EXTRACTION ENGINES", icon: Zap },
    { id: "models", label: "OFFLINE MODELS", icon: Database },
    { id: "capabilities", label: "CAPABILITIES", icon: Layers },
    { id: "profiles", label: "PERFORMANCE", icon: Settings },
    { id: "routing", label: "ROUTING", icon: Share2 },
    { id: "benchmarks", label: "BENCHMARKS", icon: BarChart2 },
    { id: "gpu", label: "GPU INVENTORY", icon: Cpu },
    { id: "languages", label: "LANGUAGES", icon: Globe },
    { id: "governance", label: "GOVERNANCE", icon: Shield },
    { id: "explainability", label: "TRANSPARENCY", icon: Eye }
  ];

  const handleVerify = () => {
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      setIsVerified(true);
      // Auto-transition after verification
      updateStepStatus(TrainingStage.INFRASTRUCTURE, "completed");
      setActiveStage(TrainingStage.DOCUMENT_UPLOAD);
    }, 2000);
  };

  const handleEndpointTest = React.useCallback(async (engineId: string) => {
    setIsTesting(true);
    setTestResult(null);
    
    // Simulate API connectivity check delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (engineId !== 'tesseract-ocr-v5' && engineId !== 'surya-ocr') {
      setIsTesting(false);
      setTestResult("error");
      // Optionally notify user
      return;
    }

    setIsTesting(false);
    setTestResult("success");
    
    // Set engine to active and configured on success
    updateEngineStatus(engineId, "active");
    configureEngine(engineId);
    saveState();
    
    setTimeout(() => setTestResult(null), 3000);
  }, [updateEngineStatus, configureEngine]);
  React.useEffect(() => {
    if (showSettings?.type !== "engine") return;
    const currentEngine = infrastructure.engines.find(e => e.id === showSettings.id);
    if (!currentEngine?.port) {
      setSystemPortConflict(false);
      return;
    }
    
    // Don't check system port if it conflicts with another engine first
    const internalConflict = infrastructure.engines.find(e => e.id !== showSettings.id && e.port === currentEngine.port);
    if (internalConflict) {
      setSystemPortConflict(false);
      return;
    }

    let isMounted = true;
    setCheckingPort(true);
    setSystemPortConflict(false);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/system/check-port?port=${currentEngine.port}`);
        const data = await res.json();
        if (isMounted) {
          // If available is false, port is in use
          if (data.available === false) {
             setSystemPortConflict(true);
          }
        }
      } catch (e) {
        // Ignore fetch errors
      } finally {
        if (isMounted) setCheckingPort(false);
      }
    }, 400); // 400ms debounce

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [showSettings?.id, showSettings?.type, infrastructure.engines]);
  const conflictingEngine = showSettings?.type === "engine" 
    ? infrastructure.engines.find(e => 
        e.id !== showSettings.id && 
        e.port !== undefined &&
        e.port === infrastructure.engines.find(curr => curr.id === showSettings.id)?.port
      )
    : undefined;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-card/30 rounded-md border border-border overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px !important;
          display: block !important;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05) !important;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--border) !important;
          border-radius: 10px;
          border: 2px solid transparent;
          background-clip: content-box;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--primary) !important;
          background-clip: content-box;
        }
      `}} />
      {/* HEADER */}
      <header className="px-8 py-6 border-b border-border bg-card/50 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Enterprise Infrastructure</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Manage Enterprise On-Prem & Cloud Extraction Runtimes</p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Cluster Connected</span>
           </div>
           <button 
             onClick={() => {
               if (isVerified) {
                 updateStepStatus(TrainingStage.INFRASTRUCTURE, "completed");
                 setActiveStage(TrainingStage.DOCUMENT_UPLOAD);
               } else {
                 handleVerify();
               }
             }}
             className={cn(
               "h-9 px-4 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
               isVerified 
                 ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                 : "bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/20"
             )}
           >
             {isVerifying ? <Layers className="animate-spin" size={14} /> : <Zap size={14} />}
              {isVerified ? "INFRASTRUCTURE VERIFIED" : "VERIFY RUNTIME"}
           </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* SUB-NAVBAR */}
        <nav className="w-64 border-r border-border bg-muted/30 p-4 space-y-1 overflow-y-auto custom-scrollbar shrink-0">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all group",
                activeView === item.id 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              )}
            >
              <item.icon size={16} strokeWidth={activeView === item.id ? 2.5 : 2} />
              <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* CONTENT AREA */}
        <main className="flex-1 overflow-y-auto p-8 pb-32 custom-scrollbar bg-card/10 min-h-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-8 min-h-0"
            >
              {activeView === "engines" && (
                showOCRReview ? (
                  <OCRDataReview 
                    documents={trainingDocuments} 
                    onBack={() => setShowOCRReview(false)}
                    onFinalize={() => {
                       updateStepStatus(TrainingStage.INFRASTRUCTURE, "completed");
                       setActiveStage(TrainingStage.DOCUMENT_UPLOAD);
                    }}
                  />
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3 gap-6 h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
                      {infrastructure.engines.map((engine) => (
                       <EngineCard 
                         key={engine.id} 
                         engine={engine} 
                         isPrimary={infrastructure.primaryEngineId === engine.id}
                         modelCount={infrastructure.offlineModels.filter(m => m.engineId === engine.id).length}
                         onBenchmark={async () => {
                            await executeBenchmark(engine.id);
                            setShowOCRReview(true);
                         }} 
                         onConfigure={() => setShowSettings({ type: "engine", id: engine.id, name: engine.name })}
                         onStatusChange={(status) => updateEngineStatus(engine.id, status)}
                         onSetPrimary={() => setPrimaryEngine(engine.id)}
                       />
                     ))}
                    <button className="h-[240px] rounded-md border-2 border-dashed border-border flex flex-col items-center justify-center gap-3.5 text-muted-foreground hover:border-primary/30 hover:bg-primary/[0.005] hover:text-primary transition-all group">
                       <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-all">
                          <Plus size={18} />
                       </div>
                        <span className="text-[9px] font-black uppercase tracking-widest">Register New Extraction Engine</span>
                    </button>
                  </div>
                )
              )}

              {activeView === "capabilities" && (
                <CapabilityMatrix engines={infrastructure.engines} />
              )}

              {activeView === "gpu" && (
                <GPUMonitor 
                  inventory={infrastructure.gpuInventory} 
                  onViewTopology={() => setShowTopology(true)} 
                />
              )}

               {activeView === "models" && (
                <ModelRegistry 
                  models={infrastructure.offlineModels} 
                  onConfigure={(model) => setShowSettings({ type: "model", id: model.id, name: model.name })}
                />
              )}

              {activeView === "profiles" && (
                <PerformanceProfiles 
                  engines={infrastructure.engines} 
                  onStatusChange={(id, status) => updateEngineStatus(id, status)}
                />
              )}

              {activeView === "benchmarks" && (
                <BenchmarkHistory 
                  benchmarks={infrastructure.benchmarks} 
                  engines={infrastructure.engines} 
                  onRefresh={runAllBenchmarks}
                />
              )}
              
              {activeView === "routing" && (
                <RoutingPolicies 
                  policies={infrastructure.policies} 
                  engines={infrastructure.engines}
                  onSave={saveRoutingPolicy}
                  onBatchSave={usePipelineStore.getState().batchSaveRoutingPolicies}
                  onDelete={deleteRoutingPolicy}
                />
              )}
              
              {activeView === "languages" && (
                <LanguageRegistry />
              )}

              {activeView === "governance" && (
                <GovernanceDashboard />
              )}

              {activeView === "explainability" && (
                <TransparencyLog />
              )}

            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* SETTINGS OVERLAY */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-8 bg-background/80 backdrop-blur-sm">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95, y: 20 }}
               animate={{ opacity: 1, scale: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95, y: 20 }}
               className="w-full max-w-2xl bg-card border border-border shadow-sm rounded-md overflow-hidden flex flex-col max-h-[80vh]"
             >
                <header className="px-8 py-6 border-b border-border bg-muted/30 flex items-center justify-between">
                   <div>
                      <div className="flex items-center gap-3 mb-1">
                         <h3 className="text-lg font-black text-foreground uppercase tracking-tight">{showSettings.type === "engine" ? "Engine" : "Model"} Configuration</h3>
                         {showSettings.type === "engine" && (
                            <span className={cn(
                               "text-[10px] font-black px-2 py-0.5 rounded border uppercase tracking-widest",
                               infrastructure.engines.find(e => e.id === showSettings.id)?.runtimeType === "cloud" 
                                 ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                                 : "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            )}>
                               {infrastructure.engines.find(e => e.id === showSettings.id)?.runtimeType} runtime
                            </span>
                         )}
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Adjusting parameters for {showSettings.name}</p>
                   </div>
                   <button 
                     onClick={() => setShowSettings(null)}
                     className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center transition-all"
                   >
                      <X size={20} />
                   </button>
                </header>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                   <div className="space-y-4">
                      <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Runtime Parameters</h4>
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-3">
                            <div className="flex items-center justify-between">
                               <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Confidence Threshold</label>
                               <span className="text-[10px] font-black text-primary bg-primary/10 px-1.5 py-0.5 rounded">{confidence}%</span>
                            </div>
                            <input 
                              type="range" 
                              className="w-full accent-primary h-1.5 bg-muted rounded-md appearance-none cursor-pointer" 
                              min="0" 
                              max="100" 
                              value={confidence}
                              onChange={(e) => setConfidence(parseInt(e.target.value))}
                            />
                            <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
                               Filters out extraction results below this accuracy level. Higher values ensure precision but may skip ambiguous fields.
                            </p>
                         </div>
                         <div className="space-y-3">
                            <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Timeout (ms)</label>
                            <input type="number" className="w-full bg-muted border border-border rounded-md px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-primary outline-none" defaultValue={30000} />
                            <p className="text-[9px] text-muted-foreground font-medium leading-relaxed">
                               Max duration for the AI engine to attempt extraction before failing.
                            </p>
                         </div>
                      </div>
                   </div>

                   {/* CASE 1: OFFLINE ENGINE / MODEL - SHOW DOWNLOAD & DEPLOYMENT */}
                   {((showSettings.type === "engine" && infrastructure.engines.find(e => e.id === showSettings.id)?.runtimeType === "offline") || showSettings.type === "model") && (
                      <div className="space-y-6">
                         <div className="p-5 rounded-md bg-primary/5 border border-primary/10 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                                  <BookOpen size={20} />
                               </div>
                               <div>
                                  <h4 className="text-[11px] font-black text-foreground uppercase tracking-tight">Technical Documentation</h4>
                                  <p className="text-[10px] text-muted-foreground font-medium">Access official GitHub repositories and download mirrors.</p>
                               </div>
                            </div>
                            <a 
                              href={showSettings.type === "engine" ? infrastructure.engines.find(e => e.id === showSettings.id)?.helpUrl : infrastructure.offlineModels.find(m => m.id === showSettings.id)?.helpUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2"
                            >
                               <ExternalLink size={12} />
                               Download Mirror
                            </a>
                         </div>

                         {showSettings.type === "engine" && (
                            <div className="space-y-4 pt-4 border-t border-border">
                               <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Microservice Configuration</h4>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Port</label>
                                  <input 
                                    type="number" 
                                    className={cn(
                                      "w-full bg-muted border rounded-md px-4 py-2.5 text-sm font-medium focus:ring-1 outline-none transition-all",
                                      (conflictingEngine || systemPortConflict)
                                        ? "border-destructive focus:ring-destructive text-destructive" 
                                        : "border-border focus:ring-primary"
                                    )}
                                    placeholder="8089"
                                    defaultValue={infrastructure.engines.find(e => e.id === showSettings.id)?.port}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value);
                                      if (!isNaN(val)) {
                                        updateEnginePort(showSettings.id, val);
                                      }
                                    }}
                                  />
                                  {checkingPort && !conflictingEngine && (
                                     <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest mt-2 flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in">
                                        <div className="w-2 h-2 rounded-full border border-muted-foreground border-t-transparent animate-spin" />
                                        Checking system port availability...
                                     </p>
                                  )}
                                  {conflictingEngine && (
                                     <p className="text-[10px] text-destructive font-black uppercase tracking-widest mt-2 flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in">
                                        <AlertTriangle size={12} />
                                        Port Conflict: Automatically allocated to {conflictingEngine.name}
                                     </p>
                                  )}
                                  {!conflictingEngine && systemPortConflict && !checkingPort && (
                                     <p className="text-[10px] text-amber-500 font-black uppercase tracking-widest mt-2 flex items-center gap-1.5 animate-in slide-in-from-top-1 fade-in">
                                        <AlertCircle size={12} />
                                        OS Warning: Port in use by an active system process
                                     </p>
                                  )}
                               </div>
                            </div>
                         )}

                         {showSettings.type === "engine" && infrastructure.engines.find(e => e.id === showSettings.id)?.deployedUrl && (
                           <div className="space-y-4">
                              <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Local Deployment Status</h4>
                              <div className="p-4 rounded-md border border-border bg-muted/20 flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                       <Globe size={16} />
                                    </div>
                                    <div>
                                       <span className="block text-[10px] font-black text-foreground uppercase tracking-tight">Active Endpoint</span>
                                       <span className="text-[10px] text-muted-foreground font-mono">{infrastructure.engines.find(e => e.id === showSettings.id)?.deployedUrl}</span>
                                    </div>
                                 </div>
                                 <button 
                                   onClick={() => handleEndpointTest(showSettings.id)}
                                   disabled={isTesting}
                                   className={cn(
                                     "h-8 px-4 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2",
                                     testResult === "success" ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" :
                                     testResult === "error" ? "bg-destructive text-destructive-foreground" :
                                     "bg-card border border-border hover:bg-muted"
                                   )}
                                 >
                                    {isTesting ? (
                                       <>
                                          <IterationCcw size={12} className="animate-spin" />
                                          Testing...
                                       </>
                                    ) : testResult === "success" ? (
                                       <>
                                          <Check size={12} />
                                          Connected
                                       </>
                                    ) : (
                                       "Test Connection"
                                    )}
                                 </button>
                              </div>
                           </div>
                         )}

                         <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">Version & Weight Provisioning</h4>
                            <div className="p-6 rounded-md border-2 border-dashed border-border bg-muted/20 flex flex-col items-center justify-center text-center group hover:border-primary/40 hover:bg-primary/[0.02] transition-all cursor-pointer">
                               <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                                  <UploadCloud size={20} />
                               </div>
                               <h5 className="text-[12px] font-black text-foreground uppercase tracking-tight mb-1">Upload New {showSettings.type === "engine" ? "Binary" : "Model Weights"}</h5>
                               <p className="text-[10px] text-muted-foreground font-medium max-w-xs leading-relaxed mb-4">
                                  Manually provision latest {showSettings.type === "engine" ? "runtime binaries" : "quantized weights"} to the local infrastructure.
                               </p>
                               <div className="flex items-center gap-2">
                                  <button className="h-8 px-4 rounded-md bg-card border border-border text-[9px] font-black uppercase tracking-widest hover:bg-muted transition-all">
                                     Browse Files
                                  </button>
                                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">or drag and drop</span>
                               </div>
                            </div>
                         </div>
                      </div>
                   )}

                   {/* CASE 2: CLOUD ENGINE - SHOW API CONFIGURATION */}
                   {showSettings.type === "engine" && infrastructure.engines.find(e => e.id === showSettings.id)?.runtimeType === "cloud" && (
                      <div className="space-y-6">
                         <div className="p-4 rounded-md bg-amber-500/5 border border-amber-500/10 flex items-start gap-3">
                            <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-amber-700 font-medium leading-relaxed">
                               Cloud engines are managed via SaaS orchestration. Binary uploads are disabled. Configure your API credentials below to establish secure connectivity.
                            </p>
                         </div>

                         <div className="space-y-4">
                            <h4 className="text-[11px] font-black text-primary uppercase tracking-widest">API Orchestration Credentials</h4>
                            <div className="space-y-4">
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">API Endpoint / Service URL</label>
                                  <input 
                                    type="text" 
                                    className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary outline-none" 
                                    placeholder="https://cloud.engine.api/v3"
                                    defaultValue={infrastructure.engines.find(e => e.id === showSettings.id)?.helpUrl}
                                  />
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Project / Account ID</label>
                                     <input type="text" className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary outline-none" placeholder="proj_728192" />
                                  </div>
                                  <div className="space-y-2">
                                     <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Region / Datacenter</label>
                                     <select className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary outline-none">
                                        <option>US-East (Virginia)</option>
                                        <option>EU-West (Ireland)</option>
                                        <option>AP-South (Mumbai)</option>
                                     </select>
                                  </div>
                               </div>
                               <div className="space-y-2">
                                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">API Authentication Secret</label>
                                  <div className="relative">
                                     <input type="password" title="API Authentication Secret" className="w-full bg-muted border border-border rounded-md px-4 py-2.5 text-sm font-medium focus:ring-1 focus:ring-primary outline-none" defaultValue="••••••••••••••••" />
                                     <button className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-primary uppercase tracking-widest hover:underline">Show Secret</button>
                                  </div>
                               </div>
                            </div>
                         </div>
                      </div>
                   )}
                </div>

                <footer className="px-8 py-6 border-t border-border bg-muted/30 flex items-center justify-end gap-3">
                   <button 
                     onClick={() => setShowSettings(null)}
                     className="h-10 px-6 rounded-md text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all"
                   >
                      Cancel
                   </button>
                   <button 
                     onClick={() => setShowSettings(null)}
                     className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                   >
                      Save Changes
                   </button>
                </footer>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="px-8 py-6 border-t border-border bg-card/50 flex items-center justify-end gap-3 shrink-0">
         <button 
            onClick={async () => {
              await saveState();
            }}
            className="h-10 px-6 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
          >
            <HardDrive size={16} />
            Save Configuration
         </button>

         <button 
            disabled={!isVerified}
            onClick={async () => {
              await saveState();
               updateStepStatus(TrainingStage.INFRASTRUCTURE, "completed");
               setActiveStage(TrainingStage.DOCUMENT_UPLOAD);
            }}
            className={cn(
              "h-10 px-6 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg",
              isVerified 
                ? "bg-primary text-primary-foreground shadow-primary/20 hover:opacity-90" 
                : "bg-muted text-muted-foreground cursor-not-allowed border border-border"
            )}
          >
            Finalize Infrastructure
            <ArrowRight size={16} />
          </button>
      </footer>
    </div>
  );
}

// --- INFRASTRUCTURE SUB-COMPONENTS ---

function EngineCard({ 
  engine, 
  modelCount, 
  isPrimary,
  onBenchmark, 
  onConfigure, 
  onStatusChange,
  onSetPrimary
}: { 
  engine: any, 
  modelCount: number, 
  isPrimary: boolean,
  onBenchmark: () => void, 
  onConfigure: () => void, 
  onStatusChange: (status: "active" | "inactive") => void,
  onSetPrimary: () => void
}) {
  const isActive = engine.status === "active";
  return (
    <div className={cn(
      "bg-card rounded-md border overflow-hidden flex flex-col group transition-all shadow-sm min-h-[240px] hover:shadow-md hover:translate-y-[-1px]",
      isPrimary ? "border-primary ring-1 ring-primary/10 bg-primary/[0.005]" : "border-border hover:border-primary/30"
    )}>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3.5">
          <div className={cn(
            "w-10 h-10 rounded-md flex items-center justify-center transition-all shrink-0 shadow-sm",
            isActive ? "bg-primary text-primary-foreground shadow-primary/10" : "bg-muted text-muted-foreground"
          )}>
            <Zap size={20} />
          </div>
          <div className="flex flex-col items-end gap-1 ml-4">
             <div className="flex items-center gap-1.5 flex-wrap justify-end">
                {isPrimary && (
                   <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-emerald-500 text-white border border-emerald-600 shadow-sm">Primary</span>
                )}
                <span className={cn(
                   "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border",
                   engine.runtimeType === "cloud" ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-muted text-muted-foreground border-border"
                )}>{engine.runtimeType === "offline" ? "ON-PREM" : engine.runtimeType === "cloud" ? "API" : engine.runtimeType}</span>
                <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">{engine.version}</span>
                {engine.port && (
                   <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-600 border border-amber-500/20">PORT {engine.port}</span>
                )}
             </div>
             <div className="flex items-center gap-1">
                <button 
                  onClick={() => onStatusChange(isActive ? "inactive" : "active")}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all hover:brightness-95",
                    isActive 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shadow-sm" 
                      : "bg-muted border-border text-muted-foreground"
                  )}
                >
                   <div className={cn("w-1.5 h-1.5 rounded-full", isActive ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
                   <span className="text-[8px] font-black uppercase tracking-widest">{isActive ? "Active" : "Inactive"}</span>
                </button>
             </div>
          </div>
        </div>

        <div className="mb-2">
           <h3 className="text-[13px] font-black text-foreground uppercase tracking-tight mb-1.5 truncate leading-none">{engine.name}</h3>
           <div className="flex items-center gap-1.5">
               <div className={cn(
                 "px-1.5 py-0.5 rounded border flex items-center gap-1 group/brains relative cursor-help",
                 modelCount > 0 ? "bg-primary/5 border-primary/10 text-primary" : "bg-amber-500/5 border-amber-500/10 text-amber-600"
               )}>
                  <Database size={9} className={modelCount > 0 ? "text-primary" : "text-amber-500"} />
                  <span className="text-[8px] font-black uppercase tracking-widest">{modelCount} Models</span>
                  
                  <div className="absolute bottom-full left-0 mb-2 w-60 p-3 bg-popover border border-border rounded-md shadow-sm opacity-0 invisible group-hover/brains:opacity-100 group-hover/brains:visible transition-all z-20 pointer-events-none">
                     <p className="text-[8px] text-foreground font-black uppercase tracking-tight mb-1">Model Distribution Pipeline</p>
                     <p className="text-[9px] text-muted-foreground font-medium leading-relaxed normal-case">
                        {modelCount > 0 
                          ? `This extraction runtime has ${modelCount} optimized model weights provisioned for local inference.`
                          : "This engine is currently in 'Pass-through' mode. Register an 'Offline Model' to enable local extraction logic."}
                     </p>
                  </div>
               </div>
           </div>
        </div>

        <div className="space-y-3 mt-auto pt-3 border-t border-border/40">
           <div className="flex items-center justify-between">
              <div className="flex flex-col">
                 <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Aggregate Precision</span>
                 <span className="text-[11px] font-black text-foreground">{engine.accuracyScore ? `${(engine.accuracyScore * 100).toFixed(1)}%` : "Telemetry Pending"}</span>
              </div>
              {!engine.accuracyScore && (
                 <div className="group/info relative">
                    <Info size={12} className="text-muted-foreground/40 cursor-help hover:text-primary transition-colors" />
                    <div className="absolute bottom-full right-0 mb-2 w-52 p-3 bg-popover border border-border rounded-md shadow-sm opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all z-20 pointer-events-none">
                       <p className="text-[8px] text-foreground font-black uppercase tracking-tight mb-1">Infrastructure Telemetry</p>
                       <p className="text-[9px] text-muted-foreground font-medium leading-relaxed normal-case">
                          Real-time accuracy scoring is calculated after the initial benchmark verification on local compute nodes.
                       </p>
                    </div>
                 </div>
              )}
           </div>
           <div className="h-1.5 bg-muted rounded-full overflow-hidden shadow-inner">
              <div 
                className={cn("h-full transition-all duration-1000", engine.isConfigured ? "bg-primary shadow-sm" : "bg-muted")} 
                style={{ width: `${(engine.accuracyScore || 0) * 100}%` }} 
              />
           </div>
        </div>
      </div>

      <div className="p-2.5 bg-muted/20 border-t border-border flex items-center gap-1.5">
         <button 
           onClick={onBenchmark}
           className="flex-1 h-8 rounded-md bg-card border border-border text-[9px] font-black uppercase tracking-widest hover:bg-muted hover:border-primary/20 transition-all flex items-center justify-center gap-2 shadow-sm"
         >
           <Activity size={12} className="text-primary" />
           Quality
         </button>
         
         <button 
           onClick={onConfigure}
           className="h-8 w-8 rounded-md bg-card border border-border text-muted-foreground hover:bg-primary hover:text-white hover:border-primary transition-all flex items-center justify-center shadow-sm"
           title="Advanced Parameters"
         >
            <Settings size={13} />
         </button>

         <button 
           onClick={onSetPrimary}
           className={cn(
             "h-8 px-3 rounded-md text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 border shadow-sm",
             isPrimary 
               ? "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/10" 
               : "bg-card border-border hover:bg-primary/5 hover:text-primary hover:border-primary/10 text-muted-foreground"
           )}
         >
            {isPrimary ? <Check size={12} /> : <Target size={12} />}
            {isPrimary ? "Primary" : "Promote"}
         </button>
      </div>
    </div>
  );
}

function OCRDataReview({ documents, onBack, onFinalize }: { documents: any[], onBack: () => void, onFinalize: () => void }) {
  return (
    <div className="flex flex-col h-full space-y-6">
       <div className="flex items-center justify-between">
          <div>
             <h3 className="text-lg font-black text-foreground uppercase tracking-tight">Primary Extraction Preview</h3>
             <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Reviewing primary OCR output across {documents.length} document assets</p>
          </div>
          <button 
            onClick={onBack}
            className="h-8 px-4 rounded-md bg-card border border-border text-[9px] font-black uppercase tracking-widest hover:bg-muted transition-all flex items-center gap-2"
          >
             <ArrowLeft size={12} />
             Back to Registry
          </button>
       </div>

       <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pb-20">
          {documents.map((doc, dIdx) => (
             <div key={doc.documentId} className="bg-card border border-border rounded-md overflow-hidden shadow-sm">
                <header className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                         <FileText size={16} />
                      </div>
                      <div>
                         <p className="text-[11px] font-black text-foreground uppercase tracking-tight">{doc.name}</p>
                         <p className="text-[9px] text-muted-foreground font-mono">{doc.documentId}</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                         {doc.pages.length} Pages
                      </span>
                   </div>
                </header>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                   {doc.pages.map((page: any, pIdx: number) => (
                      <div key={page.pageId} className="flex gap-4 p-4 rounded-md border border-border bg-muted/10 group hover:border-primary/30 transition-all">
                         <div className="w-24 aspect-[3/4] rounded-md border border-border overflow-hidden bg-card shrink-0">
                            <img src={page.imageUrl} className="w-full h-full object-cover" />
                         </div>
                         <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                               <div className="flex items-center justify-between mb-2">
                                          <span className="text-[11px] font-black text-muted-foreground uppercase tracking-widest">Page {pIdx + 1}</span>
                                   <div className="flex items-center gap-3 mt-1.5">
                                      <span className="text-[12px] font-black text-primary uppercase tracking-[0.1em] tabular-nums">
                                        {page.confidence ? `${(page.confidence * 100).toFixed(1)}%` : "PENDING"}
                                      </span>
                                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden flex-1">
                                         <div 
                                           className={cn(
                                             "h-full transition-all duration-1000",
                                             (page.confidence || 0) > 0.9 ? "bg-emerald-500" : (page.confidence || 0) > 0.7 ? "bg-amber-500" : "bg-rose-500"
                                           )} 
                                           style={{ width: `${(page.confidence || 0) * 100}%` }} 
                                         />
                                      </div>
                                   </div>
                               </div>
                               <div className="bg-card/50 p-2.5 rounded-md border border-border/50 max-h-32 overflow-y-auto custom-scrollbar">
                                  <p className="text-[10px] text-foreground font-medium leading-relaxed italic line-clamp-4">
                                     {page.ocrData?.text || "No extraction data available for this page."}
                                  </p>
                               </div>
                            </div>
                            {page.tags && page.tags.length > 0 && (
                               <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Metadata Tags:</span>
                                  <div className="flex flex-wrap gap-1">
                                     {page.tags.map((tag: string) => (
                                       <span key={tag} className="px-1.5 py-0.5 rounded bg-muted text-[7px] font-bold uppercase">{tag}</span>
                                     ))}
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}

function CapabilityMatrix({ engines }: { engines: any[] }) {
  return (
    <div className="space-y-6 h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
      <div className="bg-card rounded-md border border-border overflow-hidden shadow-sm overflow-x-auto custom-scrollbar">
      <table className="w-full text-left border-collapse min-w-[1000px]">
        <thead>
          <tr className="bg-muted/50 border-b border-border">
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Engine</th>
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Version</th>
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Type</th>
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Signatures</th>
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Checkboxes</th>
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">RadioButtons</th>
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Tables</th>
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Layout</th>
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">GPU</th>
            <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reliability</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {engines.map((engine) => (
            <tr key={engine.id} className="hover:bg-muted/20 transition-colors group">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                      <Zap size={14} />
                   </div>
                   <span className="text-[11px] font-black text-foreground uppercase tracking-tight">{engine.name}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                 <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{engine.version}</span>
              </td>
              <td className="px-6 py-4">
                 <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{engine.runtimeType}</span>
              </td>
              <td className="px-6 py-4">
                 {engine.capabilities["Signatures"] === "available" ? <CheckCircle2 size={16} className="text-emerald-500" /> : 
                  engine.capabilities["Signatures"] === "partial" ? <AlertCircle size={16} className="text-amber-500" /> :
                  <X size={16} className="text-muted-foreground/30" />}
              </td>
              <td className="px-6 py-4">
                 {engine.capabilities["Checkboxes"] === "available" ? <CheckCircle2 size={16} className="text-emerald-500" /> : <X size={16} className="text-muted-foreground/30" />}
              </td>
              <td className="px-6 py-4">
                 {engine.capabilities["RadioButtons"] === "available" ? <CheckCircle2 size={16} className="text-emerald-500" /> : <X size={16} className="text-muted-foreground/30" />}
              </td>
              <td className="px-6 py-4">
                 {engine.capabilities["Tables"] === "available" ? <CheckCircle2 size={16} className="text-emerald-500" /> : <X size={16} className="text-muted-foreground/30" />}
              </td>
              <td className="px-6 py-4">
                 {engine.capabilities["Layout"] === "available" ? <CheckCircle2 size={16} className="text-emerald-500" /> : <X size={16} className="text-muted-foreground/30" />}
              </td>
              <td className="px-6 py-4">
                 <Zap size={14} className={engine.isGpuSupported ? "text-primary fill-primary/20" : "text-muted-foreground/20"} />
              </td>
              <td className="px-6 py-4">
                 {engine.accuracyScore ? (
                   <span className="text-[10px] font-black text-foreground">{(engine.accuracyScore * 100).toFixed(1)}%</span>
                 ) : (
                   <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 italic">Pending</span>
                 )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
  );
}

function GPUMonitor({ inventory, onViewTopology }: { inventory: any[], onViewTopology: () => void }) {
  return (
    <div className="space-y-6 h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         {inventory.map((gpu) => (
           <div key={gpu.id} className="bg-card rounded-md border border-border p-5 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                 <Cpu size={60} />
              </div>
              
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shadow-sm">
                       <Zap size={18} />
                    </div>
                    <div>
                       <h4 className="text-[10px] font-black text-foreground uppercase tracking-tight">{gpu.name}</h4>
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{gpu.id}</span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full", 
                      gpu.status === "online" ? (gpu.usagePercent > 80 ? "bg-amber-500 animate-pulse" : "bg-emerald-500") : "bg-rose-500"
                    )} />
                    <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{gpu.status}</span>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">VRAM Pressure</span>
                       <span className="text-[9px] font-black text-foreground">{gpu.vramUsed} / {gpu.vramTotal}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                       <div 
                         className={cn(
                           "h-full transition-all duration-1000",
                           gpu.usagePercent > 85 ? "bg-rose-500" : gpu.usagePercent > 60 ? "bg-amber-500" : "bg-primary"
                         )} 
                         style={{ width: `${gpu.usagePercent || 0}%` }} 
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                    <div>
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Core Temp</span>
                       <p className={cn(
                         "text-[10px] font-black",
                         gpu.temperature > 70 ? "text-rose-500" : gpu.temperature > 55 ? "text-amber-500" : "text-foreground"
                       )}>{gpu.temperature}°C</p>
                    </div>
                    <div>
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Power Usage</span>
                       <p className="text-[10px] font-black text-foreground">{gpu.powerUsage}</p>
                    </div>
                    <div>
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Clock Speed</span>
                       <p className="text-[10px] font-black text-foreground">{gpu.clockSpeed}</p>
                    </div>
                    <div>
                       <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Fan Speed</span>
                       <p className="text-[10px] font-black text-foreground">{gpu.fanSpeed}</p>
                    </div>
                 </div>
              </div>
           </div>
         ))}
      </div>

      <div className="bg-primary/5 rounded-md border border-primary/10 p-6 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
               <ShieldCheck size={24} />
            </div>
            <div>
               <h4 className="text-sm font-black text-foreground uppercase tracking-tight">REMOTE CLUSTER ACCELERATION ACTIVE</h4>
               <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">The orchestration layer is automatically routing heavy extraction tasks to the enterprise high-density GPU cluster.</p>
            </div>
         </div>
         <button 
           onClick={onViewTopology}
           className="h-10 px-6 rounded-md bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-primary/20"
         >
            View Cluster Topology
         </button>
      </div>
    </div>
  );
}

function PerformanceProfiles({ engines, onStatusChange }: { engines: any[], onStatusChange: (id: string, status: "active" | "inactive") => void }) {
  const configuredEngines = engines.filter(e => e.isConfigured);
  const avgAccuracy = configuredEngines.length > 0 
    ? (configuredEngines.reduce((acc, e) => acc + (e.accuracyScore || 0), 0) / configuredEngines.length) 
    : 0;
  const avgLatency = configuredEngines.length > 0
    ? (configuredEngines.reduce((acc, e) => acc + (e.latencyScore || 0), 0) / configuredEngines.length)
    : 0;

  return (
    <div className="space-y-8 h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-card rounded-md border border-border p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                   <ShieldCheck size={16} />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Health</span>
             </div>
             <p className="text-2xl font-black text-foreground uppercase tracking-tighter">
                {engines.filter(e => e.healthStatus === 'healthy').length}/{engines.length}
             </p>
             <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Healthy Runtimes</p>
          </div>
          <div className="bg-card rounded-md border border-border p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center text-primary">
                   <Clock size={16} />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Avg Latency</span>
             </div>
             <p className="text-2xl font-black text-foreground uppercase tracking-tighter">
                {avgLatency > 0 ? `${(avgLatency * 2).toFixed(1)}s` : 'N/A'}
             </p>
             <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Active Cluster Avg</p>
          </div>
          <div className="bg-card rounded-md border border-border p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-md bg-blue-500/10 flex items-center justify-center text-blue-500">
                   <Activity size={16} />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Hubs</span>
             </div>
             <p className="text-2xl font-black text-foreground uppercase tracking-tighter">{configuredEngines.length}</p>
             <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Configured Engines</p>
          </div>
          <div className="bg-card rounded-md border border-border p-5 shadow-sm">
             <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-md bg-purple-500/10 flex items-center justify-center text-purple-500">
                   <Target size={16} />
                </div>
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Cluster Accuracy</span>
             </div>
             <p className="text-2xl font-black text-foreground uppercase tracking-tighter">
                {avgAccuracy > 0 ? `${(avgAccuracy * 100).toFixed(1)}%` : 'N/A'}
             </p>
             <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest mt-1">Collective Precision</p>
          </div>
       </div>

       <div className="bg-card rounded-md border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Engine Runtime</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Reliability</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Latency</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Stability</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Operational State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {engines.map((engine) => (
                <tr key={engine.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all">
                          <Zap size={14} />
                       </div>
                       <div>
                          <p className="text-[11px] font-black text-foreground uppercase tracking-tight">{engine.name}</p>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">{engine.provider}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     {engine.accuracyScore !== null ? (
                       <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-emerald-500" style={{ width: `${engine.accuracyScore * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-foreground">{(engine.accuracyScore * 100).toFixed(1)}%</span>
                       </div>
                     ) : (
                       <div className="flex items-center gap-1 text-muted-foreground/40">
                          <Info size={12} />
                          <span className="text-[9px] font-bold uppercase tracking-widest italic">Setup Required</span>
                       </div>
                     )}
                  </td>
                  <td className="px-6 py-4">
                     {engine.latencyScore !== null ? (
                       <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                             <div className="h-full bg-blue-500" style={{ width: `${engine.latencyScore * 100}%` }} />
                          </div>
                          <span className="text-[10px] font-black text-foreground">{(engine.latencyScore * 2).toFixed(1)}s</span>
                       </div>
                     ) : (
                       <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-widest italic">N/A</span>
                     )}
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${engine.healthStatus === 'healthy' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{engine.healthStatus}</span>
                     </div>
                  </td>
                   <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => onStatusChange(engine.id, engine.status === 'active' ? 'inactive' : 'active')}
                        className={cn(
                          "inline-flex items-center gap-2 px-3 py-1.5 rounded-md border transition-all",
                          engine.status === 'active' 
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shadow-sm" 
                            : "bg-muted border-border text-muted-foreground"
                        )}
                      >
                         <div className={cn("w-1.5 h-1.5 rounded-full", engine.status === 'active' ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
                         <span className="text-[9px] font-black uppercase tracking-widest">{engine.status === 'active' ? 'Operational' : 'Disabled'}</span>
                         {engine.status === 'active' ? <CheckCircle2 size={12} className="ml-1" /> : <Power size={12} className="ml-1" />}
                      </button>
                   </td>
                </tr>
              ))}
            </tbody>
          </table>
       </div>
    </div>
  );
}

function BenchmarkHistory({ 
  benchmarks, 
  engines, 
  onRefresh 
}: { 
  benchmarks: any[], 
  engines: any[], 
  onRefresh: () => void 
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <div className="space-y-6 h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
       <div className="flex items-center justify-between mb-2">
          <div>
             <h3 className="text-sm font-black text-foreground uppercase tracking-tight">Diagnostic History</h3>
             <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Audit trail of recent engine quality checks</p>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={handleRefresh}
               disabled={isRefreshing}
               className={cn(
                 "h-9 px-4 rounded-md text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all shadow-sm",
                 isRefreshing 
                   ? "bg-muted text-muted-foreground" 
                   : "bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white"
               )}
             >
                <Activity size={14} className={isRefreshing ? "animate-spin" : ""} />
                {isRefreshing ? "Running Suite..." : "Run Diagnostic Suite"}
             </button>
             <button className="h-9 px-4 rounded-md bg-muted text-[10px] font-black uppercase tracking-widest hover:bg-card transition-all">
                Export Full Report
             </button>
          </div>
       </div>

       <div className="bg-card rounded-md border border-border overflow-hidden shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border">
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Engine</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Accuracy</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Latency</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Memory</th>
                <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Confidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {benchmarks.length > 0 ? benchmarks.map((res) => (
                <tr key={res.id} className="hover:bg-muted/20 transition-colors group">
                  <td className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-tight">
                     {new Date(res.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-6 py-4">
                     <span className="text-[10px] font-black text-foreground uppercase tracking-tight">
                        {engines.find(e => e.id === res.engineId)?.name || 'Unknown'}
                     </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className="text-[10px] font-black text-emerald-500">{(res.accuracy * 100).toFixed(2)}%</span>
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black text-foreground">
                     {res.latency.toFixed(1)}s
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black text-muted-foreground">
                     {res.memoryUsage}
                  </td>
                  <td className="px-6 py-4">
                     <div className="px-2 py-0.5 rounded bg-primary/5 border border-primary/10 inline-block">
                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">{(res.confidenceScore * 100).toFixed(1)}%</span>
                     </div>
                  </td>
                </tr>
              )) : (
                <tr>
                   <td colSpan={6} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                         <BarChart2 size={32} className="text-muted-foreground/20" />
                         <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">No benchmark data available. Start a 'Check Quality' test to see results.</p>
                      </div>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
       </div>
    </div>
  );
}

 function ModelRegistry({ models, onConfigure }: { models: any[], onConfigure: (model: any) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[calc(100vh-320px)] overflow-y-auto pr-2 custom-scrollbar">
      {models.map((model) => (
        <div key={model.id} className="bg-card rounded-md border border-border p-6 shadow-sm flex items-start gap-5 hover:border-primary/30 transition-all group">
           <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-white transition-all shrink-0">
              <Database size={24} />
           </div>
           <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                 <h4 className="text-[12px] font-black text-foreground uppercase tracking-tight">{model.name}</h4>
                 <span className="text-[8px] font-black text-primary uppercase tracking-widest bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">{model.version}</span>
              </div>
              <p className="text-[10px] text-muted-foreground font-medium mb-4">{model.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center text-muted-foreground">
                       <HardDrive size={10} />
                    </div>
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{model.size} Size</span>
                 </div>
                 <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-muted/50 flex items-center justify-center text-muted-foreground">
                       <Zap size={10} />
                    </div>
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{(model.benchmarkScore * 100).toFixed(0)}% Accuracy</span>
                 </div>
              </div>
           </div>
           <div className="flex flex-col gap-2">
               {model.helpUrl && (
                 <a 
                   href={model.helpUrl}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all"
                   title="Download Source"
                 >
                    <ExternalLink size={14} />
                 </a>
               )}
               <button 
                 onClick={() => onConfigure(model)}
                 className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-white transition-all"
               >
                  <Settings size={14} />
               </button>
              <button className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-muted-foreground hover:bg-destructive hover:text-white transition-all">
                 <Trash2 size={14} />
              </button>
           </div>
        </div>
      ))}
      <button className="h-[120px] rounded-md border-2 border-dashed border-border flex items-center justify-center gap-3 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-primary transition-all group">
         <Plus size={20} />
         <span className="text-[10px] font-black uppercase tracking-widest">Import Local Model Repository</span>
      </button>
    </div>
  );
}


