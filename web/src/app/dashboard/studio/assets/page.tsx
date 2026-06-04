"use client";

import React from "react";
import { Database, Search, Plus, KeyRound, FileText, Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function GlobalAssetsPage() {
  return (
    <div className="space-y-6 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <Database size={22} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Global Assets</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl">
            Manage credentials, configuration files, and shared resources used across your automations.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-bold text-sm hover:opacity-90 transition-opacity">
          <Plus size={14} />
          Add Asset
        </button>
      </div>

      {/* Asset Type Filters */}
      <div className="flex items-center gap-2">
        {[
          { label: "All Assets", icon: Database, active: true },
          { label: "Credentials", icon: KeyRound, active: false },
          { label: "Config Files", icon: FileText, active: false },
          { label: "Connections", icon: Settings, active: false },
        ].map((filter, i) => (
          <button
            key={i}
            className={`flex items-center gap-2 px-3 py-2 rounded-sm text-[11px] font-semibold transition-all border ${
              filter.active
                ? "bg-primary/10 border-primary/20 text-primary"
                : "bg-card border-border/30 text-muted-foreground hover:border-primary/20 hover:text-foreground"
            }`}
          >
            <filter.icon size={13} />
            {filter.label}
          </button>
        ))}
      </div>

      {/* Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <KeyRound size={32} className="text-primary/40" />
        </div>
        <h3 className="text-lg font-bold text-foreground/60 mb-2">No assets configured yet</h3>
        <p className="text-sm text-muted-foreground/50 max-w-sm mb-6">
          Add credentials, connection strings, or configuration files that your automations can reference securely.
        </p>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-semibold text-sm hover:opacity-90 transition-opacity">
          <Plus size={14} />
          Add First Asset
        </button>
      </motion.div>
    </div>
  );
}
