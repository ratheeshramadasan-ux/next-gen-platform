"use client";

import React, { useState, useEffect } from "react";
import { SidebarItem } from "./sidebar-item";
import { navigationConfig } from "@/lib/nav-config";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Menu, X, ChevronLeft, ChevronRight, Search, Bell, User } from "lucide-react";
import dynamic from "next/dynamic";
import { getSidebarSignals, SidebarSignal } from "@/app/actions/notificationActions";
import { useAppContext } from "@/lib/context";

const Logo = dynamic(() => import("@/components/ui/logo"), { ssr: false });

export const SidebarV2 = () => {
  const { activeTenant } = useAppContext();
  const [collapsed, setCollapsed] = useState(false);
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);
  const [signals, setSignals] = useState<SidebarSignal[]>([]);

  useEffect(() => {
    if (activeTenant) {
       getSidebarSignals(activeTenant.id).then(setSignals);
       const interval = setInterval(() => {
          getSidebarSignals(activeTenant.id).then(setSignals);
       }, 30000); // 30s poll
       return () => clearInterval(interval);
    }
  }, [activeTenant]);

  useEffect(() => {
    setMounted(true);
    // Auto-collapse on small screens
    const handleResize = () => {
      if (window.innerWidth < 1024) setCollapsed(true);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleItem = (label: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [label]: !prev[label],
    }));
  };

  if (!mounted) return null;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className={cn(
        "h-screen sticky top-0 z-40 flex flex-col border-r border-border transition-all duration-300 overflow-hidden",
        "bg-background/40 backdrop-blur-2xl studio-grid-dots shadow-xl"
      )}
    >
      {/* Header / Logo Section */}
      <div className="flex h-16 items-center border-b border-border/50 px-4">
        <div className={cn("flex items-center gap-3 transition-all duration-300", collapsed && "justify-center w-full")}>
           <Logo size={collapsed ? 28 : 32} />
           {!collapsed && (
             <motion.div
               initial={{ opacity: 0, x: -10 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex flex-col"
             >
               <span className="font-bold text-sm tracking-tight leading-none text-foreground">NextGen</span>
               <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.15em] mt-1">Platform OS</span>
             </motion.div>
           )}
        </div>
      </div>

      {/* Navigation section */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 scrollbar-hide flex flex-col gap-1">
        {navigationConfig.map((item) => {
          const signal = item.path ? signals.find(s => s.path === item.path) : undefined;
          return (
            <SidebarItem
              key={item.label}
              item={item}
              collapsed={collapsed}
              isOpen={openItems[item.label] || false}
              onToggle={() => toggleItem(item.label)}
              signal={signal}
            />
          );
        })}
      </div>

      {/* Footer / Toggle Section */}
      <div className="p-4 border-t border-border/50 bg-background/20">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center p-2 rounded-sm hover:bg-muted/50 text-muted-foreground transition-colors group"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5 group-hover:scale-110 transition-transform" />
          ) : (
            <div className="flex items-center gap-2">
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-semibold uppercase tracking-wider">Minimize</span>
            </div>
          )}
        </button>
      </div>
    </motion.aside>
  );
};
