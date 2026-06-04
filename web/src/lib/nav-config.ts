import { 
  LayoutDashboard, 
  Map, 
  Workflow, 
  Activity, 
  BrainCircuit, 
  ShieldCheck, 
  FileCheck, 
  Store, 
  Database, 
  Zap, 
  Monitor, 
  Lock, 
  Shield, 
  CreditCard, 
  Settings,
  LucideIcon
} from "lucide-react";

export type Role = "Admin" | "Developer" | "Business User" | "Viewer";

export interface NavSubItem {
  label: string;
  path: string;
  roles?: Role[];
}

export interface NavItem {
  label: string;
  path?: string;
  icon: LucideIcon;
  description: string;
  children?: NavSubItem[];
  roles?: Role[];
}

export const navigationConfig: NavItem[] = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    description: "Everything happening in one place",
    children: [
      { label: "Executive Dashboard", path: "/overview" },
      { label: "System Blueprint", path: "/overview/blueprint" },
    ],
    roles: ["Admin", "Developer", "Business User", "Viewer"]
  },
  {
    label: "My Spaces",
    icon: Map,
    description: "Manage your workspaces and environments",
    children: [
      { label: "All Spaces", path: "/spaces" },
      { label: "Create New Space", path: "/spaces/new" },
      { label: "Space Settings", path: "/spaces/settings" },
      { label: "Team Members", path: "/spaces/team" },
      { label: "Access Control", path: "/spaces/access" },
      { label: "Limits & Usage", path: "/spaces/limits" },
    ],
    roles: ["Admin", "Developer"]
  },
  {
    label: "Automation Builder",
    icon: Workflow,
    description: "Create and manage automated workflows",
    children: [
      { label: "My Automations", path: "/automation-builder" },
      { label: "Create Automation", path: "/automation-builder/new" },
      { label: "Visual Builder", path: "/automation-builder/visual" },
      { label: "Bot Library", path: "/automation-builder/library" },
      { label: "Logic & Rules", path: "/automation-builder/logic" },
      { label: "Triggers", path: "/automation-builder/triggers" },
      { label: "Test & Debug", path: "/automation-builder/debug" },
      { label: "Versions", path: "/automation-builder/versions" },
    ],
    roles: ["Admin", "Developer"]
  },
  {
    label: "Runs & Activity",
    icon: Activity,
    description: "Real-time execution monitoring",
    children: [
      { label: "Live Runs", path: "/runs/live" },
      { label: "Completed Runs", path: "/runs/completed" },
      { label: "Failed Runs", path: "/runs/failed" },
      { label: "Retry Failed Jobs", path: "/runs/retry" },
      { label: "Logs & History", path: "/runs/history" },
      { label: "Worker Status", path: "/runs/workers" },
    ],
    roles: ["Admin", "Developer", "Business User"]
  },
  {
    label: "AI Assistant Hub",
    icon: BrainCircuit,
    description: "Intelligence and agent orchestration",
    children: [
      { label: "AI Agents", path: "/ai-hub/agents" },
      { label: "Workflows (AI Steps)", path: "/ai-hub/workflows" },
      { label: "Prompts Library", path: "/ai-hub/prompts" },
      { label: "AI Tools", path: "/ai-hub/tools" },
      { label: "Memory / Context", path: "/ai-hub/memory" },
      { label: "Model Selection", path: "/ai-hub/models" },
    ],
    roles: ["Admin", "Developer"]
  },
  {
    label: "Rules & Controls",
    icon: ShieldCheck,
    description: "Governance and policy enforcement",
    children: [
      { label: "Rules", path: "/rules" },
      { label: "Permissions", path: "/rules/permissions" },
      { label: "Approval Flows", path: "/rules/approvals" },
      { label: "Access Control", path: "/rules/access" },
      { label: "Compliance Checks", path: "/rules/compliance" },
      { label: "Audit Logs", path: "/rules/audit" },
    ],
    roles: ["Admin"]
  },
  {
    label: "Trust & Validation",
    icon: FileCheck,
    description: "Proof-carrying verification and compliance",
    children: [
      { label: "Run History Proof", path: "/validation/history" },
      { label: "Validation Results", path: "/validation/results" },
      { label: "Error Checks", path: "/validation/errors" },
      { label: "Compliance Reports", path: "/validation/reports" },
      { label: "Audit Trail", path: "/validation/audit" },
    ],
    roles: ["Admin", "Viewer"]
  },
  {
    label: "Marketplace",
    icon: Store,
    description: "Discover and install pre-built modules",
    children: [
      { label: "Ready Automations", path: "/marketplace/automations" },
      { label: "AI Tools", path: "/marketplace/tools" },
      { label: "Templates", path: "/marketplace/templates" },
      { label: "Compute / Usage Plans", path: "/marketplace/plans" },
      { label: "Pricing", path: "/marketplace/pricing" },
    ],
    roles: ["Admin", "Developer", "Business User"]
  },
  {
    label: "Data Center",
    icon: Database,
    description: "Source and flow management",
    children: [
      { label: "Data Sources", path: "/data/sources" },
      { label: "Data Flows", path: "/data/flows" },
      { label: "Data Tables", path: "/data/tables" },
      { label: "Reports", path: "/data/reports" },
      { label: "Data History", path: "/data/history" },
    ],
    roles: ["Admin", "Developer"]
  },
  {
    label: "Connections",
    icon: Zap,
    description: "External app and service links",
    children: [
      { label: "Apps & Services", path: "/connections/apps" },
      { label: "API Connections", path: "/connections/apis" },
      { label: "Webhooks", path: "/connections/webhooks" },
      { label: "Authentication Links", path: "/connections/auth" },
      { label: "Sync Logs", path: "/connections/logs" },
    ],
    roles: ["Admin", "Developer"]
  },
  {
    label: "Monitoring",
    icon: Monitor,
    description: "Global system health dashboard",
    children: [
      { label: "System Health", path: "/monitoring/health" },
      { label: "Performance", path: "/monitoring/performance" },
      { label: "Failures", path: "/monitoring/failures" },
      { label: "Cost Usage", path: "/monitoring/cost" },
      { label: "Alerts", path: "/monitoring/alerts" },
    ],
    roles: ["Admin", "Developer"]
  },
  {
    label: "Admin",
    icon: Shield,
    description: "Platform administration",
    children: [
      { label: "System Settings", path: "/admin/settings" },
      { label: "Feature Controls", path: "/admin/features" },
      { label: "Tenant Management", path: "/admin/tenants" },
      { label: "System Logs", path: "/admin/logs" },
    ],
    roles: ["Admin"]
  },
  {
    label: "Usage & Billing",
    icon: CreditCard,
    description: "Consumption tracking and invoices",
    children: [
      { label: "Usage Tracking", path: "/billing/usage" },
      { label: "Invoices", path: "/billing/invoices" },
      { label: "Plans", path: "/billing/plans" },
      { label: "Cost Reports", path: "/billing/reports" },
      { label: "Budget Limits", path: "/billing/budgets" },
    ],
    roles: ["Admin"]
  },
  {
    label: "Settings",
    icon: Settings,
    description: "Personal and app preferences",
    children: [
      { label: "Preferences", path: "/settings/preferences" },
      { label: "Notifications", path: "/settings/notifications" },
      { label: "Language", path: "/settings/language" },
      { label: "Backups", path: "/settings/backups" },
      { label: "API Settings", path: "/settings/api" },
    ],
    roles: ["Admin", "Developer", "Business User", "Viewer"]
  }
];
