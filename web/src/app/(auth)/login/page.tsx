"use client";

import React from "react";
import { motion } from "framer-motion";
import Logo from "@/components/ui/logo";
import { User, Lock, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0">
         <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/10 blur-[120px] rounded-full animate-pulse" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[100px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo and Identity */}
        <div className="flex flex-col items-center mb-12">
           <div className="w-20 h-20 rounded-[2rem] bg-background/40 backdrop-blur-3xl border border-white/10 flex items-center justify-center shadow-2xl mb-6 group cursor-pointer hover:border-primary/40 transition-colors">
              <Logo size={48} className="group-hover:rotate-12 transition-transform duration-500" />
           </div>
           <h1 className="text-3xl font-black tracking-tighter uppercase leading-none mb-2">NextGen OS</h1>
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">Identity Kernel Sync</span>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50" />
           
           <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-2">
                 <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Universal ID</label>
                 <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                       type="text" 
                       placeholder="admin@nextgen.arc"
                       className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium"
                    />
                 </div>
              </div>

              <div className="flex flex-col gap-2">
                 <div className="flex items-center justify-between ml-1">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Access Token</label>
                    <button className="text-[9px] font-black uppercase tracking-widest text-primary hover:underline">Reset</button>
                 </div>
                 <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input 
                       type="password" 
                       placeholder="••••••••••••"
                       className="w-full bg-black/40 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium"
                    />
                 </div>
              </div>

              <div className="flex items-center gap-3 mt-2">
                 <div className="w-4 h-4 rounded border border-white/10 bg-black/40 flex items-center justify-center cursor-pointer hover:border-primary/40 transition-all">
                    <div className="w-2 h-2 bg-primary rounded-sm opacity-0 hover:opacity-100 transition-opacity" />
                 </div>
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Persist Session State</span>
              </div>

              <Link 
                href="/overview"
                className="mt-4 w-full h-14 bg-white text-black rounded-2xl flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-[11px] hover:bg-primary transition-all shadow-xl shadow-white/5 group active:scale-95"
              >
                 Enter Sovereign OS
                 <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </Link>
           </div>
        </div>

        {/* Footer actions */}
        <div className="mt-12 flex flex-col items-center gap-6">
           <div className="flex items-center gap-8 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              <button className="hover:text-primary transition-colors">Federated SSO</button>
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <button className="hover:text-primary transition-colors">Magic Link</button>
              <div className="w-1 h-1 bg-white/20 rounded-full" />
              <button className="hover:text-primary transition-colors">Help</button>
           </div>
           
           <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 border border-primary/10 rounded-full opacity-60">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span className="text-[9px] font-black uppercase tracking-widest text-primary">AES-256 Meta-Encryption Active</span>
           </div>
        </div>
      </motion.div>

      {/* Decorative Matrix Code */}
      <div className="absolute top-10 right-10 flex flex-col gap-1 opacity-20 pointer-events-none">
         {[...Array(5)].map((_, i) => (
           <div key={i} className="h-0.5 w-12 bg-primary/40 rounded-full self-end" />
         ))}
         <span className="text-[8px] font-mono text-primary mt-2">NG_SYNC::ALPHA_7</span>
      </div>
    </div>
  );
}
