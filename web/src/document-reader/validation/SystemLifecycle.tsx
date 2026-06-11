"use client";

import React from "react";
import {
  X, Activity, TrendingDown, TrendingUp, Minus, RotateCcw, ShieldCheck,
  GitBranch, CheckCircle2, XCircle, Loader2, Database, Rocket, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DocumentClass } from "../types";
import {
  ValidationDocumentSummary, ModelVersionRecord, ModelLifecycleStage,
  DriftDataPoint, VendorPerformance, FieldDecayProfile, GoldenDatasetResult,
} from "../types";
import {
  generateDriftSeries, generateVendorPerformance, generateFieldDecayProfiles,
  generateModelVersions, generateGoldenDatasetResult,
} from "./engine";
import { toast } from "sonner";

type LifecycleTab = "health" | "promotion" | "rollback" | "golden";

const TABS: { id: LifecycleTab; label: string; icon: React.ElementType }[] = [
  { id: "health", label: "Model Health Center", icon: Activity },
  { id: "promotion", label: "Promotion Pipeline", icon: GitBranch },
  { id: "rollback", label: "Rollback Manager", icon: RotateCcw },
  { id: "golden", label: "Golden Dataset Bench", icon: Database },
];

const STAGE_LABELS: Record<ModelLifecycleStage, string> = {
  retained_local: "Retained Local Model",
  internal_validation: "Internal Validation Set",
  shadow_deployment: "Shadow Deployment",
  canary_staging: "Canary / Staging",
  ab_test: "A/B Test",
  production: "Production Live Ingestion",
};

const STAGE_ORDER: ModelLifecycleStage[] = [
  "retained_local", "internal_validation", "shadow_deployment", "canary_staging", "ab_test", "production",
];

interface SystemLifecycleProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: LifecycleTab;
  documentClasses: DocumentClass[];
  summaries: ValidationDocumentSummary[];
  batchId: string;
}

export function SystemLifecycle({ isOpen, onClose, initialTab = "health", documentClasses, summaries, batchId }: SystemLifecycleProps) {
  const [tab, setTab] = React.useState<LifecycleTab>(initialTab);
  const [modelVersions, setModelVersions] = React.useState<ModelVersionRecord[]>(() => generateModelVersions());
  const [rollbackInProgress, setRollbackInProgress] = React.useState<string | null>(null);
  const [goldenResult, setGoldenResult] = React.useState<GoldenDatasetResult | null>(null);
  const [runningGolden, setRunningGolden] = React.useState(false);

  React.useEffect(() => { if (isOpen) setTab(initialTab); }, [isOpen, initialTab]);

  const driftSeries = React.useMemo<DriftDataPoint[]>(() => generateDriftSeries(batchId), [batchId]);
  const vendorPerformance = React.useMemo<VendorPerformance[]>(() => generateVendorPerformance(documentClasses), [documentClasses]);
  const fieldDecay = React.useMemo<FieldDecayProfile[]>(() => generateFieldDecayProfiles(summaries), [summaries]);

  const runGoldenTest = React.useCallback(() => {
    setRunningGolden(true);
    setTimeout(() => {
      const result = generateGoldenDatasetResult(modelVersions);
      setGoldenResult(result);
      setRunningGolden(false);
      if (!result.passesGate) {
        toast.error(`${result.modelVersion} blocked: Golden Set score ${result.score}% < production baseline ${result.baselineScore}%`);
      } else {
        toast.success(`${result.modelVersion} cleared the Golden Dataset gate (${result.score}% ≥ ${result.baselineScore}%).`);
      }
    }, 900);
  }, [modelVersions]);

  const promote = React.useCallback((version: string) => {
    setModelVersions(prev => {
      const idx = prev.findIndex(m => m.version === version);
      if (idx === -1) return prev;
      const current = prev[idx];
      const nextStageIdx = Math.min(STAGE_ORDER.indexOf(current.stage) + 1, STAGE_ORDER.length - 1);
      const nextStage = STAGE_ORDER[nextStageIdx];

      if (nextStage === "production") {
        const baseline = prev.find(m => m.stage === "production" && m.isActive);
        if (baseline && current.goldenSetScore < baseline.goldenSetScore) {
          toast.error(`Promotion blocked: ${version} (${current.goldenSetScore}%) is below the active production Golden Set baseline (${baseline.goldenSetScore}%).`);
          return prev;
        }
      }

      toast.success(`${version} promoted: ${STAGE_LABELS[current.stage]} → ${STAGE_LABELS[nextStage]}`);
      return prev.map(m => {
        if (m.version === version) return { ...m, stage: nextStage, promotedAt: new Date().toISOString() };
        if (nextStage === "production" && m.stage === "production" && m.isActive) return { ...m, isActive: false, isStable: true };
        return m;
      });
    });
  }, []);

  const rollback = React.useCallback((targetVersion: string) => {
    setRollbackInProgress(targetVersion);
    const start = performance.now();
    setTimeout(() => {
      const elapsed = ((performance.now() - start) / 1000).toFixed(2);
      setModelVersions(prev => prev.map(m => ({
        ...m,
        isActive: m.version === targetVersion ? true : (m.stage === "production" ? false : m.isActive),
        stage: m.version === targetVersion ? "production" : m.stage,
      })));
      setRollbackInProgress(null);
      toast.success(`Routing symlinks swapped to ${targetVersion} in ${elapsed}s.`);
    }, 700);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
      <div className="w-full h-full max-w-6xl bg-background rounded-[14px] border border-border shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 shrink-0">
          <div>
            <h3 className="text-base font-black uppercase tracking-tight text-foreground">System Lifecycle</h3>
            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest opacity-70">Model health, promotion, rollback &amp; golden dataset governance</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-[9px] border border-border hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
            <X size={16} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex items-center gap-2 px-6 pt-4 shrink-0">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "h-9 px-4 rounded-[9px] border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                tab === t.id ? "bg-primary text-primary-foreground border-primary shadow-lg" : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              )}
            >
              <t.icon size={13} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          {tab === "health" && <ModelHealthTab driftSeries={driftSeries} vendorPerformance={vendorPerformance} fieldDecay={fieldDecay} />}
          {tab === "promotion" && <PromotionPipelineTab modelVersions={modelVersions} onPromote={promote} />}
          {tab === "rollback" && <RollbackManagerTab modelVersions={modelVersions} onRollback={rollback} rollbackInProgress={rollbackInProgress} />}
          {tab === "golden" && (
            <GoldenDatasetTab
              modelVersions={modelVersions}
              result={goldenResult}
              running={runningGolden}
              onRun={runGoldenTest}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Model Health Center ─────────────────────────────────────────────────────

function ModelHealthTab({ driftSeries, vendorPerformance, fieldDecay }: {
  driftSeries: DriftDataPoint[];
  vendorPerformance: VendorPerformance[];
  fieldDecay: FieldDecayProfile[];
}) {
  return (
    <div className="space-y-6">
      {/* Drift Chart */}
      <section className="bg-card rounded-[9px] border border-border/50 p-5">
        <header className="flex items-center justify-between mb-4">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Activity size={13} className="text-primary" /> Temporal Drift — 90-Day Macro Accuracy
          </h4>
          <span className="text-[9px] font-black text-muted-foreground">
            Latest: {driftSeries[driftSeries.length - 1]?.accuracy.toFixed(1)}%
          </span>
        </header>
        <DriftChart series={driftSeries} />
      </section>

      {/* Vendor Performance */}
      <section className="bg-card rounded-[9px] border border-border/50 p-5">
        <header className="flex items-center gap-2 mb-4">
          <TrendingDown size={13} className="text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Vendor-Specific Performance</h4>
        </header>
        <div className="space-y-2">
          {vendorPerformance.map(v => (
            <div key={v.vendor} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/40">
              <div className="flex items-center gap-2 min-w-0">
                <TrendIcon trend={v.trend} />
                <span className="text-[10px] font-black uppercase tracking-tight text-foreground truncate">{v.vendor}</span>
                <span className="text-[8px] font-bold text-muted-foreground">{v.documentCount} docs</span>
              </div>
              <span className={cn("text-[11px] font-black", v.accuracy >= 92 ? "text-emerald-500" : v.accuracy >= 85 ? "text-amber-500" : "text-rose-500")}>
                {v.accuracy.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Field Decay Profiles */}
      <section className="bg-card rounded-[9px] border border-border/50 p-5">
        <header className="flex items-center gap-2 mb-4">
          <AlertTriangle size={13} className="text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Field-Level Decay Profiles</h4>
        </header>
        {fieldDecay.length === 0 ? (
          <p className="text-[10px] text-muted-foreground italic">No field telemetry available yet for this batch.</p>
        ) : (
          <div className="space-y-2">
            {fieldDecay.map(f => (
              <div key={f.fieldName} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border/40">
                <span className="text-[10px] font-black uppercase tracking-tight text-foreground truncate">{f.fieldName}</span>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                    f.status === "stable" && "bg-emerald-500/10 text-emerald-500",
                    f.status === "decaying" && "bg-amber-500/10 text-amber-500",
                    f.status === "critical" && "bg-rose-500/10 text-rose-500"
                  )}>
                    {f.status}
                  </span>
                  <span className="text-[11px] font-black text-foreground w-12 text-right">{f.current.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function TrendIcon({ trend }: { trend: VendorPerformance["trend"] }) {
  if (trend === "up") return <TrendingUp size={13} className="text-emerald-500 shrink-0" />;
  if (trend === "down") return <TrendingDown size={13} className="text-rose-500 shrink-0" />;
  return <Minus size={13} className="text-muted-foreground shrink-0" />;
}

function DriftChart({ series }: { series: DriftDataPoint[] }) {
  const width = 800;
  const height = 160;
  const padding = 8;
  const min = Math.min(...series.map(p => p.accuracy)) - 1;
  const max = Math.max(...series.map(p => p.accuracy)) + 1;
  const range = Math.max(0.1, max - min);

  const points = series.map((p, i) => {
    const x = padding + (i / Math.max(1, series.length - 1)) * (width - padding * 2);
    const y = height - padding - ((p.accuracy - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `${pathD} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-40" preserveAspectRatio="none">
      <defs>
        <linearGradient id="driftGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#driftGradient)" />
      <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth="2" />
    </svg>
  );
}

// ─── Promotion Pipeline ───────────────────────────────────────────────────────

function PromotionPipelineTab({ modelVersions, onPromote }: { modelVersions: ModelVersionRecord[]; onPromote: (version: string) => void }) {
  return (
    <div className="space-y-6">
      <section className="bg-card rounded-[9px] border border-border/50 p-5 overflow-x-auto">
        <header className="mb-5">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Pipeline Stages</h4>
          <p className="text-[9px] text-muted-foreground mt-1">Direct deployment to production is prohibited — every model version must traverse each stage in order.</p>
        </header>
        <div className="flex items-center gap-1 min-w-max">
          {STAGE_ORDER.map((stage, i) => (
            <React.Fragment key={stage}>
              <div className="flex flex-col items-center gap-2 w-32 shrink-0">
                <div className="w-9 h-9 rounded-full bg-muted border border-border flex items-center justify-center text-[10px] font-black text-muted-foreground">
                  {i + 1}
                </div>
                <span className="text-[8px] font-black uppercase tracking-widest text-center text-muted-foreground leading-tight">{STAGE_LABELS[stage]}</span>
                <div className="space-y-1 w-full">
                  {modelVersions.filter(m => m.stage === stage).map(m => (
                    <div key={m.version} className={cn(
                      "px-1.5 py-1 rounded-md border text-[8px] font-mono font-black text-center",
                      m.isActive ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/40 border-border/50 text-muted-foreground"
                    )}>
                      {m.version}
                    </div>
                  ))}
                </div>
              </div>
              {i < STAGE_ORDER.length - 1 && <div className="h-px w-6 bg-border shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="bg-card rounded-[9px] border border-border/50 p-5">
        <header className="flex items-center gap-2 mb-4">
          <Rocket size={13} className="text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Model Versions</h4>
        </header>
        <div className="space-y-2">
          {modelVersions.map(m => (
            <div key={m.version} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black font-mono text-foreground">{m.version}</span>
                  {m.isActive && <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Active</span>}
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                  {STAGE_LABELS[m.stage]} · Accuracy {m.accuracy}% · Golden Set {m.goldenSetScore}%
                  {m.abTrafficPercent !== undefined && ` · ${m.abTrafficPercent}% traffic`}
                </p>
              </div>
              <button
                disabled={m.stage === "production"}
                onClick={() => onPromote(m.version)}
                className={cn(
                  "h-8 px-4 rounded-[7px] text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 flex items-center gap-1.5",
                  m.stage === "production"
                    ? "border-border text-muted-foreground/40 cursor-not-allowed"
                    : "border-primary/40 text-primary hover:bg-primary/10"
                )}
              >
                Promote <GitBranch size={11} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Rollback Manager ─────────────────────────────────────────────────────────

function RollbackManagerTab({ modelVersions, onRollback, rollbackInProgress }: {
  modelVersions: ModelVersionRecord[];
  onRollback: (version: string) => void;
  rollbackInProgress: string | null;
}) {
  const stable = modelVersions.filter(m => m.isStable).sort((a, b) => (b.promotedAt || "").localeCompare(a.promotedAt || ""));
  const active = modelVersions.find(m => m.isActive && m.stage === "production");

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-[9px] border border-border/50 p-5">
        <header className="flex items-center gap-2 mb-1">
          <RotateCcw size={13} className="text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Emergency Rollback</h4>
        </header>
        <p className="text-[9px] text-muted-foreground mb-4">Single-click orchestration to swap routing symlinks back to a prior stable container instance. Target execution time ≤ 2.0s.</p>

        <div className="space-y-2">
          {stable.map(m => (
            <div key={m.version} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/40">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black font-mono text-foreground">{m.version}</span>
                  {m.version === active?.version && <span className="text-[7px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500">Current Production</span>}
                </div>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                  Accuracy {m.accuracy}% · Golden Set {m.goldenSetScore}% · Promoted {m.promotedAt ? new Date(m.promotedAt).toLocaleDateString() : "—"}
                </p>
              </div>
              <button
                disabled={m.version === active?.version || rollbackInProgress !== null}
                onClick={() => onRollback(m.version)}
                className={cn(
                  "h-8 px-4 rounded-[7px] text-[9px] font-black uppercase tracking-widest border transition-all shrink-0 flex items-center gap-1.5",
                  m.version === active?.version
                    ? "border-border text-muted-foreground/40 cursor-not-allowed"
                    : "border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
                )}
              >
                {rollbackInProgress === m.version ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                {rollbackInProgress === m.version ? "Rolling Back…" : "Rollback to this Version"}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ─── Golden Dataset Bench ──────────────────────────────────────────────────────

function GoldenDatasetTab({ modelVersions, result, running, onRun }: {
  modelVersions: ModelVersionRecord[];
  result: GoldenDatasetResult | null;
  running: boolean;
  onRun: () => void;
}) {
  const candidate = modelVersions.find(m => m.stage === "ab_test") || modelVersions[0];
  const baseline = modelVersions.find(m => m.stage === "production" && m.isActive);

  return (
    <div className="space-y-6">
      <section className="bg-card rounded-[9px] border border-border/50 p-5">
        <header className="flex items-center gap-2 mb-1">
          <Database size={13} className="text-primary" />
          <h4 className="text-[10px] font-black uppercase tracking-widest text-foreground">Golden Dataset Testing Bench</h4>
        </header>
        <p className="text-[9px] text-muted-foreground mb-4">
          500 hand-verified documents representing all major enterprise structural formats. New model iterations cannot be deployed if their score drops below the active production baseline.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="p-3 rounded-lg border border-border/40">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Candidate</p>
            <p className="text-[12px] font-black font-mono text-foreground">{candidate?.version}</p>
          </div>
          <div className="p-3 rounded-lg border border-border/40">
            <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mb-1">Active Production Baseline</p>
            <p className="text-[12px] font-black font-mono text-foreground">{baseline?.version} · {baseline?.goldenSetScore}%</p>
          </div>
        </div>

        <button
          onClick={onRun}
          disabled={running}
          className="h-9 px-5 rounded-[9px] bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-60"
        >
          {running ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
          {running ? "Running 500-Document Benchmark…" : "Run Golden Test"}
        </button>

        {result && (
          <div className={cn(
            "mt-4 p-4 rounded-[9px] border flex items-center gap-3",
            result.passesGate ? "border-emerald-500/30 bg-emerald-500/5" : "border-rose-500/30 bg-rose-500/5"
          )}>
            {result.passesGate ? <CheckCircle2 size={20} className="text-emerald-500 shrink-0" /> : <XCircle size={20} className="text-rose-500 shrink-0" />}
            <div>
              <p className={cn("text-[11px] font-black uppercase tracking-tight", result.passesGate ? "text-emerald-500" : "text-rose-500")}>
                {result.passesGate ? "Deployment Gate Passed" : "Deployment Gate Blocked"}
              </p>
              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">
                {result.passedDocuments}/{result.totalDocuments} documents passed ({result.score}%) — baseline {result.baselineScore}%
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
