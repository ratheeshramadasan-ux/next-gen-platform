"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { toast } from "sonner";
import {
  Shield, Key, Layers, Users, AlertTriangle, Lock, Plus, Search,
  Edit, Trash2, Copy, Check, X, Save, ShieldCheck, Building2, User,
  Code, BarChart3, Compass, Briefcase, CheckCircle2, FlaskConical,
  Settings, Crown, RefreshCw, ChevronDown, ChevronRight, Loader2,
  BookOpen, AlertCircle, GitBranch, Eye, EyeOff, Bell, Monitor,
  Lightbulb, Info, Minus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleSwitch } from "@/components/ui/toggle-switch";
import {
  createCustomRole, updateCustomRole, deleteCustomRole, cloneRole,
  upsertSodRule, deleteSodRule, getMfaPolicy, upsertMfaPolicy,
  getSessionPolicy, upsertSessionPolicy, replicateRoleToTenants
} from "@/app/actions/iamActions";
import { getTenantsForCustomer } from "@/app/actions/accessActions";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab = "roles" | "builder" | "matrix" | "sod" | "mfa";

interface Permission { id: string; resource: string; action: string; displayName: string; category: string; }
interface RolePerm { id: string; permissionId: string; effect: string; permission: Permission; }
interface Role {
  id: string; name: string; description: string | null; scope: string;
  isSystem: boolean; isCustom: boolean; color: string | null; icon: string | null;
  parentRoleId?: string | null; createdAt: string;
  rolePermissions: RolePerm[];
  tenantScopes: { tenantId: string; tenant: { id: string; name: string; code: string } }[];
  sodRulesA: { id: string; roleB: { id: string; name: string } }[];
  sodRulesB: { id: string; roleA: { id: string; name: string } }[];
  _count: { users: number };
}
interface SodRule {
  id: string; severity: string; description: string | null; isActive: boolean;
  roleA: { id: string; name: string; color: string | null };
  roleB: { id: string; name: string; color: string | null };
}

// ─── Helpers — theme-aware, no hardcoded palette ─────────────────────────────
const SCOPE_STYLE: Record<string, string> = {
  platform: "bg-primary/10 text-primary border-primary/25",
  customer: "bg-muted/60 text-foreground border-border",
  tenant:   "bg-muted/40 text-muted-foreground border-border",
};

const ICON_MAP: Record<string, React.ElementType> = {
  crown: Crown, building2: Building2, layers: Layers, "shield-check": ShieldCheck,
  compass: Compass, briefcase: Briefcase, "check-circle": CheckCircle2,
  "bar-chart": BarChart3, code: Code, search: Search, flask: FlaskConical,
  scroll: BookOpen, user: User, shield: Shield, key: Key,
};
const RoleIcon = ({ icon, size = 14 }: { icon?: string | null; size?: number }) => {
  const I = (icon && ICON_MAP[icon]) || Shield;
  return <I size={size} />;
};

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return <ToggleSwitch value={value} onChange={onChange} />;
}

// ─── Permission Grid ──────────────────────────────────────────────────────────
function PermGrid({ permissions, selected, denied, onToggle, readonly }: {
  permissions: Permission[];
  selected: Set<string>; denied: Set<string>;
  onToggle?: (id: string, effect: "ALLOW" | "DENY" | "NONE") => void;
  readonly?: boolean;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const byCategory = useMemo(() => {
    const filtered = permissions.filter(p =>
      !q || p.displayName.toLowerCase().includes(q.toLowerCase()) || p.category.toLowerCase().includes(q.toLowerCase())
    );
    return filtered.reduce<Record<string, Permission[]>>((acc, p) => {
      (acc[p.category] = acc[p.category] || []).push(p); return acc;
    }, {});
  }, [permissions, q]);

  useEffect(() => { setOpen(new Set(Object.keys(byCategory))); }, []);

  const toggleCat = (c: string) =>
    setOpen(prev => { const n = new Set(prev); n.has(c) ? n.delete(c) : n.add(c); return n; });

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Filter permissions..."
          className="w-full pl-7 pr-3 py-2 text-xs bg-muted/40 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
        {Object.entries(byCategory).map(([cat, perms]) => {
          const isOpen = open.has(cat);
          const allowN = perms.filter(p => selected.has(p.id)).length;
          const denyN  = perms.filter(p => denied.has(p.id)).length;
          return (
            <div key={cat} className="border border-border/60 rounded-lg overflow-hidden">
              <button onClick={() => toggleCat(cat)}
                className={cn("w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors",
                  isOpen ? "bg-primary/5" : "bg-muted/20 hover:bg-muted/40")}>
                <div className="flex items-center gap-2">
                  {isOpen ? <ChevronDown size={12} className="text-muted-foreground" /> : <ChevronRight size={12} className="text-muted-foreground" />}
                  <span className="text-xs font-bold text-foreground">{cat}</span>
                  <span className="text-[10px] text-muted-foreground">({perms.length})</span>
                </div>
                <div className="flex items-center gap-2">
                  {allowN > 0 && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{allowN}✓</span>}
                  {denyN  > 0 && <span className="text-[10px] font-bold text-rose-500">{denyN}✗</span>}
                  {!readonly && (
                    <button type="button" onClick={e => { e.stopPropagation(); perms.forEach(p => onToggle?.(p.id, perms.every(x => selected.has(x.id)) ? "NONE" : "ALLOW")); }}
                      className="text-[10px] text-primary hover:underline px-1">
                      {perms.every(p => selected.has(p.id)) ? "Clear" : "All"}
                    </button>
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="grid grid-cols-2 divide-x-0 divide-y divide-border/30">
                  {perms.map(p => {
                    const isAllow = selected.has(p.id);
                    const isDeny  = denied.has(p.id);
                    return (
                      <div key={p.id} className={cn("flex items-center justify-between px-3 py-2 transition-colors",
                        isAllow ? "bg-emerald-500/5" : isDeny ? "bg-rose-500/5" : "hover:bg-muted/10")}>
                        <span className="text-[11px] text-foreground/80">{p.displayName}</span>
                        {readonly ? (
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                            isAllow ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                            isDeny  ? "bg-rose-500/10 text-rose-500" : "text-muted-foreground")}>
                            {isAllow ? "Allow" : isDeny ? "Deny" : "—"}
                          </span>
                        ) : (
                          <div className="flex gap-1">
                            <button onClick={() => onToggle?.(p.id, isAllow ? "NONE" : "ALLOW")}
                              className={cn("w-6 h-5 rounded flex items-center justify-center border transition-all",
                                isAllow ? "bg-emerald-500 text-white border-emerald-600" : "border-border text-muted-foreground hover:border-emerald-500 hover:text-emerald-500")}>
                              <Check size={9} />
                            </button>
                            <button onClick={() => onToggle?.(p.id, isDeny ? "NONE" : "DENY")}
                              className={cn("w-6 h-5 rounded flex items-center justify-center border transition-all",
                                isDeny ? "bg-rose-500 text-white border-rose-600" : "border-border text-muted-foreground hover:border-rose-500 hover:text-rose-500")}>
                              <X size={9} />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Role Builder ─────────────────────────────────────────────────────────────
function RoleBuilder({ permissions, roles, tenants, onSave, onCancel, editing, isPlatformAdmin }: {
  permissions: Permission[]; roles: Role[]; tenants: any[];
  onSave: (d: any) => Promise<void>; onCancel: () => void;
  editing?: Role | null; isPlatformAdmin: boolean;
}) {
  const { currentUser } = useAppContext();
  const [name, setName]   = useState(editing?.name || "");
  const [desc, setDesc]   = useState(editing?.description || "");
  const [scope, setScope] = useState(editing?.scope || "tenant");
  const [color, setColor] = useState(editing?.color || "#6366f1");
  const [icon,  setIcon]  = useState(editing?.icon  || "shield");
  const [parentId, setParentId] = useState(editing?.parentRoleId || "");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(editing?.rolePermissions.filter(r => r.effect === "ALLOW").map(r => r.permissionId) || [])
  );
  const [denied, setDenied] = useState<Set<string>>(
    new Set(editing?.rolePermissions.filter(r => r.effect === "DENY").map(r => r.permissionId) || [])
  );
  const [tenantSel, setTenantSel] = useState<Set<string>>(
    new Set(editing?.tenantScopes?.map(s => s.tenantId) || [])
  );
  const [saving, setSaving] = useState(false);

  const onToggle = (id: string, effect: "ALLOW" | "DENY" | "NONE") => {
    setSelected(prev => { const n = new Set(prev); effect === "ALLOW" ? n.add(id) : n.delete(id); return n; });
    setDenied(prev  => { const n = new Set(prev); effect === "DENY"  ? n.add(id) : n.delete(id); return n; });
  };

  const save = async () => {
    if (!name.trim()) { toast.error("Role name is required"); return; }
    if (scope === "platform" && !isPlatformAdmin) { toast.error("Only Platform Admins can create platform-scoped roles"); return; }
    setSaving(true);
    await onSave({ name: name.trim(), description: desc, scope, color, icon,
      parentRoleId: parentId || undefined, permissionIds: [...selected],
      denyPermissionIds: [...denied], tenantScopeIds: [...tenantSel],
      createdBy: currentUser?.email || "system" });
    setSaving(false);
  };

  const ICONS = Object.keys(ICON_MAP);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h3 className="text-sm font-bold">{editing ? "Edit Role" : "Create New Role"}</h3>
          <p className="text-xs text-muted-foreground">{selected.size} allow · {denied.size} deny · of {permissions.length} total</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            {editing ? "Update" : "Create Role"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Config column */}
        <div className="w-64 shrink-0 border-r border-border p-4 overflow-y-auto space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Senior Developer"
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="What can this role do?"
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Scope</label>
            <div className="grid grid-cols-3 gap-1">
              {(["platform","customer","tenant"] as const).map(s => {
                const locked = s === "platform" && !isPlatformAdmin;
                return (
                  <button key={s} disabled={locked} onClick={() => !locked && setScope(s)}
                    className={cn("py-1.5 text-[11px] font-semibold rounded border capitalize transition-all",
                      locked ? "opacity-40 cursor-not-allowed border-border text-muted-foreground" :
                      scope === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                    {locked ? <span className="flex items-center justify-center gap-0.5"><Lock size={8} />{s}</span> : s}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Color</label>
            <div className="flex gap-2">
              <input type="color" value={color} onChange={e => setColor(e.target.value)}
                className="w-10 h-9 rounded border border-border bg-muted/40 cursor-pointer p-1 flex-shrink-0" />
              <input value={color} onChange={e => setColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-muted/40 border border-border rounded text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Icon</label>
            <div className="grid grid-cols-6 gap-1">
              {ICONS.map(k => { const I = ICON_MAP[k]; return (
                <button key={k} onClick={() => setIcon(k)} title={k}
                  className={cn("w-7 h-7 rounded flex items-center justify-center border transition-all",
                    icon === k ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
                  <I size={12} />
                </button>
              ); })}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Based On (inherit from)</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)}
              className="w-full px-3 py-2 bg-muted/40 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">— None —</option>
              {roles.filter(r => r.isSystem).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          {tenants.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Replicate to Tenants</label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {tenants.map((t: any) => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={tenantSel.has(t.id)}
                      onChange={e => setTenantSel(prev => { const n = new Set(prev); e.target.checked ? n.add(t.id) : n.delete(t.id); return n; })}
                      className="w-3.5 h-3.5 rounded border-border accent-primary" />
                    <span className="text-xs text-foreground">{t.name}</span>
                    <span className="text-[10px] text-muted-foreground font-mono ml-auto">{t.code}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {/* Preview */}
          <div className="p-3 rounded-lg border border-border bg-muted/10">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md flex items-center justify-center" style={{ backgroundColor: color + "25", color }}>
                <RoleIcon icon={icon} />
              </div>
              <div>
                <p className="text-xs font-semibold leading-none">{name || "Role Name"}</p>
                <span className={cn("text-[10px] font-bold capitalize mt-0.5 inline-block px-1.5 py-0.5 rounded border", SCOPE_STYLE[scope])}>{scope}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Permissions column */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold">Permissions</h4>
              <p className="text-[11px] text-muted-foreground"><span className="text-emerald-600 dark:text-emerald-400 font-semibold">{selected.size} allow</span>{denied.size > 0 && <> · <span className="text-rose-500 font-semibold">{denied.size} deny</span></>}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelected(new Set(permissions.map(p => p.id))); setDenied(new Set()); }}>Allow All</Button>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => { setSelected(new Set()); setDenied(new Set()); }}>Clear</Button>
            </div>
          </div>
          <PermGrid permissions={permissions} selected={selected} denied={denied} onToggle={onToggle} />
        </div>
      </div>
    </div>
  );
}

// ─── Role detail panel ────────────────────────────────────────────────────────
function RoleDetail({ role, permissions, onEdit, onClose }: { role: Role; permissions: Permission[]; onEdit: () => void; onClose: () => void }) {
  const allow = new Set(role.rolePermissions.filter(r => r.effect === "ALLOW").map(r => r.permissionId));
  const deny  = new Set(role.rolePermissions.filter(r => r.effect === "DENY").map(r => r.permissionId));

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: (role.color || "#6366f1") + "25", color: role.color || "#6366f1" }}>
            <RoleIcon icon={role.icon} size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold">{role.name}</h3>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border capitalize", SCOPE_STYLE[role.scope])}>{role.scope}</span>
              {role.isSystem && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-muted border border-border rounded text-muted-foreground">System Default</span>}
              {role.isCustom && <span className="text-[10px] font-bold px-1.5 py-0.5 bg-primary/10 border border-primary/20 rounded text-primary">Custom</span>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">{role.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!role.isSystem && <Button size="sm" variant="outline" onClick={onEdit}><Edit size={12} /> Edit</Button>}
          <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground"><X size={14} /></button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 px-5 py-3 border-b border-border flex-shrink-0">
        {[
          { label: "Users", value: role._count.users, color: "text-foreground" },
          { label: "Allow", value: allow.size, color: "text-emerald-600 dark:text-emerald-400" },
          { label: "Deny",  value: deny.size,  color: "text-rose-500" },
          { label: "Tenants", value: role.tenantScopes.length, color: "text-primary" },
        ].map(s => (
          <div key={s.label} className="text-center p-2 rounded-lg border border-border bg-muted/20">
            <p className={cn("text-lg font-bold", s.color)}>{s.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* SoD conflicts */}
      {(role.sodRulesA.length > 0 || role.sodRulesB.length > 0) && (
        <div className="px-5 py-3 border-b border-border flex-shrink-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">SoD Conflicts</p>
          <div className="flex flex-wrap gap-1.5">
            {[...role.sodRulesA.map(s => s.roleB.name), ...role.sodRulesB.map(s => s.roleA.name)].map(name => (
              <span key={name} className="flex items-center gap-1 px-2 py-0.5 bg-rose-500/10 border border-rose-500/20 rounded text-xs text-rose-500">
                <X size={9} /> {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Permissions */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <PermGrid permissions={permissions} selected={allow} denied={deny} readonly />
      </div>
    </div>
  );
}

// ─── SoD Panel ────────────────────────────────────────────────────────────────
function SodPanel({ rules, roles, onRefresh }: { rules: SodRule[]; roles: Role[]; onRefresh: () => void }) {
  const [rA, setRA] = useState(""); const [rB, setRB] = useState("");
  const [sev, setSev] = useState("HIGH"); const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!rA || !rB || rA === rB) { toast.error("Select two different roles"); return; }
    setSaving(true);
    const res = await upsertSodRule({ roleAId: rA, roleBId: rB, severity: sev, description: desc });
    if (res.success) { toast.success("SoD rule added"); setRA(""); setRB(""); setDesc(""); onRefresh(); }
    else toast.error(res.error);
    setSaving(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2.5 p-3.5 rounded-lg bg-muted/50 border border-border">
        <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">When a user is assigned two conflicting roles, the platform flags the violation. HIGH severity rules actively block the assignment.</p>
      </div>
      <div className="p-4 border border-border rounded-lg bg-card space-y-3">
        <h4 className="text-sm font-bold">Add Conflict Rule</h4>
        <div className="grid grid-cols-2 gap-3">
          {[["Role A", rA, setRA], ["Role B (conflicts with)", rB, setRB]].map(([label, val, setter]: any) => (
            <div key={label}>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{label}</label>
              <select value={val} onChange={e => setter(e.target.value)}
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          ))}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Severity</label>
            <select value={sev} onChange={e => setSev(e.target.value)}
              className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Description</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="Reason..."
              className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <Button size="sm" onClick={submit} disabled={saving}><Plus size={13} /> Add Rule</Button>
      </div>
      <div className="space-y-2">
        {rules.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No SoD rules defined yet.</p>}
        {rules.map(rule => (
          <div key={rule.id} className="flex items-center gap-3 p-3.5 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-xs font-semibold px-2 py-1 bg-muted/40 border border-border rounded">{rule.roleA.name}</span>
              <X size={11} className="text-rose-500 flex-shrink-0" />
              <span className="text-xs font-semibold px-2 py-1 bg-muted/40 border border-border rounded">{rule.roleB.name}</span>
            </div>
            <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border flex-shrink-0",
              rule.severity === "HIGH" ? "bg-rose-500/10 text-rose-500 border-rose-500/20" :
              rule.severity === "MEDIUM" ? "bg-muted/60 text-muted-foreground border-border" : "bg-muted text-muted-foreground border-border")}>
              {rule.severity}
            </span>
            {rule.description && <p className="text-xs text-muted-foreground flex-1 truncate">{rule.description}</p>}
            <button onClick={async () => { const r = await deleteSodRule(rule.id); if (r.success) { toast.success("Removed"); onRefresh(); } }}
              className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive flex-shrink-0"><Trash2 size={12} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MFA & Session ────────────────────────────────────────────────────────────
function MfaPanel({ customerId }: { customerId?: string | null }) {
  const [mfa, setMfa]   = useState<any>({ isEnforced: true, allowedMethods: ["totp","email_otp"], gracePeriodDays: 7 });
  const [sess, setSess] = useState<any>({ sessionTimeoutMinutes: 60, idleTimeoutMinutes: 30, maxConcurrentSessions: 3, requireDeviceTrust: false, riskBasedAuthEnabled: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (!customerId) { setLoading(false); return; }
    fetch(`/api/iam/policies?customerId=${customerId}`)
      .then(r => r.json())
      .then(data => {
        if (data.mfa) setMfa((p: any) => ({ ...p, ...data.mfa }));
        if (data.session) setSess((p: any) => ({ ...p, ...data.session }));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [customerId]);

  const MFA_METHODS = [
    { key: "totp",       label: "Authenticator App (TOTP)",   desc: "Google Authenticator, Authy, Microsoft Authenticator" },
    { key: "email_otp",  label: "Email OTP",                  desc: "One-time code sent to registered email" },
    { key: "sms_otp",    label: "SMS OTP",                    desc: "One-time code sent via SMS" },
    { key: "passkey",    label: "Passkey / FIDO2",            desc: "Biometric or hardware security key" },
    { key: "magic_link", label: "Magic Link",                 desc: "Passwordless email sign-in link" },
    { key: "yubikey",    label: "YubiKey",                    desc: "Hardware key (FIDO2/WebAuthn)" },
  ];

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 size={18} className="animate-spin text-muted-foreground" /></div>;
  if (!customerId) return (
    <div className="text-center py-12 text-muted-foreground">
      <Lock size={28} className="opacity-20 mx-auto mb-3" />
      <p className="text-sm">Select a customer to configure policies.</p>
    </div>
  );

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><ShieldCheck size={14} className="text-primary" /></div>
          <div><h3 className="text-sm font-bold">Multi-Factor Authentication</h3><p className="text-xs text-muted-foreground">Enforce and configure MFA for this organization</p></div>
        </div>
        <div className={cn("flex items-center justify-between p-3.5 rounded-lg border", mfa.isEnforced ? "border-primary/20 bg-primary/5" : "border-border bg-muted/20")}>
          <div>
            <p className="text-sm font-semibold">Enforce MFA for All Users</p>
            <p className="text-xs text-muted-foreground mt-0.5">Strongly recommended — blocks access until users enroll</p>
          </div>
          <Toggle value={mfa.isEnforced} onChange={v => setMfa((p: any) => ({...p, isEnforced: v}))} />
        </div>
        {!mfa.isEnforced && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border">
            <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">MFA is disabled. This is not recommended for production. Users are not required to complete MFA enrollment.</p>
          </div>
        )}
        <div className="space-y-2">
          {MFA_METHODS.map(m => (
            <div key={m.key} className={cn("flex items-center justify-between p-3 rounded-lg border transition-colors",
              mfa.allowedMethods.includes(m.key) ? "border-primary/20 bg-primary/5" : "border-border bg-muted/20")}>
              <div><p className="text-sm font-medium">{m.label}</p><p className="text-xs text-muted-foreground">{m.desc}</p></div>
              <Toggle value={mfa.allowedMethods.includes(m.key)}
                onChange={() => setMfa((p: any) => ({...p, allowedMethods: p.allowedMethods.includes(m.key) ? p.allowedMethods.filter((x: string) => x !== m.key) : [...p.allowedMethods, m.key]}))} />
            </div>
          ))}
        </div>
        <div className="w-32">
          <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">Grace Period (days)</label>
          <input type="number" value={mfa.gracePeriodDays} onChange={e => setMfa((p: any) => ({...p, gracePeriodDays: +e.target.value}))}
            className="w-full px-3 py-2 bg-muted/40 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={saving} onClick={async () => { setSaving(true); const r = await upsertMfaPolicy({customerId, ...mfa}); r.success ? toast.success("MFA policy saved") : toast.error(r.error); setSaving(false); }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save MFA Policy
          </Button>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center gap-2.5 pb-3 border-b border-border">
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center"><Monitor size={14} className="text-primary" /></div>
          <div><h3 className="text-sm font-bold">Session Policy</h3><p className="text-xs text-muted-foreground">Timeouts, concurrency, and access controls</p></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {[["Session Timeout (min)", "sessionTimeoutMinutes"],["Idle Timeout (min)","idleTimeoutMinutes"],["Max Concurrent Sessions","maxConcurrentSessions"]].map(([lbl,key]) => (
            <div key={key}><label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">{lbl}</label>
              <input type="number" value={sess[key]} onChange={e => setSess((p: any) => ({...p, [key]: +e.target.value}))}
                className="w-full px-3 py-2 bg-muted/40 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {[["requireDeviceTrust","Require Device Trust","Only registered devices allowed"],["riskBasedAuthEnabled","Risk-Based Authentication","Step-up auth when risk signals are elevated"]].map(([key,lbl,desc]) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20">
              <div><p className="text-xs font-semibold">{lbl}</p><p className="text-[11px] text-muted-foreground">{desc}</p></div>
              <Toggle value={sess[key]} onChange={v => setSess((p: any) => ({...p, [key]: v}))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button size="sm" disabled={saving} onClick={async () => { setSaving(true); const r = await upsertSessionPolicy({customerId, ...sess}); r.success ? toast.success("Session policy saved") : toast.error(r.error); setSaving(false); }}>
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save Session Policy
          </Button>
        </div>
      </section>
    </div>
  );
}

// ─── Main (inner) ─────────────────────────────────────────────────────────────
function IamPageInner() {
  const { role: userRole, currentUser, activeCustomer } = useAppContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as Tab) || "roles";
  const isPlatformAdmin = userRole === "Platform Admin";

  const [tab, setTab]             = useState<Tab>(initialTab);
  const [roles, setRoles]         = useState<Role[]>([]);
  const [perms, setPerms]         = useState<Permission[]>([]);
  const [sod, setSod]             = useState<SodRule[]>([]);
  const [tenants, setTenants]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [editingRole,  setEditingRole]  = useState<Role | null>(null);
  const [showBuilder,  setShowBuilder]  = useState(false);
  const [search,       setSearch]       = useState("");
  const [scopeFilter,  setScopeFilter]  = useState("all");

  const load = async () => {
    setLoading(true); setError(null);
    try {
      // Use API route — bypasses stale Prisma client in dev server
      const res = await fetch("/api/iam", { cache: "no-store" });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRoles(Array.isArray(data.roles) ? data.roles : []);
      setPerms(Array.isArray(data.permissions) ? data.permissions : []);
      setSod(Array.isArray(data.sodRules) ? data.sodRules : []);
      if (activeCustomer?.id) {
        const t = await getTenantsForCustomer(activeCustomer.id);
        setTenants(Array.isArray(t) ? t : []);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activeCustomer]);

  const switchTab = (t: Tab) => {
    setTab(t); router.push(`?tab=${t}`, { scroll: false });
    if (t !== "builder") { setShowBuilder(false); setEditingRole(null); }
  };

  const filtered = roles.filter(r =>
    (scopeFilter === "all" || r.scope === scopeFilter) &&
    (!search || r.name.toLowerCase().includes(search.toLowerCase()) || (r.description || "").toLowerCase().includes(search.toLowerCase()))
  );

  const saveRole = async (data: any) => {
    if (data.scope === "platform" && !isPlatformAdmin) { toast.error("Only Platform Admins can create platform-scoped roles"); return; }
    const res = editingRole
      ? await updateCustomRole(editingRole.id, data)
      : await createCustomRole({ ...data, customerId: activeCustomer?.id });
    if (res.success) { toast.success(editingRole ? "Role updated" : "Role created"); setShowBuilder(false); setEditingRole(null); await load(); switchTab("roles"); }
    else toast.error(res.error || "Failed");
  };

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "roles",   label: "Role Catalog",      icon: Shield },
    { id: "builder", label: "Role Builder",       icon: Settings },
    { id: "matrix",  label: "Permission Matrix",  icon: Layers },
    { id: "sod",     label: "SoD Rules",          icon: AlertTriangle },
    { id: "mfa",     label: "MFA & Session",      icon: ShieldCheck },
  ];

  const systemCount = roles.filter(r => r.isSystem).length;
  const customCount  = roles.filter(r => r.isCustom).length;

  const renderContent = () => {
    if (loading) return (
      <div key="loading" className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={22} className="animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading IAM data...</p>
        </div>
      </div>
    );

    if (error) return (
      <div key="error" className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <AlertCircle size={28} className="text-destructive opacity-60" />
          <p className="text-sm font-semibold text-foreground">Failed to load IAM data</p>
          <p className="text-xs text-muted-foreground">{error}</p>
          <Button size="sm" onClick={load}>Retry</Button>
        </div>
      </div>
    );

    if (showBuilder || tab === "builder") return (
      <div key="builder" className="h-full bg-card border border-border rounded-lg overflow-hidden">
        <RoleBuilder permissions={perms} roles={roles} tenants={tenants}
          editing={editingRole} isPlatformAdmin={isPlatformAdmin}
          onSave={saveRole}
          onCancel={() => { setShowBuilder(false); setEditingRole(null); switchTab("roles"); }} />
      </div>
    );

    if (tab === "roles") return (
      <div key="roles" className="flex h-full gap-4 overflow-hidden">
        {/* Left list */}
        <div className="flex flex-col w-72 shrink-0 gap-2 overflow-hidden">
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search roles..."
                className="w-full pl-8 pr-3 py-2 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div className="flex gap-1">
              {["all","platform","customer","tenant"].map(s => (
                <button key={s} onClick={() => setScopeFilter(s)}
                  className={cn("flex-1 py-1 text-[10px] font-semibold rounded border capitalize transition-all",
                    scopeFilter === s ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40")}>
                  {s}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground px-0.5">{filtered.length} role{filtered.length !== 1 ? "s" : ""} · {systemCount} system · {customCount} custom</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 min-h-0">
            {filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Shield size={24} className="opacity-20 mx-auto mb-2" />
                <p className="text-xs">{roles.length === 0 ? "No roles loaded — try refreshing" : "No matching roles"}</p>
              </div>
            ) : filtered.map(r => {
              const allowN = r.rolePermissions.filter(p => p.effect === "ALLOW").length;
              const denyN  = r.rolePermissions.filter(p => p.effect === "DENY").length;
              const isSelected = selectedRole?.id === r.id;
              return (
                <button key={r.id} onClick={() => setSelectedRole(r)} className={cn(
                  "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-border/80 bg-card hover:bg-muted/20")}>
                  <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: (r.color || "#6366f1") + "25", color: r.color || "#6366f1" }}>
                    <RoleIcon icon={r.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-semibold text-foreground truncate">{r.name}</span>
                      {r.isSystem && <span className="text-[9px] font-bold px-1 py-0.5 bg-muted border border-border rounded text-muted-foreground uppercase shrink-0">Sys</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={cn("text-[9px] font-bold px-1 py-0.5 rounded border capitalize", SCOPE_STYLE[r.scope])}>{r.scope}</span>
                      {allowN > 0 && <span className="text-[10px] text-emerald-600 dark:text-emerald-400">{allowN}✓</span>}
                      {denyN  > 0 && <span className="text-[10px] text-rose-500">{denyN}✗</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{r._count.users} users · {allowN + denyN} permissions</p>
                  </div>
                  {!r.isSystem && (
                    <div className="flex flex-col gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => { setEditingRole(r); setShowBuilder(true); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Edit size={11} /></button>
                      <button onClick={() => { cloneRole(r.id, `${r.name} (Copy)`, currentUser?.email || "system").then(res => { if (res.success) { toast.success("Cloned"); load(); } }); }}
                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"><Copy size={11} /></button>
                      <button onClick={() => { if (confirm(`Delete "${r.name}"?`)) deleteCustomRole(r.id).then(res => { if (res.success) { toast.success("Deleted"); setSelectedRole(null); load(); } }); }}
                        className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 size={11} /></button>
                    </div>
                  )}
                  {r.isSystem && (
                    <button onClick={e => { e.stopPropagation(); cloneRole(r.id, `${r.name} (Copy)`, currentUser?.email || "system").then(res => { if (res.success) { toast.success("Cloned — now customize it"); load(); } }); }}
                      className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground flex-shrink-0" title="Clone to customize">
                      <Copy size={11} />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right detail */}
        <div className="flex-1 overflow-hidden bg-card border border-border rounded-lg">
          {selectedRole ? (
            <RoleDetail role={selectedRole} permissions={perms}
              onEdit={() => { setEditingRole(selectedRole); setShowBuilder(true); }}
              onClose={() => setSelectedRole(null)} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Shield size={36} className="opacity-15" />
              <p className="text-sm font-medium">Select a role to see its permissions</p>
              <p className="text-xs text-muted-foreground">{roles.length} roles loaded</p>
            </div>
          )}
        </div>
      </div>
    );

    if (tab === "matrix") return (
      <div key="matrix" className="h-full bg-card border border-border rounded-lg overflow-hidden flex flex-col">
        <div className="px-5 py-3.5 border-b border-border flex-shrink-0">
          <h3 className="text-sm font-bold">Permission Matrix</h3>
          <p className="text-xs text-muted-foreground">All roles × all permissions — green = Allow, red = Deny</p>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="text-xs border-collapse w-max min-w-full">
            <thead>
              <tr>
                <th className="sticky left-0 bg-card z-10 px-3 py-2 text-left font-semibold text-muted-foreground border-b border-r border-border min-w-[200px]">Permission</th>
                {roles.map(r => (
                  <th key={r.id} className="px-2 py-2 border-b border-border text-center min-w-[80px]">
                    <div className="flex flex-col items-center gap-1">
                      <div className="w-5 h-5 rounded flex items-center justify-center" style={{ backgroundColor: (r.color || "#6366f1") + "25", color: r.color || "#6366f1" }}><RoleIcon icon={r.icon} size={11} /></div>
                      <span className="text-[9px] leading-tight max-w-[70px] text-center break-words">{r.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(perms.reduce<Record<string, Permission[]>>((a, p) => { (a[p.category] = a[p.category] || []).push(p); return a; }, {})).map(([cat, catPerms]) => (
                <React.Fragment key={cat}>
                  <tr>
                    <td colSpan={roles.length + 1} className="px-3 py-1 bg-muted/40 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-y border-border/40">{cat}</td>
                  </tr>
                  {catPerms.map(p => (
                    <tr key={p.id} className="hover:bg-muted/20 border-b border-border/20">
                      <td className="sticky left-0 bg-card px-3 py-1.5 text-foreground/70 border-r border-border/30 whitespace-nowrap">{p.displayName}</td>
                      {roles.map(r => {
                        const rp = r.rolePermissions.find(x => x.permissionId === p.id);
                        return (
                          <td key={r.id} className="px-2 py-1.5 text-center">
                            {rp?.effect === "ALLOW" ? <span className="inline-flex w-4 h-4 items-center justify-center rounded-full bg-emerald-500/10"><Check size={9} className="text-emerald-500" /></span> :
                             rp?.effect === "DENY"  ? <span className="inline-flex w-4 h-4 items-center justify-center rounded-full bg-rose-500/10"><X size={9} className="text-rose-500" /></span> :
                             <span className="text-muted-foreground/30 text-[10px]">—</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );

    if (tab === "sod") return (
      <div key="sod" className="h-full bg-card border border-border rounded-lg overflow-y-auto p-5">
        <SodPanel rules={sod} roles={roles} onRefresh={load} />
      </div>
    );

    if (tab === "mfa") return (
      <div key="mfa" className="h-full bg-card border border-border rounded-lg overflow-y-auto p-5">
        <MfaPanel customerId={activeCustomer?.id} />
      </div>
    );

    return null;
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center"><Key size={15} className="text-primary" /></div>
          <div>
            <h1 className="text-xl font-bold text-foreground leading-none">IAM & RBAC</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Identity, Authorization & Access Governance</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-3 text-xs text-muted-foreground border-r border-border pr-3">
            <span><span className="font-bold text-foreground">{systemCount}</span> system</span>
            <span><span className="font-bold text-foreground">{customCount}</span> custom</span>
            <span><span className="font-bold text-foreground">{perms.length}</span> permissions</span>
          </div>
          <button onClick={load} className="p-2 rounded-md bg-muted/40 border border-border hover:bg-muted transition-colors">
            <RefreshCw size={13} className={cn("text-muted-foreground", loading && "animate-spin")} />
          </button>
          {(tab === "roles" || tab === "builder") && (
            <Button size="sm" onClick={() => { setEditingRole(null); setShowBuilder(true); switchTab("builder"); }}>
              <Plus size={13} /> New Role
            </Button>
          )}
        </div>
      </header>

      {/* Platform restriction notice */}
      {!isPlatformAdmin && (
        <div className="flex items-center gap-2 px-3 py-2 mb-3 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground flex-shrink-0">
          <Lock size={12} className="flex-shrink-0" />
          Platform-scoped roles can only be created by Platform Administrators. You can create and edit tenant and customer-scoped roles.
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-border mb-4 flex-shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            className={cn("flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-all",
              tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content — no AnimatePresence wrapper to keep it simple */}
      <div className="flex-1 overflow-hidden min-h-0">
        {renderContent()}
      </div>
    </div>
  );
}

// ─── Export with Suspense ─────────────────────────────────────────────────────
export default function IamPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-full">
        <Loader2 size={22} className="animate-spin text-primary" />
      </div>
    }>
      <IamPageInner />
    </Suspense>
  );
}
