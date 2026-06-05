"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Zap, Shield, ChevronRight, TrendingUp, TrendingDown, LayoutDashboard } from "lucide-react";
import { cn } from "@/lib/utils";
import { SovereignBriefing } from "@/app/actions/briefingActions";
import { format } from "date-fns";

interface BriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: SovereignBriefing | null;
}

export const BriefingModal = ({ isOpen, onClose, data }: BriefingModalProps) => {
  if (!data) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl max-h-[90vh] z-[101] bg-background/40 backdrop-blur-3xl border border-white/10 rounded-sm shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/5">
               <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-sm bg-primary text-black flex items-center justify-center shadow-lg shadow-primary/20">
                     <Brain className="w-8 h-8" />
                  </div>
                  <div className="flex flex-col">
                     <h2 className="text-2xl font-black tracking-tighter uppercase leading-none mb-2">Sovereign Daily Briefing</h2>
                     <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Intelligence Synthesized: {format(new Date(data.timestamp), "MMM dd, HH:mm")}</span>
                        <div className="w-1 h-1 rounded-full bg-white/20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-50">Cluster Node Alpha-7</span>
                     </div>
                  </div>
               </div>
               <button 
                 onClick={onClose}
                 className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center transition-colors border border-transparent hover:border-white/10"
               >
                  <X className="w-5 h-5 text-muted-foreground" />
               </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-10 grid grid-cols-1 lg:grid-cols-3 gap-8">
               
               {/* Pulse Section - Main Summary */}
               <div className="lg:col-span-3 bg-primary/5 rounded-sm p-8 border border-primary/20 flex items-center justify-between mb-2">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Overall Platform Pulse</span>
                     <div className="flex items-baseline gap-4">
                        <h3 className="text-6xl font-black tracking-tighter text-primary">{data.pulseScore}<span className="text-2xl opacity-40">%</span></h3>
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-foreground">Operational Excellence</span>
                           <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">Global Sovereign Health</span>
                        </div>
                     </div>
                  </div>
                  <div className="h-20 w-[40%] bg-black/20 rounded-sm relative overflow-hidden flex items-center justify-center px-6">
                     <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)_0.5px,transparent_0.5px)] [background-size:16px_16px] opacity-10" />
                     <div className="flex flex-col gap-1 w-full relative z-10">
                        <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-primary/60">
                           <span>Infrastructure</span>
                           <span>98%</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                           <div className="w-[98%] h-full bg-primary" />
                        </div>
                     </div>
                  </div>
               </div>

               {/* Section Cards */}
               {Object.values(data.sections).map((section, i) => (
                 <div key={i} className="bg-white/5 rounded-sm p-8 border border-white/5 flex flex-col gap-6 group hover:border-primary/20 transition-all">
                    <div className="flex items-center justify-between">
                       <div className={cn(
                         "w-10 h-10 rounded-sm flex items-center justify-center border",
                         section.status === "HEALTHY" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-amber-500/10 border-amber-500/20 text-amber-500"
                       )}>
                          {i === 0 ? <Brain className="w-5 h-5" /> : i === 1 ? <Zap className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
                       </div>
                       <div className="flex items-center gap-1.5 px-2 py-1 bg-black/20 rounded-sm">
                          {section.trend === "UP" ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />}
                          <span className="text-[10px] font-black text-foreground">{section.count}</span>
                       </div>
                    </div>
                    <div className="flex flex-col gap-1">
                       <h4 className="text-sm font-black uppercase tracking-widest leading-none mb-1">{section.title}</h4>
                       <div className="h-px w-8 bg-primary/40 rounded-full" />
                    </div>
                    <div className="flex flex-col gap-3">
                       {section.insights.map((insight, j) => (
                         <div key={j} className="flex gap-3">
                            <div className="w-1 h-1 bg-primary rounded-full mt-1.5 flex-shrink-0" />
                            <p className="text-[10px] text-muted-foreground font-medium leading-relaxed">{insight}</p>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}

               {/* Recommendations Sidebar / Footer Area */}
               <div className="lg:col-span-3 border-t border-white/5 pt-8 mt-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground mb-6 text-center opacity-60">Sovereign Recommendations & Optimizations</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     {data.recommendations.map((rec, i) => (
                       <button 
                         key={i}
                         className="flex items-center justify-between p-5 bg-white/5 border border-white/5 rounded-sm group hover:bg-primary transition-all active:scale-[0.98]"
                       >
                          <div className="flex items-center gap-4">
                             <div className="w-8 h-8 rounded-sm bg-black/40 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                {rec.icon === "Zap" ? <Zap className="w-4 h-4 text-amber-500" /> : rec.icon === "Shield" ? <Shield className="w-4 h-4 text-emerald-500" /> : <Brain className="w-4 h-4 text-primary" />}
                             </div>
                             <span className="text-xs font-bold text-foreground group-hover:text-black transition-colors">{rec.label}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-black opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
                       </button>
                     ))}
                  </div>
               </div>
            </div>

            {/* Footer */}
            <div className="px-10 py-6 border-t border-white/5 flex items-center justify-between bg-black/20">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Autonomous Core Stable</span>
               </div>
               <button 
                  onClick={onClose}
                  className="px-8 py-2.5 bg-foreground text-background rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-primary transition-all"
               >
                  Sync & Close
               </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
