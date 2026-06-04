"use client";

import React, { useState } from "react";
import { Sparkles, Brain, Award, Activity, CheckCircle, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export function TrainingPanel() {
  const [modelPrecision, setModelPrecision] = useState(97.8);
  const [learningRate, setLearningRate] = useState("Active (Real-time)");
  const [datasetCount, setDatasetCount] = useState(148);

  const correctionsLogs = [
    { text: "Corrected '1O00' to '1000' on Page 2", time: "2 min ago", type: "OCR Auto-correct" },
    { text: "Adjusted 'Given Names' positional neighbor anchor", time: "10 min ago", type: "Positional Anchor" },
    { text: "Bound 'Expiry Date' field to bottom semantic zone", time: "1 hour ago", type: "Semantic Anchor" }
  ];

  return (
    <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-card/60 shadow-lg text-foreground/80">
      
      {/* Header Panel */}
      <div className="flex items-center justify-between border-b border-border/50 pb-2.5">
        <div className="flex items-center gap-2">
          <Brain size={14} className="text-violet-400" />
          <span className="text-[10px] font-black text-foreground/80 uppercase tracking-widest">
            Continuous Training
          </span>
        </div>
        <span className="text-[7px] font-black text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full uppercase">
          Learning Loop
        </span>
      </div>

      {/* Learning Concept Banner */}
      <div className="p-3 bg-indigo-500/5 rounded-xl border border-indigo-500/10 text-foreground/80">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Sparkles size={11} className="text-indigo-400 animate-pulse" />
          <span className="text-[9px] font-black uppercase text-indigo-300 tracking-wider">
            Teaching the System
          </span>
        </div>
        <p className="text-[8px] text-muted-foreground leading-normal uppercase">
          Every correction, anchor link, and bounding box validation you create is automatically memorized to rebuild the hybrid spatial extraction grid!
        </p>
      </div>

      {/* Model Performance metrics */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-muted/30 border border-border/50 p-2.5 rounded-lg text-center flex flex-col justify-center">
          <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Model Precision
          </span>
          <span className="text-[15px] font-black text-violet-400 tracking-tight">
            {modelPrecision}%
          </span>
          <span className="text-[6px] text-muted-foreground/60 uppercase font-bold mt-0.5">
            +0.4% this session
          </span>
        </div>

        <div className="bg-muted/30 border border-border/50 p-2.5 rounded-lg text-center flex flex-col justify-center">
          <span className="text-[7px] font-black text-muted-foreground uppercase tracking-widest mb-1">
            Training Assets
          </span>
          <span className="text-[15px] font-black text-indigo-400 tracking-tight">
            {datasetCount}
          </span>
          <span className="text-[6px] text-muted-foreground/60 uppercase font-bold mt-0.5">
            14 active classes
          </span>
        </div>
      </div>

      {/* Corrections Loop list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
            Active Correction Feed
          </span>
          <span className="text-[6.5px] text-muted-foreground/60">3 Logs Tracked</span>
        </div>

        <div className="space-y-1.5">
          {correctionsLogs.map((log, idx) => (
            <div 
              key={idx} 
              className="flex items-start gap-2.5 bg-background/50 p-2 rounded-lg border border-border/40 text-[8px]"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-violet-500 mt-1 shrink-0" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-extrabold text-foreground/80 uppercase leading-normal tracking-tight">
                  {log.text}
                </span>
                <div className="flex items-center gap-1.5 text-[6.5px] text-muted-foreground font-bold uppercase mt-0.5">
                  <span className="text-muted-foreground/60">{log.time}</span>
                  <span>•</span>
                  <span className="text-violet-500">{log.type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action to Train Model */}
      <button 
        className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-95 text-white text-[9px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
      >
        <Zap size={11} className="text-white animate-bounce" />
        Compile Continuous Learning
      </button>

    </div>
  );
}
export default TrainingPanel;
