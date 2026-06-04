"use client";

import React from "react";
import { 
  Zap, 
  Cpu, 
  Brain, 
  Repeat, 
  Database, 
  LayoutPanelTop,
  Search,
  GripVertical
} from "lucide-react";
import { cn } from "@/lib/utils";

const categories = [
  {
    name: "Triggers",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    nodes: [
      { id: "manual_trigger", label: "Manual Trigger", type: "trigger" },
      { id: "webhook_trigger", label: "Webhook Trigger", type: "trigger" },
      { id: "schedule_trigger", label: "Schedule Trigger", type: "trigger" },
    ],
  },
  {
    name: "AI Tools",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    nodes: [
      { id: "ai_prompt", label: "AI Prompt Node", type: "ai" },
      { id: "ai_summarize", label: "Summarize Text", type: "ai" },
      { id: "ai_classify", label: "Classify Intent", type: "ai" },
    ],
  },
  {
    name: "Actions",
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    nodes: [
      { id: "api_call", label: "HTTP Request", type: "action" },
      { id: "db_query", label: "Database Query", type: "action" },
      { id: "file_op", label: "File Operation", type: "action" },
    ],
  },
  {
    name: "Logic",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    nodes: [
      { id: "if_else", label: "IF / Else", type: "logic" },
      { id: "loop", label: "For Each Loop", type: "logic" },
      { id: "delay", label: "Wait / Delay", type: "logic" },
    ],
  },
];

export const NodePalette = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string, label: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.setData("application/label", label);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div className="w-72 h-full bg-background/40 backdrop-blur-3xl border-r border-border/40 flex flex-col pt-16">
       <div className="p-6 border-b border-border/40">
          <div className="flex items-center justify-between mb-4">
             <h3 className="text-sm font-black uppercase tracking-widest text-foreground">Instruction Palette</h3>
             <span className="text-[10px] font-bold text-muted-foreground opacity-50">v1.2.0</span>
          </div>
          <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
             <input 
               type="text" 
               placeholder="Search instructions..."
               className="w-full bg-background/50 border border-border/50 rounded-sm pl-9 pr-4 py-2 text-[10px] font-medium focus:outline-none focus:border-primary/50 transition-all"
             />
          </div>
       </div>

       <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
          {categories.map((cat) => (
            <div key={cat.name} className="flex flex-col gap-3">
               <span className={cn("text-[9px] font-black uppercase tracking-[0.3em] pl-2", cat.color)}>
                  {cat.name}
               </span>
               <div className="flex flex-col gap-2">
                  {cat.nodes.map((node) => (
                    <div 
                      key={node.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, node.type, node.label)}
                      className="group flex items-center justify-between p-3 bg-muted/20 border border-border/40 rounded-sm cursor-grab active:cursor-grabbing hover:bg-muted/40 hover:border-primary/20 transition-all"
                    >
                       <div className="flex items-center gap-3">
                          <div className={cn("w-6 h-6 rounded-sm flex items-center justify-center", cat.bg)}>
                             {cat.name === "Triggers" ? <Zap className="w-3.5 h-3.5" /> : cat.name === "AI Tools" ? <Brain className="w-3.5 h-3.5" /> : cat.name === "Actions" ? <Cpu className="w-3.5 h-3.5" /> : <Repeat className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-[10px] font-bold group-hover:text-foreground transition-colors">{node.label}</span>
                       </div>
                       <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
               </div>
            </div>
          ))}
       </div>

       <div className="p-4 border-t border-border/40 bg-background/40">
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-sm flex items-center gap-3">
             <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
             <span className="text-[9px] font-bold text-primary uppercase tracking-widest">Sovereign Validation Active</span>
          </div>
       </div>
    </div>
  );
};
