"use client";

import React, { useState } from "react";
import { TopNav } from "./components/TopNav";
import { DocumentInbox } from "./components/DocumentInbox";
import { ReviewMainPanel } from "./components/ReviewMainPanel";
import { DataExtractionSidebar } from "./components/DataExtractionSidebar";
import { ActivityLogSidebar } from "./components/ActivityLogSidebar";
import { AnimatePresence, motion } from "framer-motion";

export default function ActionCenterPage() {
  const [selectedDocId, setSelectedDocId] = useState("1");
  const [showActivityLog, setShowActivityLog] = useState(true);

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden rounded-sm border border-border">
      {/* Top Level Navigation */}
      <TopNav activeItem="Action Center" />

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar: Inbox */}
        <DocumentInbox 
          selectedId={selectedDocId} 
          onSelect={(id) => setSelectedDocId(id)} 
        />

        {/* Center: Main Review Area */}
        <ReviewMainPanel />

        {/* Right Sidebar: Data Validation */}
        <DataExtractionSidebar />

        {/* Activity Log (Toggleable) */}
        <AnimatePresence>
          {showActivityLog && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 288, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="overflow-hidden bg-background shrink-0"
            >
              <ActivityLogSidebar onClose={() => setShowActivityLog(false)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Experimental Footer / Status Bar */}
      <div className="h-8 border-t border-border bg-muted/20 flex items-center px-4 justify-between shrink-0">
        <div className="flex items-center gap-4 text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
           <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"/> API Gateway: Connected</span>
           <span className="opacity-40">|</span>
           <span>Model: Invoice-LLM-v4</span>
        </div>
        <div className="text-[9px] font-bold text-muted-foreground">
           All modifications are cryptographically signed.
        </div>
      </div>
    </div>
  );
}
