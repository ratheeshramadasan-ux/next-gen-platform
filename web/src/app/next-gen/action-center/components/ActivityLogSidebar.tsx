"use client";

import React from "react";
import { History, X, User, Bot, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const ActivityLogSidebar = ({ onClose }: { onClose: () => void }) => {
  const logs = [
    { id: "1", user: "Alex Chen", action: "updated field", target: "PO Number", oldValue: "PO-992-8", newValue: "PO-992-B", time: "2 min ago", type: "user" },
    { id: "2", user: "Alex Chen", action: "validated section", target: "Financials section approved", time: "15 min ago", type: "user" },
    { id: "3", user: "NexusAI System", action: "Document extracted", target: "Invoice-v3.1-Enterprise model", time: "2 hrs ago", type: "system", stats: { fields: 14, tables: 2 } },
  ];

  return (
    <div className="w-72 border-l border-border bg-background flex flex-col shrink-0 overflow-hidden">
      <div className="h-14 px-4 border-b border-border bg-muted/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History size={16} className="text-muted-foreground" />
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Activity Log</h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 hover:bg-muted rounded-sm text-muted-foreground transition-all"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar relative">
        <div className="absolute left-6 top-6 bottom-6 w-px bg-border border-dashed" />
        
        <div className="space-y-8 relative">
          {logs.map((log) => (
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               key={log.id} 
               className="flex gap-4 group"
             >
                <div className={cn(
                  "w-4 h-4 rounded-full mt-1 border-2 border-background z-10",
                  log.type === "user" ? "bg-indigo-500" : "bg-muted-foreground opacity-50"
                )} />
                
                <div className="flex-1 space-y-3">
                   <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                         {log.type === "user" ? (
                           <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                             <User size={10} className="text-primary"/>
                           </div>
                         ) : (
                           <div className="w-5 h-5 rounded-full bg-muted/10 flex items-center justify-center border border-border">
                             <Bot size={10} className="text-muted-foreground"/>
                           </div>
                         )}
                         <span className="text-[10px] font-black">{log.user}</span>
                      </div>
                      <span className="text-[9px] text-muted-foreground font-bold whitespace-nowrap">{log.time}</span>
                   </div>

                   <div className="p-3 bg-muted/20 border border-border rounded-sm space-y-2 group-hover:bg-muted/30 transition-all">
                      <p className="text-[10px] font-medium text-muted-foreground">
                        {log.action} <span className="text-foreground font-bold">{log.target}</span>
                      </p>
                      
                      {log.oldValue && (
                        <div className="flex items-center gap-2 text-[10px] tabular-nums font-bold">
                           <span className="text-rose-500 line-through opacity-50">{log.oldValue}</span>
                           <span className="text-muted-foreground opacity-30">→</span>
                           <span className="text-emerald-500">{log.newValue}</span>
                        </div>
                      )}

                      {log.stats && (
                        <div className="flex gap-2">
                           <span className="px-1.5 py-0.5 bg-background border border-border rounded-sm text-[8px] font-black uppercase text-muted-foreground">{log.stats.fields} fields</span>
                           <span className="px-1.5 py-0.5 bg-background border border-border rounded-sm text-[8px] font-black uppercase text-muted-foreground">{log.stats.tables} tables</span>
                        </div>
                      )}
                   </div>
                </div>
             </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
