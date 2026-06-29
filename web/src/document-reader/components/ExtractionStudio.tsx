"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, Search, X, Tag, FileText, CheckCircle2, ChevronRight, ChevronLeft,
  Layers, Settings, Info, Trash2, Edit3, Filter, Sparkles, AlertTriangle,
  MousePointer2, Box, Anchor, Table, Type, Eye, Save, Wand2,
  Activity, Grid2X2, FolderTree, ChevronDown, Zap, ShieldCheck, CheckSquare, ScanLine, Baseline, Hand, Circle,
  BookMarked, RefreshCw, GripVertical
} from "lucide-react";
import { usePipelineStore } from "../store/studioStore";
import { useDocumentReader } from "../store/documentReaderContext";
import { TrainingStage, OCRWord } from "../types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PREBUILT_MODELS, PrebuiltModel } from "../constants/prebuiltModels";

// Import the Elite Modular Studio Components
import { ExtractionCanvas } from "@/components/extraction-studio/ExtractionCanvas";
import { AnnotationLayer } from "@/components/extraction-studio/AnnotationLayer";
import { FieldHierarchy } from "@/components/extraction-studio/FieldHierarchy";
import { AnchorGraph } from "@/components/extraction-studio/AnchorGraph";
import { ExtractionConsole } from "@/components/extraction-studio/ExtractionConsole";
import { ExtractionRightSidebar } from "@/components/extraction-studio/ExtractionRightSidebar";

type StudioCategory = {
  id: string;
  name: string;
  parentId: string | null;
};

type StudioField = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  enabled?: boolean;
  confidence: number;
  value?: string;
  categoryId?: string | null;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  regex?: string;
  dateFormat?: string;
  locatorStrategy?: "anchor" | "coordinate" | "hybrid";
  pageStrategy?: "current" | "detect_by_text" | "any_page";
  searchDirection?: "right" | "below" | "same_line" | "nearest";
  expansionMode?: "box" | "line" | "multiline" | "until_next_label";
  stopAtNextLabel?: boolean;
  allowLongText?: boolean;
};

type MappedStudioField = StudioField & {
  x: number;
  y: number;
  width: number;
  height: number;
};

type StudioAnchor = {
  id: string;
  value: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
};

type StudioLink = {
  fieldId: string;
  anchorId: string;
  relationship: string;
  confidence: number;
};

type DocumentExtractionDesign = {
  categories: StudioCategory[];
  fields: StudioField[];
  anchors: StudioAnchor[];
  links: StudioLink[];
  selectedFieldId: string | null;
  selectedCategoryId: string | null;
};

const hasMappedArea = (field: StudioField): field is MappedStudioField =>
  typeof field.x === "number" &&
  typeof field.y === "number" &&
  typeof field.width === "number" &&
  typeof field.height === "number";

type SelectionBox = { x: number; y: number; width: number; height: number };
type TraceLine = { id: string; path: string; color: string; active: boolean };
type CalloutLabel = {
  id: string; name: string; color: string; isAnchor: boolean; active: boolean;
  side: "left" | "right";
  chipX: number; chipY: number;   // workspace-relative top-left of chip
  annEdgeX: number; annEdgeY: number; // workspace-relative point on annotation box edge
};
type RelationshipLine = {
  id: string;
  color: string;
  active: boolean;
  path: string;
  label: string;
  fieldName: string;
  labelX: number;
  labelY: number;
};

type PrebuiltRoutingConfig = {
  targetId: string;
  targetName: string;
  source: "document_type" | "document";
  mode?: "prebuilt" | "blank_custom";
  modelCode?: string;
  modelName?: string;
  modelVersion?: string;
  confidenceThreshold?: number;
  fields?: string[];
};

// ─── Custom Reusable Model ────────────────────────────────────────────────────
type CustomReusableModel = {
  id: string;
  name: string;
  documentClasses: string[]; // all class names that should trigger this model
  isGeneric?: boolean;       // match by anchor similarity rather than exact class name
  createdAt: string;
  categories: StudioCategory[];
  fields: StudioField[];
  anchors: StudioAnchor[];
  links: StudioLink[];
};

const CUSTOM_MODELS_KEY = "documentReader.customModels";

function loadCustomModels(): CustomReusableModel[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_MODELS_KEY) || "[]"); } catch { return []; }
}

function saveCustomModels(models: CustomReusableModel[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(models));
}

function matchCustomModel(documentClass: string, ocrText: string): CustomReusableModel | null {
  const models = loadCustomModels();
  const normalized = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const docNorm = normalized(documentClass);
  // Primary: exact class name match (non-generic models only)
  const byClass = models.find(m => !m.isGeneric && m.documentClasses.some(c => normalized(c) === docNorm));
  if (byClass) return byClass;
  // Secondary: anchor text fuzzy match — generic ≥40%, specific ≥60%
  const ocrNorm = normalized(ocrText);
  const scored = models
    .filter(m => m.anchors.length > 0)
    .map(m => {
      const hits = m.anchors.filter(a => ocrNorm.includes(normalized(a.value)));
      return { m, score: hits.length / m.anchors.length };
    })
    .filter(({ m, score }) => score >= (m.isGeneric ? 0.4 : 0.6));
  if (scored.length === 0) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].m;
}
// ─────────────────────────────────────────────────────────────────────────────

const searchTokens = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 1);

export function ExtractionStudio() {
  const {
    trainingDocuments,
    activeDocument,
    activePage,
    setActiveDocument,
    executeOCR,
    updateTrainingDocument,
    infrastructure,
    saveState,
    documentClasses,
    addClass
  } = usePipelineStore();
  
  const { updateStepStatus, setActiveStage } = useDocumentReader();

  const [activeTool, setActiveTool] = useState("select");
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRefetchingOCR, setIsRefetchingOCR] = useState(false);
  const [activeLayer, setActiveLayer] = useState<"ocr" | "extraction" | "ai" | "validation">("extraction");
  const idCounterRef = React.useRef(0);
  const appliedPrebuiltRouteRef = React.useRef<Record<string, string>>({});
  const appliedCustomModelRef = React.useRef<Record<string, string>>({});
  const documentDesignsRef = React.useRef<Record<string, DocumentExtractionDesign>>({});
  const lastDesignDocIdRef = React.useRef<string | null>(activeDocument?.documentId || null);
  const workspaceRef = React.useRef<HTMLDivElement | null>(null);
  const canvasPanelRef = React.useRef<HTMLDivElement | null>(null);
  const previewRowRefs = React.useRef<Record<string, HTMLDivElement | null>>({});
  const reviewRowsRef = React.useRef<Array<StudioField & { id: string }>>([]);
  const activeTraceFieldIdRef = React.useRef<string | null>(null);
  const measureTraceLinesRef = React.useRef<() => void>(() => {});
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);

  // Keyboard Shortcuts — tool switching uses stable setter refs, deletion uses a ref to avoid stale closures
  const selectedFieldIdRef = React.useRef(selectedFieldId);
  React.useEffect(() => { selectedFieldIdRef.current = selectedFieldId; }, [selectedFieldId]);

  useEffect(() => {
    const toolKeys: Record<string, string> = {
      V: "select", H: "pan", F: "field", S: "smart",
      A: "anchor", T: "table", C: "checkbox", R: "radio",
      B: "barcode", Z: "signature"
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const key = e.key.toUpperCase();
      if (toolKeys[key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setActiveTool(toolKeys[key]);
        if (toolKeys[key] !== "anchor") setAnchorCaptureTargetFieldId(null);
        return;
      }
      const currentFieldId = selectedFieldIdRef.current;
      if ((e.key === "Backspace" || e.key === "Delete") && currentFieldId) {
        if (currentFieldId.startsWith("anchor_")) {
          setAnchors(prev => prev.filter(a => a.id !== currentFieldId));
          setLinks(prev => prev.filter(l => l.anchorId !== currentFieldId));
        } else {
          setLinks(prev => {
            const orphanAnchorIds = prev.filter(l => l.fieldId === currentFieldId).map(l => l.anchorId);
            setAnchors(a => a.filter(anchor => !orphanAnchorIds.includes(anchor.id)));
            return prev.filter(l => l.fieldId !== currentFieldId);
          });
          setFields(prev => prev.filter(f => f.id !== currentFieldId));
        }
        setSelectedFieldId(null);
      } else if (e.key === "Escape") {
        setSelectedFieldId(null);
        setPendingAnnotation(null);
        setAnchorCaptureTargetFieldId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const [hoveredFieldId, setHoveredFieldId] = useState<string | null>(null);
  const [traceLines, setTraceLines] = useState<TraceLine[]>([]);
  const [relationshipLines, setRelationshipLines] = useState<RelationshipLine[]>([]);
  const [calloutLabels, setCalloutLabels] = useState<CalloutLabel[]>([]);
  const [hoveredCalloutId, setHoveredCalloutId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [documentViewMode, setDocumentViewMode] = useState<"enhanced" | "original">("enhanced");
  const [pendingAnnotation, setPendingAnnotation] = useState<{
    box: { x: number; y: number; width: number; height: number };
    clientPos: { x: number; y: number };
    extractedText: string;
    detectedObject: string;
    suggestedType: string;
    confidence: number;
    relatedObjects: string[];
    autoAnchorText?: string;
    autoAnchorBox?: SelectionBox;
  } | null>(null);
  const [anchorCaptureTargetFieldId, setAnchorCaptureTargetFieldId] = useState<string | null>(null);
  const [anchorCaptureRelationship, setAnchorCaptureRelationship] = useState("Primary Anchor");
  
  // Drag states for Selection Intelligence modal
  const [isDraggingIntelligence, setIsDraggingIntelligence] = useState(false);
  const [intelligenceDragOffset, setIntelligenceDragOffset] = useState({ x: 0, y: 0 });

  const [overlayToggles, setOverlayToggles] = useState({
    ocrWords: false,
    ocrConfidence: false,
    documentStructure: false,
    objectDetection: true,
    anchorRelationships: true,
    heatMap: false
  });
  const [darkenContent, setDarkenContent] = useState(true);
  const [ocrBoostEnabled, setOcrBoostEnabled] = useState(true);
  const [textEnhancementLevel, setTextEnhancementLevel] = useState(72);
  const [leftPanelWidth, setLeftPanelWidth] = useState(380);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);

  const [customPrompt, setCustomPrompt] = useState<{
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue: string;
    onConfirm: (value: string) => void;
    onCancel?: () => void;
  } | null>(null);

  const [regexHelpFieldId, setRegexHelpFieldId] = useState<string | null>(null);

  type ExtractionLang = "auto" | "en" | "fr" | "es" | "de";
  // Always start at "auto" so server and client render the same initial markup; the persisted
  // value (if any) is applied after mount in an effect, avoiding a localStorage hydration mismatch.
  const [extractionLanguage, setExtractionLanguage] = useState<ExtractionLang>("auto");
  useEffect(() => {
    try {
      const stored = localStorage.getItem("du.extractionLanguage") as ExtractionLang | null;
      if (stored) setExtractionLanguage(stored);
    } catch { /* */ }
  }, []);
  const setAndPersistLang = (lang: ExtractionLang) => {
    setExtractionLanguage(lang);
    try { localStorage.setItem("du.extractionLanguage", lang); } catch { /* */ }
  };

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const [extractAfterOCR, setExtractAfterOCR] = useState(false);
  const [saveModelDialog, setSaveModelDialog] = useState<{
    name: string;
    isGeneric: boolean;
  } | null>(null);

  const [categories, setCategories] = useState<StudioCategory[]>([]);
  const [draggedFieldId, setDraggedFieldId] = useState<string | null>(null);
  const [dragOverGroupId, setDragOverGroupId] = useState<string | null>(null);

  const [fields, setFields] = useState<StudioField[]>([]);
  const [anchors, setAnchors] = useState<StudioAnchor[]>([]);
  const [links, setLinks] = useState<StudioLink[]>([]);

  // Must start null so the design-loading effect fires on first mount even when
  // activeDocument is already set in the store (e.g. after back-navigation).
  const [currentDocId, setCurrentDocId] = useState<string | null>(null);
  const nextId = (prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}_${idCounterRef.current}`;
  };

  const isDuplicateFieldName = (name: string, excludeId?: string) => {
    const normalized = name.trim().toLowerCase();
    return fields.some(f => f.id !== excludeId && f.name.trim().toLowerCase() === normalized);
  };

  const captureCurrentDesign = React.useCallback((): DocumentExtractionDesign => {
    // Keep the LAST entry for any colliding ids (most recent edit wins) so a
    // stale id-counter that produced a duplicate id doesn't silently hide
    // newly-added/edited fields once this design is read elsewhere (e.g. Validation Studio).
    const dedupLast = <T extends { id: string }>(arr: T[]) => arr.filter((x, i, a) => a.findLastIndex(y => y.id === x.id) === i);
    return {
      categories: dedupLast(categories),
      fields: dedupLast(fields),
      anchors: dedupLast(anchors),
      links,
      selectedFieldId,
      selectedCategoryId
    };
  }, [anchors, categories, fields, links, selectedCategoryId, selectedFieldId]);

  React.useEffect(() => {
    const nextDocId = activeDocument?.documentId || null;
    const previousDocId = lastDesignDocIdRef.current;

    if (previousDocId && previousDocId !== nextDocId) {
      documentDesignsRef.current[previousDocId] = captureCurrentDesign();
    }

    if (nextDocId && nextDocId !== currentDocId) {
      const savedDesign = documentDesignsRef.current[nextDocId] || activeDocument?.metadata?.extractionDesign;
      const dedup = <T extends { id: string }>(arr: T[]) => arr.filter((x, i, a) => a.findIndex(y => y.id === x.id) === i);
      const dedupedCategories = dedup(savedDesign?.categories || []);
      const dedupedFields = dedup(savedDesign?.fields || []);
      const dedupedAnchors = dedup(savedDesign?.anchors || []);
      setCategories(dedupedCategories);
      setFields(dedupedFields);
      setAnchors(dedupedAnchors);
      setLinks(savedDesign?.links || []);

      // Re-sync the ID counter past any numeric suffix already used in the
      // loaded design, so newly created fields/anchors/categories never
      // collide with (and get silently deduped against) existing ones.
      let maxId = 0;
      [...dedupedCategories, ...dedupedFields, ...dedupedAnchors].forEach(item => {
        const match = /_(\d+)$/.exec(item.id);
        if (match) maxId = Math.max(maxId, parseInt(match[1], 10));
      });
      idCounterRef.current = Math.max(idCounterRef.current, maxId);
      setSelectedFieldId(savedDesign?.selectedFieldId || null);
      setSelectedCategoryId(savedDesign?.selectedCategoryId || null);
      setAnchorCaptureTargetFieldId(null);
      setPendingAnnotation(null);
      setHoveredFieldId(null);
      setTraceLines([]);
      setCurrentDocId(nextDocId);
    }

    lastDesignDocIdRef.current = nextDocId;
  }, [activeDocument, captureCurrentDesign, currentDocId]);

  // Auto-extract when the page changes and there are positioned fields with no values
  React.useEffect(() => {
    if (!activePage || !fields.length) return;
    const hasTextLayer = (activePage.textLayer || []).length > 0;
    const hasUnfilledPositioned = fields.some(
      f => f.x !== undefined && !f.value
    );
    if (hasTextLayer && hasUnfilledPositioned) {
      extractAllFieldValues(false);
    }
  // Only fire when the page or fields array changes, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage?.pageNumber, activePage?.textLayer?.length, fields.length]);

  React.useEffect(() => {
    if (!currentDocId) return;
    const currentDesign = captureCurrentDesign();
    documentDesignsRef.current[currentDocId] = currentDesign;

    if (activeDocument && activeDocument.documentId === currentDocId) {
      const existingDesign = activeDocument.metadata?.extractionDesign;
      const hasChanged = JSON.stringify(existingDesign) !== JSON.stringify(currentDesign);
      
      if (hasChanged) {
        updateTrainingDocument(currentDocId, {
          metadata: {
            ...activeDocument.metadata,
            extractionDesign: currentDesign
          }
        });
      }
    }
  }, [captureCurrentDesign, currentDocId, activeDocument, updateTrainingDocument]);

  const inferSelection = (text: string) => {
    const value = text.trim();
    if (activeTool === "signature" || /sign|signature|reshmi/i.test(value)) {
      return { detectedObject: "Signature", suggestedType: "signature", confidence: 98.2, relatedObjects: ["Name", "Passport Number", "Photo"] };
    }
    if (activeTool === "table") {
      return { detectedObject: "Table", suggestedType: "table", confidence: 96.4, relatedObjects: ["Header", "Rows", "Totals"] };
    }
    if (activeTool === "checkbox") {
      return { detectedObject: "Checkbox Group", suggestedType: "checkbox", confidence: 94.8, relatedObjects: ["Selected Values", "Label", "Validation"] };
    }
    if (activeTool === "radio") {
      return { detectedObject: "Radio Group", suggestedType: "radio", confidence: 94.2, relatedObjects: ["Selected Option", "Options", "Label"] };
    }
    if (activeTool === "barcode") {
      return { detectedObject: "Barcode / QR Code", suggestedType: "barcode", confidence: 97.0, relatedObjects: ["Code Value", "Format", "Orientation"] };
    }
    if (/\b\d{2}\/\d{2}\/\d{4}\b/.test(value)) {
      return { detectedObject: "Date", suggestedType: "date", confidence: 97.1, relatedObjects: ["Issue Date", "Expiry Date", "Validation"] };
    }
    if (/[A-Z]\d{7}/.test(value.replace(/\s/g, ""))) {
      return { detectedObject: "Passport Number", suggestedType: "id", confidence: 98.8, relatedObjects: ["Passport No", "Nationality", "MRZ"] };
    }
    return { detectedObject: value ? "OCR Text" : "Document Region", suggestedType: activeTool === "field" ? "text" : activeTool, confidence: value ? 91.6 : 0, relatedObjects: ["Anchor", "Validation", "Nearby Field"] };
  };

  React.useEffect(() => {
    if (!isDraggingIntelligence) return;
    const handleMouseMove = (e: MouseEvent) => {
      setPendingAnnotation(prev => prev ? {
        ...prev,
        clientPos: {
          x: e.clientX - intelligenceDragOffset.x,
          y: e.clientY - intelligenceDragOffset.y
        }
      } : prev);
    };
    const handleMouseUp = () => setIsDraggingIntelligence(false);
    
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDraggingIntelligence, intelligenceDragOffset]);

  // ─── Bilingual value normalisation ───────────────────────────────────────────
  // Many documents (Canadian passport, EU IDs, Swiss forms …) print field values
  // in two languages separated by "/" — e.g. "29 MAY/MAI 1977", "CANADIAN/CANADIENNE".
  // These functions detect which language is dominant in the current page and strip
  // the secondary-language alternate so only one clean value is stored.

  const detectDocumentLanguage = React.useCallback((): "en" | "fr" | "es" | "de" | "other" => {
    const raw = [
      activePage?.ocrText || "",
      ...(activePage?.textLayer || []).map(w => w.text || "")
    ].join(" ").toLowerCase();

    const score = (words: string[]) => words.filter(w => raw.includes(w)).length;

    const fr = score(["passeport", "nationalite", "nationalité", "delivrance", "délivrance",
      "naissance", "prénom", "prenoms", "prénoms", "expiration", "délivré",
      "autorité", "autorite", "titulaire", "émetteur", "emetteur", "pays d"]);
    const en = score(["passport", "nationality", "date of issue", "date of birth",
      "given names", "surname", "expiry", "authority", "issuing country",
      "place of birth", "place of issue", "bearer"]);
    const es = score(["pasaporte", "apellido", "nombre", "fecha", "nacimiento",
      "expedición", "vencimiento", "nacionalidad"]);
    const de = score(["reisepass", "familienname", "geburtsort", "staatsangehörigkeit",
      "ausstellungsdatum", "ablaufdatum"]);

    const best = Math.max(en, fr, es, de);
    if (best === 0) return "other";
    if (en === best) return "en";
    if (fr === best) return "fr";
    if (es === best) return "es";
    if (de === best) return "de";
    return "other";
  }, [activePage]);

  // Known bilingual pairs: key = uppercase token, value = {en, fr, es, de}
  const BILINGUAL_MONTHS: Record<string, Record<string, string>> = {
    JAN:  { en: "JAN",  fr: "JANV" },
    FEB:  { en: "FEB",  fr: "FÉVR" },
    MAR:  { en: "MAR",  fr: "MARS" },
    APR:  { en: "APR",  fr: "AVR"  },
    MAY:  { en: "MAY",  fr: "MAI"  },
    JUN:  { en: "JUN",  fr: "JUIN" },
    JUL:  { en: "JUL",  fr: "JUIL" },
    AUG:  { en: "AUG",  fr: "AOÛT" },
    SEP:  { en: "SEP",  fr: "SEPT" },
    OCT:  { en: "OCT",  fr: "OCT"  },
    NOV:  { en: "NOV",  fr: "NOV"  },
    DEC:  { en: "DEC",  fr: "DÉC"  },
    // Reverse French→English lookup
    JANV: { en: "JAN",  fr: "JANV" },
    FÉVR: { en: "FEB",  fr: "FÉVR" },
    MARS: { en: "MAR",  fr: "MARS" },
    AVR:  { en: "APR",  fr: "AVR"  },
    MAI:  { en: "MAY",  fr: "MAI"  },
    JUIN: { en: "JUN",  fr: "JUIN" },
    JUIL: { en: "JUL",  fr: "JUIL" },
    AOÛT: { en: "AUG",  fr: "AOÛT" },
    SEPT: { en: "SEP",  fr: "SEPT" },
    DÉC:  { en: "DEC",  fr: "DÉC"  }
  };

  // ─── Date formatter ───────────────────────────────────────────────────────────
  // Parses the raw OCR date string and re-formats it to the field's configured format.
  // Handles: "29 MAY 1977", "29/05/1977", "1977-05-29", "MAY 29 1977", etc.
  const MONTH_TO_NUM: Record<string, number> = {
    JAN: 1, JANV: 1, FEB: 2, FÉVR: 2, FÉV: 2, MAR: 3, MARS: 3,
    APR: 4, AVR: 4, MAY: 5, MAI: 5, JUN: 6, JUIN: 6,
    JUL: 7, JUIL: 7, AUG: 8, AOÛT: 8, SEP: 9, SEPT: 9,
    OCT: 10, NOV: 11, DEC: 12, DÉC: 12
  };
  const NUM_TO_MONTH = ["", "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
                              "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

  const formatFieldValue = React.useCallback((field: StudioField): string => {
    const raw = (field.value || "").trim();
    if (!raw) return "";
    if (field.type !== "date" || !field.dateFormat) return raw;

    // OCR error correction: fix common character confusions in date strings
    const ALL_MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC",
                        "JANV","FEVR","MARS","AVR","MAI","JUIN","JUIL","AOUT","SEPT","DEC"];
    const correctMonthToken = (tok: string): string => {
      const up = tok.toUpperCase().replace(/À/g,"A").replace(/Ô/g,"O").replace(/É/g,"E").replace(/Û/g,"U");
      if (ALL_MONTHS.includes(up)) return up;
      // Allow up to 2 character substitutions (handles OCR noise like kpr→APR)
      const best = ALL_MONTHS.find(m => {
        if (Math.abs(m.length - up.length) > 1) return false;
        let diffs = Math.abs(m.length - up.length);
        for (let i = 0; i < Math.min(m.length, up.length); i++) { if (m[i] !== up[i]) diffs++; }
        return diffs <= 2;
      });
      return best || tok;
    };
    // Fix "T1" → "01" (zero/letter O confusion with leading digit)
    const corrected = raw
      .replace(/\bT(\d)\b/g, "0$1")
      .replace(/\bO(\d)\b/gi, "0$1")
      // Correct garbled month tokens
      .replace(/\b([A-ZÀ-ÖØ-Ýa-zà-öø-ý]{2,5})\b/g, (tok) => correctMonthToken(tok))
      // Expand 3-digit truncated years in range 190x–209x
      .replace(/\b(\d{3})\b/g, (m) => { const n = parseInt(m); return (n >= 190 && n <= 210) ? m + "0" : m; });

    let day = 0, month = 0, year = 0;
    let parsed = false;

    const tryParse = (d: number, m: number, y: number) => {
      if (d > 0 && d <= 31 && m > 0 && m <= 12 && y > 0) { day = d; month = m; year = y; parsed = true; }
    };

    // "29 MAY 1977" or "MAY 29 1977" — try corrected first, raw as fallback
    const parseAlpha = (s: string) => {
      if (parsed) return;
      const m1 = s.match(/^(\d{1,2})\s+([A-ZÀ-Ö]{2,5})\s+(\d{4})$/i);
      if (m1) { const mn = MONTH_TO_NUM[(m1[2]).toUpperCase()]; if (mn) tryParse(+m1[1], mn, +m1[3]); }
      if (parsed) return;
      const m2 = s.match(/^([A-ZÀ-Ö]{2,5})\s+(\d{1,2})\s+(\d{4})$/i);
      if (m2) { const mn = MONTH_TO_NUM[(m2[1]).toUpperCase()]; if (mn) tryParse(+m2[2], mn, +m2[3]); }
      if (parsed) return;
      // Adjacent bilingual months: "29 MAY MAI 1977" or "29 MAI MAY 1977"
      const m3 = s.match(/^(\d{1,2})\s+([A-ZÀ-Ö]{2,5})\s+([A-ZÀ-Ö]{2,5})\s+(\d{4})$/i);
      if (m3) {
        const mn = MONTH_TO_NUM[(m3[2]).toUpperCase()] || MONTH_TO_NUM[(m3[3]).toUpperCase()];
        if (mn) tryParse(+m3[1], mn, +m3[4]);
      }
      if (parsed) return;
      // Bilingual slash in month token itself: "29 MAY/MAI 1977" or "01 APR/AVR 2036"
      const m4 = s.match(/^(\d{1,2})\s+([A-ZÀ-Ö]{2,5})\/([A-ZÀ-Ö]{2,5})\s+(\d{4})$/i);
      if (m4) {
        const mn = MONTH_TO_NUM[(m4[2]).toUpperCase()] || MONTH_TO_NUM[(m4[3]).toUpperCase()];
        if (mn) tryParse(+m4[1], mn, +m4[4]);
      }
    };
    parseAlpha(corrected);
    if (!parsed) parseAlpha(raw);
    // "29/05/1977", "29-05-1977", "29.05.1977"
    if (!parsed) {
      const sep = (corrected || raw).match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
      if (sep) tryParse(+sep[1], +sep[2], +sep[3]);
    }
    // "1977/05/29", "1977-05-29"
    if (!parsed) {
      const iso = (corrected || raw).match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
      if (iso) tryParse(+iso[3], +iso[2], +iso[1]);
    }
    // "05/29/1977" (US format) — try if day > 12 to detect
    if (!parsed) {
      const us = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (us && +us[1] <= 12 && +us[2] > 12) tryParse(+us[2], +us[1], +us[3]);
    }

    if (!parsed) return raw; // can't parse → show original

    const dd  = String(day).padStart(2, "0");
    const mm  = String(month).padStart(2, "0");
    const yyyy = String(year);
    const yy   = yyyy.slice(-2);
    const mmm  = NUM_TO_MONTH[month] || mm;

    return (field.dateFormat)
      .replace("YYYY", yyyy)
      .replace("YY",   yy)
      .replace("MMM",  mmm)
      .replace("MM",   mm)
      .replace("DD",   dd);
  }, []);
  // ─────────────────────────────────────────────────────────────────────────────

  const normalizeBilingualValue = React.useCallback((text: string): string => {
    if (!text) return text;

    // Resolve effective language: explicit user setting takes precedence over auto-detection.
    // Fall back to "en" when detection is ambiguous — English is the convention-first language
    // in most bilingual passports and IDs (EN/FR, EN/ES, etc.).
    const detected = detectDocumentLanguage();
    const lang: string = extractionLanguage !== "auto"
      ? extractionLanguage
      : (detected === "other" ? "en" : detected);

    // ── Slash-separated pairs: "MAY/MAI", "CANADIAN/CANADIENNE" ─────────────
    const result = text.replace(/\b([A-ZÀ-ÖØ-Ýa-zà-öø-ý]+)\/([A-ZÀ-ÖØ-Ýa-zà-öø-ý]+)\b/g, (_match, part1, part2) => {
      const p1 = part1.toUpperCase();
      const p2 = part2.toUpperCase();
      const pair = BILINGUAL_MONTHS[p1] || BILINGUAL_MONTHS[p2];
      if (pair) {
        const keep = pair[lang] ?? pair["en"];
        if (p1 === keep) return part1;
        if (p2 === keep) return part2;
        return keep;
      }
      // General word pair: EN=first, FR=second, default keep first (more complete)
      if (lang === "fr") return part2;
      return part1;
    });

    // ── Space-adjacent bilingual months: "29 MAY MAI 1977" → "29 MAY 1977" ──
    const MONTH_KEYS = new Set(Object.keys(BILINGUAL_MONTHS));
    const result2 = result.replace(
      /\b([A-ZÀ-ÖØ-Ý]{2,5})\s+([A-ZÀ-ÖØ-Ý]{2,5})\b/g,
      (_m, t1: string, t2: string) => {
        const u1 = t1.toUpperCase();
        const u2 = t2.toUpperCase();
        if (!MONTH_KEYS.has(u1) && !MONTH_KEYS.has(u2)) return _m;
        const pair = BILINGUAL_MONTHS[u1] || BILINGUAL_MONTHS[u2];
        if (!pair) return _m;
        const keep = pair[lang] ?? pair["en"];
        if (u1 === keep) return t1;
        if (u2 === keep) return t2;
        return keep;
      }
    );

    return result2.replace(/\s+/g, " ").trim();
  }, [detectDocumentLanguage, extractionLanguage]);
  // ─────────────────────────────────────────────────────────────────────────────

  // ─── Extract all field values from the current text layer ────────────────────
  // Reads `activePage.textLayer` and populates the value of every positioned field
  // that currently has no value (or forces a re-read when forceAll=true).
  const extractAllFieldValues = React.useCallback((forceAll = false) => {
    setIsExtracting(true);
    let updated = 0;

    setFields(prev => prev.map(field => {
      // Skip fields with no position, or with a value already (unless forced)
      if (field.x === undefined || field.y === undefined ||
          field.width === undefined || field.height === undefined) return field;
      if (!forceAll && field.value) return field;

      const box = { x: field.x, y: field.y, width: field.width, height: field.height };
      const words = (activePage?.textLayer || [])
        .map(normalizeWordBox)
        .filter(w => {
          const cx = w.x + w.width / 2;
          const cy = w.y + w.height / 2;
          const inBox = cx >= box.x && cx <= box.x + box.width &&
                 cy >= box.y && cy <= box.y + box.height;
          if (!inBox) return false;
          // Anchors mark constant/label text — never include anchor-covered words
          // in a field's extracted value, even if they fall inside the field's box.
          return !anchors.some(a => wordInsideBox(w, a));
        });

      const rawText = words
        .sort((a, b) => {
          const sameLine = Math.abs(a.y - b.y) < Math.max(a.height, b.height, 1.2);
          return sameLine ? a.x - b.x : a.y - b.y;
        })
        .map(w => w.text || "").join(" ").trim();

      if (!rawText) return field;

      const normalised = normalizeBilingualValue(rawText);
      const value = field.type === "date" && field.dateFormat
        ? formatFieldValue({ ...field, value: normalised })
        : normalised;
      const confidence = words.length > 0
        ? words.reduce((s, w) => {
            const c = w.confidence ?? 0;
            return s + (c > 1 ? c / 100 : c);
          }, 0) / words.length
        : field.confidence;

      updated++;
      return { ...field, value, confidence };
    }));

    setIsExtracting(false);
    toast.success(updated > 0
      ? `Extracted values for ${updated} field${updated !== 1 ? "s" : ""}.`
      : "All positioned fields already have values. Use Re-fetch OCR to re-read.");
  }, [activePage, normalizeBilingualValue, formatFieldValue, anchors]);

  // ─── Re-fetch OCR then extract ────────────────────────────────────────────────
  // Uses a flag + useEffect so extraction runs against the freshly-updated
  // activePage.textLayer from the store, avoiding the stale-closure problem.
  const handleRefetchOCR = React.useCallback(async () => {
    setIsRefetchingOCR(true);
    try {
      await executeOCR();
      setExtractAfterOCR(true);
      toast.success("OCR complete. Extracting field values…");
    } catch {
      toast.error("OCR failed — check the OCR Configuration stage.");
      setIsRefetchingOCR(false);
    }
  }, [executeOCR]);

  // Runs after the store has propagated new OCR data into activePage
  useEffect(() => {
    if (!extractAfterOCR || !activePage?.textLayer) return;
    setExtractAfterOCR(false);
    extractAllFieldValues(true);
    setIsRefetchingOCR(false);
    toast.success("Field values updated from fresh OCR.");
  }, [extractAfterOCR, activePage?.textLayer]);
  // ─────────────────────────────────────────────────────────────────────────────

  const normalizeWordBox = (word: OCRWord): OCRWord => {
    const pageWidth = activePage?.width || 0;
    const pageHeight = activePage?.height || 0;
    const usesPixelX = pageWidth > 0 && (word.x > 100 || word.width > 100);
    const usesPixelY = pageHeight > 0 && (word.y > 100 || word.height > 100);

    return {
      ...word,
      x: usesPixelX ? (word.x / pageWidth) * 100 : word.x,
      y: usesPixelY ? (word.y / pageHeight) * 100 : word.y,
      width: usesPixelX ? (word.width / pageWidth) * 100 : word.width,
      height: usesPixelY ? (word.height / pageHeight) * 100 : word.height
    };
  };

  // True if a word sits on top of (or mostly inside) a region marked as an anchor —
  // i.e. constant/label text. Anchors are never dynamic field values, so words
  // matching this must be excluded from any field's captured value, even if they
  // fall inside that field's own drawn box.
  const ANCHOR_EXCLUDE_OVERLAP = 0.4;
  const wordInsideBox = (word: OCRWord, box: SelectionBox): boolean => {
    const cx = word.x + word.width / 2;
    const cy = word.y + word.height / 2;
    if (cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height) return true;
    const left = Math.max(word.x, box.x);
    const right = Math.min(word.x + word.width, box.x + box.width);
    const top = Math.max(word.y, box.y);
    const bottom = Math.min(word.y + word.height, box.y + box.height);
    const area = Math.max(0, right - left) * Math.max(0, bottom - top);
    return area / Math.max(0.01, word.width * word.height) >= ANCHOR_EXCLUDE_OVERLAP;
  };

  const getWordsInSelection = (box: SelectionBox, excludeLabels = false, excludeBoxes: SelectionBox[] = []): OCRWord[] => {
    const normalizedWords = (activePage?.textLayer || [])
      .map(normalizeWordBox)
      .filter(w => !(excludeLabels && excludeBoxes.length > 0 && excludeBoxes.some(b => wordInsideBox(w, b))));

    const readingOrder = (a: OCRWord, b: OCRWord) => {
      const sameLine = Math.abs(a.y - b.y) < Math.max(a.height, b.height, 1.2);
      return sameLine ? a.x - b.x : a.y - b.y;
    };

    const wordOverlap = (word: OCRWord, b: SelectionBox) => {
      const left = Math.max(word.x, b.x);
      const right = Math.min(word.x + word.width, b.x + b.width);
      const top = Math.max(word.y, b.y);
      const bottom = Math.min(word.y + word.height, b.y + b.height);
      const area = Math.max(0, right - left) * Math.max(0, bottom - top);
      return area / Math.max(0.01, word.width * word.height);
    };

    const isLabel = (text = "") => {
      const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
      const tokens = t.split(/\s+/).filter(Boolean);
      const labelTokens = [
        "passport", "passeport", "no", "number", "nom", "surname", "given", "names", "prenoms",
        "nationality", "nationalite", "date", "birth", "naissance", "place", "lieu", "issue",
        "delivrance", "expiry", "expiration", "authority", "autorite", "sex", "sexe", "pays",
        "issuing", "country", "type", "code", "signature", "holder", "titulaire"
      ];
      return tokens.some(token =>
        labelTokens.includes(token) ||
        // Fuzzy substring match only for tokens long enough that a containment match is
        // meaningful — otherwise short field values like "M"/"F" (sex) or "15" (a date)
        // get flagged as labels just because their characters appear inside a label word.
        (token.length > 2 && labelTokens.some(bt => bt.length > 2 && (token.includes(bt) || bt.includes(token))))
      );
    };

    // Detect strikethrough / cancelled words — exclude from field capture.
    // Sources: explicit OCR engine flags, very low confidence on short text, or dash/line-only patterns.
    const isStrikethrough = (word: OCRWord): boolean => {
      const w = word as OCRWord & { strikethrough?: boolean; struck?: boolean; decoration?: string; flags?: string };
      if (w.strikethrough === true || w.struck === true) return true;
      if (w.decoration === "strikethrough" || (w.flags || "").includes("struck")) return true;
      const text = (w.text || "").trim();
      // Purely dash / underscore / em-dash sequences → OCR rendering of a strikethrough line
      if (/^[-_–—~]{2,}$/.test(text)) return true;
      // Very low confidence on a short word with no alphanumeric meaning = likely artefact over struck text
      const ww = w as OCRWord & { conf?: number };
      const conf = typeof w.confidence === "number" ? w.confidence : typeof ww.conf === "number" ? ww.conf : 1;
      const normConf = conf > 1 ? conf / 100 : conf;
      if (normConf < 0.22 && text.length <= 3 && !/[a-z0-9]/i.test(text)) return true;
      return false;
    };

    // ─── ANCHOR MODE ──────────────────────────────────────────────────────────────
    // Anchors are fixed label texts — keep capture very tight to the drawn box.
    // Only include words where ≥ 65% of the word's area sits inside the selection.
    if (!excludeLabels) {
      const anchored = normalizedWords
        .filter(w => {
          const cov = wordOverlap(w, box);
          const notTooWide = w.width <= Math.max(2.5, box.width * 1.4);
          const notTooTall = w.height <= Math.max(1.8, box.height * 1.8);
          return cov >= 0.65 && notTooWide && notTooTall && !isStrikethrough(w);
        })
        .sort(readingOrder);

      if (anchored.length > 0) return anchored;

      // Tiny fallback padding (0.1%) — avoids missing the anchor due to 1-pixel rounding
      return normalizedWords
        .filter(w => {
          const padded = { x: box.x - 0.1, y: box.y - 0.1, width: box.width + 0.2, height: box.height + 0.2 };
          return wordOverlap(w, padded) >= 0.65 &&
            w.width <= Math.max(2.5, box.width * 1.4) &&
            w.height <= Math.max(1.8, box.height * 1.8) &&
            !isStrikethrough(w);
        })
        .sort(readingOrder);
    }

    // ─── FIELD MODE ───────────────────────────────────────────────────────────────
    // Fields contain dynamic values — draw a starting box, then:
    //   1. Exclude any strikethrough / cancelled words
    //   2. Expand rightward along the same line to the next label boundary or gap
    //   3. Also include handwritten text written ABOVE the value area (corrections,
    //      annotations), which is common on handwritten / counter-signed documents

    // Step 1: find seed words inside the drawn box.
    // ≥ 35% word-area overlap, OR centre inside the box (handles narrow value cells).
    const overlapping = normalizedWords.filter(w => {
      if (isStrikethrough(w)) return false;
      const cov = wordOverlap(w, box);
      const cx = w.x + w.width / 2;
      const cy = w.y + w.height / 2;
      const centreInside = cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height;
      const notTooTall = w.height <= Math.max(1.8, box.height * 2.0);
      return notTooTall && (cov >= 0.35 || (centreInside && cov >= 0.15));
    });

    const seeds = overlapping.filter(w => !isLabel(w.text)).sort(readingOrder);

    if (seeds.length === 0) {
      if (overlapping.length === 0) return [];

      // The drawn box sits on label text (e.g. "Date of birth/Date de naissance") rather
      // than its value — printed forms commonly place the value on the line directly
      // below its label. Search the band just below the label for it.
      const labelBottom = Math.max(...overlapping.map(w => w.y + w.height));
      const labelH = Math.max(...overlapping.map(w => w.height), 1.5);
      const belowWords = normalizedWords.filter(w => {
        if (isStrikethrough(w)) return false;
        if (isLabel(w.text || "")) return false;
        const cy = w.y + w.height / 2;
        const inBelowZone = cy > labelBottom && cy <= labelBottom + labelH * 2.5;
        const inHorizontalRange = w.x + w.width >= box.x - 0.5 && w.x <= box.x + box.width + 5;
        return inBelowZone && inHorizontalRange;
      }).sort(readingOrder);

      if (belowWords.length === 0) return [];

      const belowMinY = Math.min(...belowWords.map(w => w.y));
      const belowLineH = Math.max(...belowWords.map(w => w.height), 1.5);
      return belowWords.filter(w => Math.abs(w.y - belowMinY) <= belowLineH * 0.9);
    }

    // Step 2: establish the primary line band from seeds.
    const seedMinY = Math.min(...seeds.map(w => w.y));
    const seedCentreYs = seeds.map(w => w.y + w.height / 2);
    const lineCY = seedCentreYs.reduce((a, b) => a + b, 0) / seedCentreYs.length;
    const lineH = Math.max(...seeds.map(w => w.height), 1.5);
    const lineTolerance = lineH * 0.9;
    const seedLeft = Math.min(...seeds.map(w => w.x));
    const seedRight = Math.max(...seeds.map(w => w.x + w.width));

    // Step 3: walk rightward on the primary line, stopping at the next label or large gap.
    const sameLine = normalizedWords
      .filter(w => {
        if (isStrikethrough(w)) return false;
        const cy = w.y + w.height / 2;
        return Math.abs(cy - lineCY) <= lineTolerance && w.x >= seedLeft - 0.3;
      })
      .sort(readingOrder);

    const primaryResult: OCRWord[] = [];
    for (const word of sameLine) {
      if (isLabel(word.text || "")) break;
      if (primaryResult.length > 0) {
        const prev = primaryResult[primaryResult.length - 1];
        const gap = word.x - (prev.x + prev.width);
        const prevCharW = prev.width / Math.max(1, (prev.text || "x").length);
        if (gap > prevCharW * 6) break;
      }
      primaryResult.push(word);
    }

    // Step 4: the primary line already produced a value — use it as-is. Only look
    // above for handwritten overflow when the line yielded nothing; otherwise OCR
    // noise from an adjacent label row (which can slip past isLabel() when garbled)
    // gets prepended to a perfectly good value.
    if (primaryResult.length > 0) return primaryResult;

    // Capture handwritten text written ABOVE the value area. This covers manual
    // corrections / amendments on handwritten or counter-signed documents.
    // Search within a 2-line-height window above the seed top, within the horizontal
    // span of the drawn box.
    const aboveWords = normalizedWords.filter(w => {
      if (isStrikethrough(w)) return false;
      if (isLabel(w.text || "")) return false;
      const cy = w.y + w.height / 2;
      // Must be in the vertical window above the seed line
      const inAboveZone = cy < seedMinY - 0.2 && cy >= seedMinY - lineH * 2.5;
      // Must fall within the horizontal extent of the selection + captured value
      const inHorizontalRange = w.x + w.width >= box.x - 0.5 && w.x <= seedRight + 1;
      return inAboveZone && inHorizontalRange;
    }).sort(readingOrder);

    return aboveWords.length > 0 ? aboveWords : seeds;
  };

  const averageConfidence = (words: OCRWord[]) => {
    if (words.length === 0) return 0;
    const total = words.reduce((sum, word) => {
      const confidence = word.confidence > 1 ? word.confidence / 100 : word.confidence;
      return sum + (Number.isFinite(confidence) ? confidence : 0);
    }, 0);
    return total / words.length;
  };

  const findWordsByLabel = (label: string) => {
    const normalizedWords = (activePage?.textLayer || []).map(normalizeWordBox);
    if (normalizedWords.length === 0) return [];

    const labelTokens = label
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter(token => token.length > 2);
    if (labelTokens.length === 0) return [];

    const wordTokens = normalizedWords.map(word => word.text.toLowerCase().replace(/[^a-z0-9]/g, ""));
    for (let index = 0; index <= wordTokens.length - labelTokens.length; index += 1) {
      const matches = labelTokens.every((token, offset) => wordTokens[index + offset]?.includes(token) || token.includes(wordTokens[index + offset]));
      if (matches) return normalizedWords.slice(index, index + labelTokens.length);
    }

    const strongestToken = [...labelTokens].sort((a, b) => b.length - a.length)[0];
    const fallbackIndex = wordTokens.findIndex(token => token.length > 2 && (token.includes(strongestToken) || strongestToken.includes(token)));
    return fallbackIndex >= 0 ? [normalizedWords[fallbackIndex]] : [];
  };

  /** Fraction of an anchor label's tokens (length > 2) that appear in the candidate words' text. */
  const labelMatchScore = (label: string, words: OCRWord[]) => {
    const labelTokens = label.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(token => token.length > 2);
    if (labelTokens.length === 0) return 0;
    const wordText = words.map(w => (w.text || "").toLowerCase().replace(/[^a-z0-9]/g, "")).join("");
    const hits = labelTokens.filter(token => wordText.includes(token)).length;
    return hits / labelTokens.length;
  };

  const boxFromWords = (words: OCRWord[]): SelectionBox | null => {
    if (words.length === 0) return null;
    const minX = Math.min(...words.map(word => word.x));
    const minY = Math.min(...words.map(word => word.y));
    const maxX = Math.max(...words.map(word => word.x + word.width));
    const maxY = Math.max(...words.map(word => word.y + word.height));
    return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
  };

  const fieldTypeFromPrebuilt = (type: PrebuiltModel["fields"][number]["type"]) => {
    if (type === "boolean") return "checkbox";
    if (type === "array") return "multi-value";
    // "string" is an alias for "text" — normalise to the canonical type
    if (type === "string") return "text";
    return type;
  };

  const getPrebuiltTemplateBox = (model: PrebuiltModel, field: PrebuiltModel["fields"][number], index: number): SelectionBox | null => {
    if (!field.coordinatesEnabled) return null;
    const isPassportModel = model.code === "passport_india_v1";
    if (!isPassportModel) return null;

    const passportTemplate: Record<string, SelectionBox> = {
      passport_number: { x: 72, y: 45, width: 13, height: 2.5 },
      document_number: { x: 72, y: 45, width: 13, height: 2.5 },
      surname: { x: 55, y: 49, width: 14, height: 2.5 },
      given_name: { x: 55, y: 53, width: 14, height: 2.5 },
      given_names: { x: 55, y: 53, width: 14, height: 2.5 },
      nationality: { x: 55, y: 57, width: 10, height: 2.3 },
      sex: { x: 67, y: 57, width: 5, height: 2.3 },
      dob: { x: 55, y: 60, width: 13, height: 2.5 },
      date_of_birth: { x: 55, y: 60, width: 13, height: 2.5 },
      place_of_birth: { x: 55, y: 64, width: 18, height: 2.5 },
      place_of_issue: { x: 55, y: 68, width: 14, height: 2.5 },
      date_of_issue: { x: 55, y: 72, width: 13, height: 2.5 },
      issue_date: { x: 55, y: 72, width: 13, height: 2.5 },
      date_of_expiry: { x: 70, y: 72, width: 13, height: 2.5 },
      expiry_date: { x: 70, y: 72, width: 13, height: 2.5 },
      mrz: { x: 45, y: 78, width: 39, height: 5 },
      holder_photo: { x: 43, y: 52, width: 10, height: 17 },
      holder_signature: { x: 45, y: 70, width: 13, height: 4 },
      signature_present: { x: 45, y: 70, width: 13, height: 4 }
    };

    return passportTemplate[field.key] || { x: 54, y: 48 + index * 3.5, width: 14, height: 2.4 };
  };

  const findValueWordsForAnchor = (anchorBox: SelectionBox | null, field: PrebuiltModel["fields"][number]) => {
    if (!anchorBox || ["boolean", "table"].includes(field.type)) return [];

    const normalizedWords = (activePage?.textLayer || []).map(normalizeWordBox);
    const fieldLabelTokens = searchTokens(field.label);
    const bilingualTokens = [
      "passport", "passeport", "no", "number", "nom", "surname", "given", "names", "prenoms", 
      "nationality", "nationalite", "date", "birth", "naissance", "place", "lieu", "issue", 
      "delivrance", "expiry", "expiration", "authority", "autorite", "sex", "sexe"
    ];
    const isLikelyLabelWord = (text = "") => {
      const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
      const tokens = normalized.split(/\s+/).filter(Boolean);
      return tokens.some(token => 
        bilingualTokens.includes(token) || 
        bilingualTokens.some(bt => (bt.length > 2 && token.includes(bt)) || (token.length > 2 && bt.includes(token))) ||
        fieldLabelTokens.some(fl => fl.length > 2 && (token.includes(fl) || fl.includes(token)))
      );
    };
    const overlapsAnchor = (word: OCRWord) => {
      const left = Math.max(word.x, anchorBox.x);
      const right = Math.min(word.x + word.width, anchorBox.x + anchorBox.width);
      const top = Math.max(word.y, anchorBox.y);
      const bottom = Math.min(word.y + word.height, anchorBox.y + anchorBox.height);
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);
      const overlapArea = width * height;
      const wordArea = Math.max(0.01, word.width * word.height);
      return (overlapArea / wordArea) >= 0.20;
    };
    const sortReadingOrder = (a: OCRWord, b: OCRWord) => {
      const sameLine = Math.abs(a.y - b.y) < Math.max(a.height, b.height, 1.2);
      return sameLine ? a.x - b.x : a.y - b.y;
    };
    const rightSide = normalizedWords.filter(word =>
      word.x > anchorBox.x + anchorBox.width + 0.5 &&
      word.x < anchorBox.x + anchorBox.width + 42 &&
      word.y > anchorBox.y - 1.5 &&
      word.y < anchorBox.y + anchorBox.height + 4 &&
      !isLikelyLabelWord(word.text) &&
      !overlapsAnchor(word)
    );
    const below = normalizedWords.filter(word =>
      word.y > anchorBox.y + anchorBox.height - 0.2 &&
      word.y < anchorBox.y + anchorBox.height + 9 &&
      word.x > Math.max(0, anchorBox.x - 2) &&
      word.x < Math.min(100, anchorBox.x + 45) &&
      !isLikelyLabelWord(word.text) &&
      !overlapsAnchor(word)
    );
    const candidates = [...rightSide, ...below]
      .filter((word, index, list) => list.findIndex(item => item.id === word.id) === index)
      .sort(sortReadingOrder);

    const dateWords = candidates.filter(word => /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/.test(word.text));
    if (field.type === "date" && dateWords.length > 0) return dateWords.slice(0, 1);

    const idWords = candidates.filter(word => /[A-Z]{0,3}\d{5,}|[A-Z0-9]{6,}/i.test(word.text.replace(/\s/g, "")));
    if (field.key.includes("number") && idWords.length > 0) return idWords.slice(0, 1);

    return candidates.slice(0, field.type === "array" ? 8 : 4);
  };

  const applyPrebuiltRoutingModel = (model: PrebuiltModel, routeName?: string) => {
    const rootCategory: StudioCategory = { id: nextId("cat"), name: `Prebuilt: ${model.name}`, parentId: null };
    const requiredCategory: StudioCategory = { id: nextId("cat"), name: "Required Fields", parentId: rootCategory.id };
    const optionalCategory: StudioCategory = { id: nextId("cat"), name: "Optional Fields", parentId: rootCategory.id };
    const newFields: StudioField[] = [];
    const newAnchors: StudioAnchor[] = [];
    const newLinks: StudioLink[] = [];

    model.fields.forEach((field, index) => {
      const anchorWords = findWordsByLabel(field.label);
      const anchorBox = boxFromWords(anchorWords);
      const valueWords = findValueWordsForAnchor(anchorBox, field);
      const valueBox = boxFromWords(valueWords);
      const templateBox = getPrebuiltTemplateBox(model, field, index);
      const valueText = valueWords.map(word => word.text).join(" ").replace(/\s+/g, " ").trim();
      const fieldId = nextId("field");
      const anchorId = anchorBox ? nextId("anchor") : null;
      const evidenceBox = valueBox || templateBox;
      const inferredFieldBox = evidenceBox && field.coordinatesEnabled
        ? {
            x: Math.max(0, evidenceBox.x - 0.4),
            y: Math.max(0, evidenceBox.y - 0.4),
            width: Math.min(100 - Math.max(0, evidenceBox.x - 0.4), evidenceBox.width + 0.8),
            height: Math.min(100 - Math.max(0, evidenceBox.y - 0.4), evidenceBox.height + 0.8)
          }
        : {};

      newFields.push({
        id: fieldId,
        name: field.label,
        type: fieldTypeFromPrebuilt(field.type),
        required: field.required,
        enabled: true,
        confidence: valueWords.length > 0 ? averageConfidence(valueWords) || model.confidenceThreshold : 0,
        value: valueText,
        categoryId: field.required ? requiredCategory.id : optionalCategory.id,
        ...(evidenceBox && field.coordinatesEnabled ? inferredFieldBox : {}),
        locatorStrategy: field.coordinatesEnabled ? "hybrid" : "anchor",
        pageStrategy: "detect_by_text",
        searchDirection: "nearest",
        expansionMode: field.type === "table" ? "multiline" : field.type === "array" ? "until_next_label" : "line",
        stopAtNextLabel: true,
        allowLongText: (field.type as string) === "text" || field.type === "string" || field.type === "array"
      });

      if (anchorBox && anchorId) {
        newAnchors.push({
          id: anchorId,
          value: field.label,
          type: "prebuilt",
          x: anchorBox.x,
          y: anchorBox.y,
          width: anchorBox.width,
          height: anchorBox.height,
          confidence: averageConfidence(anchorWords) || model.confidenceThreshold
        });
        newLinks.push({ fieldId, anchorId, relationship: "Prebuilt Anchor", confidence: model.confidenceThreshold });
      }
    });

    const dedup = <T extends { id: string }>(arr: T[]) => arr.filter((x, i, a) => a.findIndex(y => y.id === x.id) === i);
    setCategories([rootCategory, requiredCategory, optionalCategory]);
    setFields(dedup(newFields));
    setAnchors(dedup(newAnchors));
    setLinks(newLinks);
    setSelectedFieldId(newFields.find(field => field.value || field.x !== undefined)?.id || newFields[0]?.id || null);
    setSelectedCategoryId(rootCategory.id);
    setActiveLayer("extraction");
    toast.success(`${model.name} loaded${routeName ? ` for ${routeName}` : ""}. Fields are ready for review.`);
  };

  // ─── Save current design as a reusable custom model ─────────────────────────
  const openSaveModelDialog = React.useCallback(() => {
    if (fields.length === 0) {
      toast.warning("Define at least one field before saving as a model.");
      return;
    }
    const docClass = activeDocument?.classification?.className || activeDocument?.name || "Unknown";
    setSaveModelDialog({ name: `${docClass} Model`, isGeneric: false });
  }, [fields, activeDocument]);

  const doSaveModel = React.useCallback((modelName: string, isGeneric: boolean) => {
    const docClass = activeDocument?.classification?.className || activeDocument?.name || "Unknown";
    const existing = loadCustomModels();
    const idx = existing.findIndex(m => m.name === modelName || m.documentClasses.some(c => c.toLowerCase() === docClass.toLowerCase()));
    const model: CustomReusableModel = {
      id: idx >= 0 ? existing[idx].id : `custom_${Date.now()}`,
      name: modelName,
      documentClasses: isGeneric ? [] : [docClass],
      isGeneric,
      createdAt: new Date().toISOString(),
      categories,
      fields,
      anchors,
      links
    };
    if (idx >= 0) existing[idx] = model; else existing.push(model);
    saveCustomModels(existing);

    if (!isGeneric) {
      const existingClass = documentClasses.find(c => c.name.toLowerCase() === docClass.toLowerCase());
      if (!existingClass) {
        const anchorPhrases = Array.from(new Set(anchors.map(a => a.value.trim()).filter(Boolean)));
        const fieldNames = fields.map(f => f.name).filter(Boolean);
        addClass({
          classId: `class_${Date.now()}`,
          name: docClass,
          description: `Auto-created from "${modelName}" saved in the AI Document Designer.`,
          sampleCount: 1,
          minConfidence: 0.5,
          requiredFields: fieldNames,
          optionalFields: [],
          keywords: Array.from(new Set([docClass, ...fieldNames])),
          anchorPhrases,
          layoutPatterns: [],
          isActive: true,
          color: "#6366f1"
        });
      }
    }

    setSaveModelDialog(null);
    toast.success(
      isGeneric
        ? `"${modelName}" saved as a generic model — will apply to any document with similar structure.`
        : `"${modelName}" saved. Auto-applies to all "${docClass}" documents.`
    );
  }, [fields, anchors, links, categories, activeDocument, documentClasses, addClass]);

  // ─── Apply a custom model to the current document ────────────────────────────
  // Re-locates every field using anchor-relative positioning. Fields whose
  // anchors cannot be found in the current OCR are marked available=false.
  const applyCustomModelToDocument = React.useCallback((model: CustomReusableModel) => {
    const newFields: StudioField[] = [];
    const newAnchors: StudioAnchor[] = [];
    const newLinks: StudioLink[] = [];

    // The shift shared by most of the model's anchors when re-found in this document's
    // OCR — used to relocate fields whose own anchor moved independently or couldn't be
    // re-found at all, so a field can still "move with" the rest of a shifted/cropped scan.
    const MIN_CONSENSUS_MATCH = 0.6;
    const anchorOffsets: { dx: number; dy: number }[] = [];
    for (const anchor of model.anchors) {
      const anchorWords = findWordsByLabel(anchor.value);
      if (anchorWords.length === 0) continue;
      if (labelMatchScore(anchor.value, anchorWords) < MIN_CONSENSUS_MATCH) continue;
      const anchorBox = boxFromWords(anchorWords);
      if (!anchorBox) continue;
      anchorOffsets.push({ dx: anchorBox.x - anchor.x, dy: anchorBox.y - anchor.y });
    }
    const median = (values: number[]): number => {
      const sorted = [...values].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    };
    const documentOffset = anchorOffsets.length > 0
      ? { dx: median(anchorOffsets.map(o => o.dx)), dy: median(anchorOffsets.map(o => o.dy)) }
      : null;

    // Anchors mark constant/label text (e.g. "Given names/Prénoms") — wherever an
    // anchor currently sits in this document's OCR, that text must never be captured
    // as a field's dynamic value, even if it falls inside another field's box. Re-find
    // each anchor in the fresh OCR; if it can't be confidently re-found, fall back to
    // its trained position shifted by the document's overall offset.
    const MIN_ANCHOR_MATCH_GLOBAL = 0.6;
    const anchorExcludeBoxes: SelectionBox[] = model.anchors.map(anchor => {
      const anchorWords = findWordsByLabel(anchor.value);
      if (anchorWords.length > 0 && labelMatchScore(anchor.value, anchorWords) >= MIN_ANCHOR_MATCH_GLOBAL) {
        const box = boxFromWords(anchorWords);
        if (box) return box;
      }
      return {
        x: anchor.x + (documentOffset?.dx ?? 0),
        y: anchor.y + (documentOffset?.dy ?? 0),
        width: anchor.width,
        height: anchor.height,
      };
    });

    model.fields.forEach(field => {
      const fieldLinks = model.links.filter(l => l.fieldId === field.id);
      const fieldAnchors = fieldLinks
        .map(l => model.anchors.find(a => a.id === l.anchorId))
        .filter(Boolean) as StudioAnchor[];

      let located: { x: number; y: number; width: number; height: number; value: string } | null = null;
      let foundAnchorBox: { x: number; y: number; width: number; height: number } | null = null;
      let foundAnchorId: string | null = null;

      // Try every linked anchor — find it in the current page's OCR. Anchors whose
      // trained label text barely resembles anything in the fresh OCR (only a weak
      // fallback match) are skipped, and among the remaining anchor-relocated
      // candidates the highest-confidence one wins.
      const MIN_ANCHOR_MATCH = 0.6;
      const candidates: Array<{ box: { x: number; y: number; width: number; height: number }; value: string; confidence: number; anchorBox: SelectionBox }> = [];

      for (const anchor of fieldAnchors) {
        const anchorWords = findWordsByLabel(anchor.value);
        if (anchorWords.length === 0) continue;
        if (labelMatchScore(anchor.value, anchorWords) < MIN_ANCHOR_MATCH) continue;
        const anchorBox = boxFromWords(anchorWords);
        if (!anchorBox) continue;

        // Compute offset from original anchor position to original field position
        const dx = (field.x ?? 0) - anchor.x;
        const dy = (field.y ?? 0) - anchor.y;

        const predictedBox = {
          x: Math.max(0, Math.min(95, anchorBox.x + dx)),
          y: Math.max(0, Math.min(95, anchorBox.y + dy)),
          width: field.width ?? 10,
          height: field.height ?? 3
        };

        const words = getWordsInSelection(predictedBox, true, anchorExcludeBoxes);
        const value = normalizeBilingualValue(words.map(w => w.text).join(" ").trim());
        if (!value) continue;

        candidates.push({ box: predictedBox, value, confidence: averageConfidence(words), anchorBox });
      }

      if (candidates.length > 0) {
        candidates.sort((a, b) => b.confidence - a.confidence);
        const best = candidates[0];
        located = { ...best.box, value: best.value };
        foundAnchorBox = best.anchorBox;
        foundAnchorId = nextId("anchor");
      }

      // This field's own anchor(s) couldn't be re-found (or matched too weakly), but most
      // of the rest of the document shifted by a consistent (dx, dy) — e.g. a re-scan
      // that's cropped or nudged differently. Apply that shared shift to the field's
      // trained position before falling back to its raw, un-shifted position.
      if (!located && documentOffset && field.x !== undefined) {
        const shiftedBox = {
          x: Math.max(0, Math.min(95, field.x + documentOffset.dx)),
          y: Math.max(0, Math.min(95, (field.y ?? 0) + documentOffset.dy)),
          width: field.width ?? 10,
          height: field.height ?? 3
        };
        const words = getWordsInSelection(shiftedBox, true, anchorExcludeBoxes);
        const value = normalizeBilingualValue(words.map(w => w.text).join(" ").trim());
        if (value) located = { ...shiftedBox, value };
      }

      // If no anchor produced a usable value, fall back to the field's own trained
      // position — the box the user sees highlighted — rather than a weak anchor guess.
      if (!located && field.x !== undefined) {
        const words = getWordsInSelection({ x: field.x, y: field.y ?? 0, width: field.width ?? 10, height: field.height ?? 3 }, true, anchorExcludeBoxes);
        located = {
          x: field.x, y: field.y ?? 0, width: field.width ?? 10, height: field.height ?? 3,
          value: normalizeBilingualValue(words.map(w => w.text).join(" ").trim())
        };
      }

      const newFieldId = nextId("field");
      newFields.push({
        ...field,
        id: newFieldId,
        x: located?.x,
        y: located?.y,
        width: located?.width,
        height: located?.height,
        value: located?.value || "",
        confidence: located?.value ? 0.92 : 0,
        // Store unavailability so the canvas can show a blank indicator
        enabled: true,
        ...((!located || !located.value) ? { type: field.type || "text" } : {})
      } as StudioField & { _unavailable?: boolean });

      // Re-create anchor at its found position
      if (foundAnchorBox && foundAnchorId) {
        const originalAnchor = fieldAnchors[0];
        newAnchors.push({
          id: foundAnchorId,
          value: originalAnchor?.value ?? "Anchor",
          type: "primary",
          x: foundAnchorBox.x,
          y: foundAnchorBox.y,
          width: foundAnchorBox.width,
          height: foundAnchorBox.height,
          confidence: 0.95
        });
        newLinks.push({ fieldId: newFieldId, anchorId: foundAnchorId, relationship: "Primary Anchor", confidence: 0.95 });
      }
    });

    const dedup = <T extends { id: string }>(arr: T[]) => arr.filter((x, i, a) => a.findIndex(y => y.id === x.id) === i);
    setCategories(model.categories);
    setFields(dedup(newFields));
    setAnchors(dedup(newAnchors));
    setLinks(newLinks);
    setSelectedFieldId(null);
    setSelectedCategoryId(null);
    setDocumentViewMode("enhanced"); // auto-enable corrections
    toast.success(
      `"${model.name}" applied. ${newFields.filter(f => f.value).length}/${newFields.length} fields located.` +
      (newFields.some(f => !f.value) ? " Missing fields shown in grey." : "")
    );
  }, [activePage]);

  const getStoredPrebuiltRoutes = React.useCallback((): PrebuiltRoutingConfig[] => {
    if (typeof window === "undefined") return [];
    const rawRouting = window.localStorage.getItem("documentReader.prebuiltModelRouting");
    if (!rawRouting) return [];

    try {
      return JSON.parse(rawRouting);
    } catch {
      return [];
    }
  }, []);

  const getRouteForDocument = React.useCallback((document = activeDocument) => {
    if (!document) return null;
    const routes = getStoredPrebuiltRoutes();
    const documentClassName = document.classification?.className?.toLowerCase();
    return routes.find(item => item.targetId === document.documentId)
      || routes.find(item => documentClassName && item.targetName.toLowerCase() === documentClassName)
      || routes.find(item => item.targetName.toLowerCase() === document.name.toLowerCase())
      || null;
  }, [activeDocument, getStoredPrebuiltRoutes]);

  const getRecommendedModelForDocument = React.useCallback((document = activeDocument) => {
    const route = getRouteForDocument(document);
    if (route?.modelCode) return PREBUILT_MODELS.find(item => item.code === route.modelCode) || null;

    const sourceText = [
      document?.classification?.className,
      document?.name,
      document?.pages?.[0]?.ocrText
    ].filter(Boolean).join(" ").toLowerCase();

    if (/canad|canada/.test(sourceText) && /passport/.test(sourceText)) {
      return PREBUILT_MODELS.find(item => item.code === "passport_canada_v1") || null;
    }
    if (/\bindia|indian|republic of india/.test(sourceText) && /passport/.test(sourceText)) {
      return PREBUILT_MODELS.find(item => item.code === "passport_india_v1") || null;
    }
    if (/\bus|united states|america/.test(sourceText) && /passport/.test(sourceText)) {
      return PREBUILT_MODELS.find(item => item.code === "passport_us_v1") || null;
    }
    if (/passport/.test(sourceText)) {
      return PREBUILT_MODELS.find(item => item.code === "passport_global_v1") || null;
    }
    return null;
  }, [activeDocument, getRouteForDocument]);

  const activePrebuiltModel = getRecommendedModelForDocument();
  const activeModelButtonLabel = activePrebuiltModel?.name.replace(/\s*Extractor$/i, " Model") || "Apply Prebuilt Model";

  // Auto-apply custom reusable models when a matching document loads
  React.useEffect(() => {
    if (!activeDocument?.documentId || activeDocument.documentId !== currentDocId) return;
    if (appliedCustomModelRef.current[activeDocument.documentId]) return;
    if (appliedPrebuiltRouteRef.current[activeDocument.documentId]) return;
    if (fields.length > 0) return; // design already loaded; don't overwrite

    const docClass = activeDocument.classification?.className || activeDocument.name || "";
    const ocrText = activeDocument.pages?.[0]?.ocrText || "";
    const model = matchCustomModel(docClass, ocrText);
    if (!model) return;

    // Wait for OCR to populate the text layer before relocating anchors/fields —
    // applying against an empty text layer would relocate nothing, leave every
    // field blank, and then permanently lock that blank result in via the ref guard.
    const hasTextLayer = (activeDocument.pages?.[0]?.textLayer?.length || 0) > 0;
    if (!hasTextLayer && model.anchors.length > 0) return;

    appliedCustomModelRef.current[activeDocument.documentId] = model.id;
    appliedPrebuiltRouteRef.current[activeDocument.documentId] = "custom";
    applyCustomModelToDocument(model);
  }, [activeDocument, currentDocId, fields.length, applyCustomModelToDocument]);

  React.useEffect(() => {
    if (!activeDocument?.documentId || activeDocument.documentId !== currentDocId) return;
    if (appliedPrebuiltRouteRef.current[activeDocument.documentId]) return;
    // Skip if any field already has a mapped position: the saved design is valid.
    if (fields.some(f => f.x !== undefined)) return;

    const route = getRouteForDocument(activeDocument);
    if (!route) return;

    appliedPrebuiltRouteRef.current[activeDocument.documentId] = route.mode || route.modelCode || "blank_custom";
    if (route.mode === "blank_custom" || !route.modelCode) {
      toast.info("Blank custom extraction setup loaded. Draw fields or use smart detection to continue.");
      return;
    }

    const model = PREBUILT_MODELS.find(item => item.code === route.modelCode);
    if (!model) return;
    const categoryExists = categories.some(category => category.name === `Prebuilt: ${model.name}`);
    // If categories exist but fields are empty, the user intentionally cleared them — skip.
    // If categories exist AND fields exist without positions, it's a broken first-session state — re-apply.
    if (categoryExists && fields.length === 0) return;
    applyPrebuiltRoutingModel(model, route.targetName);
  }, [activeDocument, categories, currentDocId, fields, getRouteForDocument]);

  React.useEffect(() => {
    if (!activeDocument?.documentId || activeDocument.documentId !== currentDocId || !activePrebuiltModel) return;
    // Skip if any field already has a mapped position: the saved design is valid.
    if (fields.some(f => f.x !== undefined)) return;

    const prebuiltCategories = categories.filter(category => category.name.startsWith("Prebuilt: "));
    const expectedCategoryName = `Prebuilt: ${activePrebuiltModel.name}`;
    const hasWrongOrDuplicatedPrebuilt =
      prebuiltCategories.length > 1 ||
      (prebuiltCategories.length === 1 && prebuiltCategories[0].name !== expectedCategoryName);

    if (!hasWrongOrDuplicatedPrebuilt) return;

    appliedPrebuiltRouteRef.current[activeDocument.documentId] = activePrebuiltModel.code;
    applyPrebuiltRoutingModel(activePrebuiltModel, activeDocument.classification?.className || activeDocument.name);
  }, [activeDocument, activePrebuiltModel, categories, currentDocId, fields]);

  const enhanceCanvasForOcr = (canvas: HTMLCanvasElement) => {
    const context = canvas.getContext("2d");
    if (!context) return;

    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const strength = Math.max(0, Math.min(100, textEnhancementLevel)) / 100;
    const contrast = 1.25 + strength * 1.65;
    const brightness = 8 - strength * 38;

    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const boosted = Math.max(0, Math.min(255, (gray - 128) * contrast + 128 + brightness));
      data[i] = boosted;
      data[i + 1] = boosted;
      data[i + 2] = boosted;
    }

    context.putImageData(imageData, 0, 0);
  };

  const cropSelectionImage = async (box: SelectionBox, enhanceForOcr = false, paddingPercent = 0) => {
    if (!activePage?.imageUrl) return null;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = activePage.imageUrl;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to load document image for selected-area OCR."));
    });

    const paddedBox = {
      x: Math.max(0, box.x - paddingPercent),
      y: Math.max(0, box.y - paddingPercent),
      width: Math.min(100, box.width + paddingPercent * 2),
      height: Math.min(100, box.height + paddingPercent * 2)
    };
    paddedBox.width = Math.min(paddedBox.width, 100 - paddedBox.x);
    paddedBox.height = Math.min(paddedBox.height, 100 - paddedBox.y);

    const sourceX = Math.max(0, (paddedBox.x / 100) * image.naturalWidth);
    const sourceY = Math.max(0, (paddedBox.y / 100) * image.naturalHeight);
    const sourceWidth = Math.max(1, (paddedBox.width / 100) * image.naturalWidth);
    const sourceHeight = Math.max(1, (paddedBox.height / 100) * image.naturalHeight);
    const scale = enhanceForOcr ? 3 : 1;

    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(sourceWidth * scale);
    canvas.height = Math.ceil(sourceHeight * scale);
    const context = canvas.getContext("2d");
    if (!context) return null;

    context.imageSmoothingEnabled = false;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
    if (enhanceForOcr) {
      enhanceCanvasForOcr(canvas);
    }
    return canvas.toDataURL("image/png");
  };

  // ─── Mark / Selection Detector ───────────────────────────────────────────────
  // Analyses a cropped document region to determine whether a checkbox or radio
  // button has been selected. Handles all common marking styles:
  //   • Tick mark (✓) inside or just outside the box/circle
  //   • Cross mark (✗ / X) inside
  //   • Single diagonal or horizontal line through the box
  //   • Full fill or highlight of the box/circle
  //   • Dot or filled circle for radio buttons
  const detectMarkInRegion = async (box: SelectionBox): Promise<{
    isMarked: boolean;
    confidence: number;
    markType: "tick" | "cross" | "fill" | "line" | "dot" | "none" | "unknown";
    displayValue: string;
  }> => {
    // Extend 1.5% in all directions to catch marks drawn just outside the box
    const extended = {
      x: Math.max(0, box.x - 1.5),
      y: Math.max(0, box.y - 1.5),
      width: Math.min(100, box.width + 3),
      height: Math.min(100, box.height + 3)
    };
    extended.width  = Math.min(extended.width,  100 - extended.x);
    extended.height = Math.min(extended.height, 100 - extended.y);

    // ── 1. OCR character matching ─────────────────────────────────────────────
    const textWords = (activePage?.textLayer || []).map(normalizeWordBox).filter(w => {
      const cx = w.x + w.width / 2;
      const cy = w.y + w.height / 2;
      return cx >= extended.x && cx <= extended.x + extended.width &&
             cy >= extended.y && cy <= extended.y + extended.height;
    });
    const ocrChars = textWords.map(w => w.text || "").join("");
    const hasTick  = /[✓✔☑√]|^[vV]$/.test(ocrChars);
    const hasCross = /[✗✘☒]|^[xX]$/.test(ocrChars);
    if (hasTick)  return { isMarked: true,  confidence: 0.92, markType: "tick",  displayValue: "✓ Checked" };
    if (hasCross) return { isMarked: true,  confidence: 0.90, markType: "cross", displayValue: "✗ Checked" };

    // ── 2. Pixel density analysis ─────────────────────────────────────────────
    const imageUrl = await cropSelectionImage(extended, false, 0);
    if (!imageUrl) return { isMarked: false, confidence: 0, markType: "unknown", displayValue: "☐ Unknown" };

    const img = new Image();
    img.src = imageUrl;
    await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); }).catch(() => null);
    if (!img.naturalWidth) return { isMarked: false, confidence: 0.3, markType: "unknown", displayValue: "☐ Unknown" };

    const scale = 3; // upscale for better density resolution
    const canvas = document.createElement("canvas");
    canvas.width  = img.naturalWidth  * scale;
    canvas.height = img.naturalHeight * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { isMarked: false, confidence: 0, markType: "unknown", displayValue: "☐ Unknown" };
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const { data, width: W, height: H } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const total = W * H;
    let dark = 0; // pixels below luminance threshold (ink)
    // Track quadrant dark counts for diagonal line detection
    const q = [0, 0, 0, 0]; // TL, TR, BL, BR quadrants
    const halfW = Math.floor(W / 2);
    const halfH = Math.floor(H / 2);

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (lum < 140) {
        dark++;
        const px = (i / 4) % W;
        const py = Math.floor((i / 4) / W);
        const qi = (px < halfW ? 0 : 1) + (py < halfH ? 0 : 2);
        q[qi]++;
      }
    }

    const density = dark / total; // 0 = white, 1 = fully black

    // ── 3. Classify by density and quadrant pattern ───────────────────────────
    // Empty checkbox/circle border only → ~2-10% dark (just the printed border lines)
    // Tick mark (✓) → TL + BR quadrants heavier → ~12-30% overall
    // Cross / forward-slash line → TR + BL heavier → ~15-30%
    // Horizontal / vertical line through box → balanced quadrants → ~12-25%
    // Full fill or heavy highlight → >38% uniform

    if (density < 0.08) {
      // Very low ink — almost certainly empty
      return { isMarked: false, confidence: 0.88, markType: "none", displayValue: "☐ Unchecked" };
    }

    if (density >= 0.38) {
      // Very high ink — filled box or heavy highlight
      return { isMarked: true, confidence: 0.93, markType: "fill", displayValue: "■ Checked (Filled)" };
    }

    if (density >= 0.10) {
      // Moderate ink — some kind of mark present. Distinguish mark shape:
      const diagTL_BR = (q[0] + q[3]); // top-left + bottom-right (tick direction)
      const diagTR_BL = (q[1] + q[2]); // top-right + bottom-left (back-slash or cross)
      const diagRatio = Math.max(diagTL_BR, diagTR_BL) / Math.max(1, Math.min(diagTL_BR, diagTR_BL));

      // Dot / filled circle (radio) — dark cluster in centre quadrants
      const centre = q[0] + q[1] + q[2] + q[3] > 0
        ? (dark - (Math.max(q[0], q[3]) + Math.max(q[1], q[2]))) / Math.max(1, dark)
        : 0;
      if (density >= 0.22 && diagRatio < 1.4) {
        return { isMarked: true, confidence: 0.82, markType: "dot", displayValue: "● Checked (Filled)" };
      }

      if (diagRatio >= 1.8) {
        const isTick = diagTL_BR > diagTR_BL;
        return {
          isMarked: true,
          confidence: Math.min(0.90, 0.70 + density),
          markType: isTick ? "tick" : "cross",
          displayValue: isTick ? "✓ Checked" : "✗ Checked"
        };
      }

      // Line across the box (horizontal/diagonal slash)
      return {
        isMarked: true,
        confidence: Math.min(0.85, 0.60 + density * 2),
        markType: "line",
        displayValue: "/ Checked (Line)"
      };
    }

    // Borderline density (8-10%) — could be border artifact or faint mark
    return { isMarked: false, confidence: 0.55, markType: "unknown", displayValue: "☐ Uncertain" };
  };

  // ─── Radio Group Analyser ──────────────────────────────────────────────────
  // The user draws ONE box around the entire radio group. This function:
  //   1. Finds each option row (text line) inside the box
  //   2. Locates the circle/bubble area to the LEFT of each option label
  //   3. Runs detectMarkInRegion on each circle independently
  //   4. NORMALISES: only the option with the highest raw confidence is "selected"
  //      — regardless of whether each individual detection said true/false.
  //   Only one value can ever be true in a radio group.
  const detectRadioGroup = async (box: SelectionBox): Promise<{
    selectedLabel: string;
    selectedConfidence: number;
    markType: string;
    options: Array<{ label: string; confidence: number; isSelected: boolean; markType: string }>;
  }> => {
    const boxWords = (activePage?.textLayer || []).map(normalizeWordBox).filter(w => {
      const cx = w.x + w.width / 2;
      const cy = w.y + w.height / 2;
      return cx >= box.x - 0.5 && cx <= box.x + box.width + 0.5 &&
             cy >= box.y - 0.5 && cy <= box.y + box.height + 0.5 &&
             (w.text || "").trim().length > 0;
    });

    // Group words into horizontal lines
    const lines: OCRWord[][] = [];
    for (const word of [...boxWords].sort((a, b) => a.y - b.y)) {
      const existing = lines.find(line => {
        const refY = line[0].y;
        const refH = Math.max(...line.map(l => l.height), 1);
        return Math.abs(word.y - refY) < refH * 0.75;
      });
      if (existing) existing.push(word);
      else lines.push([word]);
    }

    if (lines.length === 0) {
      // No text lines found — fall back to single detection of the whole box
      const single = await detectMarkInRegion(box);
      return {
        selectedLabel: "Option",
        selectedConfidence: single.confidence,
        markType: single.markType,
        options: [{ label: "Option", confidence: single.confidence, isSelected: single.isMarked, markType: single.markType }]
      };
    }

    // Analyse each line's circle region
    const analysed = await Promise.all(lines.map(async (lineWords) => {
      const sorted = [...lineWords].sort((a, b) => a.x - b.x);
      const label = sorted.map(w => w.text).join(" ").trim();
      const firstWord = sorted[0];
      const lineH = Math.max(...lineWords.map(w => w.height), 2);

      // The radio circle sits to the LEFT of the label text.
      // Use a square region roughly [lineH × lineH] immediately before the first word.
      const circleRight = firstWord.x - 0.1;
      const circleLeft  = Math.max(box.x, circleRight - lineH * 1.8);
      const circleTop   = Math.max(0, firstWord.y - lineH * 0.1);
      const circleH     = Math.min(100 - circleTop, lineH * 1.2);

      let circleBox: SelectionBox;
      if (circleLeft < circleRight && circleRight - circleLeft > 0.3) {
        circleBox = { x: circleLeft, y: circleTop, width: circleRight - circleLeft, height: circleH };
      } else {
        // Circle might be inline with text (e.g. the OCR sees the dot as a character)
        circleBox = { x: firstWord.x, y: firstWord.y, width: firstWord.width, height: firstWord.height };
      }

      const det = await detectMarkInRegion(circleBox);
      return { label, confidence: det.confidence, markType: det.markType, rawIsMarked: det.isMarked };
    }));

    // Normalise: pick the single option with the HIGHEST raw confidence.
    // This guarantees only one radio option is ever "selected".
    const bestIdx = analysed.reduce(
      (bi, opt, i) => opt.confidence > analysed[bi].confidence ? i : bi,
      0
    );
    const bestConfidence = analysed[bestIdx].confidence;
    // Only call it "selected" if it meaningfully exceeds the empty-circle baseline (~0.45)
    const actuallyMarked = bestConfidence > 0.45;

    const options = analysed.map((opt, i) => ({
      label: opt.label,
      confidence: opt.confidence,
      markType: opt.markType,
      isSelected: i === bestIdx && actuallyMarked
    }));

    return {
      selectedLabel: actuallyMarked ? analysed[bestIdx].label : "None",
      selectedConfidence: bestConfidence,
      markType: analysed[bestIdx].markType,
      options
    };
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const runOcrImage = async (imageUrl: string) => {
    const primaryEngineId = infrastructure?.primaryEngineId || "tesseract-ocr-v5";
    const primaryEngine = infrastructure?.engines?.find(e => e.id === primaryEngineId);
    
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        imageUrl, 
        engineId: primaryEngineId,
        port: primaryEngine?.port
      })
    });

    if (!response.ok) return null;
    const result = await response.json();
    const text = typeof result.text === "string" ? result.text.trim().replace(/\s+/g, " ") : "";
    const confidence = typeof result.confidence === "number" ? result.confidence : 0;
    return { text, confidence: confidence > 1 ? confidence / 100 : confidence };
  };

  const getHeaderSearchBoxes = (box: SelectionBox): SelectionBox[] => {
    const leftWidth = Math.min(34, Math.max(14, box.width * 3));
    const aboveHeight = Math.min(8, Math.max(3, box.height * 2.4));
    return [
      box,
      {
        x: Math.max(0, box.x - leftWidth - 1),
        y: Math.max(0, box.y - 1.5),
        width: Math.min(leftWidth, box.x),
        height: Math.min(100 - Math.max(0, box.y - 1.5), box.height + 3)
      },
      {
        x: Math.max(0, box.x - Math.max(3, box.width * 0.4)),
        y: Math.max(0, box.y - aboveHeight - 1),
        width: Math.min(100 - Math.max(0, box.x - Math.max(3, box.width * 0.4)), Math.max(14, box.width * 1.8)),
        height: Math.min(aboveHeight, box.y)
      }
    ].filter(candidate => candidate.width > 0.5 && candidate.height > 0.5);
  };

  const runSelectedAreaOcr = async (box: SelectionBox, includeHeaderSearch = false) => {
    const searchBoxes = [box];
    const attempts = [
      ...searchBoxes.map(searchBox => ({ box: searchBox, padding: ocrBoostEnabled ? 0.35 : 0.05 })),
      ...searchBoxes.map(searchBox => ({ box: searchBox, padding: ocrBoostEnabled ? 0.65 : 0.12 }))
    ];

    let bestResult: { text: string; confidence: number } | null = null;
    for (const attempt of attempts) {
      const imageUrl = await cropSelectionImage(attempt.box, ocrBoostEnabled, attempt.padding);
      if (!imageUrl) continue;
      const result = await runOcrImage(imageUrl);
      if (result?.text) {
        if (!bestResult) {
          bestResult = result;
        } else {
          // Prefer significantly higher confidence.
          // Only prefer longer text if confidence is relatively similar (within 15%).
          const significantlyBetter = result.confidence > bestResult.confidence + 0.15;
          const similarConfidenceButLonger = Math.abs(result.confidence - bestResult.confidence) <= 0.15 && result.text.length > bestResult.text.length;
          
          if (significantlyBetter || similarConfidenceButLonger) {
            bestResult = result;
          }
        }
      }
      if (bestResult?.text && bestResult.confidence >= 0.80) break;
    }

    return bestResult;
  };

  const cleanHeaderCandidate = (text: string) => {
    return text
      .replace(/[<>_~|]+/g, " ")
      .replace(/\b[A-Z0-9]{10,}\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  };

  const isLikelyHeaderText = (text: string) => {
    const cleaned = cleanHeaderCandidate(text);
    if (cleaned.length < 2 || cleaned.length > 48) return false;
    if (/[<>{}]/.test(text)) return false;
    if (/\d{5,}/.test(cleaned)) return false;
    return /date|birth|place|issue|expiry|passport|number|name|surname|given|sex|nationality|country|type|code|signature/i.test(cleaned);
  };

  // Finds the field's currently-linked "Primary Anchor" anchor, if any.
  const getPrimaryAnchorForField = (fieldId: string): StudioAnchor | null => {
    const link = links.find(l => l.fieldId === fieldId && /primary/i.test(l.relationship || ""));
    if (!link) return null;
    return anchors.find(a => a.id === link.anchorId) || null;
  };

  // Finds the nearest label text AND its bounding box — used for auto-anchor creation.
  // If `previousField` (the field drawn immediately before this one) has its own
  // Primary Anchor, the offset between that field's value box and its anchor is
  // checked first at this field's position — templated/tabular forms tend to repeat
  // the same label-to-value offset for every row/field, so this often pinpoints the
  // right label even in dense multi-column layouts where left/above proximity alone
  // would pick up a neighbouring field's label instead.
  // Otherwise searches left of the selection first (most forms), then above (column headers).
  const findNearestLabel = (valueBox: SelectionBox, previousField?: StudioField | null): { text: string; wordBox: SelectionBox } | null => {
    const normalizedWords = (activePage?.textLayer || []).map(normalizeWordBox);
    if (normalizedWords.length === 0) return null;

    const isGenericOrValue = (text: string) => /^\d|^[A-Z]{2,}\d|reading|selected/i.test(text.trim());

    // Predicted-position candidate: reuse the previous field's anchor offset.
    if (previousField?.x !== undefined && previousField?.y !== undefined) {
      const prevAnchor = getPrimaryAnchorForField(previousField.id);
      if (prevAnchor) {
        const dx = prevAnchor.x - previousField.x;
        const dy = prevAnchor.y - previousField.y;
        const predicted = {
          x: valueBox.x + dx, y: valueBox.y + dy,
          width: prevAnchor.width, height: prevAnchor.height
        };
        const hits = normalizedWords.filter(w => {
          const cx = w.x + w.width / 2;
          const cy = w.y + w.height / 2;
          return cx >= predicted.x - 2 && cx <= predicted.x + predicted.width + 2
            && cy >= predicted.y - 1.5 && cy <= predicted.y + predicted.height + 1.5
            && !isGenericOrValue(w.text || "");
        });
        if (hits.length > 0) {
          const baseline = hits[0].y;
          const sameLine = hits.filter(w => Math.abs(w.y - baseline) < Math.max(w.height, 1.5)).sort((a, b) => a.x - b.x);
          const text = cleanHeaderCandidate(sameLine.map(w => w.text).join(" "));
          const box = boxFromWords(sameLine);
          if (text.length > 1 && box) return { text, wordBox: box };
        }
      }
    }

    // Left-side candidates: words ending just before the value box, on the same line
    const leftWords = normalizedWords.filter(w => {
      const right = w.x + w.width;
      const vCenter = w.y + w.height / 2;
      return right <= valueBox.x + 0.5
        && valueBox.x - right < 30
        && vCenter >= valueBox.y - 1
        && vCenter <= valueBox.y + valueBox.height + 1
        && !isGenericOrValue(w.text || "");
    }).sort((a, b) => (b.x + b.width) - (a.x + a.width)); // closest first

    if (leftWords.length > 0) {
      // Group words on the same line
      const baseline = leftWords[0].y;
      const sameLine = leftWords.filter(w => Math.abs(w.y - baseline) < Math.max(w.height, 1.5));
      const sorted = sameLine.slice(0, 8).sort((a, b) => a.x - b.x);
      const text = cleanHeaderCandidate(sorted.map(w => w.text).join(" "));
      const box = boxFromWords(sorted);
      if (text.length > 1 && box) return { text, wordBox: box };
    }

    // Above candidates: words directly above the value box
    const aboveWords = normalizedWords.filter(w => {
      const bottom = w.y + w.height;
      return bottom <= valueBox.y + 0.5
        && valueBox.y - bottom < 8
        && w.x + w.width > valueBox.x - 2
        && w.x < valueBox.x + valueBox.width + 2
        && !isGenericOrValue(w.text || "");
    }).sort((a, b) => (b.y + b.height) - (a.y + a.height));

    if (aboveWords.length > 0) {
      const baseline = aboveWords[0].y;
      const sameLine = aboveWords.filter(w => Math.abs(w.y - baseline) < Math.max(w.height, 1.5));
      const sorted = sameLine.slice(0, 8).sort((a, b) => a.x - b.x);
      const text = cleanHeaderCandidate(sorted.map(w => w.text).join(" "));
      const box = boxFromWords(sorted);
      if (text.length > 1 && box) return { text, wordBox: box };
    }

    return null;
  };

  const getNearbyHeaderText = (box: SelectionBox) => {
    const normalizedWords = (activePage?.textLayer || []).map(normalizeWordBox);
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;
    const candidates = normalizedWords
      .map(word => {
        const wordCenterX = word.x + word.width / 2;
        const wordCenterY = word.y + word.height / 2;
        const isAbove = word.y + word.height <= box.y + 1.2;
        const isLeft = word.x + word.width <= box.x + 1.2;
        const closeVertical = Math.abs(wordCenterY - centerY) < 5;
        const closeHorizontal = Math.abs(wordCenterX - centerX) < Math.max(8, box.width + 4);
        return {
          word,
          text: cleanHeaderCandidate(word.text || ""),
          score: Math.hypot(centerX - wordCenterX, centerY - wordCenterY),
          likelyHeader: (isAbove && closeHorizontal) || (isLeft && closeVertical)
        };
      })
      .filter(item => item.likelyHeader && item.score < 18 && item.text && !/[<>{}]/.test(item.word.text || ""))
      .sort((a, b) => {
        const aHeader = isLikelyHeaderText(a.text) ? 0 : 1;
        const bHeader = isLikelyHeaderText(b.text) ? 0 : 1;
        return aHeader - bHeader || a.score - b.score;
      })
      .slice(0, 5)
      .map(item => item.text)
      .filter(Boolean);

    const joined = cleanHeaderCandidate(candidates.join(" "));
    return isLikelyHeaderText(joined) ? joined : "";
  };

  const createFieldFromSelection = (name: string, type?: string, options?: { keepPending?: boolean }) => {
    if (!pendingAnnotation) return null;

    if (isDuplicateFieldName(name)) {
      toast.error(`A field named "${name.trim()}" already exists`);
      return null;
    }

    // Sanitise value — never save the loading placeholder as a real value
    const rawValue = pendingAnnotation.extractedText || "";
    const value = /reading selected area|no ocr text/i.test(rawValue) ? "" : rawValue;

    const fieldId = nextId("field");
    const newField: StudioField = {
      id: fieldId,
      name: name.trim() || pendingAnnotation.detectedObject,
      type: type || pendingAnnotation.suggestedType || "text",
      required: true,
      enabled: true,
      confidence: pendingAnnotation.confidence / 100,
      value,
      x: pendingAnnotation.box.x,
      y: pendingAnnotation.box.y,
      width: pendingAnnotation.box.width,
      height: pendingAnnotation.box.height,
      dateFormat: (type || pendingAnnotation.suggestedType) === "date" ? "DD/MM/YYYY" : undefined,
      locatorStrategy: "hybrid",
      pageStrategy: "detect_by_text",
      searchDirection: "nearest",
      expansionMode: pendingAnnotation.suggestedType === "multiline" ? "multiline" : "line",
      stopAtNextLabel: true,
      allowLongText: true,
      categoryId: selectedCategoryId || null
    };
    setFields(prev => [...prev, newField]);

    // Auto-create anchor from the detected label — no separate "Add Anchor" step needed
    if (pendingAnnotation.autoAnchorBox && pendingAnnotation.autoAnchorText) {
      const anchorId = nextId("anchor");
      setAnchors(prev => [...prev, {
        id: anchorId,
        value: pendingAnnotation.autoAnchorText!,
        type: "primary",
        x: pendingAnnotation.autoAnchorBox!.x,
        y: pendingAnnotation.autoAnchorBox!.y,
        width: pendingAnnotation.autoAnchorBox!.width,
        height: pendingAnnotation.autoAnchorBox!.height,
        confidence: 0.95
      }]);
      setLinks(prev => [...prev, { fieldId, anchorId, relationship: "Primary Anchor", confidence: 0.95 }]);
    }

    setSelectedFieldId(fieldId);
    setSelectedCategoryId(null);
    if (!options?.keepPending) setPendingAnnotation(null);
    toast.success(`Created "${newField.name}"${pendingAnnotation.autoAnchorText ? ` · anchored to "${pendingAnnotation.autoAnchorText}"` : ""}`);
    return fieldId;
  };

  const promptForFieldFromSelection = () => {
    if (!pendingAnnotation) return;
    // Use auto-detected label text as the default name; fall back to detectedObject only if it's meaningful
    const genericNames = new Set(["OCR Text", "Document Region", "Selected Region"]);
    const defaultName = pendingAnnotation.autoAnchorText
      || (genericNames.has(pendingAnnotation.detectedObject) ? "" : pendingAnnotation.detectedObject);
    setCustomPrompt({
      title: "Create Field",
      message: pendingAnnotation.autoAnchorText
        ? `Field name (anchor "${pendingAnnotation.autoAnchorText}" will be auto-linked):`
        : "Enter field name for this selected area:",
      placeholder: "e.g. Passport Number",
      defaultValue: defaultName,
      onConfirm: (name: string) => {
        if (!name.trim()) {
          toast.warning("Field name is required");
          return;
        }
        createFieldFromSelection(name.trim(), pendingAnnotation.suggestedType);
      }
    });
  };

  const getAnchorTypeFromRelationship = (relationship: string) => {
    if (relationship.toLowerCase().includes("secondary")) return "secondary";
    if (relationship.toLowerCase().includes("fallback")) return "fallback";
    if (relationship.toLowerCase().includes("ai")) return "ocr";
    return "primary";
  };

  const createLinkedAnchor = (
    targetFieldId: string,
    box: SelectionBox,
    value: string,
    confidence: number,
    relationship = anchorCaptureRelationship
  ) => {
    const field = fields.find(f => f.id === targetFieldId);
    const cleanedValue = cleanHeaderCandidate(value || "");
    const cleanValue = cleanedValue && !/^No OCR text/i.test(cleanedValue) && cleanedValue.trim().length > 0
      ? cleanedValue
      : `${field?.name || "Field"} Anchor`;
    const newAnchor = {
      id: nextId("anchor"),
      value: cleanValue,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      confidence: confidence > 1 ? confidence / 100 : confidence,
      type: getAnchorTypeFromRelationship(relationship)
    };
    setAnchors(prev => [...prev, newAnchor]);
    setLinks(prev => [...prev, {
      fieldId: targetFieldId,
      anchorId: newAnchor.id,
      relationship,
      confidence: confidence > 1 ? confidence / 100 : confidence
    }]);
    setSelectedFieldId(targetFieldId);
    toast.success(`Added ${relationship.toLowerCase()} to ${field?.name || "selected field"}`);
  };

  const promptForAnchorCaptureFromSelection = () => {
    if (!pendingAnnotation) return;
    
    // If a field is already selected, just add this selection as an anchor to it!
    if (selectedFieldId) {
      const field = fields.find(f => f.id === selectedFieldId);
      if (field) {
        createLinkedAnchor(
          selectedFieldId, 
          pendingAnnotation.box, 
          pendingAnnotation.extractedText, 
          pendingAnnotation.confidence, 
          "Primary Anchor"
        );
        setPendingAnnotation(null);
        toast.success(`Added anchor to "${field.name}"`);
        return;
      }
    }

    setCustomPrompt({
      title: "Create Data Field",
      message: "Name the data field first. Then draw one or more anchors for it.",
      placeholder: "e.g. Passport Number",
      defaultValue: pendingAnnotation.detectedObject === "OCR Text" ? "" : pendingAnnotation.detectedObject,
      onConfirm: (name: string) => {
        if (!name.trim()) {
          toast.warning("Field name is required before adding anchors");
          return;
        }
        const fieldId = createFieldFromSelection(name.trim(), pendingAnnotation.suggestedType, { keepPending: true });
        if (fieldId) {
          setAnchorCaptureTargetFieldId(fieldId);
          setAnchorCaptureRelationship("Primary Anchor");
          setSelectedFieldId(fieldId);
          setActiveTool("anchor");
          setPendingAnnotation(null);
          toast.success(`Now draw anchors for "${name.trim()}". You can add multiple anchors.`);
        }
      }
    });
  };

  const beginAnchorCaptureForField = (fieldId: string, relationship = "Primary Anchor") => {
    const field = fields.find(f => f.id === fieldId);
    setAnchorCaptureTargetFieldId(fieldId);
    setAnchorCaptureRelationship(relationship);
    setSelectedFieldId(fieldId);
    setActiveTool("anchor");
    setPendingAnnotation(null);
    toast.success(`Draw one or more anchors for "${field?.name || "selected field"}".`);
  };

  const handleSelectionComplete = async (box: SelectionBox, clientPos: { x: number; y: number }) => {
    if (!anchorCaptureTargetFieldId && !selectedFieldId) {
      setSelectedCategoryId(null);
    }

    // ── Checkbox / Radio: image-based mark detection ──────────────────────────
    if ((activeTool === "checkbox" || activeTool === "radio") && !anchorCaptureTargetFieldId) {
      const nearestLabel = findNearestLabel(box, fields[fields.length - 1]);
      const groupLabel   = nearestLabel?.text || getNearbyHeaderText(box);

      setPendingAnnotation({
        box, clientPos,
        extractedText: "Detecting mark…",
        detectedObject: groupLabel || (activeTool === "radio" ? "Radio Group" : "Checkbox"),
        suggestedType: activeTool, confidence: 0, relatedObjects: [],
        autoAnchorText: nearestLabel?.text, autoAnchorBox: nearestLabel?.wordBox
      });

      if (activeTool === "radio") {
        // ── Radio group: analyse each option separately, normalise to ONE selected ──
        const group = await detectRadioGroup(box).catch(() => null);
        const selectedLabel    = group?.selectedLabel    ?? "None";
        const selectedConf     = group?.selectedConfidence ?? 0;
        const markType         = group?.markType         ?? "unknown";
        const optionsSummary   = group?.options
          .map(o => `${o.isSelected ? "●" : "○"} ${o.label}`)
          .join(" | ") ?? "";

        const fieldId   = nextId("field");
        const fieldName = groupLabel || "Radio Group";
        setFields(prev => [...prev, {
          id: fieldId, name: fieldName, type: "radio",
          required: true, enabled: true,
          confidence: selectedConf,
          value: selectedLabel === "None" ? "☐ None selected" : `● ${selectedLabel}`,
          x: box.x, y: box.y, width: box.width, height: box.height,
          locatorStrategy: "hybrid", pageStrategy: "detect_by_text",
          searchDirection: "nearest", expansionMode: "box",
          stopAtNextLabel: true, allowLongText: false,
          categoryId: selectedCategoryId || null
        }]);
        if (nearestLabel) {
          const anchorId = nextId("anchor");
          setAnchors(prev => [...prev, {
            id: anchorId, value: nearestLabel.text, type: "primary",
            x: nearestLabel.wordBox.x, y: nearestLabel.wordBox.y,
            width: nearestLabel.wordBox.width, height: nearestLabel.wordBox.height,
            confidence: 0.95
          }]);
          setLinks(prev => [...prev, { fieldId, anchorId, relationship: "Primary Anchor", confidence: 0.95 }]);
        }
        setSelectedFieldId(fieldId);
        setPendingAnnotation(null);
        const icon = selectedLabel !== "None" ? "●" : "○";
        toast.success(`${icon} "${fieldName}" → ${selectedLabel}${markType !== "unknown" ? ` (${markType})` : ""}${optionsSummary ? `  [${optionsSummary}]` : ""}`);
        return;
      }

      // ── Checkbox: single mark detection ──────────────────────────────────────
      const detection    = await detectMarkInRegion(box).catch(() => null);
      const displayValue = detection?.displayValue ?? "☐ Unknown";
      const confidence   = detection?.confidence   ?? 0;
      const fieldId      = nextId("field");
      const fieldName    = groupLabel || "Checkbox";
      setFields(prev => [...prev, {
        id: fieldId, name: fieldName, type: "checkbox",
        required: true, enabled: true,
        confidence, value: displayValue,
        x: box.x, y: box.y, width: box.width, height: box.height,
        locatorStrategy: "hybrid", pageStrategy: "detect_by_text",
        searchDirection: "nearest", expansionMode: "box",
        stopAtNextLabel: true, allowLongText: false,
        categoryId: selectedCategoryId || null
      }]);
      if (nearestLabel) {
        const anchorId = nextId("anchor");
        setAnchors(prev => [...prev, {
          id: anchorId, value: nearestLabel.text, type: "primary",
          x: nearestLabel.wordBox.x, y: nearestLabel.wordBox.y,
          width: nearestLabel.wordBox.width, height: nearestLabel.wordBox.height,
          confidence: 0.95
        }]);
        setLinks(prev => [...prev, { fieldId, anchorId, relationship: "Primary Anchor", confidence: 0.95 }]);
      }
      setSelectedFieldId(fieldId);
      setPendingAnnotation(null);
      toast.success(`${detection?.isMarked ? "✓" : "☐"} "${fieldName}" — ${displayValue}${detection?.markType ? ` (${detection.markType})` : ""}${nearestLabel ? ` · anchored to "${nearestLabel.text}"` : ""}`);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    const isAnchor = !!anchorCaptureTargetFieldId || activeTool === "anchor";
    const intersecting = getWordsInSelection(box, !isAnchor);
    let textLayerText = intersecting.map((word) => word.text).join(" ").trim();
    
    // Smart trim: remove trailing single letters (OCR artifacts from graphics) and trailing symbols
    if (textLayerText.length > 6 && /\s[A-Z]$/i.test(textLayerText)) {
      textLayerText = textLayerText.replace(/\s[A-Z]$/i, "").trim();
    }
    textLayerText = textLayerText.replace(/[-_~|.,]+$/, "").trim();
    // Strip secondary-language alternates (e.g. "29 MAY/MAI 1977" → "29 MAY 1977")
    textLayerText = normalizeBilingualValue(textLayerText);

    const headerText = getNearbyHeaderText(box);
    const nearestLabel = findNearestLabel(box, fields[fields.length - 1]); // better label + its bounding box

    if (textLayerText) {
      const confidence = averageConfidence(intersecting) * 100;
      if (anchorCaptureTargetFieldId) {
        createLinkedAnchor(anchorCaptureTargetFieldId, box, textLayerText, confidence || 96, anchorCaptureRelationship);
        return;
      }
      // Anchor tool: link the drawn region as an anchor to the currently-selected field
      if (activeTool === "anchor") {
        if (selectedFieldId) {
          createLinkedAnchor(selectedFieldId, box, textLayerText, confidence || 96, "Primary Anchor");
        } else {
          toast.warning("Select a field first, then draw its anchor label with the Anchor tool.");
        }
        return;
      }
      // Only remap to the currently-selected field when using the select tool
      if (selectedFieldId && activeTool === "select") {
        setFields(prev => prev.map(f => f.id === selectedFieldId ? {
          ...f, value: textLayerText, x: box.x, y: box.y, width: box.width, height: box.height
        } : f));
        toast.success(`Mapped to selected field`);
        return;
      }
      const intelligence = inferSelection(textLayerText);
      // Best field name: nearest label text → nearby header → type-derived
      const bestName = nearestLabel?.text || headerText || intelligence.detectedObject;

      // Smart Detect: fully automatic — create field + anchor in one step, no popup
      if (activeTool === "smart") {
        const fieldId = nextId("field");
        setFields(prev => [...prev, {
          id: fieldId, name: bestName,
          type: intelligence.suggestedType || "text",
          required: true, enabled: true,
          confidence: (confidence || intelligence.confidence) / 100,
          value: textLayerText,
          x: box.x, y: box.y, width: box.width, height: box.height,
          locatorStrategy: "hybrid", pageStrategy: "detect_by_text",
          searchDirection: "nearest", expansionMode: "line",
          stopAtNextLabel: true, allowLongText: true,
          categoryId: selectedCategoryId || null
        }]);
        if (nearestLabel) {
          const anchorId = nextId("anchor");
          setAnchors(prev => [...prev, {
            id: anchorId, value: nearestLabel.text, type: "primary",
            x: nearestLabel.wordBox.x, y: nearestLabel.wordBox.y,
            width: nearestLabel.wordBox.width, height: nearestLabel.wordBox.height,
            confidence: 0.96
          }]);
          setLinks(prev => [...prev, { fieldId, anchorId, relationship: "Primary Anchor", confidence: 0.96 }]);
        }
        setSelectedFieldId(fieldId);
        toast.success(`Smart: "${bestName}"${nearestLabel ? ` · auto-anchored to "${nearestLabel.text}"` : ""}`);
        return;
      }

      setPendingAnnotation({
        box, clientPos, extractedText: textLayerText,
        ...intelligence,
        detectedObject: bestName,
        confidence: confidence || intelligence.confidence,
        autoAnchorText: nearestLabel?.text,
        autoAnchorBox: nearestLabel?.wordBox
      });
      return;
    }

    if (activeTool === "anchor") {
      // No text found in the drawn region yet — wait for async OCR; don't show field popup
      if (!anchorCaptureTargetFieldId && !selectedFieldId) {
        toast.warning("Select a field first, then draw its anchor label with the Anchor tool.");
        return;
      }
    } else if (!anchorCaptureTargetFieldId) {
      setPendingAnnotation({
        box,
        clientPos,
        extractedText: "Reading selected area...",
        detectedObject: "Selected Region",
        suggestedType: activeTool === "field" ? "text" : activeTool,
        confidence: 0,
        relatedObjects: ["OCR", "Anchor", "Validation"]
      });
    }

    try {
      const cropOcr = await runSelectedAreaOcr(box, !!anchorCaptureTargetFieldId);
      let cleanedCropText = cropOcr?.text || "";
      if (cleanedCropText.length > 6 && /\s[A-Z]$/i.test(cleanedCropText)) {
        cleanedCropText = cleanedCropText.replace(/\s[A-Z]$/i, "").trim();
      }
      cleanedCropText = cleanedCropText.replace(/[-_~|.,]+$/, "").trim();
      cleanedCropText = normalizeBilingualValue(cleanedCropText);

      const extractedText = cleanedCropText || "No OCR text found in selected area";
        
      if (anchorCaptureTargetFieldId) {
        createLinkedAnchor(anchorCaptureTargetFieldId, box, extractedText, cropOcr?.confidence ? cropOcr.confidence * 100 : 90, anchorCaptureRelationship);
        setPendingAnnotation(null);
        return;
      }
      if (activeTool === "anchor") {
        if (selectedFieldId) {
          createLinkedAnchor(selectedFieldId, box, extractedText, cropOcr?.confidence ? cropOcr.confidence * 100 : 90, "Primary Anchor");
        } else {
          toast.warning("Select a field first, then draw its anchor label with the Anchor tool.");
        }
        setPendingAnnotation(null);
        return;
      }
      if (selectedFieldId && activeTool === "select") {
        const safeValue = /reading selected area|no ocr text/i.test(extractedText) ? "" : extractedText;
        setFields(prev => prev.map(f => f.id === selectedFieldId ? {
          ...f, value: safeValue, x: box.x, y: box.y, width: box.width, height: box.height,
          confidence: cropOcr?.confidence ? cropOcr.confidence * 100 : 90
        } : f));
        setPendingAnnotation(null);
        toast.success(`Mapped to selected field`);
        return;
      }
      const intelligence = inferSelection(cleanedCropText);
      const bestName = nearestLabel?.text || headerText || intelligence.detectedObject;
      const safeValue = /reading selected area|no ocr text/i.test(extractedText) ? "" : (cleanedCropText || extractedText);

      if (activeTool === "smart") {
        const fieldId = nextId("field");
        setFields(prev => [...prev, {
          id: fieldId, name: bestName,
          type: intelligence.suggestedType || "text",
          required: true, enabled: true,
          confidence: cropOcr?.confidence ?? intelligence.confidence / 100,
          value: safeValue,
          x: box.x, y: box.y, width: box.width, height: box.height,
          locatorStrategy: "hybrid", pageStrategy: "detect_by_text",
          searchDirection: "nearest", expansionMode: "line",
          stopAtNextLabel: true, allowLongText: true,
          categoryId: selectedCategoryId || null
        }]);
        if (nearestLabel) {
          const anchorId = nextId("anchor");
          setAnchors(prev => [...prev, {
            id: anchorId, value: nearestLabel.text, type: "primary",
            x: nearestLabel.wordBox.x, y: nearestLabel.wordBox.y,
            width: nearestLabel.wordBox.width, height: nearestLabel.wordBox.height,
            confidence: 0.96
          }]);
          setLinks(prev => [...prev, { fieldId, anchorId, relationship: "Primary Anchor", confidence: 0.96 }]);
        }
        setSelectedFieldId(fieldId);
        toast.success(`Smart: "${bestName}"${nearestLabel ? ` · auto-anchored to "${nearestLabel.text}"` : ""}`);
        return;
      }

      setPendingAnnotation({
        box, clientPos, extractedText: safeValue,
        ...intelligence,
        detectedObject: bestName,
        confidence: cropOcr?.confidence ? cropOcr.confidence * 100 : intelligence.confidence,
        autoAnchorText: nearestLabel?.text,
        autoAnchorBox: nearestLabel?.wordBox
      });
    } catch (error) {
      console.error("Selected-area OCR failed:", error);
      const extractedText = activePage?.ocrText
        ? "No positioned OCR words found here. Use OCR overlay or rerun OCR for this page."
        : "No OCR text found. Run OCR before validating selected text.";
      if (anchorCaptureTargetFieldId) {
        createLinkedAnchor(anchorCaptureTargetFieldId, box, extractedText, 0.5, anchorCaptureRelationship);
        setPendingAnnotation(null);
        return;
      }
      const intelligence = inferSelection("");
      setPendingAnnotation({ box, clientPos, extractedText, ...intelligence });
    }
  };

  const handleDeleteAnnotation = (id: string, type: string) => {
    if (type === "anchor" || id.startsWith("anchor_")) {
      setAnchors(prev => prev.filter(a => a.id !== id));
      setLinks(prev => prev.filter(l => l.anchorId !== id));
      toast.info("Deleted anchor mapping");
    } else {
      setLinks(prevLinks => {
        const linkedAnchorIds = prevLinks.filter(link => link.fieldId === id).map(link => link.anchorId);
        setAnchors(prevAnchors => prevAnchors.filter(anchor => !linkedAnchorIds.includes(anchor.id)));
        toast.info(linkedAnchorIds.length > 0 ? "Cleared field coordinates and deleted linked anchors" : "Cleared coordinates mapping for field");
        return prevLinks.filter(link => link.fieldId !== id);
      });
      setFields(prev => prev.map(f => f.id === id ? {
        ...f,
        value: "",
        x: undefined,
        y: undefined,
        width: undefined,
        height: undefined,
        confidence: 0
      } : f));
    }
  };

  const handleSelectField = (id: string | null) => {
    setSelectedFieldId(id);
    if (id) setSelectedCategoryId(null);
  };

  const handleSelectCategory = (id: string | null) => {
    setSelectedCategoryId(id);
    if (id) setSelectedFieldId(null);
  };

  const handleAddCategory = (parentId?: string | null) => {
    const parent = parentId !== undefined ? parentId : selectedCategoryId;
    setCustomPrompt({
      title: "Create Category",
      message: "Enter Category/Sub-Category Name:",
      placeholder: "e.g. Applicant Identity",
      defaultValue: "",
      onConfirm: (name: string) => {
        if (name.trim()) {
          const newCategory = {
            id: nextId("cat"),
            name: name.trim(),
            parentId: parent || null
          };
          setCategories(prev => [...prev, newCategory]);
          setSelectedCategoryId(newCategory.id);
          setSelectedFieldId(null);
          toast.success(`Created category "${name.trim()}"`);
        }
      }
    });
  };

  const handleAddField = (categoryId?: string | null) => {
    const catId = categoryId !== undefined ? categoryId : selectedCategoryId;
    setCustomPrompt({
      title: "Create Field",
      message: "Enter Field Name:",
      placeholder: "e.g. passport_number",
      defaultValue: "",
      onConfirm: (name: string) => {
        if (name.trim()) {
          if (isDuplicateFieldName(name)) {
            toast.error(`A field named "${name.trim()}" already exists`);
            return;
          }
          const newField: StudioField = {
            id: nextId("field"),
            name: name.trim(),
            type: "text",
            required: true,
            enabled: true,
            confidence: 1.0,
            value: "",
            locatorStrategy: "hybrid",
            pageStrategy: "detect_by_text",
            searchDirection: "nearest",
            expansionMode: "line",
            stopAtNextLabel: true,
            allowLongText: true,
            categoryId: catId || null
          };
          setFields(prev => [...prev, newField]);
          setSelectedFieldId(newField.id);
          setSelectedCategoryId(null);
          toast.success(`Created field "${name.trim()}"`);
        }
      }
    });
  };

  const handleDeleteField = (id: string) => {
    setLinks(prevLinks => {
      const ownedAnchorIds = prevLinks.filter(l => l.fieldId === id).map(l => l.anchorId);
      const sharedAnchorIds = prevLinks.filter(l => l.fieldId !== id).map(l => l.anchorId);
      // Only delete anchors that belong exclusively to this field
      const exclusiveAnchorIds = ownedAnchorIds.filter(aid => !sharedAnchorIds.includes(aid));
      if (exclusiveAnchorIds.length > 0) {
        setAnchors(prev => prev.filter(a => !exclusiveAnchorIds.includes(a.id)));
      }
      toast.info(exclusiveAnchorIds.length > 0 ? "Deleted field and its anchors" : "Deleted field");
      return prevLinks.filter(l => l.fieldId !== id);
    });
    setFields(prev => prev.filter(f => f.id !== id));
    setSelectedFieldId(prev => prev === id ? null : prev);
    setAnchorCaptureTargetFieldId(prev => prev === id ? null : prev);
  };

  const updateFieldConfig = (id: string, updates: Partial<StudioField>) => {
    setFields(prev => prev.map(field => {
      if (field.id !== id) return field;
      const merged = { ...field, ...updates };
      // Re-format stored value when dateFormat changes on a date field that already has a value
      if (updates.dateFormat && merged.type === "date" && merged.value) {
        merged.value = formatFieldValue(merged);
      }
      return merged;
    }));
  };

  const moveFieldToCategory = (fieldId: string, categoryId: string | null) => {
    const field = fields.find(f => f.id === fieldId);
    if (!field || field.categoryId === categoryId) return;
    updateFieldConfig(fieldId, { categoryId });
    const categoryName = categoryId ? categories.find(c => c.id === categoryId)?.name : "Uncategorized";
    toast.success(`Moved "${field.name}" to ${categoryName || "Uncategorized"}`);
  };

  const handleDeleteCategory = (id: string) => {
    const getDescendantIds = (catId: string): string[] => {
      const children = categories.filter(c => c.parentId === catId);
      let descIds = children.map(c => c.id);
      for (const child of children) {
        descIds = [...descIds, ...getDescendantIds(child.id)];
      }
      return descIds;
    };
    const allToDelete = [id, ...getDescendantIds(id)];
    setCategories(prev => prev.filter(c => !allToDelete.includes(c.id)));
    setFields(prev => prev.filter(f => !f.categoryId || !allToDelete.includes(f.categoryId)));
    if (selectedCategoryId && allToDelete.includes(selectedCategoryId)) {
      setSelectedCategoryId(null);
    }
    toast.info("Deleted category and its contents");
  };

  const applyIndianPassportModel = () => {
    const createCategory = (name: string, parentId: string | null = null): StudioCategory => ({
      id: nextId("cat"),
      name,
      parentId
    });

    const readBoxText = (box: SelectionBox) => {
      const words = getWordsInSelection(box);
      const text = words.map(word => word.text).join(" ").replace(/\s+/g, " ").trim();
      return {
        text,
        confidence: words.length > 0 ? averageConfidence(words) : 0.88
      };
    };

    const smartDefaults = {
      locatorStrategy: "hybrid" as const,
      pageStrategy: "detect_by_text" as const,
      stopAtNextLabel: true,
      allowLongText: true
    };

    const root = createCategory("Indian Passport");
    const header = createCategory("Header & Document Identity", root.id);
    const personal = createCategory("Personal Details", root.id);
    const places = createCategory("Places & Dates", root.id);
    const biometric = createCategory("Biometric & Signature", root.id);
    const machineReadable = createCategory("Machine Readable Zone", root.id);
    const templateCategories = [root, header, personal, places, biometric, machineReadable];

    const fieldTemplates: Array<{
      name: string;
      type: string;
      categoryId: string;
      box: SelectionBox;
      anchorLabel: string;
      anchorBox: SelectionBox;
      searchDirection?: StudioField["searchDirection"];
      expansionMode?: StudioField["expansionMode"];
      dateFormat?: string;
      regex?: string;
      valueFallback?: string;
    }> = [
      {
        name: "Passport Number",
        type: "id",
        categoryId: header.id,
        box: { x: 73, y: 13, width: 14, height: 4 },
        anchorLabel: "Passport No",
        anchorBox: { x: 69, y: 9, width: 13, height: 3 },
        searchDirection: "below",
        regex: "^[A-Z][0-9]{7}$"
      },
      {
        name: "Surname",
        type: "text",
        categoryId: personal.id,
        box: { x: 49, y: 23, width: 16, height: 4 },
        anchorLabel: "Surname",
        anchorBox: { x: 48, y: 17.5, width: 12, height: 3 },
        searchDirection: "below",
        expansionMode: "line"
      },
      {
        name: "Given Name",
        type: "text",
        categoryId: personal.id,
        box: { x: 49, y: 35, width: 16, height: 4 },
        anchorLabel: "Given Name",
        anchorBox: { x: 48, y: 30, width: 14, height: 3 },
        searchDirection: "below",
        expansionMode: "line"
      },
      {
        name: "Date of Birth",
        type: "date",
        categoryId: personal.id,
        box: { x: 49, y: 45, width: 16, height: 4 },
        anchorLabel: "Date of Birth",
        anchorBox: { x: 48, y: 40, width: 15, height: 3 },
        searchDirection: "below",
        expansionMode: "line",
        dateFormat: "DD/MM/YYYY"
      },
      {
        name: "Sex",
        type: "text",
        categoryId: personal.id,
        box: { x: 68, y: 45, width: 5, height: 4 },
        anchorLabel: "Sex",
        anchorBox: { x: 67, y: 40, width: 7, height: 3 },
        searchDirection: "below",
        expansionMode: "box"
      },
      {
        name: "Place of Birth",
        type: "text",
        categoryId: places.id,
        box: { x: 49, y: 56, width: 23, height: 4 },
        anchorLabel: "Place of Birth",
        anchorBox: { x: 48, y: 51, width: 16, height: 3 },
        searchDirection: "below",
        expansionMode: "line"
      },
      {
        name: "Place of Issue",
        type: "text",
        categoryId: places.id,
        box: { x: 49, y: 69, width: 16, height: 4 },
        anchorLabel: "Place of Issue",
        anchorBox: { x: 48, y: 64, width: 16, height: 3 },
        searchDirection: "below",
        expansionMode: "line"
      },
      {
        name: "Date of Issue",
        type: "date",
        categoryId: places.id,
        box: { x: 49, y: 78, width: 15, height: 4 },
        anchorLabel: "Date of Issue",
        anchorBox: { x: 48, y: 73, width: 16, height: 3 },
        searchDirection: "below",
        expansionMode: "line",
        dateFormat: "DD/MM/YYYY"
      },
      {
        name: "Date of Expiry",
        type: "date",
        categoryId: places.id,
        box: { x: 76, y: 78, width: 15, height: 4 },
        anchorLabel: "Date of Expiry",
        anchorBox: { x: 73, y: 73, width: 17, height: 3 },
        searchDirection: "below",
        expansionMode: "line",
        dateFormat: "DD/MM/YYYY"
      },
      {
        name: "Signature Present",
        type: "signature",
        categoryId: biometric.id,
        box: { x: 27, y: 68, width: 17, height: 8 },
        anchorLabel: "Signature",
        anchorBox: { x: 22, y: 62, width: 14, height: 4 },
        searchDirection: "nearest",
        expansionMode: "box",
        valueFallback: "true"
      },
      {
        name: "Photo",
        type: "image",
        categoryId: biometric.id,
        box: { x: 24, y: 28, width: 18, height: 32 },
        anchorLabel: "Photo",
        anchorBox: { x: 24, y: 22, width: 12, height: 4 },
        searchDirection: "nearest",
        expansionMode: "box"
      },
      {
        name: "MRZ",
        type: "multiline",
        categoryId: machineReadable.id,
        box: { x: 26, y: 88, width: 63, height: 8 },
        anchorLabel: "MRZ",
        anchorBox: { x: 23, y: 84, width: 10, height: 3 },
        searchDirection: "below",
        expansionMode: "multiline"
      }
    ];

    const newFields: StudioField[] = [];
    const newAnchors: StudioAnchor[] = [];
    const newLinks: StudioLink[] = [];

    fieldTemplates.forEach(template => {
      const extracted = readBoxText(template.box);
      const fieldId = nextId("field");
      const anchorId = nextId("anchor");
      newFields.push({
        id: fieldId,
        name: template.name,
        type: template.type,
        required: true,
        enabled: true,
        confidence: extracted.confidence || 0.9,
        value: extracted.text || template.valueFallback || "",
        categoryId: template.categoryId,
        x: template.box.x,
        y: template.box.y,
        width: template.box.width,
        height: template.box.height,
        regex: template.regex,
        dateFormat: template.dateFormat,
        ...smartDefaults,
        searchDirection: template.searchDirection || "nearest",
        expansionMode: template.expansionMode || "line"
      });
      newAnchors.push({
        id: anchorId,
        value: template.anchorLabel,
        type: "primary",
        x: template.anchorBox.x,
        y: template.anchorBox.y,
        width: template.anchorBox.width,
        height: template.anchorBox.height,
        confidence: 0.96
      });
      newLinks.push({
        fieldId,
        anchorId,
        relationship: "Primary Anchor",
        confidence: 0.96
      });
    });

    setCategories(prev => [...prev, ...templateCategories]);
    setFields(prev => {
      const combined = [...prev, ...newFields];
      return combined.filter((f, i, a) => a.findIndex(x => x.id === f.id) === i);
    });
    setAnchors(prev => {
      const combined = [...prev, ...newAnchors];
      return combined.filter((a, i, arr) => arr.findIndex(x => x.id === a.id) === i);
    });
    setLinks(prev => [...prev, ...newLinks]);
    setSelectedFieldId(newFields[0]?.id || null);
    setSelectedCategoryId(null);
    setAnchorCaptureTargetFieldId(null);
    setActiveLayer("extraction");
    toast.success("Indian Passport model created with fields, anchors, and smart locator rules.");
  };

  const tools = [
    {
      id: "select", icon: MousePointer2, label: "Select", shortcut: "V",
      description: "Select and move existing field or anchor boxes on the canvas."
    },
    {
      id: "pan", icon: Hand, label: "Pan", shortcut: "H",
      description: "Hold and drag to scroll/pan around the document. Also: Shift + drag."
    },
    {
      id: "field", icon: Box, label: "Field", shortcut: "F",
      description: "Draw a rectangle to define an extraction field. A popup will let you name the field and set its type."
    },
    {
      id: "smart", icon: Wand2, label: "Smart", shortcut: "S",
      description: "AI-powered auto-detect. Draw a box — the engine identifies the field type and creates the field automatically."
    },
    {
      id: "anchor", icon: Anchor, label: "Anchor", shortcut: "A",
      description: "Draw a box around a label text to anchor a field. Anchors help locate fields even when their position shifts across pages."
    },
    {
      id: "table", icon: Grid2X2, label: "Table", shortcut: "T",
      description: "Select a table region. Supports multi-page tables — rows spanning multiple pages are captured as a single table field."
    },
    {
      id: "checkbox", icon: CheckSquare, label: "Check", shortcut: "C",
      description: "Capture a checkbox or checkbox group. Extracts checked/unchecked state and the associated label."
    },
    {
      id: "radio", icon: Circle, label: "Radio", shortcut: "R",
      description: "Capture a radio button group. Only one option can be selected — the extracted value is the selected option's label."
    },
    {
      id: "barcode", icon: ScanLine, label: "Barcode", shortcut: "B",
      description: "Scan a barcode or QR code region. Supports horizontal and vertical 1D barcodes, 2D QR codes, and Data Matrix."
    },
    {
      id: "signature", icon: Baseline, label: "Sign", shortcut: "Z",
      description: "Mark a signature zone. Detects whether a signature is present in that region. Does not compare signatures — use for presence validation only."
    },
  ];

  const layerOptions = [
    { id: "ocr", icon: Eye, label: "Text" },
    { id: "extraction", icon: Layers, label: "Extraction" },
    { id: "ai", icon: Sparkles, label: "AI Help" },
    { id: "validation", icon: ShieldCheck, label: "Checks" }
  ];
  const overlayOptions = [
    { key: "ocrWords", label: "Text", description: "Show recognized words" },
    { key: "ocrConfidence", label: "Confidence", description: "Show OCR confidence" },
    { key: "documentStructure", label: "Layout", description: "Show document layout guides" },
    { key: "objectDetection", label: "Objects", description: "Show detected objects" },
    { key: "anchorRelationships", label: "Links", description: "Show field-anchor links" },
    { key: "heatMap", label: "Heat", description: "Show extraction attention heat map" }
  ] as const;

  // Weighted Confidence Engine
  const getFieldConfidence = (field: StudioField) => {
    const boundLinks = links.filter(l => l.fieldId === field.id);
    if (boundLinks.length === 0) return field.confidence ?? 0;
    
    let totalWeight = 0;
    let weightedSum = 0;
    boundLinks.forEach(link => {
      const anchor = anchors.find(a => a.id === link.anchorId);
      if (anchor) {
        const weight = link.confidence || 1.0;
        weightedSum += (anchor.confidence || 0.9) * weight;
        totalWeight += weight;
      }
    });
    return totalWeight > 0 ? (weightedSum / totalWeight) : (field.confidence || 1.0);
  };

  const fieldsWithCalculatedConfidence = fields.map(f => ({
    ...f,
    confidence: getFieldConfidence(f)
  }));
  const enabledFieldsWithCalculatedConfidence = fieldsWithCalculatedConfidence.filter(field => field.enabled !== false);
  const mappedEnabledFields = enabledFieldsWithCalculatedConfidence.filter(hasMappedArea);

  const anchorCaptureTargetField = fieldsWithCalculatedConfidence.find(f => f.id === anchorCaptureTargetFieldId);
  const activeTraceFieldId = hoveredFieldId || selectedFieldId;
  const selectedDataField = fieldsWithCalculatedConfidence.find(f => f.id === activeTraceFieldId);
  const selectedFieldLinkedAnchorIds = activeTraceFieldId
    ? links.filter(link => link.fieldId === activeTraceFieldId).map(link => link.anchorId)
    : [];
  const selectedFieldAnchors = anchors.filter(anchor => selectedFieldLinkedAnchorIds.includes(anchor.id));
  const visibleCanvasAnnotations = [
    ...mappedEnabledFields.map((f, index) => ({
      ...f,
      type: "field",
      label: f.name,
      color: getFieldColor(f, index),
      anchorCount: links.filter(l => l.fieldId === f.id).length
    })),
    ...anchors
      .filter(anchor => {
        // If a pending annotation is showing, we hide all anchors (user is creating/reviewing a new box)
        if (pendingAnnotation) return false;
        
        // Show anchor only if its linked field is selected/hovered,
        // or if the anchor itself is selected/hovered.
        const isLinkedToActiveField = activeTraceFieldId
          ? links.some(l => l.anchorId === anchor.id && l.fieldId === activeTraceFieldId)
          : false;
        const isLinkedToCaptureField = anchorCaptureTargetFieldId
          ? links.some(l => l.anchorId === anchor.id && l.fieldId === anchorCaptureTargetFieldId)
          : false;
        const isAnchorActive = selectedFieldId === anchor.id || hoveredFieldId === anchor.id || selectedFieldId === `anchor_${anchor.id}`;
        
        return isLinkedToActiveField || isLinkedToCaptureField || isAnchorActive;
      })
      .map(anchor => ({
        ...anchor,
        type: "anchor",
        label: anchor.value,
        value: anchor.value
      }))
  ].filter((ann, idx, arr) => arr.findIndex(a => a.id === ann.id) === idx);
  const reviewRows = [
    activeDocument?.classification?.className ? {
      id: "document_type",
      name: "Document Type",
      type: "text",
      enabled: true,
      value: activeDocument.classification.className,
      confidence: activeDocument.classification.confidence || 0.99,
      x: 0,
      y: 0,
      width: 0,
      height: 0
    } : null,
    ...fieldsWithCalculatedConfidence
  ].filter(Boolean) as Array<StudioField & { id: string }>;
  const previewRows = [
    activeDocument?.classification?.className ? reviewRows[0] : null,
    ...enabledFieldsWithCalculatedConfidence
  ].filter(Boolean) as Array<StudioField & { id: string }>;
  const visibleSchemaGroups = (() => {
    const groups: Array<{ id: string; name: string; fields: StudioField[] }> = [];
    categories.forEach(category => {
      const categoryFields = fieldsWithCalculatedConfidence.filter(field => field.categoryId === category.id);
      if (categoryFields.length > 0) groups.push({ id: category.id, name: category.name, fields: categoryFields });
    });
    const uncategorizedFields = fieldsWithCalculatedConfidence.filter(field => !field.categoryId);
    if (uncategorizedFields.length > 0) groups.push({ id: "uncategorized", name: "Uncategorized Fields", fields: uncategorizedFields });
    return groups;
  })();
  const palette = ["bg-emerald-500", "bg-orange-500", "bg-blue-500", "bg-violet-500", "bg-amber-500", "bg-teal-500", "bg-rose-500", "bg-indigo-500"];
  const tracePalette = ["#10b981", "#f97316", "#3b82f6", "#8b5cf6", "#f59e0b", "#14b8a6", "#f43f5e", "#6366f1"];
  const getRowColor = (index: number) => palette[index % palette.length];
  const getTraceColor = (index: number) => tracePalette[index % tracePalette.length];
  function getFieldColor(field: StudioField, index: number) {
    const name = field.name.toLowerCase();
    if (name.includes("passport number")) return "#10b981";
    if (name.includes("surname")) return "#f97316";
    if (name.includes("given")) return "#3b82f6";
    if (name.includes("nationality")) return "#8b5cf6";
    if (name.includes("birth")) return name.includes("place") ? "#14b8a6" : "#f59e0b";
    if (name.includes("issue")) return "#3b82f6";
    if (name.includes("expiry")) return "#ef4444";
    if (name.includes("mrz")) return "#a855f7";
    const fallback = ["#10b981", "#f97316", "#3b82f6", "#8b5cf6", "#f59e0b", "#14b8a6", "#f43f5e", "#6366f1"];
    return fallback[index % fallback.length];
  }
  const getFieldStatus = (field: StudioField) => {
    if (field.id === "document_type") return "Validated";
    if (field.value) return "Validated";
    if (field.x !== undefined) return "Mapped";
    return "Needs review";
  };
  React.useEffect(() => {
    reviewRowsRef.current = previewRows;
    activeTraceFieldIdRef.current = activeTraceFieldId;
  });

  const getEvidenceSummary = (field: StudioField) => {
    if (field.id === "document_type") return "AI classification";
    const linkCount = links.filter(link => link.fieldId === field.id).length;
    const evidence = ["OCR"];
    if (linkCount > 0) evidence.push(linkCount > 1 ? "Multiple anchors" : "Anchor");
    if (field.locatorStrategy === "hybrid" || field.x !== undefined) evidence.push("Position");
    if (field.regex || field.type === "date" || field.name.toLowerCase().includes("mrz")) evidence.push("Validation");
    return evidence.join(" + ");
  };

  React.useEffect(() => {
    measureTraceLinesRef.current = () => {
      const workspace = workspaceRef.current;
      const documentSurface = workspace?.querySelector<HTMLElement>("[data-document-canvas-surface='true']");
      if (!workspace || !documentSurface) {
        setTraceLines([]);
        setRelationshipLines([]);
        return;
      }

      const workspaceRect = workspace.getBoundingClientRect();
      const documentRect = documentSurface.getBoundingClientRect();
      const seenIds = new Set<string>();
      const currentRows = reviewRowsRef.current.filter(r => seenIds.has(r.id) ? false : (seenIds.add(r.id), true));
      const currentActiveFieldId = activeTraceFieldIdRef.current;

      const nextLines = currentRows
        .map((field, index) => {
          if (field.id === "document_type" || !hasMappedArea(field)) return null;
          const row = previewRowRefs.current[field.id];
          if (!row) return null;
          const rowRect = row.getBoundingClientRect();
          const startX = documentRect.left - workspaceRect.left + (field.x / 100) * documentRect.width;
          const startY = documentRect.top - workspaceRect.top + ((field.y + field.height / 2) / 100) * documentRect.height;
          const endX = rowRect.right - workspaceRect.left - 5;
          const endY = rowRect.top - workspaceRect.top + rowRect.height / 2;
          const distance = Math.max(70, Math.abs(startX - endX) * 0.42);
          return {
            id: field.id,
            color: getFieldColor(field, index),
            active: currentActiveFieldId === field.id,
            path: `M ${startX} ${startY} C ${startX - distance} ${startY}, ${endX + distance} ${endY}, ${endX} ${endY}`
          };
        })
        .filter(Boolean) as TraceLine[];

      setTraceLines(prev => {
        const prevSignature = prev.map(line => `${line.id}:${line.path}:${line.active}`).join("|");
        const nextSignature = nextLines.map(line => `${line.id}:${line.path}:${line.active}`).join("|");
        return prevSignature === nextSignature ? prev : nextLines;
      });

      // Calculate relationship lines between anchors and fields
      const nextRelationships: RelationshipLine[] = [];
      links.forEach((link) => {
        const field = fields.find(f => f.id === link.fieldId);
        const anchor = anchors.find(a => a.id === link.anchorId);
        if (field && anchor && hasMappedArea(field)) {
          const aX = anchor.x;
          const aY = anchor.y;
          const aW = anchor.width;
          const aH = anchor.height;

          const fX = field.x;
          const fY = field.y;
          const fW = field.width;
          const fH = field.height;

          let startX = 0;
          let startY = 0;
          let endX = 0;
          let endY = 0;

          const getPixelCoords = (pctX: number, pctY: number) => ({
            x: documentRect.left - workspaceRect.left + (pctX / 100) * documentRect.width,
            y: documentRect.top - workspaceRect.top + (pctY / 100) * documentRect.height
          });

          const anchorCenter = getPixelCoords(aX + aW / 2, aY + aH / 2);
          const fieldCenter = getPixelCoords(fX + fW / 2, fY + fH / 2);

          if (aX + aW < fX) {
            // Anchor is to the left of the field
            const start = getPixelCoords(aX + aW, aY + aH / 2);
            const end = getPixelCoords(fX, fY + fH / 2);
            startX = start.x; startY = start.y; endX = end.x; endY = end.y;
          } else if (fX + fW < aX) {
            // Anchor is to the right of the field
            const start = getPixelCoords(aX, aY + aH / 2);
            const end = getPixelCoords(fX + fW, fY + fH / 2);
            startX = start.x; startY = start.y; endX = end.x; endY = end.y;
          } else if (aY + aH < fY) {
            // Anchor is above the field
            const start = getPixelCoords(aX + aW / 2, aY + aH);
            const end = getPixelCoords(fX + fW / 2, fY);
            startX = start.x; startY = start.y; endX = end.x; endY = end.y;
          } else if (fY + fH < aY) {
            // Anchor is below the field
            const start = getPixelCoords(aX + aW / 2, aY);
            const end = getPixelCoords(fX + fW / 2, fY + fH);
            startX = start.x; startY = start.y; endX = end.x; endY = end.y;
          } else {
            startX = anchorCenter.x; startY = anchorCenter.y;
            endX = fieldCenter.x; endY = fieldCenter.y;
          }

          const dx = endX - startX;
          const dy = endY - startY;

          let path = "";
          if (Math.abs(dx) > Math.abs(dy)) {
            const ctrlX1 = startX + dx * 0.4;
            const ctrlY1 = startY;
            const ctrlX2 = endX - dx * 0.4;
            const ctrlY2 = endY;
            path = `M ${startX} ${startY} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${endX} ${endY}`;
          } else {
            const ctrlX1 = startX;
            const ctrlY1 = startY + dy * 0.4;
            const ctrlX2 = endX;
            const ctrlY2 = endY - dy * 0.4;
            path = `M ${startX} ${startY} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${endX} ${endY}`;
          }

          const labelX = (startX + endX) / 2;
          const labelY = (startY + endY) / 2 - 8;

          const fieldIndex = fields.findIndex(f => f.id === field.id);

          nextRelationships.push({
            id: `link-${link.anchorId}-${link.fieldId}`,
            color: "#71717a",
            active: currentActiveFieldId === field.id || currentActiveFieldId === anchor.id || currentActiveFieldId === `anchor_${anchor.id}`,
            path,
            label: link.relationship || "Anchor",
            fieldName: field.name,
            labelX,
            labelY
          });
        }
      });

      setRelationshipLines(prev => {
        const prevSig = prev.map(line => `${line.id}:${line.path}:${line.active}`).join("|");
        const nextSig = nextRelationships.map(line => `${line.id}:${line.path}:${line.active}`).join("|");
        return prevSig === nextSig ? prev : nextRelationships;
      });

      // ── Callout labels: positioned in canvas margin, pointing to annotation boxes ──
      const canvasPanel = canvasPanelRef.current;
      if (canvasPanel) {
        const panelRect = canvasPanel.getBoundingClientRect();
        const docL  = documentRect.left  - workspaceRect.left;
        const docT  = documentRect.top   - workspaceRect.top;
        const docR  = documentRect.right - workspaceRect.left;
        const docCX = docL + documentRect.width / 2;

        const CHIP_W = 148; const CHIP_H = 26; const CHIP_GAP = 4; const MARGIN = 14;

        // Positioned fields
        const fieldItems = currentRows
          .filter(f => f.id !== "document_type" && hasMappedArea(f))
          .map((f, i) => {
            const fx = f.x as number; const fy = f.y as number;
            const fw = f.width as number; const fh = f.height as number;
            return {
              id: f.id, name: f.name, color: getFieldColor(f, i), isAnchor: false,
              cx: docL + ((fx + fw / 2) / 100) * documentRect.width,
              cy: docT + ((fy + fh / 2) / 100) * documentRect.height,
              lx: docL + (fx / 100) * documentRect.width,
              rx: docL + ((fx + fw) / 100) * documentRect.width,
            };
          });

        // Visible anchors (linked to active field, or all when none selected)
        const visibleAnchors = anchors.filter(a =>
          a.x !== undefined &&
          (currentActiveFieldId
            ? links.some(l => l.anchorId === a.id && l.fieldId === currentActiveFieldId)
            : false)
        );
        const anchorItems = visibleAnchors.map(a => ({
          id: a.id, name: a.value || "Anchor", color: "#6b7280", isAnchor: true,
          cx: docL + ((a.x! + a.width! / 2) / 100) * documentRect.width,
          cy: docT + ((a.y! + a.height! / 2) / 100) * documentRect.height,
          lx: docL + (a.x! / 100) * documentRect.width,
          rx: docL + ((a.x! + a.width!) / 100) * documentRect.width,
        }));

        const allItems = [...fieldItems, ...anchorItems];
        const leftItems  = allItems.filter(i => i.cx <= docCX).sort((a, b) => a.cy - b.cy);
        const rightItems = allItems.filter(i => i.cx >  docCX).sort((a, b) => a.cy - b.cy);

        const clampY = (y: number) => Math.max(docT, Math.min(docT + documentRect.height - CHIP_H, y));
        const nextCallouts: CalloutLabel[] = [];

        const sides: Array<[typeof leftItems, "left" | "right"]> = [[leftItems, "left"], [rightItems, "right"]];
        for (const [items, side] of sides) {
          let nextY = docT;
          for (const item of items) {
            const chipY = Math.max(nextY, clampY(item.cy - CHIP_H / 2));
            nextY = chipY + CHIP_H + CHIP_GAP;
            const chipX = side === "left" ? docL - MARGIN - CHIP_W : docR + MARGIN;
            nextCallouts.push({
              id: item.id, name: item.name, color: item.color, isAnchor: item.isAnchor,
              active: currentActiveFieldId === item.id,
              side,
              chipX, chipY,
              annEdgeX: side === "left" ? item.lx : item.rx,
              annEdgeY: item.cy,
            });
          }
        }

        const dedupedCallouts = nextCallouts.filter((c, i, a) => a.findIndex(x => x.id === c.id) === i);
        setCalloutLabels(prev => {
          const sig = (c: CalloutLabel[]) => c.map(x => `${x.id}:${x.chipX.toFixed(1)}:${x.chipY.toFixed(1)}:${x.active}`).join("|");
          return sig(prev) === sig(dedupedCallouts) ? prev : dedupedCallouts;
        });
      }
    };
  });

  React.useEffect(() => {
    const run = () => measureTraceLinesRef.current();
    const frame = window.requestAnimationFrame(run);
    window.addEventListener("resize", run);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", run);
    };
  }, []);

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => measureTraceLinesRef.current());
    return () => window.cancelAnimationFrame(frame);
  }, [activeTraceFieldId, fieldsWithCalculatedConfidence.length, previewRows.length]);

  React.useEffect(() => {
    if (!selectedFieldId) return;
    const row = previewRowRefs.current[selectedFieldId];
    row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedFieldId]);

  React.useEffect(() => {
    if (anchorCaptureTargetFieldId && !fields.some(field => field.id === anchorCaptureTargetFieldId)) {
      setAnchorCaptureTargetFieldId(null);
    }
  }, [anchorCaptureTargetFieldId, fields]);

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 bg-background font-sans select-none overflow-hidden text-foreground">
      
      {/* ELITE TOP ACTION BAR */}
      <div className="flex items-center gap-3 px-4 py-2.5 shrink-0 border-b border-border bg-background/80 backdrop-blur-md z-30">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex shrink-0 flex-col pr-1">
            <h2 className="text-xs font-black tracking-widest text-foreground uppercase flex items-center gap-2">
               <Layers size={14} className="text-primary" />
               Extraction Studio
            </h2>
            <p className="text-primary/80 text-[8px] font-bold uppercase tracking-[0.2em] mt-0.5">
               Spatial Engineering
            </p>
          </div>

          {/* Document Navigator — replaces dropdown */}
          <div className="relative shrink-0">
            <label className="mb-1 block text-[8px] font-black uppercase tracking-widest text-muted-foreground">
              Document
            </label>
            <button
              onClick={() => setDocPickerOpen(o => !o)}
              className="flex h-8 min-w-[180px] max-w-[240px] items-center gap-2 rounded-lg border border-border/70 bg-card px-3 text-left transition hover:border-primary/50 hover:bg-muted/30"
            >
              <FileText size={12} className="shrink-0 text-primary" />
              <span className="flex-1 truncate text-[10px] font-black uppercase text-foreground">
                {activeDocument
                  ? (activeDocument.classification?.className || activeDocument.name)
                  : "No document"}
              </span>
              <span className="shrink-0 text-[8px] font-black text-muted-foreground">
                {trainingDocuments.length > 0 ? `${trainingDocuments.indexOf(activeDocument!) + 1}/${trainingDocuments.length}` : "0"}
              </span>
              <ChevronDown size={11} className={cn("shrink-0 text-muted-foreground transition-transform", docPickerOpen && "rotate-180")} />
            </button>

            {docPickerOpen && (
              <>
                {/* Click-away backdrop */}
                <div className="fixed inset-0 z-[90]" onClick={() => setDocPickerOpen(false)} />
                {/* Panel */}
                <div className="absolute left-0 top-full z-[100] mt-1 w-80 rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5 bg-muted/30">
                    <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                      {trainingDocuments.length} Document{trainingDocuments.length !== 1 ? "s" : ""}
                    </span>
                    <button onClick={() => setDocPickerOpen(false)} className="text-muted-foreground hover:text-foreground">
                      <X size={13} />
                    </button>
                  </div>
                  <div className="max-h-72 overflow-y-auto custom-scrollbar">
                    {trainingDocuments.length === 0 ? (
                      <div className="px-4 py-6 text-center text-[10px] font-bold text-muted-foreground">
                        No documents loaded. Upload documents in the Intake stage.
                      </div>
                    ) : trainingDocuments.map((doc, idx) => {
                      const isActive = doc.documentId === activeDocument?.documentId;
                      const hasDesign = !!(doc.metadata?.extractionDesign?.fields?.length);
                      const docClass = doc.classification?.className;
                      const confidence = doc.classification?.confidence;
                      return (
                        <button
                          key={doc.documentId}
                          onClick={() => { setActiveDocument(doc); setDocPickerOpen(false); }}
                          className={cn(
                            "flex w-full items-start gap-3 px-4 py-3 text-left border-b border-border/50 last:border-0 transition-all",
                            isActive ? "bg-primary/5 border-l-2 border-l-primary" : "hover:bg-muted/40"
                          )}
                        >
                          {/* Doc index badge */}
                          <div className={cn(
                            "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[8px] font-black",
                            isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          )}>
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-[11px] font-black text-foreground uppercase tracking-tight">
                                {doc.name}
                              </span>
                              {isActive && (
                                <span className="shrink-0 rounded bg-primary/10 px-1.5 py-0.5 text-[7px] font-black text-primary uppercase">
                                  Active
                                </span>
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              {docClass && (
                                <span className="truncate text-[9px] font-bold text-muted-foreground">
                                  {docClass}
                                  {confidence ? ` · ${Math.round(confidence * 100)}%` : ""}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={cn(
                                "flex items-center gap-1 text-[8px] font-black uppercase",
                                hasDesign ? "text-emerald-600" : "text-muted-foreground/50"
                              )}>
                                <CheckCircle2 size={9} />
                                {hasDesign ? "Extraction mapped" : "Not mapped"}
                              </span>
                              {doc.pages?.length ? (
                                <span className="text-[8px] text-muted-foreground/60 font-bold">
                                  · {doc.pages.length} page{doc.pages.length !== 1 ? "s" : ""}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {/* Keyboard hint */}
                  <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                      Click to switch · {trainingDocuments.filter(d => !!(d.metadata?.extractionDesign?.fields?.length)).length} mapped
                    </span>
                    <div className="flex items-center gap-1">
                      <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground">↑</kbd>
                      <kbd className="rounded border border-border bg-card px-1.5 py-0.5 text-[8px] font-bold text-muted-foreground">↓</kbd>
                      <span className="text-[8px] text-muted-foreground/50 ml-1">navigate</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
          
          <div className="h-8 w-[1px] shrink-0 bg-border" />

          {/* Canvas Tools Group */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex flex-col select-none pr-1 min-w-[72px]">
              <span className="text-[8px] font-black uppercase text-muted-foreground/80 tracking-wider">Active Tool</span>
              <span className="text-[13px] font-bold text-foreground capitalize">
                {tools.find(t => t.id === activeTool)?.label}
              </span>
            </div>
            <div className="flex items-center gap-0.5 p-1 bg-muted/50 rounded-xl border border-border/50 shadow-inner">
               {tools.map((tool) => (
                 <div key={tool.id} className="relative group/tool">
                   <button
                     onClick={() => {
                       setActiveTool(tool.id);
                       if (tool.id !== "anchor") {
                         setAnchorCaptureTargetFieldId(null);
                       }
                     }}
                     title={`${tool.label} (${tool.shortcut})`}
                     className={cn(
                       "flex flex-col items-center justify-center gap-0.5 w-10 py-1.5 rounded-lg transition-all",
                       activeTool === tool.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                     )}
                   >
                     <tool.icon size={15} />
                     <span className="text-[7px] font-black uppercase tracking-wide leading-none">{tool.label}</span>
                   </button>
                   {/* Tooltip description on hover */}
                   <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1.5 z-[9999] hidden group-hover/tool:block w-52 pointer-events-none">
                     <div className="bg-gray-900 text-white text-[9px] font-medium rounded-lg px-3 py-2 shadow-xl leading-relaxed whitespace-normal">
                       <div className="font-black uppercase tracking-widest text-primary/80 mb-0.5">{tool.label} <span className="text-white/40">({tool.shortcut})</span></div>
                       {tool.description}
                     </div>
                   </div>
                 </div>
               ))}
            </div>
          </div>


        </div>

        <div className="flex shrink-0 items-center gap-2 border-l border-border pl-3">

          {/* Language selector — controls which language is kept from bilingual values */}
          <div className="flex items-center gap-1 h-9 bg-muted/40 border border-border rounded-xl px-1">
            {(["auto", "en", "fr", "es", "de"] as const).map(lang => (
              <button
                key={lang}
                onClick={() => { setAndPersistLang(lang); extractAllFieldValues(true); }}
                title={lang === "auto" ? "Auto-detect document language" : `Extract ${lang.toUpperCase()} text only`}
                className={cn(
                  "h-7 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                  extractionLanguage === lang
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {lang === "auto" ? "Auto" : lang.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Extract — reads OCR text layer into all positioned fields */}
          <button
            onClick={() => extractAllFieldValues(true)}
            disabled={isExtracting || isRefetchingOCR}
            title="Populate all positioned fields from the current OCR text layer"
            className="h-9 px-3 rounded-xl bg-card border border-sky-200 text-[9px] font-black uppercase tracking-widest hover:border-sky-400 hover:bg-sky-50 hover:text-sky-700 transition-all flex items-center gap-2 group shadow-sm text-sky-600 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isExtracting
              ? <RefreshCw size={13} className="animate-spin" />
              : <Zap size={13} className="group-hover:scale-110 transition-transform" />
            }
            Extract
          </button>

          {/* Re-OCR — re-runs OCR engine then extracts */}
          <button
            onClick={handleRefetchOCR}
            disabled={isRefetchingOCR || isExtracting}
            title="Re-run OCR on all pages, then refresh all field values"
            className="h-9 px-3 rounded-xl bg-card border border-violet-200 text-[9px] font-black uppercase tracking-widest hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 transition-all flex items-center gap-2 group shadow-sm text-violet-600 whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={isRefetchingOCR ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} />
            {isRefetchingOCR ? "Running OCR…" : "Re-OCR"}
          </button>

          {/* Enhance — toggles content enhancement */}
          <button
             onClick={() => {
               const newMode = documentViewMode === "enhanced" ? "original" : "enhanced";
               setDocumentViewMode(newMode);
             }}
             className={cn(
               "h-9 px-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group shadow-sm whitespace-nowrap",
               documentViewMode === "enhanced"
                 ? "bg-emerald-50 border-emerald-300 text-emerald-700"
                 : "bg-card border-border/50 text-muted-foreground hover:bg-muted hover:text-foreground"
             )}
             title={documentViewMode === "enhanced" ? "Content Enhancer ON — click to disable" : "Enable Intelligent Content Enhancer"}
          >
             <Wand2 size={13} className="group-hover:scale-110 transition-transform" />
             Enhance
          </button>

          {/* Apply Model — tries prebuilt first, then saved custom model */}
          <button
             onClick={() => {
               if (activePrebuiltModel) {
                 if (activeDocument?.documentId) {
                   appliedPrebuiltRouteRef.current[activeDocument.documentId] = activePrebuiltModel.code;
                 }
                 applyPrebuiltRoutingModel(activePrebuiltModel, activeDocument?.classification?.className || activeDocument?.name);
                 return;
               }
               const docClass = activeDocument?.classification?.className || activeDocument?.name || "";
               const ocrText = activeDocument?.pages?.[0]?.ocrText || "";
               const customModel = matchCustomModel(docClass, ocrText);
               if (customModel) { applyCustomModelToDocument(customModel); return; }
               toast.info("No model found for this document. Draw fields manually or train a custom model.");
             }}
             className="h-9 px-3 rounded-xl bg-card border border-blue-200 text-[9px] font-black uppercase tracking-widest hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all flex items-center gap-2 group shadow-sm text-foreground whitespace-nowrap"
             title={activePrebuiltModel ? `Apply prebuilt: ${activePrebuiltModel.name}` : "Apply saved custom model for this document type"}
          >
             <Sparkles size={13} className="text-blue-500 group-hover:scale-110 transition-transform" />
             {activePrebuiltModel ? activePrebuiltModel.name.replace(/\s*Extractor$/i, " Model") : "Apply Model"}
          </button>

          {/* Save Model */}
          <button
             onClick={openSaveModelDialog}
             className="h-9 px-3 rounded-xl bg-card border border-violet-200 text-[9px] font-black uppercase tracking-widest hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 transition-all flex items-center gap-2 group shadow-sm text-foreground whitespace-nowrap"
             title="Save current field layout as a reusable model that auto-applies to matching documents"
          >
             <BookMarked size={13} className="text-violet-500 group-hover:scale-110 transition-transform" />
             Save Model
          </button>

          {/* Clear — destructive, last */}
          <button
             onClick={() => {
                setConfirmDialog({
                  title: "Clear Mappings",
                  message: "Clear all field positions, extracted values, and anchors from this document? The field schema is preserved.",
                  onConfirm: () => {
                    setFields(prev => prev.map(f => ({ ...f, value: undefined, x: undefined, y: undefined, width: undefined, height: undefined, page: undefined })));
                    setAnchors([]);
                    setLinks([]);
                    setSelectedFieldId(null);
                    setPendingAnnotation(null);
                    setAnchorCaptureTargetFieldId(null);
                    toast.success("Mappings cleared.");
                    setConfirmDialog(null);
                  }
                });
              }}
             className="h-9 px-3 rounded-xl bg-card border border-rose-200 text-[9px] font-black uppercase tracking-widest hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 transition-all flex items-center gap-2 group shadow-sm text-rose-600 whitespace-nowrap"
             title="Clear all extracted data, positions, and anchors"
          >
             <Trash2 size={13} className="group-hover:scale-110 transition-transform" />
             Clear
          </button>

        </div>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <div
        ref={workspaceRef}
        className="grid flex-1 min-h-0 overflow-hidden gap-4 px-4 py-3 relative z-10 transition-all duration-300"
        style={{
          gridTemplateColumns: `${leftPanelCollapsed ? 44 : leftPanelWidth}px minmax(420px, 1fr)`,
          gridTemplateRows: "minmax(0, 1fr)"
        }}
      >
        <svg className="pointer-events-none absolute inset-0 z-50 h-full w-full overflow-visible">
          <defs>
            {traceLines.map(line => (
              <marker
                key={`marker-${line.id}`}
                id={`trace-arrow-${line.id}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={line.color} />
              </marker>
            ))}
            {relationshipLines.map(line => (
              <marker
                key={`marker-rel-${line.id}`}
                id={`rel-arrow-${line.id}`}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill={line.color} />
              </marker>
            ))}
          </defs>
          {traceLines.map(line => (
            <g key={line.id}>
              {line.active && (
                <path
                  d={line.path}
                  fill="none"
                  stroke={line.color}
                  strokeOpacity="0.18"
                  strokeWidth="9"
                  strokeLinecap="round"
                />
              )}
              <path
                d={line.path}
                fill="none"
                stroke={line.color}
                strokeDasharray={line.active ? "7 5" : "4 4"}
                strokeOpacity={line.active ? 0.95 : 0.72}
                strokeWidth={line.active ? 2.1 : 1.6}
                markerEnd={`url(#trace-arrow-${line.id})`}
                className={line.active ? "animate-flow" : undefined}
              />
            </g>
          ))}
          {overlayToggles.anchorRelationships && relationshipLines.filter(line => line.active).map(line => (
            <g key={line.id}>
              {line.active && (
                <path
                  d={line.path}
                  fill="none"
                  stroke={line.color}
                  strokeOpacity="0.22"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              )}
              <path
                d={line.path}
                fill="none"
                stroke={line.color}
                strokeDasharray={line.active ? "none" : "5 4"}
                strokeOpacity={line.active ? 1.0 : 0.65}
                strokeWidth={line.active ? 2.5 : 1.5}
                markerEnd={`url(#rel-arrow-${line.id})`}
              />
              {line.active && (
                <g>
                  <rect
                    x={line.labelX - 45}
                    y={line.labelY - 6}
                    width="90"
                    height="12"
                    rx="3"
                    fill="white"
                    stroke={line.color}
                    strokeWidth="0.5"
                    strokeOpacity="0.8"
                  />
                  <text
                    x={line.labelX}
                    y={line.labelY + 2.5}
                    textAnchor="middle"
                    fill={line.color}
                    fontSize="7"
                    fontWeight="black"
                    className="uppercase tracking-widest font-mono"
                  >
                    {line.label}
                  </text>
                </g>
              )}
            </g>
          ))}
          {/* Callout leader lines — from callout chip edge to annotation box edge */}
          <defs>
            {calloutLabels.map(c => (
              <marker key={`cm-${c.id}`} id={`callout-arr-${c.id}`}
                viewBox="0 0 10 10" refX={c.side === "left" ? "2" : "8"} refY="5"
                markerWidth="5" markerHeight="5" orient="auto">
                <path d={c.side === "left" ? "M 8 1.5 L 0 5 L 8 8.5 z" : "M 0 1.5 L 8 5 L 0 8.5 z"} fill={c.color} />
              </marker>
            ))}
          </defs>
          {calloutLabels.map(c => {
            const isHighlit = c.active || hoveredCalloutId === c.id;
            const chipMidY  = c.chipY + 13; // vertical center of chip (CHIP_H/2)
            // Chip attachment point — inner edge of chip
            const fromX = c.side === "left" ? c.chipX + 148 : c.chipX;
            const fromY = chipMidY;
            const toX   = c.annEdgeX;
            const toY   = c.annEdgeY;
            const dx    = toX - fromX;
            const ctrl  = Math.max(30, Math.abs(dx) * 0.45);
            const path  = c.side === "left"
              ? `M ${fromX} ${fromY} C ${fromX + ctrl} ${fromY}, ${toX - ctrl} ${toY}, ${toX} ${toY}`
              : `M ${fromX} ${fromY} C ${fromX - ctrl} ${fromY}, ${toX + ctrl} ${toY}, ${toX} ${toY}`;
            return (
              <g key={`cl-${c.id}`}>
                {isHighlit && (
                  <path d={path} fill="none" stroke={c.color}
                    strokeWidth="7" strokeOpacity="0.12" strokeLinecap="round" />
                )}
                <path d={path} fill="none" stroke={c.color}
                  strokeWidth={isHighlit ? 1.8 : 1.3}
                  strokeOpacity={isHighlit ? 0.9 : 0.55}
                  strokeDasharray={isHighlit ? "none" : "4 4"}
                  markerEnd={`url(#callout-arr-${c.id})`}
                />
              </g>
            );
          })}
        </svg>

        {/* Callout label chips — positioned in canvas margin, outside the document surface */}
        <div className="pointer-events-none absolute inset-0 z-[52]">
          {calloutLabels.map(c => {
            const isHighlit = c.active || hoveredCalloutId === c.id;
            return (
              <div
                key={`chip-${c.id}`}
                style={{ left: c.chipX, top: c.chipY, width: 148, height: 26 }}
                className="pointer-events-auto absolute"
                onMouseEnter={() => setHoveredCalloutId(c.id)}
                onMouseLeave={() => setHoveredCalloutId(null)}
                onClick={() => setSelectedFieldId(prev => prev === c.id ? null : c.id)}
              >
                {/* Chip */}
                <div
                  className="flex h-full w-full items-center gap-1.5 rounded-lg border px-2 shadow-md backdrop-blur-sm cursor-pointer select-none transition-all"
                  style={{
                    borderColor: isHighlit ? c.color : `${c.color}70`,
                    backgroundColor: isHighlit ? "rgba(255,255,255,0.98)" : "rgba(255,255,255,0.88)",
                    boxShadow: isHighlit ? `0 0 0 2px ${c.color}30, 0 2px 8px rgba(0,0,0,0.12)` : "0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  {c.isAnchor
                    ? <Anchor size={9} style={{ color: c.color, flexShrink: 0 }} />
                    : <Tag    size={9} style={{ color: c.color, flexShrink: 0 }} />
                  }
                  <span
                    className="truncate text-[10px] font-black uppercase tracking-wide"
                    style={{ color: c.color }}
                  >
                    {c.name}
                  </span>
                </div>

                {/* Action menu — shown above chip when field is active */}
                {c.active && !c.isAnchor && (activeTool === "select" || selectedFieldId !== null) && (
                  <div
                    className="absolute bottom-full left-0 mb-1.5 flex items-center gap-0.5 rounded-xl border border-border bg-white/97 p-1 shadow-2xl backdrop-blur-md whitespace-nowrap z-10"
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    {([
                      { action: "rename"    as const, title: "Rename field",        Icon: Edit3,     cls: "hover:bg-sky-50 hover:text-sky-700 text-sky-500" },
                      { action: "addAnchor" as const, title: "Add anchor to field", Icon: Anchor,    cls: "hover:bg-emerald-50 hover:text-emerald-700 text-emerald-500" },
                      { action: "changeType"as const, title: "Change field type",   Icon: Settings,  cls: "hover:bg-amber-50 hover:text-amber-700 text-amber-500" },
                    ] as const).map(item => (
                      <button key={item.action} title={item.title}
                        onClick={e => {
                          e.stopPropagation();
                          if (item.action === "rename") {
                            const field = fields.find(f => f.id === c.id);
                            const currentName = field?.name || "";
                            setCustomPrompt({ title: "Rename Field", placeholder: "e.g. Passport Number", defaultValue: currentName,
                              onConfirm: (value: string) => {
                                if (!value.trim()) return;
                                if (isDuplicateFieldName(value, c.id)) {
                                  toast.error(`A field named "${value.trim()}" already exists`);
                                  return;
                                }
                                setFields(prev => prev.map(f => f.id === c.id ? { ...f, name: value.trim() } : f));
                              }
                            });
                          } else if (item.action === "addAnchor") {
                            beginAnchorCaptureForField(c.id);
                          } else if (item.action === "changeType") {
                            const typeCycle = ["text","date","id","signature","table","checkbox"];
                            setFields(prev => prev.map(f => { if (f.id !== c.id) return f; const ci = Math.max(0, typeCycle.indexOf(f.type)); const nt = typeCycle[(ci + 1) % typeCycle.length]; return { ...f, type: nt, ...(nt === "date" && !f.dateFormat ? { dateFormat: "DD/MM/YYYY" } : {}) }; }));
                          }
                        }}
                        className={`flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground transition-colors ${item.cls}`}
                      >
                        <item.Icon size={12} />
                      </button>
                    ))}
                    <div className="w-px h-4 bg-border" />
                    <button title="Delete field"
                      onClick={e => { e.stopPropagation(); handleDeleteAnnotation(c.id, "field"); }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                    <div className="w-px h-4 bg-border" />
                    <button title="Done — deselect"
                      onClick={e => { e.stopPropagation(); setSelectedFieldId(null); }}
                      className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors"
                    >
                      <CheckCircle2 size={12} />
                    </button>
                  </div>
                )}

                {/* Anchor action menu */}
                {c.active && c.isAnchor && (
                  <div
                    className="absolute bottom-full left-0 mb-1.5 flex items-center gap-0.5 rounded-xl border border-border bg-white/97 p-1 shadow-2xl backdrop-blur-md whitespace-nowrap z-10"
                    onClick={e => e.stopPropagation()}
                  >
                    <button title="Delete anchor"
                      onClick={e => { e.stopPropagation(); handleDeleteAnnotation(c.id, "anchor"); }}
                      className="flex h-6 items-center gap-1.5 px-2 rounded-lg text-rose-600 hover:bg-rose-50 text-[9px] font-black uppercase tracking-wide transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* LEFT PANEL: FIELD EXTRACTOR (schema + extraction results merged) */}
        <div className="relative z-40 flex min-h-0 flex-col rounded-lg border border-slate-300 bg-white shadow-[0_1px_6px_rgba(15,23,42,0.08)] overflow-hidden">
          {leftPanelCollapsed ? (
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              className="flex h-full w-full items-center justify-center bg-slate-50 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-slate-100"
              title="Expand fields panel"
            >
              <span className="-rotate-90 whitespace-nowrap">Fields</span>
            </button>
          ) : (
          <>
          <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-slate-50 px-4 py-2.5">
            <div className="min-w-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Field Extractor</h3>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                Schema, extracted values &amp; configuration
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => setLeftPanelWidth(width => Math.max(280, width - 40))} className="h-6 w-6 rounded border border-slate-300 bg-white text-[11px] font-black text-muted-foreground hover:text-foreground" title="Narrow panel">-</button>
              <button onClick={() => setLeftPanelWidth(width => Math.min(560, width + 40))} className="h-6 w-6 rounded border border-slate-300 bg-white text-[11px] font-black text-muted-foreground hover:text-foreground" title="Widen panel">+</button>
              <button onClick={() => setLeftPanelCollapsed(true)} className="h-6 w-6 rounded border border-slate-300 bg-white text-muted-foreground hover:text-foreground" title="Collapse panel"><ChevronLeft size={13} className="mx-auto" /></button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-white px-4 py-2">
            <select
              value={selectedCategoryId || ""}
              onChange={(event) => handleSelectCategory(event.target.value || null)}
              className="h-7 min-w-0 flex-1 rounded border border-slate-300 bg-slate-50 px-2 text-[9px] font-bold text-foreground outline-none"
              title="Select category for new fields"
            >
              <option value="">All categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.parentId ? " - " : ""}{category.name}
                </option>
              ))}
            </select>
            <button onClick={() => handleAddCategory(null)} className="h-7 rounded border border-slate-300 px-2 text-[8px] font-black uppercase text-muted-foreground hover:text-foreground">
              Category
            </button>
            <button onClick={() => handleAddCategory(selectedCategoryId)} className="h-7 rounded border border-slate-300 px-2 text-[8px] font-black uppercase text-muted-foreground hover:text-foreground">
              Sub
            </button>
            <button onClick={() => handleAddField(selectedCategoryId)} className="h-7 rounded bg-primary px-2 text-[8px] font-black uppercase text-primary-foreground">
              Field
            </button>
          </div>

          <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50/80 px-4 py-1.5 text-[8px] font-black uppercase tracking-widest text-muted-foreground">
            <span className="w-10 shrink-0">Use</span>
            <span className="min-w-0 flex-1">Field / Extracted Value</span>
            <span className="shrink-0">Status</span>
          </div>

          <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto">
            {fieldsWithCalculatedConfidence.length === 0 ? (
              <div className="m-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-[10px] font-bold text-muted-foreground">
                No schema fields yet. Select a prebuilt model, create a category, or draw a field.
              </div>
            ) : visibleSchemaGroups.map(group => (
              <div key={group.id}>
                <div
                  onDragOver={(event) => { if (draggedFieldId) { event.preventDefault(); setDragOverGroupId(group.id); } }}
                  onDragLeave={() => setDragOverGroupId(prev => prev === group.id ? null : prev)}
                  onDrop={(event) => {
                    event.preventDefault();
                    const fieldId = event.dataTransfer.getData("text/plain") || draggedFieldId;
                    if (fieldId) moveFieldToCategory(fieldId, group.id === "uncategorized" ? null : group.id);
                    setDragOverGroupId(null);
                    setDraggedFieldId(null);
                  }}
                  className={cn(
                    "flex items-center justify-between border-b px-4 py-1 text-[8px] font-black uppercase tracking-widest transition-colors",
                    dragOverGroupId === group.id ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200 bg-slate-50 text-slate-500"
                  )}
                >
                  <span className="truncate">{group.name}</span>
                  <span>{group.fields.length}</span>
                </div>
                {group.fields.map((field, index) => {
                  const isActive = activeTraceFieldId === field.id;
                  const isSelected = selectedFieldId === field.id;
                  return (
                <div
                  ref={(node) => { previewRowRefs.current[field.id] = node; }}
                  key={field.id}
                  role="button"
                  tabIndex={0}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData("text/plain", field.id);
                    event.dataTransfer.effectAllowed = "move";
                    setDraggedFieldId(field.id);
                  }}
                  onDragEnd={() => { setDraggedFieldId(null); setDragOverGroupId(null); }}
                  onMouseEnter={() => setHoveredFieldId(field.id)}
                  onMouseLeave={() => setHoveredFieldId(null)}
                  className={cn(
                    "group/field flex flex-col w-full gap-1.5 border-b border-slate-200 px-4 py-2.5 text-left transition-all cursor-pointer",
                    field.enabled === false && "opacity-45",
                    draggedFieldId === field.id && "opacity-40",
                    isActive ? "bg-emerald-50/70 shadow-[inset_3px_0_0_hsl(var(--primary))]" : "hover:bg-slate-50"
                  )}
                  onClick={() => { setSelectedFieldId(selectedFieldId === field.id ? null : field.id); setRegexHelpFieldId(null); }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedFieldId(selectedFieldId === field.id ? null : field.id);
                      setRegexHelpFieldId(null);
                    }
                  }}
                >
                  {/* Row 1: drag handle + enable checkbox + color dot + field name + delete */}
                  <div className="flex w-full items-center gap-2">
                    <GripVertical size={12} className="shrink-0 text-muted-foreground/40 cursor-grab active:cursor-grabbing" />
                    <span className="flex w-10 shrink-0 items-center gap-1">
                      <input
                        type="checkbox"
                        checked={field.enabled !== false}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateFieldConfig(field.id, { enabled: event.target.checked })}
                        className="h-3.5 w-3.5 accent-emerald-600"
                        title="Enable field"
                      />
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getFieldColor(field, index) }} />
                    </span>
                    <span className="min-w-0 flex-1 whitespace-normal text-[10px] font-black uppercase tracking-wide text-foreground">
                      {field.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteField(field.id); }}
                      title="Delete field"
                      className="ml-auto shrink-0 h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-opacity text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>

                  {/* Row 2: extracted value */}
                  <div className="pl-10 w-full">
                    <span className={cn(
                      "font-mono text-[10px] break-words whitespace-pre-wrap",
                      field.value ? "font-bold text-foreground" : "font-medium italic text-muted-foreground/50"
                    )}>
                      {field.value ? formatFieldValue(field) : "No extraction found"}
                    </span>
                    {field.type === "date" && field.dateFormat && field.value && formatFieldValue(field) !== field.value && (
                      <span className="block text-[8px] text-muted-foreground/60 font-mono mt-0.5">raw: {field.value}</span>
                    )}
                  </div>

                  {/* Row 3: confidence + status */}
                  <div className="flex items-center justify-between gap-2 pl-10 w-full text-[8px] font-black uppercase text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>Conf:</span>
                      <span className={cn("text-[9px]", field.value ? "text-emerald-600" : field.x !== undefined ? "text-amber-600" : "text-rose-600")}>
                        {Math.round((field.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={11} className={field.value ? "text-emerald-600" : "text-amber-500"} />
                      <span>{getFieldStatus(field)}</span>
                    </div>
                  </div>

                  {/* Row 3.5: category + required — only visible when this field is selected */}
                  {isSelected && (
                    <div className="flex w-full items-center gap-2 pl-10 mt-0.5">
                      <select
                        value={field.categoryId || ""}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => moveFieldToCategory(field.id, event.target.value || null)}
                        className="h-6 flex-1 min-w-0 rounded border border-slate-300 bg-slate-50 px-1 text-[8px] font-bold text-muted-foreground outline-none"
                        title="Category"
                      >
                        <option value="">Uncategorized</option>
                        {categories.map(category => (
                          <option key={category.id} value={category.id}>
                            {category.parentId ? " - " : ""}{category.name}
                          </option>
                        ))}
                      </select>
                      <label
                        className="flex h-6 shrink-0 items-center gap-1 rounded border border-slate-300 bg-slate-50 px-2 text-[8px] font-black uppercase text-muted-foreground"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(event) => updateFieldConfig(field.id, { required: event.target.checked })}
                          className="h-3 w-3 accent-emerald-600"
                        />
                        Required
                      </label>
                    </div>
                  )}

                  {/* Row 4: type / format / regex — only visible when this field is selected */}
                  {isSelected && (
                    <div className="flex w-full items-center gap-2 pl-10 mt-0.5 pt-2 border-t border-slate-200">
                      <select
                        value={field.type || "text"}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => updateFieldConfig(field.id, { type: event.target.value, dateFormat: event.target.value === "date" ? field.dateFormat || "DD/MM/YYYY" : field.dateFormat })}
                        className="h-6 w-20 shrink-0 rounded border border-slate-300 bg-slate-50 px-1 text-[8px] font-black uppercase text-muted-foreground outline-none"
                      >
                        {[
                          ["text",      "Text"],
                          ["number",    "Number"],
                          ["date",      "Date"],
                          ["checkbox",  "Checkbox"],
                          ["radio",     "Radio"],
                          ["table",     "Table"],
                          ["barcode",   "Barcode"],
                          ["signature", "Signature"],
                          ["image",     "Image"],
                          ["object",    "Object"],
                        ].map(([val, label]) => (
                          <option key={val} value={val}>{label}</option>
                        ))}
                      </select>
                      {field.type === "date" ? (
                        <input
                          value={field.dateFormat || ""}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateFieldConfig(field.id, { dateFormat: event.target.value })}
                          placeholder="DD/MM/YYYY"
                          className="h-6 flex-1 min-w-0 rounded border border-slate-300 bg-white px-2 text-[8px] font-bold text-foreground outline-none"
                        />
                      ) : (
                        <select
                          value={field.expansionMode || "line"}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateFieldConfig(field.id, { expansionMode: event.target.value as StudioField["expansionMode"] })}
                          className="h-6 flex-1 min-w-0 rounded border border-slate-300 bg-white px-2 text-[8px] font-bold text-foreground outline-none"
                        >
                          <option value="line">Single Line</option>
                          <option value="multiline">Multi Line</option>
                          <option value="box">Box Format</option>
                          <option value="until_next_label">Until Next Label</option>
                        </select>
                      )}
                      <div className="relative flex flex-1 min-w-0 items-center gap-1">
                        <input
                          value={field.regex || ""}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => updateFieldConfig(field.id, { regex: event.target.value })}
                          placeholder="regex pattern"
                          className="h-6 flex-1 min-w-0 rounded border border-slate-300 bg-white px-2 text-[8px] font-bold text-foreground outline-none"
                        />
                        <button
                          onClick={(event) => { event.stopPropagation(); setRegexHelpFieldId(prev => prev === field.id ? null : field.id); }}
                          title="Guided regex patterns"
                          className="shrink-0 h-6 w-6 flex items-center justify-center rounded border border-slate-300 bg-slate-50 text-[9px] font-black text-muted-foreground hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors"
                        >?</button>
                        {regexHelpFieldId === field.id && (
                          <div
                            onClick={(event) => event.stopPropagation()}
                            className="absolute bottom-8 right-0 z-[60] w-64 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden"
                          >
                            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 text-[9px] font-black uppercase text-muted-foreground">Common Patterns</div>
                            {[
                              { label: "Numbers only",        pattern: "^\\d+$",                      hint: "e.g. 12345" },
                              { label: "Decimal number",      pattern: "^\\d+(\\.\\d+)?$",            hint: "e.g. 12.34" },
                              { label: "Date DD/MM/YYYY",     pattern: "^\\d{2}/\\d{2}/\\d{4}$",     hint: "e.g. 25/12/2024" },
                              { label: "Date YYYY-MM-DD",     pattern: "^\\d{4}-\\d{2}-\\d{2}$",     hint: "e.g. 2024-12-25" },
                              { label: "Passport No.",        pattern: "^[A-Z]{2}\\d{7}$",            hint: "e.g. AB1234567" },
                              { label: "MRZ line 1",          pattern: "^[A-Z0-9<]{44}$",             hint: "44-char MRZ" },
                              { label: "MRZ line 2",          pattern: "^[A-Z0-9<]{44}$",             hint: "44-char MRZ" },
                              { label: "Uppercase letters",   pattern: "^[A-Z]+$",                    hint: "e.g. SMITH" },
                              { label: "Alphanumeric",        pattern: "^[A-Z0-9]+$",                 hint: "e.g. A1B2C3" },
                              { label: "Email address",       pattern: "^[\\w.-]+@[\\w.-]+\\.\\w+$", hint: "e.g. a@b.com" },
                              { label: "Phone number",        pattern: "^\\+?[\\d\\s\\-()]{7,15}$",  hint: "e.g. +1 234 567" },
                              { label: "Clear pattern",       pattern: "",                             hint: "Remove regex" },
                            ].map(({ label, pattern, hint }) => (
                              <button
                                key={label}
                                onClick={() => { updateFieldConfig(field.id, { regex: pattern }); setRegexHelpFieldId(null); }}
                                className="w-full flex items-start justify-between gap-2 px-3 py-1.5 text-left hover:bg-blue-50 transition-colors group"
                              >
                                <div>
                                  <div className="text-[9px] font-bold text-foreground group-hover:text-blue-700">{label}</div>
                                  <div className="text-[8px] text-muted-foreground font-mono">{pattern || "—"}</div>
                                </div>
                                <span className="shrink-0 text-[8px] text-muted-foreground italic mt-0.5">{hint}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 p-4 space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[9px] font-black uppercase text-muted-foreground">
                <span>OCR Status</span>
                <span className={cn(
                  "rounded px-1.5 py-0.5 font-black",
                  (activePage?.textLayer?.length || 0) > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-red-50 text-red-700"
                )}>
                  {(activePage?.textLayer?.length || 0) > 0 ? "Success" : "Failed"}
                </span>
              </div>
              <div className="text-[9px] text-muted-foreground">
                {(activePage?.textLayer?.length || 0) > 0
                  ? `${activePage?.textLayer?.length} word${activePage?.textLayer?.length === 1 ? "" : "s"} recognized`
                  : "No text recognized — use Re-fetch OCR"}
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[9px] font-black uppercase text-muted-foreground">
                <span>Document Quality</span>
                <span>{activePage?.confidence ? Math.round(activePage.confidence * 100) : 0}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${activePage?.confidence ? Math.round(activePage.confidence * 100) : 0}%` }}
                />
              </div>
            </div>
          </div>
          </>
          )}
        </div>

        {/* CENTER PANEL: DOCUMENT IMAGE */}
        <div ref={canvasPanelRef} className="relative z-20 flex flex-col min-h-0 rounded-xl border border-border/50 bg-white shadow-sm overflow-hidden">
            <div className="absolute left-4 top-3 z-[75] rounded-lg bg-white/90 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-foreground shadow-sm backdrop-blur">
            Document Image
          </div>
          {selectedDataField && !anchorCaptureTargetField && (
            <div className="absolute left-1/2 top-3 z-[70] max-w-[min(520px,calc(100%-32px))] -translate-x-1/2 rounded-xl border border-blue-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="min-w-0">
                  <div className="text-[8px] font-black uppercase tracking-widest text-blue-600">Selected Data Field</div>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-[12px] font-black text-foreground">{selectedDataField.name}</span>
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[8px] font-black uppercase text-muted-foreground">{selectedDataField.type}</span>
                    {selectedDataField.type === "date" && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[8px] font-black text-blue-600">
                        {selectedDataField.dateFormat || "DD/MM/YYYY"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {anchorCaptureTargetField && (
            <div className="absolute left-1/2 top-3 z-[70] w-[min(560px,calc(100%-32px))] -translate-x-1/2 rounded-xl border border-emerald-200 bg-white/95 px-3 py-2 shadow-2xl backdrop-blur-md">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[8px] font-black uppercase tracking-widest text-emerald-600">Anchor Capture Mode</div>
                  <div className="truncate text-[11px] font-black text-foreground">
                    Draw anchors for <span className="text-emerald-700">{anchorCaptureTargetField.name}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    ["Primary Anchor", "Primary"],
                    ["Secondary Anchor", "Secondary"],
                    ["Fallback Anchor", "Fallback"],
                    ["AI-discovered Anchor", "AI"]
                  ].map(([relationship, label]) => (
                    <button
                      key={relationship}
                      onClick={() => setAnchorCaptureRelationship(relationship)}
                      className={cn(
                        "rounded-lg border px-2 py-1 text-[8px] font-black uppercase transition-all",
                        anchorCaptureRelationship === relationship
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-border bg-card text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setAnchorCaptureTargetFieldId(null);
                      setActiveTool("select");
                      toast.info("Anchor capture finished");
                    }}
                    className="rounded-lg bg-foreground px-2 py-1 text-[8px] font-black uppercase text-background"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
          <ExtractionCanvas 
            activeLayer={activeLayer} 
            documentViewMode={documentViewMode}
            onDocumentViewModeChange={setDocumentViewMode}
            drawingMode={activeTool !== "pan"}
            onSelectionComplete={handleSelectionComplete}
            panMode={activeTool === "pan"}
            imageUrl={activePage?.imageUrl}
            activeAnnotationId={activeTraceFieldId}
            annotations={visibleCanvasAnnotations}
            words={(activePage?.textLayer || []).map(normalizeWordBox)}
            pendingBox={pendingAnnotation ? pendingAnnotation.box : null}
            onPendingBoxChange={(box) => {
              setPendingAnnotation(prev => prev ? { ...prev, box } : prev);
            }}
            onPendingBoxCommit={(box, clientPos) => {
              handleSelectionComplete(box, clientPos);
            }}
            showOcrWords={overlayToggles.ocrWords}
            showOcrConfidence={overlayToggles.ocrConfidence}
            showStructure={overlayToggles.documentStructure}
            showObjectDetection={overlayToggles.objectDetection}
            showRelationships={overlayToggles.anchorRelationships}
            showHeatMap={overlayToggles.heatMap}
            qualityScore={activePage?.confidence ? Math.round(activePage.confidence * 100) : null}
            darkenContent={darkenContent}
            textEnhancementLevel={textEnhancementLevel}
            onOcrWordAction={(action, word) => {
              if (action === "anchor") {
                const targetFieldId = selectedFieldId && !selectedFieldId.startsWith("anchor_") ? selectedFieldId : null;
                const newAnchor = {
                  id: nextId("anchor"),
                  value: word.text || "OCR Anchor",
                  type: "ocr",
                  x: word.x,
                  y: word.y,
                  width: word.width,
                  height: word.height,
                  confidence: typeof word.confidence === "number" ? word.confidence / 100 : 0.96
                };
                setAnchors(prev => [...prev, newAnchor]);
                if (targetFieldId) {
                  setLinks(prev => [...prev, {
                    fieldId: targetFieldId,
                    anchorId: newAnchor.id,
                    relationship: "AI-discovered Anchor",
                    confidence: 0.96
                  }]);
                }
                toast.success(`Created anchor from OCR word "${word.text}"`);
              } else {
                toast.success(`${action === "edit" ? "Correct OCR" : action === "merge" ? "Merge words" : "Split word"} ready for "${word.text}"`);
              }
            }}
          >
            <AnnotationLayer
              annotations={visibleCanvasAnnotations}
              links={links}
              activeAnnotationId={activeTraceFieldId}
              onAnnotationSelect={setSelectedFieldId}
              activeLayer={activeLayer}
              showLabels={false}
              showActionMenu={false}
              onDeleteAnnotation={handleDeleteAnnotation}
              onAnnotationAction={(action, ann) => {
                if (action === "rename") {
                  const currentName = fields.find(f => f.id === ann.id)?.name || ann.label || "";
                  setCustomPrompt({
                    title: "Rename Field",
                    placeholder: "e.g. Passport Number",
                    defaultValue: currentName,
                    onConfirm: (newName: string) => {
                      if (newName.trim()) {
                        updateFieldConfig(ann.id, { name: newName.trim() });
                        toast.success(`Renamed to "${newName.trim()}"`);
                      }
                    }
                  });
                } else if (action === "addAnchor") {
                  beginAnchorCaptureForField(ann.id);
                } else if (action === "done") {
                  setAnchorCaptureTargetFieldId(null);
                  setActiveTool("select");
                  setSelectedFieldId(null);
                } else if (action === "changeType") {
                  const typeCycle = ["text", "date", "id", "signature", "table", "checkbox"];
                  setFields(prev => prev.map(field => {
                    if (field.id !== ann.id) return field;
                    const currentIndex = Math.max(0, typeCycle.indexOf(field.type));
                    const nextType = typeCycle[(currentIndex + 1) % typeCycle.length];
                    return { ...field, type: nextType, ...(nextType === "date" && !field.dateFormat ? { dateFormat: "DD/MM/YYYY" } : {}) };
                  }));
                } else if (action === "delete") {
                  const isAnchor = ann.id.startsWith("anchor_") || ann.type === "anchor";
                  if (isAnchor) {
                    handleDeleteAnnotation(ann.id, "anchor");
                  } else {
                    handleDeleteField(ann.id);
                  }
                }
              }}
              onUpdateAnnotation={(id, updates) => {
                const isAnchor = id.startsWith("anchor_");
                if (isAnchor) {
                  setAnchors(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
                } else {
                  setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
                }
              }}
              onUpdateAnnotationComplete={async (id, finalBox) => {
                const isAnchor = id.startsWith("anchor_");
                if (isAnchor) {
                  const words = getWordsInSelection(finalBox, false);
                  const newValue = words.map(w => w.text).join(" ").trim();
                  if (newValue) {
                    setAnchors(prev => prev.map(anchor => anchor.id === id ? { ...anchor, value: newValue } : anchor));
                  } else {
                    const cropOcr = await runSelectedAreaOcr(finalBox, true);
                    if (cropOcr?.text) {
                      setAnchors(prev => prev.map(anchor => anchor.id === id ? { ...anchor, value: cropOcr.text } : anchor));
                    }
                  }
                } else {
                  const words = getWordsInSelection(finalBox, true);
                  const newValue = words.map(w => w.text).join(" ").trim();
                  if (newValue) {
                    setFields(prev => prev.map(field => field.id === id ? { ...field, value: newValue } : field));
                  } else {
                    const cropOcr = await runSelectedAreaOcr(finalBox, false);
                    if (cropOcr?.text) {
                      setFields(prev => prev.map(field => field.id === id ? { ...field, value: cropOcr.text } : field));
                    }
                  }
                }
              }}
            />
          </ExtractionCanvas>
        </div>

      </div>

      {/* BOTTOM OVERLAY: EXTRACTION CONSOLE */}
      <div className="z-50 shrink-0">
        <ExtractionConsole
          fields={enabledFieldsWithCalculatedConfidence}
          anchors={anchors}
          links={links}
          ocrText={activePage?.ocrText || ""}
          ocrWords={activePage?.textLayer || []}
          activeFieldId={activeTraceFieldId}
        />
      </div>

      {/* STANDARD FOOTER — matches all other studio stages */}
      <footer className="px-8 py-5 border-t border-border bg-card/50 flex items-center justify-between gap-4 shrink-0 z-50">
        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          <CheckCircle2 size={14} className={fields.length > 0 ? "text-emerald-500" : "text-muted-foreground/30"} />
          <span>{fields.filter(f => f.value).length} / {fields.length} fields extracted</span>
          {anchors.length > 0 && (
            <>
              <span className="text-border">·</span>
              <span>{anchors.length} anchor{anchors.length !== 1 ? "s" : ""}</span>
            </>
          )}
        </div>
        <button
          onClick={async () => {
            updateStepStatus(TrainingStage.EXTRACTION, "completed");
            await saveState?.();
            setActiveStage(TrainingStage.VALIDATION);
          }}
          className="h-11 px-10 rounded-[9px] bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center gap-3 group shadow-lg shadow-primary/20"
        >
          Finalize Extraction &amp; Proceed
          <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </footer>

      {/* FLOATING TAGGING MENU */}
      {pendingAnnotation && (() => {
        return (
          <div 
            style={{
              position: "fixed",
              left: `${Math.min(pendingAnnotation.clientPos.x + 16, typeof window !== 'undefined' ? window.innerWidth - 260 : 1000)}px`,
              top: `${Math.max(16, Math.min(pendingAnnotation.clientPos.y - 16, typeof window !== 'undefined' ? window.innerHeight - 200 : 800))}px`,
            }}
            className="z-[99] bg-white border border-border shadow-2xl rounded-2xl p-3 w-64 flex flex-col gap-3 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-center justify-between border-b border-border/50 pb-2 cursor-grab active:cursor-grabbing select-none"
              onMouseDown={(e) => {
                setIsDraggingIntelligence(true);
                setIntelligenceDragOffset({
                  x: e.clientX - pendingAnnotation.clientPos.x,
                  y: e.clientY - pendingAnnotation.clientPos.y
                });
              }}
            >
              <span className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5 pointer-events-none">
                <Zap size={12} className="text-primary" />
                Extracted Data
              </span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setPendingAnnotation(null);
                }} 
                className="text-muted-foreground hover:text-foreground transition-colors p-1 -m-1"
              >
                <X size={14} />
              </button>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 p-2 flex flex-col gap-1">
              <span className="text-[8px] font-black uppercase text-primary/60">Extracted Value</span>
              <span className="text-[11px] font-mono font-bold text-foreground truncate">
                {pendingAnnotation.extractedText || <span className="text-muted-foreground italic">No text detected</span>}
              </span>
            </div>
            {pendingAnnotation.autoAnchorText && (
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 flex items-center gap-2">
                <Anchor size={10} className="text-zinc-500 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[7px] font-black uppercase text-zinc-400 block">Auto-detected anchor</span>
                  <span className="text-[10px] font-bold text-zinc-700 truncate block">{pendingAnnotation.autoAnchorText}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-2">
              <button
                onClick={promptForFieldFromSelection}
                className="w-full rounded-lg bg-primary px-3 py-2 text-[10px] font-black uppercase text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                Create New Field
              </button>
              
              {fields.length > 0 && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/50" />
                  </div>
                  <div className="relative flex justify-center text-[8px] uppercase font-black">
                    <span className="bg-white px-2 text-muted-foreground">Or</span>
                  </div>
                </div>
              )}

              {fields.length > 0 && (
                <select
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    setFields(prev => prev.map(f => f.id === val ? {
                      ...f,
                      value: pendingAnnotation.extractedText,
                      x: pendingAnnotation.box.x,
                      y: pendingAnnotation.box.y,
                      width: pendingAnnotation.box.width,
                      height: pendingAnnotation.box.height,
                      type: pendingAnnotation.suggestedType,
                      locatorStrategy: f.locatorStrategy || "hybrid",
                      pageStrategy: f.pageStrategy || "detect_by_text",
                      searchDirection: f.searchDirection || "nearest",
                      expansionMode: f.expansionMode || "line",
                      stopAtNextLabel: f.stopAtNextLabel ?? true,
                      allowLongText: f.allowLongText ?? true
                    } : f));
                    setSelectedFieldId(val);
                    setPendingAnnotation(null);
                    toast.success(`Mapped to "${fields.find(f => f.id === val)?.name}"`);
                  }}
                  className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-[10px] font-bold outline-none cursor-pointer hover:bg-muted/50 focus:ring-1 focus:ring-primary text-foreground transition-colors"
                  defaultValue=""
                >
                  <option value="" disabled>Map to existing field...</option>
                  {fields.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        );
      })()}
      {/* CUSTOM THEME-BASED MODAL PROMPT */}
      {/* Save Model Dialog */}
      {saveModelDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-background border border-border rounded-xl shadow-2xl w-[480px] p-6 flex flex-col gap-5">
            <div>
              <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Save Extraction Model</h3>
              <p className="text-[10px] text-muted-foreground mt-1 uppercase tracking-widest">Name this model and choose how it matches future documents.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Model Name</label>
              <input
                type="text"
                value={saveModelDialog.name}
                onChange={e => setSaveModelDialog(d => d ? { ...d, name: e.target.value } : d)}
                className="h-9 px-3 rounded-lg border border-border bg-muted/30 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Match Strategy</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSaveModelDialog(d => d ? { ...d, isGeneric: false } : d)}
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-lg border text-left transition-all",
                    !saveModelDialog.isGeneric
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">Specific</span>
                  <span className="text-[9px] font-medium leading-snug">Matches this exact document class by name</span>
                </button>
                <button
                  onClick={() => setSaveModelDialog(d => d ? { ...d, isGeneric: true } : d)}
                  className={cn(
                    "flex flex-col gap-1 p-3 rounded-lg border text-left transition-all",
                    saveModelDialog.isGeneric
                      ? "border-primary bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/30"
                  )}
                >
                  <span className="text-[10px] font-black uppercase tracking-widest">Generic</span>
                  <span className="text-[9px] font-medium leading-snug">Applies to any document with similar structure / anchors</span>
                </button>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2 border-t border-border">
              <button
                onClick={() => setSaveModelDialog(null)}
                className="h-9 px-4 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => doSaveModel(saveModelDialog.name.trim() || "Untitled Model", saveModelDialog.isGeneric)}
                disabled={!saveModelDialog.name.trim()}
                className="h-9 px-5 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-40"
              >
                Save Model
              </button>
            </div>
          </div>
        </div>
      )}

      {customPrompt && (
        <CustomPromptDialog
          title={customPrompt.title}
          message={customPrompt.message}
          placeholder={customPrompt.placeholder}
          defaultValue={customPrompt.defaultValue}
          onConfirm={(val) => {
            customPrompt.onConfirm(val);
            setCustomPrompt(null);
          }}
          onCancel={() => {
            if (customPrompt.onCancel) {
              customPrompt.onCancel();
            }
            setCustomPrompt(null);
          }}
        />
      )}
      {confirmDialog && (
        <CustomConfirmDialog
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={() => {
            confirmDialog.onConfirm();
            setConfirmDialog(null);
          }}
          onCancel={() => {
            if (confirmDialog.onCancel) {
              confirmDialog.onCancel();
            }
            setConfirmDialog(null);
          }}
        />
      )}
    </div>
  );
}

interface CustomPromptDialogProps {
  title: string;
  message?: string;
  placeholder?: string;
  defaultValue: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

function CustomPromptDialog({
  title,
  message,
  placeholder,
  defaultValue,
  onConfirm,
  onCancel
}: CustomPromptDialogProps) {
  const [value, setValue] = useState(defaultValue);
  
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-96 flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-2">
            <Sparkles size={14} className="text-primary animate-pulse" />
            {title}
          </span>
          <button 
            onClick={onCancel} 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {message && (
          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-wide">
            {message}
          </p>
        )}

        <input 
          type="text" 
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onConfirm(value);
            } else if (e.key === "Escape") {
              onCancel();
            }
          }}
          className="bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-primary text-foreground w-full"
        />

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/30">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-card border border-border rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onConfirm(value)}
            className="px-4 py-2 bg-primary text-primary-foreground font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-primary/20"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

interface CustomConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function CustomConfirmDialog({
  title,
  message,
  onConfirm,
  onCancel
}: CustomConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-background/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card border border-border shadow-2xl rounded-2xl p-6 w-[420px] flex flex-col gap-4 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-border/50 pb-3">
          <span className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-2">
            <AlertTriangle size={14} className="text-rose-500 animate-pulse" />
            {title}
          </span>
          <button 
            onClick={onCancel} 
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <p className="text-[11px] text-foreground/90 font-medium leading-relaxed">
          {message}
        </p>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/30">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-card border border-border rounded-xl text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-all shadow-md hover:shadow-rose-600/20"
          >
            Clear Mappings
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExtractionStudio;
