/**
 * 🎨 Next Gen UI: Status & Severity Utilities
 * Centralizes coloring and iconography logic for the high-density dashboard.
 */

export const SEVERITY_COLORS = {
  Critical: "bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]",
  High: "bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]",
  Medium: "bg-primary text-white shadow-[0_0_12px_rgba(var(--primary-rgb),0.3)]",
  Info: "bg-emerald-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.3)]",
  System: "bg-muted text-muted-foreground",
  Default: "bg-muted text-muted-foreground"
};

export function getSeverityStyle(severity: string = "Info") {
  return SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || SEVERITY_COLORS.Default;
}

export function getStatusStyle(status: string) {
  const s = status?.toLowerCase();
  if (s === "active" || s === "online" || s === "healthy") return "text-emerald-500";
  if (s === "pending" || s === "warning" || s === "busy") return "text-amber-500";
  if (s === "inactive" || s === "offline" || s === "critical") return "text-rose-500";
  return "text-muted-foreground";
}
