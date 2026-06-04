"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Briefcase, Folder, ChevronRight, MoreVertical, Plus, 
  Search, Grid, List as ListIcon, Shield, Move, Copy, 
  Trash2, Archive, Link, FileText, LayoutGrid, Users,
  ChevronDown, FolderPlus, FilePlus, Share2, Info, ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { createFolder, moveFolder, deleteFolder, getTenantsWorkspaces, getWorkspaceTree } from "@/app/actions/folderActions";
import { createProjectAction } from "@/app/actions/projectActions";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import AccessMatrix from "@/components/workspaces/access-matrix";
import { useRouter } from "next/navigation";

interface WorkspaceClientProps {
  initialWorkspaces: any[];
  activeWorkspaceId?: string;
  initialTree: { folders: any[]; rootProjects: any[] };
}

export default function WorkspaceClient({ 
  initialWorkspaces, 
  activeWorkspaceId: initialActiveId,
  initialTree 
}: WorkspaceClientProps) {
  const { role, currentUser, activeTenant, dispatchLog } = useAppContext();
  const router = useRouter();
  
  const [workspaces, setWorkspaces] = useState(initialWorkspaces);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(initialActiveId);
  const [folders, setFolders] = useState(initialTree.folders);
  const [projects, setProjects] = useState(initialTree.rootProjects);
  
  const [loading, setLoading] = useState(false);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAccessMatrixOpen, setIsAccessMatrixOpen] = useState(false);
  
  // React to Tenant Changes
  useEffect(() => {
    async function reloadTenantData() {
      if (!activeTenant) return;
      setLoading(true);
      try {
        const newWorkspaces = await getTenantsWorkspaces(activeTenant.id);
        setWorkspaces(newWorkspaces);
        
        const firstId = newWorkspaces[0]?.id;
        setActiveWorkspaceId(firstId);
        setActiveFolderId(null);
        setExpandedFolders(new Set());

        if (firstId) {
          const tree = await getWorkspaceTree(firstId);
          setFolders(tree.folders);
          setProjects(tree.rootProjects);
          setExpandedFolders(new Set(tree.folders.map(f => f.id)));
        } else {
          setFolders([]);
          setProjects([]);
        }
      } catch (e) {
        console.error("Failed to reload workspaces:", e);
      } finally {
        setLoading(false);
      }
    }
    
    // Skip on first mount if initialWorkspaces matches activeTenant
    // But since we want to be safe and initial data might be from a different tenant if SSR cache is weird, we load it.
    reloadTenantData();
  }, [activeTenant?.id]);

  // React to Workspace Selection
  useEffect(() => {
    async function reloadTree() {
      if (!activeWorkspaceId) return;
      setLoading(true);
      try {
        const tree = await getWorkspaceTree(activeWorkspaceId);
        setFolders(tree.folders);
        setProjects(tree.rootProjects);
        setActiveFolderId(null);
        setExpandedFolders(new Set(tree.folders.map(f => f.id)));
      } catch (e) {
        console.error("Failed to load workspace tree:", e);
      } finally {
        setLoading(false);
      }
    }
    reloadTree();
  }, [activeWorkspaceId]);

  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);

  // Derive current view contents
  const currentFolders = folders.filter(f => f.parentId === activeFolderId && !f.isArchived);
  const currentProjects = projects.filter(p => p.folderId === activeFolderId);

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedFolders);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedFolders(newSet);
  };

  const handleCreateFolder = async (name: string) => {
    if (!activeWorkspaceId || !activeTenant) return;
    const res = await createFolder({
      name,
      parentId: null, // Always create top-level folders
      workspaceId: activeWorkspaceId,
      tenantId: activeTenant.id,
      customerId: currentUser.customerId!
    }, role);
    if (res.success) {
      setFolders(prev => [...prev, res.folder]);
      dispatchLog("FOLDER_CREATED", name, { workspaceId: activeWorkspaceId });
    }
  };

  const FolderTreeItem = ({ folder, level = 0 }: { folder: any, level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const children = folders.filter(f => f.parentId === folder.id);
    const hasChildren = children.length > 0;
    const isActive = activeFolderId === folder.id;

    return (
      <div className="flex flex-col">
        <div 
          onClick={() => setActiveFolderId(folder.id)}
          className={cn(
            "group flex items-center gap-2 px-3 py-1.5 rounded-sm cursor-pointer transition-all",
            isActive ? "bg-primary/10 text-primary" : "hover:bg-muted text-muted-foreground"
          )}
          style={{ paddingLeft: `${level * 16 + 12}px` }}
        >
          <div 
            onClick={(e) => toggleFolder(folder.id, e)}
            className={cn(
              "p-0.5 rounded hover:bg-muted-foreground/10 transition-transform",
              isExpanded && "rotate-90",
              !hasChildren && "opacity-0 pointer-events-none"
            )}
          >
            <ChevronRight size={14} />
          </div>
          <Folder size={16} className={cn(isActive ? "text-primary fill-primary/20" : "text-muted-foreground")} />
          <span className="text-sm font-medium truncate flex-1">{folder.name}</span>
          {isActive && <div className="w-1.5 h-1.5 bg-primary rounded-full" />}
        </div>
        
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {children.map(child => (
                <FolderTreeItem key={child.id} folder={child} level={level + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex grow overflow-hidden bg-background">
      {/* Sidebar Hierarchy */}
      <aside className="w-72 border-r border-border flex flex-col bg-muted/30 backdrop-blur-xl">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-extrabold uppercase tracking-widest text-muted-foreground">Workspace</h2>
          <button className="p-1.5 hover:bg-muted rounded-sm transition-colors">
            <Plus size={16} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-6">
          <div className="space-y-4">
            <div className="px-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Select Workspace</span>
              <div className="relative group">
                <select 
                  value={activeWorkspaceId || ""}
                  onChange={(e) => setActiveWorkspaceId(e.target.value)}
                  className="w-full bg-card dark:bg-black border border-border dark:border-[#333] rounded-sm px-2 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                >
                  {workspaces.map(w => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                  {workspaces.length === 0 && <option value="">No Workspaces</option>}
                </select>
                <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              </div>
            </div>

            <div 
              onClick={() => setActiveFolderId(null)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 mx-3 rounded-sm cursor-pointer transition-all",
                activeFolderId === null ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-muted text-foreground"
              )}
            >
              <Briefcase size={18} />
              <span className="text-sm font-bold tracking-tight">Root Directory</span>
            </div>
          </div>

          <section className="space-y-2">
            <div className="px-3 flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Folders</span>
              <FolderPlus size={12} className="text-muted-foreground opacity-50" />
            </div>
            <div className="flex flex-col gap-0.5">
              {folders.filter(f => !f.parentId).map(folder => (
                <FolderTreeItem key={folder.id} folder={folder} />
              ))}
            </div>
          </section>
        </div>

        <div className="p-4 border-t border-border bg-card/50">
           <div className="bg-primary/5 rounded-sm p-3 border border-primary/10 flex flex-col gap-2">
              <div className="flex items-center justify-between leading-none">
                 <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">Active Limit</span>
                 <span className="text-[10px] font-bold text-primary">78%</span>
              </div>
              <div className="h-1.5 w-full bg-primary/10 rounded-full overflow-hidden">
                 <motion.div initial={{ width: 0 }} animate={{ width: "78%" }} className="h-full bg-primary" />
              </div>
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <header className="h-16 border-b border-border bg-background/20 backdrop-blur-2xl flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Briefcase size={16} />
              <ChevronRight size={14} className="opacity-30" />
              <span className="text-foreground">{activeWorkspace?.name || "Main Workspace"}</span>
              {activeFolderId && (
                <>
                  <ChevronRight size={14} className="opacity-30" />
                  <span className="text-primary font-bold">{folders.find(f => f.id === activeFolderId)?.name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="pl-10 pr-4 py-2 bg-muted/50 border border-border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="h-8 w-px bg-border mx-2" />
            <div className="flex bg-muted/50 p-1 rounded-sm border border-border">
              <button 
                onClick={() => setViewMode("grid")}
                className={cn("p-1.5 rounded-sm transition-all", viewMode === "grid" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <Grid size={18} />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={cn("p-1.5 rounded-sm transition-all", viewMode === "list" ? "bg-card text-primary shadow-sm" : "text-muted-foreground hover:text-foreground")}
              >
                <ListIcon size={18} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Overlay / Action Bar */}
        <div className="p-6 pb-0 flex items-center justify-between shrink-0">
           <div className="flex gap-2">
              <button
                onClick={() => handleCreateFolder("New Folder " + (folders.length + 1))}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-sm text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                 <FolderPlus size={16} /> New Folder
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-sm text-sm font-bold hover:bg-muted transition-all">
                 <FilePlus size={16} /> New Project
              </button>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                 <Users size={14} /> Shared with 4 Groups
              </div>
              {activeFolderId && (
                <button 
                  onClick={() => setIsAccessMatrixOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 rounded-sm text-sm font-bold hover:bg-indigo-500/20 transition-all"
                >
                   <Shield size={16} /> Access Matrix
                </button>
              )}
           </div>
        </div>

        {/* Access Matrix Modal */}
        <AnimatePresence>
          {isAccessMatrixOpen && activeFolderId && (
            <AccessMatrix 
              folderId={activeFolderId}
              folderName={folders.find(f => f.id === activeFolderId)?.name || "Current Folder"}
              parentId={folders.find(f => f.id === activeFolderId)?.parentId}
              onClose={() => setIsAccessMatrixOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Scrollable Items */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth relative">
          <AnimatePresence>
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-background/50 backdrop-blur-[2px] z-50 flex items-center justify-center"
              >
                 <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-xs font-bold text-primary uppercase tracking-[0.2em] animate-pulse">Syncing Resources...</span>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={cn(
            "gap-6 transition-all",
            viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" : "flex flex-col gap-2"
          )}>
            {/* Folder Rendering */}
            <AnimatePresence>
              {currentFolders.map(folder => (
                <motion.div
                  key={folder.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  onDoubleClick={() => {
                    setActiveFolderId(folder.id);
                    if (!expandedFolders.has(folder.id)) {
                      const n = new Set(expandedFolders); n.add(folder.id); setExpandedFolders(n);
                    }
                  }}
                  className={cn(
                    "group flex flex-col items-center justify-center p-6 rounded-sm border border-border bg-card shadow-sm hover:shadow-xl hover:border-primary/30 cursor-pointer transition-all relative overflow-hidden",
                    viewMode === "list" && "flex-row justify-start py-3 px-6 h-14"
                  )}
                >
                  <div className={cn("mb-4 group-hover:scale-110 transition-transform", viewMode === "list" && "mb-0 mr-4")}>
                    <IconWrapper icon={Folder} size={viewMode === "grid" ? 48 : 24} className="text-primary fill-primary/10" />
                  </div>
                  <div className={cn("text-center flex-1 min-w-0", viewMode === "list" && "text-left")}>
                    <p className="text-sm font-bold text-foreground truncate">{folder.name}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Folder</p>
                  </div>
                  <div className={cn(
                    "absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity",
                    viewMode === "list" && "relative inset-auto ml-auto opacity-100"
                  )}>
                    <button className="p-2 hover:bg-muted rounded-sm">
                      <MoreVertical size={16} className="text-muted-foreground" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Project Rendering */}
            <AnimatePresence>
              {currentProjects.map(project => (
                <motion.div
                  key={project.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => router.push(`/dashboard/automation-studio/designer?projectId=${project.id}&workspaceId=${activeWorkspaceId}`)}
                  className={cn(
                    "group flex flex-col items-start p-6 rounded-sm border border-border bg-card/40 backdrop-blur-md shadow-sm hover:shadow-2xl hover:bg-card hover:border-primary/20 cursor-pointer transition-all relative",
                    viewMode === "list" && "flex-row items-center py-3 px-6 h-14"
                  )}
                >
                  <div className={cn("mb-4 w-12 h-12 rounded-sm bg-indigo-500/10 flex items-center justify-center text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white group-hover:rotate-6 transition-all", viewMode === "list" && "mb-0 mr-4 w-10 h-10 shrink-0")}>
                    <FileText size={viewMode === "grid" ? 24 : 18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extrabold text-foreground truncate leading-tight">{project.name}</p>
                    <div className="flex items-center gap-2 mt-1 opacity-60">
                       <span className="text-[9px] font-bold text-muted-foreground tracking-widest uppercase">Version {project.version}</span>
                    </div>
                  </div>
                  <div className="ml-4 flex items-center gap-1">
                     <button className="p-2 opacity-0 group-hover:opacity-100 hover:bg-muted rounded-sm transition-all">
                        <ArrowUpRight size={16} className="text-muted-foreground hover:text-primary" />
                     </button>
                     <button className="p-2 hover:bg-muted rounded-sm">
                       <MoreVertical size={16} className="text-muted-foreground" />
                     </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Empty State */}
            {currentFolders.length === 0 && currentProjects.length === 0 && (
              <div className="col-span-full py-32 flex flex-col items-center justify-center text-center opacity-40">
                 <LayoutGrid size={64} className="mb-4 stroke-[1.5]" />
                 <h3 className="text-xl font-bold">This directory is empty</h3>
                 <p className="text-sm text-muted-foreground">Start by creating a folder or adding a new project execution unit.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
