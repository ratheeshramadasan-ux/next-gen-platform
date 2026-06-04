"use client";

import React, { useState } from "react";
import { useWorkflow } from "./workflow-store";
import { Terminal, X, ChevronDown, ChevronUp, Trash2, Send, Activity, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const ExecutionConsole = () => {
  const { state, dispatch } = useWorkflow();
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={cn(
      "absolute bottom-0 left-72 right-80 bg-background/80 backdrop-blur-3xl border-t border-border/40 z-30 transition-all duration-300",
      isExpanded ? "h-64" : "h-12"
    )}>
       {/* Header */}
       <div 
         onClick={() => setIsExpanded(!isExpanded)}
         className="h-12 px-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors border-b border-white/5"
       >
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Execution Console</span>
             </div>
             <div className="w-[1px] h-3 bg-white/10" />
             <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Live Stream Active</span>
             </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-widest text-muted-foreground/40">
                <div className="flex items-center gap-1.5">
                   <Clock className="w-3 h-3" />
                   Latency: 0.4ms
                </div>
                <div className="flex items-center gap-1.5">
                   <Activity className="w-3 h-3" />
                   Steps: {state.logs.length}
                </div>
             </div>
             <button className="text-muted-foreground hover:text-foreground">
                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
             </button>
          </div>
       </div>

       {/* Log Stream */}
       <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-6 h-[calc(100%-48px)] overflow-y-auto font-mono text-[10px] flex flex-col gap-2"
            >
               {state.logs.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full opacity-20 gap-2">
                    <Terminal className="w-8 h-8" />
                    <span className="font-bold uppercase tracking-widest">Awaiting Simulation Initialization...</span>
                 </div>
               )}
               {state.logs.map((log, i) => (
                 <div key={i} className="flex gap-4 group">
                    <span className="text-muted-foreground/30 flex-shrink-0">[{log.timestamp}]</span>
                    <span className={cn(
                      "font-black uppercase flex-shrink-0",
                      log.level === "INFO" ? "text-primary/60" : log.level === "WARN" ? "text-amber-500/60" : "text-rose-500/60"
                    )}>[{log.level}]</span>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{log.message}</span>
                 </div>
               ))}
               <div className="mt-auto h-0" />
            </motion.div>
          )}
       </AnimatePresence>
    </div>
  );
};
