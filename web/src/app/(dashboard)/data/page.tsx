"use client";

import React from "react";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { Database, History, Plus, Download } from "lucide-react";
import { getDataArtifacts } from "@/app/actions/dataActions";
import { useAppContext } from "@/lib/context";

export default function DataCenterPage() {
  const { activeTenant } = useAppContext();
  const [artifacts, setArtifacts] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (activeTenant) {
       getDataArtifacts(activeTenant.id).then(setArtifacts);
    }
  }, [activeTenant?.id]);

  return (
    <PageContainer
      title="Data Center & Sources"
      description="Manage the information architecture, flow conduits, and canonical datasets for your AI OS."
      actions={
        <div className="flex items-center gap-2">
           <button className="bg-muted px-4 py-2 rounded-xl text-xs font-bold border border-border/50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exports
           </button>
           <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Ingest Source
           </button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Managed Data Artifacts</h4>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {artifacts.length > 0 ? artifacts.map((art) => (
                <div key={art.id} className="bg-muted/30 border border-border/40 rounded-3xl p-6 flex flex-col gap-4 group hover:bg-muted/50 transition-all cursor-pointer">
                   <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                         <Database className="w-5 h-5" />
                      </div>
                      <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[9px] font-black uppercase tracking-widest">ARTIFACT</div>
                   </div>
                   <div className="flex flex-col gap-0.5">
                      <h4 className="text-sm font-bold text-foreground">{art.name}</h4>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Created {new Date(art.createdAt).toLocaleDateString()}</span>
                   </div>
                </div>
              )) : (
                <div className="col-span-full py-12 text-center text-muted-foreground border-2 border-dashed border-border/30 rounded-3xl">
                   No data artifacts discovered in this orbital cycle.
                </div>
              )}
           </div>
        </div>

        {/* Data Flows Visualization Placeholder */}
        <div className="flex flex-col gap-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Active Data Flows</h4>
           <div className="bg-background/40 border border-border/50 rounded-[2.5rem] p-12 h-[300px] flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
              <div className="absolute inset-0 studio-grid-dots opacity-20" />
              <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-2 animate-pulse">
                 <History className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-bold">No active migrations</h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                NextGen Data Plane is currently nominal. All scheduled flows are in idle state.
              </p>
           </div>
        </div>
      </div>
    </PageContainer>
  );
}
