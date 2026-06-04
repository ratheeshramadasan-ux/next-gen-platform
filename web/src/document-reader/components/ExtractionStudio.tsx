"use client";

import React, { useState, useEffect } from "react";
import {
  Plus, Search, X, Tag, FileText, CheckCircle2, ChevronRight, ChevronLeft,
  Layers, Settings, Info, Trash2, Edit3, Filter, Sparkles, AlertTriangle,
  MousePointer2, Box, Anchor, Table, Type, Eye, Save, Wand2,
  Activity, Grid2X2, FolderTree, ChevronDown, Zap, ShieldCheck, CheckSquare, ScanLine, Baseline, Hand, Circle,
  BookMarked, RefreshCw
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
  // Primary: exact class name match
  const byClass = models.find(m => m.documentClasses.some(c => normalized(c) === docNorm));
  if (byClass) return byClass;
  // Secondary: anchor text fuzzy match — if >60% of a model's anchor values appear in the OCR text
  const ocrNorm = normalized(ocrText);
  return models.find(m => {
    if (m.anchors.length === 0) return false;
    const hits = m.anchors.filter(a => ocrNorm.includes(normalized(a.value)));
    return hits.length / m.anchors.length >= 0.6;
  }) || null;
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
    saveState
  } = usePipelineStore();
  
  const { updateStepStatus, setActiveStage } = useDocumentReader();

  const [activeTool, setActiveTool] = useState("select");
  const [activeLayer, setActiveLayer] = useState<"ocr" | "extraction" | "ai" | "validation">("extraction");
  const idCounterRef = React.useRef(0);
  const appliedPrebuiltRouteRef = React.useRef<Record<string, string>>({});
  const appliedCustomModelRef = React.useRef<Record<string, string>>({});
  const documentDesignsRef = React.useRef<Record<string, DocumentExtractionDesign>>({});
  const lastDesignDocIdRef = React.useRef<string | null>(activeDocument?.documentId || null);
  const workspaceRef = React.useRef<HTMLDivElement | null>(null);
  const previewRowRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
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
  const [leftPanelWidth, setLeftPanelWidth] = useState(340);
  const [rightPanelWidth, setRightPanelWidth] = useState(340);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const [customPrompt, setCustomPrompt] = useState<{
    title: string;
    message?: string;
    placeholder?: string;
    defaultValue: string;
    onConfirm: (value: string) => void;
    onCancel?: () => void;
  } | null>(null);

  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel?: () => void;
  } | null>(null);

  const [categories, setCategories] = useState<StudioCategory[]>([]);

  const [fields, setFields] = useState<StudioField[]>([]);
  const [anchors, setAnchors] = useState<StudioAnchor[]>([]);
  const [links, setLinks] = useState<StudioLink[]>([]);

  const [currentDocId, setCurrentDocId] = useState<string | null>(activeDocument?.documentId || null);
  const nextId = (prefix: string) => {
    idCounterRef.current += 1;
    return `${prefix}_${idCounterRef.current}`;
  };

  const captureCurrentDesign = React.useCallback((): DocumentExtractionDesign => ({
    categories,
    fields,
    anchors,
    links,
    selectedFieldId,
    selectedCategoryId
  }), [anchors, categories, fields, links, selectedCategoryId, selectedFieldId]);

  React.useEffect(() => {
    const nextDocId = activeDocument?.documentId || null;
    const previousDocId = lastDesignDocIdRef.current;

    if (previousDocId && previousDocId !== nextDocId) {
      documentDesignsRef.current[previousDocId] = captureCurrentDesign();
    }

    if (nextDocId && nextDocId !== currentDocId) {
      const savedDesign = documentDesignsRef.current[nextDocId] || activeDocument?.metadata?.extractionDesign;
      setCategories(savedDesign?.categories || []);
      setFields(savedDesign?.fields || []);
      setAnchors(savedDesign?.anchors || []);
      setLinks(savedDesign?.links || []);
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

  const getWordsInSelection = (box: SelectionBox, excludeLabels = false) => {
    const normalizedWords = (activePage?.textLayer || []).map(normalizeWordBox);
    const getOverlap = (word: OCRWord, padding = 0) => {
      const left = Math.max(word.x, box.x - padding);
      const right = Math.min(word.x + word.width, box.x + box.width + padding);
      const top = Math.max(word.y, box.y - padding);
      const bottom = Math.min(word.y + word.height, box.y + box.height + padding);
      const width = Math.max(0, right - left);
      const height = Math.max(0, bottom - top);
      const overlapArea = width * height;
      const wordArea = Math.max(0.01, word.width * word.height);
      const boxArea = Math.max(0.01, box.width * box.height);
      
      const wordCenterX = word.x + word.width / 2;
      const wordCenterY = word.y + word.height / 2;
      const isCenterInside = 
        wordCenterX >= (box.x - padding) && 
        wordCenterX <= (box.x + box.width + padding) && 
        wordCenterY >= (box.y - padding) && 
        wordCenterY <= (box.y + box.height + padding);
        
      return {
        word,
        overlapArea,
        wordCoverage: overlapArea / wordArea,
        boxCoverage: overlapArea / boxArea,
        isCenterInside
      };
    };
    const sortReadingOrder = (a: OCRWord, b: OCRWord) => {
      const sameLine = Math.abs(a.y - b.y) < Math.max(a.height, b.height, 1.2);
      return sameLine ? a.x - b.x : a.y - b.y;
    };

    const isLikelyLabelWord = (text = "") => {
      const normalized = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
      const tokens = normalized.split(/\s+/).filter(Boolean);
      const bilingualTokens = [
        "passport", "passeport", "no", "number", "nom", "surname", "given", "names", "prenoms", 
        "nationality", "nationalite", "date", "birth", "naissance", "place", "lieu", "issue", 
        "delivrance", "expiry", "expiration", "authority", "autorite", "sex", "sexe", "pays", "issuing", "country"
      ];
      return tokens.some(token => 
        bilingualTokens.includes(token) || 
        bilingualTokens.some(bt => (bt.length > 2 && token.includes(bt)) || (token.length > 2 && bt.includes(token)))
      );
    };

    // For anchor capture (excludeLabels=false) use strict thresholds — user drew a tight box
    const strictMode = !excludeLabels;
    const overlapThreshold = strictMode ? 0.60 : 0.40;
    const maxWidthMultiplier = strictMode ? 1.6 : 2.2;

    let exact = normalizedWords
      .map(word => getOverlap(word))
      .filter(item => {
        const isNotTooTall = item.word.height <= Math.max(1.8, box.height * 1.8);
        const isNotTooWide = item.word.width <= Math.max(strictMode ? 3.0 : 5.0, box.width * maxWidthMultiplier);
        return item.overlapArea > 0 && isNotTooTall && isNotTooWide && (item.isCenterInside || item.wordCoverage >= overlapThreshold);
      })
      .map(item => item.word);

    if (excludeLabels) {
      exact = exact.filter(w => !isLikelyLabelWord(w.text));
    }

    exact = exact.sort(sortReadingOrder);
    if (exact.length > 0) return exact;

    let padded = normalizedWords
      .map(word => getOverlap(word, strictMode ? 0.15 : 0.4))
      .filter(item => {
        const isNotTooTall = item.word.height <= Math.max(1.8, box.height * 1.8);
        const isNotTooWide = item.word.width <= Math.max(strictMode ? 3.0 : 5.0, box.width * maxWidthMultiplier);
        return item.overlapArea > 0 && isNotTooTall && isNotTooWide && (item.isCenterInside || item.wordCoverage >= overlapThreshold);
      })
      .map(item => item.word);

    if (excludeLabels) {
      padded = padded.filter(w => !isLikelyLabelWord(w.text));
    }

    padded = padded.sort(sortReadingOrder);
    if (padded.length > 0) return padded;

    return [];
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
        confidence: valueWords.length > 0 ? averageConfidence(valueWords) || model.confidenceThreshold : model.confidenceThreshold,
        value: valueText,
        categoryId: field.required ? requiredCategory.id : optionalCategory.id,
        ...(evidenceBox && field.coordinatesEnabled ? inferredFieldBox : {}),
        locatorStrategy: field.coordinatesEnabled ? "hybrid" : "anchor",
        pageStrategy: "detect_by_text",
        searchDirection: "nearest",
        expansionMode: field.type === "table" ? "multiline" : field.type === "array" ? "until_next_label" : "line",
        stopAtNextLabel: true,
        allowLongText: field.type === "string" || field.type === "array"
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

    setCategories([rootCategory, requiredCategory, optionalCategory]);
    setFields(newFields);
    setAnchors(newAnchors);
    setLinks(newLinks);
    setSelectedFieldId(newFields.find(field => field.value || field.x !== undefined)?.id || newFields[0]?.id || null);
    setSelectedCategoryId(rootCategory.id);
    setActiveLayer("extraction");
    toast.success(`${model.name} loaded${routeName ? ` for ${routeName}` : ""}. Fields are ready for review.`);
  };

  // ─── Save current design as a reusable custom model ─────────────────────────
  const saveAsCustomModel = React.useCallback(() => {
    if (fields.length === 0) {
      toast.warning("Define at least one field before saving as a model.");
      return;
    }
    const docClass = activeDocument?.classification?.className || activeDocument?.name || "Unknown";
    const modelName = `${docClass} Model`;
    const existing = loadCustomModels();
    // Update if a model for this class already exists; otherwise create new
    const idx = existing.findIndex(m => m.documentClasses.some(c => c.toLowerCase() === docClass.toLowerCase()));
    const model: CustomReusableModel = {
      id: idx >= 0 ? existing[idx].id : `custom_${Date.now()}`,
      name: modelName,
      documentClasses: [docClass],
      createdAt: new Date().toISOString(),
      categories,
      fields,
      anchors,
      links
    };
    if (idx >= 0) existing[idx] = model; else existing.push(model);
    saveCustomModels(existing);
    toast.success(`"${modelName}" saved as reusable model. It will auto-apply to all ${docClass} documents.`);
  }, [fields, anchors, links, categories, activeDocument]);

  // ─── Apply a custom model to the current document ────────────────────────────
  // Re-locates every field using anchor-relative positioning. Fields whose
  // anchors cannot be found in the current OCR are marked available=false.
  const applyCustomModelToDocument = React.useCallback((model: CustomReusableModel) => {
    const newFields: StudioField[] = [];
    const newAnchors: StudioAnchor[] = [];
    const newLinks: StudioLink[] = [];

    model.fields.forEach(field => {
      const fieldLinks = model.links.filter(l => l.fieldId === field.id);
      const fieldAnchors = fieldLinks
        .map(l => model.anchors.find(a => a.id === l.anchorId))
        .filter(Boolean) as StudioAnchor[];

      let located: { x: number; y: number; width: number; height: number; value: string } | null = null;
      let foundAnchorBox: { x: number; y: number; width: number; height: number } | null = null;
      let foundAnchorId: string | null = null;

      // Try each linked anchor — find it in the current page's OCR
      for (const anchor of fieldAnchors) {
        const anchorWords = findWordsByLabel(anchor.value);
        if (anchorWords.length === 0) continue;
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

        const words = getWordsInSelection(predictedBox, true);
        located = {
          ...predictedBox,
          value: words.map(w => w.text).join(" ").trim()
        };
        foundAnchorBox = anchorBox;
        foundAnchorId = nextId("anchor");
        break; // first matching anchor wins
      }

      // If no anchor found, try coordinate-based fallback (field may still be valid if scan is aligned)
      if (!located && field.x !== undefined) {
        const words = getWordsInSelection({ x: field.x, y: field.y ?? 0, width: field.width ?? 10, height: field.height ?? 3 }, true);
        located = {
          x: field.x, y: field.y ?? 0, width: field.width ?? 10, height: field.height ?? 3,
          value: words.map(w => w.text).join(" ").trim()
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

    setCategories(model.categories);
    setFields(newFields);
    setAnchors(newAnchors);
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

    appliedCustomModelRef.current[activeDocument.documentId] = model.id;
    appliedPrebuiltRouteRef.current[activeDocument.documentId] = "custom";
    applyCustomModelToDocument(model);
  }, [activeDocument, currentDocId, fields.length, applyCustomModelToDocument]);

  React.useEffect(() => {
    if (!activeDocument?.documentId || activeDocument.documentId !== currentDocId) return;
    if (appliedPrebuiltRouteRef.current[activeDocument.documentId]) return;

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
    if (categoryExists) return;
    applyPrebuiltRoutingModel(model, route.targetName);
  }, [activeDocument, categories, currentDocId, getRouteForDocument]);

  React.useEffect(() => {
    if (!activeDocument?.documentId || activeDocument.documentId !== currentDocId || !activePrebuiltModel) return;

    const prebuiltCategories = categories.filter(category => category.name.startsWith("Prebuilt: "));
    const expectedCategoryName = `Prebuilt: ${activePrebuiltModel.name}`;
    const hasWrongOrDuplicatedPrebuilt =
      prebuiltCategories.length > 1 ||
      (prebuiltCategories.length === 1 && prebuiltCategories[0].name !== expectedCategoryName);

    if (!hasWrongOrDuplicatedPrebuilt) return;

    appliedPrebuiltRouteRef.current[activeDocument.documentId] = activePrebuiltModel.code;
    applyPrebuiltRoutingModel(activePrebuiltModel, activeDocument.classification?.className || activeDocument.name);
  }, [activeDocument, activePrebuiltModel, categories, currentDocId]);

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
    const fieldId = nextId("field");
    const newField: StudioField = {
      id: fieldId,
      name: name.trim() || pendingAnnotation.detectedObject,
      type: type || pendingAnnotation.suggestedType || "text",
      required: true,
      enabled: true,
      confidence: pendingAnnotation.confidence / 100,
      value: pendingAnnotation.extractedText,
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
    setSelectedFieldId(newField.id);
    setSelectedCategoryId(null);
    if (!options?.keepPending) {
      setPendingAnnotation(null);
    }
    toast.success(`Accepted ${newField.name}`);
    return fieldId;
  };

  const promptForFieldFromSelection = () => {
    if (!pendingAnnotation) return;
    setCustomPrompt({
      title: "Create Field",
      message: "Enter field name for this selected area:",
      placeholder: "e.g. Passport Number",
      defaultValue: pendingAnnotation.detectedObject === "OCR Text" ? "" : pendingAnnotation.detectedObject,
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
    const isAnchor = !!anchorCaptureTargetFieldId || activeTool === "anchor";
    const intersecting = getWordsInSelection(box, !isAnchor);
    let textLayerText = intersecting.map((word) => word.text).join(" ").trim();
    
    // Smart trim: remove trailing single letters (OCR artifacts from graphics) and trailing symbols
    if (textLayerText.length > 6 && /\s[A-Z]$/i.test(textLayerText)) {
      textLayerText = textLayerText.replace(/\s[A-Z]$/i, "").trim();
    }
    textLayerText = textLayerText.replace(/[-_~|.,]+$/, "").trim();

    const headerText = getNearbyHeaderText(box);
    if (textLayerText) {
      const confidence = averageConfidence(intersecting) * 100;
      if (anchorCaptureTargetFieldId) {
        createLinkedAnchor(anchorCaptureTargetFieldId, box, textLayerText, confidence || 96, anchorCaptureRelationship);
        return;
      }
      // Only remap to the currently-selected field when using the select tool (not when drawing a new field)
      if (selectedFieldId && activeTool === "select") {
        setFields(prev => prev.map(f => f.id === selectedFieldId ? {
          ...f,
          value: textLayerText,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height
        } : f));
        toast.success(`Mapped to selected field`);
        return;
      }
      const intelligence = inferSelection(textLayerText);

      // Smart Detect: auto-create field immediately without prompting
      if (activeTool === "smart") {
        const detectedName = headerText || intelligence.detectedObject;
        const fieldId = nextId("field");
        const newField: StudioField = {
          id: fieldId,
          name: detectedName,
          type: intelligence.suggestedType || "text",
          required: true,
          enabled: true,
          confidence: (confidence || intelligence.confidence) / 100,
          value: textLayerText,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          locatorStrategy: "hybrid",
          pageStrategy: "detect_by_text",
          searchDirection: "nearest",
          expansionMode: "line",
          stopAtNextLabel: true,
          allowLongText: true,
          categoryId: selectedCategoryId || null
        };
        setFields(prev => [...prev, newField]);
        setSelectedFieldId(fieldId);
        toast.success(`Smart detected: "${detectedName}" (${intelligence.suggestedType})`);
        return;
      }

      setPendingAnnotation({
        box,
        clientPos,
        extractedText: textLayerText,
        ...intelligence,
        detectedObject: headerText || intelligence.detectedObject,
        confidence: confidence || intelligence.confidence
      });
      return;
    }

    if (!anchorCaptureTargetFieldId) {
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

      const extractedText = cleanedCropText || "No OCR text found in selected area";
        
      if (anchorCaptureTargetFieldId) {
        createLinkedAnchor(anchorCaptureTargetFieldId, box, extractedText, cropOcr?.confidence ? cropOcr.confidence * 100 : 90, anchorCaptureRelationship);
        setPendingAnnotation(null);
        return;
      }
      if (selectedFieldId && activeTool === "select") {
        setFields(prev => prev.map(f => f.id === selectedFieldId ? {
          ...f,
          value: extractedText,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          confidence: cropOcr?.confidence ? cropOcr.confidence * 100 : 90
        } : f));
        setPendingAnnotation(null);
        toast.success(`Mapped to selected field`);
        return;
      }
      const intelligence = inferSelection(cleanedCropText);

      if (activeTool === "smart") {
        const detectedName = headerText || intelligence.detectedObject;
        const fieldId = nextId("field");
        const newField: StudioField = {
          id: fieldId,
          name: detectedName,
          type: intelligence.suggestedType || "text",
          required: true,
          enabled: true,
          confidence: cropOcr?.confidence ?? intelligence.confidence / 100,
          value: cleanedCropText || extractedText,
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          locatorStrategy: "hybrid",
          pageStrategy: "detect_by_text",
          searchDirection: "nearest",
          expansionMode: "line",
          stopAtNextLabel: true,
          allowLongText: true,
          categoryId: selectedCategoryId || null
        };
        setFields(prev => [...prev, newField]);
        setSelectedFieldId(fieldId);
        toast.success(`Smart detected: "${detectedName}" (${intelligence.suggestedType})`);
        return;
      }

      setPendingAnnotation({
        box,
        clientPos,
        extractedText,
        ...intelligence,
        detectedObject: headerText || intelligence.detectedObject,
        confidence: cropOcr?.confidence ? cropOcr.confidence * 100 : intelligence.confidence
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
      const linkedAnchorIds = prevLinks.filter(link => link.fieldId === id).map(link => link.anchorId);
      setAnchors(prevAnchors => prevAnchors.filter(anchor => !linkedAnchorIds.includes(anchor.id)));
      toast.info(linkedAnchorIds.length > 0 ? "Deleted field and linked anchors" : "Deleted field");
      return prevLinks.filter(link => link.fieldId !== id);
    });
    setFields(prev => prev.filter(f => f.id !== id));
    setSelectedFieldId(prev => prev === id ? null : prev);
    setAnchorCaptureTargetFieldId(prev => prev === id ? null : prev);
  };

  const updateFieldConfig = (id: string, updates: Partial<StudioField>) => {
    setFields(prev => prev.map(field => field.id === id ? { ...field, ...updates } : field));
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
    setFields(prev => [...prev, ...newFields]);
    setAnchors(prev => [...prev, ...newAnchors]);
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
    if (boundLinks.length === 0) return field.confidence || 1.0;
    
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
  ];
  const reviewRows = [
    activeDocument?.classification?.className ? {
      id: "document_type",
      name: "Document Type",
      type: "string",
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
      const currentRows = reviewRowsRef.current;
      const currentActiveFieldId = activeTraceFieldIdRef.current;

      const nextLines = currentRows
        .map((field, index) => {
          if (field.id === "document_type" || !hasMappedArea(field)) return null;
          const row = previewRowRefs.current[field.id];
          if (!row) return null;
          const rowRect = row.getBoundingClientRect();
          const startX = documentRect.left - workspaceRect.left + ((field.x + field.width) / 100) * documentRect.width;
          const startY = documentRect.top - workspaceRect.top + ((field.y + field.height / 2) / 100) * documentRect.height;
          const endX = rowRect.left - workspaceRect.left + 5;
          const endY = rowRect.top - workspaceRect.top + rowRect.height / 2;
          const distance = Math.max(70, Math.abs(endX - startX) * 0.42);
          return {
            id: field.id,
            color: getFieldColor(field, index),
            active: currentActiveFieldId === field.id,
            path: `M ${startX} ${startY} C ${startX + distance} ${startY}, ${endX - distance} ${endY}, ${endX} ${endY}`
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

          <div className="w-[210px] shrink-0">
            <label className="mb-1 block text-[8px] font-black uppercase tracking-widest text-muted-foreground">
              Review Document
            </label>
            <select
              value={activeDocument?.documentId || ""}
              onChange={(event) => {
                const nextDocument = trainingDocuments.find(document => document.documentId === event.target.value);
                if (nextDocument) setActiveDocument(nextDocument);
              }}
              className="h-8 w-full rounded-lg border border-border/70 bg-card px-2 text-[10px] font-black uppercase text-foreground outline-none transition focus:border-primary"
            >
              {trainingDocuments.length === 0 ? (
                <option value="">No documents loaded</option>
              ) : trainingDocuments.map(document => (
                <option key={document.documentId} value={document.documentId}>
                  {document.classification?.className || document.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="h-8 w-[1px] shrink-0 bg-border" />

          {/* Canvas Tools Group */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex flex-col select-none pr-1">
              <span className="text-[8px] font-black uppercase text-muted-foreground/80 tracking-wider">Active Tool</span>
              <span className="text-[10px] font-bold text-foreground capitalize truncate max-w-[80px]">
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
                       "flex flex-col items-center justify-center gap-0.5 w-8 py-1 rounded-lg transition-all",
                       activeTool === tool.id
                        ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                        : "text-muted-foreground/60 hover:bg-muted hover:text-foreground"
                     )}
                   >
                     <tool.icon size={12} />
                     <span className="text-[6px] font-black uppercase tracking-wide leading-none">{tool.label}</span>
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
          <button 
             onClick={() => {
                setConfirmDialog({
                  title: "Clear Mappings",
                  message: "Are you sure you want to clear all data mappings and anchors from this document? The fields will remain in your schema, but their extracted values will be cleared. This cannot be undone.",
                  onConfirm: () => {
                    setFields(prev => prev.map(f => ({ ...f, value: undefined, x: undefined, y: undefined, width: undefined, height: undefined, page: undefined })));
                    setAnchors([]);
                    setLinks([]);
                    setSelectedFieldId(null);
                    setPendingAnnotation(null);
                    setAnchorCaptureTargetFieldId(null);
                    toast.success("All data mappings have been cleared.");
                    setConfirmDialog(null);
                  }
                });
              }}
             className="h-9 px-3 rounded-xl bg-card border border-rose-200 text-[9px] font-black uppercase tracking-widest hover:border-rose-400 hover:bg-rose-50 hover:text-rose-700 transition-all flex items-center gap-2 group shadow-lg text-rose-600 whitespace-nowrap"
             title="Clear all extracted data and anchors"
          >
             <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
             Clear Mappings
          </button>

          <button 
             onClick={() => {
               const newMode = documentViewMode === "enhanced" ? "original" : "enhanced";
               setDocumentViewMode(newMode);
               toast.success(`Intelligent Content Enhancer ${newMode === "enhanced" ? "enabled" : "disabled"}.`);
             }}
             className={cn(
               "h-9 px-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 group shadow-lg whitespace-nowrap",
               documentViewMode === "enhanced" 
                 ? "bg-emerald-50 border-emerald-300 text-emerald-700" 
                 : "bg-card border-border/50 text-muted-foreground hover:bg-muted"
             )}
             title="Toggle Intelligent Content Enhancer"
          >
             <Wand2 size={14} className={documentViewMode === "enhanced" ? "text-emerald-600 group-hover:scale-110 transition-transform" : "text-muted-foreground group-hover:scale-110 transition-transform"} />
             Content Enhancer
          </button>
          <button
             onClick={() => {
               if (!activePrebuiltModel) {
                 toast.info("No matching prebuilt model detected for the selected document.");
                 return;
               }
               if (activeDocument?.documentId) {
                 appliedPrebuiltRouteRef.current[activeDocument.documentId] = activePrebuiltModel.code;
               }
               applyPrebuiltRoutingModel(activePrebuiltModel, activeDocument?.classification?.className || activeDocument?.name);
             }}
             className="h-9 px-3 rounded-xl bg-card border border-blue-200 text-[9px] font-black uppercase tracking-widest hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-all flex items-center gap-2 group shadow-lg text-foreground whitespace-nowrap"
             title="Apply the selected document's prebuilt extraction model"
          >
             <Sparkles size={14} className="text-blue-500 group-hover:scale-110 transition-transform" />
             {activeModelButtonLabel}
          </button>
          <button
             onClick={saveAsCustomModel}
             className="h-9 px-3 rounded-xl bg-card border border-violet-200 text-[9px] font-black uppercase tracking-widest hover:border-violet-400 hover:bg-violet-50 hover:text-violet-700 transition-all flex items-center gap-2 group shadow-lg text-foreground whitespace-nowrap"
             title="Save current field design as a reusable model. It will auto-apply to all documents of this type."
          >
             <BookMarked size={14} className="text-violet-500 group-hover:scale-110 transition-transform" />
             Save as Model
          </button>
          <button
             onClick={() => {
               const docClass = activeDocument?.classification?.className || activeDocument?.name || "";
               const ocrText = activeDocument?.pages?.[0]?.ocrText || "";
               const model = matchCustomModel(docClass, ocrText);
               if (!model) { toast.warning("No saved model found for this document type."); return; }
               applyCustomModelToDocument(model);
             }}
             className="h-9 px-3 rounded-xl bg-card border border-border/50 text-[9px] font-black uppercase tracking-widest hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all flex items-center gap-2 group shadow-lg text-foreground whitespace-nowrap"
             title="Re-run the saved model against the current document, relocating all fields using anchors."
          >
             <RefreshCw size={14} className="text-emerald-500 group-hover:scale-110 transition-transform" />
             Re-apply Model
          </button>
          
          <button
            onClick={async () => {
              updateStepStatus(TrainingStage.EXTRACTION, "completed");
              await saveState?.();
              setActiveStage(TrainingStage.VALIDATION);
            }}
            className="h-9 px-4 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[9px] uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-primary/20 whitespace-nowrap"
          >
            Finalize & Proceed
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <div
        ref={workspaceRef}
        className="grid flex-1 min-h-0 overflow-hidden gap-4 px-4 py-3 relative z-10 transition-all duration-300"
        style={{
          gridTemplateColumns: `${leftPanelCollapsed ? 44 : leftPanelWidth}px minmax(420px, 1fr) ${rightPanelCollapsed ? 44 : rightPanelWidth}px`,
          gridTemplateRows: "minmax(0, 1fr)"
        }}
      >
        <svg className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible">
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
                strokeDasharray={line.active ? "7 5" : "3 5"}
                strokeOpacity={line.active ? 0.95 : 0.34}
                strokeWidth={line.active ? 2.1 : 1.2}
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
        </svg>
        
        {/* LEFT PANEL: SCHEMA DESIGNER */}
        <div className="relative z-40 flex min-h-0 flex-col rounded-lg border border-slate-300 bg-white shadow-[0_1px_6px_rgba(15,23,42,0.08)] overflow-hidden">
          {leftPanelCollapsed ? (
            <button
              onClick={() => setLeftPanelCollapsed(false)}
              className="flex h-full w-full items-center justify-center bg-slate-50 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-slate-100"
              title="Expand schema panel"
            >
              <span className="-rotate-90 whitespace-nowrap">Schema</span>
            </button>
          ) : (
          <>
          <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-slate-50 px-4 py-2.5">
            <div className="min-w-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Schema Designer</h3>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                Fields, format, regex, and categories
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => setLeftPanelWidth(width => Math.max(280, width - 40))} className="h-6 w-6 rounded border border-slate-300 bg-white text-[11px] font-black text-muted-foreground hover:text-foreground" title="Narrow schema panel">-</button>
              <button onClick={() => setLeftPanelWidth(width => Math.min(520, width + 40))} className="h-6 w-6 rounded border border-slate-300 bg-white text-[11px] font-black text-muted-foreground hover:text-foreground" title="Widen schema panel">+</button>
              <button onClick={() => setLeftPanelCollapsed(true)} className="h-6 w-6 rounded border border-slate-300 bg-white text-muted-foreground hover:text-foreground" title="Collapse schema panel"><ChevronLeft size={13} className="mx-auto" /></button>
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
            <span className="min-w-0 flex-1">Field Details</span>
          </div>

          <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto">
            {fieldsWithCalculatedConfidence.length === 0 ? (
              <div className="m-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-[10px] font-bold text-muted-foreground">
                No schema fields yet. Select a prebuilt model, create a category, or draw a field.
              </div>
            ) : visibleSchemaGroups.map(group => (
              <div key={group.id}>
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-1 text-[8px] font-black uppercase tracking-widest text-slate-500">
                  <span className="truncate">{group.name}</span>
                  <span>{group.fields.length}</span>
                </div>
                {group.fields.map((field, index) => {
                  const isActive = activeTraceFieldId === field.id;
                  return (
                <button
                  key={field.id}
                  onClick={() => setSelectedFieldId(selectedFieldId === field.id ? null : field.id)}
                  onMouseEnter={() => setHoveredFieldId(field.id)}
                  onMouseLeave={() => setHoveredFieldId(null)}
                  className={cn(
                    "flex flex-col min-h-9 w-full gap-2 border-b border-slate-200 px-4 py-2 text-left transition-all",
                    field.enabled === false && "opacity-45",
                    isActive ? "bg-emerald-50/70 shadow-[inset_3px_0_0_hsl(var(--primary))]" : "hover:bg-slate-50"
                  )}
                >
                  <div className="flex w-full items-center gap-2">
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
                  </div>
                  <div className="flex w-full items-center gap-2 pl-12">
                    <select
                      value={field.type || "string"}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateFieldConfig(field.id, { type: event.target.value, dateFormat: event.target.value === "date" ? field.dateFormat || "DD/MM/YYYY" : field.dateFormat })}
                      className="h-6 w-20 shrink-0 rounded border border-slate-300 bg-slate-50 px-1 text-[8px] font-black uppercase text-muted-foreground outline-none"
                    >
                      {["string", "text", "date", "number", "checkbox", "radio", "barcode", "signature", "table", "object"].map(type => <option key={type} value={type}>{type}</option>)}
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
                        <option value="multiline">Multiple Line</option>
                        <option value="box">Box Format</option>
                        <option value="until_next_label">Until Next Label</option>
                      </select>
                    )}
                    <input
                      value={field.regex || ""}
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => updateFieldConfig(field.id, { regex: event.target.value })}
                      placeholder="regex"
                      className="h-6 flex-1 min-w-0 rounded border border-slate-300 bg-white px-2 text-[8px] font-bold text-foreground outline-none"
                    />
                  </div>
                </button>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="border-t border-border/50 p-4">
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
          </>
          )}
        </div>

        {/* CENTER PANEL: DOCUMENT IMAGE */}
        <div className="relative z-20 flex flex-col min-h-0 rounded-xl border border-border/50 bg-white shadow-sm overflow-hidden">
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
              onDeleteAnnotation={handleDeleteAnnotation}
              onAnnotationAction={(action, ann) => {
                if (action === "addAnchor") {
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

        {/* RIGHT PANEL: EXTRACTION PREVIEW */}
        <div className="relative z-40 flex min-h-0 flex-col rounded-lg border border-slate-300 bg-white shadow-[0_1px_6px_rgba(15,23,42,0.08)] overflow-hidden">
          {rightPanelCollapsed ? (
            <button
              onClick={() => setRightPanelCollapsed(false)}
              className="flex h-full w-full items-center justify-center bg-slate-50 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:bg-slate-100"
              title="Expand extraction preview"
            >
              <span className="rotate-90 whitespace-nowrap">Preview</span>
            </button>
          ) : (
          <>
          <div className="flex items-center justify-between gap-3 border-b border-slate-300 bg-slate-50 px-4 py-2.5">
            <div className="min-w-0">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-foreground">Extraction Preview</h3>
              <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                AI trace with highlighted evidence
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <span className="rounded-md bg-primary/10 px-2 py-1 text-[9px] font-black text-primary">
                0 errors
              </span>
              <button onClick={() => setRightPanelWidth(width => Math.max(280, width - 40))} className="h-6 w-6 rounded border border-slate-300 bg-white text-[11px] font-black text-muted-foreground hover:text-foreground" title="Narrow preview panel">-</button>
              <button onClick={() => setRightPanelWidth(width => Math.min(560, width + 40))} className="h-6 w-6 rounded border border-slate-300 bg-white text-[11px] font-black text-muted-foreground hover:text-foreground" title="Widen preview panel">+</button>
              <button onClick={() => setRightPanelCollapsed(true)} className="h-6 w-6 rounded border border-slate-300 bg-white text-muted-foreground hover:text-foreground" title="Collapse preview panel"><ChevronRight size={13} className="mx-auto" /></button>
            </div>
          </div>

          <div className="custom-scrollbar flex-1 min-h-0 overflow-y-auto" onScroll={() => measureTraceLinesRef.current()}>
            {previewRows.length === 0 ? (
              <div className="m-4 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center text-[10px] font-bold text-muted-foreground">
                No data points available.
              </div>
            ) : previewRows.map((field, index) => {
              const isActive = activeTraceFieldId === field.id;
              const isDocumentType = field.id === "document_type";
              return (
                <button
                  ref={(node) => {
                    previewRowRefs.current[field.id] = node;
                  }}
                  key={field.id}
                  onClick={() => !isDocumentType && setSelectedFieldId(selectedFieldId === field.id ? null : field.id)}
                  onMouseEnter={() => !isDocumentType && setHoveredFieldId(field.id)}
                  onMouseLeave={() => setHoveredFieldId(null)}
                  className={cn(
                    "flex flex-col w-full gap-1 border-b border-slate-200 px-3 py-2.5 text-left transition-all",
                    isActive ? "bg-emerald-50/70 shadow-[inset_3px_0_0_hsl(var(--primary))]" : "hover:bg-slate-50"
                  )}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: getFieldColor(field, index) }} />
                    <span className="min-w-0 truncate text-[10px] font-black uppercase tracking-wide text-foreground">
                      {field.name}
                    </span>
                  </div>
                  
                  <div className="pl-4 w-full">
                    <span className="font-mono text-[10px] font-bold text-foreground break-words whitespace-pre-wrap">
                      {field.value || "No OCR value found"}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 pl-4 mt-1 w-full text-[8px] font-black uppercase text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <span>Confidence:</span>
                      <span className={cn(
                        "text-[9px]",
                        field.value ? "text-emerald-600" : field.x !== undefined ? "text-amber-600" : "text-rose-600"
                      )}>
                        {Math.round((field.confidence || 0) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle2 size={11} className={field.value ? "text-emerald-600" : "text-amber-500"} />
                      <span>{getFieldStatus(field)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          </>
          )}
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
              <span className="text-[8px] font-black uppercase text-primary/60">OCR Result</span>
              <span className="text-[11px] font-mono font-bold text-foreground truncate">{pendingAnnotation.extractedText}</span>
            </div>

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
