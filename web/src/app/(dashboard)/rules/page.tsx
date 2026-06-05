"use client";

import React from "react";
import { getActivePolicies, getGovernanceMetrics } from "@/app/actions/governanceActions";
import { useAppContext } from "@/lib/context";
import { PageContainer } from "@/components/next-gen/v2/page-container";
import { Lock, ShieldCheck, Binary, Scale } from "lucide-react";

export default function RulesPage() {
  const { activeTenant } = useAppContext();
  const [policies, setPolicies] = React.useState<any[]>([]);
  const [metrics, setMetrics] = React.useState({
    policyCount: 0,
    decisionsLast24h: 0,
    blocksLast24h: 0,
    integrityScore: "100"
  });

  React.useEffect(() => {
    getActivePolicies(activeTenant?.id).then(setPolicies);
    if (activeTenant) {
      getGovernanceMetrics(activeTenant.id).then(setMetrics);
    }
  }, [activeTenant?.id]);

  return (
    <PageContainer
      title="Rules & Controls"
      description="The machine-executable constitution and governance framework for all kernel interactions."
      actions={
         <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Freeze Constitution
         </button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Governance Status */}
        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-3xl p-6 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                 <ShieldCheck className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                 <span className="text-xl font-black text-foreground">Governance Engine Online</span>
                 <span className="text-xs text-muted-foreground font-medium uppercase tracking-tight">
                   Active Policies: {metrics.policyCount} | Decisions (24h): {metrics.decisionsLast24h} | Integrity: {metrics.integrityScore}%
                 </span>
              </div>
           </div>
           <div className="flex -space-x-2">
              {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-black">AI</div>)}
              <div className="w-8 h-8 rounded-full bg-primary text-white border-2 border-background flex items-center justify-center text-[10px] font-black">+{metrics.policyCount}</div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Enforceable Constraints</h4>
              <div className="space-y-3">
                 {policies.length > 0 ? (
                    policies.map(policy => (
                      <div key={policy.id} className="bg-muted/30 border border-border/40 p-4 rounded-xl flex items-center justify-between group hover:bg-muted/50 transition-colors">
                         <div className="flex items-center gap-3">
                            <Binary className="w-5 h-5 text-primary" />
                            <div className="flex flex-col">
                               <span className="text-sm font-bold">{policy.name}</span>
                               <span className="text-[10px] text-muted-foreground uppercase">{policy.scope} Scope</span>
                            </div>
                         </div>
                         <span className="text-[9px] font-black uppercase tracking-tighter text-primary">ACTIVE</span>
                      </div>
                    ))
                 ) : (
                    <div className="bg-muted/20 border border-border/40 p-8 rounded-xl flex flex-col items-center justify-center text-center gap-2">
                       <Scale className="w-8 h-8 text-muted-foreground opacity-20" />
                       <span className="text-[10px] font-bold text-muted-foreground uppercase">No Active Policies</span>
                    </div>
                 )}
              </div>
           </div>

           <div className="flex flex-col gap-4">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Decisions & Blocks (24h)</h4>
              <div className="bg-muted/20 border border-border/40 rounded-2xl p-6 flex-1 flex flex-col items-center justify-center text-center gap-4">
                 <div className="flex flex-col">
                    <span className="text-4xl font-black text-rose-500">{metrics.blocksLast24h}</span>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Autonomous Blocks</span>
                 </div>
                 <p className="text-xs text-muted-foreground max-w-[180px]">Regulation layer is operating autonomously within defined constraints.</p>
              </div>
           </div>
        </div>
      </div>
    </PageContainer>
  );
}
