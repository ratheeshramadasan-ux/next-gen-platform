"use client";

import React from "react";
import { X, Activity, Cpu, Database, Server, Clock, ShieldCheck, AlertCircle } from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/ui/icon-wrapper";

export const ContextPanel = () => {
  const { contextPanelType, contextPanelData, closeContextPanel } = useUIStore();

  if (!contextPanelType) return null;

  return (
    <AnimatePresence>
      <motion.aside
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 400, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="w-96 bg-background/20 backdrop-blur-2xl border-l border-border h-screen sticky top-0 z-40 overflow-hidden flex flex-col shadow-2xl"
      >
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-sm bg-primary/20 flex items-center justify-center text-primary">
                <Activity size={18} />
             </div>
             <div>
                <h3 className="text-sm font-bold uppercase tracking-tight">Inspector</h3>
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{contextPanelType.replace('_', ' ')}</p>
             </div>
          </div>
          <button 
            onClick={closeContextPanel}
            className="p-2 hover:bg-muted rounded-full text-muted-foreground transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
           {contextPanelType === "VM_HEALTH" ? (
             <VMHealthDetails data={contextPanelData} />
           ) : contextPanelType === "JOB_DETAILS" ? (
             <JobDetails data={contextPanelData} />
           ) : (
             <div className="py-20 text-center">
                <IconWrapper icon={Database} size={40} className="mx-auto text-muted-foreground/30 mb-4" />
                <p className="text-sm text-muted-foreground">No detailed metadata available for this entity.</p>
             </div>
           )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-border bg-muted/20 flex gap-2 child:flex-1">
           <button className="flex-1 py-2 rounded-sm bg-primary text-white text-xs font-bold hover:brightness-110 transition-all">
              Execute Action
           </button>
           <button className="flex-1 py-2 rounded-sm border border-border text-xs font-bold hover:bg-muted transition-all">
              Copy JSON
           </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};

const VMHealthDetails = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div className="space-y-2">
       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Bot Status</span>
       <div className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-sm text-emerald-500 font-bold text-sm">
          <ShieldCheck size={16} /> Heartbeat Stable
       </div>
    </div>

    <div className="grid grid-cols-2 gap-4">
       <MetricCard label="CPU Usage" value="12%" icon={Cpu} color="text-blue-500" />
       <MetricCard label="RAM Usage" value="4.2 GB" icon={Server} color="text-purple-500" />
    </div>

    <div className="space-y-4">
       <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Properties</h4>
       <div className="space-y-2">
          <PropertyRow label="Hostname" value="NYC-RPA-WORKER-09" />
          <PropertyRow label="OS" value="Windows Server 2022" />
          <PropertyRow label="Runtime" value="Python 3.11 / .NET 6.0" />
          <PropertyRow label="Uptime" value="14d 05h 22m" />
       </div>
    </div>

    <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-sm">
       <div className="flex items-start gap-3">
          <AlertCircle size={16} className="text-rose-500 mt-0.5" />
          <div>
             <span className="text-[10px] font-bold text-rose-500 uppercase tracking-widest">Anomalies Detected</span>
             <p className="text-xs text-muted-foreground">High memory swap detected in last 5 minutes. Suggest vertical scaling.</p>
          </div>
       </div>
    </div>
  </div>
);

const JobDetails = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div className="p-4 bg-primary/5 border border-primary/10 rounded-sm relative overflow-hidden">
       <div className="absolute right-[-10px] top-[-10px] opacity-10">
          <Activity size={80} className="text-primary" />
       </div>
       <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Job Identity</span>
       <h2 className="text-lg font-bold">#{data?.id?.slice(0, 8).toUpperCase() || "JOB-NEW"}</h2>
       <p className="text-xs text-muted-foreground">Status: {data?.status || "PENDING"}</p>
    </div>

    <div className="space-y-4">
       <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Execution Info</h4>
       <div className="space-y-2">
          <PropertyRow label="Initiated By" value={data?.executedBy || "System"} />
          <PropertyRow label="Start Time" value={data?.startTime ? new Date(data.startTime).toLocaleTimeString() : "N/A"} />
          <PropertyRow label="Duration" value={data?.duration || "0s"} />
       </div>
    </div>
  </div>
);

const MetricCard = ({ label, value, icon: Icon, color }: any) => (
  <div className="p-3 bg-muted/30 border border-border rounded-sm space-y-1">
     <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold text-muted-foreground uppercase">{label}</span>
        <Icon size={12} className={color} />
     </div>
     <p className="text-lg font-bold">{value}</p>
  </div>
);

const PropertyRow = ({ label, value }: { label: string, value: string }) => (
  <div className="flex items-center justify-between py-1 border-b border-border/50 text-xs">
     <span className="text-muted-foreground">{label}</span>
     <span className="font-bold">{value}</span>
  </div>
);

const TimelineItem = ({ label, time, status, active }: any) => (
  <div className="relative">
     <div className={cn(
       "absolute left-[-23px] top-1.5 w-4 h-4 rounded-full border-2 border-background z-10",
       active ? "bg-primary animate-pulse shadow-[0_0_8px_rgba(79,70,229,0.5)]" : "bg-muted"
     )} />
     <div className="flex items-center justify-between">
        <span className={cn("text-xs", active ? "font-bold text-primary" : "text-muted-foreground")}>{label}</span>
        <span className="text-[10px] font-medium text-muted-foreground">{time}</span>
     </div>
  </div>
);
