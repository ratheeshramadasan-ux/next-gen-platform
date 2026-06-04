"use client";

import React, { useState, useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Bell, ShieldAlert, Zap, CreditCard, ChevronRight, CheckCheck, Trash2 } from "lucide-react";
import { getSystemNotifications, SystemNotification } from "@/app/actions/notificationActions";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";

export const NotificationTray = () => {
  const { activeTenant } = useAppContext();
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (activeTenant) {
      getSystemNotifications(activeTenant.id).then(setNotifications);
    }
  }, [activeTenant, isOpen]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getIcon = (type: string) => {
    switch (type) {
      case "KERNEL": return <Zap className="w-4 h-4 text-primary" />;
      case "SECURITY": return <ShieldAlert className="w-4 h-4 text-rose-500" />;
      case "BILLING": return <CreditCard className="w-4 h-4 text-emerald-500" />;
      default: return <Bell className="w-4 h-4 text-sky-500" />;
    }
  };

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button className="p-2 hover:bg-muted/60 rounded-sm text-muted-foreground transition-all relative group">
          <Bell className="w-5 h-5 transition-transform group-hover:rotate-12" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 w-4 h-4 bg-primary text-[8px] font-black text-primary-foreground flex items-center justify-center rounded-full border-2 border-background shadow-lg">
              {unreadCount}
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content 
          align="end" 
          sideOffset={8}
          className="w-80 bg-background/60 backdrop-blur-3xl border border-border/40 rounded-sm shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
            <h3 className="text-xs font-black uppercase tracking-widest text-foreground">Active Signals</h3>
            <div className="flex items-center gap-2">
               <button className="p-1.5 hover:bg-background/80 rounded-sm text-muted-foreground transition-colors" title="Mark all as read">
                  <CheckCheck className="w-3.5 h-3.5" />
               </button>
               <button className="p-1.5 hover:bg-background/80 rounded-sm text-muted-foreground transition-colors" title="Clear all">
                  <Trash2 className="w-3.5 h-3.5" />
               </button>
            </div>
          </div>

          <div className="max-h-[min(60vh,400px)] overflow-y-auto">
             {notifications.length > 0 ? (
               notifications.map((n) => (
                 <DropdownMenu.Item 
                    key={n.id} 
                    asChild
                    className="p-4 flex items-start gap-4 hover:bg-muted/40 transition-colors cursor-pointer border-b border-border/20 last:border-0 outline-none group"
                 >
                    <Link href={n.path || "#"}>
                       <div className={cn(
                         "w-10 h-10 rounded-sm flex items-center justify-center flex-shrink-0 animate-pulse",
                         n.level === "ERROR" ? "bg-rose-500/10 text-rose-500" : "bg-primary/10 text-primary"
                       )}>
                          {getIcon(n.type)}
                       </div>
                       <div className="flex flex-col gap-1 min-w-0">
                          <div className="flex items-center justify-between">
                             <span className={cn("text-[11px] font-black uppercase tracking-tighter leading-none", n.level === "ERROR" ? "text-rose-500" : "text-primary")}>
                                {n.type} Signal
                             </span>
                             <span className="text-[9px] font-bold text-muted-foreground whitespace-nowrap">
                                {formatDistanceToNow(new Date(n.timestamp))} ago
                             </span>
                          </div>
                          <h4 className="text-xs font-bold text-foreground truncate">{n.title}</h4>
                          <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2">{n.message}</p>
                       </div>
                       <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30 ml-auto group-hover:translate-x-0.5 transition-transform" />
                    </Link>
                 </DropdownMenu.Item>
               ))
             ) : (
               <div className="p-12 text-center flex flex-col items-center gap-3 opacity-40">
                  <Bell className="w-8 h-8" />
                  <p className="text-xs font-bold uppercase tracking-widest">No signals detected</p>
               </div>
             )}
          </div>

          <div className="p-3 bg-muted/10 border-t border-border/40 text-center">
             <Link href="/monitoring/alerts" className="text-[10px] font-black uppercase tracking-[0.2em] text-primary hover:underline">
                View Global Cluster Health
             </Link>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
