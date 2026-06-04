"use client";

import React from "react";
import { LayoutDashboard, ScrollText, Binary, Bell, Globe, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import Link from "next/link";

export default function MonitoringPage() {
  const modules = [
    { title: "Live System", desc: "Real-time NOC view of fleet health", icon: Globe, href: "/next-gen/monitoring/live", color: "bg-emerald-600" },
    { title: "Logs Explorer", desc: "Global audit & execution log search", icon: ScrollText, href: "/next-gen/monitoring/logs", color: "bg-blue-600" },
    { title: "Metrics & SLAs", desc: "Success rates & compliance tracking", icon: BarChart3, href: "/next-gen/monitoring/metrics", color: "bg-purple-600" },
    { title: "Alert Center", desc: "Incident response & webhook history", icon: Bell, href: "/next-gen/monitoring/alerts", color: "bg-rose-600" },
  ];

  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-sm bg-emerald-500/20 flex items-center justify-center text-emerald-500 border border-emerald-500/30">
                <LayoutDashboard size={22} />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight">Monitoring & NOC</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Unified observability for the entire enterprise. 
            Real-time system health, deep log exploration, and automated incident alerting.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((mod, i) => (
          <motion.div key={mod.title} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
            <Link href={mod.href} className="flex flex-col h-full bg-white/5 border border-white/10 rounded-sm p-8 hover:bg-white/[0.08] transition-all group relative overflow-hidden">
              <div className={cn("w-14 h-14 rounded-sm flex items-center justify-center mb-6 text-white text-xl", mod.color)}>
                 <IconWrapper icon={mod.icon} size={28} />
              </div>
              <h3 className="text-xl font-bold mb-2">{mod.title}</h3>
              <p className="text-sm text-muted-foreground">{mod.desc}</p>
              <div className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] group-hover:opacity-[0.07] transition-all">
                 <IconWrapper icon={mod.icon} size={120} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* NOC Style Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
         <NocTile label="API Latency" value="24ms" status="Excellent" />
         <NocTile label="Worker Memory" value="78%" status="Warning" color="text-amber-500" />
         <NocTile label="Queue Pressure" value="Low" status="Stable" />
         <NocTile label="Secure Trust" value="99.9%" status="Verified" color="text-emerald-400" />
         <NocTile label="Total Errors (1h)" value="12" status="Normal" />
      </div>

      <div className="bg-black/40 border border-white/5 rounded-sm p-8 font-mono text-xs overflow-hidden">
         <div className="flex items-center justify-between mb-4">
            <span className="text-muted-foreground flex items-center gap-2"><Binary size={14} /> LIVE_SECURITY_STREAM</span>
            <span className="text-emerald-500 animate-pulse">● MTLS_ENFORCED</span>
         </div>
         <div className="space-y-1 text-muted-foreground lowercase">
            <p><span className="text-emerald-500">[18:04:01]</span> info [sec] mTLS handshake verified: vm-nyc-04 (sha256:7f4d...)</p>
            <p><span className="text-blue-400">[18:04:12]</span> info [pki] tenant intermediate ca rotation successful: sandbox_us_east</p>
            <p><span className="text-emerald-500">[18:04:15]</span> info [auth] identity context bound: tenant:prod_customer_a (scope:root)</p>
            <p><span className="text-rose-400">[18:04:22]</span> warn [sec] block: unauthorized vm attempted activation (ip: 192.168.1.104)</p>
         </div>
      </div>
    </div>
  );
}

const NocTile = ({ label, value, status, color = "text-emerald-500" }: any) => (
  <div className="bg-white/5 border border-white/10 rounded-sm p-6 space-y-2">
     <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
     <p className="text-2xl font-black leading-none">{value}</p>
     <div className="flex items-center gap-1.5">
        <div className={cn("w-1.5 h-1.5 rounded-full", color.replace('text-', 'bg-'))} />
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", color)}>{status}</span>
     </div>
  </div>
);

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
