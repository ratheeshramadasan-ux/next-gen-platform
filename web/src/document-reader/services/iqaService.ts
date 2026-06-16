/**
 * Image Quality Assessment (IQA) Service
 *
 * Computes per-page quality metrics from a canvas/ImageData:
 *  - dpi_score:          Effective DPI relative to a reference (estimated from pixel density)
 *  - blur_score:         0–100; Laplacian variance (higher = sharper)
 *  - noise_score:        0–100; pixel-level noise estimate (higher = cleaner)
 *  - skew_degrees:       estimated rotation angle
 *  - readiness_index:    0–100 composite score; ≥80 = "OCR-Ready"
 *
 * All computations run in-browser on a sampled canvas region to keep frame budgets low.
 */

export interface IQAReadinessScore {
  dpi_score: number;       // 0–100
  blur_score: number;      // 0–100 (100 = sharp)
  noise_score: number;     // 0–100 (100 = clean)
  skew_degrees: number;    // estimated page tilt
  readiness_index: number; // 0–100 weighted composite
  status: "excellent" | "good" | "fair" | "poor";
  warnings: string[];
  assessed_at: string;
}

// ─── Greyscale extraction ─────────────────────────────────────────────────────

function toGreyscale(data: Uint8ClampedArray, width: number, height: number): Float32Array {
  const grey = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    grey[i] =
      0.299 * data[i * 4] +
      0.587 * data[i * 4 + 1] +
      0.114 * data[i * 4 + 2];
  }
  return grey;
}

// ─── Blur Score (Laplacian variance) ─────────────────────────────────────────
// Approximates the variance of a Laplacian filter: high variance → sharp, low → blurry.

function computeBlurScore(grey: Float32Array, width: number, height: number): number {
  // Sample up to 200×200 interior crop for speed
  const sW = Math.min(width - 2, 200);
  const sH = Math.min(height - 2, 200);
  const startX = Math.floor((width - sW) / 2);
  const startY = Math.floor((height - sH) / 2);

  let sum = 0, sumSq = 0, n = 0;
  for (let y = startY; y < startY + sH; y++) {
    for (let x = startX; x < startX + sW; x++) {
      const idx = y * width + x;
      const lap =
        -grey[idx - 1] - grey[idx + 1] -
        grey[idx - width] - grey[idx + width] +
        4 * grey[idx];
      sum += lap;
      sumSq += lap * lap;
      n++;
    }
  }
  if (n === 0) return 50;
  const variance = sumSq / n - (sum / n) ** 2;
  // Empirical: variance ~1000 is typical for a sharp printed document at 200 DPI.
  // Map 0–2000 → 0–100.
  return Math.min(100, Math.round((variance / 20)));
}

// ─── Noise Score ─────────────────────────────────────────────────────────────
// Estimates high-frequency noise by comparing each pixel to its 3×3 median.
// Low noise → score close to 100.

function computeNoiseScore(grey: Float32Array, width: number, height: number): number {
  const sW = Math.min(width - 2, 150);
  const sH = Math.min(height - 2, 150);
  const startX = Math.floor((width - sW) / 2);
  const startY = Math.floor((height - sH) / 2);

  let sumDiff = 0, n = 0;
  for (let y = startY; y < startY + sH; y += 2) {
    for (let x = startX; x < startX + sW; x += 2) {
      const idx = y * width + x;
      const neighbours = [
        grey[idx - width - 1], grey[idx - width], grey[idx - width + 1],
        grey[idx - 1], grey[idx], grey[idx + 1],
        grey[idx + width - 1], grey[idx + width], grey[idx + width + 1],
      ].sort((a, b) => a - b);
      const median = neighbours[4];
      sumDiff += Math.abs(grey[idx] - median);
      n++;
    }
  }
  if (n === 0) return 100;
  // Typical clean scan: avg diff ~2–5.  Noisy scan: ~15–30.
  const avgNoise = sumDiff / n;
  return Math.max(0, Math.round(100 - avgNoise * 4));
}

// ─── DPI Score ────────────────────────────────────────────────────────────────
// We can't know the physical DPI from canvas pixels alone without metadata.
// Instead, we estimate "density adequacy" based on image pixel count relative
// to an expected minimum for A4 at 200 DPI (1654×2339 px ≈ 3.87M px).

const MIN_ADEQUATE_PIXELS = 1_500_000; // ~1.5 MP ≈ A4 @ 150 DPI
const TARGET_PIXELS = 3_870_000;       // A4 @ 200 DPI

function computeDpiScore(width: number, height: number): number {
  const pixels = width * height;
  const ratio = pixels / TARGET_PIXELS;
  if (pixels >= MIN_ADEQUATE_PIXELS) {
    return Math.min(100, Math.round(ratio * 100));
  }
  // Sub-minimum: heavily penalise
  return Math.round((pixels / MIN_ADEQUATE_PIXELS) * 50);
}

// ─── Skew Detection (simple projection profile) ───────────────────────────────
// Tries ±15° in 1° steps; finds angle with maximum column-sum variance (text lines horizontal).

function estimateSkew(grey: Float32Array, width: number, height: number): number {
  if (width < 100 || height < 100) return 0;
  // Sample 1/4 resolution for speed
  const scale = 4;
  const sw = Math.floor(width / scale);
  const sh = Math.floor(height / scale);
  const small = new Float32Array(sw * sh);
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      small[y * sw + x] = grey[y * scale * width + x * scale];
    }
  }

  const threshold = 128;
  let bestAngle = 0;
  let bestScore = -Infinity;

  for (let deg = -15; deg <= 15; deg++) {
    const rad = (deg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rowSums = new Float32Array(sh);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const cx = x - sw / 2;
        const cy = y - sh / 2;
        const rx = Math.round(cx * cos - cy * sin + sw / 2);
        const ry = Math.round(cx * sin + cy * cos + sh / 2);
        if (rx >= 0 && rx < sw && ry >= 0 && ry < sh) {
          const v = small[ry * sw + rx];
          if (v < threshold) rowSums[y]++;
        }
      }
    }
    const mean = rowSums.reduce((a, b) => a + b, 0) / sh;
    const variance = rowSums.reduce((s, v) => s + (v - mean) ** 2, 0) / sh;
    if (variance > bestScore) { bestScore = variance; bestAngle = deg; }
  }

  return bestAngle;
}

// ─── Composite readiness_index ────────────────────────────────────────────────
// Weights: DPI 30%, Blur 45%, Noise 25%

function computeReadiness(dpi: number, blur: number, noise: number): number {
  return Math.round(0.3 * dpi + 0.45 * blur + 0.25 * noise);
}

function deriveStatus(readiness: number): IQAReadinessScore["status"] {
  if (readiness >= 85) return "excellent";
  if (readiness >= 70) return "good";
  if (readiness >= 50) return "fair";
  return "poor";
}

function buildWarnings(dpi: number, blur: number, noise: number, skew: number): string[] {
  const warns: string[] = [];
  if (dpi < 60) warns.push("Image resolution too low — may reduce OCR accuracy");
  if (blur < 40) warns.push("Significant blur detected — consider re-scanning");
  if (noise < 50) warns.push("High noise level — pre-processing recommended");
  if (Math.abs(skew) >= 3) warns.push(`Page skew ${skew > 0 ? "+" : ""}${skew}° — deskew before OCR`);
  return warns;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function assessImageQuality(imageData: ImageData): IQAReadinessScore {
  const { data, width, height } = imageData;
  const grey = toGreyscale(data, width, height);

  const dpi_score = computeDpiScore(width, height);
  const blur_score = computeBlurScore(grey, width, height);
  const noise_score = computeNoiseScore(grey, width, height);
  const skew_degrees = estimateSkew(grey, width, height);
  const readiness_index = computeReadiness(dpi_score, blur_score, noise_score);
  const status = deriveStatus(readiness_index);
  const warnings = buildWarnings(dpi_score, blur_score, noise_score, skew_degrees);

  return {
    dpi_score,
    blur_score,
    noise_score,
    skew_degrees,
    readiness_index,
    status,
    warnings,
    assessed_at: new Date().toISOString(),
  };
}

/** Convenience: extract ImageData from a canvas element. */
export function getImageDataFromCanvas(canvas: HTMLCanvasElement): ImageData | null {
  try {
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return null;
  }
}

/** Convenience: draw an <img> or <canvas> into an offscreen canvas and assess. */
export function assessFromElement(el: HTMLImageElement | HTMLCanvasElement): IQAReadinessScore | null {
  const offscreen = document.createElement("canvas");
  offscreen.width = el instanceof HTMLImageElement ? el.naturalWidth : el.width;
  offscreen.height = el instanceof HTMLImageElement ? el.naturalHeight : el.height;
  if (offscreen.width === 0 || offscreen.height === 0) return null;
  const ctx = offscreen.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(el, 0, 0);
  const imgData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
  return assessImageQuality(imgData);
}

/** Returns a mock IQA score for documents without an accessible canvas (e.g. PDF-only). */
export function mockIQAScore(): IQAReadinessScore {
  return {
    dpi_score: 78,
    blur_score: 82,
    noise_score: 90,
    skew_degrees: 0,
    readiness_index: 83,
    status: "good",
    warnings: [],
    assessed_at: new Date().toISOString(),
  };
}
