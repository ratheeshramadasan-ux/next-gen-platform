"use client";

import React, { useState } from "react";
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  MoreHorizontal, 
  Download, 
  Upload, 
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  PauseCircle,
  XCircle,
  User,
  Bot,
  BrainCircuit,
  Settings2,
  RefreshCw,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_CONFIG: Record<string, any> = {
  "New": { color: "text-blue-500 bg-blue-500/10", icon: Clock },
  "In Progress": { color: "text-amber-500 bg-amber-500/10", icon: RefreshCw },
  "Completed": { color: "text-emerald-500 bg-emerald-500/10", icon: CheckCircle2 },
  "Failed": { color: "text-red-500 bg-red-500/10", icon: AlertCircle },
  "Deferred": { color: "text-purple-500 bg-purple-500/10", icon: PauseCircle },
  "Cancelled": { color: "text-muted-foreground bg-muted", icon: XCircle },
};

const PRIORITY_CONFIG: Record<string, any> = {
  "High": "bg-red-500",
  "Medium": "bg-amber-500",
  "Low": "bg-blue-500",
};

export function TransactionGrid({ queue }: { queue?: any }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const transactions: any[] = [];

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="w-full h-full flex flex-col bg-background/50 font-sans animate-in fade-in duration-500 overflow-hidden">
      {/* Action Bar */}
      <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-card/20 backdrop-blur-xl">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
            <Input placeholder="Search transactions..." className="h-9 rounded-sm bg-muted/20 border-border/10 pl-10 text-xs" />
          </div>
          <Button variant="outline" size="sm" className="h-9 rounded-sm gap-2 border-border/20 bg-card/40 font-bold text-xs">
            <Filter size={14} />
            Add Filter
          </Button>
          <div className="h-6 w-px bg-border/20 mx-1" />
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 animate-in slide-in-from-left-2">
              <Button size="sm" className="h-9 rounded-sm bg-primary text-white font-bold text-xs gap-2">
                <RefreshCw size={14} />
                Retry Selected ({selectedIds.length})
              </Button>
              <Button variant="outline" size="sm" className="h-9 rounded-sm border-destructive/20 text-destructive bg-destructive/5 font-bold text-xs">
                Cancel
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-9 rounded-sm gap-2 text-xs font-bold hover:bg-foreground/5">
            <Download size={14} />
            Export
          </Button>
          <Button variant="ghost" size="sm" className="h-9 rounded-sm gap-2 text-xs font-bold hover:bg-foreground/5">
            <Upload size={14} />
            Bulk Upload
          </Button>
          <Button className="h-9 rounded-sm gap-2 bg-primary text-white font-bold text-xs shadow-lg shadow-primary/20">
            <Plus size={14} />
            Add Transaction
          </Button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 overflow-auto custom-scrollbar bg-card/20">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50 text-[9px] font-black uppercase tracking-[0.2em] text-foreground sticky top-0 z-20">
              <th className="w-12 py-3 pl-6 text-left">
                <input 
                   type="checkbox" 
                   className="rounded border-border/40 text-foreground focus:ring-black/20"
                   onChange={(e) => setSelectedIds(e.target.checked ? transactions.map(t => t.id) : [])}
                   checked={transactions.length > 0 && selectedIds.length === transactions.length}
                />
              </th>
              <th className="py-3 text-left font-extrabold">Transaction ID</th>
              <th className="py-3 text-left font-extrabold">Reference ID</th>
              <th className="py-3 text-left font-extrabold">Status</th>
              <th className="py-3 text-center font-extrabold">Priority</th>
              <th className="py-3 text-left font-extrabold">Assigned To</th>
              <th className="py-3 text-left font-extrabold">Amount</th>
              <th className="py-3 text-left font-extrabold">SLA Deadline</th>
              <th className="w-12 py-3 pr-6 text-right font-extrabold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#e2d5c3]/50">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-4 opacity-20">
                    <Clock size={48} strokeWidth={1} />
                    <p className="text-[10px] font-black uppercase tracking-widest text-foreground">No transactions found</p>
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr 
                  key={tx.id} 
                  className={cn(
                    "group hover:bg-muted/30 transition-all cursor-pointer",
                    selectedIds.includes(tx.id) && "bg-muted/30"
                  )}
                >
                  <td className="py-4 pl-6">
                    <input 
                      type="checkbox" 
                      className="rounded border-border/40 text-primary focus:ring-primary/20"
                      checked={selectedIds.includes(tx.id)}
                      onChange={() => toggleSelect(tx.id)}
                    />
                  </td>
                  <td className="py-4">
                    <span className="text-xs font-bold text-foreground/80 font-mono">{tx.id}</span>
                  </td>
                  <td className="py-4">
                    <span className="text-xs font-semibold text-foreground/70">{tx.refId}</span>
                  </td>
                  <td className="py-4">
                    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter", STATUS_CONFIG[tx.status].color)}>
                      {React.createElement(STATUS_CONFIG[tx.status].icon, { size: 12 })}
                      {tx.status}
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex justify-center">
                       <div className={cn("w-2 h-2 rounded-full", PRIORITY_CONFIG[tx.priority])} />
                    </div>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center border border-border/10 overflow-hidden">
                        {tx.type === "User" ? <User size={12} className="text-muted-foreground" /> : 
                         tx.type === "Bot" ? <Bot size={12} className="text-muted-foreground" /> :
                         <BrainCircuit size={12} className="text-primary/60" />}
                      </div>
                      <span className="text-xs font-medium text-foreground/70">{tx.assignedTo}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="text-xs font-bold text-foreground/80">{tx.amount}</span>
                  </td>
                  <td className="py-4">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground/60">
                      <Clock size={12} />
                      {tx.deadline}
                    </div>
                  </td>
                  <td className="py-4 pr-6 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 text-primary">
                          <Eye size={14} />
                       </Button>
                       <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-muted">
                          <MoreHorizontal size={14} />
                       </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 border-t border-border/40 flex items-center justify-between bg-card/20 shrink-0">
         <p className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">Showing 1 to 5 of 1,284 transactions</p>
         <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest border-border/40">Previous</Button>
            <div className="flex items-center gap-1 mx-2">
               {[1, 2, 3, "...", 128].map((p, i) => (
                 <button key={i} className={cn(
                   "w-7 h-7 rounded-lg text-[10px] font-black transition-all",
                   p === 1 ? "bg-primary text-white" : "text-muted-foreground hover:bg-foreground/5"
                 )}>{p}</button>
               ))}
            </div>
            <Button variant="outline" size="sm" className="h-8 rounded-lg text-[10px] font-black uppercase tracking-widest border-border/40">Next</Button>
         </div>
      </div>
    </div>
  );
}
