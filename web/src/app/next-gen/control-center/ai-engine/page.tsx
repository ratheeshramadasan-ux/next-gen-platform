"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, BrainCircuit, Activity, Zap, ShieldCheck, 
  Trash2, Globe, Lock, Save, Sparkles,
  Search, RefreshCw, AlertCircle, CheckCircle2,
  Settings2, Info, Building2, Cpu, Unplug, X,
  Terminal, BarChart3, Fingerprint, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  getAiModels, 
  upsertAiModelAction, 
  deleteAiModelAction, 
  testAiModelConnectionAction 
} from "@/app/actions/aiActions";
import { toast } from "sonner";
import { getStatusStyle, getSeverityStyle } from "@/lib/status-utils";

/**
 * AI Infrastructure Engine: The control plane for registering
 * and monitoring local/cloud model nodes (Ollama, LocalAI, etc.).
 */
export default function AiEnginePage() {
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newNode, setNewNode] = useState({
    name: "",
    provider: "OLLAMA",
    endpoint: "http://localhost:11434",
    modelIdentifier: "llama3",
    isLocal: true
  });

  const refreshModels = async () => {
    setLoading(true);
    const data = await getAiModels();
    setModels(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshModels();
  }, []);

  const handleTestConnection = async (id: string) => {
    setSyncingId(id);
    const res = await testAiModelConnectionAction(id);
    if (res.success) {
      toast.success(`Node synchronized. Status: ${res.status}`);
      await refreshModels();
    } else {
      toast.error(res.error || "Connection failure.");
    }
    setSyncingId(null);
  };

  const handleSaveNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNode.name || !newNode.endpoint) return;

    const res = await upsertAiModelAction(newNode);
    if (res.success) {
      setIsAdding(false);
      await refreshModels();
      toast.success("AI Infrastructure node registered.");
      setNewNode({
        name: "",
        provider: "OLLAMA",
        endpoint: "http://localhost:11434",
        modelIdentifier: "llama3",
        isLocal: true
      });
    } else {
      toast.error(res.error);
    }
  };

  const handleDeleteNode = async (id: string) => {
    if (!confirm("Are you sure you want to decommission this node?")) return;
    const res = await deleteAiModelAction(id);
    if (res.success) {
      await refreshModels();
      toast.success("Node decommissioned.");
    }
  };

  const filteredModels = models.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.modelIdentifier?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-8 flex flex-col h-full gap-8 max-h-screen relative overflow-hidden">
        
        {/* --- DYNAMIC HEADER --- */}
        <header className="flex justify-between items-end shrink-0">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Infrastructure</span>
              <div className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-500">AI Model Fabric</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">
              Node Orchestrator
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
             <div className="relative group hidden md:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-40 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  placeholder="Filter nodes..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 pr-6 py-3 bg-card/40 border border-border/40 rounded-sm text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none w-64"
                />
             </div>
             <button 
               onClick={() => setIsAdding(true)}
               className="px-8 py-4 bg-indigo-600 text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:scale-[1.05] transition-all flex items-center gap-3"
             >
                <Plus size={16} /> Register AI Node
             </button>
             <div className="w-px h-10 bg-border/40" />
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Fabric Pulse</span>
                <div className="flex items-center gap-2">
                   <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_rgba(16,185,129,0.5)]" />
                   <span className="text-[11px] font-black uppercase tracking-widest text-foreground">Sync Active</span>
                </div>
             </div>
          </div>
        </header>

        {/* --- MAIN INFRASTRUCTURE GRID --- */}
        <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pb-10">
           {loading ? (
             <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="w-12 h-12 rounded-sm border-4 border-indigo-500/10 border-t-indigo-500 animate-spin" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Syncing Ledger...</span>
             </div>
           ) : filteredModels.length === 0 ? (
             <div className="flex flex-col items-center justify-center h-64 gap-6 bg-card/40 border border-dashed border-border/60 rounded-sm p-20 opacity-40">
                <BrainCircuit size={64} className="text-muted-foreground" />
                <div className="text-center space-y-2">
                   <h3 className="text-xl font-black uppercase tracking-tighter">No Nodes Provisioned</h3>
                   <p className="text-[10px] font-medium uppercase tracking-[0.2em] max-w-xs leading-relaxed mx-auto">Register your local model node to begin orchestrating intelligence across the workspace.</p>
                </div>
             </div>
           ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredModels.map((model) => (
                  <motion.div 
                    layout
                    key={model.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group bg-card/60 backdrop-blur-xl border border-border/80 rounded-sm p-8 shadow-xl hover:shadow-2xl hover:border-indigo-500/30 transition-all flex flex-col gap-6 relative overflow-hidden"
                  >
                     {/* Status Glow */}
                     <div className={cn(
                       "absolute -top-10 -right-10 w-32 h-32 blur-[60px] opacity-10 rounded-full transition-colors",
                       model.status === "ONLINE" ? "bg-emerald-500" : "bg-rose-500"
                     )} />

                     <div className="flex justify-between items-start relative z-10">
                        <div className="flex items-center gap-4">
                           <div className="w-14 h-14 rounded-sm bg-indigo-500/10 flex items-center justify-center text-indigo-500 shadow-inner group-hover:scale-110 transition-transform">
                              {model.provider === "OLLAMA" ? <Terminal size={24} /> : <Globe size={24} />}
                           </div>
                           <div className="flex flex-col">
                              <h3 className="text-lg font-black uppercase tracking-tighter leading-none mb-1 truncate max-w-[150px]">{model.name}</h3>
                              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/40 px-2 py-0.5 rounded-sm w-fit">{model.provider}</span>
                           </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteNode(model.id)}
                          className="p-2.5 rounded-sm hover:bg-rose-500/10 hover:text-rose-500 text-muted-foreground/40 transition-all"
                        >
                           <Trash2 size={16} />
                        </button>
                     </div>

                     <div className="space-y-4 relative z-10">
                        <div className="flex flex-col gap-1.5 p-4 bg-background/40 rounded-sm border border-border/20">
                           <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Endpoint Address</span>
                           <code className="text-[11px] font-bold text-primary truncate">{model.endpoint}</code>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div className="flex flex-col gap-1.5 p-4 bg-background/40 rounded-sm border border-border/20">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Identity</span>
                              <span className="text-[11px] font-black uppercase tracking-tight truncate">{model.modelIdentifier || "Ollat-3-8B"}</span>
                           </div>
                           <div className="flex flex-col gap-1.5 p-4 bg-background/40 rounded-sm border border-border/20">
                              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60">State</span>
                              <div className="flex items-center gap-2">
                                 <div className={cn(
                                   "w-2 h-2 rounded-full",
                                   model.status === "ONLINE" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                                 )} />
                                 <span className={cn(
                                   "text-[10px] font-black uppercase tracking-widest",
                                   model.status === "ONLINE" ? "text-emerald-500" : "text-rose-500"
                                 )}>{model.status}</span>
                              </div>
                           </div>
                        </div>
                     </div>

                     <div className="flex items-center justify-between mt-2 pt-6 border-t border-border/40 relative z-10">
                        <div className="flex items-center gap-3">
                           <div className="flex flex-col">
                              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5 opacity-40">Latency Avg</span>
                              <span className="text-xs font-black tabular-nums">{model.latencyMs || 0}<span className="text-[9px] text-muted-foreground ml-0.5">ms</span></span>
                           </div>
                           {model.latencyMs < 100 && model.status === "ONLINE" && model.latencyMs > 0 && (
                             <div className="px-2 py-0.5 bg-emerald-500/10 rounded-sm">
                                <span className="text-[8px] font-black text-emerald-500 uppercase">Superior</span>
                             </div>
                           )}
                        </div>

                        <button 
                          disabled={syncingId === model.id}
                          onClick={() => handleTestConnection(model.id)}
                          className={cn(
                            "px-5 py-2.5 rounded-[1.2rem] text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                            syncingId === model.id 
                              ? "bg-muted text-muted-foreground cursor-wait" 
                              : "bg-indigo-500/5 text-indigo-500 hover:bg-indigo-500 hover:text-white shadow-sm"
                          )}
                        >
                           <RefreshCw size={12} className={cn(syncingId === model.id && "animate-spin")} />
                           {syncingId === model.id ? "Pinging..." : "Pulse Check"}
                        </button>
                     </div>
                  </motion.div>
                ))}
             </div>
           )}
        </div>

        {/* --- REGISTRATION MODAL --- */}
        <AnimatePresence>
           {isAdding && (
             <motion.div 
               initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
               className="fixed inset-0 bg-background/80 backdrop-blur-3xl z-[100] flex items-center justify-center p-8"
             >
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="w-full max-w-xl bg-card border border-border shadow-[0_32px_128px_-32px_rgba(0,0,0,0.5)] rounded-sm overflow-hidden"
                >
                   <div className="p-10 border-b border-border bg-indigo-500/5 relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[60px] rounded-full" />
                      <div className="flex justify-between items-start relative z-10">
                         <div className="flex flex-col gap-2">
                           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-500">Infra Integration</span>
                           <h3 className="text-3xl font-black uppercase tracking-tighter">Register AI Node</h3>
                         </div>
                         <button onClick={() => setIsAdding(false)} className="p-3 bg-muted/40 rounded-sm hover:bg-muted transition-colors"><X size={20}/></button>
                      </div>
                   </div>

                   <form onSubmit={handleSaveNode} className="p-10 space-y-8 relative z-10">
                      <div className="grid grid-cols-2 gap-6">
                         <div className="col-span-2 flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Friendly Node Name</label>
                            <input 
                              required type="text" placeholder="e.g. Local Research Llama" 
                              value={newNode.name} onChange={e => setNewNode({...newNode, name: e.target.value})}
                              className="px-6 py-4 bg-background border border-border rounded-sm text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                            />
                         </div>
                         
                         <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Architecture</label>
                            <select 
                              value={newNode.provider} onChange={e => setNewNode({...newNode, provider: e.target.value})}
                              className="px-6 py-4 bg-background border border-border rounded-sm text-[11px] font-black uppercase tracking-widest appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 outline-none"
                            >
                               <option value="OLLAMA">Ollama (Local)</option>
                               <option value="LOCALAI">LocalAI (Open Source)</option>
                               <option value="OPENAI">OpenAI (Cloud)</option>
                               <option value="ANTHROPIC">Anthropic (Cloud)</option>
                            </select>
                         </div>

                         <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Model Tag</label>
                            <input 
                              required type="text" placeholder="e.g. llama3:8b" 
                              value={newNode.modelIdentifier} onChange={e => setNewNode({...newNode, modelIdentifier: e.target.value})}
                              className="px-6 py-4 bg-background border border-border rounded-sm text-[11px] font-black uppercase tracking-tight focus:ring-4 focus:ring-indigo-500/10 outline-none" 
                            />
                         </div>

                         <div className="col-span-2 flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">API Endpoint URL</label>
                            <div className="relative">
                               <input 
                                 required type="url" placeholder="http://localhost:11434" 
                                 value={newNode.endpoint} onChange={e => setNewNode({...newNode, endpoint: e.target.value})}
                                 className="w-full px-6 py-4 bg-background border border-border rounded-sm text-[11px] font-bold focus:ring-4 focus:ring-indigo-500/10 font-mono outline-none" 
                               />
                               <Globe size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-muted-foreground opacity-30" />
                            </div>
                         </div>
                      </div>

                      <div className="flex items-center gap-4 bg-indigo-500/5 p-5 rounded-sm border border-indigo-500/10">
                         <div className="p-3 bg-indigo-500/10 rounded-sm text-indigo-500"><ShieldCheck size={20}/></div>
                         <div className="flex flex-col flex-1">
                            <span className="text-[10px] font-black uppercase tracking-widest">Provisioning Mode</span>
                            <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-60 tracking-tighter">Automatic heartbeat validation post-init</span>
                         </div>
                         <div className={cn("w-12 h-7 rounded-full p-1 transition-colors cursor-pointer", newNode.isLocal ? "bg-indigo-500 shadow-lg shadow-indigo-500/20" : "bg-muted")} onClick={() => setNewNode({...newNode, isLocal: !newNode.isLocal})}>
                            <div className={cn("w-5 h-5 bg-white rounded-full transition-transform", newNode.isLocal && "translate-x-5")} />
                         </div>
                      </div>

                      <div className="flex gap-4 pt-4 shrink-0">
                         <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-sm text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Integrate Node
                         </button>
                         <button type="button" onClick={() => setIsAdding(false)} className="px-10 py-4 bg-card border border-border rounded-sm text-[11px] font-black uppercase tracking-widest hover:bg-muted transition-all">Escape</button>
                      </div>
                   </form>
                </motion.div>
             </motion.div>
           )}
        </AnimatePresence>
      </div>
    </div>
  );
}
