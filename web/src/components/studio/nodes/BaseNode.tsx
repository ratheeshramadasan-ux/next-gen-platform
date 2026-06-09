"use client";

import React, { useMemo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { cn } from '@/lib/utils';
import { IconWrapper } from '@/components/ui/icon-wrapper';
import * as LucideIcons from 'lucide-react';
import { UniversalActivity, DEFAULT_STUDIO_THEME } from '@/types/studio';
import { motion } from 'framer-motion';

interface BaseNodeProps extends NodeProps<any> {
  data: UniversalActivity;
  children?: React.ReactNode;
  className?: string;
  hideHandles?: boolean;
  hideIcon?: boolean;
}

export function BaseNode({ data, selected, children, className, hideHandles, hideIcon }: BaseNodeProps) {
  const Icon = useMemo(() => {
    const iconName = typeof data.icon === 'string' ? data.icon : null;
    
    // Manual mapping for reliability across the studio
    const ICON_MAP: Record<string, any> = {
      Zap: LucideIcons.Zap,
      Bot: LucideIcons.Bot,
      MessageSquare: LucideIcons.MessageSquare,
      ScrollText: LucideIcons.ScrollText,
      Globe: LucideIcons.Globe,
      Database: LucideIcons.Database,
      Settings: LucideIcons.Settings,
      Play: LucideIcons.Play,
      CheckCircle: LucideIcons.CheckCircle,
      GitFork: LucideIcons.GitFork,
      GitBranch: LucideIcons.GitBranch,
      Split: LucideIcons.Split,
      MousePointerClick: LucideIcons.MousePointerClick,
      Type: LucideIcons.Type,
      ScanText: LucideIcons.ScanText,
      Camera: LucideIcons.Camera,
      Table: LucideIcons.Table,
      Filter: LucideIcons.Filter,
      SortAsc: LucideIcons.SortAsc,
      Code: LucideIcons.Code,
      ShieldCheck: LucideIcons.ShieldCheck,
      Webhook: LucideIcons.Webhook,
      Hash: LucideIcons.Hash,
      Kanban: LucideIcons.Kanban,
      Video: LucideIcons.Video,
      FileText: LucideIcons.FileText,
      FileSpreadsheet: LucideIcons.FileSpreadsheet,
      Sparkles: LucideIcons.Sparkles,
      Clock: LucideIcons.Clock,
      RefreshCw: LucideIcons.RefreshCw,
      Target: LucideIcons.Target,
      ArrowRightLeft: LucideIcons.ArrowRightLeft
    };

    if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
    if (iconName && (LucideIcons as any)[iconName]) return (LucideIcons as any)[iconName];
    
    if (data.icon && typeof data.icon !== 'string') return data.icon as any;

    // Fallback based on keywords in label
    const label = (data.label || "").toLowerCase();
    if (label.includes("msgbox") || label.includes("message")) return LucideIcons.MessageSquare;
    if (label.includes("log")) return LucideIcons.ScrollText;
    if (label.includes("api") || label.includes("http")) return LucideIcons.Globe;
    if (label.includes("sql") || label.includes("query") || label.includes("db")) return LucideIcons.Database;
    if (label.includes("browser") || label.includes("web")) return LucideIcons.Globe;
    if (label.includes("click")) return LucideIcons.MousePointerClick;
    if (label.includes("type")) return LucideIcons.Type;
    if (label.includes("loop")) return LucideIcons.RefreshCw;
    if (label.includes("if") || label.includes("decision")) return LucideIcons.Split;

    return LucideIcons.Zap;
  }, [data.icon, data.label]);
  
  const statusGlow = useMemo(() => {
    switch (data.execution?.status) {
      case 'running': return 'drop-shadow(0 0 12px var(--primary))';
      case 'completed': return 'drop-shadow(0 0 8px rgba(16,185,129,0.4))';
      case 'failed': return 'drop-shadow(0 0 12px rgba(225,29,72,0.5))';
      default: return selected ? 'drop-shadow(0 0 10px var(--primary))' : 'none';
    }
  }, [data.execution?.status, selected]);

  return (
    <motion.div 
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "relative flex flex-col items-center gap-2 group/node transition-all duration-300",
        data.execution?.enabled === false && "opacity-45 grayscale select-none",
        className
      )}
      style={{ filter: statusGlow }}
    >
      {/* Description & Risk Tooltip (Premium Style) */}
      {(data.description || data.risk) && (
        <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 opacity-0 group-hover/node:opacity-100 transition-all duration-300 pointer-events-none z-[100] translate-y-2 group-hover/node:translate-y-0">
          <div className="bg-popover/95 backdrop-blur-xl border border-border/40 text-popover-foreground px-4 py-2.5 rounded-sm shadow-2xl min-w-[220px] max-w-[320px] ring-1 ring-white/10 space-y-3">
            {data.description && (
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">Description</span>
                <p className="text-[10px] leading-relaxed font-bold text-foreground/90">
                  {data.description}
                </p>
              </div>
            )}
            
            {data.risk && data.risk.disabled === false && (
              <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">Risk Profile</span>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest uppercase",
                    data.risk.level === 'HIGH' ? "bg-rose-500/20 text-rose-500" : 
                    data.risk.level === 'MEDIUM' ? "bg-amber-500/20 text-amber-500" : "bg-emerald-500/20 text-emerald-500"
                  )}>
                    {data.risk.level}
                  </div>
                </div>
                
                {data.risk.category && (
                  <div className="flex items-center gap-2">
                    <LucideIcons.Shield size={10} className="text-muted-foreground/40" />
                    <span className="text-[9px] font-bold text-foreground/70">{data.risk.category} Risk</span>
                  </div>
                )}
                
                {data.risk.why && (
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black uppercase tracking-tighter text-muted-foreground/50">Reason</span>
                    <p className="text-[9px] font-medium text-foreground/60 leading-tight ">"{data.risk.why}"</p>
                  </div>
                )}
 
                {(data.risk.impact || data.risk.likelihood) && (
                  <div className="flex items-center gap-3">
                    {data.risk.impact && (
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase text-muted-foreground/50">Impact</span>
                        <span className="text-[10px] font-bold">{data.risk.impact}/5</span>
                      </div>
                    )}
                    {data.risk.rpn && (
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black uppercase text-muted-foreground/50">RPN Score</span>
                        <span className="text-[10px] font-black text-primary">{data.risk.rpn}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Tooltip Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-popover/95" />
          </div>
        </div>
      )}
 
      {/* Icon Circle (Minimalist) */}
      {!hideIcon && (
        <div 
          className={cn(
            "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 relative z-10",
            selected ? "bg-primary/70 text-primary-foreground scale-110 shadow-2xl" : "bg-card/70 backdrop-blur-md border border-border/40 text-foreground/60 hover:border-primary/40 hover:text-primary hover:scale-110",
            data.risk?.level === 'HIGH' && data.risk?.disabled === false && "border-rose-500/60 border-2 shadow-[0_0_15px_rgba(244,63,94,0.3)]",
            data.risk?.level === 'MEDIUM' && data.risk?.disabled === false && "border-amber-500/60 border-2 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
          )}
 
        >
          <Icon size={22} className={data.execution?.status === 'running' ? 'animate-pulse' : ''} />
          
          {/* Disabled Overlay Icon */}
          {data.execution?.enabled === false && (
            <div className="absolute -top-1 -right-1 bg-neutral-400 dark:bg-neutral-600 text-white rounded-full p-1 shadow-lg ring-2 ring-card z-20">
              <LucideIcons.Ban size={10} strokeWidth={3} />
            </div>
          )}
 
          {/* Risk Overlay Icon */}
          {data.risk?.level === 'HIGH' && data.risk?.disabled === false && data.execution?.enabled !== false && (
            <div className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full p-1 shadow-lg ring-2 ring-card animate-bounce duration-1000">
              <LucideIcons.AlertTriangle size={10} strokeWidth={3} />
            </div>
          )}
          {data.risk?.level === 'MEDIUM' && data.risk?.disabled === false && data.execution?.enabled !== false && (
            <div className="absolute -top-1 -right-1 bg-amber-500 text-white rounded-full p-1 shadow-lg ring-2 ring-card">
              <LucideIcons.AlertCircle size={10} strokeWidth={3} />
            </div>
          )}
 
          {/* Status indicator ring */}
          {data.execution?.status === 'running' && (
            <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-40" />
          )}
        </div>
      )}
 
      {/* Label (Floating outside) */}
      <div className="flex flex-col items-center">
        <span className={cn(
          "text-[10px] font-black uppercase tracking-widest transition-colors",
          data.execution?.enabled === false 
            ? "line-through text-neutral-400 dark:text-neutral-500" 
            : (selected ? "text-primary" : "text-foreground/60 group-hover/node:text-foreground")
        )}>
          {data.label}
        </span>
        <span className={cn(
          "text-[8px] font-bold uppercase tracking-tighter",
          data.execution?.enabled === false 
            ? "text-rose-500/80 font-black" 
            : "text-muted-foreground/30"
        )}>
          {data.execution?.enabled === false ? "Disabled" : data.subType?.replace(/([A-Z])/g, ' $1').trim()}
        </span>
      </div>

      {children}

      {!hideHandles && (
        <>
          {/* Main Top/Bottom Handles */}
          <Handle 
            type="target" 
            position={Position.Top} 
            className="!w-full !h-full !top-0 !left-0 !bg-transparent !border-none !rounded-full opacity-0 pointer-events-none group-hover/node:pointer-events-auto" 
            style={{ transform: 'none' }}
          />
          <Handle 
            type="source" 
            position={Position.Bottom} 
            className="!w-full !h-full !top-0 !left-0 !bg-transparent !border-none !rounded-full opacity-0 pointer-events-none group-hover/node:pointer-events-auto" 
            style={{ transform: 'none' }}
          />

          {/* Specialized Catch Handle for Error Handling */}
          {(data.subType === 'tryCatch' || data.label === 'Try Catch') && (
            <Handle
              type="source"
              id="catch"
              position={Position.Right}
              className="!w-3 !h-3 !bg-rose-500 !border-2 !border-white shadow-sm hover:scale-125 transition-transform"
              title="Catch (Error Path)"
            />
          )}
        </>
      )}
    </motion.div>
  );
}
