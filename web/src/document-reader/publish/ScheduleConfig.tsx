"use client";

/**
 * Schedule Config — Phase I DU Rollout
 * Menu: Document Designer > Deployment Pipeline > Schedule
 *
 * Configure automated document processing runs:
 * on-demand, cron-based, event-triggered, or batch window.
 */

import React, { useState } from "react";
import {
  Clock, Calendar, Zap, Play, Pause, ArrowLeft,
  CheckCircle2, AlertTriangle, ChevronRight, Timer,
  RefreshCw, Inbox, BarChart3, Plus, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TriggerType = "on-demand" | "scheduled" | "event" | "batch";
type CronPreset = "5min" | "15min" | "hourly" | "daily" | "weekly" | "custom";

interface ScheduleRun {
  id: string;
  startedAt: string;
  duration: string;
  docsProcessed: number;
  status: "success" | "failed" | "running";
}

const RECENT_RUNS: ScheduleRun[] = [
  { id: "r1", startedAt: "Today 14:35", duration: "42s", docsProcessed: 231, status: "success" },
  { id: "r2", startedAt: "Today 14:20", duration: "38s", docsProcessed: 187, status: "success" },
  { id: "r3", startedAt: "Today 14:05", duration: "—", docsProcessed: 0, status: "failed" },
  { id: "r4", startedAt: "Today 13:50", duration: "41s", docsProcessed: 208, status: "success" },
];

const CRON_PRESETS: { id: CronPreset; label: string; cron: string }[] = [
  { id: "5min", label: "Every 5 min", cron: "*/5 * * * *" },
  { id: "15min", label: "Every 15 min", cron: "*/15 * * * *" },
  { id: "hourly", label: "Hourly", cron: "0 * * * *" },
  { id: "daily", label: "Daily at midnight", cron: "0 0 * * *" },
  { id: "weekly", label: "Weekly (Monday 9am)", cron: "0 9 * * 1" },
  { id: "custom", label: "Custom cron", cron: "" },
];

const TRIGGER_TYPES: { id: TriggerType; label: string; desc: string; icon: React.ElementType }[] = [
  { id: "on-demand", label: "On Demand", desc: "Manually trigger via API or UI button", icon: Play },
  { id: "scheduled", label: "Scheduled", desc: "Run on a cron schedule automatically", icon: Clock },
  { id: "event", label: "Event Triggered", desc: "Trigger on new document arrival in inbox", icon: Inbox },
  { id: "batch", label: "Batch Window", desc: "Process all queued docs in a time window", icon: BarChart3 },
];

function RunRow({ run }: { run: ScheduleRun }) {
  const icons = {
    success: <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />,
    failed: <AlertTriangle size={13} className="text-rose-500 shrink-0" />,
    running: <RefreshCw size={13} className="text-primary animate-spin shrink-0" />,
  };
  return (
    <div className="flex items-center gap-4 py-2.5 border-b border-border/20 last:border-0 text-[10px]">
      {icons[run.status]}
      <span className="text-muted-foreground w-28 shrink-0">{run.startedAt}</span>
      <span className="text-foreground font-bold flex-1">
        {run.status === "failed" ? "Failed" : `${run.docsProcessed} docs`}
      </span>
      <span className="text-muted-foreground">{run.duration}</span>
    </div>
  );
}

export function ScheduleConfig({ onBack, modelName }: { onBack?: () => void; modelName: string }) {
  const [triggerType, setTriggerType] = useState<TriggerType>("scheduled");
  const [cronPreset, setCronPreset] = useState<CronPreset>("15min");
  const [customCron, setCustomCron] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [maxDocs, setMaxDocs] = useState("500");
  const [saved, setSaved] = useState(false);

  const activeCron = cronPreset === "custom"
    ? customCron
    : CRON_PRESETS.find(p => p.id === cronPreset)?.cron ?? "";

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-lg border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all group"
            >
              <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            </button>
          )}
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Clock size={22} className="text-violet-500" />
              Schedule Configuration
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
              {modelName} — Automated processing schedule
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {/* Enable/disable toggle */}
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {enabled ? "Enabled" : "Paused"}
            </span>
            <button
              onClick={() => setEnabled(e => !e)}
              className={cn(
                "relative w-10 h-5 rounded-full transition-colors",
                enabled ? "bg-primary" : "bg-muted"
              )}
            >
              <div className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                enabled ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Trigger type */}
          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Zap size={13} className="text-primary" />
                Trigger Type
              </h3>
              <div className="space-y-2">
                {TRIGGER_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTriggerType(t.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-all",
                      triggerType === t.id
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/30"
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center shrink-0">
                      <t.icon size={15} className={triggerType === t.id ? "text-primary" : "text-muted-foreground"} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-black uppercase text-foreground">{t.label}</p>
                      <p className="text-[9px] text-muted-foreground">{t.desc}</p>
                    </div>
                    {triggerType === t.id && <CheckCircle2 size={13} className="text-primary shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Cron config (only shown for scheduled) */}
            {triggerType === "scheduled" && (
              <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={13} className="text-cyan-500" />
                  Cron Schedule
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {CRON_PRESETS.map(p => (
                    <button
                      key={p.id}
                      onClick={() => setCronPreset(p.id)}
                      className={cn(
                        "text-[10px] font-black uppercase px-3 py-2 rounded-lg border transition-all",
                        cronPreset === p.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 text-muted-foreground hover:border-primary/30"
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                {cronPreset === "custom" ? (
                  <input
                    value={customCron}
                    onChange={e => setCustomCron(e.target.value)}
                    placeholder="*/30 * * * *"
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-[12px] font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                ) : (
                  <div className="bg-muted/40 rounded-lg px-4 py-2.5 font-mono text-[11px] text-primary border border-border/30">
                    {activeCron}
                  </div>
                )}
              </div>
            )}

            {/* Batch window config */}
            {triggerType === "batch" && (
              <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={13} className="text-amber-500" />
                  Batch Settings
                </h3>
                <div>
                  <label className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block mb-1.5">Max docs per run</label>
                  <input
                    value={maxDocs}
                    onChange={e => setMaxDocs(e.target.value)}
                    type="number"
                    className="w-full h-10 px-3 rounded-lg bg-background border border-border text-[12px] font-black text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recent runs */}
          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <Timer size={13} className="text-primary" />
                  Recent Runs
                </h3>
                <span className="text-[9px] text-muted-foreground font-black">Last 4 runs</span>
              </div>
              <div className="px-5 py-1">
                {RECENT_RUNS.map(r => <RunRow key={r.id} run={r} />)}
              </div>
            </div>

            {/* Notification settings */}
            <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest">Notifications</h3>
              {[
                { label: "Notify on success", key: "success" },
                { label: "Notify on failure", key: "failure" },
                { label: "Daily digest email", key: "digest" },
              ].map(n => (
                <label key={n.key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    defaultChecked={n.key === "failure"}
                    className="w-4 h-4 rounded accent-primary"
                  />
                  <span className="text-[10px] font-black text-foreground uppercase tracking-widest">{n.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Save footer */}
      <footer className="p-6 border-t border-border bg-card/50 flex items-center justify-end gap-3">
        {onBack && (
          <button
            onClick={onBack}
            className="h-11 px-6 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          className={cn(
            "flex items-center gap-2 h-11 px-8 rounded-xl font-black text-[11px] uppercase tracking-[0.2em] transition-all",
            saved
              ? "bg-emerald-500 text-white"
              : "bg-primary text-primary-foreground hover:scale-105"
          )}
        >
          {saved ? (
            <><CheckCircle2 size={14} /> Saved</>
          ) : (
            <><Clock size={14} /> Save Schedule</>
          )}
        </button>
      </footer>
    </div>
  );
}
