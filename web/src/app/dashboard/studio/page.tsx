"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Flame, Folder, FolderOpen, ChevronRight, ChevronDown, FileText, Search, X, Clock, CheckCircle, Plus, BrainCircuit, Rocket, Pencil, Trash2, Copy, MoreHorizontal, Filter, ArrowUpDown, LayoutGrid, List, Eye, User, ChevronsDown, ChevronsUp, Activity, Loader2, FolderTree, FilePlus, FolderPlus, Database, Globe, Mail, MessageSquare, Zap, Cpu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { 
  getTenantsWorkspaces, 
  getTenantFolderTree,
  getWorkspaceTree,
  createFolder,
  ensureDefaultWorkspace
} from "@/app/actions/folderActions";
import { getStudioFolders, deleteStudioProject, moveStudioProject, createStudioProject } from "@/app/actions/tenantActions";
import { toast } from "sonner";

type ContextMenuState = { x: number; y: number; type: 'folder' | 'project'; id: string; name: string } | null;

export default function StudioPage() {
  const router = useRouter();
  const { activeCustomer, activeTenant, currentUser } = useAppContext();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [folderTree, setFolderTree] = useState<any[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'status'>('date');
  const [moveModal, setMoveModal] = useState<{ projectId: string; projectName: string } | null>(null);
  const [newProjectModal, setNewProjectModal] = useState<{ folderId: string; folderName: string } | null>(null);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDescription, setNewProjectDescription] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  useEffect(() => {
    if (activeTenant?.id) {
       getTenantsWorkspaces(activeTenant.id).then(ws => {
         setWorkspaces(ws);
         if (ws.length > 0 && !selectedWorkspace) {
           setSelectedWorkspace(ws[0]);
         }
       });
    }
  }, [activeTenant?.id]);

  const refreshFolders = useCallback(async () => {
    const cid = activeCustomer?.id || activeTenant?.customerId;
    if (!cid || !activeTenant?.id) return;
    
    let currentWorkspaces = workspaces;
    if (currentWorkspaces.length === 0) {
      const defaultWs = await ensureDefaultWorkspace(activeTenant.id, cid);
      if (defaultWs) {
        currentWorkspaces = [defaultWs];
        setWorkspaces(currentWorkspaces);
        setSelectedWorkspace(defaultWs);
      }
    }

    setLoading(true);
    try {
      const { folders } = await getTenantFolderTree(
        cid, 
        activeTenant.id, 
        currentUser.role, 
        [currentUser.role] // Changed from roles to [role] as roles doesn't exist
      );
      
      const activeWsId = selectedWorkspace?.id || currentWorkspaces[0]?.id;
      const filteredFolders = activeWsId 
        ? folders.filter(f => f.workspaceId === activeWsId)
        : folders;

      const buildTree = (list: any[], parentId: string | null = null): any[] => {
        return list
          .filter(f => f.parentId === parentId)
          .map(f => ({
            ...f,
            subfolders: buildTree(list, f.id)
          }));
      };

      const tree = buildTree(filteredFolders);
      setFolderTree(tree);

      // Auto-expand ALL folders
      if (tree.length > 0) {
        const allExpanded: Record<string, boolean> = {};
        const expandAll = (list: any[]) => {
          list.forEach(f => {
            allExpanded[f.id] = true;
            if (f.subfolders && f.subfolders.length > 0) expandAll(f.subfolders);
          });
        };
        expandAll(tree);
        setExpandedFolders(allExpanded);
      }
    } catch (err) {
      console.error("Failed to load Studio tree:", err);
    } finally {
      setLoading(false);
    }
  }, [activeCustomer?.id, activeTenant?.id, selectedWorkspace?.id, currentUser]);

  useEffect(() => {
    refreshFolders();
  }, [refreshFolders]);

  // Close context menu on click
  useEffect(() => {
    const close = () => setCtxMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

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

  // Collect all projects across folder tree
  const getAllProjects = useCallback((folders: any[]): any[] => {
    return folders.reduce((acc: any[], f: any) => {
      const projs = (f.projects || []).map((p: any) => ({ ...p, folderName: f.name, folderId: f.id }));
      return [...acc, ...projs, ...getAllProjects(f.subfolders || [])];
    }, []);
  }, []);

  const allProjects = getAllProjects(folderTree);
  const filteredProjects = allProjects.filter(p => {
    const matchFolder = !selectedFolderId || p.folderId === selectedFolderId;
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase());
    return matchFolder && matchSearch;
  }).sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'status') return (a.studioWorkflows?.status || '').localeCompare(b.studioWorkflows?.status || '');
    return 0; // date — already in DB order
  });

  const handleFolderContext = (e: React.MouseEvent, folder: any) => {
    e.preventDefault(); e.stopPropagation();
    setCtxMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id, name: folder.name });
  };

  const handleProjectContext = (e: React.MouseEvent, proj: any) => {
    e.preventDefault(); e.stopPropagation();
    // Use relative positioning or ensure portal works correctly
    setCtxMenu({ x: e.clientX, y: e.clientY, type: 'project', id: proj.id, name: proj.name });
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    const res = await deleteStudioProject(id);
    if (res.success) {
      toast.success("Project deleted successfully");
      refreshFolders();
    } else {
      toast.error(res.error || "Failed to delete project");
    }
    setCtxMenu(null);
  };

  const handleMoveProject = async (targetFolderId: string | null) => {
    if (!moveModal) return;
    const res = await moveStudioProject(moveModal.projectId, targetFolderId);
    if (res.success) {
      toast.success(`Project moved successfully`);
      refreshFolders();
      setMoveModal(null);
    } else {
      toast.error(res.error || "Failed to move project");
    }
  };

  const handleCreateProject = async () => {
    const cid = activeCustomer?.id || activeTenant?.customerId;
    if (!newProjectModal || !newProjectName.trim()) return;
    if (!cid || !activeTenant?.id) {
       toast.error("Account context missing");
       return;
    }
    
    setIsCreatingProject(true);
    try {
      const res = await createStudioProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
        folderId: newProjectModal.folderId,
        customerId: cid,
        tenantId: activeTenant.id,
        workspaceId: selectedWorkspace?.id || "",
        nodes: [],
        edges: [],
        variables: [],
        arguments: []
      });

      if (res.success) {
        toast.success(`Project "${newProjectName}" created successfully`);
        setNewProjectName("");
        setNewProjectDescription("");
        setNewProjectModal(null);
        refreshFolders();
        
        // Redirect to designer
        router.push(`/dashboard/studio/designer?projectId=${res.projectId}&workflowId=${res.workflowId}`);
      } else {
        toast.error(res.error || "Failed to create project");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setIsCreatingProject(false);
    }
  };

  const renderFolder = (folder: any, depth: number = 0) => {
    const isExpanded = expandedFolders[folder.id];
    const isSelected = selectedFolderId === folder.id;
    const count = (folder.projects?.length || 0);
    return (
      <div key={folder.id} className="flex flex-col">
        <div 
          onClick={() => setSelectedFolderId(isSelected ? null : folder.id)}
          onContextMenu={(e) => handleFolderContext(e, folder)}
          className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left relative z-10 mx-2 my-1 group/folder-btn cursor-pointer",
            isSelected ? "bg-[#633F2E] text-white shadow-xl shadow-[#633F2E]/30" : "hover:bg-[#633F2E]/5 text-[#2D2D2D]/70"
          )}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          <div className="flex items-center gap-3 flex-1 min-w-0">
             {/* Expand Icon */}
             {folder.subfolders?.length > 0 ? (
                <div 
                   onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
                   className="w-4 h-4 flex items-center justify-center shrink-0"
                >
                   {isExpanded ? <ChevronDown size={14} className={cn(isSelected ? "text-white" : "text-[#2D2D2D]/30")} /> : <ChevronRight size={14} className={cn(isSelected ? "text-white" : "text-[#2D2D2D]/30")} />}
                </div>
             ) : (
                <div className="w-4" />
             )}
             
             {/* Resource Icon in Circle for Selected */}
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
                   "text-[9px] font-bold uppercase tracking-tight truncate opacity-40 mt-1",
                   isSelected ? "text-white/70" : "text-[#633F2E]"
                )}>
                   SCOPE: DEFAULT WORKSPACE [{activeTenant?.type || "PRODUCTION"}]
                </span>
             </div>
          </div>

          {count > 0 && (
            <span className={cn(
              "text-[9px] px-1.5 rounded ml-auto font-mono",
              isSelected ? "text-white/40 bg-white/10" : "text-[#2D2D2D]/20 bg-[#2D2D2D]/5"
            )}>
              {count}
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="flex flex-col">
            {(folder.subfolders || []).map((sub: any) => renderFolder(sub, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const getDynamicProjectIcon = (name: string, description: string) => {
    const text = (name + " " + description).toLowerCase();
    if (text.includes("data") || text.includes("database") || text.includes("etl")) return <Database size={20} />;
    if (text.includes("web") || text.includes("api") || text.includes("http")) return <Globe size={20} />;
    if (text.includes("mail") || text.includes("email") || text.includes("smtp")) return <Mail size={20} />;
    if (text.includes("chat") || text.includes("message") || text.includes("slack") || text.includes("teams")) return <MessageSquare size={20} />;
    if (text.includes("ai") || text.includes("bot") || text.includes("intelligent")) return <BrainCircuit size={20} />;
    if (text.includes("fast") || text.includes("quick") || text.includes("zap")) return <Zap size={20} />;
    if (text.includes("process") || text.includes("compute") || text.includes("calc")) return <Cpu size={20} />;
    return <Rocket size={20} />; // Default
  };

  const getStatusConfig = (proj: any) => {
    const status = proj.studioWorkflows?.status || 'Draft';
    switch (status) {
      case 'Published': return { label: 'Published', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: <CheckCircle size={9} /> };
      case 'Deployed': return { label: 'Deployed', color: 'text-sky-400 bg-sky-500/10 border-sky-500/20', icon: <Rocket size={9} /> };
      default: return { label: 'Draft', color: 'text-muted-foreground/40 bg-muted/20 border-border/20', icon: <Clock size={9} /> };
    }
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT PANEL — Folder Tree */}
      <div className="w-[480px] border-r border-[#D8CBB7]/40 flex flex-col shrink-0 bg-[#F4EDE4] overflow-hidden relative group/sidebar">
        {/* Sidebar Header: Tabs & Search */}
        <div className="p-4 space-y-4 border-b border-[#D8CBB7]/40 bg-[#633F2E]/5">
            <div className="flex items-center justify-between">
               <button className="text-[11px] font-black uppercase tracking-[0.2em] text-[#633F2E] border-b-2 border-[#633F2E] pb-1">Registry</button>
            </div>

           <div className="flex items-center gap-2">
              <div className="relative flex-1 group">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2D2D2D]/30 group-focus-within:text-[#633F2E] transition-colors" />
                 <input 
                   placeholder="Search folders..." 
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="w-full pl-10 pr-3 py-2 text-xs bg-[#E8DDCB] border border-[#D8CBB7] rounded-md focus:outline-none focus:ring-2 focus:ring-[#633F2E]/10 focus:border-[#633F2E]/30 transition-all placeholder:text-[#2D2D2D]/20 font-bold"
                 />
              </div>
              <div className="flex gap-1">
                 <button onClick={handleExpandAll} className="p-2 bg-[#E8DDCB] border border-[#D8CBB7] rounded-md hover:bg-[#D8CBB7] transition-all text-[#2D2D2D]/40" title="Expand All"><ChevronsDown size={14} /></button>
                 <button onClick={handleCollapseAll} className="p-2 bg-[#E8DDCB] border border-[#D8CBB7] rounded-md hover:bg-[#D8CBB7] transition-all text-[#2D2D2D]/40" title="Collapse All"><ChevronsUp size={14} /></button>
                 <div className="h-8 w-px bg-[#D8CBB7] mx-1" />
                 {[1, 2, 3, 4].map(l => (
                    <button 
                      key={l}
                      onClick={() => handleExpandToLevel(l)}
                      className="px-2 py-1 bg-[#E8DDCB] border border-[#D8CBB7] rounded-md text-[10px] font-black text-[#2D2D2D]/40 hover:text-[#633F2E] hover:border-[#633F2E]/30 transition-all uppercase"
                    >
                       L{l}
                    </button>
                 ))}
              </div>
           </div>
        </div>

        {/* Folder Tree */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 opacity-30">
               <Loader2 size={24} className="animate-spin text-primary" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em]">Synchronizing...</span>
            </div>
          ) : folderTree.length === 0 ? (
            <div className="text-center py-12 px-6 border border-dashed border-border/20 rounded-sm mx-2">
               <p className="text-[10px] text-muted-foreground/20 font-bold uppercase tracking-widest italic">No active resources found in this scope.</p>
            </div>
          ) : (
            folderTree.map(f => renderFolder(f, 0))
          )}
        </div>

      </div>

      {/* RIGHT PANEL — Project Grid */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-border/15 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold text-foreground/70">
              {selectedFolderId ? folderTree.find(f => f.id === selectedFolderId)?.name || 'Folder' : 'All Projects'}
            </h2>
            <span className="text-[9px] text-muted-foreground/25 bg-muted/20 px-1.5 py-0.5 rounded">{filteredProjects.length} projects</span>
          </div>
          <div className="flex items-center gap-4 flex-1 max-w-md mx-8">
            <div className="relative flex-1 group">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" size={14} />
               <input 
                  type="text" 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search project blueprints..." 
                  className="w-full bg-muted/20 border border-border/10 rounded-lg py-1.5 pl-9 pr-3 text-[11px] focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium"
               />
               {search && (
                 <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-foreground">
                    <X size={12} />
                 </button>
               )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
               onClick={() => {
                 const findFolder = (folders: any[], id: string): any => {
                   for (const f of folders) {
                     if (f.id === id) return f;
                     if (f.subfolders) {
                       const found = findFolder(f.subfolders, id);
                       if (found) return found;
                     }
                   }
                   return null;
                 };
                 const folder = selectedFolderId ? findFolder(folderTree, selectedFolderId) : null;
                 setNewProjectModal({ 
                   folderId: selectedFolderId || "", 
                   folderName: folder?.name || "Root" 
                 });
               }}
               className="h-8 px-4 bg-[#633F2E] text-white text-[10px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-[#633F2E]/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center gap-2"
            >
               <Plus size={14} /> New Project
            </button>
            <div className="flex border border-border/20 rounded-lg overflow-hidden bg-background/50">
               <button onClick={() => setViewMode('grid')} className={cn("p-2 transition-colors", viewMode === 'grid' ? "bg-primary/10 text-primary" : "text-muted-foreground/30 hover:text-muted-foreground/50")}>
                 <LayoutGrid size={14} />
               </button>
               <button onClick={() => setViewMode('list')} className={cn("p-2 transition-colors", viewMode === 'list' ? "bg-primary/10 text-primary" : "text-muted-foreground/30 hover:text-muted-foreground/50")}>
                 <List size={14} />
               </button>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div 
          className="flex-1 overflow-y-auto custom-scrollbar p-5"
          onContextMenu={(e) => {
            e.preventDefault();
            const findFolder = (folders: any[], id: string): any => {
              for (const f of folders) {
                if (f.id === id) return f;
                if (f.subfolders) {
                  const found = findFolder(f.subfolders, id);
                  if (found) return found;
                }
              }
              return null;
            };
            const folder = selectedFolderId ? findFolder(folderTree, selectedFolderId) : null;
            if (folder) {
              setCtxMenu({ x: e.clientX, y: e.clientY, type: 'folder', id: folder.id, name: folder.name });
            }
          }}
        >
          {filteredProjects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Folder size={40} className="text-muted-foreground/10" />
              <span className="text-sm text-muted-foreground/20 font-medium">No projects found</span>
              <Link href="/dashboard/studio/designer" className="text-[11px] text-primary/70 hover:text-primary font-semibold flex items-center gap-1"><Plus size={12} /> Create your first automation</Link>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProjects.map((proj, i) => {
                const st = getStatusConfig(proj);
                const wf = proj.studioWorkflows;
                return (
                  <motion.div key={proj.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
                    <div
                      onContextMenu={e => handleProjectContext(e, proj)}
                      className="group bg-card border border-border/40 rounded-xl overflow-hidden shadow-sm transition-all hover:shadow-2xl hover:border-primary/40 flex flex-col h-[320px] relative"
                    >
                      {/* Card Header with Status Badge */}
                      <div className="h-20 bg-gradient-to-br from-[#633F2E]/10 to-transparent p-4 flex items-start justify-between border-b border-border/10">
                        <div className="w-10 h-10 rounded-xl bg-white/80 shadow-sm flex items-center justify-center text-[#633F2E] border border-border/10 group-hover:scale-110 transition-transform">
                          {getDynamicProjectIcon(proj.name, proj.description || "")}
                        </div>
                        <div className={cn("px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm", st.color)}>
                          {st.icon} {st.label}
                        </div>
                      </div>

                      {/* Project Identity */}
                      <div className="p-5 flex-1 flex flex-col min-w-0">
                        <h3 className="text-sm font-bold text-foreground mb-1.5 truncate group-hover:text-primary transition-colors leading-tight">
                          {proj.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground/60 leading-relaxed line-clamp-2 min-h-[32px] mb-4 italic">
                          {proj.description || "Comprehensive automation blueprint designed for scalable orchestration."}
                        </p>

                        {/* Lifecycle Metadata Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-4 mt-auto pt-4 border-t border-border/10">
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/30">Version Stack</span>
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-foreground/80">Draft</span>
                                  <span className="text-[10px] font-mono text-primary bg-primary/5 px-1 rounded">v{wf?.version || "1.0.0"}</span>
                               </div>
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-bold text-foreground/80">Live</span>
                                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1 rounded">v{proj.version || "None"}</span>
                               </div>
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/30">Ownership</span>
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-1.5">
                                  <User size={10} className="text-[#633F2E]/40" />
                                  <span className="text-[10px] font-bold text-foreground/80 truncate">Author: Admin</span>
                               </div>
                               <div className="flex items-center gap-1.5">
                                  <Pencil size={10} className="text-[#633F2E]/40" />
                                  <span className="text-[10px] font-bold text-foreground/80 truncate">Editor: System</span>
                               </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/30">Lifecycle</span>
                            <div className="flex flex-col gap-1">
                               <div className="flex items-center gap-1.5">
                                  <Plus size={10} className="text-[#633F2E]/40" />
                                  <span className="text-[10px] font-medium text-muted-foreground italic">{new Date(proj.createdAt).toLocaleDateString()}</span>
                               </div>
                               <div className="flex items-center gap-1.5">
                                  <Clock size={10} className="text-[#633F2E]/40" />
                                  <span className="text-[10px] font-medium text-muted-foreground italic">{new Date(proj.updatedAt).toLocaleDateString()}</span>
                               </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Overlay */}
                      <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-card via-card/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out border-t border-border/10">
                        <button 
                          onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/studio/designer?projectId=${proj.id}${wf?.id ? `&workflowId=${wf.id}` : ''}`); }}
                          className="w-full py-2.5 bg-[#633F2E] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-lg shadow-lg shadow-[#633F2E]/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <Eye size={14} /> View Blueprint
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* List view */
            <div className="border border-border/20 rounded-sm overflow-hidden">
              <div className="grid grid-cols-[1fr_120px_80px_80px_80px] gap-2 px-3 py-2 bg-foreground/[0.02] text-[8px] font-bold uppercase tracking-[0.15em] text-muted-foreground/25 border-b border-border/15">
                <span>Name</span><span>Folder</span><span>Version</span><span>Status</span><span>Action</span>
              </div>
              {filteredProjects.map(proj => {
                const st = getStatusConfig(proj);
                const wf = proj.studioWorkflows;
                return (
                  <div
                    key={proj.id}
                    onContextMenu={e => handleProjectContext(e, proj)}
                    onClick={() => router.push(`/dashboard/studio/designer?projectId=${proj.id}${wf?.id ? `&workflowId=${wf.id}` : ''}`)}
                    className="grid grid-cols-[1fr_120px_80px_80px_80px] gap-2 px-3 py-2.5 border-b border-border/10 hover:bg-primary/[0.02] cursor-pointer items-center"
                  >
                    <div className="flex items-center gap-2">
                      <FileText size={12} className="text-muted-foreground/20 shrink-0" />
                      <span className="text-[11px] font-semibold text-foreground/60 truncate">{proj.name}</span>
                    </div>
                    <span className="text-[9px] text-muted-foreground/25 truncate">{proj.folderName}</span>
                    <span className="text-[9px] font-mono text-muted-foreground/20">v{proj.version || '1.0.0'}</span>
                    <span className={cn("text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border flex items-center gap-1 w-fit", st.color)}>
                      {st.icon} {st.label}
                    </span>
                    <button className="text-muted-foreground/20 hover:text-foreground w-fit" onClick={e => { e.stopPropagation(); handleProjectContext(e, proj); }}>
                      <MoreHorizontal size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Context Menu — rendered via portal to body to avoid transform offset issues */}
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
                  <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/25">{ctxMenu.name}</div>
                  <div className="h-px bg-border/15 my-0.5" />
                  <button onClick={() => { setNewProjectModal({ folderId: ctxMenu.id, folderName: ctxMenu.name }); setCtxMenu(null); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                    <Plus size={12} className="text-primary" /> New Project
                  </button>
                  <div className="h-px bg-border/15 my-0.5" />
                  <button onClick={() => { router.push(`/dashboard/studio/designer?folderId=${ctxMenu.id}`); setCtxMenu(null); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                    <Flame size={12} /> Visual Designer
                  </button>
                  <button onClick={() => { router.push('/dashboard/studio/ai-builder'); setCtxMenu(null); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                    <BrainCircuit size={12} /> AI Builder
                  </button>
                  <div className="h-px bg-border/15 my-0.5" />
                  <button onClick={() => { router.push('/dashboard/studio/bot-library'); setCtxMenu(null); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                    <Plus size={12} /> Create Library
                  </button>
                </>
              ) : (
                <>
                  <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-[0.15em] text-muted-foreground/25 truncate max-w-[200px]">{ctxMenu.name}</div>
                  <div className="h-px bg-border/15 my-0.5" />
                  <button onClick={() => { const p = allProjects.find(p => p.id === ctxMenu.id); router.push(`/dashboard/studio/designer?projectId=${ctxMenu.id}${p?.studioWorkflows?.id ? `&workflowId=${p.studioWorkflows.id}` : ''}`); setCtxMenu(null); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
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
                  <button onClick={() => { setMoveModal({ projectId: ctxMenu.id, projectName: ctxMenu.name }); setCtxMenu(null); }} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-foreground/60 hover:bg-primary/5 hover:text-primary">
                    <FolderOpen size={12} /> Move to Folder
                  </button>
                  <div className="h-px bg-border/15 my-0.5" />
                  <button onClick={() => handleDeleteProject(ctxMenu.id)} className="flex items-center gap-2 w-full px-3 py-1.5 text-[11px] text-destructive/60 hover:bg-destructive/5 hover:text-destructive">
                    <Trash2 size={12} /> Delete
                  </button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* New Project Modal */}
      <AnimatePresence>
        {newProjectModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !isCreatingProject && setNewProjectModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-border/10 flex items-center justify-between bg-primary/5">
                <h3 className="text-sm font-bold flex items-center gap-2"><Plus size={14} className="text-primary" /> Create New Project</h3>
                <button onClick={() => setNewProjectModal(null)} className="text-muted-foreground/30 hover:text-foreground"><X size={16} /></button>
              </div>
              
              <div className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Target Folder</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/20 border border-border/10 rounded-lg">
                    <Folder size={14} className="text-amber-500/60" />
                    <span className="text-[11px] font-bold text-foreground/80">{newProjectModal.folderName}</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Project Name</label>
                  <input 
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Enter unique project name..."
                    className="w-full px-3 py-2.5 bg-background border border-border/40 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium"
                    onKeyDown={(e) => e.key === "Enter" && handleCreateProject()}
                  />
                  <p className="text-[9px] text-muted-foreground/40 italic">Project names must be unique within the same folder.</p>
                </div>

                <div className="space-y-1.5 mt-4">
                  <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Project Description</label>
                  <textarea 
                    value={newProjectDescription}
                    onChange={(e) => setNewProjectDescription(e.target.value)}
                    placeholder="Briefly describe the purpose of this automation..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-background border border-border/40 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all font-medium resize-none"
                  />
                  <p className="text-[9px] text-muted-foreground/40 italic">Used to dynamically allocate an icon and document intent.</p>
                </div>
              </div>

              <div className="p-4 bg-muted/20 border-t border-border/10 flex justify-end gap-2">
                <button 
                  onClick={() => setNewProjectModal(null)} 
                  disabled={isCreatingProject}
                  className="px-4 py-2 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleCreateProject}
                  disabled={isCreatingProject || !newProjectName.trim()}
                  className="px-6 py-2 bg-[#633F2E] text-white text-[11px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-[#633F2E]/20 hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isCreatingProject ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                  {isCreatingProject ? "Creating..." : "Create Project"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Move Project Modal */}
      <AnimatePresence>
        {moveModal && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMoveModal(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
              <div className="p-4 border-b border-border/10 flex items-center justify-between">
                <h3 className="text-sm font-bold flex items-center gap-2"><FolderOpen size={14} className="text-primary" /> Move Project</h3>
                <button onClick={() => setMoveModal(null)} className="text-muted-foreground/30 hover:text-foreground"><X size={16} /></button>
              </div>
              <div className="p-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                <p className="px-3 py-2 text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest">Select Destination Folder</p>
                
                {/* Root option */}
                <button 
                  onClick={() => handleMoveProject(null)}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-primary/10 rounded-lg text-left group transition-all"
                >
                  <LayoutGrid size={13} className="text-muted-foreground/40" />
                  <span className="text-[11px] font-semibold">Project Root</span>
                </button>

                <div className="h-px bg-border/10 my-1 mx-2" />

                {/* Recursive Folder Picker */}
                {(() => {
                  const renderOption = (folder: any, depth: number = 0) => (
                    <React.Fragment key={folder.id}>
                      <button 
                        onClick={() => handleMoveProject(folder.id)}
                        className="flex items-center gap-2 w-full px-3 py-2 hover:bg-primary/10 rounded-lg text-left group transition-all"
                        style={{ paddingLeft: `${depth * 12 + 12}px` }}
                      >
                        <Folder size={13} className="text-amber-500/60 shrink-0" />
                        <span className="text-[11px] font-semibold truncate">{folder.name}</span>
                      </button>
                      {folder.subfolders?.map((sub: any) => renderOption(sub, depth + 1))}
                    </React.Fragment>
                  );
                  return folderTree.map(f => renderOption(f, 0));
                })()}
              </div>
              <div className="p-4 bg-muted/20 border-t border-border/10 flex justify-end">
                <button onClick={() => setMoveModal(null)} className="px-4 py-1.5 text-[11px] font-bold text-muted-foreground hover:text-foreground transition-all">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
