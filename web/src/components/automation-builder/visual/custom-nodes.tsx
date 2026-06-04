"use client";

import React, { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Zap, Cpu, Brain, Repeat, Database, LayoutPanelTop, Activity, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const NodeWrapper = memo(({ children, label, icon: Icon, type, selected }: any) => {
  const getTypeStyles = () => {
    switch (type) {
      case "trigger": return "border-emerald-500/50 bg-emerald-500/10 text-emerald-500 shadow-emerald-500/10";
      case "ai": return "border-purple-500/50 bg-purple-500/10 text-purple-500 shadow-purple-500/10";
      case "logic": return "border-amber-500/50 bg-amber-500/10 text-amber-500 shadow-amber-500/10";
      case "action": return "border-blue-500/50 bg-blue-500/10 text-blue-500 shadow-blue-500/10";
      case "data": return "border-sky-500/50 bg-sky-500/10 text-sky-500 shadow-sky-500/10";
      case "output": return "border-rose-500/50 bg-rose-500/10 text-rose-500 shadow-rose-500/10";
      default: return "border-border/50 bg-muted/30 text-muted-foreground";
    }
  };

  return (
    <div className={cn(
      "px-4 py-3 min-w-[180px] rounded-sm border backdrop-blur-3xl shadow-2xl transition-all duration-300 relative group",
      getTypeStyles(),
      selected && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105"
    )}>
       <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-sm bg-background/50 flex items-center justify-center border border-white/5">
             <Icon className="w-4 h-4" />
          </div>
          <div className="flex flex-col">
             <span className="text-[9px] font-black uppercase tracking-widest opacity-50">{type}</span>
             <span className="text-xs font-bold truncate max-w-[120px] text-foreground">{label}</span>
          </div>
       </div>

       {/* Port Indicators */}
       <div className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border border-current opacity-0 group-hover:opacity-100 transition-opacity" />
       <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-background border border-current opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  );
});

export const TriggerNode = memo((props: NodeProps) => (
  <div className="relative">
    <NodeWrapper {...props} label={props.data.label as string} icon={Zap} type="trigger" />
    <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-emerald-500 border-none" />
  </div>
));

export const ActionNode = memo((props: NodeProps) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-blue-500 border-none" />
    <NodeWrapper {...props} label={props.data.label as string} icon={Cpu} type="action" />
    <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-blue-500 border-none" />
  </div>
));

export const AINode = memo((props: NodeProps) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-purple-500 border-none" />
    <NodeWrapper {...props} label={props.data.label as string} icon={Brain} type="ai" />
    <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-purple-500 border-none" />
  </div>
));

export const LogicNode = memo((props: NodeProps) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-amber-500 border-none" />
    <NodeWrapper {...props} label={props.data.label as string} icon={Repeat} type="logic" />
    <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-amber-500 border-none" />
  </div>
));

export const DataNode = memo((props: NodeProps) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-sky-500 border-none" />
    <NodeWrapper {...props} label={props.data.label as string} icon={Database} type="data" />
    <Handle type="source" position={Position.Right} className="w-2 h-2 !bg-sky-500 border-none" />
  </div>
));

export const OutputNode = memo((props: NodeProps) => (
  <div className="relative">
    <Handle type="target" position={Position.Left} className="w-2 h-2 !bg-rose-500 border-none" />
    <NodeWrapper {...props} label={props.data.label as string} icon={LayoutPanelTop} type="output" />
  </div>
));

export const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  ai: AINode,
  logic: LogicNode,
  data: DataNode,
  output: OutputNode,
};
