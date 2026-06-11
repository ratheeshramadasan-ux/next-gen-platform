"use client";

import React from "react";
import {
  ChevronDown, ChevronUp, UploadCloud, Package, CheckCircle2, Clock, FolderTree, Loader2,
  ScanSearch, Tags, Trash2, ShieldOff, ShieldCheck, AlertTriangle,
} from "lucide-react";
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

const GRID_COLUMNS = "1fr 150px 50px 100px 64px 96px 96px 56px";

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
}: BatchOverviewProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const [confirmDelete, setConfirmDelete] = React.useState<{ id: string; name: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const isCompleted = (doc: TrainingDocument) => summaryByDoc.get(doc.documentId)?.queue === "straight_through";
  const isExcluded = (doc: TrainingDocument) => !!doc.metadata?.excludedFromTraining;

  const totalCompleted = trainingDocuments.filter(isCompleted).length;
  const totalPending = trainingDocuments.length - totalCompleted;
  const totalExcluded = trainingDocuments.filter(isExcluded).length;

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

  return (
    <div className="shrink-0 bg-card rounded-[9px] border border-border/50 shadow-sm overflow-hidden">
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

      <div className="flex items-center justify-between px-4 h-11 gap-3">
        <button
          onClick={() => setIsOpen(v => !v)}
          className="flex items-center gap-2.5 min-w-0 flex-1 text-left group"
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
              <ShieldOff size={10} /> {totalExcluded} excluded
            </span>
          )}
          {Object.keys(processingDocs).length > 0 && (
            <span className="text-[8px] font-black text-primary flex items-center gap-1 shrink-0">
              <Loader2 size={10} className="animate-spin" /> {Object.keys(processingDocs).length} processing
            </span>
          )}
          {isOpen ? <ChevronUp size={13} className="text-muted-foreground ml-auto shrink-0 group-hover:text-foreground" /> : <ChevronDown size={13} className="text-muted-foreground ml-auto shrink-0 group-hover:text-foreground" />}
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

      {isOpen && (
        <div className="border-t border-border/50 px-4 py-3 space-y-3">
          {typeGroups.length === 0 ? (
            <p className="text-[9px] text-muted-foreground italic">No documents uploaded yet.</p>
          ) : (
            <div className="rounded-[7px] border border-border/40 overflow-hidden max-h-[280px] overflow-y-auto custom-scrollbar">
              {/* Grid header */}
              <div
                className="grid gap-2 px-2.5 py-1.5 bg-muted/40 border-b border-border/40 text-[7.5px] font-black uppercase tracking-widest text-muted-foreground sticky top-0 z-10"
                style={{ gridTemplateColumns: GRID_COLUMNS }}
              >
                <span>File</span>
                <span>Document Type</span>
                <span>Pages</span>
                <span>Status</span>
                <span>Confidence</span>
                <span>Uploaded</span>
                <span>Training</span>
                <span className="text-right">Actions</span>
              </div>

              {typeGroups.map(group => (
                <div key={group.key}>
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
                          <span className="text-[9px] font-bold truncate">{doc.name}</span>
                        </button>

                        <div className="flex items-center gap-1 min-w-0">
                          <FolderTree size={10} className="text-muted-foreground shrink-0" />
                          <select
                            value={currentClassId}
                            onChange={(e) => onReclassifyDocument(doc.documentId, e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            title="Reclassify document"
                            className="text-[8.5px] font-bold uppercase tracking-tight text-muted-foreground bg-transparent border border-border/40 rounded px-1 py-0.5 min-w-0 w-full hover:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer"
                          >
                            {!currentClassId && <option value="">Unclassified</option>}
                            {documentClasses
                              .filter(c => c.isActive !== false || c.classId === currentClassId)
                              .map(c => (
                                <option key={c.classId} value={c.classId}>{c.name}</option>
                              ))}
                          </select>
                        </div>

                        <span className="text-[9px] font-mono font-black text-muted-foreground">
                          {doc.pages.length}
                        </span>

                        {stage ? (
                          <span className="text-[8px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                            {StageIcon && <StageIcon size={9} />}
                            {STAGE_LABEL[stage]}
                          </span>
                        ) : (
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest flex items-center gap-1",
                            completed ? "text-emerald-500" : "text-amber-500"
                          )}>
                            {completed ? <CheckCircle2 size={9} /> : <Clock size={9} />}
                            {completed ? "Complete" : "Pending"}
                          </span>
                        )}

                        <span className={cn("text-[9px] font-mono font-black", tier ? TIER_TEXT[tier] : "text-muted-foreground")}>
                          {confidence !== undefined ? `${(confidence * 100).toFixed(0)}%` : "—"}
                        </span>

                        <div className="flex flex-col leading-tight min-w-0">
                          <span className="text-[8.5px] font-black text-foreground truncate">
                            {uploadedAt ? new Date(uploadedAt).toLocaleDateString() : "—"}
                          </span>
                          <span className="text-[7px] font-bold text-muted-foreground uppercase tracking-tight truncate">
                            {uploadedBy || "—"}
                          </span>
                        </div>

                        <button
                          onClick={() => onToggleTrainingInclusion(doc.documentId)}
                          className={cn(
                            "flex items-center gap-1 text-[8px] font-black uppercase tracking-widest rounded px-1.5 py-0.5 border transition-colors w-fit",
                            excluded
                              ? "border-border/60 text-muted-foreground hover:border-rose-500/40 hover:text-rose-500"
                              : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                          )}
                          title={excluded ? "Excluded from training — click to include" : "Included in training — click to exclude"}
                        >
                          {excluded ? <ShieldOff size={9} /> : <ShieldCheck size={9} />}
                          {excluded ? "Excluded" : "Included"}
                        </button>

                        <div className="flex items-center justify-end">
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
              ))}
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
