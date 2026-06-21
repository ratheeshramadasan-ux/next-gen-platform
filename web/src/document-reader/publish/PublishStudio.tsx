"use client";

/**
 * Publish Studio — Phase I DU Rollout
 * Menu: Document Designer > Deployment Pipeline
 *
 * Handles version tagging, environment promotion, and production
 * deployment gating for trained DU models.
 */

import React, { useState, useMemo } from "react";
import {
  Rocket, CheckCircle2, AlertTriangle, GitBranch, Tag, Globe,
  Server, Lock, ShieldCheck, ChevronRight, ExternalLink,
  Clock, Activity, ArrowRight, Zap, Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDocumentReader } from "../store/documentReaderContext";
import { TrainingStage, ProductionReadinessGate, GateStatus } from "../types";
import { ScheduleConfig } from "./ScheduleConfig";
import { usePipelineStore } from "../store/studioStore";
import { computeProductionReadinessGates } from "../validation/engine";
import { loadTrainingLedger } from "../validation/ledger";

type Environment = "staging" | "uat" | "production";
type DeploymentGate = ProductionReadinessGate;

const ENVIRONMENTS: { id: Environment; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { id: "staging", label: "Staging", desc: "Internal testing — no real documents", icon: Server, color: "text-cyan-500" },
  { id: "uat", label: "UAT", desc: "User acceptance testing environment", icon: ShieldCheck, color: "text-amber-500" },
  { id: "production", label: "Production", desc: "Live processing — all users affected", icon: Globe, color: "text-emerald-500" },
];

function GateRow({ gate }: { gate: DeploymentGate }) {
  const icons = {
    passed: <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />,
    warning: <AlertTriangle size={14} className="text-amber-500 shrink-0" />,
    failed: <AlertTriangle size={14} className="text-rose-500 shrink-0" />,
    pending: <Clock size={14} className="text-muted-foreground/40 shrink-0" />,
  };
  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0">
      {icons[gate.status]}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-black text-foreground uppercase tracking-tight">{gate.label}</p>
        <p className="text-[9px] text-muted-foreground">{gate.description}</p>
      </div>
      {gate.value && (
        <span className={cn(
          "text-[10px] font-black px-2 py-0.5 rounded-full border shrink-0",
          gate.status === "passed" ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" :
          gate.status === "warning" ? "text-amber-600 bg-amber-500/10 border-amber-500/20" :
          gate.status === "pending" ? "text-muted-foreground bg-muted/30 border-border/40" :
          "text-rose-500 bg-rose-500/10 border-rose-500/20"
        )}>
          {gate.value}
        </span>
      )}
    </div>
  );
}

export function PublishStudio() {
  const { updateStepStatus, setActiveStage } = useDocumentReader();
  const documentClasses = usePipelineStore(s => s.documentClasses);
  const trainingDocuments = usePipelineStore(s => s.trainingDocuments);
  const [selectedEnv, setSelectedEnv] = useState<Environment>("staging");
  const [version, setVersion] = useState("v1.0.0");
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployed, setDeployed] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const DEPLOYMENT_GATES = useMemo(() => {
    const ledgerEntries = loadTrainingLedger();
    return computeProductionReadinessGates(documentClasses, trainingDocuments, ledgerEntries);
  }, [documentClasses, trainingDocuments]);

  const gatesPassed = DEPLOYMENT_GATES.filter(g => g.status === "passed").length;
  const gatesFailed = DEPLOYMENT_GATES.filter(g => g.status === "failed").length;
  const canDeploy = gatesFailed === 0;

  const handleDeploy = async () => {
    setIsDeploying(true);
    await new Promise(r => setTimeout(r, 2200));
    setIsDeploying(false);
    setDeployed(true);
    updateStepStatus(TrainingStage.PUBLISH, "completed");
  };

  if (showSchedule) {
    return <ScheduleConfig onBack={() => setShowSchedule(false)} modelName="Current Model" />;
  }

  if (deployed) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-10">
        <div className="w-20 h-20 rounded-[14px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
          <CheckCircle2 size={36} />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-black uppercase tracking-tight">Deployed Successfully</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Model {version} is live on <span className="font-bold capitalize text-foreground">{selectedEnv}</span>.
            Documents will be processed automatically.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowSchedule(true)}
            className="flex items-center gap-2 h-11 px-6 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
          >
            <Clock size={14} />
            Configure Schedule
          </button>
          <button
            onClick={() => setActiveStage(TrainingStage.EXPORT)}
            className="flex items-center gap-2 h-11 px-6 rounded-xl border border-border text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all"
          >
            Secure Export
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
              <Rocket size={22} className="text-primary" />
              Deployment Pipeline
            </h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">
              Promote trained model to a target environment
            </p>
          </div>
          <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2">
            <Activity size={13} className="text-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
              {gatesPassed}/{DEPLOYMENT_GATES.length} Gates Passed
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Deployment gates */}
          <div className="space-y-6">
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/40">
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={13} className="text-primary" />
                  Deployment Gates
                </h3>
              </div>
              <div className="px-5">
                {DEPLOYMENT_GATES.map(g => <GateRow key={g.id} gate={g} />)}
              </div>
            </div>
          </div>

          {/* Right: Deployment config */}
          <div className="space-y-6">
            {/* Version */}
            <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Tag size={13} className="text-cyan-500" />
                Version Tag
              </h3>
              <input
                value={version}
                onChange={e => setVersion(e.target.value)}
                className="w-full h-10 px-3 rounded-lg bg-background border border-border text-[12px] font-black font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                placeholder="v1.0.0"
              />
              <p className="text-[9px] text-muted-foreground">Use semantic versioning: MAJOR.MINOR.PATCH</p>
            </div>

            {/* Environment */}
            <div className="bg-card border border-border/50 rounded-xl p-5 space-y-4">
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2">
                <Globe size={13} className="text-violet-500" />
                Target Environment
              </h3>
              <div className="space-y-2">
                {ENVIRONMENTS.map(env => (
                  <button
                    key={env.id}
                    onClick={() => setSelectedEnv(env.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left",
                      selectedEnv === env.id
                        ? "border-primary bg-primary/5"
                        : "border-border/50 hover:border-primary/30 hover:bg-muted/40"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-muted/60 shrink-0")}>
                      <env.icon size={15} className={env.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-foreground uppercase">{env.label}</p>
                      <p className="text-[9px] text-muted-foreground">{env.desc}</p>
                    </div>
                    {selectedEnv === env.id && (
                      <CheckCircle2 size={14} className="text-primary shrink-0" />
                    )}
                    {env.id === "production" && (
                      <Lock size={12} className="text-rose-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
              {selectedEnv === "production" && (
                <div className="flex items-center gap-2 text-[9px] text-rose-600 bg-rose-500/5 border border-rose-500/20 rounded-lg px-3 py-2">
                  <AlertTriangle size={11} />
                  Production deployment affects all active users. Ensure gates are fully passed.
                </div>
              )}
            </div>

            {/* Schedule quick-link */}
            <button
              onClick={() => setShowSchedule(true)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-dashed border-violet-500/30 bg-violet-500/5 hover:bg-violet-500/10 transition-colors"
            >
              <Clock size={16} className="text-violet-500 shrink-0" />
              <div className="text-left flex-1">
                <p className="text-[11px] font-black text-foreground uppercase">Configure Schedule</p>
                <p className="text-[9px] text-muted-foreground">Set up automated processing runs</p>
              </div>
              <ChevronRight size={14} className="text-violet-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Deploy footer */}
      <footer className="p-6 border-t border-border bg-card/50 flex items-center justify-between gap-4">
        <div className="text-[10px] text-muted-foreground uppercase tracking-widest">
          {canDeploy
            ? <span className="text-emerald-500 font-black flex items-center gap-1"><CheckCircle2 size={11} /> Ready to deploy</span>
            : <span className="text-rose-500 font-black flex items-center gap-1"><AlertTriangle size={11} /> {gatesFailed} gate(s) failed — resolve before deploying</span>
          }
        </div>
        <button
          onClick={handleDeploy}
          disabled={!canDeploy || isDeploying}
          className={cn(
            "flex items-center gap-3 h-12 px-10 rounded-xl font-black text-[11px] uppercase tracking-[0.25em] transition-all",
            canDeploy && !isDeploying
              ? "bg-primary text-primary-foreground hover:scale-105 shadow-lg shadow-primary/20"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          )}
        >
          {isDeploying ? (
            <>
              <Zap size={15} className="animate-pulse" />
              Deploying...
            </>
          ) : (
            <>
              <Rocket size={15} />
              Deploy {version} → {selectedEnv.charAt(0).toUpperCase() + selectedEnv.slice(1)}
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
