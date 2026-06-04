"use client";

import React from "react";
import { PackageSearch, Boxes, Gauge, Shield, Zap, LayoutGrid } from "lucide-react";
import { motion } from "framer-motion";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import Link from "next/link";

export default function TenantManagementPage() {
  const modules = [
    { title: "Feature Flags", desc: "Enable/disable modules per environment", icon: Zap, href: "/next-gen/tenant-management/features", color: "bg-amber-500" },
    { title: "Module Licensing", desc: "Manage quotas and entitlement tiers", icon: Shield, href: "/next-gen/tenant-management/licenses", color: "bg-blue-600" },
    { title: "Env Configuration", desc: "Region-specific overrides & settings", icon: Boxes, href: "/next-gen/tenant-management/config", color: "bg-indigo-600" },
    { title: "Usage Quotas", desc: "Set limits for runtime, API and storage", icon: Gauge, href: "/next-gen/tenant-management/quotas", color: "bg-rose-600" },
  ];

  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-sm bg-amber-500/20 flex items-center justify-center text-amber-500 border border-amber-500/30">
                <PackageSearch size={22} />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight">Tenant & Feature Management</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Product configuration layer. Control module availability, manage license entitlements, 
            and set performance quotas across all tenant deployments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((mod, i) => (
          <motion.div key={mod.title} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
            <Link href={mod.href} className="flex flex-col h-full bg-white/5 border border-white/10 rounded-sm p-8 hover:bg-white/[0.08] transition-all group">
              <div className={cn("w-14 h-14 rounded-sm flex items-center justify-center mb-6 text-white text-xl shadow-xl shadow-amber-500/10", mod.color)}>
                 <IconWrapper icon={mod.icon} size={28} />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{mod.title}</h3>
              <p className="text-sm text-muted-foreground">{mod.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-sm p-10">
         <div className="flex items-center justify-between mb-8">
            <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
               <LayoutGrid size={16} /> Global Module Status
            </h4>
         </div>
         
         <div className="space-y-6">
            <ModuleStatus name="Automation Studio" activeCount={124} status="Core" />
            <ModuleStatus name="AI Intelligence Hub" activeCount={42} status="Premium" />
            <ModuleStatus name="Governance Engine" activeCount={14} status="Enterprise" />
            <ModuleStatus name="FinOps Analytics" activeCount={8} status="Beta" />
         </div>
      </div>
    </div>
  );
}

const ModuleStatus = ({ name, activeCount, status }: any) => (
  <div className="flex items-center justify-between p-4 bg-white/5 rounded-sm border border-white/5 hover:bg-white/[0.07] transition-all cursor-pointer">
     <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center text-primary">
           <Boxes size={18} />
        </div>
        <div>
           <p className="text-sm font-bold">{name}</p>
           <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Status: {status}</p>
        </div>
     </div>
     <div className="text-right">
        <p className="text-lg font-black">{activeCount}</p>
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest leading-none">Active Tenants</p>
     </div>
  </div>
);

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
