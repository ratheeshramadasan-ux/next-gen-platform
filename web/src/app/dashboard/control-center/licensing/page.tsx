"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Zap, 
  BarChart3, 
  ArrowUpCircle, 
  Lock, 
  CheckCircle2, 
  AlertTriangle,
  Layers,
  Globe,
  Plus,
  RefreshCcw,
  Loader2,
  HardDrive,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { 
  getLicensingMetrics, 
  seedLicensingTiers, 
  updateCustomerTier 
} from "@/app/actions/quotaActions";
import { toast } from "sonner";

export default function LicensingPage() {
  const { activeCustomer } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([
    { name: "Community (Free)", code: "FREE", color: "text-slate-500", desc: "For exploratory automation." },
    { name: "Enterprise Core", code: "ENTERPRISE", color: "text-indigo-600", desc: "For scaling organizational pods." },
    { name: "Sovereign Ultimate", code: "SOVEREIGN", color: "text-primary", desc: "Unlimited power & governance." }
  ]);
  const [activePlan, setActivePlan] = useState("FREE");

  const fetchData = async () => {
    if (!activeCustomer?.id) return;
    setLoading(true);
    await seedLicensingTiers(); // Ensure plans exist
    const m = await getLicensingMetrics(activeCustomer.id);
    setMetrics(m);
    setActivePlan(activeCustomer.planType || "FREE");
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeCustomer]);

  const handleUpgrade = async (planCode: string) => {
    if (!activeCustomer?.id) return;
    const res = await updateCustomerTier(activeCustomer.id, planCode);
    if (res.success) {
      toast.success(`Infrastructure upgraded to ${planCode} Tier`);
      fetchData();
    } else {
      toast.error(res.error);
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
      
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex flex-col gap-1 text-size-regular">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
             <ShieldCheck size={12} />
             <span>Control Center / Licensing & Quotas</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Sovereign Capacity Hub</h1>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-1 opacity-70">Enforcing Resource Discipline & Multi-Tenant Boundaries</p>
        </div>

        <button 
          onClick={fetchData}
          className="p-2.5 rounded-sm border border-border hover:border-primary transition-all group"
        >
          <RefreshCcw size={16} className="text-muted-foreground group-hover:text-primary" />
        </button>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
        
        {/* Left: Consumption Board */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8 overflow-y-auto pr-4 custom-scrollbar">
           
           {/* Active Plan Card */}
           <div className="p-8 bg-card border border-border rounded-sm shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700 pointer-events-none text-foreground">
                  <ShieldCheck size={160} />
               </div>
              
              <div className="relative z-10 space-y-6">
                 <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Current Deployment Tier</span>
                    <h2 className="text-4xl font-black tracking-tighter flex items-center gap-3">
                       {plans.find(p => p.code === activePlan)?.name}
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mt-2" />
                    </h2>
                 </div>
                 
                 <div className="flex items-center gap-6">
                    <MetricMini label="Global Registry Status" value="Active" color="text-emerald-600" />
                    <MetricMini label="SLA Commitment" value="99.99% Hardware" color="text-muted-foreground" />
                    <MetricMini label="Quota Policy" value="Hard Enforcement" color="text-amber-600" />
                 </div>
              </div>
           </div>

           {/* Resource Usage Bars */}
           <div className="grid grid-cols-2 gap-6">
              {metrics.map((m) => (
                <div key={m.type} className="bg-card/40 border border-border p-6 rounded-sm space-y-4 hover:border-primary/40 transition-all shadow-sm">
                   <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <div className="p-2 bg-muted rounded-sm text-muted-foreground">
                            {m.type === 'TENANT' ? <Globe size={18} /> : 
                             m.type === 'PROJECT' ? <Layers size={18} /> :
                             m.type === 'STUDIO_WORKFLOW' ? <Zap size={18} /> : <ShieldCheck size={18} />}
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{m.label}</span>
                            <span className="text-xs font-bold">{m.count} <span className="opacity-40">/ {m.limit}</span></span>
                         </div>
                      </div>
                      <span className={cn(
                        "text-xs font-black",
                        m.percentage > 90 ? "text-rose-500" : m.percentage > 70 ? "text-amber-500" : "text-emerald-500"
                      )}>
                         {m.percentage}%
                      </span>
                   </div>
                   
                   <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-1000",
                          m.percentage > 90 ? "bg-rose-500" : m.percentage > 70 ? "bg-amber-500" : "bg-primary"
                        )}
                        style={{ width: `${m.percentage}%` }}
                      />
                   </div>
                </div>
              ))}
           </div>

           {/* Infrastructure Health (Visual Only) */}
           <div className="p-6 bg-emerald-50/40 border border-emerald-100 rounded-sm flex items-center gap-6">
              <div className="flex items-center gap-3 pr-6 border-r border-emerald-100">
                 <HardDrive size={24} className="text-emerald-600" />
                 <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-emerald-900 tracking-widest">Pod Utilization</span>
                    <span className="text-sm font-black text-emerald-700 leading-none">12.4% Average</span>
                 </div>
              </div>
              <div className="flex-1 flex items-center gap-4">
                 <Activity size={16} className="text-emerald-500 shrink-0" />
                 <p className="text-[10px] font-medium text-emerald-800 uppercase leading-relaxed">Infrastructure clusters are operating within optimal latency thresholds. Registry replication synchronous across all pods.</p>
              </div>
           </div>
        </div>

        {/* Right: Plan Upgrades */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-4 custom-scrollbar">
           
           <div className="flex flex-col gap-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                 <ArrowUpCircle size={14} className="text-primary" />
                 Platform Tiers
              </h3>
              
              <div className="space-y-4">
                 {plans.map((p) => (
                    <div 
                      key={p.code} 
                      className={cn(
                        "p-6 border rounded-sm transition-all relative group overflow-hidden cursor-pointer",
                        activePlan === p.code 
                          ? "bg-primary/5 border-primary shadow-lg" 
                          : "bg-card/40 border-border hover:border-primary/40"
                      )}
                      onClick={() => handleUpgrade(p.code)}
                    >
                       {activePlan === p.code && (
                         <div className="absolute top-0 right-0 bg-primary text-white p-1 rounded-bl-sm">
                            <CheckCircle2 size={12} />
                         </div>
                       )}

                       <div className="space-y-4 relative z-10">
                          <div className="space-y-1">
                             <div className={cn("text-[8px] font-black uppercase tracking-widest leading-none", p.color)}>Licensing Pod</div>
                             <h4 className="text-lg font-black tracking-tight leading-none uppercase">{p.name}</h4>
                          </div>
                          <p className="text-[10px] font-medium text-muted-foreground leading-relaxed uppercase">{p.desc}</p>
                          
                          {activePlan !== p.code ? (
                             <button className="w-full py-2 bg-muted text-foreground p-[1.5px] rounded-sm group-hover:bg-primary group-hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">
                                Authorize Upgrade
                             </button>
                          ) : (
                             <div className="flex items-center gap-2 text-emerald-600">
                                <CheckCircle2 size={14} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Currently Active</span>
                             </div>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </div>

           {/* Security Warning */}
           <div className="p-6 bg-amber-50 border border-amber-100 rounded-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-700">
                 <AlertTriangle size={16} />
                 <span className="text-xs font-black uppercase tracking-widest tracking-[0.1em]">Enforcement Notice</span>
              </div>
              <p className="text-[10px] font-medium text-amber-800 leading-relaxed uppercase">
                 The platform enforces a strict hard-limit policy. Once capacity is reached, new resource provisioning will be rejected by the registry to preserve pod performance.
              </p>
           </div>

           {/* Policy Hub Docs */}
           <div className="p-6 bg-slate-50 border border-slate-200 rounded-sm">
              <div className="flex items-center justify-between mb-4">
                 <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Governance Policy</span>
                 <Lock size={12} className="text-slate-400" />
              </div>
              <ul className="space-y-2">
                 <PolicyItem label="30-Day Audit Retention" />
                 <PolicyItem label="Regional Data Sovereignty" />
                 <PolicyItem label="Enterprise IAM Mapping" />
                 <PolicyItem label="Hard Quota Enforcement" />
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
}

function MetricMini({ label, value, color }: { label: string; value: string; color: string }) {
   return (
      <div className="flex flex-col">
         <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none">{label}</span>
         <span className={cn("text-xs font-bold leading-none mt-1.5", color)}>{value}</span>
      </div>
   );
}

function PolicyItem({ label }: { label: string }) {
   return (
      <li className="flex items-center gap-2">
         <div className="w-1 h-1 rounded-full bg-slate-300" />
         <span className="text-[9px] font-black text-slate-600 uppercase tracking-tighter">{label}</span>
      </li>
   );
}
