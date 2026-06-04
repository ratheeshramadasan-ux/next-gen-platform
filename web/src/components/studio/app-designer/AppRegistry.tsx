"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  Folder, 
  FolderOpen, 
  ChevronRight, 
  ChevronDown, 
  ChevronsDown,
  ChevronsUp,
  Search, 
  Plus, 
  Rocket, 
  Layout, 
  Clock, 
  MoreHorizontal, 
  Grid3X3, 
  List as ListIcon,
  User,
  Activity,
  AppWindow,
  FolderPlus,
  ArrowRight,
  Filter,
  Monitor,
  Layers,
  Loader2,
  CheckCircle,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Database,
  Globe,
  Mail,
  MessageSquare,
  BrainCircuit,
  Zap,
  Cpu,
  FileText,
  Workflow,
  LayoutGrid,
  Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/lib/context";
import { getTenantStudioRegistry } from "@/app/actions/folderActions";
import { createStudioProject, deleteStudioProject, moveStudioProject } from "@/app/actions/tenantActions";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AppRegistryProps {
  onSelectProject: (projectId: string) => void;
}

type ContextMenuState = { x: number; y: number; type: 'folder' | 'project'; id: string; name: string } | null;

function getDynamicProjectIcon(name: string, description: string) {
  const text = (name + " " + description).toLowerCase();
  if (text.includes("data") || text.includes("database") || text.includes("etl")) return <Database size={20} />;
  if (text.includes("web") || text.includes("api") || text.includes("http")) return <Globe size={20} />;
  if (text.includes("mail") || text.includes("email") || text.includes("smtp")) return <Mail size={20} />;
  if (text.includes("chat") || text.includes("message") || text.includes("slack") || text.includes("teams")) return <MessageSquare size={20} />;
  if (text.includes("ai") || text.includes("bot") || text.includes("intelligent")) return <BrainCircuit size={20} />;
  if (text.includes("fast") || text.includes("quick") || text.includes("zap")) return <Zap size={20} />;
  if (text.includes("process") || text.includes("compute") || text.includes("calc")) return <Cpu size={20} />;
  return <Layout size={20} />;
}

function getStatusConfig(proj: any) {
  const status = proj.status === 'DISABLED' ? 'DISABLED' : (proj.studioWorkflows?.status || proj.status || 'Draft');
  switch (status) {
case 'DISABLED': return { label: 'Disabled', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: <Clock size={9} /> };
case 'Published': return { label: 'Published', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle size={9} /> };
    case 'Deployed': return { label: 'Deployed', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', icon: <Rocket size={9} /> };
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
          <FileText size={12} className="text-foreground/80 shrink-0" />
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
          <div className="w-10 h-10 rounded-xl bg-white/80 shadow-sm flex items-center justify-center text-primary border border-border/10 group-hover:scale-110 transition-transform">
            {getDynamicProjectIcon(project.name, project.description || "")}
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
            {project.description || "Sophisticated multi-page application interface for enterprise workflows."}
          </p>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 mt-auto pt-6 border-t border-border/10 flex-1">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Version Stack</span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-foreground/80">Draft</span>
                  <span className="text-[10px] font-mono text-primary bg-primary/5 px-1 rounded">v{wf?.version || project.version || "1.0.0"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-foreground/80">Live</span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">v{project.version || "None"}</span>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground/80">Ownership</span>
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <User size={10} className="text-primary/40" />
                  <span className="text-[10px] font-bold text-foreground/80 truncate">Author: Admin</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Pencil size={10} className="text-primary/40" />
                  <span className="text-[10px] font-bold text-foreground/80 truncate">Editor: System</span>
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
                <span className="text-[10px] font-black uppercase text-foreground/80 tracking-widest">Modified</span>
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
            <Eye size={14} /> Open Designer
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export function AppRegistry({ onSelectProject }: AppRegistryProps) {
  const router = useRouter();
  const { activeCustomer, activeTenant, currentUser } = useAppContext();
  const [folderTree, setFolderTree] = useState<any[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>(null);
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
      toast.success("App deleted successfully");
      refreshFolders();
    } else {
      toast.error(res.error || "Failed to delete app");
    }
    setDeleteConfirm(null);
  };

  const refreshFolders = useCallback(async () => {
    const cid = activeCustomer?.id || activeTenant?.customerId;
    if (!cid || !activeTenant?.id) return;
    
    setLoading(true);
    try {
      const { folders } = await getTenantStudioRegistry(
        cid, 
        activeTenant.id, 
        currentUser.role, 
        [],
        "APP"
      );
      
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
      }
    } catch (e) {
      console.error("Failed to load App projects:", e);
    } finally {
      setLoading(false);
    }
  }, [activeCustomer, activeTenant, currentUser]);

  useEffect(() => { refreshFolders(); }, [refreshFolders]);

  const filteredTree = React.useMemo(() => {
    if (!search.trim()) return folderTree;
    const term = search.toLowerCase();
    
    const filterNodes = (nodes: any[]): any[] => {
      return nodes
        .map(node => {
          const matchesFolder = node.name.toLowerCase().includes(term);
          const matchingProjects = (node.projects || []).filter((p: any) => {
             const isApp = (() => {
                try { return JSON.parse(p.metadata || '{}').projectType === "APP"; } catch(e) { return false; }
             })();
             return isApp && p.name.toLowerCase().includes(term);
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
      try { return JSON.parse(p.metadata || '{}').projectType === "APP"; } catch(e) { return false; }
    })();
    if (!isCorrectType) return false;

    const matchFolder = search.trim().length > 0 || !selectedFolderId || selectedFolderIds.size === 0 || selectedFolderIds.has(p.folderId);
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    
    return matchFolder && matchSearch;
  });

  const handleCreateProject = async (folderId?: string, workspaceId?: string) => {
    const targetFolderId = folderId || selectedFolderId;
    const targetWorkspaceId = workspaceId || activeFolder?.workspaceId;

    if (!targetFolderId || !activeTenant || !activeCustomer || !targetWorkspaceId) {
      toast.error("Please select a folder to create an app.");
      return;
    }

    const name = prompt("Enter App Name:", "New Application");
    if (!name) return;

    const description = prompt("Enter App Description:", "Sophisticated multi-page application interface for enterprise workflows.");

    try {
      const result = await createStudioProject({
        name,
        description: description || undefined,
        folderId: targetFolderId,
        customerId: activeCustomer.id,
        tenantId: activeTenant.id,
        workspaceId: targetWorkspaceId,
        nodes: [],
        edges: [],
        projectType: "APP"
      });

      if (result.success) {
        toast.success("App created successfully!");
        refreshFolders();
      } else {
        toast.error(result.error || "Failed to create app");
      }
    } catch (e) {
      toast.error("An error occurred while creating the app.");
    }
  };

  const renderFolder = (folder: any, depth: number = 0) => {
    const isExpanded = expandedFolders[folder.id];
    const isSelected = selectedFolderId === folder.id;
    const count = (folder.projects || []).filter((p: any) => {
      try {
        const meta = p.metadata ? JSON.parse(p.metadata) : {};
        return meta.projectType === "APP";
      } catch (e) { return false; }
    }).length;

    return (
      <div key={folder.id} className="flex flex-col">
        <div 
          onClick={() => setSelectedFolderId(folder.id)}
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
                   {isExpanded ? <ChevronDown size={14} className={cn(isSelected ? "text-primary-foreground" : "text-foreground/80")} /> : <ChevronRight size={14} className={cn(isSelected ? "text-primary-foreground" : "text-foreground/80")} />}
                </div>
             ) : (
                <div className="w-4" />
             )}
             
             <div className={cn(
               "p-1.5 rounded-lg shrink-0 transition-all",
               isSelected ? "bg-white/20 text-white" : "bg-transparent text-[#633F2E]/40 group-hover/folder-btn:text-[#633F2E]"
             )}>
                <Folder size={20} className={cn(isSelected ? "text-white" : "text-[#633F2E]/30")} />
             </div>

             <div className="flex flex-col min-w-0">
                 <span className={cn(
                    "uppercase tracking-tight truncate leading-none transition-all",
                    depth <= 1 ? "font-black text-[14px]" : "font-medium text-[12px]",
                    isSelected ? "text-white" : "text-[#633F2E]"
                 )}>
                    {folder.name}
                 </span>
                <span className={cn(
                   "text-xs font-bold uppercase tracking-tight truncate opacity-40 mt-1",
                   isSelected ? "text-white/70" : "text-primary"
                )}>
                   SCOPE: DEFAULT WORKSPACE [{activeTenant?.type || "PRODUCTION"}]
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
                <Rocket size={12} className="text-foreground/90 group-hover/project-item:text-primary transition-colors shrink-0" />
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
    <div className="flex h-full overflow-hidden">
       <aside className="w-[480px] border-r border-border/40 flex flex-row shrink-0 bg-sidebar overflow-hidden relative group/sidebar">
          {/* Left Column: Vertical Active Studio Icon Navigation Bar */}
          <div className="w-16 border-r border-border/40 bg-background/25 backdrop-blur-md flex flex-col items-center py-4 gap-4 shrink-0 justify-between">
            <div className="flex flex-col gap-4 items-center w-full">
              {[
                { name: "Flow Studio", path: "/next-gen/studio", icon: Workflow, active: false },
                { name: "App Studio", path: "/next-gen/studio/ui-builder", icon: LayoutGrid, active: true },
                { name: "Document Studio", path: "/next-gen/studio/document-reader", icon: FileText, active: false },
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
                         placeholder="Search folders..." 
                         value={search}
                         onChange={(e) => setSearch(e.target.value)}
                         className="w-full pl-10 pr-3 py-2 text-xs bg-muted/40 border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-foreground/60 font-bold"
                      />
                   </div>
                   <div className="flex gap-1">
                       <button onClick={handleExpandAll} className="p-2 bg-muted/40 border border-border/60 rounded-md hover:bg-muted/60 transition-all text-foreground/80" title="Expand All"><ChevronsDown size={14} /></button>
                       <button onClick={handleCollapseAll} className="p-2 bg-muted/40 border border-border/60 rounded-md hover:bg-muted/60 transition-all text-foreground/80" title="Collapse All"><ChevronsUp size={14} /></button>
                      <div className="h-8 w-px bg-border/40 mx-1" />
                      {[1, 2, 3, 4].map(l => (
                         <button 
                           key={l}
                           onClick={() => handleExpandToLevel(l)}
                           className="px-2 py-1 bg-muted/40 border border-border/60 rounded-md text-[10px] font-black text-foreground/80 hover:text-primary hover:border-primary/30 transition-all uppercase"
                         >
                            L{l}
                         </button>
                      ))}
                   </div>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {loading ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-30">
                      <Loader2 size={24} className="animate-spin text-primary" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing...</span>
                   </div>
                ) : (
                   filteredTree.map(folder => renderFolder(folder, 0))
                )}
             </div>

             <div className="p-6 border-t border-border/40 bg-primary/5">
                <Button 
                   onClick={() => handleCreateProject()}
                   className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20 flex items-center gap-2 group"
                >
                   <AppWindow size={16} className="group-hover:scale-110 transition-transform" />
                   New Application
                </Button>
             </div>
          </div>
       </aside>

       <main className="flex-1 flex flex-col overflow-hidden bg-muted/5 relative">
          <header className="h-20 border-b border-border/40 bg-card/40 backdrop-blur-3xl flex items-center justify-between px-10 shrink-0 relative overflow-hidden">
             <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
             
             <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                   <AppWindow size={20} className="text-primary" />
                </div>
                <div>
                   <h3 className="text-lg font-black tracking-tight">
                      {search.trim() ? `Search Results: "${search}"` : (activeProjects.length > 0 && selectedFolderId ? allProjects.find(p => p.folderId === selectedFolderId)?.folderName || "Application Builder" : "Application Builder")}
                   </h3>
                   <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground/70 uppercase tracking-widest">
                      <span>{activeProjects.length} Projects</span>
                      <div className="w-1 h-1 rounded-full bg-border/40" />
                      <span>{activeFolder?.subfolders?.length || 0} Subfolders</span>
                   </div>
                </div>
             </div>

             <div className="flex items-center gap-4 relative z-10">
                <div className="relative w-64 group">
                   <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/80 group-focus-within:text-primary transition-colors" size={14} />
                   <input 
                      type="text" 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search blueprints..." 
                      className="w-full bg-muted/20 border border-border/10 rounded-lg py-1.5 pl-9 pr-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium"
                   />
                </div>
                <div className="h-8 w-px bg-border/20 mx-2" />
 
                <div className="flex items-center gap-6 bg-primary/5 px-5 py-2 rounded-2xl border border-primary/10 shadow-sm relative group overflow-hidden">
                   <div className="absolute inset-0 bg-primary/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                   <div className="relative z-10 flex flex-col">
                      <span className="text-[10px] font-black uppercase text-foreground/90 leading-none tracking-widest">Total Projects</span>
                      <span className="text-base font-black text-primary leading-none mt-1.5">{activeProjects.length}</span>
                   </div>
                   <div className="relative z-10 w-px h-8 bg-primary/10" />
                   <div className="relative z-10 flex flex-col">
                      <span className="text-[10px] font-black uppercase text-foreground/80 leading-none tracking-widest">Active Scope</span>
                      <span className="text-[10px] font-bold text-foreground/60 leading-none mt-1.5 truncate max-w-[100px]">
                         {selectedFolderId ? (allProjects.find(p => p.folderId === selectedFolderId)?.folderName || 'Folder Access') : 'Universal'}
                      </span>
                   </div>
                </div>
                <div className="flex bg-muted/10 p-1 rounded-lg border border-border/20">
                   <button 
                      onClick={() => setViewMode('grid')}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-background text-primary shadow-sm ring-1 ring-primary/10" : "text-muted-foreground/70 hover:text-primary/60")}
                   >
                      <Grid3X3 size={16} />
                   </button>
                   <button 
                      onClick={() => setViewMode('list')}
                      className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-background text-primary shadow-sm ring-1 ring-primary/10" : "text-muted-foreground/70 hover:text-primary/60")}
                   >
                      <ListIcon size={16} />
                   </button>
                </div>
                <div className="h-8 w-px bg-border/20 mx-2" />
                <Button variant="ghost" className="h-10 px-4 rounded-xl gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">
                   <Filter size={14} /> Sort & Filter
                </Button>
             </div>
          </header>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-10 relative">
             <div className="absolute inset-0 opacity-[0.01] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '48px 48px' }} />
             
             {activeProjects.length > 0 ? (
               viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 relative z-10">
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
                <div className="border border-border/20 rounded-sm overflow-hidden relative z-10">
                  <div className="grid grid-cols-[1fr_120px_80px_80px_80px] gap-2 px-3 py-2 bg-foreground/[0.02] text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/25 border-b border-border/15">
                    <span>Name</span><span>Folder</span><span>Version</span><span>Status</span><span>Action</span>
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
                   <div className="w-24 h-24 rounded-3xl bg-primary/5 border border-dashed border-primary/20 flex items-center justify-center shadow-inner group transition-all duration-700 hover:scale-110">
                      <Rocket size={40} className="text-primary/10 group-hover:text-primary transition-all duration-700 group-hover:rotate-12" />
                   </div>
                   <div className="space-y-2 max-w-sm">
                      <h4 className="text-lg font-black tracking-tight">No Apps in this Scope</h4>
                      <p className="text-xs text-muted-foreground/70 leading-relaxed font-medium">
                         Initialize your first application in this folder to start building industry-grade interfaces.
                      </p>
                   </div>
                   <Button 
                      onClick={() => handleCreateProject()}
                      className="h-10 px-8 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/5"
                   >
                      Create App
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
               className="fixed z-[9999] bg-card/95 backdrop-blur-2xl border border-border/40 rounded-sm shadow-2xl py-1 min-w-[180px]"
               style={{ left: ctxMenu.x, top: ctxMenu.y }}
               onClick={e => e.stopPropagation()}
             >
               {ctxMenu.type === 'folder' ? (
                 <>
                   <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/25">{ctxMenu.name}</div>
                   <div className="h-px bg-border/15 my-0.5" />
                   <button onClick={() => { handleCreateProject(ctxMenu.id); setCtxMenu(null); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                     <Plus size={12} className="text-primary" /> Create App
                   </button>
                 </>
               ) : (
                 <>
                   <div className="px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-muted-foreground/25 truncate max-w-[200px]">{ctxMenu.name}</div>
                   <div className="h-px bg-border/15 my-0.5" />
                   <button onClick={() => { onSelectProject(ctxMenu.id); setCtxMenu(null); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                     <Pencil size={12} /> Modify
                   </button>
                   <button className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                     <Eye size={12} /> View Details
                   </button>
                   <button className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                     <Copy size={12} /> Duplicate
                   </button>
                   <button className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                     <Rocket size={12} /> Publish
                   </button>
                   <button className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                     <FolderOpen size={12} /> Move to Folder
                   </button>
                   <div className="h-px bg-border/15 my-0.5" />
                   <button onClick={() => handleDeleteProject(ctxMenu.id, ctxMenu.name)} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-destructive/60 hover:bg-destructive/5 hover:text-destructive">
                     <Trash2 size={12} /> Delete
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
                     <h3 className="text-sm font-black uppercase tracking-wider text-rose-500">Delete App</h3>
                     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Are you absolutely sure?</p>
                   </div>
                 </div>

                 {/* Body Content */}
                 <div className="space-y-4">
                   <div className="p-4 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                     <p className="text-xs text-muted-foreground leading-relaxed">
                       You are about to delete <strong className="text-foreground">{deleteConfirm.name}</strong>. This will permanently remove the application design, workflow pipelines, and all custom UI layout states. This action cannot be undone.
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
