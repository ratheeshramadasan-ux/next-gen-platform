"use client";

import React, { useState } from "react";
import { RefreshCw, Compass, Sliders, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface RepeatRegionDesignerProps {
  regionName?: string;
  onConfigChange?: (config: any) => void;
}

export function RepeatRegionDesigner({ regionName = "Dependent Row Block", onConfigChange }: RepeatRegionDesignerProps) {
  const [config, setConfig] = useState({
    detectionMode: "AI" as "AI" | "Manual",
    minRepeats: 3,
    dynamicHeight: true,
    extractionDirection: "vertical" as "vertical" | "horizontal"
  });

  const updateConfig = (updates: Partial<typeof config>) => {
    const updated = { ...config, ...updates };
    setConfig(updated);
    if (onConfigChange) onConfigChange(updated);
  };

  // Convert technical label to business-friendly title
  const displayTitle = regionName === "Dependent Row Block" ? "Repeating Region Settings" : `${regionName} Settings`;

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-card/60 shadow-lg text-foreground/80 font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-1.5 border-b border-border/50 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RefreshCw size={14} className="text-indigo-400" />
            <span className="text-xs font-black text-foreground uppercase tracking-wider">
              {displayTitle}
            </span>
          </div>
          <span className="text-[8px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Regions
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          Repeating Regions define structures in a document (like rows in an invoice table or listing cards) that duplicate down or across pages for structured data capture.
        </p>
      </div>

      {/* Detection Mode Switcher */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] font-bold text-muted-foreground/90 uppercase tracking-wider">
          Row Detection Mode
        </label>
        <div className="grid grid-cols-2 gap-2 bg-muted/30 p-1 border border-border/50 rounded-lg">
          <button
            onClick={() => updateConfig({ detectionMode: "AI" })}
            className={cn(
              "py-1.5 rounded-md text-[10px] font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-transparent",
              config.detectionMode === "AI" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
            )}
          >
            <Sparkles size={11} />
            <span>AI Guided</span>
          </button>
          <button
            onClick={() => updateConfig({ detectionMode: "Manual" })}
            className={cn(
              "py-1.5 rounded-md text-[10px] font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-transparent",
              config.detectionMode === "Manual" 
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
            )}
          >
            <Sliders size={11} />
            <span>Manual Coordinates</span>
          </button>
        </div>
      </div>

      {/* Direction Selection */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[9px] font-bold text-muted-foreground/90 uppercase tracking-wider">
          Layout Flow Direction
        </label>
        <div className="grid grid-cols-2 gap-2 bg-muted/30 p-1 border border-border/50 rounded-lg">
          <button
            onClick={() => updateConfig({ extractionDirection: "vertical" })}
            className={cn(
              "py-1.5 rounded-md text-[10px] font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-transparent",
              config.extractionDirection === "vertical" 
                ? "bg-background text-indigo-400 border border-indigo-500/20 shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
            )}
          >
            <Compass size={11} className="rotate-90" />
            <span>Vertical Flow</span>
          </button>
          <button
            onClick={() => updateConfig({ extractionDirection: "horizontal" })}
            className={cn(
              "py-1.5 rounded-md text-[10px] font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-transparent",
              config.extractionDirection === "horizontal" 
                ? "bg-background text-indigo-400 border border-indigo-500/20 shadow-sm" 
                : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
            )}
          >
            <Compass size={11} />
            <span>Horizontal Flow</span>
          </button>
        </div>
      </div>

      {/* Minimum Repeats Slider */}
      <div className="flex flex-col gap-2 p-2.5 rounded-lg border border-border/50 bg-muted/20">
        <div className="flex items-center justify-between text-[9px] font-bold uppercase tracking-wider">
          <span className="text-muted-foreground/90">Minimum Expected Rows</span>
          <span className="text-indigo-400 font-extrabold">{config.minRepeats} iterations</span>
        </div>
        <input 
          type="range" 
          min="1" 
          max="10" 
          value={config.minRepeats} 
          onChange={(e) => updateConfig({ minRepeats: parseInt(e.target.value) })}
          className="w-full h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-600"
        />
      </div>

      {/* Dynamic Height Toggle */}
      <div 
        onClick={() => updateConfig({ dynamicHeight: !config.dynamicHeight })}
        className={cn(
          "flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all select-none",
          config.dynamicHeight 
            ? "border-indigo-500/20 bg-indigo-500/5" 
            : "border-border/50 bg-muted/10"
        )}
      >
        <div className="flex flex-col gap-0.5 min-w-0 pr-2">
          <span className={cn(
            "text-[10px] font-bold uppercase tracking-wide",
            config.dynamicHeight ? "text-indigo-300" : "text-muted-foreground"
          )}>
            Enable Variable Row Height
          </span>
          <span className="text-[8px] text-muted-foreground/80 leading-normal">
            Allows repeating boundaries to dynamically resize based on the text height.
          </span>
        </div>

        <div className={cn(
          "w-7 h-4 rounded-full p-0.5 transition-colors flex items-center shrink-0",
          config.dynamicHeight ? "bg-indigo-600 justify-end" : "bg-muted justify-start"
        )}>
          <div className="w-3 h-3 rounded-full bg-white shadow-md" />
        </div>
      </div>
    </div>
  );
}
export default RepeatRegionDesigner;
