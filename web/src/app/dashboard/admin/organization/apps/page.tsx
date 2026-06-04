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
  Database
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  getApplications, 
  getApplicationEnvironments, 
  upsertApplicationAction,
  cloneApplicationAction,
  bulkReplicateApplicationsAction
} from "@/app/actions/applicationActions";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import Link from "next/link";
import { toast } from "sonner"; // Assuming sonner is available or I can use a fallback

export default function ApplicationsPage() {
  const { activeTenant, currentUser, role } = useAppContext();
  const [apps, setApps] = useState<any[]>([]);
  const [envs, setEnvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (activeTenant) {
      loadData();
    }
  }, [activeTenant]);

  async function loadData() {
    setLoading(true);
    try {
      const [fetchedApps, fetchedEnvs] = await Promise.all([
        getApplications(activeTenant?.id || ""),
        getApplicationEnvironments()
      ]);
      setApps(fetchedApps);
      setEnvs(fetchedEnvs);
    } catch (error) {
      console.error("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-full flex flex-col gap-6 animate-in fade-in duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
             <IconWrapper icon={LayoutGrid} size={12} />
             <span>Organization / Application Lifecycle</span>
          </div>
          <div className="flex items-center gap-3">
             <h1 className="text-2xl font-black text-foreground tracking-tight">Applications</h1>
             <div className="h-6 w-[1px] bg-border mx-1 hidden md:block" />
             
             {/* Tenant Context */}
             <div className="hidden md:flex items-center gap-2">
                <div className="flex items-center gap-2 bg-muted/30 px-3 py-1.5 border border-border rounded-sm">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                   <span className="text-[10px] font-black uppercase tracking-widest text-foreground">{activeTenant?.name || "Global Scope"}</span>
                </div>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 bg-card/50 border-border hover:bg-primary/5 hover:text-primary hover:border-primary/20 font-bold text-[10px] uppercase tracking-wider transition-all">
            <IconWrapper icon={Copy} size={14} className="mr-2" />
            Replicate Application
          </Button>
          <Button variant="outline" size="sm" className="h-9 bg-card/50 border-border hover:bg-primary/5 hover:text-primary hover:border-primary/20 font-bold text-[10px] uppercase tracking-wider transition-all">
            <IconWrapper icon={ArrowLeftRight} size={14} className="mr-2" />
            Bulk Sync to Another Tenant
          </Button>
          <Button 
            onClick={() => setIsAddModalOpen(true)}
            size="sm" 
            className="h-9 bg-primary hover:bg-primary/90 text-white font-bold text-[10px] uppercase tracking-wider shadow-lg shadow-primary/20 px-4 disabled:opacity-50"
            disabled={!activeTenant}
          >
            <IconWrapper icon={Plus} size={14} className="mr-2" />
            Add Application
          </Button>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-muted/20 border border-border/50 rounded-sm p-2 backdrop-blur-sm">
         <div className="relative group w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={14} />
            <input 
              type="text" 
              placeholder="Search applications..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background/50 border border-border rounded-sm pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all outline-none"
            />
         </div>
         
         <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-wider h-8">
              <IconWrapper icon={Filter} size={12} className="mr-2" />
              Filters
            </Button>
            <div className="h-4 w-[1px] bg-border mx-1" />
            <div className="flex items-center gap-1">
               <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[9px] font-bold h-5">Category: Enterprise</Badge>
               <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[9px] font-bold h-5">Status: Active</Badge>
            </div>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 overflow-hidden bg-card/30 border border-border/50 rounded-sm flex flex-col shadow-inner">
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-20">
            <div className="flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Synchronizing Registry...</span>
            </div>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <div className="flex flex-col items-center gap-6 max-w-sm text-center">
              <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center text-primary/20 border border-primary/10">
                  <LayoutGrid size={40} />
              </div>
              <div>
                  <h3 className="text-xl font-black uppercase tracking-tight text-foreground mb-2">No Applications Found</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {searchQuery ? "No applications match your search criteria." : "Your application registry is currently empty. Connect your web apps, APIs, and microservices to begin orchestration."}
                  </p>
              </div>
              {!searchQuery && (
                <Button 
                  onClick={() => setIsAddModalOpen(true)}
                  size="sm" 
                  className="bg-primary hover:bg-primary/90 text-white font-bold text-[10px] uppercase tracking-wider px-8"
                >
                    <IconWrapper icon={Plus} size={14} className="mr-2" />
                    Register Your First Application
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="sticky top-0 z-10 bg-muted/50 backdrop-blur-md border-b border-border">
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Application Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Latest Version</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Environments</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center">Downtime</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <AnimatePresence initial={false}>
                  {filteredApps.map((app, idx) => (
                    <motion.tr 
                      key={app.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="group hover:bg-primary/[0.02] transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary border border-primary/20",
                            app.criticality === "High" && "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          )}>
                             <IconWrapper icon={app.category === "Web" ? Globe : Database} size={16} />
                          </div>
                          <div className="flex flex-col">
                            <Link href={`/dashboard/admin/organization/apps/${app.id}`} className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                              {app.name}
                            </Link>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{app.owner || "No Owner"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                         <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-tighter bg-muted/30 border-border">
                           {app.category || "General"}
                         </Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                         <span className="text-xs font-mono font-bold text-muted-foreground">
                           {app.versions?.[0]?.versionNumber || "1.0.0"}
                         </span>
                      </td>
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-1">
                           {["DEV", "UAT", "PROD", "GLOBAL"].map(env => {
                             const hasConfig = app.configs?.some((c: any) => c.environment.name === env);
                             return (
                               <div 
                                 key={env}
                                 title={hasConfig ? `${env} Configured` : `${env} Not Configured`}
                                 className={cn(
                                   "px-1.5 py-0.5 rounded-[2px] text-[8px] font-black tracking-tighter uppercase border transition-all",
                                   hasConfig 
                                    ? env === "PROD" ? "bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_10px_rgba(225,29,72,0.1)]" : "bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(37,99,235,0.1)]"
                                    : "bg-muted/50 text-muted-foreground/30 border-border/50 opacity-40 grayscale"
                                 )}
                               >
                                 {env}
                               </div>
                             );
                           })}
                         </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                         {app.downtimes?.length > 0 ? (
                            <div className="flex items-center justify-center gap-1.5 text-rose-500">
                               <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                               <span className="text-[10px] font-black uppercase tracking-widest">Yes</span>
                            </div>
                         ) : (
                            <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">No</span>
                         )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                           <div className={cn(
                             "w-2 h-2 rounded-full",
                             app.isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-muted-foreground/30"
                           )} />
                           <span className={cn(
                             "text-[10px] font-black uppercase tracking-widest",
                             app.isActive ? "text-emerald-600" : "text-muted-foreground/50"
                           )}>
                             {app.isActive ? "Active" : "Inactive"}
                           </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <Link href={`/dashboard/admin/organization/apps/${app.id}`}>
                             <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-primary hover:bg-primary/5">
                               <IconWrapper icon={ExternalLink} size={14} />
                             </Button>
                           </Link>
                           <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-foreground">
                             <IconWrapper icon={MoreHorizontal} size={14} />
                           </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
        
        {/* Footer Info */}
        <div className="px-6 py-3 bg-muted/30 border-t border-border flex items-center justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
           <div className="flex items-center gap-4">
              <span>Showing {filteredApps.length} of {apps.length} Applications</span>
           </div>
           <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="w-6 h-6 rounded-sm">1</Button>
              <div className="w-[1px] h-3 bg-border mx-1" />
              <span className="opacity-40 italic lowercase font-medium">Page 1 of 1</span>
           </div>
        </div>
      </div>

      {/* Info Panel / Call to Action */}
      <div className="bg-primary/[0.03] border border-primary/20 rounded-sm p-5 flex flex-col md:flex-row items-center justify-between gap-6 overflow-hidden relative group">
        {/* Decorative background element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-all duration-700" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-4 bg-primary/10 text-primary rounded-sm shadow-xl shadow-primary/10 border border-primary/20">
            <IconWrapper icon={ShieldCheck} size={28} />
          </div>
          <div className="flex flex-col gap-1">
            <h4 className="text-sm font-black uppercase tracking-tight text-foreground">Multi-Tenant Governance</h4>
            <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
              Standardize your application landscape with centralized versioning and environment configurations. Enable real-time replication to maintain parity across business units and geographical regions.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 relative z-10">
           <Button variant="link" className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] group h-auto p-0">
             Security Audit Logs
             <IconWrapper icon={ArrowRight} size={14} className="ml-2 group-hover:translate-x-1 transition-transform" />
           </Button>
           <div className="w-[1px] h-4 bg-primary/30" />
           <Button variant="link" className="text-primary font-bold text-[10px] uppercase tracking-[0.2em] group h-auto p-0">
             Integration Docs
             <IconWrapper icon={ExternalLink} size={14} className="ml-2" />
           </Button>
        </div>
      </div>


      {/* Add Application Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="bg-card border-border/60 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest text-muted-foreground">
              Register New Application
            </DialogTitle>
          </DialogHeader>
          <form action={async (formData) => {
            setIsSubmitting(true);
            try {
              const payload = {
                tenantId: activeTenant?.id,
                name: formData.get("name") as string,
                category: formData.get("category") as string,
                owner: formData.get("owner") as string,
                criticality: formData.get("criticality") as string || "Medium",
              };
              const res = await upsertApplicationAction(payload, currentUser?.email || "system");
              if (res.success) {
                toast.success("Application registered successfully");
                setIsAddModalOpen(false);
                loadData();
              } else {
                toast.error(res.error || "Failed to register application");
              }
            } finally {
              setIsSubmitting(false);
            }
          }} className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Application Name</label>
              <Input name="name" placeholder="e.g. SAP S/4HANA" required className="bg-background border-border/40 text-xs h-9" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Category</label>
                <select name="category" className="w-full bg-background border border-border/40 rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20 outline-none h-9">
                  <option value="Web">Web Application</option>
                  <option value="Desktop">Desktop App</option>
                  <option value="API">API / Service</option>
                  <option value="Database">Database</option>
                  <option value="Legacy">Mainframe / Legacy</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Criticality</label>
                <select name="criticality" className="w-full bg-background border border-border/40 rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20 outline-none h-9">
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Mission Critical">Mission Critical</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Business Owner</label>
              <Input name="owner" placeholder="e.g. IT Operations" className="bg-background border-border/40 text-xs h-9" />
            </div>

            <DialogFooter className="pt-4 gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsAddModalOpen(false)} className="text-xs font-bold uppercase tracking-widest h-9 px-6">Cancel</Button>
              <Button type="submit" className="bg-primary text-white text-xs font-black uppercase tracking-widest h-9 px-8 shadow-lg shadow-primary/20" disabled={isSubmitting}>
                {isSubmitting ? <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : "Register"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
