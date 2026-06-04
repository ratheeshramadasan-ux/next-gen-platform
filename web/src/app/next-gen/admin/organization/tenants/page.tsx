"use client";

import React, { useState } from "react";
import { 
  Globe, 
  Plus, 
  Copy, 
  Download, 
  Eye, 
  Edit3, 
  CheckCircle2, 
  X,
  ShieldCheck,
  Zap,
  ArrowRight,
  Filter,
  MoreVertical,
  Layers,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { triggerDeployment } from "@/app/actions/deploymentActions";
import { updateTenantActivationAction, cloneTenantAction, importTenantStructureAction, createTenantAction } from "@/app/actions/tenantActions";
import { useAppContext } from "@/lib/context";
import { toast } from "sonner";

export default function TenantManagementPage() {
  const { activeCustomer, currentUser, availableTenants, refreshActiveTenants } = useAppContext();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [deploying, setDeploying] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Map database fields to UI requirements
  const tenants = availableTenants.map(t => ({
    id: t.id,
    name: t.name,
    rawType: t.type,
    type: t.type === 'PROD' ? 'Mandatory' : t.type === 'STAGING' ? 'Optional' : 'Default',
    status: t.status === 'ACTIVE' ? 'Active' : 'Disabled',
    rawStatus: t.status,
    risk: t.type === 'PROD' ? 'High' : t.type === 'STAGING' ? 'Medium' : 'Low',
    version: 'main', // Defaulting to main as per current schema
    locked: t.isProtected
  }));

  const handleToggleActivation = async (tenantId: string, currentStatus: string, type: string) => {
    if (type === "PROD") {
      toast.error("Production environments are locked and cannot be disabled.");
      return;
    }

    setToggling(tenantId);
    const newStatus = currentStatus === "ACTIVE" ? "DISABLED" : "ACTIVE";
    const result = await updateTenantActivationAction(tenantId, newStatus, currentUser?.role || "System");

    if (result.success) {
      toast.success(`Environment ${newStatus === 'ACTIVE' ? 'activated' : 'disabled'} successfully.`);
      await refreshActiveTenants();
    } else {
      toast.error(result.error || "Failed to update status.");
    }
    setToggling(null);
  };

  const handleDeploy = async (tenantId: string) => {
    if (!activeCustomer?.id || !currentUser?.id) return;
    setDeploying(tenantId);
    const result = await triggerDeployment({
      tenantId,
      customerId: activeCustomer.id,
      version: "HEAD",
      initiatedBy: currentUser.id
    });

    if (result.success) {
      toast.success("Deployment initiated successfully");
    } else {
      toast.error(result.error || "Deployment failed");
    }
    setDeploying(null);
  };

  // Governance Gate: Block tenant/folder access for non-approved customers
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
              Tenant and environment management is unavailable for <strong className="text-foreground">{activeCustomer.companyName}</strong> because 
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
    <div className="min-h-full space-y-8 animate-in slide-in-from-right duration-500 relative flex flex-col h-full overflow-hidden">
      
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 text-size-regular">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
             <Globe size={12} />
             <span>Workspace / Manage Tenants</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Tenants</h1>
        </div>
        
        <div className="flex items-center gap-2">
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Main List */}
        <div className={cn(
          "flex-1 flex flex-col gap-6 overflow-hidden transition-all duration-300",
          selectedTenant ? "w-2/3" : "w-full"
        )}>
          {/* Action Bar */}
          <div className="flex items-center justify-between bg-card/40 p-2 border border-border rounded-sm">
            <div className="flex items-center gap-2">
               <button onClick={() => setShowCreateModal(true)} className="px-3 py-1 bg-white border border-border text-[10px] font-bold uppercase rounded-sm hover:shadow-sm transition-all focus:ring-1 ring-primary/20">+ Create Tenant</button>
               <button onClick={() => setShowCloneModal(true)} className="px-3 py-1 bg-transparent border border-transparent text-[10px] font-bold uppercase text-muted-foreground hover:text-primary transition-all flex items-center gap-1">
                 <Copy size={10} /> Clone From
               </button>
               <button onClick={() => setShowImportModal(true)} className="px-3 py-1 bg-transparent border border-transparent text-[10px] font-bold uppercase text-muted-foreground hover:text-primary transition-all flex items-center gap-1">
                 <Layers size={10} /> Import Structure
               </button>
            </div>
          </div>

          {/* Table */}
          <div className="bg-card border border-border rounded-sm overflow-hidden shadow-sm flex-1 flex flex-col">
            {tenants.length > 0 ? (
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-muted text-[10px] font-black text-muted-foreground tracking-widest uppercase border-b border-border">
                    <th className="px-6 py-4">Tenant Name</th>
                    <th className="px-4 py-4">Access Status</th>
                    <th className="px-4 py-4">Context Version</th>
                    <th className="px-4 py-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {tenants.map((t) => (
                    <tr 
                      key={t.id} 
                      className={cn(
                        "hover:bg-primary/5 transition-colors group cursor-pointer",
                        selectedTenant?.id === t.id && "bg-primary/10 border-l-2 border-primary"
                      )}
                      onClick={() => setSelectedTenant(t)}
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-sm group-hover:bg-card transition-colors">
                            <Globe size={18} className="text-muted-foreground group-hover:text-primary transition-colors" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                              {t.name}
                              {t.locked && <ShieldCheck size={12} className="text-amber-600" />}
                            </span>
                            <span className="text-[10px] font-medium text-muted-foreground uppercase">{t.rawType} Tenant</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-4">
                          <ConfigToggle 
                            active={t.rawStatus === "ACTIVE"} 
                            disabled={t.rawType === "PROD" || toggling === t.id}
                            onChange={() => handleToggleActivation(t.id, t.rawStatus, t.rawType)}
                          />
                          <div className="flex flex-col">
                             <div className="flex items-center gap-2">
                                <span className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  t.status === "Active" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-muted-foreground/30"
                                )} />
                                <span className={cn("text-[10px] font-black uppercase tracking-widest", t.status === "Active" ? "text-foreground" : "text-muted-foreground")}>{t.status}</span>
                             </div>
                             {t.rawType === "PROD" && <span className="text-[8px] font-bold text-amber-600 uppercase tracking-tighter">Mission Critical Lock</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-5 font-mono text-[10px] text-muted-foreground">{t.version}</td>
                      <td className="px-4 py-5">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeploy(t.id); }}
                            disabled={deploying === t.id}
                            className="px-2 py-1 text-[10px] font-bold uppercase text-primary hover:bg-primary/10 rounded-sm flex items-center gap-1"
                          >
                            {deploying === t.id ? <Loader2 size={10} className="animate-spin" /> : <Zap size={10} />}
                            Deploy
                          </button>
                          <button className="p-1.5 hover:bg-muted rounded-sm transition-all"><MoreVertical size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-12 text-center gap-4 opacity-50">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                   <Globe size={32} className="text-muted-foreground" />
                </div>
                <div className="space-y-1">
                   <h3 className="text-sm font-black uppercase tracking-widest">No Environments Detected</h3>
                   <p className="text-[10px] font-bold text-muted-foreground max-w-xs">This organization does not currently have any provisioned environments. Use the button above to initialize your first tenant.</p>
                </div>
              </div>
            )}
          </div>

          {/* Promotion Flow Component */}
          <div className="bg-card/40 border border-border p-4 rounded-sm space-y-4">
             <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Zap size={12} className="text-amber-500" />
                <span>Promotion Lifecycle (Visual Flow)</span>
             </div>
             <div className="flex items-center justify-between px-6 pt-2">
                <FlowStep name="Development" status="CURRENT" />
                <FlowArrow />
                <FlowStep name="UAT" status="PENDING" />
                <FlowArrow />
                <FlowStep name="Staging" status="IDLE" />
                <FlowArrow />
                <FlowStep name="Production" status="LOCKED" isLast />
             </div>
          </div>
        </div>

        {/* Right Detail Panel */}
        <div className={cn(
          "bg-card border-l border-border transition-all duration-300 overflow-y-auto flex flex-col shadow-2xl",
          selectedTenant ? "w-1/3 opacity-100 translate-x-0" : "w-0 opacity-0 translate-x-12"
        )}>
          {selectedTenant && (
            <div className="p-6 space-y-6 flex-1 flex flex-col min-w-[320px]">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex flex-col">
                   <h2 className="text-lg font-black text-foreground tracking-tight">{selectedTenant.name}</h2>
                   <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tenant Context</span>
                </div>
                <button onClick={() => setSelectedTenant(null)} className="p-1 hover:bg-muted rounded-full transition-all">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-6 flex-1">
                {/* Basic Info form */}
                <div className="space-y-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tenant Name</label>
                      <input defaultValue={selectedTenant.name} className="w-full bg-muted/30 border border-border p-2 text-sm font-medium focus:outline-none focus:ring-1 ring-primary/30" />
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Identifier Code</label>
                      <input defaultValue={selectedTenant.name.toUpperCase()} className="w-full bg-muted/30 border border-border p-2 text-xs font-mono uppercase focus:outline-none focus:ring-1 ring-primary/30" />
                   </div>
                </div>

                {/* Configuration Options */}
                <div className="pt-4 border-t border-border space-y-4">
                  <ConfigToggle label="Governance Lock" active={selectedTenant.locked} />
                  <ConfigToggle label="Auto-Scaling" active={true} />
                  <ConfigToggle label="Diagnostic Logging" active={false} />
                  <ConfigToggle label="Allow Direct API Access" active={selectedTenant.type === 'Development'} />
                </div>
              </div>

              <div className="pt-6 border-t border-border space-y-3">
                <button className="w-full bg-primary text-white py-2.5 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all rounded-sm shadow-lg shadow-primary/20">
                  Update Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && (
        <CreateTenantModal 
          onClose={() => setShowCreateModal(false)}
          onSuccess={refreshActiveTenants}
        />
      )}
      {showCloneModal && (
        <CloneTenantModal 
          onClose={() => setShowCloneModal(false)} 
          availableTenants={availableTenants}
          onSuccess={refreshActiveTenants}
        />
      )}
      {showImportModal && (
        <ImportStructureModal 
          onClose={() => setShowImportModal(false)}
          availableTenants={availableTenants}
          onSuccess={refreshActiveTenants}
        />
      )}
    </div>
  );
}

function FlowStep({ name, status, isLast }: any) {
  const isLocked = status === "LOCKED";
  const isCurrent = status === "CURRENT";
  return (
    <div className="flex flex-col items-center gap-2 flex-1">
       <div className={cn(
         "w-10 h-10 rounded-sm border-2 flex items-center justify-center transition-all duration-500",
         isLocked ? "bg-amber-50 border-amber-200 text-amber-600 shadow-[0_0_15px_rgba(245,158,11,0.1)]" :
         isCurrent ? "bg-primary/10 border-primary text-primary shadow-[0_0_15px_rgba(113,67,41,0.2)] scale-110" :
         "bg-muted border-border text-muted-foreground"
       )}>
          {isLocked ? <ShieldCheck size={20} /> : isCurrent ? <Zap size={20} className="animate-pulse" /> : <Layers size={20} />}
       </div>
       <span className={cn(
         "text-[9px] font-black uppercase tracking-widest",
         isLocked ? "text-amber-700" : isCurrent ? "text-primary font-black" : "text-muted-foreground"
       )}>{name}</span>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="flex-1 flex items-center justify-center pb-6">
       <ArrowRight size={14} className="text-border" />
    </div>
  );
}

function ConfigToggle({ label, active, disabled, onChange }: any) {
  return (
    <div className={cn("flex items-center justify-between group", disabled && "opacity-50 cursor-not-allowed")}>
       {label && <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{label}</span>}
       <div 
         onClick={() => !disabled && onChange && onChange()}
         className={cn(
           "w-8 h-4 rounded-full transition-all duration-300 p-0.5 relative",
           active ? "bg-emerald-500" : "bg-muted",
           !disabled ? "cursor-pointer" : "cursor-not-allowed"
         )}
       >
          <div className={cn(
            "w-3 h-3 bg-white rounded-full transition-all duration-300 shadow-sm",
            active ? "translate-x-4" : "translate-x-0"
          )} />
       </div>
    </div>
  );
}

function CloneTenantModal({ onClose, availableTenants, onSuccess }: any) {
  const [sourceId, setSourceId] = useState(availableTenants[0]?.id || "");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleClone = async () => {
    if (!sourceId || !name || !code) return toast.error("Please fill all fields");
    setIsProcessing(true);
    const result = await cloneTenantAction(sourceId, { name, code });
    if (result.success) {
      toast.success("Environment Cloned Successfully");
      onSuccess && await onSuccess();
      onClose();
    } else {
      toast.error(result.error);
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md p-6 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Copy size={20} />
            <h2 className="text-lg font-black tracking-tight text-foreground">Clone Tenant</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Source Environment</label>
            <select 
              className="w-full bg-muted/30 border border-border p-2 text-sm font-medium focus:outline-none focus:ring-1 ring-primary/30 rounded-sm"
              value={sourceId}
              onChange={(e) => {
                setSourceId(e.target.value);
                const newSourceName = availableTenants.find((t: any) => t.id === e.target.value)?.name || "";
                if (name.toLowerCase() === newSourceName.toLowerCase()) {
                  setName(""); // Reset if it matches the new source
                }
              }}
            >
              {availableTenants.map((t: any) => <option key={t.id} value={t.id}>{t.name} ({t.type})</option>)}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">New Environment Name</label>
            <select 
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted/30 border border-border p-2 text-sm font-medium focus:outline-none focus:ring-1 ring-primary/30 rounded-sm" 
            >
              <option value="" disabled>Select Target Environment Name</option>
              {Array.from(new Set(availableTenants.map((t: any) => t.name)))
                .filter((n: any) => n.toLowerCase() !== (availableTenants.find((t: any) => t.id === sourceId)?.name || "").toLowerCase())
                .map((n: any) => <option key={n} value={n}>{n}</option>)
              }
            </select>
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Identifier Code</label>
            <input 
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. UAT-C"
              className="w-full bg-muted/30 border border-border p-2 text-sm font-medium uppercase focus:outline-none focus:ring-1 ring-primary/30 rounded-sm" 
            />
          </div>

          <div className="space-y-2 pt-2 border-t border-border">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Inclusions</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-primary" /> Include Folder Hierarchy
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" defaultChecked className="accent-primary" /> Include IAM Configurations
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input type="checkbox" className="accent-primary" /> Include Runtime Allocations
              </label>
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-amber-600">
                <input type="checkbox" defaultChecked className="accent-primary" /> Reset Secrets & Credentials
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all">Cancel</button>
          <button 
            onClick={handleClone} disabled={isProcessing}
            className="bg-primary text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all rounded-sm shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />}
            Execute Clone
          </button>
        </div>
      </div>
    </div>
  );
}

function ImportStructureModal({ onClose, availableTenants, onSuccess }: any) {
  const [targetId, setTargetId] = useState(availableTenants[0]?.id || "");
  const [jsonPayload, setJsonPayload] = useState("{\n  \"folders\": [\n    {\n      \"name\": \"App-1\",\n      \"subfolders\": []\n    }\n  ]\n}");
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentUser } = useAppContext();

  const handleImport = async () => {
    if (!targetId || !jsonPayload) return toast.error("Please provide a target and payload");
    try {
      JSON.parse(jsonPayload);
    } catch(e) {
      return toast.error("Invalid JSON format");
    }

    setIsProcessing(true);
    const result = await importTenantStructureAction(targetId, JSON.parse(jsonPayload), currentUser?.id || "System");
    if (result.success) {
      toast.success("Structure Imported Successfully");
      onSuccess && await onSuccess();
      onClose();
    } else {
      toast.error(result.error);
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-2xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Layers size={20} />
            <h2 className="text-lg font-black tracking-tight text-foreground">Import Structure</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Target Environment</label>
            <select 
              className="w-full bg-muted/30 border border-border p-2 text-sm font-medium focus:outline-none focus:ring-1 ring-primary/30 rounded-sm"
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
            >
              {availableTenants.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Blueprint Definition (JSON)</label>
              <span className="text-[9px] text-primary">Idempotent Import</span>
            </div>
            <textarea 
              value={jsonPayload}
              onChange={(e) => setJsonPayload(e.target.value)}
              className="w-full h-48 bg-black/50 text-emerald-400 font-mono text-xs p-3 rounded-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-[10px] text-muted-foreground">
            Does not import IAM, Variables, or Runtime configurations.
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all">Cancel</button>
            <button 
              onClick={handleImport} disabled={isProcessing}
              className="bg-primary text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all rounded-sm shadow-md flex items-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Layers size={14} />}
              Import Blueprint
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateTenantModal({ onClose, onSuccess }: any) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [type, setType] = useState("DEV");
  const [isProcessing, setIsProcessing] = useState(false);
  const { currentUser, activeCustomer } = useAppContext();

  const handleCreate = async () => {
    if (!name || !code) return toast.error("Please fill all fields");
    if (!activeCustomer?.id) return toast.error("Active customer context required");
    
    setIsProcessing(true);
    const result = await createTenantAction({
      name,
      code,
      type,
      customerId: activeCustomer.id,
      description: `Provisioned by ${currentUser?.name || "Admin"}`
    }, currentUser?.id || "System");

    if (result.success) {
      toast.success("Environment Created Successfully");
      onSuccess && await onSuccess();
      onClose();
    } else {
      toast.error(result.error);
    }
    setIsProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md p-6 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <Plus size={20} />
            <h2 className="text-lg font-black tracking-tight text-foreground">Create Tenant</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Environment Name</label>
            <input 
              value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Finance App UAT"
              className="w-full bg-muted/30 border border-border p-2 text-sm font-medium focus:outline-none focus:ring-1 ring-primary/30 rounded-sm" 
            />
          </div>
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Identifier Code</label>
            <input 
              value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. FIN-UAT-01"
              className="w-full bg-muted/30 border border-border p-2 text-sm font-medium uppercase focus:outline-none focus:ring-1 ring-primary/30 rounded-sm" 
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Tenant Type</label>
            <select 
              className="w-full bg-muted/30 border border-border p-2 text-sm font-medium focus:outline-none focus:ring-1 ring-primary/30 rounded-sm"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="DEV">Development (DEV)</option>
              <option value="STAGING">Staging (STG)</option>
              <option value="UAT">User Acceptance (UAT)</option>
              <option value="PROD">Production (PROD)</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <button onClick={onClose} className="px-4 py-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-all">Cancel</button>
          <button 
            onClick={handleCreate} disabled={isProcessing}
            className="bg-primary text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:opacity-90 transition-all rounded-sm shadow-md flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
