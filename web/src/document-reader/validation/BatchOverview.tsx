"use client";

import React from "react";
import {
  ChevronDown, ChevronUp, UploadCloud, Package, CheckCircle2, Clock, FolderTree, Loader2,
  ScanSearch, Tags, Trash2, ShieldOff, AlertTriangle, Sparkles,
  TrendingUp, TrendingDown, Target,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TrainingDocument, DocumentClass, ValidationDocumentSummary } from "../types";
import { AutoPipelineStage } from "./autoPipeline";
import { confidenceTier } from "./ConfidenceHeatmapCanvas";

interface BatchOverviewProps {
  trainingDocuments: TrainingDocument[];
  summaryByDoc: Map<string, ValidationDocumentSummary>;
  documentClasses: DocumentClass[];
  activeDocumentId?: string;
  isUploading: boolean;
  processingDocs: Record<string, AutoPipelineStage>;
  onSelectDocument: (documentId: string) => void;
  onUploadFiles: (files: FileList) => void;
  onDeleteDocument: (documentId: string) => void;
  onToggleTrainingInclusion: (documentId: string) => void;
  onReclassifyDocument: (documentId: string, classId: string) => void;
  onRunExtraction: (documentId: string) => void;
  onUpdateMinConfidence: (classId: string, minConfidence: number) => void;
  onRecordConfidenceSnapshot: (classId: string, snapshot: { count: number; overall: number; classification: number; extraction: number }) => void;
  /** "panel" (default) renders the compact collapsible card used inline above the
   *  validation workspace. "full" renders an expanded, always-open card that fills
   *  its container — used by the dedicated Upload & Queue tab. */
  variant?: "panel" | "full";
}

const STAGE_LABEL: Record<AutoPipelineStage, string> = {
  classifying: "Classifying…",
  extracting: "Extracting…",
};

const STAGE_ICON: Record<AutoPipelineStage, React.ElementType> = {
  classifying: Tags,
  extracting: ScanSearch,
};

const TIER_TEXT: Record<string, string> = {
  high: "text-emerald-500",
  medium: "text-amber-500",
  low: "text-rose-500",
};

const GRID_COLUMNS = "1fr 150px 56px 100px 104px 96px 96px 90px";

interface TypeGroup {
  key: string;
  name: string;
  documents: TrainingDocument[];
  completed: number;
  pending: number;
}

export function BatchOverview({
  trainingDocuments,
  summaryByDoc,
  documentClasses,
  activeDocumentId,
  isUploading,
  processingDocs,
  onSelectDocument,
  onUploadFiles,
  onDeleteDocument,
  onToggleTrainingInclusion,
  onReclassifyDocument,
  onRunExtraction,
  onUpdateMinConfidence,
  onRecordConfidenceSnapshot,
  variant = "panel",
}: BatchOverviewProps) {
  const isFull = variant === "full";
  const [isOpen, setIsOpen] = React.useState(true);
  const [confirmDelete, setConfirmDelete] = React.useState<{ id: string; name: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const open = isFull ? true : isOpen;

  const isCompleted = (doc: TrainingDocument) => summaryByDoc.get(doc.documentId)?.queue === "straight_through";
  const isExcluded = (doc: TrainingDocument) => !!doc.metadata?.excludedFromTraining;

  const totalCompleted = trainingDocuments.filter(isCompleted).length;
  const totalPending = trainingDocuments.length - totalCompleted;
  const totalExcluded = trainingDocuments.filter(isExcluded).length;

  /** Average confidence (classification, extraction, overall) across the documents
   *  in a group that are currently enabled for training, optionally overriding one
   *  document's enabled state — used to preview the impact of a toggle. */
  const groupConfidenceAvg = (
    docs: TrainingDocument[],
    overrideDocId?: string,
    overrideExcluded?: boolean
  ): { classification: number; extraction: number; overall: number } | null => {
    const included = docs.filter(d => {
      const excluded = d.documentId === overrideDocId ? !!overrideExcluded : isExcluded(d);
      return !excluded;
    });
    const totals = included.reduce((acc, d) => {
      const summary = summaryByDoc.get(d.documentId);
      if (!summary) return acc;
      acc.classification += summary.confidence.classificationConfidence;
      acc.extraction += summary.confidence.geometricFieldConfidence;
      acc.overall += summary.confidence.overallConfidence;
      acc.count += 1;
      return acc;
    }, { classification: 0, extraction: 0, overall: 0, count: 0 });
    if (totals.count === 0) return null;
    return {
      classification: totals.classification / totals.count,
      extraction: totals.extraction / totals.count,
      overall: totals.overall / totals.count,
    };
  };

  /** Toggles training inclusion for a document, surfacing the resulting change in
   *  this document type's average training confidence (classification, extraction,
   *  overall) so the impact of enabling/disabling is visible before it's applied. */
  const handleToggleTrainingInclusion = (doc: TrainingDocument, group: TypeGroup) => {
    const excluded = isExcluded(doc);
    const before = groupConfidenceAvg(group.documents);
    const after = groupConfidenceAvg(group.documents, doc.documentId, !excluded);
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    const delta = (a: number, b: number) => {
      const d = Math.round((b - a) * 100);
      return d === 0 ? "±0pt" : d > 0 ? `+${d}pt` : `${d}pt`;
    };

    if (!after) {
      toast.warning(`Disabling "${doc.name}" would leave "${group.name}" with no documents enabled for training.`);
    } else if (before) {
      toast.message(`Training ${excluded ? "enabled" : "disabled"} for "${doc.name}"`, {
        description:
          `${group.name} training confidence — ` +
          `Classification ${pct(before.classification)} → ${pct(after.classification)} (${delta(before.classification, after.classification)}), ` +
          `Extraction ${pct(before.extraction)} → ${pct(after.extraction)} (${delta(before.extraction, after.extraction)}), ` +
          `Overall ${pct(before.overall)} → ${pct(after.overall)} (${delta(before.overall, after.overall)})`,
      });
    }

    onToggleTrainingInclusion(doc.documentId);
  };

  const typeGroups = React.useMemo<TypeGroup[]>(() => {
    const groups = new Map<string, TypeGroup>();
    trainingDocuments.forEach(doc => {
      const classId = doc.classification?.classId;
      const cls = classId ? documentClasses.find(c => c.classId === classId) : undefined;
      const key = cls ? cls.classId : "unclassified";
      const name = cls ? cls.name : doc.classification?.className || "Unclassified";
      if (!groups.has(key)) {
        groups.set(key, { key, name, documents: [], completed: 0, pending: 0 });
      }
      const group = groups.get(key)!;
      group.documents.push(doc);
      if (isCompleted(doc)) group.completed += 1;
      else group.pending += 1;
    });
    return Array.from(groups.values()).sort((a, b) => b.documents.length - a.documents.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainingDocuments, documentClasses, summaryByDoc]);

  // Track each document class's average training confidence over time as
  // documents are added/enabled — this is the basis for the improving/degrading
  // trend indicator shown in each group's header.
  React.useEffect(() => {
    typeGroups.forEach(group => {
      const cls = documentClasses.find(c => c.classId === group.key);
      if (!cls) return;
      const avg = groupConfidenceAvg(group.documents);
      if (!avg) return;
      const enabledCount = group.documents.filter(d => !isExcluded(d)).length;
      onRecordConfidenceSnapshot(cls.classId, { count: enabledCount, overall: avg.overall, classification: avg.classification, extraction: avg.extraction });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeGroups, documentClasses]);

  return (
    <div className={cn(
      "bg-card rounded-[9px] border border-border/50 shadow-sm overflow-hidden",
      isFull ? "flex-1 flex flex-col min-h-0" : "shrink-0"
    )}>
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        accept=".pdf,.jpg,.jpeg,.png,.tiff,.zip"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onUploadFiles(e.target.files);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }}
      />

      <div className="flex items-center justify-between px-4 h-11 gap-3 shrink-0" style={isFull ? { background: "var(--studio-surface-raised)", borderBottom: "1px solid var(--studio-border)" } : undefined}>
        <button
          onClick={() => !isFull && setIsOpen(v => !v)}
          className={cn("flex items-center gap-2.5 min-w-0 flex-1 overflow-hidden text-left group", isFull && "cursor-default")}
        >
          <Package size={13} className="text-primary shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground shrink-0">Batch &amp; Document Overview</span>
          <span className="text-[8px] font-black text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{trainingDocuments.length} files</span>
          <span className="text-[8px] font-black text-emerald-500 flex items-center gap-1 shrink-0">
            <CheckCircle2 size={10} /> {totalCompleted} complete
          </span>
          <span className="text-[8px] font-black text-amber-500 flex items-center gap-1 shrink-0">
            <Clock size={10} /> {totalPending} pending
          </span>
          {totalExcluded > 0 && (
            <span className="text-[8px] font-black text-muted-foreground flex items-center gap-1 shrink-0">
              <ShieldOff size={10} /> {totalExcluded} training disabled
            </span>
          )}
          {!isFull && (isOpen ? <ChevronUp size={13} className="text-muted-foreground ml-auto shrink-0 group-hover:text-foreground" /> : <ChevronDown size={13} className="text-muted-foreground ml-auto shrink-0 group-hover:text-foreground" />)}
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="h-7 px-3 rounded-[7px] border border-primary/30 bg-primary/5 text-primary text-[9px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all flex items-center gap-1.5 shrink-0 disabled:opacity-50"
        >
          {isUploading ? <Loader2 size={11} className="animate-spin" /> : <UploadCloud size={11} />}
          {isUploading ? "Uploading…" : "Upload New Files"}
        </button>
      </div>

      {open && (
        <div className={cn(
          "border-t border-border/50 px-4 py-3 space-y-3",
          isFull && "flex-1 flex flex-col min-h-0"
        )}>
          {typeGroups.length === 0 ? (
            <p className="text-[9px] text-muted-foreground italic">No documents uploaded yet.</p>
          ) : (
            <div className={cn(
              "rounded-[7px] border border-border/40 overflow-hidden custom-scrollbar",
              isFull ? "flex-1 overflow-y-auto" : "max-h-[280px] overflow-y-auto"
            )}>
              {/* Grid header */}
              <div
                className="grid gap-2 px-2.5 py-1.5 bg-muted/40 border-b border-border/40 text-[10px] font-black uppercase tracking-wide text-muted-foreground sticky top-0 z-10"
                style={{ gridTemplateColumns: GRID_COLUMNS }}
              >
                <span className="truncate">File</span>
                <span className="truncate">Document Type</span>
                <span className="truncate">Pages</span>
                <span className="truncate">Status</span>
                <span className="truncate">Confidence</span>
                <span className="truncate">Uploaded</span>
                <span className="truncate">Train</span>
                <span className="truncate text-right">Actions</span>
              </div>

              {typeGroups.map(group => {
                const cls = documentClasses.find(c => c.classId === group.key);
                const avg = groupConfidenceAvg(group.documents);
                const target = cls?.minConfidence;
                const history = cls?.confidenceHistory || [];
                const prevSnapshot = history.length >= 2 ? history[history.length - 2] : null;
                const trendDelta = prevSnapshot && avg ? avg.overall - prevSnapshot.overall : null;
                const meetsTarget = avg && target !== undefined ? avg.overall >= target : null;

                return (
                <div key={group.key}>
                  {/* Type / classification group header */}
                  <div
                    className="px-2.5 py-1 flex items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em] sticky top-[22px] z-[5]"
                    style={{
                      background: group.key === "unclassified" ? "rgba(245,158,11,0.08)" : "var(--studio-surface)",
                      borderBottom: "1px solid var(--studio-border)",
                      color: group.key === "unclassified" ? "#d97706" : "var(--muted-foreground)",
                    }}
                  >
                    {group.key === "unclassified" ? <AlertTriangle size={10} /> : <FolderTree size={10} />}
                    <span>{group.name}</span>
                    <span className="opacity-60 font-bold tracking-normal normal-case">
                      · {group.documents.length} {group.documents.length === 1 ? "doc" : "docs"}
                      {group.pending > 0 ? ` · ${group.pending} pending` : ""}
                    </span>

                    {cls && avg && (
                      <div className="ml-auto flex items-center gap-2.5 normal-case tracking-normal">
                        {trendDelta !== null && Math.abs(trendDelta) >= 0.005 && (
                          <span
                            className={cn("flex items-center gap-0.5 font-black", trendDelta > 0 ? "text-emerald-500" : "text-rose-500")}
                            title={`Training confidence ${trendDelta > 0 ? "improved" : "degraded"} from ${Math.round(prevSnapshot!.overall * 100)}% (${prevSnapshot!.count} docs) to ${Math.round(avg.overall * 100)}% (${history[history.length - 1]?.count ?? ""} docs)`}
                          >
                            {trendDelta > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {trendDelta > 0 ? "+" : ""}{Math.round(trendDelta * 100)}pt
                          </span>
                        )}
                        <span
                          className={cn("font-black", meetsTarget === false ? "text-rose-500" : "text-emerald-500")}
                          title="Average overall training confidence across documents currently enabled for training"
                        >
                          Training Confidence {Math.round(avg.overall * 100)}%
                        </span>
                        {meetsTarget === false && (
                          <span className="text-rose-500 font-black flex items-center gap-0.5" title="Below this class's target confidence">
                            <AlertTriangle size={9} /> Below Target
                          </span>
                        )}
                        <label
                          className="flex items-center gap-1 opacity-80 hover:opacity-100 cursor-pointer"
                          title="Target confidence — minimum average confidence required for this document type. Set by the business team."
                        >
                          <Target size={10} />
                          <span className="font-bold">Target</span>
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step={1}
                            value={Math.round((cls.minConfidence ?? 0) * 100)}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              const pct = Math.max(0, Math.min(100, Number(e.target.value)));
                              onUpdateMinConfidence(cls.classId, pct / 100);
                            }}
                            className="w-10 bg-transparent border border-border/40 rounded px-1 py-0.5 font-mono font-black text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 normal-case tracking-normal"
                          />
                          <span className="font-black">%</span>
                        </label>
                      </div>
                    )}
                  </div>
                  {group.documents.map(doc => {
                    const completed = isCompleted(doc);
                    const excluded = isExcluded(doc);
                    const isActive = activeDocumentId === doc.documentId;
                    const stage = processingDocs[doc.documentId];
                    const StageIcon = stage ? STAGE_ICON[stage] : null;
                    const summary = summaryByDoc.get(doc.documentId);
                    const confidence = summary ? summary.confidence.overallConfidence : undefined;
                    const tier = confidence !== undefined ? confidenceTier(confidence) : undefined;
                    const uploadedAt = doc.metadata?.uploadedAt as string | undefined;
                    const uploadedBy = doc.metadata?.uploadedBy as string | undefined;
                    const currentClassId = doc.classification?.classId || "";

                    return (
                      <div
                        key={doc.documentId}
                        className={cn(
                          "grid gap-2 items-center px-2.5 py-1.5 border-b border-border/30 last:border-b-0 transition-colors",
                          isActive ? "bg-primary/5" : "hover:bg-muted/30",
                          excluded && "opacity-50"
                        )}
                        style={{ gridTemplateColumns: GRID_COLUMNS }}
                      >
                        <button
                          onClick={() => onSelectDocument(doc.documentId)}
                          className={cn(
                            "flex items-center gap-1.5 min-w-0 text-left rounded px-1 -mx-1",
                            isActive ? "text-primary" : "text-foreground"
                          )}
                          title={doc.name}
                        >
                          {stage ? (
                            <Loader2 size={10} className="text-primary animate-spin shrink-0" />
                          ) : completed ? (
                            <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Clock size={10} className="text-amber-500 shrink-0" />
                          )}
                          <span className="text-[11px] font-bold truncate">{doc.name}</span>
                        </button>

                        <div className="flex items-center gap-1 min-w-0">
                          <FolderTree size={10} className="text-muted-foreground shrink-0" />
                          <select
                            value={currentClassId}
                            onChange={(e) => onReclassifyDocument(doc.documentId, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            title="Reclassify document"
                            className="text-[10px] font-bold uppercase tracking-tight text-muted-foreground bg-transparent border border-border/40 rounded px-1 py-0.5 min-w-0 w-full hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                          >
                            <option value="">Unclassified</option>
                            {documentClasses
                              .filter(c => c.isActive !== false || c.classId === currentClassId)
                              .map(c => (
                                <option key={c.classId} value={c.classId}>{c.name}</option>
                              ))}
                          </select>
                        </div>

                        <span className="text-[10px] font-mono font-black text-muted-foreground">
                          {doc.pages.length}
                        </span>

                        {(() => {
                          const stages: AutoPipelineStage[] = ["classifying", "extracting"];
                          const stageIndex = stage ? stages.indexOf(stage) : completed ? stages.length : 0;
                          const label = stage ? STAGE_LABEL[stage] : completed ? "Complete" : "Pending";
                          const LabelIcon = stage ? StageIcon : completed ? CheckCircle2 : Clock;
                          return (
                            <div className="flex flex-col gap-1 min-w-0">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-widest flex items-center gap-1",
                                stage ? "text-primary" : completed ? "text-emerald-500" : "text-amber-500"
                              )}>
                                {LabelIcon && <LabelIcon size={9} />}
                                {label}
                              </span>
                              <div className="flex items-center gap-1">
                                {stages.map((step, i) => (
                                  <div key={step} className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={cn(
                                        "h-full rounded-full transition-all duration-500",
                                        i < stageIndex ? "w-full bg-emerald-500" : i === stageIndex && stage ? "w-1/2 bg-primary animate-pulse" : "w-0"
                                      )}
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        <span className={cn("text-[10px] font-mono font-black", tier ? TIER_TEXT[tier] : "text-muted-foreground")}>
                          {confidence !== undefined ? `${(confidence * 100).toFixed(0)}%` : "—"}
                        </span>

                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-[10px] font-black text-foreground truncate">
                            {uploadedAt ? new Date(uploadedAt).toLocaleString() : "—"}
                          </span>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-tight truncate">
                            {uploadedBy || "—"}
                          </span>
                        </div>

                        <input
                          type="checkbox"
                          checked={!excluded}
                          onChange={() => handleToggleTrainingInclusion(doc, group)}
                          className="h-3.5 w-3.5 rounded border-border/60 text-emerald-500 focus:ring-1 focus:ring-emerald-500/40 cursor-pointer"
                          title={excluded ? "Training disabled — click to enable and see the confidence impact" : "Training enabled — click to disable and see the confidence impact"}
                        />

                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onRunExtraction(doc.documentId)}
                            disabled={!doc.classification?.classId || !!stage}
                            className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={!doc.classification?.classId ? "Classify document first" : "Run extraction"}
                          >
                            <Sparkles size={11} />
                          </button>
                          <button
                            onClick={() => setConfirmDelete({ id: doc.documentId, name: doc.name })}
                            className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete document"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-background/80 backdrop-blur-md">
          <div className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-[9px] overflow-hidden p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[7px] bg-rose-500/10 flex items-center justify-center border border-rose-500/20 shrink-0">
                <AlertTriangle className="text-rose-500" size={16} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-500">Delete Document</h3>
                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">This cannot be undone</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Remove <strong className="text-foreground">{confirmDelete.name}</strong> from the validation queue and training dataset?
            </p>
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={() => setConfirmDelete(null)}
                className="h-8 px-4 rounded-[7px] border border-border text-[9px] font-black uppercase tracking-widest hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDeleteDocument(confirmDelete.id);
                  setConfirmDelete(null);
                }}
                className="h-8 px-4 rounded-[7px] bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[9px] tracking-widest transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
