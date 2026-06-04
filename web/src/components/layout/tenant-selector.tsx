"use client";

import React, { useState } from "react";
import { Building2, Globe, ChevronDown, Check, LayoutGrid } from "lucide-react";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export const TenantSelector = () => {
  const { 
    customers, 
    activeCustomer, 
    switchCustomer, 
    availableTenants, 
    activeTenant, 
    switchTenant,
    currentUser
  } = useAppContext();

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<"CUSTOMER" | "TENANT">("CUSTOMER");
  const [closeTimeout, setCloseTimeout] = useState<NodeJS.Timeout | null>(null);

  // Determine if selector should be disabled (fixed mapping)
  const isCustomerLocked = !!currentUser.customerId;
  const isTenantLocked = !!currentUser.tenantId;

  const handleCustomerSelect = (id: string) => {
    switchCustomer(id);
    setView("TENANT");
    // Don't close yet, user needs to pick a workspace
  };

  const handleTenantSelect = (id: string) => {
    switchTenant(id);
    setIsOpen(false);
  };

  const handleMouseEnter = () => {
    if (closeTimeout) {
      clearTimeout(closeTimeout);
      setCloseTimeout(null);
    }
  };

  const handleMouseLeave = () => {
    const timer = setTimeout(() => {
      setIsOpen(false);
    }, 800); // 800ms grace period for premium feel
    setCloseTimeout(timer);
  };

  if (!activeCustomer) return null;

  return (
    <div 
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        onClick={() => !isTenantLocked && setIsOpen(!isOpen)}
        disabled={isTenantLocked}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 bg-muted/40 hover:bg-muted/60 border border-border rounded-sm transition-all group",
          isTenantLocked && "opacity-80 cursor-default"
        )}
      >
        <div className="flex flex-col items-start leading-tight">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            <Building2 size={10} />
            <span>{activeCustomer.companyName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black">
            <Globe size={11} className="text-primary" />
            <span>{activeTenant?.name || "Global View"}</span>
          </div>
        </div>
        {!isTenantLocked && (
          <ChevronDown 
            size={14} 
            className={cn("text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} 
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)} 
            />
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              className="absolute top-full left-0 mt-2 w-64 bg-background border border-border shadow-2xl rounded-sm z-50 overflow-hidden"
            >
              <div className="flex items-center border-b border-border">
                <button
                  onClick={() => setView("CUSTOMER")}
                  disabled={isCustomerLocked}
                  className={cn(
                    "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                    view === "CUSTOMER" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-muted/50",
                    isCustomerLocked && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Workspace
                </button>
                <button
                  onClick={() => setView("TENANT")}
                  className={cn(
                    "flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all",
                    view === "TENANT" ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  Tenant
                </button>
              </div>

              <div className="p-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                {view === "CUSTOMER" ? (
                  <div className="py-1">
                    {customers.filter(c => c.status !== "Suspended").map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleCustomerSelect(c.id)}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 text-sm rounded-sm transition-all group",
                          activeCustomer.id === c.id ? "bg-primary/5 text-primary font-bold" : "hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className={cn(activeCustomer.id === c.id ? "text-primary" : "text-muted-foreground")} />
                          <span>{c.companyName}</span>
                        </div>
                        {activeCustomer.id === c.id && <Check size={14} />}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="py-1">
                    {availableTenants.length > 0 ? (
                      availableTenants.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => handleTenantSelect(t.id)}
                          className={cn(
                            "w-full flex items-center justify-between px-3 py-2 text-sm rounded-sm transition-all group",
                            activeTenant?.id === t.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                          )}
                        >
                          <div className="flex flex-col items-start">
                            <span className="font-bold">{t.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{t.code} • {t.type}</span>
                          </div>
                          {activeTenant?.id === t.id && <Check size={14} />}
                        </button>
                      ))
                    ) : (
                      <div className="py-8 text-center">
                        <p className="text-xs text-muted-foreground">No workspaces found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {view === "TENANT" && !isCustomerLocked && (
                <div className="p-2 border-t border-border bg-muted/20">
                  <button 
                    onClick={() => setView("CUSTOMER")}
                    className="w-full py-1.5 text-[9px] font-bold uppercase tracking-tighter text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1.5"
                  >
                    <LayoutGrid size={10} />
                    Switch Workspace
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
