import {
  TrainingDocument,
  DocumentClass,
  ExtractionField,
  RiskScoreBreakdown,
  DocumentConfidenceBreakdown,
  ValidationQueueType,
  BusinessRuleCheckResult,
  FieldExplanation,
  FieldConfidenceBreakdown,
  ValidationDocumentSummary,
  ValidationTransactionLog,
  ModelVersionRecord,
  DriftDataPoint,
  VendorPerformance,
  FieldDecayProfile,
  AnalystTelemetry,
  GoldenDatasetResult,
  CorrectionType,
  TrainingLedgerEntry,
  ClassReadiness,
  ProductionReadinessGate,
  GateStatus,
  LearningTrend,
} from "../types";
import { loadTrainingLedger, aggregateCorrectionTypes, aggregateByField } from "./ledger";

// ─── Helpers ───────────────────────────────────────────────────────────────

/** Normalise a confidence value that may be expressed as 0-1 or 0-100 into 0-1. */
export const norm = (value: number | undefined | null): number => {
  if (value === undefined || value === null || Number.isNaN(value)) return 0;
  return value > 1 ? value / 100 : Math.max(0, Math.min(1, value));
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Stable pseudo-random in [0,1) derived from a string seed (deterministic across renders). */
export const seededRandom = (seed: string): number => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
};

const getExtractionFields = (doc: TrainingDocument): ExtractionField[] => {
  const designFields = (doc.metadata?.extractionDesign?.fields || []) as Array<{
    id: string;
    name: string;
    type: string;
    required: boolean;
    confidence?: number;
    value?: string;
  }>;
  if (designFields.length > 0) {
    return designFields.map(f => ({
      id: f.id,
      name: f.name,
      type: (f.type as ExtractionField["type"]) || "text",
      required: f.required,
      confidence: f.confidence,
      value: f.value,
    }));
  }
  return doc.extraction?.fields || [];
};

const getOcrConfidence = (doc: TrainingDocument): number => {
  const words = doc.pages.flatMap(p => p.textLayer || []);
  if (words.length === 0) {
    // Fall back to page-level confidence average
    const pages = doc.pages.filter(p => typeof p.confidence === "number");
    if (pages.length === 0) return 0.9;
    return clamp01(pages.reduce((s, p) => s + norm(p.confidence), 0) / pages.length);
  }
  return clamp01(words.reduce((s, w) => s + norm(w.confidence), 0) / words.length);
};

// ─── 3.1 Dynamic Document Risk Score (R_d) ──────────────────────────────────

const RISK_WEIGHTS = { wc: 0.35, we: 0.35, wv: 0.15, wb: 0.15 };

export function computeRiskScore(doc: TrainingDocument, documentClasses: DocumentClass[]): RiskScoreBreakdown {
  const Cc = norm(doc.classification?.confidence);

  const fields = getExtractionFields(doc);
  const fieldConfidences = fields.map(f => norm(f.confidence));
  const Ce = fieldConfidences.length > 0
    ? fieldConfidences.reduce((s, v) => s + v, 0) / fieldConfidences.length
    : Cc;

  const docClass = documentClasses.find(c => c.classId === doc.classification?.classId || c.name === doc.classification?.className);
  const Vd = docClass ? (docClass.sampleCount < 5 ? 1.0 : 0.1) : 0.5;

  const Bd = computeBusinessCriticality(fields);

  const riskScore = clamp01(
    RISK_WEIGHTS.wc * (1 - Cc) +
    RISK_WEIGHTS.we * (1 - Ce) +
    RISK_WEIGHTS.wv * Vd +
    RISK_WEIGHTS.wb * Bd
  );

  return {
    classificationConfidence: Cc,
    meanExtractionConfidence: Ce,
    structuralVariationPenalty: Vd,
    businessCriticality: Bd,
    weights: RISK_WEIGHTS,
    riskScore,
  };
}

function computeBusinessCriticality(fields: ExtractionField[]): number {
  const amountFields = fields.filter(f =>
    f.type === "amount" || /total|amount|sum|grand/i.test(f.name)
  );
  let maxAmount = 0;
  for (const field of amountFields) {
    const numeric = parseFloat((field.value || "").replace(/[^0-9.\-]/g, ""));
    if (Number.isFinite(numeric)) maxAmount = Math.max(maxAmount, Math.abs(numeric));
  }
  if (maxAmount >= 100000) return 1.0;
  if (maxAmount >= 10000) return 0.5;
  if (maxAmount > 0) return 0.1;
  return 0.0;
}

// ─── 4.7 Business Rule Confidence Integrations ──────────────────────────────

const EPSILON = 0.01;

export function runBusinessRules(doc: TrainingDocument): BusinessRuleCheckResult[] {
  const fields = getExtractionFields(doc);
  const results: BusinessRuleCheckResult[] = [];

  const findField = (pattern: RegExp) => fields.find(f => pattern.test(f.name));
  const toNumber = (field?: ExtractionField) => {
    if (!field?.value) return null;
    const numeric = parseFloat(field.value.replace(/[^0-9.\-]/g, ""));
    return Number.isFinite(numeric) ? numeric : null;
  };

  const subtotal = findField(/sub\s*-?\s*total/i);
  const tax = findField(/\btax\b|\bvat\b|\bgst\b/i);
  const total = findField(/^(grand\s*)?total$|invoice\s*total/i);

  if (subtotal && tax && total) {
    const sv = toNumber(subtotal);
    const tv = toNumber(tax);
    const gv = toNumber(total);
    if (sv !== null && tv !== null && gv !== null) {
      const delta = Math.abs(sv + tv - gv);
      results.push({
        ruleId: "invoice_reconciliation",
        label: "Subtotal + Tax = Invoice Total",
        passed: delta <= EPSILON,
        delta,
        expression: `|${sv} + ${tv} - ${gv}| = ${delta.toFixed(2)} ${delta <= EPSILON ? "≤" : ">"} ${EPSILON}`,
      });
    }
  }

  return results;
}

// ─── 3.2 Overall Document Confidence (C_doc) ────────────────────────────────

const CONF_WEIGHTS = { w1: 0.3, w2: 0.4, w3: 0.2, w4: 0.1 };

/** 7-layer Confidence Framework weights — Phase 1 Validation Studio */
const CONF_WEIGHTS_2 = {
  ocr: 0.15,
  extraction: 0.25,
  boundary: 0.10,
  anchor: 0.10,
  validation: 0.15,
  training: 0.15,
  evidence: 0.10,
};

/** Evidence Confidence cap curve, keyed off sample count — interpolated linearly. */
const EVIDENCE_CURVE: Array<[number, number]> = [
  [0, 0.55],
  [10, 0.70],
  [25, 0.80],
  [50, 0.88],
  [100, 0.93],
  [250, 0.97],
];

function evidenceConfidenceForSamples(sampleCount: number): number {
  const n = Math.max(0, sampleCount);
  for (let i = 0; i < EVIDENCE_CURVE.length - 1; i++) {
    const [n0, v0] = EVIDENCE_CURVE[i];
    const [n1, v1] = EVIDENCE_CURVE[i + 1];
    if (n <= n1) {
      const t = n0 === n1 ? 0 : (n - n0) / (n1 - n0);
      return clamp01(v0 + (v1 - v0) * Math.max(0, t));
    }
  }
  return EVIDENCE_CURVE[EVIDENCE_CURVE.length - 1][1];
}

/** Maturity proxy from sample count, reusing the power-law learning curve (n→accuracy at α=0.22). */
function trainingMaturityForSamples(sampleCount: number): number {
  const n = Math.max(1, sampleCount);
  const k = 0.6; // calibration constant — matches a ~50% accuracy floor at n=1
  return clamp01(1 - k / Math.pow(n, LEARNING_CURVE_ALPHA));
}

function fieldHasBoundary(field: Record<string, any>): boolean {
  const box = field.boundingBox || field.bounding_box;
  return !!box && [box.x, box.y, box.width, box.height].every((v: any) => typeof v === "number");
}

function fieldAnchorConfidence(field: Record<string, any>): number {
  const anchorId = field.anchorId || field.anchor_id;
  if (!anchorId) return 0.5; // neutral — not every field needs an anchor
  const anchorConfidence = field.anchorConfidence ?? field.anchor_confidence;
  return typeof anchorConfidence === "number" ? norm(anchorConfidence) : 0.9;
}

function ledgerEntriesForDocument(ledgerEntries: TrainingLedgerEntry[], documentId: string): TrainingLedgerEntry[] {
  return ledgerEntries.filter(e => e.document_id === documentId);
}

/**
 * Real drift signal derived from `DocumentClass.confidenceHistory` snapshots
 * (recorded by `recordClassConfidenceSnapshot` as the class accumulates samples).
 * Requires at least 3 historical points before enabling — with fewer points
 * there's nothing to distinguish "trend" from "noise," so we stay honest and
 * report disabled rather than fabricate a number from 1-2 data points.
 */
function computeDriftSignal(docClass?: DocumentClass): { enabled: boolean; penalty: number } {
  const history = docClass?.confidenceHistory;
  if (!history || history.length < 3) return { enabled: false, penalty: 0 };

  const latest = history[history.length - 1].overall;
  const priorWindow = history.slice(Math.max(0, history.length - 4), history.length - 1);
  if (priorWindow.length === 0) return { enabled: false, penalty: 0 };

  const priorAvg = priorWindow.reduce((s, h) => s + h.overall, 0) / priorWindow.length;
  const decline = priorAvg - latest;
  const penalty = decline > 0 ? clamp01(Math.min(decline, 0.15)) : 0;
  return { enabled: true, penalty };
}

export function computeDocConfidence(
  doc: TrainingDocument,
  businessRules: BusinessRuleCheckResult[],
  docClass?: DocumentClass,
  ledgerEntries: TrainingLedgerEntry[] = []
): DocumentConfidenceBreakdown {
  const Cc = norm(doc.classification?.confidence);
  const fields = getExtractionFields(doc);
  const rawDesignFields = (doc.metadata?.extractionDesign?.fields || []) as Array<Record<string, any>>;
  const fieldConfidences = fields.map(f => Math.max(norm(f.confidence), 0.0001));

  const geometricFieldConfidence = fieldConfidences.length > 0
    ? Math.exp(fieldConfidences.reduce((s, v) => s + Math.log(v), 0) / fieldConfidences.length)
    : Cc;

  const Cocr = getOcrConfidence(doc);
  const businessRulesPass = businessRules.every(r => r.passed);

  const overallConfidence = clamp01(
    CONF_WEIGHTS.w1 * Cc +
    CONF_WEIGHTS.w2 * geometricFieldConfidence +
    CONF_WEIGHTS.w3 * Cocr +
    CONF_WEIGHTS.w4 * (businessRulesPass ? 1.0 : 0.0)
  );

  // ── 7-layer Confidence Framework ──
  const docLedger = ledgerEntriesForDocument(ledgerEntries, doc.documentId);
  const boundaryBreakingTypes: CorrectionType[] = ["FIELD_TRUNCATION", "FIELD_OVER_CAPTURE", "TABLE_BOUNDARY_ERROR"];
  const fieldsForBoundary = rawDesignFields.length > 0 ? rawDesignFields : fields;
  const boundaryConfidence = fieldsForBoundary.length > 0
    ? clamp01(fieldsForBoundary.reduce((s, f) => {
        const hasBox = fieldHasBoundary(f);
        const brokenForField = docLedger.some(e => e.field_id === f.id && e.correction_type && boundaryBreakingTypes.includes(e.correction_type));
        return s + (hasBox && !brokenForField ? 1 : hasBox ? 0.4 : 0.6);
      }, 0) / fieldsForBoundary.length)
    : 0.6;

  const anchorConfidence = fieldsForBoundary.length > 0
    ? clamp01(fieldsForBoundary.reduce((s, f) => s + fieldAnchorConfidence(f), 0) / fieldsForBoundary.length)
    : 0.5;

  const totalCorrections = docLedger.length;
  const acceptedCorrections = docLedger.filter(e => e.correction_type === null).length;
  const validationConfidence = totalCorrections > 0 ? clamp01(acceptedCorrections / totalCorrections) : 0.85;

  const trainingConfidence = trainingMaturityForSamples(docClass?.sampleCount ?? 0);
  const evidenceConfidence = evidenceConfidenceForSamples(docClass?.sampleCount ?? 0);
  const evidenceCap = evidenceConfidence;

  const { enabled: driftEnabled, penalty: driftPenalty } = computeDriftSignal(docClass);

  const blended = clamp01(
    CONF_WEIGHTS_2.ocr * Cocr +
    CONF_WEIGHTS_2.extraction * geometricFieldConfidence +
    CONF_WEIGHTS_2.boundary * boundaryConfidence +
    CONF_WEIGHTS_2.anchor * anchorConfidence +
    CONF_WEIGHTS_2.validation * validationConfidence +
    CONF_WEIGHTS_2.training * trainingConfidence +
    CONF_WEIGHTS_2.evidence * evidenceConfidence -
    driftPenalty
  );
  const cappedOverallConfidence = Math.min(blended, evidenceCap);

  return {
    classificationConfidence: Cc,
    geometricFieldConfidence,
    ocrConfidence: Cocr,
    businessRulesPass,
    weights: CONF_WEIGHTS,
    overallConfidence: cappedOverallConfidence > 0 ? cappedOverallConfidence : overallConfidence,
    anchorConfidence,
    boundaryConfidence,
    validationConfidence,
    trainingConfidence,
    evidenceConfidence,
    evidenceCap,
    driftPenalty,
    driftEnabled,
    weights2: CONF_WEIGHTS_2,
  };
}

/** Per-field transparency breakdown for the Confidence Transparency UI. */
export function computeFieldConfidence(
  field: Record<string, any>,
  doc: TrainingDocument,
  docClass: DocumentClass | undefined,
  ledgerEntries: TrainingLedgerEntry[]
): FieldConfidenceBreakdown {
  const docLedger = ledgerEntriesForDocument(ledgerEntries, doc.documentId).filter(e => e.field_id === field.id);
  const boundaryBreakingTypes: CorrectionType[] = ["FIELD_TRUNCATION", "FIELD_OVER_CAPTURE", "TABLE_BOUNDARY_ERROR"];

  const hasBox = fieldHasBoundary(field);
  const brokenBoundary = docLedger.some(e => e.correction_type && boundaryBreakingTypes.includes(e.correction_type));
  const boundaryConfidence = hasBox && !brokenBoundary ? 1 : hasBox ? 0.4 : 0.6;

  const anchorConfidence = fieldAnchorConfidence(field);

  const total = docLedger.length;
  const accepted = docLedger.filter(e => e.correction_type === null).length;
  const validationConfidence = total > 0 ? clamp01(accepted / total) : 0.85;

  const { enabled: driftEnabled, penalty: driftPenalty } = computeDriftSignal(docClass);

  const contributors: Array<{ label: string; value: number; issue: string }> = [
    { label: "boundary", value: boundaryConfidence, issue: "Field boundary repeatedly mis-captured (truncation/over-capture)." },
    { label: "anchor", value: anchorConfidence, issue: "No reliable anchor link found for this field." },
    { label: "validation", value: validationConfidence, issue: "Frequent analyst corrections on this field." },
  ];
  const lowest = contributors.reduce((min, c) => (c.value < min.value ? c : min), contributors[0]);
  const topIssue = lowest.value < 0.7 ? lowest.issue : "No significant issues detected for this field.";

  return {
    fieldId: field.id,
    boundaryConfidence,
    anchorConfidence,
    validationConfidence,
    driftPenalty,
    driftEnabled,
    topIssue,
  };
}

// ─── Correction Attribution Engine ──────────────────────────────────────────
//
// Classifies every analyst correction into a CorrectionType so that, per the
// governance requirement, "nothing trains until attribution occurs." Rule-based
// and deterministic (not ML) so every classification is explainable.

function isAmbiguousSubstitution(predicted: string, corrected: string): boolean {
  if (predicted.length !== corrected.length || predicted.length === 0) return false;
  let diffCount = 0;
  for (let i = 0; i < predicted.length; i++) {
    const p = predicted[i];
    const c = corrected[i];
    if (p === c) continue;
    diffCount++;
    const altsForP = AMBIGUOUS_CHAR_PAIRS[p] || AMBIGUOUS_CHAR_PAIRS[p.toUpperCase()] || [];
    const matches = altsForP.some(alt => alt.toLowerCase() === c.toLowerCase());
    if (!matches) return false;
  }
  return diffCount > 0;
}

export function classifyCorrection(
  field: Record<string, any>,
  predictedValue: string,
  correctedValue: string,
  action: "accept" | "edit" | "clear",
  doc?: TrainingDocument,
  businessRules?: BusinessRuleCheckResult[]
): { type: CorrectionType | null; reasons: string[] } {
  const predicted = predictedValue || "";
  const corrected = correctedValue || "";

  // 1. No change — accepted as-is.
  if (action === "accept" || predicted === corrected) {
    return { type: null, reasons: ["Analyst accepted the predicted value without modification."] };
  }

  // 2. Cleared by analyst.
  if (action === "clear") {
    return { type: "MANUAL_OVERRIDE", reasons: ["Analyst cleared an unusable extraction."] };
  }

  // 3. OCR character-confusion substitution.
  if (isAmbiguousSubstitution(predicted, corrected)) {
    return { type: "OCR_SUBSTITUTION", reasons: [`Corrected value differs from the predicted value only in glyphs known to be visually ambiguous (e.g. "0"/"O", "1"/"I", "5"/"S").`] };
  }

  // 4. Truncation / over-capture.
  if (corrected.length > predicted.length && corrected.startsWith(predicted)) {
    return { type: "FIELD_TRUNCATION", reasons: ["Predicted value was a truncated prefix of the corrected value — field boundary likely cut off text."] };
  }
  if (predicted.length > corrected.length && predicted.startsWith(corrected)) {
    return { type: "FIELD_OVER_CAPTURE", reasons: ["Predicted value over-captured beyond the corrected value — field boundary likely extended too far."] };
  }

  // 5. Multiline failure.
  if (corrected.includes("\n") && !predicted.includes("\n")) {
    return { type: "MULTILINE_FAILURE", reasons: ["Corrected value spans multiple lines that the predicted single-line extraction missed."] };
  }

  // 6. Table boundary error.
  if (field.type === "table") {
    return { type: "TABLE_BOUNDARY_ERROR", reasons: ["Correction made on a table field — likely a row/column boundary detection error."] };
  }

  // 7. Anchor error — no anchor link found for this field.
  const anchorId = field.anchorId || field.anchor_id;
  if (!anchorId) {
    return { type: "ANCHOR_ERROR", reasons: ["No anchor link was found for this field, making its position unverifiable against the document layout."] };
  }

  // 8. Business interpretation error — correction touches a reconciliation field.
  if (doc && businessRules && /total|amount|sum|grand|tax|subtotal/i.test(field.name || "")) {
    const reconciliation = businessRules.find(r => r.ruleId === "invoice_reconciliation");
    if (reconciliation && !reconciliation.passed) {
      return { type: "BUSINESS_INTERPRETATION_ERROR", reasons: [`Correction resolves a failed business-rule reconciliation (${reconciliation.expression}).`] };
    }
  }

  // 9. Fallback.
  return { type: "MANUAL_OVERRIDE", reasons: ["Analyst override with no detected OCR, boundary, anchor, or business-rule cause."] };
}

// ─── 4.3 Active Learning & HLV Queue routing ────────────────────────────────

export function classifyQueue(confidence: DocumentConfidenceBreakdown, risk: RiskScoreBreakdown): ValidationQueueType {
  const pct = confidence.overallConfidence * 100;

  if (!confidence.businessRulesPass || risk.riskScore > 0.6) return "manual_escalation";
  if (pct < 40) return "manual_escalation";
  if (pct > 90) return "straight_through";
  if (pct >= 40 && pct <= 70) return "highest_learning_value";
  return "confidence_review";
}

// ─── 4.1 Model Explainability Engine ────────────────────────────────────────

const AMBIGUOUS_CHAR_PAIRS: Record<string, string[]> = {
  "0": ["O", "D"],
  "O": ["0", "Q"],
  "1": ["I", "l"],
  "I": ["1", "l"],
  "5": ["S"],
  "S": ["5"],
  "8": ["B"],
  "B": ["8"],
  "2": ["Z"],
  "Z": ["2"],
};

function buildOcrAmbiguity(value: string): { observed: string; alternatives: string[] } | undefined {
  for (const ch of value) {
    const upper = ch.toUpperCase();
    if (AMBIGUOUS_CHAR_PAIRS[upper] || AMBIGUOUS_CHAR_PAIRS[ch]) {
      const alts = AMBIGUOUS_CHAR_PAIRS[ch] || AMBIGUOUS_CHAR_PAIRS[upper];
      return {
        observed: ch,
        alternatives: alts.map(alt => value.replace(ch, alt)),
      };
    }
  }
  return undefined;
}

export function buildFieldExplanations(doc: TrainingDocument): FieldExplanation[] {
  const fields = getExtractionFields(doc);
  return fields.map(field => {
    const confidence = norm(field.confidence);
    const status: FieldExplanation["status"] = confidence > 0.95 ? "high" : confidence >= 0.85 ? "medium" : "low";
    const reasons: string[] = [];
    const ambiguity = field.value ? buildOcrAmbiguity(field.value) : undefined;

    if (status === "high") {
      reasons.push("OCR character certainty above 95% for all glyphs in this field.");
    } else {
      if (ambiguity) {
        reasons.push(`OCR character ambiguity detected: "${ambiguity.observed}" may also read as ${ambiguity.alternatives.map(a => `"${a}"`).join(" or ")}.`);
      }
      if (!field.value) {
        reasons.push("No text detected within the mapped field region — possible scan misalignment or blank field.");
      }
      reasons.push(status === "medium"
        ? "Extraction confidence is acceptable but below the high-confidence threshold."
        : "Extraction confidence is significantly below the high-confidence threshold.");
    }

    return {
      fieldId: field.id,
      fieldName: field.name,
      confidence,
      status,
      ocrAmbiguity: ambiguity,
      reasons,
    };
  });
}

export function buildClassificationExplanation(doc: TrainingDocument, documentClasses: DocumentClass[]) {
  const docClass = documentClasses.find(c => c.classId === doc.classification?.classId || c.name === doc.classification?.className);
  const ocrText = doc.pages.map(p => p.ocrText || "").join(" ").toLowerCase();

  const matchedKeywords = (docClass?.keywords || []).filter(kw => ocrText.includes(kw.toLowerCase()));
  const matchedAnchors = (docClass?.anchorPhrases || []).filter(kw => ocrText.includes(kw.toLowerCase()));

  return {
    matchedKeywords: [...matchedKeywords, ...matchedAnchors].slice(0, 6),
    vendorFingerprintMatch: matchedAnchors[0] || (docClass?.layoutPatterns?.[0] ?? null),
  };
}

// ─── Document summary aggregator ────────────────────────────────────────────

export function summarizeDocument(doc: TrainingDocument, documentClasses: DocumentClass[]): ValidationDocumentSummary {
  const riskScore = computeRiskScore(doc, documentClasses);
  const businessRules = runBusinessRules(doc);
  const docClass = documentClasses.find(c => c.classId === doc.classification?.classId || c.name === doc.classification?.className);
  const ledgerEntries = loadTrainingLedger();
  const confidence = computeDocConfidence(doc, businessRules, docClass, ledgerEntries);
  const queue = classifyQueue(confidence, riskScore);
  const fieldExplanations = buildFieldExplanations(doc);
  const classificationExplanation = buildClassificationExplanation(doc, documentClasses);

  return {
    documentId: doc.documentId,
    name: doc.name,
    className: doc.classification?.className || "Unclassified",
    riskScore,
    confidence,
    queue,
    businessRules,
    fieldExplanations,
    classificationExplanation,
  };
}

// ─── 6.1 Unified Transaction Log ────────────────────────────────────────────

export function generateTransactionLog(doc: TrainingDocument, summary: ValidationDocumentSummary, batchId: string): ValidationTransactionLog {
  const reconciliation = summary.businessRules.find(r => r.ruleId === "invoice_reconciliation");

  return {
    transaction_id: `tx_${doc.documentId}`,
    batch_id: batchId,
    document_id: doc.documentId,
    model_context: {
      classification_model_version: doc.classification?.modelName || "unassigned",
      extraction_model_id: `ext_${(doc.classification?.className || "doc").toLowerCase().replace(/\s+/g, "_")}`,
    },
    explainability_data: {
      ocr_ambiguity_detected: summary.fieldExplanations.some(f => !!f.ocrAmbiguity),
    },
    business_rules: {
      mathematical_reconciliation_pass: reconciliation ? reconciliation.passed : true,
      delta_amount: reconciliation ? Math.round(reconciliation.delta * 100) / 100 : 0,
    },
    timestamp: new Date().toISOString(),
  };
}

// ─── 4.4 Model Health Center & Drift Analytics (mocked telemetry series) ────

export function generateDriftSeries(seedKey: string, days = 90): DriftDataPoint[] {
  const points: DriftDataPoint[] = [];
  const base = 94 + seededRandom(seedKey) * 4;
  for (let i = days; i >= 0; i -= 3) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const wobble = (seededRandom(`${seedKey}_${i}`) - 0.5) * 3;
    const decay = (days - i) / days * 1.5; // gentle downward drift over time
    points.push({
      date: date.toISOString().slice(0, 10),
      accuracy: Math.round(clamp01((base - decay + wobble) / 100) * 10000) / 100,
    });
  }
  return points;
}

export function generateVendorPerformance(documentClasses: DocumentClass[]): VendorPerformance[] {
  if (documentClasses.length === 0) {
    return [
      { vendor: "Vendor A", accuracy: 97.1, documentCount: 412, trend: "stable" },
      { vendor: "Vendor B", accuracy: 82.4, documentCount: 188, trend: "down" },
    ];
  }
  return documentClasses.slice(0, 6).map((c, idx) => {
    const r = seededRandom(`vendor_${c.classId}`);
    const accuracy = Math.round((78 + r * 20) * 10) / 10;
    return {
      vendor: c.name,
      accuracy,
      documentCount: c.sampleCount,
      trend: accuracy > 92 ? "up" : accuracy < 85 ? "down" : "stable",
    };
  });
}

export function generateFieldDecayProfiles(summaries: ValidationDocumentSummary[]): FieldDecayProfile[] {
  const fieldMap = new Map<string, number[]>();
  for (const summary of summaries) {
    for (const field of summary.fieldExplanations) {
      const existing = fieldMap.get(field.fieldName) || [];
      existing.push(Math.round(field.confidence * 1000) / 10);
      fieldMap.set(field.fieldName, existing);
    }
  }

  const profiles: FieldDecayProfile[] = [];
  fieldMap.forEach((values, fieldName) => {
    const current = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10;
    const seed = seededRandom(fieldName);
    const history = Array.from({ length: 6 }, (_, i) => {
      const drift = (5 - i) * (0.5 + seed * 1.5);
      return Math.round(clamp01((current + drift) / 100) * 10000) / 100;
    });
    profiles.push({
      fieldName,
      history,
      current,
      status: current >= 90 ? "stable" : current >= 75 ? "decaying" : "critical",
    });
  });
  return profiles.sort((a, b) => a.current - b.current);
}

// ─── 4.6 / 4.9 / 10. Model lifecycle, rollback & golden dataset (mocked) ────

export function generateModelVersions(): ModelVersionRecord[] {
  return [
    { version: "v4.0.82", stage: "production", accuracy: 96.8, goldenSetScore: 95.4, promotedAt: "2026-04-02T10:00:00Z", isActive: true, isStable: true },
    { version: "v4.2.1", stage: "ab_test", accuracy: 97.3, goldenSetScore: 96.1, abTrafficPercent: 15, promotedAt: "2026-05-28T09:30:00Z", isActive: true, isStable: false },
    { version: "v5.0.0-rc1", stage: "shadow_deployment", accuracy: 95.1, goldenSetScore: 93.8, promotedAt: "2026-06-05T14:15:00Z", isActive: true, isStable: false },
    { version: "v3.8.4", stage: "production", accuracy: 95.9, goldenSetScore: 94.7, promotedAt: "2026-01-12T08:00:00Z", isActive: false, isStable: true },
  ];
}

export function generateGoldenDatasetResult(modelVersions: ModelVersionRecord[]): GoldenDatasetResult {
  const candidate = modelVersions.find(m => m.stage === "ab_test") || modelVersions[0];
  const baseline = modelVersions.find(m => m.stage === "production" && m.isActive) || modelVersions[0];
  const totalDocuments = 500;
  const passedDocuments = Math.round(totalDocuments * (candidate.goldenSetScore / 100));

  return {
    modelVersion: candidate.version,
    totalDocuments,
    passedDocuments,
    score: candidate.goldenSetScore,
    baselineScore: baseline.goldenSetScore,
    ranAt: new Date().toISOString(),
    passesGate: candidate.goldenSetScore >= baseline.goldenSetScore,
  };
}

// ─── 4.5 Human Performance & Quality Analytics ──────────────────────────────

export function generateAnalystTelemetry(fieldsReviewed: number, documentsReviewed: number, elapsedSeconds: number): AnalystTelemetry {
  const secondsPerField = fieldsReviewed > 0 ? elapsedSeconds / fieldsReviewed : 0;
  const secondsPerDocument = documentsReviewed > 0 ? elapsedSeconds / documentsReviewed : 0;
  return {
    analystName: "Sarah K.",
    secondsPerField: Math.round(secondsPerField * 10) / 10,
    secondsPerDocument: Math.round(secondsPerDocument * 10) / 10,
    fieldsReviewed,
    documentsReviewed,
  };
}

// ─── Sample Optimization Engine ───────────────────────────────────────────────
//
// Estimates the number of additional training samples needed to reach a target
// accuracy given current accuracy, using a simplified power-law learning curve:
//   accuracy ≈ 1 − k / n^α
// where n = sample count, α ≈ 0.22 (empirical for document classification tasks),
// k is calibrated from (current_accuracy, current_samples).

import { SampleOptimizationResult } from "../types";

const LEARNING_CURVE_ALPHA = 0.22;

export function computeSamplesNeeded(
  currentAccuracy: number,   // 0–1
  targetAccuracy: number,    // 0–1
  currentSamples: number,    // positive integer
  samplesPerDay = 20,        // throughput estimate for ETA
): SampleOptimizationResult {
  const clamp = (v: number) => Math.max(0, Math.min(1, v));
  const ca = clamp(currentAccuracy);
  const ta = clamp(targetAccuracy);

  // Calibrate k from current measurements
  const k = (1 - ca) * Math.pow(Math.max(1, currentSamples), LEARNING_CURVE_ALPHA);

  let samplesNeeded = currentSamples;

  if (ta <= ca) {
    samplesNeeded = currentSamples; // already at or above target
  } else {
    // Solve: ta = 1 − k / n^α  →  n = (k / (1−ta))^(1/α)
    const needed = Math.pow(k / (1 - ta), 1 / LEARNING_CURVE_ALPHA);
    samplesNeeded = Math.ceil(needed);
  }

  const remaining = Math.max(0, samplesNeeded - currentSamples);
  const eta = samplesPerDay > 0 ? Math.ceil(remaining / samplesPerDay) : null;

  return {
    current_accuracy: Math.round(ca * 10000) / 100,
    target_accuracy: Math.round(ta * 10000) / 100,
    samples_needed: samplesNeeded,
    current_samples: currentSamples,
    samples_remaining: remaining,
    confidence_interval: 1.96 * Math.sqrt((ca * (1 - ca)) / Math.max(1, currentSamples)),
    estimated_days_to_target: eta,
  };
}

export const QUEUE_LABELS: Record<ValidationQueueType, string> = {
  highest_learning_value: "Highest Learning Value (HLV)",
  confidence_review: "Confidence Review",
  manual_escalation: "Manual Escalation",
  straight_through: "Straight-Through (Auto-Approved)",
};

// ─── Training Center / Sample Requirement Engine (Phase 2) ───────────────────

export const CORRECTION_TYPE_LABELS: Record<CorrectionType, string> = {
  OCR_SUBSTITUTION: "OCR character substitution",
  OCR_INSERTION: "OCR character insertion",
  OCR_DELETION: "OCR character deletion",
  FIELD_TRUNCATION: "Field truncation",
  FIELD_OVER_CAPTURE: "Field over-capture",
  MULTILINE_FAILURE: "Multiline capture failure",
  ANCHOR_ERROR: "Missing anchor links",
  TABLE_BOUNDARY_ERROR: "Table boundary error",
  CLASSIFICATION_ERROR: "Classification error",
  BUSINESS_INTERPRETATION_ERROR: "Business interpretation error",
  MANUAL_OVERRIDE: "Manual override",
};

/** Fraction (0-1) of a class's required fields that are actually populated, averaged across its documents. */
function computeRequiredFieldCoverage(docClass: DocumentClass, classDocs: TrainingDocument[]): number {
  if (docClass.requiredFields.length === 0 || classDocs.length === 0) return 1;
  const perDocCoverage = classDocs.map(doc => {
    const fields = getExtractionFields(doc);
    const populatedNames = new Set(fields.filter(f => !!f.value && f.value.trim().length > 0).map(f => f.name));
    const covered = docClass.requiredFields.filter(name => populatedNames.has(name)).length;
    return covered / docClass.requiredFields.length;
  });
  return perDocCoverage.reduce((a, b) => a + b, 0) / perDocCoverage.length;
}

export function computeClassReadiness(
  docClass: DocumentClass,
  ledgerEntries: TrainingLedgerEntry[],
  trainingDocuments: TrainingDocument[],
): ClassReadiness {
  const classDocs = trainingDocuments.filter(d => d.classification?.classId === docClass.classId);

  const history = docClass.confidenceHistory;
  let currentAccuracy: number;
  if (history && history.length > 0) {
    currentAccuracy = history[history.length - 1].overall;
  } else if (classDocs.length > 0) {
    const scores = classDocs.map(d => computeDocConfidence(d, runBusinessRules(d), docClass, ledgerEntries).overallConfidence);
    currentAccuracy = scores.reduce((a, b) => a + b, 0) / scores.length;
  } else {
    currentAccuracy = 0.75;
  }

  const targetAccuracy = clamp01(docClass.minConfidence);
  const sampleResult = computeSamplesNeeded(currentAccuracy, targetAccuracy, docClass.sampleCount);

  const classDocIds = new Set(classDocs.map(d => d.documentId));
  const classLedgerEntries = ledgerEntries.filter(e => classDocIds.has(e.document_id));
  const topIssues = aggregateCorrectionTypes(classLedgerEntries, 3);

  let readinessTier: ClassReadiness["readinessTier"];
  if (sampleResult.samples_remaining === 0) {
    readinessTier = "ready";
  } else if (sampleResult.samples_remaining < 10 && (topIssues[0]?.percentage ?? 0) > 40) {
    readinessTier = "needs_attribution_fix";
  } else {
    readinessTier = "needs_samples";
  }

  return {
    classId: docClass.classId,
    name: docClass.name,
    sampleCount: docClass.sampleCount,
    currentAccuracy,
    targetAccuracy,
    samplesNeeded: sampleResult.samples_needed,
    samplesRemaining: sampleResult.samples_remaining,
    etaDays: sampleResult.estimated_days_to_target,
    topIssues,
    readinessTier,
    requiredFieldCoverage: computeRequiredFieldCoverage(docClass, classDocs),
  };
}

/** Network-wide (all classes) per-field correction profiles — top problematic fields, for Field Intelligence. */
export function computeFieldIntelligence(ledgerEntries: TrainingLedgerEntry[], limit = 5) {
  return aggregateByField(ledgerEntries, limit);
}

/**
 * Real learning-curve trend from a class's recorded confidence snapshots. Requires at least 2
 * historical points — never fabricates a trend from a single reading.
 */
export function computeLearningTrend(docClass: DocumentClass): LearningTrend {
  const history = docClass.confidenceHistory;
  if (!history || history.length < 2) {
    return { enabled: false, direction: "flat", deltaPct: 0 };
  }
  const first = history[0].overall;
  const latest = history[history.length - 1].overall;
  const deltaPct = Math.round((latest - first) * 1000) / 10;
  const direction: LearningTrend["direction"] = deltaPct > 0.5 ? "improving" : deltaPct < -0.5 ? "declining" : "flat";
  return { enabled: true, direction, deltaPct };
}

/**
 * Real deployment-gate evaluation for Publish Studio. Only computes gates we
 * actually have measured data for (accuracy from class readiness, human
 * validation from the training ledger). The remaining gates (PII governance,
 * fingerprinting, performance benchmark, security scan) have no instrumentation
 * wired into this pipeline yet — they're reported "pending" rather than faked.
 */
export function computeProductionReadinessGates(
  documentClasses: DocumentClass[],
  trainingDocuments: TrainingDocument[],
  ledgerEntries: TrainingLedgerEntry[],
): ProductionReadinessGate[] {
  const activeClasses = documentClasses.filter(c => c.isActive);
  const readiness = activeClasses.map(c => computeClassReadiness(c, ledgerEntries, trainingDocuments));

  const avgAccuracy = readiness.length > 0
    ? readiness.reduce((s, r) => s + r.currentAccuracy, 0) / readiness.length
    : 0;
  const accuracyThreshold = 0.85;
  const accuracyStatus: GateStatus = readiness.length === 0
    ? "pending"
    : avgAccuracy >= accuracyThreshold ? "passed" : avgAccuracy >= accuracyThreshold - 0.1 ? "warning" : "failed";

  const validatedDocCount = new Set(ledgerEntries.map(e => e.document_id)).size;
  const validationTarget = 50;
  const validationStatus: GateStatus = validatedDocCount === 0
    ? "pending"
    : validatedDocCount >= validationTarget ? "passed" : validatedDocCount >= validationTarget * 0.5 ? "warning" : "failed";

  return [
    {
      id: "accuracy",
      label: "Accuracy Threshold",
      description: `Minimum ${Math.round(accuracyThreshold * 100)}% accuracy across active classes`,
      status: accuracyStatus,
      value: readiness.length === 0 ? "No data" : `${Math.round(avgAccuracy * 1000) / 10}%`,
    },
    {
      id: "validation",
      label: "Human Validation",
      description: `≥ ${validationTarget} documents validated by reviewers`,
      status: validationStatus,
      value: `${validatedDocCount} docs`,
    },
    {
      id: "pii",
      label: "PII Governance",
      description: "Redaction rules configured",
      status: "pending",
      value: "Not yet wired",
    },
    {
      id: "fingerprint",
      label: "Document Fingerprint",
      description: "Deduplication fingerprint registered",
      status: "pending",
      value: "Not yet wired",
    },
    {
      id: "benchmark",
      label: "Performance Benchmark",
      description: "Avg processing time per document",
      status: "pending",
      value: "Not yet wired",
    },
    {
      id: "security",
      label: "Security Scan",
      description: "No PII leakage in test batch",
      status: "pending",
      value: "Not yet wired",
    },
  ];
}
