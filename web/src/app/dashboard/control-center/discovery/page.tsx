import React from "react";
import { 
  Search, 
  Filter, 
  Layers, 
  Globe, 
  FolderTree, 
  Zap, 
  Box, 
  ArrowUpRight,
  ShieldCheck,
  History,
  Activity,
  ArrowRight
} from "lucide-react";
import { getAllResources, getRegistryStats } from "@/app/actions/discoveryActions";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default async function DiscoveryPage() {
  const [resources, stats] = await Promise.all([
    getAllResources(),
    getRegistryStats()
  ]);

  return (
    <div className="min-h-full space-y-8 animate-in slide-in-from-right duration-500 flex flex-col h-full overflow-hidden">
      
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 text-size-regular">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
             <Layers size={12} />
             <span>Platform Governance / Discovery Engine</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Enterprise Resource Registry</h1>
        </div>
        
        <div className="flex items-center gap-4">
           {/* Quick Stats bar */}
           <div className="flex items-center gap-6 px-6 py-3 bg-card border border-border rounded-sm shadow-sm">
              <Stat mini label="Tenants" value={stats.tenants} />
              <Stat mini label="Workspaces" value={stats.workspaces} />
              <Stat mini label="Projects" value={stats.projects} />
              <Stat mini label="Workflows" value={stats.workflows} />
           </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center justify-between bg-card/40 p-3 border border-border rounded-sm">
         <div className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input 
              placeholder="Search resource ID, name, or metadata..." 
              className="w-full bg-card border border-border pl-9 pr-4 py-2 text-xs font-bold focus:outline-none focus:ring-1 ring-primary/20 rounded-sm"
            />
         </div>
         <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 bg-card border border-border text-[10px] font-bold uppercase rounded-sm hover:shadow-sm transition-all focus:ring-1 ring-primary/20">
               <Filter size={12} />
               <span>Type Filter</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 bg-card border border-border text-[10px] font-bold uppercase rounded-sm hover:shadow-sm transition-all focus:ring-1 ring-primary/20">
               <Activity size={12} />
               <span>Status: Active</span>
            </button>
         </div>
      </div>

      {/* Main Registry Grid */}
      <div className="flex-1 bg-card border border-border rounded-sm overflow-hidden flex flex-col shadow-inner bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        <div className="overflow-y-auto flex-1 p-1">
          <table className="w-full text-left border-separate border-spacing-y-2 px-4">
            <thead>
              <tr className="text-[10px] font-black text-muted-foreground tracking-widest uppercase">
                <th className="px-4 py-3">Resource Asset</th>
                <th className="px-4 py-3">Type Identifier</th>
                <th className="px-4 py-3">Organization Context</th>
                <th className="px-4 py-3">Governance Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((res) => (
                <tr key={res.id} className="group bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all">
                  <td className="px-4 py-4 rounded-l-sm border-l border-y border-border group-hover:border-primary/40">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-sm flex items-center justify-center transition-all",
                        res.type === 'TENANT' ? "bg-blue-50 text-blue-600" :
                        res.type === 'WORKSPACE' ? "bg-indigo-50 text-indigo-600" :
                        res.type === 'STUDIO_WORKFLOW' ? "bg-amber-50 text-amber-600" :
                        res.type === 'IAM_ROLE' || res.type === 'IAM_GROUP' ? "bg-rose-50 text-rose-600" :
                        "bg-slate-50 text-slate-600"
                      )}>
                        <ResourceIcon type={res.type} />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold tracking-tight text-foreground">{res.name}</span>
                        <span className="text-[9px] font-mono text-muted-foreground uppercase">{res.id.split('-')[0]}... Registry Entry</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-y border-border group-hover:border-primary/40">
                    <span className="text-[10px] font-black px-2 py-1 bg-muted rounded-full uppercase tracking-tighter">
                      {res.type}
                    </span>
                  </td>
                  <td className="px-4 py-4 border-y border-border group-hover:border-primary/40">
                    <div className="flex items-center gap-2">
                       <Globe size={12} className="text-muted-foreground" />
                       <span className="text-xs font-medium">{res.tenantName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 border-y border-border group-hover:border-primary/40">
                    <div className="flex items-center gap-2">
                       <div className={cn("w-1.5 h-1.5 rounded-full", res.status === 'ACTIVE' ? "bg-emerald-500" : "bg-muted-foreground")} />
                       <span className="text-[10px] font-bold uppercase tracking-widest">{res.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 rounded-r-sm border-r border-y border-border text-right group-hover:border-primary/40">
                    <Link 
                      href={getResourceUrl(res.type, res.id)}
                      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase text-primary hover:underline"
                    >
                      <span>Manage Asset</span>
                      <ArrowUpRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {resources.length === 0 && (
             <div className="flex flex-col items-center justify-center p-24 text-center opacity-40 grayscale">
                <Box size={64} className="mb-4 text-muted-foreground" />
                <h3 className="text-lg font-black uppercase tracking-widest">Registry Depleted</h3>
                <p className="text-xs font-bold max-w-xs">No assets have been recorded in the platform resonance registry yet.</p>
             </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex items-center justify-between py-2 border-t border-border mt-4">
         <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase">
            <div className="flex items-center gap-1.5">
               <History size={12} />
               <span>Last Registry Scan: Just Now</span>
            </div>
            <div className="flex items-center gap-1.5">
               <ShieldCheck size={12} className="text-emerald-600" />
               <span>Registry Synchronized with PostgreSQL Hub</span>
            </div>
         </div>
         <Link href="/dashboard/control-center/audit" className="flex items-center gap-2 text-[10px] font-black uppercase text-primary hover:translate-x-1 transition-all">
            <span>View Detailed Audit Chronicle</span>
            <ArrowRight size={12} />
         </Link>
      </div>
    </div>
  );
}

function Stat({ label, value, mini }: any) {
  return (
    <div className="flex flex-col gap-0.5">
       <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">{label}</span>
       <span className="text-lg font-black leading-none">{value}</span>
    </div>
  );
}

function ResourceIcon({ type }: { type: string }) {
  switch (type) {
    case 'TENANT': return <Globe size={20} />;
    case 'WORKSPACE': return <Box size={20} />;
    case 'PROJECT': return <FolderTree size={20} />;
    case 'STUDIO_WORKFLOW': return <Zap size={20} />;
    case 'IAM_ROLE': return <Shield size={20} />;
    case 'IAM_GROUP': return <Plus size={20} />;
    default: return <Layers size={20} />;
  }
}

function getResourceUrl(type: string, id: string) {
  switch (type) {
    case 'TENANT': return '/dashboard/control-center/tenants';
    case 'WORKSPACE': return '/dashboard/admin/organization/folders';
    case 'PROJECT': return '/dashboard/workspaces';
    case 'STUDIO_WORKFLOW': return '/dashboard/studio';
    case 'IAM_ROLE':
    case 'IAM_GROUP': return '/dashboard/admin/access';
    default: return '/dashboard/control-center/discovery';
  }
}
