/**
 * Structural Element Detector
 *
 * Analyses a document's OCR text layer to identify persistent structural
 * regions that should be excluded from field extraction:
 *
 *   - Page Headers   — repeating text band at the top (top 8% of page height)
 *   - Page Footers   — repeating text band at the bottom (bottom 8%)
 *   - Page Numbers   — isolated digit sequences in the footer zone
 *   - Running Titles — single-line repeating text in header/footer
 *
 * Detection works entirely on the OCR word layer — no canvas access required.
 * Results feed back into the extraction pipeline as anchor-exclusion zones,
 * preventing headers/footers from polluting field values.
 */

import type { OCRWord } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StructuralElementType = "header" | "footer" | "page_number" | "running_title";

export interface StructuralElement {
  type: StructuralElementType;
  text: string;
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  page_number_value?: number;   // for type === "page_number"
  zone: "top" | "bottom";
}

export interface StructuralAnalysis {
  headers: StructuralElement[];
  footers: StructuralElement[];
  page_numbers: StructuralElement[];
  running_titles: StructuralElement[];
  /** All elements combined — use as exclusion zones in extraction. */
  all_exclusion_zones: StructuralElement[];
  header_height_px: number;    // normalized header zone bottom edge (0–1)
  footer_height_px: number;    // normalized footer zone top edge (0–1)
}

// ─── Zone constants ───────────────────────────────────────────────────────────

/** Top N% of page height = header zone */
const HEADER_ZONE_FRACTION = 0.08;
/** Bottom N% of page height = footer zone */
const FOOTER_ZONE_FRACTION = 0.08;
/** Minimum word count for a zone to qualify as header/footer */
const MIN_ZONE_WORDS = 2;
/** Page number patterns */
const PAGE_NUMBER_PATTERNS = [
  /^\d{1,4}$/,
  /^page\s+\d+$/i,
  /^\d+\s*\/\s*\d+$/,
  /^-\s*\d+\s*-$/,
  /^\[\s*\d+\s*\]$/,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wordBbox(w: OCRWord): { x: number; y: number; width: number; height: number } {
  return { x: w.x, y: w.y, width: w.width, height: w.height };
}

function groupBbox(words: OCRWord[]): { x: number; y: number; width: number; height: number } {
  const x0 = Math.min(...words.map(w => w.x));
  const y0 = Math.min(...words.map(w => w.y));
  const x1 = Math.max(...words.map(w => w.x + w.width));
  const y1 = Math.max(...words.map(w => w.y + w.height));
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function meanConf(words: OCRWord[]): number {
  if (words.length === 0) return 0;
  return words.reduce((s, w) => s + w.confidence, 0) / words.length;
}

/** Cluster words into text lines by Y proximity (within lineHeight tolerance). */
function clusterLines(words: OCRWord[]): OCRWord[][] {
  if (words.length === 0) return [];
  const sorted = [...words].sort((a, b) => a.y - b.y);
  const lines: OCRWord[][] = [[sorted[0]]];
  const lineH = sorted[0].height || 20;

  for (let i = 1; i < sorted.length; i++) {
    const prev = lines[lines.length - 1];
    const prevY = Math.max(...prev.map(w => w.y + w.height / 2));
    if (Math.abs(sorted[i].y + sorted[i].height / 2 - prevY) <= lineH * 0.8) {
      prev.push(sorted[i]);
    } else {
      lines.push([sorted[i]]);
    }
  }
  return lines;
}

/** Reconstruct text from a sorted line of words. */
function lineText(words: OCRWord[]): string {
  return [...words].sort((a, b) => a.x - b.x).map(w => w.text).join(" ").trim();
}

// ─── Page number detection ────────────────────────────────────────────────────

function detectPageNumber(words: OCRWord[]): StructuralElement | null {
  for (const w of words) {
    const t = w.text.trim();
    for (const pat of PAGE_NUMBER_PATTERNS) {
      if (pat.test(t)) {
        const numMatch = t.match(/\d+/);
        return {
          type: "page_number",
          text: t,
          bbox: wordBbox(w),
          confidence: w.confidence,
          page_number_value: numMatch ? parseInt(numMatch[0]) : undefined,
          zone: "bottom",
        };
      }
    }
  }
  return null;
}

// ─── Single-page structural analysis ─────────────────────────────────────────

/**
 * Analyse a single page's OCR words and return detected structural elements.
 *
 * @param words    OCR word list for this page (normalised 0–pageWidth coords)
 * @param pageWidth  page width in the same units as word coordinates
 * @param pageHeight page height in the same units as word coordinates
 */
export function analysePageStructure(
  words: OCRWord[],
  pageWidth: number,
  pageHeight: number
): StructuralAnalysis {
  if (words.length === 0 || pageWidth === 0 || pageHeight === 0) {
    return {
      headers: [], footers: [], page_numbers: [], running_titles: [],
      all_exclusion_zones: [],
      header_height_px: pageHeight * HEADER_ZONE_FRACTION,
      footer_height_px: pageHeight * (1 - FOOTER_ZONE_FRACTION),
    };
  }

  const headerY = pageHeight * HEADER_ZONE_FRACTION;
  const footerY = pageHeight * (1 - FOOTER_ZONE_FRACTION);

  // Split words into zones
  const headerWords = words.filter(w => w.y + w.height / 2 < headerY);
  const footerWords = words.filter(w => w.y + w.height / 2 > footerY);

  const headers: StructuralElement[] = [];
  const footers: StructuralElement[] = [];
  const page_numbers: StructuralElement[] = [];
  const running_titles: StructuralElement[] = [];

  // ── Header analysis ────────────────────────────────────────────────────────

  if (headerWords.length >= MIN_ZONE_WORDS) {
    const headerLines = clusterLines(headerWords);
    for (const line of headerLines) {
      const text = lineText(line);
      const confidence = meanConf(line);

      // Check if this looks like a running title (longer text, centred)
      const isRunningTitle = text.length > 15 && line.length >= 3;
      if (isRunningTitle) {
        running_titles.push({
          type: "running_title",
          text,
          bbox: groupBbox(line),
          confidence,
          zone: "top",
        });
      } else {
        headers.push({
          type: "header",
          text,
          bbox: groupBbox(line),
          confidence,
          zone: "top",
        });
      }
    }
  }

  // ── Footer analysis ────────────────────────────────────────────────────────

  if (footerWords.length >= MIN_ZONE_WORDS) {
    // Try page number detection first
    const pn = detectPageNumber(footerWords);
    if (pn) page_numbers.push(pn);

    const footerLines = clusterLines(footerWords);
    for (const line of footerLines) {
      const text = lineText(line);
      const confidence = meanConf(line);
      const isPageNum = page_numbers.some(p => p.text === text.trim());

      if (!isPageNum) {
        const isRunningTitle = text.length > 15 && line.length >= 3;
        if (isRunningTitle) {
          running_titles.push({
            type: "running_title",
            text,
            bbox: groupBbox(line),
            confidence,
            zone: "bottom",
          });
        } else {
          footers.push({
            type: "footer",
            text,
            bbox: groupBbox(line),
            confidence,
            zone: "bottom",
          });
        }
      }
    }
  }

  const all_exclusion_zones = [...headers, ...footers, ...page_numbers, ...running_titles];

  return {
    headers,
    footers,
    page_numbers,
    running_titles,
    all_exclusion_zones,
    header_height_px: headerY,
    footer_height_px: footerY,
  };
}

// ─── Multi-page cross-correlation ─────────────────────────────────────────────

/**
 * Analyse multiple pages and cross-correlate to elevate confidence of
 * elements that repeat across pages (true headers/footers).
 *
 * A text element gets a bonus confidence boost if the same text appears
 * on ≥ 50% of pages → it's a persistent structural element, not a data field.
 */
export function analyseDocumentStructure(
  pageWordSets: Array<{ words: OCRWord[]; pageWidth: number; pageHeight: number }>
): StructuralAnalysis[] {
  const pageResults = pageWordSets.map(p =>
    analysePageStructure(p.words, p.pageWidth, p.pageHeight)
  );

  if (pageResults.length < 2) return pageResults;

  // Build frequency map of header/footer texts
  const textFreq: Record<string, number> = {};
  for (const r of pageResults) {
    for (const el of r.all_exclusion_zones) {
      const key = el.text.toLowerCase().replace(/\s+/g, " ").trim();
      textFreq[key] = (textFreq[key] || 0) + 1;
    }
  }

  const totalPages = pageResults.length;

  // Boost confidence for repeated elements
  return pageResults.map(r => ({
    ...r,
    all_exclusion_zones: r.all_exclusion_zones.map(el => {
      const key = el.text.toLowerCase().replace(/\s+/g, " ").trim();
      const freq = textFreq[key] || 1;
      const repeatBoost = freq / totalPages;  // 0–1
      return {
        ...el,
        confidence: Math.min(1, el.confidence + repeatBoost * 0.25),
      };
    }),
  }));
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export function mockStructuralAnalysis(): StructuralAnalysis {
  return {
    headers: [
      {
        type: "header",
        text: "GOVERNMENT OF CANADA · PASSEPORT CANADA",
        bbox: { x: 20, y: 8, width: 560, height: 22 },
        confidence: 0.94,
        zone: "top",
      },
    ],
    footers: [
      {
        type: "footer",
        text: "See page 4 for important notice. / Voir page 4 pour avis important.",
        bbox: { x: 20, y: 848, width: 560, height: 18 },
        confidence: 0.88,
        zone: "bottom",
      },
    ],
    page_numbers: [
      {
        type: "page_number",
        text: "2",
        bbox: { x: 548, y: 860, width: 16, height: 18 },
        confidence: 0.97,
        page_number_value: 2,
        zone: "bottom",
      },
    ],
    running_titles: [
      {
        type: "running_title",
        text: "TRAVEL DOCUMENT · DOCUMENT DE VOYAGE",
        bbox: { x: 180, y: 10, width: 240, height: 18 },
        confidence: 0.91,
        zone: "top",
      },
    ],
    all_exclusion_zones: [],
    header_height_px: 72,
    footer_height_px: 826,
  };
}
