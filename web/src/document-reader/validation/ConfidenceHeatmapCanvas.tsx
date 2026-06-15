"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { TrainingPage, FieldExplanation } from "../types";
import { norm } from "./engine";

export interface HeatmapField {
  id: string;
  name: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  confidence?: number;
  value?: string;
  categoryId?: string | null;
}

interface ConfidenceHeatmapCanvasProps {
  page?: TrainingPage;
  fields: HeatmapField[];
  fieldExplanations: FieldExplanation[];
  selectedFieldId: string | null;
  onSelectField: (fieldId: string) => void;
  showOcrWords: boolean;
}

export function confidenceTier(confidence: number): "high" | "medium" | "low" {
  const pct = confidence * 100;
  if (pct > 95) return "high";
  if (pct >= 85) return "medium";
  return "low";
}

const TIER_STYLES: Record<string, { border: string; bg: string; dot: string; label: string }> = {
  high: { border: "border-emerald-500/70", bg: "bg-emerald-500/10", dot: "bg-emerald-500", label: "High Confidence" },
  medium: { border: "border-amber-500/70", bg: "bg-amber-500/15", dot: "bg-amber-500", label: "Medium Confidence" },
  low: { border: "border-rose-500/80", bg: "bg-rose-500/20", dot: "bg-rose-500", label: "Low Confidence" },
};

// A field with a non-empty extracted value is shown as "done" (green), independent of
// its confidence tier — confidence still drives the tooltip/legend, but the at-a-glance
// box color answers "did extraction find something here?" rather than "how sure is it?".
const EXTRACTED_STYLE = { border: "border-emerald-500/70", bg: "bg-emerald-500/10", dot: "bg-emerald-500", label: "Extracted" };

export function ConfidenceHeatmapCanvas({
  page,
  fields,
  fieldExplanations,
  selectedFieldId,
  onSelectField,
  showOcrWords,
}: ConfidenceHeatmapCanvasProps) {
  const explanationByField = React.useMemo(() => {
    const map = new Map<string, FieldExplanation>();
    fieldExplanations.forEach(f => map.set(f.fieldId, f));
    return map;
  }, [fieldExplanations]);

  const positionedFields = fields.filter(f => f.x !== undefined && f.y !== undefined && f.width !== undefined && f.height !== undefined);

  const fieldRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (!selectedFieldId) return;
    const el = fieldRefs.current[selectedFieldId];
    el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
  }, [selectedFieldId, page?.pageId]);

  if (!page) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-[9px] border border-dashed border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
        No Page Selected
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-black/5 rounded-[9px] border border-border overflow-auto custom-scrollbar flex items-start justify-center p-4">
      <div className="relative inline-block shadow-2xl" style={{ minWidth: "60%" }}>
        {page.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.imageUrl} alt={`Page ${page.pageNumber}`} className="block w-full h-auto select-none" draggable={false} />
        ) : (
          <div className="w-[700px] h-[900px] bg-muted/30 flex items-center justify-center text-muted-foreground text-[10px] font-black uppercase">
            No Preview Available
          </div>
        )}

        {/* Field-level confidence heatmap overlays */}
        {positionedFields.map(field => {
          const confidence = norm(field.confidence);
          const tier = confidenceTier(confidence);
          const styles = field.value ? EXTRACTED_STYLE : TIER_STYLES[tier];
          const explanation = explanationByField.get(field.id);
          const isSelected = selectedFieldId === field.id;

          return (
            <div
              key={field.id}
              ref={el => { fieldRefs.current[field.id] = el; }}
              onClick={() => onSelectField(field.id)}
              className={cn(
                "absolute group cursor-pointer border-2 rounded-[3px] transition-all",
                isSelected
                  ? "border-red-500 bg-red-500/15 ring-[3px] ring-red-500 ring-offset-2 ring-offset-background z-30 shadow-[0_0_0_4px_rgba(239,68,68,0.18)]"
                  : cn(styles.border, styles.bg)
              )}
              style={{
                left: `${field.x}%`,
                top: `${field.y}%`,
                width: `${field.width}%`,
                height: `${field.height}%`,
              }}
            >
              {/* Selected-field locator ping */}
              {isSelected && (
                <span className="pointer-events-none absolute -top-1.5 -left-1.5 flex h-3 w-3 z-30">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
              )}

              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-2 left-0 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity z-30 min-w-[180px]">
                <div className="bg-card border border-border rounded-[7px] shadow-2xl p-2.5 text-left">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[9px] font-black uppercase tracking-wide text-foreground">{field.name}</span>
                    <span className={cn("w-2 h-2 rounded-full shrink-0", styles.dot)} />
                  </div>
                  <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    {styles.label} · {(confidence * 100).toFixed(1)}%
                  </p>
                  {explanation?.ocrAmbiguity && (
                    <p className="text-[8px] text-amber-500 font-mono leading-tight">
                      "{explanation.ocrAmbiguity.observed}" → {explanation.ocrAmbiguity.alternatives.map(a => `"${a}"`).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Raw OCR word-level heatmap (optional) */}
        {showOcrWords && (page.textLayer || []).map((word, idx) => {
          const confidence = norm(word.confidence);
          const tier = confidenceTier(confidence);
          const styles = TIER_STYLES[tier];
          const usesPixelX = (page.width || 0) > 0 && (word.x > 100 || word.width > 100);
          const usesPixelY = (page.height || 0) > 0 && (word.y > 100 || word.height > 100);
          const x = usesPixelX ? (word.x / (page.width || 1)) * 100 : word.x;
          const y = usesPixelY ? (word.y / (page.height || 1)) * 100 : word.y;
          const w = usesPixelX ? (word.width / (page.width || 1)) * 100 : word.width;
          const h = usesPixelY ? (word.height / (page.height || 1)) * 100 : word.height;

          return (
            <div
              key={word.id || idx}
              className={cn("absolute pointer-events-none border rounded-[1px]", styles.border, styles.bg, "opacity-60")}
              style={{ left: `${x}%`, top: `${y}%`, width: `${w}%`, height: `${h}%` }}
              title={`${word.text} (${(confidence * 100).toFixed(0)}%)`}
            />
          );
        })}
      </div>
    </div>
  );
}

export function ConfidenceHeatmapLegend() {
  return (
    <div className="flex items-center gap-4 px-1">
      {(["high", "medium", "low"] as const).map(tier => (
        <div key={tier} className="flex items-center gap-1.5">
          <span className={cn("w-2.5 h-2.5 rounded-full border", TIER_STYLES[tier].dot, TIER_STYLES[tier].border)} />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
            {tier === "high" ? ">95%" : tier === "medium" ? "85–95%" : "<85%"}
          </span>
        </div>
      ))}
    </div>
  );
}
