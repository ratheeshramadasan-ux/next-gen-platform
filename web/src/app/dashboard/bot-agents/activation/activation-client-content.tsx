"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/lib/context";
import { 
  Monitor, 
  Copy, 
  ShieldCheck, 
  Terminal, 
  RadioTower,
  ExternalLink
} from "lucide-react";
import { ActivationDialog } from "@/components/dashboard/bot-agents/activation-dialog";
import { toast } from "sonner";
import { updateOrchestratorPortAction } from "@/app/actions/botAgentActions";
import { Input } from "@/components/ui/input";
import { Check, Settings2, X } from "lucide-react";

interface Host {
  id: string;
  hostname: string;
  osType: string;
  osVersion: string | null;
  tenantId: string;
  status: string;
  activationToken: string | null;
  tenant: {
    name: string;
  };
}

interface ActivationClientContentProps {
  initialRegistrations: Host[];
  initialPort: number;
}

export function ActivationClientContent({ initialRegistrations, initialPort }: ActivationClientContentProps) {
  const router = useRouter();
  const { activeCustomer, activeTenant, availableTenants, role } = useAppContext();
  const [registrations, setRegistrations] = useState<Host[]>(initialRegistrations);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Sync registrations when server revalidation delivers fresh data
  useEffect(() => {
    setRegistrations(initialRegistrations);
  }, [initialRegistrations]);
  const [port, setPort] = useState<number>(initialPort);
  const [isEditingPort, setIsEditingPort] = useState(false);
  const [tempPort, setTempPort] = useState<string>(initialPort.toString());
  const [isUpdatingPort, setIsUpdatingPort] = useState(false);

  const fallbackUrl = `https://portal.nextgen-platform.io/api/orchestrator`;
  const [orchestratorUrl, setOrchestratorUrl] = useState(fallbackUrl);

  useEffect(() => {
    const proto = window.location.protocol;
    const host = window.location.hostname;
    const portSuffix = port && port !== 80 && port !== 443 ? `:${port}` : "";
    setOrchestratorUrl(`${proto}//${host}${portSuffix}/api/orchestrator`);
  }, [port]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to Clipboard", {
      description: `${label} has been copied.`,
    });
  };

  const openActivation = (host: Host) => {
    setSelectedHost(host);
    setIsDialogOpen(true);
  };

  const handlePortUpdate = async () => {
    const newPort = parseInt(tempPort);
    if (isNaN(newPort)) return;

    setIsUpdatingPort(true);
    try {
      const result = await updateOrchestratorPortAction(activeCustomer?.id || "", newPort, role);
      if (result.success) {
        setPort(newPort);
        setIsEditingPort(false);
        toast.success("Port Updated", {
          description: `Orchestrator port has been updated to ${newPort}.`,
        });
      } else {
        toast.error("Update Failed", {
          description: result.error,
        });
      }
    } catch (error) {
      toast.error("Error", {
        description: "Failed to update port.",
      });
    } finally {
      setIsUpdatingPort(false);
    }
  };

  // Filter registrations based on active customer if needed
  const filteredRegistrations = registrations.filter(host => {
    if (!activeCustomer) return true;
    return availableTenants.some(t => t.id === host.tenantId);
  });

  if (role !== "Platform Admin" && role !== "Admin User") {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center">
        <Card className="w-full max-w-md border-rose-500/20 bg-rose-500/5 p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/10 text-rose-600">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-2xl font-black tracking-tight text-foreground">Access Denied</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Bot Agent Activation is restricted to <strong>Admin Users</strong> and <strong>Super Administrators</strong>.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Your current role (<span className="font-bold text-foreground">{role}</span>) does not have the required permissions to pair or activate Bot Runners.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.4fr]">
        <Card className="border-border/60 bg-card/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <Monitor className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground">
              Connect Your Agent to the Portal
            </h2>
          </div>
          
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <StepItem number={1} text="Open the Agent application on your host machine or VM to begin the connection process." />
              <StepItem number={2} text="Find your machine in the 'Recent Portal Registrations' list below and click 'Activate'." />
              <StepItem number={3} text="Assign your machine to an environment (like Development or Production)." />
            </div>
            <div className="space-y-4">
              <StepItem number={4} text="Copy the generated Activation Token and paste it directly into the Agent application." />
              <StepItem number={5} text="Click 'Complete Setup' in the Agent. It will securely pair and start reporting its status." />

              <div className="rounded-sm border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-600">
                <span className="font-bold">Identity Context:</span> You are currently managing <span className="font-bold underline">{activeCustomer?.companyName}</span>.
              </div>
            </div>
          </div>
        </Card>

        <Card className="border-border/60 bg-card/50 p-6 flex flex-col justify-center text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-black text-foreground">Customer-Level Trust</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {activeCustomer?.companyName} Admin Users can move runners between tenants (e.g. from STG to PROD) securely.
          </p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Orchestrator Connection */}
        <Card className="border-border/60 bg-card/50 p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
               <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  <ExternalLink className="h-4 w-4" />
               </div>
               <h2 className="text-lg font-black tracking-tight text-foreground">Orchestrator Connection</h2>
            </div>
            {(role === "Platform Admin" || role === "Admin User") && (
              <button 
                onClick={() => setIsEditingPort(!isEditingPort)}
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground hover:text-primary transition"
              >
                <Settings2 className="h-3 w-3" />
                Configure Port
              </button>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Configuration values needed for {activeCustomer?.companyName || "your customer"} runner pairing.</p>
          
          <div className="mt-5 space-y-3">
            <div className="rounded-sm border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Real Orchestrator URL</div>
                {isEditingPort && (
                  <div className="flex items-center gap-2">
                    <Input 
                      value={tempPort}
                      onChange={(e) => setTempPort(e.target.value)}
                      className="h-6 w-20 text-[10px] bg-background border-border"
                      placeholder="Port"
                    />
                    <button 
                      onClick={handlePortUpdate}
                      disabled={isUpdatingPort}
                      className="rounded-sm bg-emerald-500/10 p-1 text-emerald-600 hover:bg-emerald-500/20 transition"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => { setIsEditingPort(false); setTempPort(port.toString()); }}
                      className="rounded-sm bg-rose-500/10 p-1 text-rose-600 hover:bg-rose-500/20 transition"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-sm bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground truncate">{orchestratorUrl}</code>
                <div onClick={() => handleCopy(orchestratorUrl, "URL")} className="rounded-sm border border-border p-1.5 cursor-pointer hover:bg-primary/10 transition"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></div>
              </div>
            </div>
            
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-sm border border-border bg-background/70 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Active Tenant ID</div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-sm bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground truncate">{activeTenant?.id || "No tenant selected"}</code>
                  <div onClick={() => handleCopy(activeTenant?.id || "", "Tenant ID")} className="rounded-sm border border-border p-1.5 cursor-pointer hover:bg-primary/10 transition"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></div>
                </div>
              </div>
              <div className="rounded-sm border border-border bg-background/70 p-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Customer Context</div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded-sm bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground truncate">{activeCustomer?.companyName || "Global"}</code>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Global Stats */}
        <Card className="border-border/60 bg-card/50 p-6">
           <div className="flex items-center gap-3">
             <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <ShieldCheck className="h-4 w-4" />
             </div>
             <h2 className="text-lg font-black tracking-tight text-foreground">Security Posture</h2>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Trust indicators for {activeCustomer?.companyName || "the organization"}.</p>
          
          <div className="mt-5 grid grid-cols-2 gap-4">
             <div className="rounded-sm border border-border bg-background/70 p-4 text-center">
                <div className="text-2xl font-black text-foreground">{filteredRegistrations.filter(r => r.status === "Active").length}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Active Agents</div>
             </div>
             <div className="rounded-sm border border-border bg-background/70 p-4 text-center">
                <div className="text-2xl font-black text-primary">{filteredRegistrations.filter(r => r.status !== "Active").length}</div>
                <div className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Pending Approval</div>
             </div>
          </div>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/50 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <RadioTower className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-black tracking-tight text-foreground">
              Recent Portal Registrations
            </h2>
          </div>
          <div className="rounded-sm border border-border bg-card/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            {filteredRegistrations.length} Total Registered
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-sm border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-background/80 text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Host Information</th>
                  <th className="px-4 py-3">Tenant Assignment</th>
                  <th className="px-4 py-3">Current Status</th>
                  <th className="px-4 py-3">Activation Token</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/70">
                {filteredRegistrations.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-muted-foreground" colSpan={5}>
                      No Bot Runner hosts registered for {activeCustomer?.companyName || "this customer"} yet.
                    </td>
                  </tr>
                ) : (
                  filteredRegistrations.map((host) => (
                    <tr key={host.id} className="group hover:bg-primary/5 transition-colors">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-background border border-border group-hover:border-primary/30 transition">
                            <Monitor className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{host.hostname}</div>
                            <div className="text-[10px] font-bold uppercase text-muted-foreground">{host.osType} · {host.osVersion ?? "Stable"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-foreground">{host.tenant.name}</div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">ID: {host.tenantId}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className={`inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase ${host.status === "Active" ? "border-emerald-500/20 bg-emerald-500/5 text-emerald-600" : "border-primary/20 bg-primary/5 text-primary"}`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${host.status === "Active" ? "bg-emerald-500" : "bg-primary animate-pulse"}`} />
                          {host.status}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <code className="rounded-sm bg-muted/50 px-2 py-1 text-[11px] font-mono text-foreground">
                            {host.activationToken ?? "WAITING"}
                          </code>
                          {host.activationToken && (
                            <div onClick={() => handleCopy(host.activationToken!, "Token")} className="cursor-pointer text-muted-foreground hover:text-primary transition">
                              <Copy className="h-3 w-3" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button 
                          onClick={() => openActivation(host)}
                          className="rounded-sm bg-primary px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-primary-foreground hover:opacity-90 transition shadow-sm"
                        >
                          {host.status === "Active" ? "Re-Activate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <ActivationDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          // Trigger server revalidation to refresh the registrations table
          router.refresh();
        }}
        host={selectedHost}
        tenants={availableTenants}
        role={role}
      />
    </div>
  );
}

function StepItem({ number, text }: { number: number; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-black text-primary">
        {number}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
