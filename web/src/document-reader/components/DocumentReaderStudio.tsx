"use client";

import React from "react";
import { DocumentReaderProvider, useDocumentReader } from "../store/documentReaderContext";
import { TrainingStage } from "../types";
import { 
  Rocket, 
  Settings, 
  Search, 
  Upload, 
  Scan, 
  Split, 
  Beaker, 
  ClipboardCheck, 
  ShieldCheck,
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Layers, 
  FileSearch,
  FileText,
  Server,
  Database,
  Zap,
  BrainCircuit,
  PencilLine,
  Sparkles,
  Network,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

import { ClassificationStudio } from "./ClassificationStudio";
import { ExtractionStudio } from "./ExtractionStudio";
import { ValidationStudio } from "./ValidationStudio";
import { DocumentIntake, InfrastructureRegistry, TrainingReview } from "./WorkflowStages";
import OCRConfiguration from "./ocr/OCRConfiguration";
import PageSegregation from "./segregation/PageSegregation";
import DocumentTypeResolution from "./DocumentTypeResolution";

import { usePipelineStore } from "../store/studioStore";

function StudioContent({ 
  projectId,
  projectName,
  onBack
}: { 
  projectId: string | null;
  projectName: string;
  onBack?: () => void;
}) {
  const { activeStage, setActiveStage, steps, canNavigateTo, setProjectId: setContextProjectId } = useDocumentReader();
  const { trainingDocuments, setProjectId: setStoreProjectId, loadState } = usePipelineStore();
  const [isSidebarCompact, setIsSidebarCompact] = React.useState(true);

  React.useEffect(() => {
    if (projectId) {
       setContextProjectId(projectId);
       setStoreProjectId(projectId);
       const requestedStage = new URLSearchParams(window.location.search).get("stage");
       const validStages = Object.values(TrainingStage) as string[];
       setActiveStage(requestedStage && validStages.includes(requestedStage) ? requestedStage as TrainingStage : TrainingStage.EXTRACTION);
       loadState();
    }
  }, [projectId, setContextProjectId, setStoreProjectId, loadState]);

  const renderActiveStudio = () => {
    switch (activeStage) {
      case TrainingStage.DOCUMENT_UPLOAD: return <DocumentIntake />;

      case TrainingStage.PAGE_SEGREGATION: return <PageSegregation />;
      case TrainingStage.DOCUMENT_TYPE_RESOLUTION: return <DocumentTypeResolution />;
      case TrainingStage.EXTRACTION: return <ExtractionStudio />;
      case TrainingStage.INFRASTRUCTURE: return <InfrastructureRegistry />;
      case TrainingStage.OCR_CONFIGURATION: return <OCRConfiguration />;
      case TrainingStage.VALIDATION: return <ValidationStudio />;
      case TrainingStage.TRAINING_REVIEW: return <TrainingReview />;
      case TrainingStage.PUBLISH: return (
        <div className="flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 rounded-[9px] bg-emerald-50/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Rocket size={32} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">Ready to Publish</h3>
            <p className="text-sm text-muted-foreground max-w-sm">Your model has been trained and validated. You can now deploy it to your production environment.</p>
          </div>
          <button className="h-11 px-8 rounded-[9px] bg-card border border-border text-foreground font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:border-emerald-500/50 transition-all hover:scale-105 flex items-center gap-2 group">
            Deploy Model
            <Rocket size={14} className="text-emerald-500 group-hover:translate-y-[-2px] transition-transform" />
          </button>
        </div>
      );
      default: return <div className="p-10 text-muted-foreground font-bold uppercase tracking-widest text-[10px]">Studio Initializing...</div>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle2 size={14} className="text-emerald-500" />;
      case "in_progress": return <Clock size={14} className="text-primary animate-pulse" />;
      case "blocked": return <Lock size={14} className="text-muted-foreground/30" />;
      case "needs_review": return <AlertCircle size={14} className="text-amber-500" />;
      default: return <div className="w-1.5 h-1.5 rounded-full bg-border" />;
    }
  };

  const getStageIcon = (stageId: TrainingStage) => {
    switch (stageId) {
      case TrainingStage.DOCUMENT_UPLOAD: return Database;
      case TrainingStage.OCR_CONFIGURATION: return Zap;
      case TrainingStage.PAGE_SEGREGATION: return Split;
      case TrainingStage.CLASSIFICATION: return BrainCircuit;
      case TrainingStage.DOCUMENT_TYPE_RESOLUTION: return Network;
      case TrainingStage.EXTRACTION: return PencilLine;
      case TrainingStage.VALIDATION: return ClipboardCheck;
      case TrainingStage.TRAINING_REVIEW: return ShieldCheck;
      case TrainingStage.PUBLISH: return Rocket;
      case TrainingStage.INFRASTRUCTURE: return Server;
      default: return Layers;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans selection:bg-primary/20">
      {/* High-Fidelity Studio Header */}
      <header className="h-20 bg-card/80 backdrop-blur-md border-b border-border/50 px-10 flex items-center justify-between shrink-0 z-50 shadow-[0_1px_10px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-5">
          {onBack && (
            <button 
              onClick={onBack}
              className="w-10 h-10 rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center shadow-sm group hover:-translate-x-1 mr-1"
              title="Back to Projects Dashboard"
            >
              <ArrowLeft size={16} strokeWidth={3} className="transition-transform group-hover:scale-110" />
            </button>
          )}
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-[0_8px_20px_-6px_rgba(var(--primary),0.4)] border border-white/20">
            <FileSearch size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-foreground/80 uppercase">AI DOCUMENT DESIGNER</h1>
              <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] font-black text-primary uppercase">
                Model Designer
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
               <span className="text-[10px] font-black text-foreground uppercase tracking-wide bg-muted px-2 py-0.5 rounded-lg border border-border">
                 Active Model: {projectName}
               </span>
               <div className="w-1 h-1 rounded-full bg-border" />
               <span className="text-[9px] font-black text-primary uppercase tracking-[0.15em] opacity-80">v4.0.82 Stable</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
           <div className="flex flex-col items-end">
              <div className="flex items-center gap-2 mb-1.5">
                 <Sparkles size={12} className="text-primary animate-pulse" />
                 <p className="text-[10px] font-black text-foreground/80 uppercase tracking-[0.2em]">Platform Readiness</p>
              </div>
              <div className="flex items-center gap-1.5">
                 {Object.values(TrainingStage).filter(s => s !== TrainingStage.CLASSIFICATION).map((s, idx) => (
                    <div 
                      key={s} 
                      className={cn(
                        "h-1.5 w-6 rounded-full transition-all duration-500",
                        steps[s].status === "completed" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" :
                        s === activeStage ? "bg-primary w-12 shadow-[0_0_12px_rgba(var(--primary),0.3)]" :
                        "bg-muted/40"
                      )} 
                    />
                 ))}
              </div>
           </div>
          
          <div className="h-10 w-px bg-border/50 mx-2" />
          
          <div className="flex items-center gap-3">
             <button className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
               <Search size={18} />
             </button>
             <button className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-sm">
               <Settings size={18} />
             </button>
          </div>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="flex-1 flex overflow-hidden">
        {/* Workspace Sidebar */}
        <aside className={cn(
          "bg-sidebar border-r border-border/40 flex flex-col shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-40 transition-all duration-300",
          isSidebarCompact ? "w-24" : "w-80"
        )}>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
              <div>
                  <div className="flex items-center justify-between mb-6 px-1">
                     {!isSidebarCompact && (
                        <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-70">
                           Operational Workflow
                        </h3>
                     )}
                     <button 
                        onClick={() => setIsSidebarCompact(!isSidebarCompact)}
                        className="p-1.5 rounded-lg border border-border/80 hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center shadow-sm ml-auto"
                        title={isSidebarCompact ? "Expand Panel" : "Collapse Panel"}
                     >
                        {isSidebarCompact ? <ChevronRight size={14} strokeWidth={3} /> : <ChevronLeft size={14} strokeWidth={3} />}
                     </button>
                  </div>
                  
                  <div className="space-y-3">
                     {Object.values(TrainingStage).filter(stageId => stageId !== TrainingStage.CLASSIFICATION).map((stageId, idx) => {
                       if (stageId === TrainingStage.DOCUMENT_TYPE_RESOLUTION) return null;
                       const step = steps[stageId];
                       const Icon = getStageIcon(stageId);
                       const isLocked = !canNavigateTo(step.id);
                       const isActive = activeStage === step.id;
 
                       return (
                         <button
                           key={step.id}
                           disabled={isLocked}
                           onClick={() => setActiveStage(step.id)}
                           className={cn(
                             "w-full flex items-center transition-all group relative border",
                             isSidebarCompact ? "p-3 justify-center rounded-xl" : "gap-5 px-5 py-4 rounded-2xl",
                             isActive ? "bg-primary text-primary-foreground border-primary shadow-xl shadow-primary/20" : "hover:bg-muted/50 border-transparent text-foreground/70",
                             isLocked ? "opacity-30 grayscale cursor-not-allowed" : "cursor-pointer"
                           )}
                           title={isSidebarCompact ? step.label : undefined}
                         >
                           <div className={cn(
                             "rounded-xl flex items-center justify-center transition-all duration-300 shrink-0",
                             isSidebarCompact ? "w-10 h-10" : "w-10 h-10",
                             isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                           )}>
                             <Icon size={20} strokeWidth={isActive ? 3 : 2} />
                           </div>
                           
                           {!isSidebarCompact && (
                             <>
                               <div className="flex-1 text-left min-w-0">
                                 <p className={cn("text-[12px] font-black tracking-tight transition-colors uppercase leading-tight", isActive ? "text-white" : "text-foreground")}>
                                   {step.label}
                                 </p>
                                 <p className={cn("text-[10px] font-bold uppercase tracking-tighter opacity-60 mt-0.5 leading-tight", isActive ? "text-white/70" : "text-muted-foreground")}>{step.description}</p>
                               </div>
                               <div className="shrink-0">
                                 {getStatusIcon(step.status)}
                               </div>
                             </>
                           )}
                         </button>
                       );
                     })}
                  </div>
              </div>
          </div>
          
          {/* Bottom Training Assets Panel */}
          {isSidebarCompact ? (
             <div className="p-4 border-t border-border/40 bg-muted/10 flex flex-col items-center justify-center gap-2" title={`${trainingDocuments.length} Training Assets Loaded`}>
                <FileText size={18} className="text-primary" />
                <span className="text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-lg border border-primary/20">{trainingDocuments.length}</span>
             </div>
          ) : (
             <div className="p-6 border-t border-border/40 bg-muted/10">
               <div className="flex items-center justify-between mb-4">
                 <h3 className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-80">Training Assets</h3>
                 <span className="text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/20">{trainingDocuments.length} Docs</span>
               </div>
               
               {trainingDocuments.length === 0 ? (
                 <div className="bg-background/40 rounded-[24px] p-6 border border-border/60 border-dashed flex flex-col items-center justify-center text-center">
                   <Upload size={20} strokeWidth={1.5} className="text-muted-foreground/30 mb-2" />
                   <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-40">Assets Registry Empty</p>
                 </div>
               ) : (
                 <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                   {trainingDocuments.map(doc => (
                     <div key={doc.documentId} className="p-3 rounded-xl bg-card border border-border/40 flex items-center gap-3 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer group">
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                           <FileText size={14} strokeWidth={2} />
                        </div>
                        <span className="text-[11px] font-black text-foreground truncate uppercase tracking-tight">{doc.name}</span>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          )}
        </aside>

        {/* Canvas / Viewport */}
        <div className="flex-1 bg-background relative overflow-hidden flex flex-col">
          {/* Subtle Grid Background */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--primary) 1px, transparent 1px)', backgroundSize: '32px 32px' }}></div>
          
          <div className="flex-1 flex flex-col min-h-0">
            {renderActiveStudio()}
          </div>

        </div>
      </main>
    </div>
  );
}

export function DocumentReaderStudio({ 
  projectId = null, 
  projectName = "Default Model", 
  onBack 
}: { 
  projectId?: string | null; 
  projectName?: string; 
  onBack?: () => void; 
}) {
  return (
    <DocumentReaderProvider>
      <StudioContent 
        projectId={projectId} 
        projectName={projectName}
        onBack={onBack}
      />
    </DocumentReaderProvider>
  );
}
