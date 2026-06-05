"use client";

import React from "react";
import { Terminal, Cpu, Share2, ShieldQuestion, Activity, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { PulseEvent } from "@/app/actions/eventActions";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const EventHub = ({ events }: { events: PulseEvent[] }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case "AGENT": return <Cpu className="w-3.5 h-3.5" />;
      case "RESOURCE": return <Share2 className="w-3.5 h-3.5" />;
      case "GOVERNANCE": return <ShieldQuestion className="w-3.5 h-3.5" />;
      default: return <Activity className="w-3.5 h-3.5" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SUCCESS": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "ERROR": return "text-rose-500 bg-rose-500/10 border-rose-500/20";
      case "WARNING": return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default: return "text-primary bg-primary/10 border-primary/20";
    }
  };

  return (
    <div className="bg-background/20 backdrop-blur-md border border-border/40 rounded-sm overflow-hidden flex flex-col h-[400px]">
      <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
         <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-sm bg-background border border-border/50 flex items-center justify-center text-muted-foreground">
               <Terminal className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
               <h3 className="text-xs font-black uppercase tracking-widest text-foreground leading-none mb-1">Executive Event Hub</h3>
               <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter opacity-50">Live Meta-Kernel Operational Stream</span>
            </div>
         </div>
         <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Real-time</span>
         </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 scrollbar-hide">
         <AnimatePresence mode="popLayout">
            {events.map((event) => (
              <motion.div 
                key={event.id}
                initial={{ opacity: 0, x: -20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="group flex items-start gap-4 p-3 rounded-sm hover:bg-muted/40 transition-all cursor-pointer border border-transparent hover:border-border/30 overflow-hidden"
              >
                 <div className={cn("w-9 h-9 rounded-sm flex items-center justify-center flex-shrink-0 border", getStatusColor(event.status))}>
                    {getIcon(event.type)}
                 </div>
                 <div className="flex flex-col gap-1 min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                       <span className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">{event.type} SYNC</span>
                       <span className="text-[9px] font-mono font-bold text-muted-foreground/40">{format(new Date(event.timestamp), "HH:mm:ss.SS")}</span>
                    </div>
                    <div className="flex items-center gap-2 overflow-hidden">
                       <h4 className="text-xs font-bold text-foreground truncate">{event.label}</h4>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate opacity-70 leading-relaxed font-medium">
                       {event.message}
                    </p>
                 </div>
                 <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/20 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-1" />
              </motion.div>
            ))}
         </AnimatePresence>
      </div>

      <div className="p-3 bg-muted/10 border-t border-border/40 flex items-center justify-between">
         <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-emerald-500" />
               <span className="text-[8px] font-bold text-muted-foreground uppercase">2,442 Events/Hr</span>
            </div>
            <div className="flex items-center gap-1">
               <span className="w-1 h-1 rounded-full bg-amber-500" />
               <span className="text-[8px] font-bold text-muted-foreground uppercase">99.8% Kernel Sync</span>
            </div>
         </div>
         <button className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">Download Log Segment</button>
      </div>
    </div>
  );
};
