"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppContext, ThemeName, IconSetName, FontName } from "@/lib/context";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { 
  Palette, Check, Sun, Moon, Zap, MousePointer2, Layers, Ghost,
  Fingerprint, Box, Compass, Monitor, Sparkles, Type, Pipette,
  Layout, RotateCcw, Eye, Gem
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

import { updateCustomerThemeAction } from "@/app/actions/tenantActions";

export default function ThemeSettingsPage() {
  const { 
    activeTheme, setActiveTheme, 
    activeIconSet, setActiveIconSet,
    activeFont, setActiveFont,
    activeBackground, setActiveBackground,
    panelOpacity, setPanelOpacity,
    activeTextSize, setActiveTextSize,
    activeCustomer
  } = useAppContext();

  // Design Lab state
  const [labPrimary, setLabPrimary] = useState("");
  const [labAccent, setLabAccent] = useState("");
  const [labActive, setLabActive] = useState(false);
  const [contentScale, setContentScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!labActive) return;
    if (labPrimary && /^#[0-9A-Fa-f]{6}$/.test(labPrimary)) {
      document.documentElement.style.setProperty('--primary', labPrimary);
    }
    if (labAccent && /^#[0-9A-Fa-f]{6}$/.test(labAccent)) {
      document.documentElement.style.setProperty('--accent', labAccent);
    }
    return () => {
      document.documentElement.style.removeProperty('--primary');
      document.documentElement.style.removeProperty('--accent');
    };
  }, [labPrimary, labAccent, labActive]);

  useEffect(() => {
    const recalculateScale = () => {
      if (!viewportRef.current || !contentRef.current) return;

      const availableHeight = viewportRef.current.clientHeight;
      const contentHeight = contentRef.current.scrollHeight;
      if (availableHeight <= 0 || contentHeight <= 0) return;

      // Keep typography readable; prefer mild scaling and fallback to scroll.
      const nextScale = Math.min(1, Math.max(0.9, availableHeight / contentHeight));
      setContentScale(nextScale);
    };

    recalculateScale();
    window.addEventListener("resize", recalculateScale);

    return () => {
      window.removeEventListener("resize", recalculateScale);
    };
  }, [activeTheme, activeFont, activeIconSet, activeTextSize, panelOpacity]);

  const themes: { name: ThemeName; colors: string[]; desc: string; category: "light" | "dark" | "glass" }[] = [
    // Light
    { name: "Sand Serenity", colors: ["#714329", "#E5D8C9", "#B08463"], desc: "Warm beige and terracotta", category: "light" },
    { name: "Ink Wash", colors: ["#252525", "#F8F9FA", "#7D7D7D"], desc: "Minimalist grayscale", category: "light" },
    { name: "Jade Pebble", colors: ["#7B9669", "#E6E6E6", "#6C8480"], desc: "Earthy sage greens", category: "light" },
    { name: "Opaline", colors: ["#FF634A", "#F4F4F6", "#D2D2D4"], desc: "Bright coral accent", category: "light" },
    { name: "Arctic Reflection", colors: ["#5289AD", "#F4FCFB", "#243C4C"], desc: "Cool arctic blues", category: "light" },
    // Dark
    { name: "Woodland", colors: ["#AAD31E", "#525034", "#9F7560"], desc: "Deep forest organic", category: "dark" },
    { name: "Midnight Aurora", colors: ["#14B8A6", "#020617", "#F43F5E"], desc: "Cosmic emerald glow", category: "dark" },
    { name: "Wraith", colors: ["#047C58", "#1E1702", "#8C886B"], desc: "Spectral dark emerald", category: "dark" },
    { name: "Next Gen Ultra", colors: ["#00D1FF", "#050505", "#A855F7"], desc: "Electric cyan flagship", category: "dark" },
    { name: "Deep Space", colors: ["#6366F1", "#020205", "#F43F5E"], desc: "Extreme dark cosmic depth", category: "dark" },
    // Glass
    { name: "Aurora Glass", colors: ["#FBBF24", "#FAD961", "#F76B1C"], desc: "Warm ambient amber glow (Image 1)", category: "glass" },
    { name: "Frosted Glass", colors: ["#6366F1", "#FFDEE9", "#B5FFFC"], desc: "Soft pastel smart home (Image 2)", category: "glass" },
    { name: "Obsidian Glass", colors: ["#1DB954", "#05050A", "#38BDF8"], desc: "Deep dark Spotify-style (Image 3)", category: "glass" },
    { name: "Silk Glass", colors: ["#E2725B", "#FAF9F6", "#A8816B"], desc: "Minimalist light silk (Image 4)", category: "glass" },
    { name: "Horizon Glass", colors: ["#3B82F6", "#8BC6EC", "#9599E2"], desc: "Clean data dashboard (Image 5)", category: "glass" },
  ];

  const lightThemes = themes.filter(t => t.category === "light");
  const darkThemes = themes.filter(t => t.category === "dark");
  const glassThemes = themes.filter(t => t.category === "glass");

  const iconSets: { name: IconSetName; icon: any }[] = [
    { name: "Standard", icon: Box },
    { name: "Glow Aura", icon: Sparkles },
    { name: "Minimal Thin", icon: MousePointer2 },
    { name: "Vibrant Duotone", icon: Layers },
    { name: "Sharp Tech", icon: Compass },
  ];

  const fonts: { name: FontName; family: string; desc: string; category: string }[] = [
    { name: "Inter", family: "'Inter', sans-serif", desc: "Top modern UI choice. Extremely readable at small sizes.", category: "Dashboards, SaaS, Admin" },
    { name: "Roboto", family: "'Roboto', sans-serif", desc: "Google standard workhorse. Clean geometric structure.", category: "Corporate, Web Apps" },
    { name: "Open Sans", family: "'Open Sans', sans-serif", desc: "Corporate default classic. Neutral and highly legible.", category: "Government, Business" },
    { name: "Lato", family: "'Lato', sans-serif", desc: "Humanist + professional balance. Warm but serious.", category: "Modern Brands, approachable" },
    { name: "Montserrat", family: "'Montserrat', sans-serif", desc: "Modern branding favorite. Strong geometric structure.", category: "Startups, Tech, Marketing" },
    { name: "Helvetica", family: "'Helvetica', 'Arial', sans-serif", desc: "Enterprise legacy standard. Extremely neutral.", category: "Internal Tools, Strict Corporate" },
    { name: "Avenir", family: "'Avenir Next', 'Segoe UI', sans-serif", desc: "Premium feel. Clean but slightly human geometry.", category: "Consulting, Luxury Brands" },
    { name: "Playfair Display", family: "'Playfair Display', serif", desc: "Editorial elegance. Serifs for sophisticated headlines.", category: "Editorial, Luxury Branding" },
    { name: "Cambria", family: "'Cambria', 'Georgia', serif", desc: "Traditional serif. Excellent for document clarity.", category: "Academic, Legal, Formal" },
    { name: "JetBrains Mono", family: "'JetBrains Mono', monospace", desc: "Developer focused. Fixed-width for technical data.", category: "Technical, Code, Logs" },
    { name: "Plus Jakarta Sans", family: "'Plus Jakarta Sans', sans-serif", desc: "Modern and airy. Great for clean dashboards.", category: "Modern UI, Fintech" },
  ];

  function GlassCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
      <div 
        className={cn(
          "rounded-sm border",
          "border-white/[0.08] dark:border-white/[0.06]",
          "bg-white/40 dark:bg-white/[0.03] backdrop-blur-2xl",
          "shadow-[0_8px_32px_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.25)]",
          "transition-all duration-300",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  const handleThemeChange = async (themeName: ThemeName) => {
    setActiveTheme(themeName);
    if (activeCustomer) {
      await updateCustomerThemeAction(activeCustomer.id, themeName);
    }
  };

  function ThemeCard({ theme }: { theme: typeof themes[0] }) {
    const isActive = activeTheme === theme.name;
    const isGlass = theme.category === "glass";
    return (
      <motion.button
        whileHover={{ y: -3, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => handleThemeChange(theme.name)}
        className={cn(
          "relative text-left p-2.5 rounded-sm border transition-all duration-200 w-full max-w-[150px] h-full min-h-[86px]",
          isGlass 
            ? "bg-gradient-to-br from-white/20 to-white/5 dark:from-white/[0.06] dark:to-white/[0.01] backdrop-blur-xl" 
            : "bg-white/30 dark:bg-white/[0.03]",
          isActive
            ? "ring-2 ring-primary border-primary/40 shadow-lg shadow-primary/15"
            : "border-white/10 dark:border-white/[0.06] hover:border-primary/30 hover:shadow-md"
        )}
      >
        {isActive && (
          <div className="absolute top-2.5 right-2.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
            <Check size={9} className="text-primary-foreground" strokeWidth={3} />
          </div>
        )}
        <div className="flex gap-1 mb-1.5">
          {theme.colors.map((color, idx) => (
            <div 
              key={idx} 
              className={cn("w-4 h-4 rounded-full shadow-sm", isGlass && "ring-1 ring-white/20")}
              style={{ backgroundColor: color, border: '1px solid rgba(0,0,0,0.1)' }} 
            />
          ))}
        </div>
        <span className="text-[10px] font-bold block leading-tight">{theme.name}</span>
        <span className="text-[9px] text-muted-foreground leading-tight line-clamp-2">{theme.desc}</span>
      </motion.button>
    );
  }

  const handleLabReset = () => {
    setLabActive(false);
    setLabPrimary("");
    setLabAccent("");
    document.documentElement.style.removeProperty('--primary');
    document.documentElement.style.removeProperty('--accent');
  };

  const scaledWidth = `${100 / contentScale}%`;

  return (
    <div ref={viewportRef} className="flex flex-col h-full overflow-y-auto items-center custom-scrollbar">
      <div
        ref={contentRef}
        className="w-full p-3 md:p-4 lg:p-5 space-y-4 origin-top"
        style={{
          transform: `scale(${contentScale})`,
          width: scaledWidth,
          maxWidth: "none",
        }}
      >
        
        {/* ─── Header ─── */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-sm bg-primary/15 flex items-center justify-center">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Appearance</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">Customize how Next Gen looks across every module.</p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Eye size={12} />
            <span>{activeTheme}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:[grid-template-columns:1.2fr_0.9fr_0.9fr] gap-4 items-start">
          <div className="flex flex-col gap-4">
          {/* Theme Palette */}
          <GlassCard className="p-4 md:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Palette size={13} className="text-muted-foreground" />
              <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Theme Palette</h2>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Sun size={13} className="text-amber-500" />
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Light</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-1.5 justify-items-center">
                {lightThemes.map(t => <ThemeCard key={t.name} theme={t} />)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Moon size={13} className="text-indigo-400" />
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Dark</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-1.5 justify-items-center">
                {darkThemes.map(t => <ThemeCard key={t.name} theme={t} />)}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2.5">
                <Gem size={13} className="text-fuchsia-400" />
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Glass</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-1.5 justify-items-center">
                {glassThemes.map(t => <ThemeCard key={t.name} theme={t} />)}
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 dark:border-white/[0.06] space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Panel Transparency</h3>
                <span className="text-[10px] font-mono font-bold text-fuchsia-400 bg-fuchsia-400/10 px-2 py-0.5 rounded border border-fuchsia-400/20">
                  {Math.round(panelOpacity * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Ghost size={13} className="text-muted-foreground" />
                <input
                  type="range" min="0" max="1" step="0.01" value={panelOpacity}
                  onChange={(e) => setPanelOpacity(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 bg-white/20 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-fuchsia-500"
                />
                <Monitor size={13} className="text-muted-foreground" />
              </div>
            </div>
          </GlassCard>

          {/* ─── Design Lab ─── */}
          <GlassCard className="p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-sm bg-primary/15 flex items-center justify-center">
                  <Pipette size={16} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold tracking-tight">Design Lab</h2>
                  <p className="text-[11px] text-muted-foreground">Temporarily override colors with any hex code. Resets when you navigate away.</p>
                </div>
              </div>
              {labActive && (
                <button 
                  onClick={handleLabReset}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest hover:text-primary transition-colors px-3 py-1.5 rounded-sm border border-border hover:border-primary/30"
                >
                  <RotateCcw size={12} /> Reset
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Inputs */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm shadow-inner border border-black/10 shrink-0" style={{ backgroundColor: labPrimary || 'var(--primary)' }} />
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Primary Color</label>
                    <input 
                      value={labPrimary} placeholder="e.g. #3B82F6"
                      onChange={(e) => { setLabActive(true); setLabPrimary(e.target.value); }}
                      className="w-full bg-white/30 dark:bg-white/[0.04] border border-white/10 dark:border-white/[0.06] rounded-sm px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-sm shadow-inner border border-black/10 shrink-0" style={{ backgroundColor: labAccent || 'var(--accent)' }} />
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground block mb-1">Accent Color</label>
                    <input 
                      value={labAccent} placeholder="e.g. #A855F7"
                      onChange={(e) => { setLabActive(true); setLabAccent(e.target.value); }}
                      className="w-full bg-white/30 dark:bg-white/[0.04] border border-white/10 dark:border-white/[0.06] rounded-sm px-3 py-2 text-xs font-mono outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/40"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">Paste hex codes from Figma, Coolors, or any design tool.</p>
              </div>

              {/* Preview */}
              <div className="rounded-sm border border-white/10 dark:border-white/[0.06] bg-white/20 dark:bg-white/[0.02] backdrop-blur-xl p-4 md:p-5 flex flex-col items-center justify-center gap-4">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Preview</span>
                <div className="flex items-center gap-6">
                  {[Layout, Zap, Ghost, Monitor, Fingerprint].map((Icon, idx) => (
                    <IconWrapper key={idx} icon={Icon} size={24} className="text-primary transition-colors duration-300" />
                  ))}
                </div>
                <div className="flex gap-3">
                  <div className="px-5 py-2 rounded-sm bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider shadow-lg shadow-primary/20">
                    Action
                  </div>
                  <div className="px-5 py-2 rounded-sm bg-accent/15 text-accent text-[10px] font-bold uppercase tracking-wider border border-accent/20">
                    Accent
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="w-16 h-1.5 rounded-full bg-primary" />
                  <div className="w-10 h-1.5 rounded-full bg-accent" />
                  <div className="w-8 h-1.5 rounded-full bg-primary/30" />
                </div>
              </div>
            </div>
          </GlassCard>
          </div>

          {/* Typography */}
          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center gap-2 mb-4">
              <Type size={13} className="text-muted-foreground" />
              <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Typography</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fonts.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setActiveFont(f.name)}
                  className={cn(
                    "p-4 rounded-sm border backdrop-blur-sm text-left transition-all flex flex-col gap-2 group relative overflow-hidden",
                    "bg-white/10 dark:bg-white/[0.02]",
                    activeFont === f.name
                      ? "ring-2 ring-primary border-primary/30 bg-primary/5"
                      : "border-white/10 dark:border-white/[0.06] hover:border-primary/20"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-black uppercase tracking-wider text-foreground">{f.name}</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter">{f.category.split(',')[0]}</span>
                    </div>
                    <span className="text-3xl font-bold tracking-tighter opacity-50 group-hover:opacity-100 transition-opacity" style={{ fontFamily: f.family }}>Ag</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    <p className="text-[10px] font-medium text-muted-foreground leading-snug line-clamp-2 italic">{f.desc}</p>
                    <div className="flex items-center gap-1.5 pt-1 border-t border-white/5 mt-1">
                      <span className="text-[8px] font-black text-primary uppercase tracking-tighter">Strategic Use:</span>
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter truncate">{f.category}</span>
                    </div>
                  </div>
                  {activeFont === f.name && (
                    <div className="absolute top-0 right-0 p-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </GlassCard>

          <div className="flex flex-col gap-4">
            {/* Icon Style */}
            <GlassCard className="p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={13} className="text-muted-foreground" />
                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Icon Style</h2>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {iconSets.map((set) => (
                  <button
                    key={set.name}
                    onClick={() => setActiveIconSet(set.name)}
                    className={cn(
                      "flex items-center gap-3 p-3.5 rounded-sm border backdrop-blur-sm transition-all min-h-[92px]",
                      "bg-white/20 dark:bg-white/[0.02]",
                      activeIconSet === set.name
                        ? "ring-2 ring-primary border-primary/30"
                        : "border-white/10 dark:border-white/[0.06] hover:border-primary/30"
                    )}
                  >
                    <IconWrapper icon={set.icon} size={18} className={activeIconSet === set.name ? "text-primary" : "text-muted-foreground"} />
                    <span className="menu-item-label text-xs font-bold text-muted-foreground uppercase tracking-wider">{set.name}</span>
                  </button>
                ))}
              </div>
            </GlassCard>

            {/* Text Size */}
            <GlassCard className="p-4 md:p-5">
              <div className="flex items-center gap-2 mb-4">
                <Type size={13} className="text-muted-foreground" />
                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Global Text Size</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 justify-items-center">
                {[
                  { id: 'Tiny', label: 'Tiny', desc: 'Ultra Compact', size: 'text-[10px]' },
                  { id: 'Small', label: 'Small', desc: 'Max Info Density', size: 'text-sm' },
                  { id: 'Regular', label: 'Regular', desc: 'Standard View', size: 'text-base' },
                  { id: 'Large', label: 'Large', desc: 'High Visibility', size: 'text-lg' },
                  { id: 'Extra Large', label: 'Extra Large', desc: 'Accessibility+', size: 'text-xl' },
                  { id: 'Gigantic', label: 'Gigantic', desc: 'Kiosk Mode', size: 'text-2xl' }
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveTextSize(s.id as any)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-sm border transition-all min-h-[92px] w-full",
                      "bg-white/20 dark:bg-white/[0.02] backdrop-blur-sm",
                      activeTextSize === s.id
                        ? "ring-2 ring-primary border-primary/30 shadow-lg shadow-primary/10"
                        : "border-white/10 dark:border-white/[0.06] hover:border-primary/20"
                    )}
                  >
                    <span className={cn("font-bold mb-1", s.size)}>Aa</span>
                    <span className="text-sm font-black uppercase tracking-[0.1em] text-foreground leading-none">{s.label}</span>
                    <span className="text-[9px] text-muted-foreground font-medium mt-1.5 text-center leading-tight">{s.desc}</span>
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 items-start">
          {/* ─── Background Gallery ─── */}
          <GlassCard className="p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers size={13} className="text-muted-foreground" />
                <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">Dashboard Background</h2>
              </div>
              {activeBackground && (
                <button 
                  onClick={() => setActiveBackground(null)}
                  className="text-[9px] font-bold text-primary hover:underline uppercase tracking-wider"
                >
                  Reset to Theme Default
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-2.5">
            <button
              onClick={() => setActiveBackground(null)}
              className={cn(
                "group relative aspect-video rounded-sm border overflow-hidden transition-all",
                !activeBackground ? "ring-2 ring-primary border-primary/30" : "border-white/10 dark:border-white/[0.06]"
              )}
            >
              <div className="absolute inset-0 bg-muted/20 flex flex-col items-center justify-center gap-1 group-hover:bg-muted/30 transition-colors">
                <RotateCcw size={14} className="text-muted-foreground" />
                <span className="text-[8px] font-bold uppercase tracking-tighter text-muted-foreground">Default</span>
              </div>
            </button>
            {[
              { id: 'cyber-city', name: 'Cyber City' },
              { id: 'nebula-dreams', name: 'Nebula Dreams' },
              { id: 'emerald-forest', name: 'Emerald Forest' },
              { id: 'minimalist-slate', name: 'Minimalist Slate' },
              { id: 'aurora-peaks', name: 'Aurora Peaks' },
              { id: 'silicon-valley', name: 'Silicon Valley' },
              { id: 'ocean-depth', name: 'Ocean Depth' },
              { id: 'sahara-sands', name: 'Sahara Sands' },
              { id: 'arctic-aurora', name: 'Arctic Aurora' },
              { id: 'frosted-glass', name: 'Frosted Glass' },
            ].map((bg) => {
              const url = `/backgrounds/dashboard/${bg.id}.png`;
              const isActive = activeBackground === url;
              return (
                <button
                  key={bg.id}
                  onClick={() => setActiveBackground(url)}
                  className={cn(
                    "group relative aspect-video rounded-sm border overflow-hidden transition-all transform hover:scale-[1.03]",
                    isActive ? "ring-2 ring-primary border-primary/30" : "border-white/10 dark:border-white/[0.06] hover:border-white/20"
                  )}
                >
                  <img src={url} alt={bg.name} className="absolute inset-0 w-full h-full object-cover" />
                  <div className={cn(
                    "absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors",
                    isActive && "bg-black/0"
                  )} />
                  <div className="absolute bottom-0 inset-x-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent">
                    <span className="text-[8px] font-bold text-white uppercase tracking-tighter truncate block">{bg.name}</span>
                  </div>
                  {isActive && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg">
                      <Check size={9} className="text-primary-foreground" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
            </div>
          </GlassCard>

        </div>

      </div>
    </div>
  );
}
