"use client";

import React from "react";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { Plus, Workflow, Box, Layers, Play, History, GitBranch, Zap } from "lucide-react";
import { getWorkflowDefinitions, triggerWorkflow } from "@/app/actions/executionActions";
import { useAppContext } from "@/lib/context";

export default function AutomationBuilderPage() {
  const { activeTenant } = useAppContext();
  const [definitions, setDefinitions] = React.useState<any[]>([]);
  const [isTriggering, setIsTriggering] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (activeTenant) {
      getWorkflowDefinitions(activeTenant.id).then(setDefinitions);
    }
  }, [activeTenant?.id]);

  const handleRunWorkflow = async (id: string) => {
     if (!activeTenant) return;
     setIsTriggering(id);
     const res = await triggerWorkflow({
        definitionId: id,
        tenantId: activeTenant.id,
        context: { triggerSource: "Enterprise UI" }
     });
     if (res.success) {
        console.log("Triggered:", res.executionId);
     }
     setIsTriggering(null);
  };

  return (
    <PageContainer
      title="Automation Builder"
      description="Design, synthesize, and deploy high-fidelity logic using the AK-ISA instruction set."
      actions={
        <div className="flex items-center gap-2">
           <button className="bg-muted px-4 py-2 rounded-xl text-xs font-bold border border-border/50 flex items-center gap-2">
              <History className="w-4 h-4" />
              History
           </button>
           <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create Workflow
           </button>
        </div>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Logic Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
           {definitions.map((def) => (
             <div key={def.id} className="bg-background/40 border border-border/40 p-5 rounded-2xl flex flex-col gap-4 group hover:border-primary/40 transition-all">
                <div className="flex items-center justify-between">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5" />
                   </div>
                   <span className="text-[10px] font-black uppercase text-muted-foreground tracking-tighter">v{def.version}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                   <h4 className="text-sm font-bold text-foreground">{def.name}</h4>
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">AK-ISA Protocol</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/20">
                   <button className="text-[10px] font-bold text-muted-foreground hover:text-foreground">Edit Design</button>
                   <button 
                     onClick={() => handleRunWorkflow(def.id)}
                     disabled={isTriggering === def.id}
                     className="bg-primary/5 border border-primary/20 text-primary px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 transition-colors disabled:opacity-50"
                   >
                     {isTriggering === def.id ? "Launching..." : "Execute Now"}
                   </button>
                </div>
             </div>
           ))}
        </div>

        {/* Builder Hero / Placeholder */}
        <div className="bg-background/40 border border-border/50 rounded-3xl p-12 flex flex-col items-center justify-center text-center gap-6 relative overflow-hidden">
           <div className="absolute inset-0 studio-grid-dots opacity-30 pointer-events-none" />
           <div className="w-20 h-20 rounded-[2rem] bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center relative z-10">
              <Layers className="w-10 h-10 text-primary" />
           </div>
           <div className="flex flex-col gap-2 relative z-10">
              <h2 className="text-2xl font-bold tracking-tight">Visual Builder Empty</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                No active session found. Pick an existing template from the Bot Library or start a clean slate for your new automation.
              </p>
           </div>
           <div className="flex items-center gap-3 relative z-10">
              <button className="bg-foreground text-background px-8 py-2.5 rounded-xl text-sm font-bold shadow-xl">Open Designer</button>
              <button className="bg-muted px-8 py-2.5 rounded-xl text-sm font-bold border border-border/50">View Templates</button>
           </div>
        </div>

        {/* History / Recent Work */}
        <div className="flex flex-col gap-4 mt-4">
           <div className="flex items-center justify-between px-2">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Recent Logic Mutations</h4>
              <button className="text-[10px] font-bold text-primary hover:underline">View History</button>
           </div>
           <div className="bg-muted/10 border border-border/40 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-xs">
                 <thead className="bg-muted/30 text-muted-foreground font-bold uppercase tracking-tighter">
                    <tr>
                       <th className="px-4 py-3">Logic Path</th>
                       <th className="px-4 py-3">Author</th>
                       <th className="px-4 py-3">Type</th>
                       <th className="px-4 py-3">Timestamp</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border/30">
                    {[
                      { name: "Order Processing v1.2", user: "Ratheesh R.", type: "Sequence", date: "2m ago" },
                      { name: "User Recon Hub", user: "Reshmi R.", type: "Agent Loop", date: "1h ago" },
                    ].map(log => (
                      <tr key={log.name} className="hover:bg-muted/20 transition-colors">
                         <td className="px-4 py-4 font-bold">{log.name}</td>
                         <td className="px-4 py-4 text-muted-foreground">{log.user}</td>
                         <td className="px-4 py-4"><span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-black scale-90 inline-block">{log.type}</span></td>
                         <td className="px-4 py-4 text-muted-foreground">{log.date}</td>
                      </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>
      </div>
    </PageContainer>
  );
}
