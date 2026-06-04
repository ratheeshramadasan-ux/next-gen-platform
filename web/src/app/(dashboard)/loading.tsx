"use client";

import React from "react";
import { motion } from "framer-motion";

export default function DashboardLoading() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-6 p-8">
      {/* High-fidelity Spinner */}
      <div className="relative w-24 h-24">
         <motion.div 
            className="absolute inset-0 border-4 border-primary/20 rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
         />
         <motion.div 
            className="absolute inset-0 border-4 border-t-primary border-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
         />
         <div className="absolute inset-4 bg-muted/30 backdrop-blur-md rounded-full shadow-[inset_0_0_20px_rgba(0,0,0,0.1)] flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
         </div>
      </div>

      <div className="flex flex-col items-center gap-1">
         <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground animate-pulse">Kernel Meshing...</h4>
         <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Synchronizing Spatial Telemetry</p>
      </div>

      <div className="w-48 h-1 bg-muted/40 rounded-full overflow-hidden relative">
         <motion.div 
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: ["0%", "40%", "45%", "90%", "100%"] }}
            transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.5, 0.9, 1] }}
         />
      </div>
    </div>
  );
}
