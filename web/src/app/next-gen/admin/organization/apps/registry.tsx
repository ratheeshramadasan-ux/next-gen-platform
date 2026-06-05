"use client";

import React, { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { toast } from "sonner";
import {
  Monitor, Plus, Search, Copy, Edit, Trash2, Save, Clock, Calendar,
  AlertTriangle, ShieldCheck, Globe, X, Check, User, Loader2,
  AlertCircle, Ban, CheckCircle2, RefreshCw, Info, Lock, Unlock, Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  getApplicationRegistry, getApplicationFull, upsertApplicationRegistry,
  saveOperatingHours, upsertBlackoutPeriod, deleteBlackoutPeriod,
  createFreezeWindow, resolveFreezeWindow, cloneAppRegistry
} from "@/app/actions/applicationActions";
import { getTimezoneLookups } from "@/app/actions/lookupActions";

// ─── Constants ────────────────────────────────────────────────────────────────
const APP_TYPES   = ["ERP","CRM","Portal","Web Application","Database","API","Desktop","Mainframe","Cloud Service","Other"];
const CRITICALITY = ["Critical","High","Medium","Low"];
const STATUS_LIST = ["Active","Planned","Retired","Decommissioned"];
const DAYS        = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const BOT_POLICIES = [
  { value:"ALLOW",             label:"Allow",             cls:"bg-primary/10 text-primary border-primary/20" },
  { value:"BLOCK",             label:"Block",             cls:"bg-destructive/10 text-destructive border-destructive/20" },
  { value:"APPROVAL_REQUIRED", label:"Approval Required", cls:"bg-muted/60 text-muted-foreground border-border" },
];
const IMPACTS = [
  { value:"BLOCK_ALL",    label:"Block All Activity" },
  { value:"BLOCK_NEW",    label:"Block New Schedules Only" },
  { value:"BLOCK_DEPLOY", label:"Block Deployments Only" },
];

// ─── Small helpers ────────────────────────────────────────────────────────────
function CritBadge({ v }: { v?: string }) {
  const cls: Record<string,string> = {
    Critical:"bg-destructive/10 text-destructive border-destructive/20",
    High:"bg-muted/60 text-foreground border-border",
    Medium:"bg-muted/40 text-muted-foreground border-border",
    Low:"bg-muted/30 text-muted-foreground border-border",
  };
  return <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border",cls[v||"Medium"]||cls.Medium)}>{v||"Medium"}</span>;
}
function StatusDot({ s }: { s: string }) {
  const cls: Record<string,string> = { Active:"bg-primary", Planned:"bg-muted-foreground", Retired:"bg-destructive", Decommissioned:"bg-muted-foreground" };
  return <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-0.5",cls[s]||"bg-muted-foreground")} />;
}
function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{children}</label>;
}
function Field({ label, children, span2 }: { label: string; children: React.ReactNode; span2?: boolean }) {
  return (
    <div className={cn("flex flex-col gap-1", span2 && "col-span-2")}>
      <FieldLabel>{label}</FieldLabel>
      {children}
    </div>
  );
}
function Inp({ value, onChange, placeholder, type="text", mono, disabled }: any) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      disabled={disabled}
      className={cn("w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50", mono && "font-mono")} />
  );
}
function Sel({ value, onChange, children }: any) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
      {children}
    </select>
  );
}

// ─── Operating Hours Editor ───────────────────────────────────────────────────
function HoursEditor({ hours, is24x7, onChange, onToggle24x7 }: {
  hours: any[]; is24x7: boolean; onChange: (h: any[]) => void; onToggle24x7: (v: boolean) => void;
}) {
  const upd = (day: number, field: string, val: any) =>
    onChange(hours.map(h => h.dayOfWeek === day ? {...h, [field]: val} : h));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20">
        <div>
          <p className="text-sm font-semibold">Available 24 × 7</p>
          <p className="text-xs text-muted-foreground">No operating hours restriction — automations can run at any time</p>
        </div>
        <ToggleSwitch value={is24x7} onChange={onToggle24x7} />
      </div>
      {!is24x7 && (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[140px_1fr_1fr_72px] bg-muted/30 px-4 py-2 border-b border-border">
            {["Day","Open","Close","Closed"].map(h => (
              <span key={h} className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{h}</span>
            ))}
          </div>
          {DAYS.map((day, i) => {
            const h = hours.find(x => x.dayOfWeek === i) || { dayOfWeek:i, isClosed:i===0||i===6, startTime:"06:00", endTime:"22:00" };
            return (
              <div key={i} className={cn("grid grid-cols-[140px_1fr_1fr_72px] items-center px-4 py-2.5 border-b border-border/40 last:border-0",
                h.isClosed ? "bg-muted/10 opacity-60" : "hover:bg-muted/10")}>
                <span className="text-sm font-medium">{day}</span>
                <input type="time" value={h.startTime||"06:00"} disabled={h.isClosed} onChange={e => upd(i,"startTime",e.target.value)}
                  className="w-28 px-2 py-1.5 bg-muted/40 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40" />
                <input type="time" value={h.endTime||"22:00"} disabled={h.isClosed} onChange={e => upd(i,"endTime",e.target.value)}
                  className="w-28 px-2 py-1.5 bg-muted/40 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40" />
                <div className="flex justify-center">
                  <ToggleSwitch size="sm" value={!!h.isClosed} onChange={v => upd(i,"isClosed",v)} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Register / Edit Form ─────────────────────────────────────────────────────
function AppForm({ app, timezones, onSave, onCancel }: {
  app?: any; timezones: any[]; onSave: (d: any) => Promise<void>; onCancel: () => void;
}) {
  const init = {
    name: app?.name||"", appCode: app?.appCode||"", category: app?.category||"",
    applicationType: app?.applicationType||"", businessOwner: app?.businessOwner||"",
    technicalOwner: app?.technicalOwner||"", owner: app?.owner||"",
    criticality: app?.criticality||"Medium", description: app?.description||"",
    status: app?.status||"Active", timezone: app?.timezone||"UTC", is24x7: app?.is24x7||false,
  };
  const [form, setForm] = useState(init);
  const [saving, setSaving] = useState(false);
  const f = (k: string) => (v: any) => setForm(p => ({...p, [k]: v}));

  // Auto-generate code from name
  const autoCode = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]+/g,"_").replace(/^_|_$/g,"");

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Application name is required"); return; }
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-sm font-bold">{app ? `Edit — ${app.name}` : "Register New Application"}</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Define the application as a governed operational entity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {app ? "Update" : "Register"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-7">
        {/* Identity */}
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><Monitor size={11} /> Application Identity</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Application Name *">
              <Inp value={form.name} onChange={(v:string) => { setForm(p=>({...p, name:v, appCode: p.appCode||autoCode(v)})); }} placeholder="e.g. SAP ECC Production" />
            </Field>
            <Field label="Application Code">
              <Inp value={form.appCode} onChange={f("appCode")} placeholder="e.g. SAP_ECC_PRD" mono />
            </Field>
            <Field label="Application Type">
              <Sel value={form.applicationType} onChange={f("applicationType")}>
                <option value="">Select type...</option>
                {APP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </Sel>
            </Field>
            <Field label="Category / Domain">
              <Inp value={form.category} onChange={f("category")} placeholder="e.g. Finance, HR, Supply Chain" />
            </Field>
            <Field label="Description" span2>
              <textarea value={form.description} onChange={e => f("description")(e.target.value)} rows={2}
                placeholder="What does this application do? What business processes does it support?"
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
            </Field>
          </div>
        </section>

        {/* Ownership */}
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><User size={11} /> Ownership</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Business Owner"><Inp value={form.businessOwner} onChange={f("businessOwner")} placeholder="e.g. Finance Operations" /></Field>
            <Field label="Technical Owner"><Inp value={form.technicalOwner} onChange={f("technicalOwner")} placeholder="e.g. ERP Platform Team" /></Field>
            <Field label="Primary Contact"><Inp value={form.owner} onChange={f("owner")} placeholder="Name or email" /></Field>
          </div>
        </section>

        {/* Governance */}
        <section className="space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5"><ShieldCheck size={11} /> Governance</p>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Criticality">
              <Sel value={form.criticality} onChange={f("criticality")}>
                {CRITICALITY.map(c => <option key={c} value={c}>{c}</option>)}
              </Sel>
            </Field>
            <Field label="Status">
              <Sel value={form.status} onChange={f("status")}>
                {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
              </Sel>
            </Field>
            <Field label="Timezone">
              <select value={form.timezone} onChange={e => f("timezone")(e.target.value)}
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="UTC">UTC</option>
                {timezones.length > 0
                  ? Object.entries(timezones.reduce<Record<string,any[]>>((a,t) => { const c=t.category||"Other"; (a[c]=a[c]||[]).push(t); return a; },{}))
                      .map(([cat,tzs]) => <optgroup key={cat} label={cat}>{tzs.map((tz:any) => <option key={tz.id} value={tz.label}>{tz.label}</option>)}</optgroup>)
                  : null
                }
              </select>
            </Field>
          </div>
          <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/20 mt-2">
            <div>
              <p className="text-sm font-semibold">Available 24 × 7</p>
              <p className="text-xs text-muted-foreground">If enabled, automations can interact with this application at any time — no operating hours validation</p>
            </div>
            <ToggleSwitch value={form.is24x7} onChange={f("is24x7")} />
          </div>
        </section>

        {/* Clone note */}
        {app && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
            <Info size={13} className="text-primary flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <strong className="text-foreground">Tip:</strong> You can only modify future-dated maintenance windows and blackout periods. Past records are locked for audit integrity.
              Use the <strong className="text-primary">Clone</strong> button to create a copy of this application with all its operating hour settings already pre-filled.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Detail / Configuration Panel ────────────────────────────────────────────
type Tab = "info"|"hours"|"maintenance"|"blackout"|"freeze";

function AppDetail({ app, timezones, onEdit, onClose, onRefresh, currentUser }: {
  app: any; timezones: any[]; onEdit: () => void; onClose: () => void;
  onRefresh: () => void; currentUser: any;
}) {
  const [tab, setTab] = useState<Tab>("info");
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hours, setHours] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [showBlackoutForm, setShowBlackoutForm] = useState(false);
  const [showFreezeForm, setShowFreezeForm] = useState(false);

  const EMPTY_B = { name:"", startDate:"", endDate:"", botPolicy:"BLOCK", isRecurring:false, recurrenceRule:"", description:"" };
  const EMPTY_F = { reason:"", startAt:"", endAt:"", impact:"BLOCK_ALL" };
  const [bForm, setBForm] = useState(EMPTY_B);
  const [fForm, setFForm] = useState(EMPTY_F);

  const reload = useCallback(async () => {
    setLoading(true);
    const d = await getApplicationFull(app.id);
    setDetail(d);
    const existing = d?.operatingHours || [];
    setHours(Array.from({length:7}, (_,i) => existing.find((x:any)=>x.dayOfWeek===i) || {dayOfWeek:i,isClosed:i===0||i===6,startTime:"06:00",endTime:"22:00"}));
    setLoading(false);
  }, [app.id]);

  useEffect(() => { reload(); }, [reload]);

  const activeFreezes = detail?.freezeWindows?.filter((f:any) => f.isActive) || [];

  const TABS: {id:Tab; label:string; icon:React.ElementType; badge?:number}[] = [
    {id:"info",        label:"Details",      icon:Monitor},
    {id:"hours",       label:"Oper. Hours",  icon:Clock},
    {id:"maintenance", label:"Maintenance",  icon:Calendar},
    {id:"blackout",    label:"Blackouts",    icon:Ban},
    {id:"freeze",      label:"Freeze",       icon:Lock, badge:activeFreezes.length},
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Monitor size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold truncate">{app.name}</h3>
              {app.appCode && <span className="text-[10px] font-mono bg-muted/60 border border-border px-1.5 py-0.5 rounded text-muted-foreground shrink-0">{app.appCode}</span>}
              <CritBadge v={app.criticality} />
              {activeFreezes.length > 0 && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 rounded animate-pulse">⚠ FROZEN</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <StatusDot s={app.status} />
              <span className="text-[11px] text-muted-foreground">{app.status}</span>
              {app.is24x7 && <span className="text-[10px] font-bold text-primary">· 24×7</span>}
              {app.applicationType && <span className="text-[11px] text-muted-foreground">· {app.applicationType}</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button size="sm" variant="outline" onClick={onEdit}><Edit size={12} /> Edit</Button>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={13} /></button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border flex-shrink-0 overflow-x-auto">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-medium border-b-2 whitespace-nowrap transition-all shrink-0",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon size={12} /> {t.label}
            {t.badge ? <span className="w-4 h-4 rounded-full bg-destructive text-white text-[9px] flex items-center justify-center">{t.badge}</span> : null}
          </button>
        ))}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-primary" /></div>
      ) : (
        <div className="flex-1 overflow-y-auto p-5 min-h-0">

          {/* Info */}
          {tab === "info" && detail && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  {label:"Business Owner", v:detail.businessOwner},
                  {label:"Technical Owner", v:detail.technicalOwner},
                  {label:"Category", v:detail.category},
                  {label:"Timezone", v:detail.timezone},
                  {label:"Bot Scheduling", v:detail.is24x7 ? "24 × 7 (unrestricted)" : "Operating hours enforced"},
                  {label:"Environments", v:`${detail.envCount||0} configured`},
                ].filter(x=>x.v).map(item => (
                  <div key={item.label}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                    <p className="text-sm text-foreground mt-0.5">{item.v}</p>
                  </div>
                ))}
              </div>
              {detail.description && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</p>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{detail.description}</p>
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {label:"Maintenance", v:detail.maintenanceWindows?.length||0, alert:false},
                  {label:"Blackout Periods", v:detail.blackoutPeriods?.length||0, alert:false},
                  {label:"Active Freezes", v:activeFreezes.length, alert:activeFreezes.length>0},
                ].map(s => (
                  <div key={s.label} className={cn("p-3 rounded-lg border text-center",s.alert?"border-destructive/20 bg-destructive/5":"border-border bg-muted/20")}>
                    <p className={cn("text-2xl font-bold",s.alert?"text-destructive":"text-foreground")}>{s.v}</p>
                    <p className="text-[10px] uppercase text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Operating Hours */}
          {tab === "hours" && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
                <Info size={13} className="text-primary flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  When a bot is scheduled during a time outside these windows, the scheduler will automatically flag a conflict and alert the user before the job is queued.
                </p>
              </div>
              <HoursEditor hours={hours} is24x7={detail?.is24x7||false} onChange={setHours}
                onToggle24x7={async (v) => {
                  await upsertApplicationRegistry({id:app.id,tenantId:app.tenantId||"",name:app.name,is24x7:v});
                  setDetail((d:any) => d ? {...d,is24x7:v} : d);
                  onRefresh();
                }}
              />
              {!detail?.is24x7 && (
                <div className="flex justify-end">
                  <Button size="sm" disabled={saving} onClick={async () => {
                    setSaving(true);
                    const res = await saveOperatingHours(app.id, hours);
                    if (res.success) toast.success("Operating hours saved");
                    else toast.error(res.error||"Failed");
                    setSaving(false);
                  }}>
                    {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Hours
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Maintenance */}
          {tab === "maintenance" && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/30 border border-border">
                <Info size={13} className="text-primary flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Maintenance windows are created when scheduling bot downtime. Bots linked to this application will be automatically blocked from running during these windows.
                </p>
              </div>
              {(detail?.maintenanceWindows||[]).length === 0 ? (
                <div className="text-center py-10 border border-dashed border-border rounded-lg text-muted-foreground">
                  <Calendar size={22} className="opacity-20 mx-auto mb-2" />
                  <p className="text-xs">No upcoming maintenance windows.</p>
                </div>
              ) : (detail.maintenanceWindows).map((m:any) => (
                <div key={m.id} className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card">
                  <Calendar size={13} className="text-primary shrink-0" />
                  <div className="flex-1">
                    <p className="text-xs font-semibold">{m.type||"Maintenance"}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(m.startTime).toLocaleString()} – {new Date(m.endTime).toLocaleString()}
                      {m.isRecurring && <span className="ml-2 text-primary font-semibold">↻ Recurring</span>}
                    </p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 bg-muted/60 border border-border rounded">{m.status||"Planned"}</span>
                </div>
              ))}
            </div>
          )}

          {/* Blackout Periods */}
          {tab === "blackout" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Business Blackout Periods</p>
                  <p className="text-[11px] text-muted-foreground">Financial close, payroll, year-end, regulatory submissions</p>
                </div>
                <Button size="sm" onClick={() => setShowBlackoutForm(v => !v)}><Plus size={12} /> Add</Button>
              </div>

              {showBlackoutForm && (
                <div className="p-4 border border-border rounded-lg bg-card space-y-3">
                  <p className="text-xs font-bold">New Blackout Period</p>
                  <Inp value={bForm.name} onChange={(v:string) => setBForm(p=>({...p,name:v}))} placeholder="e.g. Month End Close, Year End Processing" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><FieldLabel>Start</FieldLabel><input type="datetime-local" value={bForm.startDate} onChange={e=>setBForm(p=>({...p,startDate:e.target.value}))} className="w-full px-3 py-2 bg-muted/40 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
                    <div><FieldLabel>End</FieldLabel><input type="datetime-local" value={bForm.endDate} onChange={e=>setBForm(p=>({...p,endDate:e.target.value}))} className="w-full px-3 py-2 bg-muted/40 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" /></div>
                    <div>
                      <FieldLabel>Bot Policy</FieldLabel>
                      <select value={bForm.botPolicy} onChange={e=>setBForm(p=>({...p,botPolicy:e.target.value}))} className="w-full px-3 py-2 bg-muted/40 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                        {BOT_POLICIES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                      </select>
                    </div>
                    <div><FieldLabel>Description (optional)</FieldLabel><Inp value={bForm.description} onChange={(v:string)=>setBForm(p=>({...p,description:v}))} placeholder="Notes" /></div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={async () => {
                      if (!bForm.name||!bForm.startDate||!bForm.endDate) { toast.error("Name and dates required"); return; }
                      const res = await upsertBlackoutPeriod(app.id, bForm);
                      if (res.success) { toast.success("Blackout period saved"); setShowBlackoutForm(false); setBForm(EMPTY_B); reload(); }
                      else toast.error(res.error||"Failed");
                    }}><Save size={12} /> Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowBlackoutForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {(detail?.blackoutPeriods||[]).length === 0 && !showBlackoutForm && (
                <div className="text-center py-10 border border-dashed border-border rounded-lg text-muted-foreground">
                  <Ban size={22} className="opacity-20 mx-auto mb-2" />
                  <p className="text-xs">No blackout periods defined.</p>
                </div>
              )}
              {(detail?.blackoutPeriods||[]).map((b:any) => {
                const pol = BOT_POLICIES.find(x=>x.value===b.botPolicy);
                return (
                  <div key={b.id} className="flex items-start gap-3 p-3.5 rounded-lg border border-border bg-card">
                    <Ban size={13} className="text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold">{b.name}</p>
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border",pol?.cls)}>{pol?.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">{new Date(b.startDate).toLocaleDateString()} – {new Date(b.endDate).toLocaleDateString()}</p>
                      {b.description && <p className="text-[11px] text-muted-foreground">{b.description}</p>}
                    </div>
                    <button onClick={async () => { await deleteBlackoutPeriod(b.id); reload(); }} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Freeze Windows */}
          {tab === "freeze" && (
            <div className="space-y-4">
              {activeFreezes.length > 0 && (
                <div className="flex items-start gap-3 p-3.5 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-destructive">{activeFreezes.length} Active Freeze</p>
                    <p className="text-xs text-muted-foreground">All bot executions against this application are blocked until the freeze is resolved.</p>
                  </div>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold">Emergency Freeze Windows</p>
                  <p className="text-[11px] text-muted-foreground">Incidents, outages, emergency change freezes</p>
                </div>
                <Button size="sm" onClick={() => setShowFreezeForm(v=>!v)}><Lock size={12} /> Add Freeze</Button>
              </div>

              {showFreezeForm && (
                <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg space-y-3">
                  <p className="text-xs font-bold text-destructive">New Emergency Freeze</p>
                  <Inp value={fForm.reason} onChange={(v:string)=>setFForm(p=>({...p,reason:v}))} placeholder="e.g. Application Outage — INCIDENT-2026-001" />
                  <div className="grid grid-cols-2 gap-3">
                    <div><FieldLabel>Starts</FieldLabel><input type="datetime-local" value={fForm.startAt} onChange={e=>setFForm(p=>({...p,startAt:e.target.value}))} className="w-full px-3 py-2 bg-muted/40 border border-border rounded text-sm focus:outline-none" /></div>
                    <div><FieldLabel>Ends (blank = open-ended)</FieldLabel><input type="datetime-local" value={fForm.endAt} onChange={e=>setFForm(p=>({...p,endAt:e.target.value}))} className="w-full px-3 py-2 bg-muted/40 border border-border rounded text-sm focus:outline-none" /></div>
                    <div className="col-span-2">
                      <FieldLabel>Impact</FieldLabel>
                      <select value={fForm.impact} onChange={e=>setFForm(p=>({...p,impact:e.target.value}))} className="w-full px-3 py-2 bg-muted/40 border border-border rounded text-sm focus:outline-none">
                        {IMPACTS.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="bg-destructive text-white hover:bg-destructive/90" onClick={async () => {
                      if (!fForm.reason||!fForm.startAt) { toast.error("Reason and start time required"); return; }
                      const res = await createFreezeWindow(app.id, {...fForm, createdBy:currentUser?.email});
                      if (res.success) { toast.success("Freeze window created — all bots blocked"); setShowFreezeForm(false); setFForm(EMPTY_F); reload(); onRefresh(); }
                      else toast.error(res.error||"Failed");
                    }}><Lock size={12} /> Create Freeze</Button>
                    <Button size="sm" variant="outline" onClick={()=>setShowFreezeForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {(detail?.freezeWindows||[]).length === 0 && !showFreezeForm && (
                <div className="text-center py-10 border border-dashed border-border rounded-lg text-muted-foreground">
                  <Lock size={22} className="opacity-20 mx-auto mb-2" />
                  <p className="text-xs">No freeze windows. Application is fully available.</p>
                </div>
              )}
              {(detail?.freezeWindows||[]).map((f:any) => (
                <div key={f.id} className={cn("flex items-start gap-3 p-3.5 rounded-lg border",f.isActive?"border-destructive/20 bg-destructive/5":"border-border opacity-60")}>
                  {f.isActive ? <Lock size={13} className="text-destructive shrink-0 mt-0.5" /> : <Unlock size={13} className="text-muted-foreground shrink-0 mt-0.5" />}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-semibold">{f.reason}</p>
                      {f.isActive && <span className="text-[9px] font-bold text-destructive bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded">ACTIVE</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{new Date(f.startAt).toLocaleString()} – {f.endAt ? new Date(f.endAt).toLocaleString() : "Open-ended"}</p>
                    <p className="text-[11px] text-muted-foreground">Impact: {IMPACTS.find(i=>i.value===f.impact)?.label||f.impact}</p>
                  </div>
                  {f.isActive && (
                    <Button size="sm" variant="outline" className="shrink-0" onClick={async () => {
                      await resolveFreezeWindow(f.id, currentUser?.email||"admin");
                      toast.success("Freeze resolved"); reload(); onRefresh();
                    }}><Unlock size={11} /> Resolve</Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ApplicationRegistry() {
  const { activeCustomer, activeTenant, currentUser } = useAppContext();
  const [apps, setApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timezones, setTimezones] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<any | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);

  const tenantId = activeTenant?.id || "";

  const load = useCallback(async () => {
    if (!tenantId) { setLoading(false); return; }
    setLoading(true);
    const [list, tz] = await Promise.all([
      getApplicationRegistry(tenantId, activeCustomer?.id),
      getTimezoneLookups(),
    ]);
    setApps(list);
    setTimezones(tz);
    setLoading(false);
  }, [tenantId, activeCustomer?.id]);

  useEffect(() => { load(); }, [load]);

  const saveApp = async (form: any) => {
    if (!tenantId) return;
    const res = await upsertApplicationRegistry({ id:editing?.id, tenantId, customerId:activeCustomer?.id, ...form });
    if (res.success) {
      toast.success(editing ? "Application updated" : "Application registered");
      setShowForm(false); setEditing(null); setSelected(null);
      load();
    } else toast.error(res.error||"Failed");
  };

  const handleClone = async (app: any) => {
    const res = await cloneAppRegistry(app.id, `${app.name} (Copy)`, tenantId);
    if (res.success) { toast.success("Cloned — edit the copy for future changes"); load(); }
    else toast.error(res.error||"Failed");
  };

  const FILTERS = ["all","active","planned","critical","high","retired"].map(v => ({value:v, label:v.charAt(0).toUpperCase()+v.slice(1)}));

  const filtered = apps.filter(a =>
    (filter==="all" || a.status?.toLowerCase()===filter || a.criticality?.toLowerCase()===filter) &&
    (!search || [a.name,a.appCode,a.applicationType,a.businessOwner].some(x=>(x||"").toLowerCase().includes(search.toLowerCase())))
  );

  if (showForm || editing) return (
    <div className="h-full bg-card border border-border rounded-lg overflow-hidden">
      <AppForm app={editing} timezones={timezones} onSave={saveApp} onCancel={() => { setShowForm(false); setEditing(null); }} />
    </div>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground">Application Registry</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Governed application inventory · Operating hours · Maintenance · Blackouts · Freeze windows
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus size={13} /> Register Application
        </Button>
      </header>

      {/* Search + filter */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="relative max-w-xs flex-shrink-0">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search applications..."
            className="w-full pl-8 pr-3 py-2 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(f => (
            <button key={f.value} onClick={()=>setFilter(f.value)}
              className={cn("px-2.5 py-1.5 text-[11px] font-semibold rounded-md border transition-all capitalize",
                filter===f.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
              {f.label}
            </button>
          ))}
        </div>
        <button onClick={load} className="p-2 rounded-md bg-muted/40 border border-border hover:bg-muted transition-colors ml-auto">
          <RefreshCw size={13} className={cn("text-muted-foreground",loading&&"animate-spin")} />
        </button>
        <p className="text-xs text-muted-foreground shrink-0">{filtered.length} app{filtered.length!==1?"s":""}</p>
      </div>

      <div className="flex flex-1 gap-4 overflow-hidden min-h-0">
        {/* App list */}
        <div className={cn("flex flex-col overflow-hidden transition-all duration-300", selected ? "w-[280px] shrink-0" : "flex-1")}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center"><Loader2 size={18} className="animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Monitor size={32} className="opacity-20" />
              <p className="text-sm">{apps.length === 0 ? "No applications registered yet" : `No results for "${search}"`}</p>
              {apps.length === 0 && <Button size="sm" onClick={()=>setShowForm(true)}><Plus size={13} /> Register First Application</Button>}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
              {filtered.map(app => {
                const isSel = selected?.id === app.id;
                const frozen = Number(app.activeFreezes) > 0;
                return (
                  <div key={app.id} onClick={() => setSelected(isSel ? null : app)}
                    className={cn("flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all",
                      isSel ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/20",
                      frozen && "ring-1 ring-destructive/30")}>
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5",isSel?"bg-primary/10":"bg-muted/40")}>
                      <Monitor size={14} className={isSel?"text-primary":"text-muted-foreground"} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold truncate">{app.name}</span>
                        {frozen && <span className="text-[9px] font-bold text-destructive shrink-0">⚠ FROZEN</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <StatusDot s={app.status} />
                        <span className="text-[10px] text-muted-foreground">{app.status}</span>
                        <CritBadge v={app.criticality} />
                      </div>
                      {app.appCode && <p className="text-[10px] font-mono text-muted-foreground/60 mt-0.5">{app.appCode}</p>}
                      {app.nextMaintenance && <p className="text-[10px] text-primary mt-0.5"><Calendar size={9} className="inline mr-0.5" />Next: {new Date(app.nextMaintenance).toLocaleDateString()}</p>}
                    </div>
                    <div className="flex flex-col gap-0.5 shrink-0" onClick={e=>e.stopPropagation()}>
                      <button title="Edit" onClick={()=>{setEditing(app);setSelected(null);}} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Edit size={10} /></button>
                      <button title="Clone" onClick={()=>handleClone(app)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Copy size={10} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="flex-1 overflow-hidden bg-card border border-border rounded-lg min-w-0">
            <AppDetail app={selected} timezones={timezones} currentUser={currentUser}
              onEdit={() => { setEditing(selected); setSelected(null); }}
              onClose={() => setSelected(null)}
              onRefresh={load}
            />
          </div>
        )}
      </div>
    </div>
  );
}
