"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Zap, 
  Search, 
  Clock, 
  ArrowUpRight, 
  GitBranch, 
  ShieldCheck, 
  FileJson,
  Plus,
  Rocket
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { useAppContext } from "@/lib/context";
import { getTenantsWorkflows } from "@/app/actions/workflowActions";

const MOCK_WORKFLOWS = [
  { id: '1', name: 'SAP Finance extraction', version: '2.4.0', engine: 'Playwright', lastSuccess: '10 mins ago', health: 99.8, steps: 14, category: 'Enterprise' },
  { id: '2', name: 'Azure AD User Provisioning', version: '1.2.1', engine: 'Selenium', lastSuccess: '2 hours ago', health: 85.5, steps: 8, category: 'IT Ops' },
  { id: '3', name: 'Monthly Payroll sync', version: '3.0.0', engine: 'Hybrid', lastSuccess: 'Yesterday', health: 100, steps: 32, category: 'HR' },
];

export default function WorkflowsHubPage() {
  const { activeTenant } = useAppContext();
  const [search, setSearch] = useState("");
  const [workflows, setWorkflows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      if (activeTenant) {
        const data = await getTenantsWorkflows(activeTenant.id);
        // Merge with mocks if empty for visual demo, or just show real
        setWorkflows(data.length > 0 ? data : MOCK_WORKFLOWS);
      } else {
        setWorkflows(MOCK_WORKFLOWS);
      }
      setLoading(false);
    };
    load();
  }, [activeTenant?.id]);

  const filtered = workflows.filter(w => 
    w.name.toLowerCase().includes(search.toLowerCase()) || 
    (w.category && w.category.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-10 p-12 max-w-7xl mx-auto min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <div className="p-3 rounded-sm bg-amber-500/10 border border-amber-500/20 shadow-inner">
               <IconWrapper icon={Zap} size={32} className="text-amber-500" />
             </div>
             <div className="flex flex-col">
               <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                 Logic gallery
               </h1>
               <p className="text-muted-foreground font-medium">Manage sophisticated automation paths and orchestration logic.</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search workflows..." 
                className="pl-10 h-12 w-[300px] rounded-sm border-border bg-card/20 backdrop-blur-xl focus:ring-4 focus:ring-primary/10 transition-all"
              />
           </div>
           <Button className="h-12 rounded-sm bg-primary hover:scale-105 active:scale-95 transition-all font-bold px-6">
              <Plus className="w-4 h-4 mr-2" />
              New Flow
           </Button>
        </div>
      </div>

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 gap-6">
        {filtered.map((wf, idx) => (
          <motion.div
            key={wf.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className="group relative overflow-hidden rounded-sm border-primary/5 bg-card/30 backdrop-blur-3xl p-8 hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all">
               {/* Background Glow */}
               <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[100px] -mr-32 -mt-32 opacity-0 group-hover:opacity-100 transition-opacity" />
               
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
                 <div className="flex items-center gap-6">
                    <div className="p-5 rounded-sm bg-background dark:bg-black/40 border border-border shadow-inner group-hover:border-primary/40 group-hover:scale-110 transition-all duration-500">
                       <IconWrapper icon={FileJson} size={28} className="text-primary" />
                    </div>
                    <div className="flex flex-col">
                       <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-bold tracking-tight">{wf.name}</h3>
                          <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest rounded-full bg-primary/5 border-primary/10 text-primary">{wf.category}</Badge>
                       </div>
                       <div className="flex items-center gap-4 text-muted-foreground">
                          <div className="flex items-center gap-1.5 font-semibold text-xs text-indigo-500">
                             <GitBranch className="w-3.5 h-3.5" />
                             {wf.version}
                          </div>
                          <span className="text-xs opacity-30">|</span>
                          <div className="flex items-center gap-1.5 text-xs font-medium">
                             <Rocket className="w-3.5 h-3.5" />
                             {wf.engine}
                          </div>
                       </div>
                    </div>
                 </div>

                 {/* Health & Metrics */}
                 <div className="flex flex-wrap items-center gap-8 md:gap-16">
                    <div className="flex flex-col gap-1">
                       <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Success Rate</span>
                       <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-border/40 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: 0 }}
                               animate={{ width: `${wf.health}%` }}
                               transition={{ duration: 1.5, delay: idx * 0.2 }}
                               className={`h-full ${wf.health > 95 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                             />
                          </div>
                          <span className="text-sm font-black">{wf.health}%</span>
                       </div>
                    </div>

                    <div className="flex flex-col gap-1">
                       <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Last Active</span>
                       <div className="flex items-center gap-2 text-foreground/80">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm font-bold">{wf.lastSuccess}</span>
                       </div>
                    </div>

                    <div className="flex items-center gap-3">
                       <Button variant="outline" className="rounded-sm border-border px-6 hover:bg-primary/5 hover:text-primary transition-all font-bold">Edit</Button>
                       <Button className="rounded-sm bg-foreground text-background font-bold px-6 shadow-xl shadow-foreground/5 hover:scale-105 transition-all">
                          Process Launch
                          <ArrowUpRight className="w-4 h-4 ml-2" />
                       </Button>
                    </div>
                 </div>
               </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
