"use client";

import React from "react";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { CreditCard, TrendingUp, History, ListFilter, Download, AlertCircle, FileText, Zap, Wallet, Activity, ArrowUpRight, Shield } from "lucide-react";
 Broadway: 100
import { getBillingSummary } from "@/app/actions/billingActions";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const { activeTenant } = useAppContext();
  const [billing, setBilling] = React.useState<any>({
    activeContracts: 0,
    totalUsage: 0,
    currentBalance: "0.00",
    avgClearingPrice: "0.0000"
  });
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadBilling = async () => {
      if (activeTenant) {
        setIsLoading(true);
        try {
          const data = await getBillingSummary(activeTenant.id);
          setBilling(data);
        } catch (e) {
          console.error("Billing hydration failed:", e);
        } finally {
          setIsLoading(false);
        }
      }
    };
    loadBilling();
  }, [activeTenant?.id]);

  if (isLoading) {
    return (
      <PageContainer title="Usage & Billing" description="Calculating economic balance...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 opacity-40">
            <Wallet className="w-12 h-12 animate-pulse text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Auditing ELAK Ledgers...</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Usage & Billing"
      description="Consumption tracking, compute contract clearing, and autonomous budget enforcement."
      actions={
         <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95 shadow-primary/20">
            <CreditCard className="w-4 h-4" />
            Add Funds
         </button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Core Financial Nodes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="bg-primary border border-primary/20 rounded-[2rem] p-8 text-primary-foreground flex flex-col gap-6 relative overflow-hidden group shadow-2xl shadow-primary/30">
              <div className="absolute top-0 right-0 p-8 opacity-10 rotate-12 group-hover:rotate-0 transition-transform">
                 <Zap className="w-24 h-24" />
              </div>
              <div className="flex items-center justify-between relative z-10">
                 <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Sovereign Balance</span>
                 <ArrowUpRight className="w-4 h-4 opacity-60" />
              </div>
              <div className="flex flex-col relative z-10">
                 <span className="text-4xl font-black">${billing.currentBalance}</span>
                 <span className="text-[10px] font-bold opacity-60 uppercase tracking-tighter mt-1">Credits: 142.50 NEXT</span>
              </div>
           </div>

           <div className="bg-muted/30 border border-border/40 rounded-[2rem] p-8 flex flex-col gap-6 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Compute Quota</span>
                 <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="flex flex-col">
                 <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black">8.4M</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-tighter">Instructions / month</span>
                 </div>
                 <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                       <span className="text-muted-foreground">Used</span>
                       <span className="text-foreground">62%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" style={{ width: '62%' }} />
                    </div>
                 </div>
              </div>
           </div>

           <div className="bg-muted/30 border border-border/40 rounded-[2rem] p-8 flex flex-col gap-6 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contract Clearing</span>
                 <Activity className="w-4 h-4 text-primary" />
              </div>
              <div className="flex flex-col">
                 <span className="text-3xl font-black">${billing.avgClearingPrice}</span>
                 <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter mt-1">Avg Price / 1k Instructions</span>
                 <span className="text-[9px] font-bold text-primary uppercase tracking-[0.2em] mt-3">{billing.activeContracts} Active Compute Bids</span>
              </div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Invoices Chronicle */}
           <div className="bg-muted/10 border border-border/40 rounded-[2rem] overflow-hidden flex flex-col">
              <div className="p-8 border-b border-border/40 flex items-center justify-between bg-muted/20">
                 <div className="flex items-center gap-3">
                    <div className="p-2 bg-background rounded-xl">
                       <History className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <h4 className="text-xs font-black uppercase tracking-widest">Historical Invoices</h4>
                 </div>
                 <button className="text-[10px] font-bold text-primary hover:underline">View All Chronicle</button>
              </div>
              <div className="flex flex-col divide-y divide-border/20">
                 {[
                   { id: "INV-29420", date: "Apr 01, 2026", amount: "$1,142.12", status: "Paid", icon: FileText },
                   { id: "INV-28103", date: "Mar 01, 2026", amount: "$940.00", status: "Paid", icon: FileText },
                   { id: "INV-27004", date: "Feb 01, 2026", amount: "$820.50", status: "Paid", icon: FileText },
                 ].map(inv => (
                   <div key={inv.id} className="flex items-center justify-between px-8 py-5 hover:bg-muted/20 transition-colors cursor-pointer group">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center group-hover:border-primary/30 transition-all">
                            <inv.icon className="w-5 h-5 text-muted-foreground" />
                         </div>
                         <div className="flex flex-col">
                            <span className="text-xs font-bold">{inv.id}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">{inv.date}</span>
                         </div>
                      </div>
                      <div className="flex items-center gap-6">
                         <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-foreground">{inv.amount}</span>
                            <span className="text-[8px] font-black uppercase text-emerald-500">{inv.status}</span>
                         </div>
                         <button className="w-8 h-8 rounded-lg bg-background border border-border/50 flex items-center justify-center hover:bg-primary/10 hover:border-primary/30 transition-all">
                            <Download className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>
           </div>

           {/* Budget Enforcement (ARL Context) */}
           <div className="bg-muted/10 border border-border/40 rounded-[2rem] p-8 flex flex-col gap-6">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-amber-500/10 rounded-xl">
                    <Shield className="w-5 h-5 text-amber-500" />
                 </div>
                 <h4 className="text-xs font-black uppercase tracking-widest">Budget Enforcement</h4>
              </div>

              <div className="space-y-6">
                 <div className="p-5 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                       <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                    <div className="flex flex-col gap-2">
                       <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Enforcement Triggered</span>
                       <p className="text-xs text-muted-foreground leading-relaxed">
                          ARL Rule <strong>PR-402 (Budget Guard)</strong> has throttled non-critical execution threads. Consumption has reached 80% of quarterly allocation.
                       </p>
                    </div>
                 </div>

                 <div className="space-y-4 px-2">
                    <div className="flex items-center justify-between group">
                       <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-foreground">Auto-Scaling Elastic Capacity</span>
                          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Bids higher in low-latency windows</span>
                       </div>
                       <div className="w-10 h-5 rounded-full bg-primary relative cursor-pointer shadow-inner">
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white shadow-md" />
                       </div>
                    </div>

                    <div className="flex items-center justify-between group grayscale opacity-40">
                       <div className="flex flex-col gap-1">
                          <span className="text-xs font-bold text-foreground">Autonomous Top-up</span>
                          <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter">Pull from corporate treasury</span>
                       </div>
                       <div className="w-10 h-5 rounded-full bg-muted-foreground/20 relative cursor-not-allowed">
                          <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-white shadow-md" />
                       </div>
                    </div>
                 </div>

                 <div className="mt-4 pt-6 border-t border-border/40 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Current Payment Node</span>
                       <span className="text-[9px] font-black uppercase tracking-widest text-primary">Mastercard •••• 4242</span>
                    </div>
                    <button className="w-full py-3 bg-primary/5 hover:bg-primary/10 border border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                       Modify Economic Preferences
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </PageContainer>
  );
}
