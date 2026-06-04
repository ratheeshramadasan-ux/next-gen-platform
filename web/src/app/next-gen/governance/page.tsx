"use client";

import React from "react";
import { ScrollText, GitBranch, ShieldCheck, ClipboardCheck, History, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import Link from "next/link";

export default function GovernancePage() {
  const modules = [
    { title: "Pipeline View", desc: "DEV → UAT → PROD deployment flow", icon: GitBranch, href: "/next-gen/governance/pipelines", color: "bg-blue-600" },
    { title: "Gold Copies", desc: "Production baseline lock & versioning", icon: Lock, href: "/next-gen/governance/gold-copies", color: "bg-amber-600" },
    { title: "Standards Engine", desc: "Compliance rules & policy enforcement", icon: ShieldCheck, href: "/next-gen/governance/standards", color: "bg-emerald-600" },
    { title: "Approvals", desc: "Code review & deployment authorization", icon: ClipboardCheck, href: "/next-gen/governance/approvals", color: "bg-rose-600" },
  ];

  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-sm bg-indigo-500/20 flex items-center justify-center text-indigo-500 border border-indigo-500/30">
                <ScrollText size={22} />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight">Governance + CI/CD</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Control the lifecycle of your automations. Enforce standardization, 
            manage production gold copies, and orchestrate zero-downtime deployments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((mod, i) => (
          <motion.div key={mod.title} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={mod.href} className="flex flex-col h-full bg-white/5 border border-white/10 rounded-sm p-8 hover:bg-white/[0.08] transition-all group">
              <div className={cn("w-12 h-12 rounded-sm flex items-center justify-center mb-6 text-white shadow-lg", mod.color)}>
                 <IconWrapper icon={mod.icon} size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2">{mod.title}</h3>
              <p className="text-sm text-muted-foreground">{mod.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Deployment History Table */}
      <div className="bg-white/5 border border-white/10 rounded-sm p-8">
         <div className="flex items-center justify-between mb-8">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <History size={16} /> Recent Deployments
            </h4>
            <button className="text-xs font-bold text-primary">View Full History</button>
         </div>
         
         <div className="space-y-4">
            <DeploymentRow project="Invoice_Processor" version="v2.1.4" env="PROD" user="R. Ramadasan" status="Success" />
            <DeploymentRow project="Onboarding_V3" version="v3.0.1-rc" env="UAT" user="L. Reshmi" status="In Progress" />
            <DeploymentRow project="Legacy_ERP_Sync" version="v1.8.9" env="DEV" user="System" status="Rolled Back" isError />
         </div>
      </div>
    </div>
  );
}

const DeploymentRow = ({ project, version, env, user, status, isError }: any) => (
  <div className="flex items-center justify-between p-4 bg-black/20 rounded-sm border border-white/5">
     <div className="flex items-center gap-4">
        <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center", isError ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary")}>
           <GitBranch size={16} />
        </div>
        <div>
           <p className="text-sm font-bold">{project} <span className="text-muted-foreground font-medium text-xs ml-2">{version}</span></p>
           <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{user}</p>
        </div>
     </div>
     <div className="flex items-center gap-6">
        <div className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-bold tracking-widest border border-white/10">{env}</div>
        <div className={cn("text-xs font-bold", isError ? "text-rose-500" : "text-emerald-500")}>{status}</div>
     </div>
  </div>
);

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
