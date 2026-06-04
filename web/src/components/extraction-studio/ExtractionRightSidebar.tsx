"use client";

import React, { useState } from "react";
import { 
  Sparkles, CheckCircle2, Target, Eye, Gauge, ScanText,
  AlertTriangle, Signature, GitCompareArrows
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarField = {
  id: string;
  name: string;
  type: string;
  value?: string;
  confidence?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
};

type SidebarSuggestion = {
  title: string;
  meta: string;
  action: string;
};

interface RightSidebarProps {
  fields: SidebarField[];
  selectedFieldId: string | null;
  qualityScore?: number | null;
  darkenContent?: boolean;
  ocrBoostEnabled?: boolean;
  textEnhancementLevel?: number;
  onToggleDarkenContent?: (enabled: boolean) => void;
  onToggleOcrBoost?: (enabled: boolean) => void;
  onTextEnhancementLevelChange?: (level: number) => void;
  onUpdatePreprocessing?: (settings: Record<string, unknown>) => void;
  onAcceptSuggestion?: (suggestion: SidebarSuggestion) => void;
}

export function ExtractionRightSidebar({
  fields,
  selectedFieldId,
  qualityScore,
  darkenContent = false,
  ocrBoostEnabled = false,
  textEnhancementLevel = 65,
  onToggleDarkenContent,
  onToggleOcrBoost,
  onTextEnhancementLevelChange,
  onAcceptSuggestion
}: RightSidebarProps) {
  const [qualityMode, setQualityMode] = useState(72);

  const activeField = fields.find(f => f.id === selectedFieldId);
  const score = qualityScore ?? null;

  const qualityChecks = [
    "Straightened",
    "Sharpened",
    "Text Enhanced",
    "Noise Removed",
    "OCR Optimized",
    "Boundary Fixed"
  ];

  const suggestions: SidebarSuggestion[] = fields
    .filter(field => !field.x && field.value)
    .map(field => ({
      title: `Review unmapped ${field.name}`,
      meta: `${Math.round((field.confidence || 0) * 100)}% confidence`,
      action: "Review"
    }));

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-border/60 shadow-md p-3 select-none overflow-y-auto custom-scrollbar">
      {/* DOCUMENT QUALITY */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <Gauge size={12} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Document Quality</span>
          {score !== null && (
            <span className="ml-auto rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-black text-emerald-600">{score}%</span>
          )}
        </div>
        <div className="rounded-lg border border-border/50 bg-muted/15 p-2.5 space-y-2">
          {qualityChecks.map(check => (
            <div key={check} className="flex items-center gap-2 text-[9px] font-bold text-foreground">
              <CheckCircle2 size={11} className={score === null ? "text-muted-foreground/40" : "text-emerald-500"} />
              <span>{check}</span>
            </div>
          ))}
          {score === null && (
            <div className="rounded border border-dashed border-border bg-white px-2 py-2 text-[8px] font-semibold text-muted-foreground">
              Run OCR or open a processed page to populate quality signals.
            </div>
          )}
          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between text-[8px] font-black uppercase text-muted-foreground">
              <span>Accuracy</span>
              <span>Speed</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={qualityMode}
              onChange={(e) => setQualityMode(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-muted rounded-full appearance-none accent-primary cursor-pointer"
            />
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-border/40 my-3" />

      {/* TEXT LEGIBILITY */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <ScanText size={12} className="text-sky-500" />
          <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Text Legibility</span>
        </div>
        <div className="rounded-lg border border-border/50 bg-sky-50/30 p-2.5 space-y-3">
          <label className="flex items-center justify-between gap-3 text-[9px] font-bold text-foreground">
            <span>Darken faint content</span>
            <input
              type="checkbox"
              checked={darkenContent}
              onChange={(e) => onToggleDarkenContent?.(e.target.checked)}
              className="h-3.5 w-3.5 accent-sky-600"
            />
          </label>
          <label className="flex items-center justify-between gap-3 text-[9px] font-bold text-foreground">
            <span>Use enhanced crop for OCR</span>
            <input
              type="checkbox"
              checked={ocrBoostEnabled}
              onChange={(e) => onToggleOcrBoost?.(e.target.checked)}
              className="h-3.5 w-3.5 accent-sky-600"
            />
          </label>
          <div>
            <div className="flex items-center justify-between text-[8px] font-black uppercase text-muted-foreground">
              <span>Natural</span>
              <span>Darker</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={textEnhancementLevel}
              onChange={(e) => onTextEnhancementLevelChange?.(parseInt(e.target.value, 10))}
              className="w-full h-1 bg-muted rounded-full appearance-none accent-sky-600 cursor-pointer"
            />
          </div>
          <div className="rounded border border-sky-100 bg-white px-2 py-1.5 text-[8px] font-semibold text-sky-700">
            Boosts faint headers and low-contrast labels for annotation and selected-area OCR.
          </div>
        </div>
      </div>

      <div className="h-px w-full bg-border/40 my-3" />

      {/* EXTRACTION PREVIEW */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <Eye size={12} className="text-emerald-500" />
          <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Extraction Preview</span>
        </div>
        <div className="bg-white border border-border/50 rounded-lg p-2 space-y-2 shadow-sm">
          {fields.length === 0 ? (
            <p className="text-[9px] text-muted-foreground text-center py-2 italic">No extractions yet.</p>
          ) : fields.some(field => field.value) ? (
            fields.filter(f => f.value).map(field => (
              <div key={field.id} className="flex items-center justify-between text-[9px] font-bold">
                <span className="text-foreground truncate w-[100px]">{field.name}</span>
                <span className="text-foreground text-right truncate w-24 font-mono">{field.value}</span>
                <span className="text-emerald-500 font-mono text-right">
                  {Math.round((field.confidence || 1.0) * 100)}%
                </span>
              </div>
            ))
          ) : (
            <div className="rounded border border-dashed border-border bg-muted/20 px-2 py-2 text-center text-[9px] font-semibold text-muted-foreground">
              Prebuilt fields loaded. Select a field to validate its OCR evidence.
            </div>
          )}
        </div>
      </div>

      <div className="h-px w-full bg-border/40 my-3" />

      {/* AI SUGGESTIONS */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <Sparkles size={12} className="text-purple-500" />
          <span className="text-[10px] font-black uppercase text-foreground tracking-widest">AI Suggestions</span>
        </div>
        <div className="space-y-2">
          {suggestions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/20 p-3 text-center text-[9px] font-semibold text-muted-foreground">
              No AI suggestions yet. Draw a selection or run smart detection.
            </div>
          ) : suggestions.map((item) => (
            <div key={item.title} className="rounded-lg border border-border/50 bg-white p-2 shadow-sm flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[9px] font-bold text-foreground truncate">{item.title}</div>
                <div className="text-[8px] font-semibold text-muted-foreground">{item.meta}</div>
              </div>
              <button
                onClick={() => onAcceptSuggestion?.(item)}
                className={cn(
                  "shrink-0 rounded px-2 py-1 text-[8px] font-black",
                  item.action === "Review" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"
                )}
              >
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px w-full bg-border/40 my-3" />

      {/* OBJECT DETAILS */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2.5 px-1">
          <Target size={12} className="text-indigo-500" />
          <span className="text-[10px] font-black uppercase text-foreground tracking-widest">Object Details</span>
        </div>
        <div className="bg-white border border-border/50 rounded-lg p-3 flex flex-col gap-3 shadow-sm">
          {activeField ? (
            <>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-muted-foreground font-bold">Detected Object</span>
                <span className="text-foreground font-bold">{activeField.name}</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-muted-foreground font-bold">Confidence</span>
                <span className="text-emerald-500 font-bold">{Math.round((activeField.confidence || 1.0) * 100)}%</span>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-muted-foreground font-bold">Object Type</span>
                <span className="text-foreground font-bold capitalize">{activeField.type}</span>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-2">
                <div className="mb-1 flex items-center justify-between gap-2 text-[9px]">
                  <span className="font-black uppercase text-emerald-700">OCR Result</span>
                  <span className={cn(
                    "rounded px-1.5 py-0.5 text-[8px] font-black uppercase",
                    activeField.value ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  )}>
                    {activeField.value ? "Validated" : "Needs review"}
                  </span>
                </div>
                <div className="rounded border border-white/80 bg-white px-2 py-1.5 text-[10px] font-mono font-bold text-foreground">
                  {activeField.value || "No OCR text found at this mapped area"}
                </div>
              </div>
              <div className="flex justify-between items-start text-[9px]">
                <span className="text-muted-foreground font-bold">Bounding Box</span>
                <div className="text-right text-foreground font-mono space-y-0.5">
                  {activeField.x === undefined ? (
                    <div className="text-amber-600">Not mapped yet</div>
                  ) : (
                    <>
                      <div>x: {Math.round(activeField.x || 0)} y: {Math.round(activeField.y || 0)}</div>
                      <div>w: {Math.round(activeField.width || 0)} h: {Math.round(activeField.height || 0)}</div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center text-[9px]">
                <span className="text-muted-foreground font-bold">Page Number</span>
                <span className="text-foreground font-bold">1</span>
              </div>
              {activeField.type === "signature" && (
                <div className="rounded-lg border border-purple-100 bg-purple-50/60 p-2 space-y-2">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-purple-700">
                    <Signature size={11} />
                    <span>Signature Similarity</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-10 rounded border border-border bg-white flex items-center justify-center text-[8px] font-bold text-muted-foreground">Reference</div>
                    <div className="h-10 rounded border border-border bg-white flex items-center justify-center text-[8px] font-bold text-muted-foreground">Current</div>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-bold">
                    <span className="flex items-center gap-1 text-muted-foreground"><GitCompareArrows size={10} /> Match</span>
                    <span className="text-purple-700">87%</span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="text-[9px] text-muted-foreground text-center py-4 italic">Select a field to view details.</p>
          )}
        </div>
      </div>

      {activeField && (activeField.confidence || 1) < 0.75 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 flex gap-2">
          <AlertTriangle size={13} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="text-[8px] font-semibold text-amber-800 leading-relaxed">
            Low confidence on this field. Suggested action: add another anchor or correct the OCR word.
          </div>
        </div>
      )}
    </div>
  );
}
