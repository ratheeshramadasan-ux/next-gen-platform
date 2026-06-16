/**
 * Document Fingerprinting Service
 *
 * Generates 3 cryptographic/perceptual fingerprints per document page:
 *  - layout_hash:  SHA-256 of sorted field positions + dimensions (structure-only)
 *  - content_hash: SHA-256 of the full OCR text (content-only)
 *  - visual_hash:  64-bit perceptual hash (pHash) of the page image thumbnail
 *
 * These fingerprints enable deduplication, tamper detection, and change-tracking
 * without storing the raw document.
 */

export interface DocumentFingerprints {
  layout_hash: string;
  content_hash: string;
  visual_hash: string;
  generated_at: string;
  page_count: number;
}

export interface PageFingerprints {
  page_index: number;
  layout_hash: string;
  content_hash: string;
  visual_hash: string;
}

// ─── SHA-256 via Web Crypto (async, available in all modern browsers) ─────────

async function sha256Hex(input: string): Promise<string> {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    // Fallback for SSR / environments without SubtleCrypto
    return djb2Hex(input);
  }
  const enc = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Non-cryptographic djb2 fallback for SSR. Not secure — only used as a placeholder. */
function djb2Hex(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(16).padStart(8, "0").repeat(8);
}

// ─── Perceptual Hash (8×8 DCT-based pHash approximation) ─────────────────────

/**
 * Computes a 64-bit perceptual hash from an image element or canvas ImageData.
 * Steps: resize to 32×32 → greyscale → compute 8×8 DCT → threshold at median.
 */
export function computeVisualHash(imageData: ImageData | null): string {
  if (!imageData) return "0".repeat(16);

  // Downscale to 32×32 via averaging blocks
  const srcW = imageData.width;
  const srcH = imageData.height;
  const SIZE = 32;
  const grey = new Float32Array(SIZE * SIZE);

  for (let gy = 0; gy < SIZE; gy++) {
    for (let gx = 0; gx < SIZE; gx++) {
      const x0 = Math.floor((gx / SIZE) * srcW);
      const x1 = Math.floor(((gx + 1) / SIZE) * srcW);
      const y0 = Math.floor((gy / SIZE) * srcH);
      const y1 = Math.floor(((gy + 1) / SIZE) * srcH);
      let sum = 0, count = 0;
      for (let py = y0; py < y1; py++) {
        for (let px = x0; px < x1; px++) {
          const idx = (py * srcW + px) * 4;
          sum += 0.299 * imageData.data[idx] + 0.587 * imageData.data[idx + 1] + 0.114 * imageData.data[idx + 2];
          count++;
        }
      }
      grey[gy * SIZE + gx] = count > 0 ? sum / count : 0;
    }
  }

  // Extract 8×8 DCT coefficients (top-left block)
  const DCT = 8;
  const dct = new Float32Array(DCT * DCT);
  for (let u = 0; u < DCT; u++) {
    for (let v = 0; v < DCT; v++) {
      let s = 0;
      for (let x = 0; x < SIZE; x++) {
        for (let y = 0; y < SIZE; y++) {
          s += grey[y * SIZE + x]
            * Math.cos(((2 * x + 1) * u * Math.PI) / (2 * SIZE))
            * Math.cos(((2 * y + 1) * v * Math.PI) / (2 * SIZE));
        }
      }
      // Skip DC component (u=0, v=0)
      dct[u * DCT + v] = (u === 0 ? 1 / Math.sqrt(2) : 1) * (v === 0 ? 1 / Math.sqrt(2) : 1) * s;
    }
  }

  // Threshold at median (DC removed)
  const ac = Array.from(dct).slice(1);
  const sorted = [...ac].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];

  let bits = "";
  for (let i = 0; i < 64; i++) bits += (dct[i] > median ? "1" : "0");

  // Pack bits into 16 hex nibbles
  let hex = "";
  for (let i = 0; i < 64; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  }
  return hex;
}

// ─── Layout hash ─────────────────────────────────────────────────────────────

interface FieldBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export async function computeLayoutHash(fields: FieldBox[]): Promise<string> {
  // Sort by id to be order-independent
  const sorted = [...fields].sort((a, b) => a.id.localeCompare(b.id));
  const repr = sorted
    .map(f => `${f.id}:${Math.round(f.x)},${Math.round(f.y)},${Math.round(f.width)},${Math.round(f.height)}`)
    .join("|");
  return sha256Hex(repr || "empty_layout");
}

// ─── Content hash ─────────────────────────────────────────────────────────────

export async function computeContentHash(ocrText: string): Promise<string> {
  const normalized = ocrText.trim().replace(/\s+/g, " ");
  return sha256Hex(normalized || "empty_content");
}

// ─── High-level document fingerprinting ───────────────────────────────────────

export interface FingerprintInput {
  fields: FieldBox[];
  ocrTexts: string[];        // one per page
  imageData?: ImageData;     // first page thumbnail (optional)
}

export async function generateDocumentFingerprints(input: FingerprintInput): Promise<DocumentFingerprints> {
  const allText = input.ocrTexts.join("\n");
  const [layout_hash, content_hash] = await Promise.all([
    computeLayoutHash(input.fields),
    computeContentHash(allText),
  ]);
  const visual_hash = computeVisualHash(input.imageData || null);

  return {
    layout_hash,
    content_hash,
    visual_hash,
    generated_at: new Date().toISOString(),
    page_count: input.ocrTexts.length,
  };
}

/** Renders a page canvas to ImageData for visual hashing. */
export function getCanvasImageData(canvas: HTMLCanvasElement): ImageData | null {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
}

/** Hamming distance between two pHash hex strings (0 = identical). */
export function pHashDistance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity;
  let dist = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = (parseInt(a[i], 16) ^ parseInt(b[i], 16)).toString(2);
    dist += diff.split("").filter(c => c === "1").length;
  }
  return dist;
}
