"use client";

import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Brain, Workflow, ShieldCheck, Monitor, CreditCard, ChevronRight, Activity, Database, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { ModuleDossier } from "@/app/actions/blueprintActions";

interface BlueprintCanvasProps {
  modules: ModuleDossier[];
  onSelect: (module: ModuleDossier) => void;
  selectedId?: string;
}

export const BlueprintCanvas = ({ modules, onSelect, selectedId }: BlueprintCanvasProps) => {
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const nodePositions: Record<string, { x: number; y: number }> = {
    ai_hub: { x: 300, y: 150 },
    automation: { x: 600, y: 150 },
    governance: { x: 600, y: 400 },
    monitoring: { x: 300, y: 400 },
    billing: { x: 100, y: 400 },
  };

  const connections = [
    { from: "ai_hub", to: "automation" },
    { from: "automation", to: "governance" },
    { from: "governance", to: "monitoring" },
    { from: "monitoring", to: "billing" },
    { from: "monitoring", to: "ai_hub" },
  ];

  const getIcon = (id: string) => {
    switch (id) {
      case "ai_hub": return Brain;
      case "automation": return Workflow;
      case "governance": return ShieldCheck;
      case "monitoring": return Monitor;
      case "billing": return CreditCard;
      default: return Activity;
    }
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-[600px] bg-[#020202] rounded-sm border border-white/5 overflow-hidden cursor-grab active:cursor-grabbing group"
    >
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ 
          backgroundImage: `radial-gradient(var(--primary) 0.5px, transparent 0.5px)`,
          backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
          transform: `translate(${offset.x}px, ${offset.y}px)`
        }}
      />

      <motion.div 
        animate={{ scale: zoom, x: offset.x, y: offset.y }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
        className="relative w-full h-full"
      >
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill="rgba(var(--primary-rgb), 0.2)" />
            </marker>
          </defs>
          
          {connections.map((conn, i) => {
            const start = nodePositions[conn.from];
            const end = nodePositions[conn.to];
            if (!start || !end) return null;
            
            return (
              <g key={i}>
                <motion.path 
                  d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                  stroke="rgba(var(--primary-rgb), 0.15)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  animate={{ strokeDashoffset: [0, -20] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                />
              </g>
            );
          })}
        </svg>

        {modules.map((module) => {
          const pos = nodePositions[module.id] || { x: 100, y: 100 };
          const Icon = getIcon(module.id);
          const isSelected = selectedId === module.id;

          return (
            <motion.div
              key={module.id}
              initial={false}
              animate={{ x: pos.x - 40, y: pos.y - 40 }}
              onClick={() => onSelect(module)}
              className="absolute z-10"
            >
              <div 
                className={cn(
                  "flex flex-col items-center gap-3 group transition-all duration-300",
                  isSelected ? "scale-110" : "hover:scale-105"
                )}
              >
                <div className={cn(
                  "w-20 h-20 rounded-sm bg-background/40 backdrop-blur-3xl border flex items-center justify-center shadow-2xl relative transition-all",
                  isSelected ? "border-primary shadow-primary/20 ring-4 ring-primary/10" : "border-white/10 hover:border-primary/40",
                  module.status === "ERROR" && "border-rose-500/50 shadow-rose-500/10"
                )}>
                   <Icon className={cn(
                      "w-8 h-8", 
                      isSelected ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors",
                      module.status === "ERROR" && "text-rose-500"
                   )} />
                   
                   {module.status === "ERROR" && (
                     <motion.div 
                        animate={{ scale: [1, 1.4, 1], opacity: [0.1, 0.3, 0.1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-x-[-10px] inset-y-[-10px] bg-rose-500 rounded-full blur-xl pointer-events-none"
                     />
                   )}
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-[10px] font-black uppercase tracking-widest text-foreground group-hover:text-primary transition-colors">
                      {module.label}
                   </span>
                   {module.activeAgents > 0 && (
                     <div className="flex items-center gap-1 mt-1">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter">
                           {module.activeAgents} Agents Active
                        </span>
                     </div>
                   )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Control UI */}
      <div className="absolute bottom-6 right-6 flex items-center gap-2 z-20">
         <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-sm p-2 flex items-center gap-2">
            <button 
              onClick={() => setZoom(prev => Math.min(prev + 0.2, 2))}
              className="w-8 h-8 rounded-sm hover:bg-white/5 flex items-center justify-center font-bold text-lg"
            >+</button>
            <div className="w-[1px] h-4 bg-white/10 mx-1" />
            <button 
              onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.5))}
              className="w-8 h-8 rounded-sm hover:bg-white/5 flex items-center justify-center font-bold text-lg"
            >-</button>
         </div>
      </div>

      <div className="absolute top-6 left-6 z-20">
         <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-full px-4 py-2 flex items-center gap-3">
            <div className="flex items-center gap-1.5">
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Kernel Online</span>
            </div>
            <div className="w-[1px] h-3 bg-white/10" />
            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">15 Schemas Linked</span>
         </div>
      </div>
    </div>
  );
};
