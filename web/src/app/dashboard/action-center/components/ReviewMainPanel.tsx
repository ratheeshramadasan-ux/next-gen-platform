"use client";

import React from "react";
import { ArrowLeft, Mail, FileText, Image as ImageIcon, ExternalLink, Download, Eye, Layers, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export const ReviewMainPanel = ({ docType = "Email" }: { docType?: "Email" | "PDF" | "Image" }) => {
  return (
    <div className="flex-1 flex flex-col bg-background/50 overflow-hidden">
      {/* Dynamic Header */}
      <div className="h-14 px-6 border-b border-border flex items-center justify-between bg-background shrink-0">
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-muted rounded-sm text-muted-foreground transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h2 className="text-sm font-bold flex items-center gap-3">
              Vendor_Onboarding_Request.eml
              <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 px-2 py-0.5 rounded-sm">Email</span>
              <span className="text-[10px] font-black uppercase tracking-widest bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-sm flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full" /> Needs Validation
              </span>
            </h2>
            <div className="flex items-center gap-4 mt-1">
               <span className="text-[10px] text-emerald-500 font-black flex items-center gap-1.5 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-sm shadow-sm animate-pulse">
                 <ShieldCheck size={12}/> Signed & Verified
               </span>
               <span className="text-[10px] text-muted-foreground font-black flex items-center gap-1.5 uppercase tracking-widest bg-muted border border-border px-2 py-0.5 rounded-sm">
                 Tenant: UAT
               </span>
               <span className="text-[10px] text-muted-foreground font-black flex items-center gap-1.5 uppercase tracking-widest bg-muted border border-border px-2 py-0.5 rounded-sm">
                 Path: Finance/Ops
               </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1 bg-muted/40 rounded-sm border border-border">
          <button className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest bg-background border border-border rounded-sm shadow-sm">Data View</button>
          <button className="px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground hover:text-foreground">Raw Source</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-12 custom-scrollbar flex justify-center bg-muted/5">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-3xl bg-background border border-border rounded-sm shadow-xl overflow-hidden flex flex-col"
        >
          {/* Email Content */}
          <div className="p-8 border-b border-border bg-muted/10">
            <div className="flex justify-between items-start mb-8">
              <div className="space-y-4">
                <h1 className="text-2xl font-black tracking-tight text-foreground leading-tight">Vendor Onboarding Request -<br/>TechSupplies Inc.</h1>
                <div className="space-y-1.5">
                   <p className="text-xs font-medium text-muted-foreground">From: <span className="text-foreground font-bold">sarah.jenkins@techsupplies.com</span></p>
                   <p className="text-xs font-medium text-muted-foreground">To: <span className="text-foreground font-bold">vendor-approvals@nexusai.com</span></p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-bold text-muted-foreground uppercase opacity-60">Oct 24, 2024, 10:30 AM</span>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="p-4 bg-muted/30 border border-border rounded-sm flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-sm bg-red-500/10 flex items-center justify-center text-red-500 group-hover:scale-110 transition-transform">
                   <FileText size={20} />
                </div>
                <div>
                   <p className="text-xs font-black truncate max-w-[120px]">W9_Form_2024.pdf</p>
                   <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">1.2 MB</p>
                </div>
              </div>
              <div className="p-4 bg-muted/30 border border-border rounded-sm flex items-center gap-4 hover:border-primary/30 transition-all cursor-pointer group">
                <div className="w-10 h-10 rounded-sm bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform">
                   <Layers size={20} />
                </div>
                <div>
                   <p className="text-xs font-black truncate max-w-[120px]">Banking_Details.xlsx</p>
                   <p className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">45 KB</p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 pb-16 space-y-6">
            <p className="text-sm font-medium leading-relaxed opacity-80">Hi NexusAI Team,</p>
            <p className="text-sm font-medium leading-relaxed opacity-80">Please find attached our completed <span className="text-primary font-bold">W-9 form</span> and <span className="text-primary font-bold">banking details</span> for the upcoming vendor setup. We are excited to begin our partnership.</p>
            
            <div className="p-6 bg-muted/20 border border-border/80 rounded-sm space-y-4">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-4">Primary Billing Contact</p>
               <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <div className="flex flex-col gap-1"><span className="text-[10px] text-muted-foreground font-bold uppercase">Name</span><span className="text-sm font-bold">Michael Chang</span></div>
                  <div className="flex flex-col gap-1"><span className="text-[10px] text-muted-foreground font-bold uppercase">Role</span><span className="text-sm font-bold">Accounts Receivable Manager</span></div>
                  <div className="flex flex-col gap-1"><span className="text-[10px] text-muted-foreground font-bold uppercase">Phone</span><span className="text-sm font-bold">(555) 019-8372</span></div>
                  <div className="flex flex-col gap-1"><span className="text-[10px] text-muted-foreground font-bold uppercase">Email</span><span className="text-sm font-bold text-primary underline decoration-primary/20">billing@techsupplies.com</span></div>
               </div>
            </div>

            <p className="text-sm font-medium leading-relaxed opacity-80">Let me know if you need any additional documentation to process the setup.</p>
            
            <div className="pt-8">
               <p className="text-sm font-medium leading-relaxed opacity-60">Best regards,</p>
               <p className="text-sm font-black mt-1">Sarah Jenkins</p>
               <p className="text-[10px] text-muted-foreground font-bold uppercase mt-0.5">Director of Operations • TechSupplies Inc.</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
