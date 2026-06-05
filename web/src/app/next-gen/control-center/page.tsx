"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, 
  Building2, 
  Users, 
  Server, 
  Lock, 
  Settings, 
  Layers, 
  Zap, 
  Activity, 
  ChevronRight, 
  RefreshCcw,
  Globe,
  Database,
  Search,
  HardDrive,
  CreditCard,
  Briefcase,
  HeartPulse
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import Link from "next/link";
import { getRegistryStats } from "@/app/actions/discoveryActions";
import { getLicensingMetrics } from "@/app/actions/quotaActions";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";

export default function ControlCenterPage() {
  const { activeCustomer } = useAppContext();
  const [stats, setStats] = useState<any>(null);
  const [licensing, setLicensing] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const [s, l] = await Promise.all([
      getRegistryStats(),
      activeCustomer?.id ? getLicensingMetrics(activeCustomer.id) : Promise.resolve([])
    ]);
    setStats(s);
    setLicensing(l);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [activeCustomer]);

  const modules = [
    { 
      title: "Resource Discovery",
      desc: "Global searchable asset inventory. Every entity, one registry.",
      icon: Search,
      href: "/next-gen/control-center/discovery",
      color: "text-primary",
      bg: "bg-primary/10",
      stats: `${stats?.total || 0} Assets Registered`
    },
    {
      title: "Audit Chronicle",
      desc: "High-fidelity security event trail. SIEM-ready compliance log.",
      icon: Shield,
      href: "/next-gen/control-center/audit",
      color: "text-foreground",
      bg: "bg-muted/60",
      stats: "Live Sync Active"
    },
    {
      title: "Tenant Governance",
      desc: "Multi-pod organization provisioning & environment lifecycles.",
      icon: Building2,
      href: "/next-gen/admin/organization/tenants",
      color: "text-foreground",
      bg: "bg-muted/60",
      stats: `${stats?.tenants || 0} Organizations`
    },
    {
      title: "Licensing & Capacity",
      desc: "Sovereign quota enforcement & resource discipline board.",
      icon: CreditCard,
      href: "/next-gen/control-center/licensing",
      color: "text-foreground",
      bg: "bg-muted/60",
      stats: activeCustomer?.planType ? `${activeCustomer.planType} Tier` : "Standard Tier"
    },
    {
      title: "Service Monitoring",
      desc: "Live service inventory, health telemetry, tenant isolation, and runtime controls.",
      icon: HeartPulse,
      href: "/next-gen/control-center/services",
      color: "text-foreground",
      bg: "bg-muted/60",
      stats: `${stats?.tenants || 0} Tenant Surfaces`
    },
  ];

  return (
    <div className="min-h-full space-y-10 animate-in fade-in duration-700 h-full">
      
      {/* Header Area */}
      <div className="flex items-start justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3 group">
             <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/5 group-hover:scale-110 transition-all duration-500">
                <Shield size={24} strokeWidth={2.5} />
             </div>
             <div>
                <h1 className="text-4xl font-black tracking-tighter text-foreground mb-1">Platform Control Center</h1>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-primary">
                   <Activity size={12} className="animate-pulse" />
                   <span>Enterprise OS Sovereign Cockpit</span>
                </div>
             </div>
          </div>
          <p className="text-muted-foreground text-sm font-medium max-w-2xl leading-relaxed uppercase tracking-tight opacity-70">
            The heart of the Enterprise OS. Manage tenants, enforce security policies, 
            and orchestrate VM infrastructure from a centralized command plane.
          </p>
        </div>
        
        <div className="flex gap-3">
           <button 
             onClick={fetchData}
             className="w-12 h-12 rounded-sm bg-muted flex items-center justify-center border border-border hover:border-primary/40 hover:text-primary transition-all group"
           >
              <RefreshCcw size={18} className={cn("transition-all duration-500", loading && "animate-spin")} />
           </button>
           <button className="px-8 py-3 bg-primary text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 transition-all">
              Security Override
           </button>
        </div>
      </div>

      {/* Main Command Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6">
        {modules.map((mod, i) => (
          <motion.div
            key={mod.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Link 
              href={mod.href}
              className="group flex flex-col h-72 bg-card/40 border border-border rounded-sm p-8 hover:border-primary/50 transition-all relative overflow-hidden shadow-sm"
            >
              <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-700 pointer-events-none text-foreground">
                 <IconWrapper icon={mod.icon} size={140} />
              </div>
              
              <div className={cn("w-14 h-14 rounded-sm flex items-center justify-center mb-10 border border-transparent group-hover:border-current transition-all duration-500", mod.bg, mod.color)}>
                 <IconWrapper icon={mod.icon} size={28} />
              </div>
              
              <div className="mt-auto space-y-2 relative z-10">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black tracking-tight group-hover:text-primary transition-colors">{mod.title}</h3>
                    <ChevronRight size={16} className="text-muted-foreground opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0 transition-all" />
                 </div>
                 <p className="text-[10px] font-medium text-muted-foreground leading-relaxed uppercase tracking-widest opacity-60 h-8 line-clamp-2">{mod.desc}</p>
                 
                 <div className="pt-4 flex items-center justify-between border-t border-border/40 mt-4">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">{mod.stats}</span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                 </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: Infrastructure Radar */}
        <div className="col-span-12 lg:col-span-8 bg-card/40 border border-border rounded-sm p-10 flex flex-col gap-10">
           <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                 <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Server size={14} className="text-primary" />
                    Infrastructure Radar
                 </h4>
                 <p className="text-[10px] font-medium text-muted-foreground uppercase">Real-time health of global execution pods</p>
              </div>
              <span className="text-[10px] font-black text-primary px-4 py-1.5 bg-primary/10 border border-primary/20 rounded-full uppercase tracking-widest">Awaiting Command</span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <StatCard 
                 label="Platform Registry" 
                 value={stats?.total || "..."} 
                 sub="Assets Synchronized" 
                 icon={Layers} 
                 trend="+12 since boot" 
              />
              <StatCard 
                 label="Deployment Pods" 
                 value="1,042" 
                 sub="VM Execution Capacity" 
                 icon={HardDrive} 
              />
              <StatCard 
                 label="Security Perimeter" 
                 value="Normal" 
                 sub="Threat Response: Active" 
                 icon={Lock} 
                 color="text-primary"
              />
           </div>

           <div className="mt-4 p-6 bg-primary/5 border border-primary/20 rounded-sm flex items-center gap-6 group hover:bg-primary/[0.08] transition-all">
              <div className="p-3 bg-white rounded-sm border border-primary/20 group-hover:scale-110 transition-all duration-500">
                 <Zap size={24} className="text-primary" />
              </div>
              <div className="flex-1 space-y-1">
                 <h5 className="text-xs font-black tracking-tight uppercase leading-none">Resource Saturation Notice</h5>
                 <p className="text-[10px] font-medium text-muted-foreground leading-relaxed uppercase opacity-70">
                    Infrastructure clusters are operating within optimal latency thresholds. All Regional SQL containers are in high-availability sync.
                 </p>
              </div>
              <button className="px-6 py-2 border border-primary/40 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all whitespace-nowrap">
                 View Topology
              </button>
           </div>
        </div>

        {/* Right: Security & Quota Snapshot */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
           <div className="bg-card/40 border border-border rounded-sm p-10 flex flex-col gap-6 flex-1">
              <div className="flex items-center justify-between">
                 <h4 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <Database size={14} className="text-primary" />
                    Quota Saturation
                 </h4>
              </div>
              
              <div className="space-y-6">
                 {licensing.slice(0, 3).map((m) => (
                    <div key={m.type} className="space-y-2">
                       <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest">
                          <span className="text-muted-foreground">{m.label}</span>
                          <span className={cn(m.percentage > 80 ? "text-destructive" : "text-foreground")}>{m.count} / {m.limit}</span>
                       </div>
                       <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${m.percentage}%` }}
                            className={cn(
                              "h-full transition-all duration-1000",
                              m.percentage > 80 ? "bg-destructive" : "bg-primary"
                            )}
                          />
                       </div>
                    </div>
                 ))}
                 {licensing.length === 0 && <p className="text-[11px] text-muted-foreground uppercase text-center py-10">Select customer to view capacity</p>}
              </div>

              <Link 
                href="/next-gen/control-center/licensing"
                className="pt-6 border-t border-border flex items-center justify-between group mt-auto"
              >
                 <span className="text-[10px] font-black uppercase tracking-widest text-primary">License Manager</span>
                 <ChevronRight size={14} className="text-primary translate-x-0 group-hover:translate-x-2 transition-all" />
              </Link>
           </div>

           <div className="p-10 bg-indigo-900 text-white rounded-sm shadow-2xl relative overflow-hidden flex flex-col gap-4">
              <Globe size={80} className="absolute -bottom-4 -right-4 opacity-10" />
              <div className="space-y-1">
                 <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-300">Platform Identity</span>
                 <h4 className="text-2xl font-black tracking-tighter leading-none">Sovereign OS</h4>
              </div>
              <p className="text-[10px] font-medium leading-relaxed uppercase opacity-70">
                 Platform registry currently governing {stats?.tenants || 0} organizations across 12 distributed data pods.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, trend, color = "text-foreground" }: any) {
  return (
    <div className="space-y-4 group">
       <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-sm bg-muted flex items-center justify-center text-muted-foreground border border-border group-hover:border-primary/40 group-hover:text-primary transition-all duration-500">
             <Icon size={20} />
          </div>
          <div className="flex flex-col">
             <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em]">{label}</span>
             {trend && <span className="text-[8px] font-bold text-primary uppercase">{trend}</span>}
          </div>
       </div>
       <div className="space-y-1">
          <p className={cn("text-5xl font-black tracking-tighter", color)}>{value}</p>
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-60">{sub}</p>
       </div>
    </div>
  );
}
