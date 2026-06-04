"use client";

import React from "react";
import { getComputeContracts, getMarketMetrics } from "@/app/actions/computeActions";
import { useAppContext } from "@/lib/context";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { Search, Store, Zap, CreditCard, Activity, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MarketplacePage() {
  const { activeTenant } = useAppContext();
  const [contracts, setContracts] = React.useState<any[]>([]);
  const [metrics, setMetrics] = React.useState({
    activeContracts: 0,
    bidsCount: 0,
    marketStatus: "IDLE",
    avgClearingPrice: "0.0000"
  });

  React.useEffect(() => {
    if (activeTenant) {
      getComputeContracts(activeTenant.id).then(setContracts);
      getMarketMetrics(activeTenant.id).then(setMetrics);
    }
  }, [activeTenant?.id]);

  return (
    <PageContainer
      title="Platform Marketplace"
      description="Accelerate your evolution with pre-built AI agents, workflow templates, and compute packages."
      actions={
        <div className="flex items-center gap-3">
           <button className="bg-muted px-4 py-2 rounded-xl text-xs font-bold border border-border/50 flex items-center gap-2">
              My Purchases
           </button>
           <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2">
              Publish Module
           </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        {/* Marketplace Search */}
        <div className="relative group max-w-2xl mx-auto w-full mb-4">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
           <input 
              type="text" 
              placeholder="Search for 'Sales Agent', 'SAP Connector', or 'PII Redaction'..."
              className="w-full bg-background border-2 border-border/60 rounded-2xl pl-12 pr-6 py-4 text-sm font-medium focus:outline-none focus:border-primary/50 transition-all shadow-xl"
           />
        </div>

        {/* Categories / Market Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {[
             { label: "Active Contracts", count: metrics.activeContracts.toString(), icon: Store, color: "text-primary" },
             { label: "Market Bids", count: metrics.bidsCount.toString(), icon: Zap, color: "text-amber-500" },
             { label: "Clearing Price", count: `$${metrics.avgClearingPrice}`, icon: CreditCard, color: "text-emerald-500" },
             { label: "Market Status", count: metrics.marketStatus, icon: Activity, color: "text-blue-500" },
           ].map(cat => (
             <div key={cat.label} className="bg-muted/30 border border-border/40 p-4 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-primary/5 hover:border-primary/20 transition-all">
                <div className="flex items-center gap-3">
                   <div className={cn("w-10 h-10 rounded-xl bg-background flex items-center justify-center border border-border/50", cat.color)}>
                      <cat.icon className="w-5 h-5" />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-xs font-bold text-foreground">{cat.label}</span>
                      <span className="text-[10px] font-bold text-muted-foreground">{cat.count} Items</span>
                   </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
             </div>
           ))}
        </div>

        {/* Featured Grid */}
        <div className="flex flex-col gap-4 mt-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Featured Integrations</h4>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="studio-card p-6 flex flex-col gap-4 group cursor-pointer hover:border-primary/30 transition-all relative overflow-hidden h-[320px]">
                   <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                   <div className="w-14 h-14 rounded-2xl bg-muted/40 flex items-center justify-center border border-border/50">
                      <Zap className="w-7 h-7 text-primary" />
                   </div>
                   <div className="flex flex-col gap-1">
                      <h3 className="text-lg font-bold">Salesforce Sync v4</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        High-performance bidirectional sync logic for Sales Cloud and NextGen Data Tables.
                      </p>
                   </div>
                   <div className="mt-auto flex items-center justify-between">
                      <span className="text-sm font-black text-foreground">$14.00<span className="text-[10px] font-bold text-muted-foreground">/mo</span></span>
                      <button className="bg-primary text-primary-foreground px-4 py-1.5 rounded-lg text-[10px] font-black uppercase">Install</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      </div>
    </PageContainer>
  );
}

