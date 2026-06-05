"use client";

import React, { useState, useEffect, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Command, X, Map, Workflow, BrainCircuit, ShieldCheck, Store, Settings, ArrowRight, Zap } from "lucide-react";
import { navigationConfig } from "@/lib/nav-config";
import { globalSearch, SearchResult } from "@/app/actions/searchActions";
import { useAppContext } from "@/lib/context";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette = ({ isOpen, onClose }: CommandPaletteProps) => {
  const router = useRouter();
  const { activeTenant } = useAppContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Flatten nav for instant search
  const flatNav = navigationConfig.flatMap(item => [
    { name: item.label, type: "MODULE" as const, path: item.path || (item.children?.[0]?.path || ""), icon: item.icon },
    ...(item.children?.map(child => ({ name: child.label, type: "MODULE" as const, path: child.path, icon: item.icon })) || [])
  ]);

  const filteredNav = flatNav.filter(n => n.name.toLowerCase().includes(query.toLowerCase())).slice(0, 5);

  useEffect(() => {
    if (query.length > 1 && activeTenant) {
      const timer = setTimeout(async () => {
        const dbResults = await globalSearch(activeTenant.id, query);
        setResults(dbResults);
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setResults([]);
    }
  }, [query, activeTenant]);

  const handleSelect = (path: string) => {
    router.push(path);
    onClose();
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const totalItems = filteredNav.length + results.length;
    if (e.key === "ArrowDown") {
      setSelectedIndex((prev) => (prev + 1) % totalItems);
    } else if (e.key === "ArrowUp") {
      setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems);
    } else if (e.key === "Enter") {
      const allItems = [
        ...filteredNav.map(n => ({ path: n.path })),
        ...results.map(r => ({ path: r.path }))
      ];
      if (allItems[selectedIndex]) {
        handleSelect(allItems[selectedIndex].path);
      }
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-background/40 backdrop-blur-md z-[200] animate-in fade-in duration-300" />
        <Dialog.Content 
          onKeyDown={handleKeyDown}
          className="fixed top-1/4 left-1/2 -translate-x-1/2 w-full max-w-xl bg-background border border-border/60 rounded-sm shadow-2xl z-[201] overflow-hidden focus:outline-none animate-in zoom-in-95 fade-in duration-300"
        >
          <div className="flex flex-col">
            {/* Search Input */}
            <div className="flex items-center gap-3 p-5 border-b border-border/40 bg-muted/20">
               <Search className="w-5 h-5 text-muted-foreground" />
               <input 
                 autoFocus
                 value={query}
                 onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
                 placeholder="Search platform controls or datasets..."
                 className="flex-1 bg-transparent border-none focus:outline-none text-sm font-medium placeholder:text-muted-foreground"
               />
               <div className="flex items-center gap-1.5 px-2 py-1 bg-background border border-border/50 rounded-sm text-[10px] font-black text-muted-foreground/40 shadow-sm uppercase">
                  ESC
               </div>
            </div>

            {/* Results */}
            <div className="max-h-[min(50vh,400px)] overflow-y-auto p-3">
               {/* Nav Modules */}
               {filteredNav.length > 0 && (
                 <div className="flex flex-col gap-1 mb-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-3 mb-2">Navigation & Modules</h4>
                    {filteredNav.map((item, i) => (
                      <div 
                        key={`${item.name}-${i}`}
                        onClick={() => handleSelect(item.path)}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-sm cursor-pointer transition-all",
                          selectedIndex === i ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                        )}
                      >
                         <div className="flex items-center gap-3">
                            <item.icon className="w-4 h-4 opacity-70" />
                            <span className="text-sm font-bold">{item.name}</span>
                         </div>
                         <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                      </div>
                    ))}
                 </div>
               )}

               {/* DB Results */}
               {results.length > 0 && (
                 <div className="flex flex-col gap-1">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-3 mb-2">Platform Records</h4>
                    {results.map((item, i) => {
                      const absoluteIndex = i + filteredNav.length;
                      return (
                        <div 
                          key={item.id}
                          onClick={() => handleSelect(item.path)}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-sm cursor-pointer transition-all",
                            selectedIndex === absoluteIndex ? "bg-primary text-primary-foreground" : "hover:bg-muted/50"
                          )}
                        >
                           <div className="flex items-center gap-3">
                              <div className="w-6 h-6 rounded-sm bg-background border border-border/50 flex items-center justify-center">
                                 <Zap className="w-3.5 h-3.5 text-primary" />
                              </div>
                              <div className="flex flex-col">
                                 <span className="text-sm font-bold leading-none">{item.name}</span>
                                 <span className="text-[10px] opacity-60 font-black uppercase tracking-tighter">{item.type}</span>
                              </div>
                           </div>
                           <ArrowRight className="w-3.5 h-3.5 opacity-40" />
                        </div>
                      );
                    })}
                 </div>
               )}

               {query.length > 0 && filteredNav.length === 0 && results.length === 0 && (
                 <div className="py-12 text-center flex flex-col items-center gap-3 opacity-40">
                    <Search className="w-8 h-8" />
                    <p className="text-xs font-bold uppercase tracking-widest">No orbital signals detected</p>
                 </div>
               )}

               {query.length === 0 && (
                 <div className="py-8 text-center flex flex-col items-center gap-3 opacity-40">
                    <Command className="w-8 h-8" />
                    <p className="text-xs font-bold uppercase tracking-widest leading-relaxed">
                       Type to search environments,<br />automations, or security proofs
                    </p>
                 </div>
               )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-muted/20 border-t border-border/40 flex items-center justify-between">
               <div className="flex items-center gap-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><kbd className="bg-background px-1.5 py-0.5 rounded border border-border/50 shadow-sm">↵</kbd> Select</span>
                  <span className="flex items-center gap-1.5"><kbd className="bg-background px-1.5 py-0.5 rounded border border-border/50 shadow-sm">↑↓</kbd> Navigate</span>
               </div>
               <span className="text-[9px] font-black text-primary/40 uppercase tracking-tighter">NextGen Unified Search v1.0</span>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
