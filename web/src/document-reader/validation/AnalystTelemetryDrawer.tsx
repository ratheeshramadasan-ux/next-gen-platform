"use client";

import React from "react";
import { ChevronUp, ChevronDown, User, Gauge, FileStack, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnalystTelemetry } from "../types";

interface AnalystTelemetryDrawerProps {
  telemetry: AnalystTelemetry;
  isOpen: boolean;
  onToggle: () => void;
}

export function AnalystTelemetryDrawer({ telemetry, isOpen, onToggle }: AnalystTelemetryDrawerProps) {
  return (
    <div className="shrink-0 bg-card border border-border rounded-[9px] shadow-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 h-9 hover:bg-muted/30 transition-colors"
      >
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
          <Gauge size={12} className="text-primary" />
          Analyst Telemetry
        </span>
        {isOpen ? <ChevronDown size={14} className="text-muted-foreground" /> : <ChevronUp size={14} className="text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="px-4 pb-3 pt-1 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-border/50">
          <Metric icon={User} label="Analyst" value={telemetry.analystName} />
          <Metric icon={Gauge} label="Speed" value={`${telemetry.secondsPerField.toFixed(1)} s/field`} />
          <Metric icon={FileStack} label="Doc Speed" value={`${telemetry.secondsPerDocument.toFixed(1)} s/doc`} />
          <Metric icon={Hash} label="Fields Reviewed" value={`${telemetry.fieldsReviewed}`} />
        </div>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: React.ElementType; label: string; value: string; tone?: "good" | "warn" }) {
  return (
    <div className="flex items-center gap-2 py-1.5">
      <div className={cn(
        "w-7 h-7 rounded-[7px] flex items-center justify-center border shrink-0",
        tone === "good" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
        tone === "warn" && "bg-amber-500/10 border-amber-500/20 text-amber-500",
        !tone && "bg-muted/50 border-border/50 text-muted-foreground"
      )}>
        <Icon size={13} />
      </div>
      <div className="min-w-0">
        <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest truncate">{label}</p>
        <p className="text-[11px] font-black text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}
