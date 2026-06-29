"use client";

import React from "react";
import {
  Sparkles, FileText, Tag, Fingerprint, Activity,
  CheckCircle2, AlertTriangle, XCircle, Pencil, Check, X, ShieldAlert, Eraser,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ValidationDocumentSummary, FieldExplanation, FieldConfidenceBreakdown } from "../types";
import { HeatmapField, confidenceTier } from "./ConfidenceHeatmapCanvas";

const CONFIDENCE_LAYERS: Array<{ key: keyof ValidationDocumentSummary["confidence"]; label: string; weightKey: keyof ValidationDocumentSummary["confidence"]["weights2"] }> = [
  { key: "ocrConfidence", label: "OCR", weightKey: "ocr" },
  { key: "geometricFieldConfidence", label: "Extraction", weightKey: "extraction" },
  { key: "boundaryConfidence", label: "Boundary", weightKey: "boundary" },
  { key: "anchorConfidence", label: "Anchor", weightKey: "anchor" },
  { key: "validationConfidence", label: "Validation", weightKey: "validation" },
  { key: "trainingConfidence", label: "Training", weightKey: "training" },
  { key: "evidenceConfidence", label: "Evidence", weightKey: "evidence" },
];

function tierColor(value: number) {
  if (value >= 0.85) return "bg-emerald-500";
  if (value >= 0.65) return "bg-amber-500";
  return "bg-rose-500";
}

const TIER_TEXT: Record<string, string> = {
  high: "text-emerald-500",
  medium: "text-amber-500",
  low: "text-rose-500",
};

const TIER_ICON: Record<string, React.ElementType> = {
  high: CheckCircle2,
  medium: AlertTriangle,
  low: XCircle,
};

export type FieldReviewAction = "accept" | "edit" | "clear";

export interface FieldCategory {
  id: string;
  name: string;
  parentId: string | null;
}

interface FieldGroup {
  key: string;
  name: string;
  depth: number;
  fields: HeatmapField[];
}

/** Document reading order: top-to-bottom, then left-to-right. Unmapped fields sort last. */
const positionRank = (f: HeatmapField) =>
  f.y !== undefined && f.x !== undefined ? f.y * 1000 + f.x : Number.MAX_SAFE_INTEGER;

const byPosition = (a: HeatmapField, b: HeatmapField) => positionRank(a) - positionRank(b);

const firstRank = (fields: HeatmapField[]) => (fields.length ? positionRank(fields[0]) : Number.MAX_SAFE_INTEGER);

/** Groups fields by category/sub-category and orders both groups and fields by their location in the document. */
function buildFieldGroups(fields: HeatmapField[], categories: FieldCategory[]): FieldGroup[] {
  const fieldsByCategory = new Map<string, HeatmapField[]>();
  const uncategorized: HeatmapField[] = [];

  fields.forEach(f => {
    const catId = f.categoryId;
    if (catId && categories.some(c => c.id === catId)) {
      if (!fieldsByCategory.has(catId)) fieldsByCategory.set(catId, []);
      fieldsByCategory.get(catId)!.push(f);
    } else {
      uncategorized.push(f);
    }
  });

  const childrenOf = (parentId: string | null) => categories.filter(c => c.parentId === parentId);

  const allFieldsUnder = (catId: string): HeatmapField[] => {
    let result = [...(fieldsByCategory.get(catId) || [])];
    childrenOf(catId).forEach(c => { result = result.concat(allFieldsUnder(c.id)); });
    return result;
  };

  const orderByDocumentPosition = (cats: FieldCategory[]) =>
    [...cats].sort((a, b) => firstRank(allFieldsUnder(a.id).sort(byPosition)) - firstRank(allFieldsUnder(b.id).sort(byPosition)));

  const buildGroups = (cat: FieldCategory, depth: number): FieldGroup[] => {
    const ownFields = [...(fieldsByCategory.get(cat.id) || [])].sort(byPosition);
    const childGroups = orderByDocumentPosition(childrenOf(cat.id)).flatMap(c => buildGroups(c, depth + 1));
    const groups: FieldGroup[] = ownFields.length > 0 ? [{ key: cat.id, name: cat.name, depth, fields: ownFields }] : [];
    return [...groups, ...childGroups];
  };

  const groups = orderByDocumentPosition(childrenOf(null)).flatMap(c => buildGroups(c, 0));

  if (uncategorized.length > 0) {
    groups.push({
      key: "uncategorized",
      name: categories.length > 0 ? "Uncategorized" : "All Fields",
      depth: 0,
      fields: [...uncategorized].sort(byPosition),
    });
  }

  return groups;
}

interface ExplainabilityPanelProps {
  fields: HeatmapField[];
  categories?: FieldCategory[];
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  onFieldAction: (field: HeatmapField, action: FieldReviewAction, value?: string) => void;
}

export function ExplainabilityPanel({
  fields,
  categories = [],
  selectedFieldId,
  onSelectField,
  onFieldAction,
}: ExplainabilityPanelProps) {
  const [editingFieldId, setEditingFieldId] = React.useState<string | null>(null);
  const [draftValue, setDraftValue] = React.useState("");

  const fieldGroups = React.useMemo(() => buildFieldGroups(fields, categories), [fields, categories]);

  const startEdit = (field: HeatmapField) => {
    setEditingFieldId(field.id);
    setDraftValue(field.value || "");
  };

  const commitEdit = (field: HeatmapField) => {
    onFieldAction(field, "edit", draftValue);
    setEditingFieldId(null);
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-1">

      {/* Extracted Fields */}
      <section className="bg-card rounded-[9px] border border-border/50 shadow-sm p-4 flex-1 min-h-0 flex flex-col">
        <header className="flex items-center gap-2 mb-3 shrink-0">
          <FileText size={13} className="text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Extracted Fields</h4>
          <span className="ml-auto text-[8px] font-black text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{fields.length}</span>
        </header>
        <div className="space-y-1.5 overflow-y-auto custom-scrollbar pr-1">
          {fields.length === 0 && (
            <p className="text-[9px] text-muted-foreground italic">No extraction fields configured for this document.</p>
          )}
          {(() => {
            let order = 0;
            return fieldGroups.map(group => (
              <div key={group.key} className="space-y-1.5">
                {categories.length > 0 && (
                  <p
                    className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] pt-1.5 first:pt-0"
                    style={{ paddingLeft: group.depth * 10 }}
                  >
                    {group.name}
                  </p>
                )}
                {group.fields.map(field => {
                  order += 1;
                  const sequence = order;
                  const confidence = field.confidence ?? 0;
                  const tier = confidenceTier(confidence > 1 ? confidence / 100 : confidence);
                  const Icon = TIER_ICON[tier];
                  const isSelected = selectedFieldId === field.id;
                  const isEditing = editingFieldId === field.id;
                  const isPositioned = field.x !== undefined && field.y !== undefined;

                  return (
                    <div
                      key={field.id}
                      onClick={() => onSelectField(field.id)}
                      style={{ marginLeft: group.depth * 10 }}
                      className={cn(
                        "p-2 rounded-lg border cursor-pointer transition-all",
                        isSelected ? "border-red-500 bg-red-500/10" : "border-border/40 hover:border-border"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="flex items-center gap-1.5 min-w-0">
                          <span className="shrink-0 w-3.5 h-3.5 rounded-[3px] bg-muted text-muted-foreground text-[7px] font-black flex items-center justify-center">{sequence}</span>
                          <span className="text-[9px] font-black uppercase tracking-tight text-foreground truncate">{field.name}</span>
                          {!isPositioned && (
                            <span className="shrink-0 text-[7px] font-black uppercase tracking-widest text-muted-foreground/50" title="Not mapped to a location on the page">unmapped</span>
                          )}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <Icon size={11} className={TIER_TEXT[tier]} />
                          <span className={cn("text-[8px] font-black", TIER_TEXT[tier])}>
                            {((confidence > 1 ? confidence / 100 : confidence) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                      {isEditing ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            autoFocus
                            value={draftValue}
                            onChange={e => setDraftValue(e.target.value)}
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => {
                              if (e.key === "Enter") commitEdit(field);
                              if (e.key === "Escape") setEditingFieldId(null);
                            }}
                            className="flex-1 bg-background border border-primary/40 rounded px-1.5 py-1 text-[9px] font-mono outline-none focus:border-primary"
                          />
                          <button onClick={(e) => { e.stopPropagation(); commitEdit(field); }} className="p-1 rounded bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                            <Check size={11} />
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingFieldId(null); }} className="p-1 rounded bg-muted text-muted-foreground hover:bg-muted/70">
                            <X size={11} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9.5px] font-mono text-muted-foreground truncate">{field.value || "—"}</span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={(e) => { e.stopPropagation(); onFieldAction(field, "accept"); }}
                              disabled={!field.value}
                              className="p-1 rounded text-muted-foreground hover:text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Accept — extraction is correct"
                            >
                              <Check size={10} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); startEdit(field); }}
                              className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
                              title="Edit value"
                            >
                              <Pencil size={10} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); onFieldAction(field, "clear"); }}
                              disabled={!field.value}
                              className="p-1 rounded text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Clear value"
                            >
                              <Eraser size={10} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
      </section>
    </div>
  );
}

function Row({ label, value, bold, icon: Icon }: { label: string; value: string; bold?: boolean; icon?: React.ElementType }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight flex items-center gap-1.5">
        {Icon && <Icon size={10} />}
        {label}
      </span>
      <span className={cn("text-[10px] font-mono text-foreground truncate max-w-[55%] text-right", bold && "font-black")}>{value}</span>
    </div>
  );
}

interface ConfidenceTransparencyPanelProps {
  summary: ValidationDocumentSummary;
  selectedFieldId?: string | null;
  fieldConfidenceById?: Map<string, FieldConfidenceBreakdown>;
}

/** How a document's confidence score was calculated — the weighted layer breakdown, classification
 * signals, business rule checks, and (if a field is selected) that field's own confidence makeup. */
export function ConfidenceTransparencyPanel({
  summary,
  selectedFieldId,
  fieldConfidenceById,
}: ConfidenceTransparencyPanelProps) {
  const explanationByField = React.useMemo(() => {
    const map = new Map<string, FieldExplanation>();
    summary.fieldExplanations.forEach(f => map.set(f.fieldId, f));
    return map;
  }, [summary.fieldExplanations]);

  const selectedExplanation = selectedFieldId ? explanationByField.get(selectedFieldId) : undefined;
  const selectedFieldConfidence = selectedFieldId ? fieldConfidenceById?.get(selectedFieldId) : undefined;

  return (
    <div className="space-y-4">
      {/* Confidence Transparency */}
      <section className="bg-card rounded-[9px] border border-border/50 shadow-sm p-4">
        <header className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Activity size={13} className="text-primary" />
            Confidence Transparency
          </h4>
          <span className={cn("text-[11px] font-black", TIER_TEXT[confidenceTier(summary.confidence.overallConfidence)])}>
            {(summary.confidence.overallConfidence * 100).toFixed(1)}%
          </span>
        </header>
        <div className="space-y-1.5">
          {CONFIDENCE_LAYERS.map(layer => {
            const value = summary.confidence[layer.key] as number;
            const weight = summary.confidence.weights2[layer.weightKey];
            return (
              <div key={layer.key} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[8px] font-black uppercase tracking-tight text-muted-foreground">{layer.label}</span>
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full", tierColor(value))} style={{ width: `${Math.round(value * 100)}%` }} />
                </div>
                <span className="w-16 shrink-0 text-right text-[8.5px] font-mono text-foreground">
                  {(value * 100).toFixed(0)}% <span className="text-muted-foreground">×{Math.round(weight * 100)}%</span>
                </span>
              </div>
            );
          })}
          <div className="flex items-center gap-2 pt-1 border-t border-border/40 mt-1.5">
            <span className="w-16 shrink-0 text-[8px] font-black uppercase tracking-tight text-muted-foreground">Drift Penalty</span>
            <div className="flex-1">
              {summary.confidence.driftEnabled ? (
                <span className="text-[8.5px] font-mono text-rose-500">-{(summary.confidence.driftPenalty * 100).toFixed(1)}%</span>
              ) : (
                <span className="text-[8.5px] font-bold uppercase tracking-tight text-muted-foreground/60 italic">Not yet enabled</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-[8.5px] text-muted-foreground/80">
            <span className="w-16 shrink-0 font-black uppercase tracking-tight">Evidence Cap</span>
            <span className="font-mono">{(summary.confidence.evidenceCap * 100).toFixed(0)}% ceiling applied to overall confidence</span>
          </div>
        </div>
      </section>

      {/* AI Explanation */}
      <section className="bg-card rounded-[9px] border border-border/50 shadow-sm p-4">
        <header className="flex items-center gap-2 mb-3">
          <Sparkles size={13} className="text-primary animate-pulse" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">AI Explanation</h4>
        </header>
        <div className="space-y-2.5 text-[10px]">
          <div>
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <Tag size={10} /> Matched Keywords
            </p>
            {summary.classificationExplanation.matchedKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {summary.classificationExplanation.matchedKeywords.map((kw, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[8.5px] font-bold text-primary">
                    {kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-[9px] text-muted-foreground italic">No anchor keywords matched.</p>
            )}
          </div>
          <Row label="Vendor Fingerprint" value={summary.classificationExplanation.vendorFingerprintMatch || "No match found"} icon={Fingerprint} />
        </div>

        {summary.businessRules.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <ShieldAlert size={10} /> Business Rule Checks
            </p>
            {summary.businessRules.map(rule => (
              <div key={rule.ruleId} className={cn(
                "flex items-start gap-2 p-2 rounded-lg border text-[8.5px] font-bold",
                rule.passed ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600" : "border-rose-500/30 bg-rose-500/10 text-rose-500"
              )}>
                {rule.passed ? <CheckCircle2 size={11} className="mt-0.5 shrink-0" /> : <XCircle size={11} className="mt-0.5 shrink-0" />}
                <div>
                  <p className="uppercase tracking-tight">{rule.label}</p>
                  <p className="font-mono text-[8px] opacity-80 normal-case">{rule.expression}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Selected field deep-dive */}
      {selectedExplanation && (
        <section className="bg-card rounded-[9px] border border-border/50 shadow-sm p-4">
          <header className="flex items-center justify-between mb-3">
            <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
              <FileText size={13} className="text-primary" />
              Field Explanation
            </h4>
            <span className={cn("text-[9px] font-black uppercase", TIER_TEXT[selectedExplanation.status])}>
              {(selectedExplanation.confidence * 100).toFixed(1)}%
            </span>
          </header>
          <p className="text-[10px] font-black text-foreground mb-2 uppercase tracking-tight">{selectedExplanation.fieldName}</p>
          <div className="space-y-1.5">
            {selectedExplanation.reasons.map((reason, i) => (
              <div key={i} className="flex items-start gap-2 text-[9px] leading-tight">
                <CheckCircle2 size={11} className="text-primary/60 mt-0.5 shrink-0" />
                <span className="text-muted-foreground">{reason}</span>
              </div>
            ))}
          </div>

          {selectedFieldConfidence && (
            <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
              {[
                { label: "Boundary", value: selectedFieldConfidence.boundaryConfidence },
                { label: "Anchor", value: selectedFieldConfidence.anchorConfidence },
                { label: "Validation", value: selectedFieldConfidence.validationConfidence },
              ].map(row => (
                <div key={row.label} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-[8px] font-black uppercase tracking-tight text-muted-foreground">{row.label}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className={cn("h-full rounded-full", tierColor(row.value))} style={{ width: `${Math.round(row.value * 100)}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-[8.5px] font-mono text-foreground">{(row.value * 100).toFixed(0)}%</span>
                </div>
              ))}
              <p className="text-[8.5px] font-bold text-muted-foreground italic pt-1">Top issue: {selectedFieldConfidence.topIssue}</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
