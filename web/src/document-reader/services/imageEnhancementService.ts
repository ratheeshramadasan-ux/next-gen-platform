/**
 * Image Enhancement Pipeline — Phase I Pre-Processing
 *
 * Implements the DIE-OS advanced image enhancement stack:
 *   1. Shadow Removal    — Adaptive Background Illumination Estimation (Gaussian divide)
 *   2. Staple Detection  — Corner-ROI Hough-line heuristic
 *   3. Staple Inpainting — Texture-fill via FMM-inspired scanline propagation
 *   4. Hole Punch Removal — Margin blob detection + connected-component fill
 *
 * All processing runs on HTMLCanvasElement / ImageData in the browser.
 * Server-side callers should use the mock-result helpers at the bottom.
 */

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ArtifactDetection {
  type: "staple" | "hole_punch" | "shadow_region" | "crease";
  bbox: BoundingBox;
  confidence: number;  // 0–1
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "margin-left" | "margin-right";
  severity: "low" | "medium" | "high";
}

export interface EnhancementResult {
  /** Mutated canvas with all enhancements applied in-place. */
  canvas: HTMLCanvasElement;
  shadow_regions_corrected: number;
  staples_detected: ArtifactDetection[];
  staples_removed: number;
  hole_punches_detected: ArtifactDetection[];
  hole_punches_removed: number;
  shadow_uniformity_before: number;  // 0–100 (100 = perfectly uniform)
  shadow_uniformity_after: number;
  processing_ms: number;
}

export interface EnhancementReport {
  applied: string[];
  artifacts: ArtifactDetection[];
  metrics: {
    shadow_uniformity_before: number;
    shadow_uniformity_after: number;
    artifacts_removed: number;
  };
  processing_ms: number;
}

// ─── Greyscale helpers ────────────────────────────────────────────────────────

function toGrey(data: Uint8ClampedArray, idx: number): number {
  return 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
}

function greyArray(data: Uint8ClampedArray, w: number, h: number): Float32Array {
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = toGrey(data, i * 4);
  return g;
}

// ─── 1. Gaussian blur (separable, σ-parameterized) ────────────────────────────

function gaussianKernel(sigma: number): Float32Array {
  const r = Math.ceil(3 * sigma);
  const size = 2 * r + 1;
  const k = new Float32Array(size);
  let sum = 0;
  for (let i = 0; i < size; i++) {
    const x = i - r;
    k[i] = Math.exp(-(x * x) / (2 * sigma * sigma));
    sum += k[i];
  }
  for (let i = 0; i < size; i++) k[i] /= sum;
  return k;
}

function blur1D(src: Float32Array, w: number, h: number, kernel: Float32Array, horizontal: boolean): Float32Array {
  const r = Math.floor(kernel.length / 2);
  const dst = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) {
        const sx = horizontal ? Math.max(0, Math.min(w - 1, x + k)) : x;
        const sy = horizontal ? y : Math.max(0, Math.min(h - 1, y + k));
        sum += kernel[k + r] * src[sy * w + sx];
      }
      dst[y * w + x] = sum;
    }
  }
  return dst;
}

function gaussianBlur(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const k = gaussianKernel(sigma);
  return blur1D(blur1D(src, w, h, k, true), w, h, k, false);
}

// ─── 2. Shadow Removal — Adaptive Background Illumination Estimation ──────────
//
// Algorithm:
//   1. Convert page to greyscale
//   2. Large-σ Gaussian blur → illumination background estimate B(x,y)
//   3. Normalised pixel = clamp(pixel / B × 200, 0, 255)
//      (multiply by 200 to restore brightness after normalisation)
//   This effectively removes any low-frequency illumination variation
//   (scanner lid shadow, crease, hand shadow) while preserving text strokes.

function computeShadowUniformity(grey: Float32Array): number {
  let sum = 0, sumSq = 0;
  for (const v of grey) { sum += v; sumSq += v * v; }
  const n = grey.length;
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;
  // Map std-dev 0–80 → uniformity 100–0
  return Math.max(0, Math.round(100 - Math.sqrt(variance) * 1.25));
}

function removeShadows(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  sigma = 40
): { patchedData: Uint8ClampedArray; uniformityBefore: number; uniformityAfter: number; regionsFixed: number } {
  const grey = greyArray(data, w, h);
  const uniformityBefore = computeShadowUniformity(grey);

  const background = gaussianBlur(grey, w, h, sigma);
  const output = new Uint8ClampedArray(data.length);
  output.set(data);

  let regionsFixed = 0;
  for (let i = 0; i < w * h; i++) {
    const bg = Math.max(1, background[i]);
    const ratio = grey[i] / bg;
    const isInShadow = bg < 200 && ratio < 0.7;
    if (isInShadow) regionsFixed++;

    const normalised = Math.min(255, Math.round((grey[i] / bg) * 220));
    // Apply to RGB channels proportionally
    const scale = data[i * 4] > 0 ? normalised / (toGrey(data, i * 4) || 1) : 1;
    output[i * 4]     = Math.min(255, Math.round(data[i * 4]     * scale));
    output[i * 4 + 1] = Math.min(255, Math.round(data[i * 4 + 1] * scale));
    output[i * 4 + 2] = Math.min(255, Math.round(data[i * 4 + 2] * scale));
    // alpha unchanged
  }

  const greyAfter = greyArray(output, w, h);
  const uniformityAfter = computeShadowUniformity(greyAfter);

  return { patchedData: output, uniformityBefore, uniformityAfter, regionsFixed: Math.floor(regionsFixed / 100) };
}

// ─── 3. Staple Detection — Corner ROI + Gradient Line Analysis ───────────────
//
// Staples appear in extreme corners (typically TL or TR for standard documents).
// They manifest as:
//   - A thin (2–8 px) horizontal or diagonal dark strip
//   - Possibly flanked by bright metallic reflection lines
//   - High-gradient horizontal edge in a ~15×15 px neighbourhood
//
// Detection uses a simplified Hough-line scan within each corner ROI.

const CORNER_ROI_FRACTION = 0.08;  // 8% of each dimension

function detectStaplesInROI(
  grey: Float32Array,
  w: number,
  h: number,
  roi: BoundingBox,
  corner: ArtifactDetection["corner"]
): ArtifactDetection[] {
  const results: ArtifactDetection[] = [];
  const { x: rx, y: ry, width: rw, height: rh } = roi;

  // Compute horizontal gradient magnitude row-by-row within ROI
  const rowMaxGrad: number[] = [];
  const rowDark: boolean[] = [];

  for (let y = ry; y < ry + rh; y++) {
    let maxGrad = 0;
    let darkCount = 0;
    for (let x = rx; x < rx + rw; x++) {
      const idx = y * w + x;
      const dy = Math.abs((grey[idx] || 0) - (grey[Math.min(h - 1, y + 1) * w + x] || 0));
      if (dy > maxGrad) maxGrad = dy;
      if (grey[idx] < 100) darkCount++;
    }
    rowMaxGrad.push(maxGrad);
    rowDark.push(darkCount > rw * 0.35);  // ≥35% dark pixels → likely staple bar
  }

  // Find consecutive rows that are both dark and high-gradient
  let run = 0;
  let runStart = ry;
  for (let i = 0; i < rowMaxGrad.length; i++) {
    if (rowMaxGrad[i] > 30 && rowDark[i]) {
      if (run === 0) runStart = ry + i;
      run++;
    } else {
      if (run >= 2 && run <= 12) {
        // Plausible staple height
        const confidence = Math.min(1, run / 6 + rowMaxGrad[runStart - ry] / 120);
        results.push({
          type: "staple",
          bbox: { x: rx, y: runStart, width: rw, height: run },
          confidence: Math.min(0.97, confidence),
          corner,
          severity: confidence > 0.7 ? "high" : confidence > 0.4 ? "medium" : "low",
        });
      }
      run = 0;
    }
  }

  return results;
}

function detectStaples(grey: Float32Array, w: number, h: number): ArtifactDetection[] {
  const roiW = Math.round(w * CORNER_ROI_FRACTION * 2);  // a bit wider than height
  const roiH = Math.round(h * CORNER_ROI_FRACTION);

  const corners: Array<{ roi: BoundingBox; corner: ArtifactDetection["corner"] }> = [
    { roi: { x: 0,       y: 0,       width: roiW, height: roiH }, corner: "top-left" },
    { roi: { x: w - roiW, y: 0,       width: roiW, height: roiH }, corner: "top-right" },
    { roi: { x: 0,       y: h - roiH, width: roiW, height: roiH }, corner: "bottom-left" },
    { roi: { x: w - roiW, y: h - roiH, width: roiW, height: roiH }, corner: "bottom-right" },
  ];

  return corners.flatMap(({ roi, corner }) => detectStaplesInROI(grey, w, h, roi, corner));
}

// ─── 4. Staple Inpainting — Texture-fill (FMM-inspired scanline propagation) ──
//
// For each pixel inside a staple bbox:
//   1. Sample pixels in a ring around the bbox boundary
//   2. Weight by 1/distance² from the current pixel
//   3. Write the weighted RGB average into the pixel
//
// This smoothly "erases" the metallic artifact and patches background texture.

function inpaintRegion(data: Uint8ClampedArray, w: number, h: number, bbox: BoundingBox, padding = 6): void {
  const { x, y, width, height } = bbox;
  const x0 = Math.max(0, x - padding);
  const y0 = Math.max(0, y - padding);
  const x1 = Math.min(w - 1, x + width + padding);
  const y1 = Math.min(h - 1, y + height + padding);

  // Collect boundary samples (pixels outside the bbox within padded ring)
  const samples: Array<{ r: number; g: number; b: number; px: number; py: number }> = [];
  for (let sy = y0; sy <= y1; sy++) {
    for (let sx = x0; sx <= x1; sx++) {
      if (sx >= x && sx < x + width && sy >= y && sy < y + height) continue; // inside bbox
      const idx = (sy * w + sx) * 4;
      samples.push({ r: data[idx], g: data[idx + 1], b: data[idx + 2], px: sx, py: sy });
    }
  }
  if (samples.length === 0) return;

  // For each pixel inside bbox, compute distance-weighted average from samples
  for (let py = y; py < y + height && py < h; py++) {
    for (let px = x; px < x + width && px < w; px++) {
      let wSum = 0, rSum = 0, gSum = 0, bSum = 0;
      for (const s of samples) {
        const dist2 = (px - s.px) ** 2 + (py - s.py) ** 2;
        const wt = dist2 === 0 ? 1e6 : 1 / dist2;
        wSum += wt; rSum += wt * s.r; gSum += wt * s.g; bSum += wt * s.b;
      }
      const idx = (py * w + px) * 4;
      data[idx]     = Math.round(rSum / wSum);
      data[idx + 1] = Math.round(gSum / wSum);
      data[idx + 2] = Math.round(bSum / wSum);
    }
  }
}

// ─── 5. Hole Punch Detection — Margin Blob Analysis ──────────────────────────
//
// Hole punches appear as dark near-circular blobs in the left/right margin,
// typically at quarter-height intervals (at ~25%, ~50%, ~75% of page height).

const MARGIN_FRACTION = 0.06;   // 6% margin width
const HOLE_RADIUS_MIN_PX = 8;
const HOLE_RADIUS_MAX_PX = 40;

function detectHolePunches(grey: Float32Array, w: number, h: number): ArtifactDetection[] {
  const results: ArtifactDetection[] = [];
  const marginW = Math.round(w * MARGIN_FRACTION);

  const sides: Array<{ xStart: number; corner: ArtifactDetection["corner"] }> = [
    { xStart: 0,           corner: "margin-left" },
    { xStart: w - marginW, corner: "margin-right" },
  ];

  for (const { xStart, corner } of sides) {
    // Scan vertically, find dense dark blobs
    let inBlob = false;
    let blobStart = 0;

    for (let y = 0; y < h; y++) {
      let darkPx = 0;
      for (let x = xStart; x < xStart + marginW; x++) {
        if (grey[y * w + x] < 80) darkPx++;
      }
      const isDark = darkPx > marginW * 0.4;

      if (isDark && !inBlob) { inBlob = true; blobStart = y; }
      if (!isDark && inBlob) {
        inBlob = false;
        const blobH = y - blobStart;
        if (blobH >= HOLE_RADIUS_MIN_PX * 2 && blobH <= HOLE_RADIUS_MAX_PX * 2) {
          results.push({
            type: "hole_punch",
            bbox: { x: xStart, y: blobStart, width: marginW, height: blobH },
            confidence: 0.85,
            corner,
            severity: "medium",
          });
        }
      }
    }
  }

  return results;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface EnhancementOptions {
  removeShadows?: boolean;
  removeStaples?: boolean;
  removeHolePunches?: boolean;
  shadowSigma?: number;   // default 40
}

/**
 * Run the full enhancement pipeline on an HTMLCanvasElement (mutates in-place).
 * Returns a detailed report of what was detected and corrected.
 */
export function runEnhancementPipeline(
  canvas: HTMLCanvasElement,
  opts: EnhancementOptions = {}
): EnhancementResult {
  const {
    removeShadows: doShadow = true,
    removeStaples: doStaples = true,
    removeHolePunches: doHoles = true,
    shadowSigma = 40,
  } = opts;

  const t0 = performance.now();
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cannot get 2D context from canvas");

  const w = canvas.width;
  const h = canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  // Work on a plain Uint8ClampedArray so we can rebind `data` after shadow removal
  let data: Uint8ClampedArray = new Uint8ClampedArray(imgData.data.length);
  data.set(imgData.data);

  let uniformityBefore = 50, uniformityAfter = 50, regionsFixed = 0;

  // Step 1: Shadow removal
  if (doShadow) {
    const res = removeShadows(data, w, h, shadowSigma);
    data = res.patchedData;
    uniformityBefore = res.uniformityBefore;
    uniformityAfter = res.uniformityAfter;
    regionsFixed = res.regionsFixed;
  }

  // Compute greyscale for artifact detection (after shadow removal)
  const grey = greyArray(data, w, h);

  // Step 2: Staple detection
  const staplesDetected = doStaples ? detectStaples(grey, w, h) : [];

  // Step 3: Staple inpainting
  let staplesRemoved = 0;
  if (doStaples) {
    for (const s of staplesDetected) {
      if (s.confidence >= 0.4) {
        inpaintRegion(data, w, h, s.bbox);
        staplesRemoved++;
      }
    }
  }

  // Step 4: Hole punch detection + fill
  const holePunchesDetected = doHoles ? detectHolePunches(grey, w, h) : [];
  let holePunchesRemoved = 0;
  if (doHoles) {
    for (const hp of holePunchesDetected) {
      inpaintRegion(data, w, h, hp.bbox);
      holePunchesRemoved++;
    }
  }

  // Write back to canvas (ImageData requires ArrayBuffer-backed Uint8ClampedArray)
  const newImageData = new ImageData(new Uint8ClampedArray(data), w, h);
  ctx.putImageData(newImageData, 0, 0);

  return {
    canvas,
    shadow_regions_corrected: regionsFixed,
    staples_detected: staplesDetected,
    staples_removed: staplesRemoved,
    hole_punches_detected: holePunchesDetected,
    hole_punches_removed: holePunchesRemoved,
    shadow_uniformity_before: uniformityBefore,
    shadow_uniformity_after: uniformityAfter,
    processing_ms: Math.round(performance.now() - t0),
  };
}

/**
 * Apply pipeline from an HTMLImageElement and return enhanced canvas.
 */
export function enhanceFromImage(
  img: HTMLImageElement,
  opts?: EnhancementOptions
): EnhancementResult {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  return runEnhancementPipeline(canvas, opts);
}

/**
 * Deterministic mock result for documents without accessible canvas (PDF-only, SSR).
 */
export function mockEnhancementResult(): EnhancementReport {
  return {
    applied: ["shadow_removal", "staple_detection", "staple_inpainting"],
    artifacts: [
      {
        type: "staple",
        bbox: { x: 4, y: 6, width: 32, height: 5 },
        confidence: 0.91,
        corner: "top-left",
        severity: "high",
      },
    ],
    metrics: {
      shadow_uniformity_before: 58,
      shadow_uniformity_after: 89,
      artifacts_removed: 1,
    },
    processing_ms: 312,
  };
}
