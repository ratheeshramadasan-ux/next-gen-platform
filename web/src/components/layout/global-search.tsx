"use client";

import React, { useEffect, useState } from "react";
import { Search, Command, X, Briefcase, Activity, ScrollText, Bot, Shield, Zap, Building2, Bell, BookOpen } from "lucide-react";
import { KbToggleButton } from "@/components/layout/knowledge-base-panel";
import { useUIStore } from "@/lib/ui-store";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { useAppContext } from "@/lib/context";
import { TenantSelector } from "./tenant-selector";
import Logo from "@/components/ui/logo";

export const GlobalSearch = () => {
  const { isSearchOpen, setSearchOpen, searchQuery, setSearchQuery } = useUIStore();
  const { activeBackground, activeTheme, activeCustomer, currentUser, switchUser, availableAdmins } = useAppContext();
  const [results, setResults] = useState<any[]>([]);
  const isGlassTheme = activeTheme.includes("Glass");

  // Keyboard shortcut listener (Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSearchOpen]);

  // Mock search results
  useEffect(() => {
    if (searchQuery.trim().length > 1) {
      setResults([
        { id: "1", type: "JOB", title: "SAP Invoice Extraction", status: "Running", icon: Activity },
        { id: "2", type: "WORKFLOW", title: "Onboarding Sequence V2", status: "Draft", icon: Zap },
        { id: "3", type: "VM", title: "NYC-RUNNER-04", status: "Idle", icon: Shield },
        { id: "4", type: "LOG", title: "Auth failure: 401 on tenant-A", status: "Error", icon: ScrollText },
      ].filter(r => r.title.toLowerCase().includes(searchQuery.toLowerCase())));
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  return (
    <>
      {/* Top Bar Search Trigger */}
      <div
        className={cn(
          "h-14 border-b border-border bg-background/20 backdrop-blur-2xl flex items-center px-4 gap-3 sticky top-0 z-30 transition-all duration-300 shadow-[0_1px_0_0_rgba(255,255,255,0.05)]"
        )}
      >
        {/* Product Logo */}
        <div className="pr-3 border-r border-border/50 flex-shrink-0">
          <Logo size={28} showText />
        </div>

        <div className="flex items-center gap-3 border-r border-border/50 pr-3 h-8">
           <TenantSelector />
        </div>

        <div 
          onClick={() => setSearchOpen(true)}
          className="flex-1 max-w-sm flex items-center gap-3 px-4 py-1.5 bg-muted/30 hover:bg-muted border border-border rounded-sm cursor-text transition-all group lg:scale-100"
        >
          <Search size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-xs text-muted-foreground flex-1">Search jobs, logs...</span>
          <div className="flex items-center gap-1 px-1.5 py-0.5 bg-background border border-border rounded-md text-[9px] font-bold text-muted-foreground">
            <Command size={9} /> K
          </div>
        </div>
        
        <div className="flex items-center gap-3 ml-auto">
          {/* User Switcher */}
          <div className="flex flex-col items-end mr-2 border-r border-border/50 pr-4">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Identity</span>
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

          {/* Knowledge Base Guide */}
          <KbToggleButton />

          {/* Notification placeholder */}
          <div className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center border border-border/50 hover:bg-primary/10 hover:border-primary/30 transition-colors cursor-pointer">
             <Bell size={14} className="text-muted-foreground" />
          </div>
          {/* Dashboard activity indicator */}
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 hover:bg-primary/20 transition-colors cursor-pointer">
             <Activity size={14} className="text-primary" />
          </div>

          {/* Customer Branding Logo */}
          {activeCustomer?.logoUrl ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-500 border-l border-border/50 pl-3 ml-1">
              <div className="relative group">
                <div className="absolute -inset-2 bg-primary/5 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <img 
                  src={activeCustomer.logoUrl} 
                  alt={activeCustomer.companyName} 
                  className="h-8 w-auto max-w-[120px] object-contain relative z-10 drop-shadow-sm"
                />
              </div>
            </div>
          ) : activeCustomer && (
            <div className="flex items-center gap-2 border-l border-border/50 pl-3 ml-1">
              <div className="flex items-center gap-1.5 px-2 py-1 bg-primary/5 border border-primary/10 rounded-sm">
                <Building2 size={12} className="text-primary" />
                <span className="text-[9px] font-black text-primary uppercase tracking-tight max-w-[80px] truncate">{activeCustomer.companyName}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Command Palette */}
      <AnimatePresence>
        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSearchOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: -20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -20 }}
              className="relative w-full max-w-2xl bg-background border border-white/20 shadow-2xl rounded-sm overflow-hidden"
            >
              <div className="flex items-center px-6 py-4 border-b border-border">
                <Search size={22} className="text-primary mr-4" />
                <input 
                  autoFocus
                  placeholder="What are you looking for?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-lg font-medium focus:outline-none"
                />
                <button 
                  onClick={() => setSearchOpen(false)}
                  className="p-2 hover:bg-muted rounded-full text-muted-foreground"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 max-h-[50vh] overflow-y-auto">
                {results.length > 0 ? (
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">Results</p>
                    <div className="space-y-1">
                      {results.map(res => (
                        <div key={res.id} className="flex items-center gap-4 p-3 hover:bg-primary/5 rounded-sm cursor-pointer group transition-colors">
                          <div className={cn(
                            "w-10 h-10 rounded-sm flex items-center justify-center border",
                            res.type === "LOG" ? "bg-rose-500/10 border-rose-500/30 text-rose-500" : "bg-primary/10 border-primary/30 text-primary"
                          )}>
                            <IconWrapper icon={res.icon} size={20} />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-sm font-bold group-hover:text-primary transition-colors">{res.title}</h4>
                            <p className="text-xs text-muted-foreground">{res.type} • {res.status}</p>
                          </div>
                          <ChevronRight size={14} className="text-muted-foreground group-hover:text-primary transform transition-all group-hover:translate-x-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  searchQuery.length > 1 ? (
                    <div className="py-12 text-center">
                      <p className="text-muted-foreground">No matches found for "{searchQuery}"</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4 p-2">
                       <RecentItem title="Recent Jobs" icon={Activity} />
                       <RecentItem title="Workflows" icon={Zap} />
                       <RecentItem title="VM Status" icon={Shield} />
                       <RecentItem title="Error Logs" icon={ScrollText} />
                    </div>
                  )
                )}
              </div>
              
              <div className="px-6 py-3 bg-muted/30 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                <div className="flex gap-4">
                   <div className="flex items-center gap-1.5"><Command size={12} /> K to close</div>
                   <div className="flex items-center gap-1.5">Enter to select</div>
                </div>
                <div className="">Multi-Application OS Shell v1.0</div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

const RecentItem = ({ title, icon }: { title: string, icon: any }) => (
  <div className="p-4 bg-muted/50 border border-border rounded-sm hover:border-primary/50 transition-all cursor-pointer group">
    <IconWrapper icon={icon} size={20} className="mb-2 text-muted-foreground group-hover:text-primary" />
    <span className="text-sm font-bold">{title}</span>
  </div>
);

const ChevronRight = ({ size, className }: { size: number, className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="m9 18 6-6-6-6"/>
  </svg>
);
