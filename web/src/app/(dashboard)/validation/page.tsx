"use client";

import React from "react";
import { getEvolutionLogs, getProofRules } from "@/app/actions/validationActions";
import { useAppContext } from "@/lib/context";
import { PageContainer } from "@/components/next-gen/v2/page-container";
import { Fingerprint, ShieldCheck, Eye, Database, History } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ValidationPage() {
  const { activeTenant } = useAppContext();
  const [logs, setLogs] = React.useState<any[]>([]);
  const [rules, setRules] = React.useState<any[]>([]);

  React.useEffect(() => {
    getEvolutionLogs(50).then(setLogs);
    getProofRules().then(setRules);
  }, [activeTenant?.id]);

  return (
    <PageContainer
      title="Trust & Validation"
      description="Proof-carrying verification and cryptographic audit trails for all system actions."
      actions={
         <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2">
            <Fingerprint className="w-4 h-4" />
            Verify Hashes
         </button>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Verification Ledger (Evolution)</h4>
           <div className="bg-background/40 border border-border/50 rounded-2xl overflow-hidden">
              <table className="w-full text-left text-[10px] font-mono">
                 <thead className="bg-muted/30 text-muted-foreground font-bold uppercase tracking-widest border-b border-border/30">
                    <tr>
                       <th className="px-6 py-4">Event ID</th>
                       <th className="px-6 py-4">Rule Mapping</th>
                       <th className="px-6 py-4">Verification Status</th>
                       <th className="px-6 py-4">Timestamp</th>
                       <th className="px-6 py-4"></th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-border/20">
                    {logs.length > 0 ? (
                      logs.map(log => (
                        <tr key={log.id} className="hover:bg-primary/5 transition-colors">
                           <td className="px-6 py-4 font-bold text-foreground">{log.id.slice(0, 8)}...</td>
                           <td className="px-6 py-4 text-muted-foreground">{log.rule?.description || "Inferred Constraint"}</td>
                           <td className="px-6 py-4">
                              <div className={cn(
                                "flex items-center gap-1.5 font-black tracking-tighter uppercase",
                                log.validationStatus === "VERIFIED" ? "text-emerald-500" : "text-amber-500"
                              )}>
                                 <ShieldCheck className="w-3 h-3" />
                                 <span>{log.validationStatus || "PENDING"}</span>
                              </div>
                           </td>
                           <td className="px-6 py-4 text-muted-foreground">{new Date(log.createdAt).toLocaleString()}</td>
                           <td className="px-6 py-4 text-right">
                              <button className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground">
                                 <Eye className="w-3.5 h-3.5" />
                              </button>
                           </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                           No evolution proofs recorded in the current orbital cycle.
                        </td>
                      </tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
           <div className="bg-muted/30 border border-border/40 p-6 rounded-3xl flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border/40">
                 <Database className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold">Cold Storage (WORM)</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                 All verification proofs are transactionally committed to WORM storage every 24 hours.
              </p>
           </div>
           <div className="bg-muted/30 border border-border/40 p-6 rounded-3xl flex flex-col gap-3">
              <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border/40">
                 <History className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-sm font-bold">Historical Replay</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                 Deterministic state reconstruction is available for any signed hash within the last 12 months.
              </p>
           </div>
        </div>
      </div>
    </PageContainer>
  );
}
