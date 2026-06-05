"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface ToggleSwitchProps {
  value: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
  disabled?: boolean;
  className?: string;
}

/**
 * Accessible toggle switch.
 * Uses inline-flex + padding — no absolute positioning on the thumb,
 * so it never overflows its container regardless of parent layout.
 */
export function ToggleSwitch({ value, onChange, size = "md", disabled, className }: ToggleSwitchProps) {
  const isSm = size === "sm";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      disabled={disabled}
      onClick={() => !disabled && onChange(!value)}
      className={cn(
        "relative inline-flex shrink-0 cursor-pointer rounded-full border-2 border-transparent",
        "transition-colors duration-200 ease-in-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-50",
        value ? "bg-primary" : "bg-muted-foreground/30",
        isSm ? "h-5 w-9" : "h-6 w-11",
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none inline-block rounded-full bg-white shadow-sm",
          "transform transition-transform duration-200 ease-in-out",
          isSm
            ? cn("h-4 w-4", value ? "translate-x-4" : "translate-x-0")
            : cn("h-5 w-5", value ? "translate-x-5" : "translate-x-0")
        )}
      />
    </button>
  );
}

export default ToggleSwitch;
