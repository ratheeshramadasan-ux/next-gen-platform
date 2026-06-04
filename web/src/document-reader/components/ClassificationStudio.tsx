"use client";

import React, { useState } from "react";
import { 
  Plus, Search, X, Tag, FileText, CheckCircle2, ChevronRight, 
  Layers, Settings, Info, Trash2, Edit3, Filter, Sparkles,
  MousePointer2, Box, Anchor, Table, Type, Eye, Save, Wand2,
  Activity, Grid2X2, AlertCircle, FileStack, Files, MoreVertical,
  Check, ChevronDown, FileSearch, BrainCircuit, Globe, RefreshCw,
  GitMerge, Play, ShieldAlert, CheckSquare, Layers2, TrendingUp,
  History, RotateCcw, Award, Zap, HelpCircle, HardDrive
} from "lucide-react";
import { usePipelineStore } from "../store/studioStore";
import { useDocumentReader } from "../store/documentReaderContext";
import { TrainingDocument, TrainingStage } from "../types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ClassificationStudio() {
  const { 
    trainingDocuments, 
    documentClasses, 
    updateDocumentClass,
    updatePageClass,
    activeDocument,
    setActiveDocument,
    deleteClass
  } = usePipelineStore();
  
  const { updateStepStatus, setActiveStage } = useDocumentReader();
  const [viewMode, setViewMode] = useState<"batch" | "detail">("batch");
  const [studioTab, setStudioTab] = useState<"fabric" | "models" | "analytics" | "context" | "simulator">("fabric");
  const [openPageMenu, setOpenPageMenu] = useState<string | null>(null);

  // Simulator Local State
  const [simDocType, setSimDocType] = useState<"claim" | "invoice" | "id">("claim");
  const [simLayers, setSimLayers] = useState({ heuristic: true, semantic: true, visual: true, overrides: true });
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Shadow Mode Local State
  const [shadowModelActive, setShadowModelActive] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState("v1.2.4");

  const handleDocumentClick = (doc: TrainingDocument) => {
    setActiveDocument(doc);
    setViewMode("detail");
  };

  // Simulation Trigger
  const runSimulation = () => {
    setIsSimulating(true);
    setSimResult(null);
    setTimeout(() => {
      setIsSimulating(false);
      if (simDocType === "claim") {
        setSimResult({
          docClass: "Medical Claim Bundle",
          confidence: 96.8,
          breakdown: { semantic: 91, visual: 94, rules: 100, historical: 99 },
          explainability: [
            "Matched 'Medical Claim Form v4.0' structured header logo.",
            "Matched visual anchor blueprint for CA Standard Claims.",
            "Heuristic detected key phrase: 'Billing Account Number'.",
            "Page 2 matched prescription OCR vocabulary.",
            "Confidence verified above 95% threshold (Routing auto-approved)."
          ],
          routingTarget: "Claims Ingestion Queue"
        });
      } else if (simDocType === "invoice") {
        setSimResult({
          docClass: "Enterprise Invoice",
          confidence: 98.2,
          breakdown: { semantic: 96, visual: 92, rules: 100, historical: 98 },
          explainability: [
            "Fast heuristic found exact VAT Reg Number pattern.",
            "Semantic OCR matched terms: 'Amount Due', 'Vendor Settlement'.",
            "Logo matcher located 'Vendor Corporate Seal'.",
            "Page range parsed as single corporate invoice structure."
          ],
          routingTarget: "Accounts Payable Gateway"
        });
      } else {
        setSimResult({
          docClass: "US Driver License",
          confidence: 99.4,
          breakdown: { semantic: 98, visual: 99, rules: 100, historical: 95 },
          explainability: [
            "Visual ViT classifier detected driver's license layout geometry.",
            "Face portrait region detected with 99.1% boundary score.",
            "Barcode PDF417 format read successfully.",
            "Customer override rules checked: Global Matcher Validated."
          ],
          routingTarget: "Identity Verification Sandbox"
        });
      }
    }, 1200);
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500">
      {/* STUDIO HEADER */}
      <div className="flex items-center justify-between mb-4 px-2 shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/20">
               <BrainCircuit size={20} />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-foreground uppercase">Adaptive Classification Fabric</h2>
              <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-80">5-Layer Semantic AI & Routing Studio</p>
            </div>
          </div>
          <div className="h-6 w-[1px] bg-border mx-2" />
          
          {/* Main Studio Mode Toggle */}
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 rounded-xl border border-border/40">
             <button 
                onClick={() => setViewMode("batch")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  viewMode === "batch" ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground"
                )}
             >
                Batch Assignments
             </button>
             <button 
                onClick={() => setViewMode("detail")}
                disabled={!activeDocument}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all",
                  viewMode === "detail" ? "bg-card text-primary shadow-sm border border-border/50" : "text-muted-foreground hover:text-foreground disabled:opacity-30"
                )}
             >
                Verification Grid
             </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-xl border border-border/50 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            <Tag size={12} className="text-primary" />
            {documentClasses.length} Configured Classes
          </div>
          <button 
             className="h-9 px-4 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-primary/25"
          >
             <Sparkles size={14} />
             Auto-Assign batch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-4 flex-1 min-h-0 overflow-hidden">
        
        {/* LEFT PANEL: TRAINING ASSETS & CLASS DIRECTORY */}
        <div className="flex flex-col gap-4 min-h-0">
          
          {/* CLASSES DIRECTORY */}
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col shrink-0 shadow-sm">
             <div className="flex items-center justify-between mb-4 px-1">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Document Classes</span>
                <Info size={12} className="text-muted-foreground/50" />
             </div>

             <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                {documentClasses.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground italic px-1">No classes defined. Configure taxonomy in extraction.</p>
                ) : (
                  documentClasses.map((cls) => {
                    const isTagged = trainingDocuments.some(doc => doc.classification?.classId === cls.classId);
                    return (
                      <div key={cls.classId} className="group flex items-center justify-between p-2 rounded-xl border border-border/40 bg-muted/10">
                         <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: cls.color }} />
                            <span className="text-xs font-bold uppercase tracking-tight text-foreground">{cls.name}</span>
                         </div>
                         {isTagged ? (
                           <div className="w-4 h-4 rounded-full bg-emerald-500/10 flex items-center justify-center" title="Active in current batch">
                              <Check size={10} className="text-emerald-500" />
                           </div>
                         ) : (
                           <button
                             onClick={() => {
                               deleteClass(cls.classId);
                               toast.success(`Removed inactive taxonomy class "${cls.name}"`);
                             }}
                             className="w-5 h-5 rounded-md hover:bg-rose-500/15 text-muted-foreground hover:text-rose-500 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                             title="Delete inactive class"
                           >
                              <Trash2 size={12} />
                           </button>
                         )}
                      </div>
                    );
                  })
                )}
             </div>
          </div>

          {/* BATCH DOCUMENTS LIST */}
          <div className="bg-card border border-border rounded-2xl flex flex-col min-h-0 shadow-sm flex-1 overflow-hidden">
             <div className="p-4 border-b border-border/50 flex items-center justify-between">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">Training Assets</span>
                <span className="text-[10px] font-black text-primary px-2 py-0.5 bg-primary/10 rounded-full">{trainingDocuments.length}</span>
             </div>
             <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                {trainingDocuments.map((doc) => (
                  <button
                    key={doc.documentId}
                    onClick={() => handleDocumentClick(doc)}
                    className={cn(
                      "w-full p-2.5 rounded-xl border text-left transition-all flex items-center gap-3 relative overflow-hidden group",
                      activeDocument?.documentId === doc.documentId ? "border-primary bg-primary/5 shadow-inner" : "border-transparent bg-muted/10 hover:bg-muted/20"
                    )}
                  >
                     <FileText size={14} className={activeDocument?.documentId === doc.documentId ? "text-primary" : "text-muted-foreground"} />
                     <div className="min-w-0 flex-1">
                        <p className={cn("text-xs font-black uppercase truncate tracking-tight", activeDocument?.documentId === doc.documentId ? "text-primary" : "text-foreground")}>{doc.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase mt-0.5">{doc.pages.length} Pages</p>
                     </div>
                     {doc.classification && <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />}
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* RIGHT PANEL: INTERACTIVE ADAPTIVE CLASSIFICATION WORKSPACE */}
        <div className="bg-card border border-border rounded-2xl flex flex-col min-h-0 shadow-sm relative overflow-hidden">
           
           {/* Navigation Stepper Sub-tabs */}
           <div className="flex items-center gap-1.5 p-3 border-b border-border/40 bg-muted/20 shrink-0 overflow-x-auto">
              {[
                { id: "fabric", label: "🧠 5-Layer Fabric", desc: "Pipeline architecture" },
                { id: "models", label: "🛡️ Shadow & Rollback", desc: "Model version governance" },
                { id: "analytics", label: "📊 Accuracy & Loops", desc: "Learning loop center" },
                { id: "context", label: "🧬 Active Context", desc: "Multi-page continuity" },
                { id: "simulator", label: "🧪 Routing Simulator", desc: "Execution sandbox" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStudioTab(tab.id as any)}
                  className={cn(
                    "flex flex-col text-left px-3 py-1.5 rounded-xl border transition-all shrink-0 min-w-[130px]",
                    studioTab === tab.id 
                      ? "bg-card border-primary/20 text-primary shadow-sm" 
                      : "border-transparent text-muted-foreground hover:bg-card hover:border-border/40 hover:text-foreground"
                  )}
                >
                   <span className="text-[10px] font-black uppercase tracking-wider block">{tab.label}</span>
                   <span className="text-[8px] font-bold text-muted-foreground/60 uppercase block mt-0.5">{tab.desc}</span>
                </button>
              ))}
           </div>

           <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-10">
              
              {/* TAB 1: 5-LAYER CLASSIFICATION FABRIC */}
              {studioTab === "fabric" && (
                <div className="space-y-6">
                   <div>
                      <h3 className="text-base font-black text-foreground uppercase tracking-tight">Adaptive Classification Fabric Architecture</h3>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase mt-1">Configure parameters for each layer of the five-layer auto-routing pipeline.</p>
                   </div>

                   <div className="space-y-4">
                      {/* Layer 1 */}
                      <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl flex items-start gap-4">
                         <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-black text-sm shrink-0">L1</div>
                         <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                               <div>
                                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Layer 1: Fast Heuristic Rules (Ultra-Fast Routing)</h4>
                                  <p className="text-[10px] text-foreground/80 mt-0.5">Scans regex, keywords, file names, barcode, and headers to optimize cost and page routing latency.</p>
                               </div>
                               <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 rounded text-[9px] font-black uppercase">Low Latency</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                               <div className="p-2 bg-card border border-border/40 rounded-lg">
                                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block">Typo Tolerance</span>
                                  <span className="text-xs font-black text-foreground uppercase">60% Max Allowed</span>
                               </div>
                               <div className="p-2 bg-card border border-border/40 rounded-lg">
                                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block">Barcode Sniffing</span>
                                  <span className="text-xs font-black text-foreground uppercase">PDF417, QR Code</span>
                               </div>
                               <div className="p-2 bg-card border border-border/40 rounded-lg">
                                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block">Target MIME Types</span>
                                  <span className="text-xs font-black text-foreground uppercase">PDF, TIFF, JPEG</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Layer 2 */}
                      <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl flex items-start gap-4">
                         <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-black text-sm shrink-0">L2</div>
                         <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                               <div>
                                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Layer 2: OCR Semantic Classification (LayoutLMv3)</h4>
                                  <p className="text-[10px] text-foreground/80 mt-0.5">Utilizes transformers to extract field relationships, semantic vocabularies, and text structures.</p>
                               </div>
                               <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-[9px] font-black uppercase">LayoutLM Active</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <div className="p-2 bg-card border border-border/40 rounded-lg">
                                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block">Semantic Embedding Model</span>
                                  <span className="text-xs font-black text-foreground uppercase">sentence-transformers/all-MiniLM-L6-v2</span>
                               </div>
                               <div className="p-2 bg-card border border-border/40 rounded-lg">
                                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block">Field Relationship Weight</span>
                                  <span className="text-xs font-black text-foreground uppercase">0.85 (High Priority)</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Layer 3 */}
                      <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl flex items-start gap-4">
                         <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center font-black text-sm shrink-0">L3</div>
                         <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                               <div>
                                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Layer 3: Visual Layout Classification (ViT / CNN)</h4>
                                  <p className="text-[10px] text-foreground/80 mt-0.5">Vision classifiers identify passports, visual seals, stamps, portraits, and table boundaries.</p>
                               </div>
                               <span className="px-2 py-0.5 bg-purple-500/10 text-purple-600 rounded text-[9px] font-black uppercase">ViT Engaged</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                               <div className="p-2 bg-card border border-border/40 rounded-lg">
                                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block">CNN Backends</span>
                                  <span className="text-xs font-black text-foreground uppercase">EfficientNet-B4 + Detectron2</span>
                               </div>
                               <div className="p-2 bg-card border border-border/40 rounded-lg">
                                  <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block">Visual Anchor Map Matching</span>
                                  <span className="text-xs font-black text-foreground uppercase">Active (Logos & Stamps)</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Layer 4 */}
                      <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl flex items-start gap-4">
                         <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-black text-sm shrink-0">L4</div>
                         <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                               <div>
                                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Layer 4: Hierarchical Naming Overrides</h4>
                                  <p className="text-[10px] text-foreground/80 mt-0.5">Applies customer and tenant-specific mapping priorities to avoid nomenclature conflicts.</p>
                               </div>
                               <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 rounded text-[9px] font-black uppercase">Hierarchical</span>
                            </div>
                            <div className="p-2 bg-card border border-border/40 rounded-lg flex items-center justify-between">
                               <div>
                                  <span className="text-[8px] font-black text-muted-foreground uppercase block">Hierarchy Chain</span>
                                  <span className="text-xs font-black text-foreground uppercase block">Global Models ➔ Customer Overrides ➔ Tenant Local rules</span>
                               </div>
                               <button className="px-3 py-1 bg-muted rounded-lg text-[9px] font-black uppercase border border-border/40">Manage Mappings</button>
                            </div>
                         </div>
                      </div>

                      {/* Layer 5 */}
                      <div className="p-4 bg-muted/20 border border-border/40 rounded-2xl flex items-start gap-4">
                         <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-black text-sm shrink-0">L5</div>
                         <div className="flex-1 space-y-2">
                            <div className="flex items-center justify-between">
                               <div>
                                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Layer 5: Active Human Learning Loop (Audit Feedback)</h4>
                                  <p className="text-[10px] text-foreground/80 mt-0.5">Captures human verification edits in real time to adaptively fine-tune confidence scores over time.</p>
                               </div>
                               <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-600 rounded text-[9px] font-black uppercase">Feedback Loop</span>
                            </div>
                            <div className="flex items-center justify-between p-2.5 bg-card border border-border/40 rounded-xl">
                               <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                  <span className="text-xs font-black text-foreground uppercase">Dynamic Weight Tune Model Active</span>
                               </div>
                               <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase">Weight update trigger: 50 new samples</span>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* TAB 2: ACTIVE MODEL REGISTER & VERSIONING */}
              {studioTab === "models" && (
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <div>
                         <h3 className="text-base font-black text-foreground uppercase tracking-tight">Active Model Governance</h3>
                         <p className="text-[11px] font-bold text-muted-foreground uppercase mt-1">Run shadow deployments and rollback classification versions seamlessly.</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className="px-3 py-1 bg-emerald-500/10 text-emerald-600 rounded-xl border border-emerald-500/20 text-[10px] font-black uppercase tracking-wider">
                            🛡️ HIPAA & SOC2 Compliant
                         </span>
                      </div>
                   </div>

                   <div className="grid grid-cols-[1fr_300px] gap-6">
                      
                      {/* Left: Shadow Classification Sandbox */}
                      <div className="bg-muted/10 border border-border/40 p-5 rounded-2xl space-y-4">
                         <div className="flex items-center justify-between">
                            <span className="text-xs font-black text-foreground uppercase tracking-wider block">Shadow Classification Framework</span>
                            <button 
                              onClick={() => setShadowModelActive(!shadowModelActive)}
                              className={cn("px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all shadow-sm", shadowModelActive ? "bg-rose-500 text-white" : "bg-primary text-primary-foreground")}
                            >
                               {shadowModelActive ? "Disable Shadow Mode" : "Enable Shadow Mode"}
                            </button>
                         </div>

                         <p className="text-[10px] text-foreground/80 leading-relaxed">
                            Shadow mode runs a candidate classifier model in parallel with the production model without impacting live streams, saving metrics to analyze delta accuracy increases.
                         </p>

                         <div className="grid grid-cols-2 gap-4">
                            {/* Current Production */}
                            <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3">
                               <div className="flex items-center gap-2">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                  <span className="text-[10px] font-black text-foreground uppercase">Current Production</span>
                               </div>
                               <div className="space-y-1">
                                  <span className="text-xs font-black text-foreground uppercase">LayoutLMv3-Base</span>
                                  <span className="text-[9px] text-muted-foreground block">Accuracy: 95.8%</span>
                                  <span className="text-[9px] text-muted-foreground block">Avg Latency: 124ms</span>
                               </div>
                            </div>

                            {/* Candidate Shadow */}
                            <div className={cn("p-4 border rounded-xl space-y-3 transition-all", shadowModelActive ? "bg-card border-primary/45" : "bg-card/40 border-border/40 opacity-50")}>
                               <div className="flex items-center gap-2">
                                  <div className={cn("w-2 h-2 rounded-full", shadowModelActive ? "bg-primary animate-pulse" : "bg-muted")} />
                                  <span className="text-[10px] font-black text-foreground uppercase">Shadow Candidate</span>
                               </div>
                               <div className="space-y-1">
                                  <span className="text-xs font-black text-foreground uppercase">LayoutLMv3-Large-Custom</span>
                                  <span className="text-[9px] text-muted-foreground block">Predicted Gain: +2.4% Accuracy</span>
                                  <span className="text-[9px] text-muted-foreground block">Shadow Flow Traffic: 10% Stream</span>
                               </div>
                            </div>
                         </div>
                      </div>

                      {/* Right: Rollback Version Registry */}
                      <div className="bg-card border border-border/60 p-5 rounded-2xl space-y-4">
                         <span className="text-xs font-black text-foreground uppercase tracking-wider block">Version Rollback Registry</span>
                         <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Rollback immediately in case of unexpected structural drifts.
                         </p>

                         <div className="space-y-2">
                            {[
                              { version: "v1.2.4", label: "Production Active", date: "Today, 08:30 AM", user: "Ratheesh" },
                              { version: "v1.2.3", label: "Stable Baseline", date: "May 15, 2026", user: "Admin" },
                              { version: "v1.2.1", label: "Previous Release", date: "May 10, 2026", user: "System" }
                            ].map((v) => (
                              <div key={v.version} className={cn("p-3 rounded-xl border flex items-center justify-between", selectedVersion === v.version ? "border-primary bg-primary/5" : "border-border/40 bg-muted/10")}>
                                 <div>
                                    <div className="flex items-center gap-1.5">
                                       <span className="text-xs font-black text-foreground uppercase">{v.version}</span>
                                       <span className="text-[8px] font-black text-primary uppercase">{v.label}</span>
                                    </div>
                                    <span className="text-[9px] text-muted-foreground block mt-0.5">{v.date} · {v.user}</span>
                                 </div>
                                 {selectedVersion !== v.version ? (
                                   <button 
                                     onClick={() => setSelectedVersion(v.version)}
                                     className="px-2 py-1 bg-card hover:bg-muted border border-border/40 rounded text-[9px] font-black uppercase text-foreground"
                                   >
                                      Rollback
                                   </button>
                                 ) : (
                                   <Check size={14} className="text-primary shrink-0" />
                                 )}
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* TAB 3: CONFIDENCE ANALYTICS & LEARNING LOOP */}
              {studioTab === "analytics" && (
                <div className="space-y-6">
                   <div>
                      <h3 className="text-base font-black text-foreground uppercase tracking-tight">Active Confidence Engine & Misclassification Center</h3>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase mt-1">Fine-tune classification metrics and re-target human correction patterns.</p>
                   </div>

                   <div className="grid grid-cols-[320px_1fr] gap-6">
                      
                      {/* Left: Confidence Breakdown Metrics */}
                      <div className="bg-card border border-border/60 p-5 rounded-2xl space-y-4">
                         <span className="text-xs font-black text-foreground uppercase tracking-wider block">Active Weight Breakdown</span>
                         <p className="text-[10px] text-muted-foreground leading-relaxed">
                            How classification score calculations are weighted:
                         </p>

                         <div className="space-y-3">
                            {[
                              { label: "Semantic Score Weight", weight: 35, color: "bg-blue-500" },
                              { label: "Visual Score Weight", weight: 25, color: "bg-emerald-500" },
                              { label: "Fast Heuristics Weight", weight: 20, color: "bg-amber-500" },
                              { label: "Historical Accuracy", weight: 15, color: "bg-purple-500" },
                              { label: "Customer Bias Weight", weight: 5, color: "bg-indigo-500" }
                            ].map((w) => (
                              <div key={w.label} className="space-y-1">
                                 <div className="flex items-center justify-between text-[10px]">
                                    <span className="font-bold text-foreground">{w.label}</span>
                                    <span className="font-black text-primary">{w.weight}%</span>
                                 </div>
                                 <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className={cn("h-full rounded-full", w.color)} style={{ width: `${w.weight}%` }} />
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>

                      {/* Right: Misclassification Center */}
                      <div className="bg-muted/10 border border-border/40 p-5 rounded-2xl space-y-4">
                         <span className="text-xs font-black text-foreground uppercase tracking-wider block">Misclassification Registry (Human Loop Corrections)</span>
                         <p className="text-[10px] text-foreground/80 leading-relaxed">
                            Review documents incorrectly predicted by AI that were corrected by human operations. Tap "Reclassify & Train" to sync loop weights.
                         </p>

                         <div className="space-y-2.5">
                            {[
                              { file: "w2-tax-report-2025.pdf", predicted: "W9 Document", corrected: "W2 Tax Form", certainty: "68% Confident", date: "10 mins ago" },
                              { file: "corp-vendor-agreement-v3.tiff", predicted: "General Contract", corrected: "NDA", certainty: "72% Confident", date: "1 hour ago" },
                              { file: "customer-settlement-invoice.pdf", predicted: "Utility Bill", corrected: "Invoice", certainty: "59% Confident", date: "3 hours ago" }
                            ].map((item, idx) => (
                              <div key={idx} className="p-3 bg-card border border-border/80 rounded-xl flex items-center justify-between">
                                 <div>
                                    <span className="text-xs font-bold text-foreground block">{item.file}</span>
                                    <div className="flex items-center gap-2 mt-1">
                                       <span className="text-[9px] text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded font-black uppercase">Predicted: {item.predicted}</span>
                                       <span className="text-[9px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded font-black uppercase">Corrected: {item.corrected}</span>
                                    </div>
                                 </div>
                                 <div className="flex items-center gap-3">
                                    <span className="text-[9px] font-mono text-muted-foreground uppercase">{item.certainty}</span>
                                    <button className="px-3 py-1.5 bg-primary text-primary-foreground hover:bg-primary/95 text-[9px] font-black uppercase rounded-lg shadow-sm">
                                       Reclassify & Train
                                    </button>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* TAB 4: MULTI-PAGE ACTIVE CONTEXT */}
              {studioTab === "context" && (
                <div className="space-y-6">
                   <div>
                      <h3 className="text-base font-black text-foreground uppercase tracking-tight">Multi-Page Active Context Classification</h3>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase mt-1">Ensure multi-page attachments (e.g. prescription + medical bill) are classified together into a single claim bundle.</p>
                   </div>

                   <div className="grid grid-cols-[1fr_340px] gap-6">
                      
                      {/* Left Visual Illustration */}
                      <div className="bg-muted/10 border border-border/40 p-5 rounded-2xl flex flex-col justify-between">
                         <span className="text-xs font-black text-foreground uppercase tracking-wider block">Context Bundling Trace Simulation</span>
                         
                         {/* Multi-page timeline */}
                         <div className="flex items-center justify-around py-8">
                            {/* Page 1 */}
                            <div className="flex flex-col items-center gap-2">
                               <div className="w-14 h-20 bg-card border-2 border-primary rounded-xl flex items-center justify-center shadow-md relative">
                                  <span className="absolute top-1 left-1 text-[8px] font-black text-muted-foreground">P1</span>
                                  <FileText size={24} className="text-primary" />
                               </div>
                               <span className="text-[10px] font-black text-foreground uppercase">Medical Claim Form</span>
                            </div>

                            <ChevronRight size={20} className="text-muted-foreground/60" />

                            {/* Page 2 */}
                            <div className="flex flex-col items-center gap-2">
                               <div className="w-14 h-20 bg-card border-2 border-indigo-500 rounded-xl flex items-center justify-center shadow-md relative">
                                  <span className="absolute top-1 left-1 text-[8px] font-black text-muted-foreground">P2</span>
                                  <FileText size={24} className="text-indigo-500" />
                               </div>
                               <span className="text-[10px] font-black text-foreground uppercase">Prescription</span>
                            </div>

                            <ChevronRight size={20} className="text-muted-foreground/60" />

                            {/* Page 3 */}
                            <div className="flex flex-col items-center gap-2">
                               <div className="w-14 h-20 bg-card border-2 border-emerald-500 rounded-xl flex items-center justify-center shadow-md relative">
                                  <span className="absolute top-1 left-1 text-[8px] font-black text-muted-foreground">P3</span>
                                  <FileText size={24} className="text-emerald-500" />
                               </div>
                               <span className="text-[10px] font-black text-foreground uppercase">Medical Receipt</span>
                            </div>
                         </div>

                         <div className="p-3.5 bg-card border border-border/80 rounded-xl flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                            <span className="text-[10px] font-black text-foreground uppercase">
                               Success: AI classified all 3 pages together as 1 Claims Packet using Continuity Memory!
                            </span>
                         </div>
                      </div>

                      {/* Right Config */}
                      <div className="bg-card border border-border/60 p-5 rounded-2xl space-y-4">
                         <span className="text-xs font-black text-foreground uppercase tracking-wider block">Classification Memory Engine</span>
                         <p className="text-[10px] text-muted-foreground leading-relaxed">
                            Configure how far backward page history context is maintained during single-stream parsing.
                         </p>

                         <div className="space-y-4">
                            <div className="space-y-1">
                               <span className="text-[10px] font-black text-foreground uppercase block">Page Continuity Window</span>
                               <select className="w-full bg-muted/30 border border-border rounded-xl px-3 py-2 text-xs font-bold uppercase">
                                  <option>3 Pages Backwards</option>
                                  <option>5 Pages Backwards (Recommended)</option>
                                  <option>10 Pages Backwards</option>
                               </select>
                            </div>

                            <div className="space-y-1">
                               <span className="text-[10px] font-black text-foreground uppercase block">Historical Tenant Bias memory</span>
                               <div className="flex items-center justify-between p-2.5 bg-muted/20 border border-border/40 rounded-xl">
                                  <span className="text-[10px] text-foreground/80 uppercase">Continuous Learning Sync</span>
                                  <button className="w-8 h-4 rounded-full relative bg-primary">
                                     <div className="absolute top-0.5 right-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm" />
                                  </button>
                               </div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
              )}

              {/* TAB 5: ADAPTIVE ROUTING SIMULATOR */}
              {studioTab === "simulator" && (
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                      <div>
                         <h3 className="text-base font-black text-foreground uppercase tracking-tight">Adaptive Routing Simulator Sandbox</h3>
                         <p className="text-[11px] font-bold text-muted-foreground uppercase mt-1">Select a document package, configure active layers, and simulate routing logic predictions.</p>
                      </div>
                      <button 
                         disabled={isSimulating}
                         onClick={runSimulation}
                         className="h-10 px-6 bg-primary text-primary-foreground hover:bg-primary/95 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                      >
                         {isSimulating ? (
                           <>
                             <RefreshCw size={12} className="animate-spin" />
                             Simulating Route...
                           </>
                         ) : (
                           <>
                             <Play size={12} fill="currentColor" />
                             Run Routing Simulation
                           </>
                         )}
                      </button>
                   </div>

                   <div className="grid grid-cols-[280px_1fr] gap-6">
                      
                      {/* Left: Input Selection */}
                      <div className="bg-card border border-border/60 p-5 rounded-2xl space-y-4">
                         <span className="text-xs font-black text-foreground uppercase tracking-wider block">Simulator Sandbox Setup</span>

                         {/* Document Selection */}
                         <div className="space-y-1.5">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Select Input Package</span>
                            <div className="space-y-2">
                               {[
                                 { id: "claim", label: "Mixed Claims Bundle (3 Sheets)", desc: "Contains prescription + bills" },
                                 { id: "invoice", label: "Corporate Vendor Invoice", desc: "Complex subtotal table grid" },
                                 { id: "id", label: "Government Passport/ID Copy", desc: "Heavy vision geometry required" }
                               ].map((opt) => (
                                 <button
                                   key={opt.id}
                                   onClick={() => setSimDocType(opt.id as any)}
                                   className={cn(
                                     "w-full text-left p-3 rounded-xl border transition-all",
                                     simDocType === opt.id ? "border-primary bg-primary/5" : "border-border/40 hover:bg-muted/10"
                                   )}
                                 >
                                    <span className="text-[11px] font-bold text-foreground block">{opt.label}</span>
                                    <span className="text-[9px] text-muted-foreground block mt-0.5">{opt.desc}</span>
                                 </button>
                               ))}
                            </div>
                         </div>

                         {/* Layer toggles */}
                         <div className="space-y-2 pt-2 border-t border-border/40">
                            <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Enabled Pipeline Layers</span>
                            {Object.keys(simLayers).map((layer) => (
                              <div key={layer} className="flex items-center justify-between p-2 rounded-lg bg-muted/20">
                                 <span className="text-[10px] font-bold text-foreground uppercase">{layer}</span>
                                 <input 
                                   type="checkbox" 
                                   checked={(simLayers as any)[layer]}
                                   onChange={(e) => setSimLayers({ ...simLayers, [layer]: e.target.checked })}
                                   className="rounded border-border text-primary focus:ring-primary/40 h-3.5 w-3.5 cursor-pointer"
                                 />
                              </div>
                            ))}
                         </div>
                      </div>

                      {/* Right: Simulation Output */}
                      <div className="bg-muted/10 border border-border/40 p-6 rounded-2xl flex flex-col justify-between min-h-[360px]">
                         
                         {isSimulating ? (
                           <div className="flex-1 flex flex-col items-center justify-center text-center opacity-65">
                              <BrainCircuit size={48} className="text-primary animate-pulse mb-4" />
                              <span className="text-xs font-black uppercase text-foreground">Executing multi-layer routing predictions...</span>
                              <span className="text-[9px] text-muted-foreground block mt-1">Analyzing OCR semantic LayoutLM & ViT visual templates...</span>
                           </div>
                         ) : simResult ? (
                           <div className="space-y-5 flex-1">
                              {/* Summary Header */}
                              <div className="flex items-center justify-between p-3.5 bg-card border border-border/60 rounded-xl shadow-sm">
                                 <div>
                                    <span className="text-[10px] font-black text-primary uppercase tracking-wider">Classification Success</span>
                                    <h4 className="text-base font-black text-foreground uppercase tracking-tight mt-0.5">{simResult.docClass}</h4>
                                 </div>
                                 <div className="text-right">
                                    <span className="text-[9px] font-bold text-muted-foreground block uppercase">Confidence Engine Score</span>
                                    <span className="text-lg font-black text-emerald-500">{simResult.confidence}%</span>
                                 </div>
                              </div>

                              {/* Confidence Breakdown progress */}
                              <div className="grid grid-cols-4 gap-2">
                                 {Object.entries(simResult.breakdown).map(([k, v]: [string, any]) => (
                                    <div key={k} className="p-2.5 bg-card border border-border/40 rounded-xl text-center shadow-sm">
                                       <span className="text-[9px] font-black text-muted-foreground uppercase block">{k}</span>
                                       <span className="text-xs font-black text-foreground block mt-1">{v}%</span>
                                    </div>
                                 ))}
                              </div>

                              {/* Explainability Logs */}
                              <div className="space-y-1.5">
                                 <span className="text-[9px] font-black text-muted-foreground uppercase tracking-wider block">Explainability Checklist & Trace Logs</span>
                                 <div className="space-y-1.5">
                                    {simResult.explainability.map((log: string, i: number) => (
                                       <div key={i} className="flex items-start gap-2 p-2 bg-card border border-border/40 rounded-xl">
                                          <Check size={12} className="text-emerald-500 shrink-0 mt-0.5" />
                                          <span className="text-xs text-foreground/80 leading-relaxed">{log}</span>
                                       </div>
                                    ))}
                                 </div>
                              </div>

                              {/* Final Routing queue */}
                              <div className="p-3 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between">
                                 <div className="flex items-center gap-2">
                                    <GitMerge size={14} className="text-primary" />
                                    <span className="text-[10px] font-black text-foreground uppercase">Target Routing Destination</span>
                                 </div>
                                 <span className="text-[10px] font-black text-primary uppercase bg-card px-2.5 py-1 rounded border border-primary/30 shadow-inner">
                                    {simResult.routingTarget}
                                 </span>
                              </div>
                           </div>
                         ) : (
                           <div className="flex-1 flex flex-col items-center justify-center text-center opacity-30">
                              <FileSearch size={48} strokeWidth={1} className="mb-4" />
                              <span className="text-xs font-black uppercase text-foreground">Sandbox Idle</span>
                              <span className="text-[9px] text-muted-foreground block mt-1">Configure your mock inputs and click "Run Routing Simulation"</span>
                           </div>
                         )}
                      </div>
                   </div>
                </div>
              )}
           </div>
        </div>
      </div>

      {/* FOOTER & ACCELERATOR */}
      <footer className="mt-4 pt-4 border-t border-border flex items-center justify-between shrink-0">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {trainingDocuments.filter(d => d.classification).length} Document Assets Assigned
               </span>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                  {trainingDocuments.filter(d => !d.classification).length} Unassigned Assets
               </span>
            </div>
         </div>

         <button 
            onClick={() => {
              updateStepStatus(TrainingStage.CLASSIFICATION, "completed");
              setActiveStage(TrainingStage.EXTRACTION);
            }}
            className={cn(
              "h-12 px-10 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 group border border-border shadow-2xl bg-card text-foreground hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            Finalize Classification & Proceed
            <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-primary" />
         </button>
      </footer>
    </div>
  );
}
