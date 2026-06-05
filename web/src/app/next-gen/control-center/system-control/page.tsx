"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import { toast } from "sonner";
import {
  Shield, Settings, Globe, Lock, Activity, Server, Brain, Building2,
  ChevronRight, ChevronDown, Save, Plus, Trash2, Edit, X, Check,
  AlertTriangle, ToggleLeft, ToggleRight, Key, Database, Cpu,
  HardDrive, Cloud, Zap, Eye, EyeOff, RefreshCw, Download, Upload,
  Network, Radio, Layers, Box, Terminal, FileText, Users, Clock,
  MapPin, DollarSign, Calendar, Sliders, Flag, Tag, Mail, Wifi,
  Monitor, ShieldCheck, BookOpen, ScrollText, BarChart3, Fingerprint,
  Workflow, BrainCircuit, Sparkles, FlaskConical, GitBranch, Package,
  Gauge, Bell, Puzzle, Archive, RotateCw, AlertCircle, Info,
  CheckCircle2, XCircle, Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { IconWrapper } from "@/components/ui/icon-wrapper";

// ─── Domain Definitions ─────────────────────────────────────────────────────

const DOMAINS = [
  {
    id: "platform-config",
    label: "Platform Configuration",
    icon: Settings,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    desc: "Global settings, licensing, feature flags, branding, and regional configuration",
    sections: ["global-settings", "feature-flags", "branding", "regional"],
  },
  {
    id: "security-control",
    label: "Security Control",
    icon: Lock,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    desc: "Platform-level SSO, SAML, OIDC, LDAP and Active Directory — governs Platform Admin authentication",
    sections: ["sso", "saml", "oidc", "ldap"],
  },
  {
    id: "platform-governance",
    label: "Platform Governance",
    icon: ScrollText,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    desc: "Global policies, retention rules, audit policies, approval workflows, data residency",
    sections: ["global-policies", "retention", "audit-policy", "data-residency"],
  },
  {
    id: "platform-monitoring",
    label: "Platform Monitoring",
    icon: Activity,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    desc: "Health, service, queue, and database monitoring configuration",
    sections: ["health", "service-monitor", "queue-monitor", "db-monitor"],
  },
  {
    id: "infrastructure-control",
    label: "Infrastructure Control",
    icon: Server,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    desc: "Kubernetes cluster management, node pools, storage, backup, disaster recovery",
    sections: ["kubernetes", "storage", "backup", "disaster-recovery"],
  },
  {
    id: "ai-control",
    label: "AI Control",
    icon: BrainCircuit,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    desc: "LLM registry, model registry, prompt registry, embeddings, AI guardrails",
    sections: ["llm-registry", "model-registry", "prompt-registry", "guardrails"],
  },
  {
    id: "service-catalog",
    label: "Service Catalog",
    icon: Puzzle,
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    desc: "Platform services — install, configure, license, and manage lifecycle",
    sections: ["services"],
  },
];

// ─── Service Catalog Data ────────────────────────────────────────────────────
const PLATFORM_SERVICES = [
  { key: "flow-service", name: "Flow Service", layer: "Layer 3", desc: "Workflow orchestration, BPMN, long-running processes, human tasks", icon: Workflow, status: "active", version: "2.4.1" },
  { key: "app-service", name: "App Service", layer: "Layer 3", desc: "Forms, portals, internal and mobile application development", icon: Monitor, status: "active", version: "1.9.3" },
  { key: "document-service", name: "Document Processing", layer: "Layer 3", desc: "Classification, extraction, validation, HITL intelligent document processing", icon: FileText, status: "active", version: "3.1.0" },
  { key: "mail-service", name: "Mail Processing", layer: "Layer 3", desc: "Email classification, intent detection, attachment handling, case creation", icon: Mail, status: "inactive", version: "1.2.0" },
  { key: "reconciliation-service", name: "Reconciliation", layer: "Layer 3", desc: "Transaction matching, tolerance rules, exception management", icon: RotateCw, status: "inactive", version: "1.0.5" },
  { key: "investigation-service", name: "Investigation", layer: "Layer 3", desc: "Case management, investigation workbench, root cause analysis", icon: FlaskConical, status: "inactive", version: "1.1.2" },
  { key: "data-service", name: "Data Service", layer: "Layer 3", desc: "Business data layer, entities, relationships, APIs, versioning", icon: Database, status: "active", version: "2.0.0" },
  { key: "quality-service", name: "Quality Service", layer: "Layer 3", desc: "Unit testing, regression testing, test data management", icon: CheckCircle2, status: "inactive", version: "1.0.0" },
  { key: "release-service", name: "Release Service", layer: "Layer 3", desc: "Packaging, promotion, deployment, rollback — DevOps pipeline", icon: GitBranch, status: "active", version: "1.3.7" },
  { key: "dashboard-service", name: "Dashboard Service", layer: "Layer 3", desc: "Reporting, analytics — service-aware dashboard visibility", icon: BarChart3, status: "active", version: "2.2.0" },
  { key: "identity-service", name: "Identity Service", layer: "Layer 4", desc: "Authentication, authorization, RBAC, ABAC", icon: Fingerprint, status: "active", version: "4.0.0" },
  { key: "notification-service", name: "Notification Service", layer: "Layer 4", desc: "Email, SMS, Teams, Slack notifications", icon: Bell, status: "active", version: "2.1.0" },
  { key: "audit-service", name: "Audit Service", layer: "Layer 4", desc: "Audit logs, change tracking", icon: ScrollText, status: "active", version: "3.0.1" },
  { key: "storage-service", name: "Storage Service", layer: "Layer 4", desc: "Files, documents, images — S3/Blob/MinIO", icon: Archive, status: "active", version: "1.8.0" },
  { key: "ai-service", name: "AI Service", layer: "Layer 4", desc: "LLM gateway, prompt management, embeddings, RAG", icon: Brain, status: "active", version: "1.5.2" },
  { key: "rules-engine", name: "Rules Engine", layer: "Layer 4", desc: "Business rules, decision tables", icon: Sliders, status: "active", version: "2.0.3" },
  { key: "event-bus", name: "Event Bus", layer: "Layer 4", desc: "Kafka / RabbitMQ / Azure Event Hub", icon: Radio, status: "active", version: "1.2.1" },
  { key: "api-gateway", name: "API Gateway", layer: "Layer 4", desc: "Service exposure, security, routing", icon: Network, status: "active", version: "3.2.0" },
];

// ─── Feature Flags Data ──────────────────────────────────────────────────────
const DEFAULT_FLAGS = [
  { key: "ai_copilot", label: "AI Copilot", desc: "Enable AI-assisted automation suggestions across all services", enabled: true, tier: "Enterprise" },
  { key: "multi_workspace", label: "Multi-Workspace", desc: "Allow customers to create multiple isolated workspaces", enabled: true, tier: "Pro" },
  { key: "hitl", label: "Human-in-the-Loop", desc: "Enable human review and approval gates in automated flows", enabled: true, tier: "Standard" },
  { key: "agentic_mode", label: "Agentic AI Mode", desc: "Autonomous AI agent execution with goal-based orchestration", enabled: false, tier: "Enterprise" },
  { key: "air_gap_support", label: "Air-Gapped Deployment", desc: "Support offline / disconnected deployment topology", enabled: false, tier: "Enterprise" },
  { key: "hybrid_cloud", label: "Hybrid Cloud Mode", desc: "Enable split-plane hybrid cloud deployment", enabled: true, tier: "Enterprise" },
  { key: "rag_enabled", label: "RAG (Retrieval-Augmented Generation)", desc: "Enable vector store + RAG pipelines for document intelligence", enabled: true, tier: "Pro" },
  { key: "multi_llm", label: "Multi-LLM Routing", desc: "Route prompts across multiple LLM providers with fallback", enabled: false, tier: "Enterprise" },
  { key: "audit_streaming", label: "Real-Time Audit Streaming", desc: "Stream audit events to external SIEM via Kafka/Webhook", enabled: true, tier: "Enterprise" },
  { key: "test_automation", label: "Automated QA Testing", desc: "Enable Quality Service regression and unit test pipelines", enabled: false, tier: "Pro" },
];

// ─── LLM Registry Data ──────────────────────────────────────────────────────
const LLM_MODELS = [
  { key: "claude-opus-4", name: "Claude Opus 4", provider: "Anthropic", type: "LLM", status: "active", context: "200K", cost: "$0.015/1K" },
  { key: "claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "Anthropic", type: "LLM", status: "active", context: "200K", cost: "$0.003/1K" },
  { key: "gpt-4o", name: "GPT-4o", provider: "OpenAI", type: "LLM", status: "active", context: "128K", cost: "$0.005/1K" },
  { key: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI", type: "LLM", status: "active", context: "128K", cost: "$0.00015/1K" },
  { key: "gemini-1-5-pro", name: "Gemini 1.5 Pro", provider: "Google", type: "LLM", status: "inactive", context: "1M", cost: "$0.007/1K" },
  { key: "mistral-large", name: "Mistral Large", provider: "Mistral AI", type: "LLM", status: "inactive", context: "128K", cost: "$0.004/1K" },
  { key: "text-embedding-3-large", name: "text-embedding-3-large", provider: "OpenAI", type: "Embedding", status: "active", context: "8K", cost: "$0.00013/1K" },
  { key: "claude-embed", name: "Claude Embedding", provider: "Anthropic", type: "Embedding", status: "active", context: "32K", cost: "$0.00020/1K" },
];

// ─── Regions ─────────────────────────────────────────────────────────────────
const REGIONS = [
  { key: "us-east-1", label: "US East (N. Virginia)", cloud: "AWS", residency: true },
  { key: "us-west-2", label: "US West (Oregon)", cloud: "AWS", residency: false },
  { key: "eu-west-1", label: "EU West (Ireland)", cloud: "AWS", residency: true },
  { key: "eu-central-1", label: "EU Central (Frankfurt)", cloud: "AWS", residency: true },
  { key: "ap-southeast-1", label: "Asia Pacific (Singapore)", cloud: "AWS", residency: false },
  { key: "eastus", label: "East US", cloud: "Azure", residency: true },
  { key: "westeurope", label: "West Europe", cloud: "Azure", residency: true },
  { key: "australiaeast", label: "Australia East", cloud: "Azure", residency: false },
];

// ─── Toggle Component ────────────────────────────────────────────────────────
// Local Toggle — thin wrapper around the shared ToggleSwitch
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <ToggleSwitch value={value} onChange={onChange} />;
}

// ─── Field Component ─────────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", disabled }: any) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
    />
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc?: string }) {
  return (
    <div className="flex items-start gap-3 pb-4 border-b border-border mb-5">
      <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon size={15} className="text-primary" />
      </div>
      <div>
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {desc && <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>}
      </div>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  // Status colors are semantic (active=online, degraded=warning, error=critical) — not decorative
  const map: Record<string, string> = {
    active:   "bg-primary/10 text-primary border-primary/20",
    inactive: "bg-muted text-muted-foreground border-border",
    degraded: "bg-muted/60 text-muted-foreground border-border",
    error:    "bg-destructive/10 text-destructive border-destructive/20",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-md border", map[status] || map.inactive)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", status === "active" ? "bg-primary" : status === "error" ? "bg-destructive" : "bg-muted-foreground")} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Domain Content Panels ────────────────────────────────────────────────────

function PlatformConfigPanel() {
  const [tzLookups, setTzLookups] = useState<{ id: string; label: string; category: string | null }[]>([]);
  const [cxLookups, setCxLookups] = useState<{ id: string; label: string; code: string }[]>([]);

  React.useEffect(() => {
    // Load reference data for timezone and currency dropdowns
    import("@/app/actions/lookupActions").then(({ getTimezoneLookups, getCurrencyLookups }) => {
      Promise.all([getTimezoneLookups(), getCurrencyLookups()]).then(([tz, cx]) => {
        setTzLookups(tz);
        setCxLookups(cx);
      });
    });
  }, []);

  const [globalSettings, setGlobalSettings] = useState({
    platformName: "NextGen Platform",
    platformVersion: "4.2.0",
    defaultLanguage: "en",
    defaultTimezone: "UTC",
    defaultCurrency: "USD",
    supportEmail: "support@platform.io",
    maxTenantsPerCustomer: "10",
    sessionTimeoutMinutes: "60",
    maxLoginAttempts: "5",
    passwordMinLength: "12",
  });
  const [flags, setFlags] = useState(DEFAULT_FLAGS.map(f => ({ ...f })));
  const [branding, setBranding] = useState({
    logoUrl: "",
    faviconUrl: "",
    platformTagline: "Enterprise AI & Automation Platform",
  });

  const toggleFlag = (key: string) => {
    setFlags(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  const handleSaveGlobal = () => toast.success("Global settings saved");
  const handleSaveBranding = () => toast.success("Branding configuration saved");
  const handleSaveFlags = () => toast.success("Feature flags updated");

  return (
    <div className="space-y-10">
      {/* Global Settings */}
      <section>
        <SectionHeader icon={Globe} title="Global Settings" desc="Core platform identity, locale, and security defaults" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Platform Name">
            <Input value={globalSettings.platformName} onChange={(v: string) => setGlobalSettings(p => ({...p, platformName: v}))} />
          </Field>
          <Field label="Platform Version">
            <Input value={globalSettings.platformVersion} onChange={(v: string) => setGlobalSettings(p => ({...p, platformVersion: v}))} />
          </Field>
          <Field label="Default Language">
            <Select value={globalSettings.defaultLanguage} onChange={v => setGlobalSettings(p => ({...p, defaultLanguage: v}))} options={[
              { value: "en", label: "English" },
              { value: "fr", label: "French" },
              { value: "de", label: "German" },
              { value: "es", label: "Spanish" },
              { value: "ja", label: "Japanese" },
            ]} />
          </Field>
          <Field label="Default Timezone">
            {/* Grouped by category from reference data */}
            <select
              value={globalSettings.defaultTimezone}
              onChange={e => setGlobalSettings(p => ({...p, defaultTimezone: e.target.value}))}
              className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="">Select timezone…</option>
              {tzLookups.length > 0
                ? Object.entries(
                    tzLookups.reduce<Record<string, typeof tzLookups>>((acc, tz) => {
                      const cat = tz.category || "Other";
                      (acc[cat] = acc[cat] || []).push(tz);
                      return acc;
                    }, {})
                  ).map(([cat, tzs]) => (
                    <optgroup key={cat} label={cat}>
                      {tzs.map(tz => <option key={tz.id} value={tz.label}>{tz.label}</option>)}
                    </optgroup>
                  ))
                : [
                    { value: "UTC", label: "UTC" },
                    { value: "America/New_York", label: "Eastern Time (ET)" },
                    { value: "Europe/London", label: "London (GMT)" },
                    { value: "Asia/Tokyo", label: "Tokyo (JST)" },
                  ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)
              }
            </select>
          </Field>
          <Field label="Default Currency">
            <Select
              value={globalSettings.defaultCurrency}
              onChange={v => setGlobalSettings(p => ({...p, defaultCurrency: v}))}
              options={
                cxLookups.length > 0
                  ? cxLookups.map(c => ({ value: c.code || c.label, label: c.code ? `${c.code} — ${c.label}` : c.label }))
                  : [
                      { value: "USD", label: "USD — US Dollar" },
                      { value: "EUR", label: "EUR — Euro" },
                      { value: "GBP", label: "GBP — British Pound" },
                      { value: "CAD", label: "CAD — Canadian Dollar" },
                    ]
              }
            />
          </Field>
          <Field label="Support Email">
            <Input value={globalSettings.supportEmail} onChange={(v: string) => setGlobalSettings(p => ({...p, supportEmail: v}))} type="email" />
          </Field>
          <Field label="Max Tenants per Customer">
            <Input value={globalSettings.maxTenantsPerCustomer} onChange={(v: string) => setGlobalSettings(p => ({...p, maxTenantsPerCustomer: v}))} type="number" />
          </Field>
          <Field label="Session Timeout (minutes)">
            <Input value={globalSettings.sessionTimeoutMinutes} onChange={(v: string) => setGlobalSettings(p => ({...p, sessionTimeoutMinutes: v}))} type="number" />
          </Field>
          <Field label="Max Login Attempts">
            <Input value={globalSettings.maxLoginAttempts} onChange={(v: string) => setGlobalSettings(p => ({...p, maxLoginAttempts: v}))} type="number" />
          </Field>
          <Field label="Minimum Password Length">
            <Input value={globalSettings.passwordMinLength} onChange={(v: string) => setGlobalSettings(p => ({...p, passwordMinLength: v}))} type="number" />
          </Field>
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={handleSaveGlobal} size="sm"><Save size={14} /> Save Global Settings</Button>
        </div>
      </section>

      {/* Platform Branding */}
      <section>
        <SectionHeader icon={Palette} title="Platform Branding" desc="Platform identity — logo, favicon, and tagline" />
        <div className="space-y-5">

          {/* Logo + Favicon side by side with previews */}
          <div className="grid grid-cols-2 gap-5">
            {/* Logo */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Platform Logo
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Shown in the top navigation bar and on customer-facing portal pages. Recommended: SVG or PNG, min 200 × 60 px, transparent background.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                {/* Live preview */}
                <div className="w-24 h-14 rounded-md border border-border bg-muted/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {branding.logoUrl ? (
                    <img src={branding.logoUrl} alt="Logo preview" className="max-w-full max-h-full object-contain p-1" />
                  ) : (
                    <span className="text-[9px] text-muted-foreground text-center leading-tight px-1">No logo<br/>uploaded</span>
                  )}
                </div>
                <Input
                  value={branding.logoUrl}
                  onChange={(v: string) => setBranding(p => ({...p, logoUrl: v}))}
                  placeholder="https://cdn.example.com/logo.svg"
                />
              </div>
            </div>

            {/* Favicon */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">
                  Favicon
                </label>
                <p className="text-[11px] text-muted-foreground">
                  The small icon shown in the browser tab. Must be a square image. Recommended: ICO or PNG, 32 × 32 px or 64 × 64 px. Different from the logo — used only in the browser tab and bookmarks.
                </p>
              </div>
              <div className="flex gap-3 items-start">
                {/* Favicon preview */}
                <div className="w-14 h-14 rounded-md border border-border bg-muted/40 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {branding.faviconUrl ? (
                    <img src={branding.faviconUrl} alt="Favicon preview" className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-[9px] text-muted-foreground text-center leading-tight px-1">32×32</span>
                  )}
                </div>
                <Input
                  value={branding.faviconUrl}
                  onChange={(v: string) => setBranding(p => ({...p, faviconUrl: v}))}
                  placeholder="https://cdn.example.com/favicon.ico"
                />
              </div>
            </div>
          </div>

          {/* Tagline */}
          <Field label="Platform Tagline" hint="Shown beneath the logo on the login page and in email footers.">
            <Input value={branding.platformTagline} onChange={(v: string) => setBranding(p => ({...p, platformTagline: v}))} />
          </Field>

          {/* Theme redirect notice */}
          <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
            <Palette size={15} className="text-primary flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-foreground">Colours & Login Page Appearance</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                The platform's accent colour, background, and login page appearance are all controlled by the
                <strong className="text-primary"> active Theme</strong>. Themes define every colour token
                (primary, background, card, border, etc.) consistently across the entire application —
                including the customer login portal.
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                To change the look, go to your <strong className="text-foreground">Profile → Theme / Icons</strong> and select or customise a theme.
                The theme is applied platform-wide and to each customer's login portal automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={handleSaveBranding} size="sm"><Save size={14} /> Save Branding</Button>
        </div>
      </section>

      {/* Feature Flags */}
      <section>
        <SectionHeader icon={Flag} title="Feature Flags" desc="Enable or disable platform capabilities globally" />
        <div className="space-y-2">
          {flags.map(flag => (
            <div key={flag.key} className="flex items-center justify-between p-3.5 rounded-lg bg-muted/30 border border-border/60 hover:border-border transition-colors">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">{flag.label}</span>
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                      flag.tier === "Enterprise" ? "bg-primary/10 text-primary border-primary/20" :
                      flag.tier === "Pro" ? "bg-muted/60 text-foreground border-border" :
                      "bg-muted text-muted-foreground"
                    )}>{flag.tier}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{flag.desc}</p>
                </div>
              </div>
              <Toggle value={flag.enabled} onChange={() => toggleFlag(flag.key)} />
            </div>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <Button onClick={handleSaveFlags} size="sm"><Save size={14} /> Save Feature Flags</Button>
        </div>
      </section>
    </div>
  );
}

function SecurityControlPanel() {
  const [ssoProvider, setSsoProvider] = useState("none");
  const [saml, setSaml] = useState({
    entityId: "",
    ssoUrl: "",
    certificate: "",
    nameIdFormat: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress",
    signRequests: true,
    encryptAssertions: false,
  });
  const [oidc, setOidc] = useState({
    issuerUrl: "",
    clientId: "",
    clientSecret: "",
    scopes: "openid profile email",
    pkceEnabled: true,
    autoProvision: true,
  });
  const [ldap, setLdap] = useState({
    server: "",
    port: "389",
    baseDn: "",
    bindDn: "",
    bindPassword: "",
    userFilter: "(objectClass=person)",
    groupFilter: "(objectClass=group)",
    tlsEnabled: false,
    syncInterval: "60",
  });
  const [showSecret, setShowSecret] = useState(false);
  const [showBindPass, setShowBindPass] = useState(false);

  return (
    <div className="space-y-10">
      {/* Scope clarification */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border">
        <AlertCircle size={15} className="text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Platform Administrator Authentication</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            This controls how <strong>Platform Administrators</strong> sign in to the control plane.
            To configure SSO for <strong>customer organization users</strong>, go to
            <span className="font-semibold text-primary"> Users &amp; Teams → Identity Providers</span>.
          </p>
        </div>
      </div>
      {/* SSO Provider Selection */}
      <section>
        <SectionHeader icon={Key} title="Platform Identity Provider" desc="How Platform Administrators authenticate to the control plane" />
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { id: "none", label: "Platform Native", icon: Shield },
            { id: "saml", label: "SAML 2.0", icon: FileText },
            { id: "oidc", label: "OIDC / OAuth 2.0", icon: Globe },
            { id: "ldap", label: "LDAP / Active Directory", icon: Server },
          ].map(p => (
            <button
              key={p.id}
              onClick={() => setSsoProvider(p.id)}
              className={cn(
                "flex flex-col items-center gap-2.5 p-4 rounded-lg border transition-all",
                ssoProvider === p.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted/30 text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              <p.icon size={20} />
              <span className="text-xs font-semibold text-center leading-tight">{p.label}</span>
              {ssoProvider === p.id && <Check size={12} className="text-primary" />}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {ssoProvider === "saml" && (
            <motion.div key="saml" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="p-5 rounded-lg bg-muted/20 border border-border space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><FileText size={12} /> SAML 2.0 Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Entity ID (SP)"><Input value={saml.entityId} onChange={(v: string) => setSaml(p => ({...p, entityId: v}))} placeholder="https://platform.io/saml/metadata" /></Field>
                <Field label="SSO URL (IdP)"><Input value={saml.ssoUrl} onChange={(v: string) => setSaml(p => ({...p, ssoUrl: v}))} placeholder="https://idp.example.com/sso" /></Field>
                <Field label="Name ID Format">
                  <Select value={saml.nameIdFormat} onChange={v => setSaml(p => ({...p, nameIdFormat: v}))} options={[
                    { value: "urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress", label: "Email Address" },
                    { value: "urn:oasis:names:tc:SAML:2.0:nameid-format:persistent", label: "Persistent" },
                    { value: "urn:oasis:names:tc:SAML:2.0:nameid-format:transient", label: "Transient" },
                  ]} />
                </Field>
                <div className="flex flex-col gap-3 justify-center">
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-md border border-border">
                    <span className="text-xs font-medium">Sign Authentication Requests</span>
                    <Toggle value={saml.signRequests} onChange={v => setSaml(p => ({...p, signRequests: v}))} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-md border border-border">
                    <span className="text-xs font-medium">Encrypt Assertions</span>
                    <Toggle value={saml.encryptAssertions} onChange={v => setSaml(p => ({...p, encryptAssertions: v}))} />
                  </div>
                </div>
                <div className="col-span-2">
                  <Field label="IdP Certificate (PEM)">
                    <textarea value={saml.certificate} onChange={e => setSaml(p => ({...p, certificate: e.target.value}))} rows={4}
                      placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                      className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
                  </Field>
                </div>
              </div>
            </motion.div>
          )}

          {ssoProvider === "oidc" && (
            <motion.div key="oidc" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="p-5 rounded-lg bg-muted/20 border border-border space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Globe size={12} /> OIDC / OAuth 2.0 Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Field label="Issuer URL (Discovery Document)"><Input value={oidc.issuerUrl} onChange={(v: string) => setOidc(p => ({...p, issuerUrl: v}))} placeholder="https://accounts.google.com" /></Field>
                </div>
                <Field label="Client ID"><Input value={oidc.clientId} onChange={(v: string) => setOidc(p => ({...p, clientId: v}))} /></Field>
                <Field label="Client Secret">
                  <div className="flex gap-2">
                    <Input value={oidc.clientSecret} onChange={(v: string) => setOidc(p => ({...p, clientSecret: v}))} type={showSecret ? "text" : "password"} />
                    <button onClick={() => setShowSecret(!showSecret)} className="px-3 py-2.5 bg-muted/40 border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors">
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                <Field label="Scopes"><Input value={oidc.scopes} onChange={(v: string) => setOidc(p => ({...p, scopes: v}))} /></Field>
                <div className="flex flex-col gap-3 justify-end">
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-md border border-border">
                    <span className="text-xs font-medium">Enable PKCE</span>
                    <Toggle value={oidc.pkceEnabled} onChange={v => setOidc(p => ({...p, pkceEnabled: v}))} />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-md border border-border">
                    <span className="text-xs font-medium">Auto-Provision New Users</span>
                    <Toggle value={oidc.autoProvision} onChange={v => setOidc(p => ({...p, autoProvision: v}))} />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {ssoProvider === "ldap" && (
            <motion.div key="ldap" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="p-5 rounded-lg bg-muted/20 border border-border space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2"><Server size={12} /> LDAP / Active Directory Configuration</h4>
              <div className="grid grid-cols-2 gap-4">
                <Field label="LDAP Server"><Input value={ldap.server} onChange={(v: string) => setLdap(p => ({...p, server: v}))} placeholder="ldap.company.com" /></Field>
                <Field label="Port">
                  <Select value={ldap.port} onChange={v => setLdap(p => ({...p, port: v}))} options={[
                    { value: "389", label: "389 (LDAP)" },
                    { value: "636", label: "636 (LDAPS)" },
                    { value: "3268", label: "3268 (AD Global Catalog)" },
                  ]} />
                </Field>
                <Field label="Base DN"><Input value={ldap.baseDn} onChange={(v: string) => setLdap(p => ({...p, baseDn: v}))} placeholder="dc=company,dc=com" /></Field>
                <Field label="Bind DN"><Input value={ldap.bindDn} onChange={(v: string) => setLdap(p => ({...p, bindDn: v}))} placeholder="cn=svc-account,dc=company,dc=com" /></Field>
                <Field label="Bind Password">
                  <div className="flex gap-2">
                    <Input value={ldap.bindPassword} onChange={(v: string) => setLdap(p => ({...p, bindPassword: v}))} type={showBindPass ? "text" : "password"} />
                    <button onClick={() => setShowBindPass(!showBindPass)} className="px-3 py-2.5 bg-muted/40 border border-border rounded-md text-muted-foreground hover:text-foreground transition-colors">
                      {showBindPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </Field>
                <Field label="Sync Interval (minutes)"><Input value={ldap.syncInterval} onChange={(v: string) => setLdap(p => ({...p, syncInterval: v}))} type="number" /></Field>
                <Field label="User Search Filter"><Input value={ldap.userFilter} onChange={(v: string) => setLdap(p => ({...p, userFilter: v}))} /></Field>
                <Field label="Group Search Filter"><Input value={ldap.groupFilter} onChange={(v: string) => setLdap(p => ({...p, groupFilter: v}))} /></Field>
                <div className="col-span-2">
                  <div className="flex items-center justify-between p-3 bg-muted/40 rounded-md border border-border">
                    <span className="text-xs font-medium">Enable TLS / LDAPS</span>
                    <Toggle value={ldap.tlsEnabled} onChange={v => setLdap(p => ({...p, tlsEnabled: v}))} />
                  </div>
                </div>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-muted/40 border border-border rounded-md text-xs font-semibold hover:bg-muted transition-colors">
                <Radio size={12} /> Test Connection
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {ssoProvider !== "none" && (
          <div className="mt-5 flex justify-end">
            <Button size="sm" onClick={() => toast.success("SSO configuration saved")}><Save size={14} /> Save SSO Configuration</Button>
          </div>
        )}
      </section>
    </div>
  );
}

function GovernancePanel() {
  const [globalPolicies, setGlobalPolicies] = useState({
    enforceApprovalForTenantCreation: true,
    enforceApprovalForServiceActivation: true,
    requireDualCustodyForDecommission: true,
    allowSelfServiceOnboarding: false,
    maxWorkspacesPerTenant: "5",
    maxUsersPerWorkspace: "500",
  });
  const [retentionRules, setRetentionRules] = useState([
    { id: "1", scope: "Audit Logs", retentionDays: 730, purgeEnabled: false, archiveEnabled: true },
    { id: "2", scope: "Execution Logs", retentionDays: 90, purgeEnabled: true, archiveEnabled: false },
    { id: "3", scope: "Document Files", retentionDays: 365, purgeEnabled: false, archiveEnabled: true },
    { id: "4", scope: "User Sessions", retentionDays: 30, purgeEnabled: true, archiveEnabled: false },
    { id: "5", scope: "Email Inbox", retentionDays: 180, purgeEnabled: false, archiveEnabled: true },
  ]);
  const [dataResidency, setDataResidency] = useState(
    REGIONS.map(r => ({ ...r, active: r.residency }))
  );
  const [auditPolicy, setAuditPolicy] = useState({
    logAllApiCalls: true,
    logAuthEvents: true,
    logDataAccess: false,
    logSchemaChanges: true,
    logAdminActions: true,
    siemWebhookUrl: "",
    siemEnabled: false,
    retentionDays: "730",
  });

  return (
    <div className="space-y-10">
      {/* Global Policies */}
      <section>
        <SectionHeader icon={ScrollText} title="Global Policies" desc="Platform-wide operational governance rules" />
        <div className="space-y-2.5">
          {[
            { key: "enforceApprovalForTenantCreation", label: "Require Approval for Tenant Creation", desc: "New tenant provisioning requires platform admin approval" },
            { key: "enforceApprovalForServiceActivation", label: "Require Approval for Service Activation", desc: "Service enablement requires dual-authority approval" },
            { key: "requireDualCustodyForDecommission", label: "Dual Custody for Decommission", desc: "Customer offboarding requires two platform admin sign-offs" },
            { key: "allowSelfServiceOnboarding", label: "Allow Self-Service Onboarding", desc: "Customers can self-register without platform admin intervention" },
          ].map(policy => (
            <div key={policy.key} className="flex items-center justify-between p-3.5 rounded-lg bg-muted/30 border border-border/60">
              <div>
                <p className="text-sm font-semibold text-foreground">{policy.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{policy.desc}</p>
              </div>
              <Toggle
                value={(globalPolicies as any)[policy.key]}
                onChange={v => setGlobalPolicies(p => ({...p, [policy.key]: v}))}
              />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <Field label="Max Workspaces per Tenant">
              <Input value={globalPolicies.maxWorkspacesPerTenant} onChange={(v: string) => setGlobalPolicies(p => ({...p, maxWorkspacesPerTenant: v}))} type="number" />
            </Field>
            <Field label="Max Users per Workspace">
              <Input value={globalPolicies.maxUsersPerWorkspace} onChange={(v: string) => setGlobalPolicies(p => ({...p, maxUsersPerWorkspace: v}))} type="number" />
            </Field>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Global policies saved")}><Save size={14} /> Save Policies</Button>
        </div>
      </section>

      {/* Retention Rules */}
      <section>
        <SectionHeader icon={Clock} title="Retention Rules" desc="Data lifecycle and retention configuration per scope" />
        <div className="overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Scope</th>
                <th className="text-left px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Retention (days)</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Auto Purge</th>
                <th className="text-center px-4 py-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">Archive</th>
              </tr>
            </thead>
            <tbody>
              {retentionRules.map((rule, idx) => (
                <tr key={rule.id} className={cn("border-b border-border/40 hover:bg-muted/20 transition-colors", idx === retentionRules.length - 1 && "border-0")}>
                  <td className="px-4 py-3 font-medium text-foreground">{rule.scope}</td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      value={rule.retentionDays}
                      onChange={e => setRetentionRules(prev => prev.map(r => r.id === rule.id ? {...r, retentionDays: Number(e.target.value)} : r))}
                      className="w-24 px-2 py-1.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <Toggle value={rule.purgeEnabled} onChange={v => setRetentionRules(prev => prev.map(r => r.id === rule.id ? {...r, purgeEnabled: v} : r))} />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      <Toggle value={rule.archiveEnabled} onChange={v => setRetentionRules(prev => prev.map(r => r.id === rule.id ? {...r, archiveEnabled: v} : r))} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Retention rules saved")}><Save size={14} /> Save Retention Rules</Button>
        </div>
      </section>

      {/* Audit Policy */}
      <section>
        <SectionHeader icon={Shield} title="Audit Policy" desc="Configure what gets logged and where it's sent" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          {[
            { key: "logAllApiCalls", label: "Log All API Calls" },
            { key: "logAuthEvents", label: "Log Authentication Events" },
            { key: "logDataAccess", label: "Log Data Access (verbose)" },
            { key: "logSchemaChanges", label: "Log Schema Changes" },
            { key: "logAdminActions", label: "Log Admin Actions" },
            { key: "siemEnabled", label: "Enable SIEM Streaming" },
          ].map(p => (
            <div key={p.key} className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 rounded-lg">
              <span className="text-xs font-semibold">{p.label}</span>
              <Toggle value={(auditPolicy as any)[p.key]} onChange={v => setAuditPolicy(prev => ({...prev, [p.key]: v}))} />
            </div>
          ))}
        </div>
        {auditPolicy.siemEnabled && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <Field label="SIEM Webhook URL">
                <Input value={auditPolicy.siemWebhookUrl} onChange={(v: string) => setAuditPolicy(p => ({...p, siemWebhookUrl: v}))} placeholder="https://siem.company.com/ingest" />
              </Field>
            </div>
          </div>
        )}
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Audit policy saved")}><Save size={14} /> Save Audit Policy</Button>
        </div>
      </section>

      {/* Data Residency */}
      <section>
        <SectionHeader icon={MapPin} title="Data Residency Rules" desc="Control which cloud regions are permitted for data storage" />
        <div className="space-y-2">
          {dataResidency.map(region => (
            <div key={region.key} className="flex items-center justify-between p-3.5 rounded-lg bg-muted/30 border border-border/60">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider",
                  region.cloud === "AWS" ? "bg-muted/60 text-foreground border-border" :
                  region.cloud === "Azure" ? "bg-muted/60 text-foreground border-border" :
                  "bg-muted text-muted-foreground"
                )}>{region.cloud}</span>
                <span className="text-sm font-medium text-foreground">{region.label}</span>
                <span className="text-xs text-muted-foreground font-mono">{region.key}</span>
              </div>
              <Toggle value={region.active} onChange={v => setDataResidency(prev => prev.map(r => r.key === region.key ? {...r, active: v} : r))} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Data residency rules saved")}><Save size={14} /> Save Residency Rules</Button>
        </div>
      </section>
    </div>
  );
}

function MonitoringPanel() {
  const [healthChecks] = useState([
    { service: "API Gateway", status: "active", latency: "12ms", uptime: "99.99%" },
    { service: "Identity Service", status: "active", latency: "8ms", uptime: "100%" },
    { service: "Event Bus (Kafka)", status: "active", latency: "3ms", uptime: "99.98%" },
    { service: "Database (PostgreSQL)", status: "active", latency: "2ms", uptime: "100%" },
    { service: "AI Service (LLM Gateway)", status: "active", latency: "340ms", uptime: "99.95%" },
    { service: "Document Service", status: "active", latency: "28ms", uptime: "99.92%" },
    { service: "Flow Engine", status: "active", latency: "15ms", uptime: "99.97%" },
    { service: "Storage Service", status: "degraded", latency: "250ms", uptime: "99.80%" },
    { service: "Notification Service", status: "active", latency: "45ms", uptime: "99.96%" },
    { service: "Audit Service", status: "active", latency: "6ms", uptime: "100%" },
    { service: "Rules Engine", status: "active", latency: "18ms", uptime: "99.99%" },
    { service: "Redis Cache", status: "active", latency: "1ms", uptime: "100%" },
  ]);
  const [alertConfig, setAlertConfig] = useState({
    latencyThresholdMs: "500",
    uptimeThresholdPct: "99.5",
    alertEmail: "ops@platform.io",
    alertSlack: "",
    alertTeams: "",
    checkIntervalSeconds: "30",
  });

  const active = healthChecks.filter(h => h.status === "active").length;
  const degraded = healthChecks.filter(h => h.status === "degraded").length;

  return (
    <div className="space-y-10">
      {/* Live Health */}
      <section>
        <SectionHeader icon={Activity} title="Platform Health" desc="Real-time health status of all platform services" />
        <div className="flex items-center gap-4 mb-5">
          <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs font-bold text-primary font-bold">{active} Healthy</span>
          </div>
          {degraded > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/60 border border-border rounded-lg">
              <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{degraded} Degraded</span>
            </div>
          )}
          <button onClick={() => toast.success("Health checks refreshed")} className="ml-auto flex items-center gap-1.5 px-3 py-2 bg-muted/40 border border-border rounded-md text-xs font-semibold hover:bg-muted transition-colors">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {healthChecks.map(h => (
            <div key={h.service} className="flex items-center justify-between p-3 bg-muted/20 border border-border/50 rounded-lg">
              <div className="flex items-center gap-2.5">
                <div className={cn("w-2 h-2 rounded-full flex-shrink-0", h.status === "active" ? "bg-primary" : "bg-muted-foreground animate-pulse")} />
                <span className="text-xs font-semibold text-foreground">{h.service}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-mono">{h.latency}</span>
                <span className="font-mono">{h.uptime}</span>
                <StatusBadge status={h.status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Alerting Configuration */}
      <section>
        <SectionHeader icon={Bell} title="Alerting Configuration" desc="Configure thresholds and notification channels for platform alerts" />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Latency Alert Threshold (ms)">
            <Input value={alertConfig.latencyThresholdMs} onChange={(v: string) => setAlertConfig(p => ({...p, latencyThresholdMs: v}))} type="number" />
          </Field>
          <Field label="Uptime Alert Threshold (%)">
            <Input value={alertConfig.uptimeThresholdPct} onChange={(v: string) => setAlertConfig(p => ({...p, uptimeThresholdPct: v}))} type="number" />
          </Field>
          <Field label="Check Interval (seconds)">
            <Input value={alertConfig.checkIntervalSeconds} onChange={(v: string) => setAlertConfig(p => ({...p, checkIntervalSeconds: v}))} type="number" />
          </Field>
          <Field label="Alert Email">
            <Input value={alertConfig.alertEmail} onChange={(v: string) => setAlertConfig(p => ({...p, alertEmail: v}))} type="email" />
          </Field>
          <Field label="Slack Webhook URL" hint="Optional">
            <Input value={alertConfig.alertSlack} onChange={(v: string) => setAlertConfig(p => ({...p, alertSlack: v}))} placeholder="https://hooks.slack.com/..." />
          </Field>
          <Field label="Teams Webhook URL" hint="Optional">
            <Input value={alertConfig.alertTeams} onChange={(v: string) => setAlertConfig(p => ({...p, alertTeams: v}))} placeholder="https://outlook.office.com/webhook/..." />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Monitoring configuration saved")}><Save size={14} /> Save Monitoring Config</Button>
        </div>
      </section>
    </div>
  );
}

function InfrastructurePanel() {
  const [k8s, setK8s] = useState({
    provider: "eks",
    clusterName: "nextgen-prod-01",
    region: "us-east-1",
    version: "1.29",
    nodeCount: "6",
    nodeType: "m5.2xlarge",
    autoscalingEnabled: true,
    minNodes: "3",
    maxNodes: "20",
    namespaceIsolation: true,
  });
  const [storage, setStorage] = useState({
    provider: "s3",
    bucket: "nextgen-platform-assets",
    region: "us-east-1",
    encryptionEnabled: true,
    versioningEnabled: true,
    endpoint: "",
  });
  const [backup, setBackup] = useState({
    enabled: true,
    scheduleExpression: "0 2 * * *",
    retentionDays: "30",
    backupRegion: "us-west-2",
    snapshotEnabled: true,
  });

  return (
    <div className="space-y-10">
      {/* Kubernetes */}
      <section>
        <SectionHeader icon={Box} title="Kubernetes Cluster" desc="Cluster configuration, node pools, and autoscaling" />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Provider">
            <Select value={k8s.provider} onChange={v => setK8s(p => ({...p, provider: v}))} options={[
              { value: "eks", label: "Amazon EKS" },
              { value: "aks", label: "Azure AKS" },
              { value: "gke", label: "Google GKE" },
              { value: "openshift", label: "Red Hat OpenShift" },
              { value: "rke2", label: "Rancher RKE2" },
              { value: "k3s", label: "K3s (Edge/Air-Gap)" },
            ]} />
          </Field>
          <Field label="Cluster Name">
            <Input value={k8s.clusterName} onChange={(v: string) => setK8s(p => ({...p, clusterName: v}))} />
          </Field>
          <Field label="Kubernetes Version">
            <Select value={k8s.version} onChange={v => setK8s(p => ({...p, version: v}))} options={[
              { value: "1.30", label: "1.30" },
              { value: "1.29", label: "1.29" },
              { value: "1.28", label: "1.28" },
            ]} />
          </Field>
          <Field label="Node Count">
            <Input value={k8s.nodeCount} onChange={(v: string) => setK8s(p => ({...p, nodeCount: v}))} type="number" />
          </Field>
          <Field label="Node Instance Type">
            <Input value={k8s.nodeType} onChange={(v: string) => setK8s(p => ({...p, nodeType: v}))} />
          </Field>
          <Field label="Region">
            <Input value={k8s.region} onChange={(v: string) => setK8s(p => ({...p, region: v}))} />
          </Field>
          <div className="col-span-3 grid grid-cols-3 gap-3">
            {[
              { key: "autoscalingEnabled", label: "Enable Autoscaling" },
              { key: "namespaceIsolation", label: "Namespace Isolation" },
            ].map(opt => (
              <div key={opt.key} className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 rounded-lg">
                <span className="text-xs font-semibold">{opt.label}</span>
                <Toggle value={(k8s as any)[opt.key]} onChange={v => setK8s(p => ({...p, [opt.key]: v}))} />
              </div>
            ))}
            {k8s.autoscalingEnabled && (
              <div className="flex items-center gap-3 p-3 bg-muted/30 border border-border/60 rounded-lg">
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Min</label>
                  <input type="number" value={k8s.minNodes} onChange={e => setK8s(p => ({...p, minNodes: e.target.value}))} className="w-full mt-1 px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
                <Minus size={12} className="text-muted-foreground mt-4 flex-shrink-0" />
                <div className="flex-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Max</label>
                  <input type="number" value={k8s.maxNodes} onChange={e => setK8s(p => ({...p, maxNodes: e.target.value}))} className="w-full mt-1 px-2 py-1 bg-background border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Cluster configuration saved")}><Save size={14} /> Save Cluster Config</Button>
        </div>
      </section>

      {/* Object Storage */}
      <section>
        <SectionHeader icon={HardDrive} title="Object Storage" desc="S3, Azure Blob, or MinIO configuration for file and document storage" />
        <div className="grid grid-cols-3 gap-4">
          <Field label="Storage Provider">
            <Select value={storage.provider} onChange={v => setStorage(p => ({...p, provider: v}))} options={[
              { value: "s3", label: "Amazon S3" },
              { value: "azure-blob", label: "Azure Blob Storage" },
              { value: "gcs", label: "Google Cloud Storage" },
              { value: "minio", label: "MinIO (Self-Hosted)" },
            ]} />
          </Field>
          <Field label="Bucket / Container">
            <Input value={storage.bucket} onChange={(v: string) => setStorage(p => ({...p, bucket: v}))} />
          </Field>
          <Field label="Region">
            <Input value={storage.region} onChange={(v: string) => setStorage(p => ({...p, region: v}))} />
          </Field>
          {storage.provider === "minio" && (
            <div className="col-span-3">
              <Field label="Custom Endpoint" hint="Required for MinIO / self-hosted">
                <Input value={storage.endpoint} onChange={(v: string) => setStorage(p => ({...p, endpoint: v}))} placeholder="https://minio.company.local:9000" />
              </Field>
            </div>
          )}
          <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 rounded-lg">
            <span className="text-xs font-semibold">Server-Side Encryption</span>
            <Toggle value={storage.encryptionEnabled} onChange={v => setStorage(p => ({...p, encryptionEnabled: v}))} />
          </div>
          <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 rounded-lg">
            <span className="text-xs font-semibold">Object Versioning</span>
            <Toggle value={storage.versioningEnabled} onChange={v => setStorage(p => ({...p, versioningEnabled: v}))} />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Storage configuration saved")}><Save size={14} /> Save Storage Config</Button>
        </div>
      </section>

      {/* Backup & DR */}
      <section>
        <SectionHeader icon={Download} title="Backup & Disaster Recovery" desc="Automated backup schedule and cross-region replication" />
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex items-center justify-between p-3.5 bg-muted/30 border border-border/60 rounded-lg">
            <div>
              <p className="text-sm font-semibold">Automated Backups</p>
              <p className="text-xs text-muted-foreground">Schedule database and configuration backups</p>
            </div>
            <Toggle value={backup.enabled} onChange={v => setBackup(p => ({...p, enabled: v}))} />
          </div>
          {backup.enabled && (
            <>
              <Field label="Cron Schedule" hint="e.g. 0 2 * * * = daily at 2am UTC">
                <Input value={backup.scheduleExpression} onChange={(v: string) => setBackup(p => ({...p, scheduleExpression: v}))} />
              </Field>
              <Field label="Retention (days)">
                <Input value={backup.retentionDays} onChange={(v: string) => setBackup(p => ({...p, retentionDays: v}))} type="number" />
              </Field>
              <Field label="Backup Region">
                <Input value={backup.backupRegion} onChange={(v: string) => setBackup(p => ({...p, backupRegion: v}))} />
              </Field>
              <div className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 rounded-lg">
                <span className="text-xs font-semibold">DB Snapshot Backup</span>
                <Toggle value={backup.snapshotEnabled} onChange={v => setBackup(p => ({...p, snapshotEnabled: v}))} />
              </div>
            </>
          )}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("Backup configuration saved")}><Save size={14} /> Save Backup Config</Button>
        </div>
      </section>
    </div>
  );
}

function AIControlPanel() {
  const [models, setModels] = useState(LLM_MODELS.map(m => ({ ...m })));
  const [guardrails, setGuardrails] = useState({
    maxTokensPerRequest: "4096",
    maxRequestsPerMinute: "100",
    piiDetectionEnabled: true,
    piiRedactionEnabled: true,
    contentFilterEnabled: true,
    contentFilterLevel: "medium",
    allowCodeExecution: false,
    allowWebBrowsing: false,
    allowFileAccess: true,
    maxAgentIterations: "20",
    requireHumanApprovalAboveIterations: "10",
  });
  const [defaultLlm, setDefaultLlm] = useState("claude-sonnet-4-6");

  const toggleModel = (key: string) => {
    setModels(prev => prev.map(m => m.key === key ? { ...m, status: m.status === "active" ? "inactive" : "active" } : m));
  };

  return (
    <div className="space-y-10">
      {/* LLM Registry */}
      <section>
        <SectionHeader icon={Brain} title="LLM & Embedding Registry" desc="Manage which AI models are available on the platform" />
        <div className="mb-4">
          <Field label="Default LLM for Platform Operations">
            <Select value={defaultLlm} onChange={setDefaultLlm} options={
              models.filter(m => m.type === "LLM" && m.status === "active").map(m => ({ value: m.key, label: `${m.name} (${m.provider})` }))
            } />
          </Field>
        </div>
        <div className="space-y-1.5">
          {["LLM", "Embedding"].map(type => (
            <div key={type}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 mt-4">{type} Models</p>
              {models.filter(m => m.type === type).map(model => (
                <div key={model.key} className="flex items-center justify-between p-3.5 rounded-lg bg-muted/30 border border-border/60 mb-1.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Brain size={14} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{model.name}</span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">{model.provider}</span>
                        {defaultLlm === model.key && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-primary">DEFAULT</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground">Context: {model.context}</span>
                        <span className="text-xs text-muted-foreground">Cost: {model.cost}</span>
                      </div>
                    </div>
                  </div>
                  <Toggle value={model.status === "active"} onChange={() => toggleModel(model.key)} />
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("LLM registry saved")}><Save size={14} /> Save Registry</Button>
        </div>
      </section>

      {/* AI Guardrails */}
      <section>
        <SectionHeader icon={ShieldCheck} title="AI Guardrails" desc="Safety boundaries and rate limits for all AI operations" />
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Field label="Max Tokens per Request">
            <Input value={guardrails.maxTokensPerRequest} onChange={(v: string) => setGuardrails(p => ({...p, maxTokensPerRequest: v}))} type="number" />
          </Field>
          <Field label="Max Requests per Minute">
            <Input value={guardrails.maxRequestsPerMinute} onChange={(v: string) => setGuardrails(p => ({...p, maxRequestsPerMinute: v}))} type="number" />
          </Field>
          <Field label="Max Agent Iterations">
            <Input value={guardrails.maxAgentIterations} onChange={(v: string) => setGuardrails(p => ({...p, maxAgentIterations: v}))} type="number" />
          </Field>
          <Field label="Human Approval Above Iterations">
            <Input value={guardrails.requireHumanApprovalAboveIterations} onChange={(v: string) => setGuardrails(p => ({...p, requireHumanApprovalAboveIterations: v}))} type="number" />
          </Field>
          <Field label="Content Filter Level">
            <Select value={guardrails.contentFilterLevel} onChange={v => setGuardrails(p => ({...p, contentFilterLevel: v}))} options={[
              { value: "off", label: "Off" },
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High (Strict)" },
            ]} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { key: "piiDetectionEnabled", label: "PII Detection" },
            { key: "piiRedactionEnabled", label: "PII Redaction" },
            { key: "contentFilterEnabled", label: "Content Filtering" },
            { key: "allowCodeExecution", label: "Allow Code Execution" },
            { key: "allowWebBrowsing", label: "Allow Web Browsing" },
            { key: "allowFileAccess", label: "Allow File Access" },
          ].map(opt => (
            <div key={opt.key} className="flex items-center justify-between p-3 bg-muted/30 border border-border/60 rounded-lg">
              <span className="text-xs font-semibold">{opt.label}</span>
              <Toggle value={(guardrails as any)[opt.key]} onChange={v => setGuardrails(p => ({...p, [opt.key]: v}))} />
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => toast.success("AI guardrails saved")}><Save size={14} /> Save Guardrails</Button>
        </div>
      </section>
    </div>
  );
}

function ServiceCatalogPanel() {
  const [services, setServices] = useState(PLATFORM_SERVICES.map(s => ({ ...s })));
  const [filter, setFilter] = useState<"all" | "Layer 3" | "Layer 4">("all");

  const filtered = services.filter(s => filter === "all" || s.layer === filter);

  const toggleService = (key: string) => {
    setServices(prev => prev.map(s => s.key === key ? { ...s, status: s.status === "active" ? "inactive" : "active" } : s));
    toast.success(`Service ${services.find(s => s.key === key)?.status === "active" ? "deactivated" : "activated"}`);
  };

  const activeCount = services.filter(s => s.status === "active").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {[
            { key: "all", label: "All Services" },
            { key: "Layer 3", label: "Automation Hub (L3)" },
            { key: "Layer 4", label: "Shared Services (L4)" },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={cn(
                "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground hover:bg-muted border border-border"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-primary">{activeCount}</span> / {services.length} services active
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(service => (
          <div key={service.key} className={cn(
            "flex items-center justify-between p-4 rounded-lg border transition-colors",
            service.status === "active" ? "bg-muted/20 border-border/60" : "bg-muted/10 border-border/30 opacity-60"
          )}>
            <div className="flex items-center gap-3.5">
              <div className={cn(
                "w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0",
                service.status === "active" ? "bg-primary/10" : "bg-muted"
              )}>
                <service.icon size={16} className={service.status === "active" ? "text-primary" : "text-muted-foreground"} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{service.name}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider",
                    service.layer === "Layer 3" ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground"
                  )}>{service.layer}</span>
                  <span className="text-xs text-muted-foreground font-mono">v{service.version}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{service.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <StatusBadge status={service.status} />
              <Toggle value={service.status === "active"} onChange={() => toggleService(service.key)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Panel Router ─────────────────────────────────────────────────────────────
function DomainPanel({ domainId }: { domainId: string }) {
  switch (domainId) {
    case "platform-config": return <PlatformConfigPanel />;
    case "security-control": return <SecurityControlPanel />;
    case "platform-governance": return <GovernancePanel />;
    case "platform-monitoring": return <MonitoringPanel />;
    case "infrastructure-control": return <InfrastructurePanel />;
    case "ai-control": return <AIControlPanel />;
    case "service-catalog": return <ServiceCatalogPanel />;
    default: return null;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function SystemControlPage() {
  const { role } = useAppContext();
  const [activeDomain, setActiveDomain] = useState("platform-config");

  if (role !== "Platform Admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Lock className="w-16 h-16 text-muted-foreground mb-4" />
        <h1 className="text-2xl font-bold text-foreground">Access Denied</h1>
        <p className="text-muted-foreground max-w-md mt-2">Only Platform Administrators have access to System Control.</p>
      </div>
    );
  }

  const domain = DOMAINS.find(d => d.id === activeDomain)!;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Page Header */}
      <header className="flex items-start justify-between mb-5 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
              <Shield size={16} className="text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">System Control</h1>
            <span className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md uppercase tracking-wider">Layer 1</span>
          </div>
          <p className="text-sm text-muted-foreground ml-[2.75rem]">
            Global platform administration — configure, govern, and control the entire platform
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-semibold">Platform Online</span>
        </div>
      </header>

      <div className="flex flex-1 gap-5 overflow-hidden min-h-0">
        {/* Left Navigation */}
        <nav className="w-64 shrink-0 flex flex-col gap-1 overflow-y-auto">
          {DOMAINS.map(d => (
            <button
              key={d.id}
              onClick={() => setActiveDomain(d.id)}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all",
                activeDomain === d.id
                  ? cn("border", d.bg, d.border, d.color)
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className={cn("w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0", activeDomain === d.id ? d.bg : "bg-muted/60")}>
                <d.icon size={14} className={activeDomain === d.id ? d.color : "text-muted-foreground"} />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate">{d.label}</p>
              </div>
              {activeDomain === d.id && <ChevronRight size={12} className="ml-auto flex-shrink-0" />}
            </button>
          ))}
        </nav>

        {/* Main Panel */}
        <div className="flex-1 overflow-hidden flex flex-col bg-card border border-border rounded-lg">
          {/* Panel Header */}
          <div className={cn("px-6 py-4 border-b border-border flex items-center gap-3", domain.bg)}>
            <div className={cn("w-9 h-9 rounded-md flex items-center justify-center", domain.bg, "border", domain.border)}>
              <domain.icon size={18} className={domain.color} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">{domain.label}</h2>
              <p className="text-xs text-muted-foreground">{domain.desc}</p>
            </div>
          </div>

          {/* Panel Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeDomain}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
              >
                <DomainPanel domainId={activeDomain} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// Palette icon stub (not in main import)
function Palette(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>;
}
