"use client";

import React from "react";
import { Activity, Zap, ListChecks, CalendarClock, PlayCircle, HardDrive } from "lucide-react";
import { motion } from "framer-motion";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import Link from "next/link";

export default function OrchestratorPage() {
  const modules = [
    { title: "Job Monitor", desc: "Real-time execution list & retry control", icon: PlayCircle, href: "/next-gen/orchestrator/jobs", color: "bg-indigo-500" },
    { title: "Queue Manager", desc: "Manage transaction items & SLAs", icon: ListChecks, href: "/next-gen/orchestrator/queues", color: "bg-blue-500" },
    { title: "Trigger Center", desc: "Schedule, File & API driven triggers", icon: CalendarClock, href: "/next-gen/orchestrator/triggers", color: "bg-amber-500" },
    { title: "VM Allocation", desc: "Active bot-to-host mapping", icon: HardDrive, href: "/next-gen/control-center/vms", color: "bg-emerald-500" },
  ];

  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-sm bg-indigo-500/20 flex items-center justify-center text-indigo-500 border border-indigo-500/30">
                <Activity size={22} />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight">Orchestrator</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Real-time control plane for your entire automation fleet. 
            Monitor executions, manage transaction queues, and optimize bot allocation.
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
           <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-xs font-bold text-emerald-500">Fleet Active: 842 Bots</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((mod, i) => (
          <motion.div key={mod.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
            <Link href={mod.href} className="flex flex-col h-full bg-white/5 border border-white/10 rounded-sm p-8 hover:bg-white/[0.08] transition-all group">
              <div className={cn("w-12 h-12 rounded-sm flex items-center justify-center mb-6 text-white", mod.color)}>
                 <IconWrapper icon={mod.icon} size={24} />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{mod.title}</h3>
              <p className="text-sm text-muted-foreground">{mod.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white/5 border border-white/10 rounded-sm p-8">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">Recent Job Alerts</h4>
            <div className="space-y-3">
               <AlertItem title="Job #9822 Failed" desc="Timeout at checkout screen" type="error" />
               <AlertItem title="SLA Breached" desc="Queue 'Invoice_QA' backlog > 100" type="warning" />
               <AlertItem title="VM Disconnected" desc="Host 'RUNNER-NYC-04' lost heartbeat" type="error" />
            </div>
         </div>
         <div className="bg-white/5 border border-white/10 rounded-sm p-8">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-6">Execution Velocity (24h)</h4>
            <div className="h-40 flex items-end gap-2 px-2">
               {[40,70,45,90,65,80,30,55,95,75,40,60].map((h, i) => (
                 <div key={i} className="flex-1 bg-primary/20 hover:bg-primary rounded-t-lg transition-all" style={{ height: `${h}%` }} />
               ))}
            </div>
         </div>
      </div>
    </div>
  );
}

const AlertItem = ({ title, desc, type }: any) => (
  <div className={cn(
    "p-3 rounded-sm border flex gap-3 items-center",
    type === "error" ? "bg-rose-500/10 border-rose-500/20" : "bg-amber-500/10 border-amber-500/20"
  )}>
     <div className={cn("w-2 h-2 rounded-full", type === "error" ? "bg-rose-500" : "bg-amber-500")} />
     <div className="flex-1">
        <p className="text-sm font-bold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
     </div>
  </div>
);

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
