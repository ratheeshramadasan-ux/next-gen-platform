"use client";

import React, { useEffect } from "react";
import { usePersonalizationStore } from "@/stores/usePersonalizationStore";
import { LaunchpadEngine } from "@/components/launchpad/LaunchpadEngine";
import { AICommandBar } from "@/components/launchpad/AICommandBar";
import { ImmersiveLaunchpad } from "@/components/launchpad/ImmersiveLaunchpad";
import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";

export default function LaunchpadPage() {
  const { loadWorkspace, setUserId, isLoading, navigationMode } = usePersonalizationStore();
  const { theme } = useTheme();

  useEffect(() => {
    // Mock user for demonstration. In real app, comes from session.
    setUserId("00000000-0000-0000-0000-000000000001");
    loadWorkspace();
  }, [loadWorkspace, setUserId]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-widest uppercase text-xs">Initializing Enterprise AI</p>
        </div>
      </div>
    );
  }

  if (navigationMode === "immersive") {
    return <ImmersiveLaunchpad />;
  }

  return (
    <div className="h-full w-full relative overflow-hidden bg-transparent text-foreground transition-colors duration-300">
      {/* Main Content Area */}
      <div className="relative z-10 h-full flex flex-col overflow-hidden">
        <LaunchpadEngine />
        <AICommandBar />
      </div>
    </div>
  );
}
