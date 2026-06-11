import { TrainingDocument, DocumentClass } from "../types";
import { seededRandom } from "./engine";

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export type AutoPipelineStage = "classifying" | "extracting";

const NAME_SAMPLES = ["Alex Morgan", "Priya Nair", "Daniel Cho", "Maria Santos", "James Carter"];
const ADDRESS_SAMPLES = [
  "482 Riverside Drive, Austin, TX 78701",
  "129 Maple Avenue, Columbus, OH 43215",
  "77 Harbor View Rd, Seattle, WA 98101",
];
const TEXT_SAMPLES = ["Acme Holdings Inc.", "Northwind Logistics", "Global Crest Partners", "Summit Health Group"];

/** Deterministic mock value generator for a freshly-extracted field, seeded by document + field id. */
export function generateFieldValue(field: { id: string; name: string; type: string }, seed: string): string {
  const r = seededRandom(seed);
  const nameLower = field.name.toLowerCase();

  switch (field.type) {
    case "date": {
      const month = 1 + Math.floor(seededRandom(`${seed}_m`) * 12);
      const day = 1 + Math.floor(seededRandom(`${seed}_d`) * 28);
      const year = 2023 + Math.floor(seededRandom(`${seed}_y`) * 3);
      return `${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}/${year}`;
    }
    case "amount": {
      const amount = (50 + r * 9950).toFixed(2);
      return `$${amount}`;
    }
    case "number": {
      return String(Math.floor(100000 + r * 900000));
    }
    case "address":
      return ADDRESS_SAMPLES[Math.floor(r * ADDRESS_SAMPLES.length)];
    default: {
      if (nameLower.includes("email")) return `${["alex.morgan", "priya.nair", "d.cho", "m.santos"][Math.floor(r * 4)]}@example.com`;
      if (nameLower.includes("phone")) return `(${100 + Math.floor(r * 900)}) 555-${1000 + Math.floor(seededRandom(`${seed}_p`) * 9000)}`;
      if (nameLower.includes("name")) return NAME_SAMPLES[Math.floor(r * NAME_SAMPLES.length)];
      if (nameLower.includes("address")) return ADDRESS_SAMPLES[Math.floor(r * ADDRESS_SAMPLES.length)];
      if (nameLower.includes("id") || nameLower.includes("number") || nameLower.includes("ref") || nameLower.includes("code")) {
        return `REF-${String(Math.floor(r * 900000) + 100000)}`;
      }
      return TEXT_SAMPLES[Math.floor(r * TEXT_SAMPLES.length)];
    }
  }
}

/**
 * Classifies a freshly-uploaded document by matching its filename against the
 * keywords/anchor phrases of each configured document class. Falls back to a
 * deterministic pick among active classes so every upload leaves the queue
 * with a routable classification.
 */
export function classifyDocument(doc: TrainingDocument, documentClasses: DocumentClass[]): TrainingDocument["classification"] | undefined {
  const candidates = documentClasses.filter(c => c.isActive !== false);
  if (candidates.length === 0) return undefined;

  const haystack = doc.name.toLowerCase();
  let bestClass: DocumentClass | null = null;
  let bestScore = 0;

  candidates.forEach(cls => {
    const terms = [cls.name, ...cls.keywords, ...cls.anchorPhrases].map(t => t.toLowerCase()).filter(Boolean);
    const score = terms.filter(t => haystack.includes(t)).length;
    if (score > 0 && (!bestClass || score > bestScore)) {
      bestClass = cls;
      bestScore = score;
    }
  });

  const chosen = bestClass ? bestClass : candidates[Math.floor(seededRandom(doc.documentId) * candidates.length)];
  const matchScore = bestScore;
  const confidence = clamp01(0.82 + matchScore * 0.04 + seededRandom(`${doc.documentId}_conf`) * 0.05);

  return {
    classId: chosen.classId,
    className: chosen.name,
    confidence: Math.min(confidence, 0.995),
    method: "system",
    modelName: "auto-classifier-v2.1",
    ocrEngineName: "tesseract-v5",
  };
}

export interface DocumentSegmentClassification {
  classification: NonNullable<TrainingDocument["classification"]>;
  pageIndices: number[];
}

/**
 * Splits a freshly-uploaded document into one or more classified segments. Most
 * uploads resolve to a single segment spanning every page, but a multi-page file
 * may bundle several distinct documents — in that case each segment gets its own
 * classification and page range so the bundle can be split into separate records.
 */
export function classifyDocumentSegments(doc: TrainingDocument, documentClasses: DocumentClass[]): DocumentSegmentClassification[] {
  const candidates = documentClasses.filter(c => c.isActive !== false);
  const totalPages = doc.pages.length;
  if (candidates.length === 0 || totalPages === 0) return [];

  const primary = classifyDocument(doc, documentClasses);
  if (!primary) return [];

  const allPageIndices = doc.pages.map((_, i) => i);
  if (totalPages === 1 || candidates.length === 1) {
    return [{ classification: primary, pageIndices: allPageIndices }];
  }

  const maxSegments = Math.min(candidates.length, totalPages, 3);
  const segmentCount = 1 + Math.floor(seededRandom(`${doc.documentId}_segments`) * maxSegments);
  if (segmentCount <= 1) {
    return [{ classification: primary, pageIndices: allPageIndices }];
  }

  const basePages = Math.floor(totalPages / segmentCount);
  let remainder = totalPages % segmentCount;
  const usedClassIds = new Set<string>([primary.classId]);
  const segments: DocumentSegmentClassification[] = [];
  let cursor = 0;

  for (let i = 0; i < segmentCount; i++) {
    let count = basePages;
    if (remainder > 0) {
      count += 1;
      remainder -= 1;
    }
    if (count <= 0) continue;

    const pageIndices = allPageIndices.slice(cursor, cursor + count);
    cursor += count;

    let classification: NonNullable<TrainingDocument["classification"]>;
    if (i === 0) {
      classification = primary;
    } else {
      const altCandidates = candidates.filter(c => !usedClassIds.has(c.classId));
      const pool = altCandidates.length > 0 ? altCandidates : candidates;
      const pick = pool[Math.floor(seededRandom(`${doc.documentId}_seg${i}`) * pool.length)];
      usedClassIds.add(pick.classId);
      classification = {
        classId: pick.classId,
        className: pick.name,
        confidence: clamp01(0.80 + seededRandom(`${doc.documentId}_seg${i}_conf`) * 0.18),
        method: "system",
        modelName: "auto-classifier-v2.1",
        ocrEngineName: "tesseract-v5",
      };
    }

    segments.push({ classification, pageIndices });
  }

  return segments;
}

/**
 * Builds an extraction design for a freshly-classified document by cloning the
 * field/category/anchor schema from another document of the same class that
 * already has a configured extraction design, then populating mock values
 * and confidences for each field.
 */
export function buildExtractionDesign(doc: TrainingDocument, classId: string, trainingDocuments: TrainingDocument[]): Record<string, any> | null {
  const template = trainingDocuments.find(d =>
    d.documentId !== doc.documentId &&
    d.classification?.classId === classId &&
    ((d.metadata?.extractionDesign?.fields || []).length > 0)
  );
  if (!template) return null;

  const design = template.metadata!.extractionDesign as Record<string, any>;
  const fields = (design.fields || []).map((f: any) => ({
    ...f,
    value: generateFieldValue(f, `${doc.documentId}_${f.id}`),
    confidence: clamp01(0.80 + seededRandom(`${doc.documentId}_${f.id}_conf`) * 0.19),
  }));

  return {
    categories: design.categories || [],
    fields,
    anchors: design.anchors || [],
    links: design.links || [],
    selectedFieldId: null,
    selectedCategoryId: null,
  };
}
