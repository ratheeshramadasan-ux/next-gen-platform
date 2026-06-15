import { TrainingDocument, DocumentClass, TrainingPage } from "../types";
import { OCREngine } from "../services/ocrEngine";
import { locateField, computeDocumentOffset, ExtractionAnchor, ExtractionFieldSpec } from "./fieldExtraction";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type AutoPipelineStage = "classifying" | "extracting";

const OCR_START_MARKER = "-- START OF EXTRACTED DOCUMENT DATA --";
const OCR_END_MARKER = "-- END OF EXTRACTED DOCUMENT DATA --";

/** Strips the OCR engine's report wrapper, returning the raw recognized text. */
function getRawOcrText(page: TrainingPage): string {
  const text = page.ocrText || "";
  const startIdx = text.indexOf(OCR_START_MARKER);
  const endIdx = text.indexOf(OCR_END_MARKER);
  if (startIdx >= 0 && endIdx > startIdx) {
    return text.slice(startIdx + OCR_START_MARKER.length, endIdx).trim();
  }
  return text;
}

/** Runs real OCR on every page of a document that doesn't already have a populated text layer. */
export async function runOcrOnDocument(doc: TrainingDocument, engineId = "tesseract-ocr-v5"): Promise<TrainingDocument> {
  const pages = await Promise.all(
    doc.pages.map(async page => {
      if (page.textLayer && page.textLayer.length > 0) return page;
      const processed = await OCREngine.processPage(page, engineId);
      return processed as TrainingPage;
    })
  );
  return { ...doc, pages };
}

/**
 * Classifies a document by matching its OCR text (plus filename) against the
 * keywords/anchor phrases of each configured, active document class. The class
 * with the most matched terms wins; confidence is the fraction of that class's
 * terms found in the document. Returns undefined if no class has any match —
 * the document is left Unclassified rather than assigned a random class.
 */
export function classifyDocumentFromOcr(doc: TrainingDocument, documentClasses: DocumentClass[]): TrainingDocument["classification"] | undefined {
  const candidates = documentClasses.filter(c => c.isActive !== false);
  if (candidates.length === 0) return undefined;

  const ocrText = doc.pages.map(getRawOcrText).join("\n").toLowerCase();
  const haystack = `${doc.name.toLowerCase()}\n${ocrText}`;

  // A multi-word/bilingual term (e.g. "Passport No./No du passeport") rarely appears
  // verbatim in OCR text — instead check what fraction of its significant words
  // (length > 2) appear anywhere in the document.
  const termMatches = (term: string): boolean => {
    const tokens = term.split(/[^a-z0-9]+/).filter(t => t.length > 2);
    if (tokens.length === 0) return haystack.includes(term);
    const hits = tokens.filter(t => haystack.includes(t)).length;
    return hits / tokens.length >= 0.5;
  };

  let bestClass: DocumentClass | null = null;
  let bestRatio = 0;
  let bestScore = 0;
  let bestTotal = 1;

  for (const cls of candidates) {
    const terms = [cls.name, ...cls.keywords, ...cls.anchorPhrases].map(t => t.toLowerCase().trim()).filter(Boolean);
    if (terms.length === 0) continue;
    const matched = terms.filter(termMatches).length;
    if (matched === 0) continue;
    const ratio = matched / terms.length;
    // Prefer the class whose terms match the largest fraction (most specific fit
    // — e.g. a custom "Canadian Passport" class over a broad "Government ID" class
    // that happens to share a few generic keywords). Break ties on raw match count.
    if (ratio > bestRatio || (ratio === bestRatio && matched > bestScore)) {
      bestClass = cls;
      bestRatio = ratio;
      bestScore = matched;
      bestTotal = terms.length;
    }
  }

  if (!bestClass) return undefined;

  return {
    classId: bestClass.classId,
    className: bestClass.name,
    confidence: clamp01(bestScore / bestTotal),
    method: "system",
    modelName: "auto-classifier-v2.1",
    ocrEngineName: "tesseract-ocr-v5",
  };
}

/**
 * Builds an extraction design for a freshly-classified document by cloning the
 * field/category/anchor schema from another document of the same class that
 * already has a configured extraction design, then locating each field's value
 * in this document's OCR text layer via anchor-relative positioning.
 */
export interface ExtractionDesignResult {
  categories: unknown[];
  fields: (ExtractionFieldSpec & { id: string; value: string; confidence: number; [key: string]: unknown })[];
  anchors: ExtractionAnchor[];
  links: { fieldId: string; anchorId: string; [key: string]: unknown }[];
  selectedFieldId: null;
  selectedCategoryId: null;
}

interface ExtractionTemplate {
  categories: unknown[];
  fields: (ExtractionFieldSpec & { id: string; [key: string]: unknown })[];
  anchors: ExtractionAnchor[];
  links: { fieldId: string; anchorId: string }[];
}

interface CustomReusableModel extends ExtractionTemplate {
  id: string;
  name: string;
  documentClasses: string[];
  createdAt: string;
}

const CUSTOM_MODELS_KEY = "documentReader.customModels";

const normalizeModelKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function loadCustomModels(): CustomReusableModel[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(CUSTOM_MODELS_KEY) || "[]");
  } catch {
    return [];
  }
}

/**
 * Finds a reusable extraction model saved from the AI Document Designer / Extraction
 * Studio for this document's class — either by exact class name, or (if no class
 * name match) by fuzzy-matching the model's anchor labels against the OCR text.
 */
function matchCustomModel(documentClassName: string, ocrText: string): CustomReusableModel | null {
  const models = loadCustomModels();
  const docNorm = normalizeModelKey(documentClassName);
  const byClass = models.find(m => m.documentClasses.some(c => normalizeModelKey(c) === docNorm));
  if (byClass) return byClass;

  const ocrNorm = normalizeModelKey(ocrText);
  return models.find(m => {
    if (m.anchors.length === 0) return false;
    const hits = m.anchors.filter(a => ocrNorm.includes(normalizeModelKey(a.value)));
    return hits.length / m.anchors.length >= 0.6;
  }) || null;
}

export function buildExtractionDesignFromOcr(doc: TrainingDocument, classId: string, trainingDocuments: TrainingDocument[]): ExtractionDesignResult | null {
  const ocrText = doc.pages.map(getRawOcrText).join("\n");
  const customModel = matchCustomModel(doc.classification?.className || "", ocrText);

  const design: ExtractionTemplate | null = customModel || (trainingDocuments.find(d =>
    d.documentId !== doc.documentId &&
    d.classification?.classId === classId &&
    ((d.metadata?.extractionDesign?.fields || []).length > 0)
  )?.metadata?.extractionDesign as ExtractionTemplate | undefined) || null;

  if (!design) return null;

  const page = doc.pages[0];
  const textLayer = page?.textLayer || [];
  const pageWidth = page?.width || 0;
  const pageHeight = page?.height || 0;

  // The shift shared by most of the document's anchors — used to relocate fields whose
  // own anchor moved independently or couldn't be re-found in this document's OCR.
  const documentOffset = computeDocumentOffset(textLayer, pageWidth, pageHeight, design.anchors || []);

  const fields = (design.fields || []).map(f => {
    const fieldAnchors = (design.links || [])
      .filter(l => l.fieldId === f.id)
      .map(l => (design.anchors || []).find(a => a.id === l.anchorId))
      .filter(Boolean) as ExtractionAnchor[];

    const located = locateField(textLayer, pageWidth, pageHeight, f, fieldAnchors, documentOffset, design.anchors || []);

    return {
      ...f,
      value: located?.value || "",
      confidence: located?.confidence || 0,
    };
  });

  return {
    categories: design.categories || [],
    fields,
    anchors: design.anchors || [],
    links: design.links || [],
    selectedFieldId: null,
    selectedCategoryId: null,
  };
}
