"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, Clock, CheckCircle2, AlertCircle, 
  Building2, User, Globe, Activity, History,
  ChevronRight, Lock, Unlock, Zap, ShieldAlert,
  Search, Sliders, Check, X, Building, Mail, 
  CreditCard, Scale, Fingerprint, Eye, RefreshCw
} from "lucide-react";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { 
  getPendingCustomersAction, 
  approveCustomerActivationAction,
  getGlobalAuditLogs
} from "@/app/actions/tenantActions";

export default function ApprovalHubPage() {
  const { role, currentUser, refreshCustomers } = useAppContext();
  
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Selected Request Data
  const selectedRequest = pendingRequests.find(r => r.id === selectedRequestId);

  const refreshData = async () => {
    setIsLoading(true);
    const data = await getPendingCustomersAction();
    setPendingRequests(data);
    if (!selectedRequestId && data.length > 0) {
      setSelectedRequestId(data[0].id);
    }
    setIsLoading(false);
    loadLogs();
  };

  const loadLogs = async () => {
    setIsLoadingLogs(true);
    const logs = await getGlobalAuditLogs(null, "Customer");
    setAuditLogs(logs);
    setIsLoadingLogs(false);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleApprove = async (customerId: string) => {
    if (!currentUser?.email) return;
    setActionLoading(true);
    const res = await approveCustomerActivationAction(customerId, currentUser.email, currentUser.name);
    if (res.success) {
      await refreshData();
      await refreshCustomers();
      if (pendingRequests.length <= 1) setSelectedRequestId(null);
    } else {
      alert(res.error || "Activation failed.");
    }
    setActionLoading(false);
  };

  if (role !== "Platform Admin") {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center glass-card m-10">
         <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 opacity-20" />
         <h1 className="text-2xl font-black uppercase tracking-tighter">Access Denied</h1>
         <p className="text-muted-foreground mt-2 max-w-sm text-[10px] uppercase font-bold tracking-widest leading-relaxed">
           The Governance Orchestrator is restricted to Platform Administrators. Restricted access prevents multi-tenant security violations.
         </p>
      </div>
    );
  }

  const isConflict = selectedRequest?.createdBy?.toLowerCase() === currentUser?.email?.toLowerCase();

  return (
    <div className="flex-1 flex flex-col h-full bg-transparent overflow-hidden">
      <div className="p-6 md:p-8 flex flex-col h-full gap-8 max-h-screen relative">
        {/* --- PAGE HEADER --- */}
        <header className="flex justify-between items-end">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Platform Control Center</span>
              <div className="w-1 h-1 rounded-full bg-border" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Approval Hub</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">
              Gated Orchestration
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
             <div className="flex flex-col items-end">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Security Status</span>
                <div className="flex items-center gap-2">
                   <Lock size={12} className="text-primary" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-foreground">4-Eyes Protocol Active</span>
                </div>
             </div>
          </div>
        </header>

        <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
          {/* --- LEFT: SCRUTINY QUEUE --- */}
          <div className="w-80 flex flex-col bg-card/40 backdrop-blur-md rounded-sm border border-border/40 shadow-xl overflow-hidden shadow-sm">
             <div className="p-6 border-b border-border/40 bg-muted/20 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-sm text-primary">
                         <History size={16} />
                      </div>
                      <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Scrutiny Queue</span>
                   </div>
                   <div className="px-3 py-1 bg-primary/10 rounded-full text-[9px] font-black text-primary uppercase tracking-widest">
                      {pendingRequests.length} Pending
                   </div>
                </div>
                <div className="relative group">
                   <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                   <input 
                     type="text" 
                     placeholder="Search requests..." 
                     className="w-full pl-11 pr-4 py-2 bg-background/40 border border-border/40 rounded-sm text-[11px] font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase tracking-tight"
                     value={searchQuery}
                     onChange={(e) => setSearchQuery(e.target.value)}
                   />
                </div>
             </div>

             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3">
                {isLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                    <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Queue...</span>
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 gap-6 text-center max-w-sm mx-auto">
                    <CheckCircle2 size={48} className="text-emerald-500" />
                    <div>
                      <h3 className="text-xl font-black tracking-tighter uppercase">Queue Synchronized</h3>
                      <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60 leading-relaxed">
                        All entity registrations have been successfully attested or finalized.
                      </p>
                    </div>
                  </div>
                ) : (
                  pendingRequests.filter(r => r.companyName.toLowerCase().includes(searchQuery.toLowerCase())).map(r => (
                    <motion.div
                      layoutId={r.id}
                      key={r.id}
                      onClick={() => setSelectedRequestId(r.id)}
                      className={cn(
                        "p-5 rounded-sm cursor-pointer transition-all border group relative overflow-hidden",
                        selectedRequestId === r.id 
                          ? "bg-primary border-primary shadow-2xl shadow-primary/20 text-white" 
                          : "bg-background/40 border-border/40 hover:bg-background/60 text-foreground"
                      )}
                    >
                       <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                             <div className={cn(
                               "w-8 h-8 rounded-sm flex items-center justify-center",
                               selectedRequestId === r.id ? "bg-white/20" : "bg-primary/10 text-primary"
                             )}>
                                <Building2 size={16} />
                             </div>
                             <span className="font-black text-[11px] uppercase tracking-tight">{r.companyName}</span>
                          </div>
                          <Clock size={14} className={selectedRequestId === r.id ? "text-white/40" : "text-amber-500"} />
                       </div>
                       <div className="flex flex-col gap-1">
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest",
                            selectedRequestId === r.id ? "text-white/60" : "text-muted-foreground"
                          )}>
                            Onboarded: {new Date(r.createdAt).toLocaleDateString()}
                          </span>
                          <span className={cn(
                            "text-[8px] font-black uppercase tracking-widest opacity-40",
                            selectedRequestId === r.id ? "text-white" : ""
                          )}>
                             Ref: {r.id.substring(0, 8)}
                          </span>
                       </div>
                    </motion.div>
                  ))
                )}
             </div>
          </div>

          {/* --- MIDDLE: GOVERNANCE CANVAS --- */}
          <div className="flex-1 bg-card/60 backdrop-blur-md rounded-sm border border-border shadow-2xl overflow-hidden flex flex-col relative transition-all">
             <AnimatePresence mode="wait">
                {selectedRequest ? (
                  <motion.div 
                    key={selectedRequest.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    className="flex flex-col h-full"
                  >
                    <div className="p-10 border-b border-border bg-muted/10 flex justify-between items-center">
                       <div className="flex items-center gap-8">
                          <div className="w-20 h-20 rounded-sm bg-indigo-500 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 relative">
                             <div className="absolute inset-0 bg-white/10 blur-xl rounded-full scale-150 opacity-20" />
                             <Fingerprint size={40} />
                          </div>
                          <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-3">
                                <h3 className="text-4xl font-black text-foreground leading-none tracking-tighter uppercase">{selectedRequest.companyName}</h3>
                                <div className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[9px] font-black text-indigo-500 uppercase tracking-widest">Pending Attestation</div>
                             </div>
                             <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                   <User size={12} className="opacity-40" />
                                   <span className="text-[10px] font-bold uppercase tracking-widest">{selectedRequest.createdBy || 'System'}</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-border" />
                                <div className="flex items-center gap-1.5 text-muted-foreground">
                                   <Globe size={12} className="opacity-40" />
                                   <span className="text-[10px] font-bold uppercase tracking-widest">{selectedRequest.location}</span>
                                </div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="flex flex-col items-end gap-2 text-right">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Request Origin</span>
                          <span className="text-[11px] font-black text-foreground uppercase tracking-tight bg-muted/50 px-3 py-1 rounded-sm border border-border/40">
                             {selectedRequest.createdBy}
                          </span>
                       </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                       <div className="grid grid-cols-2 gap-10">
                          {/* Commercial Grid */}
                          <section className="space-y-6">
                             <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                                <Scale size={18} className="text-primary" />
                                <h4 className="text-[11px] font-black text-foreground uppercase tracking-widest">Commercial Identity</h4>
                             </div>
                             <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 rounded-sm bg-muted/20 border border-border/40 flex flex-col gap-1">
                                   <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Market Segment</span>
                                   <span className="text-sm font-black uppercase tracking-tight">{selectedRequest.customerType || 'Enterprise'}</span>
                                </div>
                                <div className="p-4 rounded-sm bg-muted/20 border border-border/40 flex flex-col gap-1">
                                   <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Preferred Currency</span>
                                   <span className="text-sm font-black uppercase tracking-tight">{selectedRequest.currency || 'USD'}</span>
                                </div>
                                <div className="p-4 rounded-sm bg-muted/20 border border-border/40 flex flex-col gap-1">
                                   <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Industry Vertical</span>
                                   <span className="text-sm font-black uppercase tracking-tight">{selectedRequest.industry}</span>
                                </div>
                                <div className="p-4 rounded-sm bg-muted/20 border border-border/40 flex flex-col gap-1">
                                   <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Operational Region</span>
                                   <span className="text-sm font-black uppercase tracking-tight">{selectedRequest.location}</span>
                                </div>
                             </div>
                          </section>

                          {/* Security & Access Grid */}
                          <section className="space-y-6">
                             <div className="flex items-center gap-3 border-b border-border/40 pb-4">
                                <ShieldCheck size={18} className="text-emerald-500" />
                                <h4 className="text-[11px] font-black text-foreground uppercase tracking-widest">Security Baseline</h4>
                             </div>
                             <div className="space-y-3">
                                <div className="p-5 rounded-sm bg-emerald-500/5 border border-emerald-500/10 flex items-center justify-between">
                                   <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-black uppercase tracking-tight">Identity Federation</span>
                                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{selectedRequest.authType} Protocol Active</span>
                                   </div>
                                   <CheckCircle2 size={16} className="text-emerald-500" />
                                </div>
                                <div className="p-5 rounded-sm bg-indigo-500/5 border border-indigo-500/10 flex items-center justify-between">
                                   <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-black uppercase tracking-tight">Governance Tier</span>
                                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Compliance: [GDPR / HIPAA Readiness]</span>
                                   </div>
                                   <Lock size={16} className="text-indigo-500" />
                                </div>
                             </div>
                          </section>

                          {/* Dual Custody Warning */}
                          <div className={cn(
                            "col-span-2 p-10 rounded-sm border flex flex-col gap-4 overflow-hidden relative",
                            isConflict ? "bg-rose-500/5 border-rose-500/30" : "bg-emerald-500/5 border-emerald-500/30"
                          )}>
                             <div className="flex items-center gap-6 relative z-10">
                                <div className={cn(
                                  "w-12 h-12 rounded-sm flex items-center justify-center text-white shadow-xl",
                                  isConflict ? "bg-rose-500 shadow-rose-500/20" : "bg-emerald-500 shadow-emerald-500/20"
                                )}>
                                   <IconWrapper icon={isConflict ? ShieldAlert : ShieldCheck} size={24} />
                                </div>
                                <div className="flex flex-col gap-1">
                                   <h4 className={cn("text-xl font-black tracking-tight uppercase", isConflict ? "text-rose-500" : "text-emerald-500")}>
                                      {isConflict ? "Attestation Conflict Detected" : "Independent Auditor Eligibility"}
                                   </h4>
                                   <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest max-w-lg leading-relaxed">
                                      {isConflict 
                                        ? "Dual-custody protocol prohibits administrators from finalizing their own entity registrations. This request must be attested by a secondary peer-auditor."
                                        : "Platform security validated. As an independent administrator, you are authorized to attest and finalize this infrastructure registration."}
                                   </p>
                                </div>
                             </div>
                             {isConflict && <div className="absolute inset-0 bg-rose-500/5 blur-3xl opacity-20" />}
                          </div>
                       </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="p-8 border-t border-border bg-muted/10 flex justify-between items-center transition-all">
                       <div className="flex items-center gap-6">
                          <button className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-rose-500 transition-colors flex items-center gap-2">
                             <X size={14} /> Decline & Purge
                          </button>
                          <div className="w-1 h-1 rounded-full bg-border" />
                          <div className="flex items-center gap-2 text-muted-foreground text-[10px] font-bold uppercase tracking-widest">
                             <Activity size={14} className="text-primary" /> Attestation Hash: [SHA-256 Validated]
                          </div>
                       </div>
                       <div className="flex gap-4">
                          <button 
                            disabled={isConflict || actionLoading}
                            onClick={() => handleApprove(selectedRequest.id)}
                            className={cn(
                              "px-10 py-4 rounded-sm text-[10px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all flex items-center gap-3",
                              isConflict 
                                ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" 
                                : "bg-emerald-500 text-white shadow-emerald-500/30 hover:scale-[1.05] active:scale-95"
                            )}
                          >
                             {actionLoading ? "Committing Entry..." : <><Check size={16}/> Finalize Activation</>}
                          </button>
                       </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-8 p-20 text-center">
                     <div className="w-24 h-24 rounded-sm bg-muted/10 flex items-center justify-center text-muted-foreground relative">
                        <div className="absolute inset-0 bg-muted/5 blur-3xl opacity-20" />
                        <ShieldCheck size={48} className="opacity-10" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-2xl font-black uppercase tracking-tighter opacity-20">Clearance Secured</h3>
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 max-w-xs mx-auto leading-relaxed">
                          No pending attestation artifacts selected. Choose a registration event from the Scrutiny Queue.
                        </p>
                     </div>
                   </div>
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
                    className="p-10 bg-card border border-border shadow-2xl rounded-sm flex flex-col items-center gap-6"
                   >
                     <div className="w-12 h-12 rounded-sm bg-emerald-500/10 flex items-center justify-center text-emerald-500 relative">
                        <div className="absolute inset-0 border-4 border-emerald-500/20 border-t-emerald-500 rounded-sm animate-spin" />
                        <SparklesIcon className="animate-pulse" />
                     </div>
                     <div className="flex flex-col items-center gap-1 text-center">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Finalizing Attestation</span>
                        <h4 className="text-xl font-black tracking-tight uppercase">Committing Identity to DB...</h4>
                     </div>
                  </motion.div>
               </motion.div>
             )}
          </div>

          {/* --- RIGHT: GOVERNANCE FEED --- */}
          <div className="w-80 flex flex-col bg-card/40 backdrop-blur-md rounded-sm border border-border/40 shadow-xl overflow-hidden">
             <div className="p-6 border-b border-border/40 bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-primary/10 rounded-sm text-primary">
                      <Activity size={16} />
                   </div>
                   <span className="text-[10px] font-black text-foreground uppercase tracking-[0.2em]">Governance Feed</span>
                </div>
                <button 
                  onClick={loadLogs}
                  disabled={isLoadingLogs}
                  className="p-1.5 hover:bg-muted rounded-sm transition-colors disabled:opacity-50"
                >
                   <RefreshCw size={12} className={cn("text-muted-foreground", isLoadingLogs && "animate-spin")} />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {isLoadingLogs && auditLogs.length === 0 ? (
                   <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                      <div className="w-6 h-6 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                      <span className="text-[9px] font-black uppercase tracking-widest">Polling Events...</span>
                   </div>
                ) : auditLogs.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center opacity-30 text-center p-10">
                      <History size={32} className="mb-4" />
                      <p className="text-[9px] font-black uppercase tracking-widest leading-relaxed">No governance events recorded in this cycle.</p>
                   </div>
                ) : (
                   auditLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-background/40 border border-border/40 rounded-sm flex gap-3 group hover:border-primary/20 transition-all">
                         <div className={cn(
                            "w-1 rounded-full",
                            log.action === "ONBOARDING_INITIATED" ? "bg-amber-500" :
                            log.action === "CUSTOMER_ACTIVATED" ? "bg-emerald-500" : "bg-primary"
                         )} />
                         <div className="flex-1 flex flex-col gap-1 min-w-0">
                            <div className="flex items-center justify-between">
                               <span className="text-[9px] font-black uppercase tracking-tighter text-foreground truncate">{log.action.replace(/_/g, ' ')}</span>
                               <span className="text-[8px] font-medium text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <span className="text-[10px] font-bold text-muted-foreground/80 truncate">{log.target}</span>
                            <div className="flex items-center gap-2 mt-1">
                               <span className="text-[8px] font-black text-primary/50 uppercase tracking-widest px-1 bg-primary/5 rounded-[2px]">
                                  {log.actor === "Platform Admin" ? "P-ADMIN" : log.actor.substring(0, 8)}
                               </span>
                            </div>
                         </div>
                      </div>
                   ))
                )}
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={cn("w-6 h-6", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}
