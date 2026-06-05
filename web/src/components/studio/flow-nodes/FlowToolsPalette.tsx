"use client";

import React, { useState, useMemo } from "react";
import { Search, Info, ChevronRight, GripVertical } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAllCategories,
  searchNodes,
  type FlowCategory,
  type NodeMeta,
} from "@/flow-engine/registry/nodeRegistry";
import type { FlowNodeType } from "@/flow-engine/types/base";

// ─── Map FlowNodeType → canvas ActivityType/subType that onDrop expects ────────

const CANVAS_TYPE_MAP: Record<FlowNodeType, { type: string; subType: string }> = {
  START:                  { type: "event",   subType: "start" },
  END:                    { type: "event",   subType: "end" },
  DECISION:               { type: "gateway", subType: "xorGateway" },
  SWITCH:                 { type: "gateway", subType: "xorGateway" },
  RULE_DECISION:          { type: "gateway", subType: "xorGateway" },
  AI_DECISION:            { type: "gateway", subType: "xorGateway" },
  PARALLEL_SPLIT:         { type: "gateway", subType: "andGateway" },
  PARALLEL_JOIN:          { type: "gateway", subType: "andGateway" },
  LOOP:                   { type: "task",    subType: "serviceTask" },
  RETRY:                  { type: "task",    subType: "serviceTask" },
  WAIT:                   { type: "task",    subType: "serviceTask" },
  WAIT_FOR_EVENT:         { type: "task",    subType: "serviceTask" },
  USER_TASK:              { type: "task",    subType: "userTask" },
  APPROVAL_TASK:          { type: "task",    subType: "userTask" },
  SERVICE_TASK:           { type: "task",    subType: "serviceTask" },
  AGENT_TASK:             { type: "task",    subType: "serviceTask" },
  SUB_PROCESS:            { type: "task",    subType: "serviceTask" },
  SCRIPT_TASK:            { type: "task",    subType: "scriptTask" },
  DATA_TRANSFORMATION:    { type: "task",    subType: "serviceTask" },
  COMPENSATION:           { type: "task",    subType: "serviceTask" },
  ESCALATION:             { type: "task",    subType: "serviceTask" },
  MILESTONE:              { type: "task",    subType: "serviceTask" },
  TIMER_BOUNDARY_EVENT:   { type: "task",    subType: "serviceTask" },
  ERROR_BOUNDARY_EVENT:   { type: "task",    subType: "serviceTask" },
  MESSAGE_EVENT:          { type: "event",   subType: "intermediate" },
  SIGNAL_EVENT:           { type: "event",   subType: "intermediate" },
  BUSINESS_CALENDAR:      { type: "task",    subType: "serviceTask" },
  PROCESS_CHECKPOINT:     { type: "task",    subType: "serviceTask" },
};

function buildDragData(meta: NodeMeta) {
  const canvasType = CANVAS_TYPE_MAP[meta.type] ?? { type: "task", subType: "serviceTask" };
  return JSON.stringify({
    // Fields the designer/page.tsx onDrop handler reads:
    type:     canvasType.type,
    subType:  canvasType.subType,
    label:    meta.label,
    icon:     meta.icon,
    category: meta.category,
    dragType: meta.label,
    description: meta.description,
    inputs:   {},
    outputs:  {},
    properties: {},
    execution: {},
    // Extra metadata kept for future flow-engine integration:
    flowNodeType: meta.type,
    defaultConfig: { ...meta.defaultConfig, name: meta.label },
  });
}

// ─── Icon resolver ────────────────────────────────────────────────────────────

function NodeIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = (LucideIcons as any)[name];
  return Icon ? <Icon size={size} className={className} /> : null;
}

// ─── Inline guide card ────────────────────────────────────────────────────────

function HelpCard({ meta }: { meta: NodeMeta }) {
  return (
    <div
      className="mb-1 rounded-xl overflow-hidden"
      style={{
        background: "color-mix(in srgb,var(--primary) 5%,var(--card))",
        border: "1px solid color-mix(in srgb,var(--primary) 20%,transparent)",
        fontSize: 12,
      }}
    >
      <div
        className="px-3 py-2 flex items-center gap-2"
        style={{
          background: "color-mix(in srgb,var(--primary) 10%,transparent)",
          borderBottom: "1px solid color-mix(in srgb,var(--primary) 15%,transparent)",
        }}
      >
        <Info size={11} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <span className="font-semibold" style={{ color: "var(--primary)" }}>{meta.label}</span>
        <span className="ml-auto text-muted-foreground" style={{ fontSize: 10, opacity: 0.6 }}>{meta.category}</span>
      </div>
      <div className="px-3 py-2.5 space-y-2">
        <p className="leading-relaxed" style={{ fontSize: 12, color: "var(--foreground)", opacity: 0.8 }}>
          {meta.helpText}
        </p>
        {meta.exampleUseCase && (
          <div>
            <p className="font-medium text-muted-foreground uppercase tracking-wide mb-1" style={{ fontSize: 10 }}>Example</p>
            <code
              className="block px-2 py-1 rounded leading-snug"
              style={{
                background: "color-mix(in srgb,var(--primary) 8%,transparent)",
                color: "var(--primary)",
                fontSize: 11,
              }}
            >{meta.exampleUseCase}</code>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Node row ─────────────────────────────────────────────────────────────────

function NodeRow({
  meta, openHelpId, onToggleHelp, indented = false,
}: {
  meta: NodeMeta;
  openHelpId: string | null;
  onToggleHelp: (type: string) => void;
  indented?: boolean;
}) {
  const isHelpOpen = openHelpId === meta.type;

  return (
    <>
      <div
        draggable
        onDragStart={e => {
          e.dataTransfer.setData("application/reactflow", buildDragData(meta));
          e.dataTransfer.effectAllowed = "move";
        }}
        title={meta.description}
        className="flex items-center gap-3 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all group/item border border-transparent hover:border-primary/15 hover:bg-primary/5 select-none"
      >
        {/* Indent connector for children */}
        {indented && (
          <div className="w-4 h-full shrink-0 flex items-center justify-center">
            <div className="w-px h-full bg-border/40" />
          </div>
        )}

        {/* Icon — uniform muted box matching Activity Library */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all bg-muted border border-border/50 group-hover/item:bg-primary/10 group-hover/item:border-primary/30">
          <NodeIcon name={meta.icon} size={15} className="text-foreground/60 group-hover/item:text-primary transition-colors" />
        </div>

        {/* Name only — clean single line */}
        <p className="flex-1 min-w-0 text-[13px] font-semibold text-foreground/90 group-hover/item:text-foreground leading-tight truncate">
          {meta.label}
        </p>

        {/* ⓘ + grip */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={e => { e.stopPropagation(); e.preventDefault(); onToggleHelp(meta.type); }}
            onMouseDown={e => e.stopPropagation()}
            className={cn(
              "w-5 h-5 rounded flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all cursor-pointer",
              isHelpOpen ? "opacity-100 text-primary" : "text-muted-foreground/40 hover:text-primary",
            )}
            style={isHelpOpen ? { background: "color-mix(in srgb,var(--primary) 12%,transparent)" } : {}}
            title="Show guide"
          >
            <Info size={12} />
          </button>
          <GripVertical size={13} className="text-muted-foreground/20 opacity-0 group-hover/item:opacity-100 transition-opacity" />
        </div>
      </div>

      {isHelpOpen && <HelpCard meta={meta} />}
    </>
  );
}

// ─── Category group ───────────────────────────────────────────────────────────
// If only 1 node: render it directly without a collapsible wrapper.
// If 2+ nodes: show a collapsible group with a clear left-border indent for children.

function CategoryGroup({
  category, nodes, openHelpId, onToggleHelp,
}: {
  category: FlowCategory;
  nodes: NodeMeta[];
  openHelpId: string | null;
  onToggleHelp: (type: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const isSingle = nodes.length === 1;

  // Single-node category — render bare row with a category label prefix, no collapsible
  if (isSingle) {
    return (
      <div className="space-y-0.5">
        <NodeRow meta={nodes[0]} openHelpId={openHelpId} onToggleHelp={onToggleHelp} indented={false} />
      </div>
    );
  }

  // Multi-node category — collapsible with indented children
  return (
    <div>
      {/* Category header */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2.5 w-full py-2 px-2 rounded-lg hover:bg-muted/50 transition-all group"
      >
        <ChevronRight
          size={13}
          className={cn(
            "text-muted-foreground/50 transition-transform shrink-0",
            expanded && "rotate-90",
          )}
        />
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <NodeIcon name={nodes[0].icon} size={14} className="text-primary" />
        </div>
        <span className="text-[13px] font-semibold text-foreground flex-1 text-left leading-tight">{category}</span>
        <span className="text-xs font-semibold text-muted-foreground/40 shrink-0">{nodes.length}</span>
      </button>

      {/* Children — indented with a left border to show hierarchy */}
      {expanded && (
        <div
          className="ml-5 space-y-0.5 mb-1"
          style={{ borderLeft: "1.5px solid var(--studio-border, oklch(0.82 0 0))" }}
        >
          {nodes.map(meta => (
            <NodeRow
              key={meta.type}
              meta={meta}
              openHelpId={openHelpId}
              onToggleHelp={onToggleHelp}
              indented={false}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quick-start chips ─────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  { label: "Start Flow", query: "start" },
  { label: "If / Else",  query: "decision" },
  { label: "Approval",   query: "approval" },
  { label: "API Call",   query: "service" },
  { label: "Wait Event", query: "wait event" },
];

// ─── Main palette ─────────────────────────────────────────────────────────────

export function FlowToolsPalette() {
  const [search, setSearch]       = useState("");
  const [openHelpId, setOpenHelpId] = useState<string | null>(null);

  const toggleHelp = (type: string) => setOpenHelpId(prev => prev === type ? null : type);

  const categories = useMemo(() => getAllCategories(), []);
  const totalCount  = useMemo(() => categories.reduce((s, c) => s + c.nodes.length, 0), [categories]);

  const searchResults = useMemo(() => {
    if (!search.trim()) return null;
    return searchNodes(search);
  }, [search]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--studio-surface)" }}>

      {/* Header — matches Activity Library */}
      <div className="p-4 space-y-3 border-b border-border/40 bg-primary/5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary border-b-2 border-primary pb-1">
            Flow Tools
          </span>
          <span className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest">Drag to canvas</span>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 transition-colors" />
          <input
            placeholder="Search flow tools..."
            value={search}
            onChange={e => { setSearch(e.target.value); setOpenHelpId(null); }}
            className="w-full pl-10 pr-3 py-2 text-xs bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-muted-foreground/30 font-bold"
          />
        </div>

        {!search && (
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map(chip => (
              <button
                key={chip.query}
                onClick={() => setSearch(chip.label)}
                className="px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20 text-[9px] font-black text-primary uppercase tracking-widest hover:bg-primary/10 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-3 pb-10 pt-2 space-y-0.5">

        {searchResults ? (
          searchResults.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No results for "{search}"</div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground px-1 py-1 mb-1">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              {searchResults.map(meta => (
                <NodeRow key={meta.type} meta={meta} openHelpId={openHelpId} onToggleHelp={toggleHelp} />
              ))}
            </>
          )
        ) : (
          <>
            {/* "All Flow Tools" summary row */}
            <div className="flex items-center gap-2.5 py-2 px-1 mb-1">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <NodeIcon name="Workflow" size={14} className="text-primary" />
              </div>
              <span className="text-[13px] font-bold text-foreground flex-1">All Flow Tools</span>
              <span className="text-xs font-semibold text-muted-foreground/40">{totalCount}</span>
            </div>

            {categories.map(({ category, nodes }) => (
              <CategoryGroup
                key={category}
                category={category}
                nodes={nodes}
                openHelpId={openHelpId}
                onToggleHelp={toggleHelp}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
