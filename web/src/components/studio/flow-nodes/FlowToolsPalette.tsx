"use client";

/**
 * Flow Tools Palette — styled to match the Activity Library panel exactly.
 * Consistent icon boxes, name-only rows, no inline descriptions cluttering the list.
 */
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function NodeIcon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  const Icon = (LucideIcons as any)[name];
  return Icon ? <Icon size={size} className={className} /> : null;
}

// ─── Inline guide card (same as Activity Library GuideCard) ───────────────────

function HelpCard({ meta }: { meta: NodeMeta }) {
  return (
    <div
      className="mx-2 mb-1 rounded-xl overflow-hidden"
      style={{
        background: "color-mix(in srgb,var(--primary) 5%,var(--card))",
        border: "1px solid color-mix(in srgb,var(--primary) 20%,transparent)",
        fontSize: 12,
      }}
    >
      <div className="px-3 py-2 flex items-center gap-2"
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
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1" style={{ fontSize: 10 }}>When to use</p>
          <p className="text-foreground/80 leading-relaxed" style={{ fontSize: 12 }}>{meta.helpText}</p>
        </div>
        {meta.exampleUseCase && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1" style={{ fontSize: 10 }}>Example</p>
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

// ─── Node row — matches Activity Library row exactly ──────────────────────────

function NodeRow({ meta, openHelpId, onToggleHelp }: {
  meta: NodeMeta;
  openHelpId: string | null;
  onToggleHelp: (type: string) => void;
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
        className={cn(
          "flex items-center gap-3 px-2 py-2 rounded-lg cursor-grab active:cursor-grabbing transition-all group/item border border-transparent hover:border-primary/15 hover:bg-primary/5 select-none",
        )}
      >
        {/* Icon — muted box, primary on hover, same as Activity Library */}
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all",
          "bg-muted border border-border/50",
          "group-hover/item:bg-primary/10 group-hover/item:border-primary/30",
        )}>
          <NodeIcon name={meta.icon} size={15} className="text-foreground/60 group-hover/item:text-primary transition-colors" />
        </div>

        {/* Name only — no description text on the row */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-foreground/90 group-hover/item:text-foreground leading-tight truncate">
            {meta.label}
          </p>
        </div>

        {/* ⓘ guide button + grip — same as Activity Library */}
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

// ─── Category group — same header style as Activity Library groups ─────────────

function CategoryGroup({ category, nodes, openHelpId, onToggleHelp }: {
  category: FlowCategory;
  nodes: NodeMeta[];
  openHelpId: string | null;
  onToggleHelp: (type: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  // First node's icon represents the category
  const representativeIcon = nodes[0]?.icon ?? "Workflow";

  return (
    <div>
      {/* Header — identical structure to Activity Library group headers */}
      <button
        onClick={() => setExpanded(v => !v)}
        className="flex items-center gap-2.5 w-full py-2 px-2 rounded-lg hover:bg-muted/50 transition-all group"
      >
        <ChevronRight
          size={13}
          className={cn("text-muted-foreground/50 transition-transform shrink-0", expanded && "rotate-90")}
        />
        {/* Coloured category badge with icon */}
        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <NodeIcon name={representativeIcon} size={14} className="text-primary" />
        </div>
        <span className="text-[13px] font-semibold text-foreground flex-1 text-left leading-tight">{category}</span>
        <span className="text-xs font-semibold text-muted-foreground/50 ml-auto shrink-0">{nodes.length}</span>
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

// ─── Quick-start chips (same as Activity Library) ─────────────────────────────

const QUICK_CHIPS = [
  { label: "Start Flow",    query: "start" },
  { label: "If / Else",     query: "decision" },
  { label: "Approval",      query: "approval" },
  { label: "API Call",      query: "service" },
  { label: "Wait Event",    query: "wait event" },
];

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

  const totalCount = useMemo(() => categories.reduce((s, c) => s + c.nodes.length, 0), [categories]);

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--studio-surface)" }}>

      {/* Header — same as Activity Library */}
      <div className="p-4 space-y-3 border-b border-border/40 bg-primary/5 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary border-b-2 border-primary pb-1">
            Flow Tools
          </span>
          <span className="text-xs text-muted-foreground/40 uppercase tracking-widest">Drag to canvas</span>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
          <input
            placeholder="Search flow tools..."
            value={search}
            onChange={e => { setSearch(e.target.value); setOpenHelpId(null); }}
            className="w-full pl-10 pr-3 py-2 text-xs bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-muted-foreground/30 font-bold"
          />
        </div>

        {/* Quick-start chips */}
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

      {/* List — same scrollable area as Activity Library */}
      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-3 pb-10 space-y-1 pt-2">

        {searchResults ? (
          /* Flat ranked results when searching */
          searchResults.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8">No flow tools match "{search}"</div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground px-1 py-1">
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </p>
              {searchResults.map(meta => (
                <NodeRow key={meta.type} meta={meta} openHelpId={openHelpId} onToggleHelp={toggleHelp} />
              ))}
            </>
          )
        ) : (
          /* Categorised list */
          <>
            {/* "All Flow Tools" top-level toggle — mirrors "All Activities" */}
            <div className="flex items-center gap-2.5 py-2 px-1">
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
