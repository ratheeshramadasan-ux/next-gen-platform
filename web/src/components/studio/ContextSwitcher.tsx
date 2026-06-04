"use client";

import React, { useState } from "react";
import { 
  Building2, 
  ChevronDown, 
  Check, 
  Globe, 
  Layers, 
  Zap, 
  ShieldCheck, 
  Database 
} from "lucide-react";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";

export function ContextSwitcher() {
  const { 
    customers, 
    activeCustomer, 
    switchCustomer, 
    availableTenants, 
    activeTenant, 
    switchTenant 
  } = useAppContext();

  const [customerOpen, setCustomerOpen] = useState(false);
  const [tenantOpen, setTenantOpen] = useState(false);

  // Helper for tenant icons
  const getTenantIcon = (type: string) => {
    switch (type) {
      case "PROD": return <ShieldCheck size={12} className="text-emerald-500" />;
      case "DEV": return <Zap size={12} className="text-amber-500" />;
      case "UAT": return <Database size={12} className="text-blue-500" />;
      default: return <Layers size={12} className="text-primary" />;
    }
  };

  return (
    <div className="flex items-center gap-2 h-full py-1">
      {/* Organization / Customer Selector */}
      <div className="relative group/org">
        <button 
          onClick={() => {
            setCustomerOpen(!customerOpen);
            setTenantOpen(false);
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all duration-300",
            "hover:bg-primary/5 border border-transparent hover:border-border/20",
            customerOpen ? "bg-primary/5 border-border/20 shadow-lg" : ""
          )}
        >
          <div className="w-5 h-5 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            <Building2 size={12} />
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm font-black text-foreground/90 tracking-tight">
            {activeCustomer?.companyName || "Select Workspace"}
          </span>
          <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] mt-0.5 opacity-40">Workspace</span>
          </div>
          <ChevronDown size={10} className={cn("ml-2 opacity-40 transition-transform duration-300", customerOpen && "rotate-180")} />
        </button>

        {customerOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-card/90 backdrop-blur-3xl border border-border/40 rounded-sm shadow-2xl z-[60] py-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="px-3 py-1 mb-1">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/30">Switch Workspace Context</span>
            </div>
            <div className="max-h-60 overflow-y-auto no-scrollbar">
              {customers.filter(c => c.status !== "Suspended").map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => {
                    switchCustomer(customer.id);
                    setCustomerOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-left hover:bg-primary/5 transition-colors group/item",
                    activeCustomer?.id === customer.id ? "bg-primary/5" : ""
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-sm flex items-center justify-center transition-all",
                      activeCustomer?.id === customer.id ? "bg-primary/20 text-primary" : "bg-card border border-border/20 text-muted-foreground group-hover/item:border-primary/40 group-hover/item:text-primary"
                    )}>
                      <Building2 size={14} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground/90">{customer.companyName}</span>
                      <span className="text-xs font-medium opacity-40">{customer.industry}</span>
                    </div>
                  </div>
                  {activeCustomer?.id === customer.id && (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check size={10} className="text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-4 w-[1px] bg-border/20 mx-1" />

      {/* Tenant / Environment Selector */}
      <div className="relative group/tenant">
        <button 
          onClick={() => {
            setTenantOpen(!tenantOpen);
            setCustomerOpen(false);
          }}
          disabled={!activeCustomer}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-sm transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed",
            "hover:bg-primary/5 border border-transparent hover:border-border/20",
            tenantOpen ? "bg-primary/5 border-border/20 shadow-lg" : ""
          )}
        >
          <div className="w-5 h-5 rounded-md bg-foreground/5 flex items-center justify-center text-foreground/60">
            {activeTenant ? getTenantIcon(activeTenant.type) : <Layers size={12} />}
          </div>
          <div className="flex flex-col items-start leading-tight">
            <span className="text-sm font-black text-foreground/90 tracking-tight">
              {activeTenant?.name || "No Tenant"}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {activeTenant && (
                <div className="px-1 py-0.5 rounded-[3px] bg-foreground/5 text-xs font-black text-foreground/60 leading-none">
                  {activeTenant.type}
                </div>
              )}
              <span className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] opacity-40">Tenant</span>
            </div>
          </div>
          <ChevronDown size={10} className={cn("ml-2 opacity-40 transition-transform duration-300", tenantOpen && "rotate-180")} />
        </button>

        {tenantOpen && (
          <div className="absolute top-full left-0 mt-2 w-64 bg-card/90 backdrop-blur-3xl border border-border/40 rounded-sm shadow-2xl z-[60] py-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="px-3 py-1 mb-1">
              <span className="text-xs font-black uppercase tracking-[0.2em] text-foreground/30">Switch Tenant</span>
            </div>
            <div className="max-h-60 overflow-y-auto no-scrollbar">
              {availableTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => {
                    switchTenant(tenant.id);
                    setTenantOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-left hover:bg-primary/5 transition-colors group/item",
                    activeTenant?.id === tenant.id ? "bg-primary/5" : ""
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-7 h-7 rounded-sm flex items-center justify-center transition-all",
                      activeTenant?.id === tenant.id ? "bg-foreground/10 text-foreground" : "bg-card border border-border/20 text-muted-foreground group-hover/item:border-foreground/40"
                    )}>
                      {getTenantIcon(tenant.type)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground/90">{tenant.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black opacity-40 uppercase tracking-tighter">{tenant.code}</span>
                        {tenant.isDefault && (
                          <span className="text-xs font-bold text-primary">Default</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {activeTenant?.id === tenant.id && (
                    <Check size={12} className="text-primary" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Click-out Overlay */}
      {(customerOpen || tenantOpen) && (
        <div 
          className="fixed inset-0 z-50 cursor-default" 
          onClick={() => {
            setCustomerOpen(false);
            setTenantOpen(false);
          }}
        />
      )}
    </div>
  );
}
