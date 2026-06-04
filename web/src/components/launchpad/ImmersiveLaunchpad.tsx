"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePersonalizationStore } from "@/stores/usePersonalizationStore";
import { useRouter } from "next/navigation";

// --- Dynamic Holographic Icons ---

const IconSystemControl = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16" style={{ filter: 'var(--hologram-glow)' }}>
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--theme-secondary)" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    {/* Outer Orbit */}
    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--theme-primary)" strokeWidth="0.5" strokeDasharray="4 4" />
    {/* Shield Geometry */}
    <path d="M50 15 L80 25 L80 55 C80 75 50 85 50 85 C50 85 20 75 20 55 L20 25 Z" fill="url(#shieldGrad)" stroke="var(--theme-primary)" strokeWidth="2" />
    {/* Inner Core */}
    <circle cx="50" cy="45" r="8" fill="var(--theme-text)" />
  </svg>
);

const IconBuilderStudio = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16" style={{ filter: 'var(--hologram-glow)' }}>
    <defs>
      <linearGradient id="cubeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--theme-secondary)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    {/* Anti-gravity Rings */}
    <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="var(--theme-secondary)" strokeWidth="1" transform="rotate(30 50 50)" />
    <ellipse cx="50" cy="50" rx="40" ry="15" fill="none" stroke="var(--theme-primary)" strokeWidth="1" transform="rotate(-30 50 50)" />
    {/* Center Matrix */}
    <rect x="35" y="35" width="30" height="30" rx="4" fill="url(#cubeGrad)" stroke="var(--theme-text)" strokeWidth="1.5" />
    <circle cx="50" cy="50" r="5" fill="var(--theme-bg-base)" />
  </svg>
);

const IconDocIntel = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16" style={{ filter: 'var(--hologram-glow)' }}>
    <defs>
      <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--theme-secondary)" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    {/* Outer Orbit */}
    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--theme-primary)" strokeWidth="0.5" strokeDasharray="3 6" />
    {/* Document Body */}
    <path d="M30 20 H62 L72 30 V80 H30 Z" fill="url(#docGrad)" stroke="var(--theme-primary)" strokeWidth="1.8" />
    {/* Futuristic Data Lines */}
    <line x1="38" y1="40" x2="62" y2="40" stroke="var(--theme-text)" strokeWidth="2" strokeDasharray="2 2" />
    <line x1="38" y1="52" x2="62" y2="52" stroke="var(--theme-text)" strokeWidth="1.5" />
    <line x1="38" y1="64" x2="54" y2="64" stroke="var(--theme-text)" strokeWidth="1.5" />
  </svg>
);

const IconAIHub = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16" style={{ filter: 'var(--hologram-glow)' }}>
    <defs>
      <linearGradient id="hubGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--theme-secondary)" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    {/* Orbiting Ring */}
    <circle cx="50" cy="50" r="40" fill="none" stroke="var(--theme-secondary)" strokeWidth="0.5" strokeDasharray="2 4" />
    {/* Connected Nodes */}
    <line x1="50" y1="20" x2="50" y2="80" stroke="var(--theme-primary)" strokeWidth="0.75" />
    <line x1="20" y1="50" x2="80" y2="50" stroke="var(--theme-primary)" strokeWidth="0.75" />
    {/* Core */}
    <circle cx="50" cy="50" r="16" fill="url(#hubGrad)" stroke="var(--theme-primary)" strokeWidth="2" />
    <circle cx="50" cy="20" r="4" fill="var(--theme-text)" />
    <circle cx="50" cy="80" r="4" fill="var(--theme-text)" />
    <circle cx="20" cy="50" r="4" fill="var(--theme-text)" />
    <circle cx="80" cy="50" r="4" fill="var(--theme-text)" />
  </svg>
);

const IconExecutionCenter = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16" style={{ filter: 'var(--hologram-glow)' }}>
    <defs>
      <linearGradient id="execGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--theme-secondary)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    {/* Grid processing slots */}
    <rect x="25" y="22" width="50" height="14" rx="2" fill="url(#execGrad)" stroke="var(--theme-primary)" strokeWidth="1" />
    <rect x="25" y="43" width="50" height="14" rx="2" fill="url(#execGrad)" stroke="var(--theme-primary)" strokeWidth="1" />
    <rect x="25" y="64" width="50" height="14" rx="2" fill="url(#execGrad)" stroke="var(--theme-primary)" strokeWidth="1" />
    {/* Indicator Dots */}
    <circle cx="33" cy="29" r="2.5" fill="var(--theme-text)" />
    <circle cx="33" cy="50" r="2.5" fill="var(--theme-text)" />
    <circle cx="33" cy="71" r="2.5" fill="var(--theme-text)" />
  </svg>
);

const IconIconRegistry = () => (
  <svg viewBox="0 0 100 100" className="w-16 h-16" style={{ filter: 'var(--hologram-glow)' }}>
    <defs>
      <linearGradient id="registryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity="0.8" />
        <stop offset="100%" stopColor="var(--theme-secondary)" stopOpacity="0.2" />
      </linearGradient>
    </defs>
    {/* Outer Orbit Radar */}
    <circle cx="50" cy="50" r="45" fill="none" stroke="var(--theme-secondary)" strokeWidth="0.5" strokeDasharray="5 5" />
    {/* Tech Compass / Hexagram Dial */}
    <polygon points="50,20 75,35 75,65 50,80 25,65 25,35" fill="url(#registryGrad)" stroke="var(--theme-primary)" strokeWidth="1.8" />
    {/* Core Dial Star */}
    <path d="M50 35 L55 45 L65 50 L55 55 L50 65 L45 55 L35 50 L45 45 Z" fill="var(--theme-text)" />
  </svg>
);

// Helper to map DB icons to our high-tech holographic components
const iconMap: Record<string, React.ComponentType> = {
  "document-scan": IconDocIntel,
  "git-merge": IconBuilderStudio,
  "brain": IconAIHub,
  "activity": IconExecutionCenter,
  "shield-alert": IconSystemControl,
  "compass": IconIconRegistry,
};

// --- Spatial Anti-Gravity Node Component ---
const AntiGravityNode = ({ service, index, total, mousePos, onClick }: { service: any; index: number; total: number; mousePos: { x: number; y: number }; onClick: () => void }) => {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  // Calculate elliptical spatial orbits
  const angle = (index / total) * Math.PI * 2;
  const radiusX = 360; // Horizontal spread
  const radiusY = 160; // Vertical depth depth
  const x = Math.cos(angle) * radiusX;
  const y = Math.sin(angle) * radiusY;

  // Anti-gravity floating transitions
  const floatAnim = {
    y: [0, -18, 0],
    transition: {
      duration: 5 + index * 0.7,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };

  // Parallax offsets driven by user mouse position
  const parallaxX = mousePos.x * 0.05 * (index + 1);
  const parallaxY = mousePos.y * 0.05 * (index + 1);

  // Retrieve matching Holographic SVG
  const HologramIcon = iconMap[service.iconType] || IconBuilderStudio;

  // Fake sub-activities to fold/unfold on hover (Fold-first concept)
  const getSubitems = () => {
    switch(service.iconType) {
      case "document-scan": return ["Ingestion Pipelines", "OCR Parsing Matrix", "Document Type Resolution (DTR)", "Segregation Engine"];
      case "git-merge": return ["Studio Designer", "Trigger Libraries", "Integration Hub"];
      case "brain": return ["Model Registry", "Neural Deployments", "Cognitive Nodes"];
      case "activity": return ["Audit Logs", "Process Workers", "Queue Manager"];
      case "compass": return ["Adaptive Personalization", "Style Customizer", "Holographic Inspector"];
      default: return ["Compliance Ledger", "Telemetry", "Policy Center"];
    }
  };

  return (
    <motion.div
      style={{
        position: "absolute",
        left: `calc(50% + ${x}px)`,
        top: `calc(50% + ${y}px)`,
        x: parallaxX,
        y: parallaxY,
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, delay: index * 0.1, ease: "easeOut" }}
      className="absolute -translate-x-1/2 -translate-y-1/2 z-20 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      <motion.div 
        animate={{ y: [0, -18, 0] }}
        transition={{
          duration: 5 + index * 0.7,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="relative flex flex-col items-center"
      >
        
        {/* Holographic glowing back-plate */}
        <div 
          className="p-6 rounded-3xl cursor-pointer backdrop-blur-md transition-all duration-500 border relative overflow-hidden"
          style={{ 
            backgroundColor: "var(--glass-bg)", 
            borderColor: isHovered ? "var(--theme-primary)" : "var(--glass-border)",
            boxShadow: isHovered 
              ? "0 0 40px color-mix(in srgb, var(--theme-primary) 50%, transparent)" 
              : "0 4px 30px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* Neon corner brackets */}
          <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-primary/40" />
          <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-primary/40" />
          <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-primary/40" />
          <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-primary/40" />
          
          <HologramIcon />
        </div>

        {/* Primary Title with Futuristic Shadows */}
        <div className="mt-5 text-center pointer-events-none">
          <h2 
            style={{ 
              color: "var(--theme-text)", 
              textShadow: isHovered 
                ? "0 0 15px var(--theme-primary), 0 0 2px var(--theme-primary)" 
                : "0 0 6px rgba(14, 165, 233, 0.4)" 
            }} 
            className="text-xs font-black tracking-[0.2em] uppercase transition-all duration-300"
          >
            {service.displayName}
          </h2>
        </div>

        {/* Fold-First Orbiting Sub-activities */}
        <AnimatePresence>
          {isHovered && (
            <motion.div 
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="absolute top-full mt-4 flex flex-col gap-2 w-52 z-30"
              onClick={(e) => e.stopPropagation()} // Prevent clicking sub-menu from triggering main module routing
            >
              {getSubitems().map((item, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ scale: 1.03, backgroundColor: "rgba(255,255,255,0.08)", borderColor: "var(--theme-primary)" }}
                  onClick={() => router.push(service.targetUrl || service.route)}
                  className="px-4 py-2 text-[10px] tracking-widest font-bold rounded-xl backdrop-blur-xl border border-white/5 cursor-pointer text-center uppercase"
                  style={{ 
                    color: "var(--theme-text)",
                    backgroundColor: "rgba(0,0,0,0.4)",
                    borderColor: "var(--glass-border)"
                  }}
                >
                  {item}
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
    </motion.div>
  );
};

// --- Immersive Launchpad Engine ---
export function ImmersiveLaunchpad() {
  const { services } = usePersonalizationStore();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Track mouse coordinates for cinematic panning parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      // Map to normalized range [-100, 100]
      const x = ((clientX / innerWidth) - 0.5) * 120;
      const y = ((clientY / innerHeight) - 0.5) * 120;
      setMousePos({ x, y });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div 
      ref={containerRef}
      style={{ backgroundColor: "var(--theme-bg-base)" }} 
      className="relative w-full h-screen overflow-hidden flex items-center justify-center font-sans"
    >
      {/* Layer 1: Futuristic Background Grid & Orbital Track Rings */}
      <div className="absolute inset-0 pointer-events-none z-0">
        
        {/* Holographic grid lines */}
        <div 
          className="absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(14,165,233,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(14,165,233,0.1)_1px,transparent_1px)]"
          style={{ backgroundSize: "40px 40px" }}
        />

        {/* Ambient background glow ring */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[320px] rounded-full border border-primary/10 opacity-30"
          style={{ transform: "translate(-50%, -50%) rotateX(60deg)" }}
        />
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[400px] rounded-full border border-primary/5 opacity-20"
          style={{ transform: "translate(-50%, -50%) rotateX(60deg) rotate(45deg)" }}
        />

        {/* Scanning horizontal laser line */}
        <motion.div 
          animate={{ y: ["-100%", "100%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-500/25 to-transparent absolute top-0"
        />
      </div>

      {/* Layer 2: Center Quantum Processor AI Core */}
      <motion.div 
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        className="absolute w-[220px] h-[220px] border border-primary/10 rounded-full flex items-center justify-center z-10 pointer-events-none opacity-40"
      >
        <div className="w-[180px] h-[180px] border border-dashed border-secondary/15 rounded-full" />
        <div className="absolute w-[60px] h-[60px] bg-primary/5 rounded-full flex items-center justify-center blur-sm" />
      </motion.div>

      {/* Layer 3: Glass HUD Header Panels */}
      <div className="absolute top-10 left-10 pointer-events-none z-40">
        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 tracking-[0.25em] uppercase" style={{ textShadow: "0 0 20px rgba(6,182,212,0.4)" }}>
          Neural Command Center
        </h1>
        <p className="text-[10px] text-primary/60 tracking-[0.3em] uppercase mt-2">Active Spatial Personalization Engine</p>
      </div>

      {/* Interactive GPU and 60FPS Indicators */}
      <div className="absolute bottom-10 left-10 pointer-events-none z-40">
        <div className="flex flex-col gap-1.5 opacity-60">
          <div className="text-[9px] text-white/50 tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Neural Grid Persistent
          </div>
          <div className="text-[9px] text-white/50 tracking-widest uppercase flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
            GPU OS Render Engine
          </div>
        </div>
      </div>

      {/* Dynamic Instruction tag */}
      <div className="absolute bottom-10 right-10 pointer-events-none z-40 text-right opacity-60">
        <div className="text-[9px] text-white/50 tracking-[0.2em] uppercase">
          Drag / hover nodes to expand systems
        </div>
      </div>

      {/* Layer 4: Anti-Gravity Spatial Node Network */}
      <div className="absolute inset-0 z-20 overflow-visible flex items-center justify-center">
        {services.map((service, index) => (
          <AntiGravityNode 
            key={service.id} 
            service={service} 
            index={index} 
            total={services.length}
            mousePos={mousePos}
            onClick={() => router.push(service.targetUrl || service.route)}
          />
        ))}
      </div>
    </div>
  );
}
