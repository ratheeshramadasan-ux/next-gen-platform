"use client";

import React from "react";
import {
  ChevronRight, FileCheck, Activity, Download, Filter, FolderTree,
  Eye, EyeOff, Database, RotateCcw, GitBranch,
  CheckCircle2, AlertCircle, Layers, Inbox,
  ClipboardCheck, UploadCloud, Rocket,
} from "lucide-react";
import { useDocumentReader } from "../store/documentReaderContext";
import { TrainingStage } from "../types";
import { usePipelineStore, TrainingDocument } from "../store/studioStore";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

import { summarizeDocument, generateTransactionLog, generateAnalystTelemetry, classifyCorrection, computeFieldConfidence } from "../validation/engine";
import { QUEUE_LABELS } from "../validation/engine";
import { ValidationQueueType, ValidationDocumentSummary, FieldConfidenceBreakdown } from "../types";
import { ConfidenceHeatmapCanvas, ConfidenceHeatmapLegend, HeatmapField, confidenceTier } from "../validation/ConfidenceHeatmapCanvas";
import { ExplainabilityPanel, ConfidenceTransparencyPanel, FieldReviewAction } from "../validation/ExplainabilityPanel";
import { AnalystTelemetryDrawer } from "../validation/AnalystTelemetryDrawer";
import { SystemLifecycle } from "../validation/SystemLifecycle";
import { BatchOverview } from "../validation/BatchOverview";
import { appendTrainingLedgerEntry, loadTrainingLedger } from "../validation/ledger";
import { DocumentNormalizer } from "../services/documentNormalizer";
import { runOcrOnDocument, classifyDocumentFromOcr, buildExtractionDesignFromOcr, AutoPipelineStage } from "../validation/autoPipeline";
import { useAppContext } from "@/lib/context";

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

type WorkspaceTab = "queue" | "validation" | "confidence";


export function ValidationStudio() {
  const { updateStepStatus, setActiveStage, projectId } = useDocumentReader();
  const { currentUser } = useAppContext();
  const {
    trainingDocuments, documentClasses, activeDocument, activePage, infrastructure,
    setActiveDocument, setActivePage, updateTrainingDocument, setTrainingDocuments, addIngestionBatch,
    deleteTrainingDocument, updateClassConfig, recordClassConfidenceSnapshot,
  } = usePipelineStore();
  const ocrEngineId = infrastructure.primaryEngineId;

  const [activeWorkspaceTab, setActiveWorkspaceTab] = React.useState<WorkspaceTab>("queue");
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
  const lateExtractionRef = React.useRef<Set<string>>(new Set());

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

  const unclassifiedCount = React.useMemo(
    () => trainingDocuments.filter(doc => !doc.classification?.classId).length,
    [trainingDocuments]
  );

  const processedCount = React.useMemo(
    () => trainingDocuments.filter(doc =>
      !!doc.metadata?.reviewCompleted || summaryByDoc.get(doc.documentId)?.queue === "straight_through"
    ).length,
    [trainingDocuments, summaryByDoc]
  );

  const reviewQueueCount = React.useMemo(
    () => summaries.filter(s => s.queue !== "straight_through").length,
    [summaries]
  );

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

  const fieldConfidenceById = React.useMemo(() => {
    const map = new Map<string, FieldConfidenceBreakdown>();
    if (!activeDocument) return map;
    const docClass = documentClasses.find(c => c.classId === activeDocument.classification?.classId || c.name === activeDocument.classification?.className);
    const ledgerEntries = loadTrainingLedger();
    const designFields = (activeDocument.metadata?.extractionDesign?.fields || []) as Array<Record<string, any>>;
    (designFields.length > 0 ? designFields : heatmapFields).forEach(f => {
      map.set(f.id, computeFieldConfidence(f, activeDocument, docClass, ledgerEntries));
    });
    return map;
  }, [activeDocument, documentClasses, heatmapFields, fieldsReviewed]);

  const handleFieldAction = React.useCallback((field: HeatmapField, action: FieldReviewAction, value?: string) => {
    if (!activeDocument) return;
    const designFields = (activeDocument.metadata?.extractionDesign?.fields || []) as Array<Record<string, any>>;
    const designField = designFields.find(f => f.id === field.id);

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
      const attribution = classifyCorrection(
        designField || { id: field.id, name: field.name },
        field.value || "",
        newValue,
        action,
        activeDocument,
        summaries.find(s => s.documentId === activeDocument.documentId)?.businessRules
      );
      appendTrainingLedgerEntry({
        document_id: activeDocument.documentId,
        field_id: field.id,
        field_name: field.name,
        predicted_value: field.value || "",
        corrected_value: newValue,
        predicted_confidence: field.confidence ?? 0,
        ocr_value: field.value || "",
        bounding_box: field.x !== undefined && field.y !== undefined && field.width !== undefined && field.height !== undefined
          ? { x: field.x, y: field.y, width: field.width, height: field.height }
          : undefined,
        anchor_id: designField?.anchorId || designField?.anchor_id,
        page_number: activePage?.pageNumber,
        field_type: designField?.type,
        correction_type: attribution.type,
        attribution_reasons: attribution.reasons,
        provenance_metadata: {
          source_user_id: currentUser.email,
          approval_timestamp: new Date().toISOString(),
          origin_batch_id: batchId,
          approver_id: currentUser.email,
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
  }, [activeDocument, activePage, updateTrainingDocument, batchId, transactionLog, summaries, currentUser]);

  const handleSelectDocument = React.useCallback((docId: string) => {
    const doc = trainingDocuments.find(d => d.documentId === docId);
    if (!doc) return;
    setActiveDocument(doc);
    setActivePage(doc.pages[0]);
    setSelectedFieldId(null);
    setActiveWorkspaceTab("validation");
  }, [trainingDocuments, setActiveDocument, setActivePage]);

  // Same as handleSelectDocument but stays on the Confidence Transparency tab.
  const handleSelectDocumentForConfidence = React.useCallback((docId: string) => {
    const doc = trainingDocuments.find(d => d.documentId === docId);
    if (!doc) return;
    setActiveDocument(doc);
    setActivePage(doc.pages[0]);
    setSelectedFieldId(null);
  }, [trainingDocuments, setActiveDocument, setActivePage]);

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
    if (!doc) return;

    if (!classId) {
      updateTrainingDocument(docId, {
        classification: undefined,
        metadata: { ...doc.metadata, extractionDesign: undefined, autoExtractAttempted: false },
      });
      toast.success(`"${doc.name}" moved to Unclassified.`);
      return;
    }

    const cls = documentClasses.find(c => c.classId === classId);
    if (!cls) return;
    updateTrainingDocument(docId, {
      classification: {
        classId: cls.classId,
        className: cls.name,
        confidence: 1,
        method: "manual",
      },
      metadata: { ...doc.metadata, extractionDesign: undefined, autoExtractAttempted: false },
    });
    toast.success(`"${doc.name}" reclassified as ${cls.name} — re-running extraction.`);
  }, [trainingDocuments, documentClasses, updateTrainingDocument]);

  /** Documents that are classified but whose extraction design is missing or
   *  still holds the empty placeholder schema (every field blank, 0% confidence). */
  const needsExtraction = React.useCallback((doc: TrainingDocument) => {
    if (!doc.classification?.classId) return false;
    if (doc.metadata?.autoExtractAttempted) return false;
    const fields = doc.metadata?.extractionDesign?.fields as Array<{ value?: string; confidence?: number }> | undefined;
    if (!fields || fields.length === 0) return true;
    return fields.every(f => !f.value && (f.confidence ?? 0) === 0);
  }, []);

  // Auto-extract field values for any classified document that hasn't been
  // through the extraction pipeline yet (e.g. seeded/reclassified documents).
  React.useEffect(() => {
    const candidate = trainingDocuments.find(doc => needsExtraction(doc) && !lateExtractionRef.current.has(doc.documentId));
    if (!candidate) return;

    lateExtractionRef.current.add(candidate.documentId);
    setProcessingDocs(prev => ({ ...prev, [candidate.documentId]: "extracting" }));

    (async () => {
      let workingDoc = candidate;
      const hasOcr = (candidate.pages[0]?.textLayer?.length || 0) > 0;
      if (!hasOcr) {
        workingDoc = await runOcrOnDocument(candidate, ocrEngineId);
        updateTrainingDocument(candidate.documentId, { pages: workingDoc.pages });
      }

      const design = buildExtractionDesignFromOcr(workingDoc, candidate.classification!.classId, trainingDocuments);
      updateTrainingDocument(candidate.documentId, {
        metadata: {
          ...candidate.metadata,
          ...(design ? { extractionDesign: design } : {}),
          autoExtractAttempted: true,
        },
      });
      if (design) {
        toast.success(`"${candidate.name}" extraction complete — ${design.fields.length} fields ready for review.`);
      }
      setProcessingDocs(prev => {
        const next = { ...prev };
        delete next[candidate.documentId];
        return next;
      });
      lateExtractionRef.current.delete(candidate.documentId);
    })();
  }, [trainingDocuments, needsExtraction, updateTrainingDocument, ocrEngineId]);

  /** Manually (re)run extraction for a single classified document on demand. */
  const handleRunExtraction = React.useCallback((docId: string) => {
    const doc = trainingDocuments.find(d => d.documentId === docId);
    if (!doc) return;
    if (!doc.classification?.classId) {
      toast.error(`Classify "${doc.name}" before running extraction.`);
      return;
    }
    if (processingDocs[docId] || lateExtractionRef.current.has(docId)) return;

    lateExtractionRef.current.add(docId);
    setProcessingDocs(prev => ({ ...prev, [docId]: "extracting" }));

    (async () => {
      let workingDoc = doc;
      const hasOcr = (doc.pages[0]?.textLayer?.length || 0) > 0;
      if (!hasOcr) {
        workingDoc = await runOcrOnDocument(doc, ocrEngineId);
        updateTrainingDocument(docId, { pages: workingDoc.pages });
      }

      const design = buildExtractionDesignFromOcr(workingDoc, doc.classification!.classId, trainingDocuments);
      updateTrainingDocument(docId, {
        metadata: {
          ...doc.metadata,
          ...(design ? { extractionDesign: design } : {}),
          autoExtractAttempted: true,
        },
      });
      toast.success(
        design
          ? `"${doc.name}" extraction complete — ${design.fields.length} fields ready for review.`
          : `No extraction template available yet for "${doc.classification!.className}" — configure fields in the AI Document Designer first.`
      );
      setProcessingDocs(prev => {
        const next = { ...prev };
        delete next[docId];
        return next;
      });
      lateExtractionRef.current.delete(docId);
    })();
  }, [trainingDocuments, processingDocs, updateTrainingDocument, ocrEngineId]);

  const runAutoPipeline = React.useCallback(async (doc: TrainingDocument, priorDocuments: TrainingDocument[]) => {
    setProcessingDocs(prev => ({ ...prev, [doc.documentId]: "classifying" }));

    const ocrDoc = await runOcrOnDocument(doc, ocrEngineId);
    updateTrainingDocument(doc.documentId, { pages: ocrDoc.pages });

    const classification = classifyDocumentFromOcr(ocrDoc, documentClasses);
    if (classification) {
      updateTrainingDocument(doc.documentId, { classification });
    }

    setProcessingDocs(prev => ({ ...prev, [doc.documentId]: "extracting" }));

    if (classification) {
      const extractionDesign = buildExtractionDesignFromOcr({ ...ocrDoc, classification }, classification.classId, priorDocuments);
      updateTrainingDocument(doc.documentId, {
        metadata: {
          ...doc.metadata,
          ...(extractionDesign ? { extractionDesign } : {}),
          autoExtractAttempted: true,
        },
      });
    }

    setProcessingDocs(prev => {
      const next = { ...prev };
      delete next[doc.documentId];
      return next;
    });

    toast.success(
      classification
        ? `"${doc.name}" classified as ${classification.className} — extraction complete.`
        : `"${doc.name}" added to the Unclassified section — no document class matched yet.`
    );
  }, [documentClasses, updateTrainingDocument, ocrEngineId]);

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
              uploadedBy: currentUser.name,
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

      toast.success(`${newDocs.length} document${newDocs.length === 1 ? "" : "s"} added to Unclassified — running auto-classification & extraction…`);

      newDocs.forEach(doc => { void runAutoPipeline(doc, trainingDocuments); });
    } finally {
      setIsUploading(false);
    }
  }, [trainingDocuments, setTrainingDocuments, setActiveDocument, setActivePage, addIngestionBatch, runAutoPipeline, currentUser.name]);

  const handleMarkProcessed = React.useCallback(() => {
    if (!activeDocument) return;
    updateTrainingDocument(activeDocument.documentId, {
      metadata: {
        ...activeDocument.metadata,
        reviewCompleted: true,
        reviewedAt: new Date().toISOString(),
        reviewedBy: currentUser.name,
      },
    });
    toast.success(`"${activeDocument.name}" marked as processed.`);

    const idx = queueDocuments.findIndex(d => d.documentId === activeDocument.documentId);
    const next = queueDocuments[idx + 1];
    if (next) {
      setActiveDocument(next);
      setActivePage(next.pages[0]);
      setSelectedFieldId(null);
    }
  }, [activeDocument, updateTrainingDocument, queueDocuments, setActiveDocument, setActivePage]);

  const openLifecycle = (tab: "health" | "promotion" | "rollback" | "golden") => {
    setLifecycleTab(tab);
    setLifecycleOpen(true);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden" style={{ background: "var(--background)" }}>
      <ValidationHeader
        batchId={batchId}
        stpRate={stpRate}
        processedCount={processedCount}
        totalCount={summaries.length}
      />

      <WorkspaceTabBar
        activeTab={activeWorkspaceTab}
        onChange={setActiveWorkspaceTab}
        queueCount={trainingDocuments.length}
        unclassifiedCount={unclassifiedCount}
        validationCount={reviewQueueCount}
        confidenceCount={summaries.length}
      />

      <div className="flex-1 min-h-0 flex flex-col gap-3 p-4 overflow-hidden">
        {activeWorkspaceTab === "queue" ? (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Pill icon={Layers} label="Total Documents" value={String(trainingDocuments.length)} />
              <Pill icon={AlertCircle} label="Unclassified" value={String(unclassifiedCount)} tone={unclassifiedCount > 0 ? "warn" : undefined} />
              <Pill icon={Activity} label="Processing" value={String(Object.keys(processingDocs).length)} />
              <Pill icon={CheckCircle2} label="Processed" value={`${processedCount}/${summaries.length}`} tone={processedCount === summaries.length && summaries.length > 0 ? "good" : undefined} />
            </div>
            <BatchOverview
              variant="full"
              trainingDocuments={trainingDocuments}
              summaryByDoc={summaryByDoc}
              documentClasses={relevantDocumentClasses}
              activeDocumentId={activeDocument?.documentId}
              isUploading={isUploading}
              processingDocs={processingDocs}
              onSelectDocument={handleSelectDocument}
              onUploadFiles={handleUploadFiles}
              onDeleteDocument={handleDeleteDocument}
              onToggleTrainingInclusion={handleToggleTrainingInclusion}
              onReclassifyDocument={handleReclassifyDocument}
              onRunExtraction={handleRunExtraction}
              onUpdateMinConfidence={(classId, minConfidence) => updateClassConfig(classId, { minConfidence })}
              onRecordConfidenceSnapshot={recordClassConfidenceSnapshot}
            />
          </div>
        ) : activeWorkspaceTab === "validation" ? (
          <>
            {trainingDocuments.length === 0 ? (
              <div className="flex-1 bg-card rounded-[9px] border border-dashed border-border flex flex-col items-center justify-center text-center p-12">
                <FileCheck size={40} strokeWidth={1} className="text-muted-foreground/30 mb-4" />
                <h3 className="text-sm font-black text-foreground uppercase tracking-tight mb-1">No Documents To Validate</h3>
                <p className="text-[10px] text-muted-foreground max-w-sm uppercase font-bold tracking-wider leading-relaxed opacity-60 mb-4">
                  Upload files in the Upload &amp; Queue tab — they&apos;ll be auto-classified and extracted before landing here for review.
                </p>
                <button
                  onClick={() => setActiveWorkspaceTab("queue")}
                  className="h-9 px-4 rounded-xl border border-primary/30 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-all flex items-center gap-2"
                >
                  <UploadCloud size={13} />
                  Go to Upload &amp; Queue
                </button>
              </div>
            ) : (
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
                        {relevantDocumentClasses.map(cls => {
                          const history = cls.confidenceHistory || [];
                          const latest = history[history.length - 1];
                          const meetsTarget = latest ? latest.overall >= cls.minConfidence : null;
                          return (
                            <div key={cls.classId} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors">
                              <div className="min-w-0 flex-1">
                                <span className="text-[9px] font-black uppercase tracking-tight text-foreground truncate block">{cls.name}</span>
                                {latest && (
                                  <span className={cn("text-[8px] font-bold uppercase tracking-widest", meetsTarget ? "text-emerald-500" : "text-rose-500")}>
                                    Training {Math.round(latest.overall * 100)}% · {latest.count} {latest.count === 1 ? "doc" : "docs"}
                                  </span>
                                )}
                              </div>
                              <label className="flex items-center gap-1 shrink-0" title="Target confidence — minimum average training confidence required for this document type">
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step={1}
                                  value={Math.round(cls.minConfidence * 100)}
                                  onChange={(e) => {
                                    const pct = Math.max(0, Math.min(100, Number(e.target.value)));
                                    updateClassConfig(cls.classId, { minConfidence: pct / 100 });
                                  }}
                                  className="w-9 bg-transparent border border-border/40 rounded px-1 py-0.5 text-[8px] font-mono font-black text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/40 text-right"
                                />
                                <span className="text-[8px] font-black text-muted-foreground">%</span>
                              </label>
                            </div>
                          );
                        })}
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

                {/* RIGHT PANEL — Extracted Fields */}
                <aside className="w-80 shrink-0 h-full min-h-0">
                  {activeSummary ? (
                    <ExplainabilityPanel
                      fields={heatmapFields}
                      categories={extractionCategories}
                      selectedFieldId={selectedFieldId}
                      onSelectField={handleSelectField}
                      onFieldAction={handleFieldAction}
                    />
                  ) : (
                    <div className="w-full h-full bg-card rounded-[9px] border border-dashed border-border flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 p-6 text-center">
                      Select a document to view extracted fields
                    </div>
                  )}
                </aside>
              </div>
            )}

            {/* BOTTOM DRAWER — Analyst Telemetry */}
            <AnalystTelemetryDrawer telemetry={analystTelemetry} isOpen={drawerOpen} onToggle={() => setDrawerOpen(v => !v)} />
          </>
        ) : (
          <ConfidenceTransparencyTab
            queueDocuments={queueDocuments}
            summaryByDoc={summaryByDoc}
            activeDocument={activeDocument}
            activeSummary={activeSummary}
            selectedFieldId={selectedFieldId}
            fieldConfidenceById={fieldConfidenceById}
            onSelectDocument={handleSelectDocumentForConfidence}
          />
        )}

        <Footer
          activeDocumentName={activeDocument?.name}
          onMarkProcessed={handleMarkProcessed}
          markProcessedDisabled={!activeDocument || activeWorkspaceTab !== "validation"}
          onFinalize={() => { updateStepStatus(TrainingStage.VALIDATION, "completed"); setActiveStage(TrainingStage.TRAINING_REVIEW); }}
        />
      </div>

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

function ValidationHeader({ batchId, stpRate, processedCount, totalCount }: { batchId: string; stpRate: number; processedCount: number; totalCount: number }) {
  return (
    <header
      className="h-20 px-6 flex items-center justify-between shrink-0 z-30"
      style={{
        background: "var(--studio-surface-raised)",
        borderBottom: "1.5px solid var(--studio-border)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 1px 0 0 var(--studio-border)",
      }}
    >
      {/* Left: Brand + Identity */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-[0_8px_20px_-6px_rgba(var(--primary),0.4)] border border-white/20 shrink-0">
          <ClipboardCheck size={22} strokeWidth={2.5} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-black tracking-tight text-foreground/80 uppercase whitespace-nowrap">Validation Studio</h1>
            <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-xs font-black text-primary uppercase tracking-widest whitespace-nowrap">
              Continuous Learning
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs font-black text-foreground uppercase tracking-wide bg-muted px-2 py-0.5 rounded-lg border border-border truncate max-w-[200px]">
              {batchId}
            </span>
            <div className="w-1 h-1 rounded-full bg-border" />
            <span className="text-xs font-black text-primary/60 uppercase tracking-[0.15em] opacity-80">Human-in-the-loop Review</span>
          </div>
        </div>
      </div>

      {/* Right: Stats + Export */}
      <div className="flex items-center gap-5 shrink-0">
        <div className="flex flex-col items-end">
          <span className="text-xs font-black text-muted-foreground/50 uppercase tracking-[0.15em]">STP Rate</span>
          <span className={cn("text-xs font-bold", stpRate >= 80 ? "text-emerald-500" : "text-amber-500")}>{stpRate}%</span>
        </div>

        <div className="h-10 w-px bg-border/50" />

        <div className="flex flex-col items-end">
          <span className="text-xs font-black text-muted-foreground/50 uppercase tracking-[0.15em]">Processed</span>
          <span className={cn("text-xs font-bold", processedCount === totalCount && totalCount > 0 ? "text-emerald-500" : "text-foreground")}>
            {processedCount}/{totalCount}
          </span>
        </div>

        <div className="h-10 w-px bg-border/50" />

        <button
          className="h-9 gap-2 border border-border/60 bg-background/40 hover:bg-accent text-xs font-semibold uppercase tracking-wide px-3 rounded-xl shadow-sm flex items-center transition-colors"
          title="Export validation report"
        >
          <Download size={13} />
          <span className="hidden lg:block">Export</span>
        </button>
      </div>
    </header>
  );
}

function WorkspaceTabBar({
  activeTab, onChange, queueCount, unclassifiedCount, validationCount, confidenceCount,
}: {
  activeTab: WorkspaceTab;
  onChange: (tab: WorkspaceTab) => void;
  queueCount: number;
  unclassifiedCount: number;
  validationCount: number;
  confidenceCount: number;
}) {
  const tabs: Array<{ id: WorkspaceTab; label: string; icon: React.ElementType; count: number; badge?: number }> = [
    { id: "queue", label: "Upload & Queue", icon: UploadCloud, count: queueCount, badge: unclassifiedCount > 0 ? unclassifiedCount : undefined },
    { id: "validation", label: "Validation Workspace", icon: ClipboardCheck, count: validationCount },
    { id: "confidence", label: "Confidence Transparency", icon: Activity, count: confidenceCount },
  ];

  return (
    <div
      className="h-10 px-6 flex items-center shrink-0 z-20"
      style={{
        background: "var(--studio-surface)",
        borderBottom: "1px solid var(--studio-border)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      }}
    >
      <div className="flex items-center gap-0">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="px-4 py-1.5 h-10 font-semibold uppercase tracking-wide transition-colors flex items-center gap-1.5 shrink-0 text-xs relative"
              style={{
                color: isActive ? "var(--primary)" : "var(--muted-foreground)",
                background: isActive ? "var(--background)" : "transparent",
                borderBottom: isActive ? "2px solid var(--primary)" : "2px solid transparent",
                boxShadow: isActive ? "inset 0 -1px 0 0 var(--primary)" : "none",
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "var(--studio-surface-raised)"; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <tab.icon size={13} style={{ color: isActive ? "var(--primary)" : "var(--muted-foreground)", opacity: isActive ? 1 : 0.6 }} />
              <span>{tab.label}</span>
              <span className={cn(
                "ml-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-black",
                isActive ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {tab.count}
              </span>
              {!!tab.badge && (
                <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-black bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  {tab.badge} new
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const METHODOLOGY_LAYERS: Array<{ label: string; description: string }> = [
  { label: "OCR (×15%)", description: "Raw text-recognition confidence reported by the OCR engine for the words behind each field." },
  { label: "Extraction (×25%)", description: "How well the field's geometry (position/size) matched what was expected for this document class." },
  { label: "Boundary (×10%)", description: "Whether the extracted value's bounding box cleanly aligns to a single field region without overlap." },
  { label: "Anchor (×10%)", description: "Whether a reliable nearby label/keyword anchor confirmed the field's identity." },
  { label: "Validation (×15%)", description: "Whether the value passed format/business-rule checks for this field type." },
  { label: "Training (×15%)", description: "How much labeled training history exists for this document class — more samples, higher trust." },
  { label: "Evidence (×10%)", description: "Cross-checks against corroborating evidence elsewhere on the document." },
];

function ConfidenceTransparencyTab({
  queueDocuments, summaryByDoc, activeDocument, activeSummary, selectedFieldId, fieldConfidenceById, onSelectDocument,
}: {
  queueDocuments: TrainingDocument[];
  summaryByDoc: Map<string, ValidationDocumentSummary>;
  activeDocument: TrainingDocument | null | undefined;
  activeSummary: ValidationDocumentSummary | undefined;
  selectedFieldId: string | null;
  fieldConfidenceById: Map<string, FieldConfidenceBreakdown>;
  onSelectDocument: (docId: string) => void;
}) {
  return (
    <div className="flex-1 flex flex-col gap-3 min-h-0">
      {queueDocuments.length === 0 ? (
        <div className="flex-1 bg-card rounded-[9px] border border-dashed border-border flex flex-col items-center justify-center text-center p-12">
          <Activity size={40} strokeWidth={1} className="text-muted-foreground/30 mb-4" />
          <h3 className="text-sm font-black text-foreground uppercase tracking-tight mb-1">No Documents Yet</h3>
          <p className="text-[10px] text-muted-foreground max-w-sm uppercase font-bold tracking-wider leading-relaxed opacity-60">
            Upload and classify a document to see how its confidence score is calculated.
          </p>
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
                  onClick={() => onSelectDocument(doc.documentId)}
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

          <div className="flex-1 min-h-0 flex gap-3 overflow-hidden">
            <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pr-1">
              {activeSummary ? (
                <ConfidenceTransparencyPanel
                  summary={activeSummary}
                  selectedFieldId={selectedFieldId}
                  fieldConfidenceById={fieldConfidenceById}
                />
              ) : (
                <div className="w-full h-full bg-card rounded-[9px] border border-dashed border-border flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-muted-foreground/50 p-6 text-center">
                  Select a document above to view its confidence breakdown
                </div>
              )}
            </div>

            <aside className="w-72 shrink-0 h-full overflow-y-auto custom-scrollbar bg-card rounded-[9px] border border-border/50 shadow-sm p-4">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground mb-1">How Confidence Is Calculated</h4>
              <p className="text-[9px] text-muted-foreground leading-relaxed mb-3">
                Overall confidence is a weighted sum of seven layers, then capped by the Evidence ceiling and reduced by any active drift penalty.
              </p>
              <div className="space-y-2.5">
                {METHODOLOGY_LAYERS.map(layer => (
                  <div key={layer.label}>
                    <p className="text-[8.5px] font-black uppercase tracking-tight text-foreground">{layer.label}</p>
                    <p className="text-[9px] text-muted-foreground leading-snug">{layer.description}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </>
      )}
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

function Footer({ activeDocumentName, onMarkProcessed, markProcessedDisabled, onFinalize }: {
  activeDocumentName?: string;
  onMarkProcessed: () => void;
  markProcessedDisabled: boolean;
  onFinalize: () => void;
}) {
  return (
    <footer className="pt-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
      {activeDocumentName && (
        <span className="text-[9px] font-bold text-muted-foreground/60 uppercase tracking-widest mr-auto truncate max-w-[40%]">
          Reviewing: <span className="text-foreground">{activeDocumentName}</span>
        </span>
      )}
      <button
        onClick={onMarkProcessed}
        disabled={markProcessedDisabled}
        title="Mark the active document as processed and advance to the next item in the queue"
        className="h-9 gap-2 border border-border/60 bg-background/40 hover:bg-accent text-xs font-semibold uppercase tracking-wide px-4 rounded-xl shadow-sm flex items-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <CheckCircle2 size={13} className="text-emerald-500" />
        Processed
      </button>
      <button
        onClick={onFinalize}
        className="h-9 gap-2 bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold uppercase tracking-wide px-5 rounded-xl shadow-lg shadow-primary/20 flex items-center transition-all group"
      >
        <Rocket size={13} />
        Finalize Validation &amp; Proceed
        <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </button>
    </footer>
  );
}
