"use client";

import React, { useState, useEffect } from "react";
import { 
  Settings, 
  Building2, 
  Globe, 
  Shield, 
  GitBranch, 
  Save, 
  Cloud, 
  Lock, 
  Zap,
  Info,
  ChevronRight,
  UploadCloud,
  CheckCircle2,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { getOrgSettings, updateOrgSettings } from "@/app/actions/settingsActions";
import { updateCustomerAction, getCustomerLocaleSettings, updateCustomerLocaleSettings } from "@/app/actions/tenantActions";
import { getTimezoneLookups, getCurrencyLookups } from "@/app/actions/lookupActions";
import { toast } from "sonner";
import { ToggleSwitch } from "@/components/ui/toggle-switch";

// Platform-level defaults (what's inherited when no customer override exists)
const PLATFORM_DEFAULTS = {
  language: "en",
  timezone: "UTC",
  currency: "USD",
  supportEmail: "support@platform.io",
  sessionTimeoutMinutes: 60,
};

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "ja", label: "Japanese" },
  { value: "pt", label: "Portuguese" },
  { value: "zh", label: "Chinese (Simplified)" },
  { value: "ar", label: "Arabic" },
];

const TIMEZONES = [
  { value: "UTC",                   label: "UTC" },
  { value: "America/New_York",      label: "Eastern Time (ET)" },
  { value: "America/Chicago",       label: "Central Time (CT)" },
  { value: "America/Los_Angeles",   label: "Pacific Time (PT)" },
  { value: "America/Toronto",       label: "Toronto (ET)" },
  { value: "Europe/London",         label: "London (GMT)" },
  { value: "Europe/Paris",          label: "Paris (CET)" },
  { value: "Europe/Berlin",         label: "Berlin (CET)" },
  { value: "Asia/Dubai",            label: "Dubai (GST)" },
  { value: "Asia/Kolkata",          label: "India (IST)" },
  { value: "Asia/Singapore",        label: "Singapore (SGT)" },
  { value: "Asia/Tokyo",            label: "Tokyo (JST)" },
  { value: "Australia/Sydney",      label: "Sydney (AEST)" },
];

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "JPY", label: "JPY — Japanese Yen" },
  { value: "INR", label: "INR — Indian Rupee" },
  { value: "AED", label: "AED — UAE Dirham" },
  { value: "SGD", label: "SGD — Singapore Dollar" },
];

export default function GeneralSettingsPage() {
  const { activeCustomer } = useAppContext();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLocale, setSavingLocale] = useState(false);
  const [orgData, setOrgData] = useState<any>(null);
  const [techSettings, setTechSettings] = useState<any>(null);
  const [timezoneLookups, setTimezoneLookups] = useState<{ id: string; label: string; category: string | null }[]>([]);
  const [currencyLookups, setCurrencyLookups] = useState<{ id: string; label: string; code: string }[]>([]);

  // Customer-level locale overrides
  const [locale, setLocale] = useState({
    language: PLATFORM_DEFAULTS.language,
    timezone: PLATFORM_DEFAULTS.timezone,
    currency: PLATFORM_DEFAULTS.currency,
    supportEmail: PLATFORM_DEFAULTS.supportEmail,
    sessionTimeoutMinutes: PLATFORM_DEFAULTS.sessionTimeoutMinutes,
  });

  useEffect(() => {
    async function init() {
      if (!activeCustomer?.id) return;

      const [settings, localeData, tzLookups, cxLookups] = await Promise.all([
        getOrgSettings(activeCustomer.id),
        getCustomerLocaleSettings(activeCustomer.id),
        getTimezoneLookups(),
        getCurrencyLookups(),
      ]);
      setTimezoneLookups(tzLookups);
      setCurrencyLookups(cxLookups);

      setOrgData({
        companyName: activeCustomer.companyName,
        industry: activeCustomer.industry,
        classification: activeCustomer.classification || "Enterprise",
        customerTier: activeCustomer.customerTier || "Platinum",
        location: activeCustomer.location
      });
      setTechSettings(settings);

      if (localeData) {
        setLocale({
          language: localeData.language || PLATFORM_DEFAULTS.language,
          timezone: localeData.timezone || PLATFORM_DEFAULTS.timezone,
          currency: localeData.currency || PLATFORM_DEFAULTS.currency,
          supportEmail: localeData.supportEmail || PLATFORM_DEFAULTS.supportEmail,
          sessionTimeoutMinutes: localeData.sessionTimeoutMinutes ?? PLATFORM_DEFAULTS.sessionTimeoutMinutes,
        });
      }
      setLoading(false);
    }
    init();
  }, [activeCustomer]);

  const handleSaveLocale = async () => {
    if (!activeCustomer?.id) return;
    setSavingLocale(true);
    const res = await updateCustomerLocaleSettings({
      customerId: activeCustomer.id,
      ...locale,
    });
    if (res.success) toast.success("Locale & defaults saved — these now override platform defaults for this organization.");
    else toast.error(res.error || "Failed to save locale settings");
    setSavingLocale(false);
  };

  const handleSave = async () => {
    if (!activeCustomer?.id) return;
    setSaving(true);
    
    try {
      const [res1, res2] = await Promise.all([
        updateCustomerAction({
          customerId: activeCustomer.id,
          ...orgData,
          tenantAdmins: [] // Preserve admins separately
        }),
        updateOrgSettings(activeCustomer.id, techSettings)
      ]);

      if (res1.success && res2.success) {
        toast.success("Organization settings synchronized successfully");
      } else {
        toast.error("One or more settings failed to persist.");
      }
    } catch (e) {
      toast.error("An unexpected error occurred during synchronization.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-full space-y-8 animate-in slide-in-from-right duration-500 relative flex flex-col h-full overflow-hidden">
      
      {/* Header Area */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1 text-size-regular">
          <div className="flex items-center gap-2 text-[10px] font-bold text-primary uppercase tracking-[0.2em]">
             <Settings size={12} />
             <span>Organization / General Settings</span>
          </div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Organization Master Profile</h1>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="bg-primary text-white px-6 py-2 text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all rounded-sm shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Commit Changes</span>
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-8 overflow-hidden">
        {/* Left Column: Core Identity */}
        <div className="col-span-12 lg:col-span-7 space-y-8 overflow-y-auto pr-4 custom-scrollbar">
          
          {/* Identity Section */}
          <Section title="Organization Identity" icon={Building2}>
             <div className="grid grid-cols-2 gap-6">
                <InputGroup 
                  label="Legal Entity Name" 
                  value={orgData?.companyName} 
                  onChange={(v) => setOrgData({...orgData, companyName: v})}
                />
                <InputGroup 
                  label="Organization Industry" 
                  value={orgData?.industry} 
                  onChange={(v) => setOrgData({...orgData, industry: v})}
                />
                <InputGroup 
                  label="Classification" 
                  value={orgData?.classification} 
                  onChange={(v) => setOrgData({...orgData, classification: v})}
                />
                <InputGroup 
                  label="Service Level Tier" 
                  value={orgData?.customerTier} 
                  onChange={(v) => setOrgData({...orgData, customerTier: v})}
                />
             </div>
          </Section>

          {/* Localization & Master Metadata */}
          <Section title="Governance Metadata" icon={Globe}>
             <div className="grid grid-cols-2 gap-6">
                <InputGroup
                  label="Registered Region"
                  value={orgData?.location}
                  onChange={(v) => setOrgData({...orgData, location: v})}
                />
                <InputGroup
                  label="Master ID (Sovereign Handle)"
                  value={activeCustomer?.id?.split('-')[0]?.toUpperCase()}
                  disabled
                />
             </div>
          </Section>

          {/* ── Locale & Defaults ──────────────────────────────────────────── */}
          <Section title="Locale & Operational Defaults" icon={Settings}>
            <div className="space-y-5">
              {/* Override notice */}
              <div className="flex items-start gap-3 p-4 rounded-lg bg-primary/5 border border-primary/15">
                <Info size={14} className="text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Customer-level overrides</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    These settings override the platform defaults for this organization only.
                    Any field left at the platform default inherits the value set in
                    <span className="font-semibold text-primary"> Platform → Configuration → Global Settings</span>.
                  </p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                {/* Language */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Default Language</label>
                    {locale.language === PLATFORM_DEFAULTS.language && (
                      <span className="text-[9px] text-muted-foreground bg-muted/60 border border-border px-1.5 py-0.5 rounded">Platform default</span>
                    )}
                  </div>
                  <select
                    value={locale.language}
                    onChange={e => setLocale(p => ({...p, language: e.target.value}))}
                    className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                  </select>
                  <p className="text-[11px] text-muted-foreground">UI language for all users in this organization</p>
                </div>

                {/* Timezone */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Default Timezone</label>
                    {locale.timezone === PLATFORM_DEFAULTS.timezone && (
                      <span className="text-[9px] text-muted-foreground bg-muted/60 border border-border px-1.5 py-0.5 rounded">Platform default</span>
                    )}
                  </div>
                  <select
                    value={locale.timezone}
                    onChange={e => setLocale(p => ({...p, timezone: e.target.value}))}
                    className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select timezone…</option>
                    {timezoneLookups.length > 0
                      ? Object.entries(
                          timezoneLookups.reduce<Record<string, typeof timezoneLookups>>((acc, tz) => {
                            const cat = tz.category || "Other";
                            (acc[cat] = acc[cat] || []).push(tz);
                            return acc;
                          }, {})
                        ).map(([cat, tzs]) => (
                          <optgroup key={cat} label={cat}>
                            {tzs.map(tz => <option key={tz.id} value={tz.label}>{tz.label}</option>)}
                          </optgroup>
                        ))
                      : TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)
                    }
                  </select>
                  <p className="text-[11px] text-muted-foreground">Used for scheduled jobs, timestamps, and notifications</p>
                </div>

                {/* Currency */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Default Currency</label>
                    {locale.currency === PLATFORM_DEFAULTS.currency && (
                      <span className="text-[9px] text-muted-foreground bg-muted/60 border border-border px-1.5 py-0.5 rounded">Platform default</span>
                    )}
                  </div>
                  <select
                    value={locale.currency}
                    onChange={e => setLocale(p => ({...p, currency: e.target.value}))}
                    className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">Select currency…</option>
                    {currencyLookups.length > 0
                      ? currencyLookups.map(c => (
                          <option key={c.id} value={c.code || c.label}>
                            {c.code ? `${c.code} — ${c.label}` : c.label}
                          </option>
                        ))
                      : CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)
                    }
                  </select>
                  <p className="text-[11px] text-muted-foreground">Billing, usage metrics, and financial reporting</p>
                </div>

                {/* Support Email */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Support Email</label>
                    {locale.supportEmail === PLATFORM_DEFAULTS.supportEmail && (
                      <span className="text-[9px] text-muted-foreground bg-muted/60 border border-border px-1.5 py-0.5 rounded">Platform default</span>
                    )}
                  </div>
                  <input
                    type="email"
                    value={locale.supportEmail}
                    onChange={e => setLocale(p => ({...p, supportEmail: e.target.value}))}
                    placeholder={PLATFORM_DEFAULTS.supportEmail}
                    className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <p className="text-[11px] text-muted-foreground">Shown in error pages, notification footers, and help links for this org's users</p>
                </div>

                {/* Session Timeout */}
                <div className="flex flex-col gap-1.5 col-span-2 max-w-xs">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground/80 uppercase tracking-wider">Session Timeout (minutes)</label>
                    {locale.sessionTimeoutMinutes === PLATFORM_DEFAULTS.sessionTimeoutMinutes && (
                      <span className="text-[9px] text-muted-foreground bg-muted/60 border border-border px-1.5 py-0.5 rounded">Platform default</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={5}
                      max={1440}
                      value={locale.sessionTimeoutMinutes}
                      onChange={e => setLocale(p => ({...p, sessionTimeoutMinutes: Number(e.target.value)}))}
                      className="w-28 px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Platform default: {PLATFORM_DEFAULTS.sessionTimeoutMinutes} min.
                      How long a user session stays active from login — regardless of activity.
                    </p>
                  </div>
                </div>
              </div>

              {/* Reset to platform defaults */}
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => setLocale({ ...PLATFORM_DEFAULTS })}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                >
                  Reset all to platform defaults
                </button>
                <button
                  onClick={handleSaveLocale}
                  disabled={savingLocale}
                  className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground text-xs font-semibold rounded-md hover:opacity-90 transition-all disabled:opacity-50 shadow-sm"
                >
                  {savingLocale ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Save Locale Settings
                </button>
              </div>
            </div>
          </Section>

          {/* Branding Hub */}
          <Section title="Branding Hub" icon={UploadCloud}>
             <div className="p-8 border-2 border-dashed border-border rounded-sm bg-muted/20 flex flex-col items-center justify-center gap-4 group hover:border-primary/40 transition-all">
                <div className="w-20 h-20 bg-white border border-border rounded-sm flex items-center justify-center shadow-sm overflow-hidden">
                   {activeCustomer?.logoUrl ? (
                      <img src={activeCustomer.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                   ) : (
                      <Building2 size={32} className="text-muted-foreground opacity-40" />
                   )}
                </div>
                <div className="text-center space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline cursor-pointer">Upload New Manifest Logo</p>
                   <p className="text-[9px] font-medium text-muted-foreground uppercase">SVG, PNG or WEBP (Max 2MB)</p>
                </div>
             </div>
          </Section>
        </div>

        {/* Right Column: Technical & Policy */}
        <div className="col-span-12 lg:col-span-5 space-y-8 overflow-y-auto pr-4 custom-scrollbar">
           
           {/* CI/CD Lifecycle */}
           <Section title="CI/CD Lifecycle Engine" icon={GitBranch} highlight>
              <div className="space-y-6">
                 <div className="flex items-center justify-between p-4 bg-white border border-border rounded-sm">
                    <div className="flex items-center gap-3">
                       <div className="p-2 bg-indigo-50 text-indigo-600 rounded-sm">
                          <Cloud size={18} />
                       </div>
                       <div className="flex flex-col">
                          <span className="text-xs font-bold">Deployment Architecture</span>
                          <span className="text-[10px] font-medium text-muted-foreground uppercase">Internal Managed Cluster</span>
                       </div>
                    </div>
                    <select 
                      className="text-xs font-black uppercase bg-muted border-none rounded-sm px-3 py-1 focus:ring-0"
                      value={techSettings?.cicdMode}
                      onChange={(e) => setTechSettings({...techSettings, cicdMode: e.target.value})}
                    >
                       <option value="INTERNAL">Internal</option>
                       <option value="HYBRID">Hybrid</option>
                       <option value="EXTERNAL">External</option>
                    </select>
                 </div>

                 <div className="space-y-3">
                    <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.1em]">Branch Propagation Mapping</label>
                    <div className="space-y-2">
                       <BranchMap label="Production" branch={techSettings?.branchMapping?.prod} onChange={(v) => {
                          const newMap = {...techSettings.branchMapping, prod: v};
                          setTechSettings({...techSettings, branchMapping: newMap});
                       }} />
                       <BranchMap label="UAT / Staging" branch={techSettings?.branchMapping?.uat} onChange={(v) => {
                          const newMap = {...techSettings.branchMapping, uat: v};
                          setTechSettings({...techSettings, branchMapping: newMap});
                       }} />
                       <BranchMap label="Development" branch={techSettings?.branchMapping?.dev} onChange={(v) => {
                          const newMap = {...techSettings.branchMapping, dev: v};
                          setTechSettings({...techSettings, branchMapping: newMap});
                       }} />
                    </div>
                 </div>
              </div>
           </Section>

           {/* Security Enforcement */}
           <Section title="Security Compliance" icon={Lock}>
              <div className="space-y-4">
                 <ToggleGroup label="MFA Enforcement" active={(activeCustomer as any)?.mfaEnforced} />
                 <ToggleGroup label="Audit Chronicle Record" active={true} />
                 <ToggleGroup label="Zero Trust Tunneling" active={false} />
                 <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-sm flex gap-3">
                    <Shield size={18} className="text-amber-600 shrink-0" />
                    <div className="space-y-1">
                       <p className="text-[10px] font-black uppercase text-amber-900 leading-none">Governance Summary</p>
                       <p className="text-[9px] font-medium text-amber-700 uppercase leading-relaxed">This organization is currently operating under Standard Governance Tier with 30-day log retention.</p>
                    </div>
                 </div>
              </div>
           </Section>

           {/* Help / Docs */}
           <div className="p-6 bg-primary/5 border border-primary/20 rounded-sm space-y-3">
              <div className="flex items-center gap-2 text-primary">
                 <Info size={16} />
                 <span className="text-xs font-black uppercase tracking-widest">Configuration Notice</span>
              </div>
              <p className="text-[10px] font-medium text-muted-foreground leading-relaxed uppercase">
                 Changes made to the CI/CD lifecycle or branch mapping will propagate to all registered workspaces upon the next deployment trigger.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children, highlight }: any) {
  return (
    <div className={cn(
      "space-y-4 p-6 rounded-sm border transition-all",
      highlight ? "bg-card shadow-lg border-primary/20" : "bg-card/40 border-border"
    )}>
       <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
          <Icon size={14} className={cn(highlight && "text-primary")} />
          <span>{title}</span>
       </div>
       <div className="space-y-4">
          {children}
       </div>
    </div>
  );
}

function InputGroup({ label, value, onChange, disabled }: any) {
  return (
    <div className="space-y-1.5 flex-1">
      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{label}</label>
      <input 
        value={value || ""} 
        onChange={(e) => onChange && onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          "w-full bg-white border border-border p-2.5 text-xs font-bold focus:outline-none focus:ring-1 ring-primary/20 rounded-sm transition-all shadow-inner",
          disabled && "bg-muted opacity-60 cursor-not-allowed border-transparent shadow-none"
        )} 
      />
    </div>
  );
}

function BranchMap({ label, branch, onChange }: any) {
  return (
    <div className="grid grid-cols-2 bg-muted/40 border border-border/60 rounded-sm overflow-hidden">
       <div className="p-2.5 bg-muted/60 border-r border-border/60 flex items-center gap-2">
          <GitBranch size={12} className="text-muted-foreground" />
          <span className="text-[10px] font-bold uppercase">{label}</span>
       </div>
       <input 
         value={branch || ""} 
         onChange={(e) => onChange(e.target.value)}
         placeholder="Enter target branch..."
         className="w-full bg-transparent p-2.5 text-[10px] font-mono focus:outline-none" 
       />
    </div>
  );
}

function ToggleGroup({ label, active }: any) {
  return (
    <div className="flex items-center justify-between p-3 bg-white border border-border rounded-sm group hover:border-primary/40 transition-all">
       <div className="flex flex-col">
          <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
          <span className="text-[8px] font-medium text-muted-foreground uppercase mt-1">Platform Hardened Control</span>
       </div>
       <div className={cn(
         "w-8 h-4 rounded-full transition-all duration-300 p-0.5 cursor-pointer relative",
         active ? "bg-emerald-500" : "bg-muted"
       )}>
          <div className={cn(
            "w-3 h-3 bg-white rounded-full transition-all duration-300",
            active ? "translate-x-4 shadow-md" : "translate-x-0"
          )} />
       </div>
    </div>
  );
}
