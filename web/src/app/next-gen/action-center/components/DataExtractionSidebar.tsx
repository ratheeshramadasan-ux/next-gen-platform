"use client";

import React, { useState } from "react";
import { Sparkles, User, Building, Phone, Mail, Edit3, Send, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const DataExtractionSidebar = () => {
  const [activeTab, setActiveTab] = useState("Extracted Entities");

  const tabs = ["Extracted Entities", "Attachments (2)", "Approval Flow"];

  return (
    <div className="w-[360px] border-l border-border bg-background flex flex-col shrink-0 overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/5">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 px-2 py-3.5 text-[10px] font-black uppercase tracking-tight transition-all relative",
              activeTab === tab ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div layoutId="sidebar-tab" className="absolute bottom-0 left-4 right-4 h-[2.5px] bg-primary rounded-t-full shadow-[0_-1px_6px_rgba(var(--primary),0.3)]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {activeTab === "Extracted Entities" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
            <section className="p-5 bg-muted/20 border border-border rounded-sm space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Classification</h4>
                 <div className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-sm text-[9px] font-black uppercase tracking-widest">High Confidence</div>
              </div>
              <div className="flex items-center justify-between">
                 <span className="text-xs font-bold text-muted-foreground">Email Intent</span>
                 <div className="p-2 bg-indigo-500 text-white rounded-sm flex items-center gap-2 shadow-lg shadow-indigo-500/20">
                    <CheckCircle2 size={12} fill="white" className="text-indigo-500"/>
                    <span className="text-[10px] font-black uppercase tracking-widest">Vendor Onboarding</span>
                 </div>
              </div>
            </section>

            <section className="p-5 bg-muted/20 border border-border rounded-sm space-y-5">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Contact Entities</h4>
              <div className="space-y-4">
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Company Name</label>
                    <div className="relative">
                       <input type="text" readOnly value="TechSupplies Inc." className="w-full bg-background border border-border rounded-sm px-4 py-2 text-xs font-bold outline-none" />
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"><Building size={14}/></div>
                    </div>
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest px-1">Billing Contact</label>
                    <div className="relative">
                       <input type="text" readOnly value="Michael Chang" className="w-full bg-background border border-border rounded-sm px-4 py-2 text-xs font-bold outline-none" />
                       <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors cursor-pointer"><User size={14}/></div>
                    </div>
                 </div>
              </div>
            </section>

            {/* Automated Approval Box */}
            <section className="bg-indigo-50/40 dark:bg-indigo-500/[0.03] border border-indigo-500/20 rounded-sm overflow-hidden shadow-sm">
               <div className="p-4 border-b border-indigo-500/10 bg-indigo-500/[0.04] flex items-center gap-2">
                  <Send size={14} className="text-indigo-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-[0.15em] text-indigo-600 dark:text-indigo-400">Automated Approval Response</h4>
               </div>
               <div className="p-5 space-y-4">
                  <p className="text-[11px] font-medium leading-relaxed opacity-70">Review the generated response before routing this request to the ERP system and replying to the vendor.</p>
                  <div className="p-4 bg-background border border-border rounded-sm font-mono text-[10px] leading-relaxed relative group">
                     {`Dear Sarah Jenkins,

Thank you for submitting the onboarding documents for TechSupplies Inc. We have successfully extracted your W-9 and banking details. Your vendor profile is now pending final ERP sync.

Regards,
NexusAI Automated System`}
                     <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={12} className="text-muted-foreground" /></div>
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                     <button className="flex-1 py-2.5 px-4 bg-background border border-border rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all flex items-center justify-center gap-2">
                        <Edit3 size={14}/> Edit Reply
                     </button>
                     <button className="flex-[1.5] py-2.5 px-4 bg-primary text-white rounded-sm text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2">
                        <Send size={14}/> Approve & Send
                     </button>
                  </div>
               </div>
            </section>
          </motion.div>
        )}
      </div>
    </div>
  );
};
