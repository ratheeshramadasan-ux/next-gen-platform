"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAppContext, ThemeName, IconSetName, FontName } from "@/lib/context";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { 
  Palette, Check, Sun, Moon, Zap, MousePointer2, Layers, Ghost,
  Fingerprint, Box, Compass, Monitor, Sparkles, Type, Pipette,
  Layout, RotateCcw, Eye, Gem, Cpu, Terminal
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
  const [labPrimaryFg, setLabPrimaryFg] = useState("");
  const [labAccent, setLabAccent] = useState("");
  const [labAccentFg, setLabAccentFg] = useState("");
  const [labBg, setLabBg] = useState("");
  const [labFg, setLabFg] = useState("");
  const [labCard, setLabCard] = useState("");
  const [labCardFg, setLabCardFg] = useState("");
  const [labBorder, setLabBorder] = useState("");
  const [labActive, setLabActive] = useState(false);
  const [activeLabField, setActiveLabField] = useState<string | null>("primary");
  const [contentScale, setContentScale] = useState(1);
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const applyColor = (name: string, val: string) => {
      if (val && (/^#[0-9A-Fa-f]{3}$/.test(val) || /^#[0-9A-Fa-f]{6}$/.test(val))) {
        document.body.style.setProperty(name, val);
      }
    };

    applyColor('--primary', labPrimary);
    applyColor('--primary-foreground', labPrimaryFg);
    applyColor('--accent', labAccent);
    applyColor('--accent-foreground', labAccentFg);
    applyColor('--background', labBg);
    applyColor('--foreground', labFg);
    applyColor('--card', labCard);
    applyColor('--card-foreground', labCardFg);
    applyColor('--border', labBorder);

    return () => {
      ['--primary', '--primary-foreground', '--accent', '--accent-foreground', '--background', '--foreground', '--card', '--card-foreground', '--border'].forEach(p => {
        document.body.style.removeProperty(p);
      });
    };
  }, [labPrimary, labPrimaryFg, labAccent, labAccentFg, labBg, labFg, labCard, labCardFg, labBorder, labActive]);

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
    { name: "Mocha Espresso", colors: ["#4E342E", "#FDFBF7", "#D7CCC8"], desc: "Rich coffee tones", category: "light" },
    { name: "Minimalist Slate", colors: ["#334155", "#F8FAFC", "#94A3B8"], desc: "Clean architectural gray", category: "light" },
    { name: "Pure Alabaster", colors: ["#000000", "#FFFFFF", "#F0F0F0"], desc: "High-contrast pristine white", category: "light" },
    // Dark
    { name: "Woodland", colors: ["#AAD31E", "#525034", "#9F7560"], desc: "Deep forest organic", category: "dark" },
    { name: "Midnight Aurora", colors: ["#14B8A6", "#020617", "#F43F5E"], desc: "Cosmic emerald glow", category: "dark" },
    { name: "Wraith", colors: ["#047C58", "#1E1702", "#8C886B"], desc: "Spectral dark emerald", category: "dark" },
    { name: "Next Gen Ultra", colors: ["#00D1FF", "#050505", "#A855F7"], desc: "Electric cyan flagship", category: "dark" },
    { name: "Deep Space", colors: ["#6366F1", "#020205", "#F43F5E"], desc: "Extreme dark cosmic depth", category: "dark" },
    { name: "Cyberpunk Neon", colors: ["#FF00FF", "#050505", "#00FFFF"], desc: "Magenta and cyan tech", category: "dark" },
    { name: "Emerald Empire", colors: ["#10B981", "#020C0A", "#FBBF24"], desc: "Regal forest and gold", category: "dark" },
    { name: "Crimson Velvet", colors: ["#DC2626", "#0A0202", "#FCD34D"], desc: "Rich velvet and amber", category: "dark" },
    { name: "Oceanic Depth", colors: ["#1F6FEB", "#010409", "#238636"], desc: "Deep sea engineering", category: "dark" },
    { name: "Jet Black", colors: ["#FFFFFF", "#000000", "#1A1A1A"], desc: "Absolute OLED black", category: "dark" },
    // Glass
    { name: "Aurora Glass", colors: ["#FBBF24", "#FAD961", "#F76B1C"], desc: "Warm ambient amber glow (Image 1)", category: "glass" },
    { name: "Frosted Glass", colors: ["#6366F1", "#FFDEE9", "#B5FFFC"], desc: "Soft pastel smart home (Image 2)", category: "glass" },
    { name: "Obsidian Glass", colors: ["#1DB954", "#05050A", "#38BDF8"], desc: "Deep dark Spotify-style (Image 3)", category: "glass" },
    { name: "Silk Glass", colors: ["#E2725B", "#FAF9F6", "#A8816B"], desc: "Minimalist light silk (Image 4)", category: "glass" },
    { name: "Horizon Glass", colors: ["#3B82F6", "#8BC6EC", "#9599E2"], desc: "Clean data dashboard (Image 5)", category: "glass" },
    { name: "Lavender Mist", colors: ["#8B5CF6", "#F5F3FF", "#DDD6FE"], desc: "Soft floral tech aesthetic", category: "glass" },
    { name: "Champagne Glass", colors: ["#0D0D0D", "#FEFEFE", "#BA9731"], desc: "Black, cream & gold elegance", category: "glass" },
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
    { name: "Futuristic Cyber", icon: Cpu },
    { name: "Glassmorphic Hologram", icon: Gem },
    { name: "Retro 8-Bit", icon: Terminal },
    { name: "Neomorphic Tactile", icon: Fingerprint },
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
    setLabPrimaryFg("");
    setLabAccent("");
    setLabAccentFg("");
    setLabBg("");
    setLabFg("");
    setLabCard("");
    setLabCardFg("");
    setLabBorder("");
    setActiveLabField("primary");
    ['--primary', '--primary-foreground', '--accent', '--accent-foreground', '--background', '--foreground', '--card', '--card-foreground', '--border'].forEach(p => {
      document.body.style.removeProperty(p);
    });
  };

  const handlePaletteClick = (color: string) => {
    if (!activeLabField) return;
    setLabActive(true);
    switch (activeLabField) {
      case "primary": setLabPrimary(color); break;
      case "primaryFg": setLabPrimaryFg(color); break;
      case "accent": setLabAccent(color); break;
      case "accentFg": setLabAccentFg(color); break;
      case "bg": setLabBg(color); break;
      case "fg": setLabFg(color); break;
      case "card": setLabCard(color); break;
      case "cardFg": setLabCardFg(color); break;
      case "border": setLabBorder(color); break;
    }
  };

  const getThemePalette = (theme: ThemeName) => {
    const base = themes.find(t => t.name === theme)?.colors || ["#3B82F6", "#6366F1", "#8B5CF6"];
    // Generate related shades or use a curated set per theme
    switch(theme) {
      case "Sand Serenity": return ["#714329", "#E5D8C9", "#B08463", "#5A3521", "#F5F5F5", "#2A1F12"];
      case "Ink Wash": return ["#252525", "#F8F9FA", "#7D7D7D", "#E0E0E0", "#000000", "#FFFFFF"];
      case "Midnight Aurora": return ["#14B8A6", "#020617", "#F43F5E", "#10B981", "#1E1B4B", "#0D9488"];
      case "Arctic Reflection": return ["#5289AD", "#F4FCFB", "#243C4C", "#BEE3F8", "#2C5282", "#EBF8FF"];
      case "Next Gen Ultra": return ["#00D1FF", "#050505", "#A855F7", "#38BDF8", "#7C3AED", "#1E1E1E"];
      case "Champagne Glass": return ["#0D0D0D", "#F2F2F2", "#FEFEFE", "#BA9731", "#DACE84"];
      default: return [...base, "#0F172A", "#1E293B", "#334155", "#F1F5F9", "#FFFFFF"];
    }
  };

  const currentPalette = Array.from(new Set(getThemePalette(activeTheme)));

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
          <GlassCard className="p-4 md:p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shadow-lg shadow-primary/5">
                  <Pipette size={18} className="text-primary" />
                </div>
                <div>
                  <h2 className="text-base font-black tracking-tight">Design Lab</h2>
                  <p className="text-[10px] text-muted-foreground/70 uppercase tracking-widest font-bold">Advanced Theme Orchestration</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {labActive && (
                  <button 
                    onClick={handleLabReset}
                    className="flex items-center gap-1.5 text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest hover:text-primary transition-colors px-4 py-2 rounded-lg border border-white/10 hover:border-primary/30 bg-white/5"
                  >
                    <RotateCcw size={12} /> Reset Lab
                  </button>
                )}
                <div className="flex gap-1.5">
                   <button onClick={() => { setLabActive(true); setLabPrimary("#6366F1"); setLabPrimaryFg("#FFFFFF"); setLabAccent("#F43F5E"); setLabAccentFg("#FFFFFF"); setLabBg("#05050A"); setLabFg("#E8E8F0"); setLabCard("#12121A"); setLabCardFg("#A0A0B0"); setLabBorder("#222233"); }} className="px-3 py-1.5 rounded-lg text-[9px] font-black bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-all uppercase border border-indigo-500/20">Preset 1</button>
                   <button onClick={() => { setLabActive(true); setLabPrimary("#FF634A"); setLabPrimaryFg("#FFFFFF"); setLabAccent("#D2D2D4"); setLabAccentFg("#1A1A1A"); setLabBg("#FAF9F6"); setLabFg("#1A1A1A"); setLabCard("#FFFFFF"); setLabCardFg("#404040"); setLabBorder("#E7E7E7"); }} className="px-3 py-1.5 rounded-lg text-[9px] font-black bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all uppercase border border-rose-500/20">Preset 2</button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1fr_280px] gap-8 items-start">
              <div className="space-y-8">
                {/* Surface Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
                  {/* Actions & Accents */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Zap size={12} className="text-primary" />
                        <span className="text-[10px] font-black uppercase text-foreground/80 tracking-widest">Action Layers</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <ColorInput 
                          label="Primary Bg" value={labPrimary} variable="--primary"
                          isActive={activeLabField === "primary"} onFocus={() => setActiveLabField("primary")}
                          onChange={v => { setLabActive(true); setLabPrimary(v); }} 
                        />
                        <ColorInput 
                          label="Primary Font" value={labPrimaryFg} variable="--primary-foreground"
                          isActive={activeLabField === "primaryFg"} onFocus={() => setActiveLabField("primaryFg")}
                          onChange={v => { setLabActive(true); setLabPrimaryFg(v); }} 
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles size={12} className="text-accent" />
                        <span className="text-[10px] font-black uppercase text-foreground/80 tracking-widest">Accent Layers</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <ColorInput 
                          label="Highlight Bg" value={labAccent} variable="--accent"
                          isActive={activeLabField === "accent"} onFocus={() => setActiveLabField("accent")}
                          onChange={v => { setLabActive(true); setLabAccent(v); }} 
                        />
                        <ColorInput 
                          label="Highlight Font" value={labAccentFg} variable="--accent-foreground"
                          isActive={activeLabField === "accentFg"} onFocus={() => setActiveLabField("accentFg")}
                          onChange={v => { setLabActive(true); setLabAccentFg(v); }} 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Global & Containers */}
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Layout size={12} className="text-muted-foreground" />
                        <span className="text-[10px] font-black uppercase text-foreground/80 tracking-widest">Global Canvas</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <ColorInput 
                          label="App Bg" value={labBg} variable="--background"
                          isActive={activeLabField === "bg"} onFocus={() => setActiveLabField("bg")}
                          onChange={v => { setLabActive(true); setLabBg(v); }} 
                        />
                        <ColorInput 
                          label="Global Font" value={labFg} variable="--foreground"
                          isActive={activeLabField === "fg"} onFocus={() => setActiveLabField("fg")}
                          onChange={v => { setLabActive(true); setLabFg(v); }} 
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Layers size={12} className="text-muted-foreground" />
                        <span className="text-[10px] font-black uppercase text-foreground/80 tracking-widest">UI Containers</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <ColorInput 
                          label="Card Bg" value={labCard} variable="--card"
                          isActive={activeLabField === "card"} onFocus={() => setActiveLabField("card")}
                          onChange={v => { setLabActive(true); setLabCard(v); }} 
                        />
                        <ColorInput 
                          label="Card Font" value={labCardFg} variable="--card-foreground"
                          isActive={activeLabField === "cardFg"} onFocus={() => setActiveLabField("cardFg")}
                          onChange={v => { setLabActive(true); setLabCardFg(v); }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Palette & Border */}
                <div className="flex items-center gap-8 pt-6 border-t border-white/5">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">Intelligent Palette</span>
                      <span className="text-[8px] font-bold text-muted-foreground/60  lowercase">mapping to: {activeLabField || "none"}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {currentPalette.map((c, idx) => (
                        <button 
                          key={`${c}-${idx}`}
                          onClick={() => handlePaletteClick(c)}
                          className="w-7 h-7 rounded-md border border-white/10 shadow-sm transition-all hover:scale-125 hover:z-10 active:scale-90"
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="w-48 shrink-0">
                    <ColorInput 
                      label="Structural Borders" value={labBorder} variable="--border"
                      isActive={activeLabField === "border"} onFocus={() => setActiveLabField("border")}
                      onChange={v => { setLabActive(true); setLabBorder(v); }} 
                    />
                  </div>
                </div>
              </div>

              {/* Smaller Preview */}
              <div className="sticky top-0 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 flex flex-col items-center gap-6 relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 left-0 w-full h-0.5 bg-primary/30" />
                  <span className="text-[9px] font-black uppercase text-muted-foreground/60 tracking-widest">Micro Preview</span>
                  
                  <div className="flex items-center gap-4">
                    {[Zap, Monitor, Fingerprint].map((Icon, idx) => (
                      <IconWrapper key={idx} icon={Icon} size={20} style={{ color: 'var(--primary)' }} className="transition-all duration-300" />
                    ))}
                  </div>

                  <div className="flex flex-col gap-2 w-full">
                    <div 
                      className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-center shadow-lg relative overflow-hidden"
                      style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)' }}
                    >
                      Primary
                    </div>
                    <div 
                      className="px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest text-center border relative overflow-hidden"
                      style={{ borderColor: 'rgba(128,128,128,0.2)' }}
                    >
                      <div className="absolute inset-0 opacity-15" style={{ backgroundColor: 'var(--accent)' }} />
                      <span className="relative z-10" style={{ color: 'var(--accent)' }}>Accent</span>
                    </div>
                  </div>

                  <div className="w-full space-y-1.5 pt-2">
                    <div className="h-1 rounded-full bg-foreground/10 overflow-hidden">
                      <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: 'var(--primary)' }} />
                    </div>
                    <div className="flex justify-between text-[7px] font-black uppercase text-muted-foreground/60 tracking-widest">
                      <span>Status</span>
                      <span style={{ color: 'var(--primary)' }}>Live</span>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-muted-foreground/60 text-center leading-relaxed font-medium ">
                  Surface-level overrides for professional contrast management.
                </p>
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
                    <p className="text-[10px] font-medium text-muted-foreground leading-snug line-clamp-2 ">{f.desc}</p>
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

function ColorInput({ label, value, variable, isActive, onFocus, onChange }: { label: string, value: string, variable: string, isActive?: boolean, onFocus?: () => void, onChange: (v: string) => void }) {
  return (
    <div 
      className={cn(
        "flex items-center gap-3 p-2 rounded-xl transition-all cursor-pointer border",
        isActive ? "bg-primary/5 border-primary/20 shadow-lg shadow-primary/5" : "border-transparent hover:bg-white/5"
      )}
      onClick={onFocus}
    >
      <div 
        className={cn(
          "w-12 h-12 rounded-lg shadow-inner border border-black/10 shrink-0 transition-all duration-300 relative overflow-hidden",
          isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-xl"
        )} 
        style={{ backgroundColor: value || `var(${variable})` }} 
      >
         {isActive && (
           <div 
             className="absolute inset-0 animate-pulse opacity-20" 
             style={{ backgroundColor: value || `var(${variable})` }} 
           />
         )}
      </div>
      <div className="flex-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 block mb-1">{label}</label>
        <div className="relative">
          <input 
            value={value} placeholder="#HEXCODE"
            onFocus={onFocus}
            onChange={(e) => onChange(e.target.value)}
            className="w-full bg-transparent border-none p-0 text-xs font-mono outline-none placeholder:text-muted-foreground/30 focus:text-primary transition-colors"
          />
        </div>
      </div>
    </div>
  );
}
