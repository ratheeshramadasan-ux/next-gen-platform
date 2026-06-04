"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { getWorkflowExecutions, getExecutionMetrics } from "@/app/actions/executionActions";
import { useAppContext } from "@/lib/context";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { ListFilter, AlertCircle, Play, CheckCircle2, RefreshCw, Activity } from "lucide-react";

export default function RunsPage() {
  const { activeTenant } = useAppContext();
  const [executions, setExecutions] = React.useState<any[]>([]);
  const [metrics, setMetrics] = React.useState({
    total: 0,
    success: 0,
    failed: 0,
    liveRuns: 0,
    successRate: "100"
  });

  React.useEffect(() => {
    if (activeTenant) {
      getWorkflowExecutions(activeTenant.id).then(setExecutions);
      getExecutionMetrics(activeTenant.id).then(setMetrics);
    }
  }, [activeTenant?.id]);

  return (
    <PageContainer
      title="Runs & Activity"
      description="Operational control center for live and historical execution instances."
      actions={
        <div className="flex items-center gap-2">
           <button className="bg-muted px-4 py-2 rounded-xl text-xs font-bold border border-border/50 flex items-center gap-2">
              <ListFilter className="w-4 h-4" />
              Filters
           </button>
           <button className="bg-rose-500/10 text-rose-500 border border-rose-500/20 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Terminate All
           </button>
        </div>
      }
    >
       <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Live Runs", value: metrics.liveRuns.toString(), color: "text-blue-500", icon: Play },
            { label: "Success (24h)", value: metrics.success.toString(), color: "text-emerald-500", icon: CheckCircle2 },
            { label: "Faults (24h)", value: metrics.failed.toString(), color: "text-rose-500", icon: AlertCircle },
            { label: "Total History", value: metrics.total.toString(), color: "text-muted-foreground", icon: RefreshCw },
          ].map(stat => (
            <div key={stat.label} className="bg-muted/30 border border-border/40 p-4 rounded-2xl flex flex-col gap-1">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{stat.label}</span>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
               </div>
               <span className="text-xl font-black">{stat.value}</span>
            </div>
          ))}
       </div>

       <div className="bg-muted/10 border border-border/40 rounded-2xl overflow-hidden min-h-[400px] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-border/30 bg-muted/20">
             <h4 className="text-xs font-black uppercase tracking-widest">Recent Context Invocations</h4>
             <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Running</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Failed</span>
             </div>
          </div>
          
          {executions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-muted/30 text-muted-foreground font-bold uppercase tracking-tighter">
                  <tr>
                    <th className="px-6 py-3">Workflow</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Started</th>
                    <th className="px-6 py-3">Steps</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {executions.map(ex => (
                    <tr key={ex.id} className="hover:bg-primary/5 transition-colors">
                      <td className="px-6 py-4 font-bold">{ex.workflow?.name || "Unknown Workflow"}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-tighter",
                          ex.status === "RUNNING" ? "bg-blue-500/10 text-blue-500" :
                          ex.status === "COMPLETED" ? "bg-emerald-500/10 text-emerald-500" :
                          "bg-rose-500/10 text-rose-500"
                        )}>
                          {ex.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">{new Date(ex.createdAt).toLocaleString()}</td>
                      <td className="px-6 py-4 text-muted-foreground">{ex.steps?.length || 0} stages</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
               <Activity className="w-8 h-8 opacity-20 mb-4" />
               <p className="text-xs font-medium max-w-[200px]">No active runs detected in the current space context.</p>
            </div>
          )}
       </div>
    </PageContainer>
  );
}

