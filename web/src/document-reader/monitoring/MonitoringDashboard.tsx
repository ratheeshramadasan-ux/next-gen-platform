"use client";

/**
 * Pipeline Monitoring Dashboard — Phase I DU Rollout
 * Menu: Document Reader > Monitoring
 *
 * Live view of pipeline health: queue depth, error rate,
 * processing latency per model, and recent failures.
 */

import React, { useState, useEffect } from "react";
import {
  Activity, AlertCircle, CheckCircle2, Clock, Zap,
  TrendingUp, TrendingDown, RefreshCw, Database,
  Play, Pause, RotateCcw, ChevronRight, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Simulated live data ───────────────────────────────────────────────────────

function randomDelta(base: number, pct: number) {
  return base + (Math.random() - 0.5) * 2 * base * pct;
}

const PIPELINE_INSTANCES = [
  { id: "p1", model: "Passport ID", status: "running", queueDepth: 47, latencyMs: 890, errorRate: 0.3, throughput: 412 },
  { id: "p2", model: "Invoice Processor", status: "running", queueDepth: 231, latencyMs: 1240, errorRate: 0.1, throughput: 1820 },
  { id: "p3", model: "Claim Intake Form", status: "idle", queueDepth: 0, latencyMs: 0, errorRate: 0, throughput: 0 },
  { id: "p4", model: "Medical Chart", status: "error", queueDepth: 12, latencyMs: 4800, errorRate: 8.4, throughput: 18 },
  { id: "p5", model: "Settlement Agreement", status: "paused", queueDepth: 56, latencyMs: 0, errorRate: 0, throughput: 0 },
];

const RECENT_ERRORS = [
  { id: "e1", pipeline: "Medical Chart", error: "OCR timeout after 5000ms — page 3 of doc #8812", time: "2 min ago" },
  { id: "e2", pipeline: "Medical Chart", error: "Extraction confidence below threshold (42%) — skipped", time: "5 min ago" },
  { id: "e3", pipeline: "Passport ID", error: "PII redaction failed — field 'dob' pattern not matched", time: "18 min ago" },
];

type PStatus = "running" | "idle" | "error" | "paused";

const STATUS_MAP: Record<PStatus, { label: string; color: string; dot: string }> = {
  running: { label: "Running", color: "text-emerald-500", dot: "bg-emerald-500 animate-pulse" },
  idle: { label: "Idle", color: "text-muted-foreground", dot: "bg-muted-foreground/30" },
  error: { label: "Error", color: "text-rose-500", dot: "bg-rose-500 animate-pulse" },
  paused: { label: "Paused", color: "text-amber-500", dot: "bg-amber-500" },
};

function PipelineRow({ instance, tick }: { instance: typeof PIPELINE_INSTANCES[0]; tick: number }) {
  const s = STATUS_MAP[instance.status as PStatus];
  const liveLatency = instance.status === "running"
    ? Math.round(randomDelta(instance.latencyMs, 0.08))
    : instance.latencyMs;
  const liveQueue = instance.status === "running"
    ? Math.max(0, instance.queueDepth + Math.floor((Math.random() - 0.5) * 10))
    : instance.queueDepth;

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors border-b border-border/20 last:border-0">
      <div className={cn("w-2 h-2 rounded-full shrink-0", s.dot)} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-foreground uppercase truncate">{instance.model}</p>
        <p className={cn("text-[9px] font-bold uppercase", s.color)}>{s.label}</p>
      </div>
      <div className="text-right shrink-0 w-20">
        <p className="text-[11px] font-black tabular-nums text-foreground">{liveQueue}</p>
        <p className="text-[9px] text-muted-foreground">queued</p>
      </div>
      <div className="text-right shrink-0 w-20">
        <p className={cn(
          "text-[11px] font-black tabular-nums",
          liveLatency > 3000 ? "text-rose-500" : liveLatency > 1500 ? "text-amber-500" : "text-emerald-500"
        )}>
          {liveLatency > 0 ? `${liveLatency}ms` : "—"}
        </p>
        <p className="text-[9px] text-muted-foreground">latency</p>
      </div>
      <div className="text-right shrink-0 w-20">
        <p className={cn(
          "text-[11px] font-black tabular-nums",
          instance.errorRate > 5 ? "text-rose-500" : instance.errorRate > 1 ? "text-amber-500" : "text-emerald-500"
        )}>
          {instance.errorRate > 0 ? `${instance.errorRate}%` : "—"}
        </p>
        <p className="text-[9px] text-muted-foreground">err rate</p>
      </div>
      <div className="text-right shrink-0 w-24">
        <p className="text-[11px] font-black tabular-nums text-foreground">
          {instance.throughput > 0 ? `${instance.throughput}/hr` : "—"}
        </p>
        <p className="text-[9px] text-muted-foreground">throughput</p>
      </div>
      <div className="flex gap-1 shrink-0">
        {instance.status === "running" && (
          <button className="w-7 h-7 rounded border border-border hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/5 flex items-center justify-center text-muted-foreground transition-all">
            <Pause size={11} />
          </button>
        )}
        {(instance.status === "paused" || instance.status === "error") && (
          <button className="w-7 h-7 rounded border border-border hover:border-emerald-500/50 hover:text-emerald-500 hover:bg-emerald-500/5 flex items-center justify-center text-muted-foreground transition-all">
            <Play size={11} />
          </button>
        )}
        <button className="w-7 h-7 rounded border border-border hover:border-primary/50 hover:text-primary hover:bg-primary/5 flex items-center justify-center text-muted-foreground transition-all">
          <RotateCcw size={11} />
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function MonitoringDashboard() {
  const [tick, setTick] = useState(0);
  const [live, setLive] = useState(true);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, [live]);

  const runningCount = PIPELINE_INSTANCES.filter(p => p.status === "running").length;
  const errorCount = PIPELINE_INSTANCES.filter(p => p.status === "error").length;
  const totalQueue = PIPELINE_INSTANCES.reduce((s, p) => s + p.queueDepth, 0);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border/40">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Activity size={22} className="text-primary" />
              Pipeline Monitoring
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Live pipeline health across all DU models</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLive(l => !l)}
              className={cn(
                "flex items-center gap-2 h-9 px-4 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all",
                live
                  ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5 hover:bg-emerald-500/10"
                  : "border-border text-muted-foreground hover:bg-muted"
              )}
            >
              <Activity size={13} className={live ? "animate-pulse" : ""} />
              {live ? "Live" : "Paused"}
            </button>
            <button
              onClick={() => setTick(t => t + 1)}
              className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted transition-all"
            >
              <RefreshCw size={13} />
              Refresh
            </button>
          </div>
        </div>

        {/* KPI strip */}
        <div className="flex gap-6 mt-6">
          {[
            { label: "Running", value: runningCount, icon: Play, color: "text-emerald-500" },
            { label: "Errors", value: errorCount, icon: AlertCircle, color: "text-rose-500" },
            { label: "Total Queue", value: totalQueue, icon: Database, color: "text-cyan-500" },
            { label: "Uptime", value: "99.4%", icon: CheckCircle2, color: "text-primary" },
          ].map(kpi => (
            <div key={kpi.label} className="flex items-center gap-3 bg-card border border-border/50 rounded-xl px-4 py-3">
              <kpi.icon size={15} className={kpi.color} />
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                <p className="text-[15px] font-black text-foreground">{kpi.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pipeline table */}
      <div className="flex-1 overflow-y-auto p-8 space-y-6">
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              <Zap size={13} className="text-primary" />
              Active Pipelines
            </h3>
            <div className="flex items-center gap-2">
              <div className={cn("w-2 h-2 rounded-full", live ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30")} />
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                {live ? "Auto-refresh 3s" : "Paused"}
              </span>
            </div>
          </div>
          <div className="divide-y divide-border/10">
            {PIPELINE_INSTANCES.map(p => (
              <PipelineRow key={p.id} instance={p} tick={tick} />
            ))}
          </div>
        </div>

        {/* Recent errors */}
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/40">
            <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              <AlertCircle size={13} className="text-rose-500" />
              Recent Errors
            </h3>
          </div>
          <div className="divide-y divide-border/20">
            {RECENT_ERRORS.map(e => (
              <div key={e.id} className="flex items-start gap-3 px-5 py-3">
                <AlertCircle size={12} className="text-rose-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black text-foreground uppercase">{e.pipeline}</span>
                    <span className="text-[9px] text-muted-foreground">{e.time}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">{e.error}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
