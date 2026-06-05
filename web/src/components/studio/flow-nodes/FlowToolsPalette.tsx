"use client";

/**
 * Flow Tools Palette — left panel, replaces the old BPMN elements list.
 * Drag any node onto the canvas; the StudioCanvas handles the drop.
 */
import React, { useState, useMemo } from "react";
import { Search, Info, ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllCategories,
  getNodeMeta,
  searchNodes,
  FLOW_CATEGORIES,
  type FlowCategory,
  type NodeMeta,
} from "@/flow-engine/registry/nodeRegistry";
import type { FlowNodeType } from "@/flow-engine/types/base";

// ─── Drag data format the StudioCanvas expects ────────────────────────────────
function buildDragData(meta: NodeMeta) {
  return JSON.stringify({
    type: "flow_tool",
    nodeType: meta.type,
    label: meta.label,
    category: meta.category,
    defaultConfig: { ...meta.defaultConfig, name: meta.label },
    dragType: meta.label,
  });
}

// ─── Lucide icon resolver ─────────────────────────────────────────────────────
function NodeIcon({ iconName, size = 15, className }: { iconName: string; size?: number; className?: string }) {
  const Icon = (LucideIcons as any)[iconName];
  if (!Icon) return null;
  return <Icon size={size} className={className} />;
}

// ─── Inline help tooltip ──────────────────────────────────────────────────────
function HelpCard({ meta }: { meta: NodeMeta }) {
  return (
    <div
      className="mx-2 mb-1.5 rounded-xl overflow-hidden text-xs"
      style={{
        background: "color-mix(in srgb,var(--primary) 5%,var(--card))",
        border: "1px solid color-mix(in srgb,var(--primary) 20%,transparent)",
      }}
    >
      <div className="px-3 py-2 flex items-center gap-2"
        style={{ background: "color-mix(in srgb,var(--primary) 10%,transparent)", borderBottom: "1px solid color-mix(in srgb,var(--primary) 15%,transparent)" }}>
        <Info size={11} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <span className="font-semibold" style={{ color: "var(--primary)" }}>{meta.label}</span>
        <span className="ml-auto text-muted-foreground opacity-60">{meta.category}</span>
      </div>
      <div className="px-3 py-2 space-y-1.5">
        <p className="text-foreground/80 leading-relaxed">{meta.helpText}</p>
        {meta.exampleUseCase && (
          <div>
            <span className="font-medium text-muted-foreground uppercase tracking-wide" style={{ fontSize: 10 }}>Example</span>
            <code className="mt-0.5 block px-2 py-1 rounded text-primary leading-snug"
              style={{ background: "color-mix(in srgb,var(--primary) 8%,transparent)", fontSize: 11 }}>
              {meta.exampleUseCase}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Single node row ──────────────────────────────────────────────────────────
function NodeRow({ meta, openHelpId, onToggleHelp }: {
  meta: NodeMeta;
  openHelpId: string | null;
  onToggleHelp: (type: string) => void;
}) {
  const isHelpOpen = openHelpId === meta.type;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/reactflow", buildDragData(meta));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <>
      <div
        draggable
        onDragStart={handleDragStart}
        className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all group/node border border-transparent select-none"
        style={{ color: "var(--foreground)" }}
        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "color-mix(in srgb,var(--primary) 6%,transparent)"}
        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
        title={meta.description}
      >
        {/* Icon badge */}
        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all", meta.bgColor)}>
          <NodeIcon iconName={meta.icon} size={16} className={meta.color} />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground/90 leading-tight truncate group-hover/node:text-foreground">
            {meta.label}
          </p>
          <p className="text-xs text-muted-foreground/60 leading-tight truncate mt-0.5">
            {meta.description.slice(0, 55)}{meta.description.length > 55 ? "…" : ""}
          </p>
        </div>

        {/* Help toggle */}
        <button
          onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleHelp(meta.type); }}
          onMouseDown={e => e.stopPropagation()}
          className={cn(
            "w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/node:opacity-100 transition-all cursor-pointer shrink-0",
            isHelpOpen ? "opacity-100 text-primary" : "text-muted-foreground/40 hover:text-primary",
          )}
          style={isHelpOpen ? { background: "color-mix(in srgb,var(--primary) 12%,transparent)" } : {}}
          title="Show guide"
        >
          <Info size={12} />
        </button>
      </div>

      {/* Inline help card */}
      {isHelpOpen && <HelpCard meta={meta} />}
    </>
  );
}

// ─── Category group ───────────────────────────────────────────────────────────
function CategoryGroup({ category, nodes, openHelpId, onToggleHelp }: {
  category: FlowCategory;
  nodes: NodeMeta[];
  openHelpId: string | null;
  onToggleHelp: (type: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const categoryColors: Record<FlowCategory, string> = {
    Start: "text-emerald-600",  End: "text-slate-600",
    Routing: "text-amber-600",  Parallel: "text-blue-600",
    Loop: "text-teal-600",      Human: "text-sky-600",
    Approval: "text-indigo-600", Service: "text-cyan-600",
    Agent: "text-purple-600",   Event: "text-yellow-600",
    Error: "text-red-600",      SLA: "text-orange-600",
    Lifecycle: "text-slate-700",
  };

  const categoryBg: Record<FlowCategory, string> = {
    Start: "bg-emerald-100",  End: "bg-slate-100",
    Routing: "bg-amber-100",  Parallel: "bg-blue-100",
    Loop: "bg-teal-100",      Human: "bg-sky-100",
    Approval: "bg-indigo-100", Service: "bg-cyan-100",
    Agent: "bg-purple-100",   Event: "bg-yellow-100",
    Error: "bg-red-100",      SLA: "bg-orange-100",
    Lifecycle: "bg-slate-100",
  };

  return (
    <div>
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2.5 w-full py-2 px-2 rounded-lg hover:bg-muted/50 transition-all group"
      >
        <ChevronRight size={13} className={cn("text-muted-foreground/50 transition-transform shrink-0", expanded && "rotate-90")} />
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", categoryBg[category])}>
          <span className={cn("text-xs font-bold", categoryColors[category])}>{nodes.length}</span>
        </div>
        <span className="text-[13px] font-semibold text-foreground flex-1 text-left">{category}</span>
      </button>

      {expanded && (
        <div className="pl-2 space-y-0.5 mb-1">
          {nodes.map(meta => (
            <NodeRow key={meta.type} meta={meta} openHelpId={openHelpId} onToggleHelp={onToggleHelp} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main palette ─────────────────────────────────────────────────────────────
export function FlowToolsPalette() {
  const [search, setSearch] = useState("");
  const [openHelpId, setOpenHelpId] = useState<string | null>(null);

  const toggleHelp = (type: string) => setOpenHelpId(prev => prev === type ? null : type);

  const categories = useMemo(() => getAllCategories(), []);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return searchNodes(search);
  }, [search]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--studio-surface)" }}>
      {/* Header */}
      <div className="panel-header shrink-0 justify-between">
        <div className="flex items-center gap-2">
          <NodeIcon iconName="Workflow" size={14} className="text-primary shrink-0" />
          <span className="panel-title">Flow Tools</span>
        </div>
        <span className="text-xs text-muted-foreground">Drag to canvas</span>
      </div>

      {/* Search */}
      <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--studio-border)" }}>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            placeholder="Search flow tools…"
            value={search}
            onChange={e => { setSearch(e.target.value); setOpenHelpId(null); }}
            className="w-full pl-8 pr-3 py-1.5 text-sm outline-none rounded-lg transition-colors"
            style={{
              background: "var(--studio-surface-sunken)",
              border: "1.5px solid var(--studio-border)",
              color: "var(--foreground)",
            }}
            onFocus={e => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={e => (e.currentTarget.style.borderColor = "var(--studio-border)")}
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-2 space-y-1">
        {searchResults ? (
          /* Flat search results */
          searchResults.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No flow tools match "{search}"</div>
          ) : (
            <div className="space-y-0.5">
              <p className="text-xs text-muted-foreground px-2 pb-1">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              {searchResults.map(meta => (
                <NodeRow key={meta.type} meta={meta} openHelpId={openHelpId} onToggleHelp={toggleHelp} />
              ))}
            </div>
          )
        ) : (
          /* Categorised list */
          categories.map(({ category, nodes }) => (
            <CategoryGroup
              key={category}
              category={category}
              nodes={nodes}
              openHelpId={openHelpId}
              onToggleHelp={toggleHelp}
            />
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 shrink-0 text-xs text-muted-foreground/50 text-center"
        style={{ borderTop: "1px solid var(--studio-border)" }}>
28 enterprise nodes · drag to canvas
      </div>
    </div>
  );
}
