"use client";

import React, { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Gauge,
  HardDrive,
  HeartPulse,
  LoaderCircle,
  PauseCircle,
  PlayCircle,
  RefreshCcw,
  Search,
  Server,
  ShieldAlert,
  Siren,
  SquareTerminal,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppContext } from "@/lib/context";
import {
  controlPlatformServiceAction,
  getPlatformServicesSnapshot,
} from "@/app/actions/platformServiceActions";

type DashboardSnapshot = Awaited<ReturnType<typeof getPlatformServicesSnapshot>>;
type ServiceRecord = DashboardSnapshot["services"][number];

const REFRESH_OPTIONS = [5, 10, 30] as const;
const STATUS_FILTERS = ["All", "Running", "Stopped", "Degraded", "High Load"] as const;

export default function PlatformServicesPage() {
  const { role, currentUser, activeCustomer } = useAppContext();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [tenantFilter, setTenantFilter] = useState("All");
  const [environmentFilter, setEnvironmentFilter] = useState("All");
  const [regionFilter, setRegionFilter] = useState("All");
  const [refreshSeconds, setRefreshSeconds] = useState<(typeof REFRESH_OPTIONS)[number]>(10);
  const [isPending, startTransition] = useTransition();
  const [isActionPending, startActionTransition] = useTransition();

  const loadSnapshot = useCallback(() => {
    startTransition(async () => {
      const result = await getPlatformServicesSnapshot(activeCustomer?.id ?? null);
      if (!result.success) {
        toast.error(result.error || "Unable to load service dashboard.");
      }
      setSnapshot(result);
      setSelectedServiceId((previous) => {
        if (previous && result.services.some((service) => service.id === previous)) return previous;
        return result.services[0]?.id ?? null;
      });
    });
  }, [activeCustomer?.id]);

  useEffect(() => {
    loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadSnapshot();
    }, refreshSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [refreshSeconds, loadSnapshot]);

  const services = useMemo(() => snapshot?.services ?? [], [snapshot?.services]);
  const tenantOptions = useMemo(() => ["All", ...new Set(services.map((service) => service.tenantName))], [services]);
  const environmentOptions = useMemo(() => ["All", ...new Set(services.map((service) => service.environment))], [services]);
  const regionOptions = useMemo(() => ["All", ...new Set(services.map((service) => service.region))], [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesSearch =
        search.trim().length === 0 ||
        [
          service.serviceName,
          service.customerName,
          service.tenantName,
          service.environment,
          service.region,
          service.module,
        ]
          .join(" ")
          .toLowerCase()
          .includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "High Load"
          ? service.metrics.cpuUsage > 80 || service.metrics.memoryUsage > 75
          : service.status === statusFilter);

      const matchesTenant = tenantFilter === "All" || service.tenantName === tenantFilter;
      const matchesEnvironment = environmentFilter === "All" || service.environment === environmentFilter;
      const matchesRegion = regionFilter === "All" || service.region === regionFilter;

      return matchesSearch && matchesStatus && matchesTenant && matchesEnvironment && matchesRegion;
    });
  }, [services, search, statusFilter, tenantFilter, environmentFilter, regionFilter]);

  const selectedService =
    filteredServices.find((service) => service.id === selectedServiceId) ||
    services.find((service) => service.id === selectedServiceId) ||
    filteredServices[0] ||
    null;

  const alertFeed = useMemo(() => {
    return (snapshot?.alerts ?? []).filter((alert) => {
      const tenantMatch = tenantFilter === "All" || alert.tenantName === tenantFilter;
      const environmentMatch = environmentFilter === "All" || alert.environment === environmentFilter;
      return tenantMatch && environmentMatch;
    });
  }, [snapshot?.alerts, tenantFilter, environmentFilter]);

  const graphSummary = useMemo(() => {
    const healthCounts = {
      healthy: filteredServices.filter((service) => service.health === "healthy").length,
      warning: filteredServices.filter((service) => service.health === "warning").length,
      critical: filteredServices.filter((service) => service.health === "critical").length,
    };

    const environmentStats = Array.from(
      filteredServices.reduce((map, service) => {
        const current = map.get(service.environment) ?? {
          label: service.environment,
          count: 0,
          totalCpu: 0,
          totalMemory: 0,
          totalErrors: 0,
        };
        current.count += 1;
        current.totalCpu += service.metrics.cpuUsage;
        current.totalMemory += service.metrics.memoryUsage;
        current.totalErrors += service.metrics.errorRate;
        map.set(service.environment, current);
        return map;
      }, new Map<string, { label: string; count: number; totalCpu: number; totalMemory: number; totalErrors: number }>()),
    )
      .map(([, entry]) => ({
        label: entry.label,
        count: entry.count,
        cpu: Math.round(entry.totalCpu / entry.count),
        memory: Math.round(entry.totalMemory / entry.count),
        errors: Number((entry.totalErrors / entry.count).toFixed(1)),
      }))
      .sort((left, right) => right.cpu - left.cpu);

    const attentionList = filteredServices
      .map((service) => ({
        id: service.id,
        label: `${service.serviceName} · ${service.tenantName}`,
        loadScore:
          service.metrics.cpuUsage * 0.45 +
          service.metrics.memoryUsage * 0.25 +
          service.metrics.errorRate * 6 +
          service.metrics.queueDepth * 2.5,
        status: service.status,
      }))
      .sort((left, right) => right.loadScore - left.loadScore)
      .slice(0, 5);

    const averageCpu = filteredServices.length
      ? Math.round(filteredServices.reduce((total, service) => total + service.metrics.cpuUsage, 0) / filteredServices.length)
      : 0;
    const averageMemory = filteredServices.length
      ? Math.round(filteredServices.reduce((total, service) => total + service.metrics.memoryUsage, 0) / filteredServices.length)
      : 0;
    const averageLatency = filteredServices.length
      ? Math.round(filteredServices.reduce((total, service) => total + service.metrics.responseTime, 0) / filteredServices.length)
      : 0;

    return {
      healthCounts,
      environmentStats,
      attentionList,
      averageCpu,
      averageMemory,
      averageLatency,
    };
  }, [filteredServices]);

  const handleControl = (service: ServiceRecord, action: Parameters<typeof controlPlatformServiceAction>[0]["action"]) => {
    if (role !== "Platform Admin") {
      toast.error("Only Platform Admin can control services.");
      return;
    }

    const verb =
      action === "scale_up"
        ? "scale up"
        : action === "scale_down"
          ? "scale down"
          : action === "drain_traffic"
            ? service.drainTraffic
              ? "resume traffic for"
              : "drain traffic for"
            : action;

    if (!window.confirm(`Please confirm you want to ${verb} ${service.serviceName} in ${service.tenantName}.`)) {
      return;
    }

    startActionTransition(async () => {
      const result = await controlPlatformServiceAction({
        tenantId: service.tenantId,
        serviceName: service.serviceName,
        action,
        actorRole: role,
        actorEmail: currentUser.email,
      });

      if (!result.success) {
        toast.error(result.error || "Service action failed.");
        return;
      }

      toast.success(`${service.serviceName} action queued.`);
      loadSnapshot();
    });
  };

  if (role !== "Platform Admin") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <Card className="max-w-xl border-amber-500/30 bg-amber-500/5 p-10 text-center">
          <ShieldAlert className="mx-auto mb-4 h-12 w-12 text-amber-500" />
          <h1 className="text-2xl font-black uppercase tracking-tight">Restricted Surface</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Platform service controls are reserved for Platform Admin operators.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden -m-4 md:-m-5">
      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar space-y-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-sm border border-primary/20 bg-primary/10 text-primary">
              <Server className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                <HeartPulse className="h-3 w-3" />
                Platform Admin Command Surface
              </div>
              <h1 className="text-4xl font-black tracking-tight text-foreground">Service Monitoring & Control</h1>
            </div>
          </div>
          <p className="max-w-4xl text-sm uppercase tracking-wide text-muted-foreground">
            Real-time visibility into platform services, module pressure, tenant isolation, and audited runtime controls.
          </p>
          <div className="inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-primary">
            <span>Selected Customer</span>
            <span className="text-foreground">{activeCustomer?.companyName ?? "All Customers"}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <RefreshControl value={refreshSeconds} onChange={setRefreshSeconds} />
          <Button variant="outline" onClick={loadSnapshot} disabled={isPending}>
            <RefreshCcw className={cn("h-4 w-4", isPending && "animate-spin")} />
            Refresh now
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryTile label="Total Services" value={snapshot?.summary.totalServices ?? 0} tone="default" icon={Server} />
        <SummaryTile label="Running" value={snapshot?.summary.running ?? 0} tone="good" icon={Activity} />
        <SummaryTile label="Failed" value={snapshot?.summary.failed ?? 0} tone="bad" icon={Siren} />
        <SummaryTile label="High Load" value={snapshot?.summary.highLoad ?? 0} tone="warn" icon={Gauge} />
        <SummaryTile label="Degraded" value={snapshot?.summary.degraded ?? 0} tone="warn" icon={AlertTriangle} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.2fr_1fr]">
        <Card className="border-border/60 bg-card/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Health Overview</h2>
              <p className="mt-1 text-xs text-muted-foreground">A simple split of what is healthy, strained, or critical.</p>
            </div>
            <HeartPulse className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-5">
            <HealthDonut counts={graphSummary.healthCounts} />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <LegendStat label="Healthy" value={graphSummary.healthCounts.healthy} color="bg-emerald-500" />
            <LegendStat label="Warning" value={graphSummary.healthCounts.warning} color="bg-amber-500" />
            <LegendStat label="Critical" value={graphSummary.healthCounts.critical} color="bg-rose-500" />
          </div>
        </Card>

        <Card className="border-border/60 bg-card/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Environment Load Graph</h2>
              <p className="mt-1 text-xs text-muted-foreground">Which environments are carrying the most load right now.</p>
            </div>
            <Gauge className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-5 space-y-4">
            {graphSummary.environmentStats.slice(0, 5).map((entry) => (
              <EnvironmentLoadRow key={entry.label} entry={entry} />
            ))}
            {graphSummary.environmentStats.length === 0 ? <p className="text-sm text-muted-foreground">No environment data in this view.</p> : null}
          </div>
        </Card>

        <Card className="border-border/60 bg-card/50 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Easy Read Pulse</h2>
              <p className="mt-1 text-xs text-muted-foreground">Average usage and the first places a normal user should look.</p>
            </div>
            <Waypoints className="h-4 w-4 text-primary" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <MiniGauge label="Avg CPU" value={graphSummary.averageCpu} />
            <MiniGauge label="Avg Memory" value={graphSummary.averageMemory} />
            <MiniGauge label="Avg Latency" value={Math.min(100, Math.round(graphSummary.averageLatency / 4))} display={`${graphSummary.averageLatency}ms`} />
          </div>
          <div className="mt-5 space-y-3">
            {graphSummary.attentionList.map((entry, index) => (
              <div key={entry.id} className="rounded-sm border border-border/60 bg-background/55 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold">{index + 1}. {entry.label}</div>
                  <StatusBadge value={entry.status} compact />
                </div>
                <div className="mt-2 h-2 rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-2 rounded-full",
                      entry.loadScore > 80 ? "bg-rose-500" : entry.loadScore > 60 ? "bg-amber-500" : "bg-emerald-500",
                    )}
                    style={{ width: `${Math.min(entry.loadScore, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/50 p-4">
        <div className="grid gap-3 lg:grid-cols-[1.7fr_repeat(4,minmax(0,1fr))]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search service, module, tenant, region"
              className="h-10 w-full rounded-sm border border-border bg-background pl-10 pr-4 text-sm outline-none ring-0 transition focus:border-primary"
            />
          </div>
          <SelectFilter
            label="Status"
            value={statusFilter}
            options={STATUS_FILTERS as unknown as string[]}
            onChange={(value) => setStatusFilter(value as (typeof STATUS_FILTERS)[number])}
          />
          <SelectFilter label="Tenant" value={tenantFilter} options={tenantOptions} onChange={setTenantFilter} />
          <SelectFilter label="Environment" value={environmentFilter} options={environmentOptions} onChange={setEnvironmentFilter} />
          <SelectFilter label="Region" value={regionFilter} options={regionOptions} onChange={setRegionFilter} />
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.65fr_1fr]">
        <Card className="overflow-hidden border-border/60 bg-card/50">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.25em] text-muted-foreground">Service Inventory</h2>
              <p className="mt-1 text-xs text-muted-foreground">{filteredServices.length} services in current view</p>
            </div>
            {isActionPending ? <LoaderCircle className="h-4 w-4 animate-spin text-primary" /> : null}
          </div>

          <div className="max-h-[860px] overflow-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="sticky top-0 bg-background/95 backdrop-blur">
                <tr className="border-b border-border/60 text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  <th className="px-5 py-3">Service</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Health</th>
                  <th className="px-4 py-3">CPU</th>
                  <th className="px-4 py-3">Memory</th>
                  <th className="px-4 py-3">Req/s</th>
                  <th className="px-4 py-3">Latency</th>
                  <th className="px-4 py-3">Errors</th>
                </tr>
              </thead>
              <tbody>
                {filteredServices.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <tr
                      key={service.id}
                      onClick={() => setSelectedServiceId(service.id)}
                      className={cn(
                        "cursor-pointer border-b border-border/50 transition hover:bg-primary/5",
                        isSelected && "bg-primary/8",
                      )}
                    >
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-foreground">{service.serviceName}</span>
                            {service.drainTraffic ? <Badge className="border-amber-500/20 bg-amber-500/10 text-amber-600">Draining</Badge> : null}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {service.customerName} · {service.environment} · {service.region}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-foreground">{service.tenantName}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{service.serviceType}</td>
                      <td className="px-4 py-4">
                        <StatusBadge value={service.status} />
                      </td>
                      <td className="px-4 py-4">
                        <HealthDot value={service.health} />
                      </td>
                      <td className="px-4 py-4 text-sm">{service.metrics.cpuUsage}%</td>
                      <td className="px-4 py-4 text-sm">{service.metrics.memoryUsage}%</td>
                      <td className="px-4 py-4 text-sm">{service.metrics.requestRate}</td>
                      <td className="px-4 py-4 text-sm">{service.metrics.responseTime} ms</td>
                      <td className="px-4 py-4 text-sm">{service.metrics.errorRate}%</td>
                    </tr>
                  );
                })}
                {filteredServices.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-5 py-14 text-center text-sm text-muted-foreground">
                      No services match the current filter set.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/60 bg-card/50 p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Global Alert Feed</h2>
                <p className="mt-1 text-xs text-muted-foreground">Thresholds: CPU &gt; 80, Memory &gt; 75, Error rate &gt; 5</p>
              </div>
              <Siren className="h-4 w-4 text-rose-500" />
            </div>
            <div className="space-y-3">
              {alertFeed.slice(0, 6).map((alert) => (
                <div key={`${alert.id}-${alert.message}`} className="rounded-sm border border-border/60 bg-background/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold">{alert.serviceName}</div>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{alert.message}</p>
                  <div className="mt-2 text-[11px] text-muted-foreground">
                    {alert.tenantName} · {alert.environment} · {alert.channels.join(" / ")}
                  </div>
                </div>
              ))}
              {alertFeed.length === 0 ? <p className="text-sm text-muted-foreground">No active threshold alerts in this view.</p> : null}
            </div>
          </Card>

          <Card className="border-border/60 bg-card/50 p-5">
            <div className="mb-4 flex items-center gap-3">
              <Waypoints className="h-4 w-4 text-primary" />
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Module Load Heatmap</h2>
                <p className="mt-1 text-xs text-muted-foreground">CPU pressure across visible services</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {filteredServices.slice(0, 8).map((service) => (
                <div
                  key={service.id}
                  className={cn(
                    "rounded-sm border p-3 text-xs",
                    service.metrics.cpuUsage > 80
                      ? "border-rose-500/30 bg-rose-500/10"
                      : service.metrics.cpuUsage > 65
                        ? "border-amber-500/30 bg-amber-500/10"
                        : "border-emerald-500/20 bg-emerald-500/10",
                  )}
                >
                  <div className="truncate font-semibold">{service.serviceName}</div>
                  <div className="mt-1 text-muted-foreground">{service.tenantName}</div>
                  <div className="mt-3 text-lg font-black">{service.metrics.cpuUsage}%</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {selectedService ? (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <Card className="border-border/60 bg-card/50 p-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-2xl font-black tracking-tight">{selectedService.serviceName}</h2>
                  <StatusBadge value={selectedService.status} />
                  <HealthDot value={selectedService.health} />
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedService.customerName} · {selectedService.tenantName} · {selectedService.environment} · {selectedService.region}
                </p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>Version {selectedService.version}</span>
                  <span>Uptime {selectedService.uptime}</span>
                  <span>{selectedService.desiredInstances} instance(s)</span>
                  <span>{selectedService.host}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <ActionButton icon={PlayCircle} label="Start Service" onClick={() => handleControl(selectedService, "start")} />
                <ActionButton icon={RefreshCcw} label="Restart Service" onClick={() => handleControl(selectedService, "restart")} />
                <ActionButton icon={PauseCircle} label="Stop" onClick={() => handleControl(selectedService, "stop")} />
                <ActionButton icon={ArrowUp} label="Scale Up" onClick={() => handleControl(selectedService, "scale_up")} />
                <ActionButton icon={ArrowDown} label="Scale Down" onClick={() => handleControl(selectedService, "scale_down")} />
                <ActionButton icon={SquareTerminal} label={selectedService.drainTraffic ? "Resume Traffic" : "Drain Traffic"} onClick={() => handleControl(selectedService, "drain_traffic")} />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="CPU Usage" value={`${selectedService.metrics.cpuUsage}%`} icon={Gauge} tone={selectedService.metrics.cpuUsage > 80 ? "warn" : "good"} />
              <MetricCard label="Memory Usage" value={`${selectedService.metrics.memoryUsage}%`} icon={HardDrive} tone={selectedService.metrics.memoryUsage > 75 ? "warn" : "good"} />
              <MetricCard label="Request Rate" value={`${selectedService.metrics.requestRate}/s`} icon={Activity} tone="default" />
              <MetricCard label="P95 Latency" value={`${selectedService.metrics.p95Latency} ms`} icon={HeartPulse} tone={selectedService.metrics.p95Latency > 300 ? "warn" : "default"} />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-3">
              <ChartCard title="CPU Trend" values={selectedService.metrics.series.cpu} suffix="%" />
              <ChartCard title="Memory Trend" values={selectedService.metrics.series.memory} suffix="%" />
              <ChartCard title="Latency Trend" values={selectedService.metrics.series.latency} suffix="ms" />
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card className="border-border/60 bg-background/50 p-4 shadow-none">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Dependency Map</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedService.dependencies.map((dependency) => (
                    <span key={dependency} className="rounded-sm border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary">
                      {dependency}
                    </span>
                  ))}
                </div>
              </Card>
              <Card className="border-border/60 bg-background/50 p-4 shadow-none">
                <h3 className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">Control State</h3>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <InfoPair label="Desired Instances" value={String(selectedService.desiredInstances)} />
                  <InfoPair label="Traffic Mode" value={selectedService.drainTraffic ? "Draining" : "Serving"} />
                  <InfoPair label="Last Action" value={selectedService.controlState.lastAction.replaceAll("_", " ")} />
                  <InfoPair label="Last Actor" value={selectedService.controlState.lastActionBy} />
                </div>
              </Card>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-border/60 bg-card/50 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Recent Logs</h3>
              <div className="mt-4 space-y-3">
                {selectedService.logs.map((log) => (
                  <div key={log.id} className="rounded-sm border border-border/60 bg-background/55 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <SeverityBadge severity={log.severity} />
                      <span className="text-[11px] text-muted-foreground">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2 text-sm font-semibold">{log.action}</div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{log.details || "No details recorded."}</p>
                  </div>
                ))}
                {selectedService.logs.length === 0 ? <p className="text-sm text-muted-foreground">No service-specific logs recorded yet.</p> : null}
              </div>
            </Card>

            <Card className="border-border/60 bg-card/50 p-5">
              <h3 className="text-sm font-black uppercase tracking-[0.22em] text-muted-foreground">Deployment History</h3>
              <div className="mt-4 space-y-3">
                {selectedService.deploymentHistory.map((deployment) => (
                  <div key={deployment.id} className="rounded-sm border border-border/60 bg-background/55 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">Version {deployment.version}</div>
                      <StatusBadge value={deployment.status} compact />
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {deployment.initiatedBy} · {new Date(deployment.initiatedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                {selectedService.deploymentHistory.length === 0 ? <p className="text-sm text-muted-foreground">No deployments recorded for this tenant yet.</p> : null}
              </div>
            </Card>
          </div>
        </div>
      ) : null}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: number;
  tone: "default" | "good" | "warn" | "bad";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneClasses =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
      : tone === "warn"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
        : tone === "bad"
          ? "border-rose-500/20 bg-rose-500/10 text-rose-600"
          : "border-primary/20 bg-primary/10 text-primary";

  return (
    <Card className={cn("border p-5 shadow-none", toneClasses)}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.22em] opacity-75">{label}</div>
          <div className="mt-3 text-3xl font-black leading-none">{value}</div>
        </div>
        <Icon className="h-5 w-5" />
      </div>
    </Card>
  );
}

function RefreshControl({
  value,
  onChange,
}: {
  value: 5 | 10 | 30;
  onChange: (value: 5 | 10 | 30) => void;
}) {
  return (
    <div className="flex items-center rounded-sm border border-border bg-background p-1">
      {REFRESH_OPTIONS.map((option) => (
        <button
          key={option}
          onClick={() => onChange(option)}
          className={cn(
            "rounded-sm px-3 py-1.5 text-xs font-bold uppercase tracking-[0.2em] transition",
            value === option ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option}s
        </button>
      ))}
    </div>
  );
}

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-sm border border-border bg-background px-3 text-sm outline-none transition focus:border-primary"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function StatusBadge({ value, compact = false }: { value: string; compact?: boolean }) {
  const className =
    value === "Running" || value === "SUCCESS"
      ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
      : value === "Stopped" || value === "FAILED"
        ? "border-rose-500/20 bg-rose-500/10 text-rose-600"
        : "border-amber-500/20 bg-amber-500/10 text-amber-600";

  return <Badge className={cn("font-semibold", compact ? "px-2 py-0.5 text-[10px]" : "", className)}>{value}</Badge>;
}

function HealthDot({ value }: { value: string }) {
  const className =
    value === "healthy"
      ? "bg-emerald-500"
      : value === "warning"
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2.5 w-2.5 rounded-full", className)} />
      <span className="text-xs capitalize text-muted-foreground">{value}</span>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const normalized = severity.toLowerCase();
  const className =
    normalized === "critical"
      ? "border-rose-500/20 bg-rose-500/10 text-rose-600"
      : normalized === "warning" || normalized === "high"
        ? "border-amber-500/20 bg-amber-500/10 text-amber-600"
        : "border-sky-500/20 bg-sky-500/10 text-sky-600";

  return <Badge className={className}>{severity}</Badge>;
}

function MetricCard({
  label,
  value,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  tone: "default" | "good" | "warn";
  icon: React.ComponentType<{ className?: string }>;
}) {
  const toneClass =
    tone === "good"
      ? "border-emerald-500/20 bg-emerald-500/10"
      : tone === "warn"
        ? "border-amber-500/20 bg-amber-500/10"
        : "border-border/60 bg-background/55";

  return (
    <Card className={cn("p-4 shadow-none", toneClass)}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">{label}</div>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-4 text-2xl font-black">{value}</div>
    </Card>
  );
}

function ChartCard({ title, values, suffix }: { title: string; values: number[]; suffix: string }) {
  const width = 240;
  const height = 80;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const points = values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * width;
      const y = height - ((value - min) / Math.max(max - min, 1)) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Card className="border-border/60 bg-background/55 p-4 shadow-none">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black uppercase tracking-[0.22em] text-muted-foreground">{title}</h3>
        <span className="text-sm font-semibold">{values[values.length - 1]}{suffix}</span>
      </div>
      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-24 w-full overflow-visible">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            points={points}
            className="text-primary"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </Card>
  );
}

function InfoPair({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border/60 bg-background/55 p-3">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 break-all text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button variant="outline" onClick={onClick}>
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );
}

function HealthDonut({
  counts,
}: {
  counts: { healthy: number; warning: number; critical: number };
}) {
  const total = counts.healthy + counts.warning + counts.critical;
  const safeTotal = total || 1;
  const healthyAngle = (counts.healthy / safeTotal) * 360;
  const warningAngle = ((counts.healthy + counts.warning) / safeTotal) * 360;

  return (
    <div className="flex items-center justify-center">
      <div
        className="relative flex h-48 w-48 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(#10b981 0deg ${healthyAngle}deg, #f59e0b ${healthyAngle}deg ${warningAngle}deg, #f43f5e ${warningAngle}deg 360deg)`,
        }}
      >
        <div className="flex h-28 w-28 flex-col items-center justify-center rounded-full bg-background text-center shadow-inner">
          <span className="text-3xl font-black">{total}</span>
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">Services</span>
        </div>
      </div>
    </div>
  );
}

function LegendStat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-sm border border-border/60 bg-background/55 p-3">
      <div className="flex items-center gap-2">
        <span className={cn("h-2.5 w-2.5 rounded-full", color)} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      </div>
      <div className="mt-2 text-2xl font-black">{value}</div>
    </div>
  );
}

function EnvironmentLoadRow({
  entry,
}: {
  entry: { label: string; count: number; cpu: number; memory: number; errors: number };
}) {
  const load = Math.max(entry.cpu, entry.memory);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold">{entry.label}</div>
          <div className="text-xs text-muted-foreground">{entry.count} services · {entry.errors}% avg errors</div>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <div>CPU {entry.cpu}%</div>
          <div>Memory {entry.memory}%</div>
        </div>
      </div>
      <div className="h-3 rounded-full bg-muted">
        <div
          className={cn(
            "h-3 rounded-full",
            load > 80 ? "bg-rose-500" : load > 65 ? "bg-amber-500" : "bg-emerald-500",
          )}
          style={{ width: `${load}%` }}
        />
      </div>
    </div>
  );
}

function MiniGauge({
  label,
  value,
  display,
}: {
  label: string;
  value: number;
  display?: string;
}) {
  const bounded = Math.max(0, Math.min(value, 100));
  return (
    <div className="rounded-sm border border-border/60 bg-background/55 p-3 text-center">
      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-3 flex justify-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-full border-[6px]"
          style={{
            borderColor: bounded > 80 ? "#f43f5e" : bounded > 65 ? "#f59e0b" : "#10b981",
          }}
        >
          <span className="text-sm font-black">{display ?? `${bounded}%`}</span>
        </div>
      </div>
    </div>
  );
}
