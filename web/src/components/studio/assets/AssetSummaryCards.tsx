"use client";

import React from "react";
import { 
  FileText, 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Clock 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AssetSummaryCardsProps {
  stats: {
    total: number;
    credentials: number;
    enabled: number;
    disabled: number;
    expiringSoon: number;
  };
}

export function AssetSummaryCards({ stats }: AssetSummaryCardsProps) {
  const cards = [
    {
      label: "Total Assets",
      value: stats.total,
      icon: FileText,
      color: "blue",
      bgColor: "bg-blue-500/10",
      textColor: "text-blue-500",
      borderColor: "border-blue-500/20"
    },
    {
      label: "Credential Assets",
      value: stats.credentials,
      icon: Lock,
      color: "purple",
      bgColor: "bg-purple-500/10",
      textColor: "text-purple-500",
      borderColor: "border-purple-500/20"
    },
    {
      label: "Enabled",
      value: stats.enabled,
      icon: CheckCircle2,
      color: "emerald",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-500",
      borderColor: "border-emerald-500/20"
    },
    {
      label: "Disabled",
      value: stats.disabled,
      icon: XCircle,
      color: "rose",
      bgColor: "bg-rose-500/10",
      textColor: "text-rose-500",
      borderColor: "border-rose-500/20"
    },
    {
      label: "Expiring Soon",
      value: stats.expiringSoon,
      icon: Clock,
      color: "amber",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-500",
      borderColor: "border-amber-500/20"
    }
  ];

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map((card) => (
        <div 
          key={card.label}
          className={cn(
            "p-4 rounded-2xl border bg-card/30 backdrop-blur-sm transition-all hover:shadow-lg hover:-translate-y-0.5",
            card.borderColor
          )}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground/60">{card.label}</span>
            <div className={cn("p-2 rounded-lg", card.bgColor)}>
              <card.icon size={18} className={card.textColor} />
            </div>
          </div>
          <div className="text-2xl font-black text-foreground">
            {card.value}
          </div>
        </div>
      ))}
    </div>
  );
}
