"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Search,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MousePointer2,
  Type,
  Zap,
  Bot,
  Split,
  Repeat,
  FileCode,
  FolderOpen,
  Database,
  ArrowRightLeft,
  ShieldCheck,
  LayoutGrid,
  FileText,
  Activity,
  Target,
  Globe,
  ClipboardCheck,
  Clock,
  Play,
  Trash,
  CirclePlay,
  CircleStop,
  Circle,
  X,
  Plus,
  Box,
  Cable,
  Component,
  FileJson,
  Layers,
  Package,
  Cpu,
  Variable,
  Workflow,
  FolderTree as FolderTreeIcon,
  FilePlus,
  FolderPlus,
  Loader2,
  ArrowRight,
  MoreVertical,
  Link2,
  Wand2,
  Map as MapIcon,
  Sparkles,
  Mail,
  Timer,
  RotateCcw,
  GitBranch,
  Terminal,
  Camera,
  Video,
  AlertCircle,
  Settings2,
  BookOpen,
  Eye,
  MousePointerClick,
  Table,
  Filter,
  SortAsc,
  FileSpreadsheet,
  IterationCw,
  Pause,
  AlertTriangle,
  SkipForward,
  Copy,
  Scissors,
  List,
  FileCheck,
  Chrome,
  Navigation,
  Image,
  Inbox,
  Forward,
  Reply,
  Send,
  Webhook,
  Server,
  BrainCircuit,
  ScanText,
  MessageSquare,
  Bell,
  UserCheck,
  Cloud,
  Hash,
  Star,
  StarOff,
  Grip,
  GripVertical,
  MoreHorizontal,
  CheckSquare,
  Square,
  ScrollText,
  Key,
  Presentation,
  Mails,
  MailSearch,
  Shield,
  HardDrive,
  Monitor,
  Building,
  CreditCard,
  Lock,
  Unlock,
  FileDigit,
  Layers2,
  Network,
  Kanban,
  Bug,
  ListChecks,
  PlusCircle,
  FileType,
  FileSearch,
  FileOutput,
  Bookmark,
  Pen,
  TableProperties,
  Building2,
  Code,
  Pencil,
  Folder,
  History,
  Share2,
  GitCompare,
  MonitorPlay,
  PlaySquare,
  FileBox,
  ArrowBigUpDash,
  ArrowUpRight,
  Maximize,
  Settings,
  FileStack,
  FileMinus,
  FileX,
  Minus,
  FileUp,
  FileDown,
  FolderSearch,
  RefreshCw,
  Info,
  Timer as TimerIcon,
  Spline,
  ArrowDown,
  MoveHorizontal,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalSpaceBetween,
  AlignVerticalSpaceBetween,
  GitFork,
  ShieldAlert,
  ShieldOff,
  Scale,
  GlobeLock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { getAssets } from "@/app/actions/assetActions";
import { toast } from "sonner";
import { useAppContext } from "@/lib/context";
import { 
  getProjectWorkflows, 
  createStudioResource,
  renameWorkflow,
  deleteWorkflow,
  duplicateWorkflow,
  setAsMainProcess,
  saveWorkflow,
  getExecutionHistory,
} from "@/app/actions/studioActions";
import { useSearchParams, useRouter } from "next/navigation";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/* ======================================================================
   HELPERS
   ====================================================================== */
const getNumbering = (depth: number, index: number) => {
  if (depth === 0) return "";
  if (depth === 1) {
    const roman = ["i.", "ii.", "iii.", "iv.", "v."];
    return roman[index] || `${index + 1}.`;
  }
  if (depth === 2) return `${index + 1}.`;
  return String.fromCharCode(97 + index) + "."; // a., b., c.
};

const getResourceIcon = (type: string, extension: string | null) => {
  const t = String(type || "").toUpperCase();
  if (t === "FOLDER") return <Folder size={14} className="text-amber-500/80 fill-amber-500/10" />;
  if (t === "CONFIG") return <Settings size={14} className="text-muted-foreground/60" />;
  if (t === "SCRIPT") return <Terminal size={14} className="text-emerald-500" />;
  if (t === "LIBRARY") return <Package size={14} className="text-primary/60" />;
  return <FileText size={14} className="text-primary/60" />;
};


/* ======================================================================
   FOLDER PANEL
   ====================================================================== */
export function StudioFolderPanel({ 
  projectId: propProjectId,
  workspaceId: propWorkspaceId,
  folderId: propFolderId,
  folderName: propFolderName,
  collapsed = false, 
  onWorkflowSelect,
  onRun,
  onDebug,
  onToggle,
  basePath
}: { 
  projectId?: string | null;
  workspaceId?: string | null;
  folderId?: string | null;
  folderName?: string | null;
  collapsed?: boolean; 
  onWorkflowSelect?: (workflow: any) => void; 
  onRun?: (wfId: string) => void;
  onDebug?: (wfId: string) => void;
  onToggle?: () => void;
  basePath?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [activeId, setActiveId] = useState<string | null>(null);
  
  useEffect(() => {
    // Multi-path detection: Props -> Next.js SearchParams -> Window Location
    const getParam = (key: string) => {
      if (typeof window === "undefined") return null;
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.get(key);
    };

    const id = propProjectId || searchParams.get('projectId') || getParam('projectId') || searchParams.get('id') || getParam('id');
    
    if (id && id !== "null" && id !== "undefined") {
      setActiveId(id);
      console.log("[StudioFolderPanel] Project ID Stabilized:", id);
    }
  }, [propProjectId, searchParams]);

  const projectId = activeId;
  const workspaceId = propWorkspaceId || searchParams.get('workspaceId');
  const folderId = propFolderId || searchParams.get('folderId');

  const [processes, setProcesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newResourceName, setNewResourceName] = useState("");
  const [newResourceType, setNewResourceType] = useState("WORKFLOW");
  const [newResourceParent, setNewResourceParent] = useState<string | undefined>(undefined);
  const [activeWorkflow, setActiveWorkflow] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const fetchProcesses = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    const res = await getProjectWorkflows(projectId);
    if (res.success) {
      setProcesses(res.workflows || []);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses]);

  // Auto-expand all folders on load
  useEffect(() => {
    if (processes.length > 0) {
      const folders = processes.filter(p => String(p.type).toUpperCase() === "FOLDER");
      if (folders.length > 0) {
        setExpandedIds(new Set(folders.map(f => f.id)));
      }
    }
  }, [processes]);

  const getFullResourcePath = (id?: string): string => {
    // If no specific item ID, check if we have a global folderId context (New Project flow)
    if (!id) {
      if (propFolderName) return propFolderName;
      if (folderId && folderId !== "null") return `Project Folder`;
      return "Project Root";
    }
    
    const item = processes.find(p => p.id === id);
    if (!item) return "Project Root";
    
    if (item.parentId && item.parentId !== "null") {
      return `${getFullResourcePath(item.parentId)} / ${item.name}`;
    }
    return item.name;
  };

  const openCreateDialog = (type: string, targetId?: string) => {
    let parentId: string | undefined = undefined;
    
    // Priority: Use the specific item that was right-clicked
    if (targetId) {
      const targetIdStr = String(targetId);
      const node = processes.find(p => String(p.id) === targetIdStr);
      if (node) {
        // If it's a folder, create inside it. If it's a file, create next to it (same parent).
        const isFolder = node.type && String(node.type).toUpperCase() === "FOLDER";
        parentId = isFolder ? node.id : (node.parentId || undefined);
      }
    }

    const defaultNames: Record<string, string> = {
      WORKFLOW: "NewWorkflow.xaml",
      FOLDER: "New Folder",
      CONFIG: "config.json",
      SCRIPT: "script.py"
    };

    setNewResourceType(type);
    setNewResourceParent(parentId);
    setNewResourceName(defaultNames[type] || "New Resource");
    setCreateDialogOpen(true);
  };

  const handleCreateResource = async () => {
    if (!projectId) {
      toast.error("Missing Project context. Please reload.");
      return;
    }
    if (!newResourceName.trim()) {
      toast.error("Please enter a name.");
      return;
    }

    setCreating(true);
    try {
      const res = await createStudioResource(projectId, newResourceName, newResourceType, newResourceParent);
      if (res.success) {
        toast.success(`${newResourceType} created successfully`);
        setCreateDialogOpen(false);
        await fetchProcesses();
        if (res.workflowId) setSelectedId(res.workflowId);
      } else {
        toast.error(res.error || "Failed to create resource");
      }
    } catch (err: any) {
      console.error("[StudioPanels] Creation error:", err);
      toast.error(`Error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (wfId: string, name: string) => {
    const res = await renameWorkflow(wfId, name);
    if (res.success) {
      toast.success("Renamed successfully");
      fetchProcesses();
    }
  };

  const handleDelete = async (wf: any) => {
    if (!confirm(`Are you sure you want to delete "${wf.name}"?`)) return;
    const res = await deleteWorkflow(wf.id);
    if (res.success) {
      toast.success("Deleted successfully");
      if (selectedId === wf.id) setSelectedId(null);
      fetchProcesses();
    }
  };

  const handleDuplicate = async (wfId: string) => {
    const res = await duplicateWorkflow(wfId);
    if (res.success) {
      toast.success("Duplicated successfully");
      fetchProcesses();
    }
  };

  const handleSetMain = async (wfId: string) => {
    if (!projectId) return;
    const res = await setAsMainProcess(wfId, projectId);
    if (res.success) {
      toast.success("Set as Main Entry Point");
      fetchProcesses();
    }
  };

  const rootNodes = processes.filter(p => {
    const pid = String(p.parentId || "");
    return !p.parentId || pid === "null" || pid === "undefined" || pid === "";
  });
  
  const filteredNodes = searchTerm.trim() 
    ? processes.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()))
    : rootNodes;

  if (loading && processes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 gap-2 opacity-40">
        <Loader2 className="animate-spin text-primary" size={20} />
        <span className="studio-label-caps tracking-tighter">Synchronizing...</span>
      </div>
    );
  }

  const handleToggleExpanded = (id: string, expanded: boolean) => {
    const next = new Set(expandedIds);
    if (expanded) next.add(id); else next.delete(id);
    setExpandedIds(next);
  };

   return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-sidebar overflow-hidden text-foreground transition-colors duration-300 font-sans border-r border-border/40">
      <div className="p-4 space-y-4 border-b border-border/40 bg-primary/5">
         <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
               <button className="text-xs font-black uppercase tracking-[0.2em] text-primary border-b-2 border-primary pb-1">Project</button>
            </div>
            <button 
               onClick={() => fetchProcesses()}
               disabled={loading}
               className="p-1.5 rounded-lg hover:bg-primary/10 text-primary/60 hover:text-primary transition-all disabled:opacity-50 group/refresh"
               title="Refresh resources from Disk & Cloud"
            >
               <RefreshCw size={13} className={cn("transition-transform", loading && "animate-spin")} />
            </button>
         </div>

         {!collapsed && (
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/30 group-focus-within:text-primary transition-colors" />
            <input 
              placeholder="Search resources..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs bg-muted/40 border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-foreground/20 font-bold"
            />
          </div>
         )}
      </div>

      {collapsed && (
        <div className="flex items-center justify-center pt-4 pb-2">
           <Search size={14} className="text-foreground/80" />
        </div>
      )}

      {!collapsed && (
        <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar pt-2 pb-20">
          <div className="px-1 relative">
            {searchTerm.trim() ? (
              <div className="space-y-0.5">
                {filteredNodes.map((node, idx) => (
                  <WorkflowItem 
                    key={node.id}
                    node={node}
                    allNodes={processes}
                    depth={0}
                    index={idx}
                    selectedId={selectedId}
                    expandedIds={expandedIds}
                    onToggle={handleToggleExpanded}
                    onSelect={(wf: any) => {
                      setSelectedId(wf.id);
                      if (onWorkflowSelect) onWorkflowSelect(wf);
                    }}
                    onAdd={openCreateDialog}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onDuplicate={handleDuplicate}
                    onSetMain={handleSetMain}
                    onRun={onRun}
                    onDebug={onDebug}
                    projectId={projectId}
                    workspaceId={workspaceId}
                    folderId={folderId}
                    router={router}
                  />
                ))}
                {filteredNodes.length === 0 && (
                  <div className="py-10 text-center opacity-40">
                    <p className="text-xs">No resources found</p>
                  </div>
                )}
              </div>
            ) : (
              rootNodes.map((node, idx) => (
                <WorkflowItem 
                  key={node.id}
                  node={node}
                  allNodes={processes}
                  depth={0}
                  index={idx}
                  selectedId={selectedId}
                  expandedIds={expandedIds}
                  onToggle={handleToggleExpanded}
                  onSelect={(wf: any) => {
                    setSelectedId(wf.id);
                    if (onWorkflowSelect) onWorkflowSelect(wf);
                  }}
                  onAdd={openCreateDialog}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  onDuplicate={handleDuplicate}
                  onSetMain={handleSetMain}
                  onRun={onRun}
                  onDebug={onDebug}
                  projectId={projectId}
                  workspaceId={workspaceId}
                  folderId={folderId}
                  router={router}
                  basePath={basePath}
                />
              ))
            )}
          </div>

          {processes.length === 0 && !loading && (
            <div className="py-20 px-6 text-center opacity-40">
              <div className="w-16 h-16 rounded-full bg-foreground/5 flex items-center justify-center mx-auto mb-4 border border-dashed border-border">
                <FileCode size={24} className="text-muted-foreground/30" />
              </div>
              <h3 className="text-xs font-bold mb-1">Project is empty</h3>
              <p className="text-xs mb-6">Create your first workflow to begin</p>
              <button 
                onClick={() => openCreateDialog("WORKFLOW")}
                className="w-full py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-black uppercase tracking-widest rounded-lg transition-all border border-primary/20"
              >
                Create Workflow
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-card border-border/60 max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-xs font-black uppercase tracking-widest text-muted-foreground">
              New {newResourceType === "FOLDER" ? "Folder" : "Workflow Resource"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
              {getResourceIcon(newResourceType, null)}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight">
                  Target Location: <span className="text-foreground/90">{getFullResourcePath(newResourceParent)}</span>
                </p>
                <p className="text-xs text-foreground/80 ">
                  {newResourceType === "WORKFLOW" ? "Project logic files (.xaml)" : "Logical grouping folder"}
                </p>
              </div>
            </div>
            <Input 
              value={newResourceName}
              onChange={(e) => setNewResourceName(e.target.value)}
              className="bg-background border-border/40 focus:ring-primary/20 text-xs h-9"
              placeholder="Enter name..."
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateResource()}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)} className="text-xs font-bold uppercase tracking-widest h-8 rounded-sm" disabled={creating}>Cancel</Button>
            <Button onClick={handleCreateResource} className="bg-primary text-white text-xs font-black uppercase tracking-widest h-8 px-6 rounded-sm shadow-lg shadow-primary/20" disabled={creating}>
              {creating ? <Loader2 className="animate-spin" size={14} /> : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {collapsed && (
        <div className="flex flex-col items-center py-4 gap-4 overflow-y-auto">
          {processes.map(p => (
            <div key={p.id} className="relative cursor-pointer hover:scale-110 transition-transform">
              {getResourceIcon(p.type, p.extension)}
            </div>
          ))}
        </div>
      )}

      {!collapsed && (
        <div className="px-3 py-3 border-t border-border/40 shrink-0 space-y-1.5">
          <div className="flex gap-1.5">
             <button onClick={() => openCreateDialog("WORKFLOW")} className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-sm bg-card/40 hover:bg-card/60 border border-border/30 hover:border-primary/20 transition-all group">
                <FilePlus size={14} className="text-foreground/80 group-hover:text-primary transition-colors" />
                <span className="text-xs font-semibold text-foreground/50 group-hover:text-foreground transition-colors">New File</span>
             </button>
             <button onClick={() => openCreateDialog("FOLDER")} className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-sm bg-card/40 hover:bg-card/60 border border-border/30 hover:border-primary/20 transition-all group">
                <FolderPlus size={14} className="text-foreground/80 group-hover:text-amber-500 transition-colors" />
                <span className="text-xs font-semibold text-foreground/50 group-hover:text-foreground transition-colors">New Folder</span>
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

function WorkflowItem({ 
  node, 
  allNodes, 
  depth, 
  index,
  selectedId,
  expandedIds,
  onToggle,
  onSelect, 
  onAdd, 
  onRename, 
  onDelete,
  onDuplicate,
  onSetMain,
  onRun,
  onDebug,
  projectId,
  workspaceId,
  folderId,
  router,
  basePath
}: any) {
  const children = allNodes.filter((n: any) => n.parentId && String(n.parentId) === String(node.id));
  const isFolder = node.type && String(node.type).toUpperCase() === "FOLDER";
  const isExpanded = expandedIds?.has(node.id) ?? true;
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(node.name);
  const isSelected = selectedId === node.id;

  const numbering = getNumbering(depth, index);

  const handleRenameSubmit = () => {
    if (editName.trim() && editName !== node.name) {
      onRename(node.id, editName);
    }
    setIsEditing(false);
  };

  return (
    <div className="flex flex-col select-none relative">
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="relative flex items-center group/item">
            {/* Indentation and Tree Lines */}
            <div className="absolute left-0 top-0 bottom-0 flex" style={{ width: `${depth * 18}px` }}>
              {Array.from({ length: depth }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "w-[18px] border-l h-full relative transition-colors",
                    isSelected ? "border-primary/40" : "border-primary/10"
                  )}
                >
                  {/* Vertical line connector for the current level */}
                  {i === depth - 1 && (
                     <div className={cn(
                       "absolute left-0 top-0 h-1/2 w-4 border-b rounded-bl-md transition-colors",
                       isSelected ? "border-primary/40" : "border-primary/10"
                     )} />
                  )}
                </div>
              ))}
            </div>

            <button 
              onClick={() => {
                if (isFolder) {
                  onToggle(node.id, !isExpanded);
                } else {
                  onSelect(node);
                }
                
                // Route if it's a workflow and not already selected
                if (!isFolder && projectId && projectId !== "null" && projectId !== "undefined") {
                   const effectivePath = basePath || "/next-gen/studio/designer";
                   router.push(`${effectivePath}?projectId=${projectId}&workflowId=${node.id}${workspaceId ? `&workspaceId=${workspaceId}` : ''}${folderId ? `&folderId=${folderId}` : ''}`);
                }
              }}
              onDoubleClick={() => isFolder && onToggle(node.id, !isExpanded)}
              className={cn(
                "flex-1 flex items-center gap-2.5 py-1.5 px-2.5 rounded-sm transition-all text-left relative z-10 mx-1 group/folder-btn",
                isSelected ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "hover:bg-primary/5 text-foreground/70"
              )}
              style={{ marginLeft: `${depth * 16}px` }}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {/* Expand Icon */}
                <div className="w-4 h-4 flex items-center justify-center shrink-0">
                   {isFolder && (
                     isExpanded ? (
                       <ChevronDown size={12} className={cn(isSelected ? "text-primary-foreground" : "text-foreground/30")} />
                     ) : (
                       <ChevronRight size={12} className={cn(isSelected ? "text-primary-foreground" : "text-foreground/30")} />
                     )
                   )}
                </div>
                
                {/* Resource Icon */}
                <div className={cn(
                  "shrink-0 transition-all",
                  isSelected ? "text-primary-foreground" : "text-foreground/40 group-hover/folder-btn:text-primary"
                )}>
                  {isFolder ? (
                    node.icon === "Variable" ? <Variable size={14} className={cn(isSelected ? "text-primary-foreground" : "text-emerald-500/60")} /> :
                    node.icon === "Workflow" ? <Workflow size={14} className={cn(isSelected ? "text-primary-foreground" : "text-primary/60")} /> :
                    node.icon === "Database" ? <Database size={14} className={cn(isSelected ? "text-primary-foreground" : "text-amber-500/60")} /> :
                    <Folder size={14} className={cn(isSelected ? "text-primary-foreground" : "text-amber-500/60")} />
                  ) : node.type === "VARIABLE" ? (
                    <Hash size={14} className={cn(isSelected ? "text-primary-foreground" : "text-emerald-500/60")} />
                  ) : node.type === "ARGUMENT" ? (
                    <Zap size={14} className={cn(isSelected ? "text-primary-foreground" : "text-primary/60")} />
                  ) : node.type === "ASSET" ? (
                    <ShieldCheck size={14} className={cn(isSelected ? "text-primary-foreground" : "text-amber-500/60")} />
                  ) : node.isLocal ? (
                    <FileCode size={14} className={cn(isSelected ? "text-primary-foreground" : "text-muted-foreground/60")} />
                  ) : (
                    <FileText size={14} className={cn(isSelected ? "text-primary-foreground" : "text-primary/60")} />
                  )}

                </div>

                <div className="flex flex-col flex-1 min-w-0">
                   <div className="flex items-center gap-1.5">
                     <span className={cn(
                       "truncate leading-none transition-all",
                       depth === 0 || depth === 1 ? "font-bold text-[12px]" : depth === 2 ? "font-normal text-xs" : "font-normal text-xs",
                       isSelected ? "text-primary-foreground" : "text-foreground/90"
                     )}>
                       {node.name}
                     </span>
                     {node.isMain && (
                       <div className={cn(
                         "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-tighter shrink-0",
                         isSelected ? "bg-white/10 border-white/20 text-white" : "bg-emerald-600/10 border-emerald-600/20 text-emerald-700"
                       )}>
                         <Star size={8} fill="currentColor" />
                         Main
                       </div>
                     )}
                     {node.isLocal && (
                       <div className={cn(
                         "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-tighter shrink-0",
                         isSelected ? "bg-white/10 border-white/20 text-white" : "bg-amber-500/10 border-amber-500/20 text-amber-700"
                       )}>
                         Local
                       </div>
                     )}
                     {node.isOnlineSyncPending && (
                       <div className={cn(
                         "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-tighter shrink-0",
                         isSelected ? "bg-white/10 border-white/20 text-white" : "bg-slate-500/10 border-slate-500/20 text-slate-500"
                       )}>
                         Not Synced
                       </div>
                     )}
                     {node.isOnlineUpdatePending && (
                       <div className={cn(
                         "flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[8px] font-black uppercase tracking-tighter shrink-0",
                         isSelected ? "bg-white/10 border-white/20 text-white" : "bg-blue-500/10 border-blue-500/20 text-blue-600"
                       )}>
                         Update Pending
                       </div>
                     )}
                   </div>
                </div>
              </div>
            </button>
          </div>
        </ContextMenuTrigger>
        
        <ContextMenuContent className="w-56 bg-card border-border/60 shadow-2xl backdrop-blur-xl">
          <div className="px-2 py-1.5 text-xs font-black uppercase tracking-[0.2em] text-foreground/80 border-b border-border/10 mb-1">
             Manage Resource
          </div>

          <ContextMenuItem 
            onClick={async () => {
              const parent = allNodes.find((n: any) => n.id === node.parentId);
              if (parent) {
                onSelect(parent);
                onToggle(parent.id, true); // Open the folder!
                toast.success(`Navigated to folder: ${parent.name}`);
              }
              
              // Also try to open in local explorer if it's a local project context
              try {
                const { openInExplorer } = await import("@/app/actions/studioActions");
                // Using the actual project path on Mac
                const projectBase = `/Users/ratheesh/Studio/Projects/${node.name || "Workflow"}`;
                await openInExplorer(projectBase);
              } catch (e) {
                console.error("Local explorer opening not supported or failed", e);
              }
            }} 
            className="gap-2 text-xs font-medium focus:bg-primary/5 focus:text-primary"
          >
            <FolderSearch size={14} className="text-amber-500" /> Go to folder
          </ContextMenuItem>

          <ContextMenuSeparator className="bg-border/10" />
          
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2 text-xs font-medium focus:bg-primary/5 focus:text-primary">
              <Plus size={14} /> New...
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="w-48 bg-card border-border/60 shadow-2xl backdrop-blur-xl">
              <ContextMenuItem onClick={() => onAdd("WORKFLOW", node.id)} className="gap-2 text-xs font-medium focus:bg-primary/5 focus:text-primary">
                <FileCode size={14} className="text-primary" /> File
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onAdd("FOLDER", node.id)} className="gap-2 text-xs font-medium focus:bg-primary/5 focus:text-primary">
                <Folder size={14} className="text-amber-400" /> Folder
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onAdd("CONFIG", node.id)} className="gap-2 text-xs font-medium focus:bg-primary/5 focus:text-primary">
                <Settings size={14} className="text-slate-400" /> Config (.json)
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onAdd("SCRIPT", node.id)} className="gap-2 text-xs font-medium focus:bg-primary/5 focus:text-primary">
                <Terminal size={14} className="text-emerald-400" /> Script (.py)
              </ContextMenuItem>
            </ContextMenuSubContent>
          </ContextMenuSub>

          <ContextMenuSeparator className="bg-border/10" />

          <ContextMenuItem onClick={() => setIsEditing(true)} className="gap-2 text-xs font-medium cursor-pointer focus:bg-primary/5 focus:text-primary">
            <Pencil size={14} /> Rename
            <ContextMenuShortcut>F2</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDuplicate(node.id)} className="gap-2 text-xs font-medium cursor-pointer focus:bg-primary/5 focus:text-primary">
            <Copy size={14} /> Duplicate
            <ContextMenuShortcut>⌘D</ContextMenuShortcut>
          </ContextMenuItem>
          
          <ContextMenuSeparator className="bg-border/10" />

          {node.type === "WORKFLOW" && (
            <>
              <ContextMenuItem onClick={() => onSetMain(node.id)} className="gap-2 text-xs font-medium cursor-pointer focus:bg-primary/5 focus:text-primary">
                <GitCompare size={14} /> Set as Main
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onRun?.(node.id)} className="gap-2 text-xs font-medium cursor-pointer focus:bg-emerald-500/10 focus:text-emerald-500">
                <PlaySquare size={14} /> Run from here
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onDebug?.(node.id)} className="gap-2 text-xs font-medium cursor-pointer focus:bg-amber-500/10 focus:text-amber-500">
                <MonitorPlay size={14} /> Debug from here
              </ContextMenuItem>
              
              <ContextMenuSeparator className="bg-border/10" />
              
              <ContextMenuItem className="gap-2 text-xs font-medium cursor-pointer focus:bg-primary/5 focus:text-primary">
                <Share2 size={14} /> View References
              </ContextMenuItem>
              <ContextMenuItem className="gap-2 text-xs font-medium cursor-pointer focus:bg-primary/5 focus:text-primary">
                <FileBox size={14} /> Add Dependency
              </ContextMenuItem>
              
              <ContextMenuSeparator className="bg-border/10" />
            </>
          )}

          <ContextMenuItem onClick={() => onDelete(node)} className="gap-2 text-xs font-medium text-destructive cursor-pointer focus:bg-destructive/10 focus:text-destructive">
            <Trash size={14} /> Delete
            <ContextMenuShortcut>⌫</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Recursive Children */}
      {isExpanded && children.length > 0 && (
        <div className="flex flex-col relative">
          {children.map((child: any, idx: number) => (
            <WorkflowItem 
              key={child.id}
              node={child}
              allNodes={allNodes}
              depth={depth + 1}
              index={idx}
              selectedId={selectedId}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              onAdd={onAdd}
              onRename={onRename}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onSetMain={onSetMain}
              projectId={projectId}
              workspaceId={workspaceId}
              folderId={folderId}
              router={router}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StudioFolderNode({ folder, expandedFolders, onToggle, onSelect, onWorkflowSelect, depth }: any) {
  const hasSubfolders = folder.children && folder.children.length > 0;
  const hasProjects = folder.projects && folder.projects.length > 0;
  const hasChildren = hasSubfolders || hasProjects;
  const isExpanded = !!expandedFolders[folder.id];

  return (
    <div className="flex flex-col">
      <button
        onClick={() => {
          if (hasChildren) onToggle(folder.id);
          if (onSelect) onSelect(folder);
        }}
        className="flex items-center gap-2 py-1.5 px-2 rounded-sm hover:bg-primary/5 text-foreground/90 hover:text-foreground transition-all group/node"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {hasChildren ? (
            <ChevronRight size={12} className={cn("text-foreground/80 transition-transform shrink-0", isExpanded && "rotate-90")} />
          ) : (
            <div className="w-3 shrink-0" />
          )}
          <FolderOpen size={14} className={cn("shrink-0", isExpanded ? "text-amber-500/80" : "text-amber-500/40")} />
          <span className="text-sm font-medium truncate">{folder.name}</span>
        </div>
      </button>

      {isExpanded && (
        <div className="flex flex-col">
          {/* Subfolders */}
          {folder.children?.map((child: any) => (
            <StudioFolderNode 
              key={child.id} 
              folder={child} 
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onSelect={onSelect}
              onWorkflowSelect={onWorkflowSelect}
              depth={depth + 1} 
            />
          ))}
          {/* Projects in this folder */}
          {folder.projects?.map((project: any) => (
            <StudioProjectNode 
              key={project.id}
              project={project}
              expandedFolders={expandedFolders}
              onToggle={onToggle}
              onWorkflowSelect={onWorkflowSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StudioProjectNode({ project, expandedFolders, onToggle, onWorkflowSelect, depth, isProjectOnly = false }: any) {
  const isExpanded = isProjectOnly ? true : !!expandedFolders[project.id];
  const hasDependencies = (project.variables?.length || 0) + (project.arguments?.length || 0) + (project.assets?.length || 0) > 0;
  const workflows = project.studioWorkflows || [];
  const hasChildren = workflows.length > 0 || hasDependencies;

  return (
    <div className="flex flex-col">
      {isProjectOnly && (
        <div className="px-4 py-3 bg-primary/5 border-b border-primary/10 mb-2 rounded-lg">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/20">
               <Package size={16} />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-foreground uppercase tracking-tight">{project.name}</span>
              <span className="text-xs font-bold text-foreground/90 uppercase tracking-widest">Active Project • v{project.version}</span>
            </div>
          </div>
        </div>
      )}

      {!isProjectOnly && (
        <button
          onClick={() => {
            const masterFlow = workflows[0];
            if (masterFlow && onWorkflowSelect) {
              onWorkflowSelect(masterFlow);
            } else if (hasChildren) {
              onToggle(project.id);
            }
          }}
          className={cn(
            "flex items-center gap-2 py-1.5 px-2 rounded-sm transition-all group/node",
            isExpanded ? "bg-primary/10 text-primary" : "hover:bg-primary/5 text-foreground/90 hover:text-foreground"
          )}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {hasChildren ? (
              <ChevronRight size={12} className={cn("text-foreground/80 transition-transform shrink-0", isExpanded && "rotate-90")} />
            ) : (
              <div className="w-3 shrink-0" />
            )}
            <div className={cn(
              "w-5 h-5 rounded flex items-center justify-center shrink-0 shadow-sm",
              isExpanded ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"
            )}>
              <Package size={12} />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold truncate">{project.name}</span>
              {!isExpanded && <span className="text-xs opacity-40 truncate">v{project.version} • Published</span>}
            </div>
          </div>
          {!isExpanded && <div className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-bold uppercase tracking-wider shrink-0">Live</div>}
        </button>
      )}

      {isExpanded && (
        <div className={cn(
          "flex flex-col mt-0.5 mb-2",
          !isProjectOnly ? "border-l border-primary/20 ml-4" : ""
        )}>
          {/* Workflows (Flows) */}
          {workflows.length > 0 && (
            <div className="flex flex-col">
               <div className="px-4 py-1.5 flex items-center justify-between">
                <span className="text-xs font-bold text-foreground/80 uppercase tracking-widest">Logic Flows</span>
                <button className="text-xs text-primary hover:underline font-bold">+ New Flow</button>
              </div>
              <div className="flex flex-col">
                {workflows.map((wf: any, idx: number) => (
                  <StudioWorkflowNode 
                    key={wf.id}
                    workflow={wf} 
                    onSelect={onWorkflowSelect}
                    isMaster={idx === 0}
                    depth={1}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dependencies Section */}
          {hasDependencies && (
            <div className="flex flex-col mt-2">
              <div className="px-4 py-1.5">
                <span className="text-xs font-bold text-foreground/80 uppercase tracking-widest">Dependencies</span>
              </div>
              <div className="flex flex-col">
                {project.arguments?.map((arg: any) => (
                  <StudioDependencyNode key={arg.id} label={arg.name} type="Argument" depth={1} />
                ))}
                {project.variables?.map((v: any) => (
                  <StudioDependencyNode key={v.id} label={v.name} type="Variable" depth={1} />
                ))}
                {project.assets?.map((a: any) => (
                  <StudioDependencyNode key={a.id} label={a.name} type="Asset" depth={1} />
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-2 px-4">
             <button className="w-full flex items-center justify-center gap-2 py-1.5 rounded bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary transition-all border border-primary/10">
                <Plus size={12} />
                Add Dependency
             </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StudioWorkflowNode({ workflow, onSelect, isMaster, depth }: any) {
  return (
    <button
      onClick={() => onSelect && onSelect(workflow)}
      className="flex items-center gap-2 py-1.5 px-4 hover:bg-primary/5 text-foreground/90 hover:text-primary transition-all group/workflow border-l-2 border-transparent hover:border-primary"
    >
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center shrink-0 group-hover/workflow:scale-110 transition-transform",
        isMaster ? "bg-primary/10 text-primary shadow-sm shadow-primary/20" : "bg-emerald-500/10 text-emerald-500"
      )}>
        {isMaster ? <Workflow size={12} /> : <Activity size={12} />}
      </div>
      <div className="flex flex-col min-w-0 text-left">
        <span className={cn("text-sm truncate", isMaster ? "font-bold text-foreground" : "font-medium")}>
          {isMaster ? "Master Flow" : (workflow.name || "Main Flow")}
        </span>
        <span className="text-xs opacity-40">{isMaster ? "Primary Orchestrator" : "Ready to Publish"}</span>
      </div>
      <div className="ml-auto opacity-0 group-hover/workflow:opacity-100 transition-opacity">
        <ArrowRight size={12} className="text-primary" />
      </div>
    </button>
  );
}

function StudioDependencyNode({ label, type, depth }: any) {
  const getIcon = () => {
    switch (type) {
      case "Variable": return <Variable size={10} className="text-blue-500" />;
      case "Argument": return <Cable size={10} className="text-purple-500" />;
      case "Asset": return <Box size={10} className="text-amber-500" />;
      default: return <Link2 size={10} className="text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-center gap-2 py-1 px-4 hover:bg-foreground/5 transition-all group/dep cursor-default">
      <div className="w-4 h-4 rounded bg-muted/40 flex items-center justify-center shrink-0">
        {getIcon()}
      </div>
      <span className="text-[12px] font-medium text-foreground/50 group-hover/dep:text-foreground/80 truncate">{label}</span>
      <span className="ml-auto text-xs font-bold text-muted-foreground/20 group-hover/dep:text-primary/40 uppercase tracking-tighter">{type}</span>
    </div>
  );
}

/* ======================================================================
   LEFT PANEL — Activity Palette + Connectors + Libraries
   ====================================================================== */
export function StudioToolbox({ 
  collapsed = false, 
  onToggle,
  projectId,
  workflowId
}: { 
  collapsed?: boolean; 
  onToggle?: () => void;
  projectId?: string;
  workflowId?: string;
}) {
  const [searchTerm, setSearchTerm] = useState("");

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    activities: true,
    connectors: true,
    libraries: true,
    data: true,
    logic: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const [favorites, setFavorites] = useState<string[]>([]);

  const toggleFavorite = (name: string) => {
    setFavorites(prev => prev.includes(name) ? prev.filter(f => f !== name) : [...prev, name]);
  };

  const standardProps = {
    timeout: 30000,
    retryCount: 3,
    retryInterval: 2000,
    continueOnError: false,
    delayBefore: 0,
    delayAfter: 0,
    logLevel: "Info",
    takeScreenshotOnError: true
  };

  const activityGroups = [
    {
      key: "flow", name: "Flow Control (If, Loop, Try...)", icon: GitBranch,
      items: [
        { 
          name: "Start", icon: CirclePlay, 
          dragType: JSON.stringify({ type: 'event', subType: 'start', category: 'Logic', label: 'Start Flow', icon: 'CirclePlay', inputs: {}, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Entry point for the workflow" 
        },
        { 
          name: "End", icon: CircleStop, 
          dragType: JSON.stringify({ type: 'event', subType: 'end', category: 'Logic', label: 'End Flow', icon: 'CircleStop', inputs: {}, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Terminal point for the workflow" 
        },
        { 
          name: "Decision (IF)", icon: Split, 
          dragType: JSON.stringify({ type: 'gateway', subType: 'xorGateway', category: 'Logic', label: 'Decision', icon: 'Split', inputs: { condition: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "IF/ELSE conditional branching" 
        },
        { 
          name: "Parallel Execute", icon: Layers, 
          dragType: JSON.stringify({ type: 'gateway', subType: 'andGateway', category: 'Logic', label: 'Parallel', icon: 'Layers', inputs: { maxThreads: 5 }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Split flow into concurrent branches OR join multiple branches back into one." 
        },
        { 
          name: "For Each", icon: IterationCw, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Logic', label: 'Loop', icon: 'IterationCw', inputs: { collection: [] }, outputs: { item: null }, properties: standardProps, execution: {} }), 
          desc: "Iterate through a collection" 
        },
        { 
          name: "Try Catch", icon: ShieldCheck, 
          dragType: JSON.stringify({ type: 'task', subType: 'tryCatch', category: 'Logic', label: 'Try Catch', icon: 'ShieldCheck', inputs: {}, outputs: { error: null, errorMessage: "" }, properties: { ...standardProps, continueOnError: true }, execution: {} }), 
          desc: "Execute logic with automatic error trapping and recovery paths." 
        },
        { 
          name: "Log Message", icon: ScrollText, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Logic', label: 'Log', icon: 'ScrollText', inputs: { message: "", level: "Info" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Write message to execution log" 
        },
        { 
          name: "Message Box", icon: MessageSquare, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Logic', label: 'MsgBox', icon: 'MessageSquare', inputs: { message: "", title: "Studio" }, outputs: { userResponse: "" }, properties: standardProps, execution: {} }), 
          desc: "Show interactive popup dialog" 
        },
        { 
          name: "Break", icon: CircleStop, 
          dragType: JSON.stringify({ type: 'task', subType: 'break', category: 'Logic', label: 'Break', icon: 'CircleStop', inputs: { condition: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Break out of the current loop or exit the flow early, optionally based on a condition." 
        },
      ]
    },
    {
      key: "ui", name: "UI Automation", icon: Chrome,
      items: [
        { 
          name: "Click", icon: MousePointerClick, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Click', icon: 'MousePointerClick', inputs: { selector: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Click a UI element" 
        },
        { 
          name: "Type Into", icon: Type, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Type Into', icon: 'Type', inputs: { selector: "", text: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Type text into a field" 
        },
        { 
          name: "Get Text", icon: ScanText, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Get Text', icon: 'ScanText', inputs: { selector: "" }, outputs: { text: "" }, properties: standardProps, execution: {} }), 
          desc: "Extract text from UI" 
        },
        { 
          name: "Record App", icon: Camera, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Record', icon: 'Camera', inputs: {}, outputs: { map: {} }, properties: standardProps, execution: {} }), 
          desc: "Capture screens and elements" 
        },
        { 
          name: "Open Browser", icon: Globe, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Browser', icon: 'Globe', inputs: { url: "", browser: "Chrome" }, outputs: { browserId: "" }, properties: standardProps, execution: {} }), 
          desc: "Launch a new browser instance" 
        },
        { 
          name: "Extract Table", icon: Table, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Scrape Table', icon: 'Table', inputs: { selector: "" }, outputs: { table: [] }, properties: standardProps, execution: {} }), 
          desc: "Extract structured data from UI table" 
        },
        { 
          name: "Select Item", icon: List, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Select', icon: 'List', inputs: { selector: "", item: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Select item from dropdown/list" 
        },
        { 
          name: "Check/Uncheck", icon: CheckSquare, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Toggle', icon: 'CheckSquare', inputs: { selector: "", action: "Check" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Toggle checkboxes or radio buttons" 
        },
        { 
          name: "Wait Element", icon: Clock, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Wait', icon: 'Clock', inputs: { selector: "", timeout: 30, state: "Visible" }, outputs: { found: false }, properties: standardProps, execution: {} }), 
          desc: "Wait for UI element state" 
        },
        { 
          name: "Hover", icon: MousePointer2, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Hover', icon: 'MousePointer2', inputs: { selector: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Move mouse over UI element" 
        },
        { 
          name: "Get Source", icon: FileCode, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'UI', label: 'Get Source', icon: 'FileCode', inputs: { browserId: "" }, outputs: { source: "" }, properties: standardProps, execution: {} }), 
          desc: "Retrieve HTML/XML source of the page" 
        },
      ]
    },
    {
      key: "data_ops", name: "Work with Data & Spreadsheets", icon: Table,
      items: [
        { 
          name: "String OP", icon: Wand2, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Data', label: 'String OP', icon: 'Wand2', inputs: { input: "", ops: [] }, outputs: { result: "" }, properties: standardProps, execution: {} }), 
          desc: "Chain string operations" 
        },
        { 
          name: "Filter Table", icon: Filter, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Data', label: 'Filter', icon: 'Filter', inputs: { table: [], condition: "" }, outputs: { filtered: [] }, properties: standardProps, execution: {} }), 
          desc: "Filter DataTable" 
        },
        { 
          name: "Build Table", icon: Plus, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Data', label: 'Build DT', icon: 'Plus', inputs: { columns: [] }, outputs: { table: [] }, properties: standardProps, execution: {} }), 
          desc: "Create a new DataTable" 
        },
        { 
          name: "Add Data Row", icon: Plus, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Data', label: 'Add Row', icon: 'Plus', inputs: { table: [], row: {} }, outputs: { table: [] }, properties: standardProps, execution: {} }), 
          desc: "Append row to table" 
        },
        { 
          name: "Lookup Table", icon: Search, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Data', label: 'Lookup DT', icon: 'Search', inputs: { table: [], column: "", value: "" }, outputs: { row: null, index: -1 }, properties: standardProps, execution: {} }), 
          desc: "Search value in table" 
        },
        { 
          name: "Sort Table", icon: SortAsc, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Data', label: 'Sort DT', icon: 'SortAsc', inputs: { table: [], column: "", order: "Asc" }, outputs: { table: [] }, properties: standardProps, execution: {} }), 
          desc: "Sort DataTable by column" 
        },
        { 
          name: "Get Asset", icon: Database, 
          dragType: JSON.stringify({ type: 'task', subType: 'getAsset', category: 'Data', label: 'Get Asset', icon: 'Database', inputs: { assetName: "" }, outputs: { assetValue: null }, properties: standardProps, execution: {} }), 
          desc: "Retrieve a secure asset or credential from the platform." 
        },
        { 
          name: "Assign", icon: ArrowRightLeft, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Data', label: 'Assign', icon: 'ArrowRightLeft', inputs: { variable: "", value: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Set a value to a variable" 
        },
        { 
          name: "Join Tables", icon: ArrowRightLeft, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Data', label: 'Join DT', icon: 'ArrowRightLeft', inputs: { table1: [], table2: [], type: "Inner", on: "" }, outputs: { table: [] }, properties: standardProps, execution: {} }), 
          desc: "Merge two DataTables" 
        },
      ]
    },
    {
      key: "office", name: "Office 365", icon: Mail,
      items: [
        { name: "Outlook & Email", isHeader: true },
        { 
          name: "Get Emails", icon: MailSearch, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Get Emails', icon: 'MailSearch', inputs: { folder: "Inbox", count: 10, filter: "" }, outputs: { emails: [] }, properties: standardProps, execution: {} }), 
          desc: "Search & Fetch Outlook messages" 
        },
        { 
          name: "Send Email", icon: Send, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Email', icon: 'Send', inputs: { to: "", subject: "", body: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Send via Outlook" 
        },
        { 
          name: "Outlook Move", icon: Forward, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Move Email', icon: 'Forward', inputs: { emailId: "", targetFolder: "Archive" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Move message to folder" 
        },
        { name: "Excel Automation", isHeader: true },
        { 
          name: "Excel Read", icon: FileSpreadsheet, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Excel Read', icon: 'FileSpreadsheet', inputs: { file: "", sheet: "Sheet1", range: "A1:B10" }, outputs: { data: [] }, properties: standardProps, execution: {} }), 
          desc: "Read specific range (e.g. A1:B10). Use A:B to read until last row." 
        },
        { 
          name: "Excel Write", icon: FilePlus, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Excel Write', icon: 'FilePlus', inputs: { file: "", sheet: "Sheet1", range: "A1", data: [] }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Write data to Excel" 
        },
        { 
          name: "Excel Macro", icon: Zap, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Excel Macro', icon: 'Zap', inputs: { file: "", macroName: "", arguments: [] }, outputs: { result: null }, properties: standardProps, execution: {} }), 
          desc: "Execute VBA macro in workbook" 
        },
        { 
          name: "Create Pivot", icon: Table, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Excel Pivot', icon: 'Table', inputs: { file: "", sourceSheet: "Sheet1", sourceRange: "A1:Z100", targetSheet: "Analysis", pivotName: "SalesPivot" }, outputs: { status: "Success" }, properties: standardProps, execution: {} }), 
          desc: "Generate Pivot Table from range" 
        },
        { 
          name: "Get Sheets", icon: Layers, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Get Sheets', icon: 'Layers', inputs: { file: "" }, outputs: { sheets: ["Sheet1", "Sheet2", "Sheet3"] }, properties: standardProps, execution: {} }), 
          desc: "Get list of all worksheet names" 
        },
        { 
          name: "Get Active Sheet", icon: Target, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Active Sheet', icon: 'Target', inputs: { file: "" }, outputs: { sheetName: "Sheet1" }, properties: standardProps, execution: {} }), 
          desc: "Get name of the currently active sheet" 
        },
        { name: "Word & PowerPoint", isHeader: true },
        { 
          name: "Word Create", icon: FileText, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'Word Doc', icon: 'FileText', inputs: { path: "", template: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Generate Word document" 
        },
        { 
          name: "Word Read", icon: FileText, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Document', label: 'Word Read', icon: 'FileText', inputs: { path: "" }, outputs: { text: "" }, properties: standardProps, execution: {} }), 
          desc: "Extract text from Word document" 
        },
        { 
          name: "Word Append", icon: FilePlus, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Document', label: 'Word Append', icon: 'FilePlus', inputs: { path: "", text: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Add content to end of Word file" 
        },
        { 
          name: "Word Replace", icon: Repeat, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Document', label: 'Word Replace', icon: 'Repeat', inputs: { path: "", find: "", replace: "" }, outputs: { matches: 0 }, properties: standardProps, execution: {} }), 
          desc: "Search and replace text in Word" 
        },
        { 
          name: "PPT Create", icon: Presentation, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Office365', label: 'PPT Gen', icon: 'Presentation', inputs: { path: "", title: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Create PowerPoint presentation" 
        },
      ]
    },
    {
      key: "api", name: "API & Web", icon: Globe,
      items: [
        { 
          name: "HTTP Request", icon: Webhook, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'HTTP', icon: 'Webhook', inputs: { url: "", method: "POST", headers: {}, body: "" }, outputs: { response: null }, properties: standardProps, execution: {} }), 
          desc: "REST/SOAP call" 
        },
        { 
          name: "Parse JSON", icon: FileJson, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'Parse JSON', icon: 'FileJson', inputs: { json: "", path: "" }, outputs: { value: null }, properties: standardProps, execution: {} }), 
          desc: "Extract data from JSON" 
        },
        { 
          name: "JSON Serialize", icon: FileOutput, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'Serialize', icon: 'FileOutput', inputs: { data: {} }, outputs: { json: "" }, properties: standardProps, execution: {} }), 
          desc: "Convert object to JSON string" 
        },
        { 
          name: "SOAP Request", icon: Server, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'SOAP', icon: 'Server', inputs: { endpoint: "", action: "", body: "" }, outputs: { response: "" }, properties: standardProps, execution: {} }), 
          desc: "Call legacy SOAP web service" 
        },
        { 
          name: "GraphQL Query", icon: Database, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'GraphQL', icon: 'Database', inputs: { url: "", query: "", variables: {} }, outputs: { data: {} }, properties: standardProps, execution: {} }), 
          desc: "Execute GraphQL query or mutation" 
        },
        { 
          name: "XML Parse", icon: FileCode, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'XML Parse', icon: 'FileCode', inputs: { xml: "", xpath: "" }, outputs: { value: null }, properties: standardProps, execution: {} }), 
          desc: "Extract data from XML via XPath" 
        },
        { 
          name: "OAuth Auth", icon: ShieldCheck, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'OAuth', icon: 'ShieldCheck', inputs: { clientId: "", clientSecret: "", tokenUrl: "" }, outputs: { token: "" }, properties: standardProps, execution: {} }), 
          desc: "Get OAuth2 access token" 
        },
        { name: "Serialization & Data", isHeader: true },
        { 
          name: "JSON Query", icon: Search, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'JSON Query', icon: 'Search', inputs: { json: "", path: "$" }, outputs: { results: [] }, properties: standardProps, execution: {} }), 
          desc: "Query JSON via JSONPath" 
        },
        { 
          name: "Deserialize XAML", icon: FileType, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'XAML Read', icon: 'FileType', inputs: { xaml: "" }, outputs: { obj: null }, properties: standardProps, execution: {} }), 
          desc: "Convert XAML string to object" 
        },
        { 
          name: "Serialize XAML", icon: FileOutput, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'API', label: 'XAML Write', icon: 'FileOutput', inputs: { obj: {} }, outputs: { xaml: "" }, properties: standardProps, execution: {} }), 
          desc: "Convert object to XAML string" 
        },
      ]
    },
    {
      key: "queue", name: "Queue Management", icon: ListChecks,
      items: [
        { 
          name: "Add Queue Item", icon: PlusCircle, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Queue', label: 'Add Item', icon: 'PlusCircle', inputs: { queue: "", item: {} }, outputs: { itemId: "" }, properties: standardProps, execution: {} }), 
          desc: "Push item to processing queue" 
        },
        { 
          name: "Bulk Add Items", icon: FileUp, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Queue', label: 'Bulk Add', icon: 'FileUp', inputs: { queue: "", items: [] }, outputs: { count: 0 }, properties: standardProps, execution: {} }), 
          desc: "Upload collection/DataTable to queue" 
        },
        { 
          name: "Get Transaction", icon: ArrowRight, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Queue', label: 'Get Trans', icon: 'ArrowRight', inputs: { queue: "" }, outputs: { item: null }, properties: standardProps, execution: {} }), 
          desc: "Fetch next item from queue" 
        },
        { 
          name: "Set Status", icon: ClipboardCheck, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Queue', label: 'Set Status', icon: 'ClipboardCheck', inputs: { itemId: "", status: "Success", reason: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Mark item as Success or Failed" 
        },
      ]
    },
    {
      key: "system", name: "Windows & System", icon: Terminal,
      items: [
        { 
          name: "Open App", icon: Box, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'System', label: 'Open App', icon: 'Box', inputs: { path: "" }, outputs: { pid: 0 }, properties: standardProps, execution: {} }), 
          desc: "Launch an application" 
        },
        { 
          name: "Kill Process", icon: Trash, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'System', label: 'Kill Proc', icon: 'Trash', inputs: { name: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Terminate a process" 
        },
        { 
          name: "Read File", icon: FileText, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'System', label: 'Read File', icon: 'FileText', inputs: { path: "" }, outputs: { content: "" }, properties: standardProps, execution: {} }), 
          desc: "Read file content" 
        },
        { 
          name: "Write File", icon: FilePlus, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'System', label: 'Write File', icon: 'FilePlus', inputs: { path: "", content: "", append: false }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Create or overwrite a file" 
        },
        { 
          name: "Create Folder", icon: FolderPlus, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'System', label: 'Create Fldr', icon: 'FolderPlus', inputs: { path: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Create a new directory" 
        },
        { 
          name: "Delete File/Folder", icon: Trash, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'System', label: 'Delete', icon: 'Trash', inputs: { path: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Remove file or directory" 
        },
        { 
          name: "Copy / Move", icon: ArrowRightLeft, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'System', label: 'Copy/Move', icon: 'ArrowRightLeft', inputs: { source: "", target: "", action: "copy" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Copy or move files and folders" 
        },
        { 
          name: "Exists", icon: FileCheck, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'System', label: 'Path Exists', icon: 'FileCheck', inputs: { path: "" }, outputs: { exists: false }, properties: standardProps, execution: {} }), 
          desc: "Check if file or folder exists" 
        },
        { 
          name: "Get Files", icon: List, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'System', label: 'Get Files', icon: 'List', inputs: { folder: "", filter: "*.*" }, outputs: { files: [] }, properties: standardProps, execution: {} }), 
          desc: "List files in a directory" 
        },
      ]
    },
    {
      key: "ai_ocr", name: "Computer Vision & AI", icon: BrainCircuit,
      items: [
        { 
          name: "CV Click", icon: MousePointerClick, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'CV', label: 'CV Click', icon: 'MousePointerClick', inputs: { descriptor: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Click element using Computer Vision" 
        },
        { 
          name: "CV Type Into", icon: Type, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'CV', label: 'CV Type', icon: 'Type', inputs: { descriptor: "", text: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Type into field using Computer Vision" 
        },
        { 
          name: "CV Get Text", icon: ScanText, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'CV', label: 'CV Text', icon: 'ScanText', inputs: { descriptor: "" }, outputs: { text: "" }, properties: standardProps, execution: {} }), 
          desc: "Extract text from image area" 
        },
        { 
          name: "CV Check", icon: CheckSquare, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'CV', label: 'CV Check', icon: 'CheckSquare', inputs: { descriptor: "", action: "Check" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Toggle CV-identified checkbox" 
        },
        { 
          name: "Image Find", icon: Image, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'OCR', label: 'Find Image', icon: 'Image', inputs: { template: "" }, outputs: { position: {} }, properties: standardProps, execution: {} }), 
          desc: "Locate image on screen" 
        },
        { 
          name: "CV Refresh", icon: RotateCcw, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'CV', label: 'CV Refresh', icon: 'RotateCcw', inputs: {}, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Update Computer Vision cache" 
        },
      ]
    },
    {
      key: "document", name: "PDF Automation", icon: FileText,
      items: [
        { 
          name: "PDF Merge", icon: FileStack, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'PDF', label: 'PDF Merge', icon: 'FileStack', inputs: { files: [], output: "" }, outputs: { path: "" }, properties: standardProps, execution: {} }), 
          desc: "Combine multiple PDF files" 
        },
        { 
          name: "PDF OCR", icon: ScanText, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'PDF', label: 'PDF OCR', icon: 'ScanText', inputs: { file: "", pages: "all" }, outputs: { text: "" }, properties: standardProps, execution: {} }), 
          desc: "Convert PDF images to searchable text" 
        },
        { 
          name: "PDF Extract Page", icon: Scissors, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'PDF', label: 'PDF Extract Page', icon: 'Scissors', inputs: { file: "", range: "1-5", output: "" }, outputs: { path: "" }, properties: standardProps, execution: {} }), 
          desc: "Extract specific pages or range" 
        },
        { 
          name: "PDF Move Page", icon: ArrowRightLeft, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'PDF', label: 'PDF Move', icon: 'ArrowRightLeft', inputs: { file: "", page: 1, to: 5 }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Reorder pages within PDF" 
        },
        { 
          name: "PDF Delete Page", icon: FileX, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'PDF', label: 'PDF Delete', icon: 'FileX', inputs: { file: "", range: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Remove pages from PDF" 
        },
      ]
    },
    {
      key: "terminal", name: "Terminal Automation", icon: Terminal,
      items: [
        { 
          name: "Connect", icon: Link2, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Terminal', label: 'Connect', icon: 'Link2', inputs: { host: "", port: 23, provider: "IBM 3270" }, outputs: { sessionId: "" }, properties: standardProps, execution: {} }), 
          desc: "Connect to Terminal Emulator" 
        },
        { 
          name: "Send Keys", icon: Zap, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Terminal', label: 'Keys', icon: 'Zap', inputs: { key: "Enter" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Send control keys (Enter, F1, etc.)" 
        },
        { 
          name: "Terminal Type", icon: Type, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Terminal', label: 'Type', icon: 'Type', inputs: { text: "", row: 1, col: 1 }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Type text at coordinates" 
        },
        { 
          name: "Get Text", icon: ScanText, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Terminal', label: 'Get Text', icon: 'ScanText', inputs: { row: 1, col: 1, length: 10 }, outputs: { text: "" }, properties: standardProps, execution: {} }), 
          desc: "Read from screen coordinates" 
        },
        { 
          name: "Disconnect", icon: X, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Terminal', label: 'Exit', icon: 'X', inputs: {}, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Close session" 
        },
      ]
    },
    {
      key: "security", name: "Security", icon: ShieldCheck,
      items: [
        { 
          name: "Get Cred", icon: Key, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Security', label: 'Get Cred', icon: 'Key', inputs: { name: "" }, outputs: { cred: null }, properties: standardProps, execution: {} }), 
          desc: "Fetch from Vault" 
        },
        { 
          name: "Encrypt", icon: Lock, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Security', label: 'Encrypt', icon: 'Lock', inputs: { text: "", key: "" }, outputs: { encrypted: "" }, properties: standardProps, execution: {} }), 
          desc: "Encrypt sensitive data" 
        },
        { 
          name: "Decrypt", icon: Unlock, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Security', label: 'Decrypt', icon: 'Unlock', inputs: { encrypted: "", key: "" }, outputs: { text: "" }, properties: standardProps, execution: {} }), 
          desc: "Decrypt encrypted data string" 
        },
      ]
    },
    {
      key: "sap", name: "SAP Automation", icon: Package,
      items: [
        { 
          name: "SAP Login", icon: Lock, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'SAP', label: 'SAP Login', icon: 'Lock', inputs: { system: "", client: "", user: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Authenticate to SAP" 
        },
        { 
          name: "Execute TX", icon: Play, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'SAP', label: 'SAP TX', icon: 'Play', inputs: { code: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Run SAP Transaction" 
        },
      ]
    },
    {
      key: "scripting", name: "Advanced Scripting", icon: Terminal,
      items: [
        { 
          name: "Python Script", icon: Zap, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Scripting', label: 'Python', icon: 'Zap', inputs: { script: "", arguments: {} }, outputs: { result: null }, properties: standardProps, execution: {} }), 
          desc: "Run Python code block" 
        },
        { 
          name: "VB Script", icon: ScrollText, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Scripting', label: 'VBS', icon: 'ScrollText', inputs: { script: "" }, outputs: { result: null }, properties: standardProps, execution: {} }), 
          desc: "Run legacy VBScript" 
        },
        { 
          name: "C# Script", icon: Code, 
          dragType: JSON.stringify({ type: 'task', subType: 'serviceTask', category: 'Scripting', label: 'C# Code', icon: 'Code', inputs: { code: "" }, outputs: { result: null }, properties: standardProps, execution: {} }), 
          desc: "Execute dynamic C# code" 
        },
      ]
    },
    {
      key: "queue_ops", name: "Queue Operations", icon: ListChecks,
      items: [
        { 
          name: "Get Queue", icon: Search, 
          dragType: JSON.stringify({ type: 'task', subType: 'getQueue', category: 'Queue', label: 'Get Queue', icon: 'Search', inputs: { queueName: "" }, outputs: { queue: null, itemCount: 0 }, properties: standardProps, execution: {} }), 
          desc: "Retrieve queue details and item count" 
        },
        { 
          name: "Modify Queue", icon: Settings, 
          dragType: JSON.stringify({ type: 'task', subType: 'modifyQueue', category: 'Queue', label: 'Modify Queue', icon: 'Settings', inputs: { queueName: "", maxRetries: 3, priority: "Normal" }, outputs: { success: false }, properties: standardProps, execution: {} }), 
          desc: "Update queue configuration and settings" 
        },
        { 
          name: "Delete Queue", icon: Trash, 
          dragType: JSON.stringify({ type: 'task', subType: 'deleteQueue', category: 'Queue', label: 'Delete Queue', icon: 'Trash', inputs: { queueName: "", force: false }, outputs: { success: false }, properties: standardProps, execution: {} }), 
          desc: "Permanently remove a queue and its items" 
        },
      ]
    },
    {
      key: "transaction_ops", name: "Transaction Management", icon: ClipboardCheck,
      items: [
        { 
          name: "Get Transaction", icon: ArrowRight, 
          dragType: JSON.stringify({ type: 'task', subType: 'getTransaction', category: 'Transaction', label: 'Get Transaction', icon: 'ArrowRight', inputs: { queueName: "", filter: "" }, outputs: { transaction: null }, properties: standardProps, execution: {} }), 
          desc: "Fetch next transaction item from queue" 
        },
        { 
          name: "Add Transaction", icon: PlusCircle, 
          dragType: JSON.stringify({ type: 'task', subType: 'addTransaction', category: 'Transaction', label: 'Add Transaction', icon: 'PlusCircle', inputs: { queueName: "", data: {}, priority: "Normal" }, outputs: { transactionId: "" }, properties: standardProps, execution: {} }), 
          desc: "Add a new transaction item to the queue" 
        },
        { 
          name: "Bulk Transaction Upload", icon: FileUp, 
          dragType: JSON.stringify({ type: 'task', subType: 'bulkTransaction', category: 'Transaction', label: 'Bulk Upload', icon: 'FileUp', inputs: { queueName: "", items: [], source: "DataTable" }, outputs: { count: 0, failedCount: 0 }, properties: standardProps, execution: {} }), 
          desc: "Upload multiple transactions from DataTable or CSV" 
        },
        { 
          name: "Update Transaction", icon: RefreshCw, 
          dragType: JSON.stringify({ type: 'task', subType: 'updateTransaction', category: 'Transaction', label: 'Update Transaction', icon: 'RefreshCw', inputs: { transactionId: "", data: {} }, outputs: { success: false }, properties: standardProps, execution: {} }), 
          desc: "Modify an existing transaction's data fields" 
        },
        { 
          name: "Set Transaction Status", icon: ClipboardCheck, 
          dragType: JSON.stringify({ type: 'task', subType: 'setTransactionStatus', category: 'Transaction', label: 'Set Status', icon: 'ClipboardCheck', inputs: { transactionId: "", status: "Success", reason: "" }, outputs: {}, properties: standardProps, execution: {} }), 
          desc: "Mark transaction as Success, Failed, or In Progress" 
        },
        { 
          name: "Restart Transaction", icon: RotateCcw, 
          dragType: JSON.stringify({ type: 'task', subType: 'restartTransaction', category: 'Transaction', label: 'Restart Transaction', icon: 'RotateCcw', inputs: { transactionId: "" }, outputs: { success: false }, properties: standardProps, execution: {} }), 
          desc: "Reset a failed transaction for reprocessing" 
        },
        { 
          name: "Disable Transaction", icon: CircleStop, 
          dragType: JSON.stringify({ type: 'task', subType: 'disableTransaction', category: 'Transaction', label: 'Disable Transaction', icon: 'CircleStop', inputs: { transactionId: "", reason: "" }, outputs: { success: false }, properties: standardProps, execution: {} }), 
          desc: "Disable a transaction to prevent processing" 
        },
        { 
          name: "Delete Transaction", icon: Trash, 
          dragType: JSON.stringify({ type: 'task', subType: 'deleteTransaction', category: 'Transaction', label: 'Delete Transaction', icon: 'Trash', inputs: { transactionId: "" }, outputs: { success: false }, properties: standardProps, execution: {} }), 
          desc: "Permanently remove a transaction from the queue" 
        },
      ]
    },
    {
      key: "data_engine_ops", name: "Data Engine Operations", icon: Database,
      items: [
        { 
          name: "Get DE Record", icon: Search, 
          dragType: JSON.stringify({ type: 'task', subType: 'getDERecord', category: 'DataEngine', label: 'Get DE Record', icon: 'Search', inputs: { tableName: "", recordId: "", filter: "" }, outputs: { record: null, records: [] }, properties: standardProps, execution: {} }), 
          desc: "Retrieve records from Data Engine table" 
        },
        { 
          name: "Update DE Record", icon: RefreshCw, 
          dragType: JSON.stringify({ type: 'task', subType: 'updateDERecord', category: 'DataEngine', label: 'Update DE Record', icon: 'RefreshCw', inputs: { tableName: "", recordId: "", data: {} }, outputs: { success: false }, properties: standardProps, execution: {} }), 
          desc: "Update an existing Data Engine record" 
        },
        { 
          name: "Delete DE Record", icon: Trash, 
          dragType: JSON.stringify({ type: 'task', subType: 'deleteDERecord', category: 'DataEngine', label: 'Delete DE Record', icon: 'Trash', inputs: { tableName: "", recordId: "" }, outputs: { success: false }, properties: standardProps, execution: {} }), 
          desc: "Remove a record from the Data Engine" 
        },
      ]
    },
    {
      key: "global_data", name: "Global Data", icon: GlobeLock,
      items: [
        { 
          name: "Get Global Data", icon: Search, 
          dragType: JSON.stringify({ type: 'task', subType: 'getGlobalData', category: 'GlobalData', label: 'Get Global Data', icon: 'Search', inputs: { tableName: "", filter: "", columns: [] }, outputs: { data: [], rowCount: 0 }, properties: standardProps, execution: {} }), 
          desc: "Pull read-only data from the Global Data table (no update/add/delete)" 
        },
      ]
    },
    {
      key: "asset_ops", name: "Asset Operations", icon: ShieldCheck,
      items: [
        { 
          name: "Get Assets", icon: Database, 
          dragType: JSON.stringify({ type: 'task', subType: 'getAssets', category: 'Assets', label: 'Get Assets', icon: 'Database', inputs: { assetName: "", assetType: "Credential" }, outputs: { assetValue: null, metadata: {} }, properties: standardProps, execution: {} }), 
          desc: "Retrieve secure asset or credential from the platform vault" 
        },
      ]
    },
  ];

  const connectors = [
    { name: "SAP", icon: Package },
    { name: "Salesforce", icon: Cloud },
    { name: "AWS S3", icon: Database },
    { name: "Azure Blob", icon: Cloud },
    { name: "PostgreSQL", icon: Database },
    { name: "ServiceNow", icon: Globe },
    { name: "Jira", icon: ClipboardCheck },
    { name: "Slack", icon: MessageSquare },
    { name: "Teams", icon: MessageSquare },
    { name: "SharePoint", icon: FolderOpen },
  ];

  /* Libraries are loaded dynamically — empty by default, user creates/installs them */
  const libraries: { name: string; icon: React.ElementType }[] = [];

  const filterItems = (items: any[]) => {
    if (!searchTerm) return items;
    const query = searchTerm.toLowerCase();
    
    return items
      .map(item => {
        let score = 0;
        const name = (item.name || "").toLowerCase();
        const desc = (item.desc || "").toLowerCase();
        
        // 1. Exact match (highest priority)
        if (name === query) score += 100;
        // 2. Starts with query
        else if (name.startsWith(query)) score += 80;
        // 3. Contains as a word (e.g. "Box" in "Message Box")
        else if (name.split(' ').some(word => word.startsWith(query))) score += 60;
        // 4. Contains query anywhere
        else if (name.includes(query)) score += 40;
        
        // 5. Acronym match (e.g. "MB" for "Message Box")
        const acronym = (item.name || "").split(' ').filter(w => w).map(w => w[0]).join('').toLowerCase();
        if (query.length > 1 && acronym.startsWith(query)) score += 50;
        
        // 6. Sub-category or type match
        const subType = (item.dragType || "").toLowerCase();
        if (subType.includes(query)) score += 20;

        // 7. Description match
        if (desc.includes(query)) score += 10;
        
        return { ...item, _searchScore: score };
      })
      .filter(item => item._searchScore > 0)
      .sort((a, b) => (b._searchScore || 0) - (a._searchScore || 0));
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-card overflow-hidden text-card-foreground transition-colors duration-300 font-sans border-r border-border/40">
      <div className="p-4 space-y-3 border-b border-border/40 bg-primary/5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-[0.2em] text-primary border-b-2 border-primary pb-1">
            Activity Library
          </span>
          <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-widest">Drag to canvas</span>
        </div>

        {!collapsed && (
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 group-focus-within:text-primary transition-colors" />
            <input
              placeholder="Search or describe what you want to do..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs bg-muted/50 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-muted-foreground/30 font-bold"
            />
          </div>
        )}

        {/* Quick-start chips for business users */}
        {!collapsed && !searchTerm && (
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: "Send Email", key: "email" },
              { label: "Read Excel", key: "excel" },
              { label: "Web Action", key: "ui" },
              { label: "If / Else", key: "flow" },
              { label: "API Call", key: "api" },
            ].map(chip => (
              <button
                key={chip.key}
                onClick={() => setSearchTerm(chip.label)}
                className="px-2 py-0.5 rounded-full bg-primary/5 border border-primary/20 text-xs font-black text-primary uppercase tracking-widest hover:bg-primary/10 transition-all"
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar px-3 pb-20 space-y-1">
        <>

            {/* ── Favorites Section ── */}
        {favorites.length > 0 && !collapsed && (
          <>
            <button
              onClick={() => toggleSection("favorites")}
              className="flex items-center gap-2 w-full py-2 px-1 group"
            >
              <ChevronRight size={12} className={cn("text-foreground/80 transition-transform", expandedSections.favorites && "rotate-90")} />
              <Star size={14} className="text-amber-400" />
              <span className="studio-label-caps">Favorites</span>
              <span className="text-xs font-bold text-foreground/80 ml-auto">{favorites.length}</span>
            </button>
            {expandedSections.favorites !== false && (
              <div className="pl-6 space-y-0.5">
                {activityGroups.flatMap(g => g.items).filter(item => favorites.includes(item.name)).map((item, i) => {
                  if (item.isHeader) return null;
                  const Icon = item.icon;
                  return (
                    <div
                      key={i}
                      draggable
                      onDragStart={e => {
                        let dragData: any;
                        try {
                          dragData = JSON.parse(item.dragType || '{}');
                        } catch {
                          dragData = { label: item.dragType };
                        }
                        dragData.dragType = item.name;
                        e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-primary/5 cursor-grab active:cursor-grabbing transition-all group/item border border-transparent hover:border-primary/15"
                    >
                      <div className="w-8 h-8 rounded-lg bg-amber-400/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                        {Icon && <Icon size={16} className="text-amber-500 group-hover/item:text-amber-600 transition-colors" />}
                      </div>
                      <p className="text-[13px] font-semibold text-foreground/90 flex-1 truncate">{item.name}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Activities Section ── */}
        <button
          onClick={() => toggleSection("activities")}
          className={cn("flex items-center gap-2.5 w-full py-2 px-1 group", collapsed && "justify-center px-0")}
        >
          {!collapsed && <ChevronRight size={13} className={cn("text-muted-foreground/50 transition-transform shrink-0", expandedSections.activities && "rotate-90")} />}
          <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <Activity size={14} className="text-primary" />
          </div>
          {!collapsed && <span className="text-[13px] font-bold text-foreground">All Activities</span>}
          {!collapsed && <span className="text-xs font-bold text-muted-foreground/40 ml-auto">{activityGroups.reduce((s, g) => s + g.items.filter(i => !i.isHeader).length, 0)}</span>}
        </button>

        {expandedSections.activities && (
          <div className="pl-2 space-y-0.5">
            {activityGroups.map(group => {
              const filteredGroupItems = filterItems(group.items);
              if (searchTerm && filteredGroupItems.length === 0) return null;
              return (
              <div key={group.key}>
                <button
                  onClick={() => !collapsed && toggleSection(group.key)}
                  className={cn(
                    "flex items-center gap-2.5 w-full py-2 px-2 rounded-lg hover:bg-muted/50 transition-all group",
                    collapsed && "justify-center px-1"
                  )}
                >
                  {!collapsed && <ChevronRight size={13} className={cn("text-muted-foreground/50 transition-transform shrink-0", expandedSections[group.key] && "rotate-90")} />}
                  <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", "bg-primary/10 border border-primary/20")}>
                    <group.icon size={14} className="text-primary" />
                  </div>
                  {!collapsed && (
                    <span className="text-[13px] font-semibold text-foreground flex-1 text-left leading-tight">{group.name}</span>
                  )}
                  {!collapsed && (
                    <span className="text-xs font-bold text-muted-foreground/40 ml-auto shrink-0">{filteredGroupItems.filter(i => !i.isHeader).length}</span>
                  )}
                </button>

                    {(expandedSections[group.key] || (searchTerm && filteredGroupItems.length > 0)) && (
                      <div className={cn("space-y-0.5", !collapsed && "pl-2")}>
                        {filteredGroupItems.map((item, i) => {
                          if (item.isHeader) {
                            return (
                              <div key={i} className="pt-3 pb-1 px-2">
                                <span className="text-xs font-black uppercase tracking-[0.12em] text-muted-foreground/40 border-b border-border/30 w-full block pb-1">
                                  {item.name}
                                </span>
                              </div>
                            );
                          }
                          const Icon = item.icon;
                          return (
                            <div
                              key={i}
                              draggable
                              onDragStart={e => {
                                let dragData: any;
                                try {
                                  dragData = JSON.parse(item.dragType || '{}');
                                } catch {
                                  dragData = { label: item.dragType };
                                }
                                dragData.dragType = item.name;
                                e.dataTransfer.setData("application/reactflow", JSON.stringify(dragData));
                                e.dataTransfer.effectAllowed = "move";
                              }}
                              className={cn(
                                "flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-primary/5 cursor-grab active:cursor-grabbing transition-all group/item border border-transparent hover:border-primary/15 select-none",
                                collapsed && "justify-center px-1 py-2"
                              )}
                              title={item.desc || item.name}
                            >
                              {/* Icon container */}
                              <div className={cn(
                                "rounded-lg flex items-center justify-center shrink-0 transition-all",
                                collapsed ? "w-9 h-9" : "w-8 h-8",
                                "bg-muted border border-border/50 group-hover/item:bg-primary/10 group-hover/item:border-primary/30"
                              )}>
                                {Icon && <Icon size={collapsed ? 18 : 16} className="text-foreground/60 group-hover/item:text-primary transition-colors" />}
                              </div>
                              {!collapsed && (
                                <div className="flex-1 min-w-0">
                                  <p className="text-[13px] font-semibold text-foreground/90 group-hover/item:text-foreground leading-tight truncate">{item.name}</p>
                                  {item.desc && (
                                    <p className="text-xs text-muted-foreground/60 leading-tight truncate mt-0.5">{item.desc}</p>
                                  )}
                                </div>
                              )}
                              {!collapsed && (
                                <div className="shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                                  <GripVertical size={14} className="text-muted-foreground/30" />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
              </div>
              );
            })}
          </div>
        )}

        {/* ── Connectors Section ── */}
        <button
          onClick={() => toggleSection("connectors")}
          className="flex items-center gap-2 w-full py-2 px-1 group mt-2"
        >
          <ChevronRight size={12} className={cn("text-foreground/80 transition-transform", expandedSections.connectors && "rotate-90")} />
          <Globe size={14} className="text-muted-foreground" />
          <span className="studio-label-caps">Connectors</span>
          <span className="text-xs text-muted-foreground/30 ml-auto">{connectors.length}</span>
        </button>

        {expandedSections.connectors && (
          <div className="pl-6 space-y-0.5">
            {filterItems(connectors).map((item, i) => {
              const Icon = item.icon;
              return (
                <div
                  key={i}
                  draggable
                  onDragStart={e => {
                    e.dataTransfer.setData("application/reactflow", JSON.stringify({ 
                      type: 'task', 
                      subType: 'serviceTask', 
                      label: item.name, 
                      dragType: item.name,
                      icon: 'Globe',
                      properties: { connector: item.name }
                    }));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-sm hover:bg-primary/5 cursor-grab active:cursor-grabbing transition-all group/item border border-transparent hover:border-primary/10"
                >
                  {Icon && <Icon size={13} className="text-muted-foreground/50 group-hover/item:text-primary transition-colors" />}
                  <span className="text-sm font-medium text-foreground/90 group-hover/item:text-foreground transition-colors">{item.name}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Libraries Section ── */}
        <button
          onClick={() => toggleSection("libraries")}
          className="flex items-center gap-2 w-full py-2 px-1 group mt-2"
        >
          <ChevronRight size={12} className={cn("text-foreground/80 transition-transform", expandedSections.libraries && "rotate-90")} />
          <BookOpen size={14} className="text-muted-foreground" />
          <span className="studio-label-caps">Libraries</span>
        </button>

        {expandedSections.libraries && (
          <div className="pl-6 space-y-0.5">
            {libraries.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-muted-foreground/30 mb-2">No libraries installed yet</p>
                <button className="text-xs font-semibold text-primary/60 hover:text-primary transition-colors">
                  Browse Marketplace →
                </button>
              </div>
            ) : (
              filterItems(libraries).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-sm hover:bg-primary/5 cursor-pointer transition-all group/item border border-transparent hover:border-primary/10"
                >
                  <item.icon size={13} className="text-purple-400/60 group-hover/item:text-purple-400 transition-colors" />
                  <span className="text-xs font-medium text-foreground/90 group-hover/item:text-foreground transition-colors">{item.name}</span>
                </div>
              ))
            )}
          </div>
        )}
      </>
    </div>

      {/* Bottom: Create Library */}
      <div className="px-3 py-3 border-t border-border/40 shrink-0">
        <button className="flex items-center gap-2 w-full py-2 px-3 rounded-sm bg-card/40 hover:bg-card/60 border border-border/30 hover:border-primary/20 transition-all group">
          <Plus size={14} className="text-foreground/80 group-hover:text-primary transition-colors" />
          <span className="text-xs font-semibold text-foreground/50 group-hover:text-foreground transition-colors">Create Library</span>
        </button>
      </div>
    </div>
  );
}

/* ======================================================================
   REUSABLE — Property Field Component with F2 Variable Picker
   ====================================================================== */
const SYSTEM_VARIABLES = ["_timestamp", "_step", "_workflow_started", "_workflow_completed", "_totalSteps", "_duration"];

const FUNCTION_LIBRARY = [
  {
    category: "Mathematical",
    icon: "🔢",
    items: [
      { name: "Sum(val1, val2)", snippet: "Sum({var1}, {var2})", desc: "Calculate the total of two or more numbers" },
      { name: "Average(val1, val2)", snippet: "Average({var1}, {var2})", desc: "Find the mean value" },
      { name: "Min(val1, val2)", snippet: "Min({var1}, {var2})", desc: "Return the smallest number" },
      { name: "Max(val1, val2)", snippet: "Max({var1}, {var2})", desc: "Return the largest number" },
      { name: "Round(val, digits)", snippet: "Round({var}, 2)", desc: "Round to nearest decimal" },
      { name: "Abs(val)", snippet: "Abs({var})", desc: "Absolute positive value" },
      { name: "Sqrt(val)", snippet: "Sqrt({var})", desc: "Square root" },
      { name: "Power(val, exp)", snippet: "Power({var}, 2)", desc: "Raise to power" },
      { name: "Mod(val, divisor)", snippet: "Mod({var}, 10)", desc: "Remainder after division" },
    ]
  },
  {
    category: "String / Text",
    icon: "🔤",
    items: [
      { name: "Len(text)", snippet: "Len({text})", desc: "Get length of string" },
      { name: "Left(text, n)", snippet: "Left({text}, 5)", desc: "Extract from left side" },
      { name: "Right(text, n)", snippet: "Right({text}, 5)", desc: "Extract from right side" },
      { name: "Mid(text, start, len)", snippet: "Mid({text}, 2, 5)", desc: "Extract from middle" },
      { name: "Trim(text)", snippet: "Trim({text})", desc: "Remove extra spaces" },
      { name: "Upper(text)", snippet: "Upper({text})", desc: "Convert to uppercase" },
      { name: "Lower(text)", snippet: "Lower({text})", desc: "Convert to lowercase" },
      { name: "Replace(text, find, sub)", snippet: "Replace({text}, 'old', 'new')", desc: "Change specific text" },
      { name: "Contains(text, search)", snippet: "Contains({text}, 'keyword')", desc: "Check if text exists" },
      { name: "Concat(t1, t2)", snippet: "Concat({t1}, {t2})", desc: "Join two strings" },
    ]
  },
  {
    category: "Date & Time",
    icon: "📅",
    items: [
      { name: "Now()", snippet: "Now()", desc: "Current date and time" },
      { name: "Today()", snippet: "Today()", desc: "Current date only" },
      { name: "Year(date)", snippet: "Year(Now())", desc: "Extract year" },
      { name: "AddDays(date, n)", snippet: "AddDays(Now(), 7)", desc: "Add days to date" },
      { name: "DateDiff(d1, d2)", snippet: "DateDiff({d1}, {d2})", desc: "Days between dates" },
      { name: "FormatDate(date, fmt)", snippet: "FormatDate(Now(), 'YYYY-MM-DD')", desc: "Custom date format" },
    ]
  },
  {
    category: "Logical",
    icon: "🔁",
    items: [
      { name: "If(cond, t, f)", snippet: "If({var} > 10, 'Big', 'Small')", desc: "Conditional decision" },
      { name: "IsNull(val)", snippet: "IsNull({var})", desc: "Check if value is empty" },
      { name: "IsNumeric(val)", snippet: "IsNumeric({var})", desc: "Check if value is a number" },
    ]
  },
  {
    category: "AI & Smart",
    icon: "🧠",
    items: [
      { name: "GenerateText(prompt)", snippet: "GenerateText('Summarize: ' + {text})", desc: "Use AI to generate content" },
      { name: "Sentiment(text)", snippet: "Sentiment({text})", desc: "Analyze emotional tone" },
      { name: "Translate(text, lang)", snippet: "Translate({text}, 'Spanish')", desc: "Translate text" },
    ]
  }
];


function PropertyField({ label, value, placeholder, onChange, fx, type, options, multiline, onCapture, onFileSelected, variables = [] }: {
  label: string;
  value: any;
  placeholder?: string;
  onChange: (val: any) => void;
  fx?: boolean;
  type?: "text" | "number" | "select" | "checkbox";
  options?: string[];
  multiline?: boolean;
  onCapture?: () => void;
  onFileSelected?: (file: File) => void;
  variables?: { name: string; type: string }[];
}) {
  const [showVarPicker, setShowVarPicker] = useState(false);
  const [showZoom, setShowZoom] = useState(false);
  const [varSearch, setVarSearch] = useState("");
  const [activePickerTab, setActivePickerTab] = useState<"variables" | "functions">("variables");
  const [selectedFuncCategory, setSelectedFuncCategory] = useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'F2' && fx) {
      e.preventDefault();
      setShowVarPicker(prev => !prev);
      setVarSearch("");
    }
    if (e.key === 'Escape') {
      setShowVarPicker(false);
    }
  };

  const insertToken = (token: string, isVariable = true) => {
    const currentVal = String(value || '');
    const input = inputRef.current;
    const insertText = isVariable ? `{${token}}` : token;
    
    if (input) {
      const start = input.selectionStart || currentVal.length;
      const end = input.selectionEnd || currentVal.length;
      const newVal = currentVal.slice(0, start) + insertText + currentVal.slice(end);
      onChange(newVal);
      setShowVarPicker(false);
      setTimeout(() => {
        input.focus();
        const pos = start + insertText.length;
        input.setSelectionRange(pos, pos);
      }, 50);
    } else {
      onChange(currentVal + insertText);
      setShowVarPicker(false);
    }
  };

  const filteredVars = [
    { category: "System", vars: SYSTEM_VARIABLES },
    { category: "User Variables", vars: variables.map(v => v.name) }
  ].map(cat => ({
    ...cat,
    vars: cat.vars.filter(v => v.toLowerCase().includes(varSearch.toLowerCase()))
  })).filter(cat => cat.vars.length > 0);

  const filteredFunctions = FUNCTION_LIBRARY.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.name.toLowerCase().includes(varSearch.toLowerCase()) || 
      item.desc.toLowerCase().includes(varSearch.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  const fxBadge = fx ? (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => { setShowVarPicker(prev => !prev); setVarSearch(""); }}
        className="text-xs font-mono text-primary/60 bg-primary/5 px-1.5 py-0.5 rounded hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
        title="Browse variables (F2)"
      >fx</button>
      <button
        onClick={() => setShowZoom(true)}
        className="p-1 text-muted-foreground/40 hover:text-primary hover:bg-primary/5 rounded transition-all"
        title="Open Expression Editor"
      >
        <Maximize size={10} />
      </button>
    </div>
  ) : null;

  const varPickerUI = showVarPicker ? (
    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-card border border-border/40 rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[300px]">
      {/* Tabs */}
      <div className="flex border-b border-border/15 shrink-0">
        <button 
          onClick={() => { setActivePickerTab("variables"); setSelectedFuncCategory(null); }}
          className={cn("flex-1 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors", activePickerTab === "variables" ? "text-primary bg-primary/5 border-b-2 border-primary" : "text-muted-foreground/40 hover:bg-muted/10")}
        >Variables</button>
        <button 
          onClick={() => { setActivePickerTab("functions"); setSelectedFuncCategory(null); }}
          className={cn("flex-1 px-3 py-2 text-xs font-bold uppercase tracking-widest transition-colors", activePickerTab === "functions" ? "text-primary bg-primary/5 border-b-2 border-primary" : "text-muted-foreground/40 hover:bg-muted/10")}
        >Functions</button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-border/15 bg-foreground/[0.01] shrink-0">
        <Search size={10} className="text-muted-foreground/30" />
        <input
          type="text" value={varSearch} onChange={e => setVarSearch(e.target.value)}
          placeholder={activePickerTab === "variables" ? "Search variables..." : "Search functions..."}
          className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground/20"
          autoFocus
          onKeyDown={e => { if (e.key === 'Escape') setShowVarPicker(false); }}
        />
        <span className="text-xs font-bold text-muted-foreground/20 bg-muted/20 px-1 rounded">F2</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activePickerTab === "variables" ? (
          filteredVars.length === 0 ? (
            <div className="text-xs text-muted-foreground/20 text-center py-3">No matching variables</div>
          ) : filteredVars.map(cat => (
            <div key={cat.category}>
              <div className="text-xs font-black uppercase tracking-[0.15em] text-muted-foreground/30 px-3 py-1.5 bg-foreground/[0.02]">{cat.category}</div>
              {cat.vars.map(v => (
                <button key={v} onClick={() => insertToken(v, true)}
                  className="flex items-center gap-2.5 w-full px-3 py-1.5 text-left hover:bg-primary/5 group transition-colors border-l-2 border-transparent hover:border-primary/40"
                >
                  <Variable size={10} className="text-primary/40 group-hover:text-primary shrink-0" />
                  <span className="text-xs font-mono text-foreground/60 group-hover:text-foreground">{v}</span>
                </button>
              ))}
            </div>
          ))
        ) : (
          /* Functions List */
          <div className="flex flex-col">
            {!selectedFuncCategory ? (
              /* Categories */
              filteredFunctions.map(cat => (
                <button 
                  key={cat.category}
                  onClick={() => setSelectedFuncCategory(cat.category)}
                  className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-primary/5 group transition-colors border-b border-border/5"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-sm">{cat.icon}</span>
                    <span className="text-xs font-semibold text-foreground/70 group-hover:text-foreground">{cat.category}</span>
                  </div>
                  <ChevronRight size={10} className="text-muted-foreground/30 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                </button>
              ))
            ) : (
              /* Items in Category */
              <div className="flex flex-col">
                <button 
                  onClick={() => setSelectedFuncCategory(null)}
                  className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-bold text-primary/60 hover:text-primary hover:bg-primary/5 uppercase tracking-widest border-b border-border/10 sticky top-0 bg-card z-10"
                >
                  <ChevronRight size={10} className="rotate-180" /> Back to Categories
                </button>
                {FUNCTION_LIBRARY.find(c => c.category === selectedFuncCategory)?.items
                  .filter(i => i.name.toLowerCase().includes(varSearch.toLowerCase()) || i.desc.toLowerCase().includes(varSearch.toLowerCase()))
                  .map(item => (
                    <button 
                      key={item.name}
                      onClick={() => insertToken(item.snippet, false)}
                      className="flex flex-col w-full px-4 py-2 text-left hover:bg-primary/5 group transition-colors border-b border-border/5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-primary/70 group-hover:text-primary">{item.name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground/50 group-hover:text-muted-foreground/80 mt-0.5 leading-tight">{item.desc}</span>
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  ) : null;

  if (type === "checkbox") {
    return (
      <div className="flex items-center justify-between py-1">
        <label className="text-xs font-medium text-muted-foreground">{label}:</label>
        <button
          onClick={() => onChange(!value)}
          className={cn(
            "w-8 h-4 rounded-full transition-all relative",
            value ? "bg-primary" : "bg-muted-foreground/20"
          )}
        >
          <div className={cn(
            "w-3 h-3 rounded-full bg-background absolute top-0.5 transition-all shadow-sm",
            value ? "left-[18px]" : "left-[2px]"
          )} />
        </button>
      </div>
    );
  }

  if (type === "select" && options) {
    return (
      <div className="flex flex-col gap-1.5 mb-4">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{label}:</label>
        <select
          value={String(value || options[0])}
          onChange={e => onChange(e.target.value)}
          className="w-full bg-muted/50 border border-border/50 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground/80 outline-none focus:border-primary/40 transition-all cursor-pointer"
        >
          {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
    );
  }

  if (multiline) {
    return (
      <div className="space-y-1 relative">
        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">{label}: {fx && <span className="text-xs text-muted-foreground/40 ml-1">F2 = Variables</span>}</label>
        <div className="flex items-start gap-2">
          {fxBadge}
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={String(value || "")}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 bg-muted/50 border border-border/50 rounded-md px-3 py-2.5 text-sm font-medium text-foreground/80 outline-none focus:border-primary/40 transition-all resize-none h-32 font-mono"
          />
        </div>
        {varPickerUI}
      </div>
    );
  }

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [detectedPages, setDetectedPages] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const content = event.target?.result as string;
          // Very basic PDF page count detection: look for /Type /Pages /Count N
          const match = content.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/);
          if (match && match[1]) {
            const count = parseInt(match[1]);
            setDetectedPages(count);
            if (onFileSelected) {
              // Pass a custom object with count if needed, but for now we'll handle it in Inspector
              (file as any).pageCount = count;
              onFileSelected(file);
            } else {
              onChange(file.name);
            }
          } else {
            setDetectedPages(null);
            if (onFileSelected) onFileSelected(file);
            else onChange(file.name);
          }
        };
        reader.readAsText(file.slice(0, 50000)); // Read first 50KB only
      } else {
        setDetectedPages(null);
        if (onFileSelected) onFileSelected(file);
        else onChange(file.name);
      }
    }
  };

  const isFileField = label.toLowerCase().includes("file") || label.toLowerCase().includes("path") || label.toLowerCase().includes("attachment");

  return (
    <div className="space-y-1 relative">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-muted-foreground/60">{label}: {fx && <span className="text-xs text-muted-foreground/20 ml-1">F2 = Variables</span>}</label>
        {detectedPages !== null && (
          <span className="text-xs font-black bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded animate-in zoom-in duration-300">
            Detected {detectedPages} Pages
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {fxBadge}
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type="text"
          value={String(value || "")}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-card/40 border border-border/40 rounded-md px-2.5 py-1.5 text-sm font-medium text-foreground/80 outline-none focus:border-primary/40 transition-all"
        />
        {isFileField && (
          <>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              onChange={handleFileChange} 
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-sm shrink-0"
              title="Browse local files"
            >
              <FolderOpen size={14} />
            </button>
          </>
        )}
        {onCapture && (
          <button
            onClick={onCapture}
            className="w-7 h-7 flex items-center justify-center rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all shadow-sm shrink-0"
            title="Indicate element on screen"
          >
            <Target size={14} />
          </button>
        )}
      </div>
      {varPickerUI}

      {/* Zoomed Expression Editor Modal */}
      <Dialog open={showZoom} onOpenChange={setShowZoom}>
        <DialogContent className="max-w-[95vw] w-full bg-card/95 backdrop-blur-2xl border-border/40 shadow-2xl p-0 overflow-hidden">
          <div className="flex flex-col h-[85vh]">
            {/* Header */}
            <div className="h-14 px-6 border-b border-border/10 flex items-center justify-between bg-primary/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Sparkles size={16} className="text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-black uppercase tracking-widest text-foreground/80">Expression Editor</h3>
                  <p className="text-xs text-muted-foreground/50 font-bold uppercase tracking-tight">{label}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-xs font-bold text-muted-foreground/30 bg-muted/10 px-2 py-1 rounded">F2 to browse Variables</span>
                 <Button variant="ghost" size="sm" onClick={() => setShowZoom(false)} className="h-8 w-8 p-0">
                    <X size={16} />
                 </Button>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden">
               {/* Left: Variables & Functions Sidebar (Integrated) */}
               <div className="w-72 border-r border-border/10 flex flex-col bg-foreground/[0.01]">
                  <div className="p-4 border-b border-border/10 space-y-3">
                     <div className="flex items-center gap-1 p-1 bg-muted/20 rounded-md">
                        <button 
                          onClick={() => setActivePickerTab("variables")}
                          className={cn("flex-1 py-1.5 text-xs font-black uppercase tracking-widest rounded transition-all", activePickerTab === "variables" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground")}
                        >Variables</button>
                        <button 
                          onClick={() => setActivePickerTab("functions")}
                          className={cn("flex-1 py-1.5 text-xs font-black uppercase tracking-widest rounded transition-all", activePickerTab === "functions" ? "bg-card text-primary shadow-sm" : "text-muted-foreground/40 hover:text-foreground")}
                        >Functions</button>
                     </div>
                     <div className="relative">
                        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                        <Input 
                          placeholder="Search..." 
                          value={varSearch}
                          onChange={(e) => setVarSearch(e.target.value)}
                          className="pl-8 h-8 text-xs bg-card/40 border-border/20 focus:ring-primary/20"
                        />
                     </div>
                  </div>
                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                     {activePickerTab === "variables" ? (
                        filteredVars.map(cat => (
                          <div key={cat.category}>
                            <div className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground/30 px-4 py-2 bg-foreground/[0.02]">{cat.category}</div>
                            {cat.vars.map(v => (
                              <button key={v} onClick={() => insertToken(v, true)}
                                className="flex items-center gap-3 w-full px-4 py-2 text-left hover:bg-primary/5 group transition-colors"
                              >
                                <Variable size={12} className="text-primary/40 group-hover:text-primary shrink-0" />
                                <span className="text-xs font-mono text-foreground/60 group-hover:text-foreground truncate">{v}</span>
                              </button>
                            ))}
                          </div>
                        ))
                     ) : (
                        <div className="flex flex-col">
                           {selectedFuncCategory ? (
                              <div className="flex flex-col">
                                 <button 
                                   onClick={() => setSelectedFuncCategory(null)}
                                   className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-primary/60 hover:text-primary hover:bg-primary/5 uppercase tracking-widest border-b border-border/10"
                                 >
                                   <ChevronRight size={12} className="rotate-180" /> Categories
                                 </button>
                                 {FUNCTION_LIBRARY.find(c => c.category === selectedFuncCategory)?.items
                                   .filter(i => i.name.toLowerCase().includes(varSearch.toLowerCase()))
                                   .map(item => (
                                     <button key={item.name} onClick={() => insertToken(item.snippet, false)} className="px-4 py-3 text-left hover:bg-primary/5 border-b border-border/5 group">
                                       <div className="text-xs font-mono font-bold text-primary/70 group-hover:text-primary mb-1">{item.name}</div>
                                       <div className="text-xs text-muted-foreground/40 leading-tight">{item.desc}</div>
                                     </button>
                                   ))
                                 }
                              </div>
                           ) : (
                              filteredFunctions.map(cat => (
                                <button key={cat.category} onClick={() => setSelectedFuncCategory(cat.category)} className="flex items-center justify-between w-full px-4 py-3 hover:bg-primary/5 border-b border-border/5 group">
                                  <div className="flex items-center gap-3">
                                    <span className="text-base">{cat.icon}</span>
                                    <span className="text-xs font-bold text-foreground/70 group-hover:text-foreground">{cat.category}</span>
                                  </div>
                                  <ChevronRight size={12} className="text-muted-foreground/20 group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                                </button>
                              ))
                           )}
                        </div>
                     )}
                  </div>
               </div>

               {/* Right: Large Editor */}
               <div className="flex-1 flex flex-col p-6 bg-card/20 relative">
                  <div className="absolute top-2 right-6">
                     <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/20">Power Editor Mode</span>
                  </div>
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={String(value || "")}
                    onChange={e => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter expression here... e.g. Sum({{var1}}, 10) * 2"
                    className="flex-1 bg-transparent text-xl font-mono text-primary/90 outline-none resize-none placeholder:text-muted-foreground/10 leading-relaxed scroll-smooth"
                    autoFocus
                  />
                  <div className="h-14 flex items-center justify-between mt-4 border-t border-border/10 pt-4 shrink-0">
                     <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                           <span className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Syntax OK</span>
                        </div>
                        <div className="text-xs font-bold text-muted-foreground/30 uppercase tracking-tight">
                           Characters: <span className="text-foreground/40">{String(value || "").length}</span>
                        </div>
                     </div>
                     <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => setShowZoom(false)} className="text-xs font-black uppercase tracking-widest h-9 px-6 border border-border bg-muted/50 hover:bg-muted rounded-sm">Close Editor</Button>
                        <Button onClick={() => setShowZoom(false)} className="bg-primary text-white text-xs font-black uppercase tracking-widest h-9 px-8 rounded-sm shadow-lg shadow-primary/20">Apply Changes</Button>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}


export function StudioInspector({ 
  selectedNode, 
  onUpdate, 
  onDelete, 
  collapsed = false, 
  variables = [],
  onStartRecording,
  isRecording = false,
  onCapture,
  projectId
}: { 
  selectedNode: any; 
  onUpdate: (data: any) => void; 
  onDelete: (id: string) => void;
  collapsed?: boolean;
  variables?: any[];
  onStartRecording?: () => void;
  isRecording?: boolean;
  onCapture?: (propName: string) => void;
  projectId?: string;
}) {
  const [activeTab, setActiveTab] = useState<'properties' | 'data' | 'risk' | 'execution'>('properties');
  const [localLabel, setLocalLabel] = useState(selectedNode?.data?.label || "");
  const [projectAssets, setProjectAssets] = useState<any[]>([]);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (projectId) {
      getAssets(projectId).then(setProjectAssets).catch(console.error);
    }
  }, [projectId]);

  useEffect(() => {
    setLocalLabel(selectedNode?.data?.label || "");
  }, [selectedNode?.id, selectedNode?.data?.label]);

  if (!selectedNode) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-transparent animate-in fade-in duration-500">
        <div className="w-16 h-16 rounded-full bg-primary/5 flex items-center justify-center text-primary/20 mb-4 animate-pulse">
          <Activity size={32} />
        </div>
        <h3 className="text-sm font-bold text-foreground/40 uppercase tracking-widest">No Node Selected</h3>
        <p className="text-xs text-muted-foreground/30 mt-2 max-w-[180px]">
          Select an activity on the canvas to configure its properties and data mappings.
        </p>
      </div>
    );
  }

  const handleUpdate = (updates: any) => {
    onUpdate({ ...selectedNode.data, ...updates });
  };

  const handlePropertyChange = (section: 'inputs' | 'outputs' | 'properties', key: string, value: any) => {
    const currentSection = selectedNode.data[section] || {};
    handleUpdate({
      [section]: { ...currentSection, [key]: value }
    });
  };

  const tabs = [
    { id: "properties", label: "Properties", icon: Settings2 },
    { id: "data", label: "Data Mapping", icon: Database },
    { id: "risk", label: "Risk Profile", icon: ShieldAlert },
    { id: "execution", label: "Execution", icon: Zap },
  ];

  if (collapsed) {
    return (
      <div className="flex flex-col items-center py-4 gap-4 bg-card/40 border-l border-border/40 h-full">
         {tabs.map(tab => (
           <button 
             key={tab.id}
             onClick={() => setActiveTab(tab.id as any)}
             className={cn("p-2 rounded-lg transition-all", activeTab === tab.id ? "bg-primary/10 text-primary" : "text-muted-foreground/30 hover:text-primary/40")}
           >
             <tab.icon size={18} />
           </button>
         ))}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-transparent overflow-hidden font-sans">
      {/* Header */}
      <div className="h-14 border-b border-border/40 flex items-center justify-between px-4 shrink-0 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
            <Activity size={12} className="text-primary" />
          </div>
          <span className="text-sm font-bold text-foreground/90 truncate max-w-[180px]">{localLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {onStartRecording && (
            <button 
              onClick={onStartRecording}
              className={cn(
                "p-1.5 rounded-full transition-all",
                isRecording ? "text-red-500 bg-red-50" : "text-muted-foreground/40 hover:bg-primary/5 hover:text-primary"
              )}
              title={isRecording ? "Recording in progress..." : "Start Recording"}
            >
              <Video size={14} className={isRecording ? "animate-pulse" : ""} />
            </button>
          )}
          <button onClick={() => onDelete(selectedNode.id)} className="p-1.5 rounded-full hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-all">
            <Trash size={14} />
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-border/40 px-2 shrink-0 bg-card/20">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-1 py-3 text-xs font-black uppercase tracking-widest transition-all relative",
              activeTab === tab.id ? "text-primary" : "text-muted-foreground/40 hover:text-foreground/60"
            )}
          >
            {tab.label}
            {activeTab === tab.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-20 space-y-6">
        
        {/* --- Main Properties Tab --- */}
        {activeTab === 'properties' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Display Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Activity Name</label>
              <input
                type="text"
                value={localLabel}
                onChange={e => { setLocalLabel(e.target.value); handleUpdate({ label: e.target.value }); }}
                className="w-full bg-primary/5 border border-border/40 rounded-lg px-3 py-2 text-sm font-bold text-foreground/80 outline-none focus:border-primary/40 transition-all"
              />
            </div>

            {/* Dynamic Inputs Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                <div className="w-2 h-2 rounded-full bg-primary/40" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60">Input Arguments</span>
              </div>
              <div className="space-y-4">
                {Object.entries(selectedNode.data.inputs || {}).map(([key, val]) => {
                  const isGetAsset = selectedNode.data.subType === 'getAsset' && key === 'assetName';
                  return (
                    <PropertyField 
                      key={key} 
                      label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} 
                      value={val as any} 
                      type={isGetAsset ? "select" : undefined}
                      options={isGetAsset ? projectAssets.map(a => a.name) : undefined}
                      onChange={v => handlePropertyChange('inputs', key, v)}
                      onCapture={onCapture ? () => onCapture(key) : undefined}
                      onFileSelected={(file) => {
                        // Unified update to prevent race conditions
                        const currentInputs = selectedNode.data.inputs || {};
                        const newInputs = { ...currentInputs, [key]: file.name };
                        
                        const rangeKey = Object.keys(newInputs).find(k => 
                          k.toLowerCase().includes("range") || k.toLowerCase().includes("pages")
                        );
                        
                        if (rangeKey) {
                          const count = (file as any).pageCount;
                          newInputs[rangeKey] = count ? `1-${count}` : "All";
                        }
                        
                        handleUpdate({ inputs: newInputs });
                      }}
                      fx={!isGetAsset}
                      variables={variables}
                    />
                  );
                })}
                {(!selectedNode.data.inputs || Object.keys(selectedNode.data.inputs).length === 0) && (
                  <p className="text-xs text-muted-foreground/40  pl-1">No inputs required for this activity.</p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/40">Description</label>
              <textarea
                value={selectedNode.data.description || ""}
                onChange={e => handleUpdate({ description: e.target.value })}
                placeholder="Business context..."
                className="w-full h-20 bg-primary/5 border border-border/40 rounded-lg px-3 py-2 text-xs text-foreground/70 outline-none focus:border-primary/40 transition-all resize-none"
              />
            </div>
          </div>
        )}

        {/* --- Data Mapping Tab --- */}
        {activeTab === 'data' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
             {/* Dynamic Outputs Section */}
             <div className="space-y-3">
              <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500/40" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60">Result Outputs</span>
              </div>
              <div className="space-y-4">
                {Object.entries(selectedNode.data.outputs || {}).map(([key, val]) => (
                  <PropertyField 
                    key={key} 
                    label={`Store ${key.replace(/([A-Z])/g, ' $1').toLowerCase()} In:`} 
                    value={val as any} 
                    placeholder="variable_name"
                    onChange={v => handlePropertyChange('outputs', key, v)}
                    fx
                    variables={variables}
                  />
                ))}
                {(!selectedNode.data.outputs || Object.keys(selectedNode.data.outputs).length === 0) && (
                  <p className="text-xs text-muted-foreground/40  pl-1">This activity does not return data.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* --- Risk Profile Tab --- */}
        {activeTab === 'risk' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            {/* Risk Master Toggle */}
            <div className="bg-card border border-border/40 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  selectedNode.data.risk?.disabled ? "bg-muted text-muted-foreground" : "bg-rose-500/10 text-rose-500"
                )}>
                  {selectedNode.data.risk?.disabled ? <ShieldOff size={20} /> : <ShieldAlert size={20} />}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-foreground">Risk Governance</span>
                  <span className="text-xs text-muted-foreground/60 font-medium">
                    {selectedNode.data.risk?.disabled ? "Risk profiling is currently disabled" : "Active risk assessment tracking"}
                  </span>
                </div>
              </div>
              <button 
                onClick={() => handleUpdate({ risk: { ...(selectedNode.data.risk || { level: 'LOW' }), disabled: !selectedNode.data.risk?.disabled } })}
                className={cn(
                  "w-10 h-5 rounded-full transition-all relative",
                  selectedNode.data.risk?.disabled ? "bg-muted-foreground/20" : "bg-primary"
                )}
              >
                <div className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-background transition-all shadow-sm",
                  selectedNode.data.risk?.disabled ? "left-0.5" : "left-[22px]"
                )} />
              </button>
            </div>

            {!selectedNode.data.risk?.disabled ? (
              <div className="bg-rose-500/5 border border-rose-500/10 rounded-2xl p-6 space-y-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                  <ShieldAlert size={80} className="text-rose-500" />
                </div>

                <div className="space-y-1">
                    <h3 className="text-sm font-bold text-foreground tracking-tight">Governance Assessment</h3>
                    <p className="text-xs text-muted-foreground/60 font-medium">Configure risk level and compliance strategy for this activity.</p>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-0.5">Risk Exposure Level</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['LOW', 'MEDIUM', 'HIGH'].map((level) => (
                          <button
                            key={level}
                            onClick={() => handleUpdate({ risk: { ...selectedNode.data.risk, level: level as any, rpn: (level === 'HIGH' ? 15 : level === 'MEDIUM' ? 8 : 2) } })}
                            className={cn(
                              "py-2 rounded-xl border text-xs font-black transition-all",
                              selectedNode.data.risk?.level === level 
                                ? level === 'HIGH' ? "bg-rose-500 border-rose-600 text-white shadow-lg shadow-rose-500/20" 
                                  : level === 'MEDIUM' ? "bg-amber-500 border-amber-600 text-white shadow-lg shadow-amber-500/20"
                                  : "bg-emerald-500 border-emerald-600 text-white shadow-lg shadow-emerald-500/20"
                                : "bg-background border-border/40 text-muted-foreground/40 hover:border-primary/20 hover:text-primary"
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-0.5">Risk Category</label>
                      <select 
                        value={selectedNode.data.risk?.category || 'Operational'}
                        onChange={(e) => handleUpdate({ risk: { ...selectedNode.data.risk, category: e.target.value as any } })}
                        className="w-full bg-card border border-border/40 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 transition-all"
                      >
                        <option value="Financial">Financial Risk</option>
                        <option value="Operational">Operational Risk</option>
                        <option value="Security">Security Risk</option>
                        <option value="Compliance">Compliance Risk</option>
                        <option value="Data">Data Privacy Risk</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-black uppercase tracking-widest text-muted-foreground/60 ml-0.5">Mitigation Description</label>
                      <textarea 
                        value={selectedNode.data.risk?.why || ""}
                        onChange={(e) => handleUpdate({ risk: { ...selectedNode.data.risk, why: e.target.value } })}
                        placeholder="Explain why this risk level was assigned and how it's being mitigated..."
                        className="w-full h-24 bg-card border border-border/40 rounded-xl px-4 py-3 text-xs text-foreground/70 outline-none focus:ring-2 focus:ring-primary/10 transition-all resize-none  leading-relaxed"
                      />
                    </div>
                </div>

                <div className="pt-4 border-t border-rose-500/10 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[8px] font-black uppercase text-muted-foreground/40 tracking-widest">Calculated RPN</span>
                      <span className={cn(
                        "text-lg font-black tracking-tight",
                        selectedNode.data.risk?.level === 'HIGH' ? "text-rose-500" : "text-primary"
                      )}>
                        {selectedNode.data.risk?.rpn || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/5 border border-primary/10">
                      <Scale size={10} className="text-primary" />
                      <span className="text-xs font-bold text-primary/70 uppercase">Governance Ready</span>
                    </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-muted/5 border border-dashed border-border/40 rounded-2xl animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 rounded-full bg-muted/10 flex items-center justify-center text-muted-foreground/20 mb-4">
                  <ShieldOff size={32} />
                </div>
                <h3 className="text-sm font-bold text-foreground/40 uppercase tracking-widest">Risk Analysis Suspended</h3>
                <p className="text-xs text-muted-foreground/30 mt-2 max-w-[220px]">
                  Risk tracking has been disabled for this activity. It will not be flagged during compliance audits or runtime risk monitoring.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleUpdate({ risk: { ...selectedNode.data.risk, disabled: false } })}
                  className="mt-6 h-8 text-xs font-black uppercase tracking-widest border-primary/20 text-primary/60 hover:bg-primary/5"
                >
                  Restore Risk Tracking
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40 flex items-center gap-2">
                <History size={14} /> Audit Trail
              </h4>
              <div className="bg-muted/10 border border-dashed border-border/40 rounded-2xl p-6 text-center space-y-2">
                 <p className="text-xs text-muted-foreground/40 font-medium">No recent risk modifications detected for this node.</p>
                 <Button variant="ghost" size="sm" className="h-7 text-xs font-bold uppercase tracking-widest text-primary/60">View Full Log</Button>
              </div>
            </div>
          </div>
        )}

        {/* --- Execution Governance Tab --- */}
        {activeTab === 'execution' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-2 duration-300">
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                <div className="w-2 h-2 rounded-full bg-amber-500/40" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60">Retry Policy</span>
              </div>
              <div className="space-y-4 pl-1">
                <PropertyField 
                  label="Retry Count" 
                  value={selectedNode.data.properties?.retryCount || 0} 
                  onChange={v => handlePropertyChange('properties', 'retryCount', parseInt(v) || 0)} 
                />
                <PropertyField 
                  label="Retry Interval (ms)" 
                  value={selectedNode.data.properties?.retryInterval || 2000} 
                  onChange={v => handlePropertyChange('properties', 'retryInterval', parseInt(v) || 0)} 
                />
                <PropertyField 
                  label="Continue On Error" 
                  type="checkbox" 
                  value={selectedNode.data.properties?.continueOnError} 
                  onChange={v => handlePropertyChange('properties', 'continueOnError', v)} 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500/40" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60">Timing & Performance</span>
              </div>
              <div className="space-y-4 pl-1">
                <PropertyField 
                  label="Timeout (ms)" 
                  value={selectedNode.data.properties?.timeout || 30000} 
                  onChange={v => handlePropertyChange('properties', 'timeout', parseInt(v) || 0)} 
                />
                <PropertyField 
                  label="Delay Before (ms)" 
                  value={selectedNode.data.properties?.delayBefore || 0} 
                  onChange={v => handlePropertyChange('properties', 'delayBefore', parseInt(v) || 0)} 
                />
                <PropertyField 
                  label="Delay After (ms)" 
                  value={selectedNode.data.properties?.delayAfter || 0} 
                  onChange={v => handlePropertyChange('properties', 'delayAfter', parseInt(v) || 0)} 
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-border/10 pb-2">
                <div className="w-2 h-2 rounded-full bg-purple-500/40" />
                <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/60">Governance & Logs</span>
              </div>
              <div className="space-y-4 pl-1">
                <PropertyField 
                  label="Log Level" 
                  type="select" 
                  value={selectedNode.data.properties?.logLevel || "Info"} 
                  options={["Verbose", "Debug", "Info", "Warning", "Error"]}
                  onChange={v => handlePropertyChange('properties', 'logLevel', v)} 
                />
                <PropertyField 
                  label="Screenshot on Failure" 
                  type="checkbox" 
                  value={selectedNode.data.properties?.takeScreenshotOnError} 
                  onChange={v => handlePropertyChange('properties', 'takeScreenshotOnError', v)} 
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      {!collapsed && (
        <div className="border-t border-border/40 p-3 space-y-2 bg-card/20">
          <button className="flex items-center justify-center gap-2 w-full py-2 rounded-sm bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 transition-all group">
            <Sparkles size={13} className="text-emerald-500" />
            <span className="text-xs font-semibold text-emerald-500">Auto-Map Variables</span>
          </button>
          <button className="flex items-center justify-center gap-2 w-full py-2 rounded-sm bg-card/40 hover:bg-card/60 border border-border/30 transition-all group">
            <MapIcon size={13} className="text-muted-foreground/50 group-hover:text-primary transition-colors" />
            <span className="text-xs font-semibold text-foreground/50 group-hover:text-foreground transition-colors">Show Variable Lineage Map</span>
          </button>
        </div>
      )}
    </div>
  );
}

// End of StudioInspector component


/* ======================================================================
   BOTTOM DOCK — Expression Profiler + Event Logs + Variables + Snapshots
   ====================================================================== */
export function StudioDock({ 
  variables = [], 
  setVariables, 
  arguments: arguments_ = [], 
  setArguments,
  logs = [],
  setLogs,
  snapshots = [],
  setSnapshots,
  nodes = [],
  setNodes
}: { 
  variables?: any[]; 
  setVariables?: React.Dispatch<React.SetStateAction<any[]>>;
  arguments?: any[];
  setArguments?: React.Dispatch<React.SetStateAction<any[]>>;
  logs?: any[];
  setLogs?: React.Dispatch<React.SetStateAction<any[]>>;
  snapshots?: any[];
  setSnapshots?: React.Dispatch<React.SetStateAction<any[]>>;
  nodes?: any[];
  setNodes?: React.Dispatch<React.SetStateAction<any[]>>;
}) {
  const [activeDockTab, setActiveDockTab] = React.useState("variables");
  const [testExpression, setTestExpression] = useState('');
  const [sampleInput, setSampleInput] = useState('');
  const [expressionResult, setExpressionResult] = useState<string | null>(null);

  const variableTypes = ["String", "Int32", "Int64", "Double", "Boolean", "DateTime", "DataTable", "Object", "Array<String>", "Array<Object>", "Dictionary", "JObject", "SecureString"];
  const scopeTypes = ["Local", "Global", "Input", "Output"];

  const addVariable = () => {
    if (setVariables) setVariables(prev => [...prev, { name: `var_${Date.now().toString(36)}`, type: "String", scope: "Local", value: "" }]);
  };

  const addArgument = () => {
    if (setArguments) setArguments(prev => [...prev, { name: `in_NewArg`, direction: "In", type: "String", defaultValue: "" }]);
  };

  const renameVariableInNodes = (oldName: string, newName: string) => {
    if (!oldName || !newName || oldName === newName) return;
    
    if (setNodes) {
      setNodes(nds => nds.map(node => {
        let changed = false;

        const updateValue = (val: any): any => {
          if (typeof val === 'string') {
            // 1. Exact match (for variable selection fields)
            if (val === oldName) {
              changed = true;
              return newName;
            }
            // 2. Expression token match (for {variable} patterns)
            if (val.includes(`{${oldName}}`)) {
              changed = true;
              // Use split/join for safe replacement without regex escaping issues
              return val.split(`{${oldName}}`).join(`{${newName}}`);
            }
            return val;
          }
          
          if (Array.isArray(val)) {
            const nextArr = val.map(updateValue);
            return nextArr;
          }
          
          if (val !== null && typeof val === 'object') {
            const nextObj: any = {};
            let objChanged = false;
            Object.keys(val).forEach(k => {
              const prevV = val[k];
              const nextV = updateValue(prevV);
              if (prevV !== nextV) objChanged = true;
              nextObj[k] = nextV;
            });
            return objChanged ? nextObj : val;
          }
          
          return val;
        };

        const newData = updateValue(node.data);
        return changed ? { ...node, data: newData } : node;
      }));
    }
  };

  const updateVariable = (idx: number, field: string, value: string) => {
    if (setVariables) {
      setVariables(prev => {
        const oldVar = prev[idx];
        const newVars = prev.map((v, i) => {
          if (i === idx) {
            let newName = field === 'name' ? value : v.name;
            if (field === 'type') {
              const typePrefixes: Record<string, string> = {
                "String": "str", "Int32": "int", "Int64": "int", "Double": "dbl",
                "Boolean": "bool", "DateTime": "date", "DataTable": "dt",
                "Object": "obj", "Array": "list", "Dictionary": "dict",
                "JObject": "json", "SecureString": "sec"
              };
              const prefix = Object.entries(typePrefixes).find(([k]) => value.includes(k))?.[1] || "";
              if (prefix) {
                let baseName = v.name;
                
                // Strip default 'var_' prefix if present
                if (baseName.startsWith("var_")) {
                  baseName = baseName.substring(4);
                }

                const allPrefixes = Object.values(typePrefixes);
                for (const p of allPrefixes) {
                  if (baseName.startsWith(p) && baseName.length > p.length && /^[A-Z_]/.test(baseName.charAt(p.length))) {
                    baseName = baseName.substring(p.length);
                    break;
                  }
                }
                
                // Clean up any leading underscores
                baseName = baseName.replace(/^_+/, "");
                
                if (baseName) {
                  newName = prefix ? (prefix + "_" + baseName) : baseName;
                } else {
                  newName = (prefix || "var") + "_" + Math.random().toString(36).substring(7);
                }
              }
            }
            return { ...v, [field]: value, name: newName };
          }
          return v;
        });

        if (field === 'name' || (field === 'type' && newVars[idx].name !== oldVar.name)) {
          renameVariableInNodes(oldVar.name, newVars[idx].name);
        }
        return newVars;
      });
    }
  };

  const deleteVariable = (idx: number) => {
    if (setVariables) setVariables(prev => prev.filter((_, i) => i !== idx));
  };

  const updateArgument = (idx: number, field: string, value: string) => {
    if (setArguments) {
      setArguments(prev => {
        const oldArg = prev[idx];
        const newArgs = prev.map((a, i) => {
          if (i === idx) {
            let newName = field === 'name' ? value : a.name;
            if (field === 'type') {
              const dirPrefix = a.direction === "In" ? "in_" : a.direction === "Out" ? "out_" : "io_";
              const typePrefixes: Record<string, string> = {
                "String": "str", "Int32": "int", "Int64": "int", "Double": "dbl",
                "Boolean": "bool", "DateTime": "date", "DataTable": "dt",
                "Object": "obj", "Array": "list", "Dictionary": "dict"
              };
              const tPrefix = Object.entries(typePrefixes).find(([k]) => value.includes(k))?.[1] || "";
              
              // Strip existing prefix parts
              // Strip existing prefix parts
              let baseName = a.name.replace(/^(in_|out_|io_)/, "");
              
              // Also strip 'var_' if it somehow ended up here
              if (baseName.startsWith("var_")) {
                baseName = baseName.substring(4);
              }

              const allTPrefixes = Object.values(typePrefixes);
              for (const p of allTPrefixes) {
                if (baseName.startsWith(p) && baseName.length > p.length && /^[A-Z_]/.test(baseName.charAt(p.length))) {
                  baseName = baseName.substring(p.length);
                  break;
                }
              }
              
              baseName = baseName.replace(/^_+/, "");

              if (baseName) {
                newName = dirPrefix + (tPrefix ? (tPrefix + "_" + baseName) : baseName);
              } else {
                newName = dirPrefix + (tPrefix || "arg") + "_" + Math.random().toString(36).substring(7);
              }
            }
            return { ...a, [field]: value, name: newName };
          }
          return a;
        });

        const newArg = newArgs[idx];
        if (field === 'name' || (field === 'type' && newArg.name !== oldArg.name)) {
          renameVariableInNodes(oldArg.name, newArg.name);
        }
        return newArgs;
      });
    }
  };

  const deleteArgument = (idx: number) => {
    if (setArguments) setArguments(prev => prev.filter((_, i) => i !== idx));
  };

  const tabs = [
    { id: "variables", label: "Variables", icon: Variable },
    { id: "arguments", label: "Arguments", icon: ArrowRightLeft },
    { id: "profiler", label: "Logic Editor", icon: Wand2 },
    { id: "logs", label: "Event Logs", icon: Terminal },
    { id: "snapshots", label: "Snapshots", icon: Camera },
  ];

  const maskSensitiveData = (data: any): any => {
    if (!data || typeof data !== 'object') return data;
    if (data._isPassword) return "********";
    if (Array.isArray(data)) return data.map(maskSensitiveData);
    const masked: any = {};
    Object.keys(data).forEach(k => {
      masked[k] = maskSensitiveData(data[k]);
    });
    return masked;
  };

  const getVariableDisplayValue = (val: any) => {
    if (val && typeof val === 'object' && val._isPassword) return "********";
    if (typeof val === 'object') return JSON.stringify(maskSensitiveData(val));
    return String(val);
  };

  return (
    <div className="flex flex-col h-full bg-card text-foreground font-sans">
      {/* Tab Bar */}
      <div className="flex items-center justify-between border-b border-border/40 px-4 shrink-0 bg-primary/5">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveDockTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all relative",
                activeDockTab === tab.id ? "text-primary" : "text-muted-foreground/50 hover:text-primary/70"
              )}
            >
              <tab.icon size={14} />
              {tab.label}
              {tab.id === "variables" && variables.length > 0 && <span className="text-xs text-muted-foreground/40 ml-1 font-mono">{variables.length}</span>}
              {tab.id === "arguments" && arguments_.length > 0 && <span className="text-xs text-muted-foreground/40 ml-1 font-mono">{arguments_.length}</span>}
              {tab.id === "snapshots" && snapshots.length > 0 && <span className="text-xs text-muted-foreground/40 ml-1 font-mono">{snapshots.length}</span>}
              {activeDockTab === tab.id && <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-t-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {/* --- Variables Tab --- */}
        {activeDockTab === "variables" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
              <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-wider">{variables.length} Variables</span>
              <Button onClick={addVariable} variant="ghost" size="sm" className="h-6 text-xs font-semibold text-primary hover:bg-primary/5 rounded-full px-3 gap-1">
                <Plus size={10} /> Add Variable
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground/40 border-b border-border/40 sticky top-0 bg-card/60 backdrop-blur-sm">
                    <th className="py-2 px-3 w-8"></th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3 w-32">Type</th>
                    <th className="py-2 px-3 w-24">Scope</th>
                    <th className="py-2 px-3">Default Value</th>
                    <th className="py-2 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {variables.map((row, i) => (
                    <tr key={i} className="border-b border-border/10 hover:bg-card/40 transition-all group">
                      <td className="py-1.5 px-3 text-center">
                        <div className={cn("w-2 h-2 rounded-full", row.scope === "Input" ? "bg-emerald-400" : row.scope === "Output" ? "bg-amber-400" : row.scope === "Global" ? "bg-blue-400" : "bg-muted-foreground/20")} />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          value={row.name}
                          onChange={e => updateVariable(i, 'name', e.target.value)}
                          className="bg-transparent border-none outline-none text-xs font-mono font-medium text-foreground/80 w-full focus:bg-primary/5 rounded px-1 -ml-1"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <select
                          value={row.type}
                          onChange={e => updateVariable(i, 'type', e.target.value)}
                          className="bg-card/60 border border-border/30 rounded text-xs font-mono text-muted-foreground/60 px-1.5 py-0.5 outline-none focus:border-primary/40 w-full"
                        >
                          {variableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 px-3">
                        <select
                          value={row.scope}
                          onChange={e => updateVariable(i, 'scope', e.target.value)}
                          className="bg-card/60 border border-border/30 rounded text-xs font-semibold px-1.5 py-0.5 outline-none focus:border-primary/40 w-full text-primary/60"
                        >
                          {scopeTypes.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          value={getVariableDisplayValue(row.value)}
                          onChange={e => updateVariable(i, 'value', e.target.value)}
                          placeholder="—"
                          className="bg-transparent border-none outline-none text-xs font-mono text-primary/60 w-full focus:bg-primary/5 rounded px-1 -ml-1 placeholder:text-muted-foreground/20"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <button onClick={() => deleteVariable(i)} className="opacity-0 group-hover:opacity-100 text-rose-400/60 hover:text-rose-400 transition-all">
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- Arguments Tab --- */}
        {activeDockTab === "arguments" && (
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2 border-b border-border/20">
              <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-wider">{arguments_.length} Arguments</span>
              <Button onClick={addArgument} variant="ghost" size="sm" className="h-6 text-xs font-semibold text-primary hover:bg-primary/5 rounded-full px-3 gap-1">
                <Plus size={10} /> Add Argument
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs font-bold uppercase tracking-wider text-muted-foreground/40 border-b border-border/40 sticky top-0 bg-card/60 backdrop-blur-sm">
                    <th className="py-2 px-3 w-8"></th>
                    <th className="py-2 px-3">Name</th>
                    <th className="py-2 px-3 w-24">Direction</th>
                    <th className="py-2 px-3 w-32">Type</th>
                    <th className="py-2 px-3">Default Value</th>
                    <th className="py-2 px-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {arguments_.map((arg, i) => (
                    <tr key={i} className="border-b border-border/10 hover:bg-card/40 transition-all group">
                      <td className="py-1.5 px-3 text-center">
                        <div className={cn("w-2 h-2 rounded-full", arg.direction === "In" ? "bg-emerald-400" : arg.direction === "Out" ? "bg-amber-400" : "bg-blue-400")} />
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          value={arg.name}
                          onChange={e => updateArgument(i, 'name', e.target.value)}
                          className="bg-transparent border-none outline-none text-xs font-mono font-medium text-foreground/80 w-full focus:bg-primary/5 rounded px-1 -ml-1"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <select
                          value={arg.direction}
                          onChange={e => updateArgument(i, 'direction', e.target.value)}
                          className="bg-card/60 border border-border/30 rounded text-xs font-semibold px-1.5 py-0.5 outline-none focus:border-primary/40 w-full text-primary/60"
                        >
                          <option value="In">In</option>
                          <option value="Out">Out</option>
                          <option value="In/Out">In/Out</option>
                        </select>
                      </td>
                      <td className="py-1.5 px-3">
                        <select
                          value={arg.type}
                          onChange={e => updateArgument(i, 'type', e.target.value)}
                          className="bg-card/60 border border-border/30 rounded text-xs font-mono text-muted-foreground/60 px-1.5 py-0.5 outline-none focus:border-primary/40 w-full"
                        >
                          {variableTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </td>
                      <td className="py-1.5 px-3">
                        <input
                          value={arg.defaultValue}
                          onChange={e => updateArgument(i, 'defaultValue', e.target.value)}
                          placeholder="—"
                          className="bg-transparent border-none outline-none text-xs font-mono text-primary/60 w-full focus:bg-primary/5 rounded px-1 -ml-1 placeholder:text-muted-foreground/20"
                        />
                      </td>
                      <td className="py-1.5 px-3">
                        <button onClick={() => deleteArgument(i)} className="opacity-0 group-hover:opacity-100 text-rose-400/60 hover:text-rose-400 transition-all">
                          <X size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeDockTab === "profiler" && (
          <div className="flex h-full divide-x divide-border/40">
            {/* Left: Expression Input */}
            <div className="flex-1 flex flex-col p-4 space-y-3 min-w-0">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={13} className="text-amber-500" />
                  <span className="text-xs font-semibold text-foreground/60">Test Expression:</span>
                </div>
                <input
                  type="text"
                  value={testExpression}
                  onChange={e => setTestExpression(e.target.value)}
                  placeholder="Enter an expression to evaluate..."
                  className="w-full bg-card/60 border border-border/40 rounded-sm px-3 py-2 text-sm font-mono text-foreground/80 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/20"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Settings2 size={13} className="text-muted-foreground/40" />
                  <span className="text-xs font-semibold text-foreground/60">Sample Input Data (Paste JSON/Text):</span>
                </div>
                <textarea
                  value={sampleInput}
                  onChange={e => setSampleInput(e.target.value)}
                  placeholder="Paste your test data here..."
                  className="w-full h-16 bg-card/60 border border-border/40 rounded-sm px-3 py-2 text-xs font-mono text-foreground/60 outline-none resize-none placeholder:text-muted-foreground/20 focus:border-primary/40 transition-all"
                />
              </div>
            </div>

            {/* Right: Output Preview */}
            <div className="w-[300px] flex flex-col p-4 space-y-2 shrink-0">
              <span className="text-xs font-semibold text-foreground/60">Output Preview:</span>
              <div className="flex-1 bg-card/60 border border-border/40 rounded-sm p-3 font-mono text-[13px] text-foreground/30 flex items-center justify-center">
                {expressionResult || <span className="text-xs ">Enter an expression to see results</span>}
              </div>
            </div>
          </div>
        )}

        {activeDockTab === "logs" && (
          <div className="p-4 space-y-2 overflow-y-auto h-full custom-scrollbar">
            {logs.map((log, i) => (
              <div key={i} className="flex items-start gap-3 py-1.5 font-mono text-xs group hover:bg-card/40 rounded px-2 transition-all">
                <span className="text-muted-foreground/30 tabular-nums shrink-0">{log.time}</span>
                <span className={cn(
                  "font-bold shrink-0 uppercase text-xs px-1.5 py-0.5 rounded",
                  log.status === "SUCCESS" || log.status === "success" ? "text-emerald-400 bg-emerald-500/10" :
                  log.status === "WARN" || log.status === "warn" ? "text-amber-400 bg-amber-500/10" :
                  log.status === "ERROR" || log.status === "error" ? "text-rose-400 bg-rose-500/10" :
                  "text-blue-400 bg-blue-500/10"
                )}>
                  {log.status || "INFO"}
                </span>
                <span className="text-foreground/60 truncate">{log.label || log.msg}</span>
              </div>
            ))}
          </div>
        )}

        {activeDockTab === "snapshots" && (
          <div className="p-4 h-full overflow-y-auto custom-scrollbar">
            {snapshots.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-sm bg-foreground/5 flex items-center justify-center mx-auto">
                    <Camera size={24} className="text-muted-foreground/20" />
                  </div>
                  <p className="text-xs text-muted-foreground/30">No snapshots captured yet. Screenshots are taken automatically on failures.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-4">
                {snapshots.map((snap, i) => (
                  <div key={i} className="group relative aspect-video bg-muted/20 border border-border/40 rounded overflow-hidden hover:border-primary/40 transition-all cursor-pointer">
                    <img src={snap.url} alt={snap.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                       <span className="text-xs font-bold text-white truncate">{snap.name}</span>
                       <span className="text-xs text-white/60 tabular-nums">{snap.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}




/* ======================================================================
   FLOW TOOLS & FORMATTING PANELS
   ====================================================================== */

export function FlowToolsPanel({ onEdgeTypeChange }: { onEdgeTypeChange?: (type: string) => void }) {
  const bpmTools = [
    { icon: CirclePlay, label: "Start", dragType: JSON.stringify({ type: "event", subType: "start", label: "Start Flow", icon: "CirclePlay" }), help: "Flow entry point" },
    { icon: CircleStop, label: "End", dragType: JSON.stringify({ type: "event", subType: "end", label: "End Flow", icon: "CircleStop" }), help: "Flow exit point" },
    { icon: TimerIcon, label: "Wait", dragType: JSON.stringify({ type: "event", subType: "intermediate", label: "Wait Event", icon: "Timer" }), help: "Wait for event" },
    { icon: Split, label: "Decision", dragType: JSON.stringify({ type: "gateway", subType: "xorGateway", label: "Decision", icon: "X" }), help: "Exclusive Gateway" },
    { icon: GitFork, label: "Parallel", dragType: JSON.stringify({ type: "gateway", subType: "andGateway", label: "Parallel", icon: "Plus" }), help: "Parallel Gateway" },
    { icon: UserCheck, label: "Task", dragType: JSON.stringify({ type: "task", subType: "userTask", label: "User Task", icon: "UserCheck" }), help: "User interaction" },
    { icon: Zap, label: "Service", dragType: JSON.stringify({ type: "task", subType: "serviceTask", label: "Service Task", icon: "Zap" }), help: "Automated service" },
    { icon: Code, label: "Script", dragType: JSON.stringify({ type: "task", subType: "scriptTask", label: "Run Script", icon: "Code" }), help: "Custom logic" },
  ];

  const connectorTools = [
    { icon: Spline, label: "Curved", edgeType: "default", help: "Smooth curved connector" },
    { icon: ArrowDown, label: "Straight", edgeType: "straight", help: "Direct straight line connector" },
    { icon: MoveHorizontal, label: "Angled", edgeType: "smoothstep", help: "Stepped right-angle connector" },
  ];

  const [activeConnector, setActiveConnector] = useState("Angled");

  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-1">BPMN Elements — Drag to Canvas</p>
        <div className="space-y-1">
          {bpmTools.map((tool, i) => (
            <div
              key={i}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/reactflow", tool.dragType);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/5 cursor-grab active:cursor-grabbing transition-all group/tool border border-transparent hover:border-primary/20"
              title={tool.help}
            >
              <div className="w-8 h-8 rounded-lg bg-muted border border-border/50 flex items-center justify-center shrink-0 group-hover/tool:bg-primary/10 group-hover/tool:border-primary/30 transition-all">
                <tool.icon size={16} className="text-foreground/60 group-hover/tool:text-primary transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground/90 group-hover/tool:text-foreground">{tool.label}</p>
                <p className="text-xs text-muted-foreground/50">{tool.help}</p>
              </div>
              <GripVertical size={14} className="text-muted-foreground/20 group-hover/tool:text-muted-foreground/50 transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t border-border/30">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-1">Connector Style</p>
        <div className="grid grid-cols-3 gap-2">
          {connectorTools.map((tool, i) => (
            <button
              key={i}
              onClick={() => {
                setActiveConnector(tool.label);
                onEdgeTypeChange?.(tool.edgeType);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                activeConnector === tool.label
                  ? "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-card border-border/50 text-muted-foreground hover:border-primary/40 hover:text-primary"
              )}
              title={tool.help}
            >
              <tool.icon size={17} />
              <span className="text-xs font-bold">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function FlowFormattingPanel({ 
  onAlign, 
  onDistribute, 
  onAutoLayout 
}: { 
  onAlign?: (direction: string) => void;
  onDistribute?: (direction: string) => void;
  onAutoLayout?: () => void;
}) {
  const alignmentTools = [
    { icon: AlignStartVertical, label: "Left", action: "left", help: "Align left" },
    { icon: AlignCenterVertical, label: "H-Center", action: "center-x", help: "Align horizontal center" },
    { icon: AlignEndVertical, label: "Right", action: "right", help: "Align right" },
    { icon: AlignStartHorizontal, label: "Top", action: "top", help: "Align top" },
    { icon: AlignCenterHorizontal, label: "V-Center", action: "center-y", help: "Align vertical center" },
    { icon: AlignEndHorizontal, label: "Bottom", action: "bottom", help: "Align bottom" },
    { icon: AlignHorizontalSpaceBetween, label: "Dist-H", action: "horizontal", help: "Distribute horizontally" },
    { icon: AlignVerticalSpaceBetween, label: "Dist-V", action: "vertical", help: "Distribute vertically" },
  ];

  return (
    <div className="p-4 space-y-5 overflow-y-auto">
      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/60 px-1">Alignment & Distribution</p>
        <div className="grid grid-cols-4 gap-1.5">
          {alignmentTools.map((tool, i) => (
            <button
              key={i}
              onClick={() => {
                if (tool.label.startsWith("Dist")) onDistribute?.(tool.action);
                else onAlign?.(tool.action);
              }}
              className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-xl bg-card border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group/align"
              title={tool.help}
            >
              <tool.icon size={16} className="text-muted-foreground/60 group-hover/align:text-primary transition-colors" />
              <span className="text-xs font-semibold text-muted-foreground/60 group-hover/align:text-primary leading-none">{tool.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border/30">
        <button
          onClick={onAutoLayout}
          className="w-full flex items-center justify-center gap-3 p-3.5 rounded-xl bg-primary text-primary-foreground font-bold uppercase tracking-wider text-xs shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Sparkles size={15} />
          Auto-Arrange Flow
        </button>
      </div>
    </div>
  );
}
