"use client";

import React from "react";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { Shield, Settings, Users, Server, HardDrive, ListCollapse, PlayCircle, Globe, Activity, Cpu } from "lucide-react";
import { getTenantDetails, getTenantUsers, updateTenantConfig } from "@/app/actions/adminActions";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";

export default function AdminPage() {
  const { activeTenant, currentUser } = useAppContext();
  const [details, setDetails] = React.useState<any>(null);
  const [users, setUsers] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      if (activeTenant) {
        setIsLoading(true);
        const [tenantInfo, userInfo] = await Promise.all([
          getTenantDetails(activeTenant.id),
          getTenantUsers(activeTenant.id)
        ]);
        setDetails(tenantInfo);
        setUsers(userInfo);
        setIsLoading(false);
      }
    };
    loadData();
  }, [activeTenant?.id]);

  if (isLoading) {
    return (
      <PageContainer title="Platform Administration" description="Synchronizing kernel metadata...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4 opacity-40">
            <Cpu className="w-12 h-12 animate-pulse text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Shell...</span>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Platform Administration"
      description="Global configuration, high-availability cluster management, and system-wide feature toggles."
      actions={
        <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2 active:scale-95 shadow-primary/20">
          <Shield className="w-4 h-4" />
          Control Plane
        </button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* Top Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-muted/30 border border-border/40 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Globe className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Region</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black">{activeTenant?.type || "Standard"}</span>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">Cluster: us-east-1a-omega</span>
            </div>
          </div>

          <div className="bg-muted/30 border border-border/40 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Users className="w-16 h-16" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Identity Load</span>
            <div className="flex flex-col">
              <span className="text-2xl font-black">{users.length} Nodes</span>
              <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-tighter">All Systems Nominal</span>
            </div>
          </div>

          <div className="bg-muted/30 border border-border/40 rounded-3xl p-6 flex flex-col gap-4 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Activity className="w-16 h-16" />
            </div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Kernel Throughput</span>
            <div className="flex flex-col">
              <span className="text-2xl font-black">1.4k req/s</span>
              <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary w-[74%] rounded-full shadow-[0_0_8px_var(--primary)]" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Environment Registry */}
          <div className="bg-muted/20 border border-border/40 rounded-[2rem] p-8 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-xl">
                  <Server className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest">Cluster Environments</h3>
              </div>
              <button className="text-[10px] font-bold text-primary hover:underline">Provision SDK</button>
            </div>

            <div className="space-y-3">
              {(details?.environments || []).map((env: any) => (
                <div key={env.id} className="flex items-center justify-between p-4 bg-background/40 border border-border/50 rounded-2xl hover:border-primary/30 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black transition-colors",
                      env.isActive ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"
                    )}>
                      {env.name.substring(0, 4).toUpperCase()}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{env.name}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">UUID: ...{env.id.slice(-6)}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                    env.isActive ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"
                  )}>
                    {env.isActive ? "Online" : "Hibernating"}
                  </div>
                </div>
              ))}
              {(!details?.environments || details.environments.length === 0) && (
                <div className="py-12 border-2 border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center opacity-40">
                  <PlayCircle className="w-8 h-8 mb-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest">No Environments Found</span>
                </div>
              )}
            </div>
          </div>

          {/* Feature Gates & Governance */}
          <div className="bg-muted/20 border border-border/40 rounded-[2rem] p-8 flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <Settings className="w-5 h-5 text-amber-500" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-widest">Governance & Feature Gates</h3>
            </div>

            <div className="space-y-6">
              {[
                { name: "Federation Bridge (MADKF)", description: "Cross-tenant kernel synchronization.", enabled: true },
                { name: "Economic Market (ELAK)", description: "Dynamic compute contract clearing.", enabled: false },
                { name: "Universal Forensics (SSO)", description: "Identity-aware proof validation.", enabled: true },
              ].map(gate => (
                <div key={gate.name} className="flex items-center justify-between group">
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-foreground">{gate.name}</span>
                    <span className="text-[10px] text-muted-foreground font-medium">{gate.description}</span>
                  </div>
                  <div className={cn(
                    "w-12 h-6 rounded-full relative transition-all cursor-pointer shadow-inner",
                    gate.enabled ? "bg-primary" : "bg-muted-foreground/20 border border-border"
                  )}>
                    <div className={cn(
                      "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md",
                      gate.enabled ? "right-1" : "left-1"
                    )} />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col gap-2">
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Security Advisory</span>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Modifying feature gates requires multi-custody approval for Production clusters. Any change will be recorded in the immutable Chronicle ledger.
              </p>
            </div>
          </div>
        </div>

        {/* System Telemetry Console */}
        <div className="bg-background/40 border border-border/50 rounded-[2rem] p-10 min-h-[350px] flex flex-col gap-6 relative overflow-hidden">
          <div className="absolute inset-0 studio-grid-dots opacity-20" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <ListCollapse className="w-5 h-5 text-muted-foreground" />
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-muted-foreground">Kernel Event Stream</h4>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-bold text-emerald-500 flex items-center gap-1.5 uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live Telemetry
              </span>
              <button className="px-4 py-1.5 bg-muted/50 border border-border/50 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all">Export Report</button>
            </div>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 relative z-10 opacity-30">
            <HardDrive className="w-14 h-14 text-muted-foreground" />
            <div className="flex flex-col gap-1">
              <h5 className="text-xs font-black uppercase tracking-widest">Awaiting Orchestrator Metadata...</h5>
              <p className="text-[10px] font-bold text-muted-foreground max-w-[250px] uppercase tracking-tighter leading-loose">
                Kernel handshake in progress. Connect CLI to bypass visual buffer.
              </p>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
