"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Users, Shield, Fingerprint, Network, Settings, Plus, Search,
  ExternalLink, Layers, Key, ShieldCheck, Mail, Globe, Cloud,
  Activity, ArrowRightLeft, Lock, Trash2, Edit, ArrowRight,
  CheckSquare, Square, AlertTriangle, FolderOpen, RefreshCcw, CheckCircle2, MoreVertical, AlertCircle,
  User, Building2, X, RefreshCw, Check, Briefcase, ChevronDown, ChevronRight, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { Button } from "@/components/ui/button";


import {
  getIdentityUsers, getIdentityRoles, getIdentityGroups,
  getIdentityProviders, getGroupMappings, seedIdentityData, createGroupAction,
  createRoleAction, updateRoleAction, deleteRoleAction, getTenantsForCustomer, getFoldersForCustomer,
  getPendingUserRegistrations, approveUserRegistration,
  createGroupMappingAction, deleteGroupMappingAction
} from "@/app/actions/accessActions";
import { getSmtpConfig, saveSmtpConfig, testSmtpConnection, restorePlatformSmtpDefault } from "@/app/actions/smtpActions";
import { getGlobalAuditLogs } from "@/app/actions/tenantActions";
import { useAppContext } from "@/lib/context";

type TabType = "users" | "groups" | "security" | "approvals";

function AccessManagementContent() {
  const { currentUser } = useAppContext();
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTab = (searchParams.get("tab") as TabType) || "users";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Data States
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [providers, setProviders] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [userSearch, setUserSearch] = useState("");
  const [groupSearch, setGroupSearch] = useState("");
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: "users", label: "User Directory", icon: Users },
    { id: "groups", label: "Access Groups", icon: Network },
    { id: "approvals", label: "Pending Approvals", icon: ShieldCheck },
    { id: "security", label: "Identity Providers", icon: Settings },
  ];

  // Load All Data
  const fetchData = async () => {
    setIsLoading(true);
    setHasTimedOut(false);

    // Safety Timeout: If sync takes > 8s, something is likely stuck in the DB driver
    const timeoutHandle = setTimeout(() => {
      setHasTimedOut(true);
    }, 8000);

    try {
      await seedIdentityData();

      const [u, r, g, p, m, logs, pending] = await Promise.all([
        getIdentityUsers({
          role: currentUser.role,
          customerId: currentUser.customerId,
          tenantId: currentUser.tenantId
        }),
        getIdentityRoles(currentUser.role),
        getIdentityGroups(),
        getIdentityProviders(),
        getGroupMappings(),
        getGlobalAuditLogs(),
        getPendingUserRegistrations({ 
            role: currentUser.role, 
            customerId: currentUser.customerId, 
            tenantId: currentUser.tenantId 
        })
      ]);

      setUsers(u);
      setRoles(r);
      setGroups(g);
      setProviders(p);
      setMappings(m);
      setAuditLogs(logs);
      setPendingUsers(pending);
      clearTimeout(timeoutHandle);
    } catch (err) {
      console.error("Failed to hydrate Access Management:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentUser.email, currentUser.role, currentUser.customerId, currentUser.tenantId]);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    router.push(`/next-gen/admin/access?tab=${tabId}`);
  };

  useEffect(() => {
    if (initialTab) setActiveTab(initialTab);
  }, [initialTab]);

  return (
    <div className="flex flex-col gap-8 h-full">
      {/* Header Area */}
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl font-black tracking-tighter">Access Management</h1>
          <p className="text-muted-foreground text-sm font-medium">Enterprise Identity, Governance & Integration Hub</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchData()}
            className="rounded-sm bg-muted border border-border text-muted-foreground hover:text-primary hover:bg-muted transition-all"
          >
            <RefreshCcw size={18} className={cn("transition-all", isLoading && "animate-spin")} />
          </Button>

          {activeTab === "groups" && (
            <Button 
              onClick={() => setIsGroupModalOpen(true)}
              className="flex items-center gap-3 px-8 py-2.5 rounded-sm bg-primary shadow-xl shadow-primary/20 text-primary-foreground font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
            >
              <Plus size={18} />
              Create Access Group
            </Button>
          )}


        </div>
      </div>

      {/* Main Glassmorphic Layout */}
      <div className="flex-1 flex gap-8 min-h-0">

        {/* Left: Navigation Panel */}
        <div className="w-80 flex flex-col gap-3">
          {tabs.map((tab) => (
            <Button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              variant={activeTab === tab.id ? "default" : "ghost"}
              className={cn(
                "group relative h-auto flex items-center justify-start gap-4 p-5 rounded-sm transition-all duration-300 border border-transparent",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-2xl shadow-primary/30 active:scale-95"
                  : "bg-card/40 hover:bg-card hover:border-border/60"
              )}
            >
              <div className={cn(
                "p-3 rounded-sm transition-all",
                activeTab === tab.id ? "bg-white/20" : "bg-muted text-muted-foreground group-hover:text-primary"
              )}>
                <tab.icon size={22} strokeWidth={2.5} />
              </div>
              <div className="flex flex-col items-start gap-0.5">
                <span className="text-xs font-black uppercase tracking-widest opacity-60">Section</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-tighter">{tab.label}</span>
                  {tab.id === "approvals" && pendingUsers.length > 0 && (
                    <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-black rounded-full animate-pulse shadow-lg shadow-rose-500/20">
                      {pendingUsers.length}
                    </span>
                  )}
                </div>
              </div>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="activeGlow"
                  className="absolute inset-0 rounded-sm border-2 border-white/20 pointer-events-none"
                />
              )}
            </Button>
          ))}


          {/* Integration Status Footer (Visual Only) */}
          <div className="mt-auto p-8 rounded-sm bg-card/40 border border-border flex flex-col gap-5 overflow-hidden group">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none">Global Sync</span>
                <span className="text-xs font-black text-emerald-500 leading-none">Healthy</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                <Activity size={14} className="text-emerald-500 animate-pulse" />
              </div>
            </div>
            <p className="text-[10px] font-medium text-muted-foreground leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
              Identity replication is active across regional SQL pods.
            </p>
          </div>
        </div>

        {/* Content Portal */}
        <div className="flex-1 bg-card/40 backdrop-blur-xl rounded-sm border border-border shadow-2xl overflow-hidden relative transition-all duration-700">
          {isLoading && (
            <div className="absolute inset-0 z-50 bg-card/80 backdrop-blur-sm flex items-center justify-center">
              <div className="flex flex-col items-center gap-6 p-8 rounded-sm bg-card border border-border shadow-2xl max-w-sm text-center">
                {!hasTimedOut ? (
                  <>
                    <div className="w-16 h-16 rounded-sm bg-primary/20 flex items-center justify-center animate-pulse">
                      <Lock size={32} className="text-primary" />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-xs font-black text-primary uppercase tracking-[0.2em] animate-pulse">Syncing Identity Cache...</span>
                      <p className="text-[10px] text-muted-foreground font-medium">Establishing regional SQL bridge</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-sm bg-rose-500/10 flex items-center justify-center text-rose-500">
                      <AlertCircle size={32} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-black text-foreground tracking-tight">Sync is taking longer than expected.</span>
                      <p className="text-xs text-muted-foreground font-medium">The database bridge might be locked or cold-booting. You can wait or attempt a refresh.</p>
                    </div>
                    <Button
                      onClick={() => fetchData()}
                      variant="default"
                      className="w-full py-3 rounded-sm bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-primary/20"
                    >
                      Retry Sync Now
                    </Button>

                  </>
                )}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="h-full flex flex-col"
            >
              {activeTab === "users" && <UsersTabView users={users} searchQuery={userSearch} onSearchChange={setUserSearch} />}
              {activeTab === "groups" && <GroupsTabView groups={groups} searchQuery={groupSearch} onSearchChange={setGroupSearch} />}
              {activeTab === "security" && <SecurityTabView providers={providers} mappings={mappings} roles={roles} groups={groups} />}
              {activeTab === "approvals" && (
                 <UserApprovalsTabView 
                   pendingUsers={pendingUsers} 
                   roles={roles}
                   isLoading={isLoading} 
                   onRefresh={fetchData}
                 />
               )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Global Modals */}
        <CreateGroupModal 
          isOpen={isGroupModalOpen} 
          onClose={() => setIsGroupModalOpen(false)} 
          onRefresh={fetchData}
          roles={roles}
        />

        <CreateRoleModal
          isOpen={isRoleModalOpen}
          onClose={() => { setIsRoleModalOpen(false); setEditingRole(null); }}
          onRefresh={fetchData}
          editRole={editingRole}
        />

        {/* Right: Chronicle */}
        <div className="w-80 flex flex-col bg-card/40 backdrop-blur-md overflow-hidden border-l border-border/40">
          <div className="p-8 border-b border-border/60 flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Global Audit Trail</span>
              <Activity size={14} className="text-primary animate-pulse" />
            </div>
            <p className="text-xs text-muted-foreground font-medium leading-relaxed">
              Real-time stream of all integration, identity, and global hierarchy modifications.
            </p>
          </div>

          <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-8 custom-scrollbar">
            <div className="flex items-center gap-3">
              <IconWrapper icon={RefreshCcw} size={14} className="text-primary" />
              <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Event Feed</span>
            </div>

            <div className="flex flex-col gap-8 relative">
              <div className="absolute left-1.5 top-2 bottom-0 w-[1px] bg-border border-dashed" />
              {auditLogs.length === 0 ? (
                <div className="pl-6 text-xs text-muted-foreground font-medium">No recent log events found.</div>
              ) : auditLogs.map((log: any) => {
                let meta: any = null;
                try { meta = JSON.parse(log.metadata); } catch { meta = null; }
                return (
                  <details key={log.id} className="pl-6 relative group">
                    <summary className="flex flex-col gap-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                      <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full bg-primary border-4 border-card" />
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black tracking-widest text-primary uppercase">{(new Date(log.timestamp)).toLocaleDateString()}</span>
                        <span className="text-[9px] font-black tracking-widest text-muted-foreground uppercase">{(new Date(log.timestamp)).toLocaleTimeString()}</span>
                      </div>
                      <span className="text-[11px] font-black tracking-tight leading-none text-foreground">
                        {log.action.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium text-muted-foreground leading-tight">{log.target}</span>
                        <span className="text-[9px] text-primary font-bold opacity-0 group-hover:opacity-100 transition-opacity">Details ▸</span>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground/70">By: {log.role}</span>
                    </summary>
                    {meta && (
                      <div className="mt-2 ml-0 bg-muted/50 border border-border/60 rounded-sm p-3 flex flex-col gap-1">
                        {Object.entries(meta).filter(([k]) => k !== 'password' && k !== 'targetScope').map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between text-[9px]">
                            <span className="font-bold text-muted-foreground uppercase tracking-wider">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                            <span className="font-black text-foreground text-right max-w-[150px] truncate">{String(val)}</span>
                          </div>
                        ))}
                        {meta.targetScope && (
                          <div className="mt-1 pt-1 border-t border-border/40 text-[8px] font-black text-primary uppercase tracking-tighter">
                            Scope: {meta.targetScope}
                          </div>
                        )}
                      </div>
                    )}
                  </details>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Tab Components (DB Linked) ---

function UsersTabView({ users, searchQuery, onSearchChange }: { users: any[], searchQuery: string, onSearchChange: (val: string) => void }) {
  // Elevation weights for user sorting
  const weightMap: Record<string, number> = {
    "Platform Admin": 100,
    "Admin User": 90,
    "Tenant Admin": 80,
    "Executive / CXO": 70,
    "Business Unit Head": 65,
    "RPA CoE Lead / Automation Director": 60,
    "Solution Architect (RPA + AI)": 55,
    "Security & Compliance Officer": 50,
    "Technical Architect": 45,
    "RPA Developer (Senior / Junior)": 40,
    "AI/ML Engineer": 35,
    "QA / Test Engineer": 30,
    "Bot Controller / Operator": 25,
    "Support Engineer (L2/L3)": 20,
    "Infrastructure Admin": 15,
    "Business SME (Subject Matter Expert)": 10,
    "Process Owner": 5,
    "Business User (End User / Citizen User)": 1
  };

  const getHighestWeight = (user: any) => {
    if (!user.roles || user.roles.length === 0) return 0;
    return Math.max(...user.roles.map((r: any) => weightMap[r.name] || 0));
  };

  const filteredUsers = users
    .filter(u => 
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => getHighestWeight(b) - getHighestWeight(a));

  return (
    <div className="p-10 flex flex-col h-full gap-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Users & Teams
            <span className="text-xs bg-muted/50 border border-border px-3 py-1 rounded-full font-bold text-muted-foreground uppercase opacity-60">{filteredUsers.length} Records</span>
          </h2>
        </div>
        <div className="relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Search directory..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-background/50 border border-border rounded-sm py-3 pl-12 pr-4 text-xs font-bold outline-none group-hover:border-primary/50 focus:border-primary transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 bg-card/40 rounded-sm border border-border overflow-hidden flex flex-col">
        <div className="grid grid-cols-12 gap-4 px-8 py-6 bg-muted/20 border-b border-border text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          <div className="col-span-4">Full Identity</div>
          <div className="col-span-3">RBAC Designation</div>
          <div className="col-span-3 uppercase">Status</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-20 text-center opacity-40">
              <Layers className="w-16 h-16 mb-4" />
              <h3 className="text-xl font-black">{searchQuery ? "No matching records found." : "No identity records found in database."}</h3>
              <p className="max-w-xs text-sm font-medium mt-2">{searchQuery ? "Try a different search term." : "Initialize the system or check your connection parameters."}</p>
            </div>
          ) : (
            filteredUsers.map((u, i) => (
              <div key={u.id} className="grid grid-cols-12 gap-4 px-8 py-6 border-b border-border/50 items-center hover:bg-primary/5 transition-all group">
                <div className="col-span-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-sm bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-black text-primary">
                    {u.fullName?.charAt(0) || u.email.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-black tracking-tighter leading-none">{u.fullName || "Unnamed Principal"}</span>
                    <span className="text-[11px] font-medium text-muted-foreground opacity-60">{u.email}</span>
                  </div>
                </div>
                <div className="col-span-3 flex flex-wrap gap-1.5">
                  {u.roles?.map((r: any) => (
                    <span key={r.id} className={cn(
                      "px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-tighter shadow-sm",
                      (r.name === "Platform Admin" || r.name === "Admin User") ? "bg-amber-500/10 border-amber-500/20 text-amber-600" : "bg-primary/10 border-primary/20 text-primary"
                    )}>
                      {r.name}
                    </span>
                  )) || <span className="opacity-40 text-xs">No roles assigned</span>}
                </div>
                <div className="col-span-3 flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,0,0,0.1)]",
                    u.status === "active" || u.status === "Protected" ? "bg-emerald-500 shadow-emerald-500/50" : "bg-amber-500 shadow-amber-500/50"
                  )} />
                  <span className="text-xs font-black uppercase tracking-tight">{u.status}</span>
                </div>
                <div className="col-span-2 flex justify-end gap-2 pr-2">
                  <Button variant="outline" size="icon-sm" className="bg-card hover:border-primary hover:text-primary">
                    <Edit size={14} />
                  </Button>
                  <Button variant="destructive" size="icon-sm" className="shadow-sm">
                    <Trash2 size={14} />
                  </Button>
                </div>

              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function RolesTabView({ roles, onOpenCreate, onEdit }: { roles: any[], onOpenCreate: () => void, onEdit: (role: any) => void }) {
  return (
    <div className="p-10 flex flex-col h-full gap-10">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
            Authorization Matrix
            <span className="text-xs bg-muted/50 border border-border px-3 py-1 rounded-full font-bold text-muted-foreground uppercase opacity-60">{roles.length} Defined Roles</span>
          </h2>
        </div>
        <Button 
          variant="outline" 
          onClick={onOpenCreate}
          className="px-6 py-2.5 rounded-sm bg-muted border border-border text-xs font-black uppercase tracking-widest hover:text-primary hover:border-primary transition-all flex items-center gap-2"
        >
          <Plus size={16} /> New Role Definition
        </Button>

      </div>

      <div className="grid grid-cols-2 gap-8 flex-1 overflow-y-auto custom-scrollbar pr-4">
        {roles.map((r) => (
          <div 
            key={r.id} 
            onClick={() => !r.isSystem && onEdit(r)}
            className={cn(
              "group bg-card/40 rounded-sm border border-border p-8 flex flex-col gap-6 hover:border-primary transition-all shadow-sm h-fit",
              !r.isSystem && "cursor-pointer"
            )}
          >
            <div className="flex justify-between items-start">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-black tracking-tight">{r.name}</h3>
                  {r.isSystem && (
                    <span className="bg-primary/10 text-primary text-[8px] px-2 py-0.5 rounded-full font-black uppercase border border-primary/20 flex items-center gap-1">
                      <Lock size={8} /> System Protected
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-medium">{r.description || "No description provided."}</p>
              </div>
              {!r.isSystem && (
                <Button variant="ghost" size="icon-sm" className="p-2 rounded-sm border border-border group-hover:border-primary transition-all">
                  <MoreVertical size={16} />
                </Button>
              )}

            </div>

            <div className="flex flex-col gap-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Permission Manifest</span>
              <div className="flex flex-wrap gap-2">
                {JSON.parse(r.permissions || "[]").map((perm: string) => (
                  <span key={perm} className="px-3 py-1.5 rounded-sm bg-background/50 border border-border text-[10px] font-bold text-foreground hover:border-primary/50 transition-all">{perm}</span>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-border flex items-center justify-between mt-auto">
              <div className="flex items-center gap-2 text-xs font-black opacity-60">
                <Users size={14} />
                <span>{r._count?.users || 0} Managed Principals</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Enforce Active</span>
                <div className="w-10 h-5 rounded-full bg-primary relative">
                  <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Category styles — theme-aware, no hardcoded colors ──────────────────────
const CATEGORY_STYLE: Record<string, { bg: string; text: string; border: string; icon: React.ElementType }> = {
  Administration: { bg: "bg-primary/8",  text: "text-primary",            border: "border-primary/20",  icon: Building2 },
  Security:       { bg: "bg-primary/8",  text: "text-primary",            border: "border-primary/20",  icon: ShieldCheck },
  Governance:     { bg: "bg-primary/8",  text: "text-primary",            border: "border-primary/20",  icon: Layers },
  Development:    { bg: "bg-muted/40",   text: "text-foreground",         border: "border-border",      icon: User },
  Business:       { bg: "bg-muted/40",   text: "text-foreground",         border: "border-border",      icon: Briefcase },
  Analytics:      { bg: "bg-muted/40",   text: "text-muted-foreground",   border: "border-border",      icon: Activity },
  Custom:         { bg: "bg-muted/30",   text: "text-muted-foreground",   border: "border-border",      icon: Network },
};

function GroupCard({ group, onEdit, onDelete }: { group: any; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const style = CATEGORY_STYLE[group.category] || CATEGORY_STYLE.Custom;
  const Icon = style.icon;

  return (
    <div className={cn(
      "flex flex-col border rounded-lg overflow-hidden transition-all hover:shadow-md",
      group.isPrebuilt ? `${style.border} bg-card` : "border-border bg-card/60"
    )}>
      {/* Card Header */}
      <div className={cn("px-5 py-4 flex items-start justify-between gap-3", group.isPrebuilt ? style.bg : "bg-muted/20")}>
        <div className="flex items-start gap-3 min-w-0">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", style.bg, "border", style.border)}>
            <Icon size={16} className={style.text} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-foreground leading-tight">{group.name}</h3>
              {group.isPrebuilt && (
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider flex-shrink-0", style.bg, style.text, style.border)}>
                  Pre-built
                </span>
              )}
            </div>
            <span className={cn("text-[10px] font-semibold mt-0.5 block", style.text)}>{group.category}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {!group.isPrebuilt && (
            <>
              <button onClick={onEdit} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><Edit size={12} /></button>
              <button onClick={onDelete} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 size={12} /></button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <div className="px-5 py-3 flex-1 space-y-3">
        <p className="text-[11px] text-muted-foreground leading-relaxed">{group.displayDescription || group.description || "Access group"}</p>

        {/* Default Roles */}
        {group.defaultRoles?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {group.defaultRoles.map((roleName: string) => (
              <span key={roleName} className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", style.bg, style.text, style.border)}>
                {roleName}
              </span>
            ))}
          </div>
        )}

        {/* Rationale — expandable */}
        {group.rationale && (
          <div>
            <button onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
              <AlertCircle size={10} className="text-amber-500" />
              Why this group exists
              {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
            </button>
            {expanded && (
              <div className="mt-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">{group.rationale}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-border/60 flex items-center justify-between bg-muted/10">
        <div className="flex items-center gap-1.5">
          <Users size={11} className="text-muted-foreground" />
          <span className="text-[10px] font-semibold text-muted-foreground">{group._count?.users || 0} members</span>
        </div>
        <button className={cn("flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider transition-all hover:gap-2", style.text)}>
          Manage <ArrowRight size={10} />
        </button>
      </div>
    </div>
  );
}

function GroupsTabView({ groups, searchQuery, onSearchChange }: { groups: any[], searchQuery: string, onSearchChange: (val: string) => void }) {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const categories = ["all", ...Array.from(new Set(groups.map((g: any) => g.category || "Custom"))).sort()];

  const filtered = groups.filter(g => {
    const matchSearch = !searchQuery ||
      g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.displayDescription || g.description || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.rationale || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.defaultRoles || []).some((r: string) => r.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchCat = categoryFilter === "all" || (g.category || "Custom") === categoryFilter;
    return matchSearch && matchCat;
  });

  const prebuiltCount = groups.filter(g => g.isPrebuilt).length;
  const customCount   = groups.filter(g => !g.isPrebuilt).length;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border flex-shrink-0 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">Access Groups & Teams</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pre-built groups implement the IAM framework. Add users to groups instead of assigning roles individually.
              <span className="ml-2 font-semibold text-primary">{prebuiltCount} pre-built · {customCount} custom</span>
            </p>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="text" placeholder="Search groups, roles, rationale..." value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              className="w-72 pl-8 pr-4 py-2 text-sm bg-muted/40 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all" />
          </div>
        </div>

        {/* Category filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {categories.map(cat => {
            const style = CATEGORY_STYLE[cat] || CATEGORY_STYLE.Custom;
            const count = cat === "all" ? groups.length : groups.filter(g => (g.category || "Custom") === cat).length;
            return (
              <button key={cat} onClick={() => setCategoryFilter(cat)}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all capitalize",
                  categoryFilter === cat
                    ? cat === "all" ? "bg-primary/10 text-primary border-primary/30" : cn(style.bg, style.text, style.border)
                    : "bg-muted/30 text-muted-foreground border-border hover:border-border/80")}>
                {cat === "all" ? <Network size={10} /> : <style.icon size={10} />}
                {cat} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Network size={32} className="opacity-20 mb-3" />
            <p className="text-sm font-semibold">{searchQuery ? `No groups match "${searchQuery}"` : "No groups found"}</p>
          </div>
        ) : (
          <>
            {/* Pre-built groups */}
            {filtered.some(g => g.isPrebuilt) && (
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pre-built Groups</h3>
                  <div className="flex-1 h-px bg-border/60" />
                  <span className="text-[10px] text-muted-foreground">Seeded from the IAM Framework — edit members, not the group itself</span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.filter(g => g.isPrebuilt).map(g => (
                    <GroupCard key={g.id} group={g} onEdit={() => {}} onDelete={() => {}} />
                  ))}
                </div>
              </div>
            )}

            {/* Custom groups */}
            {filtered.some(g => !g.isPrebuilt) && (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Custom Groups</h3>
                  <div className="flex-1 h-px bg-border/60" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.filter(g => !g.isPrebuilt).map(g => (
                    <GroupCard key={g.id} group={g} onEdit={() => {}} onDelete={() => {}} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function CreateRoleModal({ isOpen, onClose, onRefresh, editRole }: { 
  isOpen: boolean, 
  onClose: () => void, 
  onRefresh: () => void,
  editRole?: any
}) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const [menuAccess, setMenuAccess] = useState<string[]>([]);
  const [functionPerms, setFunctionPerms] = useState<Record<string, string[]>>({});
  const [selectedTenants, setSelectedTenants] = useState<string[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

  useEffect(() => {
    if (editRole) {
      setName(editRole.name);
      setDescription(editRole.description || "");
      try {
        const perms = JSON.parse(editRole.permissions || "[]");
        // Legacy check: sometimes permissions is an array of strings, sometimes a single JSON string
        const parsed = typeof perms[0] === 'string' && perms[0].startsWith('{') 
          ? JSON.parse(perms[0]) 
          : { menus: [], functions: {}, tenants: [], folders: [] };
          
        setMenuAccess(parsed.menus || []);
        setFunctionPerms(parsed.functions || {});
        setSelectedTenants(parsed.tenants || []);
        setSelectedFolders(parsed.folders || []);
      } catch (e) {
        console.error("Error parsing role permissions", e);
      }
    } else {
      setName("");
      setDescription("");
      setMenuAccess([]);
      setFunctionPerms({});
      setSelectedTenants([]);
      setSelectedFolders([]);
    }
    setStep(1);
  }, [editRole, isOpen]);

  const { activeCustomer } = useAppContext();
  const [tenants, setTenants] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && activeCustomer) {
      async function loadContext() {
        const [t, f] = await Promise.all([
          getTenantsForCustomer(activeCustomer!.id),
          getFoldersForCustomer(activeCustomer!.id)
        ]);
        setTenants(t || []);
        setFolders(f || []);
      }
      loadContext();
    }
  }, [isOpen, activeCustomer]);

  const menuOptions = [
    { id: "LIFECYCLE", label: "Automation Lifecycle", path: "/next-gen/lifecycle" },
    { id: "TENANT_HUB", label: "Tenant Hub", path: "/next-gen/workspace" },
    { id: "STUDIO", label: "Builder Studio", path: "/next-gen/studio" },
    { id: "MONITORING", label: "Robot Monitoring", path: "/next-gen/bot-monitoring" },
    { id: "AGENTS", label: "Robot Agents", path: "/next-gen/bot-agents" },
    { id: "ADMIN", label: "Organization Admin", path: "/next-gen/admin" },
  ];

  const functionalModules = [
    { category: "Lifecycle", items: [
      { id: "ASSESSMENT", label: "Project Assessment" },
      { id: "ROI_CALC", label: "ROI Calculator" },
      { id: "PRIORITIZATION", label: "Prioritization" },
      { id: "REQUIREMENTS", label: "Requirements Gathering" },
      { id: "REVIEW_APPROVAL", label: "Review & Approval" },
    ]},
    { category: "Tenant Hub", items: [
      { id: "PROJECTS", label: "Project Registry" },
      { id: "PROCESSES", label: "Business Processes" },
      { id: "QUEUES", label: "Queue Operations" },
      { id: "SCHEDULES", label: "Schedules" },
      { id: "ASSETS", label: "Workspace Assets" },
      { id: "LOGS", label: "Execution Logs" },
    ]},
    { category: "Builder Studio", items: [
      { id: "STUDIO_DESIGNER", label: "Visual Designer" },
      { id: "AI_BUILDER", label: "AI Builder" },
      { id: "BOT_LIBRARY", label: "Robot Library" },
      { id: "OBJECT_FINDER", label: "Object Finder" },
      { id: "STUDIO_ASSETS", label: "Global Assets" },
      { id: "DEPLOYMENT", label: "Deployment Engine" },
    ]},
    { category: "Governance", items: [
      { id: "MONITORING", label: "Robot Monitoring" },
      { id: "AGENT_SETUP", label: "Agent Activation" },
      { id: "USER_DIRECTORY", label: "User Directory" },
      { id: "ACCESS_GROUPS", label: "Access Groups" },
      { id: "CUSTOM_ROLES", label: "Custom Role Management" },
      { id: "FOLDERS", label: "Folder Architecture" },
    ]}
  ];

  const crudOps = ["View", "Create", "Modify", "Delete", "Execute", "Upload"];

  const toggleMenu = (id: string) => {
    setMenuAccess(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const toggleFuncPerm = (mod: string, op: string) => {
    setFunctionPerms(prev => {
      const current = prev[mod] || [];
      const updated = current.includes(op) ? current.filter(o => o !== op) : [...current, op];
      return { ...prev, [mod]: updated };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSaving(true);
    
    const permissionsPayload = {
      menus: menuAccess,
      functions: functionPerms,
      tenants: selectedTenants,
      folders: selectedFolders
    };

    const result = editRole 
      ? await updateRoleAction(editRole.id, { 
          name, 
          description, 
          permissions: [JSON.stringify(permissionsPayload)] 
        })
      : await createRoleAction({ 
          name, 
          description, 
          permissions: [JSON.stringify(permissionsPayload)] 
        });

    if (result.success) {
      setName("");
      setDescription("");
      setMenuAccess([]);
      setFunctionPerms({});
      onRefresh();
      onClose();
    }
    setIsSaving(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 animate-in fade-in duration-500">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 40 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-card border border-border/60 rounded-sm shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-8 border-b border-border/40 bg-muted/20 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-sm flex items-center justify-center text-primary border border-primary/20">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black uppercase tracking-tight">Granular Role Orchestration</h2>
              <p className="text-[10px] text-muted-foreground uppercase font-black tracking-[0.3em] mt-1">Step {step} of 3: {step === 1 ? "Identity & Nav" : step === 2 ? "Functional Logic" : "Scoping & Persistence"}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {[1,2,3].map(s => (
              <div key={s} className={cn("w-8 h-1 rounded-full transition-all", step >= s ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar p-10">
          {step === 1 && (
            <div className="flex flex-col gap-12 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-10">
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black uppercase tracking-widest text-primary/80">Role Nomenclature</label>
                  <input 
                    autoFocus
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Senior Automation Architect"
                    className="w-full bg-background/50 border border-border p-4 text-sm font-bold focus:border-primary outline-none transition-all rounded-sm"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <label className="text-xs font-black uppercase tracking-widest text-primary/80">Operational Intent</label>
                  <input 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the scope of this role..."
                    className="w-full bg-background/50 border border-border p-4 text-sm font-bold focus:border-primary outline-none transition-all rounded-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <label className="text-xs font-black uppercase tracking-widest text-primary/80">Main Menu Accessibility</label>
                <div className="grid grid-cols-3 gap-4">
                  {menuOptions.map(menu => (
                    <button
                      key={menu.id}
                      type="button"
                      onClick={() => toggleMenu(menu.id)}
                      className={cn(
                        "flex flex-col gap-3 p-6 border rounded-sm transition-all text-left group relative overflow-hidden",
                        menuAccess.includes(menu.id)
                          ? "bg-primary/5 border-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.1)]"
                          : "bg-muted/10 border-border/40 hover:border-primary/40"
                      )}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-black uppercase tracking-widest">{menu.label}</span>
                        {menuAccess.includes(menu.id) ? <CheckCircle2 size={16} className="text-primary" /> : <div className="w-4 h-4 rounded-full border border-border/60" />}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-medium opacity-60 ">{menu.path}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-10 animate-in slide-in-from-right-4 duration-300">
               <div className="flex flex-col gap-2">
                <h3 className="text-xl font-black tracking-tight">Functional Entitlements Grid</h3>
                <p className="text-xs text-muted-foreground">Select granular operations for every sub-module across the platform lifecycle.</p>
              </div>
              
              <div className="border border-border/60 rounded-sm overflow-hidden shadow-2xl bg-card/40 backdrop-blur-md">
                <table className="w-full border-collapse">
                  <thead className="bg-muted/80 backdrop-blur-sm sticky top-0 z-10">
                    <tr>
                      <th className="p-4 text-left text-[9px] font-black uppercase tracking-[0.2em] text-primary border-b border-border/40 w-1/4">Module & Scope</th>
                      {crudOps.map(op => (
                        <th key={op} className="p-4 text-center text-[9px] font-black uppercase tracking-[0.2em] text-primary border-b border-border/40">{op}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {functionalModules.map(category => (
                      <React.Fragment key={category.category}>
                        <tr className="bg-primary/5">
                          <td colSpan={crudOps.length + 1} className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary/60">
                            {category.category}
                          </td>
                        </tr>
                        {category.items.map(mod => (
                          <tr key={mod.id} className="hover:bg-primary/5 transition-colors group">
                            <td className="p-4 border-r border-border/10">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[11px] font-black uppercase tracking-tight group-hover:text-primary transition-colors">{mod.label}</span>
                                <span className="text-[9px] text-muted-foreground opacity-40 font-bold">{mod.id}</span>
                              </div>
                            </td>
                            {crudOps.map(op => {
                              const isSelected = (functionPerms[mod.id] || []).includes(op);
                              return (
                                <td key={op} className="p-1 text-center">
                                  <button
                                    type="button"
                                    onClick={() => toggleFuncPerm(mod.id, op)}
                                    className={cn(
                                      "w-full h-12 flex items-center justify-center transition-all duration-300 rounded-sm",
                                      isSelected 
                                        ? "bg-primary/10 text-primary shadow-[inset_0_0_10px_rgba(var(--primary-rgb),0.2)] scale-100" 
                                        : "text-muted-foreground/20 hover:text-primary/40 hover:bg-muted/30 scale-90"
                                    )}
                                  >
                                    {isSelected ? <CheckSquare size={18} className="animate-in zoom-in-50" /> : <Square size={18} />}
                                  </button>
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
          )}

          {step === 3 && (
            <div className="flex flex-col gap-12 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-12">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-primary/80">Tenant Scoping</label>
                    <span className="text-[10px] font-bold text-muted-foreground">{selectedTenants.length} Selected</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {tenants.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTenants(prev => prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id])}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-sm transition-all text-left",
                          selectedTenants.includes(t.id) ? "bg-primary/10 border-primary" : "bg-muted/20 border-border/40"
                        )}
                      >
                        <div className={cn("w-3 h-3 rounded-full", t.status === "ACTIVE" ? "bg-emerald-500" : "bg-amber-500")} />
                        <span className="text-xs font-bold">{t.name}</span>
                        <span className="ml-auto text-[10px] font-black opacity-40">{t.type}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-widest text-primary/80">Folder Resource Mapping</label>
                    <span className="text-[10px] font-bold text-muted-foreground">{selectedFolders.length} Selected</span>
                  </div>
                  <div className="flex flex-col gap-2 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                    {folders.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFolders(prev => prev.includes(f.id) ? prev.filter(id => id !== f.id) : [...prev, f.id])}
                        className={cn(
                          "flex items-center gap-3 p-3 border rounded-sm transition-all text-left",
                          selectedFolders.includes(f.id) ? "bg-primary/10 border-primary" : "bg-muted/20 border-border/40"
                        )}
                      >
                        <FolderOpen size={14} className={cn(selectedFolders.includes(f.id) ? "text-primary" : "text-muted-foreground")} />
                        <span className="text-xs font-bold">{f.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-amber-500/5 border border-amber-500/20 rounded-sm flex items-start gap-4">
                <AlertTriangle className="text-amber-500 shrink-0 mt-1" size={20} />
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-black text-amber-500 uppercase tracking-tight">Access Inheritance Warning</span>
                  <p className="text-xs text-muted-foreground">Permissions granted at the folder level will inherit to all sub-resources. High-privileged functional access should be restricted to production-grade tenants only.</p>
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Footer Actions */}
        <div className="p-8 border-t border-border/40 bg-muted/20 flex gap-4">
          {step > 1 && (
            <Button 
              type="button"
              onClick={() => setStep(step - 1)}
              variant="outline"
              className="px-10 py-6 rounded-sm text-xs font-black uppercase tracking-[0.2em] bg-background"
            >
              Back
            </Button>
          )}
          <div className="ml-auto flex gap-4">
            <Button 
              type="button"
              onClick={onClose}
              variant="ghost"
              className="px-10 py-6 rounded-sm text-xs font-black uppercase tracking-[0.2em]"
            >
              Cancel
            </Button>
            {step < 3 ? (
              <Button 
                type="button"
                onClick={() => setStep(step + 1)}
                className="px-12 py-6 rounded-sm bg-primary text-primary-foreground text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 active:scale-95 transition-all"
              >
                Next Step
              </Button>
            ) : (
              <Button 
                type="button"
                onClick={handleSubmit}
                disabled={isSaving || !name}
                className="px-16 py-6 rounded-sm bg-primary text-primary-foreground text-xs font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/40 active:scale-95 transition-all"
              >
                {isSaving ? "Persisting Role..." : "Authorize & Persist Role"}
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// Scope label config
const SCOPE_STYLE: Record<string, { label: string; className: string }> = {
  platform: { label: "Platform", className: "bg-rose-500/10 text-rose-500 border-rose-500/20" },
  customer: { label: "Customer", className: "bg-orange-500/10 text-orange-500 border-orange-500/20" },
  tenant:   { label: "Tenant",   className: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
};

function CreateGroupModal({ isOpen, onClose, onRefresh, roles }: { isOpen: boolean, onClose: () => void, onRefresh: () => void, roles: any[] }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [roleSearch, setRoleSearch] = useState("");

  const filteredRoles = roles.filter(r =>
    !roleSearch || r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
    (r.description || "").toLowerCase().includes(roleSearch.toLowerCase())
  );

  const toggleRole = (id: string) =>
    setSelectedRoleIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsSaving(true);
    const result = await createGroupAction({ name, description, roleIds: selectedRoleIds });
    if (result.success) {
      setName(""); setDescription(""); setSelectedRoleIds([]); setRoleSearch("");
      onRefresh(); onClose();
    }
    setIsSaving(false);
  };

  const reset = () => { setName(""); setDescription(""); setSelectedRoleIds([]); setRoleSearch(""); onClose(); };

  if (!isOpen) return null;

  // Group roles by scope for cleaner display
  const byScope: Record<string, any[]> = {};
  filteredRoles.forEach(r => {
    const s = r.scope || "tenant";
    (byScope[s] = byScope[s] || []).push(r);
  });
  const scopeOrder = ["platform", "customer", "tenant"];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-2xl bg-card border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border bg-muted/30 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">Create Access Group</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Group users with shared access needs and assign roles to define what they can do</p>
          </div>
          <button onClick={reset} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden flex-1 min-h-0">
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left: Group details */}
            <div className="w-64 shrink-0 border-r border-border p-5 space-y-4 overflow-y-auto">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Group Name *</label>
                <input
                  autoFocus value={name} onChange={e => setName(e.target.value)}
                  placeholder="e.g. Finance Operations"
                  className="w-full bg-muted/40 border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Description</label>
                <textarea
                  value={description} onChange={e => setDescription(e.target.value)}
                  placeholder="What is this group for?"
                  rows={4}
                  className="w-full bg-muted/40 border border-border rounded-md px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                />
              </div>
              {selectedRoleIds.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Selected Roles</label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedRoleIds.map(id => {
                      const r = roles.find(x => x.id === id);
                      if (!r) return null;
                      return (
                        <span key={id} className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                          style={{ backgroundColor: (r.color || "#6366f1") + "18", borderColor: (r.color || "#6366f1") + "40", color: r.color || "#6366f1" }}>
                          {r.name}
                          <button type="button" onClick={() => toggleRole(id)} className="hover:opacity-70">
                            <X size={9} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Role picker */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="px-4 py-3 border-b border-border flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-foreground">Assign Roles</span>
                  <span className="text-[10px] text-muted-foreground">{selectedRoleIds.length} selected</span>
                </div>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input value={roleSearch} onChange={e => setRoleSearch(e.target.value)}
                    placeholder="Search roles..."
                    className="w-full pl-7 pr-3 py-1.5 text-xs bg-muted/40 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
                {scopeOrder.map(scope => {
                  const scopeRoles = byScope[scope];
                  if (!scopeRoles?.length) return null;
                  const style = SCOPE_STYLE[scope] || SCOPE_STYLE.tenant;
                  return (
                    <div key={scope}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider", style.className)}>
                          {style.label}
                        </span>
                        <div className="flex-1 h-px bg-border/50" />
                      </div>
                      <div className="space-y-1.5">
                        {scopeRoles.map((r: any) => {
                          const selected = selectedRoleIds.includes(r.id);
                          // First sentence of description as the responsibility summary
                          const summary = (r.description || "").split(". ").slice(1, 3).join(". ");
                          return (
                            <button
                              key={r.id} type="button"
                              onClick={() => toggleRole(r.id)}
                              className={cn(
                                "w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                                selected
                                  ? "border-primary/50 bg-primary/5"
                                  : "border-border/60 bg-muted/10 hover:bg-muted/30 hover:border-border"
                              )}
                            >
                              {/* Color dot / check */}
                              <div className={cn(
                                "w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                                selected ? "bg-primary" : "border border-border bg-muted/40"
                              )}
                                style={!selected ? { borderColor: (r.color || "#6366f1") + "60" } : {}}>
                                {selected
                                  ? <Check size={11} className="text-white" />
                                  : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: r.color || "#6366f1" }} />
                                }
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-semibold text-foreground">{r.name}</span>
                                  {r.isSystem && (
                                    <span className="text-[9px] font-bold px-1 py-0.5 bg-muted border border-border rounded text-muted-foreground uppercase">System</span>
                                  )}
                                </div>
                                {summary && (
                                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{summary}</p>
                                )}
                              </div>

                              <div className="flex items-center gap-1 flex-shrink-0 self-center">
                                <span className="text-[10px] text-muted-foreground">{r._count?.users ?? 0} users</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {filteredRoles.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield size={24} className="opacity-20 mx-auto mb-2" />
                    <p className="text-xs">No roles match "{roleSearch}"</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-border flex items-center justify-between gap-3 flex-shrink-0 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              {selectedRoleIds.length === 0
                ? "Select at least one role to define group permissions"
                : `${selectedRoleIds.length} role${selectedRoleIds.length > 1 ? "s" : ""} will be assigned to all group members`}
            </p>
            <div className="flex gap-2">
              <Button type="button" onClick={reset} variant="outline" size="sm">Cancel</Button>
              <Button type="submit" disabled={isSaving || !name} size="sm"
                className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                {isSaving ? "Creating..." : "Create Group"}
              </Button>
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ─── Group Mapping Section ────────────────────────────────────────────────────
function GroupMappingSection({
  mappings, providers, roles, groups, onRefresh
}: { mappings: any[]; providers: any[]; roles: any[]; groups: any[]; onRefresh: () => void }) {
  const [showForm, setShowForm] = useState(false);
  const [providerId, setProviderId] = useState("");
  const [externalGroup, setExternalGroup] = useState("");
  const [targetType, setTargetType] = useState<"role" | "group">("role");
  const [targetId, setTargetId] = useState("");
  const [priority, setPriority] = useState("1");
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId || !externalGroup || !targetId) return;
    setSaving(true);
    const res = await createGroupMappingAction({
      providerId,
      externalGroupName: externalGroup,
      internalRoleId:  targetType === "role"  ? targetId : undefined,
      internalGroupId: targetType === "group" ? targetId : undefined,
      priority: Number(priority),
    });
    if (res.success) {
      setShowForm(false);
      setExternalGroup(""); setTargetId(""); setPriority("1");
      onRefresh();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteGroupMappingAction(id);
    onRefresh();
  };

  return (
    <section className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowRightLeft size={14} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Group Mapping</h3>
          <span className="text-[10px] text-muted-foreground bg-muted/40 border border-border px-2 py-0.5 rounded-full">{mappings.length} rules</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowForm(v => !v)}>
          <Plus size={13} /> Add Mapping
        </Button>
      </div>

      {/* Explainer */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border">
        <Info size={14} className="text-primary flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-semibold text-foreground">How Group Mapping Works</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            When a user signs in via SSO, their Identity Provider sends a list of groups they belong to (as a claim in the SAML assertion or OIDC token).
            These rules automatically map those <strong>IdP group names</strong> to platform <strong>Roles</strong> or <strong>Access Groups</strong> — so users get the right access on their first login without any manual setup.
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Example: IdP group <span className="font-mono bg-muted px-1 rounded">CN=Automation-Devs,OU=Groups,DC=acme,DC=com</span> → Platform Role <span className="font-semibold text-primary">Developer</span>
          </p>
        </div>
      </div>

      {/* Add Mapping Form */}
      {showForm && (
        <form onSubmit={submit} className="p-4 rounded-lg border border-border bg-card space-y-4">
          <p className="text-xs font-bold text-foreground">New Mapping Rule</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Identity Provider</label>
              <select value={providerId} onChange={e => setProviderId(e.target.value)} required
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select provider...</option>
                {providers.map(p => <option key={p.id} value={p.id}>{p.name} ({p.type})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                IdP Group Name <span className="normal-case font-normal">(exact match from your IdP)</span>
              </label>
              <input value={externalGroup} onChange={e => setExternalGroup(e.target.value)} required
                placeholder="e.g. CN=Automation-Devs,OU=Groups,DC=acme,DC=com"
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">Map To</label>
              <div className="flex gap-2">
                {(["role", "group"] as const).map(t => (
                  <label key={t} className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md border text-xs font-semibold cursor-pointer transition-all capitalize",
                    targetType === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                  )}>
                    <input type="radio" className="sr-only" checked={targetType === t} onChange={() => { setTargetType(t); setTargetId(""); }} />
                    <div className={cn("w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center transition-all",
                      targetType === t ? "border-primary" : "border-muted-foreground/40")}>
                      {targetType === t && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                    </div>
                    {t === "role" ? "Role" : "Group"}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                {targetType === "role" ? "Platform Role" : "Access Group"}
              </label>
              <select value={targetId} onChange={e => setTargetId(e.target.value)} required
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select {targetType}...</option>
                {targetType === "role"
                  ? roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
                  : groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)
                }
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Priority <span className="normal-case font-normal">(lower = higher priority)</span>
              </label>
              <input type="number" min="1" value={priority} onChange={e => setPriority(e.target.value)}
                className="w-full px-3 py-2.5 bg-muted/40 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Saving..." : "Save Mapping"}
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </form>
      )}

      {/* Mapping list */}
      {mappings.length === 0 && !showForm ? (
        <div className="text-center py-8 border border-dashed border-border rounded-lg text-muted-foreground">
          <ArrowRightLeft size={24} className="opacity-20 mx-auto mb-2" />
          <p className="text-xs">No group mappings configured. Add a rule to automatically assign roles on SSO login.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Column headers */}
          {mappings.length > 0 && (
            <div className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-3 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <span>IdP Group (External)</span>
              <span />
              <span>Platform Role / Group</span>
              <span className="text-center">Priority</span>
              <span />
            </div>
          )}
          {mappings.map(map => (
            <div key={map.id} className="grid grid-cols-[1fr_auto_1fr_auto_auto] gap-3 items-center p-3 rounded-lg border border-border bg-card hover:bg-muted/10 transition-colors">
              {/* IdP Group */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center flex-shrink-0">
                  <Globe size={12} className="text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground font-mono truncate">{map.externalGroupName}</p>
                  {map.provider && <p className="text-[10px] text-muted-foreground">{map.provider.name} · {map.provider.type}</p>}
                </div>
              </div>

              {/* Arrow */}
              <ArrowRightLeft size={13} className="text-muted-foreground/40 flex-shrink-0" />

              {/* Platform target */}
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {map.internalRole ? <Shield size={12} className="text-primary" /> : <Network size={12} className="text-primary" />}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-foreground truncate">
                    {map.internalRole?.name || map.internalGroup?.name || "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{map.internalRole ? "Role" : "Group"}</p>
                </div>
              </div>

              {/* Priority */}
              <div className="w-8 h-8 rounded-full bg-muted/40 border border-border flex items-center justify-center text-[11px] font-bold text-muted-foreground flex-shrink-0">
                {map.priority}
              </div>

              {/* Delete */}
              <button onClick={() => handleDelete(map.id)}
                className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Prerequisites tip */}
      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/20 border border-border/60 text-xs text-muted-foreground">
        <Info size={12} className="flex-shrink-0 mt-0.5 text-primary" />
        <span>
          <strong className="text-foreground">Prerequisite:</strong> Your IdP must be configured to include group membership in the SAML assertion or OIDC token.
          See the <strong className="text-primary">Guide panel</strong> → How To Use → "Configure group claims in your IdP" for provider-specific steps.
        </span>
      </div>
    </section>
  );
}

function SecurityTabView({
  providers,
  mappings,
  roles = [],
  groups = []
}: {
  providers: any[],
  mappings: any[],
  roles?: any[],
  groups?: any[]
}) {
  const [governanceMode, setGovernanceMode] = useState("Hybrid");

  return (
    <div className="p-8 flex flex-col h-full gap-8 overflow-y-auto">
      {/* Scope clarification banner */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/40 border border-border">
        <Info size={16} className="text-primary flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-foreground">Customer-Level Identity Integration</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            This section configures SSO and directory federation <strong>for your organization's users</strong> — the people who use automations and applications.
            It does <em>not</em> affect Platform Administrator login, which is configured separately under
            <span className="font-semibold text-primary"> Global Control Center → Security Control</span>.
          </p>
        </div>
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Identity Providers</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Configure SAML, OIDC, or LDAP federation for your organization's end users.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-10">
        <div className="flex flex-col gap-10">
          {/* Identity Providers */}
          <section className="flex flex-col gap-8">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-primary uppercase tracking-[0.3em] flex items-center gap-3">
                <Fingerprint size={16} /> Identity Providers
              </h3>
              <Button variant="ghost" size="sm" className="text-[10px] h-auto p-0 font-black text-primary uppercase tracking-widest flex items-center gap-2 hover:opacity-70">
                <Plus size={14} /> Add Provider
              </Button>

            </div>

            <div className="flex flex-col gap-4">
              {providers.map((p) => (
                <div key={p.id} className="p-6 bg-card/40 rounded-sm border border-border flex items-center justify-between hover:border-primary transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-sm bg-muted flex items-center justify-center">
                      <Key size={20} className="text-primary" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-black tracking-tight">{p.name}</span>
                        <span className="px-2 py-0.5 rounded-sm bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest">{p.type}</span>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground opacity-60">Status: {p.syncStatus}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><CheckCircle2 size={14} /></div>
                    <Button variant="ghost" size="icon-sm" className="p-2 rounded-sm border border-border hover:border-primary transition-all"><Settings size={14} /></Button>

                  </div>
                </div>
              ))}
              {providers.length === 0 && <p className="text-xs text-muted-foreground text-center py-6">No Identity Providers configured.</p>}
            </div>
          </section>

          {/* Group Mapping Engine */}
          <GroupMappingSection mappings={mappings} providers={providers} roles={roles} groups={groups} onRefresh={() => {}} />

          {/* Enrollment Governance */}
          <section className="flex flex-col gap-4 p-6 bg-muted/20 rounded-lg border border-border">
            <div className="flex items-center gap-2">
              <Lock size={14} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">User Enrollment Mode</h3>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { id: "Hybrid",    label: "SSO + Local Registration", desc: "Allow both federated SSO and manually-invited local users." },
                { id: "SAMLOnly",  label: "SSO Only (Federation)", desc: "All users must authenticate via corporate SSO — no local accounts." },
                { id: "LocalOnly", label: "Manual Invite Only", desc: "Disable external federation — admins create accounts by invitation only." },
              ].map((mode) => (
                <label key={mode.id}
                  className={cn(
                    "flex items-start gap-3 p-4 rounded-lg border cursor-pointer transition-all",
                    governanceMode === mode.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:border-border/80"
                  )}
                  onClick={() => setGovernanceMode(mode.id)}
                >
                  {/* Custom radio indicator — fully inside the card */}
                  <div className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
                    governanceMode === mode.id ? "border-primary" : "border-border"
                  )}>
                    {governanceMode === mode.id && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-none">{mode.label}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{mode.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function AccessManagementPage() {
  return (
    <React.Suspense fallback={<div className="p-20 text-center animate-pulse text-muted-foreground font-black uppercase tracking-widest text-xs">Initializing Framework...</div>}>
      <AccessManagementContent />
    </React.Suspense>
  );
}

function UserApprovalsTabView({ pendingUsers, roles, isLoading, onRefresh }: { 
  pendingUsers: any[], 
  roles: any[],
  isLoading: boolean, 
  onRefresh: () => void 
}) {
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, string>>({});

  const handleApprove = async (userId: string) => {
    const roleId = selectedRoles[userId];
    if (!roleId) {
      alert("Please select a role for the user.");
      return;
    }
    setApprovingId(userId);
    const res = await approveUserRegistration(userId, roleId);
    if (res.success) {
      onRefresh();
    } else {
      alert(res.error || "Approval failed");
    }
    setApprovingId(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-8 min-h-0 p-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black tracking-tight uppercase">Registration Scrutiny</h2>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Self-onboarded users awaiting administrative attestation.</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
            <div className="w-8 h-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest">Hydrating Scrutiny Queue...</span>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center opacity-30 gap-6 text-center">
             <CheckCircle2 size={48} className="text-emerald-500" />
             <div>
                <h3 className="text-xl font-black tracking-tighter uppercase">Clearance Secured</h3>
                <p className="text-[10px] font-black uppercase tracking-widest mt-2 opacity-60">No pending registration artifacts found.</p>
             </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {pendingUsers.map((u) => (
              <div key={u.id} className="bg-card/40 rounded-sm border border-border/40 p-6 flex items-center justify-between hover:border-primary transition-all group">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <User size={24} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black uppercase tracking-tight">{u.fullName}</span>
                      <span className="text-[8px] font-black px-2 py-0.5 bg-amber-500/10 text-amber-500 rounded-full uppercase border border-amber-500/20">Pending Attestation</span>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                      <span className="flex items-center gap-1.5"><Mail size={10} className="opacity-40" /> {u.email}</span>
                      <span className="w-1 h-1 rounded-full bg-border" />
                      <span className="flex items-center gap-1.5"><Building2 size={10} className="opacity-40" /> {u.customer?.companyName || u.tenant?.name}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Assign Access Level</span>
                    <select 
                      className="bg-background/40 border border-border/40 rounded-sm px-3 py-2 text-[10px] font-bold focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all uppercase tracking-tight"
                      value={selectedRoles[u.id] || ""}
                      onChange={(e) => setSelectedRoles({ ...selectedRoles, [u.id]: e.target.value })}
                    >
                      <option value="">Select Role</option>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.name}{r.scope !== 'platform' ? ` — ${(r.description || '').split('.')[0]}` : ''}</option>
                      ))}
                    </select>
                  </div>
                  <div className="h-10 w-px bg-border/40 mx-2" />
                  <div className="flex gap-3">
                    <button className="p-3 text-rose-500 hover:bg-rose-500/10 rounded-sm transition-all group-hover:scale-110 active:scale-95">
                      <X size={18} />
                    </button>
                    <button 
                      onClick={() => handleApprove(u.id)}
                      disabled={approvingId === u.id}
                      className="px-6 py-3 bg-emerald-500 text-white rounded-sm text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-2"
                    >
                      {approvingId === u.id ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                      Approve Activation
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
