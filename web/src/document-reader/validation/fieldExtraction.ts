import { OCRWord } from "../types";

export type SelectionBox = { x: number; y: number; width: number; height: number };

/** Minimal shape of a configured anchor needed to relocate it in fresh OCR. */
export interface ExtractionAnchor {
  id: string;
  value: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Minimal shape of a configured field needed to relocate its value relative to an anchor. */
export interface ExtractionFieldSpec {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface LocatedField extends SelectionBox {
  value: string;
  confidence: number;
  anchorBox?: SelectionBox;
}

const READING_ORDER = (a: OCRWord, b: OCRWord) => {
  const sameLine = Math.abs(a.y - b.y) < Math.max(a.height, b.height, 1.2);
  return sameLine ? a.x - b.x : a.y - b.y;
};

const LABEL_TOKENS = [
  "passport", "passeport", "no", "number", "nom", "surname", "given", "names", "prenoms",
  "nationality", "nationalite", "date", "birth", "naissance", "place", "lieu", "issue",
  "delivrance", "expiry", "expiration", "authority", "autorite", "sex", "sexe", "pays",
  "issuing", "country", "type", "code", "signature", "holder", "titulaire"
];

const isLabel = (text = "") => {
  const t = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const tokens = t.split(/\s+/).filter(Boolean);
  return tokens.some(token =>
    LABEL_TOKENS.includes(token) ||
    // Fuzzy substring match only for tokens long enough that a containment match is
    // meaningful — otherwise short field values like "M"/"F" (sex) or "15" (a date)
    // get flagged as labels just because their characters appear inside a label word.
    (token.length > 2 && LABEL_TOKENS.some(bt => bt.length > 2 && (token.includes(bt) || bt.includes(token))))
  );
};

const ANCHOR_EXCLUDE_OVERLAP = 0.4;

/**
 * True if a word sits on top of (or mostly inside) a region the user marked as an
 * anchor — i.e. constant/label text. Anchors are never dynamic field values, so words
 * matching this must be excluded from any field's captured value regardless of which
 * field's box they happen to fall inside.
 */
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

const isStrikethrough = (word: OCRWord): boolean => {
  const w = word as OCRWord & { strikethrough?: boolean; struck?: boolean; decoration?: string; flags?: string };
  if (w.strikethrough === true || w.struck === true) return true;
  if (w.decoration === "strikethrough" || (w.flags || "").includes("struck")) return true;
  const text = (w.text || "").trim();
  if (/^[-_–—~]{2,}$/.test(text)) return true;
  const conf = typeof w.confidence === "number" ? w.confidence : 1;
  const normConf = conf > 1 ? conf / 100 : conf;
  if (normConf < 0.22 && text.length <= 3 && !/[a-z0-9]/i.test(text)) return true;
  return false;
};

/** Converts a word's bbox from pixel coordinates to a 0-100 percentage of the page, if needed. */
export function normalizeWordBox(word: OCRWord, pageWidth: number, pageHeight: number): OCRWord {
  const usesPixelX = pageWidth > 0 && (word.x > 100 || word.width > 100);
  const usesPixelY = pageHeight > 0 && (word.y > 100 || word.height > 100);

  return {
    ...word,
    x: usesPixelX ? (word.x / pageWidth) * 100 : word.x,
    y: usesPixelY ? (word.y / pageHeight) * 100 : word.y,
    width: usesPixelX ? (word.width / pageWidth) * 100 : word.width,
    height: usesPixelY ? (word.height / pageHeight) * 100 : word.height,
  };
}

/**
 * Returns the words inside a selection box.
 * - Anchor mode (excludeLabels=false): tight ≥65% overlap match, used to relocate label text.
 * - Field mode (excludeLabels=true): seeds from the box, walks rightward on the same line until
 *   the next label/large gap, and also captures handwriting written above the value.
 */
export function getWordsInSelection(
  textLayer: OCRWord[],
  pageWidth: number,
  pageHeight: number,
  box: SelectionBox,
  excludeLabels = false,
  excludeBoxes: SelectionBox[] = []
): OCRWord[] {
  const normalizedWords = (textLayer || [])
    .map(w => normalizeWordBox(w, pageWidth, pageHeight))
    .filter(w => !(excludeLabels && excludeBoxes.length > 0 && excludeBoxes.some(b => wordInsideBox(w, b))));

  const wordOverlap = (word: OCRWord, b: SelectionBox) => {
    const left = Math.max(word.x, b.x);
    const right = Math.min(word.x + word.width, b.x + b.width);
    const top = Math.max(word.y, b.y);
    const bottom = Math.min(word.y + word.height, b.y + b.height);
    const area = Math.max(0, right - left) * Math.max(0, bottom - top);
    return area / Math.max(0.01, word.width * word.height);
  };

  if (!excludeLabels) {
    const anchored = normalizedWords
      .filter(w => {
        const cov = wordOverlap(w, box);
        const notTooWide = w.width <= Math.max(2.5, box.width * 1.4);
        const notTooTall = w.height <= Math.max(1.8, box.height * 1.8);
        return cov >= 0.65 && notTooWide && notTooTall && !isStrikethrough(w);
      })
      .sort(READING_ORDER);

    if (anchored.length > 0) return anchored;

    return normalizedWords
      .filter(w => {
        const padded = { x: box.x - 0.1, y: box.y - 0.1, width: box.width + 0.2, height: box.height + 0.2 };
        return wordOverlap(w, padded) >= 0.65 &&
          w.width <= Math.max(2.5, box.width * 1.4) &&
          w.height <= Math.max(1.8, box.height * 1.8) &&
          !isStrikethrough(w);
      })
      .sort(READING_ORDER);
  }

  const overlapping = normalizedWords.filter(w => {
    if (isStrikethrough(w)) return false;
    const cov = wordOverlap(w, box);
    const cx = w.x + w.width / 2;
    const cy = w.y + w.height / 2;
    const centreInside = cx >= box.x && cx <= box.x + box.width && cy >= box.y && cy <= box.y + box.height;
    const notTooTall = w.height <= Math.max(1.8, box.height * 2.0);
    return notTooTall && (cov >= 0.35 || (centreInside && cov >= 0.15));
  });

  const seeds = overlapping.filter(w => !isLabel(w.text)).sort(READING_ORDER);

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
    }).sort(READING_ORDER);

    if (belowWords.length === 0) return [];

    const belowMinY = Math.min(...belowWords.map(w => w.y));
    const belowLineH = Math.max(...belowWords.map(w => w.height), 1.5);
    return belowWords.filter(w => Math.abs(w.y - belowMinY) <= belowLineH * 0.9);
  }

  const seedMinY = Math.min(...seeds.map(w => w.y));
  const seedCentreYs = seeds.map(w => w.y + w.height / 2);
  const lineCY = seedCentreYs.reduce((a, b) => a + b, 0) / seedCentreYs.length;
  const lineH = Math.max(...seeds.map(w => w.height), 1.5);
  const lineTolerance = lineH * 0.9;
  const seedLeft = Math.min(...seeds.map(w => w.x));
  const seedRight = Math.max(...seeds.map(w => w.x + w.width));

  const sameLine = normalizedWords
    .filter(w => {
      if (isStrikethrough(w)) return false;
      const cy = w.y + w.height / 2;
      return Math.abs(cy - lineCY) <= lineTolerance && w.x >= seedLeft - 0.3;
    })
    .sort(READING_ORDER);

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

  // The seed line itself produced a value — use it as-is. Only look above for
  // handwritten overflow when the line yielded nothing; otherwise OCR noise from
  // an adjacent label row (which can slip past isLabel() when garbled) gets
  // prepended to a perfectly good value.
  if (primaryResult.length > 0) return primaryResult;

  const aboveWords = normalizedWords.filter(w => {
    if (isStrikethrough(w)) return false;
    if (isLabel(w.text || "")) return false;
    const cy = w.y + w.height / 2;
    const inAboveZone = cy < seedMinY - 0.2 && cy >= seedMinY - lineH * 2.5;
    const inHorizontalRange = w.x + w.width >= box.x - 0.5 && w.x <= seedRight + 1;
    return inAboveZone && inHorizontalRange;
  }).sort(READING_ORDER);

  return aboveWords.length > 0 ? aboveWords : seeds;
}

/** Average normalized (0-1) confidence across a set of words. */
export function averageConfidence(words: OCRWord[]): number {
  if (words.length === 0) return 0;
  const total = words.reduce((sum, word) => {
    const confidence = word.confidence > 1 ? word.confidence / 100 : word.confidence;
    return sum + (Number.isFinite(confidence) ? confidence : 0);
  }, 0);
  return total / words.length;
}

/** Finds the words on the page whose text matches a label string, token by token. */
export function findWordsByLabel(textLayer: OCRWord[], pageWidth: number, pageHeight: number, label: string): OCRWord[] {
  const normalizedWords = (textLayer || []).map(w => normalizeWordBox(w, pageWidth, pageHeight));
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
}

/** Fraction of an anchor label's tokens (length > 2) that appear in the candidate words' text. */
function labelMatchScore(label: string, words: OCRWord[]): number {
  const labelTokens = label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 2);
  if (labelTokens.length === 0) return 0;

  const wordText = words.map(w => (w.text || "").toLowerCase().replace(/[^a-z0-9]/g, "")).join("");
  const hits = labelTokens.filter(token => wordText.includes(token)).length;
  return hits / labelTokens.length;
}

/** Bounding box that encloses all the given words. */
export function boxFromWords(words: OCRWord[]): SelectionBox | null {
  if (words.length === 0) return null;
  const minX = Math.min(...words.map(word => word.x));
  const minY = Math.min(...words.map(word => word.y));
  const maxX = Math.max(...words.map(word => word.x + word.width));
  const maxY = Math.max(...words.map(word => word.y + word.height));
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

/** Collapses bilingual "WORD/WORD" pairs (e.g. on passports/IDs) down to a single value. */
export function normalizeBilingualValue(text: string): string {
  if (!text || !text.includes("/")) return text;

  const result = text.replace(/\b([A-ZÀ-ÖØ-Ýa-zà-öø-ý]+)\/([A-ZÀ-ÖØ-Ýa-zà-öø-ý]+)\b/g, (_match, part1: string, part2: string) => {
    return part1.length >= part2.length ? part1 : part2;
  });

  return result.replace(/\s+/g, " ").trim();
}

export interface DocumentOffset { dx: number; dy: number; }

/**
 * Computes the document's overall positional drift by re-finding every configured
 * anchor in fresh OCR and taking the median (x, y) shift from its trained position.
 * A median across many anchors represents the shift shared by "most of the document"
 * and is robust to the odd anchor that moved independently (or wasn't found at all).
 * Returns null if too few anchors can be re-found to be meaningful.
 */
export function computeDocumentOffset(
  textLayer: OCRWord[],
  pageWidth: number,
  pageHeight: number,
  anchors: ExtractionAnchor[]
): DocumentOffset | null {
  const MIN_ANCHOR_MATCH = 0.6;
  const offsets: DocumentOffset[] = [];

  for (const anchor of anchors) {
    const anchorWords = findWordsByLabel(textLayer, pageWidth, pageHeight, anchor.value);
    if (anchorWords.length === 0) continue;
    if (labelMatchScore(anchor.value, anchorWords) < MIN_ANCHOR_MATCH) continue;
    const anchorBox = boxFromWords(anchorWords);
    if (!anchorBox) continue;
    offsets.push({ dx: anchorBox.x - anchor.x, dy: anchorBox.y - anchor.y });
  }

  if (offsets.length === 0) return null;

  const median = (values: number[]): number => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  };

  return { dx: median(offsets.map(o => o.dx)), dy: median(offsets.map(o => o.dy)) };
}

/**
 * Re-locates a field's value in fresh OCR by finding one of its configured anchors,
 * computing the offset from the anchor's original position to the field's original
 * position, and reading the words found at that offset in the new OCR. Anchors that
 * don't genuinely match the fresh OCR (only a weak fallback match) are skipped, and
 * among the remaining anchor-relocated candidates the highest-confidence one wins.
 *
 * If this field's own anchors can't be re-found (or only match weakly), but a
 * `documentOffset` is supplied — the shift shared by most of the rest of the
 * document — that shift is applied to the field's trained position before falling
 * back to the raw, un-shifted trained position.
 */
export function locateField(
  textLayer: OCRWord[],
  pageWidth: number,
  pageHeight: number,
  field: ExtractionFieldSpec,
  fieldAnchors: ExtractionAnchor[],
  documentOffset?: DocumentOffset | null,
  allAnchors: ExtractionAnchor[] = []
): LocatedField | null {
  // An anchor whose trained label text barely resembles anything findWordsByLabel()
  // could match against the fresh OCR is more likely a bad fallback match (e.g. an
  // anchor trained from a garbled OCR pass) than a real relocation — skip those rather
  // than letting a single weak match dictate the predicted box.
  const MIN_ANCHOR_MATCH = 0.6;
  const candidates: LocatedField[] = [];

  // Anchors mark constant/label text (e.g. "Given names/Prénoms") — wherever an anchor
  // currently sits in this document's OCR, that text must never be captured as a
  // field's dynamic value, even if it falls inside another field's box. Re-find each
  // anchor in the fresh OCR; if it can't be confidently re-found, fall back to its
  // trained position shifted by the document's overall offset.
  const anchorExcludeBoxes: SelectionBox[] = allAnchors.map(anchor => {
    const anchorWords = findWordsByLabel(textLayer, pageWidth, pageHeight, anchor.value);
    if (anchorWords.length > 0 && labelMatchScore(anchor.value, anchorWords) >= MIN_ANCHOR_MATCH) {
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

  for (const anchor of fieldAnchors) {
    const anchorWords = findWordsByLabel(textLayer, pageWidth, pageHeight, anchor.value);
    if (anchorWords.length === 0) continue;
    if (labelMatchScore(anchor.value, anchorWords) < MIN_ANCHOR_MATCH) continue;
    const anchorBox = boxFromWords(anchorWords);
    if (!anchorBox) continue;

    const dx = (field.x ?? 0) - anchor.x;
    const dy = (field.y ?? 0) - anchor.y;

    const predictedBox: SelectionBox = {
      x: Math.max(0, Math.min(95, anchorBox.x + dx)),
      y: Math.max(0, Math.min(95, anchorBox.y + dy)),
      width: field.width ?? 10,
      height: field.height ?? 3,
    };

    const words = getWordsInSelection(textLayer, pageWidth, pageHeight, predictedBox, true, anchorExcludeBoxes);
    const value = normalizeBilingualValue(words.map(w => w.text).join(" ").trim());
    if (!value) continue;

    candidates.push({ ...predictedBox, value, confidence: averageConfidence(words), anchorBox });
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.confidence - a.confidence);
    return candidates[0];
  }

  // This field's own anchor(s) couldn't be re-found (or matched too weakly), but most
  // of the rest of the document shifted by a consistent (dx, dy) — e.g. a re-scan that's
  // cropped or nudged differently. Apply that shared shift to the field's trained
  // position before falling back to its raw, un-shifted position.
  if (documentOffset && field.x !== undefined) {
    const box: SelectionBox = {
      x: Math.max(0, Math.min(95, field.x + documentOffset.dx)),
      y: Math.max(0, Math.min(95, (field.y ?? 0) + documentOffset.dy)),
      width: field.width ?? 10,
      height: field.height ?? 3,
    };
    const words = getWordsInSelection(textLayer, pageWidth, pageHeight, box, true, anchorExcludeBoxes);
    const value = normalizeBilingualValue(words.map(w => w.text).join(" ").trim());
    if (value) return { ...box, value, confidence: averageConfidence(words) };
  }

  // No anchor produced a usable value (or all matches were too weak) — fall back to
  // the field's own trained position, which is the box the user sees highlighted.
  if (field.x !== undefined) {
    const box: SelectionBox = { x: field.x, y: field.y ?? 0, width: field.width ?? 10, height: field.height ?? 3 };
    const words = getWordsInSelection(textLayer, pageWidth, pageHeight, box, true, anchorExcludeBoxes);
    const value = normalizeBilingualValue(words.map(w => w.text).join(" ").trim());
    return { ...box, value, confidence: value ? averageConfidence(words) : 0 };
  }

  return null;
}
