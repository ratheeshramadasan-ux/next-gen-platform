"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Globe, X, Monitor, Search, RefreshCcw, Camera, Undo2, Redo2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import { StudioLayout } from "@/components/studio/StudioLayout";
import {
  StudioToolbox,
  StudioInspector,
  StudioDock,
} from "@/components/studio/StudioPanels";
import { StudioCanvas } from "@/components/studio/StudioCanvas";
import {
  saveStudioWorkflow,
  getStudioWorkflow,
  deleteStudioProject,
  getStudioFolders,
  createStudioProject,
} from "@/app/actions/tenantActions";
import {
  getProjectWorkflows,
  saveWorkflow,
  logStudioExecution,
} from "@/app/actions/studioActions";
import { useAppContext } from "@/lib/context";
import {
  UniversalActivity,
  ActivityType,
  ActivitySubType,
  DEFAULT_STUDIO_THEME,
} from "@/types/studio";
import { validateStudioFlow } from "@/lib/studio/validation";
import { ExecutionEngine } from "@/lib/studio/engine/ExecutionEngine";
import { FlowParser } from "@/lib/studio/engine/FlowParser";

// ── Per-tab state snapshot ───────────────────────────────────────────
interface DesignerTab {
  id: string;
  workflowId: string | null;
  label: string;
  nodes: Node[];
  edges: Edge[];
  variables: any[];
  arguments: any[];
  workflowName: string;
  isDirty: boolean;
  lastSaved: Date | null;
  past: { nodes: Node[]; edges: Edge[] }[];
  future: { nodes: Node[]; edges: Edge[] }[];
}

export default function DesignerPageWrapper() {
  return (
    <ReactFlowProvider>
      <DesignerPage />
    </ReactFlowProvider>
  );
}

function DesignerPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { activeCustomer, tenantId } = useAppContext();

  const projectId = searchParams.get("projectId");
  const workflowIdParam = searchParams.get("workflowId");
  const workspaceId = searchParams.get("workspaceId");
  const folderId = searchParams.get("folderId");

  const [workflowId, setWorkflowId] = useState<string | null>(workflowIdParam);

  // Sync workflowId state with URL param (handles sidebar navigation)
  useEffect(() => {
    if (workflowIdParam !== workflowId) {
      setWorkflowId(workflowIdParam);
      // Clear current state to avoid flickering previous content
      setNodes([]);
      setEdges([]);
    }
  }, [workflowIdParam]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showBpmTools, setShowBpmTools] = useState(true);
  const [showFlowFormatting, setShowFlowFormatting] = useState(true);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [folderInfo, setFolderInfo] = useState<any>(null);

  // Variables & Arguments State (Lifted from Dock)
  const [variables, setVariables] = useState<any[]>([]);
  const [arguments_, setArguments] = useState<any[]>([]);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);
  const [snapshots, setSnapshots] = useState<any[]>([]);

  // Capture Mode State
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedProp, setCapturedProp] = useState<string | null>(null);

  // Undo/Redo History Stack Management
  const [past, setPast] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);
  const [future, setFuture] = useState<{ nodes: Node[]; edges: Edge[] }[]>([]);

  // ── Multi-tab state — declared early so callbacks below can reference it ──
  const initialTabId = useRef(uuidv4());
  const [designerTabs, setDesignerTabs] = useState<DesignerTab[]>([]);
  const [activeDesignerTabId, setActiveDesignerTabId] = useState<string>(initialTabId.current);
  const tabsRef = useRef<DesignerTab[]>([]);
  tabsRef.current = designerTabs;
  // Stable ref so callbacks don't close over a stale value and avoid TDZ
  const activeTabIdRef = useRef<string>(initialTabId.current);
  activeTabIdRef.current = activeDesignerTabId;

  const takeSnapshot = useCallback(() => {
    // Functional update to ensure we use the most recent state
    // Note: We capture current nodes/edges before they are changed
    setPast(prev => {
      // Don't take redundant snapshots if state hasn't changed (optional optimization)
      return [...prev.slice(-49), { nodes, edges }];
    });
    setFuture([]);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (past.length === 0) return;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    
    // Save current state to future for redo
    setFuture(prev => [...prev, { nodes, edges }]);
    setPast(newPast);
    
    // Restore state
    setNodes(previous.nodes);
    setEdges(previous.edges);
    
    toast.info("Undo successful");
  }, [past, nodes, edges, setNodes, setEdges]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    
    const next = future[future.length - 1];
    const newFuture = future.slice(0, -1);

    // Save current state to past for undo
    setPast(prev => [...prev, { nodes, edges }]);
    setFuture(newFuture);
    
    // Restore state
    setNodes(next.nodes);
    setEdges(next.edges);
    
    toast.info("Redo successful");
  }, [future, nodes, edges, setNodes, setEdges]);

  // Wrapped change handlers that detect interaction end
  const onNodesChangeWithHistory = useCallback((changes: any) => {
    const isInteractionEnd = changes.some((c: any) => (c.type === 'position' && !c.dragging) || c.type === 'remove' || c.type === 'add');
    if (isInteractionEnd) {
      takeSnapshot();
      // Use ref so this callback is never stale and never hits TDZ
      setDesignerTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, isDirty: true } : t));
    }
    onNodesChange(changes);
  }, [onNodesChange, takeSnapshot]);   // ref is stable — no dep needed

  const onEdgesChangeWithHistory = useCallback((changes: any) => {
    const isInteractionEnd = changes.some((c: any) => c.type === 'remove' || c.type === 'add');
    if (isInteractionEnd) {
      takeSnapshot();
      setDesignerTabs(prev => prev.map(t => t.id === activeTabIdRef.current ? { ...t, isDirty: true } : t));
    }
    onEdgesChange(changes);
  }, [onEdgesChange, takeSnapshot]);   // ref is stable — no dep needed


  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newWorkflowName, setNewWorkflowName] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const varDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const [activeEngine, setActiveEngine] = useState("react-flow");
  const [activeEdgeType, setActiveEdgeType] = useState("smoothstep");
  const [workflowName, setWorkflowName] = useState("");
  const [runTrigger, setRunTrigger] = useState(0);

  // Snapshot current canvas state into the active tab record
  const snapshotActiveTab = useCallback(() => {
    setDesignerTabs(prev => prev.map(t =>
      t.id === activeDesignerTabId
        ? { ...t, nodes, edges, variables, arguments: arguments_, workflowName, workflowId, past, future, isDirty: true }
        : t
    ));
  }, [activeDesignerTabId, nodes, edges, variables, arguments_, workflowName, workflowId, past, future]);

  // Restore canvas from a tab's snapshot
  const restoreTab = useCallback((tab: DesignerTab) => {
    setWorkflowId(tab.workflowId);
    setNodes(tab.nodes);
    setEdges(tab.edges);
    setVariables(tab.variables);
    setArguments(tab.arguments);
    setWorkflowName(tab.workflowName);
    setPast(tab.past);
    setFuture(tab.future);
  }, [setNodes, setEdges]);

  // Switch to an existing tab
  const handleDesignerTabChange = useCallback((tabId: string) => {
    if (tabId === activeDesignerTabId) return;
    snapshotActiveTab();
    const target = tabsRef.current.find(t => t.id === tabId);
    if (target) {
      setActiveDesignerTabId(tabId);
      restoreTab(target);
    }
  }, [activeDesignerTabId, snapshotActiveTab, restoreTab]);

  // Close a tab; switch to the nearest remaining tab
  const handleDesignerTabClose = useCallback((tabId: string) => {
    const tabs = tabsRef.current;
    if (tabs.length <= 1) return; // keep at least one tab
    const idx = tabs.findIndex(t => t.id === tabId);
    const remaining = tabs.filter(t => t.id !== tabId);
    setDesignerTabs(remaining);
    if (tabId === activeDesignerTabId) {
      const next = remaining[Math.max(0, idx - 1)];
      setActiveDesignerTabId(next.id);
      restoreTab(next);
    }
  }, [activeDesignerTabId, restoreTab]);

  // Open a workflow in a new tab (or focus existing)
  const openWorkflowInTab = useCallback(async (wfId: string, wfName: string) => {
    // Already open? Just switch
    const existing = tabsRef.current.find(t => t.workflowId === wfId);
    if (existing) { handleDesignerTabChange(existing.id); return; }
    // Snapshot current tab first
    snapshotActiveTab();
    // Load the workflow
    let wfNodes: Node[] = [], wfEdges: Edge[] = [], wfVars: any[] = [], wfArgs: any[] = [], wfEdgeType = "smoothstep";
    try {
      const data = (await getStudioWorkflow(wfId)) as any;
      if (data) {
        wfNodes = data.nodes || [];
        wfEdges = data.edges || [];
        wfVars = data.variables || [];
        wfArgs = data.arguments || [];
        wfEdgeType = data.activeEdgeType || "smoothstep";
        wfName = data.name || wfName;
      }
    } catch (_) {}
    const newTab: DesignerTab = {
      id: uuidv4(), workflowId: wfId, label: wfName,
      nodes: wfNodes, edges: wfEdges, variables: wfVars, arguments: wfArgs,
      workflowName: wfName, isDirty: false, lastSaved: null, past: [], future: [],
    };
    setDesignerTabs(prev => [...prev, newTab]);
    setActiveDesignerTabId(newTab.id);
    setWorkflowId(wfId);
    setNodes(wfNodes);
    setEdges(wfEdges);
    setVariables(wfVars);
    setArguments(wfArgs);
    setWorkflowName(wfName);
    setActiveEdgeType(wfEdgeType);
    setPast([]);
    setFuture([]);
  }, [snapshotActiveTab, handleDesignerTabChange]);

  // Add a blank new tab
  const handleDesignerTabNew = useCallback(() => {
    snapshotActiveTab();
    const newTab: DesignerTab = {
      id: uuidv4(), workflowId: null, label: "New Flow",
      nodes: [], edges: [], variables: [], arguments: [],
      workflowName: "", isDirty: false, lastSaved: null, past: [], future: [],
    };
    setDesignerTabs(prev => [...prev, newTab]);
    setActiveDesignerTabId(newTab.id);
    setWorkflowId(null);
    setNodes([]);
    setEdges([]);
    setVariables([]);
    setArguments([]);
    setWorkflowName("");
    setPast([]);
    setFuture([]);
  }, [snapshotActiveTab]);


  const { setNodes: rfSetNodes, getNodes, getEdges, fitView } = useReactFlow();

  const handleAlign = useCallback(
    (direction: string) => {
      const currentNodes = getNodes();
      const selectedNodes = currentNodes.filter((node) => node.selected);
      if (selectedNodes.length < 2) {
        toast.info("Select at least 2 nodes to align");
        return;
      }

      const positions = selectedNodes.map((n) => n.position);
      let targetX = positions[0].x;
      let targetY = positions[0].y;

      if (direction === "left") targetX = Math.min(...positions.map((p) => p.x));
      if (direction === "right") targetX = Math.max(...positions.map((p) => p.x));
      if (direction === "top") targetY = Math.min(...positions.map((p) => p.y));
      if (direction === "bottom") targetY = Math.max(...positions.map((p) => p.y));
      if (direction === "center-x") {
        const sumX = positions.reduce((acc, p) => acc + p.x, 0);
        targetX = sumX / selectedNodes.length;
      }
      if (direction === "center-y") {
        const sumY = positions.reduce((acc, p) => acc + p.y, 0);
        targetY = sumY / selectedNodes.length;
      }

      rfSetNodes((nds) =>
        nds.map((node) => {
          if (node.selected) {
            return {
              ...node,
              position: {
                x:
                  direction.includes("-x") ||
                  direction === "left" ||
                  direction === "right"
                    ? targetX
                    : node.position.x,
                y:
                  direction.includes("-y") ||
                  direction === "top" ||
                  direction === "bottom"
                    ? targetY
                    : node.position.y,
              },
            };
          }
          return node;
        }),
      );
      toast.success(`Nodes aligned ${direction}`);
    },
    [getNodes, rfSetNodes],
  );

  const handleAutoLayout = useCallback(() => {
    const nds = getNodes();
    const eds = getEdges();
    if (nds.length === 0) return;

    // 1. Build adjacency graph and calculate in-degrees
    const adj = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    nds.forEach(n => { adj.set(n.id, []); inDegree.set(n.id, 0); });
    eds.forEach(e => {
      if (adj.has(e.source) && adj.has(e.target)) {
        adj.get(e.source)!.push(e.target);
        inDegree.set(e.target, (inDegree.get(e.target) || 0) + 1);
      }
    });

    // 2. Assign ranks using a topological sort approach
    const startNode = nds.find(n => {
      const type = String(n.data?.type || n.data?.subType || n.type || "").toLowerCase();
      const label = String(n.data?.label || "").toLowerCase();
      return type === "start" || type === "startnode" || type === "trigger" || label.includes("start");
    });

    const ranks = new Map<string, number>();
    const queue: string[] = [];
    if (startNode) { ranks.set(startNode.id, 0); queue.push(startNode.id); } 
    nds.forEach(n => {
      if ((inDegree.get(n.id) || 0) === 0 && !ranks.has(n.id)) {
        ranks.set(n.id, 0);
        queue.push(n.id);
      }
    });

    let head = 0;
    while(head < queue.length) {
      const u = queue[head++];
      const currentRank = ranks.get(u) || 0;
      adj.get(u)?.forEach(v => {
        const nextRank = Math.max(ranks.get(v) || 0, currentRank + 1);
        ranks.set(v, nextRank);
        if (!queue.includes(v)) queue.push(v);
      });
    }
    nds.forEach(n => { if (!ranks.has(n.id)) ranks.set(n.id, 0); });

    // 3. Group nodes by rank
    const rankGroups: Record<number, string[]> = {};
    ranks.forEach((rank, id) => {
      if (!rankGroups[rank]) rankGroups[rank] = [];
      rankGroups[rank].push(id);
    });

    const VERTICAL_SPACING = 150;
    const HORIZONTAL_SPACING = 240;
    const canvasCenterX = 1000; 
    const startY = 150;

    // 4. Calculate positions with parent-alignment logic
    const sortedRanks = Object.keys(rankGroups).map(Number).sort((a, b) => a - b);
    const nodePositions = new Map<string, { x: number; y: number }>();

    sortedRanks.forEach(rank => {
      const group = rankGroups[rank];
      group.forEach((id, idx) => {
        // Find parents that already have positions
        const parents = eds.filter(e => e.target === id).map(e => e.source);
        const parentPositions = parents.map(pid => nodePositions.get(pid)).filter(Boolean);

        let targetX = canvasCenterX;
        if (parentPositions.length > 0) {
          // Align to average X of parents
          targetX = parentPositions.reduce((acc, p) => acc + p!.x, 0) / parentPositions.length;
        }

        // Spread siblings around the targetX
        const offset = (idx - (group.length - 1) / 2) * HORIZONTAL_SPACING;
        nodePositions.set(id, {
          x: targetX + offset,
          y: startY + (rank * VERTICAL_SPACING)
        });
      });
    });

    // 5. Apply positions
    const newNodes = nds.map(node => ({
      ...node,
      position: nodePositions.get(node.id) || node.position
    }));

    rfSetNodes(newNodes);
    toast.success("Workflow optimized for straight alignment");
    setTimeout(() => { fitView({ duration: 800, padding: 0.15 }); }, 100);
  }, [getNodes, getEdges, rfSetNodes, fitView]);

  const handleDistribute = useCallback(
    (direction: string) => {
      const currentNodes = getNodes();
      const selectedNodes = [...currentNodes.filter((node) => node.selected)];
      if (selectedNodes.length < 3) {
        toast.info("Select at least 3 nodes to distribute");
        return;
      }

      if (direction === "horizontal") {
        selectedNodes.sort((a, b) => a.position.x - b.position.x);
        const minX = selectedNodes[0].position.x;
        const maxX = selectedNodes[selectedNodes.length - 1].position.x;
        const spacing = (maxX - minX) / (selectedNodes.length - 1);

        rfSetNodes((nds) =>
          nds.map((node) => {
            const index = selectedNodes.findIndex((sn) => sn.id === node.id);
            if (index !== -1) {
              return { ...node, position: { ...node.position, x: minX + index * spacing } };
            }
            return node;
          }),
        );
      } else {
        selectedNodes.sort((a, b) => a.position.y - b.position.y);
        const minY = selectedNodes[0].position.y;
        const maxY = selectedNodes[selectedNodes.length - 1].position.y;
        const spacing = (maxY - minY) / (selectedNodes.length - 1);

        rfSetNodes((nds) =>
          nds.map((node) => {
            const index = selectedNodes.findIndex((sn) => sn.id === node.id);
            if (index !== -1) {
              return { ...node, position: { ...node.position, y: minY + index * spacing } };
            }
            return node;
          }),
        );
      }
      toast.success(`Nodes distributed ${direction}`);
    },
    [getNodes, rfSetNodes],
  );

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { 
            ...params, 
            animated: false, 
            type: "studioEdge",

            data: { 
              ...(params as any).data, 
              edgeType: activeEdgeType || "smoothstep" 
            } 
          },
          eds,
        ),
      ),

    [setEdges],
  );

  const onEdgeUpdate = useCallback(
    (id: string, updates: any) => {
      setEdges((eds) =>
        eds.map((e) =>
          e.id === id ? { ...e, data: { ...e.data, ...updates } } : e,
        ),
      );
    },
    [setEdges],
  );

  const onSelectionChange = useCallback(({ nodes }: { nodes: Node[] }) => {
    setSelectedNodeId(nodes[0]?.id || null);
  }, []);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleUpdateNodeData = useCallback(
    (id: string, newData: any) => {
      const typePrefixes: Record<string, string> = {
        String: "str",
        Int32: "int",
        Int64: "int",
        Double: "dbl",
        Boolean: "bool",
        DateTime: "date",
        DataTable: "dt",
        Object: "obj",
        Array: "list",
        Dictionary: "dict",
        JObject: "json",
        SecureString: "sec",
      };

      const renameInAllNodes = (oldName: string, newName: string) => {
        setNodes((nds) =>
          nds.map((node) => {
            const d = { ...node.data };
            let changed = false;
            Object.keys(d).forEach((k) => {
              const val = d[k];
              if (typeof val === "string") {
                if (
                  val === oldName &&
                  (k === "to" ||
                    k === "outputVar" ||
                    k === "variableName" ||
                    k === "iterator")
                ) {
                  d[k] = newName;
                  changed = true;
                } else if (val.includes(`{${oldName}}`)) {
                  d[k] = val.replace(
                    new RegExp(`\\{${oldName}\\}`, "g"),
                    `{${newName}}`,
                  );
                  changed = true;
                }
              }
            });
            return changed ? { ...node, data: d } : node;
          }),
        );
      };

      // 1. Bidirectional sync for Variable Type
      const node = nodes.find((n) => n.id === id);
      const varName =
        newData.to ||
        node?.data?.to ||
        newData.outputVar ||
        node?.data?.outputVar ||
        newData.variableName ||
        node?.data?.variableName;

      if (newData.to || newData.outputVar || newData.variableName) {
        const existingVar = variables.find(
          (v) =>
            v.name ===
            (newData.to || newData.outputVar || newData.variableName),
        );
        if (existingVar) newData.varType = existingVar.type;
      } else if (newData.varType && varName) {
        // Type changed: Update Resource Dock AND apply naming convention
        setVariables((prev) => {
          const oldVar = prev.find((v) => v.name === varName);
          if (!oldVar) return prev;

          const prefix =
            Object.entries(typePrefixes).find(([k]) =>
              newData.varType.includes(k),
            )?.[1] || "str";
          let baseName = oldVar.name;
          Object.values(typePrefixes).forEach((p) => {
            if (
              baseName.startsWith(p) &&
              baseName.length > p.length &&
              /^[A-Z]/.test(baseName.charAt(p.length))
            ) {
              baseName = baseName.substring(p.length);
            }
          });
          const newName =
            prefix + baseName.charAt(0).toUpperCase() + baseName.slice(1);

          if (newName !== varName) {
            renameInAllNodes(varName, newName);
          }
          return prev.map((v) =>
            v.name === varName
              ? { ...v, type: newData.varType, name: newName }
              : v,
          );
        });
      }

      // 2. Update nodes immediately
      setNodes((nds) =>
        nds.map((node) =>
          node.id === id
            ? { ...node, data: { ...node.data, ...newData } }
            : node,
        ),
      );

      // 3. Debounce auto-declare variables
      if (varDebounceRef.current) clearTimeout(varDebounceRef.current);
      varDebounceRef.current = setTimeout(() => {
        const possibleVar =
          newData.to ||
          newData.outputVar ||
          newData.variableName ||
          newData.iterator;
        if (
          possibleVar &&
          typeof possibleVar === "string" &&
          possibleVar.length >= 2
        ) {
          if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(possibleVar)) {
            const node = nodes.find((n) => n.id === id);
            const varType = newData.varType || node?.data?.varType || "String";
            const prefix =
              Object.entries(typePrefixes).find(([k]) =>
                varType.includes(k),
              )?.[1] || "str";

            let finalName = possibleVar;
            const alreadyHasPrefix = Object.values(typePrefixes).some(
              (p) =>
                finalName.startsWith(p) &&
                finalName.length > p.length &&
                /^[A-Z]/.test(finalName.charAt(p.length)),
            );

            if (!alreadyHasPrefix && !finalName.startsWith(prefix)) {
              finalName =
                prefix +
                possibleVar.charAt(0).toUpperCase() +
                possibleVar.slice(1);
              setNodes((nds) =>
                nds.map((n) => {
                  if (n.id === id) {
                    const fieldKey = newData.to
                      ? "to"
                      : newData.outputVar
                        ? "outputVar"
                        : newData.variableName
                          ? "variableName"
                          : "iterator";
                    return { ...n, data: { ...n.data, [fieldKey]: finalName } };
                  }
                  return n;
                }),
              );
            }

            setVariables((prev) => {
              if (!prev.some((v) => v.name === finalName)) {
                return [
                  ...prev,
                  {
                    name: finalName,
                    type: varType,
                    scope: "GLOBAL",
                    value: "",
                  },
                ];
              }
              return prev;
            });
          }
        }
      }, 800);
    },
    [nodes, setNodes, variables, setVariables],
  );

  const handleDeleteNode = useCallback(
    (id: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== id));
      setEdges((eds) =>
        eds.filter((edge) => edge.source !== id && edge.target !== id),
      );
      setSelectedNodeId(null);
    },
    [setNodes, setEdges],
  );

  const handleEdgeTypeChange = useCallback(
    (type: string) => {
      setActiveEdgeType(type);
      setEdges((eds) => 
        eds.map((edge) => ({ 
          ...edge, 
          type: "studioEdge", 
          data: { ...edge.data, edgeType: type } 
        }))
      );
      toast.success(`Connector style changed to ${type}`);
    },
    [setEdges],
  );


  // --- Capture Logic ---
  const handleStartCapture = (propName: string) => {
    setCapturedProp(propName);
    setIsCapturing(true);
  };

  const handleFinishCapture = (selector: string) => {
    if (selectedNodeId && capturedProp) {
      handleUpdateNodeData(selectedNodeId, { [capturedProp]: selector });
      toast.success(`Captured: ${selector}`);
    }
    setIsCapturing(false);
    setCapturedProp(null);
  };

  const { screenToFlowPosition } = useReactFlow();

  // --- Drag & Drop ---
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const dragData = event.dataTransfer.getData("application/reactflow");
      if (!dragData) return;

      let dropType: any;
      try {
        dropType = JSON.parse(dragData);
      } catch {
        dropType = { type: "task", subType: "serviceTask", label: dragData };
      }

      const {
        type,
        subType,
        label,
        icon,
        category,
        inputs,
        outputs,
        properties,
        execution,
        description,
        dragType,
      } = dropType;

      // Calculate accurate position using React Flow helper
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Check if dropped ON an existing node for auto-connection
      const targetNode = nodes.find((node) => {
        const nodeElement = document.querySelector(`[data-id="${node.id}"]`);
        if (nodeElement) {
          const rect = nodeElement.getBoundingClientRect();
          return (
            event.clientX >= rect.left &&
            event.clientX <= rect.right &&
            event.clientY >= rect.top &&
            event.clientY <= rect.bottom
          );
        }
        return false;
      });

      const newNodeId = uuidv4();
      const activityData: UniversalActivity = {
        id: newNodeId,
        activityId: uuidv4(),
        dragType: dragType || label,
        type: type as ActivityType,
        subType: subType as ActivitySubType,
        category: category || "Other",
        label: label || subType.charAt(0).toUpperCase() + subType.slice(1),
        description: description || "",
        icon: icon || "Zap",
        theme: {
          bgColor: `hsl(var(--primary) / 0.1)`,
          borderColor: `hsl(var(--primary) / 0.4)`,
          iconColor: `hsl(var(--primary))`,
        },
        position,
        inputs: inputs || {},
        outputs: outputs || {},
        properties: properties || {
          timeout: 30000,
          retryCount: 3,
          retryInterval: 2000,
          continueOnError: false,
          delayBefore: 0,
          delayAfter: 0,
          logLevel: "Info",
          takeScreenshotOnError: true,
        },
        execution: execution || {},
        risk: (() => {
          const labelLow = (label || "").toLowerCase();
          const dragLow = (dragType || "").toLowerCase();
          const catLow = (category || "").toLowerCase();

          const highRiskKws = ['payment', 'sap', 'delete', 'update', 'cred', 'vault', 'security', 'approval', 'post', 'financial'];
          const medRiskKws = ['retry', 'loop', 'db', 'sql', 'query', 'file', 'script', 'python'];

          if (highRiskKws.some(kw => labelLow.includes(kw) || dragLow.includes(kw)) || catLow === 'security' || catLow === 'sap') {
            return {
              level: 'HIGH',
              category: catLow === 'security' ? 'Security' : catLow === 'sap' ? 'Financial' : 'Operational',
              why: `AI detected high-impact keywords in activity definition`,
              impact: 5,
              rpn: 15
            };
          }

          if (medRiskKws.some(kw => labelLow.includes(kw) || dragLow.includes(kw)) || catLow === 'data' || catLow === 'logic') {
            return {
              level: 'MEDIUM',
              category: catLow === 'data' ? 'Data' : 'Operational',
              why: `Complexity detected in activity flow pattern`,
              impact: 3,
              rpn: 6
            };
          }

          return { level: 'LOW' };
        })(),
        audit: {
          createdBy: "System",
          createdOn: new Date().toISOString(),
          version: 1,
        },
      };

      const newNode: Node = {
        id: newNodeId,
        type:
          type === "gateway"
            ? "gatewayNode"
            : type === "event"
              ? "eventNode"
              : "taskNode",
        position: targetNode
          ? { x: targetNode.position.x, y: targetNode.position.y + 150 }
          : position,
        data: activityData as any,
      };

      setNodes((nds) => nds.concat(newNode));

      if (targetNode) {
        const newEdge: Edge = {
          id: uuidv4(),
          source: targetNode.id,
          target: newNodeId,
          type: "studioEdge",
          animated: true,
          data: {
            type: "sequence",
            style: { stroke: DEFAULT_STUDIO_THEME.primary, strokeWidth: 2 },
          },
        };
        setEdges((eds) => eds.concat(newEdge));
        toast.success(`Auto-connected to ${targetNode.data.label}`);
      }
    },
    [nodes, setNodes, setEdges, screenToFlowPosition],
  );

  // --- Hydration ---
  useEffect(() => {
    async function load() {
      // Validate projectId first
      if (projectId === "undefined") {
        router.push("/next-gen/studio");
        return;
      }

      setLoading(true);
      try {
        if (workflowId) {
          const data = (await getStudioWorkflow(workflowId)) as any;
          if (data) {
            const loadedName = data.name || "";
            setNodes(data.nodes || []);
            setEdges(data.edges || []);
            setVariables(data.variables || []);
            setArguments(data.arguments || []);
            setWorkflowName(loadedName);
            setActiveEdgeType(data.activeEdgeType || "smoothstep");
            setProject({
              id: projectId || data.projectId,
              name: data.projectName || data.project?.name || data.name,
              projectType: data.projectType
            });
            // Bootstrap the initial tab on first load
            setDesignerTabs(prev => {
              if (prev.length > 0) return prev; // already initialised
              return [{
                id: initialTabId.current,
                workflowId,
                label: loadedName || "Main Process",
                nodes: data.nodes || [],
                edges: data.edges || [],
                variables: data.variables || [],
                arguments: data.arguments || [],
                workflowName: loadedName,
                isDirty: false,
                lastSaved: null,
                past: [],
                future: [],
              }];
            });



            // Re-sync folder info if found in project but missing from URL
            if (data.folderId && !folderId) {
              getStudioFolders(
                activeCustomer?.id || "",
                tenantId || activeCustomer?.id,
              ).then((folders) => {
                const findFolder = (list: any[]): any => {
                  for (const f of list) {
                    if (f.id === data.folderId) return f;
                    if (f.subfolders) {
                      const sub = findFolder(f.subfolders);
                      if (sub) return sub;
                    }
                  }
                  return null;
                };
                const folder = findFolder(folders);
                if (folder) setFolderInfo(folder);
              });
            }
          }
        } else if (projectId && projectId !== "sandbox") {
          // Auto-load first workflow (Main Process) if no workflowId provided
          const res = await getProjectWorkflows(projectId);
          if (res.success && res.workflows && res.workflows.length > 0) {
            const first = res.workflows[0];
            setWorkflowId(first.id);
            // Redirect to include workflowId in URL for consistency
            router.replace(
              `/next-gen/studio/designer?projectId=${projectId}&workflowId=${first.id}${workspaceId ? `&workspaceId=${workspaceId}` : ""}${folderId ? `&folderId=${folderId}` : ""}`,
            );
          } else {
            // No workflow found - Initialize with a default Main Process
            setProject({
              id: projectId,
              name: "Main Process",
              workspaceId: workspaceId,
            });

            const startNodeId = uuidv4();
            const startNode: Node = {
              id: startNodeId,
              type: "eventNode",
              position: { x: 400, y: 200 },
              data: {
                id: startNodeId,
                activityId: uuidv4(),
                type: "event",
                subType: "start",
                label: "Start",
                icon: "CirclePlay",
                theme: {
                  bgColor: DEFAULT_STUDIO_THEME.node.event + "20",
                  borderColor: DEFAULT_STUDIO_THEME.node.event,
                  iconColor: DEFAULT_STUDIO_THEME.primary,
                },
                properties: {
                  logLevel: "Info",
                },
              } as any,
            };
            setNodes([startNode]);
            setEdges([]);
          }
        } else {
          setProject({ id: "sandbox", name: "New Workflow", isSandbox: true });

          // --- Start with a default Start Node instead of blank ---
          const startNodeId = uuidv4();
          const startNode: Node = {
            id: startNodeId,
            type: "eventNode",
            position: { x: 400, y: 200 },
            data: {
              id: startNodeId,
              activityId: uuidv4(),
              type: "event",
              subType: "start",
              label: "Start",
              icon: "CirclePlay",
              theme: {
                bgColor: DEFAULT_STUDIO_THEME.node.event + "20",
                borderColor: DEFAULT_STUDIO_THEME.node.event,
                iconColor: DEFAULT_STUDIO_THEME.primary,
              },
              properties: {
                logLevel: "Info",
              },
            } as any,
          };
          setNodes([startNode]);
          setEdges([]);
        }
      } catch (err) {
        console.error("Hydration failed:", err);
      } finally {
        setLoading(false);
      }
    }
    load();

    // Fetch folder info if we have a folderId
    if (folderId && activeCustomer?.id) {
      getStudioFolders(activeCustomer.id, tenantId || activeCustomer.id).then(
        (folders) => {
          const findFolder = (list: any[]): any => {
            for (const f of list) {
              if (f.id === folderId) return f;
              if (f.subfolders) {
                const sub = findFolder(f.subfolders);
                if (sub) return sub;
              }
            }
            return null;
          };
          const folder = findFolder(folders);
          if (folder) setFolderInfo(folder);
        },
      );
    }
  }, [
    projectId,
    workspaceId,
    folderId,
    workflowId,
    router,
    activeCustomer?.id,
    tenantId,
  ]);

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const lastSavedStateRef = useRef<string>("");

  // Initialize snapshot once nodes/edges are loaded
  useEffect(() => {
    if (!loading && nodes.length > 0 && lastSavedStateRef.current === "") {
      lastSavedStateRef.current = JSON.stringify({ nodes, edges, variables, arguments: arguments_ });
    }
  }, [loading, nodes.length]);

  const handleSave = async (isAuto = false) => {
    const currentState = JSON.stringify({ nodes, edges, variables, arguments: arguments_ });
    
    // Skip if auto-saving and nothing has changed
    if (isAuto && currentState === lastSavedStateRef.current) {
      return;
    }

    // Robust ID resolution: Priority 1. URL param (if valid UUID), 2. project state, 3. fail
    const urlProjectId =
      projectId && projectId !== "undefined" && projectId !== "null"
        ? projectId
        : null;
    const stateProjectId =
      project?.id &&
      project.id !== "undefined" &&
      project.id !== "null" &&
      project.id !== "loaded"
        ? project.id
        : null;

    const currentProjectId = urlProjectId || stateProjectId;

    // Safety check for UUID validity
    if (!currentProjectId) {
      toast.error(
        "Project context lost. Please return to the Studio dashboard.",
      );
      console.error(
        "[Studio] Save blocked - No valid projectId found. URL:",
        projectId,
        "State:",
        project?.id,
      );
      return;
    }

    // For new workflows, show the custom Save Modal
    if (currentProjectId === "sandbox") {
      setNewWorkflowName(project?.name || "New Workflow");
      setIsSaveModalOpen(true);
      return;
    }

    // --- REQUIREMENT: Handle Blank Main Process ---
    const isMainProcess =
      project?.name === "Main Process" || (!workflowId && nodes.length === 0);
    if (isMainProcess && nodes.length === 0) {
      const confirmDelete = window.confirm(
        "Main Process is blank. Saving a blank entry point is not allowed.\n\n" +
          "Do you want to DELETE this project entirely? (Cancel to just discard changes)",
      );

      if (confirmDelete) {
        try {
          const res = await deleteStudioProject(currentProjectId);
          if (res.success) {
            toast.success("Project deleted successfully");
            router.push("/next-gen/studio");
            return;
          } else {
            toast.error(`Delete failed: ${res.error}`);
          }
        } catch (e: any) {
          toast.error(`Error deleting project: ${e.message}`);
        }
      }
      return;
    }

    let finalName = workflowName || project?.name || "Untitled Workflow";
    
    // Normalize primary workflow name for APP projects to ensure one-to-one sync
    if (project?.projectType === "APP" && (finalName.toLowerCase() === "home dashboard" || finalName.toLowerCase() === "home dashboard.xaml" || finalName === "Main Process")) {
      finalName = "App Workspace.xaml";
    }

    const payload = {
      workflowId,
      projectId: currentProjectId,
      name: finalName,
      activeEdgeType,
      nodes,
      edges,
      variables,
      arguments: arguments_,
      flowJson: JSON.stringify({
        nodes,
        edges,
        variables,
        arguments: arguments_,
      }),
    };

    setIsBusy(true);
    try {
      const res = await saveWorkflow(payload);
      if (res.success) {
        setWorkflowId(res.workflowId as string);
        lastSavedStateRef.current = currentState;
        setLastSaved(new Date());
        // Clear dirty flag on the active tab
        setDesignerTabs(prev => prev.map(t => t.id === activeDesignerTabId ? { ...t, isDirty: false, lastSaved: new Date() } : t));
        if (!isAuto) toast.success(`Workflow saved successfully`);
        router.refresh();
      } else {
        toast.error(`Save failed: ${res.error || "Unknown error"}`);
      }
    } catch (err: any) {
      toast.error(`Save error: ${err.message || "Server error"}`);
    } finally {
      setIsBusy(false);
    }
  };

  // Auto-save logic (1 minute)
  useEffect(() => {
    const interval = setInterval(() => {
      if (nodes.length > 0 && projectId && projectId !== "sandbox") {
        console.log("[Studio] Auto-saving...");
        handleSave(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [nodes, edges, variables, arguments_, workflowName, projectId, workflowId, handleSave]);

  const handleCreateWorkflow = async () => {
    if (!newWorkflowName.trim()) {
      toast.error("Please enter a workflow name");
      return;
    }

    const payload = {
      name: newWorkflowName,
      nodes,
      edges,
      variables,
      arguments: arguments_,
      customerId: activeCustomer?.id || "",
      tenantId: tenantId || activeCustomer?.id || "",
      workspaceId: workspaceId || "",
      folderId: folderId || "",
    };

    try {
      const res = await createStudioProject(payload);
      if (res.success) {
        toast.success("Project created successfully");
        setIsSaveModalOpen(false);
        const newProjId = res.projectId;
        const newWfId = res.workflowId;
        router.replace(
          `/next-gen/studio/designer?projectId=${newProjId}&workflowId=${newWfId}${workspaceId ? `&workspaceId=${workspaceId}` : ""}${folderId ? `&folderId=${folderId}` : ""}`,
        );
        // Update local state so Monitoring can use it immediately
        setWorkflowId(newWfId as string);
      } else {
        toast.error(`Create failed: ${(res as any).error || "Unknown error"}`);
      }
    } catch (err: any) {
      toast.error(`Create error: ${err.message || "Server error"}`);
    }
  };

  // --- EXPORT / IMPORT LOGIC ---
  const handleExportFlow = () => {
    const flowData = {
      name: project?.name || "Exported Workflow",
      nodes,
      edges,
      variables,
      arguments: arguments_,
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
    };

    const blob = new Blob([JSON.stringify(flowData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${flowData.name.replace(/\s+/g, "_")}_export.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Workflow exported successfully");
  };

  const handleImportFlow = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data = JSON.parse(content);

        if (data.nodes && data.edges) {
          setNodes(data.nodes);
          setEdges(data.edges);
          if (data.variables) setVariables(data.variables);
          if (data.arguments) setArguments(data.arguments);
          toast.success("Workflow imported successfully");
        } else {
          toast.error("Invalid workflow file format");
        }
      } catch (err) {
        toast.error("Failed to parse workflow file");
      }
    };
    reader.readAsText(file);
    // Reset input
    event.target.value = "";
  };

  const handleValidate = async () => {
    setIsBusy(true);
    const parser = new FlowParser(nodes, edges);
    const errors = parser.validateFlow();

    if (errors.length > 0) {
      errors.forEach((err) => toast.error(err));
    } else {
      toast.success("Workflow validation passed! Ready to run.");
    }
    setIsBusy(false);
  };

  const handleRun = useCallback(() => {
    if (nodes.length === 0) {
      toast.error("No nodes to execute");
      return;
    }
    setRunTrigger(prev => prev + 1);
  }, [nodes.length]);

  const handleRunWorkflow = useCallback((wfId: string) => {
    // If it's a different workflow, we should ideally load it first.
    // For now, if it's the current one, just run.
    if (wfId === workflowId) {
      handleRun();
    } else {
      // Navigate to the workflow and then run (via URL param sync)
      const url = `/next-gen/studio/designer?projectId=${projectId}&workflowId=${wfId}${workspaceId ? `&workspaceId=${workspaceId}` : ""}${folderId ? `&folderId=${folderId}` : ""}`;
      router.push(url);
      // We can't easily trigger run immediately after push because of hydration,
      // but the user can click run again or we could use a query param `?run=true`.
      toast.info("Switching to workflow...");
    }
  }, [workflowId, projectId, workspaceId, folderId, router, handleRun]);

  const handleDeploy = async () => {
    if (!projectId || projectId === "sandbox") {
      toast.error("Please save the project before publishing.");
      return;
    }

    setIsBusy(true);
    const loadingToast = toast.loading("Packaging dependencies and publishing to VM...");
    
    try {
      const { publishProject } = await import("@/app/actions/studioActions");
      const res = await publishProject(projectId);
      
      if (res.success) {
        toast.success(`Published successfully!`, {
          description: `Location: ~/NextGen/Published/... (Self-cleanup script included)`,
          duration: 5000,
        });
      } else {
        toast.error(`Publishing failed: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setIsBusy(false);
      toast.dismiss(loadingToast);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="relative h-screen w-full overflow-hidden">
        <StudioLayout
          projectName={
            projectId === "sandbox" && folderInfo
              ? `New Workflow in ${folderInfo.name}`
              : project?.name || "Untitled Studio Project"
          }
          activeProjectId={projectId}
          workspaceId={workspaceId}
          folderId={folderId}
          folderName={folderInfo?.name}
          onSave={() => handleSave(false)}
          onRun={handleRun}
          onRunWorkflow={handleRunWorkflow}
          onDebugWorkflow={handleRunWorkflow} // Reusing for now
          onValidate={handleValidate}
          onDeploy={handleDeploy}
          isBusy={isBusy}
          lastSaved={lastSaved}
          activeWorkflowId={workflowId}
          workflowName={workflowName}
          selectionActive={!!selectedNodeId}

          activeEngine={activeEngine}
          onEngineChange={setActiveEngine}
          onAlign={handleAlign}
          onDistribute={handleDistribute}
          onAutoLayout={handleAutoLayout}
          onEdgeTypeChange={handleEdgeTypeChange}
          activeEdgeType={activeEdgeType}
          activeSelectionId={selectedNodeId}
          defaultTab={searchParams.get("tab") || "studio"}
          hiddenTabs={["published"]}


          designerTabs={designerTabs}
          activeDesignerTabId={activeDesignerTabId}
          onDesignerTabChange={handleDesignerTabChange}
          onDesignerTabClose={handleDesignerTabClose}
          onDesignerTabNew={handleDesignerTabNew}
          onWorkflowSelect={(wf: any) => {
            if (wf.id) openWorkflowInTab(wf.id, wf.name || wf.label || "Workflow");
          }}
          sidebar={<StudioToolbox projectId={projectId || undefined} workflowId={workflowId || undefined} />}
          properties={
            <StudioInspector
              selectedNode={selectedNode}
              projectId={projectId || undefined}
              onUpdate={(data) =>
                selectedNodeId && handleUpdateNodeData(selectedNodeId, data)
              }
              onDelete={() =>
                selectedNodeId && handleDeleteNode(selectedNodeId)
              }
              onStartRecording={() => setIsRecording(true)}
              isRecording={isRecording}
              variables={variables}
              onCapture={handleStartCapture}
            />
          }
          bottomDock={
            <StudioDock
              variables={variables}
              setVariables={setVariables}
              arguments={arguments_}
              setArguments={setArguments}
              logs={executionLogs}
              setLogs={setExecutionLogs}
              snapshots={snapshots}
              setSnapshots={setSnapshots}
            />
          }

        >
          <StudioCanvas
            engine={activeEngine}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChangeWithHistory}
            onEdgesChange={onEdgesChangeWithHistory}
            onConnect={(params) => {
              takeSnapshot();
              onConnect(params);
            }}
            onUndo={undo}
            onRedo={redo}
            canUndo={past.length > 0}
            canRedo={future.length > 0}
            onDrop={(e) => {
              takeSnapshot();
              onDrop(e);
            }}
            onDragOver={onDragOver}
            onSelectionChange={onSelectionChange}
            isRecording={isRecording}
            onStopRecording={() => setIsRecording(false)}
            onSave={handleSave}
            variables={variables}
            workflowArguments={arguments_}
            onStartCapture={handleStartCapture}
            runTrigger={runTrigger}

            workflowId={workflowId}
            onStartRecording={() => setIsRecording(true)}
            onSnapshotCapture={(snap) =>
              setSnapshots((prev) => [snap, ...prev])
            }
            projectName={project?.name}
            onEdgeUpdate={onEdgeUpdate}
            projectId={projectId}
            activeEdgeType={activeEdgeType}
            onAlign={handleAlign}
            onDistribute={handleDistribute}
            onAutoLayout={handleAutoLayout}
            onAutoAlign={handleAutoLayout}
            onEdgeTypeChange={setActiveEdgeType}
          />
        </StudioLayout>

        {/* --- CAPTURE OVERLAY (Better than AA & UiPath) --- */}
        <AnimatePresence>
          {isCapturing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-background/60 backdrop-blur-md flex items-center justify-center p-8"
            >
              <div className="w-full max-w-6xl h-full bg-card border border-border/40 rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
                <div className="bg-primary/5 px-6 py-2 border-b border-primary/10 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-primary font-bold text-[11px] uppercase tracking-widest">
                    <Camera size={14} className="animate-pulse" />
                    Capture Mode Active
                  </div>
                  <div className="text-[10px] text-muted-foreground font-medium">
                    Hover over any element and click to capture its properties
                  </div>
                </div>

                {/* Mock Web Content with Interactive Elements */}
                <div className="flex-1 bg-white relative overflow-hidden group/browser">
                  <div className="absolute inset-0 p-12 overflow-y-auto">
                    <div className="max-w-3xl mx-auto space-y-8">
                      <header className="flex justify-between items-center border-b pb-4">
                        <h1
                          className="text-3xl font-black text-slate-900 capture-el"
                          data-selector="h1.main-title"
                        >
                          Modern CRM Portal
                        </h1>
                      </header>

                      <form
                        className="space-y-4 p-8 border rounded-2xl bg-white shadow-sm capture-el"
                        data-selector="form#lead-form"
                      >
                        <h2 className="text-xl font-bold mb-4">Add New Lead</h2>
                        <input
                          type="text"
                          placeholder="John Doe"
                          className="w-full p-3 border rounded-lg outline-none focus:border-primary capture-el"
                          data-selector="input[name='full_name']"
                        />
                        <button
                          className="w-full py-4 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all capture-el"
                          data-selector="button#submit-lead"
                        >
                          Create Lead Record
                        </button>
                      </form>
                    </div>
                  </div>

                  <style jsx global>{`
                    .capture-el {
                      cursor: crosshair;
                      transition: all 0.2s;
                    }
                    .capture-el:hover {
                      outline: 3px solid #3b82f6;
                      outline-offset: 4px;
                      background-color: rgba(59, 130, 246, 0.05);
                    }
                  `}</style>

                  <div
                    className="absolute inset-0"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      const el = target.closest(".capture-el");
                      if (el) {
                        const selector =
                          el.getAttribute("data-selector") || "unknown";
                        handleFinishCapture(selector);
                      }
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- HIDDEN IMPORT INPUT --- */}
      <input
        id="flow-import-input"
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportFlow}
      />

      {/* --- CUSTOM SAVE MODAL --- */}
      <AnimatePresence>
        {isSaveModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSaveModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Globe size={20} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">
                      Save Workflow
                    </h3>
                    <p className="text-xs text-muted-foreground/60">
                      Target Location:{" "}
                      <span className="font-bold text-primary">
                        {folderInfo ? folderInfo.name : "Project Root"}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">
                      Workflow Name
                    </label>
                    <input
                      type="text"
                      value={newWorkflowName}
                      onChange={(e) => setNewWorkflowName(e.target.value)}
                      placeholder="e.g. Daily Data Sync"
                      className="w-full bg-foreground/5 border border-border/40 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                      autoFocus
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleCreateWorkflow()
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-8">
                  <button
                    onClick={() => setIsSaveModalOpen(false)}
                    className="flex-1 px-4 py-2.5 text-sm font-bold text-foreground/40 hover:text-foreground hover:bg-foreground/5 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateWorkflow}
                    className="flex-1 px-4 py-2.5 text-sm font-bold bg-primary text-primary-foreground rounded-xl shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all"
                  >
                    Create Project
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
