"use client";

import React from "react";
import { Search, Bell, HelpCircle, ChevronRight, Globe, Command, Sparkles, User } from "lucide-react";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NotificationTray } from "./notification-tray";

interface TopbarV2Props {
  onToggleAgent?: () => void;
  isAgentOpen?: boolean;
  onToggleSearch?: () => void;
  isSearchOpen?: boolean;
}

export const TopbarV2 = ({ onToggleAgent, isAgentOpen, onToggleSearch, isSearchOpen }: TopbarV2Props) => {
  const { activeTenant, activeCustomer, switchTenant, availableTenants, currentUser, switchCustomer, switchUser, availableAdmins } = useAppContext();
  const pathname = usePathname();
  
  // Format breadcrumbs from path
  const pathSegments = pathname.split("/").filter(Boolean);
  
  return (
    <header className="h-16 sticky top-0 z-30 flex items-center justify-between px-6 border-b border-border/50 bg-background/30 backdrop-blur-xl">
      {/* Search and Context Left */}
      <div className="flex items-center gap-6 flex-1">
        <div 
          onClick={onToggleSearch}
          className="relative group max-w-md w-full cursor-pointer active:scale-95 transition-all"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
          <div className="w-full bg-muted/40 border border-border/40 rounded-sm pl-10 pr-4 py-2 text-sm text-muted-foreground flex items-center">
             Search for automations, bots, or logs...
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1 px-1.5 py-0.5 bg-background border border-border rounded text-[10px] text-muted-foreground font-mono">
            <Command className="w-2.5 h-2.5" /> K
          </div>
        </div>

        {/* Customer Switcher */}
        <div className="hidden lg:flex items-center gap-2 border-l border-border/50 pl-6">
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Active Customer</span>
              <div className="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded-sm border border-primary/10 relative">
                 <div className="w-2 h-2 rounded-full bg-primary" />
                 <span className="text-xs font-bold text-foreground">{activeCustomer?.companyName || "Global Control"}</span>
                 {currentUser.role === "Platform Admin" && (
                   <select 
                      className="opacity-0 absolute w-full h-full cursor-pointer inset-0"
                      value={activeCustomer?.id || ""}
                      onChange={(e) => switchCustomer(e.target.value)}
                   >
                      {(useAppContext().pendingRequests || []).concat(useAppContext().customers || []).filter((v,i,a)=>a.findIndex(t=>(t.id===v.id))===i).filter(c => c.status !== "Suspended").map((c: any) => (
                          <option key={c.id} value={c.id}>{c.companyName}</option>
                      ))}
                   </select>
                 )}
              </div>
           </div>
        </div>

        {/* Tenant Switcher with enhanced visual context */}
        <div className="hidden lg:flex items-center gap-2 border-l border-border/50 pl-6">
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Active Space</span>
              <div className="flex items-center gap-2 bg-primary/5 px-2 py-1 rounded-sm border border-primary/10 relative">
                 <div className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.5)]" />
                 <span className="text-xs font-bold text-foreground">{activeTenant?.name || "Global Control"}</span>
                 <select 
                    className="opacity-0 absolute w-full h-full cursor-pointer inset-0"
                    value={activeTenant?.id || ""}
                    onChange={(e) => switchTenant(e.target.value)}
                 >
                    {availableTenants.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                 </select>
              </div>
           </div>
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-4">
        {/* Network Status */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
           <Globe className="w-3.5 h-3.5 text-emerald-500" />
           <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Global Cluster Live</span>
        </div>

        {/* Utility Buttons */}
        <div className="flex items-center gap-1 border-r border-border/50 pr-4 mr-1">
            {/* Meta-Agent Toggle */}
            <button 
              onClick={onToggleAgent}
              className={cn(
                "p-2 rounded-sm transition-all relative group",
                isAgentOpen ? "bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.2)]" : "hover:bg-muted/60 text-muted-foreground"
              )}
            >
                <Sparkles className={cn("w-5 h-5 transition-transform group-hover:scale-110", isAgentOpen && "animate-pulse")} />
                {isAgentOpen && (
                  <motion.div 
                    layoutId="agent-link"
                    className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background shadow-lg" 
                  />
                )}
            </button>

            <NotificationTray />

            <button className="p-2 hover:bg-muted/60 rounded-sm text-muted-foreground transition-all">
                <HelpCircle className="w-5 h-5" />
            </button>
        </div>

        {/* Profile Card with Switcher */}
        <div className="flex items-center gap-3 pl-2 group cursor-pointer border-r border-border/50 pr-4 mr-1 relative">
           <div className="flex flex-col items-end hidden md:flex">
              <span className="text-xs font-bold text-foreground">{currentUser.name}</span>
              <span className="text-[10px] text-primary font-black uppercase tracking-tighter">{currentUser.role}</span>
           </div>
           <div className="w-8 h-8 rounded-sm bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 relative group-hover:border-primary/50 transition-colors">
              <User className="w-4 h-4 text-primary" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-background" />
           </div>
           
           {/* Visible User Switcher */}
           <select 
              className="bg-transparent text-xs font-bold text-foreground cursor-pointer focus:outline-none border-none appearance-none pr-4"
              value={currentUser.email}
              onChange={(e) => switchUser(e.target.value)}
              title="Switch User Identity"
           >
              {availableAdmins?.map(admin => (
                 <option key={admin.email} value={admin.email} className="bg-background">
                   {admin.name} ({admin.role})
                 </option>
              ))}
           </select>
        </div>

        {/* Customer Branding */}
        {activeCustomer?.logoUrl ? (
          <div className="flex items-center animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="h-10 w-px bg-border/30 mx-2 hidden sm:block" />
            <div className="relative group">
              <div className="absolute -inset-2 bg-primary/5 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src={activeCustomer.logoUrl} 
                alt={activeCustomer.companyName} 
                className="h-9 w-auto max-w-[140px] object-contain relative z-10 drop-shadow-sm"
              />
            </div>
          </div>
        ) : activeCustomer && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/5 border border-primary/10 rounded-sm">
             <div className="w-2 h-2 rounded-full bg-primary" />
             <span className="text-[10px] font-black text-primary uppercase tracking-tighter">{activeCustomer.companyName}</span>
          </div>
        )}
      </div>
    </header>
  );
};
