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
  IngestionBatch,
  ClassReadiness,
} from "../../types";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { computeClassReadiness, computeFieldIntelligence, computeLearningTrend, CORRECTION_TYPE_LABELS } from "../../validation/engine";
import { loadTrainingLedger } from "../../validation/ledger";

const TIER_STYLES: Record<ClassReadiness["readinessTier"], { label: string; badge: string; bar: string }> = {
  ready: { label: "Ready", badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/30", bar: "bg-emerald-500" },
  needs_samples: { label: "Needs Samples", badge: "bg-amber-500/10 text-amber-500 border-amber-500/30", bar: "bg-amber-500" },
  needs_attribution_fix: { label: "Needs Attribution Fix", badge: "bg-rose-500/10 text-rose-500 border-rose-500/30", bar: "bg-rose-500" },
};

function ClassReadinessCard({ readiness, trend }: { readiness: ClassReadiness; trend: ReturnType<typeof computeLearningTrend> }) {
  const tier = TIER_STYLES[readiness.readinessTier];
  const progress = readiness.samplesNeeded > 0
    ? Math.min(100, Math.round((readiness.sampleCount / readiness.samplesNeeded) * 100))
    : 100;

  return (
    <div className="p-5 rounded-md border border-border/50 bg-card space-y-4">
      <div className="flex items-center justify-between">
        <h5 className="text-[11px] font-black text-foreground uppercase tracking-tight">{readiness.name}</h5>
        <div className="flex items-center gap-1.5">
          {trend.enabled && trend.direction !== "flat" && (
            <span className={cn(
              "text-[8px] font-black uppercase tracking-widest px-1.5 py-1 rounded border",
              trend.direction === "improving"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "bg-rose-500/10 text-rose-500 border-rose-500/30"
            )}>
              {trend.direction === "improving" ? "▲" : "▼"} {Math.abs(trend.deltaPct)}%
            </span>
          )}
          <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded border", tier.badge)}>
            {tier.label}
          </span>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[9px] font-black text-muted-foreground uppercase tracking-widest">
          <span>{readiness.sampleCount} / {readiness.samplesNeeded} samples</span>
          <span>{readiness.samplesRemaining === 0 ? "Target reached" : `${readiness.samplesRemaining} remaining`}</span>
        </div>
        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
          <div className={cn("h-full rounded-full transition-all", tier.bar)} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 rounded bg-muted/20 border border-border/50 text-center">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Current Accuracy</span>
          <span className="text-[10px] font-black text-foreground">{Math.round(readiness.currentAccuracy * 1000) / 10}%</span>
        </div>
        <div className="p-2 rounded bg-muted/20 border border-border/50 text-center">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">ETA to Target</span>
          <span className="text-[10px] font-black text-foreground">{readiness.etaDays === null ? "—" : `${readiness.etaDays}d`}</span>
        </div>
        <div className="p-2 rounded bg-muted/20 border border-border/50 text-center">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Field Coverage</span>
          <span className="text-[10px] font-black text-foreground">{Math.round(readiness.requiredFieldCoverage * 1000) / 10}%</span>
        </div>
      </div>

      {readiness.topIssues.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Top Correction Issues</span>
          <div className="flex flex-wrap gap-1.5">
            {readiness.topIssues.map(issue => (
              <span
                key={issue.correction_type}
                className="text-[8px] font-bold text-muted-foreground bg-muted/30 border border-border/50 rounded px-1.5 py-0.5"
                title={`${issue.count} occurrence(s) · ${issue.percentage}% of corrections`}
              >
                {CORRECTION_TYPE_LABELS[issue.correction_type]} ({issue.percentage}%)
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FieldIntelligenceSection({ profiles }: { profiles: ReturnType<typeof computeFieldIntelligence> }) {
  if (profiles.length === 0) return null;
  return (
    <div className="w-full p-5 rounded-md border border-border/50 bg-card space-y-3 text-left">
      <h5 className="text-[11px] font-black text-foreground uppercase tracking-tight">Field Intelligence</h5>
      <p className="text-[9px] text-muted-foreground">Fields with the most analyst corrections across all classes — likely candidates for anchor or boundary fixes.</p>
      <div className="space-y-2">
        {profiles.map(p => (
          <div key={p.field_id} className="flex items-center justify-between gap-3 p-2 rounded bg-muted/20 border border-border/50">
            <span className="text-[10px] font-black text-foreground">{p.field_name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[8px] font-bold text-muted-foreground">{p.totalCorrections} correction{p.totalCorrections === 1 ? "" : "s"}</span>
              {p.dominantIssue && (
                <span className="text-[8px] font-bold text-muted-foreground bg-muted/30 border border-border/50 rounded px-1.5 py-0.5">
                  {CORRECTION_TYPE_LABELS[p.dominantIssue.correction_type]}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TrainingReview() {
  const { updateStepStatus, setActiveStage } = useDocumentReader();
  const documentClasses = usePipelineStore(s => s.documentClasses);
  const trainingDocuments = usePipelineStore(s => s.trainingDocuments);

  const ledgerEntries = useMemo(() => loadTrainingLedger(), [documentClasses, trainingDocuments]);

  const readinessByClass = useMemo(() => {
    return documentClasses.map(cls => computeClassReadiness(cls, ledgerEntries, trainingDocuments));
  }, [documentClasses, trainingDocuments, ledgerEntries]);

  const trendByClassId = useMemo(() => {
    const map = new Map<string, ReturnType<typeof computeLearningTrend>>();
    for (const cls of documentClasses) map.set(cls.classId, computeLearningTrend(cls));
    return map;
  }, [documentClasses]);

  const fieldIntelligence = useMemo(() => computeFieldIntelligence(ledgerEntries, 5), [ledgerEntries]);

  const readyCount = readinessByClass.filter(r => r.readinessTier === "ready").length;

  const confidenceCenter = useMemo(() => {
    if (readinessByClass.length === 0) return null;
    const avgConfidence = readinessByClass.reduce((s, r) => s + r.currentAccuracy, 0) / readinessByClass.length;
    const totalSamples = readinessByClass.reduce((s, r) => s + r.sampleCount, 0);
    const totalCorrections = ledgerEntries.filter(e => e.correction_type != null).length;
    return { avgConfidence, totalSamples, totalCorrections };
  }, [readinessByClass, ledgerEntries]);

  return (
    <div className="flex flex-col items-center text-center space-y-6 w-full max-w-3xl mx-auto">
      <div className="w-20 h-20 rounded-md bg-primary/5 flex items-center justify-center text-primary">
        <CheckCircle2 size={32} />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Training Review</h3>
        <p className="text-sm text-muted-foreground max-w-sm">Review model performance across all classes and fields before publishing.</p>
      </div>

      {confidenceCenter && (
        <div className="w-full p-4 rounded-md border border-border/50 bg-card grid grid-cols-3 gap-3 text-left">
          <div className="text-center">
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Avg Confidence</span>
            <span className="text-[13px] font-black text-foreground">{Math.round(confidenceCenter.avgConfidence * 1000) / 10}%</span>
          </div>
          <div className="text-center">
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Total Samples</span>
            <span className="text-[13px] font-black text-foreground">{confidenceCenter.totalSamples}</span>
          </div>
          <div className="text-center">
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Corrections Logged</span>
            <span className="text-[13px] font-black text-foreground">{confidenceCenter.totalCorrections}</span>
          </div>
        </div>
      )}

      {readinessByClass.length > 0 && (
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {readinessByClass.map(readiness => (
            <ClassReadinessCard
              key={readiness.classId}
              readiness={readiness}
              trend={trendByClassId.get(readiness.classId) ?? { enabled: false, direction: "flat", deltaPct: 0 }}
            />
          ))}
        </div>
      )}

      <FieldIntelligenceSection profiles={fieldIntelligence} />

      <div className="space-y-3 flex flex-col items-center">
        {readinessByClass.length > 0 && (
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
            {readyCount} of {readinessByClass.length} classes ready to train
          </p>
        )}
        <button
          onClick={() => {
            updateStepStatus(TrainingStage.TRAINING_REVIEW, "completed");
            setActiveStage(TrainingStage.PUBLISH);
          }}
          className="h-11 px-8 rounded-md bg-card border border-border text-foreground font-bold text-[10px] uppercase tracking-[0.2em] shadow-lg hover:border-primary/50 transition-all hover:scale-105 flex items-center gap-2 group"
        >
          Approve Training
          <ChevronRight size={14} className="text-primary group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
}




function ClusterTopologyModal({ isOpen, onClose, inventory }: { isOpen: boolean, onClose: () => void, inventory: any[] }) {
   if (!isOpen) return null;

   return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
         <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           onClick={onClose}
           className="absolute inset-0 bg-background/80 backdrop-blur-sm" 
         />
         <motion.div 
           initial={{ opacity: 0, scale: 0.95, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 20 }}
           className="relative w-full max-w-4xl bg-card border border-border rounded-md shadow-sm overflow-hidden flex flex-col max-h-[85vh]"
         >
            <header className="px-8 py-6 border-b border-border bg-muted/30 flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                     <Network size={24} />
                  </div>
                  <div>
                     <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Managed AI Cluster Topology</h2>
                     <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest opacity-60">Architectural visualization of provisioned extraction runtimes</p>
                  </div>
               </div>
               <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-all text-muted-foreground">
                  <X size={20} />
               </button>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8">
               <div className="bg-primary/5 rounded-md border border-primary/10 p-6 flex items-start gap-5">
                  <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                     <ShieldAlert size={20} />
                  </div>
                  <div className="space-y-2">
                     <h4 className="text-[11px] font-black text-foreground uppercase tracking-tight">Managed Cloud Infrastructure</h4>
                     <p className="text-[11px] text-muted-foreground leading-relaxed">
                        The nodes listed below are <strong>managed remote instances</strong> provisioned in our high-density AI processing cloud. 
                        These units are dedicated to your document extraction workloads and operate independently of your local machine's hardware. 
                        You do not need a local NVIDIA GPU to process documents; the system automatically routes all inference tasks to this high-performance cluster.
                     </p>
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {inventory.map((gpu, idx) => (
                    <div key={gpu.id} className="p-5 rounded-md border border-border bg-muted/20 space-y-4">
                       <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                             <div className="text-[10px] font-black text-primary px-2 py-0.5 rounded bg-primary/10">NODE {idx + 1}</div>
                             <h5 className="text-[11px] font-black text-foreground uppercase tracking-tight">{gpu.name}</h5>
                          </div>
                          <div className="flex items-center gap-1.5">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                             <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Active</span>
                          </div>
                       </div>
                       
                       <div className="grid grid-cols-3 gap-2">
                          <div className="p-2 rounded bg-card border border-border/50 text-center">
                             <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Compute</span>
                             <span className="text-[10px] font-black text-foreground">{gpu.usagePercent}%</span>
                          </div>
                          <div className="p-2 rounded bg-card border border-border/50 text-center">
                             <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">VRAM</span>
                             <span className="text-[10px] font-black text-foreground">{gpu.vramUsed}</span>
                          </div>
                          <div className="p-2 rounded bg-card border border-border/50 text-center">
                             <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Temp</span>
                             <span className="text-[10px] font-black text-foreground">{gpu.temperature}°C</span>
                          </div>
                       </div>

                       <div className="flex items-center justify-between pt-2">
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Orchestration Link</span>
                          <span className="text-[9px] font-black text-emerald-500 uppercase">Stable 10Gbps</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>

            <footer className="px-8 py-6 border-t border-border bg-muted/30 flex items-center justify-between">
               <div className="flex items-center gap-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-emerald-500" />
                     <span>Cluster Healthy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 rounded-full bg-primary" />
                     <span>Low Latency Routing</span>
                  </div>
               </div>
               <button 
                 onClick={onClose}
                 className="h-10 px-8 rounded-md bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
               >
                  Close Visualization
               </button>
            </footer>
         </motion.div>
      </div>
   );
}


