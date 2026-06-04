"use client";

import React, { useState, useMemo, useEffect } from "react";
import { 
  Scissors, Merge, Grid2X2, ListFilter, Sparkles, HardDrive, 
  ChevronRight, FileText, AlertTriangle, CheckCircle, 
  MousePointer2, Settings2, FileSearch, X, Fingerprint, 
  BrainCircuit, Crosshair, Plus, Target, Globe, IterationCcw, 
  Binary, Eraser, Layout, Sun, Type, Hash, Rocket, RefreshCw, RotateCw, Layers,
  Clock3, AlertCircle, Check, Maximize2, Stethoscope, ZoomIn, ZoomOut, RotateCcw, HelpCircle, Tag, ChevronDown,
  EyeOff, ArrowLeft, Trash2, Settings
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { useDocumentReader } from "../../store/documentReaderContext";
import { usePipelineStore } from "../../store/studioStore";
import { TrainingStage, SegregationLogicGroup, DocumentClass } from "../../types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { EnterpriseVocabularyModal } from "./EnterpriseVocabularyModal";

// Sub-component for manual orchestration
function ContextMenu({ x, y, options, onClose }: { x: number, y: number, options: { label: string, icon: any, onClick: () => void }[], onClose: () => void }) {
  useEffect(() => {
    const handleGlobalClick = () => onClose();
    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [onClose]);

  return (
    <div 
      className="absolute z-[100] bg-card border border-border rounded-xl shadow-2xl p-1.5 min-w-[220px] animate-in fade-in zoom-in-95 duration-200"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
       <div className="px-3 py-2 border-b border-border/50 mb-1">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Manual Orchestration</span>
       </div>
       {options.map((opt, i) => (
         <button 
           key={i} 
           onClick={() => { opt.onClick(); onClose(); }}
           className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary-10 text-foreground transition-all group"
         >
            <div className="w-6 h-6 rounded-md bg-muted group-hover:bg-primary group-hover:text-white flex items-center justify-center transition-all">
               <opt.icon size={14} />
            </div>
            <span className="text-[10px] font-black uppercase tracking-tight">{opt.label}</span>
         </button>
       ))}
    </div>
  );
}

export default function PageSegregation() {
  const { updateStepStatus, setActiveStage } = useDocumentReader();
  const { 
    trainingDocuments, 
    activeDocument, 
    setActiveDocument,
    activePage,
    setActivePage,
    splitDocument,
    mergeDocuments,
    deletePage,
    runAutoSegregation,
    segregationSettings,
    updateSegregationSettings,
    updateTrainingDocument,
    addLogicGroup,
    updateLogicGroup,
    deleteLogicGroup,
    analyzeGroupDifferentiators,
    groupInsights,
    mapPagesToGroup,
    saveProject,
    promoteInsightToRule,
    selectedPageIds,
    setSelectedPageIds,
    saveState,
    loadState,
    createManualDocument,
    reorderPages,
    movePages,
    executeOCR,
    infrastructure,
    loading,
    documentClasses,
    updateDocumentClass,
    updatePageClass,
    selectedModelId,
    setSelectedModelId,
    addClass
  } = usePipelineStore();



  useEffect(() => {
    if (activeDocument) {
      analyzeGroupDifferentiators(activeDocument.documentId);
    }
  }, [activeDocument?.documentId]);

  useEffect(() => {
    if (documentClasses.length === 0) {
      const defaultClasses: DocumentClass[] = [
        {
          classId: "class-invoice",
          name: "Invoice / Billing Statement",
          description: "Standard vendor invoices, utility bills, and receipts",
          sampleCount: 5,
          minConfidence: 0.85,
          requiredFields: ["invoice_number", "total_amount", "vendor_name"],
          optionalFields: ["tax_amount", "due_date"],
          keywords: ["invoice", "bill", "tax", "total", "amount"],
          anchorPhrases: ["invoice number", "amount due", "subtotal"],
          layoutPatterns: [],
          isActive: true,
          color: "#3b82f6"
        },
        {
          classId: "class-medical-claim",
          name: "Medical Claim Form",
          description: "Health insurance claim forms and benefit receipts",
          sampleCount: 3,
          minConfidence: 0.90,
          requiredFields: ["claim_number", "patient_name", "date_of_service"],
          optionalFields: ["diagnosis_code", "provider_id"],
          keywords: ["medical", "claim", "patient", "treatment", "health"],
          anchorPhrases: ["claim number", "patient name", "date of service"],
          layoutPatterns: [],
          isActive: true,
          color: "#10b981"
        },
        {
          classId: "class-passport",
          name: "Government ID / Passport",
          description: "Passports, driver's licenses, and state identification cards",
          sampleCount: 2,
          minConfidence: 0.95,
          requiredFields: ["document_number", "full_name", "expiry_date"],
          optionalFields: ["place_of_birth", "nationality"],
          keywords: ["passport", "license", "identity", "nationality", "authority"],
          anchorPhrases: ["document no", "passport no", "date of birth"],
          layoutPatterns: [],
          isActive: true,
          color: "#8b5cf6"
        },
        {
          classId: "class-tax-form",
          name: "Tax Form 1040",
          description: "Individual income tax return forms",
          sampleCount: 4,
          minConfidence: 0.88,
          requiredFields: ["ssn", "filing_status", "total_income"],
          optionalFields: ["refund_amount", "dependents"],
          keywords: ["tax", "1040", "income", "internal revenue", "treasury"],
          anchorPhrases: ["form 1040", "social security number", "adjusted gross income"],
          layoutPatterns: [],
          isActive: true,
          color: "#f59e0b"
        }
      ];
      defaultClasses.forEach(cls => addClass(cls));
    }
  }, [documentClasses.length, addClass]);

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [designerTab, setDesignerTab] = useState<"grouping" | "classification">("grouping");
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleType, setNewRuleType] = useState<"header" | "footer" | "keyword" | "pageCount">("header");
  const [newRulePattern, setNewRulePattern] = useState("");
  const [newRuleOperator, setNewRuleOperator] = useState<"AND" | "OR">("OR");
  const [newRuleConfidence, setNewRuleConfidence] = useState(0.8);
  const [newRuleColor, setNewRuleColor] = useState("#3b82f6");
  const [isProcessing, setIsProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number } | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);
  const [openPageMenu, setOpenPageMenu] = useState<string | null>(null);
  const [showVocabularyModal, setShowVocabularyModal] = useState(false);
  const [showNewClassPrompt, setShowNewClassPrompt] = useState(false);
  const [newClassNameInput, setNewClassNameInput] = useState("");
  
  const [newGroupName, setNewGroupName] = useState<string>("");
  const [workbenchZoom, setWorkbenchZoom] = useState<number>(1);
  const [workbenchRotate, setWorkbenchRotate] = useState<number>(0);
  const [draggedPageIndex, setDraggedPageIndex] = useState<number | null>(null);

  const [showMasterGallery, setShowMasterGallery] = useState(false);
  
  // Enterprise UI Custom Split Logic redesign states
  const [isAdvancedMode, setIsAdvancedMode] = useState<boolean>(false);
  const [ruleExecutionOrder, setRuleExecutionOrder] = useState<string[]>([
    "Document Header Detection",
    "Footer Boundary Detection",
    "OCR Text Matching (Keywords)",
    "Fixed Document Length",
    "AI Semantic Matching"
  ]);
  const [testResults, setTestResults] = useState<{
    boundaries: number;
    grouped: number;
    uncertain: number;
    lastTested: string;
    showResults: boolean;
    testing: boolean;
  }>({
    boundaries: 12,
    grouped: 3,
    uncertain: 2,
    lastTested: "2 mins ago",
    showResults: true,
    testing: false
  });
  const [selectedAppliesTo, setSelectedAppliesTo] = useState<string>("Medical Claims");
  const [ruleVersion, setRuleVersion] = useState<string>("1.2");
  const [fallbackAction, setFallbackAction] = useState<"review" | "keep">("review");
  const [ocrRegion, setOcrRegion] = useState<string>("top10");
  const [activeMatchStrategy, setActiveMatchStrategy] = useState<"all" | "any" | "weighted">("weighted");
  const [patternWeights, setPatternWeights] = useState<Record<string, "High" | "Medium" | "Low">>({
    "Medical Claim Form": "High",
    "Extended Health Benefits": "Medium",
    "Claim Submission": "Medium",
    "Page 1 of": "High",
    "Authorized Signature": "Medium",
    "Confidential": "Low",
    "Claim Number": "High",
    "Patient Name": "Medium",
    "Date of Service": "Medium"
  });

  
  const allPages = useMemo(() => {
    return trainingDocuments.flatMap(doc => doc.pages.map(p => ({ ...p, parentDocName: doc.name, parentDocId: doc.documentId })));
  }, [trainingDocuments]);

  const unclassifiedDocs = useMemo(() => {
    return trainingDocuments.filter(doc => !doc.classification?.classId);
  }, [trainingDocuments]);
  const hasUnclassifiedDocs = unclassifiedDocs.length > 0;

  const togglePageSelection = (pageId: string, multi: boolean) => {
    if (multi) {
      const newIds = selectedPageIds.includes(pageId) 
        ? selectedPageIds.filter(id => id !== pageId) 
        : [...selectedPageIds, pageId];
      setSelectedPageIds(newIds);
    } else {
      setSelectedPageIds([pageId]);
      const p = (showMasterGallery ? allPages : activeDocument?.pages)?.find(p => p.pageId === pageId);
      if (p) setActivePage(p);
    }
  };

  const handleSelectDocument = (doc: any) => {
    setShowMasterGallery(false);
    setActiveDocument(doc);
    setActivePage(undefined); 
    setSelectedPageIds([]);
  };

  const handleToggleMasterGallery = () => {
    setShowMasterGallery(true);
    setActiveDocument(undefined);
    setActivePage(undefined);
    setSelectedPageIds([]);
  };

  const handleRegroup = () => {
    if (selectedPageIds.length === 0) return;
    const name = prompt("Enter a name for this manual group:", `Manual Bundle ${trainingDocuments.length + 1}`);
    if (name !== null) {
      createManualDocument(selectedPageIds, name || "Manual Document Bundle");
      setSelectedPageIds([]);
    }
  };

  const handleBatchUnclassified = () => {
    if (selectedPageIds.length === 0) return;
    createManualDocument(selectedPageIds, "Unclassified Document");
    setSelectedPageIds([]);
  };
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);

  const handleAutoSegregate = () => {
    setIsProcessing(true);
    runAutoSegregation();
    setTimeout(() => setIsProcessing(false), 2000);
  };

  const handleMovePage = (pageId: string, direction: "left" | "right") => {
    if (!activeDocument) return;
    const currentIdx = activeDocument.pages.findIndex(p => p.pageId === pageId);
    const newPages = [...activeDocument.pages];
    const targetIdx = direction === "left" ? currentIdx - 1 : currentIdx + 1;
    
    if (targetIdx >= 0 && targetIdx < newPages.length) {
      const temp = newPages[currentIdx];
      newPages[currentIdx] = newPages[targetIdx];
      newPages[targetIdx] = temp;
      reorderPages(activeDocument.documentId, newPages.map(p => p.pageId));
    }
  };

  const handleDropReorder = (dragIndex: number, hoverIndex: number) => {
    if (!activeDocument || dragIndex === hoverIndex) return;
    const ids = activeDocument.pages.map(p => p.pageId);
    const newIds = [...ids];
    const draggedItem = newIds[dragIndex];
    newIds.splice(dragIndex, 1);
    newIds.splice(hoverIndex, 0, draggedItem);
    reorderPages(activeDocument.documentId, newIds);
  };

  const handleSplitAtPage = (idx: number) => {
    if (!activeDocument) return;
    splitDocument(activeDocument.documentId, idx);
  };

  const handleRunAutoClassification = () => {
    setIsProcessing(true);
    const activeModel = infrastructure.offlineModels.find(m => m.id === selectedModelId) || infrastructure.offlineModels[0];
    const primaryEngine = infrastructure.engines.find(e => e.id === activeModel?.engineId) || { name: "Surya OCR Layout Engine" };
    
    setTimeout(() => {
      trainingDocuments.forEach((doc, idx) => {
        const targetClass = documentClasses[idx % documentClasses.length] || documentClasses[0];
        if (targetClass) {
          updateDocumentClass(
            doc.documentId, 
            targetClass.classId, 
            "system", 
            activeModel?.name || "LayoutLM-v3 Base", 
            primaryEngine.name || "Surya OCR Layout Engine"
          );
        }
      });
      setIsProcessing(false);
      toast.success(`Auto-Classification complete! Mapped ${trainingDocuments.length} document clusters using ${activeModel?.name || "LayoutLM-v3 Base"}!`);
    }, 1200);
  };

  const handleMoveToExistingGroup = (targetDocId: string) => {
    if (!activeDocument || selectedPageIds.length === 0) return;
    movePages(activeDocument.documentId, targetDocId as any, selectedPageIds);
    setSelectedPageIds([]);
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return "bg-emerald-500";
    if (score >= 0.5) return "bg-amber-500";
    return "bg-rose-500";
  };

  const avgConfidence = useMemo(() => {
    if (!activeDocument) return 0;
    return (activeDocument.pages.reduce((acc, p) => acc + (p.confidence || 0), 0) / activeDocument.pages.length);
  }, [activeDocument]);

  const handleUpdateLayerProps = (section: keyof typeof segregationSettings, props: any) => {
     const current = segregationSettings[section] as any;
     updateSegregationSettings({
        [section]: { ...current, ...props }
     });
  };

  const handleCreateLogicGroup = () => {
    if (!newGroupName.trim()) return;
    const group: SegregationLogicGroup = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGroupName,
      enabled: true,
      headerPatterns: [],
      headerEnabled: true,
      footerPatterns: [],
      footerEnabled: true,
      keywords: [],
      keywordEnabled: true,
      barcodePatterns: [],
      pageRange: { start: 1, end: 1 },
      pageCountEnabled: false,
      operator: "AND",
      confidenceThreshold: 0.8,
      color: `#${Math.floor(Math.random()*16777215).toString(16)}`
    };
    addLogicGroup(group);
    setNewGroupName("");
    setExpandedGroupId(group.id);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (selectedPageIds.length > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      setContextMenu({ 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
      });
    }
  };

  return (
    <React.Fragment>
      <div className="w-full h-full flex flex-col gap-0 animate-in fade-in duration-700 overflow-hidden bg-background">
      <div className="h-16 border-b border-border px-6 flex items-center justify-between shrink-0 bg-card-50 backdrop-blur-xl z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
            <Scissors size={20} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-foreground">Segregation Designer</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-foreground/90 uppercase tracking-widest opacity-60">Rule-Based Intelligence Engine Active</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {selectedDocIds.length >= 2 && (
            <button 
              onClick={() => { mergeDocuments(selectedDocIds); setSelectedDocIds([]); }}
              className="h-9 px-4 rounded-lg bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
            >
              <Merge size={14} />
              Merge Selected ({selectedDocIds.length})
            </button>
          )}
          
          <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/50 mr-2">
             <button onClick={() => setViewMode("grid")} className={cn("p-1.5 rounded-md transition-all", viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}><Grid2X2 size={14}/></button>
             <button onClick={() => setViewMode("list")} className={cn("p-1.5 rounded-md transition-all", viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground")}><ListFilter size={14}/></button>
          </div>
          
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-[260px] border-r border-border bg-card flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-4 border-b border-border/40 bg-muted/20">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.25em] opacity-80">Document Bundles</span>
              <button 
                onClick={handleToggleMasterGallery}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all flex items-center gap-2",
                  showMasterGallery ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-background border border-border text-muted-foreground hover:border-primary/40"
                )}
              >
                <Grid2X2 size={12} />
                All Pages View
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-4">
               <div className="p-4 rounded-2xl bg-background border border-border/50 shadow-sm">
                  <span className="text-[8px] font-black text-muted-foreground uppercase block opacity-50 mb-1">Total Pages</span>
                  <span className="text-xl font-black text-foreground tabular-nums">{trainingDocuments.reduce((acc, doc) => acc + doc.pages.length, 0)}</span>
               </div>
               <div className="p-4 rounded-2xl bg-background border border-border/50 shadow-sm">
                  <span className="text-[8px] font-black text-muted-foreground uppercase block opacity-50 mb-1">Needs Review</span>
                  <span className="text-xl font-black text-rose-500 tabular-nums">{trainingDocuments.filter(d => d.unclassifiedSegment).length}</span>
               </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 pb-6">
            {trainingDocuments.map((doc) => (
              <div 
                key={doc.documentId}
                onClick={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    setSelectedDocIds(prev => prev.includes(doc.documentId) ? prev.filter(id => id !== doc.documentId) : [...prev, doc.documentId]);
                  } else {
                    handleSelectDocument(doc);
                  }
                }}
                className={cn(
                  "p-3 rounded-xl border transition-all cursor-pointer group relative overflow-hidden",
                  activeDocument?.documentId === doc.documentId 
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/5 ring-1 ring-primary/20" 
                    : selectedDocIds.includes(doc.documentId)
                      ? "border-amber-500 bg-amber-500/5"
                      : "border-border/50 hover:border-primary/30 bg-muted/10"
                )}
              >
                {doc.unclassifiedSegment && (
                  <div className="absolute top-0 right-0 p-1">
                    <AlertTriangle size={12} className="text-rose-500" />
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]",
                      doc.unclassifiedSegment ? "bg-rose-500" : "bg-emerald-500"
                    )} />
                     <input 
                      value={doc.unclassifiedSegment ? "Unclassified Cluster" : (doc.name || "Untitled Cluster")}
                      onChange={(e) => {
                        e.stopPropagation();
                        updateTrainingDocument(doc.documentId, { name: e.target.value });
                      }}
                      onFocus={(e) => e.currentTarget.select()}
                      onClick={(e) => e.stopPropagation()}
                      disabled={!!doc.unclassifiedSegment}
                      className="bg-transparent border-none focus:ring-0 text-[11px] font-black text-foreground uppercase tracking-tight w-full outline-none p-0 h-auto cursor-text transition-all"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {doc.metadata?.enterpriseAnalysis && (
                       <div className={cn(
                          "px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tabular-nums border flex items-center gap-1",
                          doc.metadata.enterpriseAnalysis.confidence.status === "HIGH" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                          doc.metadata.enterpriseAnalysis.confidence.status === "MEDIUM" ? "bg-amber-500/10 text-amber-600 border-amber-500/20" :
                          "bg-rose-500/10 text-rose-500 border-rose-500/20"
                       )}>
                          <BrainCircuit size={10} />
                          {Math.round(doc.metadata.enterpriseAnalysis.confidence.overall * 100)}%
                       </div>
                    )}
                    <span className="text-[11px] font-bold text-foreground/90 uppercase tabular-nums">{doc.pages.length} Pages</span>
                  </div>
                </div>

                {doc.classification && (
                  <div className="mb-3 p-2 bg-background/50 border border-border/20 rounded-lg flex items-center justify-between text-[8px] font-black uppercase tracking-wider text-muted-foreground">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {doc.classification.method === "manual" ? (
                        <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 shrink-0">
                          <MousePointer2 size={8} />
                          Manual
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-600 border border-violet-500/20 flex items-center gap-1 shrink-0 animate-pulse">
                          <BrainCircuit size={8} />
                          System
                        </span>
                      )}
                      <span className="opacity-80 truncate">
                        Type: <strong className="text-foreground">{doc.classification.className}</strong>
                      </span>
                    </div>
                    {doc.classification.method === "system" && (
                      <span className="text-[7px] font-bold text-muted-foreground/80 lowercase truncate max-w-[120px] shrink-0" title={`Model: ${doc.classification.modelName || "N/A"}\nOCR: ${doc.classification.ocrEngineName || "N/A"}`}>
                        {doc.classification.modelName || "AI"} ({doc.classification.ocrEngineName || "Layout"})
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-4 gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                  {doc.pages.slice(0, 4).map((p, pIdx) => (
                    <div key={pIdx} className="aspect-[3/4] rounded-lg bg-muted overflow-hidden relative border border-border/30">
                      <img src={p.imageUrl} className="w-full h-full object-cover grayscale opacity-40 group-hover:opacity-70 transition-all" />
                      <div className={cn("absolute bottom-0 left-0 right-0 h-1", getConfidenceColor(p.confidence || 0))} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 bg-muted/10 relative" onContextMenu={handleContextMenu}>
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, var(--primary) 1px, transparent 1px)", backgroundSize: "32px 32px" }}></div>
          
          {contextMenu && (
            <ContextMenu 
              x={contextMenu.x} 
              y={contextMenu.y} 
              onClose={() => setContextMenu(null)}
              options={[
                {
                  label: "Create Manual Group",
                  icon: Fingerprint,
                  onClick: () => {
                    const name = prompt("Enter a name for this manual group:", "Manual Document Bundle");
                    if (name) {
                      createManualDocument(selectedPageIds, name);
                    }
                  }
                },
                ...(selectedPageIds.length >= 2 ? [
                  {
                    label: `Merge Selected Pages (${selectedPageIds.length})`,
                    icon: Merge,
                    onClick: () => {
                      const name = prompt("Enter a name for the merged document bundle:", "Merged Document Bundle");
                      if (name) {
                        createManualDocument(selectedPageIds, name);
                        setSelectedPageIds([]);
                        toast.success("Selected pages successfully merged");
                      }
                    }
                  }
                ] : []),
                ...segregationSettings.logicGroups.map(group => ({
                  label: `Move to ${group.name}`,
                  icon: Target,
                  onClick: () => mapPagesToGroup(selectedPageIds, group.id)
                })),
                {
                  label: "Move to Unclassified",
                  icon: AlertTriangle,
                  onClick: () => createManualDocument(selectedPageIds, "Unclassified Document")
                },
                {
                  label: "Review Document (Zoom)",
                  icon: FileSearch,
                  onClick: () => {
                    const page = activeDocument?.pages.find(p => selectedPageIds.includes(p.pageId));
                    if (page) {
                      setActivePage(page);
                    }
                  }
                }
              ]}
            />
          )}
          
          <div className="flex-1 flex flex-col overflow-hidden p-6 min-h-0">
            {(activeDocument || showMasterGallery) ? (
              <div className="w-full flex-1 flex flex-col space-y-4 min-h-0">
                  <div className="flex items-center justify-between mb-6 bg-card border border-border/40 p-5 rounded-2xl shadow-sm backdrop-blur-md relative overflow-hidden group/header">
                    <AnimatePresence>
                      {selectedPageIds.length > 0 ? (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          exit={{ opacity: 0, y: -20 }}
                          className="absolute inset-0 bg-primary/5 backdrop-blur-md z-10 flex items-center px-8 gap-6 border-b-2 border-primary/20"
                        >
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/30">
                                 <Grid2X2 size={20} strokeWidth={2.5} />
                              </div>
                              <div>
                                 <span className="text-[12px] font-black text-primary uppercase tracking-tight block">{selectedPageIds.length} Assets Selected</span>
                                 <span className="text-[8px] font-bold text-primary/60 uppercase tracking-widest">Awaiting Manual Orchestration</span>
                              </div>
                           </div>
                           
                           <div className="flex-1 flex items-center gap-2">
                              <button 
                                onClick={handleRegroup}
                                className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 relative z-20"
                              >
                                 <Plus size={14} strokeWidth={3} />
                                 Regroup to New Document
                              </button>
                              <button 
                                onClick={handleBatchUnclassified}
                                className="h-10 px-5 rounded-xl bg-background border border-border text-muted-foreground text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all flex items-center gap-2"
                              >
                                 <EyeOff size={14} />
                                 Mark as Unclassified
                              </button>
                              <div className="w-px h-6 bg-primary/10 mx-2" />
                              <button 
                                onClick={() => setSelectedPageIds([])}
                                className="text-[10px] font-black text-muted-foreground uppercase hover:text-rose-500 transition-all flex items-center gap-2"
                              >
                                 <X size={14} />
                                 Cancel
                              </button>

                              <div className="flex-1" />

                              <div className="flex items-center gap-2">
                                 <span className="text-[11px] font-bold text-foreground/90 uppercase mr-2">Target Group:</span>
                                 <select 
                                   className="bg-background border border-border/50 rounded-lg px-3 py-1.5 text-[9px] font-black uppercase outline-none focus:border-primary/50 shadow-sm"
                                   onChange={(e) => {
                                     if (e.target.value) handleMoveToExistingGroup(e.target.value);
                                   }}
                                   value=""
                                 >
                                   <option value="" disabled>Select Group...</option>
                                   {trainingDocuments.filter(d => d.documentId !== activeDocument?.documentId).map(doc => (
                                     <option key={doc.documentId} value={doc.documentId}>{doc.name || "Untitled Group"}</option>
                                   ))}
                                 </select>
                              </div>
                           </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                     <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
                           {showMasterGallery ? <Grid2X2 size={24} strokeWidth={2.5} /> : <Layout size={24} strokeWidth={2.5} />}
                        </div>
                        <div>
                           <h3 className="text-lg font-black text-foreground uppercase tracking-tight leading-none">
                             {showMasterGallery ? "All Pages Overview" : activeDocument?.unclassifiedSegment ? "Document Review Panel" : "Document Workbench"}
                           </h3>
                           <div className="flex items-center gap-2 mt-1.5">
                             <span className="text-xs font-black text-primary uppercase tracking-[0.15em]">
                               {showMasterGallery ? `${allPages.length} TOTAL PAGES` : activeDocument?.metadata?.splitMethod || "Automatic Split"}
                             </span>
                             <div className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                             <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
                               {showMasterGallery ? "Reviewing all pages across all bundles" : "Reviewing page boundaries and structural integrity"}
                             </p>
                           </div>
                        </div>
                    </div>
                    
                     <div className="flex items-center gap-3">
                        <div className="px-4 py-2 rounded-xl bg-muted/30 border border-border/50 flex items-center gap-4">
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Cluster Health</span>
                              <div className="flex items-center gap-2">
                                 <div className={cn("w-2 h-2 rounded-full", getConfidenceColor(avgConfidence))} />
                                 <span className="text-[12px] font-black text-foreground tabular-nums">{Math.round(avgConfidence * 100)}% Match</span>
                              </div>
                           </div>
                           <div className="w-px h-8 bg-border/60" />
                           <div className="flex flex-col items-end">
                              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest opacity-50">Assets</span>
                              <span className="text-[12px] font-black text-primary uppercase">{activeDocument?.pages.length || 0} Pages</span>
                           </div>
                        </div>
                     </div>
                  </div>

                 {(!showMasterGallery && activePage) ? (
                   <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col flex-1 min-h-0">
                      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/20">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center">
                               <FileSearch size={16} />
                            </div>
                            <div>
                               <span className="text-xs font-bold text-foreground uppercase tracking-widest">Document Workbench</span>
                               <p className="text-[10px] font-black text-muted-foreground/80 uppercase">Reviewing Page {(activeDocument?.pages.findIndex(p => p.pageId === activePage.pageId) ?? -1) + 1} Metadata</p>
                            </div>
                         </div>
                         
                         <div className="flex items-center gap-2">
                              <div className="flex items-center gap-2 mr-4 border-r border-border/40 pr-4">
                                 <button 
                                   disabled={!activeDocument || !activePage || activeDocument.pages.findIndex(p => p.pageId === activePage.pageId) <= 0}
                                   onClick={() => {
                                      if (!activeDocument || !activePage) return;
                                      const currentIndex = activeDocument.pages.findIndex(p => p.pageId === activePage.pageId);
                                      if (currentIndex > 0) setActivePage(activeDocument.pages[currentIndex - 1]);
                                   }}
                                   className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 transition-all shadow-sm"
                                   title="Previous Page"
                                 >
                                    <ChevronRight size={16} className="rotate-180" />
                                 </button>
                                 
                                 <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg border border-border/50">
                                    <span className="text-xs font-bold text-foreground tabular-nums">
                                       {(activeDocument?.pages.findIndex(p => p.pageId === activePage?.pageId) ?? -1) + 1}
                                    </span>
                                    <span className="text-[11px] font-bold text-foreground/90 uppercase opacity-40">/</span>
                                    <span className="text-xs font-bold text-foreground tabular-nums">
                                       {activeDocument?.pages.length || 0}
                                    </span>
                                 </div>

                                 <button 
                                   disabled={!activeDocument || !activePage || activeDocument.pages.findIndex(p => p.pageId === activePage.pageId) >= activeDocument.pages.length - 1}
                                   onClick={() => {
                                      if (!activeDocument || !activePage) return;
                                      const currentIndex = activeDocument.pages.findIndex(p => p.pageId === activePage.pageId);
                                      if (currentIndex < activeDocument.pages.length - 1) setActivePage(activeDocument.pages[currentIndex + 1]);
                                   }}
                                   className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary disabled:opacity-30 transition-all shadow-sm"
                                   title="Next Page"
                                 >
                                    <ChevronRight size={16} />
                                 </button>
                              </div>

                              <div className="flex items-center bg-background border border-border/50 rounded-xl p-1 mr-4 shadow-inner">
                                <button 
                                  onClick={() => setWorkbenchZoom(prev => Math.max(0.5, prev - 0.1))}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all"
                                  title="Zoom Out"
                                >
                                   <ZoomOut size={14} />
                                </button>
                                <div className="px-2 min-w-[40px] text-center">
                                   <span className="text-[9px] font-black text-primary uppercase">{Math.round(workbenchZoom * 100)}%</span>
                                </div>
                                <button 
                                  onClick={() => setWorkbenchZoom(prev => Math.min(3, prev + 0.1))}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all"
                                  title="Zoom In"
                                >
                                   <ZoomIn size={14} />
                                </button>
                                
                                <button 
                                  onClick={() => setWorkbenchRotate(prev => (prev + 90) % 360)}
                                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-all ml-2"
                                  title="Rotate"
                                >
                                   <RotateCcw size={14} />
                                </button>
                             </div>

                             <button 
                               onClick={() => {
                                 setActivePage(undefined);
                                 setWorkbenchZoom(1);
                                 setWorkbenchRotate(0);
                               }} 
                               className="p-2 rounded-lg hover:bg-rose-500/10 text-muted-foreground hover:text-rose-500 transition-all"
                             >
                            <X size={16} />
                         </button>
                      </div>
                    </div>
                    <div className="flex flex-1 min-h-0">
                        <div className="flex-1 bg-muted/50 flex items-center justify-center border-r border-border relative overflow-auto custom-scrollbar group p-8">
                           <div 
                             className="transition-all duration-300 ease-out flex items-center justify-center min-w-full min-h-full"
                             style={{ 
                               transform: `scale(${workbenchZoom}) rotate(${workbenchRotate}deg)`,
                               transformOrigin: "center center"
                             }}
                           >
                              <img 
                                src={activePage.imageUrl} 
                                className="max-h-full max-w-full object-contain rounded shadow-2xl shadow-black/20" 
                              />
                           </div>
                           
                           <div className="absolute bottom-6 right-6 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                              <button 
                                onClick={() => setZoomImage(activePage.imageUrl)}
                                className="w-10 h-10 rounded-full bg-background shadow-xl flex items-center justify-center text-primary hover:scale-110 transition-all"
                                title="Fullscreen Preview"
                              >
                                 <Maximize2 size={18} />
                              </button>
                              <button 
                                onClick={() => { setWorkbenchZoom(1); setWorkbenchRotate(0); }}
                                className="w-10 h-10 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:scale-110 transition-all"
                                title="Reset View"
                              >
                                 <RotateCw size={16} />
                              </button>
                           </div>
                        </div>
                       <div className="w-[400px] flex flex-col bg-card">
                          <div className="p-4 border-b border-border bg-muted/10">
                             <span className="text-[11px] font-bold text-foreground/90 uppercase tracking-widest">Extracted Text</span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar text-[11px] font-mono leading-relaxed text-foreground/80 selection:bg-primary/20">
                             {activePage.ocrText || "Processing OCR stream..."}
                          </div>
                          <div className="p-4 bg-muted/20 border-t border-border grid grid-cols-2 gap-3">
                             <div className="p-2 rounded-lg border border-border bg-background text-center">
                                <span className="text-[8px] font-black text-muted-foreground uppercase block mb-1">OCR Precision</span>
                                <span className="text-[11px] font-black text-emerald-500">{(activePage.confidence * 100).toFixed(2)}%</span>
                             </div>
                             <div className="p-2 rounded-lg border border-border bg-background text-center">
                                <span className="text-[8px] font-black text-muted-foreground uppercase block mb-1">Classification</span>
                                <span className="text-[11px] font-black text-primary uppercase">{activePage.semanticDocumentType || "General"}</span>
                             </div>
                          </div>
                       </div>
                    </div>
                 </div>
                  ) : (
                     <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-6 relative min-h-0">
                        {isProcessing && (
                          <React.Fragment>
                            <style>{`
                              @keyframes scan {
                                0% { top: 0%; opacity: 0; }
                                10% { opacity: 1; }
                                90% { opacity: 1; }
                                100% { top: 100%; opacity: 0; }
                              }
                              @keyframes progress-bar {
                                0% { width: 0%; }
                                100% { width: 100%; }
                              }
                            `}</style>
                            <div className="absolute inset-0 bg-background/50 backdrop-blur-[3px] z-[50] flex flex-col items-center justify-center pointer-events-none rounded-3xl overflow-hidden">
                              <div className="absolute inset-0 overflow-hidden">
                                <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_var(--primary)] absolute top-0" style={{ animation: "scan 2s ease-in-out infinite" }} />
                                <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle, var(--primary) 1.5px, transparent 1.5px)", backgroundSize: "32px 32px" }}></div>
                              </div>
                              
                              <div className="p-8 bg-card/95 border border-border rounded-3xl shadow-2xl flex flex-col items-center gap-4 text-center max-w-sm relative z-50 pointer-events-auto border-primary/20 backdrop-blur-md animate-in zoom-in-95 duration-300">
                                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border border-primary/30 relative">
                                  <Sparkles size={28} className="text-primary animate-spin" style={{ animationDuration: "3s" }} />
                                  <div className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                                </div>
                                <div>
                                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground">AI Auto-Classification Active</h4>
                                  <p className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight mt-1 leading-normal">
                                    Extracting structural layout fingerprints and resolving vocabulary mapping...
                                  </p>
                                </div>
                                
                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                  <div className="bg-primary h-1.5 rounded-full" style={{ animation: "progress-bar 1.2s linear infinite" }} />
                                </div>

                                <span className="text-[8px] font-black tracking-widest text-primary/70 uppercase">
                                  Surya Layout-XL Neural Network Running
                                </span>
                              </div>
                            </div>
                          </React.Fragment>
                        )}
                        
                        <div className={cn(
                          "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 transition-all duration-700",
                          isProcessing ? "opacity-40 scale-[0.98] blur-[1px]" : ""
                        )}>
                      {(showMasterGallery ? allPages : activeDocument?.pages || []).map((page, idx) => (
                     <div key={page.pageId} className="group relative">
                        <div className={cn(
                           "absolute top-2 right-2 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center z-30 shadow-md",
                           getConfidenceColor(page.confidence || 0)
                        )}>
                           {(page.confidence || 0) >= 0.8 ? <CheckCircle size={10} className="text-white" /> : <AlertTriangle size={10} className="text-white" />}
                        </div>

                        {showMasterGallery && (
                          <div className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded bg-foreground/10 text-[6px] font-black text-muted-foreground uppercase z-30 backdrop-blur-md border border-white/20">
                            {(page as any).parentDocName}
                          </div>
                        )}

                        {(!page.analysis || page.metadata?.isNew) && (
                           <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-emerald-500 text-[8px] font-black text-white uppercase z-30 shadow-lg border border-white/20 animate-pulse">
                              New
                           </div>
                        )}

                      <div 
                        draggable={!showMasterGallery}
                        onDragStart={() => setDraggedPageIndex(idx)}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.add("ring-2", "ring-primary/50", "scale-105");
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove("ring-2", "ring-primary/50", "scale-105");
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.currentTarget.classList.remove("ring-2", "ring-primary/50", "scale-105");
                          if (draggedPageIndex !== null) {
                            handleDropReorder(draggedPageIndex, idx);
                            setDraggedPageIndex(null);
                          }
                        }}
                        className="group relative"
                      >
                        <div 
                         onClick={(e) => togglePageSelection(page.pageId, e.shiftKey || e.metaKey || e.ctrlKey)}
                         className={cn(
                           "aspect-[3/4] rounded-2xl bg-card border relative overflow-hidden transition-all duration-500 cursor-pointer shadow-sm group-hover:shadow-xl group-hover:shadow-primary/5 group-hover:translate-y-[-4px]",
                           (activePage as any)?.pageId === page.pageId ? "border-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background" : "border-border/40",
                           selectedPageIds.includes(page.pageId) ? "border-primary ring-2 ring-primary bg-primary/5" : ""
                         )}
                       >
                          <img 
                            src={page.imageUrl} 
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                          />
                          <div className={cn("absolute inset-0 transition-opacity duration-500", selectedPageIds.includes(page.pageId) ? "bg-primary/20 opacity-100" : "bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100")} />
                          
                          <div className="absolute top-1/2 -translate-y-1/2 right-3 flex flex-col gap-1.5 z-40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleMovePage(page.pageId, "left");
                               }}
                               className="w-7 h-7 rounded-lg bg-background/95 backdrop-blur-md text-foreground flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-all disabled:opacity-30"
                               disabled={idx === 0 || !activeDocument}
                             >
                                <ChevronRight size={14} className="rotate-180" />
                             </button>
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 handleMovePage(page.pageId, "right");
                               }}
                               className="w-7 h-7 rounded-lg bg-background/95 backdrop-blur-md text-foreground flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-all disabled:opacity-30"
                               disabled={!activeDocument || idx === activeDocument.pages.length - 1}
                             >
                                <ChevronRight size={14} />
                             </button>
                             {idx > 0 && !showMasterGallery && (
                               <button 
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   handleSplitAtPage(idx);
                                 }}
                                 className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg hover:bg-rose-600 transition-all"
                                 title="Split Document Here"
                               >
                                  <Scissors size={14} />
                               </button>
                             )}
                          </div>

                          <div className="absolute top-3 left-3 flex items-center gap-2 z-40 opacity-0 group-hover:opacity-100 transition-all duration-300">
                             <button 
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setActivePage(page);
                                 setZoomImage(page.imageUrl);
                               }}
                               className="w-8 h-8 rounded-xl bg-background/90 backdrop-blur-md text-foreground flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-all scale-90 hover:scale-110"
                             >
                                <Maximize2 size={14} strokeWidth={2.5} />
                             </button>
                          </div>

                          {selectedPageIds.includes(page.pageId) && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-primary/10 gap-4">
                               <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-2xl scale-110 animate-in zoom-in-50 duration-300">
                                  <Check size={24} strokeWidth={4} />
                               </div>
                               <div className="flex gap-1.5 animate-in slide-in-from-bottom-2 duration-500">
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!activeDocument) return;
                                      const ids = activeDocument.pages.map(p => p.pageId);
                                      if (idx > 0) {
                                        const newIds = [...ids];
                                        [newIds[idx-1], newIds[idx]] = [newIds[idx], newIds[idx-1]];
                                        reorderPages(activeDocument.documentId, newIds);
                                      }
                                    }}
                                    className="w-8 h-8 rounded-lg bg-card border border-border text-foreground shadow-lg flex items-center justify-center hover:scale-110 hover:bg-muted transition-all disabled:opacity-30"
                                    disabled={idx === 0}
                                  >
                                     <ArrowLeft size={14} strokeWidth={3} className="rotate-90" />
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!activeDocument) return;
                                      const ids = activeDocument.pages.map(p => p.pageId);
                                      if (idx < ids.length - 1) {
                                        const newIds = [...ids];
                                        [newIds[idx], newIds[idx+1]] = [newIds[idx+1], newIds[idx]];
                                        reorderPages(activeDocument.documentId, newIds);
                                      }
                                    }}
                                    className="w-8 h-8 rounded-lg bg-card border border-border text-foreground shadow-lg flex items-center justify-center hover:scale-110 hover:bg-muted transition-all disabled:opacity-30"
                                    disabled={!activeDocument || idx === activeDocument.pages.length - 1}
                                  >
                                     <ArrowLeft size={14} strokeWidth={3} className="-rotate-90" />
                                  </button>
                               </div>
                            </div>
                          )}

                          <div className="absolute bottom-3 left-3 right-3 z-20 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                             <div className="bg-black/40 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-xl flex items-center justify-between">
                                <span className="text-[10px] font-black text-white uppercase tracking-tight">P.{idx + 1}</span>
                                {page.analysis?.boundary?.isNewDocument && (
                                   <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary text-[8px] font-black text-white uppercase animate-pulse">
                                      <Fingerprint size={10} />
                                      Boundary
                                   </div>
                                )}
                             </div>
                          </div>
                       </div>
                    </div>

                       {(idx < (activeDocument?.pages.length || 0) - 1 && !selectedPageIds.length) && (
                         <div className="absolute -right-4 top-0 bottom-0 w-8 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <button 
                               onClick={() => activeDocument && splitDocument(activeDocument.documentId, idx + 1)}
                               className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-xl border-2 border-background hover:scale-125 hover:bg-rose-500 transition-all"
                               title="Force boundary split here"
                            >
                               <Scissors size={14} />
                            </button>
                         </div>
                       )}
                      </div>
                   ))}
               </div>
                        </div>
                  )}
                   </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20">
                 <MousePointer2 size={64} strokeWidth={1} className="mb-6 animate-bounce" />
               <h3 className="text-2xl font-black text-foreground uppercase tracking-tight">No Bundle Selected</h3>
                 <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] mt-2">Select a document bundle from the left panel to begin reviewing pages.</p>
              </div>
            )}
          </div>
        </div>
        <div className="w-[460px] border-l border-border bg-card flex flex-col shrink-0 shadow-[-4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="h-20 border-b border-border/40 flex items-center px-4 justify-between bg-muted/20 shrink-0">
             <div className="flex w-full items-center justify-between px-4 mt-2 mb-4">
                <div className="flex flex-col items-center gap-1 z-10 cursor-pointer" onClick={() => setDesignerTab("grouping")}>
                  <button
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all shadow-sm ring-4 ring-background",
                      designerTab === "grouping" ? "bg-primary text-primary-foreground scale-110" : "bg-emerald-500 text-white hover:scale-105"
                    )}
                  >
                     {designerTab === "grouping" ? "1" : <Check size={14} strokeWidth={3} />}
                  </button>
                  <span className={cn("text-[9px] font-black uppercase tracking-wider mt-1", designerTab === "grouping" ? "text-primary" : "text-emerald-500")}>Group & Split</span>
                </div>
                
                <div className={cn("flex-1 h-0.5 -mt-5 transition-colors", designerTab === "classification" ? "bg-emerald-500" : "bg-border/50")} />

                <div className="flex flex-col items-center gap-1 z-10 cursor-pointer" onClick={() => setDesignerTab("classification")}>
                  <button
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-black text-xs transition-all shadow-sm ring-4 ring-background",
                      designerTab === "classification" ? "bg-primary text-primary-foreground scale-110" : "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-105"
                    )}
                  >
                     2
                  </button>
                  <span className={cn("text-[9px] font-black uppercase tracking-wider mt-1", designerTab === "classification" ? "text-primary" : "text-muted-foreground")}>Classify</span>
                </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
             
             {designerTab === "grouping" ? (
                <div className="space-y-6">
                   {/* MANUAL TOOLS */}
                   <div className="p-5 bg-muted/30 border border-border/40 rounded-2xl space-y-4">
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-card border border-border text-foreground flex items-center justify-center shadow-sm">
                            <Layers size={16} strokeWidth={2.5} className="text-primary" />
                         </div>
                         <div>
                            <span className="text-xs font-black text-foreground uppercase tracking-wider block">Manual Tools</span>
                            <span className="text-[10px] font-black text-muted-foreground/80 uppercase">Fix and Re-group Pages</span>
                         </div>
                      </div>

                      <div className="space-y-2">
                         <button 
                           onClick={handleRegroup}
                           disabled={selectedPageIds.length === 0}
                           className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:bg-primary/95 transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-sm"
                         >
                            <Plus size={14} strokeWidth={3} />
                            Regroup Selected ({selectedPageIds.length})
                         </button>
                         <button 
                           onClick={handleBatchUnclassified}
                           disabled={selectedPageIds.length === 0}
                           className="w-full h-10 rounded-xl bg-card border border-border text-foreground text-xs font-black uppercase tracking-widest hover:bg-muted transition-all flex items-center justify-center gap-2 disabled:opacity-30 shadow-sm"
                         >
                            <EyeOff size={14} />
                            Move to Unclassified
                         </button>
                      </div>
                   </div>

                   {/* AI SEGREGATION ASSISTANT */}
                   <div className="space-y-4">
                      <div className="flex items-center gap-2 px-1">
                         <Sparkles size={14} className="text-primary animate-pulse" />
                         <span className="text-xs font-black text-foreground uppercase tracking-wider">AI Segregation Assistant</span>
                      </div>

                      {expandedGroupId && groupInsights[expandedGroupId] ? (
                         <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-card border border-border/40 space-y-3">
                               <div className="flex justify-between">
                                  <span className="text-xs font-bold text-foreground">Layout Fit Confidence</span>
                                  <span className="text-xs font-black text-primary">{Math.round(groupInsights[expandedGroupId].differentiatorScore * 100)}%</span>
                               </div>
                               <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${Math.round(groupInsights[expandedGroupId].differentiatorScore * 100)}%` }} />
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-card border border-border/40 space-y-3">
                               <span className="text-xs font-bold text-foreground block">Apply Split Anchor</span>
                               <div className="space-y-2">
                                  {groupInsights[expandedGroupId].commonAnchors.map((anchor, i) => (
                                     <div key={i} className="flex flex-col gap-2 p-2 bg-muted/30 rounded-xl border border-border/40">
                                        <span className="text-xs font-bold uppercase text-foreground truncate">{anchor.text}</span>
                                        <button 
                                          onClick={() => promoteInsightToRule(expandedGroupId!, "header", anchor.text)}
                                          className="w-full py-1 rounded-lg bg-primary text-primary-foreground text-[9px] font-black uppercase hover:bg-primary/90 transition-all flex items-center justify-center gap-1 shadow-sm"
                                        >
                                           <Plus size={10} strokeWidth={3} />
                                           Use as Split Boundary
                                        </button>
                                     </div>
                                  ))}
                               </div>
                            </div>
                         </div>
                      ) : (
                         <div className="p-6 rounded-2xl border border-dashed border-border/60 bg-muted/10 text-center opacity-70">
                            <span className="text-xs font-black uppercase text-foreground block">AI Assistant Idle</span>
                            <span className="text-[9px] text-muted-foreground uppercase block mt-1">Select a page bundle on the left canvas to let AI trace structural anchors.</span>
                         </div>
                      )}
                   </div>

                   {/* ADVANCED SETTINGS */}
                   <details className="group space-y-4 pt-4 border-t border-border/30">
                      <summary className="flex items-center justify-between cursor-pointer list-none text-xs font-black text-muted-foreground hover:text-foreground uppercase tracking-wider px-2 py-1 -mx-2 rounded-lg hover:bg-muted/50 transition-colors">
                         <div className="flex items-center gap-1.5">
                            <Settings className="text-primary group-open:rotate-90 transition-transform" size={14} />
                            Advanced Settings
                         </div>
                         <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                      </summary>
                      
                      <div className="mt-4 border-t border-border/30 pt-4">
                        <div className="flex items-center justify-between">
                           <span className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Layers className="text-primary" size={14} />
                              Active Segregation Rules
                           </span>
                           <button
                             onClick={() => setShowRuleBuilder(!showRuleBuilder)}
                             className="px-2.5 py-1 bg-primary text-primary-foreground text-[10px] font-black uppercase rounded-lg hover:opacity-90 transition-all flex items-center gap-1 shadow-sm"
                           >
                              {showRuleBuilder ? "Cancel" : "+ Add Custom Rule"}
                           </button>
                        </div>

                        {showRuleBuilder && (
                           <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 space-y-4 animate-in slide-in-from-top-4 duration-300 mt-4">
                              <span className="text-[10px] font-black text-primary uppercase block">New Custom Split Rule</span>
                              
                              <div className="space-y-3">
                                 <div className="space-y-1">
                                    <label className="text-[9px] font-black text-muted-foreground uppercase">Rule Title</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Mortgage Invoice Boundary"
                                      value={newRuleName}
                                      onChange={(e) => setNewRuleName(e.target.value)}
                                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                    />
                                 </div>

                                 <div className="space-y-1">
                                    <label className="text-[9px] font-black text-muted-foreground uppercase">Split Trigger Method</label>
                                    <select
                                      value={newRuleType}
                                      onChange={(e) => setNewRuleType(e.target.value as any)}
                                      className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                    >
                                       <option value="header">🔤 Header Keyword Match</option>
                                       <option value="footer">🧾 Footer Disclaimer Match</option>
                                       <option value="keyword">🔍 Semantic OCR phrase</option>
                                       <option value="pageCount">📏 Fixed Page Count split</option>
                                    </select>
                                 </div>

                                 {newRuleType !== "pageCount" ? (
                                   <div className="space-y-1">
                                      <label className="text-[9px] font-black text-muted-foreground uppercase">Target Text Phrase</label>
                                      <input
                                        type="text"
                                        placeholder="e.g. INVOICE SUB-TOTAL"
                                        value={newRulePattern}
                                        onChange={(e) => setNewRulePattern(e.target.value)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                      />
                                   </div>
                                 ) : (
                                   <div className="space-y-1">
                                      <label className="text-[9px] font-black text-muted-foreground uppercase">Pages Per Document Split</label>
                                      <input
                                        type="number"
                                        min={1}
                                        value={newRulePattern}
                                        onChange={(e) => setNewRulePattern(e.target.value)}
                                        className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none"
                                      />
                                   </div>
                                 )}

                                 <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                       <label className="text-[9px] font-black text-muted-foreground uppercase">Logic Operator</label>
                                       <select
                                         value={newRuleOperator}
                                         onChange={(e) => setNewRuleOperator(e.target.value as any)}
                                         className="w-full bg-card border border-border rounded-xl p-1.5 text-xs font-bold outline-none"
                                       >
                                          <option value="AND">AND (All match)</option>
                                          <option value="OR">OR (Any match)</option>
                                       </select>
                                    </div>
                                    <div className="space-y-1">
                                       <label className="text-[9px] font-black text-muted-foreground uppercase">Threshold</label>
                                       <select
                                         value={newRuleConfidence}
                                         onChange={(e) => setNewRuleConfidence(parseFloat(e.target.value))}
                                         className="w-full bg-card border border-border rounded-xl p-1.5 text-xs font-bold outline-none"
                                       >
                                          <option value="0.95">Ultra (95%)</option>
                                          <option value="0.80">Standard (80%)</option>
                                          <option value="0.60">Permissive (60%)</option>
                                       </select>
                                    </div>
                                 </div>

                                 <button
                                   onClick={() => {
                                     if (!newRuleName.trim()) {
                                       toast.error("Please enter a rule name!");
                                       return;
                                     }
                                     addLogicGroup({
                                       id: crypto.randomUUID(),
                                       name: newRuleName,
                                       enabled: true,
                                       headerPatterns: newRuleType === "header" ? [newRulePattern] : [],
                                       headerEnabled: newRuleType === "header",
                                       footerPatterns: newRuleType === "footer" ? [newRulePattern] : [],
                                       footerEnabled: newRuleType === "footer",
                                       keywords: newRuleType === "keyword" ? [newRulePattern] : [],
                                       keywordEnabled: newRuleType === "keyword",
                                       barcodePatterns: [],
                                       pageCountEnabled: newRuleType === "pageCount",
                                       operator: newRuleOperator,
                                       confidenceThreshold: newRuleConfidence,
                                       color: newRuleColor
                                     });
                                     setNewRuleName("");
                                     setNewRulePattern("");
                                     setShowRuleBuilder(false);
                                   }}
                                   className="w-full h-9 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider rounded-xl hover:opacity-95 transition-all shadow-sm"
                                 >
                                    Create Split Rule
                                 </button>
                              </div>
                           </div>
                        )}

                        <div className="space-y-3 mt-4">
                           {segregationSettings.logicGroups.length === 0 ? (
                              <div className="p-8 rounded-2xl border border-dashed border-border bg-muted/10 text-center opacity-70">
                                 <AlertCircle size={20} className="text-primary/60 mb-2 mx-auto" />
                                 <span className="text-[10px] font-black uppercase text-foreground">No Custom Rules Active</span>
                                 <p className="text-[9px] text-muted-foreground uppercase leading-relaxed max-w-[200px] mx-auto mt-1.5">
                                    Click "+ Add Custom Rule" to build fully dynamic OCR, visual, or structural splitting boundaries.
                                  </p>
                              </div>
                           ) : (
                              segregationSettings.logicGroups.map((group) => {
                                let ruleSummary = "";
                                if (group.headerEnabled) ruleSummary = "Header matches: " + (group.headerPatterns[0] || "");
                                else if (group.footerEnabled) ruleSummary = "Footer matches: " + (group.footerPatterns[0] || "");
                                else if (group.keywordEnabled) ruleSummary = "OCR semantic phrase: " + (group.keywords[0] || "");
                                else if (group.pageCountEnabled) ruleSummary = "Fixed pages threshold split";

                                return (
                                   <div key={group.id} className="p-4 bg-card border border-border/80 rounded-2xl shadow-sm space-y-3 transition-all relative overflow-hidden group">
                                      <div className="flex items-center justify-between">
                                         <div className="flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: group.color || "#3b82f6" }} />
                                            <div>
                                               <h6 className="text-xs font-black text-foreground uppercase tracking-tight">{group.name}</h6>
                                               <span className="text-[8px] font-black text-muted-foreground uppercase tracking-wider block mt-0.5">{ruleSummary}</span>
                                            </div>
                                         </div>

                                         <div className="flex items-center gap-3">
                                            <button
                                              onClick={() => updateLogicGroup(group.id, { enabled: !group.enabled })}
                                              className={cn("w-7 h-4 rounded-full relative transition-all shadow-inner", group.enabled ? "bg-primary" : "bg-muted")}
                                            >
                                               <div className={cn("absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm", group.enabled ? "right-0.5" : "left-0.5")} />
                                            </button>

                                            <button
                                              onClick={() => deleteLogicGroup(group.id)}
                                              className="text-muted-foreground hover:text-rose-500 transition-colors"
                                            >
                                               <Trash2 size={12} />
                                            </button>
                                         </div>
                                      </div>
                                   </div>
                                );
                              })
                           )}
                        </div>
                      </div>
                   </details>

                   {/* GLOBAL SEGREGATION MATRIX */}
                   <div className="space-y-4 bg-muted/10 p-5 rounded-2xl border border-border/40">
                      <span className="text-xs font-black text-foreground uppercase tracking-wider block">Global Segregation Matrix</span>
                      <div className="grid grid-cols-2 gap-2">
                         {[
                           { id: "boundary", section: "boundary", label: "Boundary", desc: "Auto-split", icon: Scissors, prop: "useStructuralBoundary" },
                           { id: "continuity", section: "continuity", label: "Continuity", desc: "Merge related", icon: IterationCcw, prop: "enabled" },
                           { id: "separator", section: "separator", label: "Separator", desc: "Detect Barcodes", icon: Binary, prop: "enabled" },
                           { id: "keyword", section: "keyword", label: "Keyword", desc: "Phrase Match", icon: Type, prop: "enabled" },
                           { id: "pageCount", section: "pageCount", label: "Split Pages", desc: "Fixed Count", icon: Hash, prop: "enabled" },
                           { id: "blank", section: "blank", label: "Cleaning", desc: "Remove Blanks", icon: Eraser, prop: "enabled" }
                         ].map((func) => {
                           const isActive = (segregationSettings[func.section as keyof typeof segregationSettings] as any)[func.prop];
                           return (
                             <button 
                               key={func.id}
                               onClick={() => handleUpdateLayerProps(func.section as any, { [func.prop]: !isActive })}
                               className={cn(
                                 "flex flex-col gap-2 p-3 rounded-xl border transition-all text-left",
                                 isActive ? "border-primary/20 bg-background shadow-sm shadow-primary/5" : "border-border/50 bg-muted/10 opacity-60"
                               )}
                             >
                                <div className="flex items-center justify-between w-full">
                                   <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", isActive ? "bg-primary text-white" : "bg-card text-muted-foreground")}>
                                      <func.icon size={12} />
                                   </div>
                                </div>
                                <div>
                                   <p className="text-xs font-black text-foreground uppercase tracking-tight leading-none">{func.label}</p>
                                   <p className="text-[9px] font-black text-muted-foreground uppercase mt-1">{func.desc}</p>
                                </div>
                             </button>
                           );
                         })}
                      </div>
                   </div>
                </div>
             ) : (
                /* TAB 2: CLASSIFICATION PHASE */
                <div className="space-y-6 animate-in fade-in duration-300">
                   
                   {/* MANUAL TAXONOMY PICKER / CLASS SELECTOR */}
                   {activeDocument ? (
                      <div className="p-5 bg-primary/[0.02] border border-primary/20 rounded-2xl space-y-4">
                         <div className="flex items-center gap-2">
                            <Tag size={16} className="text-primary animate-pulse" />
                            <span className="text-xs font-black text-foreground uppercase tracking-wider block">Manual Classification Override</span>
                         </div>
                         
                         <p className="text-[10px] text-foreground/80 leading-relaxed">
                            Assign or override the class for the currently selected document bundle **"{activeDocument.name}"**.
                         </p>

                         <div className="space-y-3.5 pt-1">
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-muted-foreground uppercase">Active Taxonomy Class</label>
                               <select 
                                 value={activeDocument.classification?.classId || ""}
                                 onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "CREATE_NEW_CLASS") {
                                       setShowNewClassPrompt(true);
                                    } else if (val === "unclassified") {
                                       updateDocumentClass(activeDocument.documentId, "unclassified", "manual", "User Override", "Manual Layout Selection");
                                    } else {
                                       const selectedClass = documentClasses.find(c => c.classId === val);
                                       if (selectedClass) {
                                          updateDocumentClass(activeDocument.documentId, selectedClass.classId, "manual", "User Override", "Manual Layout Selection");
                                       }
                                    }
                                 }}
                                 className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                               >
                                  <option value="" disabled>-- Select Document Class --</option>
                                  {documentClasses.map(c => (
                                      <option key={c.classId} value={c.classId}>{c.name}</option>
                                  ))}
                                  <option value="unclassified" className="text-rose-500 font-bold">⚠️ Unclassified / Skip Extraction</option>
                                  <option value="CREATE_NEW_CLASS" className="text-primary font-black">+ Create a Custom Document Class...</option>
                               </select>
                             </div>
                             {activeDocument.classification && (
                                <div className={cn(
                                  "p-3 rounded-xl flex items-center justify-between border transition-all",
                                  activeDocument.classification.classId === "unclassified" 
                                    ? "bg-rose-50/50 border-rose-200 text-rose-800" 
                                    : "bg-card border-border/80"
                                )}>
                                   <div>
                                      <span className="text-[8px] font-black text-muted-foreground uppercase block">Assigned Class</span>
                                      <span className="text-xs font-black uppercase block mt-0.5">{activeDocument.classification.className}</span>
                                   </div>
                                   <div className="text-right">
                                      <span className="text-[8px] font-black text-muted-foreground uppercase block">
                                        {activeDocument.classification.classId === "unclassified" ? "Ingestion Status" : "Confidence Score"}
                                      </span>
                                      <span className={cn(
                                        "text-sm font-black block mt-0.5 uppercase",
                                        activeDocument.classification.classId === "unclassified" ? "text-rose-600 animate-pulse" : "text-emerald-500"
                                      )}>
                                        {activeDocument.classification.classId === "unclassified" ? "Excluded" : `${(activeDocument.classification.confidence || 0.98) * 100}%`}
                                      </span>
                                   </div>
                                </div>
                             )}

                             {activeDocument.classification?.classId === "unclassified" && (
                               <div className="p-3.5 bg-rose-50/40 border border-rose-100 rounded-xl space-y-1 animate-in fade-in duration-300">
                                 <div className="flex items-center gap-1.5 text-rose-600">
                                   <AlertCircle size={12} className="text-rose-500 animate-pulse" />
                                   <span className="text-[9px] font-black uppercase tracking-wider">Pipeline Skipped</span>
                                 </div>
                                 <p className="text-[9px] text-muted-foreground leading-normal font-medium">
                                   Marked as unclassified/ignored. Downstream OCR extractions, model schema routing, and human-in-the-loop validation tasks will be completely skipped for this bundle.
                                 </p>
                               </div>
                             )}
                             </div>
                          </div>
                       ) : (
                       <div className="p-6 rounded-2xl border border-dashed border-border/60 bg-muted/10 text-center opacity-70">
                          <span className="text-xs font-black uppercase text-foreground block">No Document Selected</span>
                          <span className="text-[9px] text-muted-foreground uppercase block mt-1">Select a document group on the left to manually classify it.</span>
                       </div>
                    )}

                    {/* DYNAMIC AUTO-CLASSIFICATION ENGINE CONFIG */}
                    <div className="p-5 bg-gradient-to-br from-primary/[0.03] to-violet-500/[0.03] border border-primary/20 rounded-2xl space-y-4">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shadow-inner">
                             <BrainCircuit size={16} strokeWidth={2.5} />
                          </div>
                          <div>
                             <span className="text-xs font-black text-foreground uppercase tracking-wider block">Auto-Classifier Model</span>
                             <span className="text-[10px] font-black text-muted-foreground/80 uppercase">AI Classification Model</span>
                          </div>
                       </div>

                       <div className="space-y-3">
                          <div className="space-y-1">
                             <label className="text-[9px] font-black text-muted-foreground uppercase">AI Classification Model</label>
                             <select 
                               value={selectedModelId}
                               onChange={(e) => setSelectedModelId(e.target.value)}
                               className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                             >
                                {infrastructure.offlineModels.map(m => (
                                   <option key={m.id} value={m.id}>🤖 {m.name} ({m.format})</option>
                                ))}
                             </select>
                          </div>

                          {/* Active Model Health & Accuracy telemetry */}
                          {infrastructure.offlineModels.find(m => m.id === selectedModelId) && (
                             (() => {
                                const m = infrastructure.offlineModels.find(model => model.id === selectedModelId)!;
                                return (
                                   <div className="p-3 bg-card border border-border/80 rounded-xl space-y-2 text-left shadow-sm">
                                      <div className="flex justify-between items-center">
                                         <span className="text-[9px] font-black text-muted-foreground uppercase">Precision F1-Score</span>
                                         <span className="text-xs font-black text-emerald-600">{(m.benchmarkScore || 0.95) * 100}%</span>
                                      </div>
                                      <div className="flex justify-between items-center">
                                         <span className="text-[9px] font-black text-muted-foreground uppercase">File Footprint / Size</span>
                                         <span className="text-[10px] font-bold text-foreground">{m.size || "Managed"}</span>
                                      </div>
                                      <p className="text-[9px] text-muted-foreground italic leading-relaxed pt-1 border-t border-border/30">
                                         {m.description}
                                      </p>
                                   </div>
                                );
                             })()
                          )}

                          <button 
                            onClick={handleRunAutoClassification}
                            disabled={isProcessing}
                            className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:bg-primary/95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                          >
                             <Sparkles size={14} className="animate-pulse" />
                             {isProcessing ? "Running Auto-Classifier..." : "Run Auto-Classification"}
                          </button>
                       </div>
                    </div>

                   {/* CUSTOM TENANT OVERRIDES */}
                   <div className="p-5 bg-muted/20 border border-border/40 rounded-2xl space-y-3">
                      <span className="text-xs font-black text-foreground uppercase tracking-wider block">Standard Document Types</span>
                      <p className="text-[10px] text-foreground/80 leading-relaxed">
                         Standardize customer-specific document names into reusable platform standard types.
                      </p>
                      <button 
                        onClick={() => setShowVocabularyModal(true)}
                        className="w-full py-2 bg-card hover:bg-muted border border-border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
                      >
                         Configure Document Types
                      </button>
                   </div>
                </div>
             )}
          </div>
        </div>
      </div>

      
      {zoomImage ? (
        <ZoomImageModal 
          zoomImage={zoomImage}
          activePage={activePage}
          onClose={() => setZoomImage(null)}
        />
      ) : null}

      {showVocabularyModal && (
        <EnterpriseVocabularyModal 
          onClose={() => setShowVocabularyModal(false)}
          documentClasses={documentClasses}
        />
      )}

      {showNewClassPrompt && (
        <div className="fixed inset-0 bg-background/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <Plus size={20} strokeWidth={2.5} />
              </div>
              <div>
                <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Create Custom Document Class</h4>
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Design extraction schemas downstream</p>
              </div>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-muted-foreground uppercase">Class Name</label>
              <input 
                autoFocus
                type="text"
                value={newClassNameInput}
                onChange={(e) => setNewClassNameInput(e.target.value)}
                placeholder="e.g. CUSTOM BILL OF LADING"
                className="w-full bg-muted/40 border border-border/60 rounded-xl px-4 py-3 text-xs font-bold uppercase outline-none focus:border-primary tracking-wide text-foreground placeholder:text-muted-foreground/55"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newClassNameInput.trim()) {
                    const name = newClassNameInput.trim();
                    const classId = name.toLowerCase().replace(/\s+/g, "_");
                    const newClass = {
                      classId,
                      name,
                      description: "Custom user-defined document class",
                      sampleCount: 0,
                      minConfidence: 0.8,
                      requiredFields: [],
                      optionalFields: [],
                      keywords: [],
                      anchorPhrases: [],
                      layoutPatterns: [],
                      isActive: true,
                      color: "#8b5cf6"
                    };
                    addClass(newClass);
                    if (activeDocument) {
                      updateDocumentClass(activeDocument.documentId, classId, "manual", "User Override", "Manual Layout Selection");
                    }
                    toast.success(`Successfully registered custom class "${name}"!`);
                    setShowNewClassPrompt(false);
                    setNewClassNameInput("");
                  }
                }}
              />
            </div>
            
            <p className="text-[10px] text-muted-foreground/80 leading-relaxed uppercase font-bold tracking-tight">
              💡 Registering this class adds it to the global pipeline taxonomy, allowing you to build signature validation models, custom spatial anchors, and extraction schemas later.
            </p>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => {
                  setShowNewClassPrompt(false);
                  setNewClassNameInput("");
                }}
                className="flex-1 py-2.5 rounded-xl border border-border/80 text-[10px] font-black uppercase tracking-wider hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button 
                disabled={!newClassNameInput.trim()}
                onClick={() => {
                  const name = newClassNameInput.trim();
                  if (name) {
                    const classId = name.toLowerCase().replace(/\s+/g, "_");
                    const newClass = {
                      classId,
                      name,
                      description: "Custom user-defined document class",
                      sampleCount: 0,
                      minConfidence: 0.8,
                      requiredFields: [],
                      optionalFields: [],
                      keywords: [],
                      anchorPhrases: [],
                      layoutPatterns: [],
                      isActive: true,
                      color: "#8b5cf6"
                    };
                    addClass(newClass);
                    if (activeDocument) {
                      updateDocumentClass(activeDocument.documentId, classId, "manual", "User Override", "Manual Layout Selection");
                    }
                    toast.success(`Successfully registered custom class "${name}"!`);
                  }
                  setShowNewClassPrompt(false);
                  setNewClassNameInput("");
                }}
                className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-wider hover:bg-primary/95 shadow-lg shadow-primary/20 transition-all disabled:opacity-50"
              >
                Create & Classify
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="h-20 border-t border-border bg-card flex items-center justify-end px-10 shrink-0 z-20 gap-4">
         {designerTab === "classification" && hasUnclassifiedDocs && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 animate-pulse">
               <AlertTriangle size={14} className="text-rose-500" />
               <span className="text-[10px] font-black uppercase tracking-wider">
                  ⚠️ {unclassifiedDocs.length} Document{unclassifiedDocs.length > 1 ? "s" : ""} require Classification
               </span>
            </div>
         )}

         <div className="flex-1" />

         {designerTab === "grouping" ? (
            <>
              <button 
                onClick={handleAutoSegregate}
                disabled={isProcessing}
                className="h-12 px-6 rounded-xl bg-primary text-primary-foreground text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 shadow-xl shadow-primary/20 transition-all disabled:opacity-50 group"
              >
                {isProcessing ? <Clock3 size={14} className="animate-spin" /> : <Sparkles size={14} className="group-hover:rotate-12 transition-transform" />}
                {isProcessing ? "Processing Pipeline..." : "✨ Auto-Group Documents"}
              </button>
              
              <button 
                onClick={() => setDesignerTab("classification")}
                className="h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 group border border-border shadow-2xl bg-card text-foreground hover:border-primary/50 hover:bg-muted/30"
              >
                Continue to Classification
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform text-primary" />
              </button>
            </>
         ) : (
            <>
              <button 
                onClick={() => setDesignerTab("grouping")}
                className="h-12 px-6 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 group border border-border bg-card text-foreground hover:bg-muted/30"
              >
                Back to Grouping
              </button>

              <button 
                onClick={async () => {
                  setIsProcessing(true);
                  await saveState();
                  setTimeout(() => setIsProcessing(false), 800);
                }}
                className="h-12 px-6 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 text-[11px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
              >
                <HardDrive size={14} />
                Save Progress
              </button>

              <button 
                disabled={hasUnclassifiedDocs}
                onClick={async () => {
                  await saveState();
                  updateStepStatus(TrainingStage.PAGE_SEGREGATION, "completed");
                  setActiveStage(TrainingStage.DOCUMENT_TYPE_RESOLUTION);
                }}
                className={cn(
                  "h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 group border border-border shadow-2xl bg-card text-foreground hover:border-primary-50 hover:bg-muted-30",
                  hasUnclassifiedDocs ? "opacity-40 cursor-not-allowed border-dashed" : "hover:border-primary/50 hover:bg-muted/30"
                )}
              >
                Finalize Segregation
                <CheckCircle size={18} className="text-primary" />
              </button>
            </>
         )}
      </footer>
    </div>
</React.Fragment>
);
}


interface ZoomImageModalProps {
  zoomImage: string;
  activePage: any;
  onClose: () => void;
}

function ZoomImageModal({ zoomImage, activePage, onClose }: ZoomImageModalProps) {
  return (
    <div className="fixed inset-0 z-200 bg-black/95 flex items-stretch p-6 animate-in fade-in duration-300">
       <div className="flex-1 flex items-center justify-center p-8 relative">
          <button 
            onClick={onClose}
            className="absolute top-0 right-0 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-all z-50"
          >
             <X size={24} />
          </button>
          <img src={zoomImage} className="max-w-full max-h-full object-contain shadow-2xl rounded-lg animate-in zoom-in-95 duration-500" alt="Zoomed" />
       </div>
       
       {activePage ? (
          <div className="w-[400px] bg-card border-l border-border/50 flex flex-col animate-in slide-in-from-right duration-500 shadow-2xl overflow-hidden rounded-r-3xl">
             <div className="p-6 border-b border-border/50 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <FileSearch size={20} />
                   </div>
                   <div>
                      <h4 className="text-sm font-black text-foreground uppercase tracking-tight">Full Extraction View</h4>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">Reviewing raw metadata & confidence</p>
                   </div>
                </div>
             </div>
             
             <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
               {activePage.analysis && (
                 <div className="space-y-6">
                   {activePage.analysis.confidence && (
                     <div className="space-y-4">
                        <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                           <BrainCircuit size={14} className="text-primary" />
                           Model Confidence breakdown
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {Object.entries(activePage.analysis.confidence.breakdown).map(([key, val]) => (
                            <div key={key} className="p-4 rounded-2xl bg-muted/30 border border-border/50 group/item hover:border-primary/30 transition-all">
                               <div className="flex items-center justify-between gap-3">
                                  <span className="text-[8px] font-black text-muted-foreground uppercase block mb-2 opacity-60">{key}</span>
                                  <span className="text-[12px] font-black text-foreground tabular-nums">{Math.round((val as number || 0) * 100)}%</span>
                               </div>
                               <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div 
                                    className={cn("h-full transition-all duration-500", (val as number || 0) >= 0.8 ? "bg-emerald-500" : (val as number || 0) >= 0.5 ? "bg-amber-500" : "bg-rose-500")}
                                    style={{ width: (val as number || 0) * 100 + "%" }}
                                  />
                               </div>
                            </div>
                          ))}
                       </div>
                     </div>
                   )}
                   
                   <div className="space-y-3">
                      <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                         <Sparkles size={14} className="text-amber-500" />
                         Segregation Anchors & Reason
                      </label>
                      <div className="space-y-2">
                         {activePage.analysis.explainability?.map((reason: string, i: number) => (
                           <div key={i} className="flex items-center gap-3 p-3.5 rounded-2xl bg-primary/5 border border-primary/20 animate-in slide-in-from-left duration-300" style={{ animationDelay: i * 100 + "ms" }}>
                              <div className="w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
                              <span className="text-xs font-bold text-foreground uppercase tracking-tight">{reason.replace(/_/g, ' ')}</span>
                           </div>
                         ))}
                         {(!activePage.analysis.explainability || activePage.analysis.explainability.length === 0) && (
                            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-muted/20 border border-border/50 opacity-40">
                               <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                               <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight">Semantic Continuity Maintained</span>
                            </div>
                         )}
                      </div>
                   </div>
                 </div>
               )}
               
               <div className="space-y-4 pt-4 border-t border-border/30">
                  <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                     <Type size={14} className="text-primary" />
                     Extracted Text Stream
                  </label>
                  <div className="p-6 rounded-3xl bg-muted/30 border border-border/50 text-[11px] font-medium text-foreground leading-relaxed h-[35vh] overflow-y-auto custom-scrollbar whitespace-pre-wrap selection:bg-primary/20 shadow-inner group">
                     {activePage.ocrText || "Processing OCR stream for this page..."}
                  </div>
               </div>
             </div>
             
             <div className="p-8 border-t border-border/50 bg-muted/20">
                <button 
                  onClick={onClose}
                  className="w-full h-12 rounded-xl bg-foreground text-background text-[11px] font-black uppercase tracking-widest hover:opacity-90 transition-all shadow-xl shadow-foreground/10"
                >
                   Finalize Review
                </button>
             </div>
          </div>
       ) : null}
    </div>
  );
}
