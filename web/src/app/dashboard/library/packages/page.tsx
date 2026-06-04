"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Package, 
  Search, 
  Download, 
  Settings, 
  ShieldCheck, 
  Layers, 
  Plus, 
  Info,
  ExternalLink,
  Code
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconWrapper } from "@/components/ui/icon-wrapper";

const MOCK_PACKAGES = [
  { id: '1', name: 'Standard Excel Utilities', provider: 'Next Gen Core', downloads: '1.2k', type: 'Integration', status: 'Certified', color: 'text-green-500' },
  { id: '2', name: 'SAP GUI Bridge', provider: 'Enterprise Labs', downloads: '840', type: 'Connector', status: 'Certified', color: 'text-blue-500' },
  { id: '3', name: 'OpenAI GPT-4o Wrapper', provider: 'AI Hub', downloads: '3.4k', type: 'Cognitive', status: 'Community', color: 'text-purple-500' },
  { id: '4', name: 'Slack Webhook Pro', provider: 'Communication', downloads: '2.1k', type: 'Messaging', status: 'Certified', color: 'text-orange-500' },
  { id: '5', name: 'PostgreSQL Connectivity Kit', provider: 'Data Services', downloads: '950', type: 'Database', status: 'Stable', color: 'text-indigo-500' },
  { id: '6', name: 'Browser Event Capture', provider: 'Recorder Engine', downloads: '5.2k', type: 'Core', status: 'Internal', color: 'text-rose-500' },
];

export default function PackagesHubPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_PACKAGES.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 p-12 max-w-7xl mx-auto min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <div className="p-3 rounded-sm bg-primary/10 border border-primary/20 shadow-inner">
               <IconWrapper icon={Package} size={32} className="text-primary" />
             </div>
             <div className="flex flex-col">
               <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                 Component inventory
               </h1>
               <p className="text-muted-foreground font-medium">Manage reusable automation modules and external global connectors.</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search modules..." 
                className="pl-10 h-12 w-[300px] rounded-sm border-border bg-card/20 backdrop-blur-xl focus:ring-4 focus:ring-primary/10 transition-all"
              />
           </div>
           <Button variant="outline" className="h-12 rounded-sm border-border bg-card/20 backdrop-blur-xl hover:bg-muted font-bold px-6">
              <Settings className="w-4 h-4 mr-2" />
              Configure Sources
           </Button>
        </div>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((pkg, idx) => (
          <motion.div
            key={pkg.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="group relative flex flex-col rounded-sm border-border bg-card/30 backdrop-blur-3xl p-8 hover:shadow-2xl hover:border-primary/20 transition-all overflow-hidden h-full">
               <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-10 ${pkg.color.replace('text', 'bg')}`} />
               
               <div className="flex items-start justify-between mb-6 relative z-10">
                 <div className={`p-4 rounded-sm bg-background dark:bg-black/40 border border-border shadow-inner group-hover:border-primary/40 transition-all`}>
                    <IconWrapper icon={pkg.type === 'Cognitive' ? Code : Layers} size={28} className={pkg.color} />
                 </div>
                 <Badge variant="outline" className={`h-6 text-[9px] font-black uppercase tracking-widest rounded-full border-none px-3 ${pkg.status === 'Certified' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-primary/10 text-primary'}`}>
                    {pkg.status}
                 </Badge>
               </div>

               <div className="flex flex-col gap-1 mb-6 relative z-10 transition-transform group-hover:translate-x-1 duration-300">
                  <h3 className="text-xl font-bold tracking-tight">{pkg.name}</h3>
                  <p className="text-xs text-muted-foreground font-semibold">Provided by {pkg.provider}</p>
               </div>

               <div className="flex items-center gap-6 py-5 border-y border-border/40 relative z-10">
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Usage</span>
                     <div className="flex items-center gap-1.5 font-bold text-sm">
                        <Download className="w-3.5 h-3.5 text-primary" />
                        {pkg.downloads}
                     </div>
                  </div>
                  <div className="w-px h-8 bg-border/40" />
                  <div className="flex flex-col gap-1">
                     <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-50">Category</span>
                     <span className="text-sm font-bold">{pkg.type}</span>
                  </div>
               </div>

               <div className="mt-auto flex items-center justify-between pt-6 relative z-10">
                  <Button variant="ghost" size="sm" className="rounded-sm px-4 hover:bg-muted font-bold text-muted-foreground">
                    <Info className="w-4 h-4 mr-2" />
                    Details
                  </Button>
                  <Button size="sm" className="rounded-sm font-bold bg-primary px-6 shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 transition-all">
                    Install
                  </Button>
               </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
