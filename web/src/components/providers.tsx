"use client";

import React from "react";
import { AppProvider, useAppContext, GLASS_THEMES } from "@/lib/context";

/**
 * Renders the animated glass-mode background blobs when a glass theme is active.
 * Dark/glass class toggling itself lives in AppProvider (lib/context.tsx) so the
 * `dark` class is available as early as possible (no separate client-only bridge needed).
 */
function ThemeSyncBridge({ children }: { children: React.ReactNode }) {
  const { activeTheme } = useAppContext();

  return (
    <>
      {children}
      {GLASS_THEMES.includes(activeTheme) && (
        <div className="blob-container">
          <div className="blob w-[600px] h-[600px] -top-20 -right-20 bg-primary/20" />
          <div className="blob w-[500px] h-[500px] -bottom-20 -left-20 bg-accent/20" />
          <div className="blob w-[300px] h-[300px] top-1/2 left-1/3 bg-primary/10" style={{ animationDelay: '-5s' }} />
        </div>
      )}
    </>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <ThemeSyncBridge>
        {children}
      </ThemeSyncBridge>
    </AppProvider>
  );
}
