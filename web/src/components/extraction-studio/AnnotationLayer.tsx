"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Tag, Sparkles, AlertCircle, Anchor, Link2, Settings2, Trash2, CheckCheck } from "lucide-react";

interface Annotation {
  id: string;
  type: string;
  x: number; // percentage (0 - 100)
  y: number;
  width: number;
  height: number;
  label?: string;
  confidence?: number;
  color?: string;
  validationError?: string;
  anchorId?: string;
  value?: string;
  dateFormat?: string;
}

interface AnnotationLink {
  fieldId: string;
  anchorId: string;
}

interface AnnotationLayerProps {
  annotations: Annotation[];
  links?: AnnotationLink[];
  activeAnnotationId: string | null;
  onAnnotationSelect: (id: string) => void;
  activeLayer: "ocr" | "extraction" | "ai" | "validation";
  onDeleteAnnotation?: (id: string, type: string) => void;
  onAnnotationClick?: (e: React.MouseEvent, ann: Annotation) => void;
  onAnnotationAction?: (action: "addAnchor" | "done" | "changeType" | "delete", ann: Annotation) => void;
  onUpdateAnnotation?: (id: string, updates: { x?: number; y?: number; width?: number; height?: number }) => void;
  onUpdateAnnotationComplete?: (id: string, coordinates: { x: number; y: number; width: number; height: number }) => void;
  deskewAngle?: number;
  isCorrected?: boolean;
  zoom?: number;
  getUnscaledCoords?: (clientX: number, clientY: number) => { x: number; y: number };
  isDrawing?: boolean;
}

interface DragOperation {
  annId: string;
  type: "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se";
  startX: number;
  startY: number;
  startAnnX: number;
  startAnnY: number;
  startAnnW: number;
  startAnnH: number;
  parentW: number;
  parentH: number;
  startLeft: number;
  startTop: number;
  startWidth: number;
  startHeight: number;
}

export function AnnotationLayer({
  annotations,
  links = [],
  activeAnnotationId,
  onAnnotationSelect,
  activeLayer,
  onAnnotationClick,
  onAnnotationAction,
  onUpdateAnnotation,
  onUpdateAnnotationComplete,
  deskewAngle,
  isCorrected,
  zoom,
  getUnscaledCoords,
  isDrawing = false
}: AnnotationLayerProps) {
  const [dragOp, setDragOp] = useState<DragOperation | null>(null);
  const uiScale = 1 / Math.max(zoom || 1, 1);
  
  const hasMovedRef = React.useRef(false);
  const latestCoordsRef = React.useRef({ x: 0, y: 0, width: 0, height: 0 });

  const startDrag = (e: React.MouseEvent, ann: Annotation, type: DragOperation["type"]) => {
    const parent = e.currentTarget.parentElement;
    const rect = e.currentTarget.getBoundingClientRect();
    if (!parent) return;

    hasMovedRef.current = false;
    latestCoordsRef.current = {
      x: ann.x,
      y: ann.y,
      width: ann.width,
      height: ann.height
    };

    setDragOp({
      annId: ann.id,
      type,
      startX: e.clientX,
      startY: e.clientY,
      startAnnX: ann.x,
      startAnnY: ann.y,
      startAnnW: ann.width,
      startAnnH: ann.height,
      parentW: parent.clientWidth || 800,
      parentH: parent.clientHeight || 600,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height
    });
  };

  useEffect(() => {
    if (!dragOp) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dxPixels = e.clientX - dragOp.startX;
      const dyPixels = e.clientY - dragOp.startY;

      // Compute new screen bounds
      let newLeft = dragOp.startLeft;
      let newTop = dragOp.startTop;
      let newWidth = dragOp.startWidth;
      let newHeight = dragOp.startHeight;

      if (dragOp.type === "move") {
        newLeft = dragOp.startLeft + dxPixels;
        newTop = dragOp.startTop + dyPixels;
      } else if (dragOp.type === "resize-se") {
        newWidth = Math.max(10, dragOp.startWidth + dxPixels);
        newHeight = Math.max(10, dragOp.startHeight + dyPixels);
      } else if (dragOp.type === "resize-sw") {
        const targetW = dragOp.startWidth - dxPixels;
        if (targetW > 10) {
          newLeft = dragOp.startLeft + dxPixels;
          newWidth = targetW;
        }
        newHeight = Math.max(10, dragOp.startHeight + dyPixels);
      } else if (dragOp.type === "resize-ne") {
        newWidth = Math.max(10, dragOp.startWidth + dxPixels);
        const targetH = dragOp.startHeight - dyPixels;
        if (targetH > 10) {
          newTop = dragOp.startTop + dyPixels;
          newHeight = targetH;
        }
      } else if (dragOp.type === "resize-nw") {
        const targetW = dragOp.startWidth - dxPixels;
        if (targetW > 10) {
          newLeft = dragOp.startLeft + dxPixels;
          newWidth = targetW;
        }
        const targetH = dragOp.startHeight - dyPixels;
        if (targetH > 10) {
          newTop = dragOp.startTop + dyPixels;
          newHeight = targetH;
        }
      }

      hasMovedRef.current = true;

      // Convert new screen bounds back to percentage coordinates in straightened document space
      if (getUnscaledCoords) {
        // Center of the new screen box
        const centerX = newLeft + newWidth / 2;
        const centerY = newTop + newHeight / 2;

        // Map screen center to wrapper's local coordinate center
        const centerLocal = getUnscaledCoords(centerX, centerY);
        const z = zoom || 1;

        // Width and height as percentage of unscaled wrapper width/height
        const wPercent = (newWidth / (dragOp.parentW * z)) * 100;
        const hPercent = (newHeight / (dragOp.parentH * z)) * 100;

        let newX = centerLocal.x - wPercent / 2;
        let newY = centerLocal.y - hPercent / 2;

        // Clamp values to [0, 100]
        newX = Math.max(0, Math.min(100 - wPercent, newX));
        newY = Math.max(0, Math.min(100 - hPercent, newY));

        latestCoordsRef.current = {
          x: Number(newX.toFixed(2)),
          y: Number(newY.toFixed(2)),
          width: Number(wPercent.toFixed(2)),
          height: Number(hPercent.toFixed(2))
        };
      } else {
        // Fallback if coordinate mapping function is not provided
        const dxPercent = (dxPixels / dragOp.parentW) * 100;
        const dyPercent = (dyPixels / dragOp.parentH) * 100;

        let newX = dragOp.startAnnX;
        let newY = dragOp.startAnnY;
        let newW = dragOp.startAnnW;
        let newH = dragOp.startAnnH;

        if (dragOp.type === "move") {
          newX = Math.max(0, Math.min(100 - newW, dragOp.startAnnX + dxPercent));
          newY = Math.max(0, Math.min(100 - newH, dragOp.startAnnY + dyPercent));
        } else if (dragOp.type === "resize-se") {
          newW = Math.max(1, Math.min(100 - newX, dragOp.startAnnW + dxPercent));
          newH = Math.max(1, Math.min(100 - newY, dragOp.startAnnH + dyPercent));
        }

        latestCoordsRef.current = {
          x: Number(newX.toFixed(2)),
          y: Number(newY.toFixed(2)),
          width: Number(newW.toFixed(2)),
          height: Number(newH.toFixed(2))
        };
      }

      onUpdateAnnotation?.(dragOp.annId, latestCoordsRef.current);
    };

    const handleMouseUp = () => {
      if (dragOp && hasMovedRef.current) {
        onUpdateAnnotationComplete?.(dragOp.annId, latestCoordsRef.current);
      }
      setDragOp(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [dragOp, onUpdateAnnotation, onUpdateAnnotationComplete, zoom, getUnscaledCoords]);

  // Compute anchor→field connector lines in percentage coordinates
  const connectorLines = isDrawing ? [] : links.flatMap(link => {
    const field = annotations.find(a => a.id === link.fieldId);
    const anchor = annotations.find(a => a.id === link.anchorId || a.id === `anchor_${link.anchorId}` || link.anchorId === a.id);
    if (!field || !anchor) return [];
    const fx = field.x + field.width / 2;
    const fy = field.y + field.height / 2;
    const ax = anchor.x + anchor.width / 2;
    const ay = anchor.y + anchor.height / 2;
    // Pick the nearest edge midpoints rather than centers for a cleaner look
    const fieldEdgeX = ax < fx ? field.x : field.x + field.width;
    const fieldEdgeY = Math.max(field.y, Math.min(field.y + field.height, ay));
    const anchorEdgeX = ax < fx ? anchor.x + anchor.width : anchor.x;
    const anchorEdgeY = Math.max(anchor.y, Math.min(anchor.y + anchor.height, fy));
    return [{ id: `${link.fieldId}-${link.anchorId}`, x1: anchorEdgeX, y1: anchorEdgeY, x2: fieldEdgeX, y2: fieldEdgeY, color: field.color }];
  });

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
      {/* Anchor → Field connecting lines, drawn in grey inside the canvas coordinate space */}
      {connectorLines.length > 0 && (
        <svg
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
          style={{ zIndex: 25 }}
          aria-hidden="true"
        >
          <defs>
            {connectorLines.map(line => (
              <marker
                key={`m-${line.id}`}
                id={`arr-${line.id}`}
                viewBox="0 0 8 8"
                refX="6"
                refY="4"
                markerWidth="5"
                markerHeight="5"
                orient="auto"
              >
                <path d="M 0 1 L 6 4 L 0 7 z" fill="#9ca3af" />
              </marker>
            ))}
          </defs>
          {connectorLines.map(line => (
            <line
              key={line.id}
              x1={`${line.x1}%`}
              y1={`${line.y1}%`}
              x2={`${line.x2}%`}
              y2={`${line.y2}%`}
              stroke="#9ca3af"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              markerEnd={`url(#arr-${line.id})`}
              opacity="0.85"
            />
          ))}
        </svg>
      )}
      {annotations.map((ann) => {
        const isActive = activeAnnotationId === ann.id;
        const hasError = !!ann.validationError;
        
        const isAnchor = ann.id.startsWith("anchor_") || ann.type === "anchor" || ann.type === "semanticAnchor";
        if (isAnchor && isDrawing) return null;
        if (activeLayer === "validation" && !hasError && !isActive) return null;
        if (activeLayer === "ocr" && isAnchor) return null;

        let borderClass = "";
        let textClass = "border-blue-200 bg-white/95 text-blue-700";
        let icon = <Tag size={8} />;

        if (isAnchor) {
          icon = <Anchor size={8} />;
          // All anchors show as standard grey
          borderClass = isActive 
            ? "border border-solid border-zinc-500/90 bg-zinc-500/[0.035] ring-1 ring-zinc-400/30 scale-[1.005] transition-transform z-30 shadow-[0_0_0_1px_rgba(255,255,255,0.7)]" 
            : "border border-solid border-zinc-400 bg-transparent";
          textClass = "border-zinc-200 bg-white/95 text-zinc-600";
        } else if (ann.type === "semantic" || ann.type === "ai") {
          borderClass = isActive 
            ? "border border-solid border-emerald-500/90 bg-emerald-500/[0.035] ring-1 ring-emerald-400/30 scale-[1.005] transition-transform z-30 shadow-[0_0_0_1px_rgba(255,255,255,0.7)] animate-pulse" 
            : "border border-solid border-emerald-500/70 bg-transparent";
          textClass = "border-emerald-200 bg-white/95 text-emerald-700";
          icon = <Sparkles size={8} className="animate-spin" style={{ animationDuration: "6s" }} />;
        } else if (hasError) {
          borderClass = isActive 
            ? "border border-solid border-rose-500 bg-rose-500/[0.04] ring-1 ring-rose-400/40 scale-[1.005] transition-transform z-30 shadow-[0_0_0_1px_rgba(255,255,255,0.7)] animate-pulse" 
            : "border border-solid border-rose-500 bg-rose-500/5 shadow-[0_0_10px_rgba(244,63,94,0.3)] animate-pulse";
          textClass = "border-rose-200 bg-white/95 text-rose-700";
          icon = <AlertCircle size={8} />;
        } else {
          const isMissing = !ann.value && ann.confidence === 0;
          if (isMissing) {
            // Field was defined in the model but could not be located in this scan
            borderClass = isActive
              ? "border border-solid border-zinc-400 bg-zinc-900/[0.18] scale-[1.005] transition-transform z-30"
              : "border border-dashed border-zinc-400/60 bg-zinc-900/[0.10]";
            textClass = "border-zinc-300 bg-zinc-800/90 text-zinc-300";
          } else {
            // Default data point (field): semantic color comes from the schema/result mapping.
            borderClass = isActive
              ? "border border-solid bg-white/[0.025] scale-[1.005] transition-transform z-30"
              : "border border-solid bg-transparent";
            textClass = "border-blue-200 bg-white/95 text-blue-700";
          }
        }

        return (
          <div
            key={ann.id}
            onClick={(e) => {
              e.stopPropagation();
              onAnnotationSelect(ann.id);
              if (onAnnotationClick) {
                onAnnotationClick(e, ann);
              }
            }}
            onContextMenu={(e) => {
              // Select the annotation when right-clicked so context actions apply to it by default
              onAnnotationSelect(ann.id);
            }}
            onMouseDown={(e) => {
              if ((e.target as HTMLElement).tagName === "SELECT" || (e.target as HTMLElement).tagName === "BUTTON" || (e.target as HTMLElement).closest('button')) return;
              
              e.stopPropagation();
              e.preventDefault();
              if (activeAnnotationId !== ann.id) {
                onAnnotationSelect(ann.id);
              }
              
              startDrag(e, ann, "move");
            }}
            style={{
              left: `${ann.x}%`,
              top: `${ann.y}%`,
              width: `${ann.width}%`,
              height: `${ann.height}%`,
              ...(!isAnchor && ann.color ? {
                borderColor: ann.color,
                boxShadow: isActive
                  ? `0 0 0 1px rgba(255,255,255,0.95), 0 0 18px ${ann.color}55`
                  : `0 0 0 1px rgba(255,255,255,0.72), 0 0 10px ${ann.color}24`
              } : {})
            }}
            className={cn(
              "absolute rounded flex flex-col justify-between group",
              "pointer-events-auto cursor-pointer",
              borderClass
            )}
          >
            {/* Compact marker. Names sit just outside the box so existing data annotations remain discoverable. */}
            {!isAnchor ? (
              <div
                style={{
                  transform: `translateX(-50%) scale(${uiScale})`,
                  transformOrigin: "bottom center"
                }}
                className="absolute bottom-full left-1/2 z-50 mb-4 flex flex-col items-center select-none pointer-events-none"
              >
                <div className={cn(
                  "max-w-[260px] rounded-lg border px-3 py-2 text-[11px] font-black uppercase tracking-wider shadow-xl backdrop-blur-md",
                  textClass
                )}
                  style={!isAnchor && ann.color ? { borderColor: `${ann.color}55`, color: ann.color, backgroundColor: "rgba(255,255,255,0.96)" } : undefined}
                >
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    {React.cloneElement(icon, { size: 10 })}
                    <span className="truncate">{ann.label || "Field"}</span>
                    {ann.type === "date" && !!ann.value && (
                      <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[7px] text-blue-600">
                        {ann.dateFormat || "DD/MM/YYYY"}
                      </span>
                    )}
                    {!ann.value && ann.confidence === 0 && (
                      <span className="rounded bg-zinc-700 px-1.5 py-0.5 text-[7px] text-zinc-300 font-black uppercase tracking-wider">
                        Not found
                      </span>
                    )}
                  </div>
                </div>
                <div className="h-4 w-px" style={{ backgroundColor: ann.color || "#3b82f6" }} />
                <div className="h-2 w-2 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.95)]" style={{ backgroundColor: ann.color || "#3b82f6" }} />
              </div>
            ) : (
              <div
                style={{
                  transform: `translateX(-50%) scale(${uiScale})`,
                  transformOrigin: "bottom center"
                }}
                className="absolute bottom-full left-1/2 z-40 mb-2 flex flex-col items-center select-none pointer-events-none"
              >
                <div className="max-w-[160px] rounded-lg border border-zinc-200 bg-white/95 px-2 py-1 text-[7px] font-black uppercase tracking-wider text-zinc-600 flex items-center gap-1 shadow-lg backdrop-blur-md">
                  <Anchor size={7} />
                  <span className="truncate">{ann.value || ann.label || "Anchor"}</span>
                </div>
                <div className="h-2.5 w-px bg-zinc-500/70" />
                <div className="h-1.5 w-1.5 rounded-full bg-zinc-500 shadow-[0_0_0_2px_rgba(255,255,255,0.95)]" />
              </div>
            )}
            {isActive && !isAnchor && (
              <div
                style={{
                  transform: `translateX(-50%) scale(${uiScale})`,
                  transformOrigin: "top center"
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="absolute left-1/2 top-full z-50 mt-2 flex items-center gap-1 rounded-xl border border-border bg-white/95 p-1 shadow-2xl backdrop-blur-md"
              >
                {[
                  { action: "addAnchor" as const, label: "Add Anchor", icon: Link2, className: "text-emerald-600" },
                  { action: "changeType" as const, label: "Change Type", icon: Settings2, className: "text-amber-600" },
                ].map(item => (
                  <button
                    key={item.action}
                    title={item.label}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAnnotationAction?.(item.action, ann);
                    }}
                    className="flex h-7 items-center gap-1.5 px-2 rounded-lg text-muted-foreground hover:bg-muted text-[9px] font-black uppercase tracking-wide"
                  >
                    <item.icon size={12} className={item.className} />
                    <span className={item.className}>{item.label}</span>
                  </button>
                ))}
                <div className="w-px h-5 bg-border mx-0.5" />
                <button
                  title="Delete field"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnnotationAction?.("delete", ann);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 size={12} />
                </button>
                <div className="w-px h-5 bg-border mx-0.5" />
                <button
                  title="Done"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnnotationAction?.("done", ann);
                  }}
                  className="flex h-7 items-center gap-1.5 px-2.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[9px] font-black uppercase tracking-wide"
                >
                  <CheckCheck size={12} />
                  Done
                </button>
              </div>
            )}

            {isActive && isAnchor && (
              <div
                style={{
                  transform: `translateX(-50%) scale(${uiScale})`,
                  transformOrigin: "top center"
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => {
                  e.stopPropagation();
                }}
                className="absolute left-1/2 top-full z-50 mt-2 flex items-center gap-1 rounded-xl border border-border bg-white/95 p-1 shadow-2xl backdrop-blur-md"
              >
                <button
                  title="Delete anchor"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnnotationAction?.("delete", ann);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-rose-600 hover:bg-muted"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            {/* Corner Markers for Resizing */}
            {isActive && (
              <>
                <div 
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    startDrag(e, ann, "resize-nw");
                  }}
                  className="absolute top-0 left-0 w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-full translate-x-[-50%] translate-y-[-50%] opacity-100 cursor-nwse-resize z-40" 
                />
                <div 
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    startDrag(e, ann, "resize-ne");
                  }}
                  className="absolute top-0 right-0 w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-full translate-x-[50%] translate-y-[-50%] opacity-100 cursor-nesw-resize z-40" 
                />
                <div 
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    startDrag(e, ann, "resize-sw");
                  }}
                  className="absolute bottom-0 left-0 w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-full translate-x-[-50%] translate-y-[50%] opacity-100 cursor-nesw-resize z-40" 
                />
                <div 
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    startDrag(e, ann, "resize-se");
                  }}
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-white border-2 border-indigo-500 rounded-full translate-x-[50%] translate-y-[50%] opacity-100 cursor-nwse-resize z-40" 
                />
              </>
            )}

            {ann.validationError && (
              <div className="absolute inset-0 border border-rose-500/40 rounded flex items-center justify-center bg-rose-950/20">
                <AlertCircle className="text-rose-500 animate-bounce" size={16} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
