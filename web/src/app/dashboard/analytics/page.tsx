"use client";

import React from "react";
import { BrainCircuit, PiggyBank, BarChart4, Lightbulb, TrendingUp, DollarSign, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import Link from "next/link";

export default function AnalyticsPage() {
  const modules = [
    { title: "ROI Dashboard", desc: "Automation savings & cost vs benefit", icon: BarChart4, href: "/dashboard/analytics/roi", color: "bg-blue-600" },
    { title: "FinOps Console", desc: "VM, Queue & Bot runtime cost tracking", icon: PiggyBank, href: "/dashboard/analytics/finops", color: "bg-emerald-600" },
    { title: "AI Insights", desc: "Anomaly detection & failure prediction", icon: Lightbulb, href: "/dashboard/analytics/ai", color: "bg-amber-600" },
    { title: "Optimization Lab", desc: "Self-healing suggestions & tuning", icon: Zap, href: "/dashboard/analytics/optimize", color: "bg-purple-600" },
  ];

  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-sm bg-blue-500/20 flex items-center justify-center text-blue-500 border border-blue-500/30">
                <BrainCircuit size={22} />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight">AI + FinOps Analytics</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Business intelligence meets cost optimization. 
            Track real-world ROI, monitor infrastructure spend, and leverage AI to predict and prevent failures.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((mod, i) => (
          <motion.div key={mod.title} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
            <Link href={mod.href} className="flex flex-col h-full bg-white/5 border border-white/10 rounded-sm p-8 hover:bg-white/[0.08] transition-all group overflow-hidden relative">
              <div className={cn("w-14 h-14 rounded-sm flex items-center justify-center mb-6 text-white shadow-xl shadow-blue-500/10", mod.color)}>
                 <IconWrapper icon={mod.icon} size={28} />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{mod.title}</h3>
              <p className="text-sm text-muted-foreground">{mod.desc}</p>
              
              <div className="absolute top-[-10px] right-[-10px] opacity-[0.05] group-hover:opacity-[0.1] transition-all">
                  <IconWrapper icon={mod.icon} size={100} />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-sm p-8">
            <div className="flex items-center justify-between mb-8">
               <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Cumulative ROI (Current Fiscal)</h4>
               <span className="text-xs font-bold text-emerald-500 flex items-center gap-1"><TrendingUp size={14} /> +14.2% YoY</span>
            </div>
            <div className="h-48 flex items-end gap-3 px-4">
                {[20,35,45,60,55,80,95,85,100,110,120,140].map((v, i) => (
                  <div key={i} className="flex-1 bg-gradient-to-t from-primary/10 to-primary/40 rounded-t-lg transition-all hover:to-primary" style={{ height: `${v/2}%` }} />
                ))}
            </div>
            <div className="mt-6 flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-40">
               <span>Apr</span>
               <span>Mar</span>
            </div>
         </div>

         <div className="space-y-6">
            <AnalyticsCard title="Total Savings" value="$1.24M" icon={DollarSign} color="text-emerald-500" />
            <AnalyticsCard title="Anomaly Score" value="Low (12)" icon={BrainCircuit} color="text-primary" />
            <AnalyticsCard title="Idle Resource Cost" value="$420/mo" icon={PiggyBank} color="text-rose-500" />
         </div>
      </div>
    </div>
  );
}

const AnalyticsCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="p-6 bg-white/5 border border-white/10 rounded-sm flex flex-col gap-2">
     <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{title}</span>
        <Icon size={16} className={color} />
     </div>
     <p className="text-2xl font-black">{value}</p>
  </div>
);

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
