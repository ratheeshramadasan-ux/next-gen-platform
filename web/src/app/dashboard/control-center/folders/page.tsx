"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Folder, Building2, Zap, LayoutGrid, Shield, 
  MoreVertical, Plus, Search, ChevronRight, 
  Lock, Unlock, Activity, FileText, Database,
  Settings, Sliders, Info, ShieldAlert, Trash2, 
  History, Download, Share2, Filter, Layers, CheckCircle2,
  Monitor, AlertCircle, X, Maximize2, Minimize2
} from "lucide-react";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { 
  getTenantsWorkspaces, 
  getWorkspaceTree,
  createFolder,
  toggleFolderLockAction,
  deleteFolder,
  ensureDefaultWorkspace
} from "@/app/actions/folderActions";
import { getAuditLogsForTarget } from "@/app/actions/tenantActions";
import { toast } from "sonner";

export default function FolderGovernancePage() {
  const { role, activeTenant, availableTenants, switchTenant, currentUser, activeCustomer } = useAppContext();
  
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // New Scope State
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [targetParentId, setTargetParentId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, folderId: string } | null>(null);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClose = () => setContextMenu(null);
    window.addEventListener("click", handleClose);
    return () => window.removeEventListener("click", handleClose);
  }, []);

  // Selected Folder Data
  const selectedFolder = folders.find(f => f.id === selectedFolderId);

  // 1. Load Workspaces for the active tenant
  useEffect(() => {
    async function load() {
      if (!activeTenant) return;
      setIsLoading(true);
      const ws = await getTenantsWorkspaces(activeTenant.id);
      setWorkspaces(ws);
      if (ws.length > 0) setActiveWorkspaceId(ws[0].id);
      setIsLoading(false);
    }
    load();
  }, [activeTenant?.id]);

  // 2. Load Folder Tree for active workspace
  const loadTree = async () => {
    if (!activeWorkspaceId) return;
    setIsLoading(true);
    const tree = await getWorkspaceTree(activeWorkspaceId);
    setFolders(tree.folders);
    setExpandedFolders(new Set(tree.folders.map(f => f.id)));
    setIsLoading(false);
  };

  useEffect(() => {
    loadTree();
  }, [activeWorkspaceId]);

  // 3. Load Audit Logs for Selected Folder
  useEffect(() => {
    if (selectedFolderId) {
      setLoadingLogs(true);
      getAuditLogsForTarget(selectedFolderId).then(logs => {
        setAuditLogs(logs);
        setLoadingLogs(false);
      });
    }
  }, [selectedFolderId]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const cid = activeTenant?.customerId || activeCustomer?.id;
    if (!newFolderName || !activeTenant || !cid) {
      toast.error("Missing organization context. Please select a tenant.");
      return;
    }
    
    // Auto-provision workspace if none loaded
    let wsId = activeWorkspaceId;
    if (!wsId) {
      const provisioned = await ensureDefaultWorkspace(activeTenant.id, cid);
      if (provisioned) {
        wsId = provisioned.id;
        setWorkspaces(prev => [...prev, provisioned]);
        setActiveWorkspaceId(provisioned.id);
      } else {
        toast.error("No workspace available. Please create a workspace first.");
        return;
      }
    }
    
    setIsLoading(true);
    const res = await createFolder({
      name: newFolderName,
      parentId: targetParentId,
      workspaceId: wsId,
      tenantId: activeTenant.id,
      customerId: cid
    }, currentUser.name || "System Admin");

    if (res.success) {
      setIsAdding(false);
      setNewFolderName("");
      setTargetParentId(null);
      await loadTree();
    } else {
      setFormError(res.error || "Failed to create scope.");
    }
    setIsLoading(false);
  };

  const handleToggleLock = async (folderId: string, currentStatus: boolean, name: string) => {
    try {
      const res = await toggleFolderLockAction(folderId, !currentStatus, currentUser.role);
      if (res.success) {
        setFolders(prev => prev.map(f => f.id === folderId ? { ...f, isGovernanceLocked: !currentStatus } : f));
        const newLogs = await getAuditLogsForTarget(folderId);
        setAuditLogs(newLogs);
        toast.success(currentStatus ? "Governance Lock Removed" : "Governance Lock Enforced");
      } else {
        toast.error(res.error || "Governance policy violation");
      }
    } catch (e) {
      toast.error("An unexpected error occurred during governance transition");
    }
  };

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSet = new Set(expandedFolders);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedFolders(newSet);
  };

  const getDescendants = (id: string, allFolders: any[]): string[] => {
    let descendants: string[] = [];
    const children = allFolders.filter(f => f.parentId === id);
    for (const child of children) {
      descendants.push(child.id);
      descendants = descendants.concat(getDescendants(child.id, allFolders));
    }
    return descendants;
  };

  const handleExpandDescendants = (id: string) => {
    const descendants = getDescendants(id, folders);
    const newSet = new Set(expandedFolders);
    newSet.add(id);
    descendants.forEach(d => newSet.add(d));
    setExpandedFolders(newSet);
  };

  const handleCollapseDescendants = (id: string) => {
    const descendants = getDescendants(id, folders);
    const newSet = new Set(expandedFolders);
    newSet.delete(id);
    descendants.forEach(d => newSet.delete(d));
    setExpandedFolders(newSet);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm("Are you absolutely sure you want to purge this scope? This action is irreversible and will destroy all associated structural metadata.")) return;
    
    try {
      const res = await deleteFolder(folderId);
      if (res.success) {
        toast.success("Scope purged successfully");
        setSelectedFolderId(null);
        await loadTree();
      } else {
        toast.error(res.error || "Failed to purge scope.");
      }
    } catch (e) {
      toast.error("Critical failure during scope purge");
    }
  };

  const FolderRow = ({ folder, level = 0 }: { folder: any, level?: number }) => {
    const isExpanded = expandedFolders.has(folder.id);
    const children = folders.filter(f => f.parentId === folder.id);
    const hasChildren = children.length > 0;
    const isLocked = folder.isGovernanceLocked;
    const isSelected = selectedFolderId === folder.id;

    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        folderId: folder.id
      });
      setSelectedFolderId(folder.id);
    };

    return (
      <div className="flex flex-col">
        <motion.div 
          onClick={() => setSelectedFolderId(folder.id)}
          onContextMenu={handleContextMenu}
          className={cn(
            "group flex items-center gap-4 py-4 px-6 cursor-pointer transition-all border-b border-border/20 relative",
            isSelected ? "bg-primary/5 border-l-4 border-l-primary" : "hover:bg-muted/30",
            isLocked && "bg-rose-500/5",
            contextMenu?.folderId === folder.id && "bg-primary/10"
          )}
        >
          <div className="flex items-center gap-2 flex-1" style={{ paddingLeft: `${level * 20}px` }}>
            <div 
              onClick={(e) => toggleFolder(folder.id, e)}
              className={cn(
                "p-1 rounded hover:bg-muted-foreground/10 transition-transform",
                isExpanded && "rotate-90",
                !hasChildren && "opacity-10 pointer-events-none"
              )}
            >
              <ChevronRight size={14} />
            </div>
            <div className="relative">
              <Folder size={18} className={cn(isLocked ? "text-rose-500 fill-rose-500/10" : "text-primary fill-primary/10")} />
              {isLocked && (
                <div className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5 border border-background shadow-md">
                  <Lock size={8} />
                </div>
              )}
            </div>
            <span className={cn(
              "text-xs font-black uppercase tracking-tight",
              isSelected ? "text-primary" : "text-foreground"
            )}>{folder.name}</span>

            {hasChildren && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); handleExpandDescendants(folder.id); }}
                  className="p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded transition-colors"
                  title="Expand All Sub-folders"
                >
                  <Maximize2 size={10} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleCollapseDescendants(folder.id); }}
                  className="p-1 hover:bg-primary/10 text-muted-foreground hover:text-primary rounded transition-colors"
                  title="Collapse All Sub-folders"
                >
                  <Minimize2 size={10} />
                </button>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-6">
             {isLocked && <div className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[8px] font-black uppercase tracking-widest rounded">Locked</div>}
             <div className="text-[10px] font-bold text-muted-foreground/40 tabular-nums">/{folder.path.split('/').pop()}</div>
          </div>
        </motion.div>
        
        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {children.map(child => (
                <FolderRow key={child.id} folder={child} level={level + 1} />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-6 md:p-8 flex flex-col h-full gap-8 max-h-screen relative">
        {/* --- PAGE HEADER --- */}
        <header className="flex justify-between items-end">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Platform Control Center</span>
              <div className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Manage Folder</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">
              Scope Discovery
            </h1>
          </div>
          
          <div className="flex items-center gap-4 bg-card/40 backdrop-blur-md p-2 rounded-sm border border-border/40">
             <div className="px-4 py-2 flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Active Tenant</span>
                <select 
                  value={activeTenant?.id || ""}
                  onChange={(e) => switchTenant(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer text-primary"
                >
                  {availableTenants.map(t => <option key={t.id} value={t.id} className="bg-background">{t.name}</option>)}
                </select>
             </div>
             <div className="w-px h-8 bg-border/40" />
             <div className="px-4 py-2 flex flex-col">
                <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Context Workspace</span>
                <select 
                  value={activeWorkspaceId || ""}
                  onChange={(e) => setActiveWorkspaceId(e.target.value)}
                  className="bg-transparent border-none text-[10px] font-black uppercase tracking-widest focus:ring-0 cursor-pointer"
                >
                  {workspaces.map(w => <option key={w.id} value={w.id} className="bg-background">{w.name}</option>)}
                </select>
             </div>
          </div>
        </header>

        <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
          {/* --- LEFT: HIERARCHY EXPLORER --- */}
          <div className="w-80 flex flex-col bg-card/40 backdrop-blur-md rounded-sm border border-border/40 shadow-xl overflow-hidden shadow-sm">
             <div className="p-6 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-2">
                     <Layers size={16} className="text-primary" />
                     <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Hierarchy</span>
                   </div>
                   <div className="flex items-center gap-1 border-l border-border/40 pl-3">
                     <button onClick={() => setExpandedFolders(new Set(folders.map(f => f.id)))} className="p-1 hover:bg-muted text-muted-foreground hover:text-primary rounded transition-colors" title="Expand All">
                       <Maximize2 size={12} />
                     </button>
                     <button onClick={() => setExpandedFolders(new Set())} className="p-1 hover:bg-muted text-muted-foreground hover:text-primary rounded transition-colors" title="Collapse All">
                       <Minimize2 size={12} />
                     </button>
                   </div>
                </div>
                <button 
               onClick={() => { setTargetParentId(null); setIsAdding(true); }}
               className="px-6 py-2.5 bg-primary text-white rounded-sm text-sm font-bold flex items-center gap-2 shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
             >
                <Plus size={16} /> New Root Scope
             </button>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Resolving Scopes...</span>
                  </div>
                ) : folders.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground opacity-40">
                     <p className="text-[9px] font-black uppercase tracking-widest">Zero scopes mapped in this context.</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {folders.filter(f => !f.parentId).map(folder => (
                      <FolderRow key={folder.id} folder={folder} />
                    ))}
                  </div>
                )}
             </div>
          </div>

          {/* --- MIDDLE: GOVERNANCE CANVAS --- */}
          <div className="flex-1 bg-card/60 backdrop-blur-md rounded-sm border border-border shadow-2xl overflow-hidden flex flex-col relative transition-all">
             <AnimatePresence mode="wait">
                {selectedFolder ? (
                  <motion.div 
                    key={selectedFolder.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="flex flex-col h-full"
                  >
                    <div className="p-10 border-b border-border bg-muted/10 flex justify-between items-center">
                       <div className="flex items-center gap-6">
                          <div className={cn(
                            "w-16 h-16 rounded-sm flex items-center justify-center shadow-2xl relative",
                            selectedFolder.isGovernanceLocked ? "bg-rose-500 shadow-rose-500/30" : "bg-primary shadow-primary/30"
                          )}>
                             <IconWrapper icon={selectedFolder.isGovernanceLocked ? Lock : Folder} size={32} className="text-white" />
                          </div>
                          <div>
                             <h3 className="text-3xl font-black text-foreground leading-none tracking-tighter uppercase">{selectedFolder.name}</h3>
                             <div className="flex items-center gap-3 mt-2 font-mono text-[9px] font-bold text-muted-foreground uppercase opacity-60">
                                <span>ID: {selectedFolder.id}</span>
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <span>Path: {selectedFolder.path}</span>
                             </div>
                          </div>
                       </div>
                       
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleToggleLock(selectedFolder.id, selectedFolder.isGovernanceLocked, selectedFolder.name)}
                            className={cn(
                              "px-8 py-3 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-xl transition-all flex items-center gap-3",
                              selectedFolder.isGovernanceLocked 
                                ? "bg-rose-500 text-white shadow-rose-500/30" 
                                : "bg-emerald-500 text-white shadow-emerald-500/30"
                            )}
                          >
                            {selectedFolder.isGovernanceLocked ? <Unlock size={14}/> : <Lock size={14}/>}
                            {selectedFolder.isGovernanceLocked ? "Unlock Access" : "Enforce Lock"}
                          </button>
                       </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                       <div className="grid grid-cols-3 gap-6">
                          {/* Folder Stats Cards */}
                          <div className="p-6 rounded-sm border border-border/40 bg-background/40 flex flex-col gap-2">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Resources</span>
                                <Monitor size={14} className="text-primary" />
                             </div>
                             <span className="text-3xl font-black tracking-tighter uppercase whitespace-nowrap">0 Provisioned</span>
                          </div>
                          <div className="p-6 rounded-sm border border-border/40 bg-background/40 flex flex-col gap-2">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Active Jobs</span>
                                <Zap size={14} className="text-amber-500" />
                             </div>
                             <span className="text-3xl font-black tracking-tighter uppercase">0 Queued</span>
                          </div>
                          <div className="p-6 rounded-sm border border-border/40 bg-background/40 flex flex-col gap-2">
                             <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Policy State</span>
                                {selectedFolder.isGovernanceLocked ? <ShieldAlert size={14} className="text-rose-500" /> : <ShieldCheck size={14} className="text-emerald-500" />}
                             </div>
                             <span className={cn(
                               "text-3xl font-black tracking-tighter uppercase",
                               selectedFolder.isGovernanceLocked ? "text-rose-500" : "text-emerald-500"
                             )}>
                               {selectedFolder.isGovernanceLocked ? "Immobilized" : "Mutable"}
                             </span>
                          </div>

                          {/* Detail Content */}
                          <div className="col-span-3 mt-8">
                             <div className="p-8 rounded-sm border border-border/40 bg-muted/5 flex flex-col items-center justify-center text-center gap-4 opacity-40">
                                <div className="w-16 h-16 rounded-full bg-border/20 flex items-center justify-center">
                                   <Database size={24} />
                                </div>
                                <div className="space-y-1">
                                   <p className="text-[10px] font-black uppercase tracking-[0.2em]">Structural Metadata</p>
                                   <p className="text-xs font-medium max-w-xs leading-relaxed">Child objects in this scope inherit the primary governance lock and PII masking policies defined by the workspace architect.</p>
                                </div>
                             </div>
                          </div>
                       </div>
                    </div>

                    <div className="p-8 border-t border-border bg-muted/10 flex justify-between items-center">
                       <div className="flex items-center gap-6">
                          <button className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                             <Download size={14} /> Export Manifest
                          </button>
                          <button className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                             <Share2 size={14} /> Propagation Rules
                          </button>
                       </div>
                       <button 
                         onClick={() => handleDeleteFolder(selectedFolder.id)}
                         className="px-8 py-3 bg-rose-500/10 text-rose-500 rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-2"
                       >
                          <Trash2 size={14} /> Purge Scope
                       </button>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-8 p-20 text-center">
                     <div className="w-24 h-24 rounded-sm bg-muted/10 flex items-center justify-center text-muted-foreground relative">
                        <Folder size={48} className="opacity-10" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-2xl font-black uppercase tracking-tighter opacity-20">No Scope Selection</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 max-w-xs mx-auto leading-relaxed">
                          Identify a hierarchical node from the explorer to begin operational governance.
                        </p>
                     </div>
                  </div>
                )}
             </AnimatePresence>
          </div>

          {/* --- RIGHT: CHRONICLE --- */}
          <div className="w-80 bg-card/40 backdrop-blur-md flex flex-col rounded-sm border border-l border-border/40 shadow-xl overflow-hidden shrink-0">
             <div className="p-6 border-b border-border/40 bg-muted/20 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 rounded-sm text-primary">
                      <History size={16} />
                   </div>
                   <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Scope Chronicle</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                   <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Live Governance Feed</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </div>
             </div>

             <AnimatePresence>
                {isAdding && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-xl z-[60] flex items-center justify-center p-8"
                  >
                     <motion.div 
                       initial={{ scale: 0.9, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       className="w-full max-w-sm bg-card border border-border shadow-2xl rounded-sm p-8"
                     >
                        <div className="flex justify-between items-start mb-6">
                           <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Architecture Expansion</span>
                              <h2 className="text-2xl font-black uppercase tracking-tighter">New Scope</h2>
                           </div>
                           <button onClick={() => setIsAdding(false)} className="p-2 bg-muted/40 rounded-sm hover:bg-muted/60 transition-colors">
                              <X size={20} />
                           </button>
                        </div>
                        
                        <form onSubmit={handleCreateFolder} className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Scope Name *</label>
                              <input 
                                required
                                autoFocus
                                type="text" 
                                placeholder="e.g. Legal Archives"
                                value={newFolderName}
                                onChange={e => setNewFolderName(e.target.value)}
                                className="w-full px-5 py-3 bg-muted/20 border border-border rounded-sm text-sm font-bold focus:ring-4 focus:ring-primary/10 tracking-tight"
                              />
                           </div>

                           <div className="p-4 bg-muted/20 rounded-sm border border-border/40">
                              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground block mb-2 opacity-50">Structural Relation</span>
                              <div className="flex items-center gap-2">
                                 {targetParentId ? <Layers size={14} className="text-primary" /> : <Database size={14} className="text-indigo-500" />}
                                 <span className="text-[10px] font-black uppercase tracking-widest">{targetParentId ? "Assigning to Parent Node" : "Creating Root Scope"}</span>
                              </div>
                           </div>
                           
                           {formError && (
                             <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-sm text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} /> {formError}
                             </div>
                           )}

                           <div className="flex gap-4">
                              <button 
                                type="submit" 
                                disabled={isLoading}
                                className="flex-1 py-4 bg-primary text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:scale-[1.02] transition-transform disabled:opacity-50"
                              >
                                {isLoading ? "Synchronizing..." : "Initiate Creation"}
                              </button>
                           </div>
                        </form>
                     </motion.div>
                  </motion.div>
                )}
             </AnimatePresence>

             <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                <div className="absolute left-[39px] top-10 bottom-10 w-px bg-border/40 border-dashed" />
                
                <div className="flex flex-col gap-10 relative">
                  {loadingLogs ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                       <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                       <span className="text-[8px] font-black uppercase tracking-widest">Polling Feed...</span>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-20 text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">No governance events logged.</div>
                  ) : auditLogs.map((log) => (
                    <div key={log.id} className="flex gap-4 group">
                       <div className="relative z-10 flex flex-col items-center">
                          <div className={cn(
                            "w-4 h-4 rounded-full border-4 border-card shadow-lg flex items-center justify-center transition-transform group-hover:scale-125",
                            log.severity === "Critical" ? "bg-rose-500" : log.severity === "High" ? "bg-amber-500" : "bg-primary"
                          )} />
                       </div>
                       <div className="flex flex-col gap-1 -mt-1 group-hover:translate-x-1 transition-transform cursor-default">
                          <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest bg-muted/50 px-1.5 py-0.5 rounded w-fit">
                             {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <h4 className="text-[10px] font-black tracking-tight uppercase group-hover:text-primary transition-colors">
                             {log.action.replace(/_/g, " ")}
                          </h4>
                          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">By {log.actor.split("@")[0]}</span>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {contextMenu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            style={{ top: contextMenu.y, left: contextMenu.x }}
            className="fixed z-[100] w-56 bg-card border border-border shadow-2xl rounded-sm py-2 overflow-hidden backdrop-blur-xl"
          >
            <div className="px-4 py-2 border-b border-border/40 mb-1">
               <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground">Scope Actions</span>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedFolderId(contextMenu.folderId); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-primary hover:text-white transition-all group"
            >
              <Search size={14} className="text-primary group-hover:text-white" />
              Focus Scope
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleExpandDescendants(contextMenu.folderId); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-primary hover:text-white transition-all group"
            >
              <Maximize2 size={14} className="text-primary group-hover:text-white" />
              Expand All
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); handleCollapseDescendants(contextMenu.folderId); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-foreground hover:bg-primary hover:text-white transition-all group"
            >
              <Minimize2 size={14} className="text-primary group-hover:text-white" />
              Collapse All
            </button>
            <div className="h-px bg-border/40 my-1" />
            <button 
              onClick={(e) => { e.stopPropagation(); handleDeleteFolder(contextMenu.folderId); setContextMenu(null); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-rose-500 hover:bg-rose-500 hover:text-white transition-all group"
            >
              <Trash2 size={14} />
              Purge Scope
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ShieldCheck({ size, className }: { size: number, className: string }) {
  return (
    <div className={cn("rounded-full bg-emerald-500/10 p-0.5", className)}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}
