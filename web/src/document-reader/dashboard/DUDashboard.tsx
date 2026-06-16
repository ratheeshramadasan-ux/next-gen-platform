"use client";

/**
 * DU Dashboard — Document Understanding Phase I
 * Menu: Studio > Document Reader > Dashboard
 *
 * Shows platform-wide health: model count, pipeline throughput,
 * accuracy trends, active schedules, recent activity, and alerts.
 */

import React, { useState } from "react";
import {
  Activity, FileText, Zap, TrendingUp, TrendingDown, AlertCircle,
  CheckCircle2, Clock, BarChart3, Brain, Shield, Calendar, ArrowRight,
  Layers, Play, Pause, RefreshCw, ChevronRight, Database, Server,
  AlertTriangle, CircleCheck, Sparkles, Target, Timer, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

// ─── Mock data ────────────────────────────────────────────────────────────────

const PIPELINE_METRICS = {
  totalModels: 12,
  trainedModels: 8,
  draftModels: 3,
  failedModels: 1,
  documentsProcessed: 48_293,
  documentsToday: 1_842,
  avgAccuracy: 94.7,
  avgProcessingMs: 1_230,
  activePipelines: 5,
  scheduledRuns: 3,
  failureRate: 0.8,
  costMtd: 142.50,
};

const RECENT_MODELS = [
  { id: "m1", name: "Passport ID", class: "Identity", accuracy: 97.2, status: "trained", docsProcessed: 12_400, lastRun: "2 min ago", trend: +1.2 },
  { id: "m2", name: "Claim Intake Form", class: "Claims", accuracy: 93.8, status: "trained", docsProcessed: 8_900, lastRun: "14 min ago", trend: -0.3 },
  { id: "m3", name: "Medical Chart", class: "Healthcare", accuracy: 91.5, status: "trained", docsProcessed: 5_200, lastRun: "1 hr ago", trend: +0.8 },
  { id: "m4", name: "Settlement Agreement", class: "Legal", accuracy: 88.4, status: "training", docsProcessed: 2_100, lastRun: "Active", trend: null },
  { id: "m5", name: "Invoice Processor", class: "Finance", accuracy: 96.1, status: "trained", docsProcessed: 19_793, lastRun: "4 min ago", trend: +0.5 },
];

const ACTIVE_SCHEDULES = [
  { id: "s1", model: "Passport ID", cron: "Every 15 min", nextRun: "in 8 min", status: "running", docsInQueue: 47 },
  { id: "s2", model: "Claim Intake Form", cron: "Hourly", nextRun: "in 43 min", status: "idle", docsInQueue: 0 },
  { id: "s3", model: "Invoice Processor", cron: "Every 5 min", nextRun: "in 2 min", status: "running", docsInQueue: 231 },
];

const ALERTS = [
  { id: "a1", level: "warning", message: "Settlement Agreement accuracy dropped 3.2% over 48h", time: "2h ago" },
  { id: "a2", level: "info", message: "Medical Chart model retrained — 12 new samples added", time: "6h ago" },
  { id: "a3", level: "error", message: "Claim Intake batch job failed — timeout after 300s", time: "Yesterday" },
];

const ACCURACY_TREND = [88, 90, 89, 92, 91, 93, 94, 93, 95, 94, 95, 94.7];
const THROUGHPUT_TREND = [820, 1100, 980, 1240, 1380, 1200, 1500, 1420, 1620, 1780, 1900, 1842];

// ─── Sub-components ────────────────────────────────────────────────────────────

function MiniSparkline({ values, color = "text-primary" }: { values: number[]; color?: string }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 80, h = 28;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className={cn("opacity-70", color)}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({
  label, value, sub, icon: Icon, trend, trendLabel, color = "text-primary", sparkline
}: {
  label: string; value: string | number; sub?: string;
  icon: React.ElementType; trend?: number; trendLabel?: string;
  color?: string; sparkline?: number[];
}) {
  const up = trend !== undefined && trend >= 0;
  return (
    <div className="bg-card border border-border/50 rounded-xl p-5 flex flex-col gap-3 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center", `${color}/10`)}>
          <Icon size={18} className={color} />
        </div>
        {sparkline && <MiniSparkline values={sparkline} color={color} />}
      </div>
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black text-foreground">{value}</p>
        {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={cn("flex items-center gap-1 text-[10px] font-bold", up ? "text-emerald-500" : "text-rose-500")}>
          {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
          {up ? "+" : ""}{trend}% {trendLabel}
        </div>
      )}
    </div>
  );
}

function ModelRow({ model, onOpen }: { model: typeof RECENT_MODELS[0]; onOpen: (id: string) => void }) {
  const statusMap = {
    trained: { label: "Trained", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    training: { label: "Training", color: "text-primary bg-primary/10 border-primary/20" },
    draft: { label: "Draft", color: "text-muted-foreground bg-muted border-border" },
    failed: { label: "Failed", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" },
  };
  const s = statusMap[model.status as keyof typeof statusMap] || statusMap.draft;
  const accuracyColor = model.accuracy >= 95 ? "text-emerald-500" : model.accuracy >= 90 ? "text-cyan-500" : model.accuracy >= 85 ? "text-amber-500" : "text-rose-500";

  return (
    <div
      className="flex items-center gap-4 px-4 py-3 hover:bg-muted/40 rounded-lg cursor-pointer transition-colors group"
      onClick={() => onOpen(model.id)}
    >
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <Brain size={15} className="text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-black text-foreground uppercase leading-tight truncate">{model.name}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{model.class}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={cn("text-[13px] font-black tabular-nums", accuracyColor)}>{model.accuracy}%</p>
        <p className="text-[9px] text-muted-foreground">accuracy</p>
      </div>
      <div className="text-right shrink-0 hidden md:block">
        <p className="text-[11px] font-black tabular-nums text-foreground">{model.docsProcessed.toLocaleString()}</p>
        <p className="text-[9px] text-muted-foreground">docs</p>
      </div>
      <div className="shrink-0">
        <span className={cn("text-[9px] font-black uppercase px-2 py-0.5 rounded-full border", s.color)}>
          {s.label}
        </span>
      </div>
      <div className="text-[9px] text-muted-foreground shrink-0 hidden lg:block w-16 text-right">{model.lastRun}</div>
      {model.trend !== null && (
        <div className={cn("text-[10px] font-bold shrink-0 flex items-center gap-0.5", model.trend! >= 0 ? "text-emerald-500" : "text-rose-500")}>
          {model.trend! >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
          {model.trend! >= 0 ? "+" : ""}{model.trend}%
        </div>
      )}
      <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors shrink-0" />
    </div>
  );
}

function ScheduleRow({ schedule }: { schedule: typeof ACTIVE_SCHEDULES[0] }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 rounded-lg transition-colors">
      <div className={cn(
        "w-2 h-2 rounded-full shrink-0",
        schedule.status === "running" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"
      )} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-foreground uppercase truncate">{schedule.model}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-widest">{schedule.cron}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-bold text-foreground">{schedule.nextRun}</p>
        {schedule.docsInQueue > 0 && (
          <p className="text-[9px] text-primary">{schedule.docsInQueue} queued</p>
        )}
      </div>
    </div>
  );
}

function AlertRow({ alert }: { alert: typeof ALERTS[0] }) {
  const icons = {
    warning: <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />,
    info: <CircleCheck size={13} className="text-cyan-500 shrink-0 mt-0.5" />,
    error: <AlertCircle size={13} className="text-rose-500 shrink-0 mt-0.5" />,
  };
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      {icons[alert.level as keyof typeof icons]}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-foreground leading-snug">{alert.message}</p>
        <p className="text-[9px] text-muted-foreground mt-0.5">{alert.time}</p>
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export function DUDashboard({ onOpenProject }: { onOpenProject?: (id: string) => void }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const handleOpenProject = (id: string) => {
    if (onOpenProject) onOpenProject(id);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-background p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-foreground uppercase tracking-tight">Document Intelligence Dashboard</h2>
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Platform-wide model health, pipeline throughput & schedule status</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 h-9 px-4 rounded-lg border border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <RefreshCw size={13} className={cn(refreshing && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={() => router.push("/next-gen/studio/document-reader")}
            className="flex items-center gap-2 h-9 px-4 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
          >
            <Layers size={13} />
            All Models
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Trained Models"
          value={PIPELINE_METRICS.trainedModels}
          sub={`${PIPELINE_METRICS.totalModels} total`}
          icon={Brain}
          color="text-primary"
          trend={+8.3}
          trendLabel="vs last month"
        />
        <StatCard
          label="Docs Processed Today"
          value={PIPELINE_METRICS.documentsToday.toLocaleString()}
          sub={`${PIPELINE_METRICS.documentsProcessed.toLocaleString()} all-time`}
          icon={FileText}
          color="text-cyan-500"
          sparkline={THROUGHPUT_TREND}
          trend={+12.4}
          trendLabel="vs yesterday"
        />
        <StatCard
          label="Avg Accuracy"
          value={`${PIPELINE_METRICS.avgAccuracy}%`}
          sub="across all models"
          icon={Target}
          color="text-emerald-500"
          sparkline={ACCURACY_TREND}
          trend={+1.8}
          trendLabel="vs last week"
        />
        <StatCard
          label="Active Pipelines"
          value={PIPELINE_METRICS.activePipelines}
          sub={`${PIPELINE_METRICS.scheduledRuns} scheduled`}
          icon={Zap}
          color="text-violet-500"
        />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
          <Timer size={16} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Avg Processing</p>
            <p className="text-[15px] font-black text-foreground">{(PIPELINE_METRICS.avgProcessingMs / 1000).toFixed(1)}s</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Failure Rate</p>
            <p className="text-[15px] font-black text-rose-500">{PIPELINE_METRICS.failureRate}%</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
          <Shield size={16} className="text-indigo-500 shrink-0" />
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">PII Redactions</p>
            <p className="text-[15px] font-black text-foreground">2,841</p>
          </div>
        </div>
        <div className="bg-card border border-border/50 rounded-xl p-4 flex items-center gap-3">
          <Database size={16} className="text-teal-500 shrink-0" />
          <div>
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">MTD Cost</p>
            <p className="text-[15px] font-black text-foreground">${PIPELINE_METRICS.costMtd.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Models table — 2 cols */}
        <div className="lg:col-span-2 bg-card border border-border/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
              <Brain size={13} className="text-primary" />
              Active Models
            </h3>
            <button
              onClick={() => router.push("/next-gen/studio/document-reader")}
              className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1 hover:opacity-70 transition-opacity"
            >
              View All <ArrowRight size={10} />
            </button>
          </div>
          <div className="p-2">
            {RECENT_MODELS.map(m => (
              <ModelRow key={m.id} model={m} onOpen={handleOpenProject} />
            ))}
          </div>
        </div>

        {/* Right column — schedules + alerts */}
        <div className="space-y-6">
          {/* Active Schedules */}
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Calendar size={13} className="text-violet-500" />
                Active Schedules
              </h3>
              <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                {ACTIVE_SCHEDULES.filter(s => s.status === "running").length} Running
              </span>
            </div>
            <div className="p-2">
              {ACTIVE_SCHEDULES.map(s => <ScheduleRow key={s.id} schedule={s} />)}
            </div>
            <div className="px-4 pb-3">
              <button className="w-full text-[9px] font-black text-primary uppercase tracking-widest flex items-center justify-center gap-1 py-2 border border-dashed border-primary/30 rounded-lg hover:bg-primary/5 transition-colors">
                <Calendar size={11} />
                Manage Schedules
              </button>
            </div>
          </div>

          {/* Alerts */}
          <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border/40">
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={13} className="text-amber-500" />
                Recent Alerts
              </h3>
            </div>
            <div className="p-2 divide-y divide-border/30">
              {ALERTS.map(a => <AlertRow key={a.id} alert={a} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Infrastructure status footer */}
      <div
        className="flex items-center gap-4 bg-card border border-border/40 rounded-xl px-5 py-4 cursor-pointer hover:border-primary/30 transition-colors group"
        onClick={() => router.push("/next-gen/admin/document-intelligence")}
      >
        <Server size={16} className="text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
        <div className="flex-1">
          <p className="text-[10px] font-black text-foreground uppercase tracking-widest">Platform Infrastructure</p>
          <p className="text-[9px] text-muted-foreground">4 OCR engines active · Governance policy enabled · 30-day retention</p>
        </div>
        <span className="text-[9px] font-black text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
          <CheckCircle2 size={9} /> Operational
        </span>
        <ChevronRight size={14} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
}
