"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  Folder, 
  ChevronRight, 
  ChevronDown, 
  ChevronsDown,
  ChevronsUp,
  Search, 
  Plus, 
  Rocket, 
  FileText, 
  Clock, 
  MoreHorizontal, 
  Grid3X3, 
  List as ListIcon,
  Activity,
  Scan,
  FolderPlus,
  ArrowRight,
  Monitor,
  Loader2,
  CheckCircle,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Database,
  Mail,
  BrainCircuit,
  ShieldCheck,
  ZapIcon,
  Workflow,
  LayoutGrid,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/lib/context";
import { getTenantDocReaderRegistry } from "@/app/actions/folderActions";
import { createStudioProject, deleteStudioProject, moveStudioProject } from "@/app/actions/tenantActions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface DocReaderRegistryProps {
  onSelectProject: (projectId: string) => void;
}

type ContextMenuState = { x: number; y: number; type: 'folder' | 'project'; id: string; name: string } | null;

function getDynamicModelIcon(name: string, description: string) {
  const text = (name + " " + description).toLowerCase();
  if (text.includes("invoice") || text.includes("bill") || text.includes("payment")) return <FileText size={20} />;
  if (text.includes("id") || text.includes("passport") || text.includes("license")) return <ShieldCheck size={20} />;
  if (text.includes("medical") || text.includes("health") || text.includes("clinic")) return <Activity size={20} />;
  if (text.includes("legal") || text.includes("contract") || text.includes("agreement")) return <FileText size={20} />;
  if (text.includes("ai") || text.includes("smart") || text.includes("neural")) return <BrainCircuit size={20} />;
  return <Scan size={20} />;
}

function getStatusConfig(proj: any) {
  const status = proj.status === 'DISABLED' ? 'DISABLED' : (proj.studioWorkflows?.status || proj.status || 'Draft');
  switch (status) {
case 'DISABLED': return { label: 'Disabled', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: <Clock size={9} /> };
case 'Published': return { label: 'Trained', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle size={9} /> };
    case 'Deployed': return { label: 'Live', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', icon: <Rocket size={9} /> };
    default: return { label: 'Draft', color: 'text-muted-foreground/70 bg-muted/20 border-border/20', icon: <Clock size={9} /> };
  }
}

function ProjectCard({ project, viewMode, onClick, onContextMenu }: any) {
  const st = getStatusConfig(project);
  const wf = project.studioWorkflows;

  if (viewMode === 'list') {
    return (
      <div
        onClick={onClick}
        onContextMenu={onContextMenu}
        className="grid grid-cols-[1fr_120px_80px_80px_80px] gap-2 px-3 py-2.5 border-b border-border/10 hover:bg-primary/[0.02] cursor-pointer items-center"
      >
        <div className="flex items-center gap-2">
          <Scan size={12} className="text-foreground/80 shrink-0" />
          <span className="text-[11px] font-semibold text-foreground/60 truncate">{project.name}</span>
        </div>
        <span className="text-xs text-muted-foreground/25 truncate">{project.folderName || '-'}</span>
        <span className="text-xs font-mono text-foreground/80">v{project.version || '1.0.0'}</span>
        <span className={cn("text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1 w-fit", st.color)}>
          {st.icon} {st.label}
        </span>
        <button className="text-foreground/80 hover:text-foreground w-fit" onClick={e => { e.stopPropagation(); onContextMenu?.(e); }}>
          <MoreHorizontal size={14} />
        </button>
      </div>
    );
  }

  return (
    <motion.div whileHover={{ y: -3 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div
        onClick={onClick}
        onContextMenu={onContextMenu}
        className="group bg-card border border-border/40 rounded-3xl overflow-hidden transition-all hover:shadow-2xl hover:border-primary/40 flex flex-col h-[360px] relative shadow-xl shadow-black/5 border-b-4 border-b-transparent hover:border-b-primary cursor-pointer"
      >
        <div className="h-20 bg-gradient-to-br from-primary/10 to-transparent p-4 flex items-start justify-between border-b border-border/10">
          <div className="w-10 h-10 rounded-xl bg-background/80 shadow-sm flex items-center justify-center text-primary border border-border/10 group-hover:scale-110 transition-transform">
            {getDynamicModelIcon(project.name, project.description || "")}
          </div>
          <div className={cn("px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm", st.color)}>
            {st.icon} {st.label}
          </div>
        </div>

        <div className="p-5 flex-1 flex flex-col min-w-0">
          <h3 className="text-sm font-bold text-foreground mb-1.5 truncate group-hover:text-primary transition-colors leading-tight">
            {project.name}
          </h3>
          <p className="text-[11px] text-foreground/80 leading-relaxed line-clamp-2 min-h-[32px] mb-4">
            {project.description || "Intelligent document processing model for high-fidelity data extraction."}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 mt-auto pt-6 border-t border-border/10 flex-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Accuracy Stack</span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-foreground/80">Training</span>
                  <span className="text-[10px] font-mono text-primary bg-primary/5 px-1 rounded">v{wf?.version || project.version || "1.0.0"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-foreground/80">Target</span>
                  <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1 rounded">--%</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Intelligence</span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <BrainCircuit size={10} className="text-primary/60" />
                  <span className="text-[10px] font-bold text-foreground/80 truncate">Engine: Standard</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ZapIcon size={10} className="text-amber-400" />
                  <span className="text-[10px] font-bold text-foreground/80 truncate">Type: General</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border/10 flex items-center justify-between mt-4">
            <div className="flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-foreground/80 tracking-widest">Created</span>
                <span className="text-[10px] font-bold text-foreground/80">{project.createdAt ? new Date(project.createdAt).toLocaleDateString() : 'Recently'}</span>
              </div>
              <div className="w-px h-6 bg-border/10" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-foreground/80 tracking-widest">Trained</span>
                <span className="text-[10px] font-bold text-primary/60">{project.updatedAt ? new Date(project.updatedAt).toLocaleDateString() : 'Recently'}</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-muted/10 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
              <ArrowRight size={14} />
            </div>
          </div>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-card via-card/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out border-t border-border/10">
          <button 
            onClick={(e) => { e.stopPropagation(); onClick?.(); }}
            className="w-full py-2.5 bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Eye size={14} /> Open Model Studio
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function DocReaderRegistry({ onSelectProject }: DocReaderRegistryProps) {
  const router = useRouter();
  const { activeCustomer, activeTenant, availableTenants, currentUser } = useAppContext();
  const registryTenant = activeTenant || availableTenants.find(tenant => tenant.isDefault) || availableTenants[0] || null;
  const refreshRunRef = React.useRef(0);
  const [folderTree, setFolderTree] = useState<any[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncIssue, setSyncIssue] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>(null);
  const [createModal, setCreateModal] = useState<{ isOpen: boolean; folderId?: string; workspaceId?: string }>({ isOpen: false });
  const [newModelName, setNewModelName] = useState("New Document Reader");
  const [newModelDesc, setNewModelDesc] = useState("Intelligent document processing model for high-fidelity data extraction.");
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  React.useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const handleFolderContext = (e: React.MouseEvent, folder: any) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id, name: folder.name });
  };

  const handleProjectContext = (e: React.MouseEvent, proj: any) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, type: 'project', id: proj.id, name: proj.name });
  };

  const handleDeleteProject = (id: string, name: string) => {
    setDeleteConfirm({ isOpen: true, id, name });
    setCtxMenu(null);
  };

  const submitDeleteProject = async (id: string) => {
    const res = await deleteStudioProject(id);
    if (res.success) {
      toast.success("Document Model deleted successfully");
      refreshFolders();
    } else {
      toast.error(res.error || "Failed to delete model");
    }
    setDeleteConfirm(null);
  };

  const refreshFolders = useCallback(async () => {
    const runId = refreshRunRef.current + 1;
    refreshRunRef.current = runId;
    const cid = activeCustomer?.id || registryTenant?.customerId;
    if (!cid || !registryTenant?.id) {
      setFolderTree([]);
      setSelectedFolderId(null);
      setLoading(false);
      setSyncIssue("Workspace context is still loading. The registry will appear once a customer tenant is available.");
      return;
    }
    
    setLoading(true);
    setSyncIssue(null);
    try {
      const { folders } = await getTenantDocReaderRegistry(
        cid, 
        registryTenant.id, 
        currentUser.role, 
        [] 
      );
      if (refreshRunRef.current !== runId) return;
      
      const buildTree = (list: any[], parentId: string | null = null): any[] => {
        return list
          .filter(f => f.parentId === parentId)
          .map(f => ({
            ...f,
            subfolders: buildTree(list, f.id)
          }));
      };

      const tree = buildTree(folders);
      setFolderTree(tree);

      if (tree.length > 0) {
        // Expand ALL folders by default
        const allIds: Record<string, boolean> = {};
        const traverse = (nodes: any[]) => {
          nodes.forEach(n => {
            allIds[n.id] = true;
            if (n.subfolders) traverse(n.subfolders);
          });
        };
        traverse(tree);
        setExpandedFolders(allIds);
        setSelectedFolderId(null);
      } else {
        setSelectedFolderId(null);
        setSyncIssue("No workspace folders were returned. Create a workspace folder before adding document models.");
      }
    } catch (e) {
      if (refreshRunRef.current !== runId) return;
      console.error("Failed to load Doc Reader models:", e);
      setFolderTree([]);
      setSelectedFolderId(null);
      setSyncIssue("Workspace folders could not be loaded. Retry or create a new document model when the workspace is available.");
    } finally {
      if (refreshRunRef.current === runId) setLoading(false);
    }
  }, [activeCustomer, registryTenant, currentUser]);

  useEffect(() => { refreshFolders(); }, [refreshFolders]);

  const filteredTree = React.useMemo(() => {
    if (!search.trim()) return folderTree;
    const term = search.toLowerCase();
    
    const filterNodes = (nodes: any[]): any[] => {
      return nodes
        .map(node => {
          const matchesFolder = node.name.toLowerCase().includes(term);
          const matchingProjects = (node.projects || []).filter((p: any) => {
             const isDocReader = (() => {
                try { return JSON.parse(p.metadata || '{}').projectType === "DOC_READER"; } catch(e) { return false; }
             })();
             return isDocReader && p.name.toLowerCase().includes(term);
          });
          const filteredSub = filterNodes(node.subfolders || []);
          
          if (matchesFolder || matchingProjects.length > 0 || filteredSub.length > 0) {
            return {
              ...node,
              projects: matchingProjects,
              subfolders: filteredSub,
              _isMatch: matchesFolder || matchingProjects.length > 0,
              _hasMatchingProjects: matchingProjects.length > 0
            };
          }
          return null;
        })
        .filter(Boolean);
    };
    return filterNodes(folderTree);
  }, [folderTree, search]);

  useEffect(() => {
    if (search.trim()) {
      const allIds: Record<string, boolean> = {};
      const traverse = (nodes: any[]) => {
        nodes.forEach(n => {
          allIds[n.id] = true;
          if (n.subfolders) traverse(n.subfolders);
        });
      };
      traverse(filteredTree);
      setExpandedFolders(prev => ({ ...prev, ...allIds }));
    }
  }, [filteredTree, search]);
  
  const toggleFolder = (id: string) => setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));

  const handleExpandAll = () => {
    const allIds: Record<string, boolean> = {};
    const traverse = (folders: any[]) => {
      folders.forEach(f => {
        allIds[f.id] = true;
        if (f.subfolders && f.subfolders.length > 0) traverse(f.subfolders);
      });
    };
    traverse(folderTree);
    setExpandedFolders(allIds);
  };

  const handleCollapseAll = () => setExpandedFolders({});

  const handleExpandToLevel = (targetLevel: number) => {
    const allIds: Record<string, boolean> = {};
    const traverse = (folders: any[]) => {
      folders.forEach(f => {
        if (f.level < targetLevel) {
          allIds[f.id] = true;
          if (f.subfolders && f.subfolders.length > 0) traverse(f.subfolders);
        }
      });
    };
    traverse(folderTree);
    setExpandedFolders(allIds);
  };

  const findFolder = (nodes: any[], id: string): any => {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.subfolders) {
        const found = findFolder(node.subfolders, id);
        if (found) return found;
      }
    }
    return null;
  };

  const getAllProjects = useCallback((folders: any[]): any[] => {
    return folders.reduce((acc: any[], f: any) => {
      const projs = (f.projects || []).map((p: any) => ({ ...p, folderName: f.name, folderId: f.id }));
      return [...acc, ...projs, ...getAllProjects(f.subfolders || [])];
    }, []);
  }, []);

  const allProjects = getAllProjects(folderTree);
  const activeFolder = selectedFolderId ? findFolder(folderTree, selectedFolderId) : null;
  const selectedFolderIds = React.useMemo(() => {
    if (!activeFolder) return new Set<string>();
    const ids = new Set<string>();
    const collect = (folder: any) => {
      ids.add(folder.id);
      (folder.subfolders || []).forEach(collect);
    };
    collect(activeFolder);
    return ids;
  }, [activeFolder]);
  const activeProjects = allProjects.filter(p => {
    const isCorrectType = (() => {
      try { return JSON.parse(p.metadata || '{}').projectType === "DOC_READER"; } catch(e) { return false; }
    })();
    if (!isCorrectType) return false;

    const matchFolder = search.trim().length > 0 || !selectedFolderId || selectedFolderIds.size === 0 || selectedFolderIds.has(p.folderId);
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    
    return matchFolder && matchSearch;
  });

  const handleCreateProject = async (folderId?: string, workspaceId?: string) => {
    const targetFolderId = folderId || selectedFolderId;
    const targetWorkspaceId = workspaceId || activeFolder?.workspaceId;

    if (!targetFolderId || !registryTenant || !activeCustomer || !targetWorkspaceId) {
      toast.error("Please select a folder to create a Document Model.");
      return;
    }

    setNewModelName("New Document Reader");
    setNewModelDesc("Intelligent document processing model for high-fidelity data extraction.");
    setCreateModal({ isOpen: true, folderId: targetFolderId, workspaceId: targetWorkspaceId });
  };

  const submitCreateProject = async () => {
    if (!newModelName.trim()) {
      toast.error("Please enter a model name.");
      return;
    }

    const { folderId, workspaceId } = createModal;
    if (!folderId || !workspaceId || !registryTenant || !activeCustomer) {
      toast.error("Missing organizational context.");
      return;
    }

    try {
      const result = await createStudioProject({
        name: newModelName,
        description: newModelDesc || undefined,
        folderId,
        customerId: activeCustomer.id,
        tenantId: registryTenant.id,
        workspaceId,
        nodes: [],
        edges: [],
        projectType: "DOC_READER"
      });

      if (result.success) {
        toast.success("Document Model created successfully!");
        setCreateModal({ isOpen: false });
        refreshFolders();
      } else {
        toast.error(result.error || "Failed to create model");
      }
    } catch (e) {
      toast.error("An error occurred while creating the model.");
    }
  };

  const renderFolder = (folder: any, depth: number = 0) => {
    const isExpanded = expandedFolders[folder.id];
    const isSelected = selectedFolderId === folder.id;
    const count = (folder.projects || []).filter((p: any) => {
      try {
        const meta = p.metadata ? JSON.parse(p.metadata) : {};
        return meta.projectType === "DOC_READER";
      } catch (e) { return false; }
    }).length;

    return (
      <div key={folder.id} className="flex flex-col">
        <div 
          onClick={() => { setSelectedFolderId(folder.id); }}
          onContextMenu={(e) => handleFolderContext(e, folder)}
          className={cn(
            "flex items-center gap-3 px-3 py-2 cursor-pointer transition-all rounded-md group/folder-btn",
            isSelected ? "bg-primary text-primary-foreground shadow-xl shadow-primary/30" : "hover:bg-primary/5 text-foreground/70"
          )}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
             {folder.subfolders?.length > 0 ? (
                <div 
                   onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                   className="w-4 h-4 flex items-center justify-center shrink-0"
                >
                   {isExpanded ? <ChevronDown size={14} className={cn(isSelected ? "text-white" : "text-foreground/80")} /> : <ChevronRight size={14} className={cn(isSelected ? "text-white" : "text-foreground/80")} />}
                </div>
             ) : (
                <div className="w-4" />
             )}
             
             <div className={cn(
               "p-1.5 rounded-lg shrink-0 transition-all",
               isSelected ? "bg-white/20 text-white" : "bg-transparent text-primary/40 group-hover/folder-btn:text-primary"
             )}>
                <Folder size={20} className={cn(isSelected ? "text-white" : "text-primary/30")} />
             </div>

             <div className="flex flex-col min-w-0">
                 <span className={cn(
                    "uppercase tracking-tight truncate leading-none transition-all",
                    depth <= 1 ? "font-black text-[14px]" : "font-medium text-[12px]",
                    isSelected ? "text-white" : "text-foreground"
                 )}>
                    {folder.name}
                 </span>
             </div>
          </div>

          {count > 0 && (
            <span className={cn(
              "text-xs px-1.5 rounded ml-auto font-mono",
              isSelected ? "text-white/40 bg-white/10" : "text-foreground/20 bg-foreground/5"
            )}>
              {count}
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="flex flex-col">
            {/* Matching Projects in Sidebar */}
            {search.trim() && (folder.projects || []).map((p: any) => (
              <div 
                key={p.id}
                onClick={(e) => { e.stopPropagation(); onSelectProject(p.id); }}
                className="flex items-center gap-2 py-1.5 hover:bg-primary/5 text-primary cursor-pointer group/project-item transition-all"
                style={{ paddingLeft: `${(depth + 2) * 20}px` }}
              >
                <Scan size={12} className="text-foreground/90 group-hover/project-item:text-primary transition-colors shrink-0" />
                <span className="text-[11px] font-bold truncate tracking-tight">{p.name}</span>
              </div>
            ))}
            {(folder.subfolders || []).map((sub: any) => renderFolder(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full overflow-hidden font-sans">
       <aside className="w-[444px] border-r border-border/40 flex flex-row shrink-0 bg-sidebar overflow-hidden relative group/sidebar transition-all duration-300">
          {/* Left Column: Vertical Active Studio Icon Navigation Bar */}
          <div className="w-16 border-r border-border/40 bg-background/25 backdrop-blur-md flex flex-col items-center py-4 gap-4 shrink-0 justify-between">
            <div className="flex flex-col gap-4 items-center w-full">
              {[
                { name: "Flow Studio", path: "/next-gen/studio", icon: Workflow, active: false },
                { name: "App Studio", path: "/next-gen/studio/ui-builder", icon: LayoutGrid, active: false },
                { name: "Document Studio", path: "/next-gen/studio/document-reader", icon: FileText, active: true },
                { name: "Mail Studio", path: "/next-gen/studio/mail-studio", icon: Mail, active: false },
                { name: "Recon Studio", path: "/next-gen/studio/recon-studio", icon: Database, active: false },
                { name: "Risk Studio", path: "/next-gen/studio/risk-studio", icon: Shield, active: false },
                { name: "Investigation Studio", path: "/next-gen/studio/investigation-studio", icon: BrainCircuit, active: false },
              ].map((s) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.name}
                    onClick={() => router.push(s.path)}
                    className={cn(
                      "relative w-11 h-11 rounded-xl flex items-center justify-center transition-all group/icon shadow-sm",
                      s.active 
                        ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105" 
                        : "bg-muted/10 border border-border/10 text-foreground/70 hover:bg-primary/5 hover:text-primary hover:scale-105"
                    )}
                    title={s.name}
                  >
                    {s.active && (
                      <span className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    )}
                    <Icon size={18} className={cn("transition-transform group-hover/icon:scale-110", s.active ? "scale-110" : "")} />
                    <div className="absolute left-14 px-2 py-1 rounded-md bg-popover border border-border text-[9px] font-black uppercase tracking-widest text-popover-foreground shadow-2xl opacity-0 group-hover/icon:opacity-100 transition-all pointer-events-none translate-x-[-10px] group-hover/icon:translate-x-0 z-50 whitespace-nowrap">
                      {s.name}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Folders Pane content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
             <div className="p-4 space-y-4 border-b border-border/40 bg-primary/5">
                <div className="flex items-center gap-2">
                   <div className="relative flex-1 group">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/70 group-focus-within:text-primary transition-colors" />
                 <input 
                   placeholder="Search training sets..." 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="w-full pl-10 pr-3 py-2 text-xs bg-background/50 text-foreground border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-foreground/60 font-bold"
                 />
             </div>
             <div className="flex gap-1">
                 <button onClick={handleExpandAll} className="p-2 bg-background/50 border border-border/60 rounded-md hover:bg-primary/5 transition-all text-foreground/80" title="Expand All"><ChevronsDown size={14} /></button>
                 <button onClick={handleCollapseAll} className="p-2 bg-background/50 border border-border/60 rounded-md hover:bg-primary/5 transition-all text-foreground/80" title="Collapse All"><ChevronsUp size={14} /></button>
                 <div className="h-8 w-px bg-border/40 mx-1" />
                 {[1, 2, 3, 4].map(l => (
                    <button 
                      key={l}
                      onClick={() => handleExpandToLevel(l)}
                      className="px-2 py-1 bg-background/50 border border-border/60 rounded-md text-[10px] font-black text-foreground/80 hover:text-primary hover:border-primary/30 transition-all uppercase"
                    >
                       L{l}
                    </button>
                 ))}
                </div>
             </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-2 bg-sidebar/50">
                {loading ? (
                   <div className="mx-2 my-3 rounded-xl border border-primary/15 bg-primary/5 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Loader2 size={13} className="animate-spin text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary">Workspace sync running</span>
                      </div>
                      <p className="mt-1 text-[9px] font-bold leading-relaxed text-muted-foreground">
                        Loading workspace folders and document model registry.
                      </p>
                   </div>
                ) : null}

                {syncIssue ? (
                   <div className="mx-2 mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[9px] font-bold leading-relaxed text-amber-800">
                      {syncIssue}
                   </div>
                ) : null}

                {filteredTree.length > 0 ? (
                   filteredTree.map(folder => renderFolder(folder, 0))
                ) : !loading ? (
                   <div className="mx-2 rounded-xl border border-dashed border-border/70 bg-card/50 p-4 text-center text-[10px] font-bold text-muted-foreground">
                      No workspace document models yet. Create a new document model to begin training.
                   </div>
                ) : null}
             </div>

             <div className="p-6 border-t border-border/40 bg-primary/5">
                <Button 
                   onClick={() => handleCreateProject()}
                   className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2 group"
                >
                   <Plus size={16} className="group-hover:scale-110 transition-transform" />
                   New Document Model
                </Button>

             </div>
          </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden bg-muted/5 relative">
          <header className="h-20 border-b border-border/40 bg-card/40 backdrop-blur-3xl flex items-center justify-between px-6 lg:px-10 shrink-0 relative overflow-hidden">
             <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--primary) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
             
             <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary shadow-sm shadow-primary/5">
                   <BrainCircuit size={20} />
                </div>
                <div className="min-w-0">
                   <h3 className="text-lg font-black tracking-tight text-foreground truncate max-w-[200px] md:max-w-[400px]">
                      {search.trim() ? `Search Results: "${search}"` : (activeProjects.length > 0 && selectedFolderId ? allProjects.find(p => p.folderId === selectedFolderId)?.folderName || "Document Model Registry" : "Document Studio")}
                   </h3>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span>{activeProjects.length} Document Models</span>
                      <div className="w-1 h-1 rounded-full bg-slate-200" />
                      <span>{`${activeFolder?.subfolders?.length || 0} Domains`}</span>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-4 relative z-10">
                 <div className="hidden lg:block relative w-48 xl:w-64 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 group-focus-within:text-primary transition-colors" size={14} />
                    <input 
                       type="text" 
                       value={search}
                       onChange={(e) => setSearch(e.target.value)}
                       placeholder="Search models..." 
                       className="w-full bg-background/50 border border-border/50 text-foreground placeholder:text-foreground/50 rounded-lg py-1.5 pl-9 pr-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/20 transition-all font-medium"
                    />
                 </div>
                 <div className="hidden sm:block h-8 w-px bg-border/50 mx-2" />
  
                 <div className="flex items-center gap-6 bg-card px-5 py-2 rounded-2xl border border-border/50 shadow-sm relative group overflow-hidden">
                    <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <div className="relative z-10 flex flex-col">
                       <span className="text-[10px] font-black uppercase text-foreground/50 leading-none tracking-widest">Global Capacity</span>
                       <span className="text-base font-black text-primary leading-none mt-1.5">{activeProjects.length}</span>
                    </div>
                    <div className="relative z-10 w-px h-8 bg-border" />
                    <div className="relative z-10 hidden sm:flex flex-col">
                       <span className="text-[10px] font-black uppercase text-foreground/50 leading-none tracking-widest">Training Queue</span>
                       <span className="text-[10px] font-bold text-emerald-500 leading-none mt-1.5">
                          All Synced
                       </span>
                    </div>
                 </div>
                 <div className="flex bg-card p-1 rounded-lg border border-border/50 shadow-sm">
                    <button 
                       onClick={() => setViewMode('grid')}
                       className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-foreground/50 hover:text-primary")}
                    >
                       <Grid3X3 size={16} />
                    </button>
                    <button 
                       onClick={() => setViewMode('list')}
                       className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-foreground/50 hover:text-primary")}
                    >
                       <ListIcon size={16} />
                    </button>
                 </div>
              </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 relative">
             <div className="absolute inset-0 opacity-[0.01] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, var(--primary) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
             
             {activeProjects.length > 0 ? (
               viewMode === 'grid' ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8 relative z-10">
                    {activeProjects.map((project: any) => (
                      <ProjectCard 
                         key={project.id} 
                         project={project} 
                         viewMode={viewMode}
                         onClick={() => onSelectProject(project.id)}
                         onContextMenu={(e: React.MouseEvent) => handleProjectContext(e, project)}
                      />
                    ))}
                 </div>
               ) : (
                <div className="bg-card border border-border/50 rounded-3xl overflow-hidden relative z-10 shadow-sm">
                  <div className="grid grid-cols-[1fr_120px_80px_80px_80px] gap-2 px-6 py-4 bg-primary/5 text-[10px] font-black uppercase tracking-[0.15em] text-primary/40 border-b border-border/30">
                    <span>Model Name</span><span>Domain</span><span>Version</span><span>Status</span><span>Action</span>
                  </div>
                  {activeProjects.map((project: any) => (
                    <ProjectCard 
                       key={project.id} 
                       project={project} 
                       viewMode={viewMode}
                       onClick={() => onSelectProject(project.id)}
                       onContextMenu={(e: React.MouseEvent) => handleProjectContext(e, project)}
                    />
                  ))}
                </div>
               )
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                   <div className="w-24 h-24 rounded-3xl bg-card border border-dashed border-primary/20 flex items-center justify-center shadow-2xl shadow-primary/10 group transition-all duration-700 hover:scale-110">
                      <Scan size={40} className="text-primary/20 group-hover:text-primary transition-all duration-700" />
                   </div>
                   <div className="space-y-2 max-w-sm">
                      <h4 className="text-lg font-black tracking-tight text-foreground">Initialize Document Model</h4>
                      <p className="text-xs text-foreground/60 leading-relaxed font-medium">
                         Your model registry is empty. Create your first document understanding model to start training on industry data.
                      </p>
                   </div>
                   <Button 
                      onClick={() => handleCreateProject()}
                      className="h-12 px-8 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                   >
                      Create Document Model
                   </Button>
                </div>
             )}
          </div>
       </main>

       {typeof document !== 'undefined' && createPortal(
         <AnimatePresence>
           {ctxMenu && (
             <motion.div
               initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
               className="fixed z-[9999] bg-card/95 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-2xl py-2 min-w-[200px] overflow-hidden"
               style={{ left: ctxMenu.x, top: ctxMenu.y }}
               onClick={e => e.stopPropagation()}
             >
               {ctxMenu.type === 'folder' ? (
                 <>
                   <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-foreground/50 border-b border-border/30 mb-1">{ctxMenu.name}</div>
                   <button onClick={() => { handleCreateProject(ctxMenu.id); setCtxMenu(null); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-[11px] font-bold text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors">
                     <Plus size={14} className="text-primary" /> New Document Model
                   </button>
                 </>
               ) : (
                 <>
                   <div className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.15em] text-foreground/50 border-b border-border/30 mb-1 truncate max-w-[200px]">{ctxMenu.name}</div>
                   <button onClick={() => { onSelectProject(ctxMenu.id); setCtxMenu(null); }} className="flex items-center gap-3 w-full px-4 py-2.5 text-[11px] font-bold text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors">
                     <Pencil size={14} /> Open Studio
                   </button>
                   <button className="flex items-center gap-3 w-full px-4 py-2.5 text-[11px] font-bold text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors">
                     <Monitor size={14} /> View History
                   </button>
                   <button className="flex items-center gap-3 w-full px-4 py-2.5 text-[11px] font-bold text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors">
                     <Copy size={14} /> Clone Model
                   </button>
                   <button className="flex items-center gap-3 w-full px-4 py-2.5 text-[11px] font-bold text-foreground/80 hover:bg-primary/10 hover:text-primary transition-colors">
                     <Rocket size={14} /> Deploy Model
                   </button>
                   <div className="h-px bg-border/30 my-1.5 mx-2" />
                   <button onClick={() => handleDeleteProject(ctxMenu.id, ctxMenu.name)} className="flex items-center gap-3 w-full px-4 py-2.5 text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 transition-colors">
                     <Trash2 size={14} /> Delete Model
                   </button>
                 </>
               )}
             </motion.div>
           )}
         </AnimatePresence>,
         document.body
       )}

       {typeof document !== 'undefined' && createPortal(
         <AnimatePresence>
           {createModal.isOpen && (
             <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
               {/* Backdrop */}
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setCreateModal({ isOpen: false })}
                 className="fixed inset-0 bg-black/60 backdrop-blur-md"
               />

               {/* Modal Container */}
               <motion.div
                 initial={{ opacity: 0, scale: 0.95, y: 15 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 15 }}
                 transition={{ duration: 0.2, ease: "easeOut" }}
                 className="bg-card border border-border/60 max-w-md w-full rounded-3xl p-6 shadow-2xl relative overflow-hidden z-10 space-y-5"
               >
                 <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />

                 {/* Header */}
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                     <BrainCircuit className="w-5 h-5 text-primary" />
                   </div>
                   <div>
                     <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Create Document Model</h3>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Initialize intelligent document reader</p>
                   </div>
                 </div>

                 {/* Inputs */}
                 <div className="space-y-4 pt-1">
                   <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Model Name</label>
                     <input
                       type="text"
                       value={newModelName}
                       onChange={(e) => setNewModelName(e.target.value)}
                       placeholder="e.g. Invoice Parser Engine"
                       className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border/80 text-xs font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/45 transition-all shadow-inner"
                     />
                   </div>

                   <div className="space-y-1.5">
                     <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest block">Description</label>
                     <textarea
                       rows={3}
                       value={newModelDesc}
                       onChange={(e) => setNewModelDesc(e.target.value)}
                       placeholder="Describe the model's extraction scope..."
                       className="w-full px-4 py-3 rounded-xl bg-background/50 border border-border/80 text-xs font-bold text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/45 focus:border-primary/45 transition-all shadow-inner resize-none leading-relaxed"
                     />
                   </div>
                 </div>

                 {/* Actions */}
                 <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/30">
                   <button
                     type="button"
                     onClick={() => setCreateModal({ isOpen: false })}
                     className="px-5 py-2.5 rounded-xl border border-border hover:bg-muted text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
                   >
                     Cancel
                   </button>
                   <button
                     type="button"
                     onClick={submitCreateProject}
                     className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                   >
                     Confirm & Create
                   </button>
                 </div>
               </motion.div>
             </div>
           )}
         </AnimatePresence>,
         document.body
       )}

       {typeof document !== 'undefined' && createPortal(
         <AnimatePresence>
           {deleteConfirm?.isOpen && (
             <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
               {/* Backdrop */}
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={() => setDeleteConfirm(null)}
                 className="fixed inset-0 bg-black/60 backdrop-blur-md"
               />

               {/* Modal Container */}
               <motion.div
                 initial={{ opacity: 0, scale: 0.95, y: 15 }}
                 animate={{ opacity: 1, scale: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95, y: 15 }}
                 transition={{ duration: 0.2, ease: "easeOut" }}
                 className="bg-card border border-border/60 max-w-md w-full rounded-3xl p-6 shadow-2xl relative overflow-hidden z-10 space-y-5"
               >
                 <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/50 to-transparent" />

                 {/* Header */}
                 <div className="flex items-center gap-3">
                   <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20">
                     <Trash2 className="w-5 h-5 text-rose-500" />
                   </div>
                   <div>
                     <h3 className="text-sm font-black uppercase tracking-wider text-rose-500">Delete Document Model</h3>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Are you absolutely sure?</p>
                   </div>
                 </div>

                 {/* Body Content */}
                 <div className="space-y-4">
                   <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                     <p className="text-xs text-muted-foreground leading-relaxed">
                       You are about to delete <strong className="text-foreground">{deleteConfirm.name}</strong>. This will permanently remove the model configuration, pipeline history, and all custom extraction nodes. This action cannot be undone.
                     </p>
                   </div>
                 </div>

                 {/* Footer Actions */}
                 <div className="flex items-center justify-end gap-3 pt-2">
                   <Button
                     variant="ghost"
                     type="button"
                     onClick={() => setDeleteConfirm(null)}
                     className="px-5 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-muted"
                   >
                     Cancel
                   </Button>
                   <Button
                     type="button"
                     onClick={() => submitDeleteProject(deleteConfirm.id)}
                     className="px-6 h-10 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-black uppercase text-[10px] tracking-widest shadow-xl shadow-rose-500/20 border-none outline-none"
                   >
                     Confirm Delete
                   </Button>
                 </div>
               </motion.div>
             </div>
           )}
         </AnimatePresence>,
         document.body
       )}
    </div>
  );
}
