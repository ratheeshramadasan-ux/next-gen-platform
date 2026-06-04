"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  FolderOpen, 
  Search, 
  Filter, 
  Play, 
  MoreHorizontal, 
  Clock, 
  User, 
  Globe, 
  Trophy,
  Activity,
  Zap,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconWrapper } from "@/components/ui/icon-wrapper";

const MOCK_VERSION_HISTORY = [
  { id: '1', name: 'ERP_Extraction_v1', lastRun: '2 mins ago', steps: 12, author: 'Ratheesh', status: 'Healthy', color: 'bg-indigo-500' },
  { id: '2', name: 'Slack_Notification_Sync', lastRun: '1 hour ago', steps: 5, author: 'System Agent', status: 'Stable', color: 'bg-emerald-500' },
  { id: '3', name: 'Invoice_Parser_Pro', lastRun: 'Yesterday', steps: 24, author: 'Ratheesh', status: 'Warning', color: 'bg-amber-500' },
  { id: '4', name: 'Zendesk_Ticket_Router', lastRun: '2 days ago', steps: 8, author: 'Admin User', status: 'Healthy', color: 'bg-rose-500' },
  { id: '5', name: 'Azure_DevOps_Bridge', lastRun: '3 days ago', steps: 42, author: 'System Agent', status: 'Stable', color: 'bg-blue-500' },
  { id: '6', name: 'Salesforce_Lead_Gen', lastRun: 'Last Week', steps: 15, author: 'Ratheesh', status: 'Healthy', color: 'bg-violet-500' },
];

export default function RecordingsGalleryPage() {
  const [search, setSearch] = useState("");

  const filtered = MOCK_VERSION_HISTORY.filter(r => 
    r.name.toLowerCase().includes(search.toLowerCase()) || 
    r.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-10 p-12 max-w-7xl mx-auto min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
             <div className="p-3 rounded-sm bg-indigo-500/10 border border-indigo-500/20 shadow-inner">
               <IconWrapper icon={FolderOpen} size={32} className="text-indigo-500" />
             </div>
             <div className="flex flex-col">
               <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
                 Recordings hub
               </h1>
               <p className="text-muted-foreground font-medium">Manage and optimize your captured automation sessions.</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
           <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
              <Input 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search sessions..." 
                className="pl-10 h-12 w-[300px] rounded-sm border-border bg-card/20 backdrop-blur-xl focus:ring-4 focus:ring-primary/10 transition-all"
              />
           </div>
           <Button variant="outline" className="h-12 rounded-sm border-border bg-card/20 backdrop-blur-xl hover:bg-muted font-bold px-6">
              <Filter className="w-4 h-4 mr-2" />
              Filters
           </Button>
        </div>
      </div>

      {/* Stats Summary Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Total Capitalized', val: '124', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
           { label: 'Success Rate', val: '99.2%', icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
           { label: 'Optimization', val: 'Automatik', icon: Zap, color: 'text-indigo-500', bg: 'bg-indigo-500/10' }
         ].map((stat, i) => (
           <Card key={i} className="p-6 rounded-sm border-primary/5 bg-card/30 backdrop-blur-3xl flex items-center gap-6 group hover:border-primary/20 transition-all">
              <div className={`p-4 rounded-sm ${stat.bg} ${stat.color} transition-transform group-hover:scale-110`}>
                <IconWrapper icon={stat.icon} size={24} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                <span className="text-2xl font-black tracking-tighter">{stat.val}</span>
              </div>
           </Card>
         ))}
      </div>

      {/* Main Gallery Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map((item, idx) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="group flex flex-col rounded-sm overflow-hidden border-border bg-card/30 backdrop-blur-3xl h-full transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 hover:border-primary/20 hover:-translate-y-2 relative">
               {/* Accent Gradient */}
               <div className={`absolute top-0 right-0 w-32 h-32 blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity ${item.color}`} />
               
               <div className="p-8 flex flex-col gap-6 relative z-10 h-full">
                 <div className="flex items-start justify-between">
                    <div className={`w-14 h-14 rounded-sm flex items-center justify-center text-white shadow-lg ${item.color}`}>
                       <IconWrapper icon={item.steps > 20 ? Bot : Play} size={28} />
                    </div>
                    <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted">
                       <MoreHorizontal className="w-5 h-5" />
                    </Button>
                 </div>

                 <div className="flex flex-col gap-1">
                    <h3 className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors">{item.name}</h3>
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <User className="w-3 h-3" />
                       <span className="text-xs font-semibold">{item.author}</span>
                       <span className="text-[8px] opacity-30">•</span>
                       <Globe className="w-3 h-3" />
                       <span className="text-xs font-semibold">Global</span>
                    </div>
                 </div>

                 <div className="flex items-center gap-4 py-4 border-y border-border/40">
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Steps</span>
                       <span className="text-sm font-bold">{item.steps} Elements</span>
                    </div>
                    <div className="w-px h-8 bg-border/40 mx-2" />
                    <div className="flex flex-col gap-1">
                       <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Status</span>
                       <Badge variant="outline" className={`h-5 text-[9px] font-black rounded-full border-none px-2 ${item.status === 'Healthy' ? 'bg-emerald-500/10 text-emerald-600' : item.status === 'Stable' ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'}`}>
                          {item.status}
                       </Badge>
                    </div>
                 </div>

                 <div className="mt-auto flex items-center justify-between pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                       <Clock className="w-3.5 h-3.5" />
                       <span className="text-[10px] font-bold uppercase tracking-wider">{item.lastRun}</span>
                    </div>
                    <Button size="sm" className="rounded-sm font-bold bg-primary px-5 hover:scale-105 active:scale-95 transition-all">
                       Optimize Flow
                    </Button>
                 </div>
               </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
