import {
  TrainingDocument,
  DocumentClass,
  ExtractionField,
  RiskScoreBreakdown,
  DocumentConfidenceBreakdown,
  ValidationQueueType,
  BusinessRuleCheckResult,
  FieldExplanation,
  ValidationDocumentSummary,
  ValidationTransactionLog,
  ModelVersionRecord,
  DriftDataPoint,
  VendorPerformance,
  FieldDecayProfile,
  AnalystTelemetry,
  GoldenDatasetResult,
} from "../types";

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

export function computeDocConfidence(
  doc: TrainingDocument,
  businessRules: BusinessRuleCheckResult[]
): DocumentConfidenceBreakdown {
  const Cc = norm(doc.classification?.confidence);
  const fields = getExtractionFields(doc);
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

  return {
    classificationConfidence: Cc,
    geometricFieldConfidence,
    ocrConfidence: Cocr,
    businessRulesPass,
    weights: CONF_WEIGHTS,
    overallConfidence,
  };
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
  const confidence = computeDocConfidence(doc, businessRules);
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

export const QUEUE_LABELS: Record<ValidationQueueType, string> = {
  highest_learning_value: "Highest Learning Value (HLV)",
  confidence_review: "Confidence Review",
  manual_escalation: "Manual Escalation",
  straight_through: "Straight-Through (Auto-Approved)",
};
