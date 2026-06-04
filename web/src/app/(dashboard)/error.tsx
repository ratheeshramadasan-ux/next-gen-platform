"use client";

import React, { useEffect } from "react";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { ShieldAlert, RefreshCcw, Home, Terminal } from "lucide-react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard Level Error:", error);
  }, [error]);

  return (
    <div className="w-full h-full flex items-center justify-center p-8 bg-background/20 backdrop-blur-sm">
      <div className="max-w-md w-full bg-background border border-border/60 rounded-[3rem] p-10 flex flex-col items-center text-center gap-6 shadow-2xl relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 blur-3xl -mr-16 -mt-16" />
         
         <div className="w-20 h-20 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500 mb-2">
            <ShieldAlert className="w-10 h-10" />
         </div>

         <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Kernel Fault Detected</h1>
            <p className="text-xs font-medium text-muted-foreground leading-relaxed">
               The orbital processing layer encountered an unhandled exception. Sovereign safety protocols have initiated a containment wrap.
            </p>
         </div>

         {error.digest && (
            <div className="bg-muted/30 border border-border/40 px-4 py-2 rounded-xl flex items-center gap-3">
               <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
               <span className="text-[10px] font-mono font-bold text-muted-foreground uppercase opacity-60">Digest: {error.digest}</span>
            </div>
         )}

         <div className="flex flex-col w-full gap-3 mt-4">
            <button 
               onClick={() => reset()}
               className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
            >
               <RefreshCcw className="w-3.5 h-3.5" />
               Attempt Re-Kerneling
            </button>
            <Link 
               href="/overview"
               className="w-full bg-muted hover:bg-muted/80 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
            >
               <Home className="w-3.5 h-3.5" />
               Return to Orbit
            </Link>
         </div>

         <div className="mt-4 flex flex-col items-center gap-1 opacity-40">
            <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Verification Code: AOS-772</span>
         </div>
      </div>
    </div>
  );
}
