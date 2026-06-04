"use client";

import React from "react";
import { Bell, ChevronDown, LayoutDashboard, ClipboardCheck, Box, Settings as SettingsIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
const Logo = dynamic(() => import("@/components/ui/logo"), { ssr: false });

const NAV_ITEMS = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Action Center", href: "/dashboard/action-center", icon: ClipboardCheck },
  { name: "Models", href: "/dashboard/models", icon: Box },
  { name: "Settings", href: "/dashboard/settings", icon: SettingsIcon },
];

export const TopNav = ({ activeItem = "Action Center" }: { activeItem?: string }) => {
  return (
    <div className="h-16 border-b border-border bg-background flex items-center px-6 justify-between shrink-0">
      <div className="flex items-center gap-12">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground">
          <Logo size={32} />
          NexusAI
        </div>
        
        <nav className="flex items-center gap-8 h-full pt-1">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.name}
              className={cn(
                "h-16 flex items-center px-1 border-b-2 transition-all cursor-pointer text-sm font-semibold relative",
                activeItem === item.name 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {item.name}
              {activeItem === item.name && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
              )}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative p-2 text-muted-foreground hover:text-foreground transition-colors">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-background" />
        </button>
        
        <div className="flex items-center gap-3 pl-2 border-l border-border hover:bg-muted/50 py-1.5 px-3 rounded-sm transition-all cursor-pointer">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 shadow-sm flex items-center justify-center text-white font-bold text-xs ring-2 ring-primary/10">
            AC
          </div>
          <div className="flex flex-col text-left">
            <span className="text-xs font-bold leading-none">Alex Chen</span>
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.05em] mt-0.5">Admin</span>
          </div>
          <ChevronDown size={14} className="text-muted-foreground" />
        </div>
      </div>
    </div>
  );
};
