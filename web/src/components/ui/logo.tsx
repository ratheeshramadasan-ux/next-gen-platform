"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

// Theme-aware Next Gen logo — uses currentColor so it adapts to every platform theme
export default function Logo({ className, size = 40, showText = false }: LogoProps) {
  const s = size;
  const r = s * 0.13;    // outer node radius
  const cr = s * 0.21;   // center node radius
  const cx = s * 0.5;
  const cy = s * 0.5;
  const dist = s * 0.33; // distance from center to outer nodes
  // 6 outer nodes, flat-top hexagon (start from top, 60° steps)
  const nodes = Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  });

  return (
    <div className={cn("inline-flex items-center gap-2 flex-shrink-0 text-primary", className)}>
      <svg
        width={s}
        height={s}
        viewBox={`0 0 ${s} ${s}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        aria-label="Next Gen Platform"
      >
        {/* Spoke connectors: center → outer nodes */}
        {nodes.map((n, i) => (
          <line key={`spoke-${i}`}
            x1={cx} y1={cy} x2={n.x} y2={n.y}
            stroke="currentColor" strokeOpacity="0.3"
            strokeWidth={s * 0.05} strokeLinecap="round" />
        ))}

        {/* Hexagonal ring: outer node → next */}
        {nodes.map((n, i) => {
          const nxt = nodes[(i + 1) % 6];
          return (
            <line key={`ring-${i}`}
              x1={n.x} y1={n.y} x2={nxt.x} y2={nxt.y}
              stroke="currentColor" strokeOpacity="0.18"
              strokeWidth={s * 0.032} strokeLinecap="round" />
          );
        })}

        {/* Outer nodes — alternating opacity for depth */}
        {nodes.map((n, i) => (
          <circle key={`outer-${i}`}
            cx={n.x} cy={n.y} r={r}
            fill="currentColor"
            opacity={i % 2 === 0 ? 0.75 : 0.55} />
        ))}

        {/* Center node */}
        <circle cx={cx} cy={cy} r={cr} fill="currentColor" opacity="1" />

        {/* Subtle inner highlight */}
        <circle cx={cx - cr * 0.22} cy={cy - cr * 0.22} r={cr * 0.3}
          fill="white" opacity="0.2" />
      </svg>

      {showText && (
        <div className="flex flex-col leading-none select-none">
          <span className="font-black tracking-tighter text-foreground" style={{ fontSize: s * 0.35 }}>
            NEXT GEN
          </span>
          <span className="text-muted-foreground font-medium tracking-tight" style={{ fontSize: s * 0.17 }}>
            Enterprise AI &amp; Automation
          </span>
        </div>
      )}
    </div>
  );
}
