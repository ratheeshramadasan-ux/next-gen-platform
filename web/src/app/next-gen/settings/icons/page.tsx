"use client";

import React, { useState, useMemo } from "react";
import { useAppContext, IconSetName } from "@/lib/context";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { 
  // Navigation
  Home, LayoutDashboard, Building2, Users, Briefcase, Bot, CalendarDays, 
  Menu, Shield, BookOpen, Mail, Settings, Globe, Monitor, Rocket, Compass,
  // Intelligence & AI
  BrainCircuit, Zap, Flame, Sparkles, Cpu, Eye, Fingerprint,
  // Security & Access
  ShieldCheck, ShieldAlert, KeyRound, Lock, UserCheck, EyeOff,
  // Data & Storage
  Database, Server, Cloud, FolderOpen, HardDrive, Share2, FileText,
  // Analytics & Logs
  Activity, BarChart3, RotateCw, ClipboardCheck, Clock, TrendingUp,
  // Actions & UI
  Search, Palette, Download, Copy, Check, Sliders, Play, Trash2, Edit3, Plus, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PlatformIcon {
  name: string;
  component: React.ElementType;
  category: "Navigation" | "Intelligence & AI" | "Security & Access" | "Data & Storage" | "Analytics & Logs";
  description: string;
}

const PLATFORM_ICONS: PlatformIcon[] = [
  // Navigation
  { name: "Home", component: Home, category: "Navigation", description: "Main landing portal and personal dashboard" },
  { name: "Dashboard", component: LayoutDashboard, category: "Navigation", description: "System monitoring and metrics overview" },
  { name: "Workspace", component: Building2, category: "Navigation", description: "Multi-tenant scope and organizational hierarchy" },
  { name: "Teams", component: Users, category: "Navigation", description: "User directory, team rosters, and dynamic roles" },
  { name: "Projects", component: Briefcase, category: "Navigation", description: "Enterprise-wide workflows and active jobs portfolio" },
  { name: "Robots", component: Bot, category: "Navigation", description: "Automated agent management and orchestration template panel" },
  { name: "Scheduler", component: CalendarDays, category: "Navigation", description: "Temporal triggers and execution schedules layout" },
  { name: "Global Menu", component: Menu, category: "Navigation", description: "Collapsible platform sidebar master controller" },
  { name: "Platform Shield", component: Shield, category: "Navigation", description: "Global compliance registry and system lock controls" },
  { name: "Documentation", component: BookOpen, category: "Navigation", description: "Platform SDK guides, APIs, and audit trails reference" },
  { name: "Communications", component: Mail, category: "Navigation", description: "System mail alerts, webhooks, and push notifications" },
  { name: "General Settings", component: Settings, category: "Navigation", description: "Core tenant configurations and customization options" },
  { name: "Integrations Hub", component: Globe, category: "Navigation", description: "SaaS connections, REST APIs, and external event listeners" },
  { name: "Control Room", component: Monitor, category: "Navigation", description: "Live worker execution streams and terminal session mirroring" },
  { name: "Release Deploy", component: Rocket, category: "Navigation", description: "Package publishing and multi-environment deployment" },

  // Intelligence & AI
  { name: "Cognitive Circuit", component: BrainCircuit, category: "Intelligence & AI", description: "AI Document DNA engine and neural classification mapping" },
  { name: "Intelligent Ingest", component: Zap, category: "Intelligence & AI", description: "High-speed OCR ingestion pipelines and queue routing" },
  { name: "Studio Flame", component: Flame, category: "Intelligence & AI", description: "Visual drag-and-drop designer canvas active workspace" },
  { name: "AI Sparkles", component: Sparkles, category: "Intelligence & AI", description: "Confidence metrics and machine learning auto-segregation" },
  { name: "GPU Core", component: Cpu, category: "Intelligence & AI", description: "Platform processor status and neural model execution grid" },
  { name: "Visualizer Eye", component: Eye, category: "Intelligence & AI", description: "High-fidelity PDF document rendering and zone mapping tool" },
  { name: "Biometrics", component: Fingerprint, category: "Intelligence & AI", description: "Forensic activity verification and secure signature validation" },

  // Security & Access
  { name: "Heartbeat Stable", component: ShieldCheck, category: "Security & Access", description: "Worker compliance state and verified system health audit" },
  { name: "Intrusion Alert", component: ShieldAlert, category: "Security & Access", description: "Anomalous threshold triggers and critical failover security logs" },
  { name: "Key Authorization", component: KeyRound, category: "Security & Access", description: "Encrypted credential lockers, OAuth client secrets store" },
  { name: "Enclave Lock", component: Lock, category: "Security & Access", description: "Secured data buckets and high-compliance tenant lockups" },
  { name: "IAM Profile", component: UserCheck, category: "Security & Access", description: "Role-based authorization and session lifetime controls" },
  { name: "Privacy Mask", component: EyeOff, category: "Security & Access", description: "Personally Identifiable Information (PII) document redaction status" },

  // Data & Storage
  { name: "Database Vault", component: Database, category: "Data & Storage", description: "Normalized relational schemas, queues, and metadata records" },
  { name: "Compute Server", component: Server, category: "Data & Storage", description: "Anti-gravity compute nodes and runtime execution clusters" },
  { name: "Cloud Ingestion", component: Cloud, category: "Data & Storage", description: "Multi-cloud document streams (S3, Azure Blob, SFTP)" },
  { name: "Storage Volume", component: FolderOpen, category: "Data & Storage", description: "Intake folder structures and recursive document batch repositories" },
  { name: "Physical Volume", component: HardDrive, category: "Data & Storage", description: "High-performance SSD processing cache and forensic archive disks" },
  { name: "Node Gateway", component: Share2, category: "Data & Storage", description: "Distributed data synchronization paths and file transfers link" },
  { name: "Asset Normalizer", component: FileText, category: "Data & Storage", description: "Extracted key-value outputs and JSON schema payloads library" },

  // Analytics & Logs
  { name: "Activity Stream", component: Activity, category: "Analytics & Logs", description: "Real-time system telemetry and 60FPS render loop monitor" },
  { name: "Execution Insights", component: BarChart3, category: "Analytics & Logs", description: "ROI statistics, cycle times, and model accuracy dashboards" },
  { name: "Process Lifecycle", component: RotateCw, category: "Analytics & Logs", description: "Human-in-the-loop validation tasks and recursive retry buffers" },
  { name: "Audit Trail", component: ClipboardCheck, category: "Analytics & Logs", description: "Immutably signed ledgers and regulatory compliance reporting sheets" },
  { name: "Temporal Queue", component: Clock, category: "Analytics & Logs", description: "Average parsing delays, SLA countdowns, and scheduled job stacks" },
  { name: "Efficiency Scale", component: TrendingUp, category: "Analytics & Logs", description: "Yield rates and throughput progress indexes" }
];

export default function IconRepositoryPage() {
  const { activeIconSet, activeTheme } = useAppContext();
  
  // Page states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedIcon, setSelectedIcon] = useState<PlatformIcon>(PLATFORM_ICONS[0]);
  const [copiedType, setCopiedType] = useState<"svg" | "jsx" | null>(null);

  // Dynamic preview customization states
  const [previewSize, setPreviewSize] = useState(48);
  const [previewColor, setPreviewColor] = useState("var(--theme-primary, var(--primary, #6366f1))");
  const [previewStrokeWidth, setPreviewStrokeWidth] = useState(1.5);
  const [previewStyleOverride, setPreviewStyleOverride] = useState<IconSetName>(activeIconSet);

  const categories = ["All", "Navigation", "Intelligence & AI", "Security & Access", "Data & Storage", "Analytics & Logs"];

  // Filtered Icons list
  const filteredIcons = useMemo(() => {
    return PLATFORM_ICONS.filter(icon => {
      const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            icon.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || icon.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchTerm, selectedCategory]);

  const SelectedIconComponent = selectedIcon.component;

  // Code Snippet generators
  const svgSnippet = useMemo(() => {
    const strokeWidthAttr = previewStrokeWidth;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${previewSize}" height="${previewSize}" viewBox="0 0 24 24" fill="none" stroke="${previewColor}" stroke-width="${strokeWidthAttr}" stroke-linecap="round" stroke-linejoin="round" class="nextgen-icon">\n  <!-- SVG path nodes generated via Lucide engine -->\n</svg>`;
  }, [selectedIcon, previewSize, previewColor, previewStrokeWidth]);

  const jsxSnippet = useMemo(() => {
    const compName = (selectedIcon.component as any).name || "Icon";
    return `import { IconWrapper } from "@/components/ui/icon-wrapper";\nimport { ${compName} } from "lucide-react";\n\nexport default function CustomComponent() {\n  return (\n    <IconWrapper \n      icon={${compName}} \n      size={${previewSize}} \n      className="text-primary" \n    />\n  );\n}`;
  }, [selectedIcon, previewSize]);

  const handleCopy = (type: "svg" | "jsx", content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const getCustomStyleClass = (styleName: IconSetName) => {
    return `icon-set-${styleName.toLowerCase().replace(/\s+/g, '-')}`;
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar p-4 md:p-6 lg:p-8 pb-10">
      <div className="w-full space-y-6 min-w-0">
        
        {/* ─── Header ─── */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-border/40 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                <Compass className="w-5 h-5 text-primary animate-spin-slow" />
              </div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight bg-clip-text text-foreground uppercase">
                Platform Icon Registry
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-1">
              Centralized repository of futuristic, responsive, and style-adaptive icons designed for the Next Gen platform.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted/40 border border-border/50 rounded-lg px-3 py-1.5 w-fit">
            <Sliders size={12} className="text-primary" />
            <span>Active Global Style: <span className="text-primary">{activeIconSet}</span></span>
          </div>
        </div>

        {/* ─── Main Grid Layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-6 items-start w-full min-w-0">
          
          {/* Left Column: Explorer Grid & Filters */}
          <div className="space-y-6 min-w-0 w-full">
            
            {/* Filter Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-card/40 border border-border/60 rounded-xl p-4 backdrop-blur-xl">
              <div className="relative w-full md:w-80">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search 30+ platform icons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-bold placeholder:font-medium"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Categories Carousel */}
              <div className="flex flex-wrap gap-1.5 w-full md:w-auto justify-start md:justify-end">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border",
                      selectedCategory === cat
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/25"
                        : "bg-background text-muted-foreground border-border/80 hover:text-foreground hover:border-border"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Icons Grid */}
            <div className="bg-card/30 border border-border/50 rounded-xl p-5 backdrop-blur-xl min-h-[400px]">
              {filteredIcons.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Search size={36} className="text-muted-foreground/30 mb-4 animate-bounce" />
                  <h3 className="text-sm font-bold text-muted-foreground">No matches found</h3>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try resetting the category filter or searching for another tag.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                  {filteredIcons.map((icon) => {
                    const isSelected = selectedIcon.name === icon.name;
                    return (
                      <motion.button
                        key={icon.name}
                        onClick={() => {
                          setSelectedIcon(icon);
                          setPreviewStyleOverride(activeIconSet);
                        }}
                        whileHover={{ y: -3, scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "relative text-left p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between aspect-square group",
                          isSelected
                            ? "bg-primary/5 ring-2 ring-primary border-primary/30 shadow-lg shadow-primary/10"
                            : "bg-background/50 border-border/60 hover:bg-card hover:border-primary/20 hover:shadow-md"
                        )}
                      >
                        {/* Selector indicator */}
                        {isSelected && (
                          <div className="absolute top-3 right-3 w-4 h-4 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                            <Check size={9} className="text-white" strokeWidth={3} />
                          </div>
                        )}

                        {/* Icon display using current Active global set style */}
                        <div className="w-12 h-12 rounded-lg bg-card/60 flex items-center justify-center border border-border/40 group-hover:border-primary/20 transition-all shadow-inner relative overflow-hidden">
                          <IconWrapper icon={icon.component} size={22} className="transition-transform duration-300 group-hover:scale-110" />
                        </div>

                        {/* Labels */}
                        <div className="space-y-1 mt-3">
                          <span className="text-xs font-bold text-foreground block group-hover:text-primary transition-colors truncate">
                            {icon.name}
                          </span>
                          <span className="text-[8px] font-black text-muted-foreground/50 uppercase tracking-widest truncate block">
                            {icon.category}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: High-fidelity Neomorphic Visualizer & Code Export */}
          <div className="sticky top-6 space-y-6 min-w-0 w-full">
            
            {/* Visualizer Card */}
            <div className="bg-gradient-to-br from-card/70 to-card/25 border border-border/60 rounded-2xl p-6 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
              
              {/* Background scanning laser effect */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(14,165,233,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.1)_1px,transparent_1px)]" style={{ backgroundSize: "20px 20px" }} />
              
              <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-6">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-foreground">Style Inspector</h3>
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest mt-0.5">Real-time parameters and renderer</p>
                </div>
                <div className="px-2.5 py-1 bg-primary/10 rounded-lg border border-primary/20 text-[9px] font-black uppercase text-primary tracking-widest">
                  {selectedIcon.name}
                </div>
              </div>

              {/* Center Big Holographic Render Box */}
              <div className="h-60 rounded-xl bg-background/40 border border-border/80 flex items-center justify-center relative overflow-hidden shadow-inner group-hover:border-primary/20 transition-all">
                <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-transparent opacity-40" />
                
                {/* Orbital track ring background */}
                <div className="absolute w-44 h-44 rounded-full border border-dashed border-border/30 animate-spin-slow flex items-center justify-center">
                  <div className="w-36 h-36 rounded-full border border-dashed border-primary/10" />
                </div>
                
                {/* Giant custom rendered icon */}
                <div 
                  className={cn("p-8 rounded-2xl relative transition-all duration-500", getCustomStyleClass(previewStyleOverride))}
                  style={{
                    color: previewColor,
                  }}
                >
                  <SelectedIconComponent 
                    size={previewSize} 
                    strokeWidth={previewStrokeWidth}
                    className="relative z-10 drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
                  />
                </div>

                {/* Sub-tag */}
                <span className="absolute bottom-4 text-[8px] font-black text-muted-foreground/40 uppercase tracking-[0.25em] pointer-events-none">
                  Neural command renderer
                </span>
              </div>

              {/* Parameter Controllers */}
              <div className="space-y-5 mt-6 border-t border-border/50 pt-5">
                
                {/* Icon Set Style Switcher */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Render Style Override</label>
                  <div className="flex flex-wrap gap-1.5">
                    {(["Standard", "Glow Aura", "Minimal Thin", "Vibrant Duotone", "Sharp Tech", "Futuristic Cyber", "Glassmorphic Hologram", "Retro 8-Bit", "Neomorphic Tactile"] as IconSetName[]).map((styleName) => (
                      <button
                        key={styleName}
                        onClick={() => {
                          setPreviewStyleOverride(styleName);
                          // Reset stroke widths automatically to showcase the style perfectly
                          if (styleName === "Minimal Thin") setPreviewStrokeWidth(1.0);
                          else if (styleName === "Sharp Tech" || styleName === "Retro 8-Bit") setPreviewStrokeWidth(2.5);
                          else setPreviewStrokeWidth(1.5);
                        }}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-wider text-center border transition-all leading-tight",
                          previewStyleOverride === styleName
                            ? "bg-primary/15 text-primary border-primary/30"
                            : "bg-background/30 text-muted-foreground border-border/40 hover:text-foreground"
                        )}
                      >
                        {styleName}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sliders: Size & StrokeWidth */}
                <div className="grid grid-cols-2 gap-6 pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Dimension</label>
                      <span className="text-[8px] font-mono text-primary font-bold">{previewSize}px</span>
                    </div>
                    <input
                      type="range" min="24" max="96" step="4" value={previewSize}
                      onChange={(e) => setPreviewSize(parseInt(e.target.value))}
                      className="w-full h-1.5 bg-background border border-border rounded-full appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Stroke Width</label>
                      <span className="text-[8px] font-mono text-primary font-bold">{previewStrokeWidth.toFixed(1)}</span>
                    </div>
                    <input
                      type="range" min="0.5" max="3.5" step="0.1" value={previewStrokeWidth}
                      onChange={(e) => setPreviewStrokeWidth(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-background border border-border rounded-full appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                </div>

                {/* Color Input */}
                <div className="space-y-2 pt-2">
                  <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Color Hex / Var</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={previewColor}
                      onChange={(e) => setPreviewColor(e.target.value)}
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-xs font-mono outline-none focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                    <div className="flex gap-1">
                      {["#6366f1", "#00D1FF", "#10b981", "#ff00ff", "#ff4a4a"].map((colorHex) => (
                        <button
                          key={colorHex}
                          onClick={() => setPreviewColor(colorHex)}
                          className="w-7 h-7 rounded-lg border border-border shadow-sm hover:scale-110 active:scale-95 transition-all"
                          style={{ backgroundColor: colorHex }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

              </div>

              {/* Code Snippets Export Tabs */}
              <div className="mt-8 border-t border-border/50 pt-5 space-y-4">
                
                {/* SVG Code */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">HTML / SVG Code</label>
                    <button
                      onClick={() => handleCopy("svg", svgSnippet)}
                      className="flex items-center gap-1 text-[8px] font-black uppercase text-primary tracking-widest hover:underline"
                    >
                      {copiedType === "svg" ? (
                        <>
                          <Check size={10} className="text-emerald-500" />
                          <span className="text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={10} />
                          <span>Copy SVG</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 bg-background/50 border border-border/80 rounded-xl text-[10px] font-mono text-muted-foreground select-all overflow-x-auto whitespace-pre custom-scrollbar">
                    {svgSnippet}
                  </pre>
                </div>

                {/* React JSX Code */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">React / JSX Code</label>
                    <button
                      onClick={() => handleCopy("jsx", jsxSnippet)}
                      className="flex items-center gap-1 text-[8px] font-black uppercase text-primary tracking-widest hover:underline"
                    >
                      {copiedType === "jsx" ? (
                        <>
                          <Check size={10} className="text-emerald-500" />
                          <span className="text-emerald-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={10} />
                          <span>Copy JSX</span>
                        </>
                      )}
                    </button>
                  </div>
                  <pre className="p-3.5 bg-background/50 border border-border/80 rounded-xl text-[10px] font-mono text-muted-foreground select-all overflow-x-auto whitespace-pre custom-scrollbar">
                    {jsxSnippet}
                  </pre>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
