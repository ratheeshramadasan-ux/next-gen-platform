"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Logo from "./logo";
import { Cpu, ShieldCheck, Zap, Globe } from "lucide-react";

export const EntranceGuard = ({ children }: { children: React.ReactNode }) => {
  const [isSyncing, setIsSyncing] = useState(true);
  const [stage, setStage] = useState(0);

  const stages = [
    { label: "Initializing Sovereign Mesh", icon: Globe },
    { label: "Validating Identity Token", icon: ShieldCheck },
    { label: "Orchestrating AI Kernel", icon: Cpu },
    { label: "Synchronizing Executive Pulse", icon: Zap },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStage((prev) => {
        if (prev >= stages.length - 1) {
          clearInterval(timer);
          setTimeout(() => setIsSyncing(false), 500);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-[#020202] flex flex-col items-center justify-center p-6"
          >
            {/* Background Ambience */}
            <div className="absolute inset-0 z-0">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
               <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)_0.5px,transparent_0.5px)] [background-size:32px_32px] opacity-10" />
            </div>

            <div className="relative z-10 flex flex-col items-center">
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-24 h-24 rounded-sm bg-white text-black flex items-center justify-center shadow-2xl shadow-primary/20 mb-12"
              >
                <Logo size={56} />
              </motion.div>

              <div className="flex flex-col items-center gap-6 w-full max-w-xs">
                 <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                       initial={{ width: "0%" }}
                       animate={{ width: `${((stage + 1) / stages.length) * 100}%` }}
                       className="h-full bg-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                    />
                 </div>

                 <AnimatePresence mode="wait">
                    <motion.div 
                      key={stage}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex flex-col items-center gap-2"
                    >
                       <div className="flex items-center gap-2 text-primary font-black uppercase tracking-[0.3em] text-[10px]">
                          {React.createElement(stages[stage].icon, { className: "w-3 h-3" })}
                          Syncing Platform
                       </div>
                       <span className="text-xs font-bold text-white tracking-tight">{stages[stage].label}</span>
                       <span className="text-[9px] font-mono text-muted-foreground opacity-50">NODE_ACK::SUCCESS ({(stage + 1) * 25}%)</span>
                    </motion.div>
                 </AnimatePresence>
              </div>
            </div>

            {/* Matrix Decorative Stream */}
            <div className="absolute bottom-10 left-10 flex flex-col gap-1 opacity-20">
               <span className="text-[8px] font-mono text-primary">KERNEL_BOOT_LEVEL_7</span>
               <span className="text-[8px] font-mono text-white/40">SHA-256::VERIFIED</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {!isSyncing && children}
    </>
  );
};
