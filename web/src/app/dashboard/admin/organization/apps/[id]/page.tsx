"use client";

import React, { useState, useEffect } from "react";
import { 
  LayoutGrid, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Settings2, 
  Globe, 
  ShieldCheck, 
  Activity,
  ArrowRight,
  ExternalLink,
  Copy,
  Layers,
  Calendar,
  AlertCircle,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeftRight,
  Database,
  ArrowLeft,
  Edit,
  Power,
  Trash2,
  History,
  Info,
  Server,
  Settings,
  Shield,
  Zap,
  Code,
  ClipboardCheck
} from "lucide-react";
import { toast } from "sonner";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  getApplicationDetail, 
  getApplicationEnvironments,
  saveApplicationConfigAction,
  setAvailabilityOverrideAction,
  setDowntimeAction
} from "@/app/actions/applicationActions";
import { motion, AnimatePresence } from "framer-motion";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import Link from "next/link";

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { activeTenant, currentUser } = useAppContext();
  const [app, setApp] = useState<any>(null);
  const [envs, setEnvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("Environments");
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      loadData();
    }
  }, [params.id]);

  async function loadData() {
    setLoading(true);
    try {
      const [fetchedApp, fetchedEnvs] = await Promise.all([
        getApplicationDetail(params.id as string),
        getApplicationEnvironments()
      ]);
      setApp(fetchedApp);
      setEnvs(fetchedEnvs);
      if (fetchedEnvs.length > 0) {
        setSelectedEnv(fetchedEnvs[0].id);
      }
    } catch (error) {
      console.error("Error loading application detail:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Loading Application Context...</span>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <h2 className="text-xl font-bold uppercase tracking-tight">Application Not Found</h2>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/admin/organization/apps">Back to Registry</Link>
        </Button>
      </div>
    );
  }

  const tabs = [
    { name: "Overview", icon: Info },
    { name: "Versions", icon: History },
    { name: "Environments", icon: Server },
    { name: "Dependencies", icon: Layers },
    { name: "Parameters", icon: Code },
    { name: "Credentials", icon: Shield },
    { name: "Downtime", icon: Calendar },
    { name: "Audit Logs", icon: ClipboardCheck },
  ];

  const activeEnvConfig = app.configs?.find((c: any) => c.environmentId === selectedEnv);

  return (
    <div className="min-h-full flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500">
      
      {/* Breadcrumbs & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-muted-foreground hover:text-primary hover:bg-primary/5">
              <Link href="/dashboard/admin/organization/apps">
                <IconWrapper icon={ArrowLeft} size={14} className="mr-1" />
                Registry
              </Link>
            </Button>
            <span className="text-muted-foreground/30">/</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">{app.name}</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="p-2 bg-primary/10 text-primary rounded-sm border border-primary/20">
               <IconWrapper icon={app.category === "Web" ? Globe : Database} size={20} />
             </div>
             <div className="flex flex-col">
                <div className="flex items-center gap-3">
                   <h1 className="text-2xl font-black tracking-tight text-foreground">{app.name}</h1>
                   <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest h-5">Active</Badge>
                   <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest h-5 border-border">Enterprise</Badge>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                   <span>Tenant: <span className="text-foreground">{activeTenant?.name}</span></span>
                   <span className="opacity-20">|</span>
                   <span>Owner: <span className="text-foreground">{app.owner || "John Doe"}</span></span>
                   <span className="opacity-20">|</span>
                   <span>Criticality: <span className={cn(app.criticality === "High" ? "text-rose-500" : "text-foreground")}>{app.criticality || "Medium"}</span></span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
           <Button variant="outline" size="sm" className="bg-card/50 border-border font-bold text-[10px] uppercase tracking-wider h-9">
              <IconWrapper icon={Edit} size={14} className="mr-2" />
              Edit
           </Button>
           <Button variant="outline" size="sm" className="bg-card/50 border-border font-bold text-[10px] uppercase tracking-wider h-9">
              <IconWrapper icon={Copy} size={14} className="mr-2" />
              Replicate
           </Button>
           <Button variant="outline" size="sm" className="bg-rose-500/5 border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white font-bold text-[10px] uppercase tracking-wider h-9">
              <IconWrapper icon={Power} size={14} className="mr-2" />
              Deactivate
           </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-border/50 px-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          return (
            <button
              key={tab.name}
              onClick={() => setActiveTab(tab.name)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all relative",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <IconWrapper icon={tab.icon} size={14} />
              {tab.name}
              {isActive && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 flex flex-col gap-6">
        
        {/* Versions Tab */}
        {activeTab === "Versions" && (
          <div className="bg-card/30 border border-border/50 rounded-sm overflow-hidden flex flex-col flex-1">
             <div className="bg-muted/50 px-6 py-4 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <IconWrapper icon={History} size={16} className="text-primary" />
                   <h3 className="text-sm font-black uppercase tracking-widest">Version History</h3>
                </div>
                <Button size="sm" className="h-8 bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                   <Plus size={14} className="mr-2" />
                   New Version
                </Button>
             </div>
             <div className="overflow-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-muted/20 border-b border-border">
                         <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Version</th>
                         <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Release Date</th>
                         <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                         <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-border/20">
                      {app.versions?.map((v: any) => (
                         <tr key={v.id} className="hover:bg-primary/[0.01] transition-colors">
                            <td className="px-6 py-4">
                               <div className="flex items-center gap-2">
                                  <span className="text-sm font-mono font-bold">{v.versionNumber}</span>
                                  {v.isLatest && <Badge className="bg-primary/10 text-primary border-primary/20 text-[8px] font-black uppercase h-4">Latest</Badge>}
                               </div>
                            </td>
                            <td className="px-6 py-4">
                               <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleDateString()}</span>
                            </td>
                            <td className="px-6 py-4">
                               <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-500 bg-emerald-500/5">Released</Badge>
                            </td>
                            <td className="px-6 py-4 text-right">
                               <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold uppercase tracking-widest">Rollback</Button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* Dependencies Tab */}
        {activeTab === "Dependencies" && (
           <div className="bg-card/30 border border-border/50 rounded-sm overflow-hidden flex flex-col flex-1">
              <div className="bg-muted/50 px-6 py-4 border-b border-border flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <IconWrapper icon={Layers} size={16} className="text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-widest">Startup Dependencies</h3>
                 </div>
                 <Button size="sm" className="h-8 bg-primary text-white text-[10px] font-black uppercase tracking-widest">
                    <Plus size={14} className="mr-2" />
                    Add Dependency
                 </Button>
              </div>
              <div className="overflow-auto custom-scrollbar flex-1">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-muted/20 border-b border-border">
                          <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Order</th>
                          <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Dependency Name</th>
                          <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Type</th>
                          <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Mandatory</th>
                          <th className="px-6 py-3 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-border/20">
                       {activeEnvConfig?.dependencies?.length > 0 ? (
                         activeEnvConfig.dependencies.map((dep: any) => (
                           <tr key={dep.id} className="hover:bg-primary/[0.01] transition-colors">
                              <td className="px-6 py-4">
                                 <span className="text-xs font-black text-primary bg-primary/5 w-6 h-6 flex items-center justify-center rounded-full border border-primary/20">{dep.startupOrder}</span>
                              </td>
                              <td className="px-6 py-4">
                                 <span className="text-sm font-bold">{dep.name}</span>
                              </td>
                              <td className="px-6 py-4">
                                 <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest">{dep.type || "Service"}</Badge>
                              </td>
                              <td className="px-6 py-4">
                                 <span className="text-[10px] font-bold uppercase tracking-widest">{dep.isMandatory ? "Yes" : "Optional"}</span>
                              </td>
                              <td className="px-6 py-4 text-right">
                                 <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-rose-500"><Trash2 size={14} /></Button>
                              </td>
                           </tr>
                         ))
                       ) : (
                         <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground text-[10px] font-black uppercase tracking-widest">
                               No dependencies defined for this environment
                            </td>
                         </tr>
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        )}

        {activeTab === "Environments" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
            
            {/* Environment Selector Sidebar */}
            <div className="lg:col-span-3 flex flex-col gap-3">
               <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Select Environment</div>
               {envs.map((env) => {
                 const hasConfig = app.configs?.some((c: any) => c.environmentId === env.id);
                 const isSelected = selectedEnv === env.id;
                 return (
                   <button
                     key={env.id}
                     onClick={() => setSelectedEnv(env.id)}
                     className={cn(
                       "flex items-center justify-between p-4 rounded-sm border transition-all text-left group relative overflow-hidden",
                       isSelected 
                        ? "bg-primary/5 border-primary shadow-[0_0_15px_rgba(37,99,235,0.1)]" 
                        : "bg-card/50 border-border hover:border-primary/30"
                     )}
                   >
                     {isSelected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />}
                     <div className="flex flex-col gap-1">
                        <span className={cn("text-xs font-black tracking-widest uppercase", isSelected ? "text-primary" : "text-foreground")}>{env.name}</span>
                        <span className="text-[10px] text-muted-foreground font-bold">{hasConfig ? "Configured" : "Not Defined"}</span>
                     </div>
                     <div className={cn(
                       "w-2 h-2 rounded-full",
                       hasConfig ? "bg-emerald-500" : "bg-muted-foreground/30"
                     )} />
                   </button>
                 );
               })}
               <Button variant="outline" size="sm" className="mt-2 border-dashed border-border hover:border-primary/50 text-[10px] font-bold uppercase tracking-wider py-6">
                 <Plus size={14} className="mr-2" />
                 Add Environment
               </Button>
            </div>

            {/* Environment Detail Area */}
            <div className="lg:col-span-9 flex flex-col gap-6">
               {selectedEnv ? (
                 <motion.div 
                   key={selectedEnv}
                   initial={{ opacity: 0, x: 20 }}
                   animate={{ opacity: 1, x: 0 }}
                   className="flex flex-col gap-6"
                 >
                    {/* Env Header */}
                    <div className="bg-card/50 border border-border rounded-sm p-6 flex items-center justify-between">
                       <div className="flex items-center gap-4">
                          <h3 className="text-xl font-black uppercase tracking-tight">{envs.find(e => e.id === selectedEnv)?.name} Environment</h3>
                          <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">Active</Badge>
                       </div>
                       <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest px-4 hover:bg-primary/5 hover:text-primary">
                             Test Connection
                          </Button>
                          <Button size="sm" className="h-8 text-[10px] font-bold uppercase tracking-widest px-4 bg-primary text-white">
                             <Edit size={12} className="mr-2" />
                             Edit
                          </Button>
                       </div>
                    </div>

                    {/* Config Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {/* Launch Settings */}
                       <div className="bg-card/30 border border-border/50 rounded-sm overflow-hidden flex flex-col">
                          <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Launch Settings</span>
                             <Zap size={12} className="text-primary" />
                          </div>
                          <div className="p-4 space-y-4">
                             {[
                               { label: "Launch Type", value: activeEnvConfig?.launchType || "Executable" },
                               { label: "Executable Path", value: activeEnvConfig?.executablePath || "C:\\Program Files\\SAP\\Frontend\\sapgui.exe" },
                               { label: "Working Directory", value: activeEnvConfig?.workingDirectory || "C:\\SAP\\" },
                               { label: "Launch Arguments", value: activeEnvConfig?.launchArguments || "/SAPLOGON /MULTIPLE /NOW /SAPSYSTEM=PRD" },
                               { label: "Timeout (sec)", value: activeEnvConfig?.timeoutSeconds || 60 },
                               { label: "Retry Count", value: activeEnvConfig?.retryCount || 2 },
                               { label: "Requires VPN", value: activeEnvConfig?.requiresVPN ? "Yes" : "No" },
                               { label: "Headless Supported", value: activeEnvConfig?.headlessSupported ? "Yes" : "No" },
                             ].map((item, idx) => (
                               <div key={idx} className="flex flex-col gap-1 border-b border-border/10 pb-2 last:border-0">
                                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
                                  <span className="text-xs font-bold text-foreground break-all">{item.value}</span>
                               </div>
                             ))}
                          </div>
                       </div>

                       {/* Quick Info & Health */}
                       <div className="flex flex-col gap-6">
                          <div className="bg-card/30 border border-border/50 rounded-sm p-6 flex flex-col gap-4">
                             <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Info</div>
                             <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                   <span className="text-xs text-muted-foreground">Latest Version</span>
                                   <Badge variant="outline" className="font-mono text-xs">{app.versions?.[0]?.versionNumber || "1.0.0"}</Badge>
                                </div>
                                <div className="flex items-center justify-between">
                                   <span className="text-xs text-muted-foreground">Last Modified</span>
                                   <div className="flex flex-col items-end gap-1">
                                      <span className="text-xs font-bold">May 02, 2024 03:15 PM</span>
                                      <span className="text-[9px] text-muted-foreground uppercase font-black tracking-widest">by John Doe</span>
                                   </div>
                                </div>
                                <div className="flex items-center justify-between">
                                   <span className="text-xs text-muted-foreground">Status</span>
                                   <div className="flex items-center gap-1.5 text-emerald-500">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span className="text-[10px] font-black uppercase tracking-widest">Running</span>
                                   </div>
                                </div>
                             </div>
                          </div>

                          {/* Availability Override */}
                          <div className="bg-primary/[0.02] border border-primary/20 rounded-sm p-6 flex flex-col gap-4">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                   <span className="text-[10px] font-black uppercase tracking-widest text-primary">Availability Override</span>
                                   <IconWrapper icon={Info} size={12} className="text-primary/40" />
                                </div>
                                <div className="flex items-center gap-2">
                                   <Badge className="bg-emerald-500 text-white border-0 text-[9px] font-black uppercase tracking-widest px-2">Up</Badge>
                                   <div className="w-8 h-4 bg-primary/20 rounded-full relative cursor-pointer group">
                                      <div className="absolute right-1 top-1 w-2 h-2 bg-primary rounded-full" />
                                   </div>
                                </div>
                             </div>
                             <div className="text-[10px] text-muted-foreground leading-relaxed italic">
                                Use overrides to manually mark an application as DOWN for this environment, preventing robots from attempting execution.
                             </div>
                          </div>
                       </div>
                    </div>
                 </motion.div>
               ) : (
                 <div className="flex-1 flex items-center justify-center p-20 text-muted-foreground uppercase tracking-widest text-xs font-black">
                   Select an environment to view configuration
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Fallback for other tabs */}
        {activeTab !== "Environments" && (
          <div className="flex-1 flex items-center justify-center p-20 bg-card/30 border border-border/50 rounded-sm border-dashed">
             <div className="flex flex-col items-center gap-4 text-muted-foreground">
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                   <IconWrapper icon={tabs.find(t => t.name === activeTab)?.icon || Info} size={24} />
                </div>
                <h3 className="text-sm font-black uppercase tracking-widest">{activeTab} Module Coming Soon</h3>
                <p className="text-xs text-center max-w-xs opacity-60">This section of the Application Detail screen is currently under active development.</p>
                <Button size="sm" variant="outline" className="mt-2 text-[9px] font-black uppercase tracking-widest h-8" onClick={() => setActiveTab("Environments")}>
                   Back to Environments
                </Button>
             </div>
          </div>
        )}

      </div>
    </div>
  );
}
