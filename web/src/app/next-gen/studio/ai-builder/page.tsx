"use client";

import React from "react";
import { BrainCircuit, Sparkles, MessageSquare, Wand2 } from "lucide-react";
import { motion } from "framer-motion";

export default function AIBuilderPage() {
  return (
    <div className="h-full flex items-center justify-center overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-lg space-y-8 p-8"
      >
        <div className="relative mx-auto w-24 h-24">
          <div className="absolute inset-0 bg-primary/10 rounded-2xl animate-pulse" />
          <div className="relative w-full h-full rounded-2xl bg-gradient-to-br from-primary/20 to-primary/30 border border-primary/20 flex items-center justify-center">
            <BrainCircuit size={40} className="text-primary" />
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight">Agent Builder</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-sm">
              Coming Soon
            </span>
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Describe your automation in plain language and AI will generate a complete workflow for you.
            No drag-and-drop required — just tell the AI what you need automated.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4 pt-4">
          {[
            { icon: MessageSquare, title: "Natural Language", desc: "Describe in your own words" },
            { icon: Wand2, title: "Auto-Generate", desc: "AI builds the flow" },
            { icon: Sparkles, title: "Smart Refinement", desc: "Iterate and improve" },
          ].map((feature, i) => (
            <div key={i} className="flex flex-col items-center gap-2 p-4 bg-card/40 border border-border/30 rounded-sm">
              <feature.icon size={20} className="text-primary/60" />
              <span className="text-[11px] font-bold text-foreground/70">{feature.title}</span>
              <span className="text-[10px] text-muted-foreground/50">{feature.desc}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
