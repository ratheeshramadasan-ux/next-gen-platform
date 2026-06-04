"use client";

import React, { useEffect, useState } from "react";
import { 
  Building2, 
  Users, 
  Bot, 
  PackageSearch, 
  ArrowRight, 
  Search, 
  Settings, 
  Globe, 
  FolderTree, 
  Activity,
  ChevronRight,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ThumbsUp
} from "lucide-react";
import Link from "next/link";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import { getRecentDeployments, approveDeploymentAction } from "@/app/actions/deploymentActions";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function OrganizationHomePage() {
  const { activeCustomer, currentUser } = useAppContext();
  const [deployments, setDeployments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    if (activeCustomer?.id) {
       loadActivity();
    }
  }, [activeCustomer?.id]);

  const loadActivity = async () => {
    setLoading(true);
    const data = await getRecentDeployments(activeCustomer!.id, 10);
    setDeployments(data);
    setLoading(false);
  };

  const pendingApprovals = deployments.filter(d => d.status === "PENDING_APPROVAL");
  const recentActivity = deployments.filter(d => d.status !== "PENDING_APPROVAL");

  const handleApprove = async (id: string) => {
    if (!currentUser?.id) return;
    setApproving(id);
    const result = await approveDeploymentAction(id, currentUser.id);
    if (result.success) {
      toast.success("Deployment approved and dispatched");
      loadActivity();
    } else {
      toast.error(result.error || "Approval failed");
    }
    setApproving(null);
  };

  return (
    <div className="min-h-full space-y-8 animate-in fade-in duration-500 overflow-y-auto h-full">
      
      {/* Top Section: Header & Quick Stats */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 border-b border-border pb-8">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em] mb-1">
             <Building2 size={12} />
             <span>Organization Control Center</span>
          </div>
          <h1 className="text-4xl font-black text-foreground tracking-tight leading-none">
            {activeCustomer?.companyName || "Organization"} Homepage
          </h1>
          <p className="text-sm text-muted-foreground max-w-2xl mt-2">
            The sovereign administrative hub for your automation ecosystem. Orchestrate environments, govern access, and monitor deployment lifecycles from a single plane of glass.
          </p>
        </div>

        {/* Floating Snapshot Summary */}
        <div className="flex items-center gap-6 bg-card border border-border p-4 rounded-sm shadow-sm backdrop-blur-md">
           <div className="flex flex-col px-4 border-r border-border">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Tenants</span>
              <span className="text-xl font-black text-primary">4</span>
           </div>
           <div className="flex flex-col px-4 border-r border-border">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Deployments (24h)</span>
              <span className="text-xl font-black text-emerald-600">12</span>
           </div>
           <div className="flex flex-col px-4">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">System Health</span>
              <span className="text-xl font-black text-emerald-600 flex items-center gap-1">
                99.9%
                <Activity size={14} className="animate-pulse" />
              </span>
           </div>
        </div>
      </div>

      {/* APPROVAL CENTER (Mission Critical) */}
      {pendingApprovals.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-top-4 duration-500">
           <div className="flex items-center gap-2 text-[10px] font-black text-rose-600 uppercase tracking-widest">
              <AlertCircle size={14} className="animate-bounce" />
              <span>Pending Approvals Required ({pendingApprovals.length})</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingApprovals.map(d => (
                <div key={d.id} className="bg-rose-50 border border-rose-200 p-4 rounded-sm shadow-md flex flex-col gap-4 group">
                   <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                         <span className="text-xs font-black text-rose-900">{d.tenant?.name}</span>
                         <span className="text-[10px] text-rose-700/60 uppercase font-bold tracking-tighter">Deployment Request</span>
                      </div>
                      <ShieldCheck size={20} className="text-rose-600 opacity-20 group-hover:opacity-100 transition-opacity" />
                   </div>
                   <div className="bg-rose-100/10 border border-rose-100 p-3 rounded-sm">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-black text-rose-800 uppercase">Version</span>
                        <span className="text-[10px] font-mono font-bold text-rose-900">{d.version}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-rose-800 uppercase">Initiated</span>
                        <span className="text-[9px] font-medium text-rose-900/60">{formatDistanceToNow(new Date(d.initiatedAt))} ago</span>
                      </div>
                   </div>
                   <div className="flex gap-2">
                      <button 
                        onClick={() => handleApprove(d.id)}
                        disabled={approving === d.id}
                        className="flex-1 bg-rose-600 text-white py-2 text-xs font-black uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-200 flex items-center justify-center gap-2 rounded-sm disabled:opacity-50"
                      >
                         {approving === d.id ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />}
                         Approve
                      </button>
                      <button className="px-4 py-2 bg-card text-rose-900 border border-rose-200 text-xs font-bold uppercase transition-all rounded-sm hover:bg-rose-100">Details</button>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left 2 Columns: Navigation & Guides */}
        <div className="xl:col-span-2 space-y-12">
          
          {/* Global Search Bar */}
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search size={22} />
            </div>
            <input 
              type="text"
              placeholder="Search resources, users, deployments, integrations... (Ctrl + K)"
              className="w-full bg-card/40 border border-border rounded-sm py-5 pl-14 pr-4 text-base font-medium focus:outline-none focus:ring-1 ring-primary/20 transition-all shadow-inner"
            />
          </div>

          {/* GUIDED MANAGEMENT FLOW */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest text-primary">
               <Activity size={14} />
               <span>Administrative Control Planes</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <QuickActionCard 
                icon={Globe} 
                title="Environments" 
                description="Manage lifecycle of Dev, UAT, and production environments."
                href="/dashboard/admin/organization/tenants"
                btnLabel="Manage Cloud"
                color="text-sky-600"
              />
              <QuickActionCard 
                icon={FolderTree} 
                title="Governance" 
                description="Control folder hierarchy, rbac, and license allocation mappings."
                href="/dashboard/admin/organization/folders"
                btnLabel="Folder Hub"
                color="text-amber-600"
              />
              <QuickActionCard 
                icon={Settings} 
                title="Config Hub" 
                description="Global CI/CD pipelines, security policies, and integrations."
                href="/dashboard/admin/organization/general"
                btnLabel="System Settings"
                color="text-indigo-600"
              />
            </div>
          </div>

          {/* SUB-ADMIN JUMP LINKS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Link href="/dashboard/admin/users" className="bg-muted/30 border border-border p-6 rounded-sm hover:border-primary/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-card rounded-sm text-primary group-hover:scale-110 transition-transform">
                      <Users size={24} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-base font-black text-foreground">Identity & Access</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Manage HR sync and SSO</span>
                   </div>
                </div>
                <ArrowRight size={20} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
             </Link>
             <Link href="/dashboard/admin/compliance" className="bg-muted/30 border border-border p-6 rounded-sm hover:border-primary/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                   <div className="p-3 bg-card rounded-sm text-amber-600 group-hover:scale-110 transition-transform">
                      <PackageSearch size={24} />
                   </div>
                   <div className="flex flex-col">
                      <span className="text-base font-black text-foreground">Compliance Guard</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Audit logs and Data Residency</span>
                   </div>
                </div>
                <ArrowRight size={20} className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
             </Link>
          </div>
        </div>

        {/* Right Column: Recent Activity Log */}
        <div className="space-y-6">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">
                 <Clock size={14} className="text-primary" />
                 <span>System Activity (Real-time)</span>
              </div>
              <button 
                onClick={loadActivity}
                className="p-1 hover:bg-muted rounded-full transition-all text-muted-foreground hover:text-primary"
              >
                <RefreshCw size={14} className={cn(loading && "animate-spin")} />
              </button>
           </div>
           
           <div className="bg-card border border-border rounded-sm h-[600px] flex flex-col overflow-hidden shadow-sm backdrop-blur-sm">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                 {loading && deployments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                       <Loader2 className="animate-spin text-primary" size={24} />
                       <span className="text-[10px] font-black uppercase tracking-widest">Scanning History...</span>
                    </div>
                 ) : recentActivity.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-30 px-6">
                       <Activity size={32} />
                       <span className="text-xs font-bold leading-relaxed">No recent deployment activity detected in this organizational context.</span>
                    </div>
                 ) : (
                    recentActivity.map((d) => (
                       <ActivityItem key={d.id} deployment={d} />
                    ))
                 )}
              </div>
              
              <div className="p-4 bg-muted/40 border-t border-border">
                 <Link href="/dashboard/admin/organization/history">
                    <button className="w-full py-2 text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:bg-primary/5 transition-all text-center">
                       View Full System Audit
                    </button>
                 </Link>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function ActivityItem({ deployment }: any) {
  const isSuccess = deployment.status === "SUCCESS";
  const isFailed = deployment.status === "FAILED";
  const isInProgress = ["DEPLOYING", "VALIDATING"].includes(deployment.status);

  return (
    <div className="p-4 border border-border bg-background hover:border-primary/20 transition-all rounded-sm space-y-3 group shadow-sm">
       <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
             {isSuccess ? <CheckCircle2 size={14} className="text-emerald-500" /> : 
              isFailed ? <AlertCircle size={14} className="text-rose-500" /> : 
              <RefreshCw size={14} className="text-primary animate-spin" />}
             <span className={cn(
                "text-[9px] font-black uppercase tracking-widest",
                isSuccess ? "text-emerald-600" : isFailed ? "text-rose-600" : "text-primary"
             )}>
                {deployment.status}
             </span>
          </div>
          <span className="text-[8px] font-medium text-muted-foreground uppercase">{formatDistanceToNow(new Date(deployment.initiatedAt))} ago</span>
       </div>
       
       <div className="flex flex-col gap-1">
          <span className="text-xs font-black text-foreground tracking-tight group-hover:text-primary transition-colors">
            {deployment.tenant?.name} Update
          </span>
          <span className="text-[10px] text-muted-foreground font-mono truncate">Version: {deployment.version}</span>
       </div>
       
       <div className="flex items-center justify-between pt-1 opacity-60 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-1.5 ">
             <div className="w-4 h-4 bg-muted rounded-full flex items-center justify-center text-[7px] font-bold uppercase">
                {deployment.initiatedBy?.charAt(0) || "S"}
             </div>
             <span className="text-[9px] font-bold text-muted-foreground">Admin Sync</span>
          </div>
          <ExternalLink size={12} className="text-muted-foreground hover:text-primary cursor-pointer" />
       </div>
    </div>
  );
}

function QuickActionCard({ icon: Icon, title, description, href, btnLabel, color }: any) {
  return (
    <div className="bg-card border border-border p-6 rounded-sm flex flex-col items-start gap-4 hover:shadow-2xl hover:-translate-y-1.5 transition-all group relative overflow-hidden backdrop-blur-sm">
      <div className={cn("p-4 bg-muted rounded-sm mb-2 group-hover:bg-card transition-colors relative z-10", color)}>
        <Icon className="group-hover:scale-125 transition-transform duration-500" size={32} />
      </div>
      <h3 className="text-xl font-black text-foreground tracking-tight z-10">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed flex-1 z-10 opacity-80">
        {description}
      </p>
      <Link href={href} className="w-full z-10 pt-2">
        <div className="w-full bg-muted group-hover:bg-primary group-hover:text-white border border-border group-hover:border-primary px-4 py-3 text-[10px] font-black uppercase tracking-widest flex items-center justify-between transition-all rounded-[1px] shadow-sm">
          <span>{btnLabel}</span>
          <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all duration-300" />
        </div>
      </Link>
      
      {/* Decorative gradient background pulse */}
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
    </div>
  );
}
