"use client";

import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useAppContext } from "@/lib/context";
import {
  Activity,
  Clock,
  Heart,
  Monitor,
  Save,
  Settings2,
  Signal,
  WifiOff,
  Zap,
} from "lucide-react";
import { updateHeartbeatIntervalAction } from "@/app/actions/botAgentActions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface HeartbeatHost {
  id: string;
  hostname: string;
  osType: string;
  status: string;
  lastHeartbeat: string | null;
  tenantId: string;
  tenantName: string;
  intervalSeconds: number;
}

interface Tenant {
  id: string;
  name: string;
  intervalSeconds: number;
}

interface HeartbeatConfigPanelProps {
  hosts: HeartbeatHost[];
  tenants: Tenant[];
}

// Preset options
const PRESETS = [
  { label: "10s", value: 10, desc: "Real-time" },
  { label: "15s", value: 15, desc: "High-freq" },
  { label: "30s", value: 30, desc: "Default" },
  { label: "60s", value: 60, desc: "Balanced" },
  { label: "120s", value: 120, desc: "Low-freq" },
  { label: "300s", value: 300, desc: "Minimal" },
];

function formatAgo(iso: string | null): { text: string; stale: boolean; lag: number } {
  if (!iso) return { text: "No heartbeat", stale: true, lag: Infinity };
  const lag = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (lag < 5) return { text: "Just now", stale: false, lag };
  if (lag < 60) return { text: `${lag}s ago`, stale: lag > 90, lag };
  const m = Math.floor(lag / 60);
  return { text: `${m}m ${lag % 60}s ago`, stale: lag > 300, lag };
}

function HeartbeatMeter({ lag, interval }: { lag: number; interval: number }) {
  // Percentage of interval elapsed
  const pct = Math.min(100, Math.round((lag / (interval * 2)) * 100));
  const color = lag < interval * 1.5
    ? "bg-emerald-500"
    : lag < interval * 3
    ? "bg-amber-500"
    : "bg-rose-500";

  return (
    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
      <div
        className={cn("h-full rounded-full transition-all duration-700", color)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function HeartbeatConfigPanel({ hosts, tenants }: HeartbeatConfigPanelProps) {
  const { activeTenant, role } = useAppContext();
  const [now, setNow] = useState(Date.now());

  // Selected tenant to configure
  const [selectedTenantId, setSelectedTenantId] = useState<string>(
    tenants[0]?.id ?? activeTenant?.id ?? ""
  );

  // Find current interval for selected tenant
  const currentTenant = tenants.find(t => t.id === selectedTenantId);
  const [interval, setIntervalSecs] = useState<number>(currentTenant?.intervalSeconds ?? 30);
  const safeInterval = isNaN(interval) || interval < 10 ? 30 : interval;
  const [isSaving, setIsSaving] = useState(false);

  // Sync when tenant changes
  useEffect(() => {
    const t = tenants.find(t => t.id === selectedTenantId);
    if (t) setIntervalSecs(isNaN(t.intervalSeconds) ? 30 : t.intervalSeconds);
  }, [selectedTenantId, tenants]);

  // Live clock ticking
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleSave = async () => {
    if (!selectedTenantId) return;
    setIsSaving(true);
    try {
      const result = await updateHeartbeatIntervalAction(selectedTenantId, interval, role);
      if (result.success) {
        toast.success("Heartbeat Interval Saved", {
          description: `Agents in this tenant will now ping every ${interval}s.`,
        });
      } else {
        toast.error("Save Failed", { description: result.error });
      }
    } catch (e) {
      toast.error("Error", { description: "Failed to save heartbeat interval." });
    } finally {
      setIsSaving(false);
    }
  };

  // Aggregate stats
  const activeHosts = hosts.filter(h => h.status === "Active" || h.status === "Online");
  const staleHosts = hosts.filter(h => {
    if (!h.lastHeartbeat) return true;
    return (Date.now() - new Date(h.lastHeartbeat).getTime()) / 1000 > h.intervalSeconds * 3;
  });

  return (
    <div className="space-y-6">
      {/* Header strip */}
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Registered Agents", value: hosts.length, icon: Monitor, color: "text-primary" },
          { label: "Active", value: activeHosts.length, icon: Signal, color: "text-emerald-500" },
          { label: "Stale / Silent", value: staleHosts.length, icon: WifiOff, color: "text-rose-500" },
          { label: "Avg Interval", value: hosts.length > 0 ? `${Math.round(hosts.reduce((s, h) => s + h.intervalSeconds, 0) / hosts.length)}s` : "30s", icon: Clock, color: "text-primary" },
        ].map(tile => {
          const Icon = tile.icon;
          return (
            <div key={tile.label} className="rounded-sm border border-border bg-card/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">{tile.label}</span>
                <Icon className={cn("h-4 w-4", tile.color)} />
              </div>
              <div className={cn("mt-3 text-3xl font-black tracking-tight", tile.color)}>{tile.value}</div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Interval Configurator */}
        <Card className="border-border/60 bg-card/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <Settings2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">Heartbeat Frequency</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Configure how often agents ping the orchestrator.</p>
            </div>
          </div>

          {/* Tenant selector */}
          {tenants.length > 1 && (
            <div className="mt-5">
              <label className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Configure for Tenant
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
                {tenants.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTenantId(t.id)}
                    className={cn(
                      "rounded-sm border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition",
                      selectedTenantId === t.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Preset buttons */}
          <div className="mt-6">
            <label className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
              Presets
            </label>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setIntervalSecs(p.value)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-sm border py-2.5 transition text-center",
                    safeInterval === p.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background/70 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <span className="text-sm font-black">{p.label}</span>
                  <span className="text-[9px] uppercase tracking-wider opacity-70">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Slider */}
          <div className="mt-6">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">
                Custom Interval
              </label>
              <div className="flex items-center gap-2">
                <div className="rounded-sm border border-primary/30 bg-primary/10 px-3 py-1">
                  <span className="text-xl font-black text-primary">{safeInterval}</span>
                  <span className="ml-1 text-xs text-muted-foreground">seconds</span>
                </div>
              </div>
            </div>

            <input
              type="range"
              min={10}
              max={300}
              step={5}
              value={safeInterval}
              onChange={e => setIntervalSecs(parseInt(e.target.value))}
              className="mt-3 w-full accent-primary cursor-pointer"
            />

            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>10s (Real-time)</span>
              <span>60s (Balanced)</span>
              <span>300s (Minimal)</span>
            </div>
          </div>

          {/* Impact summary */}
          <div className="mt-5 rounded-sm border border-border bg-background/60 p-4">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <div className="text-lg font-black text-foreground">{safeInterval}s</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ping interval</div>
              </div>
              <div>
                <div className="text-lg font-black text-foreground">{Math.round(3600 / safeInterval)}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Pings / hour</div>
              </div>
              <div>
                <div className="text-lg font-black text-foreground">{safeInterval <= 15 ? "High" : safeInterval <= 45 ? "Med" : "Low"}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Network load</div>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving || !selectedTenantId}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-black uppercase tracking-wider text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {isSaving ? "Saving…" : `Save — ${safeInterval}s Interval`}
          </button>
        </Card>

        {/* Live Agent Heartbeat Status */}
        <Card className="border-border/60 bg-card/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <Heart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">Live Agent Status</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Last heartbeat per registered runner.</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {hosts.length === 0 ? (
              <div className="rounded-sm border border-border bg-background/60 py-10 text-center">
                <Activity className="mx-auto h-8 w-8 text-muted-foreground/30" />
                <p className="mt-3 text-sm font-bold text-foreground">No agents registered</p>
                <p className="mt-1 text-xs text-muted-foreground">Register a Bot Runner to see live heartbeat status.</p>
              </div>
            ) : (
              hosts.map(host => {
                const { text, stale, lag } = formatAgo(host.lastHeartbeat);
                const isActive = host.status === "Active" || host.status === "Online";
                return (
                  <div
                    key={host.id}
                    className={cn(
                      "rounded-sm border p-4 transition",
                      stale
                        ? "border-rose-500/20 bg-rose-500/5"
                        : isActive
                        ? "border-emerald-500/20 bg-emerald-500/5"
                        : "border-border bg-background/60"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "relative flex h-7 w-7 items-center justify-center rounded-sm border",
                          isActive && !stale ? "border-emerald-500/30 bg-emerald-500/10" : "border-border bg-background"
                        )}>
                          <Monitor className={cn("h-3.5 w-3.5", isActive && !stale ? "text-emerald-500" : "text-muted-foreground")} />
                          {isActive && !stale && (
                            <div className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-500 animate-pulse border border-card" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{host.hostname}</div>
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{host.osType} · {host.tenantName}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-xs font-bold",
                          stale ? "text-rose-500" : isActive ? "text-emerald-500" : "text-muted-foreground"
                        )}>
                          {text}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          every {host.intervalSeconds}s
                        </div>
                      </div>
                    </div>
                    <div className="mt-3">
                      <HeartbeatMeter lag={isFinite(lag) ? lag : host.intervalSeconds * 6} interval={host.intervalSeconds} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className={cn(
                        "font-bold uppercase",
                        stale ? "text-rose-500" : isActive ? "text-emerald-500" : ""
                      )}>
                        {stale ? "STALE" : isActive ? "LIVE" : host.status.toUpperCase()}
                      </span>
                      <span>
                        {isFinite(lag) && lag < host.intervalSeconds * 1.5
                          ? `Next ping in ~${Math.max(0, host.intervalSeconds - lag)}s`
                          : "Waiting for next ping…"}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
