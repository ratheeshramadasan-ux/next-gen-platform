"use client";

import React from "react";
import { SidebarV2 } from "./sidebar";
import { TopbarV2 } from "./topbar";
import { MetaAgent } from "./meta-agent";
import { CommandPalette } from "./command-palette";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface ShellV2Props {
  children: React.ReactNode;
}

export const ShellV2 = ({ children }: ShellV2Props) => {
  const pathname = usePathname();
  const [isAgentOpen, setIsAgentOpen] = React.useState(false);
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  // Global Keybinds
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      {/* Background Ambience Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-accent/5 blur-[100px]" />
      </div>

      {/* Main Sidebar */}
      <SidebarV2 />

      {/* Content Area */}
      <div className={cn(
        "flex-1 flex flex-col relative z-10 transition-all duration-300",
        isAgentOpen ? "pr-80" : "pr-0"
      )}>
        <TopbarV2 
          onToggleAgent={() => setIsAgentOpen(!isAgentOpen)} 
          isAgentOpen={isAgentOpen} 
          onToggleSearch={() => setIsSearchOpen(true)}
          isSearchOpen={isSearchOpen}
        />
        
        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
        
        {/* Footer info (optional) */}
        <footer className="h-10 px-6 flex items-center justify-between border-t border-border/30 bg-background/20 backdrop-blur-md">
           <div className="flex items-center gap-4">
              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 tracking-widest">NextGen Build v1.4.0-Stable</span>
              <div className="flex items-center gap-1.5">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                 <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">System Nominal</span>
              </div>
           </div>
           <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-tighter">
              <span>Canada Central Region (AWS)</span>
              <span>Uptime: 99.9992%</span>
           </div>
        </footer>
      </div>

      {/* Meta-Agent Integration */}
      <MetaAgent 
        isOpen={isAgentOpen} 
        onClose={() => setIsAgentOpen(false)} 
      />

      {/* Command Palette Integration */}
      <CommandPalette 
        isOpen={isSearchOpen} 
        onClose={() => setIsSearchOpen(false)} 
      />
    </div>
  );
};
