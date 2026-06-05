"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/lib/ui-store";
import { getKbEntry, type KbEntry, type KbSection, type KbField } from "@/lib/kb-content";
import {
  X, BookOpen, ChevronDown, ChevronRight, Lightbulb,
  Layers, Search, GripVertical, MousePointer2, Play,
  Link2, AlertCircle, CheckCircle2, Info
} from "lucide-react";

// ─── Draggable resize handle ───────────────────────────────────────────────────
function ResizeHandle({ onResize }: { onResize: (delta: number) => void }) {
  const dragging = useRef(false);
  const startX = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true;
    startX.current = e.clientX;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX; // panel grows when dragging left
      onResize(delta);
      startX.current = e.clientX;
    };
    const onMouseUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [onResize]);

  return (
    <div
      onMouseDown={onMouseDown}
      className="w-4 flex items-center justify-center cursor-col-resize hover:bg-primary/10 transition-colors group flex-shrink-0 h-full border-l border-border"
      title="Drag to resize"
    >
      <GripVertical size={12} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
    </div>
  );
}

// ─── Section accordion ────────────────────────────────────────────────────────
function KbSectionBlock({ section, defaultOpen = false }: { section: KbSection; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-border/60 rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)}
        className={cn("w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors",
          open ? "bg-primary/5" : "bg-muted/20 hover:bg-muted/40")}>
        <span className="text-xs font-bold text-foreground">{section.title}</span>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted-foreground">{section.fields.length}</span>
          {open ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
            {section.description && (
              <p className="px-4 pt-3 pb-1 text-[11px] text-muted-foreground italic border-b border-border/40">{section.description}</p>
            )}
            <div className="divide-y divide-border/30">
              {section.fields.map((field, i) => <FieldRow key={i} field={field} />)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FieldRow({ field }: { field: KbField }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = field.definition.length > 90;

  return (
    <div className={cn("px-4 py-2.5 transition-colors", isLong && "cursor-pointer hover:bg-muted/10")}
      onClick={() => isLong && setExpanded(v => !v)}>
      <div className="flex items-start justify-between gap-2 mb-0.5">
        <div className="flex items-center gap-1.5">
          {field.required && <span className="text-[9px] font-bold text-rose-500 uppercase">Required</span>}
          <span className="text-[11px] font-semibold text-foreground">{field.name}</span>
        </div>
        {isLong && <ChevronRight size={10} className={cn("text-muted-foreground flex-shrink-0 mt-0.5 transition-transform", expanded && "rotate-90")} />}
      </div>
      <p className={cn("text-[11px] text-muted-foreground leading-relaxed", !expanded && isLong && "line-clamp-2")}>
        {field.definition}
      </p>
      {field.tip && (expanded || !isLong) && (
        <div className="mt-1.5 flex items-start gap-1.5 p-2 rounded bg-amber-500/10 border border-amber-500/15">
          <Lightbulb size={10} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 dark:text-amber-300 leading-relaxed">{field.tip}</p>
        </div>
      )}
    </div>
  );
}

// ─── How-to step ─────────────────────────────────────────────────────────────
function HowToStep({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{n}</span>
      <p className="text-[11px] text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────
export function KnowledgeBasePanel() {
  const { isKbOpen, closeKb } = useUIStore();
  const pathname = usePathname();
  const [entry, setEntry] = useState<KbEntry | null>(null);
  const [search, setSearch] = useState("");
  const [filtered, setFiltered] = useState<KbEntry | null>(null);
  const [width, setWidth] = useState(360);
  const [activeSection, setActiveSection] = useState<"howto" | "fields" | "tips">("howto");

  const MIN_WIDTH = 280;
  const MAX_WIDTH = 640;

  useEffect(() => {
    const found = getKbEntry(pathname);
    setEntry(found);
    setFiltered(found);
    setSearch("");
    setActiveSection("howto");
  }, [pathname]);

  useEffect(() => {
    if (!entry) { setFiltered(null); return; }
    if (!search.trim()) { setFiltered(entry); return; }
    const q = search.toLowerCase();
    setFiltered({
      ...entry,
      sections: entry.sections
        .map(s => ({ ...s, fields: s.fields.filter(f => f.name.toLowerCase().includes(q) || f.definition.toLowerCase().includes(q)) }))
        .filter(s => s.fields.length > 0)
    });
  }, [search, entry]);

  const handleResize = useCallback((delta: number) => {
    setWidth(prev => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, prev + delta)));
  }, []);

  const totalFields = entry?.sections.reduce((a, s) => a + s.fields.length, 0) ?? 0;

  return (
    <AnimatePresence>
      {isKbOpen && (
        <motion.aside
          key="kb"
          initial={{ x: 400, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 400, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 220 }}
          style={{ width }}
          className="flex flex-row flex-shrink-0 bg-background border-l border-border h-full z-30 shadow-2xl"
        >
          {/* Drag handle on the LEFT edge of panel */}
          <ResizeHandle onResize={handleResize} />

          {/* Panel content */}
          <div className="flex flex-col flex-1 overflow-hidden min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-primary/5 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                  <BookOpen size={13} className="text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground leading-none">Page Guide</p>
                  {entry && <p className="text-[10px] text-muted-foreground mt-0.5">{entry.module}</p>}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground px-1.5 py-0.5 bg-muted/40 rounded border border-border">{width}px</span>
                <button onClick={closeKb} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors ml-1">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* No content fallback */}
            {!entry ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 p-8 text-center">
                <BookOpen size={28} className="text-muted-foreground/20" />
                <p className="text-sm font-semibold text-foreground">No guide available</p>
                <p className="text-xs text-muted-foreground">Documentation for this page is coming soon.</p>
              </div>
            ) : (
              <>
                {/* Module identity */}
                <div className="px-4 py-3 border-b border-border/60 flex-shrink-0 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-sm font-bold text-foreground">{entry.module}</h2>
                    {entry.badge && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded uppercase tracking-wider">
                        {entry.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Layers size={9} /> {entry.layer}
                  </p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{entry.description}</p>
                </div>

                {/* Section tabs */}
                <div className="flex border-b border-border flex-shrink-0">
                  {([
                    { id: "howto", label: "How To Use", icon: Play },
                    { id: "fields", label: `Fields (${totalFields})`, icon: Info },
                    { id: "tips",   label: "Tips", icon: Lightbulb },
                  ] as const).map(tab => (
                    <button key={tab.id} onClick={() => setActiveSection(tab.id)}
                      className={cn("flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold border-b-2 transition-all",
                        activeSection === tab.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                      <tab.icon size={11} /> {tab.label}
                    </button>
                  ))}
                </div>

                {/* Content area */}
                <div className="flex-1 overflow-y-auto min-h-0">

                  {/* ── How To Use ── */}
                  {activeSection === "howto" && (
                    <div className="p-4 space-y-4">
                      {entry.howTo ? (
                        <>
                          {entry.howTo.steps && (
                            <div className="space-y-2.5">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Step-by-step</p>
                              {entry.howTo.steps.map((step, i) => <HowToStep key={i} n={i + 1} text={step} />)}
                            </div>
                          )}
                          {entry.howTo.workflows && entry.howTo.workflows.map((wf, wi) => (
                            <div key={wi} className="border border-border rounded-lg overflow-hidden">
                              <div className="px-3 py-2 bg-muted/30 flex items-center gap-2">
                                <MousePointer2 size={11} className="text-primary" />
                                <span className="text-[11px] font-bold text-foreground">{wf.name}</span>
                              </div>
                              <div className="px-3 py-2.5 space-y-1.5">
                                {wf.steps.map((s, si) => <HowToStep key={si} n={si + 1} text={s} />)}
                              </div>
                            </div>
                          ))}
                          {entry.howTo.warnings && (
                            <div className="space-y-1.5">
                              {entry.howTo.warnings.map((w, i) => (
                                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                  <AlertCircle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">{w}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Play size={20} className="opacity-20 mx-auto mb-2" />
                          <p className="text-xs">How-to guide coming soon.</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Fields ── */}
                  {activeSection === "fields" && (
                    <div className="p-3 space-y-2">
                      <div className="relative mb-3">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search fields..."
                          className="w-full pl-7 pr-3 py-1.5 text-xs bg-muted/40 border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20" />
                        {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X size={11} /></button>}
                      </div>
                      {(!filtered?.sections.length && search) ? (
                        <p className="text-xs text-muted-foreground text-center py-6">No fields match "{search}"</p>
                      ) : (filtered?.sections || []).map((s, i) => (
                        <KbSectionBlock key={s.title} section={s} defaultOpen={i === 0} />
                      ))}
                    </div>
                  )}

                  {/* ── Tips ── */}
                  {activeSection === "tips" && (
                    <div className="p-4 space-y-3">
                      {(!entry.tips?.length && !entry.related?.length) ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Lightbulb size={20} className="opacity-20 mx-auto mb-2" />
                          <p className="text-xs">No tips yet.</p>
                        </div>
                      ) : (
                        <>
                          {entry.tips && entry.tips.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Quick Tips</p>
                              {entry.tips.map((tip, i) => (
                                <div key={i} className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/20 border border-border/60">
                                  <Lightbulb size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                                  <p className="text-[11px] text-muted-foreground leading-relaxed">{tip}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {entry.related && entry.related.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mt-2">Related Modules</p>
                              <div className="flex flex-wrap gap-1.5">
                                {entry.related.map(name => (
                                  <span key={name} className="text-[11px] px-2.5 py-1 bg-muted/40 border border-border rounded-full text-muted-foreground">
                                    {name}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

// ─── Toggle button (lives in the top bar) ─────────────────────────────────────
export function KbToggleButton() {
  const { isKbOpen, toggleKb } = useUIStore();
  const pathname = usePathname();
  const hasContent = !!getKbEntry(pathname);

  return (
    <button
      onClick={toggleKb}
      title={isKbOpen ? "Close Guide" : "Open Page Guide"}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-all h-8",
        isKbOpen
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : hasContent
          ? "bg-muted/40 border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
          : "bg-muted/20 border-border/40 text-muted-foreground/40"
      )}
    >
      <BookOpen size={13} />
      <span>Guide</span>
      {hasContent && !isKbOpen && (
        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
}
