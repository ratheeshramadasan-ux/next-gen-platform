"use client";

import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { 
  FolderTree, 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  ShieldCheck, 
  Activity, 
  Settings, 
  Search,
  Users,
  Key,
  CreditCard,
  Monitor,
  LayoutGrid,
  History,
  RotateCw,
  Loader2,
  Trash2,
  Lock,
  ExternalLink,
  ArrowRight,
  User,
  UserCircle,
  Settings2,
  Edit2,
  Move,
  ChevronsDown,
  ChevronsUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { 
  getTenantsWorkspaces, 
  getWorkspaceTree, 
  getTenantFolderTree,
  createFolder, 
  deleteFolder, 
  toggleFolderLockAction,
  ensureDefaultWorkspace,
  renameFolder,
  moveFolder
} from "@/app/actions/folderActions";
import { getGlobalAuditLogs } from "@/app/actions/tenantActions";
import { toast } from "sonner";

export default function FolderStructurePage() {
  const { activeTenant, activeCustomer, currentUser } = useAppContext();
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState<any>(null);
  const [folderTree, setFolderTree] = useState<any[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<any>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [permissionView, setPermissionView] = useState<"Group" | "User">("Group");
  const [activeTab, setActiveTab] = useState<"Structure" | "Operations" | "Permissions" | "Licenses" | "Machines">("Structure");
  const [loading, setLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [createModal, setCreateModal] = useState<{ isOpen: boolean, parentId: string | null }>({ isOpen: false, parentId: null });
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, folder: any } | null>(null);

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleContextMenu = (e: React.MouseEvent, folder: any) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, folder });
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (activeTenant?.id) {
       loadWorkspaces();
    }
  }, [activeTenant?.id]);

  useEffect(() => {
    if (activeTenant?.id) {
       loadFolderTree();
       loadLogs();
    }
  }, [activeCustomer?.id, activeTenant?.id, selectedWorkspace?.id, selectedFolder?.id]);

  const loadLogs = async () => {
    setLoadingLogs(true);
    // If a folder is selected, we want to limit logs to that folder and its children
    // We pass the selectedFolder id to the server action
    const logs = await getGlobalAuditLogs(
      currentUser.customerId, 
      "Folder", 
      selectedFolder?.id
    );
    setAuditLogs(logs);
    setLoadingLogs(false);
  };

  const loadWorkspaces = async () => {
    if (!activeTenant?.id) return;
    let data = await getTenantsWorkspaces(activeTenant.id);
    
    // Auto-provision if missing
    const cid = activeCustomer?.id || activeTenant?.customerId;
    if (data.length === 0 && cid) {
      const def = await ensureDefaultWorkspace(activeTenant.id, cid);
      if (def) data = [def];
    }

    setWorkspaces(data);
    if (data.length > 0) {
      setSelectedWorkspace(data[0]);
    } else {
      setSelectedWorkspace(null);
    }
  };

  const loadFolderTree = async () => {
    const cid = activeCustomer?.id || activeTenant?.customerId;
    if (!cid || !activeTenant?.id) {
      setFolderTree([]);
      return;
    }
    setLoading(true);
    try {
      // Use getTenantFolderTree to match Studio Builder logic
      const { folders } = await getTenantFolderTree(
        cid, 
        activeTenant.id, 
        currentUser.role, 
        [currentUser.role]
      );
      
      // Filter by selected workspace if one is explicitly selected (and it's not the 'All' scope)
      const filteredFolders = selectedWorkspace 
        ? folders.filter(f => f.workspaceId === selectedWorkspace.id)
        : folders;

      // Simple tree builder logic
      const buildTree = (list: any[], parentId: string | null = null): any[] => {
        return list
          .filter(f => f.parentId === parentId)
          .map(f => ({
            ...f,
            children: buildTree(list, f.id)
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
            if (f.children && f.children.length > 0) expandAll(f.children);
          });
        };
        expandAll(tree);
        setExpandedFolders(allExpanded);
      }
    } catch (err) {
      console.error("Failed to load tree:", err);
      toast.error("Failed to load folder structure");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewFolder = (parentId: string | null = null) => {
    setContextMenu(null);
    setCreateModal({ isOpen: true, parentId });
  };

  const processFolderCreation = async (input: string, parentId: string | null) => {
    if (!input.trim()) return;
    const cid = activeCustomer?.id || activeTenant?.customerId;
    if (!activeTenant) {
      toast.error("No active tenant selected. Please select an organization first.");
      return;
    }
    if (!cid) {
      toast.error("No customer context found. Please select an organization.");
      return;
    }
    if (!currentUser) {
      toast.error("User session not found. Please refresh the page.");
      return;
    }
    
    // Auto-provision workspace if none selected
    let ws = selectedWorkspace;
    if (!ws) {
      const provisioned = await ensureDefaultWorkspace(activeTenant.id, cid);
      if (provisioned) {
        ws = provisioned;
        setWorkspaces(prev => [...prev, provisioned]);
        setSelectedWorkspace(provisioned);
      } else {
        toast.error("No workspace available. Please create a workspace first.");
        return;
      }
    }

    const names = input.split(/,|\n/).map(n => n.trim()).filter(n => n.length > 0);
    if (names.length === 0) return;

    setLoading(true);
    let successCount = 0;
    let lastError = null;

    for (const name of names) {
      const result = await createFolder({
        name,
        parentId,
        workspaceId: ws.id,
        tenantId: activeTenant.id,
        customerId: cid
      }, currentUser.name || "Administrator");

      if (result.success) {
        successCount++;
      } else {
        lastError = result.error;
      }
    }

    if (successCount > 0) {
      toast.success(names.length > 1 
        ? `${successCount} folders provisioned successfully` 
        : "Structural scope created successfully"
      );
      if (parentId) {
        setExpandedFolders(prev => ({ ...prev, [parentId]: true }));
      }
      loadFolderTree();
      loadLogs();
    }

    if (lastError && successCount < names.length) {
      toast.error(names.length > 1 ? `Some folders failed: ${lastError}` : lastError);
    }
    setLoading(false);
  };

  const handleToggleLock = async () => {
    if (!selectedFolder) return;
    try {
      const result = await toggleFolderLockAction(selectedFolder.id, !selectedFolder.isGovernanceLocked, currentUser.role);
      if (result.success && result.folder) {
        toast.success(result.folder.isGovernanceLocked ? "Folder Locked" : "Folder Unlocked");
        setSelectedFolder(result.folder);
        loadFolderTree();
        loadLogs();
      } else {
        toast.error(result.error || "Failed to update governance lock");
      }
    } catch (err: any) {
      toast.error("An unexpected error occurred");
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) return;
    await handleDeleteFolderWithTarget(selectedFolder);
  };

  const handleRenameFolder = async (folder: any) => {
    if (folder.isGovernanceLocked) {
      toast.error("Folder is locked.");
      return;
    }
    setContextMenu(null);
    const newName = prompt("Rename folder to:", folder.name);
    if (!newName || newName === folder.name) return;

    setLoading(true);
    const result = await renameFolder(folder.id, newName, currentUser.name || "Administrator");
    if (result.success) {
      toast.success("Folder renamed successfully");
      loadFolderTree();
      loadLogs();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleMoveFolder = async (folder: any) => {
    if (folder.isGovernanceLocked) {
      toast.error("Folder is locked.");
      return;
    }
    setContextMenu(null);
    toast.info("Move operation: Please use drag and drop or select a target ID in the next update. This feature is currently in transition.");
  };

  const handleDeleteFolderWithTarget = async (folder: any) => {
    setContextMenu(null);
    if (folder.isGovernanceLocked) {
      toast.error("Cannot delete a governance-locked folder. Unlock it first.");
      return;
    }
    if (!confirm(`Are you sure you want to delete "${folder.name}"? This action cannot be undone.`)) return;

    setLoading(true);
    const result = await deleteFolder(folder.id);
    if (result.success) {
      toast.success("Folder removed from structure");
      if (selectedFolder?.id === folder.id) setSelectedFolder(null);
      loadFolderTree();
      loadLogs();
    } else {
      toast.error(result.error);
    }
    setLoading(false);
  };

  const handleExpandAll = () => {
    const allIds: Record<string, boolean> = {};
    const traverse = (folders: any[]) => {
      folders.forEach(f => {
        allIds[f.id] = true;
        if (f.children && f.children.length > 0) traverse(f.children);
      });
    };
    traverse(folderTree);
    setExpandedFolders(allIds);
    toast.success("Structure expanded");
  };

  const handleCollapseAll = () => {
    setExpandedFolders({});
    toast.success("Structure collapsed");
  };

  const handleExpandToLevel = (targetLevel: number) => {
    const allIds: Record<string, boolean> = {};
    const traverse = (folders: any[]) => {
      folders.forEach(f => {
        if (f.level < targetLevel) {
          allIds[f.id] = true;
          if (f.children && f.children.length > 0) traverse(f.children);
        }
      });
    };
    traverse(folderTree);
    setExpandedFolders(allIds);
    toast.success(`Expanded to Level ${targetLevel + 1}`);
  };

  // Governance Gate: Block folder access for non-approved customers
  if (activeCustomer && activeCustomer.status !== "Active") {
    return (
      <div className="min-h-full -m-6 p-6 bg-background flex flex-col items-center justify-center gap-6 h-[calc(100vh-3.5rem)]">
        <div className="max-w-lg text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-sm bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <ShieldCheck size={40} className="text-amber-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Folder management is unavailable for <strong className="text-foreground">{activeCustomer.companyName}</strong> because 
              the customer is currently in <strong className="text-amber-500">{activeCustomer.status}</strong> status.
            </p>
          </div>
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-sm p-4 text-left space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Required Action</span>
            <p className="text-xs text-muted-foreground leading-relaxed">
              A secondary Platform Super Admin must finalize the customer activation through the 
              <strong className="text-foreground"> Approval Hub</strong> before tenants, folders, and workspaces can be provisioned.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 animate-in slide-in-from-bottom duration-500 flex flex-col h-full overflow-hidden">
      
      {/* Page Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
             <FolderTree size={12} />
             <span>Workspace / Manage Folders</span>
          </div>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-black text-foreground tracking-tight">Folders</h1>
             <div className="h-6 w-[1px] bg-border mx-1" />
             
             {/* Environment & Workspace Context Display */}
             <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 border border-border rounded-sm">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{activeTenant?.name || "Select Tenant..."}</span>
                </div>
                <ChevronRight size={12} className="text-muted-foreground/30" />
                <div className="flex items-center gap-2 bg-primary/5 px-3 py-1.5 border border-primary/20 rounded-sm">
                   <LayoutGrid size={12} className="text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-primary">{selectedWorkspace?.name || "No Scope"}</span>
                </div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="bg-muted border border-border px-3 py-1.5 text-xs font-bold flex items-center gap-2 hover:bg-card transition-all rounded-sm shadow-sm group">
            <History size={14} className="group-hover:rotate-180 transition-transform duration-500" />
            <span>View Audit</span>
          </button>
          <button className="bg-primary text-white px-3 py-1.5 text-xs font-bold flex items-center gap-2 hover:opacity-90 transition-all rounded-sm shadow-lg shadow-primary/20" onClick={() => handleCreateNewFolder(null)}>
            <Plus size={14} />
            <span>New Folder</span>
          </button>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Tree View Area */}
        <div className="w-1/3 flex flex-col gap-4 overflow-hidden">
          <div className="bg-card/40 border border-border rounded-sm flex-1 overflow-y-auto p-4 space-y-4">
             {/* Workspace Selector */}
             <div className="space-y-2">
                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Folder Scope</label>
                <div className="grid grid-cols-1 gap-1">
                   <button
                      onClick={() => setSelectedWorkspace(null)}
                      className={cn(
                         "flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-all border",
                         !selectedWorkspace 
                            ? "bg-primary/10 border-primary/30 text-primary" 
                            : "bg-background/50 border-border/40 text-foreground/60 hover:bg-background hover:border-border"
                      )}
                   >
                      <Activity size={12} className={!selectedWorkspace ? "text-primary" : "text-muted-foreground/40"} />
                      <span className="text-[11px] font-bold truncate">Global Tenant Scope</span>
                      {!selectedWorkspace && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                   </button>
                   {workspaces.map((ws) => (
                      <button
                         key={ws.id}
                         onClick={() => setSelectedWorkspace(ws)}
                         className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-sm text-left transition-all border",
                            selectedWorkspace?.id === ws.id 
                               ? "bg-primary/10 border-primary/30 text-primary" 
                               : "bg-background/50 border-border/40 text-foreground/60 hover:bg-background hover:border-border"
                         )}
                      >
                         <LayoutGrid size={12} className={selectedWorkspace?.id === ws.id ? "text-primary" : "text-muted-foreground/40"} />
                         <span className="text-[11px] font-bold truncate">{ws.name}</span>
                         {selectedWorkspace?.id === ws.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                      </button>
                   ))}
                </div>
             </div>

             <div className="h-px bg-border/10 my-2" />

             <div className="flex items-center justify-between gap-2">
                <div className="relative group flex-1">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                   <input 
                     placeholder="Search folders..." 
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     className="w-full pl-9 pr-3 py-2 text-xs bg-card border border-border rounded-sm focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all" 
                   />
                </div>
                <div className="flex items-center gap-1">
                   <button 
                     onClick={handleExpandAll}
                     className="p-2 bg-card border border-border rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                     title="Expand All"
                   >
                      <ChevronsDown size={14} />
                   </button>
                    <button 
                      onClick={handleCollapseAll}
                      className="p-2 bg-card border border-border rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                      title="Collapse All"
                    >
                       <ChevronsUp size={14} />
                    </button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <button 
                      onClick={() => handleExpandToLevel(1)}
                      className="px-2 py-1 bg-card border border-border rounded-sm text-[9px] font-black text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                      title="Expand to Level 1"
                    >
                       L1
                    </button>
                    <button 
                      onClick={() => handleExpandToLevel(2)}
                      className="px-2 py-1 bg-card border border-border rounded-sm text-[9px] font-black text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                      title="Expand to Level 2"
                    >
                       L2
                    </button>
                    <button 
                      onClick={() => handleExpandToLevel(3)}
                      className="px-2 py-1 bg-card border border-border rounded-sm text-[9px] font-black text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                      title="Expand to Level 3"
                    >
                       L3
                    </button>
                    <button 
                      onClick={() => handleExpandToLevel(4)}
                      className="px-2 py-1 bg-card border border-border rounded-sm text-[9px] font-black text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
                      title="Expand to Level 4"
                    >
                       L4
                    </button>
                </div>
             </div>

             <div className="space-y-1">
                {loading ? (
                   <div className="flex flex-col items-center justify-center p-12 gap-2 opacity-50">
                      <Loader2 className="animate-spin text-primary" size={24} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Building Tree...</span>
                   </div>
                ) : folderTree.length === 0 ? (
                   <div className="text-center p-12  text-muted-foreground text-xs opacity-50 border border-dashed border-border">
                      No structure defined in this scope.
                   </div>
                ) : (
                  folderTree.map((folder) => (
                    <TreeNode 
                      key={folder.id} 
                      folder={folder} 
                      expandedFolders={expandedFolders}
                      toggleFolder={toggleFolder}
                      onSelect={setSelectedFolder}
                      handleContextMenuProp={handleContextMenu}
                      selectedId={selectedFolder?.id}
                    />
                  ))
                )}
             </div>
          </div>
        </div>

        {/* Right: Detail Panel */}
        <div className="flex-1 bg-card border border-border rounded-sm shadow-sm flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
           {!selectedFolder ? (
             <div className="flex-1 flex flex-col items-center justify-center text-center p-12 space-y-4 opacity-40">
                <div className="p-6 bg-muted rounded-full">
                   <FolderTree size={48} className="text-muted-foreground" />
                </div>
                <div className="space-y-1">
                   <h3 className="text-lg font-bold text-foreground tracking-tight">No Folder Selected</h3>
                   <p className="text-xs text-muted-foreground max-w-xs">Select a node from the tree on the left to manage its permissions, licenses, and machine allocations.</p>
                </div>
             </div>
           ) : (
             <div className="flex flex-col h-full overflow-hidden">
                {/* Panel Header */}
                <div className="p-6 pb-0 space-y-6 flex-shrink-0">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className="p-3 bg-primary/10 border border-primary/20 rounded-sm text-primary">
                            <Building2 size={24} />
                         </div>
                         <div className="flex flex-col">
                            <h2 className="text-xl font-black text-foreground tracking-tight">{selectedFolder.name}</h2>
                            <div className="flex items-center gap-2">
                               <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Folder Management</span>
                               <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                               <span className={cn(
                                 "text-[10px] font-bold uppercase tracking-widest",
                                 selectedFolder.isGovernanceLocked ? "text-amber-600" : "text-emerald-600"
                               )}>
                                 {selectedFolder.isGovernanceLocked ? "GOVERNANCE LOCKED" : "ACTIVE SYSTEM"}
                               </span>
                            </div>
                         </div>
                      </div>
                      <div className="flex items-center gap-2">
                         <button className="p-2 border border-border bg-white rounded-sm hover:bg-primary/5 transition-all outline-none" onClick={handleToggleLock}>
                            {selectedFolder.isGovernanceLocked ? <Lock size={16} /> : <ShieldCheck size={16} />}
                         </button>
                         <button className="p-2 border border-border bg-white rounded-sm hover:bg-rose-50 hover:text-rose-600 transition-all outline-none" onClick={handleDeleteFolder}>
                            <Trash2 size={16} />
                         </button>
                      </div>
                   </div>

                    <div className="flex items-center gap-8 border-b border-border overflow-x-auto scrollbar-none pb-0.5">
                       {(["Structure", "Permissions", "Licenses", "Machines", "Operations"] as const).map((tab) => (
                         <button 
                           key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={cn(
                            "pb-3 text-xs font-black uppercase tracking-[0.1em] transition-all relative",
                            activeTab === tab ? "text-primary border-b-2 border-primary" : "text-muted-foreground/60 hover:text-foreground"
                          )}
                        >
                          {tab}
                        </button>
                      ))}
                   </div>
                </div>

                {/* Panel Content (Scrollable) */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
                    {activeTab === "Structure" && (
                       <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="space-y-3">
                             <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Folder Display Name</label>
                             <input 
                                type="text" 
                                key={selectedFolder.id}
                                defaultValue={selectedFolder.name} 
                                className="w-full bg-card border border-border px-4 py-3 text-sm font-bold focus:border-primary outline-none transition-all rounded-sm shadow-inner"
                                readOnly={selectedFolder.isGovernanceLocked}
                             />
                          </div>

                          <div className="p-4 border border-amber-500/20 bg-amber-500/5 rounded-sm flex gap-4">
                             <div className="p-2 bg-amber-500/20 rounded-sm text-amber-600 h-fit">
                                <ShieldCheck size={18} />
                             </div>
                             <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Governance Lock</span>
                                <p className="text-[10px] text-muted-foreground font-medium leading-relaxed uppercase tracking-tighter">
                                   When enabled, this folder's structure, permissions, and license allocations are immutable. 
                                   Only Platform Admins can override this state.
                                </p>
                             </div>
                             <div className="ml-auto flex items-center">
                                <button 
                                   onClick={handleToggleLock}
                                   className={cn(
                                     "w-10 h-5 rounded-full relative transition-all duration-300",
                                     selectedFolder.isGovernanceLocked ? "bg-amber-600" : "bg-muted border border-border"
                                   )}
                                >
                                   <div className={cn(
                                     "absolute top-1 w-3 h-3 rounded-full transition-all duration-300",
                                     selectedFolder.isGovernanceLocked ? "right-1 bg-white" : "left-1 bg-muted-foreground/40"
                                   )} />
                                </button>
                             </div>
                          </div>

                          <div className="space-y-4">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Assigned Infrastructure</span>
                                <button className="text-[10px] font-bold text-primary uppercase">Edit Allocation</button>
                             </div>
                             <div className="p-4 border border-border rounded-sm bg-card/40 flex items-center gap-4 group hover:border-primary/20 transition-all">
                                <div className="p-3 bg-muted rounded-sm text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                                   <Monitor size={20} />
                                </div>
                                <div className="flex flex-col">
                                   <span className="text-xs font-bold text-foreground tracking-tight">Finance-VM-Pool</span>
                                   <span className="text-[10px] font-bold text-muted-foreground uppercase">8 Virtual Machines Active</span>
                                </div>
                             </div>
                          </div>
                       </div>
                    )}

                    {activeTab === "Permissions" && (
                       <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Permissions Hub</span>
                              <div className="flex bg-muted p-0.5 rounded-sm border border-border">
                                <button 
                                  onClick={() => setPermissionView("Group")}
                                  className={cn(
                                    "px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all",
                                    permissionView === "Group" ? "bg-card text-primary shadow-sm shadow-black/10" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  Groups
                                </button>
                                <button 
                                  onClick={() => setPermissionView("User")}
                                  className={cn(
                                    "px-3 py-1 text-[8px] font-black uppercase tracking-widest transition-all",
                                    permissionView === "User" ? "bg-card text-primary shadow-sm shadow-black/10" : "text-muted-foreground hover:text-foreground"
                                  )}
                                >
                                  Users
                                </button>
                              </div>
                           </div>
                           <div className="grid grid-cols-1 gap-2">
                              {permissionView === "Group" ? (
                                <>
                                  <PermissionCard icon={ShieldCheck} name="Platform Admin" role="Super Admin" access="Full Access" />
                                  <PermissionCard icon={Users} name="HR Team" role="Viewer" access="Read-Only" />
                                  <PermissionCard icon={Key} name="Finance Analysts" role="Developer" access="Owner" />
                                </>
                              ) : (
                                <>
                                  <PermissionCard icon={User} name="Ratheesh Ramadasan" role="Platform Admin" access="Full Access" />
                                  <PermissionCard icon={User} name="Lachu Reshmi" role="Platform Admin" access="Full Access" />
                                  <PermissionCard icon={UserCircle} name="Internal Auditor" role="Security" access="Audit Log Only" />
                                </>
                              )}
                           </div>
                           <button className="w-full py-3 border border-dashed border-border rounded-sm text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground hover:text-primary hover:border-primary/40 transition-all flex items-center justify-center gap-2">
                              <Plus size={12} />
                              Assign New Principal
                           </button>
                        </div>
                       </div>
                    )}

                    {activeTab === "Licenses" && (
                       <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">License Allocation</span>
                             <button className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-sm shadow-lg shadow-primary/20 hover:opacity-90 transition-all">
                                <Plus size={12} />
                                Provision License
                             </button>
                          </div>

                          <div className="space-y-3">
                             <LicenseCard 
                                name="Unattended Automation" 
                                type="Production" 
                                status="Active" 
                                expiry="2026-12-31"
                                onModify={() => {}}
                                onDecommission={() => {}}
                             />
                             <LicenseCard 
                                name="Studio Designer" 
                                type="Developer" 
                                status="Active" 
                                expiry="2025-06-15"
                                onModify={() => {}}
                                onDecommission={() => {}}
                             />
                             <LicenseCard 
                                name="Document Intelligence" 
                                type="Add-on" 
                                status="Pending Activation" 
                                expiry="N/A"
                                onModify={() => {}}
                                onDecommission={() => {}}
                             />
                          </div>

                          <div className="p-6 border border-dashed border-border rounded-sm bg-muted/5 flex flex-col items-center gap-3 text-center">
                             <div className="p-3 bg-muted rounded-full text-muted-foreground/40">
                                <CreditCard size={24} />
                             </div>
                             <div className="space-y-1">
                                <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Available Quota</span>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">
                                   You have 12 unallocated licenses in your global tenant pool.
                                </p>
                             </div>
                          </div>
                       </div>
                    )}

                    {activeTab === "Operations" && (
                       <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                          <div className="flex items-center justify-between">
                             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Governance Audit Trail</span>
                             <button 
                                onClick={loadLogs}
                                disabled={loadingLogs}
                                className="p-1.5 bg-muted border border-border rounded-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                             >
                                <RotateCw size={12} className={cn(loadingLogs && "animate-spin")} />
                             </button>
                          </div>
                          
                          <div className="space-y-2">
                             {auditLogs.length === 0 ? (
                                <div className="p-12 text-center border border-dashed border-border rounded-sm opacity-40  text-xs">
                                   No governance events recorded for this module.
                                </div>
                             ) : (
                                auditLogs.map((log) => (
                                  <div key={log.id} className="p-3 border border-border rounded-sm bg-muted/5 flex gap-3 group hover:border-primary/20 transition-all">
                                     <div className={cn(
                                        "w-1.5 rounded-full",
                                        log.action === "SCOPE_CREATED" ? "bg-emerald-500" : 
                                        log.action === "SCOPE_DELETED" ? "bg-rose-500" : "bg-amber-500"
                                     )} />
                                     <div className="flex-1 flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                           <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{log.action.replace(/_/g, ' ')}</span>
                                           <span className="text-[10px] font-medium text-muted-foreground">{new Date(log.timestamp).toLocaleString()}</span>
                                        </div>
                                        <span className="text-xs font-bold text-muted-foreground/80">{log.target}</span>
                                        <div className="flex items-center gap-2 mt-1">
                                           <div className="px-1.5 py-0.5 bg-muted rounded-[2px] text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">{log.actor}</div>
                                           {log.details && (
                                             <span className="text-[9px] text-muted-foreground/40  truncate max-w-[200px]">{log.details}</span>
                                           )}
                                        </div>
                                     </div>
                                  </div>
                                ))
                             )}
                          </div>
                       </div>
                    )}
                    
                    {activeTab === "Machines" && (
                       <div className="flex h-64 items-center justify-center border-2 border-dashed border-border rounded-sm opacity-30  text-xs">
                          This section is currently under construction.
                       </div>
                    )}
                </div>

                {/* Panel Footer */}
                <div className="p-6 border-t border-border bg-muted/20 flex items-center gap-3 flex-shrink-0">
                   <button className="flex-1 bg-primary text-white py-2.5 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/10 hover:opacity-90 transition-all">Save Changes</button>
                   <button className="px-5 py-2.5 bg-muted border border-border text-xs font-bold uppercase tracking-widest hover:bg-card transition-all" onClick={() => setSelectedFolder(null)}>Discard</button>
                </div>
             </div>
           )}
        </div>
      </div>

      {/* Folder Creation Modal */}
      <CreateFolderModal 
        isOpen={createModal.isOpen} 
        onClose={() => setCreateModal({ isOpen: false, parentId: null })}
        onCreate={(input: string) => processFolderCreation(input, createModal.parentId)}
      />

      {/* Context Menu Overlay */}
      <AnimatePresence>
        {contextMenu && (
          <ContextMenu 
            {...contextMenu} 
            onNew={handleCreateNewFolder}
            onRename={handleRenameFolder}
            onMove={handleMoveFolder}
            onDelete={handleDeleteFolderWithTarget}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateFolderModal({ isOpen, onClose, onCreate }: any) {
  const [input, setInput] = useState("");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 animate-in fade-in duration-300">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border rounded-sm shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border bg-muted/30">
          <h2 className="text-lg font-black uppercase tracking-tight">Create New Folders</h2>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-1">Use commas or new lines to create multiple folders</p>
        </div>
        <div className="p-6">
          <textarea 
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Finance&#10;HR&#10;Operations"
            className="w-full h-40 bg-background border border-border p-4 text-sm font-bold focus:border-primary outline-none transition-all rounded-sm resize-none custom-scrollbar"
          />
        </div>
        <div className="p-6 bg-muted/20 border-t border-border flex items-center gap-3">
          <button 
            onClick={() => { setInput(""); onClose(); }}
            className="flex-1 px-4 py-2.5 bg-muted border border-border text-xs font-bold uppercase tracking-widest hover:bg-card transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onCreate(input); setInput(""); onClose(); }}
            className="flex-1 bg-primary text-white py-2.5 text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            Create Folders
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ContextMenu({ x, y, folder, onNew, onRename, onMove, onDelete }: any) {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Prevent menu from going off-screen
  const menuWidth = 192; // w-48 = 12rem = 192px
  const menuHeight = 180; 
  const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
  const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;

  return createPortal(
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -10 }}
      className="fixed z-[9999] w-48 bg-card border border-border shadow-2xl rounded-sm overflow-hidden py-1 backdrop-blur-xl"
      style={{ left: adjustedX, top: adjustedY }}
    >
      <ContextMenuItem icon={Plus} label="New Subfolder" onClick={() => onNew(folder.id)} />
      <div className="h-px bg-border/50 my-1" />
      <ContextMenuItem icon={Edit2} label="Rename" onClick={() => onRename(folder)} />
      <ContextMenuItem icon={Move} label="Move" onClick={() => onMove(folder)} />
      <div className="h-px bg-border/50 my-1" />
      <ContextMenuItem icon={Trash2} label="Delete" onClick={() => onDelete(folder)} className="text-rose-500 hover:bg-rose-500/10" />
    </motion.div>,
    document.body
  );
}

function ContextMenuItem({ icon: Icon, label, onClick, className }: any) {
  return (
    <button 
      onClick={() => onClick()}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-primary/5 transition-all",
        className
      )}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

function TreeNode({ folder, expandedFolders = {}, toggleFolder = () => {}, onSelect, depth = 0, selectedId, handleContextMenuProp }: any) {
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedId === folder.id;
  const isExpanded = !!expandedFolders[folder.id];

  return (
    <div className="flex flex-col">
       <div 
         className={cn(
           "flex items-center gap-2 py-2 px-3 rounded-sm group cursor-pointer transition-all border border-transparent",
           isSelected ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "hover:bg-primary/5 text-foreground hover:border-primary/10"
         )}
         style={{ paddingLeft: `${depth * 16 + 12}px` }}
         onClick={() => onSelect(folder)}
         onContextMenu={(e) => handleContextMenuProp(e, folder)}
       >
          {hasChildren ? (
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFolder(folder.id); }}
              className="p-0.5 hover:bg-foreground/10 rounded-sm transition-colors text-inherit"
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          ) : (
            <div className="w-4 h-4 ml-0.5" />
          )}
          <FolderTree 
            size={depth === 0 ? 18 : 16} 
            className={cn(
              isSelected ? "text-white" : 
              depth === 0 ? "text-primary" : 
              "text-primary/60 group-hover:text-primary"
            )} 
          />
          <div className="flex flex-col">
            <span className={cn(
              "tracking-tight leading-none transition-all",
              isSelected ? "text-white" : "text-foreground",
              depth === 0 ? "text-sm font-black uppercase tracking-wider" : 
              depth === 1 ? "text-[13px] font-bold" : 
              "text-[12px] font-medium opacity-80"
            )}>
              {folder.name}
            </span>
            {folder.workspace && (
              <span className={cn(
                "text-[8px] font-black uppercase tracking-tighter opacity-40",
                isSelected ? "text-white/70" : "text-muted-foreground"
              )}>
                Scope: {folder.workspace.name}
              </span>
            )}
          </div>
          {folder.isGovernanceLocked && <Lock size={10} className={cn("ml-1", isSelected ? "text-white" : "text-amber-600")} />}
          {!isSelected && <span className="ml-auto text-[8px] font-black uppercase border border-border px-1 py-0.5 rounded-[1px] text-muted-foreground/40 transition-opacity group-hover:opacity-100 opacity-0 tracking-tighter">Manage</span>}
       </div>

       {hasChildren && isExpanded && (
         <div className="flex flex-col mt-0.5">
            {folder.children.map((child: any) => (
              <TreeNode 
                key={child.id} 
                folder={child} 
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                depth={depth + 1} 
                onSelect={onSelect}
                handleContextMenuProp={handleContextMenuProp}
                selectedId={selectedId}
              />
            ))}
         </div>
       )}
    </div>
  );
}

function LicenseCard({ name, type, status, expiry, onModify, onDecommission }: any) {
  return (
    <div className="p-4 border border-border rounded-sm bg-card/60 backdrop-blur-sm group hover:border-primary/20 transition-all flex items-center justify-between">
       <div className="flex items-center gap-4">
          <div className={cn(
            "p-3 rounded-sm transition-all",
            status === "Active" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
          )}>
             <CreditCard size={18} />
          </div>
          <div className="flex flex-col">
             <span className="text-xs font-bold text-foreground tracking-tight">{name}</span>
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">{type} Tier</span>
                <span className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-tighter",
                  status === "Active" ? "text-emerald-600" : "text-amber-600"
                )}>{status}</span>
             </div>
          </div>
       </div>
       <div className="flex items-center gap-2">
          <div className="flex flex-col items-end mr-4">
             <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Expires</span>
             <span className="text-[10px] font-bold text-foreground">{expiry}</span>
          </div>
          <button 
            onClick={onModify}
            className="p-2 border border-border rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all"
            title="Modify License"
          >
             <Settings2 size={14} />
          </button>
          <button 
            onClick={onDecommission}
            className="p-2 border border-border rounded-sm text-muted-foreground hover:text-rose-600 hover:bg-rose-50 transition-all"
            title="Decommission License"
          >
             <Trash2 size={14} />
          </button>
       </div>
    </div>
  );
}

function PermissionCard({ icon: Icon, name, role, access }: any) {
  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-sm group hover:border-primary/20 transition-all bg-card/60 backdrop-blur-sm">
       <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-sm text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
             <Icon size={16} />
          </div>
          <div className="flex flex-col">
             <span className="text-xs font-bold text-foreground tracking-tight">{name}</span>
             <span className="text-[10px] font-bold text-muted-foreground uppercase">{role} Context</span>
          </div>
       </div>
       <div className="px-2 py-0.5 bg-muted rounded-[2px] text-[9px] font-black text-muted-foreground uppercase tracking-wider group-hover:bg-primary/5 group-hover:text-primary transition-all">
          {access}
       </div>
    </div>
  );
}
