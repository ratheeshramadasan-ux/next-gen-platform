"use client";

import React, { useEffect, useState } from "react";
import { useAppContext } from "@/lib/context";
import { getAggregatedDashboardMetrics } from "@/app/actions/tenantActions";
import { KPITile, TimeSeriesChart, SLAGauge, StatusGrid } from "@/components/next-gen/widget-registry";
import { 
  Briefcase, 
  Activity, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  Terminal,
  ArrowUpRight,
  TrendingUp,
  LayoutGrid,
  ListFilter
} from "lucide-react";
import { cn } from "@/lib/utils";

export default function HomeDashboard() {
  const { availableTenants, activeTenant, currentUser, isLoadingCustomers } = useAppContext();
  const [metrics, setMetrics] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<"AGGREGATED" | "SCOPED">("AGGREGATED");

  const loadMetrics = async () => {
    setIsRefreshing(true);
    try {
      // Determine which tenants to aggregate
      const targetIds = activeTenant && viewMode === "SCOPED" 
        ? [activeTenant.id] 
        : availableTenants.map(t => t.id);

      if (targetIds.length > 0) {
        const data = await getAggregatedDashboardMetrics(targetIds);
        setMetrics(data);
      } else {
        setMetrics({
          totalProjects: 0,
          runningJobs: 0,
          queueItems: 0,
          successfulRuns: 0,
          failedRuns: 0,
          recentLogs: []
        });
      }
    } catch (e) {
      console.error("Dashboard metric load failure:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!isLoadingCustomers) {
      loadMetrics();
    }
  }, [availableTenants, activeTenant, viewMode, isLoadingCustomers]);

  if (isLoadingCustomers) {
     return <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
     </div>;
  }

  const isGlobalView = viewMode === "AGGREGATED" || !activeTenant;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <LayoutGrid className="text-primary" size={24} />
            {isGlobalView ? "Automation Overview" : `${activeTenant?.name} Status`}
          </h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">
            {isGlobalView 
              ? `Unified view across ${availableTenants.length} environments` 
              : "Detailed view for this environment"}
          </p>
        </div>

        <div className="flex items-center gap-2 bg-muted/30 p-1 border border-border rounded-sm">
           <button
             onClick={() => setViewMode("AGGREGATED")}
             className={cn(
               "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center gap-2",
               viewMode === "AGGREGATED" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
             )}
           >
             <Briefcase size={12} />
             Global
           </button>
           <button
             onClick={() => setViewMode("SCOPED")}
             disabled={!activeTenant}
             className={cn(
               "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-sm flex items-center gap-2",
               viewMode === "SCOPED" ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground",
               !activeTenant && "opacity-50 cursor-not-allowed"
             )}
           >
             <ListFilter size={12} />
             Environment
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <MetricCard 
           title="Total Projects" 
           value={metrics?.totalProjects || 0} 
           icon={Briefcase} 
           color="primary" 
           trend="+2 new this week"
         />
         <MetricCard 
           title="Active Robots" 
           value={metrics?.runningJobs || 0} 
           icon={Activity} 
           color="emerald" 
           trend="Stability: 98.2%"
         />
         <MetricCard 
           title="Pending Workflows" 
           value={metrics?.queueItems || 0} 
           icon={Layers} 
           color="amber" 
           trend="Avg wait: 1.2s"
         />
         <MetricCard 
           title="System Failures" 
           value={metrics?.failedRuns || 0} 
           icon={AlertCircle} 
           color="rose" 
           trend="-15% vs yesterday"
           isAlert={metrics?.failedRuns > 0}
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 space-y-6">
            <div className="bg-background/20 border border-border rounded-sm h-[320px] overflow-hidden">
               <TimeSeriesChart config={{ id: "main-vitals", type: "TIME_SERIES", title: "Execution Velocity (Across Workspaces)", source: "exec" }} />
            </div>
            
            <div className="p-6 bg-background/20 border border-border rounded-sm">
                <div className="flex items-center justify-between mb-6">
                   <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                      <Terminal size={14} />
                      Recent Events
                   </h3>
                   <button className="text-[10px] font-bold text-primary hover:underline">Full Activity Log →</button>
                </div>
               <div className="space-y-3">
                  {metrics?.recentLogs?.length > 0 ? (
                    metrics.recentLogs.map((log: any) => (
                      <div key={log.id} className="flex items-center justify-between p-2.5 rounded-sm bg-muted/20 border border-border/50 hover:border-primary/30 transition-colors group">
                         <div className="flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                            <span className="text-xs font-bold">{log.action}</span>
                            <span className="text-[10px] text-muted-foreground">• {log.target || "System"}</span>
                         </div>
                         <span className="text-[9px] font-mono text-muted-foreground tabular-nums">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center text-muted-foreground  text-xs">No recent activity detected</div>
                  )}
               </div>
            </div>
         </div>

         <div className="space-y-6">
            <div className="bg-background/20 border border-border rounded-sm p-6">
               <SLAGauge config={{ id: "global-sla", type: "SLA_GAUGE", title: "Platform Health Score", source: "sla" }} />
            </div>
            <div className="bg-background/20 border border-border rounded-sm p-6">
               <StatusGrid config={{ id: "node-health", type: "STATUS_GRID", title: "Robot Availability", source: "health" }} />
            </div>
         </div>
      </div>
    </div>
  );
}

const MetricCard = ({ title, value, icon: Icon, color, trend, isAlert }: any) => {
  const colors: any = {
    primary: "text-primary bg-primary/10 border-primary/20",
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/20"
  };

  return (
    <div className="p-5 bg-background/20 border border-border rounded-sm relative overflow-hidden group hover:bg-background/30 transition-all">
       <div className="flex items-center justify-between mb-4">
          <div className={cn("p-2 rounded-sm border", colors[color])}>
             <Icon size={18} />
          </div>
          {isAlert && <div className="animate-ping w-2 h-2 rounded-full bg-rose-500" />}
       </div>
       <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
             <h3 className="text-3xl font-black tabular-nums tracking-tighter">{value}</h3>
             <div className="flex items-center text-[10px] font-black text-emerald-500 gap-0.5">
                <ArrowUpRight size={10} />
                <span>12%</span>
             </div>
          </div>
          <p className="text-[9px] font-medium text-muted-foreground mt-2 border-t border-border/30 pt-2">{trend}</p>
       </div>
       <div className="absolute top-0 right-0 p-1 pt-0 pr-0 opacity-10">
          <Icon size={64} className="-mr-4 -mt-4 rotate-12" />
       </div>
    </div>
  );
};
