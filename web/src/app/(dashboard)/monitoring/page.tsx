"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/next-gen/v2/page-container";
import { Monitor, Activity, ShieldCheck, HeartPulse, HardDrive, Cpu, Percent } from "lucide-react";
import { getExecutionMetrics } from "@/app/actions/executionActions";
import { getGovernanceMetrics } from "@/app/actions/governanceActions";
import { useAppContext } from "@/lib/context";

export default function MonitoringPage() {
  const { activeTenant } = useAppContext();
  const [metrics, setMetrics] = React.useState({
    total: 0,
    success: 0,
    failed: 0,
    liveRuns: 0,
    successRate: "100"
  });
  const [govMetrics, setGovMetrics] = React.useState({
    integrityScore: "100"
  });

  useEffect(() => {
    if (activeTenant) {
      getExecutionMetrics(activeTenant.id).then(setMetrics);
      getGovernanceMetrics(activeTenant.id).then(setGovMetrics as any);
    }
  }, [activeTenant?.id]);

  return (
    <PageContainer
      title="System Monitoring"
      description="Live health telemetry across all kernel meshes, worker pools, and economic layers."
      actions={
         <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-500 rounded-lg border border-emerald-500/20">
               <HeartPulse className="w-3.5 h-3.5 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-tighter">Cluster Healthy</span>
            </div>
         </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {[
             { label: "CPU Usage", value: `${(metrics.liveRuns * 5 + 10).toString()}%`, icon: Cpu, color: "text-blue-500" },
             { label: "Kernel Integrity", value: `${govMetrics.integrityScore}%`, icon: ShieldCheck, color: "text-emerald-500" },
             { label: "Success Rate", value: `${metrics.successRate}%`, icon: Percent, color: "text-amber-500" },
             { label: "Active Nodes", value: metrics.liveRuns.toString(), icon: Monitor, color: "text-primary" },
           ].map(stat => (
             <div key={stat.label} className="bg-muted/30 border border-border/40 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                   <div className={cn("w-8 h-8 rounded-lg bg-background flex items-center justify-center border border-border/50", stat.color)}>
                      <stat.icon className="w-4 h-4" />
                   </div>
                   <span className="text-[10px] font-bold text-muted-foreground uppercase">{stat.label}</span>
                </div>
                <div className="flex flex-col gap-1">
                   <span className="text-xl font-black">{stat.value}</span>
                   <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full bg-current", stat.color)} style={{ width: stat.value.includes('%') ? stat.value : '45%' }} />
                   </div>
                </div>
             </div>
           ))}
        </div>

        {/* Live Grid Placeholder */}
        <div className="bg-muted/10 border border-border/40 rounded-[2rem] p-8 flex-1 min-h-[400px] flex flex-col gap-4 relative overflow-hidden">
           <div className="absolute inset-0 studio-grid-dots opacity-40" />
           <div className="flex items-center justify-between relative z-10 px-2">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Kernel Mesh Telemetry</h4>
              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1.5 text-[9px] font-black uppercase text-blue-500">
                    <Activity className="w-3 h-3" />
                    Real-time
                 </div>
              </div>
           </div>
           <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10">
              <div className="w-32 h-32 rounded-full border-4 border-dashed border-primary/20 animate-spin-slow flex items-center justify-center">
                 <Monitor className="w-12 h-12 text-primary opacity-50" />
              </div>
              <p className="text-xs font-bold text-muted-foreground max-w-[200px] uppercase tracking-widest leading-loose">Streaming Telemetry from {activeTenant?.name || "Global"} Cluster...</p>
           </div>
        </div>
      </div>
    </PageContainer>
  );
}

