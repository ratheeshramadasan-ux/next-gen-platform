"use client";

import React from "react";
import { motion } from "framer-motion";
import { Zap, Shield, Brain, Workflow, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export const KernelPulse = () => {
  const nodes = [
    { icon: Brain, label: "Agent Scounts", color: "text-primary", angle: 0 },
    { icon: Workflow, label: "Execution Kernels", color: "text-amber-500", angle: 72 },
    { icon: Shield, label: "SEPS Governance", color: "text-emerald-500", angle: 144 },
    { icon: Zap, label: "Resource Provisioning", color: "text-rose-500", angle: 216 },
    { icon: Globe, label: "Federated Mesh", color: "text-blue-500", angle: 288 },
  ];

  return (
    <div className="relative w-full h-[300px] flex items-center justify-center overflow-hidden bg-background/5 rounded-sm border border-border/40 studio-grid-dots">
      {/* Central Core */}
      <div className="relative z-20">
         <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.8, 1, 0.8]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-20 h-20 rounded-sm bg-primary/20 backdrop-blur-3xl border border-primary/40 flex items-center justify-center shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)]"
         >
            <div className="w-10 h-10 rounded-sm bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
               <Zap className="w-6 h-6 animate-pulse" />
            </div>
         </motion.div>
         
         {/* Ripples */}
         {[1, 2, 3].map((i) => (
           <motion.div 
             key={i}
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 3, opacity: 0 }}
             transition={{ duration: 3, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
             className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-primary/30"
           />
         ))}
      </div>

      {/* Satellite Nodes */}
      {nodes.map((node, i) => (
        <motion.div
          key={i}
          initial={false}
          animate={{
            x: Math.cos(node.angle * (Math.PI / 180)) * 120,
            y: Math.sin(node.angle * (Math.PI / 180)) * 120,
          }}
          className="absolute z-30"
        >
          <div className="flex flex-col items-center gap-2 group cursor-pointer transition-all hover:scale-110">
             <div className="w-10 h-10 rounded-sm bg-background border border-border/50 flex items-center justify-center shadow-md relative">
                <node.icon className={cn("w-5 h-5", node.color)} />
                <motion.div 
                   animate={{ scale: [1, 1.5, 1], opacity: [0, 0.2, 0] }}
                   transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
                   className={cn("absolute inset-0 rounded-sm", node.color.replace('text-', 'bg-'))}
                />
             </div>
             <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-background px-2 py-0.5 rounded border border-border/50 shadow-sm whitespace-nowrap">
                {node.label}
             </span>
          </div>
          
          {/* Connection Line */}
          <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none overflow-visible" width="300" height="300">
             <motion.line 
               x1="0" y1="0"
               x2={-Math.cos(node.angle * (Math.PI / 180)) * 120}
               y2={-Math.sin(node.angle * (Math.PI / 180)) * 120}
               stroke="currentColor"
               strokeWidth="0.5"
               className="text-primary/20"
               strokeDasharray="4 4"
               animate={{ strokeDashoffset: [0, -20] }}
               transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
             />
          </svg>
        </motion.div>
      ))}

      {/* Decorative Orbs */}
      <motion.div 
         animate={{ rotate: 360 }}
         transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
         className="absolute inset-0 pointer-events-none opacity-20"
      >
         {[...Array(20)].map((_, i) => (
           <div 
             key={i}
             className="absolute w-1 h-1 bg-primary rounded-full"
             style={{
               top: `${Math.random() * 100}%`,
               left: `${Math.random() * 100}%`,
               opacity: Math.random()
             }}
           />
         ))}
      </motion.div>
    </div>
  );
};
