"use client";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { AppProvider, useAppContext } from "@/lib/context";
import { UIProvider, useUIStore } from "@/lib/ui-store";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "@/components/layout/global-search";
import { ContextPanel } from "@/components/layout/context-panel";
import { KnowledgeBasePanel } from "@/components/layout/knowledge-base-panel";

function DashboardContent({ children }: { children: React.ReactNode }) {
  const { activeBackground } = useAppContext();
  const { contextPanelType } = useUIStore();
  const pathname = usePathname();
  // Immersive Mode detection (No outer containers for the IDE, but keep Sidebar)
  const isDesigner = pathname.includes("/studio/designer");
  
  return (
    <div 
      className="flex h-dvh overflow-hidden bg-background relative transition-all duration-700 ease-in-out"
      style={{
        backgroundImage: activeBackground ? `url('${activeBackground}')` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Ambient Overlay for the whole page */}
      {activeBackground && (
        <div className="absolute inset-0 bg-background/30 backdrop-blur-[2px] pointer-events-none z-0" />
      )}
      
      <div className="relative z-10 flex w-full h-full min-h-0">
        <Sidebar defaultCollapsed={isDesigner} />
        <main className={cn(
          "flex-1 w-full relative h-full min-h-0 flex flex-col overflow-hidden",
          isDesigner ? "overflow-hidden" : ""
        )}>
          <GlobalSearch />

          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 relative h-full min-h-0 overflow-hidden">
              <div className="w-full h-full p-3 md:p-4 transition-all duration-300 overflow-hidden">
                <div className={cn(
                  "dashboard-page-shell backdrop-blur-xl rounded-xl border border-white/10 shadow-xl h-full overflow-hidden flex flex-col",
                  activeBackground ? "bg-background/60 dark:bg-black/40" : "bg-background shadow-none border-none",
                  isDesigner ? "rounded-2xl p-1" : "p-4 md:p-5"
                )}>
                  {children}
                </div>
              </div>
            </div>

            {/* Knowledge Base Panel — slides in from right */}
            {!isDesigner && <KnowledgeBasePanel />}
          </div>
        </main>

        {!isDesigner && <ContextPanel />}
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <UIProvider>
        <DashboardContent>{children}</DashboardContent>
      </UIProvider>
    </AppProvider>
  );
}
