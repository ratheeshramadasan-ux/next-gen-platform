"use client";

import { Box, Check, ChevronDown, Download, Laptop, MessageSquare, Monitor, Package, Server, Sparkles, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type VersionEntry = {
  version: string;
  changelog?: string;
};

type DownloadCardProps = {
  target: string;
  iconName: "windows" | "linux" | "mac" | "docker" | "k8s" | "alo" | "uao-sdk" | "default";
  title: string;
  description: string;
  detail: string;
  specs: Array<{ label: string; value: string }>;
  buttonLabel: string;
  disabled: boolean;
  availableVersions: Array<VersionEntry>;
  selectedVersion: string | null;
  format?: string;
  fileName?: string;
};

const platformThemes: Record<string, { accent: string; bg: string; border: string; badge: string; iconBg: string; iconText: string; glow: string }> = {
  windows: {
    accent: "text-blue-500",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    badge: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-500",
    glow: "shadow-[0_0_30px_rgba(59,130,246,0.08)]",
  },
  linux: {
    accent: "text-amber-500",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    iconBg: "bg-amber-500/10",
    iconText: "text-amber-500",
    glow: "shadow-[0_0_30px_rgba(245,158,11,0.08)]",
  },
  mac: {
    accent: "text-violet-500",
    bg: "bg-violet-500/5",
    border: "border-violet-500/20",
    badge: "bg-violet-500/10 text-violet-600 border-violet-500/20",
    iconBg: "bg-violet-500/10",
    iconText: "text-violet-500",
    glow: "shadow-[0_0_30px_rgba(139,92,246,0.08)]",
  },
  docker: {
    accent: "text-cyan-500",
    bg: "bg-cyan-500/5",
    border: "border-cyan-500/20",
    badge: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
    iconBg: "bg-cyan-500/10",
    iconText: "text-cyan-500",
    glow: "shadow-[0_0_30px_rgba(6,182,212,0.08)]",
  },
  k8s: {
    accent: "text-emerald-500",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    iconBg: "bg-emerald-500/10",
    iconText: "text-emerald-500",
    glow: "shadow-[0_0_30px_rgba(16,185,129,0.08)]",
  },
  alo: {
    accent: "text-rose-500",
    bg: "bg-rose-500/5",
    border: "border-rose-500/20",
    badge: "bg-rose-500/10 text-rose-600 border-rose-500/20",
    iconBg: "bg-rose-500/10",
    iconText: "text-rose-500",
    glow: "shadow-[0_0_30px_rgba(244,63,94,0.08)]",
  },
  "uao-sdk": {
    accent: "text-indigo-500",
    bg: "bg-indigo-500/5",
    border: "border-indigo-500/20",
    badge: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20",
    iconBg: "bg-indigo-500/10",
    iconText: "text-indigo-500",
    glow: "shadow-[0_0_30px_rgba(79,70,229,0.1)]",
  },
  default: {
    accent: "text-primary",
    bg: "bg-primary/5",
    border: "border-primary/20",
    badge: "bg-primary/10 text-primary border-primary/20",
    iconBg: "bg-primary/10",
    iconText: "text-primary",
    glow: "",
  },
};

export function DownloadCard(props: DownloadCardProps) {
  const Icon = getAgentIcon(props.iconName);
  const theme = platformThemes[props.iconName] ?? platformThemes.default;
  const [version, setVersion] = useState(
    props.selectedVersion ?? props.availableVersions[0]?.version ?? ""
  );

  const selectedEntry = props.availableVersions.find((e) => e.version === version);
  const isLatest = version === props.availableVersions[0]?.version;

  const downloadHref = useMemo(() => {
    const params = new URLSearchParams({ target: props.target });
    if (version) {
      params.set("version", version);
    }

    return `/api/download-vm-agent?${params.toString()}`;
  }, [props.target, version]);

  return (
    <div className={cn(
      "group relative overflow-hidden rounded-sm border bg-card/80 p-6 shadow-sm transition-all duration-300 hover:shadow-md",
      props.disabled ? "border-border opacity-80" : theme.border,
      !props.disabled && theme.glow,
    )}>
      {/* Subtle gradient accent */}
      <div className={cn("absolute inset-x-0 top-0 h-1 transition-opacity", props.disabled ? "bg-muted" : theme.bg.replace("/5", "/40"))} />

      {/* Header: icon + title + status */}
      <div className="flex items-start gap-4">
        <div className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-sm transition-transform duration-300 group-hover:scale-105",
          props.disabled ? "bg-muted text-muted-foreground" : theme.iconBg,
          !props.disabled && theme.iconText,
        )}>
          <Icon size={22} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black tracking-tight text-foreground">{props.title}</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground leading-snug">{props.description}</p>
        </div>
        {/* Status dot */}
        <div className="shrink-0 pt-1">
          {props.disabled ? (
            <span className="flex items-center gap-1.5 rounded-sm border border-border bg-muted/50 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Pending
            </span>
          ) : (
            <span className={cn("flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]", theme.badge)}>
              <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", theme.accent.replace("text-", "bg-"))} />
              Available
            </span>
          )}
        </div>
      </div>

      {/* Detail text */}
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{props.detail}</p>

      {/* Version Selector + Specs */}
      <div className="mt-4 rounded-sm border border-border bg-background/60 p-4 space-y-3">
        {/* Version row */}
        <div className="flex items-center gap-3">
          <label className="flex-1 grid gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              Version
            </span>
            <div className="relative">
              <select
                value={version}
                onChange={(event) => setVersion(event.target.value)}
                disabled={props.availableVersions.length === 0}
                className="w-full appearance-none rounded-sm border border-border bg-card px-3 py-2 pr-8 text-sm font-medium text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {props.availableVersions.length === 0 ? (
                  <option value="">No published versions</option>
                ) : (
                  props.availableVersions.map((entry) => (
                    <option key={`${props.target}-${entry.version}`} value={entry.version}>
                      v{entry.version}{entry.version === props.availableVersions[0]?.version ? " (latest)" : ""}
                    </option>
                  ))
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </label>
          {isLatest && !props.disabled && (
            <div className="shrink-0 mt-5">
              <span className={cn("inline-flex items-center gap-1 rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.1em]", theme.badge)}>
                <Sparkles className="h-3 w-3" />
                Latest
              </span>
            </div>
          )}
        </div>

        {/* Changelog line */}
        {selectedEntry?.changelog && (
          <div className={cn("rounded-sm border px-3 py-2 text-xs leading-5", theme.border, theme.bg)}>
            <span className={cn("font-bold", theme.accent)}>What&apos;s new:</span>{" "}
            <span className="text-muted-foreground">{selectedEntry.changelog}</span>
          </div>
        )}

        {/* Specs grid */}
        <div className="space-y-2">
          {props.specs.map((spec, index) => (
            <div
              key={`${props.target}-${spec.label}-${index}`}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="text-muted-foreground">{spec.label}</span>
              <span className="text-right font-medium text-foreground">
                {spec.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Download / Action button */}
      {props.disabled ? (
        <div className="mt-5 grid gap-2">
          <div className="inline-flex items-center gap-2 rounded-sm border border-border bg-muted/50 px-4 py-2.5 text-sm font-bold text-muted-foreground">
            <Package size={16} />
            Installer build pending
          </div>
          <p className="text-xs leading-5 text-muted-foreground">
            This target will become downloadable once a real installer artifact is published into the release pipeline.
          </p>
        </div>
      ) : props.target === "uao-sdk" ? (
        <div className="mt-5 space-y-3">
          <div className="relative group/cmd">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-[10px] font-black text-primary uppercase">npm</span>
            </div>
            <code className="block w-full rounded-sm border border-border bg-black/80 px-12 py-2.5 text-xs font-mono text-indigo-400 overflow-hidden text-ellipsis whitespace-nowrap">
              install {props.fileName || "@nextgen/universal-agent-object"}
            </code>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`npm install ${props.fileName || "@nextgen/universal-agent-object"}`);
                const btn = document.getElementById(`copy-btn-${props.target}`);
                if (btn) {
                  const originalHtml = btn.innerHTML;
                  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-500"><polyline points="20 6 9 17 4 12"></polyline></svg>';
                  setTimeout(() => { btn.innerHTML = originalHtml; }, 2000);
                }
              }}
              id={`copy-btn-${props.target}`}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-primary transition-colors"
              title="Copy install command"
            >
              <Check size={14} className="group-active/cmd:scale-125 transition-transform" />
            </button>
          </div>
          <a
            href="/dashboard/studio/designer"
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-sm px-5 py-2.5 text-sm font-bold transition-all duration-200",
              "bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md active:scale-[0.98]",
            )}
          >
            <Sparkles size={16} />
            Explore Agent Builder
          </a>
        </div>
      ) : (
        <a
          href={downloadHref}
          className={cn(
            "mt-5 inline-flex items-center gap-2 rounded-sm px-5 py-2.5 text-sm font-bold transition-all duration-200",
            "bg-primary text-primary-foreground hover:opacity-90 hover:shadow-md active:scale-[0.98]",
          )}
        >
          <Download size={16} />
          {props.buttonLabel}
          {version && <span className="ml-1 opacity-70">v{version}</span>}
        </a>
      )}
    </div>
  );
}

function getAgentIcon(
  iconName: DownloadCardProps["iconName"]
): LucideIcon {
  switch (iconName) {
    case "windows":
      return Monitor;
    case "linux":
      return Server;
    case "mac":
      return Laptop;
    case "docker":
      return Box;
    case "k8s":
      return Server;
    case "uao-sdk":
      return Code2;
    default:
      return Download;
  }
}

import { Code2 } from "lucide-react";
