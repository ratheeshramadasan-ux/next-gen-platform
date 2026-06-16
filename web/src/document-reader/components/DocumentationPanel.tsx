"use client";

import React, { useState } from "react";
import {
  X, BookOpen, ChevronRight, ChevronDown, Search, Sparkles, Cpu,
  Shield, Download, BarChart3, Fingerprint, Activity, Brain,
  Zap, ScanLine, FileSearch, FlaskConical, GitBranch, Layers,
  CheckCircle2, Clock, AlertCircle, BrainCircuit, Rocket, FileText,
  Globe, Network, ClipboardCheck, ShieldCheck, Server
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Content structure ────────────────────────────────────────────────────────

interface DocSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  articles: Array<{
    title: string;
    content: string;
    tags?: string[];
  }>;
}

const DOC_SECTIONS: DocSection[] = [
  {
    id: "overview",
    title: "Platform Overview",
    icon: <Layers size={14} />,
    color: "text-primary",
    articles: [
      {
        title: "Document Intelligence Engine OS",
        tags: ["architecture", "6-phase"],
        content: `The platform implements a 6-phase Document Intelligence Engine Operating System (DIE-OS):

**Phase I — Pre-Processing**
Document intake, Image Quality Assessment (IQA), OCR engine routing, and document normalization. Supports PDF, TIFF, PNG, JPG/JPEG, BMP inputs.

**Phase II — Processing**
Multi-engine OCR with confidence voting, page segregation, and layout analysis. OCR Voting Engine formula: Cf = Σ(Wi × Ci) / ΣWi across multiple providers.

**Phase III — Post-Processing**
AI classification, anchor-relative field extraction, bilingual value normalization, and PII redaction enforcement.

**Phase IV — Auto-Learning**
Continuous model retraining, Sample Optimization Engine, drift analytics, and golden dataset testing.

**Phase V — Validation / HITL**
Human-in-the-Loop review queues (HLV, Confidence Review, Manual Escalation, STP), business rules engine, and field explainability.

**Phase VI — Secure Export & API**
Structured JSON/CSV/JSONL export, cryptographic document fingerprints, immutable audit ledger, and zero-trust PII enforcement.`,
      },
      {
        title: "10-Stage Training Workflow",
        tags: ["workflow", "stages"],
        content: `The AI Document Designer guides users through 10 stages:

1. **Infrastructure Registry** — Configure OCR engines, offline models, GPU inventory, routing policies, and governance settings.
2. **Document Upload** — Ingest from upload, email, S3, Azure Blob, SFTP, scanner, or API. Supports batch processing.
3. **OCR Configuration** — Select primary/fallback engines, configure confidence thresholds, benchmark engines.
4. **Page Segregation** — Split multi-page documents using header detection, keyword anchors, blank-page detection, and semantic separators.
5. **Document Classification** — AI-powered classification by keyword matching and anchor phrase fuzzy matching.
6. **Document Type Resolution** — Resolve ambiguous classifications between similar document classes.
7. **Field Extraction** — Visual canvas-based field/anchor design. Supports anchor-relative positioning, bilingual labels, and confidence scoring.
8. **Validation** — HITL review with risk scoring, field explainability, and training inclusion decisions.
9. **Training Review** — Manage training datasets, review confidence trends, and validate golden datasets.
10. **Publish** — Deploy trained models to production, A/B test, shadow deploy, and monitor drift.`,
      },
    ],
  },
  {
    id: "extraction",
    title: "Field Extraction Engine",
    icon: <FileSearch size={14} />,
    color: "text-violet-500",
    articles: [
      {
        title: "Anchor-Relative Positioning",
        tags: ["anchors", "extraction", "key"],
        content: `Fields are located using anchor-relative positioning rather than absolute coordinates:

**How it works:**
1. Anchors (label text like "SURNAME", "Date of Birth") are located in each document's OCR text layer using fuzzy text matching (≥60% token overlap).
2. A document-level offset is computed as the median shift of all anchor positions vs. their trained positions.
3. Each field's bounding box is shifted by its anchor's offset (or the document offset if its anchor isn't found).
4. OCR words whose centroid falls within the field box are collected as candidate values.

**Anchor Exclusion (key innovation):**
Words whose centroid falls inside any anchor's bounding box are excluded from ALL field extraction, even if they also fall inside a field's box. This prevents garbled label text (e.g. "NotonaityNatonaité") from contaminating field values.

**Three extraction paths:**
- \`fieldExtraction.ts:locateField\` — used by the Validation Studio auto-pipeline
- \`applyCustomModelToDocument\` in ExtractionStudio — used by the visual designer canvas
- \`extractAllFieldValues\` in ExtractionStudio — used by the "Re-OCR" button`,
      },
      {
        title: "Bilingual Value Normalization",
        tags: ["bilingual", "normalization"],
        content: `Documents with bilingual field labels (e.g. Canadian passports: English/French) are handled by \`normalizeBilingualValue()\`:

- Splits candidate OCR text on common bilingual separators (/, //, —, |)
- Scores each half using character-class heuristics (uppercase alpha = names, digits + slashes = dates)
- Returns the half with the highest score, eliminating the French label from English field values

**Example:** "RATHEESH / RAMADASAN" → "RATHEESH" for a Given Names field.`,
      },
      {
        title: "Confidence Scoring",
        tags: ["confidence", "scoring"],
        content: `Each extracted field receives a confidence score (0–1) computed from:

- **OCR word confidence**: average confidence of all OCR words in the field box
- **Anchor match quality**: how well the locating anchor matched (0.6 minimum threshold)
- **Value plausibility**: type-specific validation (dates, numbers, addresses)

**Document-level confidence** (C_doc) uses a geometric mean of field confidences, weighted by field importance, combined with classification confidence and OCR engine confidence.

**Risk Score** (R_d) formula:
\`R_d = 0.35(1-Cc) + 0.35(1-Ce) + 0.15·Vd + 0.15·Bd\`
where Cc = classification confidence, Ce = extraction confidence, Vd = validation difficulty, Bd = business rule violation rate.`,
      },
    ],
  },
  {
    id: "iqa",
    title: "Image Quality Assessment",
    icon: <ScanLine size={14} />,
    color: "text-cyan-500",
    articles: [
      {
        title: "IQA Metrics Explained",
        tags: ["IQA", "quality", "blur"],
        content: `The IQA Service computes 4 quality metrics from a page canvas:

**DPI Score (0–100, weight 30%):**
Estimated from pixel count relative to A4 at 200 DPI (≈3.87M pixels = score 100). Sub-150 DPI images are heavily penalised.

**Blur Score (0–100, weight 45%):**
Variance of an approximated Laplacian filter on a 200×200 interior crop. Higher variance = sharper image.
- ≥80: Sharp
- 40–79: Acceptable
- <40: Reprocess recommended

**Noise Score (0–100, weight 25%):**
Mean absolute difference between each pixel and its 3×3 median. Lower noise → higher score.

**Readiness Index:**
\`RI = 0.30 × DPI + 0.45 × Blur + 0.25 × Noise\`
- Excellent: ≥85
- Good: 70–84
- Fair: 50–69
- Poor: <50

**Skew Detection:**
Projection profile method, tested at ±15° in 1° steps. Skew ≥3° triggers a warning.`,
      },
    ],
  },
  {
    id: "fingerprints",
    title: "Document Fingerprints",
    icon: <Fingerprint size={14} />,
    color: "text-emerald-500",
    articles: [
      {
        title: "3-Hash Fingerprint System",
        tags: ["fingerprints", "SHA-256", "pHash"],
        content: `Each document receives 3 independent fingerprints for deduplication and tamper detection:

**layout_hash** (SHA-256):
Computed from sorted field IDs, positions (x, y), and dimensions (width, height). Detects structural changes without reading content.

**content_hash** (SHA-256):
SHA-256 of normalized OCR text (whitespace-collapsed). Detects any text change.

**visual_hash** (64-bit pHash):
Perceptual hash of the page image thumbnail using 8×8 DCT analysis. Two pages with visual_hash Hamming distance ≤10 are visually similar.

**Use cases:**
- Deduplication: identical content_hash = duplicate document
- Tamper detection: changed content_hash but same layout_hash = field value modification
- Version tracking: layout_hash changes when field boxes are redesigned`,
      },
    ],
  },
  {
    id: "pii",
    title: "PII Redaction Guard",
    icon: <Shield size={14} />,
    color: "text-amber-500",
    articles: [
      {
        title: "Zero-Trust PII Enforcement",
        tags: ["PII", "redaction", "governance"],
        content: `The PII Redaction Guard applies configured governance rules to all extracted field values before export.

**Built-in patterns detected:**
- SSN (###-##-####)
- Credit Card numbers (13–16 digits)
- Email addresses
- US Phone numbers
- Passport numbers (1–2 letters + 6–9 digits)
- Medical Chart numbers (MRN: ######)

**Handling modes (configured in Infrastructure → Governance):**
- **Redact**: Replace with \`[REDACTED]\`
- **Mask**: Show first/last 2 chars, replace middle with \`***\`
- **Hash**: Replace with \`[HASH:xxxxxxxx]\` (deterministic djb2 — not cryptographic)

**Custom patterns:**
Add regex patterns in Infrastructure → Governance → PII Patterns. Pattern errors are silently skipped.

**Audit:**
Every redacted field is logged with: field_id, field_name, original_value, redacted_value, matched_patterns, handling_mode. The audit log is available in the Export Studio.`,
      },
    ],
  },
  {
    id: "telemetry",
    title: "Performance & Cost Telemetry",
    icon: <Activity size={14} />,
    color: "text-rose-500",
    articles: [
      {
        title: "Processing Performance Telemetry",
        tags: ["telemetry", "performance"],
        content: `The Telemetry Service tracks every pipeline stage with millisecond precision:

**Tracked metrics per stage:**
- start_time / end_time (ISO-8601)
- duration_ms
- memory_mb (Chrome/Edge only via performance.memory)
- status: running / completed / failed
- error message (on failure)

**Stages tracked:** document_intake, iqa, ocr, classification, extraction, validation, training_review, export

**Usage:** Wrap any async operation with \`withTelemetry(stage, doc_id, fn)\` for automatic tracking. The in-memory ring buffer holds the last 200 events.`,
      },
      {
        title: "Cost & Financial Telemetry",
        tags: ["cost", "tokens", "budget"],
        content: `The Cost Telemetry Ledger tracks AI API usage costs in real time:

**Tracked per API call:**
- provider, model, stage, document_id
- prompt_tokens, completion_tokens, cached_input_tokens
- cost_usd (computed from pricing table)

**Pricing table includes:**
- claude-sonnet-4-6: $0.003/1K input, $0.015/1K output, $0.0003/1K cached
- claude-haiku-4-5: $0.00025/1K input, $0.00125/1K output
- tesseract-ocr-v5: $0 (local)
- google-vision, aws-textract, azure-form-recognizer

**Session budget:** Default $10 USD. Budget utilization % shown in dashboard.

**Aggregation:** Summary available by provider, by stage, and total session cost.`,
      },
    ],
  },
  {
    id: "sample-opt",
    title: "Sample Optimization Engine",
    icon: <FlaskConical size={14} />,
    color: "text-indigo-500",
    articles: [
      {
        title: "How Many Samples Do I Need?",
        tags: ["samples", "learning curve", "accuracy"],
        content: `The Sample Optimization Engine uses a power-law learning curve model to estimate how many training samples are needed to reach a target accuracy.

**Model:**
\`accuracy ≈ 1 − k / n^α\`

where:
- n = number of training samples
- α = 0.22 (empirically calibrated for document classification)
- k = calibrated from (current_accuracy, current_samples)

**Solving for n:**
Given target accuracy T:
\`n_target = (k / (1 − T))^(1/α)\`

**Output includes:**
- samples_needed: total samples required to reach target
- samples_remaining: samples_needed − current_samples
- confidence_interval: ±CI at 95% (Wilson interval approximation)
- estimated_days_to_target: samples_remaining / throughput (default 20 samples/day)

**Where to use:** Validation Studio → System Lifecycle → Training Optimization panel.`,
      },
    ],
  },
  {
    id: "export",
    title: "Structured Export",
    icon: <Download size={14} />,
    color: "text-teal-500",
    articles: [
      {
        title: "Export Formats",
        tags: ["export", "JSON", "CSV", "JSONL"],
        content: `The Export Studio (Phase VI) exports all extracted data in 3 formats:

**JSON** — Structured nested objects, one per document. Best for API consumers and developer tooling.

**CSV** — Flat spreadsheet with one row per document. Headers are field names. Opens directly in Excel/Google Sheets.

**JSONL** — One JSON object per line. Optimised for ML pipelines, streaming ingestion, and LLM fine-tuning datasets.

**Each export record includes (configurable):**
- All extracted field values (filtered by: all / filled / high-confidence)
- Confidence scores per field (as field__confidence columns in CSV)
- Document metadata: doc_id, name, class, class_confidence
- Export timestamp

**Filters:**
- All fields (including empty)
- Filled fields only
- High confidence only (configurable threshold)

**PII Redaction** can be applied inline using the configured governance rules before download.`,
      },
    ],
  },
  {
    id: "model-lifecycle",
    title: "Model Lifecycle",
    icon: <GitBranch size={14} />,
    color: "text-orange-500",
    articles: [
      {
        title: "Deployment Stages",
        tags: ["model", "deployment", "A/B test"],
        content: `Models progress through 6 promotion stages:

1. **retained_local** — Trained locally, not yet validated
2. **internal_validation** — Running golden dataset tests
3. **shadow_deployment** — Processing real docs but results not shown to users
4. **canary_staging** — Small % of real traffic (1–5%)
5. **ab_test** — Live A/B split (configurable %)
6. **production** — Full production traffic

**Promotion Gate:**
A model must pass the Golden Dataset Test (score ≥ baseline production score) before promotion. Default: 500 test documents.

**Rollback:**
Any production model version can be rolled back in < 30 seconds. Previous stable version is retained in state.

**Current versions:**
- v4.0.82 — Production stable (96.8% accuracy)
- v4.2.1 — A/B test 15% traffic (97.3% accuracy)
- v5.0.0-rc1 — Shadow deployment (95.1% accuracy)`,
      },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface DocumentationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentationPanel({ isOpen, onClose }: DocumentationPanelProps) {
  const [query, setQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["overview"]));
  const [activeArticle, setActiveArticle] = useState<{ section: string; idx: number } | null>(
    { section: "overview", idx: 0 }
  );

  const filtered = query.trim()
    ? DOC_SECTIONS.map(s => ({
        ...s,
        articles: s.articles.filter(a =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.content.toLowerCase().includes(query.toLowerCase()) ||
          a.tags?.some(t => t.toLowerCase().includes(query.toLowerCase()))
        ),
      })).filter(s => s.articles.length > 0)
    : DOC_SECTIONS;

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const activeContent = (() => {
    if (!activeArticle) return null;
    const sec = DOC_SECTIONS.find(s => s.id === activeArticle.section);
    return sec?.articles[activeArticle.idx] ?? null;
  })();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-stretch pointer-events-none">
      {/* Overlay */}
      <div
        className="flex-1 bg-black/30 backdrop-blur-sm pointer-events-auto"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="w-[860px] h-full bg-background border-l border-border/50 shadow-2xl flex flex-col pointer-events-auto">
        {/* Header */}
        <div className="shrink-0 h-16 bg-card/80 backdrop-blur border-b border-border/50 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <BookOpen size={16} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-tight">Platform Documentation</h2>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Document Intelligence Engine OS · v4.0.82</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar / TOC */}
          <div className="w-64 shrink-0 border-r border-border/40 overflow-y-auto custom-scrollbar p-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search docs..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full h-8 pl-8 pr-3 rounded-lg bg-muted border border-border/50 text-[11px] font-medium placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50"
              />
            </div>

            {/* Sections */}
            <div className="space-y-1">
              {filtered.map(section => (
                <div key={section.id}>
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted transition-all text-left"
                  >
                    <span className={section.color}>{section.icon}</span>
                    <span className="text-[11px] font-black uppercase tracking-tight text-foreground flex-1">{section.title}</span>
                    {expandedSections.has(section.id)
                      ? <ChevronDown size={11} className="text-muted-foreground shrink-0" />
                      : <ChevronRight size={11} className="text-muted-foreground shrink-0" />
                    }
                  </button>
                  {expandedSections.has(section.id) && (
                    <div className="ml-5 space-y-0.5 mt-0.5">
                      {section.articles.map((a, idx) => {
                        const isActive = activeArticle?.section === section.id && activeArticle?.idx === idx;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setActiveArticle({ section: section.id, idx });
                              if (!expandedSections.has(section.id)) toggleSection(section.id);
                            }}
                            className={cn(
                              "w-full text-left px-2 py-1.5 rounded-lg text-[10px] font-bold transition-all",
                              isActive
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                            )}
                          >
                            {a.title}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Article Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
            {activeContent ? (
              <article className="max-w-2xl">
                {/* Tags */}
                {activeContent.tags && (
                  <div className="flex gap-1.5 mb-4">
                    {activeContent.tags.map(t => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-black uppercase tracking-widest text-primary">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <h1 className="text-lg font-black uppercase tracking-tight text-foreground mb-6">
                  {activeContent.title}
                </h1>

                <div className="space-y-4 text-[12px] text-foreground/80 leading-relaxed">
                  {activeContent.content.split("\n\n").map((para, i) => {
                    if (para.startsWith("**") && para.endsWith("**") && !para.slice(2, -2).includes("**")) {
                      return <h3 key={i} className="font-black uppercase tracking-tight text-foreground mt-6 mb-2">{para.slice(2, -2)}</h3>;
                    }
                    // Render bold inline and code inline
                    const rendered = para
                      .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
                      .map((chunk, j) => {
                        if (chunk.startsWith("**") && chunk.endsWith("**")) {
                          return <strong key={j} className="font-black text-foreground">{chunk.slice(2, -2)}</strong>;
                        }
                        if (chunk.startsWith("`") && chunk.endsWith("`")) {
                          return <code key={j} className="px-1 py-0.5 rounded bg-muted border border-border/50 text-[11px] font-mono text-primary">{chunk.slice(1, -1)}</code>;
                        }
                        // Bullet list items
                        if (chunk.startsWith("- ")) {
                          return (
                            <ul key={j} className="list-none space-y-1 ml-2">
                              {chunk.split("\n").filter(l => l.startsWith("- ")).map((l, k) => (
                                <li key={k} className="flex items-start gap-2">
                                  <span className="text-primary mt-1 shrink-0">·</span>
                                  <span>{l.slice(2)}</span>
                                </li>
                              ))}
                            </ul>
                          );
                        }
                        return <span key={j}>{chunk}</span>;
                      });
                    return <p key={i} className="leading-relaxed">{rendered}</p>;
                  })}
                </div>
              </article>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <BookOpen size={40} strokeWidth={1} className="text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">Select an article from the left panel</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
