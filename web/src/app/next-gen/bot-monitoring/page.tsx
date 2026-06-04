"use client";

import React, { useEffect, useMemo, useState, useTransition } from "react";
import {
  Bot,
  Cpu,
  HardDrive,
  LoaderCircle,
  Monitor,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Workflow,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { getCustomerBotVmMonitor } from "@/app/actions/botMonitorActions";

type MonitorSnapshot = Awaited<ReturnType<typeof getCustomerBotVmMonitor>>;

export default function BotMonitoringPage() {
  const { role, activeCustomer, activeTenant, currentUser } = useAppContext();
  const [snapshot, setSnapshot] = useState<MonitorSnapshot | null>(null);
  const [search, setSearch] = useState("");
  const [selectedVmId, setSelectedVmId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"All" | "Online" | "Offline" | "Provisioning">("All");
  const [isPending, startTransition] = useTransition();
  const activeCustomerId = activeCustomer?.id ?? null;
  const activeTenantId = activeTenant?.id ?? null;

  const loadMonitor = () => {
    startTransition(async () => {
      const result = await getCustomerBotVmMonitor({
        customerId: activeCustomerId,
        tenantId: activeTenantId,
        role,
        actorEmail: currentUser.email,
      });

      if (!result.success) {
        toast.error(result.error || "Unable to load bot monitor.");
      }

      setSnapshot(result);
      setSelectedVmId((previous) => previous || result.vmCards[0]?.id || null);
    });
  };

  useEffect(() => {
    // Initial load
    startTransition(async () => {
      const result = await getCustomerBotVmMonitor({
        customerId: activeCustomerId,
        tenantId: activeTenantId,
        role,
        actorEmail: currentUser.email,
      });

      if (!result.success) {
        toast.error(result.error || "Unable to load bot monitor.");
      }

      setSnapshot(result);
      setSelectedVmId((previous) => previous || result.vmCards[0]?.id || null);
    });

    // Auto-refresh every 30 seconds
    const interval = window.setInterval(() => {
      startTransition(async () => {
        const result = await getCustomerBotVmMonitor({
          customerId: activeCustomerId,
          tenantId: activeTenantId,
          role,
          actorEmail: currentUser.email,
        });
        setSnapshot(result);
        setSelectedVmId((previous) => previous || result.vmCards[0]?.id || null);
      });
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [activeCustomerId, activeTenantId, role, currentUser.email]);

  const vmCards = useMemo(() => snapshot?.vmCards ?? [], [snapshot?.vmCards]);
  const accessibleFolders = useMemo(() => snapshot?.accessibleFolders ?? [], [snapshot?.accessibleFolders]);

  const filteredVmCards = useMemo(() => {
    return vmCards.filter((vm) => {
      const matchesStatus = statusFilter === "All" || vm.status === statusFilter;
      const matchesSearch =
        search.trim().length === 0 ||
        [vm.hostname, vm.ipAddress, vm.tenantName, vm.environment, vm.osType]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [vmCards, search, statusFilter]);

  const selectedVm =
    filteredVmCards.find((vm) => vm.id === selectedVmId) ||
    vmCards.find((vm) => vm.id === selectedVmId) ||
    filteredVmCards[0] ||
    null;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-primary/20 bg-primary/10 text-primary">
              <Monitor className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                <Bot className="h-3 w-3" />
                Customer Bot Console
              </div>
              <h1 className="text-4xl font-black tracking-tight text-foreground">Bots Running On Each VM</h1>
            </div>
          </div>
          <p className="max-w-4xl text-sm uppercase tracking-wide text-muted-foreground">
            A customer-scoped VM console for Admin User and Standard User teams to see which bots are live on every machine.
          </p>
          <div className="inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            <span>Customer</span>
            <span className="text-foreground">{activeCustomer?.companyName ?? "No customer selected"}</span>
            {activeTenant ? <span className="text-muted-foreground">/ {activeTenant.name}</span> : null}
          </div>
          {snapshot?.scopeMode === "folder-scoped" ? (
            <div className="inline-flex items-center gap-2 rounded-sm border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-700">
              <span>Access Scope</span>
              <span className="text-foreground">Only your permitted folders and their VM scope are visible</span>
            </div>
          ) : null}
        </div>

        <Button variant="outline" onClick={loadMonitor} disabled={isPending}>
          <LoaderCircle className={cn("h-4 w-4", isPending && "animate-spin")} />
          Refresh VM View
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Total VMs" value={snapshot?.summary.totalVms ?? 0} icon={HardDrive} />
        <SummaryTile label="Online VMs" value={snapshot?.summary.onlineVms ?? 0} icon={ShieldCheck} tone="good" />
        <SummaryTile label="Running Bots" value={snapshot?.summary.runningBots ?? 0} icon={Bot} tone="good" />
        <SummaryTile label="Attended / Unattended" value={`${snapshot?.summary.attendedBots ?? 0} / ${snapshot?.summary.unattendedBots ?? 0}`} icon={Users} />
      </div>

      {snapshot?.scopeMode === "folder-scoped" ? (
        <Card className="border-border/60 bg-card/50 p-5">
          <div className="flex items-center gap-3">
            <Workflow className="h-4 w-4 text-primary" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Folders You Can Access</h2>
              <p className="mt-1 text-xs text-muted-foreground">Standard users are limited to these folders and VM scope only.</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {accessibleFolders.map((folder) => (
              <div key={folder.id} className="rounded-sm border border-primary/20 bg-primary/10 px-3 py-2 text-xs">
                <div className="font-semibold text-foreground">{folder.name}</div>
                <div className="mt-1 text-muted-foreground">
                  {folder.tenantName} · {folder.environment} · {folder.workspaceName}
                </div>
              </div>
            ))}
            {accessibleFolders.length === 0 ? (
              <div className="rounded-sm border border-border/60 bg-background/55 px-3 py-3 text-sm text-muted-foreground">
                No folder permissions are assigned to this user yet.
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      <Card className="border-border/60 bg-card/50 p-4">
        <div className="grid gap-3 lg:grid-cols-[1.8fr_repeat(3,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search VM, IP, tenant, OS"
              className="h-10 w-full rounded-sm border border-border bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary"
            />
          </div>
          <FilterButton current={statusFilter} value="All" setValue={setStatusFilter} />
          <FilterButton current={statusFilter} value="Online" setValue={setStatusFilter} />
          <FilterButton current={statusFilter} value="Offline" setValue={setStatusFilter} />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        <div className="grid gap-4 md:grid-cols-2">
          {filteredVmCards.map((vm) => (
            <button
              key={vm.id}
              onClick={() => setSelectedVmId(vm.id)}
              className={cn(
                "rounded-sm border p-5 text-left transition",
                selectedVm?.id === vm.id
                  ? "border-primary bg-primary/8 shadow-sm"
                  : "border-border/60 bg-card/50 hover:border-primary/30 hover:bg-primary/5",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-lg font-black tracking-tight">{vm.hostname}</div>
                  <div className="text-xs text-muted-foreground">
                    {vm.customerName} · {vm.ipAddress} · {vm.tenantName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {vm.environment} · {vm.osType}
                  </div>
                </div>
                <VmStatusBadge value={vm.status} />
              </div>

              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <MiniStat label="Running" value={vm.runningBots} />
                <MiniStat label="Attended" value={vm.attendedBots} />
                <MiniStat label="Unattended" value={vm.unattendedBots} />
              </div>

              <div className="mt-3 rounded-sm border border-border/50 bg-background/60 p-3 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Heartbeat</span>
                  <span className={vm.lastHeartbeat.includes("awaiting") ? "text-amber-500" : ""}>
                    {vm.lastHeartbeat}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span>OS</span>
                  <span>{vm.osType} {vm.osVersion}</span>
                </div>
              </div>
            </button>
          ))}

          {filteredVmCards.length === 0 ? (
            <Card className="col-span-full border-border/60 bg-card/50 p-10 text-center">
              <HardDrive className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
              <h2 className="text-xl font-black tracking-tight">No VMs Found</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                This customer and environment scope does not currently have registered bot hosts.
              </p>
            </Card>
          ) : null}
        </div>

        <Card className="border-border/60 bg-card/50 p-6">
          {selectedVm ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">{selectedVm.hostname}</h2>
                  <VmStatusBadge value={selectedVm.status} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedVm.customerName} · {selectedVm.tenantName} · {selectedVm.environment}
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <DetailItem label="IP Address" value={selectedVm.ipAddress} />
                <DetailItem label="Fingerprint" value={selectedVm.fingerprint} />
                <DetailItem label="Certificate" value={selectedVm.mtlsCertThumbprint} />
                <DetailItem label="Last Heartbeat" value={selectedVm.lastHeartbeat} />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Running Bots On This VM</h3>
                </div>

                {selectedVm.sessions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedVm.sessions.map((session) => (
                      <div key={session.id} className="rounded-sm border border-border/60 bg-background/55 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="font-semibold text-foreground">{session.latestWorkflow}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              Agent {session.agentVersion} · {session.latestJobTrigger}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <ModeBadge value={session.mode} />
                            <SessionBadge value={session.status} />
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
                          <DetailStat label="Job Status" value={session.latestJobStatus} icon={Cpu} />
                          <DetailStat label="Queue" value={String(session.queueCount)} icon={Workflow} />
                          <DetailStat label="Started" value={new Date(session.startedAt).toLocaleTimeString()} icon={UserRound} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-sm border border-border/60 bg-background/55 p-6 text-sm text-muted-foreground">
                    No active bot sessions are currently attached to this VM.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex min-h-[380px] items-center justify-center text-center text-sm text-muted-foreground">
              Select a VM to inspect the bots currently running on it.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "good";
}) {
  return (
    <Card className={cn("border p-5 shadow-none", tone === "good" ? "border-emerald-500/20 bg-emerald-500/10" : "border-border/60 bg-card/50")}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
          <div className="mt-3 text-3xl font-black leading-none">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
    </Card>
  );
}

function FilterButton({
  current,
  value,
  setValue,
}: {
  current: "All" | "Online" | "Offline" | "Provisioning";
  value: "All" | "Online" | "Offline";
  setValue: React.Dispatch<React.SetStateAction<"All" | "Online" | "Offline" | "Provisioning">>;
}) {
  return (
    <button
      onClick={() => setValue(value)}
      className={cn(
        "h-10 rounded-sm border px-3 text-xs font-black uppercase tracking-[0.2em] transition",
        current === value ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:text-foreground",
      )}
    >
      {value}
    </button>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-border/50 bg-background/60 p-2">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border/60 bg-background/55 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="mt-2 break-all text-sm font-semibold">{value}</div>
    </div>
  );
}

function DetailStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-sm border border-border/60 bg-card/40 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em]">{label}</span>
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function VmStatusBadge({ value }: { value: string }) {
  const tone =
    value === "Online"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
      : value === "Provisioning"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
        : "border-rose-500/20 bg-rose-500/10 text-rose-600";
  return <Badge className={tone}>{value}</Badge>;
}

function ModeBadge({ value }: { value: string }) {
  return (
    <Badge className={value === "Attended" ? "border-sky-500/20 bg-sky-500/10 text-sky-600" : "border-violet-500/20 bg-violet-500/10 text-violet-600"}>
      {value}
    </Badge>
  );
}

function SessionBadge({ value }: { value: string }) {
  const tone =
    value === "Running"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
      : value === "Idle"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
        : "border-rose-500/20 bg-rose-500/10 text-rose-600";
  return <Badge className={tone}>{value}</Badge>;
}
