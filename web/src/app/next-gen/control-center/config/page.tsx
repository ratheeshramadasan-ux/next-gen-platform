"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Settings, 
  Mail, 
  Save, 
  Loader2, 
  Zap, 
  Server, 
  Lock, 
  Activity,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getSystemConfig, updateSystemSmtp } from "@/app/actions/systemActions";
import { toast } from "sonner";

export default function SystemConfigPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [smtpConfig, setSmtpConfig] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("SMTP");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    const smtp = await getSystemConfig();
    if (smtp) {
      setSmtpConfig(smtp);
    } else {
      setSmtpConfig({
        host: "",
        port: 587,
        username: "",
        password: "",
        secure: false,
        fromEmail: "",
        fromName: "Platform Support",
        isDefault: true,
        customerId: null
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await updateSystemSmtp(smtpConfig);
      if (result.success) {
        toast.success("System configuration updated");
        setSmtpConfig(result.config);
      } else {
        throw new Error(result.error);
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Synchronizing System Plane...</span>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 animate-in slide-in-from-left duration-500 flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">
           <Shield size={12} />
           <span>Platform / System Configuration</span>
        </div>
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
              <h1 className="text-2xl font-black text-foreground tracking-tight">Global System Settings</h1>
              <p className="text-xs text-muted-foreground mt-1 max-w-lg">Manage platform-wide defaults, global communication relays, and core infrastructure parameters.</p>
           </div>
           <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-6 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all rounded-sm disabled:opacity-50"
           >
             {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
             <span>{saving ? "Deploying Changes..." : "Apply Global Config"}</span>
           </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden pt-2">
        {/* Left Nav */}
        <div className="w-64 flex flex-col gap-1 border-r border-border pr-6">
           <TabButton 
             icon={Mail} 
             label="SMTP Relay" 
             active={activeTab === "SMTP"} 
             onClick={() => setActiveTab("SMTP")} 
           />
           <TabButton 
             icon={Lock} 
             label="Security Defaults" 
             active={activeTab === "Security"} 
             onClick={() => setActiveTab("Security")} 
           />
           <TabButton 
             icon={Server} 
             label="Infrastructure" 
             active={activeTab === "Infra"} 
             onClick={() => setActiveTab("Infra")} 
           />
           
           <div className="mt-auto p-4 bg-primary/5 border border-primary/20 rounded-sm space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-[8px] font-black text-primary uppercase tracking-tighter">
                 <Activity size={10} className="animate-pulse" />
                 <span>State: High Availability</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">These settings form the 'Golden Baseline'. All new customers inherit these parameters until overridden.</p>
           </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-4">
           {activeTab === "SMTP" && (
             <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <section className="space-y-6">
                   <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-black text-foreground uppercase tracking-[0.05em]">Platform SMTP Relay</h3>
                      <p className="text-xs text-muted-foreground">The default communication channel for all system-generated alerts (Tenant Creation, User Reset, Security Warnings).</p>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Relay Host</label>
                         <input 
                           type="text"
                           value={smtpConfig?.host || ""}
                           onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                           placeholder="smtp.platform.com"
                           className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                         />
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Relay Port</label>
                         <input 
                           type="number"
                           value={smtpConfig?.port || 587}
                           onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })}
                           className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                         />
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Username</label>
                         <input 
                           type="text"
                           value={smtpConfig?.username || ""}
                           onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                           className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                         />
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System Password</label>
                         <input 
                           type="password"
                           value={smtpConfig?.password || ""}
                           onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                           className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                         />
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System From Email</label>
                         <input 
                           type="email"
                           value={smtpConfig?.fromEmail || ""}
                           onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                           placeholder="no-reply@platform.com"
                           className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                         />
                      </div>
                      <div className="space-y-1.5 col-span-2 md:col-span-1">
                         <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">System From Name</label>
                         <input 
                           type="text"
                           value={smtpConfig?.fromName || ""}
                           onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                           placeholder="Platform Sovereign"
                           className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                         />
                      </div>
                   </div>
                </section>

                <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-sm flex items-start gap-4">
                   <AlertCircle size={20} className="text-indigo-600 mt-1" />
                   <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase text-indigo-700 tracking-widest">Fallback Protocol</span>
                      <p className="text-[11px] text-indigo-600 leading-relaxed font-medium">This SMTP configuration will be used for ALL customers who have not configured their own SMTP relay in Organization Settings.</p>
                   </div>
                </div>
             </div>
           )}

           {activeTab === "Security" && (
             <div className="flex flex-col h-full items-center justify-center opacity-30">
                <Lock size={48} className="mb-4" />
                <span className="text-xs font-black uppercase tracking-widest">Global Security Policies</span>
             </div>
           )}
           
           {activeTab === "Infra" && (
             <div className="flex flex-col h-full items-center justify-center opacity-30">
                <Server size={48} className="mb-4" />
                <span className="text-xs font-black uppercase tracking-widest">Cluster Distribution defaults</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon: Icon, label, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-sm transition-all focus:outline-none group",
        active ? "bg-primary text-white shadow-lg shadow-primary/20 translate-x-2" : "hover:bg-primary/10 text-muted-foreground hover:text-primary"
      )}
    >
       <Icon size={18} className={cn("transition-colors", active ? "text-white" : "group-hover:text-primary")} />
       <span className="text-xs font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}
