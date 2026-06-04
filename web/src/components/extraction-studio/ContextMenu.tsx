"use client";

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { 
  PlusCircle, Grid2X2, Type, Anchor, Trash2, Eye, Network, Sparkles,
  ShieldCheck, GitCompareArrows, CheckSquare, Signature, Rows3, CircleDot,
  CopyPlus
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onSelectAction: (action: string) => void;
  objectType?: string;
}

export function ContextMenu({ x, y, onClose, onSelectAction, objectType = "text" }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState({ x, y });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let adjustedX = x;
    let adjustedY = y;

    // Clamp horizontally to prevent overflowing the right edge
    if (x + rect.width > viewportWidth) {
      adjustedX = Math.max(16, viewportWidth - rect.width - 16);
    } else if (x < 16) {
      adjustedX = 16;
    }

    // Clamp vertically to prevent overflowing the bottom edge
    if (y + rect.height > viewportHeight) {
      adjustedY = Math.max(16, viewportHeight - rect.height - 16);
    } else if (y < 16) {
      adjustedY = 16;
    }

    setCoords({ x: adjustedX, y: adjustedY });
    setVisible(true);
  }, [x, y]);

  const normalizedType = objectType.toLowerCase();
  const contextualItems = normalizedType.includes("signature")
    ? [
        { id: "signatureExists", label: "Signature Exists", icon: Signature, color: "text-emerald-500" },
        { id: "compareSignature", label: "Compare Signature", icon: GitCompareArrows, color: "text-purple-500" },
        { id: "addReferenceSignature", label: "Add Reference Signature", icon: CopyPlus, color: "text-blue-500" }
      ]
    : normalizedType.includes("table")
      ? [
          { id: "captureTable", label: "Capture Table", icon: Grid2X2, color: "text-blue-500" },
          { id: "detectRepeatedHeader", label: "Detect Repeated Header", icon: Rows3, color: "text-emerald-500" },
          { id: "multiPageCapture", label: "Multi-page Capture", icon: CopyPlus, color: "text-purple-500" }
        ]
      : normalizedType.includes("checkbox")
        ? [
            { id: "captureSelectedValues", label: "Capture Selected Values", icon: CheckSquare, color: "text-emerald-500" },
            { id: "multiValueExtraction", label: "Multi-value Extraction", icon: CopyPlus, color: "text-blue-500" }
          ]
        : normalizedType.includes("radio")
          ? [
              { id: "captureRadioValue", label: "Capture Radio Value", icon: CircleDot, color: "text-emerald-500" },
              { id: "detectMarks", label: "Detect Filled Marks", icon: Sparkles, color: "text-purple-500" }
            ]
          : [];

  const menuSections = [
    {
      title: "Contextual Annotation",
      items: [
        { id: "createField", label: "Add Field", icon: PlusCircle, color: "text-blue-500" },
        { id: "addTextAnchor", label: "Add Anchor", icon: Anchor, color: "text-emerald-500" },
        { id: "previewExtraction", label: "Preview Extraction", icon: Eye, color: "text-sky-500" },
        { id: "relationship", label: "Relationship", icon: Network, color: "text-purple-500" },
        { id: "aiSuggest", label: "AI Suggest", icon: Sparkles, color: "text-purple-500" },
        { id: "validation", label: "Validation", icon: ShieldCheck, color: "text-emerald-500" },
        { id: "objectType", label: "Object Type", icon: Type, color: "text-amber-500" },
        { id: "multipleSelection", label: "Multiple Selection", icon: CopyPlus, color: "text-blue-500" },
        { id: "compare", label: "Compare", icon: GitCompareArrows, color: "text-slate-500" }
      ]
    },
    ...(contextualItems.length > 0 ? [{
      title: `${objectType} Intelligence`,
      items: contextualItems
    }] : []),
    {
      title: "Anchor Constraints",
      items: [
        { id: "addRelativeAnchor", label: "Secondary Anchor", icon: Anchor, color: "text-emerald-500" },
        { id: "addPatternAnchor", label: "Fallback Anchor", icon: Anchor, color: "text-amber-500" },
        { id: "addOcrStructureAnchor", label: "AI-discovered Anchor", icon: Anchor, color: "text-purple-500" }
      ]
    }
  ];

  return (
    <div
      ref={menuRef}
      style={{ 
        left: `${coords.x}px`, 
        top: `${coords.y}px`,
        visibility: visible ? "visible" : "hidden"
      }}
      className="fixed z-[999] w-64 rounded-xl border border-border/80 bg-card/95 shadow-[0_20px_50px_rgba(0,0,0,0.15)] backdrop-blur-md p-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[85vh] overflow-y-auto custom-scrollbar"
    >
      <div className="px-2.5 py-1.5 border-b border-border/50 mb-1 flex items-center justify-between">
        <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">Context Controls</span>
        <span className="text-[8px] font-bold text-muted-foreground bg-muted px-1.5 py-0.5 rounded uppercase">{objectType}</span>
      </div>

      <div className="space-y-2">
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            <span className="px-2.5 py-1 block text-[7px] font-black uppercase text-primary/70 tracking-widest">
              {section.title}
            </span>
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onSelectAction(item.id);
                  onClose();
                }}
                className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-foreground/80 hover:bg-primary/10 hover:text-primary group transition-all"
              >
                <div className="flex items-center gap-3">
                  <item.icon size={13} className={cn(item.color, "transition-transform group-hover:scale-110")} />
                  <span className="text-[11px] font-semibold tracking-tight">{item.label}</span>
                </div>
              </button>
            ))}
            {idx < menuSections.length - 1 && <div className="h-[1px] bg-border/50 my-1 mx-2" />}
          </div>
        ))}
      </div>

      {/* Standalone highlighted Delete option at the bottom */}
      <div className="border-t border-border/50 my-1.5 mx-2" />
      <div className="px-1 pb-1">
        <button
          onClick={() => {
            onSelectAction("deleteField");
            onClose();
          }}
          className="w-full flex items-center gap-3 px-2.5 py-2 rounded-lg text-left text-rose-400/90 hover:bg-rose-500/10 hover:text-rose-400 group transition-all"
        >
          <Trash2 size={13} className="text-rose-500/80 transition-transform group-hover:scale-110" />
          <span className="text-[11px] font-semibold tracking-tight">Delete</span>
        </button>
      </div>
    </div>
  );
}
