"use client";

import React, { useState, useEffect } from "react";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { BlueprintCanvas } from "@/components/dashboard/v2/blueprint-canvas";
import { getBlueprintState, ModuleDossier, BlueprintState } from "@/app/actions/blueprintActions";
import { useAppContext } from "@/lib/context";
import { motion, AnimatePresence } from "framer-motion";
import { Database, Cpu, Activity, ShieldCheck, ChevronRight, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export default function BlueprintPage() {
  const { activeTenant } = useAppContext();
  const [data, setData] = useState<BlueprintState | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleDossier | null>(null);

  useEffect(() => {
    if (activeTenant) {
      getBlueprintState(activeTenant.id).then((res) => {
        setData(res);
        // Default select AI Hub
        if (res.modules.length > 0) setSelectedModule(res.modules[0]);
      });
    }
  }, [activeTenant]);

  if (!data) return null;

  return (
    <PageContainer
      title="System Blueprint"
      description="Interactive high-fidelity map of the platform's 15 functional modules and sovereign resource mesh."
      actions={
        <div className="flex items-center gap-2">
           <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full">
              <Database className="w-3 h-3 text-primary" />
              <span className="text-[9px] font-black text-primary uppercase tracking-widest leading-none">Mapping 15 Schemas</span>
           </div>
        </div>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6 h-[600px]">
        {/* Main Canvas Area */}
        <div className="flex-1 relative">
           <BlueprintCanvas 
             modules={data.modules} 
             onSelect={setSelectedModule} 
             selectedId={selectedModule?.id}
           />
        </div>

        {/* Technical Dossier Sidebar */}
        <AnimatePresence mode="wait">
           {selectedModule && (
             <motion.div
               key={selectedModule.id}
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: 20 }}
               className="w-full lg:w-80 bg-background/40 backdrop-blur-3xl border border-border/40 rounded-[2.5rem] p-8 flex flex-col gap-8 shadow-2xl relative overflow-hidden"
             >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl rounded-full -z-10" />

                <div className="flex flex-col gap-2">
                   <div className="flex items-center justify-between">
                     <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary leading-none">Module Dossier</span>
                     {selectedModule.status === "HEALTHY" ? (
                        <div className="flex items-center gap-1">
                           <div className="w-1 h-1 rounded-full bg-emerald-500" />
                           <span className="text-[8px] font-bold text-emerald-500 uppercase tracking-tighter">Healthy</span>
                        </div>
                     ) : (
                        <div className="flex items-center gap-1">
                           <div className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />
                           <span className="text-[8px] font-bold text-rose-500 uppercase tracking-tighter">Anomaly Found</span>
                        </div>
                     )}
                   </div>
                   <h3 className="text-2xl font-black text-foreground leading-none mt-1">{selectedModule.label}</h3>
                </div>

                <div className="flex flex-col gap-4">
                   <p className="text-xs text-muted-foreground leading-relaxed font-medium">{selectedModule.description}</p>
                   
                   <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="bg-muted/30 p-4 rounded-2xl border border-border/40">
                         <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50 block mb-1">Active Agents</span>
                         <span className="text-xl font-black text-foreground">{selectedModule.activeAgents}</span>
                      </div>
                      <div className="bg-muted/30 p-4 rounded-2xl border border-border/40">
                         <span className="text-[9px] font-bold text-muted-foreground uppercase opacity-50 block mb-1">Health Scale</span>
                         <span className={cn("text-xl font-black", selectedModule.status === "ERROR" ? "text-rose-500" : "text-emerald-500")}>
                            {selectedModule.status === "ERROR" ? "22%" : "99%"}
                         </span>
                      </div>
                   </div>
                </div>

                <div className="flex flex-col gap-4">
                   <h4 className="text-[9px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50 pb-2">Integrated Schemas</h4>
                   <div className="flex flex-wrap gap-2">
                      {selectedModule.schema.map((table) => (
                        <div key={table} className="px-3 py-1.5 bg-background border border-border/50 rounded-xl text-[9px] font-bold text-foreground shadow-sm flex items-center gap-2">
                           <Database className="w-3 h-3 text-muted-foreground/40" />
                           {table}
                        </div>
                      ))}
                   </div>
                </div>

                <div className="mt-auto pt-6 border-t border-border/30 flex flex-col gap-3">
                   <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-tighter opacity-50">
                      <span>Last Operational Sync</span>
                      <span>2.4ms ago</span>
                   </div>
                   <button className="w-full bg-primary py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[0.98] transition-transform flex items-center justify-center gap-2">
                      Inspect Operational Logs
                      <ChevronRight className="w-3.5 h-3.5" />
                   </button>
                </div>
             </motion.div>
           )}
        </AnimatePresence>
      </div>
    </PageContainer>
  );
}
