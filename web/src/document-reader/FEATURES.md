# Document Intelligence Engine — Feature Reference

> **Platform**: AI Document Designer · Next Gen Platform  
> **Model Version**: v4.0.82 Stable  
> **Architecture**: 6-Phase DIE-OS (Document Intelligence Engine Operating System)  
> **Last Updated**: 2026-06-16

---

## Table of Contents

1. [Platform Architecture](#1-platform-architecture)
2. [10-Stage Training Workflow](#2-10-stage-training-workflow)
3. [Field Extraction Engine](#3-field-extraction-engine)
4. [Image Quality Assessment](#4-image-quality-assessment)
5. [Document Fingerprinting](#5-document-fingerprinting)
6. [OCR Pipeline & Engine Registry](#6-ocr-pipeline--engine-registry)
7. [Classification Engine](#7-classification-engine)
8. [Page Segregation](#8-page-segregation)
9. [Human Validation (HITL)](#9-human-validation-hitl)
10. [Continuous Learning & Model Lifecycle](#10-continuous-learning--model-lifecycle)
11. [Sample Optimization Engine](#11-sample-optimization-engine)
12. [PII Redaction Guard](#12-pii-redaction-guard)
13. [Processing Performance Telemetry](#13-processing-performance-telemetry)
14. [Cost & Financial Telemetry](#14-cost--financial-telemetry)
15. [Structured Export Studio](#15-structured-export-studio)
16. [In-App Documentation](#16-in-app-documentation)
17. [Infrastructure Registry](#17-infrastructure-registry)
18. [Audit & Governance](#18-audit--governance)
19. [Image Enhancement Pipeline](#19-image-enhancement-pipeline)
20. [Structural Element Detector](#20-structural-element-detector)

---

## 1. Platform Architecture

The platform implements the **DIE-OS (Document Intelligence Engine Operating System)** — a 6-phase processing pipeline designed to take raw documents from intake to production-ready extracted data.

### 6-Phase Pipeline

| Phase | Name | Description |
|-------|------|-------------|
| I | **Pre-Processing** | Document intake, IQA, image enhancement (shadow/staple/hole-punch), OCR routing, normalization |
| II | **Processing** | Multi-engine OCR with confidence voting, page segmentation |
| III | **Post-Processing** | AI classification, anchor-relative extraction, bilingual normalization |
| IV | **Auto-Learning** | Continuous retraining, drift analytics, sample optimization |
| V | **Validation / HITL** | Human-in-the-loop review queues, business rules, explainability |
| VI | **Secure Export & API** | Structured JSON/CSV/JSONL export, fingerprints, immutable audit |

### Key Design Principles

- **Anchor-Relative Positioning**: Fields located by their relationship to label anchors, not absolute pixel coordinates — survives document layout shifts
- **Anchor Exclusion Guard**: OCR words covered by any anchor bounding box are excluded from all field extraction, preventing garbled label text from contaminating values
- **Zero-Trust PII**: Governance rules enforced at export time; original values never leave the system unredacted
- **Deterministic Fingerprinting**: Every document produces 3 independent hashes for deduplication and tamper detection
- **Hardware Artifact Sanitization**: Staples, hole punches, and shadow gradients are digitally erased before OCR to prevent misreads and scanner damage
- **Structural Element Exclusion**: Headers, footers, and page numbers detected from OCR layer and fed back as extraction exclusion zones

---

## 2. 10-Stage Training Workflow

The **AI Document Designer** guides model builders through 10 sequential stages:

| Stage | ID | Label | Description |
|-------|----|-------|-------------|
| 1 | `infrastructure` | INFRASTRUCTURE | Enterprise Orchestration & Engine Registry |
| 2 | `document_upload` | DOCUMENT INTAKE | Multi-source ingestion, normalization, bundle detection |
| 3 | `ocr_configuration` | OCR PIPELINE | Configure distributed extraction and failover policies |
| 4 | `page_segregation` | SEGREGATION & CLASSIFICATION | Logical page grouping, bundling, and taxonomy classification |
| 5 | `extraction` | EXTRACTION DESIGNER | Design custom fields and extraction anchors |
| 6 | `validation` | HUMAN VALIDATION | Expert-in-the-loop accuracy verification and QA |
| 7 | `training_review` | TRAINING REVIEW | Model performance audit and accuracy benchmarking |
| 8 | `publish` | DEPLOYMENT PIPELINE | Deploy to production, A/B test, shadow deploy |
| 9 | `export` | SECURE EXPORT | Structured JSON/CSV/JSONL export with PII governance |

Navigation is controlled by `documentReaderContext.tsx`; stages are unlocked progressively as prior stages reach `"completed"` status.

---

## 3. Field Extraction Engine

### Files
- `validation/fieldExtraction.ts` — Core extraction logic
- `components/ExtractionStudio.tsx` — Visual canvas designer
- `validation/autoPipeline.ts` — Auto-pipeline (validation batch path)

### Anchor-Relative Positioning

Fields are located relative to anchor text labels found in each document's OCR text layer.

**Algorithm:**
1. Each anchor is located by fuzzy text matching: `labelMatchScore ≥ 0.6` (60% token overlap, length-weighted)
2. A **document-level offset** (`computeDocumentOffset`) is computed as the median shift across all located anchors vs. their trained positions
3. Each field's bounding box is shifted by its own anchor's offset (fallback to document offset)
4. OCR words with centroid inside the shifted field box are collected as candidates

**Anchor Exclusion (critical fix):**

Words whose centroid falls inside any anchor's bounding box are excluded from ALL field extraction, even if they also overlap the field box. This prevents garbled OCR label text (e.g. `"NotonaityNatonaité"`) from being included in field values.

```typescript
// wordInsideBox: centroid check + 40% overlap area
const ANCHOR_EXCLUDE_OVERLAP = 0.4;
return !anchors.some(a => wordInsideBox(w, a));
```

### Four Extraction Paths

| Path | Function | Trigger |
|------|----------|---------|
| Auto-pipeline | `fieldExtraction.ts:locateField` | Validation Studio batch run |
| Custom model canvas | `applyCustomModelToDocument()` in ExtractionStudio | Visual designer on document load |
| Re-OCR button | `extractAllFieldValues()` in ExtractionStudio | "Re-fetch OCR" button click |
| Prebuilt model | `PrebuiltModelExecutor / findValueWordsForAnchor` | Prebuilt model tab |

All paths (except prebuilt) apply anchor exclusion.

### Bilingual Value Normalization

Handles documents with bilingual field labels (e.g. Canadian passports):

```typescript
normalizeBilingualValue(rawText, fieldType)
```

- Splits on common separators (`/`, `//`, `—`, `|`)
- Scores each half on character-class heuristics (uppercase alpha → name, digits+slashes → date)
- Returns the highest-scoring half

### Confidence Scoring

Each field receives a confidence score 0–1 from:
- Mean OCR word confidence within the field box
- Anchor match quality (minimum 0.6 to qualify)
- Type-specific plausibility (date format, number format)

---

## 4. Image Quality Assessment

### File
- `services/iqaService.ts`

### Metrics

| Metric | Weight | Description |
|--------|--------|-------------|
| `dpi_score` | 30% | Pixel density relative to A4 @ 200 DPI target |
| `blur_score` | 45% | Laplacian variance of 200×200 crop (higher = sharper) |
| `noise_score` | 25% | Mean-absolute deviation from 3×3 median filter (100 = clean) |
| `skew_degrees` | — | Rotation angle via projection profile (±15° search space) |
| `readiness_index` | **composite** | `0.30×DPI + 0.45×Blur + 0.25×Noise` |

### Status Thresholds

| Status | Readiness Index |
|--------|----------------|
| `excellent` | ≥ 85 |
| `good` | 70–84 |
| `fair` | 50–69 |
| `poor` | < 50 |

### Integration

The IQA panel appears in the **Document Intake** diagnostics sidebar:
- Per-metric bar charts with colour-coded status
- Warning banners for skew ≥ 3°, blur < 40, resolution too low
- `mockIQAScore()` provides representative scores when canvas access is unavailable (PDF-only uploads)

---

## 5. Document Fingerprinting

### File
- `services/fingerprintService.ts`

### Three-Hash System

| Hash | Algorithm | Input | Purpose |
|------|-----------|-------|---------|
| `layout_hash` | SHA-256 | Sorted field IDs + positions + dimensions | Structural change detection |
| `content_hash` | SHA-256 | Normalized OCR text (whitespace-collapsed) | Content change detection |
| `visual_hash` | 64-bit pHash | 32×32 greyscale thumbnail → 8×8 DCT → median threshold | Visual similarity (Hamming distance) |

### Use Cases

- **Deduplication**: identical `content_hash` → duplicate document
- **Tamper detection**: changed `content_hash` but same `layout_hash` → field values modified without layout change
- **Version tracking**: `layout_hash` changes when field box positions are redesigned
- **Visual similarity**: `pHashDistance(a, b) ≤ 10` → visually identical pages

### Hamming Distance
```typescript
pHashDistance(hashA, hashB)  // 0 = identical, 64 = completely different
```

---

## 6. OCR Pipeline & Engine Registry

### Files
- `components/ocr/OCRConfiguration.tsx` — Configuration UI
- `services/ocrEngine.ts` — Engine abstraction
- `scripts/run-tesseract.js` — Tesseract v5 worker

### Supported Engines

| Engine | Type | Notes |
|--------|------|-------|
| `tesseract-ocr-v5` | Local | Word-level bbox, confidence per word |
| `google-vision` | Cloud API | REST via `/api/ocr/google-vision` |
| `aws-textract` | Cloud API | REST via `/api/ocr/textract` |
| `azure-form-recognizer` | Cloud API | REST via `/api/ocr/azure` |
| `mock-ocr-v1` | Mock | Development/testing only |

### Routing Policies

Routing policies define primary/fallback engine sequences with confidence thresholds and retry logic. Configured in Infrastructure → Routing Policies.

### OCR Voting Engine (DIE-OS spec)

When multiple engines process the same document:
```
Cf = Σ(Wi × Ci) / ΣWi
```
Where `Wi` = engine weight, `Ci` = per-engine confidence for token i. Implemented via weighted sequence alignment.

---

## 7. Classification Engine

### Files
- `validation/autoPipeline.ts:classifyDocumentFromOcr`
- `components/ClassificationStudio.tsx`

### Algorithm

1. Candidates = all active `DocumentClass` entries
2. For each class: match terms = class name + keywords + anchor phrases against OCR text + filename
3. Multi-word terms: `≥ 50%` of tokens must appear in document
4. Winner = highest `matched/total` ratio; ties broken by raw match count
5. Returns `undefined` if no class matches (document left Unclassified)

### Confidence
`confidence = matched_terms / total_terms` (0–1)

---

## 8. Page Segregation

### File
- `components/segregation/PageSegregation.tsx`

### Detection Layers

| Layer | Method |
|-------|--------|
| `header` | Layout analysis for page headers |
| `keyword` | Configurable keyword anchors |
| `separator` | Visual separator line detection |
| `blank` | Blank/near-blank page detection |
| `semantic` | ML-based semantic boundary detection |

---

## 9. Human Validation (HITL)

### Files
- `components/ValidationStudio.tsx`
- `validation/engine.ts`
- `validation/BatchOverview.tsx`

### Risk Score Formula

```
R_d = 0.35(1−Cc) + 0.35(1−Ce) + 0.15·Vd + 0.15·Bd
```

| Variable | Meaning |
|----------|---------|
| `Cc` | Classification confidence (0–1) |
| `Ce` | Extraction confidence — geometric mean of field confidences |
| `Vd` | Validation difficulty (estimated) |
| `Bd` | Business rule violation rate |

### Document-Level Confidence

`C_doc` = geometric mean of field confidences × classification × OCR × business-rule multiplier

### 4 Validation Queue Types

| Queue | Trigger |
|-------|---------|
| `highest_learning_value` | High disagreement or low confidence — best for training |
| `confidence_review` | Moderate confidence, human spot-check |
| `manual_escalation` | Risk score above threshold, requires expert |
| `straight_through` | High confidence, auto-approved — no human review needed |

### Field Explainability

`buildFieldExplanations()` annotates each field with:
- OCR ambiguity score (character-level confusion)
- Anchor match strength
- Value plausibility flag

### Training Dataset Governance Ledger

`TrainingLedgerEntry` records every human correction with:
- `predicted_value` vs `corrected_value`
- `predicted_confidence`
- Provenance: `source_user_id`, `approval_timestamp`, `base_model_version_used`

---

## 10. Continuous Learning & Model Lifecycle

### File
- `validation/engine.ts`

### Model Promotion Stages

```
retained_local → internal_validation → shadow_deployment → canary_staging → ab_test → production
```

### Golden Dataset Testing

`generateGoldenDatasetResult()` — tests a candidate model against 500 reference documents:
- Passes gate if `candidate.goldenSetScore ≥ baseline.goldenSetScore`
- Production v4.0.82: 95.4% golden score
- A/B v4.2.1: 96.1% golden score (15% traffic split)

### Drift Analytics

`generateDriftSeries()`, `generateVendorPerformance()`, `generateFieldDecayProfiles()`:
- Field decay profile: `history[6]` accuracy samples, status = `stable / decaying / critical`
- Vendor performance: per-engine accuracy trend with document count
- Confidence heatmap: rendered via `ConfidenceHeatmapCanvas.tsx`

---

## 11. Sample Optimization Engine

### File
- `validation/engine.ts:computeSamplesNeeded`

### Power-Law Learning Curve Model

```
accuracy ≈ 1 − k / n^α
```

| Parameter | Value | Description |
|-----------|-------|-------------|
| `α` | 0.22 | Empirical exponent for document classification |
| `k` | calibrated | From `(current_accuracy, current_samples)` |

### Solving for Target Samples

Given target accuracy T:
```
n_target = (k / (1 − T))^(1/α)
```

### Output (`SampleOptimizationResult`)

```typescript
{
  current_accuracy: number,      // 0–100
  target_accuracy: number,       // 0–100
  samples_needed: number,        // total samples required
  current_samples: number,
  samples_remaining: number,
  confidence_interval: number,   // ±CI at 95%
  estimated_days_to_target: number | null  // at 20 samples/day default
}
```

---

## 12. PII Redaction Guard

### File
- `validation/autoPipeline.ts:applyPiiRedaction`

### Built-in Detection Patterns

| Pattern Name | Regex |
|-------------|-------|
| SSN | `\d{3}-\d{2}-\d{4}` |
| Credit Card | 13–16 digit sequences |
| Email | Standard RFC 5322 pattern |
| Phone (US) | NANP format with optional country code |
| Passport No. | 1–2 letters + 6–9 digits |
| Medical Chart | `MRN: ######` |

### Handling Modes

| Mode | Output |
|------|--------|
| `redact` | `[REDACTED]` |
| `mask` | First 2 chars + `***` + last 2 chars |
| `hash` | `[HASH:xxxxxxxx]` (deterministic djb2) |

### Custom Patterns

Configured in Infrastructure → Governance → PII Patterns. Each custom pattern:
```typescript
{ id, name, pattern: string, enabled: boolean }
```
Invalid regex is silently skipped.

### Audit Output

`PiiRedactionResult` per modified field:
```typescript
{
  field_id, field_name, original_value, redacted_value,
  matched_patterns: string[], handling_mode
}
```

---

## 13. Processing Performance Telemetry

### File
- `services/telemetryService.ts`

### Tracked Pipeline Stages

`document_intake` · `iqa` · `ocr` · `classification` · `extraction` · `validation` · `training_review` · `export`

### Metrics Per Stage Entry

```typescript
{
  stage, document_id, page_count,
  start_time,    // ISO-8601
  end_time,      // null while in-flight
  duration_ms,   // null while in-flight
  cpu_pct,       // null (browser limitation)
  memory_mb,     // Chrome/Edge only via performance.memory
  status: "running" | "completed" | "failed",
  error?
}
```

### Usage

```typescript
// Automatic tracking wrapper
const result = await withTelemetry("ocr", doc.documentId, () => runOcr(doc));

// Singleton store (import everywhere)
import { telemetryStore } from '../services/telemetryService';
const summary = telemetryStore.summary();
```

Ring buffer holds the last **200** entries.

---

## 14. Cost & Financial Telemetry

### File
- `services/costTelemetry.ts`

### Pricing Table (USD per 1K tokens)

| Model | Input | Output | Cached Input |
|-------|-------|--------|-------------|
| claude-sonnet-4-6 | $0.003 | $0.015 | $0.0003 |
| claude-haiku-4-5 | $0.00025 | $0.00125 | $0.00003 |
| claude-opus-4-8 | $0.015 | $0.075 | $0.0015 |
| gpt-4o | $0.005 | $0.015 | — |
| tesseract-ocr-v5 | $0 | $0 | — |
| google-vision | $0.0015 | $0 | — |
| aws-textract | $0.0015 | $0 | — |
| azure-form-recognizer | $0.001 | $0 | — |

### Session Ledger

```typescript
import { costLedger } from '../services/costTelemetry';

costLedger.record({ provider, model, stage, document_id, prompt_tokens, completion_tokens, cached_input_tokens });
const summary = costLedger.getSummary();
// { total_cost_usd, total_tokens, by_provider, by_stage, budget_used_pct }
```

Default session budget: **$10.00 USD**.

---

## 15. Structured Export Studio

### File
- `components/ExportStudio.tsx`
- Stage: `TrainingStage.EXPORT` ("secure export")

### Export Formats

| Format | MIME | Best For |
|--------|------|---------|
| JSON | `application/json` | API consumers, nested structure |
| CSV | `text/csv` | Excel, Google Sheets, BI tools |
| JSONL | `application/json` | ML pipelines, streaming ingestion, LLM fine-tuning |

### Field Filters

| Filter | Description |
|--------|-------------|
| `all` | All fields including empty |
| `filled` | Only fields with extracted values |
| `high_confidence` | Fields above configurable confidence threshold |

### Include Options

- Document metadata (`_doc_id`, `_doc_name`, `_class`, `_class_confidence`)
- Confidence scores per field (`fieldName__confidence` column in CSV)
- Export timestamps (`_exported_at`)

### PII Redaction at Export

Toggle applies `applyPiiRedaction()` inline before serialization, using the project's `GovernanceSettings` (configured in Infrastructure).

### Document Selection

Per-document checkbox selector with expandable field preview. Supports "All / None" quick-select.

---

## 16. In-App Documentation

### File
- `components/DocumentationPanel.tsx`

### Access

Click the **BookOpen** icon in the AI Document Designer header (top-right).

### Sections

| Section | Icon Color | Articles |
|---------|-----------|---------|
| Platform Overview | Primary | DIE-OS architecture, 10-stage workflow |
| Field Extraction Engine | Violet | Anchor-relative positioning, bilingual normalization, confidence scoring |
| Image Quality Assessment | Cyan | IQA metrics, readiness index formula |
| Document Fingerprints | Emerald | SHA-256 + pHash 3-hash system |
| PII Redaction Guard | Amber | Zero-trust enforcement, custom patterns, handling modes |
| Performance & Cost Telemetry | Rose | Stage tracking, pricing table, budget |
| Sample Optimization Engine | Indigo | Power-law learning curve, solving for n_target |
| Structured Export | Teal | Format guide (JSON/CSV/JSONL) |
| Model Lifecycle | Orange | 6 promotion stages, golden dataset gate |

### Features

- Full-text **search** across all articles and tags
- Collapsible **table of contents** per section
- Inline **code rendering** (`monospace` with primary color)
- **Bold** and inline emphasis

---

## 17. Infrastructure Registry

### File
- `components/WorkflowStages.tsx:InfrastructureRegistry`

### Configurable Components

| Component | Purpose |
|-----------|---------|
| OCR Engines | Primary + fallback engines, confidence thresholds |
| Offline Models | On-premise model files with capability flags |
| Runtime Profiles | Resource allocation (CPU/GPU/memory limits) |
| Routing Policies | Engine selection logic with retry and failover |
| GPU Inventory | GPU status, VRAM, utilization |
| Benchmarks | Engine performance test results |
| Governance | PII entities, handling mode, retention policy, audit level |

### Ingestion Sources

Supported: `UPLOAD` · `EMAIL` · `S3` · `AZURE` · `SFTP` · `API` · `SHARED_FOLDER` · `SCANNER`

Each source has: `configuration`, `status`, `retryCount`, `enabled` flag, and health monitoring.

---

## 18. Audit & Governance

### Files
- `types.ts:GovernanceSettings`, `AuditLog`
- `validation/ledger.ts`

### Governance Settings

```typescript
{
  piiEntities: string[],           // entity types to detect
  handlingMode: "redact"|"mask"|"hash",
  customPatterns: PiiPattern[],
  retentionDays: number,
  dataResidency: string,
  auditLevel: "standard"|"enhanced"|"forensic",
  isImmutableLogEnabled: boolean,
  enabledLanguages: string[]
}
```

### Audit Log Entry

```typescript
{
  id, action, target, status, engine, compliance,
  timestamp, date, actor, rawTimestamp
}
```

### Training Ledger

`TrainingLedgerEntry` provides a cryptographically-traceable record of every human correction used for model training, including base model version, approver ID, and origin batch ID.

---

## Technical Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router), React 18 |
| State | Zustand (`studioStore`), React Context (`documentReaderContext`) |
| OCR | Tesseract.js v5 (local), Google Vision / AWS Textract / Azure (cloud) |
| Hashing | Web Crypto API (SHA-256), custom djb2 fallback |
| Fingerprinting | Browser canvas + DCT-based pHash |
| Image Enhancement | Canvas `getImageData` + separable Gaussian blur + inpainting |
| Export | Blob API + URL.createObjectURL |
| Animation | Framer Motion |
| Icons | Lucide React |
| Styling | Tailwind CSS v4 with CSS variables |
| Storage | localStorage (model persistence), sessionStorage (telemetry ring buffer) |

---

## 19. Image Enhancement Pipeline

**File**: `services/imageEnhancementService.ts`

The Image Enhancement Pipeline runs as part of Phase I Pre-Processing, correcting physical document artifacts before OCR to maximise text recognition accuracy.

### 19.1 Shadow Removal — Adaptive Background Illumination Estimation

**Algorithm:**
1. Convert page pixels to greyscale: `g = 0.299R + 0.587G + 0.114B`
2. Apply large-kernel (σ=40) separable Gaussian blur → illumination background map `B(x,y)`
3. Normalised pixel: `clamp(pixel / B × 220, 0, 255)`

This preserves text strokes (high-frequency) while eliminating low-frequency illumination variation from scanner lid shadows, hand shadows, and surface creases.

**Metric**: Shadow Uniformity (0–100) = `100 − stddev(grey) × 1.25`. Score jump from e.g. 58% → 89% indicates successful normalisation.

**TypeScript interface:**
```typescript
interface EnhancementReport {
  applied: string[];
  artifacts: ArtifactDetection[];
  metrics: {
    shadow_uniformity_before: number;  // 0–100
    shadow_uniformity_after: number;
    artifacts_removed: number;
  };
  processing_ms: number;
}
```

### 19.2 Staple Detection — Corner ROI + Gradient Heuristic

Staples appear in extreme corners (typically top-left or top-right). Detection is restricted to **4 corner ROIs** (each ~16% page width × 8% page height) to avoid false positives in document body.

**Detection criteria:**
- Row has horizontal gradient magnitude > 30 (metallic edge contrast)
- ≥35% of ROI-width pixels in that row are below intensity 80 (dark metallic strip)
- 2–12 consecutive qualifying rows → staple bounding box

**Confidence formula**: `min(0.97, run_height/6 + row_gradient/120)`

### 19.3 Digital Staple Erasure — Inverse Distance Weighted Inpainting

For each pixel `(px, py)` inside the staple bounding box:

```
weight(sample) = 1 / distance²(px, py → sample)
output_pixel   = Σ(weight × sample_RGB) / Σ(weight)
```

Samples are drawn from a ±6px boundary ring outside the bounding box. This smoothly patches background texture, approximating the Fast Marching Method (FMM) used in full CV stacks.

### 19.4 Hole Punch Detection & Removal

**Zone**: Left margin (x = 0 to 6% of width) and right margin (x = 94% to 100%).

**Detection**: Vertical scan for consecutive dark rows (≥40% pixels < intensity 80) with blob height in range 16–80px.

**Removal**: Same inverse-distance inpainting as staple erasure.

### 19.5 ArtifactDetection Type

```typescript
interface ArtifactDetection {
  type: "staple" | "hole_punch" | "shadow_region" | "crease";
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;   // 0–1
  corner?: "top-left" | "top-right" | "bottom-left" | "bottom-right" | "margin-left" | "margin-right";
  severity: "low" | "medium" | "high";
}
```

### 19.6 Public API

```typescript
// Full pipeline on a canvas element (mutates in-place)
runEnhancementPipeline(canvas: HTMLCanvasElement, opts?: EnhancementOptions): EnhancementResult

// From an HTMLImageElement
enhanceFromImage(img: HTMLImageElement, opts?: EnhancementOptions): EnhancementResult

// Mock result for PDF-only / SSR contexts
mockEnhancementResult(): EnhancementReport
```

---

## 20. Structural Element Detector

**File**: `services/structuralElementDetector.ts`

Analyses the OCR text layer to identify persistent structural regions (headers, footers, page numbers, running titles) that must be excluded from field extraction.

### 20.1 Zone Definitions

| Zone | Y-Position | Purpose |
|------|-----------|---------|
| Header | Top 8% of page height | Organisation/document name |
| Footer | Bottom 8% of page height | Legal notices, continuation notes |
| Page Number | Within footer zone | Isolated digit cluster |

### 20.2 Detection Algorithm

**Header & Footer:**
1. Filter OCR words to zone by Y-coordinate midpoint
2. Cluster words into text lines (within 0.8× line-height Y tolerance)
3. Lines with ≥3 words and >15 chars → `running_title`; shorter lines → `header` / `footer`

**Page Number patterns matched:**
```
/^\d{1,4}$/          → bare number: "2", "12"
/^page\s+\d+$/i      → "Page 3"
/^\d+\s*\/\s*\d+$/   → "3/12"
/^-\s*\d+\s*-$/      → "- 3 -"
/^\[\s*\d+\s*\]$/    → "[3]"
```

### 20.3 Multi-Page Cross-Correlation

When `analyseDocumentStructure()` processes multiple pages, text elements appearing on ≥50% of pages receive a **+25% confidence boost** — confirming them as persistent structural elements rather than coincidental data fields.

### 20.4 Output — Exclusion Zones

```typescript
interface StructuralAnalysis {
  headers: StructuralElement[];
  footers: StructuralElement[];
  page_numbers: StructuralElement[];
  running_titles: StructuralElement[];
  all_exclusion_zones: StructuralElement[];  // Feed into Anchor Exclusion Guard
  header_height_px: number;
  footer_height_px: number;
}
```

`all_exclusion_zones` feeds back into the **Anchor Exclusion Guard** (`autoPipeline.ts`) — bounding boxes added to the exclusion list so the extraction engine never picks up header/footer text as field values.

### 20.5 Public API

```typescript
// Single page analysis
analysePageStructure(words: OCRWord[], pageWidth: number, pageHeight: number): StructuralAnalysis

// Multi-page with cross-correlation confidence boosting
analyseDocumentStructure(pageWordSets: Array<{ words: OCRWord[]; pageWidth: number; pageHeight: number }>): StructuralAnalysis[]

// Mock data for development / SSR
mockStructuralAnalysis(): StructuralAnalysis
```
