"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Globe, 
  ShieldAlert, 
  GitBranch, 
  Link2, 
  Database, 
  Zap, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  Save,
  Lock,
  Boxes,
  Loader2,
  ShieldCheck,
  Server,
  Key,
  Smartphone,
  Calendar,
  History,
  Trash2,
  Edit3,
  Plus,
  Mail,
  RefreshCcw,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { getOrgSettings, updateOrgSettings } from "@/app/actions/settingsActions";
import { getSmtpConfig, saveSmtpConfig, testSmtpConnection, restorePlatformSmtpDefault } from "@/app/actions/smtpActions";
import { toast } from "sonner";

export default function OrganizationSettingsPage() {
  const { activeCustomer } = useAppContext();
  const [activeTab, setActiveTab] = useState("CI/CD");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [smtpConfig, setSmtpConfig] = useState<any>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [targetEmail, setTargetEmail] = useState("");
  const [showBranchModal, setShowBranchModal] = useState(false);
  const [newBranch, setNewBranch] = useState({ env: "dev", branch: "" });

  useEffect(() => {
    if (activeCustomer?.id) {
      loadSettings();
    }
  }, [activeCustomer?.id]);

  const loadSettings = async () => {
    setLoading(true);
    const [data, smtp] = await Promise.all([
      getOrgSettings(activeCustomer!.id),
      getSmtpConfig(activeCustomer!.id)
    ]);

    if (data) {
      // Parse branch mapping if it's a string
      let parsedMapping = { dev: "develop", uat: "uat", prod: "main" };
      if (data.branchMapping) {
        try { parsedMapping = JSON.parse(data.branchMapping); } catch (e) {}
      }
      setSettings({ ...data, parsedMapping });
    }

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
        fromName: "",
        customerId: activeCustomer!.id
      });
    }

    setLoading(false);
  };

  const handleUpdate = async () => {
    if (!activeCustomer?.id) return;
    setSaving(true);
    
    try {
      if (activeTab === "Communication") {
        const result = await saveSmtpConfig({
          ...smtpConfig,
          customerId: activeCustomer.id
        }, "Admin User");
        if (result.success) {
          toast.success("SMTP Configuration saved");
          setSmtpConfig(result.config);
        } else {
          throw new Error(result.error);
        }
      } else {
        if (!settings) return;
        // Stringify branch mapping back
        const payload = { 
          ...settings, 
          branchMapping: JSON.stringify(settings.parsedMapping) 
        };

        const result = await updateOrgSettings(activeCustomer.id, payload);
        
        if (result.success) {
          toast.success("Configuration saved successfully");
        } else {
          throw new Error(result.error);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!smtpConfig?.host) return toast.error("Host is required for testing.");
    setIsTesting(true);
    try {
      const result = await testSmtpConnection(smtpConfig, "Admin@nextgen.com");
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
      }
    } catch (e) {
      toast.error("Network error during validation.");
    } finally {
      setIsTesting(false);
    }
  };

  const handleRestoreDefaults = async () => {
    if (!activeCustomer?.id) return;
    if (!confirm("Are you sure you want to revert to platform default SMTP? This will delete your organization override.")) return;
    
    const res = await restorePlatformSmtpDefault(activeCustomer.id, "Admin User");
    if (res.success) {
      toast.success("Reverted to platform defaults");
      loadSettings();
    } else {
      toast.error("Failed to restore defaults");
    }
  };

  const updateBranch = (env: string, branch: string) => {
    setSettings({
      ...settings,
      parsedMapping: { ...settings.parsedMapping, [env]: branch }
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary opacity-20" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/40">Loading Context...</span>
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-6 animate-in slide-in-from-left duration-500 flex flex-col h-full overflow-hidden">
      
      {/* Header */}
      <div className="flex flex-col gap-1 border-b border-border pb-6">
        <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">
           <Settings size={12} />
           <span>Organization / Settings</span>
        </div>
        <div className="flex items-center justify-between">
           <div className="flex flex-col">
              <h1 className="text-2xl font-black text-foreground tracking-tight">Organization Configuration</h1>
              <p className="text-xs text-muted-foreground mt-1 max-w-lg">Manage your external source control, integration webhooks, and core security policies.</p>
           </div>
           <button 
            onClick={handleUpdate}
            disabled={saving}
            className="bg-primary text-white px-6 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 hover:opacity-90 transition-all rounded-sm disabled:opacity-50"
           >
             {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
             <span>{saving ? "Saving..." : "Save Configuration"}</span>
           </button>
        </div>
      </div>

      <div className="flex-1 flex gap-8 overflow-hidden pt-2">
        {/* Left: Navigation Tabs */}
        <div className="w-64 flex flex-col gap-1 border-r border-border pr-6">
           <TabButton 
             icon={GitBranch} 
             label="CI/CD" 
             active={activeTab === "CI/CD"} 
             onClick={() => setActiveTab("CI/CD")} 
           />
           <TabButton 
             icon={Boxes} 
             label="Integrations" 
             active={activeTab === "Integrations"} 
             onClick={() => setActiveTab("Integrations")} 
           />
           <TabButton 
             icon={ShieldCheck} 
             label="Security & Privacy" 
             active={activeTab === "Security"} 
             onClick={() => setActiveTab("Security")} 
           />
           <TabButton 
             icon={Globe} 
             label="General" 
             active={activeTab === "General"} 
             onClick={() => setActiveTab("General")} 
           />
           <TabButton 
             icon={Mail} 
             label="Communication" 
             active={activeTab === "Communication"} 
             onClick={() => setActiveTab("Communication")} 
           />
           
           <div className="mt-auto p-4 bg-muted/40 border border-border rounded-sm space-y-3 shadow-sm">
              <div className="flex items-center gap-2 text-[8px] font-black text-muted-foreground uppercase tracking-tighter">
                 <Clock size={10} />
                 <span>Session Scope: Platform-Wide</span>
              </div>
              <p className="text-[10px] text-muted-foreground leading-tight">All system-wide settings affect production tenants immediately unless governed by a lock.</p>
           </div>
        </div>

        {/* Right: Content Area */}
        <div className="flex-1 overflow-y-auto pr-4 scrollbar-thin">
           <div className="max-w-3xl space-y-12 pb-12">
              
              {/* CI/CD TAB */}
              {activeTab === "CI/CD" && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                   {/* Mode Selection */}
                   <section className="space-y-6">
                      <div className="flex flex-col gap-1">
                         <h3 className="text-sm font-black text-foreground uppercase tracking-[0.05em]">CI/CD Pipeline Mode</h3>
                         <p className="text-xs text-muted-foreground">Select how your automation code is deployed across environments.</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                         <SelectionCard 
                            active={settings?.cicdMode === "INTERNAL"} 
                            onClick={() => setSettings({ ...settings, cicdMode: "INTERNAL" })}
                            title="Internal Platform CI/CD"
                            description="Use the native built-in deployment engine with automatic resource optimization."
                            icon={Zap}
                         />
                         <SelectionCard 
                            active={settings?.cicdMode === "EXTERNAL"} 
                            onClick={() => setSettings({ ...settings, cicdMode: "EXTERNAL" })}
                            title="External Provider"
                            description="Connect your own source control system (GitHub, Azure DevOps, Bitbucket)."
                            icon={Link2}
                         />
                      </div>
                   </section>

                   <section className="space-y-6 border-t border-border pt-8 transition-all">
                      <div className="flex items-center justify-between">
                         <div className="flex flex-col gap-1">
                            <h3 className="text-sm font-black text-foreground uppercase tracking-[0.05em]">Environment Promotion Strategy</h3>
                            <p className="text-xs text-muted-foreground">Force high-risk environments to require administrative approval before deployment.</p>
                         </div>
                         <div className={cn(
                            "w-12 h-6 rounded-full p-1 cursor-pointer transition-all flex",
                            settings?.approvalRequired ? "bg-primary justify-end" : "bg-muted justify-start"
                         )} onClick={() => setSettings({ ...settings, approvalRequired: !settings.approvalRequired })}>
                            <div className="w-4 h-4 bg-white rounded-full shadow-md" />
                         </div>
                      </div>
                   </section>

                   {/* External Config (Conditional) */}
                   {settings?.cicdMode === "EXTERNAL" && (
                     <section className="space-y-8 animate-in fade-in zoom-in-95 duration-500 p-8 bg-card border border-border rounded-sm shadow-sm">
                        <div className="flex items-center justify-between border-b border-border pb-4">
                           <div className="flex items-center gap-3">
                              <div className="p-2 bg-primary/10 rounded-sm text-primary">
                                 <Boxes size={20} />
                              </div>
                              <h4 className="text-base font-black text-foreground tracking-tight">External Connection Config</h4>
                           </div>
                           <CheckCircle2 size={20} className="text-primary opacity-20" />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-1.5 flex flex-col">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Source Provider</label>
                              <select 
                                value={settings.provider || "GITHUB"}
                                onChange={(e) => setSettings({ ...settings, provider: e.target.value })}
                                className="bg-muted border border-border p-3 text-sm font-bold focus:ring-1 ring-primary/20 outline-none"
                              >
                                 <option value="GITHUB">GitHub</option>
                                 <option value="AZURE_DEVOPS">Azure DevOps</option>
                                 <option value="BITBUCKET">Bitbucket</option>
                                 <option value="GITLAB">GitLab</option>
                              </select>
                           </div>
                           <div className="space-y-1.5 flex flex-col">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Repository URL</label>
                              <input 
                                value={settings.repoUrl || ""}
                                onChange={(e) => setSettings({ ...settings, repoUrl: e.target.value })}
                                placeholder="https://github.com/org/repo" 
                                className="bg-muted border border-border p-3 text-sm font-medium focus:ring-1 ring-primary/20 outline-none" 
                              />
                           </div>
                        </div>

                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Branch Strategy Flow</label>
                              <button 
                                onClick={() => setShowBranchModal(!showBranchModal)}
                                className="text-[10px] font-bold text-primary cursor-pointer hover:underline uppercase flex items-center gap-1"
                              >
                                <Edit3 size={10} />
                                {showBranchModal ? "Close Editor" : "Edit Mapping"}
                              </button>
                           </div>
                           
                           {showBranchModal ? (
                             <div className="space-y-4 bg-muted/30 p-4 border border-border rounded-sm">
                                {Object.entries(settings.parsedMapping || {}).map(([env, branch]: [any, any]) => (
                                  <div key={env} className="flex items-center gap-4">
                                     <span className="w-12 text-[10px] font-black uppercase text-muted-foreground">{env}</span>
                                     <input 
                                       value={branch}
                                       onChange={(e) => updateBranch(env, e.target.value)}
                                       className="flex-1 bg-white border border-border h-8 px-3 text-xs font-bold outline-none"
                                     />
                                  </div>
                                ))}
                                <div className="flex items-center gap-2 pt-2 border-t border-border/10">
                                   <input placeholder="Env" className="w-16 bg-white border border-border h-8 px-2 text-[10px] font-bold" value={newBranch.env} onChange={e => setNewBranch({...newBranch, env: e.target.value})}/>
                                   <input placeholder="Branch" className="flex-1 bg-white border border-border h-8 px-3 text-xs font-bold" value={newBranch.branch} onChange={e => setNewBranch({...newBranch, branch: e.target.value})} />
                                   <button onClick={() => {updateBranch(newBranch.env, newBranch.branch); setNewBranch({env:"", branch:""})}} className="p-1 text-primary hover:bg-primary hover:text-white border border-primary transition-all"><Plus size={16}/></button>
                                </div>
                             </div>
                           ) : (
                             <div className="flex items-center gap-2 p-3 bg-muted border border-border rounded-sm font-mono text-[10px]">
                                <span className={cn(settings.parsedMapping?.prod === "main" ? "text-emerald-700" : "text-primary")}>{settings.parsedMapping?.prod || "main"}</span>
                                <ArrowRight size={12} className="text-muted-foreground opacity-30" />
                                <span className="font-black text-amber-700">uat</span>
                                <ArrowRight size={12} className="text-muted-foreground opacity-30" />
                                <span className="text-rose-700">{settings.parsedMapping?.dev || "develop"}</span>
                             </div>
                           )}
                        </div>

                        <div className="pt-4 flex gap-4">
                           <button className="bg-foreground text-background px-6 py-2 text-xs font-black uppercase tracking-widest hover:opacity-90 transition-all rounded-sm flex items-center gap-2 shadow-md">
                              Connect Account
                           </button>
                           <button className="border border-border px-6 py-2 text-xs font-bold uppercase tracking-widest hover:bg-muted transition-all">
                              Test Connection
                           </button>
                        </div>
                     </section>
                   )}
                </div>
              )}

              {/* INTEGRATIONS TAB */}
              {activeTab === "Integrations" && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                   <section className="space-y-6">
                      <div className="flex flex-col gap-1">
                         <h3 className="text-sm font-black text-foreground uppercase tracking-[0.05em]">External Cloud & Systems</h3>
                         <p className="text-xs text-muted-foreground">Connect infrastructure providers for automation host provisioning.</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                         <IntegrationItem 
                           name="Amazon Web Services (AWS)" 
                           status="CONNECTED" 
                           icon={Server} 
                           description="Used for dynamic bot-host scaling and S3 storage."
                         />
                         <IntegrationItem 
                           name="Microsoft Azure" 
                           status="NOT CONNECTED" 
                           icon={Globe} 
                           description="Sync AD groups and provision Azure VM scale sets."
                         />
                         <IntegrationItem 
                           name="Slack Operations" 
                           status="ENABLED" 
                           icon={Zap} 
                           description="Notification channel for deployment and security alerts."
                         />
                      </div>
                   </section>

                   <section className="space-y-6">
                      <div className="flex flex-col gap-1 border-t border-border pt-8">
                         <h3 className="text-sm font-black text-foreground uppercase tracking-[0.05em]">Custom Webhooks & API</h3>
                         <p className="text-xs text-muted-foreground">Outgoing events and secure API access for external orchestrators.</p>
                      </div>
                      
                      <div className="p-6 bg-muted/20 border border-dashed border-border rounded-sm flex flex-col items-center gap-4">
                         <div className="p-3 bg-white border border-border rounded-full text-muted-foreground">
                            <Key size={24} />
                         </div>
                         <div className="text-center space-y-1">
                            <span className="text-xs font-black uppercase text-foreground">API Keys Control</span>
                            <p className="text-[10px] text-muted-foreground max-w-xs">Generate machine-to-machine tokens for headless administrative actions.</p>
                         </div>
                         <button className="text-[10px] font-black uppercase tracking-widest border border-primary text-primary px-6 py-2 hover:bg-primary hover:text-white transition-all shadow-sm">Generate New Token</button>
                      </div>
                   </section>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === "Security" && (
                <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                   <section className="space-y-8">
                      <div className="flex flex-col gap-1">
                         <h3 className="text-sm font-black text-foreground uppercase tracking-[0.05em]">Identity & Access Policy</h3>
                         <p className="text-xs text-muted-foreground">Enforce high-security login and session requirements for all users.</p>
                      </div>

                      <div className="space-y-4">
                         <PolicyToggle 
                           icon={Smartphone}
                           title="Multi-Factor Authentication (MFA)" 
                           description="Mandatory for all administrative roles across the customer context."
                           active={true}
                         />
                         <PolicyToggle 
                           icon={ShieldCheck}
                           title="Session Hardening" 
                           description="Automatic logout after 15 minutes of inactivity in the Admin Console."
                           active={true}
                         />
                         <PolicyToggle 
                           icon={Globe}
                           title="IP Whitelisting" 
                           description="Restrict administrative access to authorized organizational CIDR blocks."
                           active={false}
                         />
                      </div>
                   </section>

                   <section className="space-y-8 border-t border-border pt-8">
                      <div className="flex flex-col gap-1">
                         <h3 className="text-sm font-black text-foreground uppercase tracking-[0.05em]">Data Sovereignty & Retention</h3>
                         <p className="text-xs text-muted-foreground">Define compliance boundaries for log storage and regional processing.</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-6">
                         <div className="space-y-1.5 ">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data Residency Region</label>
                            <div className="flex items-center gap-3 p-3 bg-muted border border-border rounded-sm">
                               <Server size={14} className="text-primary" />
                               <span className="text-xs font-bold">AWS US-East (Virginia)</span>
                            </div>
                         </div>
                         <div className="space-y-1.5 ">
                            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Log Retention Period</label>
                            <select 
                              className="w-full bg-muted border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none"
                            >
                               <option>30 Days (Standard)</option>
                               <option>90 Days (Compliance)</option>
                               <option>1 Year (Audit Locked)</option>
                            </select>
                         </div>
                      </div>
                   </section>

                   <section className="p-6 bg-rose-50 border border-rose-100 rounded-sm space-y-4 shadow-sm">
                      <div className="flex items-center gap-2 text-rose-700">
                         <AlertCircle size={18} />
                         <span className="text-xs font-black uppercase tracking-widest">Sovereign Removal Zone</span>
                      </div>
                      <p className="text-[11px] text-rose-600 leading-relaxed font-medium">All deletions are permanent and subject to the offboarding fence. Ensure all data has been exported via the Compliance Package before initiating removal.</p>
                      <button className="bg-rose-600 text-white px-6 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all flex items-center gap-2 shadow-md">
                         <Trash2 size={12} />
                         Initiate Offboarding Request
                      </button>
                   </section>
                </div>
              )}

               {/* COMMUNICATION TAB */}
               {activeTab === "Communication" && (
                  <div className="space-y-8 animate-in slide-in-from-right-4 duration-500 overflow-y-auto pr-4">
                     <section className="space-y-6">
                        <div className="flex flex-col gap-1">
                           <h3 className="text-sm font-black text-foreground uppercase tracking-[0.05em]">Email SMTP Settings</h3>
                           <p className="text-xs text-muted-foreground">Configure your own SMTP server for all organization-level alerts and notifications.</p>
                        </div>

                        {!smtpConfig?.isOverride && (
                          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-sm flex items-start gap-4">
                             <AlertCircle size={20} className="text-amber-600 mt-1" />
                             <div className="space-y-1">
                                <span className="text-[10px] font-black uppercase text-amber-700 tracking-widest">Inherited Settings</span>
                                <p className="text-[11px] text-amber-600 leading-relaxed font-medium">
                                  Your organization is currently inheriting the Platform SMTP settings. 
                                  Saving a configuration below will create an override specific to this organization.
                                </p>
                             </div>
                          </div>
                        )}
                        
                        <div className="grid grid-cols-2 gap-6">
                           <div className="space-y-1.5 col-span-2 md:col-span-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">SMTP Host</label>
                              <input 
                                type="text"
                                value={smtpConfig?.host || ""}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                placeholder="smtp.example.com"
                                className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                              />
                           </div>
                           <div className="space-y-1.5 col-span-2 md:col-span-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">SMTP Port</label>
                              <input 
                                type="number"
                                value={smtpConfig?.port || 587}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, port: parseInt(e.target.value) })}
                                placeholder="587"
                                className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                              />
                           </div>
                           <div className="space-y-1.5 col-span-2 md:col-span-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Username</label>
                              <input 
                                type="text"
                                value={smtpConfig?.username || ""}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                                className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                              />
                           </div>
                           <div className="space-y-1.5 col-span-2 md:col-span-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Password</label>
                              <input 
                                type="password"
                                value={smtpConfig?.password || ""}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                                className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                              />
                           </div>
                           <div className="space-y-1.5 col-span-2 md:col-span-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">From Email</label>
                              <input 
                                type="email"
                                value={smtpConfig?.fromEmail || ""}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, fromEmail: e.target.value })}
                                placeholder="notifications@yourdomain.com"
                                className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                              />
                           </div>
                           <div className="space-y-1.5 col-span-2 md:col-span-1">
                              <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">From Name</label>
                              <input 
                                type="text"
                                value={smtpConfig?.fromName || ""}
                                onChange={(e) => setSmtpConfig({ ...smtpConfig, fromName: e.target.value })}
                                placeholder="Platform Alerts"
                                className="w-full bg-card border border-border p-3 text-xs font-bold focus:ring-1 ring-primary/20 outline-none rounded-sm"
                              />
                           </div>
                           <div className="col-span-2 flex items-center gap-3 p-4 bg-muted/30 border border-border rounded-sm">
                              <div 
                                onClick={() => setSmtpConfig({ ...smtpConfig, secure: !smtpConfig.secure })}
                                className={cn(
                                  "w-10 h-5 rounded-full p-1 flex transition-all cursor-pointer",
                                  smtpConfig?.secure ? "bg-primary justify-end" : "bg-muted justify-start"
                                )}
                              >
                                <div className="w-3 h-3 bg-white rounded-full shadow-sm" />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-[10px] font-black uppercase text-foreground">Use SSL/TLS</span>
                                 <span className="text-[9px] text-muted-foreground uppercase">Enable for port 465 or if your provider requires it.</span>
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-4 pt-4 border-t border-border">
                           <button 
                            onClick={handleTestConnection}
                            disabled={isTesting}
                            className="bg-foreground text-background px-6 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 rounded-sm shadow-lg disabled:opacity-50"
                           >
                              {isTesting ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                              {isTesting ? "Validating..." : "Test Gateway"}
                           </button>
                           {smtpConfig?.isOverride && (
                             <button 
                              onClick={handleRestoreDefaults}
                              className="text-[10px] font-black uppercase tracking-widest text-rose-600 hover:text-rose-700 flex items-center gap-2 px-4 py-2 border border-rose-100 bg-rose-50/30 rounded-sm"
                             >
                                <RefreshCcw size={12} />
                                Restore Platform Defaults
                             </button>
                           )}
                        </div>
                     </section>
                     
                     <div className="p-4 bg-primary/5 border border-primary/20 rounded-sm flex items-center gap-4">
                        <Zap size={20} className="text-primary" />
                        <div className="flex flex-col gap-0.5">
                           <span className="text-[10px] font-black uppercase text-primary tracking-widest">Advanced Validation</span>
                           <p className="text-[9px] text-muted-foreground uppercase leading-tight font-medium">When enabled, all system alerts will bypass the Platform SMTP and use these credentials.</p>
                        </div>
                     </div>
                  </div>
               )}

               {/* GENERAL TAB */}
               {activeTab === "General" && (
                 <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                    <section className="space-y-6">
                       <div className="flex flex-col gap-1">
                          <h3 className="text-sm font-black text-foreground uppercase tracking-[0.05em]">Identity Branding</h3>
                          <p className="text-xs text-muted-foreground">Customize how the platform appears to your internal employees.</p>
                       </div>
                       
                       <div className="flex items-center gap-6 p-6 bg-card border border-border rounded-sm shadow-sm">
                          <div className="w-24 h-24 bg-muted border border-border rounded-sm flex items-center justify-center text-muted-foreground">
                             {activeCustomer?.logoUrl ? <img src={activeCustomer.logoUrl} className="w-full h-full object-contain p-2" /> : <Building2 size={48} opacity={0.1} />}
                          </div>
                          <div className="flex flex-col gap-3">
                             <span className="text-xs font-black uppercase text-foreground">Organization Logo</span>
                             <div className="flex gap-2">
                                <button className="px-4 py-2 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-sm">Upload New</button>
                                <button className="px-4 py-2 border border-border text-[10px] font-bold uppercase tracking-widest rounded-sm bg-white hover:bg-muted">Remove</button>
                             </div>
                          </div>
                       </div>
                    </section>
                 </div>
               )}

           </div>
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

function SelectionCard({ active, onClick, title, description, icon: Icon }: any) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "p-6 border rounded-sm cursor-pointer transition-all space-y-4 group",
        active ? "bg-primary border-primary text-white shadow-xl translate-y-[-4px]" : "bg-card border-border hover:border-primary/50 text-foreground shadow-sm"
      )}
    >
       <div className={cn(
         "p-2 w-fit rounded-sm",
         active ? "bg-white/20" : "bg-muted group-hover:bg-primary/10 transition-colors"
       )}>
          <Icon size={24} className={active ? "text-white" : "text-primary"} />
       </div>
       <div className="space-y-1">
          <h4 className="text-sm font-black uppercase tracking-tight">{title}</h4>
          <p className={cn("text-[10px] leading-relaxed", active ? "text-white/80" : "text-muted-foreground")}>{description}</p>
       </div>
    </div>
  );
}

function IntegrationItem({ name, status, icon: Icon, description }: any) {
  const isConnected = status === "CONNECTED" || status === "ENABLED";
  const isError = status === "NOT CONNECTED";
  return (
    <div className="p-5 border border-border bg-card/40 rounded-sm group hover:border-primary/20 transition-all flex items-center justify-between gap-6 shadow-sm">
       <div className="flex items-center gap-5 flex-1">
          <div className={cn(
            "p-3 rounded-sm",
            isConnected ? "bg-primary/5 text-primary" : "bg-muted text-muted-foreground"
          )}>
             <Icon size={22} />
          </div>
          <div className="flex flex-col gap-0.5">
             <span className="text-sm font-black text-foreground tracking-tight">{name}</span>
             <span className="text-[10px] text-muted-foreground font-medium">{description}</span>
          </div>
       </div>
       <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
             <div className={cn(
               "w-1.5 h-1.5 rounded-full",
               isConnected ? "bg-emerald-500 animate-pulse" : isError ? "bg-rose-500" : "bg-muted-foreground"
             )} />
             <span className={cn(
               "text-[9px] font-black uppercase tracking-widest",
               isConnected ? "text-emerald-600" : isError ? "text-rose-600" : "text-muted-foreground"
             )}>{status}</span>
          </div>
          <button className="text-[10px] font-black text-primary uppercase border-b border-transparent hover:border-primary transition-all">Config</button>
       </div>
    </div>
  );
}

function PolicyToggle({ icon: Icon, title, description, active }: any) {
  return (
    <div className="flex items-center justify-between p-4 border border-border bg-muted/10 rounded-sm group hover:border-primary/20 transition-all shadow-sm">
       <div className="flex items-center gap-4">
          <Icon size={20} className={active ? "text-primary" : "text-muted-foreground"} />
          <div className="flex flex-col">
             <span className="text-xs font-black text-foreground tracking-tight">{title}</span>
             <span className="text-[9px] text-muted-foreground uppercase font-bold leading-none">{description}</span>
          </div>
       </div>
       <div className={cn(
         "w-10 h-5 rounded-full p-1 flex transition-all cursor-pointer",
         active ? "bg-primary justify-end" : "bg-muted justify-start"
       )}>
          <div className="w-3 h-3 bg-white rounded-full shadow-md" />
       </div>
    </div>
  );
}
