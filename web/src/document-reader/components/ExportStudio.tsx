"use client";

import React, { useState, useMemo } from "react";
import {
  Download, FileJson, FileText, CheckCircle2, AlertCircle, Clock,
  Filter, Copy, Eye, EyeOff, Shield, ChevronDown, ChevronRight,
  Table2, Braces, Archive, Sparkles, Info, BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePipelineStore } from "../store/studioStore";
import { applyPiiRedaction } from "../validation/autoPipeline";
import { TrainingDocument, GovernanceSettings } from "../types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ExportFormat = "json" | "csv" | "jsonl";
type FieldFilter = "all" | "filled" | "high_confidence";

interface ExportOptions {
  format: ExportFormat;
  fieldFilter: FieldFilter;
  includeMetadata: boolean;
  includeConfidences: boolean;
  includeTimestamps: boolean;
  applyPiiRedaction: boolean;
  minConfidence: number;
}

type ExportField = { id: string; name: string; type: string; value?: string; confidence?: number; required?: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getExtractionFields(doc: TrainingDocument): ExportField[] {
  return ((doc.metadata?.extractionDesign?.fields || doc.extraction?.fields || []) as ExportField[]);
}

function buildExportRow(
  doc: TrainingDocument,
  opts: ExportOptions,
  governance: GovernanceSettings | null
) {
  let fields = getExtractionFields(doc);

  // Filter
  if (opts.fieldFilter === "filled") fields = fields.filter(f => !!f.value);
  if (opts.fieldFilter === "high_confidence") {
    fields = fields.filter(f => (f.confidence ?? 0) >= opts.minConfidence / 100);
  }

  // PII redaction
  if (opts.applyPiiRedaction && governance) {
    const { fields: redacted } = applyPiiRedaction(fields, governance);
    fields = redacted as typeof fields;
  }

  const fieldEntries: Record<string, string | number | null> = {};
  const confidenceEntries: Record<string, number | null> = {};

  for (const f of fields) {
    fieldEntries[f.name] = f.value ?? null;
    if (opts.includeConfidences) {
      confidenceEntries[`${f.name}__confidence`] = f.confidence != null ? Math.round(f.confidence * 100) : null;
    }
  }

  const meta = opts.includeMetadata ? {
    _doc_id: doc.documentId,
    _doc_name: doc.name,
    _class: doc.classification?.className ?? null,
    _class_confidence: doc.classification?.confidence != null
      ? Math.round(doc.classification.confidence * 100)
      : null,
    ...(opts.includeTimestamps ? { _exported_at: new Date().toISOString() } : {}),
  } : {};

  return { ...meta, ...fieldEntries, ...confidenceEntries };
}

// ─── JSON export ─────────────────────────────────────────────────────────────

function toJson(rows: object[]): string {
  return JSON.stringify(rows, null, 2);
}

function toJsonl(rows: object[]): string {
  return rows.map(r => JSON.stringify(r)).join("\n");
}

// ─── CSV export ──────────────────────────────────────────────────────────────

function escapeCsv(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))));
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map(r => headers.map(h => escapeCsv(r[h])).join(",")),
  ];
  return lines.join("\n");
}

// ─── Download helper ──────────────────────────────────────────────────────────

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ExportStudio() {
  const { trainingDocuments, infrastructure } = usePipelineStore();
  const governance = infrastructure?.governance ?? null;

  const [opts, setOpts] = useState<ExportOptions>({
    format: "json",
    fieldFilter: "filled",
    includeMetadata: true,
    includeConfidences: true,
    includeTimestamps: true,
    applyPiiRedaction: false,
    minConfidence: 60,
  });

  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(
    () => new Set(trainingDocuments.map(d => d.documentId))
  );
  const [preview, setPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedDocs, setExpandedDocs] = useState<Set<string>>(new Set());

  const selectedDocs = useMemo(
    () => trainingDocuments.filter(d => selectedDocIds.has(d.documentId)),
    [trainingDocuments, selectedDocIds]
  );

  const rows = useMemo(
    () => selectedDocs.map(d => buildExportRow(d, opts, governance)),
    [selectedDocs, opts, governance]
  );

  const serialized = useMemo(() => {
    if (opts.format === "json") return toJson(rows);
    if (opts.format === "jsonl") return toJsonl(rows);
    return toCsv(rows as Record<string, unknown>[]);
  }, [rows, opts.format]);

  const stats = useMemo(() => {
    const metaKeys = ["_doc_id", "_doc_name", "_class", "_class_confidence", "_exported_at"];
    const totalFields = rows.reduce<number>((s, r) =>
      s + Object.keys(r).filter(k => !metaKeys.some(m => k.startsWith(m)) && !k.endsWith("__confidence")).length, 0);
    const filledFields = rows.reduce<number>((s, r) =>
      s + Object.entries(r).filter(([k, v]) => !metaKeys.some(m => k.startsWith(m)) && !k.endsWith("__confidence") && v != null && v !== "").length, 0);
    return { totalFields, filledFields, docs: rows.length };
  }, [rows]);

  const handleExport = () => {
    const ext = opts.format;
    const mime = opts.format === "csv" ? "text/csv" : "application/json";
    const ts = new Date().toISOString().slice(0, 10);
    downloadBlob(serialized, `export_${ts}.${ext}`, mime);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(serialized).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleDoc = (id: string) => {
    setSelectedDocIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedDocs(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const FORMAT_OPTIONS: Array<{ id: ExportFormat; label: string; icon: React.ReactNode; desc: string }> = [
    { id: "json",  label: "JSON",  icon: <Braces size={16} />,   desc: "Structured, nested — ideal for API consumers" },
    { id: "csv",   label: "CSV",   icon: <Table2 size={16} />,   desc: "Flat spreadsheet — opens in Excel / Google Sheets" },
    { id: "jsonl", label: "JSONL", icon: <Archive size={16} />,  desc: "One record per line — for ML pipelines & streaming" },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="shrink-0 h-16 border-b border-border/50 bg-card/60 backdrop-blur-sm px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
            <Download size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-tight text-foreground">Structured Export Studio</h2>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Phase VI · Secure Export & API</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreview(!preview)}
            className={cn(
              "h-9 px-4 rounded-xl border text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center gap-2",
              preview ? "bg-primary/10 border-primary/30 text-primary" : "border-border/50 text-muted-foreground hover:bg-muted"
            )}
          >
            {preview ? <EyeOff size={13} /> : <Eye size={13} />}
            {preview ? "Hide Preview" : "Preview"}
          </button>
          <button
            onClick={handleCopy}
            className="h-9 px-4 rounded-xl border border-border/50 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:bg-muted transition-all flex items-center gap-2"
          >
            <Copy size={13} />
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleExport}
            disabled={selectedDocs.length === 0}
            className="h-9 px-5 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={13} />
            Export {selectedDocs.length > 0 ? `(${selectedDocs.length})` : ""}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left: Options */}
        <div className="w-80 shrink-0 border-r border-border/40 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Docs", value: stats.docs },
              { label: "Fields", value: stats.totalFields },
              { label: "Filled", value: stats.filledFields },
            ].map(s => (
              <div key={s.label} className="bg-card border border-border/50 rounded-xl p-3 text-center">
                <div className="text-xl font-black text-foreground">{s.value}</div>
                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Format */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Export Format</p>
            <div className="space-y-2">
              {FORMAT_OPTIONS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setOpts(o => ({ ...o, format: f.id }))}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3",
                    opts.format === f.id
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "border-border/40 hover:border-primary/20 hover:bg-muted/30"
                  )}
                >
                  <div className="mt-0.5 shrink-0">{f.icon}</div>
                  <div>
                    <div className="text-[11px] font-black uppercase tracking-tight">{f.label}</div>
                    <div className="text-[9px] text-muted-foreground mt-0.5">{f.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Field filter */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">
              <Filter size={10} className="inline mr-1.5" />Field Filter
            </p>
            <div className="space-y-1.5">
              {([
                ["all",             "All fields (including empty)"],
                ["filled",          "Filled fields only"],
                ["high_confidence", "High confidence only"],
              ] as const).map(([val, label]) => (
                <label key={val} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all",
                    opts.fieldFilter === val ? "border-primary bg-primary" : "border-border group-hover:border-primary/50"
                  )}>
                    {opts.fieldFilter === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <input type="radio" className="sr-only" checked={opts.fieldFilter === val}
                    onChange={() => setOpts(o => ({ ...o, fieldFilter: val }))} />
                  <span className="text-[11px] font-bold text-foreground/80">{label}</span>
                </label>
              ))}
            </div>
            {opts.fieldFilter === "high_confidence" && (
              <div className="mt-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Min confidence: {opts.minConfidence}%
                </label>
                <input
                  type="range" min={0} max={100} step={5}
                  value={opts.minConfidence}
                  onChange={e => setOpts(o => ({ ...o, minConfidence: +e.target.value }))}
                  className="w-full mt-2 accent-primary"
                />
              </div>
            )}
          </div>

          {/* Toggle options */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-3">Include Fields</p>
            <div className="space-y-2">
              {([
                ["includeMetadata",    "Document metadata"],
                ["includeConfidences", "Confidence scores"],
                ["includeTimestamps",  "Export timestamps"],
              ] as const).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2.5 cursor-pointer group">
                  <div
                    className={cn(
                      "w-9 h-5 rounded-full transition-all relative",
                      opts[key] ? "bg-primary" : "bg-muted border border-border"
                    )}
                    onClick={() => setOpts(o => ({ ...o, [key]: !o[key] }))}
                  >
                    <div className={cn(
                      "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                      opts[key] ? "left-4" : "left-0.5"
                    )} />
                  </div>
                  <span className="text-[11px] font-bold text-foreground/80">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* PII redaction */}
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-amber-500" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600">PII Redaction</p>
            </div>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <div
                className={cn(
                  "w-9 h-5 rounded-full transition-all relative",
                  opts.applyPiiRedaction ? "bg-amber-500" : "bg-muted border border-border"
                )}
                onClick={() => setOpts(o => ({ ...o, applyPiiRedaction: !o.applyPiiRedaction }))}
              >
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                  opts.applyPiiRedaction ? "left-4" : "left-0.5"
                )} />
              </div>
              <span className="text-[11px] font-bold text-foreground/80">Apply governance rules</span>
            </label>
            {opts.applyPiiRedaction && governance && (
              <div className="mt-2 text-[10px] text-amber-700 font-bold">
                Mode: <span className="uppercase">{governance.handlingMode}</span> · {governance.piiEntities.length} entity types
              </div>
            )}
            {opts.applyPiiRedaction && !governance && (
              <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
                <Info size={10} />
                Configure governance in Infrastructure
              </div>
            )}
          </div>

          {/* Document selector */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Documents</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setSelectedDocIds(new Set(trainingDocuments.map(d => d.documentId)))}
                  className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline"
                >All</button>
                <span className="text-muted-foreground/40 text-[9px]">·</span>
                <button
                  onClick={() => setSelectedDocIds(new Set())}
                  className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:underline"
                >None</button>
              </div>
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
              {trainingDocuments.length === 0 ? (
                <p className="text-[10px] text-muted-foreground/50 font-bold text-center py-4">No documents loaded</p>
              ) : trainingDocuments.map(doc => {
                const fields = getExtractionFields(doc);
                const filled = fields.filter(f => !!f.value).length;
                const isSelected = selectedDocIds.has(doc.documentId);
                const isExpanded = expandedDocs.has(doc.documentId);

                return (
                  <div key={doc.documentId} className={cn(
                    "rounded-lg border transition-all",
                    isSelected ? "border-primary/30 bg-primary/5" : "border-border/30"
                  )}>
                    <div className="flex items-center gap-2 p-2">
                      <input type="checkbox" checked={isSelected}
                        onChange={() => toggleDoc(doc.documentId)}
                        className="accent-primary" />
                      <span className="text-[10px] font-black truncate flex-1 text-foreground/80">{doc.name}</span>
                      <span className="text-[9px] text-muted-foreground shrink-0">{filled}/{fields.length}</span>
                      <button onClick={() => toggleExpand(doc.documentId)}
                        className="text-muted-foreground hover:text-foreground">
                        {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="px-3 pb-2 space-y-1">
                        {fields.map(f => (
                          <div key={f.id} className="flex items-center justify-between text-[9px]">
                            <span className="text-muted-foreground truncate">{f.name}</span>
                            <span className={cn("font-black ml-2 shrink-0", f.value ? "text-emerald-600" : "text-muted-foreground/40")}>
                              {f.value ? f.value.slice(0, 18) : "—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {preview ? (
            <div className="flex-1 overflow-auto custom-scrollbar p-6">
              <div className="mb-4 flex items-center gap-2">
                <BarChart3 size={14} className="text-muted-foreground" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                  Preview — {opts.format.toUpperCase()} · {rows.length} record{rows.length !== 1 ? "s" : ""}
                </span>
              </div>
              <pre className="text-[11px] font-mono text-foreground/80 whitespace-pre-wrap bg-card border border-border/40 rounded-xl p-5 overflow-auto max-h-full">
                {serialized.slice(0, 8000)}{serialized.length > 8000 ? "\n\n... (truncated for preview)" : ""}
              </pre>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 p-10">
              <div className="w-20 h-20 rounded-[20px] bg-primary/5 border border-primary/20 flex items-center justify-center text-primary/40">
                <Download size={36} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-base font-black uppercase tracking-tight text-foreground/60">Export Ready</h3>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {selectedDocs.length} document{selectedDocs.length !== 1 ? "s" : ""} selected · {stats.filledFields} filled fields · {opts.format.toUpperCase()} format
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPreview(true)}
                  className="h-10 px-6 rounded-xl border border-border/50 text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground hover:bg-muted transition-all flex items-center gap-2">
                  <Eye size={13} /> Preview Data
                </button>
                <button onClick={handleExport} disabled={selectedDocs.length === 0}
                  className="h-10 px-8 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.15em] shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-105 transition-all flex items-center gap-2 disabled:opacity-40">
                  <Download size={13} /> Download {opts.format.toUpperCase()}
                </button>
              </div>

              {/* Format pills */}
              <div className="flex gap-2 mt-2">
                {FORMAT_OPTIONS.map(f => (
                  <button key={f.id}
                    onClick={() => setOpts(o => ({ ...o, format: f.id }))}
                    className={cn(
                      "h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5",
                      opts.format === f.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    )}>
                    {f.icon}{f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
