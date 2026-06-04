"use client";

import React from "react";
import { useAppContext, IconSetName } from "@/lib/context";
import { cn } from "@/lib/utils";

interface IconWrapperProps {
  icon: React.ElementType;
  size?: number;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}

export const IconWrapper = ({ 
  icon: Icon, 
  size = 18, 
  className, 
  strokeWidth,
  style
}: IconWrapperProps) => {
  const { activeIconSet } = useAppContext();

  const iconSetClass = `icon-set-${activeIconSet.toLowerCase().replace(/\s+/g, '-')}`;

  if (!Icon) return null;

  return (
    <div 
      className={cn("inline-flex items-center justify-center transition-all duration-300", iconSetClass, className)}
      style={{ ...(!className ? { color: 'var(--primary)' } : {}), ...style }}
    >
      <Icon 
        size={size} 
        strokeWidth={strokeWidth || (activeIconSet === "Minimal Thin" ? 1 : (activeIconSet === "Sharp Tech" || activeIconSet === "Retro 8-Bit") ? 2.5 : 1.5)} 
      />
    </div>
  );
};
