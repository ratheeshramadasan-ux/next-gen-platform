"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Building2, 
  Globe, 
  Shield, 
  GitBranch, 
  Save, 
  Cloud, 
  Lock, 
  Zap,
  Info,
  ChevronRight,
  UploadCloud,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { getOrgSettings, updateOrgSettings } from "@/app/actions/settingsActions";
import { updateCustomerAction } from "@/app/actions/tenantActions";
import { toast } from "sonner";

export default function GeneralSettingsPage() {
  const { activeCustomer } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgData, setOrgData] = useState<any>(null);
  const [techSettings, setTechSettings] = useState<any>(null);

  useEffect(() => {
    async function init() {
      if (!activeCustomer?.id) return;
      
      const settings = await getOrgSettings(activeCustomer.id);
      setOrgData({
        companyName: activeCustomer.companyName,
        industry: activeCustomer.industry,
        classification: activeCustomer.classification || "Enterprise",
        customerTier: activeCustomer.customerTier || "Platinum",
        location: activeCustomer.location
      });
      setTechSettings(settings);
      setLoading(false);
    }
    init();
  }, [activeCustomer]);

  const handleSave = async () => {
    if (!activeCustomer?.id) return;
    setSaving(true);
    
    try {
      const [res1, res2] = await Promise.all([
        updateCustomerAction({
          customerId: activeCustomer.id,
          ...orgData,
          tenantAdmins: activeCustomer.tenantAdmins || [] // Preserve admins
        }),
        updateOrgSettings(activeCustomer.id, techSettings)
      ]);

      if (res1.success && res2.success) {
        toast.success("Organization settings synchronized successfully");
      } else {
        toast.error("One or more settings failed to persist.");
      }
    } catch (e) {
      toast.error("An unexpected error occurred during synchronization.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 animate-in slide-in-from-right duration-500 relative flex flex-col h-full overflow-hidden">
      
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 text-size-regular">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
             <Settings size={12} />
             <span>Organization / General Settings</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Organization Master Profile</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-6 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all rounded-sm shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Commit Changes</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
        {/* Left Column: Core Identity */}
        <div className="col-span-12 lg:col-span-7 space-y-8 overflow-y-auto pr-4 custom-scrollbar">
          
          {/* Identity Section */}
          <Section title="Organization Identity" icon={Building2}>
             <div className="grid grid-cols-2 gap-6">
                <InputGroup 
                  label="Legal Entity Name" 
                  value={orgData?.companyName} 
                  onChange={(v) => setOrgData({...orgData, companyName: v})}
                />
                <InputGroup 
                  label="Organization Industry" 
                  value={orgData?.industry} 
                  onChange={(v) => setOrgData({...orgData, industry: v})}
                />
                <InputGroup 
                  label="Classification" 
                  value={orgData?.classification} 
                  onChange={(v) => setOrgData({...orgData, classification: v})}
                />
                <InputGroup 
                  label="Service Level Tier" 
                  value={orgData?.customerTier} 
                  onChange={(v) => setOrgData({...orgData, customerTier: v})}
                />
             </div>
          </Section>

          {/* Localization & Master Metadata */}
          <Section title="Governance Metadata" icon={Globe}>
             <div className="grid grid-cols-2 gap-6">
                <InputGroup 
                  label="Registered Region" 
                  value={orgData?.location} 
                  onChange={(v) => setOrgData({...orgData, location: v})}
                />
                <InputGroup 
                  label="Master ID (Sovereign Handle)" 
                  value={activeCustomer?.id?.split('-')[0]?.toUpperCase()} 
                  disabled
                />
             </div>
          </Section>

          {/* Branding Hub */}
          <Section title="Branding Hub" icon={UploadCloud}>
             <div className="p-8 border-2 border-dashed border-border rounded-sm bg-muted/20 flex flex-col items-center justify-center gap-4 group hover:border-primary/40 transition-all">
                <div className="w-20 h-20 bg-white border border-border rounded-sm flex items-center justify-center shadow-sm overflow-hidden">
                   {activeCustomer?.logoUrl ? (
                      <img src={activeCustomer.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                   ) : (
                      <Building2 size={32} className="text-muted-foreground opacity-40" />
                   )}
                </div>
                <div className="text-center space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline cursor-pointer">Upload New Manifest Logo</p>
                   <p className="text-[9px] font-medium text-muted-foreground uppercase">SVG, PNG or WEBP (Max 2MB)</p>
                </div>
             </div>
          </Section>
        </div>

        {/* Right Column: Technical & Policy */}
        <div className="col-span-12 lg:col-span-5 space-y-8 overflow-y-auto pr-4 custom-scrollbar">
           
           {/* CI/CD Lifecycle */}
           <Section title="CI/CD Lifecycle Engine" icon={GitBranch} highlight>
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-4 bg-white border border-border rounded-sm">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-50 text-indigo-600 rounded-sm">
                          <Cloud size={18} />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold">Deployment Architecture</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">Internal Managed Cluster</span>
                       </div>
                    </div>
                    <select 
                      className="text-xs font-black uppercase bg-muted border-none rounded-sm px-3 py-1 focus:ring-0"
                      value={techSettings?.cicdMode}
                      onChange={(e) => setTechSettings({...techSettings, cicdMode: e.target.value})}
                    >
                       <option value="INTERNAL">Internal</option>
                       <option value="HYBRID">Hybrid</option>
                       <option value="EXTERNAL">External</option>
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Branch Propagation Mapping</label>
                    <div className="space-y-2">
                       <BranchMap label="Production" branch={techSettings?.branchMapping?.prod} onChange={(v) => {
                          const newMap = {...techSettings.branchMapping, prod: v};
                          setTechSettings({...techSettings, branchMapping: newMap});
                       }} />
                       <BranchMap label="UAT / Staging" branch={techSettings?.branchMapping?.uat} onChange={(v) => {
                          const newMap = {...techSettings.branchMapping, uat: v};
                          setTechSettings({...techSettings, branchMapping: newMap});
                       }} />
                       <BranchMap label="Development" branch={techSettings?.branchMapping?.dev} onChange={(v) => {
                          const newMap = {...techSettings.branchMapping, dev: v};
                          setTechSettings({...techSettings, branchMapping: newMap});
                       }} />
                    </div>
                 </div>
              </div>
           </Section>

           {/* Security Enforcement */}
           <Section title="Security Compliance" icon={Lock}>
              <div className="space-y-4">
                 <ToggleGroup label="MFA Enforcement" active={activeCustomer?.mfaEnforced} />
                 <ToggleGroup label="Audit Chronicle Record" active={true} />
                 <ToggleGroup label="Zero Trust Tunneling" active={false} />
                 <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-sm flex gap-3">
                    <Shield size={18} className="text-amber-600 shrink-0" />
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase text-amber-900 leading-none">Governance Summary</p>
                       <p className="text-[9px] font-medium text-amber-700 uppercase leading-relaxed">This organization is currently operating under Standard Governance Tier with 30-day log retention.</p>
                    </div>
                 </div>
              </div>
           </Section>

           {/* Help / Docs */}
           <div className="p-6 bg-primary/5 border border-primary/20 rounded-sm space-y-3">
              <div className="flex items-center gap-2 text-primary">
                 <Info size={16} />
                 <span className="text-xs font-black uppercase tracking-widest">Configuration Notice</span>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed uppercase">
                 Changes made to the CI/CD lifecycle or branch mapping will propagate to all registered workspaces upon the next deployment trigger.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, highlight }: any) {
  return (
    <div className={cn(
      "space-y-4 p-6 rounded-sm border transition-all",
      highlight ? "bg-card shadow-lg border-primary/20" : "bg-card/40 border-border"
    )}>
       <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          <Icon size={14} className={cn(highlight && "text-primary")} />
          <span>{title}</span>
       </div>
       <div className="space-y-4">
          {children}
       </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, disabled }: any) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{label}</label>
      <input 
        value={value || ""} 
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full bg-white border border-border p-2.5 text-xs font-bold focus:outline-none focus:ring-1 ring-primary/20 rounded-sm transition-all shadow-inner",
          disabled && "bg-muted opacity-60 cursor-not-allowed border-transparent shadow-none"
        )} 
      />
    </div>
  );
}

function BranchMap({ label, branch, onChange }: any) {
  return (
    <div className="grid grid-cols-2 bg-muted/40 border border-border/60 rounded-sm overflow-hidden">
       <div className="p-2.5 bg-muted/60 border-r border-border/60 flex items-center gap-2">
          <GitBranch size={12} className="text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase">{label}</span>
       </div>
       <input 
         value={branch || ""} 
         onChange={(e) => onChange(e.target.value)}
         placeholder="Enter target branch..."
         className="w-full bg-transparent p-2.5 text-[10px] font-mono focus:outline-none" 
       />
    </div>
  );
}

function ToggleGroup({ label, active }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-border rounded-sm group hover:border-primary/40 transition-all">
       <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
          <span className="text-[8px] font-medium text-muted-foreground uppercase mt-1">Platform Hardened Control</span>
       </div>
       <div className={cn(
         "w-8 h-4 rounded-full transition-all duration-300 p-0.5 cursor-pointer relative",
         active ? "bg-emerald-500" : "bg-muted"
       )}>
          <div className={cn(
            "w-3 h-3 bg-white rounded-full transition-all duration-300",
            active ? "translate-x-4 shadow-md" : "translate-x-0"
          )} />
       </div>
    </div>
  );
}
