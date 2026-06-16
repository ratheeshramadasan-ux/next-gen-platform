"use client";

/**
 * Access Management — Phase I DU Rollout
 * Menu: Document Reader > Project > Access
 *
 * Role-based access control per DU project.
 * Roles: Viewer, Trainer, Reviewer, Publisher, Admin
 */

import React, { useState } from "react";
import {
  Shield, Users, Plus, Trash2, ChevronDown, CheckCircle2,
  X, Search, User, Crown, Eye, PencilLine, ShieldCheck,
  Lock, Unlock, Clock, AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type DURole = "viewer" | "trainer" | "reviewer" | "publisher" | "admin";

interface ProjectMember {
  id: string;
  name: string;
  email: string;
  role: DURole;
  addedAt: string;
  lastActive: string;
  avatar?: string;
}

// ─── Role definitions ──────────────────────────────────────────────────────────

const ROLES: {
  id: DURole;
  label: string;
  desc: string;
  icon: React.ElementType;
  color: string;
  permissions: string[];
}[] = [
  {
    id: "viewer",
    label: "Viewer",
    desc: "Read-only access to model results and dashboard",
    icon: Eye,
    color: "text-muted-foreground",
    permissions: ["View dashboard", "View extracted fields", "Download approved exports"],
  },
  {
    id: "trainer",
    label: "Trainer",
    desc: "Upload documents and train models",
    icon: PencilLine,
    color: "text-cyan-500",
    permissions: ["All Viewer", "Upload training documents", "Configure OCR pipeline", "Run extraction"],
  },
  {
    id: "reviewer",
    label: "Reviewer",
    desc: "Validate and approve extracted data",
    icon: CheckCircle2,
    color: "text-amber-500",
    permissions: ["All Trainer", "Review & approve extractions", "Flag document quality issues"],
  },
  {
    id: "publisher",
    label: "Publisher",
    desc: "Deploy models to staging and production",
    icon: ShieldCheck,
    color: "text-primary",
    permissions: ["All Reviewer", "Publish to staging/UAT", "Configure schedules"],
  },
  {
    id: "admin",
    label: "Admin",
    desc: "Full control including access management",
    icon: Crown,
    color: "text-rose-500",
    permissions: ["All Publisher", "Manage access & roles", "Delete project", "Publish to production"],
  },
];

// ─── Mock members ─────────────────────────────────────────────────────────────

const INITIAL_MEMBERS: ProjectMember[] = [
  { id: "u1", name: "Ratheesh Ramadasan", email: "ratheesh@company.com", role: "admin", addedAt: "Owner", lastActive: "Now" },
  { id: "u2", name: "Priya Sharma", email: "priya@company.com", role: "reviewer", addedAt: "2 weeks ago", lastActive: "Today" },
  { id: "u3", name: "James Wu", email: "james@company.com", role: "trainer", addedAt: "1 month ago", lastActive: "Yesterday" },
  { id: "u4", name: "Sarah Mitchell", email: "sarah@company.com", role: "viewer", addedAt: "3 days ago", lastActive: "2h ago" },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: DURole }) {
  const def = ROLES.find(r => r.id === role)!;
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border",
      role === "admin" ? "text-rose-500 bg-rose-500/10 border-rose-500/20" :
      role === "publisher" ? "text-primary bg-primary/10 border-primary/20" :
      role === "reviewer" ? "text-amber-500 bg-amber-500/10 border-amber-500/20" :
      role === "trainer" ? "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" :
      "text-muted-foreground bg-muted border-border"
    )}>
      <def.icon size={9} />
      {def.label}
    </span>
  );
}

function RoleSelector({
  value, onChange, disabled
}: { value: DURole; onChange: (r: DURole) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const current = ROLES.find(r => r.id === value)!;

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-2 text-[10px] font-black uppercase px-3 py-1.5 rounded-lg border transition-all",
          disabled ? "opacity-40 cursor-not-allowed border-border" : "border-border hover:border-primary/50 hover:bg-muted/40"
        )}
      >
        <current.icon size={12} className={current.color} />
        {current.label}
        {!disabled && <ChevronDown size={11} className="text-muted-foreground" />}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
          {ROLES.map(r => (
            <button
              key={r.id}
              onClick={() => { onChange(r.id); setOpen(false); }}
              className="w-full flex items-start gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
            >
              <r.icon size={13} className={cn("shrink-0 mt-0.5", r.color)} />
              <div>
                <p className="text-[10px] font-black text-foreground uppercase">{r.label}</p>
                <p className="text-[9px] text-muted-foreground">{r.desc}</p>
              </div>
              {value === r.id && <CheckCircle2 size={12} className="text-primary shrink-0 mt-0.5 ml-auto" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member, onRemove, onRoleChange
}: {
  member: ProjectMember;
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: DURole) => void;
}) {
  const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const isOwner = member.addedAt === "Owner";

  return (
    <div className="flex items-center gap-4 py-3 border-b border-border/30 last:border-0">
      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[12px] font-black text-primary shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-[11px] font-black text-foreground truncate">{member.name}</p>
          {isOwner && <Crown size={11} className="text-amber-500 shrink-0" />}
        </div>
        <p className="text-[9px] text-muted-foreground truncate">{member.email}</p>
      </div>
      <div className="text-[9px] text-muted-foreground shrink-0 hidden md:block">
        <span className="flex items-center gap-1"><Clock size={9} /> {member.lastActive}</span>
      </div>
      <RoleSelector
        value={member.role}
        onChange={role => onRoleChange(member.id, role)}
        disabled={isOwner}
      />
      {!isOwner && (
        <button
          onClick={() => onRemove(member.id)}
          className="w-8 h-8 rounded-lg border border-border text-muted-foreground hover:border-rose-500/50 hover:text-rose-500 hover:bg-rose-500/5 flex items-center justify-center transition-all shrink-0"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function AccessManagement({ projectName = "Current Project" }: { projectName?: string }) {
  const [members, setMembers] = useState<ProjectMember[]>(INITIAL_MEMBERS);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<DURole>("trainer");
  const [activeTab, setActiveTab] = useState<"members" | "roles" | "audit">("members");
  const [search, setSearch] = useState("");

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    const newMember: ProjectMember = {
      id: `u${Date.now()}`,
      name: inviteEmail.split("@")[0],
      email: inviteEmail.trim(),
      role: inviteRole,
      addedAt: "Just now",
      lastActive: "Never",
    };
    setMembers(m => [...m, newMember]);
    setInviteEmail("");
  };

  const handleRemove = (id: string) => setMembers(m => m.filter(x => x.id !== id));
  const handleRoleChange = (id: string, role: DURole) => setMembers(m => m.map(x => x.id === id ? { ...x, role } : x));

  const TABS = [
    { id: "members" as const, label: "Members", count: members.length },
    { id: "roles" as const, label: "Role Matrix" },
    { id: "audit" as const, label: "Audit Log" },
  ];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-0 border-b border-border/40">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-black uppercase tracking-tight">Access Management</h2>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{projectName}</p>
          </div>
        </div>
        <div className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "px-4 py-2.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-colors",
                activeTab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {"count" in t && t.count !== undefined && (
                <span className="ml-1.5 text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === "members" && (
          <div className="space-y-6 max-w-3xl">
            {/* Invite */}
            <div className="bg-card border border-border/50 rounded-xl p-5">
              <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                <Plus size={13} className="text-primary" />
                Invite Member
              </h3>
              <div className="flex gap-3">
                <input
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleInvite()}
                  placeholder="colleague@company.com"
                  className="flex-1 h-10 px-3 rounded-lg bg-background border border-border text-[12px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                />
                <RoleSelector value={inviteRole} onChange={setInviteRole} />
                <button
                  onClick={handleInvite}
                  className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  Invite
                </button>
              </div>
            </div>

            {/* Members list */}
            <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/40">
                <h3 className="text-[11px] font-black text-foreground uppercase tracking-widest flex items-center gap-2 flex-1">
                  <Users size={13} className="text-primary" />
                  Members ({members.length})
                </h3>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="h-8 pl-8 pr-3 rounded-lg bg-background border border-border text-[11px] focus:outline-none focus:ring-1 focus:ring-primary/40 w-44"
                  />
                </div>
              </div>
              <div className="px-5">
                {filteredMembers.map(m => (
                  <MemberRow key={m.id} member={m} onRemove={handleRemove} onRoleChange={handleRoleChange} />
                ))}
                {filteredMembers.length === 0 && (
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest text-center py-8 opacity-40">No members found</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "roles" && (
          <div className="max-w-3xl space-y-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-6">
              Permission matrix — what each role can do on this project
            </p>
            {ROLES.map(role => (
              <div key={role.id} className="bg-card border border-border/50 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn("w-8 h-8 rounded-lg bg-muted flex items-center justify-center")}>
                    <role.icon size={16} className={role.color} />
                  </div>
                  <div>
                    <p className="text-[12px] font-black text-foreground uppercase">{role.label}</p>
                    <p className="text-[9px] text-muted-foreground">{role.desc}</p>
                  </div>
                  <span className="ml-auto text-[9px] font-black text-muted-foreground">
                    {members.filter(m => m.role === role.id).length} member(s)
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.map(p => (
                    <span key={p} className="text-[9px] font-bold text-muted-foreground bg-muted border border-border/50 px-2 py-1 rounded-md flex items-center gap-1">
                      <CheckCircle2 size={9} className="text-emerald-500" />
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "audit" && (
          <div className="max-w-3xl space-y-2">
            {[
              { user: "Ratheesh Ramadasan", action: "Changed Sarah Mitchell's role to Viewer", time: "3 days ago" },
              { user: "Ratheesh Ramadasan", action: "Invited Sarah Mitchell (Trainer)", time: "3 days ago" },
              { user: "Priya Sharma", action: "Approved 47 extracted fields in batch B-1291", time: "Today 11:30" },
              { user: "James Wu", action: "Uploaded 24 training documents", time: "Yesterday 16:45" },
              { user: "Ratheesh Ramadasan", action: "Published model v1.0.0 to Staging", time: "1 week ago" },
            ].map((e, i) => (
              <div key={i} className="flex items-start gap-3 bg-card border border-border/40 rounded-lg px-4 py-3">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-black text-primary shrink-0 mt-0.5">
                  {e.user[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-foreground"><span className="font-black">{e.user}</span> {e.action}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock size={9} /> {e.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
