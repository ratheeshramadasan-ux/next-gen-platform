"use server";

import React from "react";
import { 
  ShieldCheck, 
  History, 
  Search, 
  AlertCircle, 
  User, 
  Target, 
  Clock,
  ArrowRight,
  Filter,
  Download,
  Terminal,
  Activity
} from "lucide-react";
import { getPlatformAuditLogs } from "@/app/actions/discoveryActions";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default async function AuditChroniclePage() {
  const logs = await getPlatformAuditLogs();

  return (
    <div className="min-h-full space-y-8 animate-in slide-in-from-right duration-500 flex flex-col h-full overflow-hidden">
      
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 text-size-regular">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
             <ShieldCheck size={12} />
             <span>Security & Compliance / Audit Chronicle</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Enterprise Audit Trail</h1>
        </div>
        
        <div className="flex items-center gap-2">
           <button className="flex items-center gap-2 px-3 py-1.5 bg-card border border-border text-[10px] font-bold uppercase rounded-sm hover:shadow-sm transition-all focus:ring-1 ring-primary/20">
              <Download size={14} />
              <span>Export CSV</span>
           </button>
           <button className="flex items-center gap-2 px-3 py-1.5 bg-primary text-white text-[10px] font-bold uppercase rounded-sm hover:shadow-lg shadow-primary/20 transition-all">
              <Terminal size={14} />
              <span>Live Monitor</span>
           </button>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="flex items-center gap-4 bg-muted/30 p-2 border border-border rounded-sm">
         <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input 
              placeholder="Filter by Actor, Action or Target Resource..." 
              className="w-full bg-card border border-border pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-1 ring-primary/20 rounded-sm"
            />
         </div>
         <div className="flex items-center gap-2 pr-2">
            <FilterChip label="Severity: All" active />
            <FilterChip label="Date: Last 24h" />
            <FilterChip label="Action Type" />
         </div>
      </div>

      {/* Main Chronicle Board */}
      <div className="flex-1 bg-card border border-border rounded-sm overflow-hidden flex flex-col shadow-inner">
        <div className="overflow-y-auto flex-1 h-full relative">
           {/* Timeline line */}
           <div className="absolute left-12 top-0 bottom-0 w-[1px] bg-border/40 z-0" />

           <div className="divide-y divide-border/40 z-10 relative">
              {logs.map((log) => (
                <div key={log.id} className="flex gap-8 px-6 py-6 hover:bg-muted/10 transition-all group">
                   {/* Timestamp / Status column */}
                   <div className="w-12 flex flex-col items-center pt-1 shrink-0">
                      <div className={cn(
                        "w-4 h-4 rounded-full border-2 bg-card flex items-center justify-center mb-2 z-10",
                        getSeverityColor(log.severity)
                      )}>
                         <div className={cn("w-1.5 h-1.5 rounded-full", getSeverityBg(log.severity))} />
                      </div>
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {format(new Date(log.timestamp), 'HH:mm')}
                      </span>
                   </div>

                   {/* Event Body */}
                   <div className="flex-1 space-y-3">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase bg-muted/60 px-2 py-0.5 rounded-sm tracking-widest text-muted-foreground">
                              {log.action}
                            </span>
                            <span className="text-xs font-bold text-foreground">
                              {log.details ? getLogDescription(log.action, log.details) : log.action}
                            </span>
                         </div>
                         <div className="flex items-center gap-6 opacity-0 group-hover:opacity-100 transition-opacity">
                            <EventMetadata icon={User} label="Actor" value={log.actor} />
                            <EventMetadata icon={Target} label="Target" value={log.target || 'GLOBAL'} />
                         </div>
                      </div>

                      <div className="flex items-center gap-6 text-[10px] text-muted-foreground font-bold uppercase">
                         <div className="flex items-center gap-1">
                            <History size={12} />
                            <span>{format(new Date(log.timestamp), 'MMM dd, yyyy')}</span>
                         </div>
                         <div className="flex items-center gap-1 text-primary">
                            <Activity size={12} />
                            <span>Operational Lifecycle Log</span>
                         </div>
                      </div>
                   </div>

                   <button className="p-2 h-fit hover:bg-muted rounded-sm transition-all text-muted-foreground">
                      <ArrowRight size={14} />
                   </button>
                </div>
              ))}

              {logs.length === 0 && (
                 <div className="flex flex-col items-center justify-center p-24 text-center opacity-40 py-48">
                    <History size={64} className="mb-4 text-muted-foreground animate-pulse" />
                    <h3 className="text-lg font-black uppercase tracking-widest">Chronicle Depleted</h3>
                    <p className="text-xs font-bold max-w-xs">No administrative actions have been recorded in the platform audit trail yet.</p>
                 </div>
              )}
           </div>
        </div>
      </div>
      
      {/* Footer statistics bar */}
      <div className="flex items-center justify-between text-[10px] font-black uppercase text-muted-foreground tracking-widest py-2">
         <div className="flex gap-6">
            <span className="flex items-center gap-1.5"><AlertCircle size={12} className="text-rose-500" /> 0 Critical Alerts</span>
            <span className="flex items-center gap-1.5"><Activity size={12} className="text-indigo-500" /> {logs.length} Total Lifecycle Events</span>
         </div>
         <div className="flex items-center gap-1.5 hover:text-primary cursor-pointer transition-colors">
            <span>Enterprise Compliance Guard Enabled</span>
            <ShieldCheck size={12} />
         </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active }: any) {
  return (
    <button className={cn(
      "px-3 py-1.5 text-[10px] font-black uppercase rounded-full transition-all border",
      active ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-card text-muted-foreground border-border hover:border-muted-foreground/30"
    )}>
       {label}
    </button>
  );
}

function EventMetadata({ icon: Icon, label, value }: any) {
  return (
    <div className="flex flex-col gap-0.5">
       <div className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase leading-none opacity-60">
          <Icon size={10} />
          <span>{label}</span>
       </div>
       <span className="text-[11px] font-bold text-foreground leading-none">{value}</span>
    </div>
  );
}

function getLogDescription(action: string, details: string) {
  try {
    const data = JSON.parse(details);
    if (data.description) return data.description;
    return action;
  } catch {
    return details || action;
  }
}

function getSeverityColor(sev: string) {
  switch (sev?.toLowerCase()) {
    case 'critical': return 'border-rose-500 text-rose-500';
    case 'high': return 'border-amber-500 text-amber-500';
    case 'medium': return 'border-indigo-500 text-indigo-500';
    default: return 'border-emerald-500 text-emerald-500';
  }
}

function getSeverityBg(sev: string) {
  switch (sev?.toLowerCase()) {
    case 'critical': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]';
    case 'high': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]';
    case 'medium': return 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]';
    default: return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]';
  }
}
