"use client";

import React from "react";
import { PageContainer } from "@/components/next-gen/v2/page-container";
import { getExecutionMetrics } from "@/app/actions/executionActions";
import { getLiveEventStream, PulseEvent } from "@/app/actions/eventActions";
import { useAppContext } from "@/lib/context";
import { Zap, ShieldCheck, Activity, Globe, LayoutDashboard, Brain, Cpu, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { KernelPulse } from "@/components/next-gen/v2/kernel-pulse";
import { EventHub } from "@/components/next-gen/v2/event-hub";
import { BriefingModal } from "@/components/next-gen/v2/briefing-modal";
import { getSovereignBriefing, SovereignBriefing } from "@/app/actions/briefingActions";

export default function OverviewPage() {
  const { activeTenant } = useAppContext();
  const [metrics, setMetrics] = React.useState({
    total: 0,
    success: 0,
    failed: 0,
    liveRuns: 0,
    successRate: "100"
  });
  const [events, setEvents] = React.useState<PulseEvent[]>([]);
  const [briefingData, setBriefingData] = React.useState<SovereignBriefing | null>(null);
  const [isBriefingOpen, setIsBriefingOpen] = React.useState(false);

  const hydrate = React.useCallback(async () => {
    if (activeTenant) {
      const [newMetrics, newEvents] = await Promise.all([
        getExecutionMetrics(activeTenant.id),
        getLiveEventStream(activeTenant.id)
      ]);
      setMetrics(newMetrics);
      setEvents(newEvents);
    }
  }, [activeTenant]);

  const handleOpenBriefing = async () => {
    if (!activeTenant) return;
    const data = await getSovereignBriefing(activeTenant.id);
    setBriefingData(data);
    setIsBriefingOpen(true);
  };

  React.useEffect(() => {
    hydrate();
    const interval = setInterval(hydrate, 15000); // 15s Executive Pulse Sync
    return () => clearInterval(interval);
  }, [hydrate]);

  return (
    <PageContainer
      title="System Overview"
      description="Real-time perspective across your automation fleet, agent swarms, and sovereign environments."
      actions={
        <div className="flex items-center gap-2">
           <button 
             onClick={handleOpenBriefing}
             className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-2 group hover:bg-primary transition-all active:scale-95"
           >
              <Brain className="w-3.5 h-3.5 text-primary group-hover:text-primary-foreground" />
              <span className="text-[10px] font-black text-primary uppercase tracking-widest group-hover:text-primary-foreground">Daily Briefing</span>
           </button>
           <div className="hidden lg:flex items-center gap-2 mr-4 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Sovereign Cluster Active</span>
           </div>
           <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              Pulse Audit
           </button>
        </div>
      }
    >
      {/* Top Layer: Executive Pulse and Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
         {/* Live Visualization Layer */}
         <div className="flex flex-col gap-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 ml-1">Kernel Space Pulse</h4>
            <KernelPulse />
            <div className="grid grid-cols-2 gap-4">
               {[
                 { label: "Fleet Resilience", value: `${metrics.successRate}%`, icon: ShieldCheck, color: "text-emerald-500" },
                 { label: "Active Nodes", value: metrics.liveRuns.toString(), icon: Zap, color: "text-amber-500" },
               ].map((stat) => (
                 <div key={stat.label} className="bg-muted/30 border border-border/40 p-4 rounded-2xl flex items-center gap-4 group transition-all hover:bg-muted/50">
                    <div className={cn("w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border/50 transition-all group-hover:scale-110 shadow-sm", stat.color)}>
                       <stat.icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                       <span className="text-xl font-black text-foreground">{stat.value}</span>
                    </div>
                 </div>
               ))}
            </div>
         </div>

         {/* Event Hub Terminal */}
         <div className="flex flex-col gap-4">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 ml-1">Live Operational Stream</h4>
            <EventHub events={events} />
         </div>
      </div>

      {/* Bottom Layer: Secondary Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
         {[
           { label: "Total Executions", value: metrics.total.toString(), icon: Globe, color: "text-blue-500", desc: "Aggregated results across all spaces" },
           { label: "Agent Reasoning", value: "Active", icon: Brain, color: "text-primary", desc: "AOS Meta-Agent operational" },
           { label: "Fault Containment", value: metrics.failed.toString(), icon: Activity, color: "text-rose-500", desc: "Isolated kernel failure streams" },
         ].map((stat) => (
           <div key={stat.label} className="bg-background border border-border/40 p-5 rounded-3xl flex flex-col gap-4 transition-all hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1">
              <div className="flex items-center justify-between">
                 <div className={cn("w-10 h-10 rounded-xl bg-muted/30 flex items-center justify-center border border-border/50", stat.color)}>
                    <stat.icon className="w-5 h-5" />
                 </div>
                 <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/50 rounded-lg text-[8px] font-black uppercase tracking-widest opacity-60">
                    Telemetry Live
                 </div>
              </div>
              <div className="flex flex-col">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{stat.label}</span>
                 <span className="text-2xl font-black text-foreground">{stat.value}</span>
                 <p className="text-[10px] text-muted-foreground font-medium mt-1">{stat.desc}</p>
              </div>
           </div>
         ))}
      </div>
      <BriefingModal 
        isOpen={isBriefingOpen} 
        onClose={() => setIsBriefingOpen(false)} 
        data={briefingData} 
      />
    </PageContainer>
  );
}
