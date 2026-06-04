"use client";

import React, { useState, useEffect } from "react";
import { useAppContext } from "@/lib/context";
import { getPlatformLookups, addLookupItem, removeLookupItem, updateLookupItem } from "@/app/actions/lookupActions";
import { getGlobalAuditLogs } from "@/app/actions/tenantActions";
import { BookOpen, MapPin, Building, Plus, Trash2, ShieldAlert, Pencil, Check, X, Eye, EyeOff, Zap, RotateCw, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function DictionariesPage() {
  const { role } = useAppContext();
  
  const [industries, setIndustries] = useState<any[]>([]);
  const [regions, setRegions] = useState<any[]>([]);
  const [classifications, setClassifications] = useState<any[]>([]);
  const [priorities, setPriorities] = useState<any[]>([]);
  
  const [newIndustry, setNewIndustry] = useState("");
  const [newRegion, setNewRegion] = useState("");
  const [newClassification, setNewClassification] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        // Fetch all lookups, active and inactive
        const data = await getPlatformLookups(false);
        if (data.success) {
          setIndustries(data.industries);
          setRegions(data.regions);
          setClassifications(data.classifications);
          setPriorities(data.priorities);
        } else {
          setErrorMsg("Backend failed to respond correctly.");
        }
      } catch (err) {
        console.error("Hydration Error:", err);
        setErrorMsg("Critical failure initializing database engine context.");
      } finally {
        setLoading(false);
      }
    }
    load();
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoadingLogs(true);
    const logs = await getGlobalAuditLogs(null, "ReferenceData");
    setAuditLogs(logs);
    setLoadingLogs(false);
  };

  if (role !== "Super Admin") {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <ShieldAlert className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground mt-2 text-sm">Dictionaries can only be managed by Platform Owners.</p>
      </div>
    );
  }

  const handleAdd = async (type: "INDUSTRY" | "REGION" | "CLASSIFICATION" | "PRIORITY") => {
    const label = type === "INDUSTRY" ? newIndustry : type === "REGION" ? newRegion : type === "CLASSIFICATION" ? newClassification : newPriority;
    if (!label.trim()) return;

    setLoading(true);
    setErrorMsg("");
    const result = await addLookupItem(type, label, role);
    if (!result.success) {
      setErrorMsg(result.error || "Failed to add.");
    } else {
      if (type === "INDUSTRY") setNewIndustry("");
      else if (type === "REGION") setNewRegion("");
      else if (type === "CLASSIFICATION") setNewClassification("");
      else setNewPriority("");
      await refreshData();
    }
    setLoading(false);
  };

  const handleRemove = async (type: "INDUSTRY" | "REGION" | "CLASSIFICATION" | "PRIORITY", id: string, label: string) => {
    if (!confirm(`Are you sure you want to completely delete ${label}?`)) return;
    setLoading(true);
    setErrorMsg("");
    const result = await removeLookupItem(type, id, label, role);
    if (!result.success) {
      setErrorMsg(result.error || "Failed to remove.");
    } else {
      await refreshData();
    }
    setLoading(false);
  };

  const handleUpdate = async (type: "INDUSTRY" | "REGION" | "CLASSIFICATION" | "PRIORITY", id: string, oldLabel: string, isActive: boolean) => {
    if (!editValue.trim() || editValue === oldLabel) {
      setEditingId(null);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    const result = await updateLookupItem(type, id, oldLabel, editValue, isActive, role);
    if (!result.success) {
      setErrorMsg(result.error || "Failed to update.");
    } else {
      setEditingId(null);
      await refreshData();
    }
    setLoading(false);
  };
  
  const handleToggleActive = async (type: "INDUSTRY" | "REGION" | "CLASSIFICATION" | "PRIORITY", item: any) => {
    setLoading(true);
    setErrorMsg("");
    const result = await updateLookupItem(type, item.id, item.label, item.label, !item.isActive, role);
    if (!result.success) {
      setErrorMsg(result.error || "Failed to toggle status.");
    } else {
      await refreshData();
    }
    setLoading(false);
  }

  const refreshData = async () => {
    const data = await getPlatformLookups(false);
    if (data.success) {
      setIndustries(data.industries);
      setRegions(data.regions);
      setClassifications(data.classifications);
      setPriorities(data.priorities);
    }
    loadLogs();
  }

  const renderList = (items: any[], type: "INDUSTRY" | "REGION" | "CLASSIFICATION" | "PRIORITY") => (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
      <AnimatePresence>
        {items.map(item => {
          const isEditing = editingId === item.id;
          
          return (
            <motion.div 
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              key={item.id} 
              className={cn(
                "flex items-center justify-between p-3 border rounded-sm group transition-colors",
                !item.isActive ? "bg-muted/50 dark:bg-[#151515] border-border dark:border-[#222]" : "bg-card dark:bg-[#111] border-border dark:border-[#333]"
              )}
            >
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1 mr-2">
                  <input 
                    autoFocus
                    type="text" 
                    value={editValue} 
                    onChange={e => setEditValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleUpdate(type, item.id, item.label, item.isActive)}
                    className="flex-1 px-2 py-1 text-sm border rounded outline-none focus:ring-2 focus:ring-primary/100/20"
                  />
                  <button onClick={() => handleUpdate(type, item.id, item.label, item.isActive)} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check size={16}/></button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-rose-500 hover:bg-rose-50 rounded"><X size={16}/></button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col flex-1">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-semibold", !item.isActive ? "text-muted-foreground line-through" : "text-foreground dark:text-gray-100")}>
                        {item.label}
                      </span>
                      {!item.isActive && (
                        <span className="px-1.5 py-0.5 rounded-sm bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[10px] font-bold uppercase tracking-tight border border-rose-100 dark:border-rose-500/20">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pr-1">
                    <button 
                      onClick={() => handleToggleActive(type, item)} 
                      className={cn(
                        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11px] font-bold uppercase tracking-wider transition-all",
                        item.isActive 
                          ? "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10" 
                          : "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                      )}
                      title={item.isActive ? "Disable Item" : "Enable Item"}
                    >
                      {item.isActive ? <><EyeOff size={14}/> Disable</> : <><Eye size={14}/> Enable</>}
                    </button>

                    <button 
                      onClick={() => { setEditingId(item.id); setEditValue(item.label); }} 
                      className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/100/10 rounded-sm transition-colors"
                      title="Edit Label"
                    >
                      <Pencil size={15} />
                    </button>

                    <button 
                      onClick={() => handleRemove(type, item.id, item.label)} 
                      className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-sm transition-colors"
                      title="Permanently Delete"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
      {!loading && items.length === 0 && <div className="text-center text-muted-foreground text-sm py-10">No records found.</div>}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-card dark:bg-[#1A1A1A] border border-border dark:border-[#333] rounded-sm overflow-hidden shadow-sm relative pr-2">
      <div className="border-b p-6 flex flex-col gap-2">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="text-primary" /> Platform Dictionaries
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Manage dynamic lookup values. Disabling an item prevents it from appearing in new dropdowns without destroying history.
          </p>
          <button 
            onClick={() => setShowLogs(!showLogs)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-sm text-[10px] font-black uppercase tracking-widest transition-all",
              showLogs ? "bg-primary text-white" : "bg-muted hover:bg-muted/80 text-muted-foreground"
            )}
          >
            <History size={14} />
            {showLogs ? "Hide Log" : "Operation Log"}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="mx-6 mt-6 p-4 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-sm text-rose-700 dark:text-rose-400 text-sm font-medium flex items-center gap-2">
          <ShieldAlert size={16} /> {errorMsg}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden mt-2">
        {/* Industry Sector Column */}
        <div className="w-1/4 flex flex-col border-r h-full relative">
          <div className="p-4 border-y bg-muted/50 dark:bg-[#111] flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
            <Building size={16} className="text-primary/100"/> Industry Sectors
          </div>
          <div className="p-4 border-b flex gap-2">
            <input 
              type="text" 
              placeholder="E.g., Logistics & Supply Chain" 
              value={newIndustry}
              onChange={(e) => setNewIndustry(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd("INDUSTRY")}
              className="flex-1 px-3 py-2 border rounded-sm text-sm outline-none focus:ring-2 focus:ring-primary/100/20"
            />
            <button 
              disabled={loading}
              onClick={() => handleAdd("INDUSTRY")}
              className="bg-primary px-4 text-white text-sm font-medium rounded-sm hover:bg-primary disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          {renderList(industries, "INDUSTRY")}
          {loading && <div className="absolute inset-0 bg-card/50 flex items-center justify-center pointer-events-none" />}
        </div>

        {/* Region Column */}
        <div className="w-1/4 flex flex-col border-r h-full relative">
          <div className="p-4 border-y bg-muted/50 dark:bg-[#111] flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
            <MapPin size={16} className="text-primary/100"/> Data Residency Regions
          </div>
          <div className="p-4 border-b flex gap-2">
            <input 
              type="text" 
              placeholder="E.g., AP (Sydney)" 
              value={newRegion}
              onChange={(e) => setNewRegion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd("REGION")}
              className="flex-1 px-3 py-2 border rounded-sm text-sm outline-none focus:ring-2 focus:ring-primary/100/20"
            />
            <button 
              disabled={loading}
              onClick={() => handleAdd("REGION")}
              className="bg-primary px-4 text-white text-sm font-medium rounded-sm hover:bg-primary disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          {renderList(regions, "REGION")}
          {loading && <div className="absolute inset-0 bg-card/50 flex items-center justify-center pointer-events-none" />}
        </div>

        {/* Classification Column */}
        <div className="w-1/4 flex flex-col border-r h-full relative">
          <div className="p-4 border-y bg-muted/50 dark:bg-[#111] flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
            <Zap size={16} className="text-rose-500"/> Task Classifications
          </div>
          <div className="p-4 border-b flex gap-2">
            <input 
              type="text" 
              placeholder="E.g., High Priority" 
              value={newClassification}
              onChange={(e) => setNewClassification(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd("CLASSIFICATION")}
              className="flex-1 px-3 py-2 border rounded-sm text-sm outline-none focus:ring-2 focus:ring-primary/100/20"
            />
            <button 
              disabled={loading}
              onClick={() => handleAdd("CLASSIFICATION")}
              className="bg-primary px-4 text-white text-sm font-medium rounded-sm hover:bg-primary disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          {renderList(classifications, "CLASSIFICATION")}
          {loading && <div className="absolute inset-0 bg-card/50 flex items-center justify-center pointer-events-none" />}
        </div>

        {/* Priority Column */}
        <div className="w-1/4 flex flex-col h-full relative">
          <div className="p-4 border-y bg-muted/50 dark:bg-[#111] flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-200">
            <ShieldAlert size={16} className="text-amber-500"/> Urgency Priorities
          </div>
          <div className="p-4 border-b flex gap-2">
            <input 
              type="text" 
              placeholder="E.g., High" 
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd("PRIORITY")}
              className="flex-1 px-3 py-2 border rounded-sm text-sm outline-none focus:ring-2 focus:ring-primary/100/20"
            />
            <button 
              disabled={loading}
              onClick={() => handleAdd("PRIORITY")}
              className="bg-primary px-4 text-white text-sm font-medium rounded-sm hover:bg-primary disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={16} /> Add
            </button>
          </div>
          {renderList(priorities, "PRIORITY")}
          {loading && <div className="absolute inset-0 bg-card/50 flex items-center justify-center pointer-events-none" />}
        </div>
      </div>

      {/* Operation Log Overlay/Panel */}
      <AnimatePresence>
        {showLogs && (
          <motion.div 
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-0 right-0 w-80 h-full bg-card border-l border-border shadow-2xl z-50 flex flex-col"
          >
            <div className="p-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-primary" />
                <span className="text-xs font-black uppercase tracking-widest">Governance Feed</span>
              </div>
              <button onClick={() => setShowLogs(false)} className="p-1 hover:bg-muted rounded-sm"><X size={16} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Recent Dictionary Actions</span>
                  <button onClick={loadLogs} className="p-1 hover:bg-muted rounded-sm">
                     <RotateCw size={12} className={cn(loadingLogs && "animate-spin")} />
                  </button>
               </div>
               
               {auditLogs.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-border rounded-sm opacity-40  text-[10px]">
                     No governance events recorded.
                  </div>
               ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="p-3 border border-border rounded-sm bg-muted/5 flex flex-col gap-1 hover:border-primary/20 transition-all">
                       <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black uppercase tracking-tighter text-primary">{log.action.replace(/_/g, ' ')}</span>
                          <span className="text-[8px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                       </div>
                       <span className="text-xs font-bold text-foreground/80 truncate">{log.target}</span>
                       <div className="flex items-center gap-2 mt-1">
                          <div className="px-1 py-0.5 bg-muted rounded-[2px] text-[8px] font-bold text-muted-foreground">{log.actor}</div>
                       </div>
                    </div>
                  ))
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
