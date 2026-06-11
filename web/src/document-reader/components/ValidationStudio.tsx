"use client";

import React from "react";
import {
  ChevronRight, FileCheck, Activity, Download, Filter, FolderTree,
  Eye, EyeOff, Database, RotateCcw, GitBranch,
  CheckCircle2, AlertCircle, ShieldCheck, Layers, FileText, Inbox,
} from "lucide-react";
import { useDocumentReader } from "../store/documentReaderContext";
import { TrainingStage } from "../types";
import { usePipelineStore, TrainingDocument } from "../store/studioStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { summarizeDocument, generateTransactionLog, generateAnalystTelemetry, seededRandom } from "../validation/engine";
import { QUEUE_LABELS } from "../validation/engine";
import { ValidationQueueType, ValidationDocumentSummary } from "../types";
import { ConfidenceHeatmapCanvas, ConfidenceHeatmapLegend, HeatmapField, confidenceTier } from "../validation/ConfidenceHeatmapCanvas";
import { ExplainabilityPanel, FieldReviewAction } from "../validation/ExplainabilityPanel";
import { AnalystTelemetryDrawer } from "../validation/AnalystTelemetryDrawer";
import { SystemLifecycle } from "../validation/SystemLifecycle";
import { BatchOverview } from "../validation/BatchOverview";
import { appendTrainingLedgerEntry } from "../validation/ledger";
import { DocumentNormalizer } from "../services/documentNormalizer";
import { classifyDocumentSegments, buildExtractionDesign, AutoPipelineStage } from "../validation/autoPipeline";

const CURRENT_USER = "Sarah Jenkins";

const QUEUE_ORDER: ValidationQueueType[] = ["manual_escalation", "highest_learning_value", "confidence_review", "straight_through"];

const QUEUE_ICONS: Record<ValidationQueueType, React.ElementType> = {
  manual_escalation: AlertCircle,
  highest_learning_value: Activity,
  confidence_review: Filter,
  straight_through: CheckCircle2,
};

const QUEUE_TONE: Record<ValidationQueueType, string> = {
  manual_escalation: "text-rose-500 border-rose-500/30 bg-rose-500/5",
  highest_learning_value: "text-amber-500 border-amber-500/30 bg-amber-500/5",
  confidence_review: "text-primary border-primary/30 bg-primary/5",
  straight_through: "text-emerald-500 border-emerald-500/30 bg-emerald-500/5",
};

export function ValidationStudio() {
  const { updateStepStatus, setActiveStage, projectId } = useDocumentReader();
  const {
    trainingDocuments, documentClasses, activeDocument, activePage,
    setActiveDocument, setActivePage, updateTrainingDocument, setTrainingDocuments, addIngestionBatch,
    deleteTrainingDocument, replaceDocumentWithSegments,
  } = usePipelineStore();

  const [selectedQueue, setSelectedQueue] = React.useState<ValidationQueueType | "all">("all");
  const [selectedFieldId, setSelectedFieldId] = React.useState<string | null>(null);
  const [showOcrWords, setShowOcrWords] = React.useState(false);
  const [drawerOpen, setDrawerOpen] = React.useState(true);
  const [lifecycleOpen, setLifecycleOpen] = React.useState(false);
  const [lifecycleTab, setLifecycleTab] = React.useState<"health" | "promotion" | "rollback" | "golden">("health");
  const [fieldsReviewed, setFieldsReviewed] = React.useState(0);
  const [isUploading, setIsUploading] = React.useState(false);
  const [processingDocs, setProcessingDocs] = React.useState<Record<string, AutoPipelineStage>>({});
  const sessionStartRef = React.useRef(Date.now());

  const batchId = `BATCH_${(projectId || "DEFAULT").toUpperCase()}`;

  const summaries = React.useMemo<ValidationDocumentSummary[]>(
    () => trainingDocuments.map(doc => summarizeDocument(doc, documentClasses)),
    [trainingDocuments, documentClasses]
  );

  const relevantDocumentClasses = React.useMemo(() => {
    const usedClassIds = new Set(
      trainingDocuments
        .map(doc => doc.classification?.classId)
        .filter((id): id is string => !!id)
    );
    return documentClasses.filter(cls => usedClassIds.has(cls.classId));
  }, [documentClasses, trainingDocuments]);

  const summaryByDoc = React.useMemo(() => {
    const map = new Map<string, ValidationDocumentSummary>();
    summaries.forEach(s => map.set(s.documentId, s));
    return map;
  }, [summaries]);

  const queueCounts = React.useMemo(() => {
    const counts: Record<ValidationQueueType, number> = {
      manual_escalation: 0, highest_learning_value: 0, confidence_review: 0, straight_through: 0,
    };
    summaries.forEach(s => { counts[s.queue] += 1; });
    return counts;
  }, [summaries]);

  const stpRate = summaries.length > 0
    ? Math.round((queueCounts.straight_through / summaries.length) * 1000) / 10
    : 0;

  const queueDocuments = React.useMemo(() => {
    if (selectedQueue === "all") return trainingDocuments;
    return trainingDocuments.filter(doc => summaryByDoc.get(doc.documentId)?.queue === selectedQueue);
  }, [trainingDocuments, summaryByDoc, selectedQueue]);

  // Ensure activeDocument is part of the current queue selection
  React.useEffect(() => {
    if (queueDocuments.length === 0) return;
    if (!activeDocument || !queueDocuments.some(d => d.documentId === activeDocument.documentId)) {
      setActiveDocument(queueDocuments[0]);
      setSelectedFieldId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueDocuments, selectedQueue]);

  const activeSummary = activeDocument ? summaryByDoc.get(activeDocument.documentId) : undefined;

  const transactionLog = React.useMemo(() => {
    if (!activeDocument || !activeSummary) return null;
    return generateTransactionLog(activeDocument, activeSummary, batchId);
  }, [activeDocument, activeSummary, batchId]);

  const heatmapFields = React.useMemo<HeatmapField[]>(() => {
    const dedup = <T extends { id: string }>(arr: T[]) => arr.filter((x, i, a) => a.findIndex(y => y.id === x.id) === i);
    const designFields = activeDocument?.metadata?.extractionDesign?.fields as Array<{
      id: string; name: string; type: string; confidence?: number; value?: string;
      x?: number; y?: number; width?: number; height?: number; categoryId?: string | null;
    }> | undefined;
    if (designFields && designFields.length > 0) {
      return dedup(designFields).map(f => ({
        id: f.id, name: f.name, x: f.x, y: f.y, width: f.width, height: f.height,
        confidence: f.confidence, value: f.value, categoryId: f.categoryId ?? null,
      }));
    }
    return dedup(activeDocument?.extraction?.fields || []).map(f => ({
      id: f.id, name: f.name, confidence: f.confidence, value: f.value, categoryId: null,
    }));
  }, [activeDocument]);

  const extractionCategories = React.useMemo(() => {
    return (activeDocument?.metadata?.extractionDesign?.categories || []) as Array<{
      id: string; name: string; parentId: string | null;
    }>;
  }, [activeDocument]);

  const handleSelectField = React.useCallback((fieldId: string) => {
    setSelectedFieldId(fieldId);
    const field = heatmapFields.find(f => f.id === fieldId);
    if (field && (field.x === undefined || field.y === undefined)) {
      toast.info(`"${field.name}" has no mapped location on this page.`);
    }
  }, [heatmapFields]);

  const analystTelemetry = React.useMemo(() => {
    const elapsed = (Date.now() - sessionStartRef.current) / 1000;
    return generateAnalystTelemetry(fieldsReviewed, summaries.filter(s => s.queue !== "straight_through").length, Math.max(elapsed, fieldsReviewed * 1.4 + 4));
  }, [fieldsReviewed, summaries]);

  const handleFieldAction = React.useCallback((field: HeatmapField, action: FieldReviewAction, value?: string) => {
    if (!activeDocument) return;
    const designFields = (activeDocument.metadata?.extractionDesign?.fields || []) as Array<Record<string, any>>;

    const newValue = action === "clear" ? "" : action === "edit" ? (value ?? "") : (field.value || "");
    const newConfidence = action === "clear" ? 0 : 1.0;

    const updatedFields = designFields.map(f => f.id === field.id ? { ...f, value: newValue, confidence: newConfidence } : f);

    updateTrainingDocument(activeDocument.documentId, {
      metadata: {
        ...activeDocument.metadata,
        extractionDesign: {
          ...activeDocument.metadata?.extractionDesign,
          fields: updatedFields,
        },
      },
    });

    const excludedFromTraining = !!activeDocument.metadata?.excludedFromTraining;

    if (!excludedFromTraining) {
      appendTrainingLedgerEntry({
        document_id: activeDocument.documentId,
        field_id: field.id,
        field_name: field.name,
        predicted_value: field.value || "",
        corrected_value: newValue,
        predicted_confidence: field.confidence ?? 0,
        provenance_metadata: {
          source_user_id: "analyst_sarah_j",
          approval_timestamp: new Date().toISOString(),
          origin_batch_id: batchId,
          approver_id: "supervisor_alex_m",
          base_model_version_used: transactionLog?.model_context.classification_model_version || "unassigned",
        },
      });
    }

    setFieldsReviewed(n => n + 1);

    const trainingNote = excludedFromTraining ? " (excluded from training)" : "";
    if (action === "accept") {
      toast.success(`"${field.name}" confirmed correct${excludedFromTraining ? "" : " — recorded as a verified extraction in the training dataset"}.${trainingNote}`);
    } else if (action === "clear") {
      toast.success(`"${field.name}" cleared${excludedFromTraining ? "" : " and logged for OCR/extraction review"}.${trainingNote}`);
    } else {
      toast.success(`"${field.name}" corrected${excludedFromTraining ? "" : " and committed to the training dataset ledger"}.${trainingNote}`);
    }
  }, [activeDocument, updateTrainingDocument, batchId, transactionLog]);

  const handleSelectDocument = (docId: string) => {
    const doc = trainingDocuments.find(d => d.documentId === docId);
    if (!doc) return;
    setActiveDocument(doc);
    setActivePage(doc.pages[0]);
    setSelectedFieldId(null);
  };

  const handleDeleteDocument = React.useCallback((docId: string) => {
    const doc = trainingDocuments.find(d => d.documentId === docId);
    deleteTrainingDocument(docId);
    setProcessingDocs(prev => {
      if (!(docId in prev)) return prev;
      const next = { ...prev };
      delete next[docId];
      return next;
    });
    if (selectedFieldId && activeDocument?.documentId === docId) setSelectedFieldId(null);
    toast.success(`"${doc?.name || "Document"}" removed from the validation queue.`);
  }, [trainingDocuments, deleteTrainingDocument, activeDocument, selectedFieldId]);

  const handleToggleTrainingInclusion = React.useCallback((docId: string) => {
    const doc = trainingDocuments.find(d => d.documentId === docId);
    if (!doc) return;
    const excluded = !!doc.metadata?.excludedFromTraining;
    updateTrainingDocument(docId, { metadata: { ...doc.metadata, excludedFromTraining: !excluded } });
    toast.success(
      excluded
        ? `"${doc.name}" re-included — its corrections will count toward model training.`
        : `"${doc.name}" excluded — its corrections will no longer influence model training.`
    );
  }, [trainingDocuments, updateTrainingDocument]);

  const handleReclassifyDocument = React.useCallback((docId: string, classId: string) => {
    const doc = trainingDocuments.find(d => d.documentId === docId);
    const cls = documentClasses.find(c => c.classId === classId);
    if (!doc || !cls) return;
    updateTrainingDocument(docId, {
      classification: {
        classId: cls.classId,
        className: cls.name,
        confidence: 1,
        method: "manual",
      },
    });
    toast.success(`"${doc.name}" reclassified as ${cls.name}.`);
  }, [trainingDocuments, documentClasses, updateTrainingDocument]);

  const runAutoPipeline = React.useCallback(async (doc: TrainingDocument, priorDocuments: TrainingDocument[]) => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    setProcessingDocs(prev => ({ ...prev, [doc.documentId]: "classifying" }));
    await delay(900 + seededRandom(doc.documentId) * 700);

    const segments = classifyDocumentSegments(doc, documentClasses);

    if (segments.length <= 1) {
      const classification = segments[0]?.classification;
      if (classification) {
        updateTrainingDocument(doc.documentId, { classification });
      }

      setProcessingDocs(prev => ({ ...prev, [doc.documentId]: "extracting" }));
      await delay(900 + seededRandom(`${doc.documentId}_x`) * 700);

      if (classification) {
        const extractionDesign = buildExtractionDesign(doc, classification.classId, priorDocuments);
        if (extractionDesign) {
          updateTrainingDocument(doc.documentId, {
            metadata: { ...doc.metadata, extractionDesign },
          });
        }
      }

      setProcessingDocs(prev => {
        const next = { ...prev };
        delete next[doc.documentId];
        return next;
      });

      toast.success(
        classification
          ? `"${doc.name}" classified as ${classification.className} — extraction complete.`
          : `"${doc.name}" processed — no document classes configured to classify against.`
      );
      return;
    }

    // Multi-document bundle — split into one record per detected document.
    const sourceName = doc.metadata?.sourceFileName || doc.name;
    const splitDocs: TrainingDocument[] = segments.map((seg, idx) => ({
      ...doc,
      documentId: `${doc.documentId}_seg${idx + 1}`,
      name: `${sourceName} — ${seg.classification.className} (p.${seg.pageIndices[0] + 1}-${seg.pageIndices[seg.pageIndices.length - 1] + 1})`,
      pages: seg.pageIndices.map(i => doc.pages[i]),
      classification: seg.classification,
      metadata: {
        ...doc.metadata,
        sourceFileName: sourceName,
        sourceDocumentId: doc.documentId,
        segmentIndex: idx + 1,
        segmentCount: segments.length,
      },
    }));

    replaceDocumentWithSegments(doc.documentId, splitDocs);

    setProcessingDocs(prev => {
      const next = { ...prev };
      delete next[doc.documentId];
      splitDocs.forEach(d => { next[d.documentId] = "extracting"; });
      return next;
    });

    await delay(900 + seededRandom(`${doc.documentId}_x`) * 700);

    const allPriors = [...priorDocuments, ...splitDocs];
    splitDocs.forEach(d => {
      const extractionDesign = buildExtractionDesign(d, d.classification!.classId, allPriors);
      if (extractionDesign) {
        updateTrainingDocument(d.documentId, {
          metadata: { ...d.metadata, extractionDesign },
        });
      }
    });

    setProcessingDocs(prev => {
      const next = { ...prev };
      splitDocs.forEach(d => { delete next[d.documentId]; });
      return next;
    });

    toast.success(
      `"${sourceName}" contained ${segments.length} documents — split into ${splitDocs.map(d => d.classification!.className).join(", ")}.`
    );
  }, [documentClasses, updateTrainingDocument, replaceDocumentWithSegments]);

  const handleUploadFiles = React.useCallback(async (files: FileList) => {
    setIsUploading(true);
    try {
      const fileArray = Array.from(files);
      const newDocs: TrainingDocument[] = [];
      for (const file of fileArray) {
        try {
          const normalized = await DocumentNormalizer.normalize(file);
          newDocs.push({
            ...normalized,
            metadata: {
              ...normalized.metadata,
              ingestionSource: "MANUAL_UPLOAD",
              ingestionTime: new Date().toISOString(),
              sourceFileName: normalized.name,
              uploadedAt: new Date().toISOString(),
              uploadedBy: CURRENT_USER,
            },
          });
        } catch (error) {
          toast.error(`"${file.name}" could not be processed — unsupported or corrupt file.`);
        }
      }
      if (newDocs.length === 0) return;

      setTrainingDocuments([...trainingDocuments, ...newDocs]);
      setActiveDocument(newDocs[0]);
      if (newDocs[0].pages.length > 0) setActivePage(newDocs[0].pages[0]);

      addIngestionBatch({
        id: `batch_${Date.now()}`,
        batchName: `Intake_${new Date().toLocaleDateString()}`,
        sourceType: "UPLOAD",
        totalFiles: newDocs.length,
        processedFiles: newDocs.length,
        failedFiles: 0,
        status: "COMPLETED",
        createdAt: new Date().toISOString(),
      });

      toast.success(`${newDocs.length} document${newDocs.length === 1 ? "" : "s"} added — running classification & extraction…`);

      newDocs.forEach(doc => { void runAutoPipeline(doc, trainingDocuments); });
    } finally {
      setIsUploading(false);
    }
  }, [trainingDocuments, setTrainingDocuments, setActiveDocument, setActivePage, addIngestionBatch, runAutoPipeline]);

  const openLifecycle = (tab: "health" | "promotion" | "rollback" | "golden") => {
    setLifecycleTab(tab);
    setLifecycleOpen(true);
  };

  if (trainingDocuments.length === 0) {
    return (
      <div className="w-full h-full flex flex-col gap-6 animate-in fade-in duration-500 p-4">
        <Header batchId={batchId} stpRate={stpRate} />
        <BatchOverview
          trainingDocuments={trainingDocuments}
          summaryByDoc={summaryByDoc}
          documentClasses={documentClasses}
          activeDocumentId={activeDocument?.documentId}
          isUploading={isUploading}
          processingDocs={processingDocs}
          onSelectDocument={handleSelectDocument}
          onUploadFiles={handleUploadFiles}
          onDeleteDocument={handleDeleteDocument}
          onToggleTrainingInclusion={handleToggleTrainingInclusion}
          onReclassifyDocument={handleReclassifyDocument}
        />
        <div className="flex-1 bg-card rounded-[9px] border border-border shadow-sm flex flex-col items-center justify-center text-center p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <div className="w-20 h-20 rounded-[9px] bg-primary/5 border border-primary/10 flex items-center justify-center text-primary mb-6 animate-pulse">
            <FileCheck size={40} strokeWidth={1} />
          </div>
          <h3 className="text-xl font-black text-foreground uppercase tracking-tight mb-2">Queue Fully Validated</h3>
          <p className="text-[11px] text-muted-foreground max-w-sm uppercase font-bold tracking-wider leading-relaxed opacity-60">All document extractions have passed the spatial confidence threshold. No human-in-the-loop intervention is required for this batch.</p>
        </div>
        <Footer onFinalize={() => { updateStepStatus(TrainingStage.VALIDATION, "completed"); setActiveStage(TrainingStage.TRAINING_REVIEW); }} />
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col gap-3 animate-in fade-in duration-500 p-4 relative">
      <Header batchId={batchId} stpRate={stpRate} />

      <BatchOverview
        trainingDocuments={trainingDocuments}
        summaryByDoc={summaryByDoc}
        documentClasses={documentClasses}
        activeDocumentId={activeDocument?.documentId}
        isUploading={isUploading}
        processingDocs={processingDocs}
        onSelectDocument={handleSelectDocument}
        onUploadFiles={handleUploadFiles}
        onDeleteDocument={handleDeleteDocument}
        onToggleTrainingInclusion={handleToggleTrainingInclusion}
        onReclassifyDocument={handleReclassifyDocument}
      />

      <div className="flex-1 flex gap-3 min-h-0">
        {/* LEFT PANEL — Taxonomy & Queues */}
        <aside className="w-64 shrink-0 bg-card rounded-[9px] border border-border/50 shadow-sm flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 px-1">Validation Queues</p>
              <div className="space-y-1.5">
                <QueueButton
                  label="All Documents"
                  icon={Layers}
                  count={summaries.length}
                  active={selectedQueue === "all"}
                  tone="text-foreground border-border"
                  onClick={() => setSelectedQueue("all")}
                />
                {QUEUE_ORDER.map(q => (
                  <QueueButton
                    key={q}
                    label={QUEUE_LABELS[q]}
                    icon={QUEUE_ICONS[q]}
                    count={queueCounts[q]}
                    active={selectedQueue === q}
                    tone={QUEUE_TONE[q]}
                    onClick={() => setSelectedQueue(q)}
                  />
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 px-1 flex items-center gap-1.5">
                <FolderTree size={11} /> Taxonomy
              </p>
              <div className="space-y-1">
                {relevantDocumentClasses.length === 0 && (
                  <p className="text-[9px] text-muted-foreground italic px-1">No document classes associated with this batch yet.</p>
                )}
                {relevantDocumentClasses.map(cls => (
                  <div key={cls.classId} className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                    <span className="text-[9px] font-black uppercase tracking-tight text-foreground truncate">{cls.name}</span>
                    <span className="text-[8px] font-black text-muted-foreground">{(cls.minConfidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-2 px-1">System Lifecycle</p>
              <div className="space-y-1.5">
                <LifecycleButton icon={Activity} label="Model Health Center" onClick={() => openLifecycle("health")} />
                <LifecycleButton icon={GitBranch} label="Promotion Pipeline" onClick={() => openLifecycle("promotion")} />
                <LifecycleButton icon={RotateCcw} label="Rollback Manager" onClick={() => openLifecycle("rollback")} />
                <LifecycleButton icon={Database} label="Golden Test Center" onClick={() => openLifecycle("golden")} />
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER PANEL — Document Queue + Heatmap Canvas */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          {queueDocuments.length === 0 ? (
            <div className="flex-1 bg-card rounded-[9px] border border-dashed border-border flex flex-col items-center justify-center text-center p-10">
              <Inbox size={32} className="text-muted-foreground/40 mb-3" />
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">No documents in this queue</p>
            </div>
          ) : (
            <>
              <div className="shrink-0 bg-card rounded-[9px] border border-border/50 shadow-sm p-2 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                {queueDocuments.map(doc => {
                  const summary = summaryByDoc.get(doc.documentId);
                  const tier = summary ? confidenceTier(summary.confidence.overallConfidence) : "high";
                  const isActive = activeDocument?.documentId === doc.documentId;
                  return (
                    <button
                      key={doc.documentId}
                      onClick={() => handleSelectDocument(doc.documentId)}
                      className={cn(
                        "shrink-0 flex items-center gap-2 px-3 h-10 rounded-[7px] border text-left transition-all",
                        isActive ? "border-primary bg-primary/5 shadow-sm" : "border-border/50 hover:border-border bg-background"
                      )}
                    >
                      <span className={cn(
                        "w-2 h-2 rounded-full shrink-0",
                        tier === "high" && "bg-emerald-500",
                        tier === "medium" && "bg-amber-500",
                        tier === "low" && "bg-rose-500"
                      )} />
                      <div className="leading-tight">
                        <p className="text-[9px] font-black uppercase tracking-tight text-foreground max-w-[140px] truncate">{doc.name}</p>
                        <p className="text-[8px] font-bold text-muted-foreground uppercase">
                          {summary ? `${(summary.confidence.overallConfidence * 100).toFixed(1)}% C_doc` : "—"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="shrink-0 flex items-center justify-between px-1">
                <ConfidenceHeatmapLegend />
                <button
                  onClick={() => setShowOcrWords(v => !v)}
                  className="h-7 px-3 rounded-[7px] border border-border bg-card text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
                >
                  {showOcrWords ? <EyeOff size={11} /> : <Eye size={11} />}
                  OCR Word Heatmap
                </button>
              </div>

              <ConfidenceHeatmapCanvas
                page={activePage}
                fields={heatmapFields}
                fieldExplanations={activeSummary?.fieldExplanations || []}
                selectedFieldId={selectedFieldId}
                onSelectField={handleSelectField}
                showOcrWords={showOcrWords}
              />

              {activeDocument && activeDocument.pages.length > 1 && (
                <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto custom-scrollbar px-1">
                  {activeDocument.pages.map(page => (
                    <button
                      key={page.pageId}
                      onClick={() => setActivePage(page)}
                      className={cn(
                        "shrink-0 h-7 px-3 rounded-[7px] border text-[9px] font-black uppercase tracking-widest transition-all",
                        activePage?.pageId === page.pageId ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      Page {page.pageNumber}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* RIGHT PANEL — Explainability */}
        <aside className="w-80 shrink-0">
          {activeSummary ? (
            <ExplainabilityPanel
              summary={activeSummary}
              fields={heatmapFields}
              categories={extractionCategories}
              selectedFieldId={selectedFieldId}
              onSelectField={handleSelectField}
              onFieldAction={handleFieldAction}
            />
          ) : (
            <div className="w-full h-full bg-card rounded-[9px] border border-dashed border-border flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 p-6 text-center">
              Select a document to view explainability data
            </div>
          )}
        </aside>
      </div>

      {/* BOTTOM DRAWER — Analyst Telemetry */}
      <AnalystTelemetryDrawer telemetry={analystTelemetry} isOpen={drawerOpen} onToggle={() => setDrawerOpen(v => !v)} />

      <Footer onFinalize={() => { updateStepStatus(TrainingStage.VALIDATION, "completed"); setActiveStage(TrainingStage.TRAINING_REVIEW); }} />

      <SystemLifecycle
        isOpen={lifecycleOpen}
        onClose={() => setLifecycleOpen(false)}
        initialTab={lifecycleTab}
        documentClasses={documentClasses}
        summaries={summaries}
        batchId={batchId}
      />
    </div>
  );
}

function Header({ batchId, stpRate }: { batchId: string; stpRate: number }) {
  return (
    <div className="flex items-center justify-between px-2 flex-wrap gap-3">
      <div>
        <h2 className="text-3xl font-black tracking-tight text-foreground uppercase">Validation Studio</h2>
        <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest opacity-80 italic mt-1">Human-in-the-loop review &amp; continuous learning pipeline</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Pill icon={Layers} label="Batch" value={batchId} />
        <Pill icon={ShieldCheck} label="STP Rate" value={`${stpRate}%`} tone={stpRate >= 80 ? "good" : "warn"} />
        <button className="h-10 px-6 rounded-[9px] border border-border bg-card text-muted-foreground font-black text-[10px] uppercase tracking-widest hover:border-primary/50 transition-all flex items-center gap-2">
          <Download size={14} />
          Export Validation Report
        </button>
      </div>
    </div>
  );
}

function Pill({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div className={cn(
      "h-10 px-3.5 rounded-[9px] border bg-card flex items-center gap-2",
      tone === "good" && "border-emerald-500/30 text-emerald-500",
      tone === "warn" && "border-amber-500/30 text-amber-500",
      !tone && "border-border text-muted-foreground"
    )}>
      <Icon size={13} />
      <div className="leading-tight">
        <p className="text-[7px] font-black uppercase tracking-widest opacity-70">{label}</p>
        <p className="text-[10px] font-black font-mono">{value}</p>
      </div>
    </div>
  );
}

function QueueButton({ label, icon: Icon, count, active, tone, onClick }: {
  label: string; icon: React.ElementType; count: number; active: boolean; tone: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] border transition-all text-left",
        active ? cn(tone, "shadow-sm") : "border-transparent hover:bg-muted/40 text-muted-foreground"
      )}
    >
      <Icon size={13} className="shrink-0" />
      <span className="text-[9px] font-black uppercase tracking-tight flex-1 truncate">{label}</span>
      <span className="text-[9px] font-black font-mono">{count}</span>
    </button>
  );
}

function LifecycleButton({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] border border-border/50 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all text-left"
    >
      <Icon size={13} className="shrink-0" />
      <span className="text-[9px] font-black uppercase tracking-tight flex-1 truncate">{label}</span>
      <ChevronRight size={12} className="shrink-0" />
    </button>
  );
}

function Footer({ onFinalize }: { onFinalize: () => void }) {
  return (
    <footer className="pt-3 border-t border-border flex items-center justify-end shrink-0">
      <button
        onClick={onFinalize}
        className={cn(
          "h-12 px-10 rounded-[9px] font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 group border border-border shadow-2xl bg-card text-foreground hover:border-primary/50 hover:bg-muted/30"
        )}
      >
        Finalize Validation & Proceed
        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform text-primary" />
      </button>
    </footer>
  );
}
