"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Building2, Zap, ShieldCheck, Activity, BrainCircuit, Globe, 
  Settings2, Plus, Trash2, Lock, Save, Database, LayoutGrid,
  ChevronRight, ToggleLeft as Toggle, ToggleRight, AlertCircle, Sparkles,
  Search, Sliders, CheckCircle2, History, Cpu, BarChart3, Fingerprint,
  Monitor, Layers, Cloud, Shield, Download, Share2, Filter, X
} from "lucide-react";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { Button } from "@/components/ui/button";

import { 
  getTenantsForCustomer, 
  toggleTenantServiceAction, 
  getAuditLogsForTarget,
  createTenantAction
} from "@/app/actions/tenantActions";

const SERVICE_CATEGORIES = [
  { 
    id: "AUTOMATION",
    name: "Automation Services", 
    icon: Zap, 
    color: "text-amber-500",
    services: ["Web Automation", "Desktop Automation", "API Automation", "CLI/Scripts"]
  },
  { 
    id: "AI",
    name: "AI & Intelligence", 
    icon: BrainCircuit, 
    color: "text-indigo-500",
    services: ["Document AI", "LLM Orchestration", "Computer Vision", "NLP Processing"]
  },
  { 
    id: "INTEGRATION",
    name: "Integration & Web", 
    icon: Globe, 
    color: "text-emerald-500",
    services: ["SMTP / Email", "Webhooks", "External APIs", "iPaaS Connectors"]
  },
  { 
    id: "GOVERNANCE",
    name: "Governance & Security", 
    icon: ShieldCheck, 
    color: "text-rose-500",
    services: ["Logging & Audit", "PII Masking", "Encryption", "Compliance Policies"]
  }
];

export default function WorkspaceManagementPage() {
  const { role, currentUser, activeTenant, switchTenant } = useAppContext();
  
  const [tenants, setTenants] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [newNode, setNewNode] = useState({ name: "", type: "DEV", code: "", description: "" });
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [formError, setFormError] = useState("");
  
  const selectedTenant = tenants.find(t => t.id === selectedTenantId);

  // ... skip lines ...

  const refreshData = async () => {
    if (currentUser?.customerId) {
      const data = await getTenantsForCustomer(currentUser.customerId);
      setTenants(data);
      
      // Use global activeTenant if available, else first tenant
      if (activeTenant) {
        setSelectedTenantId(activeTenant.id);
      } else if (data.length > 0) {
        setSelectedTenantId(data[0].id);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => {
    refreshData();
  }, [currentUser?.customerId]);

  // Sync with global switch if user changes it from top bar
  useEffect(() => {
    if (activeTenant && activeTenant.id !== selectedTenantId) {
      setSelectedTenantId(activeTenant.id);
    }
  }, [activeTenant?.id]);

  // If user selects a tenant here, also update the global context
  const handleTenantDirectSelection = (id: string) => {
    setSelectedTenantId(id);
    switchTenant(id);
  };

  useEffect(() => {
    if (selectedTenantId) {
      setLoadingLogs(true);
      getAuditLogsForTarget(selectedTenantId).then(logs => {
        setAuditLogs(logs);
        setLoadingLogs(false);
      });
    }
  }, [selectedTenantId]);

  const handleToggleService = async (serviceName: string, enabled: boolean) => {
    if (!selectedTenantId) return;
    setActionLoading(true);
    const res = await toggleTenantServiceAction(selectedTenantId, serviceName, enabled, role);
    if (res.success) {
      await refreshData();
      const newLogs = await getAuditLogsForTarget(selectedTenantId);
      setAuditLogs(newLogs);
    } else {
      alert(res.error);
    }
    setActionLoading(false);
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNode.name || !newNode.code || !currentUser?.customerId) return;
    
    setActionLoading(true);
    const res = await createTenantAction(
      { ...newNode, customerId: currentUser.customerId },
      currentUser.email
    );

    if (res.success) {
      setIsAdding(false);
      setNewNode({ name: "", type: "DEV", code: "", description: "" });
      await refreshData();
      if (res.tenant) setSelectedTenantId(res.tenant.id);
    } else {
      setFormError(res.error || "Provisioning failed.");
    }
    setActionLoading(false);
  };

  if (role === "Admin User") {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center glass-card m-10">
         <ShieldCheck className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
         <h1 className="text-2xl font-black uppercase tracking-tighter">Access Restricted</h1>
         <p className="text-muted-foreground mt-2 max-w-sm text-[10px] uppercase font-bold tracking-widest">Workspace governance is restricted to higher privilege tiers.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-6 md:p-8 flex flex-col h-full gap-8 max-h-screen relative">
        {/* --- PAGE HEADER --- */}
        <header className="flex justify-between items-end">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Platform Control Center</span>
              <div className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Manage Workspace</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">
              Node Orchestration
            </h1>
          </div>
          
          <div className="flex items-center gap-6">
             <Button 
               size="lg"
               onClick={() => setIsAdding(true)}
               className="px-8 font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:scale-[1.05]"
             >
                <Plus size={16} /> Provision New Node
             </Button>

             <div className="w-px h-8 bg-border/40" />
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Platform State</span>
                <div className="flex items-center gap-2">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Synchronized</span>
                </div>
             </div>
          </div>
        </header>

        <div className="flex-1 flex gap-8 overflow-hidden min-h-0">
          {/* --- LEFT: WORKSPACE SELECTOR --- */}
          <div className="w-80 flex flex-col bg-card/40 backdrop-blur-md rounded-sm border border-border/40 shadow-xl overflow-hidden">
             <div className="p-6 border-b border-border/40 bg-muted/20">
                <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                   <input 
                     type="text" 
                     placeholder="Search environment..." 
                     className="w-full pl-11 pr-4 py-2 bg-background/40 border border-border/40 rounded-sm text-[11px] font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase tracking-tight"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Polling Nodes...</span>
                  </div>
                ) : (
                  tenants.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).map(t => (
                    <motion.div
                      layoutId={t.id}
                      key={t.id}
                      onClick={() => handleTenantDirectSelection(t.id)}
                      className={cn(
                        "p-5 rounded-sm cursor-pointer transition-all border group relative overflow-hidden",
                        selectedTenantId === t.id 
                          ? "bg-primary border-primary shadow-2xl shadow-primary/20 text-white" 
                          : "bg-background/40 border-border/40 hover:bg-background/60 hover:border-primary/20 text-foreground"
                      )}
                    >
                       <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                             <div className={cn(
                               "w-8 h-8 rounded-sm flex items-center justify-center",
                               selectedTenantId === t.id ? "bg-white/20" : "bg-primary/10 text-primary"
                             )}>
                                <Building2 size={16} />
                             </div>
                             <span className="font-black text-xs uppercase tracking-tight">{t.name}</span>
                          </div>
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest",
                            selectedTenantId === t.id ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                          )}>
                            {t.type}
                          </span>
                       </div>
                       <div className={cn(
                         "text-[9px] uppercase font-black tracking-[0.2em] transition-opacity",
                         selectedTenantId === t.id ? "text-white/60" : "text-muted-foreground/40"
                       )}>
                         {t.code}
                       </div>
                    </motion.div>
                  ))
                )}
             </div>
          </div>

          {/* --- MIDDLE: CONFIG CANVAS --- */}
          <div className="flex-1 bg-card/60 backdrop-blur-md rounded-sm border border-border shadow-2xl overflow-hidden flex flex-col relative transition-all">
             <AnimatePresence mode="wait">
                {selectedTenant ? (
                  <motion.div 
                    key={selectedTenant.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex flex-col h-full"
                  >
                    {/* Workspace Header */}
                    <div className="p-10 border-b border-border bg-muted/10 flex justify-between items-center">
                       <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-sm bg-primary flex items-center justify-center text-white shadow-2xl shadow-primary/30 relative">
                             <div className="absolute inset-0 bg-white/10 blur-xl rounded-full scale-150 opacity-20" />
                             <Settings2 size={32} />
                          </div>
                          <div>
                             <h3 className="text-3xl font-black text-foreground leading-none tracking-tighter uppercase">{selectedTenant.name}</h3>
                             <div className="flex items-center gap-3 mt-2">
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-sm">
                                   <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                   <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">HealthyNode</span>
                                </div>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/50 px-2 py-1 rounded-sm">
                                   Isolated @ {selectedTenant.code}
                                </span>
                             </div>
                          </div>
                       </div>
                       
                       {/* Health Pulse Metrics */}
                       <div className="flex gap-8 items-center">
                          <div className="flex flex-col items-end">
                             <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Success Rate</span>
                             <div className="flex items-center gap-2">
                                <span className="text-2xl font-black tracking-tighter tabular-nums">99.8%</span>
                                <BarChart3 size={14} className="text-emerald-500" />
                             </div>
                          </div>
                          <div className="w-px h-10 bg-border/60" />
                          <div className="flex flex-col items-end">
                             <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">Sync Latency</span>
                             <div className="flex items-center gap-2">
                                <span className="text-2xl font-black tracking-tighter tabular-nums">42ms</span>
                                <Activity size={14} className="text-primary" />
                             </div>
                          </div>
                       </div>
                    </div>

                    {/* Service Toggle Grid */}
                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          {SERVICE_CATEGORIES.map((cat) => (
                             <section key={cat.id} className="space-y-6">
                                <div className="flex items-center justify-between border-b border-border/40 pb-4">
                                   <div className="flex items-center gap-3">
                                      <div className={cn("p-2 rounded-sm bg-muted/40", cat.color)}>
                                         <IconWrapper icon={cat.icon} size={18} />
                                      </div>
                                      <h4 className="text-[11px] font-black text-foreground uppercase tracking-widest">{cat.name}</h4>
                                   </div>
                                   <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <Lock size={12} className="opacity-40" />
                                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Gated</span>
                                   </div>
                                </div>
                                
                                <div className="space-y-3">
                                   {cat.services.map(service => {
                                      const isEnabled = selectedTenant.services.find((s: any) => s.serviceName === service)?.enabled || false;
                                      return (
                                        <div 
                                          key={service} 
                                          className={cn(
                                            "px-5 py-4 rounded-sm border flex items-center justify-between transition-all group",
                                            isEnabled 
                                              ? "bg-background/40 border-primary/20 shadow-sm" 
                                              : "bg-muted/10 border-border/40 opacity-40 grayscale-[0.8]"
                                          )}
                                        >
                                          <div className="flex flex-col gap-0.5">
                                            <span className="text-xs font-black uppercase tracking-tight text-foreground transition-colors group-hover:text-primary">{service}</span>
                                            <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-widest">Node Capability</span>
                                          </div>
                                          <button 
                                            disabled={actionLoading}
                                            onClick={() => handleToggleService(service, !isEnabled)}
                                            className={cn(
                                              "w-11 h-6 rounded-full relative transition-all duration-500",
                                              isEnabled ? "bg-primary shadow-lg shadow-primary/20" : "bg-muted-foreground/30"
                                            )}
                                          >
                                             <motion.div 
                                               animate={{ x: isEnabled ? 22 : 2, scale: isEnabled ? 1.1 : 0.9 }}
                                               className="absolute top-1 left-0 w-4 h-4 rounded-full bg-white shadow-md flex items-center justify-center"
                                             >
                                                {isEnabled && <CheckCircle2 size={10} className="text-primary" />}
                                             </motion.div>
                                          </button>
                                        </div>
                                      );
                                   })}
                                </div>
                             </section>
                          ))}
                       </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-border bg-muted/10 flex justify-between items-center transition-all">
                       <div className="flex items-center gap-6">
                          <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                             <Database size={14} className="text-primary" /> Master Residency: Standard (Local)
                          </div>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                             <Fingerprint size={14} className="text-primary" /> Attestation Valid
                          </div>
                       </div>
                       <div className="flex gap-4">
                          <Button variant="outline" className="px-8 py-3 uppercase tracking-widest font-black text-[10px]">
                             Export State
                          </Button>
                          <Button size="lg" className="px-8 font-black uppercase tracking-widest shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95">
                             <Save size={16}/> Comply Changes
                          </Button>
                       </div>

                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-8 p-20 text-center">
                     <div className="w-24 h-24 rounded-sm bg-muted/10 flex items-center justify-center text-muted-foreground relative">
                        <div className="absolute inset-0 bg-muted/5 blur-3xl opacity-20" />
                        <LayoutGrid size={48} className="opacity-20" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-2xl font-black uppercase tracking-tighter opacity-20">No Context Provisioned</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 max-w-xs mx-auto leading-relaxed">
                          Select an infrastructure node from the directory to begin environment governance.
                        </p>
                     </div>
                  </div>
                )}
             </AnimatePresence>

             <AnimatePresence>
                {isAdding && (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/80 backdrop-blur-xl z-50 flex items-center justify-center p-8"
                  >
                     <motion.div 
                       initial={{ scale: 0.9, opacity: 0 }}
                       animate={{ scale: 1, opacity: 1 }}
                       className="w-full max-w-md bg-card border border-border shadow-2xl rounded-sm p-8"
                     >
                        <div className="flex justify-between items-start mb-6">
                           <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Node Provisioning</span>
                              <h2 className="text-2xl font-black uppercase tracking-tighter">New Master Node</h2>
                           </div>
                           <button onClick={() => setIsAdding(false)} className="p-2 bg-muted/40 rounded-sm hover:bg-muted/60 transition-colors">
                              <X size={20} />
                           </button>
                        </div>
                        
                        <form onSubmit={handleCreateTenant} className="space-y-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Node Name *</label>
                              <input 
                                required
                                type="text" 
                                placeholder="e.g. Production Alpha"
                                value={newNode.name}
                                onChange={e => {
                                  const val = e.target.value;
                                  setNewNode({ 
                                    ...newNode, 
                                    name: val,
                                    code: val.toUpperCase().replace(/\s+/g, '-').substring(0, 10) 
                                  });
                                }}
                                className="w-full px-5 py-3 bg-muted/20 border border-border rounded-sm text-sm font-bold focus:ring-4 focus:ring-primary/10 tracking-tight"
                              />
                           </div>

                           <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Env Type</label>
                                 <select 
                                   value={newNode.type}
                                   onChange={e => setNewNode({ ...newNode, type: e.target.value })}
                                   className="w-full px-4 py-3 bg-muted/20 border border-border rounded-sm text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-primary/10"
                                 >
                                    <option value="PROD">PRODUCTION</option>
                                    <option value="DEV">DEVELOPMENT</option>
                                    <option value="UAT">UAT / TEST</option>
                                    <option value="SANDBOX">SANDBOX</option>
                                 </select>
                              </div>
                              <div className="space-y-2">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Slug</label>
                                 <input 
                                   required
                                   type="text" 
                                   value={newNode.code}
                                   onChange={e => setNewNode({ ...newNode, code: e.target.value })}
                                   className="w-full px-4 py-3 bg-muted/20 border border-border rounded-sm text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-primary/10 font-mono"
                                 />
                              </div>
                           </div>
                           
                           {formError && (
                             <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-sm text-[10px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                <AlertCircle size={14} /> {formError}
                             </div>
                           )}

                           <div className="flex gap-4">
                              <Button 
                                type="submit" 
                                disabled={actionLoading}
                                size="lg"
                                className="flex-1 font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:scale-[1.02]"
                              >
                                {actionLoading ? "Allocating Node..." : "Initiate Provisioning"}
                              </Button>
                           </div>

                        </form>
                     </motion.div>
                  </motion.div>
                )}
             </AnimatePresence>

             {actionLoading && (
               <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 className="absolute inset-0 bg-background/20 backdrop-blur-[4px] z-50 flex items-center justify-center p-8"
               >
                  <motion.div 
                    initial={{ scale: 0.9, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    transition={{ type: "spring", damping: 25 }}
                    className="p-8 bg-card border border-border shadow-[0_30px_60px_rgba(0,0,0,0.3)] rounded-sm flex flex-col items-center gap-6"
                  >
                     <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center text-primary relative">
                        <div className="absolute inset-0 border-4 border-primary/20 border-t-primary rounded-sm animate-spin" />
                        <Sparkles size={20} className="animate-pulse" />
                     </div>
                     <div className="flex flex-col items-center gap-1 text-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Orchestrating Policy</span>
                        <h4 className="text-xl font-black tracking-tight uppercase">Applying Config Map...</h4>
                     </div>
                  </motion.div>
               </motion.div>
             )}
          </div>

          {/* --- RIGHT: CHRONICLE --- */}
          <div className="w-80 bg-card/40 backdrop-blur-md flex flex-col rounded-sm border border-l border-border/40 shadow-xl overflow-hidden shrink-0">
             <div className="p-6 border-b border-border/40 bg-muted/20 flex flex-col gap-1">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 rounded-sm text-primary">
                      <History size={16} />
                   </div>
                   <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Node Chronicle</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                   <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Live Activity Stream</span>
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative">
                <div className="absolute left-[39px] top-10 bottom-10 w-px bg-border/40 border-dashed" />
                
                <div className="flex flex-col gap-10 relative">
                  {loadingLogs ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                       <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                       <span className="text-[8px] font-bold uppercase tracking-widest opacity-40">Syncing History...</span>
                    </div>
                  ) : auditLogs.length === 0 ? (
                    <div className="text-center py-20 text-[9px] font-black uppercase tracking-widest text-muted-foreground/30">No node activity recorded.</div>
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
                          <div className="flex flex-col gap-0.5">
                             <span className="text-[9px] font-bold text-foreground opacity-80">{log.target}</span>
                             <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Ref: {log.actor.split("@")[0]}</span>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
