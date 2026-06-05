"use client";

import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import { createPortal } from "react-dom";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  Handle,
  Position,
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  getStraightPath,
  getSmoothStepPath,
  EdgeProps,
  useViewport,
  useReactFlow,
  BackgroundVariant,
  ConnectionMode,
  NodeResizer,
  MarkerType,
  SelectionMode,
} from "@xyflow/react";
import { v4 as uuidv4 } from "uuid";
import { logStudioExecution } from "@/app/actions/studioActions";
import { getAsset } from "@/app/actions/assetActions";
import { toast } from "sonner";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import * as LucideIcons from "lucide-react";
import {
  MousePointer2,
  Type,
  Zap,
  Bot,
  ClipboardCheck,
  Split,
  Repeat,
  Settings,
  Hand,
  Search,
  Maximize,
  Minus,
  ZoomIn,
  Plus,
  Globe,
  Video,
  Database,
  Mail,
  Clock,
  RefreshCw,
  Play,
  CheckCircle,
  MoveHorizontal,
  ArrowDown,
  Spline,
  GitBranch,
  FolderOpen,
  ChevronRight as ChevronRightIcon,
  Save,
  Trash2,
  Copy,
  Layers,
  Link2,
  Drill,
  Pencil,
  Scissors,
  EyeOff,
  Eye,
  ArrowUpToLine,
  ArrowDownToLine,
  Network,
  GitFork,
  Square,
  StepForward,
  Bug,
  XCircle,
  Timer,
  MessageSquare,
  ScrollText,
  AlertTriangle,
  Sparkles,
  FileText,
  FileSpreadsheet,
  CirclePlay,
  CircleStop,
  ShieldCheck,
  Code,
  Webhook,
  FileCode,
  Table,
  Filter,
  SortAsc,
  Kanban,
  CheckSquare,
  Pen,
  FilePlus,
  Shield,
  Activity,
  Building2,
  ArrowRightLeft,
  Hash,
  Target,
  Box,
  UserCheck,
  AlertCircle,
  Grip,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween,
  MousePointerClick,
  ScanText,
  Camera,
  Terminal,
  PlayCircle,
  StopCircle,
  Check,
  X,
  ShieldAlert,
  Info,
  HelpCircle,
  Undo2,
  Redo2,
} from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { EventNode } from "./nodes/EventNode";
import { TaskNode } from "./nodes/TaskNode";
import { GatewayNode } from "./nodes/GatewayNode";
import { validateStudioFlow } from "@/lib/studio/validation";
import { DEFAULT_STUDIO_THEME, UniversalActivity } from "@/types/studio";



// --- Custom Edge Type ---

function StudioEdge(props: any) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
    selected,
  } = props;
  const getPath = () => {
    const params = {
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    };

    const edgeShape = data?.edgeType || props.type || "bezier";
    switch (edgeShape) {
      case "straight":
        return getStraightPath(params);
      case "smoothstep":
        return getSmoothStepPath(params);
      case "step":
        return getSmoothStepPath({ ...params, borderRadius: 0 });
      case "bezier":
      default:
        return getBezierPath(params);
    }
  };

  const [edgePath, labelX, labelY] = getPath();

  const onEdgeUpdate = props.onEdgeUpdate;

  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Background/Shadow Path (for depth and better hover target) */}
      <path
        id={id + "_bg"}
        d={edgePath}
        fill="none"
        strokeWidth={12}
        stroke="transparent"
        className="cursor-pointer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />

      {/* Main Connection Path (Glowing) */}
      <path
        id={id}
        d={edgePath}
        fill="none"
        markerEnd="url(#studio-arrowhead)"
        style={{
          ...style,
          strokeWidth: selected ? 3 : 2,
          stroke: selected
            ? "var(--primary)"
            : isHovered
              ? "var(--primary)"
              : "var(--foreground, #888)",
          filter:
            selected || isHovered
              ? "drop-shadow(0 0 8px var(--primary))"
              : "none",
          transition: "all 0.3s ease",
          opacity: selected || isHovered ? 1 : 0.4,
        }}
        className="react-flow__edge-path"
      />

      {/* Animated Flow Path (Moving light effect) */}
      {(selected || isHovered || data?.status === "running") && (
        <path
          d={edgePath}
          fill="none"
          strokeWidth={selected ? 3 : 2}
          stroke="url(#edge-gradient)"
          className="animate-flow"
          style={{ opacity: 0.8 }}
        />
      )}

      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: "all",
          }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className="flex flex-col items-center gap-1 group/edge-label"
        >
          {/* Editable Edge Label / Comment */}
          <input
            type="text"
            value={data?.label || ""}
            placeholder={isHovered ? "Add comment..." : ""}
            onChange={(e) => {
              const newLabel = e.target.value;
              onEdgeUpdate?.(id, { label: newLabel });
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            className={cn(
              "bg-card/90 backdrop-blur-xl border border-border/40 rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-widest text-center outline-none transition-all w-24 hover:w-32 focus:w-48 focus:border-primary focus:ring-4 focus:ring-primary/10",
              selected || isHovered
                ? "opacity-100 scale-100"
                : data?.label
                  ? "opacity-40 scale-90"
                  : "opacity-0 scale-75",
            )}
          />

          {/* Quick Insert Button (Hover only) */}
          {(isHovered || selected) && (
            <button
              className="w-6 h-6 rounded-full bg-primary text-white shadow-xl flex items-center justify-center hover:scale-125 hover:rotate-90 transition-all cursor-pointer animate-in fade-in zoom-in-50 duration-200 ring-4 ring-primary/20"
              onClick={(e) => {
                e.stopPropagation();
                // Future: open activity picker at this position
              }}
              title="Insert activity here"
            >
              <Plus size={12} strokeWidth={3} />
            </button>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

// --- Custom Node Type ---

const StudioNode = (props: any) => {
  const { data, selected, executionVars } = props;
  const nodeType = String(data.type || data.dragType || props.type || "").toLowerCase();
  
  // Map to specialized components if possible, otherwise use a generic circular BaseNode
  if (nodeType === 'gateway') return <GatewayNode {...props} />;
  if (nodeType === 'event' || nodeType === 'start' || nodeType === 'end') return <EventNode {...props} />;
  
  // Generic fallback for any other "studioNode" — make it circular
  return (
    <TaskNode {...props} />
  );
};


// --- Helper for Variable Resolution ---
const resolveValue = (val: any, vars: Record<string, any>) => {
  if (typeof val !== "string") return val;
  if (
    !val.includes("{") &&
    !val.includes("(") &&
    !val.includes("+") &&
    !val.includes("-")
  )
    return val;

  // Helper for nested property access
  const getNestedValue = (obj: any, path: string) => {
    try {
      return path.split(".").reduce((acc, part) => {
        if (!acc) return undefined;
        const arrayMatch = part.match(/(.*?)\[(\d+)\]/);
        if (arrayMatch) {
          const [, key, index] = arrayMatch;
          return acc[key] ? acc[key][parseInt(index)] : undefined;
        }
        return acc[part];
      }, obj);
    } catch {
      return undefined;
    }
  };

  // Core Function Library
  const funcs: Record<string, (...args: any[]) => any> = {
    Sum: (...args) =>
      args.flat(Infinity).reduce((a, b) => Number(a) + Number(b), 0),
    Average: (...args) => {
      const a = args.flat(Infinity);
      return a.reduce((s, v) => s + Number(v), 0) / a.length;
    },
    Min: (...args) => Math.min(...args.flat(Infinity).map(Number)),
    Max: (...args) => Math.max(...args.flat(Infinity).map(Number)),
    Count: (v) =>
      Array.isArray(v) ? v.length : typeof v === "string" ? v.length : 0,
    Round: (v, d) => Number(Number(v).toFixed(Number(d || 0))),
    Abs: (v) => Math.abs(Number(v)),

    Len: (s) => String(s || "").length,
    Left: (s, n) => String(s || "").substring(0, Number(n)),
    Right: (s, n) => {
      const str = String(s || "");
      return str.substring(str.length - Number(n));
    },
    Mid: (s, start, len) =>
      String(s || "").substring(Number(start), Number(start) + Number(len)),
    Substring: (s, start, len) =>
      String(s || "").substring(
        Number(start),
        len ? Number(start) + Number(len) : undefined,
      ),
    Trim: (s) => String(s || "").trim(),
    Upper: (s) => String(s || "").toUpperCase(),
    Lower: (s) => String(s || "").toLowerCase(),
    Replace: (s, f, r) =>
      String(s || "")
        .split(String(f))
        .join(String(r)),
    Contains: (s, f) => String(s || "").includes(String(f)),
    Concat: (...args) => args.join(""),

    Now: () => new Date().toISOString(),
    Today: () => new Date().toLocaleDateString(),
    FormatDate: (d, f) => new Date(d).toLocaleDateString(),

    If: (c, t, f) => {
      try {
        const condition = String(c)
          .replace(/And/gi, "&&")
          .replace(/Or/gi, "||")
          .replace(/Not/gi, "!");
        return eval(condition) ? t : f;
      } catch {
        return !!c ? t : f;
      }
    },
    IsNull: (v) => v === null || v === undefined,
    IsEmpty: (v) => !v || (Array.isArray(v) && v.length === 0),
    IsNumeric: (v) => !isNaN(parseFloat(v)) && isFinite(v),
    ToString: (v) => String(v),
    ToInt: (v) => parseInt(v),

    GenerateGUID: () => Math.random().toString(36).substring(2, 15),
    Random: (min, max) =>
      min !== undefined
        ? Math.floor(Math.random() * (Number(max) - Number(min) + 1)) +
          Number(min)
        : Math.random(),
  };

  const evaluate = (expr: string): any => {
    expr = expr.trim();
    if (!expr) return "";

    // 1. Check for literal strings in quotes
    if (
      (expr.startsWith("'") && expr.endsWith("'")) ||
      (expr.startsWith('"') && expr.endsWith('"'))
    ) {
      return expr.slice(1, -1);
    }

    // 2. Resolve Variables first (supports {{var}} and {var})
    let interpolated = expr.replace(/\{\{?([^}]+)\}?\}/g, (match, path) => {
      const val = getNestedValue(vars, path);

      if (val === undefined || val === null) return match;

      // If it's a purely numeric string, return it without quotes to allow math operations
      if (typeof val === "string" && !isNaN(Number(val)) && val.trim() !== "") {
        return val;
      }

      // Return quoted strings for other string values to protect them during math eval
      if (typeof val === "string") return `"${val}"`;
      return typeof val === "object" ? JSON.stringify(val) : val;
    });

    // 3. Resolve Function Calls recursively (handles nested Func(Func()))
    let hasFunction = true;
    let safetyCounter = 0;
    while (hasFunction && safetyCounter < 10) {
      hasFunction = false;
      safetyCounter++;

      // Match functions that have no nested parentheses in their arguments
      interpolated = interpolated.replace(
        /([a-zA-Z0-9]+)\(([^()]*)\)/g,
        (match, name, argsStr) => {
          if (funcs[name]) {
            hasFunction = true;
            // Split args by comma, but handle potential commas inside nested strings (basic check)
            const args = argsStr.split(",").map((arg) => {
              const evaluated = evaluate(arg.trim());
              return evaluated;
            });
            const result = funcs[name](...args);
            // Quote string results to keep them safe for math eval
            return typeof result === "string" ? `"${result}"` : result;
          }
          return match;
        },
      );
    }

    // 4. Final Math/Logical Eval
    // Allows numbers, operators, logic, dots, and quotes for string concatenation
    if (
      /^[0-9+\-*/().\s<>!=&|'"]+$/.test(interpolated) &&
      /[+\-*/<>!=&|]/.test(interpolated)
    ) {
      try {
        const result = eval(
          interpolated.replace(/And/gi, "&&").replace(/Or/gi, "||"),
        );
        return result;
      } catch {
        return interpolated.replace(/"/g, ""); // Strip safety quotes if eval fails
      }
    }

    // Strip safety quotes from final result if any
    return typeof interpolated === "string"
      ? interpolated.replace(/^"|"$/g, "")
      : interpolated;
  };

  return evaluate(val);
};

const maskSensitiveData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  if (data._isPassword) return "********";
  
  if (Array.isArray(data)) {
    return data.map(maskSensitiveData);
  }
  
  const masked: any = {};
  Object.keys(data).forEach(k => {
    masked[k] = maskSensitiveData(data[k]);
  });
  return masked;
};

const GLOBAL_NODE_TYPES = {
  studioNode: StudioNode,
  event: EventNode,
  eventNode: EventNode,
  task: TaskNode,
  taskNode: TaskNode,
  gateway: GatewayNode,
  gatewayNode: GatewayNode,
};

const edgeTypes = {
  studioEdge: StudioEdge,
  default: StudioEdge,
  straight: StudioEdge,
  smoothstep: StudioEdge,
  step: StudioEdge,
};

// --- Main Canvas Component ---

interface StudioCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: Connection) => void;
  onDrop?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onSelectionChange?: (params: { nodes: Node[]; edges: Edge[] }) => void;
  isRecording?: boolean;
  onStopRecording?: () => void;
  groupBreadcrumb?: { id: string; label: string }[];
  onDrillIntoGroup?: (groupId: string) => void;
  onNavigateBreadcrumb?: (groupId: string | null) => void;
  onAutoAlign?: () => void;
  onSave?: () => void;
  onDeleteNode?: (nodeId: string) => void;
  variables?: any[];
  workflowArguments?: any[];
  showBpmTools?: boolean;
  showFlowFormatting?: boolean;
  onStartCapture?: (propName: string) => void;
  runTrigger?: number;
  onStartRecording?: () => void;
  onSnapshotCapture?: (snapshot: any) => void;
  projectName?: string;
  engine?: string;
  logs?: any[];
  onEdgeUpdate?: (id: string, updates: any) => void;
  projectId?: string | null;
  activeEdgeType?: string;
  onAlign?: (direction: string) => void;
  onDistribute?: (direction: string) => void;
  onAutoLayout?: () => void;
  onEdgeTypeChange?: (type: string) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

// --- Canvas Navigator: zoom strip (MiniMap is rendered separately as a sibling) ---
// MiniMap must NOT be nested inside a custom div — it uses ReactFlow's
// internal pointer-event system which breaks when wrapped in overflow:hidden.
// Both elements share matching border/shadow/width so they look like one card.
function ZoomStrip() {
  const { zoom } = useViewport();
  const { zoomIn, zoomOut, setViewport, fitView } = useReactFlow();
  const pct = Math.round(zoom * 100);

  const border  = "var(--studio-border, oklch(0.84 0 0))";
  const raised  = "var(--studio-surface-raised, oklch(0.938 0 0))";
  const shadow  = "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)";
  const CARD_W  = 180;

  return (
    <Panel position="bottom-right" className="mb-3 mr-3">
      {/* Bottom half of the unified card — rounded bottom corners only */}
      <div
        className="flex items-center gap-1 px-2 py-1.5"
        style={{
          width: CARD_W,
          background: raised,
          border: `1px solid ${border}`,
          borderTop: "none",           /* top is provided by MiniMap */
          borderRadius: "0 0 12px 12px",
          boxShadow: shadow,
        }}
      >
        <button
          onClick={() => zoomOut({ duration: 200 })}
          disabled={pct <= 10}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          title="Zoom out"
        ><Minus size={13} /></button>

        <button
          onClick={() => setViewport({ x: 0, y: 0, zoom: 1 }, { duration: 250 })}
          className="flex-1 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--foreground)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          title="Reset to 100%"
        >
          <span className="text-xs font-semibold tabular-nums">{pct}%</span>
        </button>

        <button
          onClick={() => zoomIn({ duration: 200 })}
          disabled={pct >= 300}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors disabled:opacity-30"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          title="Zoom in"
        ><ZoomIn size={13} /></button>

        <div className="w-px h-4" style={{ background: border }} />

        <button
          onClick={() => fitView({ duration: 400, padding: 0.15 })}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--muted-foreground)" }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "var(--muted)"}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "transparent"}
          title="Fit all nodes"
        ><Maximize size={13} /></button>
      </div>
    </Panel>
  );
}

export function StudioCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onDrop,
  onDragOver,
  onSelectionChange,
  isRecording,
  onStopRecording,
  groupBreadcrumb = [],
  onDrillIntoGroup,
  onNavigateBreadcrumb,
  onAutoAlign,
  onSave,
  onDeleteNode,
  variables = [],
  workflowArguments = [],
  showBpmTools = false,
  showFlowFormatting = false,
  runTrigger = 0,
  onStartRecording,
  workflowId,
  onSnapshotCapture,
  projectName,
  engine = "react-flow",
  logs = [],
  onEdgeUpdate,
  projectId,
  activeEdgeType = "smoothstep",
  onAlign,
  onDistribute,
  onAutoLayout,
  onEdgeTypeChange,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
}: StudioCanvasProps & { workflowId?: string | null }) {
  const isMounted = useRef(false);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { theme, resolvedTheme } = useTheme();

  const { setNodes, getNodes, getEdges, fitView } = useReactFlow();




  
  const handleConnect = useCallback((params: Connection) => {
    onConnect?.({
      ...params,
      type: activeEdgeType,
    } as any);
  }, [onConnect, activeEdgeType]);

  // React Flow color mode sync
  const rfColorMode = useMemo(() => {
    const active = resolvedTheme || theme || "light";
    return active === "dark" || active.includes("Glass") ? "dark" : "light";
  }, [theme, resolvedTheme]);

  // --- Message Dialog State (shown during execution) ---
  const [messageDialog, setMessageDialog] = useState<{
    title: string;
    message: string;
    buttons: string;
    inputMode: string;
    inputLabel: string;
    defaultValue: string;
    dropdownOptions: string;
    resolve: (response: string) => void;
  } | null>(null);
  const [messageDialogInput, setMessageDialogInput] = useState("");
  const lastRunTrigger = useRef(runTrigger);
  useEffect(() => {
    if (runTrigger > lastRunTrigger.current && runTrigger > 0) {
      handleRun();
    }
    lastRunTrigger.current = runTrigger;
  }, [runTrigger]);

  const showMessageDialog = (
    node: Node,
    vars: Record<string, any> = {},
  ): Promise<string> => {
    const data = node.data as any;
    return new Promise((resolve) => {
      const defaultVal = resolveValue(data.defaultValue || "", vars);
      setMessageDialogInput(defaultVal);
      setMessageDialog({
        title: resolveValue(
          data.inputs?.title ||
            data.properties?.title ||
            data.dialogTitle ||
            String(data.label || "Message"),
          vars,
        ),
        message: resolveValue(
          data.inputs?.message ||
            data.properties?.message ||
            data.dialogMessage ||
            String(data.label || "Message Box"),
          vars,
        ),
        buttons: data.dialogButtons || "OK",
        inputMode: data.inputMode || "Display Only",
        inputLabel: resolveValue(data.inputLabel || "Enter value:", vars),
        defaultValue: defaultVal,
        dropdownOptions: data.dropdownOptions || "",
        resolve,
      });
    });
  };

  const handleDialogResponse = (response: string) => {
    if (messageDialog) {
      const inputMode = messageDialog.inputMode;
      const finalResponse =
        inputMode !== "Display Only" ? messageDialogInput : response;
      messageDialog.resolve(finalResponse || response);
      setMessageDialog(null);
      setMessageDialogInput("");
    }
  };

  // (keep existing state below)
  const [activeTool, setActiveTool] = useState<"select" | "pan">("select");

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key.toLowerCase() === "v") setActiveTool("select");
      if (e.key.toLowerCase() === "h") setActiveTool("pan");
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Keyboard shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) onRedo?.();
        } else {
          if (canUndo) onUndo?.();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        if (canRedo) onRedo?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onUndo, onRedo, canUndo, canRedo]);

  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
  } | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    x: number;
    y: number;
    edgeId: string;
  } | null>(null);

  // --- Execution Simulation State ---
  const [isRunning, setIsRunning] = useState(false);

  // ── Portal slot: toolbar buttons live in the StudioLayout sub-header ──
  const [toolbarSlot, setToolbarSlot] = useState<Element | null>(null);
  useEffect(() => {
    // Retry until the slot div (rendered by StudioLayout) is in the DOM
    const attempt = () => {
      const el = document.getElementById("studio-canvas-toolbar");
      if (el) { setToolbarSlot(el); } else { setTimeout(attempt, 50); }
    };
    attempt();
  }, []);
  const [runningNodeId, setRunningNodeId] = useState<string | null>(null);
  const [executionLog, setExecutionLog] = useState<
    {
      nodeId: string;
      label: string;
      status: "running" | "success" | "error" | "skipped";
      time: string;
      duration?: number;
      variables?: Record<string, any>;
    }[]
  >([]);
  const [executionStatus, setExecutionStatus] = useState<
    "idle" | "running" | "completed" | "error"
  >("idle");
  const [executionVars, setExecutionVars] = useState<Record<string, any>>({});
  const [logTab, setLogTab] = useState<"log" | "variables">("log");
  const [stepCount, setStepCount] = useState(0);
  const abortRef = React.useRef(false);
  const logRef = useRef<any[]>([]);

  // --- Recording State ---
  const [recordedNodes, setRecordedNodes] = useState<any[]>([]);
  const lastThreeSteps = useMemo(() => {
    return recordedNodes
      .slice(-3)
      .map((n) => n.data?.label || n.type)
      .join(" \u2192 ");
  }, [recordedNodes]);

  // Listen for recording events from the agent
  useEffect(() => {
    if (!isRecording) {
      setRecordedNodes([]);
      return;
    }

    const handleEvent = (event: any) => {
      try {
        const payload = typeof event === "string" ? JSON.parse(event) : event;
        const newNode = {
          id: uuidv4(),
          type: "studioNode",
          position: {
            x: 100 + recordedNodes.length * 50,
            y: 100 + recordedNodes.length * 50,
          },
          data: {
            label:
              payload.type === "click"
                ? `Click: ${payload.elementInfo?.innerText || "Element"}`
                : payload.type === "type"
                  ? `Type: ${payload.value}`
                  : "Navigation",
            status: "draft",
            dragType:
              payload.type === "click"
                ? "Click"
                : payload.type === "type"
                  ? "Type Into"
                  : "Navigate To",
            ...payload,
          },
        };
        setRecordedNodes((prev) => [...prev, newNode]);
        onNodesChange([{ type: "add", item: newNode }]);
      } catch (e) {
        console.error("Failed to process recorder event:", e);
      }
    };

    // Global hook for the agent bridge
    (window as any).__recorderAgent__sendEvent = handleEvent;

    return () => {
      delete (window as any).__recorderAgent__sendEvent;
    };
  }, [isRecording, onNodesChange, recordedNodes.length]);

  const handleMarkHighRisk = useCallback(() => {
    const selectedNodes = getNodes().filter(n => n.selected);
    if (selectedNodes.length === 0) {
      toast.info("Select one or more activities to toggle risk level");
      return;
    }

    const isAllHigh = selectedNodes.every(n => (n.data as UniversalActivity).risk?.level === 'HIGH');

    setNodes(nds => nds.map(n => {
      if (n.selected) {
        const risk = isAllHigh ? { level: 'LOW' as const } : {
          level: 'HIGH' as const,
          category: 'Financial' as const,
          why: 'Manual Governance Override: Architect flagged as critical sequence.',
          impact: 5,
          rpn: 15
        };
        return { ...n, data: { ...n.data, risk } };
      }
      return n;
    }));

    toast.success(isAllHigh ? "Activities reverted to normal risk" : "Activities escalated to HIGH RISK");
  }, [getNodes, setNodes]);

  // Simulate variable output per node type
  const simulateNodeOutput = (
    node: Node,
    step: number,
    allVars: Record<string, any>,
  ): Record<string, any> => {
    const type = String(node.data.type || "").toLowerCase();
    const subType = String(node.data.subType || "").toLowerCase();
    let dragType = String(node.data.dragType || node.data.type || "");
    const label = String(node.data.label || "Node");

    if (dragType === "task" || dragType === "serviceTask") {
      if (label === "MsgBox" || label === "Message Box") dragType = "Message Box";
      if (label === "Log" || label === "Log Message") dragType = "Log Message";
    }

    if (type === "start" || subType === "start" || dragType === "start" || dragType === "Start") {
      return {
        _workflow_started: true,
        _timestamp: new Date().toISOString(),
        _step: step,
      };
    }

    switch (dragType) {
      case "PDF OCR":
      case "PDF Extract Page":
      case "PDF Extract":
      case "File Extract":
      case "OCR Extract":
        const inputs = (node.data as any).inputs || {};
        const userPath = inputs.storePath || inputs.outputPath || "";
        const projectDir = projectName || "StudioWorkflow";
        const fallbackPath = `/Users/ratheesh/Studio/Projects/${projectDir}/Output/extracted_${step}_${Date.now().toString().slice(-4)}.txt`;
        return {
          extractedPath: userPath || fallbackPath,
          isDefaultPath: !userPath,
          pages: inputs.range === "All" ? 10 : 1,
          status: "Success",
          timestamp: new Date().toISOString()
        };
      case "If":
      case "decision":
        return { _condition: label, _result: true, _branch: "yes" };
      case "Try Catch":
        return { validated: true, errors: [], rulesPassed: 5 };
      case "Run Task":
        return {
          taskStatus: "Approved",
          approver: "admin@company.com",
          approvedAt: new Date().toISOString(),
        };
      case "SQL Query":
        return {
          rowsAffected: 1,
          recordId: `INV-${1000 + step}`,
          dbStatus: "committed",
        };
      case "Click":
        return { element: node.data.sublabel || "Button", clicked: true };
      case "Type":
        return {
          field: node.data.sublabel || "Input",
          value: "***",
          typed: true,
        };
      case "Browser":
        return {
          url: resolveValue(
            (node.data as any).inputs?.url || "https://app.example.com",
            allVars,
          ),
          status: 200,
        };
      case "Scrape Table":
        return {
          table: [
            { row: 1, col: "A" },
            { row: 2, col: "B" },
          ],
          rows: 2,
          source: "UI",
        };
      case "Select":
        return {
          selected: resolveValue(
            (node.data as any).inputs?.item || "Option 1",
            allVars,
          ),
          status: "OK",
        };
      case "Toggle":
        return {
          action: resolveValue(
            (node.data as any).inputs?.action || "Check",
            allVars,
          ),
          success: true,
        };
      case "Wait":
        return { found: true, waitTime: "1.2s" };
      case "Get Source":
        return {
          source: "<html><body><h1>Studio Designer</h1></body></html>",
          length: 120,
          type: "HTML",
        };
      case "Serialize":
        return { json: '{"status": "ok", "id": 123}', length: 28 };
      case "SOAP":
        return { response: "<soap:Envelope>...</soap:Envelope>", status: 200 };
      case "GraphQL":
        return { data: { user: { id: "usr_1", name: "Dev" } }, errors: [] };
      case "XML Parse":
        return { value: "extracted_xml_val", type: "string" };
      case "OAuth":
        return {
          token: `Bearer ${Math.random().toString(36).substring(7)}`,
          expires_in: 3600,
        };
      case "JSON Query":
        return {
          results: resolveValue(
            (node.data as any).inputs?.json ? ["result1", "result2"] : [],
            allVars,
          ),
          matches: 2,
        };
      case "XAML Read":
        return { obj: { type: "Flow", name: "Main" }, status: "Parsed" };
      case "XAML Write":
        return { xaml: '<Flow Name="Main"></Flow>', length: 24 };
      case "CV Click":
        return { found: true, clicked: true, confidence: 0.98 };
      case "CV Type":
        return { found: true, typed: true, field: "CV_Input" };
      case "CV Text":
        return { text: "...extracted from CV...", confidence: 0.95 };
      case "CV Check":
        return {
          action: resolveValue(
            (node.data as any).inputs?.action || "Check",
            allVars,
          ),
          status: "OK",
        };
      case "Decrypt":
        return { text: "...decrypted sensitive content...", status: "Success" };
      case "Connect":
        return {
          sessionId: `term-${Math.random().toString(36).substring(7)}`,
          status: "Connected",
        };
      case "Keys":
        return {
          sent: true,
          key: resolveValue((node.data as any).inputs?.key || "Enter", allVars),
        };
      case "Add Item":
        return { itemId: `q-item-${Date.now()}`, status: "Queued" };
      case "Bulk Add":
        return {
          count: resolveValue(
            (node.data as any).inputs?.items?.length || 50,
            allVars,
          ),
          status: "Success",
        };
      case "Get Trans":
        return {
          item: { id: "q-101", data: { account: "12345" } },
          status: "In Progress",
        };
      case "Set Status":
        return {
          updated: true,
          status: resolveValue(
            (node.data as any).inputs?.status || "Success",
            allVars,
          ),
        };
      case "Open Browser":
        return { url: "https://app.example.com", status: 200 };
      case "Read File":
        return { content: "Sample file content...", size: 1024 };
      case "Write File":
        return {
          status: "Created",
          path: resolveValue(
            (node.data as any).inputs?.path || "/tmp/file.txt",
            allVars,
          ),
        };
      case "Create Fldr":
        return { status: "Directory Created" };
      case "Path Exists":
        return { exists: true };
      case "Get Files":
        return { files: ["file1.txt", "file2.jpg", "data.csv"], count: 3 };
      case "Excel Read":
        return {
          data: [{ col1: "val1", col2: "val2" }],
          sheet: resolveValue(
            (node.data as any).inputs?.sheet || "Sheet1",
            allVars,
          ),
          range: resolveValue(
            (node.data as any).inputs?.range || "A1:A10",
            allVars,
          ),
        };
      case "Get Emails":
        return {
          emails: [
            { id: "1", subject: "Invoice #445", from: "billing@office.com" },
            {
              id: "2",
              subject: "Meeting Request",
              from: "manager@company.com",
            },
          ],
          count: 2,
          folder: "Inbox",
        };
      case "Email":
        return {
          to: resolveValue(
            (node.data as any).inputs?.to || "user@example.com",
            allVars,
          ),
          sent: true,
          messageId: `msg-${Date.now()}`,
        };
      case "Word Doc":
        return {
          path: resolveValue(
            (node.data as any).inputs?.path || "/exports/report.docx",
            allVars,
          ),
          status: "Success",
        };
      case "PPT Gen":
        return {
          path: resolveValue(
            (node.data as any).inputs?.path || "/exports/pres.pptx",
            allVars,
          ),
          slides: 5,
          status: "Generated Successfully",
        };
      case "Excel Write":
        return {
          written: true,
          cells: 128,
          sheet: resolveValue(
            (node.data as any).inputs?.sheet || "Sheet1",
            allVars,
          ),
        };
      case "Excel Macro":
        return {
          result: "Macro executed successfully",
          macro: resolveValue(
            (node.data as any).inputs?.macroName || "Main",
            allVars,
          ),
          status: "OK",
        };
      case "Excel Pivot":
        return {
          status: "Success",
          pivotName: resolveValue(
            (node.data as any).inputs?.pivotName || "PivotTable1",
            allVars,
          ),
          createdIn: resolveValue(
            (node.data as any).inputs?.targetSheet || "Sheet1",
            allVars,
          ),
        };
      case "Filter":
        return { filtered: [{ col1: "filtered_val" }], count: 1 };
      case "Build DT":
        return { table: [{ id: 1, name: "Sample" }] };
      case "Add Row":
        return {
          table: [
            ...resolveValue((node.data as any).inputs?.table || [], allVars),
            (node.data as any).inputs?.row || {},
          ],
        };
      case "Lookup DT":
        return { row: { id: 1, name: "Sample" }, index: 0, found: true };
      case "Sort DT":
        return {
          table: resolveValue((node.data as any).inputs?.table || [], allVars),
          sorted: true,
        };
      case "Join DT":
        return { table: [{ id: 1, val1: "a", val2: "b" }], rows: 1 };
      case "Word Read":
        return {
          text: "...extracted word content...",
          length: 1240,
          timestamp: new Date().toISOString(),
        };
      case "Word Replace":
        return { matches: 5, status: "Replaced" };
      case "PDF Merge":
        return {
          path: resolveValue(
            (node.data as any).inputs?.output || "/exports/merged.pdf",
            allVars,
          ),
          size: "2.4MB",
        };
      case "PDF OCR":
        return {
          text: "Sample OCR text extracted from the document...",
          confidence: 0.98,
          pageCount: 1
        };
      case "PDF Extract Page":
      case "PDF Extract":
        return {
          path: resolveValue(
            (node.data as any).inputs?.output || "/exports/extracted.pdf",
            allVars,
          ),
          pages: 2,
        };
      case "Get Sheets":
        return { sheets: ["Sheet1", "Data", "Summary"], count: 3 };
      case "Active Sheet":
        return { sheetName: "Sheet1" };
      case "Move Email":
        return {
          moved: true,
          target: resolveValue(
            (node.data as any).inputs?.targetFolder || "Archive",
            allVars,
          ),
        };
      case "Log":
        return {
          _logged: resolveValue(
            (node.data as any).inputs?.message || "",
            allVars,
          ),
        };
      case "MsgBox":
        return {
          userResponse: "OK",
          _message: resolveValue(
            (node.data as any).inputs?.message || "",
            allVars,
          ),
        };
      case "Python":
        return { result: "Python execution successful", status: 0 };
      case "VBS":
        return { result: "VB Script completed", status: 0 };
      case "C# Code":
        return { result: "C# Script compiled & executed", status: 0 };
      case "end":
        return {
          _workflow_completed: true,
          _totalSteps: step,
          _duration: `${step * 0.8}s`,
        };
      default:
        return { output: `Executed: ${label}`, success: true };
    }
  };

  const handleRun = useCallback(async () => {
    if (isRunning) {
      abortRef.current = true;
      setIsRunning(false);
      setRunningNodeId(null);
      setExecutionStatus("idle");
      if (isMounted.current) {
        onNodesChange(
          nodes.map((n) => ({
            type: "replace" as const,
            id: n.id,
            item: { ...n, data: { ...n.data, status: "none" } },
          })),
        );
      }
      return;
    }

    const startNode = nodes.find((n) => {
      const type = String(
        n.data?.type || n.data?.dragType || n.type || "",
      ).toLowerCase();
      const subType = String(n.data?.subType || "").toLowerCase();
      return (
        type === "start" ||
        type === "startnode" ||
        type === "trigger" ||
        subType === "start"
      );
    });
    if (!startNode) {
      const logs = [
        {
          nodeId: "",
          label: "Error: No Start node found. Add a Start node to the canvas.",
          status: "error" as const,
          time: new Date().toLocaleTimeString(),
        },
      ];
      setExecutionLog(logs);
      setExecutionStatus("error");
      return;
    }

    abortRef.current = false;
    setIsRunning(true);
    setExecutionStatus("running");
    setExecutionLog([]);
    setExecutionVars({});
    setStepCount(0);
    setLogTab("log");
    logRef.current = [];

    onNodesChange(
      nodes.map((n) => ({
        type: "replace" as const,
        id: n.id,
        item: { ...n, data: { ...n.data, status: "none" } },
      })),
    );

    let localLogs: any[] = [];
    let nodeQueue: string[] = [startNode.id];
    const visited = new Set<string>();
    let step = 0;
    let localHasError = false;
    const allVars: Record<string, any> = {};

    // Initialize with variables and arguments values
    variables.forEach((v) => {
      if (v.name) allVars[v.name] = v.value;
    });
    workflowArguments.forEach((a) => {
      if (a.name) allVars[a.name] = a.value;
    });

    while (nodeQueue.length > 0 && !abortRef.current) {
      const currentNodeId = nodeQueue.shift()!;
      if (visited.has(currentNodeId)) continue;
      visited.add(currentNodeId);
      step++;

      const currentNode = nodes.find((n) => n.id === currentNodeId);
      if (!currentNode) continue;

      const label = String(currentNode.data.label || "Node");
      let dragType = String(
        currentNode.data.dragType || currentNode.data.type || "",
      );
      if (dragType === "task" || dragType === "serviceTask") {
        if (label === "MsgBox" || label === "Message Box")
          dragType = "Message Box";
        if (label === "Log" || label === "Log Message")
          dragType = "Log Message";
      }
      let displayLabel = resolveValue(label, allVars);

      if (dragType === "Message Box") {
        displayLabel = `Message Box: ${resolveValue(currentNode.data.dialogMessage || label, allVars)}`;
      } else if (dragType === "Log Message") {
        displayLabel = `Log: ${resolveValue(currentNode.data.logMessage || label, allVars)}`;
      } else if (dragType === "SQL Query") {
        displayLabel = `SQL: ${resolveValue(currentNode.data.query || label, allVars)}`;
      } else if (dragType === "Assign" || dragType === "assign") {
        displayLabel = `Assign: ${currentNode.data.to} = ${resolveValue(currentNode.data.value || '""', allVars)}`;
      }

      const now = new Date().toLocaleTimeString();
      const startMs = Date.now();

      if (isMounted.current) {
        setRunningNodeId(currentNodeId);
        setStepCount(step);
      }
      const newLogEntry = {
        nodeId: currentNodeId!,
        label: displayLabel,
        status: "running" as const,
        time: now,
      };
      localLogs = [...localLogs, newLogEntry];
      if (isMounted.current) {
        setExecutionLog(localLogs);

        onNodesChange([
          {
            type: "replace" as const,
            id: currentNodeId,
            item: {
              ...currentNode,
              data: { 
                ...currentNode.data, 
                execution: { ...(currentNode.data.execution || {}), status: "running" } 
              },
            },
          },
        ]);
      }

      // --- Special handling for Message Box: show real dialog ---
      let userResponse = "";

      if (dragType === "Message Box") {
        // Show dialog and wait for user response
        userResponse = await showMessageDialog(currentNode, allVars);
        if (abortRef.current) break;
      } else {
        // Normal simulation delay
        await new Promise((r) => setTimeout(r, 600 + Math.random() * 600));
        if (abortRef.current) break;
      }

      const durationMs = Date.now() - startMs;
      
      let vars: Record<string, any> = {};
      if (currentNode.data.subType === 'getAsset') {
        const assetName = resolveValue((currentNode.data as any).inputs?.assetName || "", allVars);
        try {
          const assetData = await getAsset(assetName || "", projectId || "");
          vars = { [(currentNode.data as any).outputs?.assetValue || 'assetValue']: assetData };
          console.log(`[STUDIO] Asset fetched: ${assetName}`);
        } catch (e: any) {
          console.error("Get Asset Failed:", e);
          toast.error(`Get Asset Failed: ${e.message}`);
          localHasError = true;
        }
      } else {
        vars = simulateNodeOutput(currentNode, step, allVars);
      }

      if (dragType === "Message Box") {
        vars.userResponse = userResponse;
        vars._messageShown = true;
      }
      Object.assign(allVars, vars);
      if (isMounted.current) {
        setExecutionVars({ ...allVars });

        onNodesChange([
          {
            type: "replace" as const,
            id: currentNodeId,
            item: {
              ...currentNode,
              data: { 
                ...currentNode.data, 
                execution: { ...(currentNode.data.execution || {}), status: "completed" } 
              },
            },
          },
        ]);
      }

      localLogs = localLogs.map((e) => {
        if (e.nodeId === currentNodeId) {
          let updatedLabel = e.label;
          if (vars && Object.keys(vars).length > 0) {
            const firstKey = Object.keys(vars)[0];
            const firstVal = vars[firstKey];
            if (!e.label.includes("\u279E")) {
              updatedLabel = `${e.label} \u279E ${firstKey}: ${typeof firstVal === "object" ? "Object" : String(firstVal)}`;
            }
          }
          return {
            ...e,
            label: updatedLabel,
            status: "success" as const,
            duration: durationMs,
            variables: maskSensitiveData(vars),
            time: new Date().toLocaleTimeString(),
          };
        }
        return e;
      });
      if (isMounted.current) {
        setExecutionLog(localLogs);
      }

      // --- Error Simulation ---
      const shouldFail = currentNode.data.simulateError === true;
      if (shouldFail) {
        localHasError = true;
        if (isMounted.current) {
          onNodesChange([
            {
              type: "replace" as const,
              id: currentNodeId,
              item: {
                ...currentNode,
                data: { 
                  ...currentNode.data, 
                  execution: { ...(currentNode.data.execution || {}), status: "failed" } 
                },
              },
            },
          ]);

          setExecutionLog((prev) =>
            prev.map((e) =>
              e.nodeId === currentNodeId
                ? { ...e, status: "error" as const }
                : e,
            ),
          );
        }

        if (currentNode.data.screenshotOnError && onSnapshotCapture) {
          if (isMounted.current) {
            onSnapshotCapture({
              name: `Error_${currentNode.data.label || "Node"}_${step}`,
              time: new Date().toLocaleTimeString(),
              url: `https://images.unsplash.com/photo-1594322436404-5a0526db4d13?q=80&w=1000&auto=format&fit=crop`,
              path: `Snapshots/${projectName || "Project"}/Error_Step_${step}.png`,
            });
            toast.error(
              `Error in ${currentNode.data.label}: Screenshot captured`,
            );
          }
        }

        if (currentNode.data.onException !== "Skip and Continue") {
          // Dynamic Risk Escalation
          const currentRisk = (currentNode.data as UniversalActivity).risk || { level: 'LOW' };
          let newLevel = currentRisk.level;
          if (currentRisk.level === 'LOW') newLevel = 'MEDIUM';
          else if (currentRisk.level === 'MEDIUM') newLevel = 'HIGH';

          if (newLevel !== currentRisk.level) {
            (currentNode.data as UniversalActivity).risk = {
              ...currentRisk,
              level: newLevel as any,
              why: `Dynamic Escalation: Failure detected during runtime execution`,
              impact: newLevel === 'HIGH' ? 5 : 3,
              rpn: (newLevel === 'HIGH' ? 5 : 3) * (currentRisk.likelihood || 3)
            };
            toast.warning(`Risk Escalated: ${currentNode.data.label} is now ${newLevel} Risk`, {
              description: "High failure rate detected at runtime."
            });
          }

          if (isMounted.current) {
            setIsRunning(false);
            setExecutionStatus("error");
          }
          break;
        }
      }

      // --- Break Logic ---
      if (currentNode.data.subType === 'break') {
        const condition = (currentNode.data as any).inputs?.condition;
        // If condition is empty, it's an unconditional break. Otherwise, evaluate it.
        const shouldBreak = !condition || 
                           resolveValue(condition, allVars) === true || 
                           resolveValue(condition, allVars) === "true" ||
                           String(resolveValue(condition, allVars)).toLowerCase() === "yes";
        
        if (shouldBreak) {
          if (isMounted.current) {
            toast.info("Break encountered: Terminating flow.");
          }
          break; // Terminate the while loop
        }
      }

      if (currentNode.data.type === "end") continue;

      const outEdges = edges.filter((e) => e.source === currentNodeId);
      if (outEdges.length === 0) continue;

      // --- Routing Logic ---
      const isParallel =
        dragType.toLowerCase().includes("parallel") ||
        dragType.toLowerCase().includes("fork") ||
        label.toLowerCase().includes("parallel") ||
        currentNode.data.type === "parallel_fork" ||
        currentNode.data.subType === "andGateway" ||
        currentNode.data.subType === "orGateway";

      if (isParallel) {
        // Run ALL branches
        nodeQueue.push(...outEdges.map((e) => e.target));
      } else if (currentNode.data.type === "decision") {
        const yesEdge = outEdges.find(
          (e) => e.sourceHandle === "yes" || e.label === "Yes",
        );
        if (yesEdge) nodeQueue.push(yesEdge.target);
        else nodeQueue.push(outEdges[0].target);
      } else {
        // Default: take first branch
        nodeQueue.push(outEdges[0].target);
      }
    }

    setRunningNodeId(null);
    setIsRunning(false);

    if (!abortRef.current) {
      const finalStatus = localHasError ? "FAILED" : "SUCCESS";
      if (!localHasError) {
        setExecutionStatus("completed");
      }

      // Persist the actual execution trace to the database
      try {
        if (workflowId && workflowId !== "sandbox") {
          // Ensure all current nodes/edges are persisted before logging execution
          // so that foreign key constraints on StudioStepLog.nodeId are satisfied.
          if (onSave) await onSave();
          
          await logStudioExecution({
            workflowId,
            status: finalStatus,
            executedBy: "Designer Simulation",
            lastModifiedBy: "System",
            variables: allVars,
            steps: logRef.current,
          });
          console.log("[STUDIO] Execution trace persisted:", finalStatus);
        }
      } catch (err) {
        console.error("Failed to persist execution log:", err);
      }
    }
  }, [
    isRunning,
    nodes,
    edges,
    onNodesChange,
    workflowId,
    variables,
    workflowArguments,
  ]);

  const enrichedNodes = React.useMemo(
    () =>
      (nodes || []).map((n: any) => {
        // Inject status from logs
        const nodeLog =
          logs && [...logs].reverse().find((l) => l.nodeId === n.id);
        const mappedStatus = nodeLog
          ? nodeLog.status === "STARTED"
            ? "running"
            : nodeLog.status === "SUCCESS"
              ? "completed"
              : nodeLog.status === "FAILED"
                ? "failed"
                : n.data?.execution?.status
          : n.data?.execution?.status;

        let baseNode = {
          ...n,
          data: {
            ...n.data,
            execution: {
              ...(n.data?.execution || {}),
              status: mappedStatus,
            },
          },
        };

        if (baseNode.data.type === "group" && onDrillIntoGroup) {
          baseNode.data = { ...baseNode.data, onDrillIn: onDrillIntoGroup };
        }

        // Inject thread count updater for parallel gateway nodes
        if (
          baseNode.data.type === "parallel_fork" ||
          baseNode.data.type === "parallel_join"
        ) {
          baseNode.data = {
            ...baseNode.data,
            onUpdateThreadCount: (newCount: number) => {
              onNodesChange([
                {
                  type: "replace",
                  id: n.id,
                  item: { ...n, data: { ...n.data, threadCount: newCount } },
                } as any,
              ]);

              const ts = n.id.replace(/^n-(fork|join)-/, "");
              const counterpartPrefix =
                n.data.type === "parallel_fork" ? "n-join-" : "n-fork-";
              const counterpart = nodes.find(
                (nd) => nd.id === `${counterpartPrefix}${ts}`,
              );
              if (counterpart) {
                onNodesChange([
                  {
                    type: "replace",
                    id: counterpart.id,
                    item: {
                      ...counterpart,
                      data: { ...counterpart.data, threadCount: newCount },
                    },
                  } as any,
                ]);
              }
            },
          };
        }
        return baseNode;
      }),
    [nodes, onDrillIntoGroup, onNodesChange, logs],
  );

  // Get context node helper
  const getContextNode = useCallback(() => {
    if (!contextMenu) return null;
    return nodes.find((n) => n.id === contextMenu.nodeId) || null;
  }, [contextMenu, nodes]);

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    [],
  );

  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
    setEdgeContextMenu(null);
  }, []);

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      setContextMenu(null);
      setEdgeContextMenu({
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
      });
    },
    [],
  );

  const handleDeleteEdge = useCallback(() => {
    if (edgeContextMenu) {
      onEdgesChange([{ type: "remove", id: edgeContextMenu.edgeId }]);
    }
    setEdgeContextMenu(null);
  }, [edgeContextMenu, onEdgesChange]);

  const handleDeleteFromMenu = useCallback(() => {
    if (contextMenu) {
      onDeleteNode?.(contextMenu.nodeId);
      onNodesChange([{ type: "remove", id: contextMenu.nodeId }]);
      // Also remove connected edges
      const connectedEdges = edges.filter(
        (e) =>
          e.source === contextMenu.nodeId || e.target === contextMenu.nodeId,
      );
      if (connectedEdges.length) {
        onEdgesChange(
          connectedEdges.map((e) => ({ type: "remove" as const, id: e.id })),
        );
      }
    }
    setContextMenu(null);
  }, [contextMenu, onDeleteNode, onNodesChange, edges, onEdgesChange]);

  const handleDuplicateFromMenu = useCallback(() => {
    if (contextMenu) {
      const sourceNode = nodes.find((n) => n.id === contextMenu.nodeId);
      if (sourceNode) {
        const newNode: Node = {
          ...sourceNode,
          id: uuidv4(),
          position: {
            x: sourceNode.position.x + 40,
            y: sourceNode.position.y + 40,
          },
          selected: false,
        };
        onNodesChange([{ type: "add", item: newNode }]);
      }
    }
    setContextMenu(null);
  }, [contextMenu, nodes, onNodesChange]);

  const handleCutFromMenu = useCallback(() => {
    if (contextMenu) {
      const sourceNode = nodes.find((n) => n.id === contextMenu.nodeId);
      if (sourceNode) {
        // Copy to clipboard as JSON
        navigator.clipboard.writeText(
          JSON.stringify({
            ...sourceNode,
            data: { ...sourceNode.data, icon: undefined, onDrillIn: undefined },
          }),
        );
      }
      onNodesChange([{ type: "remove", id: contextMenu.nodeId }]);
      const connectedEdges = edges.filter(
        (e) =>
          e.source === contextMenu.nodeId || e.target === contextMenu.nodeId,
      );
      if (connectedEdges.length) {
        onEdgesChange(
          connectedEdges.map((e) => ({ type: "remove" as const, id: e.id })),
        );
      }
    }
    setContextMenu(null);
  }, [contextMenu, nodes, onNodesChange, edges, onEdgesChange]);

  const handleToggleDisable = useCallback(() => {
    if (contextMenu) {
      const node = nodes.find((n) => n.id === contextMenu.nodeId);
      if (node) {
        onNodesChange([
          {
            type: "replace",
            id: contextMenu.nodeId,
            item: {
              ...node,
              data: { ...node.data, disabled: !node.data.disabled },
            },
          },
        ]);
      }
    }
    setContextMenu(null);
  }, [contextMenu, nodes, onNodesChange]);

  const handleSelectConnected = useCallback(() => {
    if (contextMenu) {
      const connectedNodeIds = new Set<string>();
      connectedNodeIds.add(contextMenu.nodeId);
      edges.forEach((e) => {
        if (e.source === contextMenu.nodeId) connectedNodeIds.add(e.target);
        if (e.target === contextMenu.nodeId) connectedNodeIds.add(e.source);
      });
      const changes = nodes.map((n) => ({
        type: "select" as const,
        id: n.id,
        selected: connectedNodeIds.has(n.id),
      }));
      onNodesChange(changes);
    }
    setContextMenu(null);
  }, [contextMenu, edges, nodes, onNodesChange]);

  const handleRenameFromMenu = useCallback(() => {
    if (contextMenu) {
      const node = nodes.find((n) => n.id === contextMenu.nodeId);
      if (node) {
        const newLabel = prompt("Rename node:", String(node.data.label || ""));
        if (newLabel !== null) {
          onNodesChange([
            {
              type: "replace",
              id: contextMenu.nodeId,
              item: { ...node, data: { ...node.data, label: newLabel } },
            },
          ]);
        }
      }
    }
    setContextMenu(null);
  }, [contextMenu, nodes, onNodesChange]);

  const handleBringToFront = useCallback(() => {
    if (contextMenu) {
      const node = nodes.find((n) => n.id === contextMenu.nodeId);
      if (node) {
        const maxZ = Math.max(
          ...nodes.map((n) => (n.style as any)?.zIndex || 0),
          0,
        );
        onNodesChange([
          {
            type: "replace",
            id: contextMenu.nodeId,
            item: {
              ...node,
              style: { ...(node.style || {}), zIndex: maxZ + 1 },
            },
          },
        ]);
      }
    }
    setContextMenu(null);
  }, [contextMenu, nodes, onNodesChange]);

  const handleSendToBack = useCallback(() => {
    if (contextMenu) {
      const node = nodes.find((n) => n.id === contextMenu.nodeId);
      if (node) {
        const minZ = Math.min(
          ...nodes.map((n) => (n.style as any)?.zIndex || 0),
          0,
        );
        onNodesChange([
          {
            type: "replace",
            id: contextMenu.nodeId,
            item: {
              ...node,
              style: { ...(node.style || {}), zIndex: minZ - 1 },
            },
          },
        ]);
      }
    }
    setContextMenu(null);
  }, [contextMenu, nodes, onNodesChange]);

  const handleToggleLoop = useCallback(() => {
    if (contextMenu) {
      const node = nodes.find((n) => n.id === contextMenu.nodeId);
      if (node) {
        const isLoop = !!(node.data as any).loopEnabled;
        if (isLoop) {
          // Remove loop
          onNodesChange([
            {
              type: "replace",
              id: contextMenu.nodeId,
              item: {
                ...node,
                data: {
                  ...node.data,
                  loopEnabled: false,
                  loopCondition: undefined,
                  loopMaxIterations: undefined,
                },
              },
            },
          ]);
        } else {
          // Set loop — prompt for condition
          const condition = prompt(
            'Loop exit condition (e.g., "index >= items.length" or "retryCount > 3"):',
            "",
          );
          if (condition !== null) {
            const maxIter = prompt("Max iterations (safety limit):", "100");
            onNodesChange([
              {
                type: "replace",
                id: contextMenu.nodeId,
                item: {
                  ...node,
                  data: {
                    ...node.data,
                    loopEnabled: true,
                    loopCondition: condition || "counter >= maxCount",
                    loopMaxIterations: parseInt(maxIter || "100", 10),
                    loopType: "standard", // standard | multi-instance
                  },
                },
              },
            ]);
          }
        }
      }
    }
    setContextMenu(null);
  }, [contextMenu, nodes, onNodesChange]);

  const nodeTypes = useMemo(
    () => ({
      studioNode: (props: any) => (
        <StudioNode {...props} executionVars={executionVars} />
      ),
      eventNode: EventNode,
      taskNode: TaskNode,
      gatewayNode: GatewayNode,
    }),
    [executionVars],
  );

  const validation = useMemo(
    () => validateStudioFlow(nodes, edges),
    [nodes, edges],
  );

  return (
    <div className="w-full h-full relative group" onClick={closeContextMenu}>
      <ReactFlow
        nodes={enrichedNodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={handleConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={onSelectionChange}
        onNodeContextMenu={handleNodeContextMenu}
        onEdgeContextMenu={handleEdgeContextMenu}
        onPaneClick={closeContextMenu}
        nodeTypes={nodeTypes as any}
        edgeTypes={edgeTypes}
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={[15, 15]}
        fitView={false}
        colorMode={rfColorMode}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode={["Backspace", "Delete"]}
        multiSelectionKeyCode={["Control", "Meta"]}
        selectionMode={SelectionMode.Partial}
        panOnScroll
        connectionLineStyle={{
          stroke: "hsl(var(--primary))",
          strokeWidth: 2,
        }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        /* fitView removed — always start at 100% zoom */
        panOnDrag={activeTool === "pan" ? [0, 1, 2] : [1, 2]}
        selectionOnDrag={activeTool === "select"}
        selectNodesOnDrag={activeTool === "select"}

        className={cn(
          "bg-transparent",
          activeTool === "pan" ? "cursor-grab" : "cursor-default",
        )}

        style={{
          fontFamily: "var(--font-main, inherit)",
          background: "transparent",
        }}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: false,
          style: { strokeWidth: 2, stroke: "hsl(var(--muted-foreground) / 0.4)" },
          markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--muted-foreground) / 0.4)" },
        }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={25}
          size={0.5}
          color="currentColor"
          className="text-muted-foreground/10"
          style={{ opacity: 0.1 }}
        />

        {/* Custom SVG Definitions for premium edge effects */}
        <svg style={{ position: "absolute", width: 0, height: 0 }}>
          <defs>
            <marker
              id="studio-arrowhead"
              markerWidth="6"
              markerHeight="6"
              refX="5"
              refY="3"
              orient="auto"
              markerUnits="strokeWidth"
            >
              <path
                d="M0,0 L6,3 L0,6 Z"
                fill="currentColor"
                className="text-foreground/40 group-hover:text-primary transition-colors"
              />
            </marker>

            <linearGradient
              id="edge-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0" />
              <stop offset="50%" stopColor="var(--primary)" stopOpacity="1" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* ZoomStrip + MiniMap are siblings, not nested — nesting breaks
            ReactFlow's pointer-event system and prevents canvas panning.
            They share matching border/width/shadow so they look like one card. */}
        <ZoomStrip />
        <MiniMap
          style={{
            width: 180,
            height: 110,
            margin: 0,
            bottom: 47,   /* sits flush above ZoomStrip (40px strip + 7px margin) */
            right: 12,
            borderRadius: "12px 12px 0 0",
            border: "1px solid var(--studio-border, oklch(0.84 0 0))",
            borderBottom: "1px solid var(--studio-border, oklch(0.84 0 0))",
            background: "var(--background, #fff)",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
          }}
          nodeStrokeColor={(n) =>
            n.type === "eventNode" ? "#10b981" : n.type === "gatewayNode" ? "#f59e0b" : "var(--primary)"
          }
          nodeColor={(n) =>
            n.type === "eventNode" ? "rgba(16,185,129,0.25)" : n.type === "gatewayNode" ? "rgba(245,158,11,0.25)" : "color-mix(in srgb,var(--primary) 20%,transparent)"
          }
          maskColor="rgba(0,0,0,0.04)"
          zoomable
          pannable
        />

        {/* Validation Overlay */}
        <Panel position="top-right" className="m-4">
          <div
            className={cn(
              "px-4 py-2 rounded-sm border backdrop-blur-md shadow-2xl flex items-center gap-3 transition-all",
              validation.isValid
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-rose-500/10 border-rose-500/20",
            )}
          >
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                validation.isValid
                  ? "bg-emerald-500"
                  : "bg-rose-500 animate-pulse",
              )}
            />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">
              {validation.isValid
                ? "Flow Validated"
                : `${validation.errors.filter((e) => e.severity === "error").length} Critical Errors`}
            </span>
            {!validation.isValid && (
              <div className="group relative">
                <AlertCircle size={14} className="text-rose-500 cursor-help" />
                <div className="absolute top-full right-0 mt-2 w-64 bg-card/95 backdrop-blur-xl border border-border/40 shadow-2xl p-3 rounded-lg hidden group-hover:block z-[100]">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2">
                    Validation Summary
                  </div>
                  <div className="space-y-2">
                    {validation.errors.map((err, i) => (
                      <div key={i} className="flex gap-2">
                        <div
                          className={cn(
                            "w-1 h-1 rounded-full mt-1 shrink-0",
                            err.severity === "error"
                              ? "bg-rose-500"
                              : "bg-amber-500",
                          )}
                        />
                        <span className="text-[10px] leading-tight text-foreground/70">
                          {err.message}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Panel>
        {/* ── Toolbar portaled into StudioLayout's sub-header slot ── */}
        {toolbarSlot && createPortal(
          <div className="flex items-center gap-0.5">
            {/* ── Tool selection ── */}
            <button
              onClick={() => setActiveTool("select")}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                activeTool === "select"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title="Select (V)"
            >
              <MousePointer2 size={15} />
            </button>
            <button
              onClick={() => setActiveTool("pan")}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                activeTool === "pan"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              title="Pan (H)"
            >
              <Hand size={15} />
            </button>

            <div className="h-5 w-px mx-1.5" style={{ background: "var(--studio-border)" }} />

            {/* ── Undo / Redo ── */}
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                canUndo
                  ? "text-muted-foreground hover:bg-muted hover:text-foreground"
                  : "text-muted-foreground/25 cursor-not-allowed",
              )}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={15} />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                canRedo ? "text-muted-foreground hover:bg-muted hover:text-foreground" : "text-muted-foreground/25 cursor-not-allowed",
              )}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={15} />
            </button>

            <div className="h-5 w-px mx-1.5" style={{ background: "var(--studio-border)" }} />

            {/* ── Layout + Save ── */}
            <button
              onClick={onAutoLayout}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              title="Auto-arrange"
            >
              <Sparkles size={15} />
            </button>
            {/* Save is in the header — no duplicate here */}

            {/* ── Debug tools ── */}
            <button
              onClick={handleRun}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              title="Debug (F6)"
            >
              <Bug size={15} />
            </button>
            <button
              onClick={handleRun}
              className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
              title="Step (F7)"
            >
              <StepForward size={15} />
            </button>

            <div className="h-5 w-px mx-1.5" style={{ background: "var(--studio-border)" }} />

            {/* ── Run / Stop — semantic accent colour retained ── */}
            {isRunning ? (
              <button
                onClick={handleRun}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: "color-mix(in srgb,var(--destructive) 12%,transparent)",
                  color: "var(--destructive)",
                  border: "1px solid color-mix(in srgb,var(--destructive) 30%,transparent)",
                }}
                title="Stop"
              >
                <Square size={13} fill="currentColor" /> Stop
              </button>
            ) : (
              <button
                onClick={handleRun}
                className="h-8 px-3 flex items-center gap-1.5 rounded-lg text-xs font-medium transition-all"
                style={{
                  background: "color-mix(in srgb,var(--primary) 10%,transparent)",
                  color: "var(--primary)",
                  border: "1px solid color-mix(in srgb,var(--primary) 25%,transparent)",
                }}
                title="Run (F5)"
              >
                <Play size={13} fill="currentColor" className="ml-0.5" /> Run
              </button>
            )}

            <div className="h-5 w-px mx-1.5" style={{ background: "var(--studio-border)" }} />

            {/* ── Risk flag ── */}
            <button
              onClick={handleMarkHighRisk}
              className={cn(
                "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                getNodes().some(n => n.selected && (n.data as UniversalActivity).risk?.level === 'HIGH')
                  ? "bg-destructive text-destructive-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-destructive",
              )}
              title="Flag high-risk"
            >
              <ShieldAlert size={15} />
            </button>
          </div>,
          toolbarSlot
        )}

        {/* --- Execution Log Panel (bottom) --- */}
        {executionStatus !== "idle" && (
          <Panel position="bottom-left" className="m-6 mr-20">
            <div className="bg-card/95 backdrop-blur-2xl border border-border/40 rounded-sm shadow-2xl w-[480px] max-h-[240px] overflow-hidden">
              {/* Log Header */}
              <div className="px-3 py-2 border-b border-border/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {executionStatus === "running" && (
                    <div className="relative">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping absolute" />
                      <div className="w-2 h-2 rounded-full bg-emerald-500 relative" />
                    </div>
                  )}
                  {executionStatus === "completed" && (
                    <CheckCircle size={12} className="text-emerald-500" />
                  )}
                  {executionStatus === "error" && (
                    <XCircle size={12} className="text-destructive" />
                  )}
                  {/* Tabs */}
                  <button
                    onClick={() => setLogTab("log")}
                    className={cn(
                      "text-xs font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded transition-colors",
                      logTab === "log"
                        ? "text-foreground/70 bg-foreground/5"
                        : "text-muted-foreground/30 hover:text-muted-foreground/50",
                    )}
                  >
                    Log ({executionLog.length})
                  </button>
                  <button
                    onClick={() => setLogTab("variables")}
                    className={cn(
                      "text-xs font-bold uppercase tracking-[0.1em] px-2 py-0.5 rounded transition-colors",
                      logTab === "variables"
                        ? "text-foreground/70 bg-foreground/5"
                        : "text-muted-foreground/30 hover:text-muted-foreground/50",
                    )}
                  >
                    Variables ({Object.keys(executionVars).length})
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  {stepCount > 0 && (
                    <span className="text-xs font-mono text-muted-foreground/25">
                      Step {stepCount}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded",
                      executionStatus === "running"
                        ? "text-emerald-400 bg-emerald-500/10"
                        : executionStatus === "completed"
                          ? "text-emerald-400 bg-emerald-500/10"
                          : "text-destructive bg-destructive/10",
                    )}
                  >
                    {executionStatus}
                  </span>
                  <button
                    onClick={() => {
                      setExecutionStatus("idle");
                      setExecutionLog([]);
                      setExecutionVars({});
                    }}
                    className="text-muted-foreground/30 hover:text-foreground transition-colors"
                    title="Close log"
                  >
                    <XCircle size={12} />
                  </button>
                </div>
              </div>
              {/* Tab Content */}
              <div className="max-h-[185px] overflow-y-auto custom-scrollbar">
                {logTab === "log" ? (
                  <div className="p-1.5 space-y-0.5">
                    {executionLog.length === 0 && (
                      <div className="text-xs text-muted-foreground/20 text-center py-4">
                        No steps executed yet
                      </div>
                    )}
                    {executionLog.map((entry, i) => (
                      <div key={`${entry.nodeId}-${i}`} className="group/entry">
                        <div className="flex items-center gap-2 px-2 py-1 rounded-sm hover:bg-foreground/[0.02]">
                          <span className="text-xs font-mono text-muted-foreground/25 shrink-0 w-[52px]">
                            {entry.time}
                          </span>
                          {entry.status === "running" && (
                            <Timer
                              size={10}
                              className="text-amber-500 animate-spin shrink-0"
                            />
                          )}
                          {entry.status === "success" && (
                            <CheckCircle
                              size={10}
                              className="text-emerald-500 shrink-0"
                            />
                          )}
                          {entry.status === "error" && (
                            <XCircle
                              size={10}
                              className="text-destructive shrink-0"
                            />
                          )}
                          <span className="text-xs font-medium text-foreground/60 truncate flex-1">
                            {entry.label}
                          </span>
                          {entry.duration && (
                            <span className="text-xs font-mono text-muted-foreground/20 shrink-0">
                              {entry.duration}ms
                            </span>
                          )}
                          <span
                            className={cn(
                              "text-xs font-bold uppercase tracking-wider px-1 py-0.5 rounded shrink-0",
                              entry.status === "success"
                                ? "text-emerald-400/60"
                                : entry.status === "running"
                                  ? "text-amber-400/60"
                                  : "text-destructive/60",
                            )}
                          >
                            {entry.status}
                          </span>
                        </div>
                        {/* Per-step variables */}
                        {entry.variables && entry.status === "success" && (
                          <div className="ml-[60px] px-2 py-0.5 mb-1">
                            <div className="bg-foreground/[0.02] border border-border/10 rounded px-2 py-1 flex flex-wrap gap-x-3 gap-y-0.5">
                              {entry.variables &&
                                Object.keys(entry.variables).length > 0 && (
                                  <div className="flex-1 p-3 rounded-lg bg-primary/[0.03] border border-primary/10">
                                    <span className="text-xs font-black uppercase text-primary/40 block mb-2 tracking-widest">
                                      Variables Updated
                                    </span>
                                    <div className="space-y-1.5">
                                      {Object.entries(entry.variables).map(
                                        ([k, v]) => (
                                          <div
                                            key={k}
                                            className="flex items-start gap-2"
                                          >
                                            <span className="text-xs font-mono font-bold text-primary/60">
                                              {k}:
                                            </span>
                                            <span className="text-xs font-mono text-foreground/60 break-all">
                                              {typeof v === "object"
                                                ? JSON.stringify(v)
                                                : String(v)}
                                            </span>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  </div>
                                )}
                              {Object.entries(entry.variables).map(([k, v]) => (
                                <span key={k} className="text-xs">
                                  <span className="text-primary/40 font-semibold">
                                    {k}
                                  </span>
                                  <span className="text-muted-foreground/20 mx-0.5">
                                    =
                                  </span>
                                  <span className="text-foreground/40 font-mono">
                                    {typeof v === "object"
                                      ? JSON.stringify(v)
                                      : String(v)}
                                  </span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Variables tab */
                  <div className="p-2">
                    {Object.keys(executionVars).length === 0 ? (
                      <div className="text-xs text-muted-foreground/20 text-center py-4">
                        No variables set yet
                      </div>
                    ) : (
                      <div className="space-y-0.5">
                        {Object.entries(executionVars).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-start gap-2 px-2 py-1 rounded-sm hover:bg-foreground/[0.02]"
                          >
                            <span className="text-xs font-semibold text-primary/50 shrink-0 min-w-[120px] font-mono">
                              {key}
                            </span>
                            <span className="text-xs font-mono text-foreground/50 break-all">
                              {typeof value === "object"
                                ? JSON.stringify(value, null, 1)
                                : String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Panel>
        )}

        {/* --- Message Box Dialog (during execution) --- */}
        {messageDialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-card border border-border/40 rounded-sm shadow-2xl w-[380px] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              {/* Dialog Header */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border/20 bg-primary/5">
                <MessageSquare size={14} className="text-primary" />
                <span className="text-sm font-bold text-foreground/80">
                  {messageDialog.title}
                </span>
              </div>
              {/* Dialog Body */}
              <div className="px-4 py-4">
                <p className="text-xs text-foreground/60 leading-relaxed mb-3 whitespace-pre-wrap">
                  {messageDialog.message}
                </p>
                {/* Input field based on mode */}
                {messageDialog.inputMode !== "Display Only" && (
                  <div className="mt-2">
                    <label className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground/40 mb-1 block">
                      {messageDialog.inputLabel}
                    </label>
                    {messageDialog.inputMode === "Boolean (Yes/No)" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setMessageDialogInput("true")}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-sm border transition-colors",
                            messageDialogInput === "true"
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                              : "border-border/20 text-muted-foreground/40 hover:bg-foreground/[0.03]",
                          )}
                        >
                          Yes / True
                        </button>
                        <button
                          onClick={() => setMessageDialogInput("false")}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-sm border transition-colors",
                            messageDialogInput === "false"
                              ? "bg-destructive/10 border-destructive/30 text-destructive"
                              : "border-border/20 text-muted-foreground/40 hover:bg-foreground/[0.03]",
                          )}
                        >
                          No / False
                        </button>
                      </div>
                    ) : messageDialog.inputMode === "Dropdown" ? (
                      <select
                        value={messageDialogInput}
                        onChange={(e) => setMessageDialogInput(e.target.value)}
                        className="w-full bg-background/50 border border-border/30 rounded-sm px-2 py-1.5 text-xs text-foreground/70 outline-none"
                      >
                        <option value="">Select...</option>
                        {messageDialog.dropdownOptions
                          .split(",")
                          .map((opt, i) => (
                            <option key={i} value={opt.trim()}>
                              {opt.trim()}
                            </option>
                          ))}
                      </select>
                    ) : messageDialog.inputMode === "Multi-line Text" ? (
                      <textarea
                        value={messageDialogInput}
                        onChange={(e) => setMessageDialogInput(e.target.value)}
                        rows={3}
                        className="w-full bg-background/50 border border-border/30 rounded-sm px-2 py-1.5 text-xs text-foreground/70 outline-none resize-none"
                        placeholder="Enter text..."
                        autoFocus
                      />
                    ) : (
                      <input
                        type={
                          messageDialog.inputMode === "Number Input"
                            ? "number"
                            : messageDialog.inputMode === "Password"
                              ? "password"
                              : "text"
                        }
                        value={messageDialogInput}
                        onChange={(e) => setMessageDialogInput(e.target.value)}
                        className="w-full bg-background/50 border border-border/30 rounded-sm px-2 py-1.5 text-xs text-foreground/70 outline-none"
                        placeholder={
                          messageDialog.inputMode === "Number Input"
                            ? "0"
                            : "Enter value..."
                        }
                        autoFocus
                      />
                    )}
                  </div>
                )}
              </div>
              {/* Dialog Buttons */}
              <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border/15 bg-foreground/[0.01]">
                {messageDialog.buttons.split("/").map((btn, i) => {
                  const label = btn.trim();
                  const isPrimary = i === 0;
                  return (
                    <button
                      key={label}
                      onClick={() => handleDialogResponse(label)}
                      className={cn(
                        "px-4 py-1.5 text-xs font-bold rounded-sm transition-colors",
                        isPrimary
                          ? "bg-primary text-primary-foreground hover:bg-primary/90"
                          : "border border-border/30 text-muted-foreground/60 hover:bg-foreground/[0.03]",
                      )}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* --- Group Breadcrumb Navigation --- */}
        {groupBreadcrumb && groupBreadcrumb.length > 0 && (
          <Panel position="top-right" className="m-6">
            <div className="bg-card/90 backdrop-blur-md border border-border/40 rounded-sm px-3 py-2 flex items-center gap-1 shadow-xl">
              <button
                onClick={() => onNavigateBreadcrumb?.(null)}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Main Flow
              </button>
              {groupBreadcrumb.map((crumb) => (
                <React.Fragment key={crumb.id}>
                  <ChevronRightIcon
                    size={10}
                    className="text-muted-foreground/40"
                  />
                  <button
                    onClick={() => onNavigateBreadcrumb?.(crumb.id)}
                    className="text-xs font-bold text-foreground/70 hover:text-primary hover:underline cursor-pointer"
                  >
                    {crumb.label}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </Panel>
        )}



        {/* Controls removed — ZoomControls panel (bottom-right) handles zoom */}

        {/* --- RECORDING OVERLAY --- */}
        {isRecording && (
          <Panel position="bottom-center" className="mb-10">
            <div className="bg-black/60 backdrop-blur-3xl border border-red-500/20 rounded-sm p-4 px-6 flex items-center gap-8 shadow-2xl border-b-red-500/40 translate-y-4">
              <div className="flex items-center gap-4 pr-8 border-r border-white/5">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-red-500 animate-ping absolute" />
                  <div className="w-3 h-3 rounded-full bg-red-500 relative" />
                </div>
                <span className="text-sm font-black uppercase tracking-[0.2em] text-red-500">
                  Live Recording
                </span>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-black text-white/90">
                  {recordedNodes.length > 0
                    ? `Sequence: ${lastThreeSteps}`
                    : "Waiting for first interaction..."}
                </span>
                <div className="flex gap-2">
                  {recordedNodes.map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-1 rounded-full bg-red-500/40"
                    />
                  ))}
                  <div className="w-8 h-1 rounded-full bg-red-500/10 animate-pulse" />
                </div>
              </div>

              <Button
                onClick={() => {
                  if ((window as any).__recorderAgent__sendEvent) {
                    const mockEvents = [
                      {
                        type: "click",
                        elementInfo: {
                          tagName: "ELEMENT",
                          cssPath: `.target-${Math.floor(Math.random() * 1000)}`,
                          innerText: "Interact",
                        },
                      },
                      {
                        type: "type",
                        elementInfo: {
                          tagName: "INPUT",
                          cssPath: `.input-field-${Math.floor(Math.random() * 100)}`,
                          placeholder: "Dynamic Input",
                        },
                        value: "Value Captured",
                      },
                      {
                        type: "navigation",
                        elementInfo: {
                          tagName: "WINDOW",
                          cssPath: "window",
                          innerText: "Navigation",
                        },
                      },
                    ];
                    const randomEvent =
                      mockEvents[Math.floor(Math.random() * mockEvents.length)];
                    (window as any).__recorderAgent__sendEvent(
                      JSON.stringify(randomEvent),
                    );
                  }
                }}
                variant="outline"
                size="sm"
                className="h-9 px-4 border-white/10 text-white/60 hover:text-white text-xs font-black uppercase tracking-widest"
              >
                Simulate Capture
              </Button>

              <Button
                onClick={onStopRecording}
                variant="destructive"
                size="sm"
                className="h-9 px-6 bg-red-600 hover:bg-red-500 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-red-900/20"
              >
                Finish Recording ({recordedNodes.length})
              </Button>
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* Right-click Context Menu */}
      {contextMenu &&
        (() => {
          const ctxNode = getContextNode();
          const isGroup = ctxNode?.data?.type === "group";
          const isDisabled = !!(ctxNode?.data as any)?.disabled;
          const isLoopEnabled = !!(ctxNode?.data as any)?.loopEnabled;
          const loopCondition = (ctxNode?.data as any)?.loopCondition || "";
          const connCount = edges.filter(
            (e) =>
              e.source === contextMenu.nodeId ||
              e.target === contextMenu.nodeId,
          ).length;
          return (
            <div
              className="fixed z-[100] min-w-[200px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-sm shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-150"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-3 py-1.5 border-b border-border/20 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                  {String(ctxNode?.data?.label || "Node")}
                </span>
                <span className="text-xs text-muted-foreground/25">
                  {connCount} conn.
                </span>
              </div>

              {/* Edit Section */}
              <button
                onClick={handleRenameFromMenu}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <Pencil size={13} />
                <span className="text-xs font-semibold">Rename</span>
                <span className="text-xs text-muted-foreground/30 ml-auto">
                  F2
                </span>
              </button>

              {/* Drill Into — only for groups */}
              {isGroup && (
                <button
                  onClick={() => {
                    onDrillIntoGroup?.(contextMenu.nodeId);
                    setContextMenu(null);
                  }}
                  className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-primary/80 hover:text-primary transition-colors"
                >
                  <FolderOpen size={13} />
                  <span className="text-xs font-semibold">
                    Drill Into Group
                  </span>
                  <span className="text-xs text-muted-foreground/30 ml-auto">
                    ↵
                  </span>
                </button>
              )}

              <div className="h-px bg-border/20 mx-2 my-0.5" />

              {/* Connection & Selection */}
              <button
                onClick={handleSelectConnected}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <Network size={13} />
                <span className="text-xs font-semibold">Select Connected</span>
              </button>

              <div className="h-px bg-border/20 mx-2 my-0.5" />

              {/* Edit Operations */}
              <button
                onClick={handleDuplicateFromMenu}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <Copy size={13} />
                <span className="text-xs font-semibold">Duplicate</span>
                <span className="text-xs text-muted-foreground/30 ml-auto">
                  ⌘D
                </span>
              </button>
              <button
                onClick={handleCutFromMenu}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <Scissors size={13} />
                <span className="text-xs font-semibold">Cut</span>
                <span className="text-xs text-muted-foreground/30 ml-auto">
                  ⌘X
                </span>
              </button>
              <button
                onClick={() => {
                  if (contextMenu)
                    navigator.clipboard.writeText(contextMenu.nodeId);
                  setContextMenu(null);
                }}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <Layers size={13} />
                <span className="text-xs font-semibold">Copy Node ID</span>
              </button>

              <div className="h-px bg-border/20 mx-2 my-0.5" />

              {/* Visual Controls */}
              <button
                onClick={handleToggleDisable}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                {isDisabled ? <Eye size={13} /> : <EyeOff size={13} />}
                <span className="text-xs font-semibold">
                  {isDisabled ? "Enable Node" : "Disable Node"}
                </span>
              </button>
              <button
                onClick={handleToggleLoop}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <RefreshCw
                  size={13}
                  className={isLoopEnabled ? "text-primary" : ""}
                />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold">
                    {isLoopEnabled ? "Remove Loop" : "Set Loop"}
                  </span>
                  {isLoopEnabled && (
                    <span className="text-xs text-primary/50 truncate max-w-[120px]">
                      {loopCondition}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={handleBringToFront}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <ArrowUpToLine size={13} />
                <span className="text-xs font-semibold">Bring to Front</span>
              </button>
              <button
                onClick={handleSendToBack}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <ArrowDownToLine size={13} />
                <span className="text-xs font-semibold">Send to Back</span>
              </button>

              <div className="h-px bg-border/20 mx-2 my-0.5" />

              {/* Destructive */}
              <button
                onClick={handleDeleteFromMenu}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-destructive/10 text-foreground/70 hover:text-destructive transition-colors"
              >
                <Trash2 size={13} />
                <span className="text-xs font-semibold">Delete</span>
                <span className="text-xs text-muted-foreground/30 ml-auto">
                  Del
                </span>
              </button>
            </div>
          )
        })()}

      {/* --- Edge Right-Click Context Menu --- */}
      {edgeContextMenu &&
        (() => {
          const ctxEdge = edges.find((e) => e.id === edgeContextMenu.edgeId);
          const sourceLabel =
            nodes.find((n) => n.id === ctxEdge?.source)?.data?.label ||
            ctxEdge?.source ||
            "?";
          const targetLabel =
            nodes.find((n) => n.id === ctxEdge?.target)?.data?.label ||
            ctxEdge?.target ||
            "?";
          return (
            <div
              className="fixed z-[100] min-w-[180px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-sm shadow-2xl py-1 animate-in fade-in zoom-in-95 duration-150"
              style={{ left: edgeContextMenu.x, top: edgeContextMenu.y }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-3 py-1.5 border-b border-border/20">
                <span className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
                  Connector
                </span>
                <div className="text-xs text-foreground/50 mt-0.5 truncate max-w-[160px]">
                  {String(sourceLabel)} → {String(targetLabel)}
                </div>
              </div>

              <button
                onClick={() => {
                  if (ctxEdge?.source)
                    onSelectionChange?.({
                      nodes: nodes.filter((n) => n.id === ctxEdge.source),
                      edges: [],
                    });
                  setEdgeContextMenu(null);
                }}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <ArrowUpToLine size={13} />
                <span className="text-xs font-semibold">Select Source</span>
              </button>
              <button
                onClick={() => {
                  if (ctxEdge?.target)
                    onSelectionChange?.({
                      nodes: nodes.filter((n) => n.id === ctxEdge.target),
                      edges: [],
                    });
                  setEdgeContextMenu(null);
                }}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-primary/5 text-foreground/70 hover:text-foreground transition-colors"
              >
                <ArrowDownToLine size={13} />
                <span className="text-xs font-semibold">Select Target</span>
              </button>

              <div className="h-px bg-border/20 mx-2 my-0.5" />

              <button
                onClick={handleDeleteEdge}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-left hover:bg-destructive/10 text-foreground/70 hover:text-destructive transition-colors"
              >
                <Trash2 size={13} />
                <span className="text-xs font-semibold">Delete Connector</span>
                <span className="text-xs text-muted-foreground/30 ml-auto">
                  Del
                </span>
              </button>
            </div>
          )
        })()}
    </div>
  );
}
