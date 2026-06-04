"use client";

import React, { useState } from "react";
import { ShieldCheck, CheckSquare, Sparkles, Filter, ChevronRight, HelpCircle, Anchor } from "lucide-react";
import { cn } from "@/lib/utils";

interface ValidationPanelProps {
  fieldName?: string;
  fieldType?: string;
  onSave?: (config: any) => void;
  boundAnchors?: any[];
  allAnchors?: any[];
  onBindAnchor?: (anchorId: string) => void;
  onUnbindAnchor?: (anchorId: string) => void;
  hasMapping?: boolean;
  onClearMapping?: () => void;
}

export function ValidationPanel({ 
  fieldName = "Passport Number", 
  fieldType = "text", 
  onSave,
  boundAnchors = [],
  allAnchors = [],
  onBindAnchor,
  onUnbindAnchor,
  hasMapping = false,
  onClearMapping
}: ValidationPanelProps) {
  const [config, setConfig] = useState({
    confidenceThreshold: 0.85,
    pageStrategy: "FIRST_PAGE",
    pageCondition: "",
    regexValidation: "^[A-Z0-9]{8,12}$",
    dataType: "Alphanumeric",
    normalization: "UPPERCASE_TRIM",
    fallbackLogic: "LLM_INFERENCE",
    aiAssistance: true,
    humanReviewEnabled: true,
    dateFormat: "YYYY-MM-DD",
    numberFormat: "Integer"
  });

  const handleChange = (key: keyof typeof config, value: any) => {
    const updated = { ...config, [key]: value };
    setConfig(updated);
    if (onSave) onSave(updated);
  };

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-card/60 shadow-lg text-foreground/80">
      
      {/* Title */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-400" />
          <span className="text-[10px] font-black text-foreground/80 uppercase tracking-widest">
            {fieldName} Rules
          </span>
        </div>
        <span className="text-[7px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase">
          Active Governance
        </span>
      </div>

      {/* Grid Properties */}
      <div className="space-y-3.5">
        
        {/* Extraction Page Strategy */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
            <span>Page Extraction Scope</span>
            <span className="text-muted-foreground/60 font-bold font-mono">strategy</span>
          </label>
          <select 
            value={config.pageStrategy}
            onChange={(e) => handleChange("pageStrategy", e.target.value)}
            className="w-full bg-background border border-border/50 rounded-lg p-2 text-[9px] font-bold uppercase outline-none focus:border-indigo-500 transition-colors"
          >
            <option value="FIRST_PAGE">First Page Only</option>
            <option value="LAST_PAGE">Last Page Only</option>
            <option value="ALL_PAGES">All Pages</option>
            <option value="PAGE_RANGE">Specific Page Range</option>
            <option value="CONDITIONAL_PAGES">Conditional Match Pages</option>
          </select>
        </div>

        {/* Regular Expression Validation */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
            Regex String Validation
          </label>
          <input
            type="text"
            value={config.regexValidation}
            onChange={(e) => handleChange("regexValidation", e.target.value)}
            className="w-full bg-background border border-border/50 rounded-lg p-2 text-[9px] font-mono outline-none text-indigo-300 focus:border-indigo-500 transition-colors"
            placeholder="e.g. ^[0-9]{5}$"
          />
        </div>
        {/* Date Extraction Format Confirmation (Conditional) */}
        {fieldType === "date" && (
          <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-primary/20 bg-primary/5">
            <label className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center justify-between">
              <span>Date Extraction Format</span>
              <span className="text-primary/60 font-bold font-mono">date_format</span>
            </label>
            <select 
              value={config.dateFormat}
              onChange={(e) => handleChange("dateFormat", e.target.value)}
              className="w-full bg-background border border-border/50 rounded-lg p-2 text-[9px] font-bold uppercase outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-05-26)</option>
              <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 26/05/2026)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 05/26/2026)</option>
              <option value="YYYY/MM/DD">YYYY/MM/DD (e.g. 2026/05/26)</option>
              <option value="DD-MM-YYYY">DD-MM-YYYY (e.g. 26-05-2026)</option>
              <option value="MMM D, YYYY">MMM D, YYYY (e.g. May 26, 2026)</option>
            </select>
            <span className="text-[7px] text-muted-foreground leading-tight">
              Confirm targeted extraction and display date layout normalization format.
            </span>
          </div>
        )}

        {/* Number Extraction Format Confirmation (Conditional) */}
        {fieldType === "number" && (
          <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-primary/20 bg-primary/5">
            <label className="text-[8px] font-black text-primary uppercase tracking-widest flex items-center justify-between">
              <span>Number Extraction Format</span>
              <span className="text-primary/60 font-bold font-mono">number_format</span>
            </label>
            <select 
              value={config.numberFormat}
              onChange={(e) => handleChange("numberFormat", e.target.value)}
              className="w-full bg-background border border-border/50 rounded-lg p-2 text-[9px] font-bold uppercase outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="Integer">Integer (e.g. 12345)</option>
              <option value="Decimal">Decimal (e.g. 12345.67)</option>
              <option value="Currency_USD">Currency USD ($12,345.67)</option>
              <option value="Currency_EUR">Currency EUR (€12.345,67)</option>
              <option value="Currency_INR">Currency INR (₹12,345.67)</option>
              <option value="Percentage">Percentage (e.g. 85.5%)</option>
            </select>
            <span className="text-[7px] text-muted-foreground leading-tight">
              Confirm targeted numeric pattern, currency, or precision format.
            </span>
          </div>
        )}

        {/* Normalization & Data Type */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
              Data Normalizer
            </label>
            <select 
              value={config.normalization}
              onChange={(e) => handleChange("normalization", e.target.value)}
              className="w-full bg-background border border-border/50 rounded-lg p-2 text-[9px] font-bold uppercase outline-none"
            >
              <option value="UPPERCASE_TRIM">Upper & Trim</option>
              <option value="LOWERCASE">Lowercase</option>
              <option value="REMOVE_SPACES">Remove spaces</option>
              <option value="DATE_ISO">Date (ISO 8601)</option>
              <option value="NUMERIC_CLEAN">Clean Non-digits</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
              Fallback Strategy
            </label>
            <select 
              value={config.fallbackLogic}
              onChange={(e) => handleChange("fallbackLogic", e.target.value)}
              className="w-full bg-background border border-border/50 rounded-lg p-2 text-[9px] font-bold uppercase outline-none"
            >
              <option value="LLM_INFERENCE">AI Inference</option>
              <option value="MANUAL_REVIEW">Queue Manual Review</option>
              <option value="DEFAULT_VALUE">Static Default Value</option>
              <option value="IGNORE_FIELD">Ignore & Proceed</option>
            </select>
          </div>
        </div>

        {/* Confidence Threshold */}
        <div className="flex flex-col gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/20">
          <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-widest">
            <span className="text-muted-foreground">Confidence Threshold Limit</span>
            <span className="text-emerald-400">{Math.round(config.confidenceThreshold * 100)}% Match</span>
          </div>
          <input 
            type="range" 
            min="0.1" 
            max="1.0" 
            step="0.05"
            value={config.confidenceThreshold} 
            onChange={(e) => handleChange("confidenceThreshold", parseFloat(e.target.value))}
            className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="text-[6.5px] text-muted-foreground leading-tight">
            Extractions yielding confidence scores below this threshold will immediately trigger fallback rules or human queue routes.
          </span>
        </div>

        {/* Anchors scope */}
        <div className="flex flex-col gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/20">
          <label className="text-[8px] font-black text-muted-foreground uppercase tracking-widest flex items-center justify-between">
            <span>Bound Position Anchors</span>
            <span className="text-amber-500 font-extrabold flex items-center gap-1">
              <Anchor size={9} />
              Anchors
            </span>
          </label>
          
          {boundAnchors.length === 0 ? (
            <p className="text-[8px] text-muted-foreground italic">No anchors bound. Select an area on the canvas and map as Anchor to reference this field.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {boundAnchors.map(anchor => (
                <span key={anchor.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-[8px] font-bold text-amber-500 uppercase">
                  {anchor.value}
                  <button 
                    onClick={() => onUnbindAnchor && onUnbindAnchor(anchor.id)}
                    className="hover:text-rose-500 text-amber-500/60 font-black ml-1.5 text-[10px]"
                    title="Unlink Anchor"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {allAnchors.length > boundAnchors.length && (
            <select 
              onChange={(e) => {
                if (e.target.value && onBindAnchor) {
                  onBindAnchor(e.target.value);
                  e.target.value = "";
                }
              }}
              className="w-full bg-background border border-border/50 rounded-lg p-1.5 text-[8px] font-bold uppercase mt-1 outline-none cursor-pointer focus:border-amber-500"
              defaultValue=""
            >
              <option value="" disabled>+ Bind Position Anchor...</option>
              {allAnchors.filter(a => !boundAnchors.some(ba => ba.id === a.id)).map(a => (
                <option key={a.id} value={a.id}>{a.value}</option>
              ))}
            </select>
          )}
        </div>

        {/* AI Assisted Suggestions */}
        {fieldName && fieldName !== "Select a Field" && (
          <div className="flex flex-col gap-2.5 p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5 shadow-[0_0_15px_rgba(99,102,241,0.05)]">
            <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <Sparkles size={10} />
              <span>AI Assisted Suggestions</span>
            </label>
            <div className="space-y-1.5 text-[9px] font-bold text-foreground/80">
              <div className="flex justify-between items-center bg-background/50 p-1.5 rounded border border-border/30">
                <span className="text-muted-foreground text-[8px] uppercase">Detected Label:</span>
                <span>"{fieldName}"</span>
              </div>
              <div className="flex justify-between items-center bg-background/50 p-1.5 rounded border border-border/30">
                <span className="text-muted-foreground text-[8px] uppercase">Nearby Anchor:</span>
                <span className="text-amber-500">"Name"</span>
              </div>
              <div className="flex justify-between items-center bg-background/50 p-1.5 rounded border border-border/30">
                <span className="text-muted-foreground text-[8px] uppercase">Regex Pattern:</span>
                <span className="font-mono text-indigo-300">
                  {fieldName.toLowerCase().includes("date") 
                    ? "DD/MM/YYYY" 
                    : fieldName.toLowerCase().includes("number") 
                    ? "^[A-Z0-9]{8,12}$" 
                    : ".*"}
                </span>
              </div>
              <div className="flex justify-between items-center bg-background/50 p-1.5 rounded border border-border/30">
                <span className="text-muted-foreground text-[8px] uppercase">Confidence Est:</span>
                <span className="text-emerald-400">97% Match</span>
              </div>
            </div>
            <button 
              onClick={() => {
                const pat = fieldName.toLowerCase().includes("date") 
                  ? "DD/MM/YYYY" 
                  : fieldName.toLowerCase().includes("number") 
                  ? "^[A-Z0-9]{8,12}$" 
                  : ".*";
                handleChange("regexValidation", pat);
              }}
              className="w-full h-7 rounded bg-indigo-500 hover:bg-indigo-600 text-white text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 mt-1 shadow-md shadow-indigo-500/10"
            >
              Apply AI Suggestions
            </button>
          </div>
        )}

        {/* Toggles */}
        <div className="space-y-2">
          
          {/* AI Assistance */}
          <div 
            onClick={() => handleChange("aiAssistance", !config.aiAssistance)}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all select-none",
              config.aiAssistance ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/50 bg-muted/10"
            )}
          >
            <div className="flex items-center gap-2">
              <Sparkles size={11} className={config.aiAssistance ? "text-emerald-400 animate-pulse" : "text-muted-foreground"} />
              <span className={cn("text-[9px] font-black uppercase tracking-tight", config.aiAssistance ? "text-emerald-300" : "text-muted-foreground")}>
                AI Assistance & Correction
              </span>
            </div>
            <div className={cn("w-6 h-3 rounded-full p-0.5 transition-colors flex items-center", config.aiAssistance ? "bg-emerald-500 justify-end" : "bg-muted justify-start")}>
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md" />
            </div>
          </div>

          {/* Human Review Trigger */}
          <div 
            onClick={() => handleChange("humanReviewEnabled", !config.humanReviewEnabled)}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all select-none",
              config.humanReviewEnabled ? "border-emerald-500/20 bg-emerald-500/5" : "border-border/50 bg-muted/10"
            )}
          >
            <div className="flex items-center gap-2">
              <CheckSquare size={11} className={config.humanReviewEnabled ? "text-emerald-400" : "text-muted-foreground"} />
              <span className={cn("text-[9px] font-black uppercase tracking-tight", config.humanReviewEnabled ? "text-emerald-300" : "text-muted-foreground")}>
                Force Human Verification
              </span>
            </div>
            <div className={cn("w-6 h-3 rounded-full p-0.5 transition-colors flex items-center", config.humanReviewEnabled ? "bg-emerald-500 justify-end" : "bg-muted justify-start")}>
              <div className="w-2.5 h-2.5 rounded-full bg-white shadow-md" />
            </div>
          </div>
        </div>

        {hasMapping && onClearMapping && (
          <button
            onClick={onClearMapping}
            className="w-full mt-2 h-9 rounded-xl bg-rose-950/40 hover:bg-rose-950/60 border border-rose-500/30 text-rose-400 text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/20"
          >
            Clear Highlight Coordinates
          </button>
        )}

      </div>
    </div>
  );
}
export default ValidationPanel;
