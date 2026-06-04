"use client";

import React from "react";
import Lottie from "lottie-react";
import animationData from "../../next-gen-logo.json";
import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";

interface LogoProps {
  className?: string;
  size?: number;
}

export default function Logo({ className, size = 40 }: LogoProps) {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div 
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden flex-shrink-0 transition-all duration-500 group", 
        className
      )}
      style={{ width: size, height: size }}
    >
      {/* Background Glow */}
      <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {!mounted ? (
        <Zap 
          size={size * 0.6} 
          className="text-primary animate-pulse" 
        />
      ) : (
        <Lottie 
          animationData={animationData} 
          loop={true} 
          style={{ width: "100%", height: "100%", display: "block", position: "relative", zIndex: 1 }}
          rendererSettings={{
            preserveAspectRatio: "xMidYMid meet"
          }}
          className="filter drop-shadow-[0_0_8px_var(--primary)]"
        />
      )}
    </div>
  );
}
