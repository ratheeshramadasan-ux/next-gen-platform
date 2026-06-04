"use client";

import React, { use } from "react";
import { motion } from "framer-motion";
import { DraftingCompass, ArrowLeft, Sparkles, Clock } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function PageUnderDesign({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = use(params);
  const pagePath = slug.join(" / ");
  const pageName = slug[slug.length - 1]
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] py-16 px-4">
      {/* Animated Icon */}
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
        className="relative mb-8"
      >
        <div className="w-24 h-24 rounded-sm bg-primary/10 flex items-center justify-center relative">
          <DraftingCompass className="w-10 h-10 text-primary" strokeWidth={1.5} />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-sm border-2 border-dashed border-primary/20"
          />
        </div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.5, type: "spring" }}
          className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-500/15 flex items-center justify-center border border-amber-500/25"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
        </motion.div>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-bold tracking-tight text-center mb-2"
      >
        Module Under Design
      </motion.h1>

      {/* Module Name Badge */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4"
      >
        <span className="text-xs font-bold text-primary uppercase tracking-widest">{pageName}</span>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-muted-foreground text-center max-w-md leading-relaxed mb-2"
      >
        This module is currently being architected by the Next Gen platform team.
        It will be available in a future release.
      </motion.p>

      {/* Breadcrumb Path */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono mb-8"
      >
        <Clock size={10} />
        <span>/dashboard/{pagePath}</span>
      </motion.div>

      {/* Progress Indicators */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className={cn(
          "rounded-sm border p-6 mb-8 w-full max-w-sm",
          "border-white/10 dark:border-white/[0.06]",
          "bg-white/20 dark:bg-white/[0.02] backdrop-blur-sm"
        )}
      >
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Design Progress</p>
        <div className="space-y-3">
          {[
            { label: "Requirements", progress: 100 },
            { label: "Data Model", progress: 75 },
            { label: "UI Components", progress: 40 },
            { label: "Integration", progress: 10 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-[10px] font-medium text-muted-foreground w-24 shrink-0">{item.label}</span>
              <div className="flex-1 h-1.5 rounded-full bg-muted/50 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${item.progress}%` }}
                  transition={{ delay: 0.8, duration: 1, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    item.progress === 100
                      ? "bg-emerald-500"
                      : item.progress >= 50
                      ? "bg-primary"
                      : "bg-primary/50"
                  )}
                />
              </div>
              <span className="text-[9px] font-mono text-muted-foreground w-8 text-right">{item.progress}%</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Action */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.9 }}
      >
        <Link
          href="/dashboard"
          className={cn(
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs font-bold uppercase tracking-wider transition-all",
            "bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98]"
          )}
        >
          <ArrowLeft size={14} />
          Return to Dashboard
        </Link>
      </motion.div>
    </div>
  );
}
