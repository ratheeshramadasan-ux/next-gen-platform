"use client";

import React from "react";
import { Target, Search, Plus, Layers } from "lucide-react";
import { motion } from "framer-motion";

export default function ObjectFinderPage() {
  return (
    <div className="space-y-6 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <Target size={22} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Object Repository</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl">
            Manage UI selectors, screen elements, and application objects used by your automations. Centralize element definitions for reliable bot execution.
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-bold text-sm hover:opacity-90 transition-opacity">
          <Plus size={14} />
          Add Object
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40" />
        <input
          type="text"
          placeholder="Search UI objects, selectors..."
          className="w-full bg-card border border-border/40 rounded-sm pl-9 pr-4 py-2.5 text-sm text-foreground outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all placeholder:text-muted-foreground/30"
        />
      </div>

      {/* Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="w-20 h-20 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
          <Layers size={32} className="text-primary/40" />
        </div>
        <h3 className="text-lg font-bold text-foreground/60 mb-2">No objects defined yet</h3>
        <p className="text-sm text-muted-foreground/50 max-w-sm mb-6">
          Record your first application interaction or manually define UI selectors to build your object repository.
        </p>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-sm font-semibold text-sm hover:opacity-90 transition-opacity">
            <Plus size={14} />
            Add Object
          </button>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-card border border-border/40 rounded-sm font-semibold text-sm hover:border-primary/30 transition-all text-foreground/70">
            Import from Recording
          </button>
        </div>
      </motion.div>
    </div>
  );
}
