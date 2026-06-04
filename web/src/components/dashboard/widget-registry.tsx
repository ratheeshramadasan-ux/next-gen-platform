"use client";

import React from "react";
import { Activity, BarChart3, ListChecks, Gauge, MessageSquare, TrendingUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Widget Type Definitions
export type WidgetType = "KPI_TILE" | "TIME_SERIES" | "LOG_STREAM" | "SLA_GAUGE" | "STATUS_GRID";

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  source: string;
  size?: "sm" | "md" | "lg" | "full";
  refreshInterval?: number;
  metadata?: any;
}

// 1. KPI Tile Widget
export const KPITile = ({ config }: { config: WidgetConfig }) => (
  <div className="p-6 bg-white/5 border border-white/10 rounded-sm flex flex-col justify-between h-full group hover:bg-white/[0.08] transition-all">
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{config.title}</span>
      <div className="p-1.5 rounded-sm bg-primary/20 text-primary">
         <Activity size={14} />
      </div>
    </div>
    <div className="mt-4">
      <p className="text-3xl font-black tabular-nums">1,248</p>
      <div className="flex items-center gap-1.5 mt-1">
         <TrendingUp size={12} className="text-emerald-500" />
         <span className="text-[10px] font-bold text-emerald-500">+12% vs last hour</span>
      </div>
    </div>
  </div>
);

// 2. Time Series Chart Widget (Mock)
export const TimeSeriesChart = ({ config }: { config: WidgetConfig }) => (
  <div className="p-6 bg-white/5 border border-white/10 rounded-sm h-full flex flex-col">
    <div className="flex items-center justify-between mb-6">
      <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{config.title}</h4>
      <BarChart3 size={16} className="text-muted-foreground/50" />
    </div>
    <div className="flex-1 flex items-end gap-1.5 min-h-[100px]">
       {[30,50,40,70,90,60,80,45,55,95,75,85].map((v, i) => (
         <div key={i} className="flex-1 bg-primary/30 rounded-t-sm hover:bg-primary transition-all" style={{ height: `${v}%` }} />
       ))}
    </div>
  </div>
);

// 3. SLA Gauge Widget
export const SLAGauge = ({ config }: { config: WidgetConfig }) => {
  const value = 99.4;
  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-sm flex flex-col items-center justify-center text-center space-y-2">
      <div className="relative w-24 h-24 flex items-center justify-center">
         <svg className="w-full h-full -rotate-90">
            <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" className="text-white/5" />
            <circle cx="48" cy="48" r="40" fill="transparent" stroke="currentColor" strokeWidth="8" strokeDasharray={`${value * 2.51} 251`} className="text-emerald-500" />
         </svg>
         <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black leading-none">{value}%</span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase">SLA</span>
         </div>
      </div>
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{config.title}</p>
    </div>
  );
};

// 4. Status Grid Widget
export const StatusGrid = ({ config }: { config: WidgetConfig }) => (
  <div className="p-6 bg-white/5 border border-white/10 rounded-sm h-full">
     <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4">{config.title}</h4>
     <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className={cn(
            "aspect-square rounded-md border",
            i === 7 ? "bg-rose-500/20 border-rose-500/40 animate-pulse" : "bg-emerald-500/10 border-emerald-500/30"
          )} />
        ))}
     </div>
     <p className="mt-4 text-[10px] text-muted-foreground flex items-center gap-1.5"><Info size={10} /> 1 node requires attention</p>
  </div>
);

// Registry Mapping
export const WidgetRegistry: Record<WidgetType, React.FC<{ config: WidgetConfig }>> = {
  KPI_TILE: KPITile,
  TIME_SERIES: TimeSeriesChart,
  LOG_STREAM: () => <div className="p-6 bg-black/20 border border-white/5 rounded-sm font-mono text-[10px] text-muted-foreground leading-relaxed h-full overflow-hidden">
     <p className="text-emerald-500 mb-2">CONNECTED_TO_LOG_STR...</p>
     <p>[12:01] Job #124 started</p>
     <p>[12:02] Token validation success</p>
     <p>[12:04] UI automation selector found</p>
     <p className="text-primary mt-4 cursor-pointer hover:underline">View full stream →</p>
  </div>,
  SLA_GAUGE: SLAGauge,
  STATUS_GRID: StatusGrid,
};
