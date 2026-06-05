"use client";

import React from "react";
import { PageContainer } from "@/components/next-gen/v2/page-container";
import { Zap, Plus } from "lucide-react";
import { getDataArtifacts } from "@/app/actions/dataActions";
import { useAppContext } from "@/lib/context";

export default function ConnectionsPage() {
  const { activeTenant } = useAppContext();
  const [connections, setConnections] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (activeTenant) {
       getDataArtifacts(activeTenant.id).then(setConnections);
    }
  }, [activeTenant?.id]);

  return (
    <PageContainer
      title="Connections & Conduits"
      description="Integrate with external services, manage API keys, and monitor cross-platform event streams."
      actions={
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Connect App
        </button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* App Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {connections.map((conn) => (
             <div key={conn.id} className="bg-muted/30 border border-border/40 p-6 rounded-3xl flex flex-col gap-4 group hover:bg-muted/50 transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                   <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                      <Zap className="w-5 h-5" />
                   </div>
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <div className="flex flex-col gap-0.5">
                   <h4 className="text-sm font-bold text-foreground">{conn.name}</h4>
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">INTEGRATION ACTIVE</span>
                </div>
             </div>
           ))}
           {connections.length === 0 && (
             <div className="col-span-full py-8 text-center text-muted-foreground border border-dashed border-border/40 rounded-3xl">
                No external conduits provisioned in this environment.
             </div>
           )}
        </div>

        <div className="bg-muted/10 border-2 border-dashed border-border/60 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center gap-6 group hover:border-primary/40 transition-colors cursor-pointer">
           <div className="w-20 h-20 rounded-[2.5rem] bg-muted/40 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
              <Zap className="w-10 h-10 text-muted-foreground group-hover:text-primary animate-pulse" />
           </div>
           <div className="flex flex-col gap-2">
              <h3 className="text-xl font-bold">Discover New Connections</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                NextGen Platform supports 1,200+ native integrations. Browse the Integration Hub to scale your automation potential.
              </p>
           </div>
           <button className="bg-foreground text-background px-8 py-3 rounded-2xl text-sm font-bold shadow-2xl transition-transform hover:scale-105 active:scale-95">Open Integration Hub</button>
        </div>
      </div>
    </PageContainer>
  );
}
