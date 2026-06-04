"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Play, 
  RotateCcw,
  LayoutGrid,
  List,
  ChevronRight,
  Database,
  ArrowUpRight,
  Sparkles,
  Zap,
  Shield,
  Activity,
  Users,
  Globe,
  User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QueueBuilder } from "./QueueBuilder";
import { TransactionGrid } from "./TransactionGrid";

export function QueueManager({ projectId, mode = "project" }: { projectId?: string | null, mode?: "project" | "reporting" }) {
  const [view, setView] = useState<"dashboard" | "builder" | "transactions" | "list">("dashboard");
  const [selectedQueue, setSelectedQueue] = useState<any>(null);

  // In a real app, we would fetch queues filtered by projectId
  const projectQueues: any[] = [];



  if (view === "builder") {
    return <QueueBuilder onCancel={() => setView("dashboard")} onSave={() => setView("dashboard")} />;
  }

  if (view === "transactions") {
    return (
      <div className="w-full h-full flex flex-col">
         <div className="px-8 py-4 border-b border-border/40 flex items-center justify-between bg-card/20 backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-4">
               <Button variant="ghost" size="icon" onClick={() => setView("dashboard")} className="h-8 w-8 rounded-full hover:bg-foreground/5">
                  <ChevronRight size={16} className="rotate-180" />
               </Button>
               <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                     <Database size={16} className="text-primary" />
                  </div>
                  <div className="space-y-0.5">
                     <h3 className="text-sm font-bold text-foreground">{selectedQueue?.name || "Queue Transactions"}</h3>
                     <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Real-time work item monitor</p>
                  </div>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-tighter border border-primary/20">
                  Healthy
               </div>
            </div>
         </div>
         <div className="flex-1 overflow-hidden">
            <TransactionGrid queue={selectedQueue} />
         </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col bg-background/50 font-sans animate-in fade-in duration-500">
      {/* Header */}
      <div className="px-8 py-6 border-b border-border/40 shrink-0 flex items-center justify-between bg-card/20 backdrop-blur-xl">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
               <Clock className="text-primary" size={20} />
            </div>
            {mode === "reporting" ? "Enterprise Queue Analytics" : "Project Queues"}
          </h2>
          <p className="text-xs font-medium text-muted-foreground/60 ml-13">
            {mode === "reporting" ? "Cross-project performance and SLA tracking." : "Manage specific transaction flows for this project."}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <div className="flex items-center bg-muted/20 rounded-sm p-1 border border-border/20 mr-2">
              <Button 
                onClick={() => setView("dashboard")}
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 rounded-lg px-4 gap-2 text-xs font-bold",
                  view === "dashboard" ? "bg-card shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground"
                )}
              >
                <LayoutGrid size={14} />
                Dashboard
              </Button>
              <Button 
                onClick={() => setView("list")}
                variant="ghost" 
                size="sm" 
                className={cn(
                  "h-8 rounded-lg px-4 gap-2 text-xs font-bold",
                  view === "list" ? "bg-card shadow-sm border border-border/10" : "text-muted-foreground/60 hover:text-foreground"
                )}
              >
                <List size={14} />
                All Queues
              </Button>
           </div>
           <Button 
            onClick={() => setView("builder")}
            className="h-10 px-5 gap-2 bg-primary text-white font-bold rounded-sm shadow-lg shadow-primary/20 hover:scale-[1.02] transition-all"
           >
             <Plus size={16} />
             Create New Queue
           </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-8 bg-muted/10">
        
        {view === "dashboard" && (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: "Active Transactions", value: projectQueues.length > 0 ? "1,284" : "0", change: "+0%", color: "text-primary", icon: Activity },
                { label: "SLA Breaches", value: projectQueues.length > 0 ? "24" : "0", change: "-0%", color: "text-primary", icon: AlertCircle },
                { label: "Avg Processing Time", value: projectQueues.length > 0 ? "4.2s" : "0s", change: "-0s", color: "text-primary", icon: Zap },
                { label: "Success Rate", value: projectQueues.length > 0 ? "98.2%" : "0%", change: "+0%", color: "text-primary", icon: CheckCircle2 },
              ].map((stat, i) => (
                <div key={i} className="bg-card border border-border/60 shadow-2xl p-6 rounded-sm transition-all hover:border-primary/20 hover:shadow-primary/5 group">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("w-10 h-10 rounded-sm flex items-center justify-center bg-background border border-border/10 group-hover:scale-110 transition-transform", stat.color)}>
                      <stat.icon size={20} />
                    </div>
                    <div className={cn("text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-background border border-border/10", "text-muted-foreground/40")}>
                      {stat.change}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{stat.label}</p>
                    <h3 className="text-3xl font-black tracking-tight text-foreground/80">{stat.value}</h3>
                  </div>
                </div>
              ))}
            </div>

            {/* Reporting Mode specific Chart */}
            {mode === "reporting" && (
              <div className="bg-card border border-border/60 p-8 rounded-sm shadow-2xl space-y-6">
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
                          <Activity size={18} className="text-primary" />
                       </div>
                       <div className="space-y-0.5">
                          <h3 className="text-sm font-bold text-foreground">Performance Trends</h3>
                          <p className="text-[10px] font-bold text-foreground uppercase tracking-widest">Global Overview across all queues</p>
                       </div>
                    </div>
                 </div>
                 <div className="h-48 w-full flex items-center justify-center border border-dashed border-border/20 rounded-2xl">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Aggregated performance data will appear here</p>
                 </div>
              </div>
            )}
          </>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <h3 className="text-sm font-black uppercase tracking-widest text-foreground ml-2">
               {mode === "reporting" ? "Queue Health Monitor" : "Project Queues"}
             </h3>
             <div className="flex items-center gap-2">
               <div className="relative w-64">
                 <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                 <Input placeholder="Search queues..." className="h-9 rounded-sm bg-card/40 border-border/20 pl-10 text-xs" />
               </div>
               <Button variant="outline" size="sm" className="h-9 rounded-sm gap-2 border-border/40 bg-card/40 font-bold text-xs">
                 <Filter size={14} />
                 Filter
               </Button>
             </div>
          </div>

          {view === "list" ? (
            <div className="bg-card/40 border border-border/40 rounded-sm overflow-hidden animate-in slide-in-from-bottom-4 duration-500 shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                     <thead>
                        <tr className="bg-muted/50 text-[9px] font-black uppercase tracking-[0.2em] text-foreground">
                           <th className="py-2.5 pl-6 text-left font-extrabold">Queue Name</th>
                           <th className="py-2.5 text-left font-extrabold">Operational Status</th>
                           <th className="py-2.5 text-left font-extrabold">Context / Version</th>
                           <th className="py-2.5 pr-6 text-right font-extrabold">Actions</th>
                        </tr>
                     </thead>
                     <tbody>
                        {projectQueues.map((queue, i) => (
                           <tr 
                              key={i} 
                              onClick={() => {
                                 setSelectedQueue(queue);
                                 setView("transactions");
                              }}
                              className="group border-b border-border/10 hover:bg-muted/30 transition-colors cursor-pointer last:border-0"
                           >
                              <td className="py-4 pl-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-background border border-border/20 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                                       <queue.icon size={18} className="text-foreground/60" />
                                    </div>
                                    <div className="flex flex-col">
                                       <div className="flex items-center gap-2">
                                          <span className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors tracking-tight">{queue.name}</span>
                                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500/40" />
                                       </div>
                                       <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/30">{queue.category} • {queue.type}</span>
                                    </div>
                                 </div>
                              </td>
                              <td className="py-4">
                                 <div className="flex items-center gap-3">
                                    <div className={cn(
                                       "w-8 h-4 rounded-full relative transition-all flex items-center px-1",
                                       queue.status === "Healthy" ? "bg-emerald-500" : "bg-muted-foreground/30"
                                    )}>
                                       <div className="w-2 h-2 rounded-full bg-white ml-auto" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <div className={cn("w-1.5 h-1.5 rounded-full", queue.status === "Healthy" ? "bg-emerald-500" : "bg-amber-500")} />
                                       <span className={cn(
                                          "text-[10px] font-black uppercase tracking-widest",
                                          queue.status === "Healthy" ? "text-emerald-600" : "text-amber-600"
                                       )}>
                                          {queue.status === "Healthy" ? "Active" : "Intermittent"}
                                       </span>
                                    </div>
                                 </div>
                              </td>
                              <td className="py-4">
                                 <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-foreground/40 font-mono tracking-tighter">
                                       {queue.sla} Performance
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-foreground/20">
                                       {queue.integration}
                                    </span>
                                 </div>
                              </td>
                              <td className="py-4 pr-6 text-right">
                                 <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5">
                                       <ArrowUpRight size={14} className="text-foreground/40" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5">
                                       <MoreVertical size={14} className="text-foreground/40" />
                                    </Button>
                                 </div>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projectQueues.map((queue, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <div 
                    onClick={() => {
                      setSelectedQueue(queue);
                      setView("transactions");
                    }}
                    className="group bg-card/40 backdrop-blur-md border border-border rounded-sm p-5 hover:border-primary/30 hover:shadow-2xl transition-all cursor-pointer relative overflow-hidden h-full flex flex-col"
                  >
                    {/* Background Icon Decor */}
                    <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:opacity-[0.08] group-hover:rotate-12 group-hover:scale-110 transition-all duration-700 pointer-events-none">
                       <queue.icon size={100} strokeWidth={1} />
                    </div>

                    <div className="flex items-start justify-between mb-6 relative z-10">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-12 h-12 rounded-sm flex items-center justify-center border transition-all group-hover:rotate-6",
                          queue.status === "Healthy" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                        )}>
                           <queue.icon size={24} />
                        </div>
                        <div className="flex flex-col">
                          <h4 className="text-sm font-black text-foreground group-hover:text-primary transition-colors truncate max-w-[140px]">{queue.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">{queue.type}</span>
                            <span className="w-1 h-1 rounded-full bg-border" />
                            <span className="text-[9px] font-bold uppercase tracking-widest text-primary/60">{queue.category}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-foreground/5 opacity-0 group-hover:opacity-100 transition-all -mr-2">
                        <MoreVertical size={14} />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                       <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground">SLA Performance</p>
                          <div className="flex items-baseline gap-1">
                             <span className="text-lg font-black text-foreground tracking-tight">{queue.sla}</span>
                             <span className="text-[8px] font-bold text-emerald-500">↑</span>
                          </div>
                       </div>
                       <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-foreground">Work Items</p>
                          <div className="flex items-baseline gap-1">
                             <span className="text-lg font-black text-foreground tracking-tight">{queue.items}</span>
                             <Activity size={10} className="text-muted-foreground/30" />
                          </div>
                       </div>
                    </div>

                    <div className="mt-auto pt-4 border-t border-border/10 flex items-center justify-between relative z-10">
                       <div className="flex items-center gap-2">
                          <div className={cn("w-1.5 h-1.5 rounded-full", queue.status === "Healthy" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]")} />
                          <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", queue.status === "Healthy" ? "text-emerald-500" : "text-red-500")}>{queue.status}</span>
                       </div>
                       <span className="text-[9px] font-mono text-muted-foreground/40">{queue.activationDate}</span>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Empty State / Create New Hook */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div 
                  onClick={() => setView("builder")}
                  className="h-full min-h-[220px] rounded-sm border-2 border-dashed border-border/20 bg-muted/5 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer group flex flex-col items-center justify-center text-center gap-4 p-6"
                >
                  <div className="w-12 h-12 rounded-sm bg-background border border-border/10 flex items-center justify-center group-hover:scale-110 group-hover:border-primary/20 transition-all shadow-xl">
                    <Plus size={20} className="text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-foreground/60 group-hover:text-foreground">
                      {projectQueues.length === 0 ? "No Queues" : "Add Queue"}
                    </h4>
                    <p className="text-[9px] font-medium text-muted-foreground/30 max-w-[120px] uppercase tracking-tighter">
                      {projectQueues.length === 0 ? "Initialize first queue" : "Add more units"}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
