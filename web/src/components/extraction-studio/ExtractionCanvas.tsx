"use client";

import React, { useRef, useState, useEffect } from "react";
import { ZoomIn, ZoomOut, Move, Eye, ShieldAlert, Sparkles, Box, Anchor, Pencil, SplitSquareHorizontal, Merge, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExtractionCanvasProps {
  imageUrl?: string;
  activeLayer: "ocr" | "extraction" | "ai" | "validation";
  children?: React.ReactNode;
  onRightClick?: (e: React.MouseEvent, pos: { x: number; y: number }) => void;
  drawingMode?: boolean;
  onSelectionComplete?: (box: SelectionBox, clientPos: { x: number; y: number }) => void;
  onPendingBoxChange?: (box: SelectionBox) => void;
  onPendingBoxCommit?: (box: SelectionBox, clientPos: { x: number; y: number }) => void;
  panMode?: boolean;
  activeAnnotationId?: string | null;
  annotations?: CanvasAnnotation[];
  words?: CanvasOcrWord[];
  pendingBox?: SelectionBox | null;
  showOcrWords?: boolean;
  showOcrConfidence?: boolean;
  showStructure?: boolean;
  showObjectDetection?: boolean;
  showRelationships?: boolean;
  showHeatMap?: boolean;
  qualityScore?: number | null;
  darkenContent?: boolean;
  textEnhancementLevel?: number;
  onOcrWordAction?: (action: OcrWordAction, word: CanvasOcrWord) => void;
  documentViewMode?: "enhanced" | "original";
  onDocumentViewModeChange?: (mode: "enhanced" | "original") => void;
}

type SelectionBox = { x: number; y: number; width: number; height: number };
type OcrWordAction = "merge" | "split" | "edit" | "anchor";
type CanvasAnnotation = SelectionBox & {
  id: string;
  type?: string;
  label?: string;
  confidence?: number;
  value?: string;
};
type CanvasOcrWord = SelectionBox & {
  text?: string;
  confidence?: number;
  conf?: number;
};
type InjectedLayerProps = {
  deskewAngle?: number;
  isCorrected?: boolean;
  zoom?: number;
  getUnscaledCoords?: (clientX: number, clientY: number) => { x: number; y: number };
  isDrawing?: boolean;
};

type PendingBoxEdit = {
  mode: "move" | "resize-nw" | "resize-ne" | "resize-sw" | "resize-se";
  startLocal: { x: number; y: number };
  startBox: SelectionBox;
};

type DocumentViewMode = "enhanced" | "original";

export function ExtractionCanvas({
  imageUrl,
  activeLayer,
  children,
  onRightClick,
  drawingMode = false,
  onSelectionComplete,
  panMode = false,
  activeAnnotationId = null,
  words = [],
  pendingBox = null,
  onPendingBoxChange,
  onPendingBoxCommit,
  showOcrWords,
  showOcrConfidence,
  showStructure,
  showObjectDetection,
  showRelationships,
  showHeatMap,
  qualityScore,
  darkenContent = true,
  textEnhancementLevel = 65,
  onOcrWordAction,
  documentViewMode: documentViewModeProp,
  onDocumentViewModeChange
}: ExtractionCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const lastActiveIdRef = useRef<string | null>(null);
  const pendingBoxRef = useRef<SelectionBox | null>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [startPan, setStartPan] = useState({ x: 0, y: 0 });

  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStartLocal, setDrawStartLocal] = useState({ x: 0, y: 0 });
  const [drawBox, setDrawBox] = useState<SelectionBox | null>(null);
  const [pendingEdit, setPendingEdit] = useState<PendingBoxEdit | null>(null);

  const [internalViewMode, setInternalViewMode] = useState<DocumentViewMode>("enhanced");
  const documentViewMode = documentViewModeProp ?? internalViewMode;
  const setDocumentViewMode = onDocumentViewModeChange ?? setInternalViewMode;
  const deskewAngle = -2.8;
  const isEnhancedView = documentViewMode === "enhanced";
  const enhancementStrength = Math.max(0, Math.min(100, textEnhancementLevel)) / 100;
  const preprocessingSteps = [
    "Auto Deskew",
    "Auto Rotate",
    "Contrast",
    "Noise Removal",
    "Edge Sharpen",
    "Perspective",
    "Brightness"
  ];

  useEffect(() => {
    pendingBoxRef.current = pendingBox;
  }, [pendingBox]);

  // Track the active annotation without changing the user's zoom/pan workspace.
  useEffect(() => {
    lastActiveIdRef.current = activeAnnotationId;
  }, [activeAnnotationId]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 5));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const clampBox = (box: SelectionBox): SelectionBox => {
    const minSize = 0.3;
    const width = Math.max(minSize, Math.min(100, box.width));
    const height = Math.max(minSize, Math.min(100, box.height));
    return {
      x: Math.max(0, Math.min(100 - width, box.x)),
      y: Math.max(0, Math.min(100 - height, box.y)),
      width,
      height
    };
  };

  const getUnscaledCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current || !wrapperRef.current) return { x: 0, y: 0 };
    
    const containerRect = containerRef.current.getBoundingClientRect();
    const style = window.getComputedStyle(wrapperRef.current);
    const transform = style.transform;
    
    if (!transform || transform === "none") {
      const rect = wrapperRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    }
    
    try {
      const matrix = new DOMMatrix(transform);
      const inverse = matrix.invertSelf();
      
      const origin = style.transformOrigin.split(' ').map(parseFloat);
      const originX = isNaN(origin[0]) ? (wrapperRef.current.offsetWidth / 2) : origin[0];
      const originY = isNaN(origin[1]) ? (wrapperRef.current.offsetHeight / 2) : origin[1];
      
      const originScreenX = containerRect.left + wrapperRef.current.offsetLeft + originX + pan.x;
      const originScreenY = containerRect.top + wrapperRef.current.offsetTop + originY + pan.y;
      
      const dxScreen = clientX - originScreenX;
      const dyScreen = clientY - originScreenY;
      
      const xLocalOffset = inverse.a * dxScreen + inverse.c * dyScreen;
      const yLocalOffset = inverse.b * dxScreen + inverse.d * dyScreen;
      
      const xLocal = originX + xLocalOffset;
      const yLocal = originY + yLocalOffset;
      
      const unscaledWidth = wrapperRef.current.offsetWidth;
      const unscaledHeight = wrapperRef.current.offsetHeight;
      
      const x = Math.max(0, Math.min(100, (xLocal / unscaledWidth) * 100));
      const y = Math.max(0, Math.min(100, (yLocal / unscaledHeight) * 100));
      
      return { x, y };
    } catch (err) {
      console.error("DOMMatrix coordinate mapping failed:", err);
      const rect = wrapperRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;
      const y = ((clientY - rect.top) / rect.height) * 100;
      return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
    }
  };

  useEffect(() => {
    if (!pendingEdit) return;

    const updateBox = (event: MouseEvent) => {
      const currentLocal = getUnscaledCoords(event.clientX, event.clientY);
      const dx = currentLocal.x - pendingEdit.startLocal.x;
      const dy = currentLocal.y - pendingEdit.startLocal.y;
      const start = pendingEdit.startBox;

      let nextBox: SelectionBox = start;
      if (pendingEdit.mode === "move") {
        nextBox = { ...start, x: start.x + dx, y: start.y + dy };
      } else if (pendingEdit.mode === "resize-se") {
        nextBox = { ...start, width: start.width + dx, height: start.height + dy };
      } else if (pendingEdit.mode === "resize-sw") {
        nextBox = { x: start.x + dx, y: start.y, width: start.width - dx, height: start.height + dy };
      } else if (pendingEdit.mode === "resize-ne") {
        nextBox = { x: start.x, y: start.y + dy, width: start.width + dx, height: start.height - dy };
      } else if (pendingEdit.mode === "resize-nw") {
        nextBox = { x: start.x + dx, y: start.y + dy, width: start.width - dx, height: start.height - dy };
      }

      const clamped = clampBox(nextBox);
      pendingBoxRef.current = clamped;
      onPendingBoxChange?.(clamped);
    };

    const finishEdit = (event: MouseEvent) => {
      const finalBox = pendingBoxRef.current;
      setPendingEdit(null);
      if (finalBox) onPendingBoxCommit?.(finalBox, { x: event.clientX, y: event.clientY });
    };

    window.addEventListener("mousemove", updateBox);
    window.addEventListener("mouseup", finishEdit);

    return () => {
      window.removeEventListener("mousemove", updateBox);
      window.removeEventListener("mouseup", finishEdit);
    };
  }, [pendingEdit, onPendingBoxChange, onPendingBoxCommit]);

  const startPendingBoxEdit = (
    event: React.MouseEvent,
    mode: PendingBoxEdit["mode"]
  ) => {
    if (!pendingBox) return;
    event.stopPropagation();
    event.preventDefault();
    setPendingEdit({
      mode,
      startLocal: getUnscaledCoords(event.clientX, event.clientY),
      startBox: pendingBox
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.shiftKey) || (e.button === 0 && panMode)) { // Middle click, left click + Shift, or left click under panMode
      setIsPanning(true);
      setStartPan({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      e.preventDefault();
      return;
    }

    if (drawingMode && e.button === 0 && wrapperRef.current) {
      const { x, y } = getUnscaledCoords(e.clientX, e.clientY);
      setIsDrawing(true);
      setDrawStartLocal({ x, y });
      setDrawBox({ x, y, width: 0, height: 0 });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - startPan.x,
        y: e.clientY - startPan.y
      });
      return;
    }

    if (isDrawing && wrapperRef.current) {
      const current = getUnscaledCoords(e.clientX, e.clientY);
      const x = Math.min(drawStartLocal.x, current.x);
      const y = Math.min(drawStartLocal.y, current.y);
      const width = Math.abs(current.x - drawStartLocal.x);
      const height = Math.abs(current.y - drawStartLocal.y);
      const newBox = { x, y, width, height };
      setDrawBox(newBox);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      return;
    }

    if (isDrawing) {
      setIsDrawing(false);
      if (drawBox && drawBox.width > 0.2 && drawBox.height > 0.2 && onSelectionComplete) {
        onSelectionComplete(drawBox, { x: e.clientX, y: e.clientY });
      }
      setDrawBox(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onRightClick || !wrapperRef.current || !imageUrl) return;
    e.preventDefault();
    
    const { x, y } = getUnscaledCoords(e.clientX, e.clientY);
    onRightClick(e, { x, y });
  };

  const documentFilter = isEnhancedView
    ? `contrast(${1.25 + enhancementStrength * 0.2}) brightness(${1.02 + enhancementStrength * 0.04})`
    : "none";

  const straighteningTransform = "";
  const isCorrected = isEnhancedView;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden select-none bg-muted/10 border border-border/50 rounded-xl flex items-center justify-center transition-all",
        isPanning ? "cursor-grabbing" : panMode ? "cursor-grab" : drawingMode ? "cursor-crosshair" : "cursor-default"
      )}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
    >
      {/* Dynamic Layer Background Grid */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Layer Glow Ring based on active view layer */}
      <div className={cn(
        "absolute inset-0 pointer-events-none border transition-all duration-700 rounded-xl z-20",
        activeLayer === "ocr" && "border-sky-500/20 shadow-[inset_0_0_20px_rgba(14,165,233,0.05)]",
        activeLayer === "extraction" && "border-indigo-500/20 shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]",
        activeLayer === "ai" && "border-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.05)]",
        activeLayer === "validation" && "border-rose-500/20 shadow-[inset_0_0_20px_rgba(244,63,94,0.05)]"
      )} />

      {imageUrl ? (
        /* Document View Wrapper */
        <div 
          ref={wrapperRef}
          data-document-canvas-surface="true"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) ${straighteningTransform}`,
            transition: isPanning ? "none" : "transform 0.1s cubic-bezier(0.2, 0.8, 0.2, 1)"
          }}
          className="relative h-[80%] max-h-[80%] max-w-[94%] aspect-[1/1.414] shadow-2xl rounded-lg border border-border bg-card overflow-visible flex items-center justify-center"
        >
          <img 
            src={imageUrl} 
            alt="Document Canvas" 
            style={{ filter: documentFilter }}
            className="w-full h-full object-fill select-none pointer-events-none opacity-100 transition-all duration-500 rounded-lg"
          />

          {isEnhancedView && (
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none rounded-lg"
              style={{
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02)), radial-gradient(circle at 50% 45%, rgba(255,255,255,0.08), transparent 58%)",
                mixBlendMode: "screen"
              }}
            />
          )}

          {/* Light alignment lines to show the document is straightened */}
          {isEnhancedView && (
            <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center overflow-hidden rounded-lg">
               <div className="absolute left-0 right-0 top-1/2 border-t border-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
               <div className="absolute top-0 bottom-0 left-1/2 border-l border-emerald-400/40 shadow-[0_0_8px_rgba(52,211,153,0.3)]" />
               
               <div className="absolute top-[5%] right-[5%] text-[7px] font-black uppercase text-emerald-700/90 tracking-widest bg-emerald-50/80 px-2 py-1 rounded-sm backdrop-blur-sm border border-emerald-200/50 shadow-sm flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-[pulse_2s_ease-in-out_infinite]" />
                 Auto-Aligned
               </div>
            </div>
          )}

          {/* OCR word intelligence overlay */}
          {(showOcrWords || activeLayer === "ocr") && words.length > 0 && (
            <div className="absolute inset-0 z-30 pointer-events-none">
              {words.slice(0, 220).map((word, index) => {
                const confidence = typeof word.confidence === "number" ? word.confidence : typeof word.conf === "number" ? word.conf : 96;
                const confidencePct = confidence > 1 ? confidence : confidence * 100;
                const wordWidth = typeof word.width === "number" ? word.width : 3;
                const wordHeight = typeof word.height === "number" ? word.height : 1.6;
                return (
                  <div
                    key={`${word.text || "word"}-${index}`}
                    style={{
                      left: `${word.x}%`,
                      top: `${word.y}%`,
                      width: `${Math.max(wordWidth, 1.2)}%`,
                      height: `${Math.max(wordHeight, 1.1)}%`
                    }}
                    className={cn(
                      "absolute pointer-events-auto rounded-sm border bg-white/70 backdrop-blur-[1px] px-0.5 leading-none shadow-sm group cursor-pointer",
                      confidencePct < 70 ? "border-amber-400/80 text-amber-700" : "border-sky-400/70 text-sky-700"
                    )}
                    title={`OCR: ${word.text || ""} (${Math.round(confidencePct)}%)`}
                  >
                    <span className="block truncate text-[7px] font-bold">
                      {word.text || "OCR"}
                    </span>
                    {showOcrConfidence && (
                      <span className="absolute -bottom-3 left-0 text-[6px] font-black text-muted-foreground bg-white/85 px-0.5 rounded-sm">
                        {Math.round(confidencePct)}%
                      </span>
                    )}
                    <div className="absolute -top-6 left-0 hidden group-hover:flex items-center gap-0.5 rounded-md border border-border bg-card/95 p-0.5 shadow-lg">
                      {[
                        { id: "merge", icon: Merge, label: "Merge words" },
                        { id: "split", icon: SplitSquareHorizontal, label: "Split word" },
                        { id: "edit", icon: Pencil, label: "Correct OCR" },
                        { id: "anchor", icon: Anchor, label: "Create anchor" }
                      ].map((item) => (
                        <button
                          key={item.id}
                          title={item.label}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            onOcrWordAction?.(item.id as OcrWordAction, word);
                          }}
                          className="h-5 w-5 rounded flex items-center justify-center text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        >
                          <item.icon size={10} />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showHeatMap && (
            <div className="absolute inset-0 z-10 pointer-events-none opacity-30 bg-[radial-gradient(circle_at_62%_32%,rgba(16,185,129,0.42),transparent_18%),radial-gradient(circle_at_34%_46%,rgba(59,130,246,0.35),transparent_22%),radial-gradient(circle_at_68%_70%,rgba(245,158,11,0.32),transparent_18%)]" />
          )}



          {/* Floating Custom Layers */}
          {/* eslint-disable-next-line react-hooks/refs */}
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<InjectedLayerProps>, { 
                deskewAngle,
                isCorrected,
                zoom,
                getUnscaledCoords,
                isDrawing: isDrawing || !!drawBox || !!pendingBox
              });
            }
            return child;
          })}

          {/* Live Drawing bounding box */}
          {drawBox && (
            <div 
              style={{
                left: `${drawBox.x}%`,
                top: `${drawBox.y}%`,
                width: `${drawBox.width}%`,
                height: `${drawBox.height}%`
              }}
              className="absolute border border-solid border-indigo-500/80 bg-indigo-500/[0.035] shadow-[0_0_0_1px_rgba(255,255,255,0.7)] z-50 rounded-[2px] pointer-events-none"
            />
          )}

          {/* Pending Selection bounding box */}
          {pendingBox && (
            <div 
              onMouseDown={(e) => startPendingBoxEdit(e, "move")}
              style={{
                left: `${pendingBox.x}%`,
                top: `${pendingBox.y}%`,
                width: `${pendingBox.width}%`,
                height: `${pendingBox.height}%`
              }}
              className="absolute border border-solid border-emerald-500/80 bg-emerald-500/[0.04] shadow-[0_0_0_1px_rgba(255,255,255,0.75)] z-40 rounded-[2px] pointer-events-auto cursor-move"
              title="Drag to move selection. Drag corners to resize."
            >
              {[
                ["resize-nw", "top-0 left-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"],
                ["resize-ne", "top-0 right-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize"],
                ["resize-sw", "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize"],
                ["resize-se", "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize"]
              ].map(([mode, positionClass]) => (
                <button
                  key={mode}
                  onMouseDown={(e) => startPendingBoxEdit(e, mode as PendingBoxEdit["mode"])}
                  className={cn(
                    "absolute h-2 w-2 rounded-full border border-emerald-600 bg-white shadow-sm",
                    positionClass
                  )}
                  title="Resize selection"
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center p-8 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center text-muted-foreground/40 animate-pulse">
            <Box size={32} />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest text-foreground/80">No Document Loaded</h4>
            <p className="text-xs text-muted-foreground/60 max-w-xs mt-1.5 leading-relaxed">
              Please upload document assets in the Intake phase to execute OCR and design extraction fields.
            </p>
          </div>
        </div>
      )}







      {/* Canvas Zoom Controls — sits in the bottom gap below the document image */}
      {imageUrl && (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-2 left-1/2 z-40 flex -translate-x-1/2 flex-col gap-1 items-center"
        >
          <div className="bg-white/95 backdrop-blur-md border border-slate-200 px-3 py-1.5 rounded-xl flex items-center gap-3 shadow-xl text-[9px] font-bold text-muted-foreground">
            <div className="flex items-center gap-1.5 border-r border-slate-200 pr-3 text-[8px] font-black uppercase tracking-widest text-emerald-700">
              <Wand2 size={12} className="text-emerald-600" />
              {documentViewMode === "enhanced" ? "Enhanced" : "Original"}
            </div>
            <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(["enhanced", "original"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setDocumentViewMode(mode)}
                  className={cn(
                    "h-6 px-2 text-[8px] font-black uppercase tracking-widest transition-all",
                    documentViewMode === mode ? "rounded-md bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  )}
                  title={mode === "enhanced" ? "Show AI-enhanced readable document" : "Show original uploaded document"}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button 
              onClick={handleZoomOut}
              className="h-6 w-6 rounded hover:bg-muted text-muted-foreground transition-all shrink-0 flex items-center justify-center"
              title="Zoom Out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">50%</span>
            <input 
              type="range" 
              min="0.5" 
              max="5" 
              step="0.05"
              value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="w-40 h-1 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
              title="Document zoom slider, up to 500%"
            />
            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">500%</span>
            <button 
              onClick={handleZoomIn}
              className="h-6 w-6 rounded hover:bg-muted text-muted-foreground transition-all shrink-0 flex items-center justify-center"
              title="Zoom In"
            >
              <ZoomIn size={14} />
            </button>
            <button 
              onClick={handleResetZoom}
              className="min-w-12 px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-[9px] font-black text-emerald-700 hover:bg-primary/10 hover:text-primary transition-all select-none shrink-0"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoom * 100)}%
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-[8px] font-bold text-muted-foreground uppercase tracking-widest justify-center">
            <Move size={10} className="text-primary" />
            Shift + Drag to Pan
          </div>
        </div>
      )}
    </div>
  );
}

