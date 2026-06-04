"use client";

import React from "react";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { Plus, Bot, Brain, Zap, Shield, Library, Settings2, Activity, Terminal, ChevronRight, Gauge } from "lucide-react";
import { getAgentInstances, deployAgentAction, getAgentRuns } from "@/app/actions/agentActions";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function AIHubPage() {
  const { activeTenant } = useAppContext();
  const [agents, setAgents] = React.useState<any[]>([]);
  const [runs, setRuns] = React.useState<any[]>([]);
  const [isDeploying, setIsDeploying] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadAIStack = async () => {
      if (activeTenant) {
        setIsLoading(true);
        try {
          const [instances, runHistory] = await Promise.all([
            getAgentInstances(activeTenant.id),
            getAgentRuns(activeTenant.id)
          ]);
          setAgents(instances);
          setRuns(runHistory);
        } catch (e) {
          console.error("AI Stack hydration failed:", e);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadAIStack();
  }, [activeTenant?.id]);

  const handleDeployAgent = async () => {
    if (!activeTenant) return;
    setIsDeploying(true);
    const res = await deployAgentAction({
      tenantId: activeTenant.id,
      name: `Agent-${Math.random().toString(36).substring(7).toUpperCase()}`,
      agentType: "PLANNER",
      autonomyLevel: "ADVISORY",
      systemPrompt: "You are a high-fidelity orchestration agent. Optimize the kernel for performance."
    });

    if (res.success) {
      toast.success("Agent Cluster Deployed", {
        description: "New cognitive node is now operational."
      });
      const instances = await getAgentInstances(activeTenant.id);
      setAgents(instances);
    } else {
      toast.error("Deployment Failed", {
        description: res.error
      });
    }
    setIsDeploying(false);
  };

  if (isLoading) {
    return (
      <PageContainer title="AI & Intelligence" description="Synchronizing cognitive neural link...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 opacity-40">
            <Brain className="w-12 h-12 animate-pulse text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Calibrating Intent Engine...</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="AI & Intelligence"
      description="Orchestrate your autonomous agent swarm, manage model providers, and refine cognitive prompts."
      actions={
         <button 
           onClick={handleDeployAgent}
           disabled={isDeploying}
           className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95 disabled:opacity-50 shadow-primary/20"
         >
            <Plus className="w-4 h-4" />
            {isDeploying ? "Deploying Cluster..." : "Enlist New Agent"}
         </button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Real-time Performance Pulse */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "Active Nodes", value: agents.length, icon: Bot, color: "text-primary" },
            { label: "Autonomy Level", value: "Level 4", icon: Gauge, color: "text-emerald-500" },
            { label: "Inference Latency", value: "42ms", icon: Zap, color: "text-amber-500" },
            { label: "Cognitive Load", value: "14%", icon: Activity, color: "text-blue-500" },
          ].map((stat, i) => (
            <div key={i} className="bg-muted/30 border border-border/40 rounded-3xl p-5 flex flex-col gap-2 relative overflow-hidden group">
               <div className="flex items-center justify-between relative z-10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                  <stat.icon className={cn("w-4 h-4", stat.color)} />
               </div>
               <span className="text-2xl font-black relative z-10">{stat.value}</span>
               <div className="absolute bottom-0 right-0 p-2 opacity-5 scale-150 rotate-12 group-hover:scale-110 group-hover:rotate-0 transition-transform">
                  <stat.icon className="w-12 h-12" />
               </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Swarm */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Operational Agent Swarm</h3>
              <button className="text-[10px] font-bold text-primary hover:underline">View Fleet</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {agents.map((agent: any) => (
                <div key={agent.id} className="bg-muted/20 border border-border/40 rounded-[2rem] p-6 hover:border-primary/40 transition-all group relative overflow-hidden">
                   <div className="flex items-start justify-between relative z-10">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 rounded-2xl bg-background border border-border/50 flex items-center justify-center text-primary shadow-inner">
                            <Bot className="w-6 h-6" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-xs font-bold">{agent.name}</span>
                            <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">{agent.status}</span>
                         </div>
                      </div>
                      <div className="px-2 py-1 bg-primary/10 rounded-lg text-[8px] font-black text-primary uppercase tracking-widest">
                         {agent.agentType}
                      </div>
                   </div>
                   
                   <p className="text-[9px] text-muted-foreground leading-relaxed mt-4 font-medium opacity-70 line-clamp-2">
                      {agent.systemPrompt || "Standard kernel intent resolution agent."}
                   </p>

                   <div className="flex items-center gap-2 mt-6">
                      <button className="flex-1 bg-background hover:bg-muted py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border/50 transition-all flex items-center justify-center gap-2">
                         <Terminal className="w-3.5 h-3.5" />
                         Shell
                      </button>
                      <button className="flex-1 bg-background hover:bg-muted py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border border-border/50 transition-all flex items-center justify-center gap-2">
                         <Settings2 className="w-3.5 h-3.5" />
                         Rules
                      </button>
                   </div>
                </div>
              ))}
              
              {/* Deployment Placeholder */}
              <div 
                onClick={handleDeployAgent}
                className="bg-background/20 border-2 border-dashed border-border/50 rounded-[2rem] p-6 flex flex-col items-center justify-center text-center gap-3 hover:border-primary/50 transition-all cursor-pointer group"
              >
                 <div className="w-12 h-12 rounded-2xl bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Plus className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                 </div>
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-foreground">Initialize Cog-Node</span>
                    <span className="text-[8px] font-bold text-muted-foreground/50 uppercase tracking-tighter">Scale Intelligence Swarm</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Orchestration Logs */}
          <div className="bg-background/40 border border-border/50 rounded-[2rem] p-8 flex flex-col gap-6 relative overflow-hidden">
             <div className="absolute inset-0 studio-grid-dots opacity-10" />
             <div className="flex items-center justify-between relative z-10 px-1">
                <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Intent Logs</h3>
                <Activity className="w-4 h-4 text-primary animate-pulse" />
             </div>

             <div className="flex-1 overflow-y-auto space-y-4 relative z-10 max-h-[500px] scrollbar-hide">
                {runs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-30 text-center gap-4 pt-12">
                     <Library className="w-10 h-10" />
                     <span className="text-[9px] font-black uppercase tracking-widest">No Execution History</span>
                  </div>
                ) : (
                  runs.map((run: any) => (
                    <div key={run.id} className="p-4 bg-muted/20 border border-border/40 rounded-2xl hover:bg-muted/30 transition-all cursor-pointer group">
                       <div className="flex items-center justify-between mb-2">
                          <span className="text-[9px] font-bold text-muted-foreground">{new Date(run.startedAt).toLocaleTimeString()}</span>
                          <span className={cn(
                            "text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
                            run.status === "SUCCESS" ? "text-emerald-500 bg-emerald-500/10" : "text-amber-500 bg-amber-500/10"
                          )}>{run.status}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                          <span className="text-[10px] font-bold text-foreground">Intent Resolved: ...{run.id.slice(-6)}</span>
                       </div>
                    </div>
                  ))
                )}
             </div>

             <button className="w-full py-3 bg-muted/50 hover:bg-muted border border-border/40 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all relative z-10">
                Purge History Node
             </button>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
