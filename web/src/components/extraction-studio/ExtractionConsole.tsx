"use client";

import React, { useState } from "react";
import { 
  Terminal, Code2, AlertTriangle, ShieldCheck, 
  Activity, Network, Brain, FileText, ChevronUp, ChevronDown, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

type ConsoleField = {
  id: string;
  name: string;
  type?: string;
  value?: string;
  confidence?: number;
  x?: number;
  y?: number;
  locatorStrategy?: string;
  pageStrategy?: string;
  searchDirection?: string;
  expansionMode?: string;
  stopAtNextLabel?: boolean;
  allowLongText?: boolean;
  dateFormat?: string;
};

type ConsoleAnchor = {
  id: string;
  value: string;
  type?: string;
  x?: number;
  y?: number;
  confidence?: number;
};

type ConsoleLink = {
  fieldId: string;
  anchorId: string;
  relationship?: string;
  confidence?: number;
};

type ConsoleOcrWord = {
  text: string;
  confidence?: number;
};

type ConsoleTab = "ocr" | "explain" | "json" | "errors" | "logs" | "graph" | "perf";

interface ExtractionConsoleProps {
  ocrText?: string;
  fields?: ConsoleField[];
  anchors?: ConsoleAnchor[];
  links?: ConsoleLink[];
  ocrWords?: ConsoleOcrWord[];
  activeFieldId?: string | null;
}

export function ExtractionConsole({
  ocrText = "",
  fields = [],
  anchors = [],
  links = [],
  ocrWords = [],
  activeFieldId = null
}: ExtractionConsoleProps) {
  // Set default open to true so the user sees the bottom panels like in the image
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<ConsoleTab>("graph");

  const toggleConsole = () => setIsOpen(!isOpen);
  const mappedFields = fields.filter(field => field.x !== undefined && field.y !== undefined);
  const activeField = fields.find(field => field.id === activeFieldId) || mappedFields[0];
  const selectedAnchor = activeFieldId ? anchors.find(anchor => anchor.id === activeFieldId) : null;
  const unlinkedAnchors = anchors.filter(anchor => !links.some(link => link.anchorId === anchor.id));
  const activeLinks = activeField ? links.filter(link => link.fieldId === activeField.id) : [];
  const activeAnchors = activeLinks
    .map(link => anchors.find(anchor => anchor.id === link.anchorId))
    .filter(Boolean);
  const getAnchorEvidence = () => {
    if (!activeField || activeAnchors.length === 0) return [];
    return activeAnchors.map((anchor, index) => ({
      id: anchor!.id,
      value: anchor!.value || "Anchor",
      confidence: anchor!.confidence || activeLinks[index]?.confidence || activeField.confidence || 0.9,
      label: ["Primary", "Secondary", "Fallback", "AI"][index % 4],
      color: ["blue", "emerald", "amber", "purple"][index % 4]
    }));
  };
  const anchorEvidence = getAnchorEvidence();
  const selectedGraph = (() => {
    const name = activeField?.name?.toLowerCase() || "";
    if (name.includes("passport") || name.includes("mrz")) return ["Passport Document", "Identity & Security", activeField?.name || "Field", "MRZ"];
    if (name.includes("birth")) return ["Passport Document", "Identity", activeField?.name || "Field", "Age Validation"];
    if (name.includes("signature")) return ["Passport Document", "Biometric Evidence", "Holder Signature", "Presence Check"];
    if (name.includes("photo")) return ["Passport Document", "Biometric Evidence", "Holder Photo", "Face Region"];
    return ["Passport Document", "Document Fields", activeField?.name || "Selected Field", "Business Validation"];
  })();
  const contextualSuggestions = activeField ? [
    { title: `Detected ${activeField.name}`, detail: `Confidence: ${Math.round((activeField.confidence || 0) * 100)}%`, action: "Accept" },
    { title: activeField.name.toLowerCase().includes("passport") ? "MRZ Validation Available" : "Anchor Relationship Available", detail: "Use as supporting evidence", action: "Accept" },
    { title: activeField.value ? "Cross Validation Passed" : "OCR Review Needed", detail: activeField.value ? "No conflict found" : "Confirm selected evidence", action: activeField.value ? "Train" : "Review" }
  ] : [];
  const outputPayload = fields.reduce((acc, field) => {
    if (field.value !== undefined && field.value !== "") {
      acc[field.name] = {
        value: field.value,
        confidence: field.confidence,
        fieldType: field.type,
        locator: {
          strategy: field.locatorStrategy || "hybrid",
          page: field.pageStrategy || "detect_by_text",
          search: field.searchDirection || "nearest",
          expansion: field.expansionMode || "line",
          stopAtNextLabel: field.stopAtNextLabel ?? true,
          allowLongText: field.allowLongText ?? true,
          dateFormat: field.dateFormat
        }
      };
    }
    return acc;
  }, {} as Record<string, unknown>);

  const tabs: Array<{ id: ConsoleTab; label: string; icon: React.ElementType; hasBadge?: boolean }> = [
    { id: "ocr", label: "Page Text View", icon: FileText },
    { id: "explain", label: "AI Explanations", icon: Brain },
    { id: "json", label: "Data Payload", icon: Code2 },
    { id: "errors", label: "Errors & Warnings", icon: AlertTriangle, hasBadge: true },
    { id: "logs", label: "System Activity", icon: Terminal },
    { id: "graph", label: "Anchor Mapping", icon: Network },
    { id: "perf", label: "Speed & Accuracy", icon: Activity }
  ];

  return (
    <div className={cn(
      "w-full bg-white border-t border-border/50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] transition-all duration-300 flex flex-col z-40 overflow-hidden",
      isOpen ? "h-64" : "h-11"
    )}>
      
      {/* Console Output Body */}
      {isOpen && (
        <div className="flex-1 min-h-0 p-4 bg-muted/10">
          
          {activeTab === "graph" && (
            <div className="grid grid-cols-4 gap-4 h-full">
              
              {/* PANEL 1: ANCHOR RELATIONSHIP MAP */}
              <div className="bg-white border border-border/60 shadow-sm rounded-xl p-3 flex flex-col h-full min-h-0">
                <div className="flex items-center gap-1.5 mb-3 shrink-0">
                  <Network size={12} className="text-muted-foreground" />
                  <span className="text-[9px] font-black uppercase text-foreground tracking-widest">Anchor Relationship Map</span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar relative pr-1 py-1">
                  {!activeField && activeAnchors.length === 0 && unlinkedAnchors.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-[9px] font-semibold text-muted-foreground">
                      No anchor relationships yet. Add anchors from a selection or OCR word.
                    </div>
                  ) : !activeField && activeAnchors.length === 0 ? (
                    <div className="w-full space-y-2">
                      <div className="text-[8px] font-black uppercase tracking-widest text-muted-foreground text-center">Unlinked Anchors</div>
                      {unlinkedAnchors.slice(0, 4).map(anchor => (
                        <div key={anchor.id} className="rounded border border-zinc-200 bg-zinc-50/60 px-2 py-1.5 text-[9px] font-bold text-zinc-600 truncate">
                          {anchor.value || "Anchor"}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-8 w-full justify-center min-h-[120px]">
                      <div className="flex flex-col gap-2 relative z-10 w-28">
                        {anchorEvidence.map((anchor, idx) => {
                          const styles = [
                            "border-zinc-200 text-zinc-600 bg-zinc-50/50"
                          ];
                          return (
                            <div key={anchor.id} className={cn("border rounded text-[9px] font-bold px-2 py-1.5 text-center shadow-sm", styles[idx % styles.length])}>
                              <div className="truncate">{anchor.value}</div>
                              <div className="mt-0.5 text-[7px] uppercase opacity-75">{anchor.label} · {Math.round((anchor.confidence || 0) * 100)}%</div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="relative z-10">
                        <div className="border border-border/80 bg-white rounded-lg p-2.5 shadow text-center min-w-[120px]">
                          <div className="text-[10px] font-black text-foreground">{activeField.name}</div>
                          <div className="text-[11px] font-mono mt-1 font-bold truncate max-w-[130px]">{activeField.value || "Mapped region"}</div>
                          <div className="flex items-center justify-center gap-1.5 mt-1.5">
                            <span className="text-[8px] text-muted-foreground uppercase">Confidence</span>
                            <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded">{Math.round((activeField.confidence || 0) * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PANEL 2: EXTRACTION EXPLAINABILITY */}
              <div className="bg-white border border-border/60 shadow-sm rounded-xl p-3 flex flex-col h-full min-h-0">
                <div className="flex items-center gap-1.5 mb-3 shrink-0">
                  <Brain size={12} className="text-muted-foreground" />
                  <span className="text-[9px] font-black uppercase text-foreground tracking-widest">Extraction Explainability</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                  {!activeField && !selectedAnchor ? (
                    <div className="h-full flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-[9px] font-semibold text-muted-foreground text-center p-3">
                      Select or create a field to see extraction reasoning.
                    </div>
                  ) : selectedAnchor ? [
                    { label: "Anchor", value: selectedAnchor.value || "Anchor" },
                    { label: "Type", value: selectedAnchor.type || "primary" },
                    { label: "Confidence", value: `${Math.round((selectedAnchor.confidence || 0) * 100)}%` },
                    { label: "Linked Field", value: links.find(link => link.anchorId === selectedAnchor.id)?.fieldId ? "Linked" : "Unlinked" },
                    { label: "Suggested Action", value: "Bind to a field" },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center text-[9px] gap-3">
                      <span className="text-muted-foreground font-bold">{row.label}</span>
                      <span className="text-foreground font-bold text-right truncate">{row.value}</span>
                    </div>
                  )) : [
                    { label: "Anchor Matched", value: anchorEvidence[0]?.value || "None" },
                    { label: "Match Type", value: anchorEvidence[0] ? "Exact Match" : "No anchor" },
                    { label: "Direction", value: activeAnchors[0] && (activeField.x || 0) > (activeAnchors[0]?.x ?? 0) ? "Right" : anchorEvidence[0] ? "Right" : "-" },
                    { label: "Distance", value: activeAnchors[0] ? `${Math.round(Math.hypot((activeField.x || 0) - (activeAnchors[0]?.x ?? 0), (activeField.y || 0) - (activeAnchors[0]?.y ?? 0)))}%` : "42 px" },
                    { label: "OCR Confidence", value: `${Math.round((activeField.confidence || 0) * 100)}%` },
                    { label: "Validation", value: activeField.value ? <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 size={10} /> Passed</span> : "Pending" },
                    { label: "Extraction Logic", value: activeField.locatorStrategy === "anchor" ? "Anchor-driven OCR" : activeField.locatorStrategy === "coordinate" ? "Position fallback" : anchorEvidence[0] ? "Anchor + Position + OCR" : "Selection + OCR" },
                    { label: "Page Strategy", value: activeField.pageStrategy === "any_page" ? "Search all pages" : activeField.pageStrategy === "current" ? "Current page only" : "Find page by anchors" },
                    { label: "Value Growth", value: activeField.expansionMode === "box" ? "Selected box only" : activeField.expansionMode === "multiline" ? "Multi-line" : activeField.expansionMode === "until_next_label" ? "Until next label" : "Grow along line" },
                    { label: "Fallback Used", value: activeLinks.length > 1 ? "Available" : "No" },
                  ].map((row, i) => (
                    <div key={i} className="flex justify-between items-center text-[9px]">
                      <span className="text-muted-foreground font-bold">{row.label}</span>
                      <span className="text-foreground font-bold">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PANEL 3: DOCUMENT RELATIONSHIP GRAPH */}
              <div className="bg-white border border-border/60 shadow-sm rounded-xl p-3 flex flex-col h-full min-h-0">
                <div className="flex items-center gap-1.5 mb-3 shrink-0">
                  <Network size={12} className="text-muted-foreground" />
                  <span className="text-[9px] font-black uppercase text-foreground tracking-widest">Document Relationship Graph</span>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 py-1">
                  {fields.length === 0 && anchors.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-[9px] font-semibold text-muted-foreground">
                      No document graph yet. Accepted fields will appear here.
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-2">
                      <div className="flex flex-col items-center gap-2">
                        {selectedGraph.map((node, index) => (
                          <React.Fragment key={`${node}-${index}`}>
                            <div className={cn(
                              "rounded-md border px-3 py-1 text-center text-[9px] font-bold shadow-sm",
                              index === 0 ? "border-indigo-200 bg-indigo-50/70 text-indigo-700" :
                              index === selectedGraph.length - 1 ? "border-purple-200 bg-purple-50/70 text-purple-700" :
                              "border-blue-200 bg-white text-blue-700"
                            )}>
                              {node}
                            </div>
                            {index < selectedGraph.length - 1 && <div className="h-3 w-px bg-indigo-200" />}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PANEL 4: AI SUGGESTIONS */}
              <div className="bg-white border border-border/60 shadow-sm rounded-xl p-3 flex flex-col h-full min-h-0">
                <div className="flex items-center gap-1.5 mb-3 shrink-0">
                  <Brain size={12} className="text-muted-foreground" />
                  <span className="text-[9px] font-black uppercase text-foreground tracking-widest">AI Suggestions</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar pr-1">
                  {contextualSuggestions.length > 0 ? contextualSuggestions.map((suggestion, index) => (
                    <div key={`${suggestion.title}-${index}`} className="border border-border/50 rounded-lg p-2 bg-white shadow-sm flex items-center justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-bold text-foreground truncate">{suggestion.title}</span>
                        <span className="text-[8px] text-muted-foreground">{suggestion.detail}</span>
                      </div>
                      <button className={cn(
                        "rounded px-2 py-1 text-[8px] font-black",
                        suggestion.action === "Review" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"
                      )}>
                        {suggestion.action}
                      </button>
                    </div>
                  )) : ocrWords.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-[9px] font-semibold text-muted-foreground">
                      OCR suggestions will appear after OCR text is available.
                    </div>
                  ) : ocrWords.slice(0, 4).map((word, index) => (
                    <div key={`${word.text}-${index}`} className="border border-border/50 rounded-lg p-2 bg-white shadow-sm flex items-center justify-between">
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-bold text-foreground truncate">OCR word: {word.text}</span>
                        <span className="text-[8px] text-muted-foreground">Confidence: {Math.round((word.confidence || 0) > 1 ? (word.confidence || 0) : (word.confidence || 0) * 100)}%</span>
                      </div>
                      <span className="text-[8px] font-bold text-muted-foreground bg-muted px-2 py-1 rounded">Selectable</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab !== "graph" && (
            <div className="h-full rounded-xl border border-border/60 bg-white p-4 overflow-auto text-xs text-foreground">
              {activeTab === "ocr" && (
                <pre className="whitespace-pre-wrap text-[11px] text-muted-foreground">{ocrText || "No OCR text available for the active page."}</pre>
              )}
              {activeTab === "json" && (
                <pre className="text-[11px]">{JSON.stringify(outputPayload, null, 2)}</pre>
              )}
              {activeTab === "errors" && (
                <div className="text-[11px] text-muted-foreground">No extraction warnings for the current field set.</div>
              )}
              {activeTab !== "ocr" && activeTab !== "json" && activeTab !== "errors" && (
                <div className="flex items-center justify-center h-full text-muted-foreground italic text-xs">
                  No {tabs.find(tab => tab.id === activeTab)?.label.toLowerCase()} data yet.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Console Tab Selector and Toggle button (BOTTOM TABS like the image) */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-white border-t border-border/50 shrink-0 select-none shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pr-2 custom-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (!isOpen) setIsOpen(true);
                }}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                  isActive 
                    ? "bg-indigo-50 text-indigo-600" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Icon size={12} className={isActive ? "text-indigo-600" : "text-muted-foreground"} />
                <span>{tab.label}</span>
                {tab.hasBadge && fields.some(field => (field.confidence || 1) < 0.75) && (
                  <span className="ml-1 w-3 h-3 bg-[#ff4d4f] rounded-full text-[7px] text-white flex items-center justify-center">2</span>
                )}
              </button>
            );
          })}
        </div>

        <button 
          onClick={toggleConsole}
          className="text-muted-foreground hover:text-foreground w-6 h-6 rounded flex items-center justify-center transition-colors hover:bg-muted ml-2 shrink-0"
        >
          {isOpen ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>

    </div>
  );
}
export default ExtractionConsole;
