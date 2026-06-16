"use client";

import React, { Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  Server, Shield, Lock, ArrowLeft, Settings, Activity,
  AlertTriangle, CheckCircle2, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { InfrastructureRegistry } from "@/document-reader/components/WorkflowStages";
import { DocumentReaderProvider } from "@/document-reader/store/documentReaderContext";
import { usePipelineStore } from "@/document-reader/store/studioStore";

function InfrastructureHeader() {
  const router = useRouter();
  const { infrastructure } = usePipelineStore();

  const activeEngines = infrastructure.engines.filter(e => e.status === "active").length;
  const totalEngines = infrastructure.engines.length;
  const hasGovernance = !!infrastructure.governance;
  const isReady = activeEngines > 0;

  return (
    <header className="h-20 bg-card/80 backdrop-blur-md border-b border-border/50 px-10 flex items-center justify-between shrink-0 z-50 shadow-sm">
      <div className="flex items-center gap-5">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center shadow-sm group hover:-translate-x-1 mr-1"
          title="Back"
        >
          <ArrowLeft size={16} strokeWidth={3} className="transition-transform group-hover:scale-110" />
        </button>

        <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white shadow-lg border border-white/10">
          <Server size={22} strokeWidth={2} />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black tracking-tight text-foreground/80 uppercase">Document Intelligence Infrastructure</h1>
            <div className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-[9px] font-black text-rose-500 uppercase flex items-center gap-1">
              <Lock size={9} />
              Admin Only
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <nav className="flex items-center gap-1 text-[9px] font-black text-muted-foreground uppercase tracking-widest">
              <span>Admin</span>
              <ChevronRight size={10} />
              <span className="text-foreground">Document Intelligence</span>
            </nav>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Live status chips */}
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
            isReady
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          )}>
            {isReady
              ? <CheckCircle2 size={11} />
              : <AlertTriangle size={11} />
            }
            {activeEngines}/{totalEngines} Engines Active
          </div>

          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
            hasGovernance
              ? "bg-primary/10 border-primary/20 text-primary"
              : "bg-amber-500/10 border-amber-500/20 text-amber-600"
          )}>
            <Shield size={11} />
            {hasGovernance ? "Governance Active" : "No Governance Policy"}
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border bg-muted/50 border-border text-muted-foreground">
            <Activity size={11} />
            {infrastructure.policies?.length ?? 0} Routing Policies
          </div>
        </div>

        <div className="h-10 w-px bg-border/50" />

        <button className="w-10 h-10 rounded-full bg-card border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all shadow-sm">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}

function AdminAccessGate({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Admin access warning banner */}
      <div className="bg-rose-500/5 border-b border-rose-500/20 px-10 py-2 flex items-center gap-3">
        <Lock size={12} className="text-rose-500 shrink-0" />
        <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest">
          Restricted Area — Infrastructure configuration is accessible to Platform Administrators only.
          Changes here affect all Document Designer projects across all tenants.
        </p>
      </div>
      {children}
    </div>
  );
}

export default function DocumentIntelligenceAdminPage() {
  return (
    <DocumentReaderProvider>
      <AdminAccessGate>
        <InfrastructureHeader />
        <main className="flex-1 overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">
                Loading Infrastructure Registry...
              </div>
            </div>
          }>
            <InfrastructureRegistry />
          </Suspense>
        </main>
      </AdminAccessGate>
    </DocumentReaderProvider>
  );
}
