"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Activity, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { NavItem, NavSubItem } from "@/lib/nav-config";
import * as Tooltip from "@radix-ui/react-tooltip";

interface SidebarItemProps {
  item: NavItem;
  collapsed: boolean;
  isOpen: boolean;
  onToggle: () => void;
  signal?: { level: string; count?: number; anomalies?: string[] };
}

export const SidebarItem = ({ item, collapsed, isOpen, onToggle, signal }: SidebarItemProps) => {
  const pathname = usePathname();
  const isActive = item.path === pathname || (item.children && item.children.some(child => pathname.startsWith(child.path)));
  const hasChildren = Boolean(item.children && item.children.length > 0);

  const getSignalColor = (level: string) => {
    switch (level) {
      case "ERROR": return "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]";
      case "WARNING": return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]";
      case "SUCCESS": return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]";
      default: return "bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]";
    }
  };

  return (
    <Tooltip.Provider delayDuration={100}>
      <div className="flex flex-col mb-1">
        <div
          role={hasChildren ? "button" : undefined}
          onClick={hasChildren ? onToggle : undefined}
          className="relative group px-2"
        >
          <Tooltip.Root>
            <Tooltip.Trigger asChild>
              <Link
                href={hasChildren ? "#" : (item.path || "#")}
                className={cn(
                  "flex items-center justify-between px-3 py-2.5 rounded-sm transition-all duration-200 ease-out relative overflow-hidden",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted font-medium hover:text-foreground",
                  collapsed && "justify-center px-0 h-10 w-10 mx-auto"
                )}
              >
                {/* Advanced Signal Badge */}
                {signal && (
                  <motion.div 
                    layoutId={`signal-${item.label}`}
                    className={cn(
                      "absolute top-1 right-1 z-20 flex items-center justify-center transition-all",
                      signal.count && signal.count > 0 
                        ? "min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-black text-white" 
                        : "w-2 h-2 rounded-full",
                      getSignalColor(signal.level)
                    )}
                  >
                    {signal.count && signal.count > 0 && !collapsed && (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                        {signal.count}
                      </motion.span>
                    )}
                  </motion.div>
                )}

                <div className={cn("flex items-center gap-3", collapsed && "gap-0")}>
                  <item.icon 
                    className={cn(
                      "w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110",
                      isActive ? "text-primary-foreground" : "text-muted-foreground"
                    )} 
                  />
                  {!collapsed && (
                    <span className="text-[13px] tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                      {item.label}
                    </span>
                  )}
                </div>

                {!collapsed && hasChildren && (
                  <ChevronRight 
                    className={cn(
                      "w-4 h-4 transition-transform duration-300 ease-in-out",
                      isOpen && "rotate-90"
                    )} 
                  />
                )}
              </Link>
            </Tooltip.Trigger>

            {/* Signal Dossier Tooltip */}
            <Tooltip.Portal>
              <Tooltip.Content
                side="right"
                align="center"
                sideOffset={12}
                className="z-[100] bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 p-4 rounded-sm shadow-2xl animate-in fade-in zoom-in-95 duration-200"
              >
                <div className="flex flex-col gap-3 min-w-[160px]">
                   <div className="flex items-center justify-between gap-4">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{item.label} Dossier</span>
                      {signal && (
                        <div className={cn("px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest", 
                          signal.level === "ERROR" ? "bg-rose-500/20 text-rose-500" : "bg-amber-500/20 text-amber-500"
                        )}>
                           {signal.level}
                        </div>
                      )}
                   </div>
                   
                   {signal?.anomalies && signal.anomalies.length > 0 ? (
                     <div className="flex flex-col gap-2">
                        {signal.anomalies.map((anomaly, i) => (
                          <div key={i} className="flex items-center gap-2 group/item">
                             <div className={cn("w-1 h-1 rounded-full", signal.level === "ERROR" ? "bg-rose-500" : "bg-amber-500")} />
                             <span className="text-[10px] font-bold text-foreground group-hover/item:text-primary transition-colors">{anomaly}</span>
                          </div>
                        ))}
                        {signal.count && signal.count > 3 && (
                          <span className="text-[9px] text-muted-foreground font-medium mt-1">+{signal.count - 3} more critical anomalies...</span>
                        )}
                     </div>
                   ) : (
                     <p className="text-[10px] text-muted-foreground font-medium">Operational health at nominal parameters.</p>
                   )}

                   <div className="h-px w-full bg-white/5" />
                   <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-primary">
                      <Activity className="w-3 h-3" />
                      Live Kernel Sync
                   </div>
                </div>
                <Tooltip.Arrow className="fill-white/10" />
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        </div>

        <AnimatePresence mode="wait">
          {!collapsed && hasChildren && isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="overflow-hidden"
            >
              <div className="mt-1 ml-4 pl-4 border-l border-border/50 flex flex-col gap-1 py-1">
                {item.children!.map((child) => {
                  const isChildActive = pathname === child.path;
                  return (
                    <Link
                      key={child.label}
                      href={child.path}
                      className={cn(
                        "px-3 py-1.5 text-xs rounded-sm transition-all duration-200",
                        isChildActive
                          ? "text-primary font-semibold bg-primary/5"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                      )}
                    >
                      {child.label}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Tooltip.Provider>
  );
};
