"use client";

import React, { useEffect } from "react";
import { AppProvider, useAppContext } from "@/lib/context";
import { useTheme } from "next-themes";
import { ThemeProvider } from "@/components/theme-provider";

// Dark-background themes (including dark glass)
const DARK_THEMES = ["Woodland", "Midnight Aurora", "Wraith", "Next Gen Ultra", "Deep Space", "Obsidian Glass", "Aurora Glass"];

// Glass themes that need the glass-mode class
const GLASS_THEMES = ["Aurora Glass", "Frosted Glass", "Obsidian Glass", "Silk Glass", "Horizon Glass"];

/**
 * Bridges the custom theme system (AppContext) with next-themes and glass mode.
 */
function ThemeSyncBridge({ children }: { children: React.ReactNode }) {
  const { activeTheme } = useAppContext();
  const { setTheme } = useTheme();

  const [mounted, setMounted] = React.useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Sync dark/light with next-themes and manual class toggle
    const isDark = DARK_THEMES.includes(activeTheme);
    setTheme(isDark ? "dark" : "light");

    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }

    // Toggle glass-mode class on html element
    const isGlass = GLASS_THEMES.includes(activeTheme);
    if (isGlass) {
      document.documentElement.classList.add("glass-mode");
    } else {
      document.documentElement.classList.remove("glass-mode");
    }
  }, [activeTheme, setTheme, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

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
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      enableColorScheme={false}
      disableTransitionOnChange
    >
      <AppProvider>
        <ThemeSyncBridge>
          {children}
        </ThemeSyncBridge>
      </AppProvider>
    </ThemeProvider>
  );
}
