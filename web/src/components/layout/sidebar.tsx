"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppContext, Role } from "@/lib/context";
import {
  Home,
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  Bot,
  PackageSearch,
  Activity,
  CalendarDays,
  Zap,
  Flame,
  ScrollText,
  UserCog,
  ShieldAlert,
  Server,
  BrainCircuit,
  User,
  Palette,
  Compass,
  KeyRound,
  ChevronRight,
  Menu,
  ClipboardCheck,
  Shield,
  ShieldCheck,
  Disc,
  BookOpen,
  Mail,
  BarChart3,
  RotateCw,
  CreditCard,
  Settings,
  Database,
  Globe,
  Monitor,
  Download,
  Search,
  MessageSquare,
  Rocket
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";

const Logo = dynamic(() => import("@/components/ui/logo"), { ssr: false });
import { IconWrapper } from "@/components/ui/icon-wrapper";

type MenuItem = {
  name: string;
  icon: React.ElementType;
  href: string;
  subItems?: { name: string; href: string; allowedRoles?: Role[] }[];
  allowedRoles: Role[];
  requiredService?: string | string[]; // Can be a single service or array (OR logic)
};

type MenuCategory = {
  title: string;
  items: MenuItem[];
};

export const Sidebar = ({ defaultCollapsed = false }: { defaultCollapsed?: boolean }) => {
  const pathname = usePathname();
  const { 
    role, 
    currentUser, 
    availableAdmins, 
    switchUser, 
    pendingRequests, 
    dispatchLog,
    customers,
    activeCustomer,
    switchCustomer,
    availableTenants,
    activeTenant,
    switchTenant,
    isServiceEnabled
  } = useAppContext();
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [isLocked, setIsLocked] = useState(!defaultCollapsed);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [clientSignals, setClientSignals] = useState<any[]>([]);
  const [menuSearch, setMenuSearch] = useState("");

  const normalizedMenuSearch = menuSearch.trim().toLowerCase();

  React.useEffect(() => {
    setClientSignals((typeof window !== "undefined" && (window as any).signals) || []);
  }, []);

  const expandAll = () => {
    const allGroups: Record<string, boolean> = {};
    menuConfig.forEach(cat => {
      cat.items.forEach(item => {
        if (item.subItems) allGroups[item.name] = true;
      });
    });
    setOpenGroups(allGroups);
  };

  const collapseAll = () => setOpenGroups({});

  const toggleGroup = (name: string) => {
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const ALL_ROLES: Role[] = ["Platform Admin", "Tenant Admin", "Admin User"];
  const TENANT_UP: Role[] = ["Platform Admin", "Tenant Admin"];
  const PLATFORM_ONLY: Role[] = ["Platform Admin"];

  const menuConfig: MenuCategory[] = [
    {
      title: "SYSTEM CONTROL",
      items: [
        {
          name: "Global Control Center",
          icon: Shield,
          href: "/next-gen/control-center",
          allowedRoles: PLATFORM_ONLY,
          subItems: [
            { name: "Customers", href: "/next-gen/control-center/customer" },
            { name: "Approval Hub", href: "/next-gen/control-center/approvals" },
            { name: "Licensing & Entitlements", href: "/next-gen/control-center/licensing" },
            { name: "System Settings", href: "/next-gen/control-center/config" },
            { name: "Master Data", href: "/next-gen/control-center/masters" },
            { name: "Service Health", href: "/next-gen/control-center/services" },
            { name: "Billing & Plans", href: "/next-gen/control-center/billing" },
          ]
        }
      ]
    },
    {
      title: "MANAGEMENT CONSOLE",
      items: [
        {
          name: "Workspace Settings",
          icon: Building2,
          href: "/next-gen/admin/organization",
          allowedRoles: TENANT_UP,
          subItems: [
            { name: "Tenants", href: "/next-gen/admin/organization/tenants" },
            { name: "Folders", href: "/next-gen/admin/organization/folders" },
            { name: "Applications", href: "/next-gen/admin/organization/apps" },
            { name: "General Settings", href: "/next-gen/admin/organization/general" },
          ]
        },
        {
          name: "Users & Teams",
          icon: Users,
          href: "/next-gen/admin/access",
          allowedRoles: TENANT_UP,
          subItems: [
            { name: "User Directory", href: "/next-gen/admin/access?tab=users" },
            { name: "Access Groups", href: "/next-gen/admin/access?tab=groups" },
            { name: "Custom Roles", href: "/next-gen/admin/access?tab=roles" },
          ]
        },
        {
          name: "Automation Settings",
          icon: Bot,
          href: "/next-gen/admin/automation",
          allowedRoles: TENANT_UP,
          subItems: [
            { name: "Machines & Robots", href: "/next-gen/admin/automation/machines" },
            { name: "Robot Templates", href: "/next-gen/admin/automation/templates" },
            { name: "Global Run Settings", href: "/next-gen/admin/automation/settings" },
          ]
        },
        {
          name: "App Connections",
          icon: Globe,
          href: "/next-gen/admin/integrations",
          allowedRoles: TENANT_UP,
          subItems: [
            { name: "Code Repositories", href: "/next-gen/admin/integrations/repos" },
            { name: "Connected Systems", href: "/next-gen/admin/integrations/systems" },
            { name: "API & Webhooks", href: "/next-gen/admin/integrations/webhooks" },
          ]
        },
      ]
    },
    {
      title: "AUTOMATION HUB",
      items: [
        {
          name: "Home",
          icon: Home,
          href: "/next-gen/home",
          allowedRoles: ALL_ROLES,
          subItems: [
            { name: "My Dashboard", href: "/next-gen/home/work" },
            { name: "Live Jobs", href: "/next-gen/home/jobs" },
            { name: "Notifications", href: "/next-gen/home/notifications" },
            { name: "My Activity", href: "/next-gen/home/activity" },
          ]
        },
        {
          name: "Automation Lifecycle",
          icon: RotateCw,
          href: "/next-gen/lifecycle",
          allowedRoles: ALL_ROLES,
          subItems: [
            { name: "New Project Assessment", href: "/next-gen/lifecycle/assessment" },
            { name: "ROI Calculator", href: "/next-gen/lifecycle/roi" },
            { name: "Prioritization", href: "/next-gen/lifecycle/priority" },
            { name: "Requirement Gathering", href: "/next-gen/lifecycle/requirements" },
            { name: "Review & Approval", href: "/next-gen/lifecycle/review" },
          ]
        },
        {
          name: "Tenant Hub",
          icon: Briefcase,
          href: "/next-gen/workspace",
          allowedRoles: ALL_ROLES,
          subItems: [
            { name: "Projects", href: "/next-gen/workspace/projects" },
            { name: "Processes", href: "/next-gen/workspace/processes" },
            { name: "Jobs / Runs", href: "/next-gen/workspace/jobs" },
            { name: "Queues", href: "/next-gen/workspace/queues" },
            { name: "Schedules", href: "/next-gen/workspace/schedules" },
            { name: "Logs", href: "/next-gen/workspace/logs" },
            { name: "Assets", href: "/next-gen/workspace/assets" },
          ]
        },
      ]
    },
    {
      title: "BUILDER STUDIO",
      items: [
        {
          name: "Design",
          icon: Flame,
          href: "/next-gen/studio",
          allowedRoles: ALL_ROLES,
          subItems: [
            { name: "Flow Studio", href: "/next-gen/studio" },
            { name: "App Studio", href: "/next-gen/studio/ui-builder" },
            { name: "Document Studio", href: "/next-gen/studio/document-reader" },
            { name: "Mail Studio", href: "/next-gen/studio/mail-studio" },
            { name: "Recon Studio", href: "/next-gen/studio/recon-studio" },
            { name: "Risk Studio", href: "/next-gen/studio/risk-studio" },
            { name: "Investigation Studio", href: "/next-gen/studio/investigation-studio" },
          ]
        },
        {
          name: "Automation & AI",
          icon: Zap,
          href: "/next-gen/studio/ai-builder",
          allowedRoles: ALL_ROLES,
          subItems: [
            { name: "Agent Builder", href: "/next-gen/studio/ai-builder" },
            { name: "Bot Library", href: "/next-gen/studio/bot-library" },
          ]
        },
        {
          name: "Data",
          icon: Database,
          href: "/next-gen/studio/designer?tab=global-data",
          allowedRoles: TENANT_UP,
          subItems: [
            { name: "Data Hub", href: "/next-gen/studio/designer?tab=global-data" },
            { name: "Asset Library", href: "/next-gen/studio/assets" },
          ]
        },
        {
          name: "Quality",
          icon: ClipboardCheck,
          href: "/next-gen/studio/debug",
          allowedRoles: ALL_ROLES,
          subItems: [
            { name: "Test Studio", href: "/next-gen/studio/debug" },
          ]
        },
        {
          name: "Release",
          icon: Rocket,
          href: "/next-gen/studio/deploy",
          allowedRoles: ALL_ROLES,
          subItems: [
            { name: "Deployment", href: "/next-gen/studio/deploy" },
          ]
        }
      ]
    },
    {
      title: "SHARED SERVICES",
      items: [
        {
          name: "Robot Monitoring",
          icon: Activity,
          href: "/next-gen/bot-monitoring",
          allowedRoles: ALL_ROLES,
        },
        {
          name: "Robot Agents",
          icon: UserCog,
          href: "/next-gen/bot-agents",
          allowedRoles: ALL_ROLES,
          subItems: [
            { name: "Agent Overview", href: "/next-gen/bot-agents" },
            { name: "Run Schedules", href: "/next-gen/bot-agents/schedules" },
            { name: "AI Agent Chat", href: "/next-gen/bot-agents/chat" },
            { name: "Setup New Agent", href: "/next-gen/bot-agents/activation", allowedRoles: ["Platform Admin", "Admin User"] },
          ]
        },
        {
          name: "Reports",
          icon: BarChart3,
          href: "/next-gen/reports",
          allowedRoles: ALL_ROLES,
          subItems: [
            { name: "Queue Analytics", href: "/next-gen/queues" },
            { name: "Execution Insights", href: "/next-gen/reports/execution" },
            { name: "ROI Analytics", href: "/next-gen/reports/roi" },
          ]
        },
        {
          name: "Downloads",
          icon: Download,
          href: "/next-gen/downloads",
          allowedRoles: ALL_ROLES,
        },
      ]
    }
  ];

  const accountConfig: MenuItem[] = [
    { name: "Profile", icon: User, href: "/next-gen/profile", allowedRoles: ALL_ROLES },
    { name: "Theme / Icons", icon: Palette, href: "/next-gen/settings/theme", allowedRoles: ALL_ROLES },
    { name: "Icon Repository", icon: Compass, href: "/next-gen/settings/icons", allowedRoles: ALL_ROLES },
    { name: "Role & Access", icon: KeyRound, href: "/next-gen/settings/roles", allowedRoles: ALL_ROLES },
  ];

  return (
    <motion.aside
      onMouseEnter={() => !isLocked && setCollapsed(false)}
      onMouseLeave={() => !isLocked && setCollapsed(true)}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
      className="h-screen sticky top-0 flex flex-col bg-background/20 backdrop-blur-2xl border-r border-border transition-colors duration-300 z-40 overflow-hidden shadow-[1px_0_0_0_rgba(255,255,255,0.05)]"
    >
      <div className="flex flex-col border-b border-border">
        <div className="flex h-14 items-center justify-between px-4">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1 font-bold text-lg tracking-tight text-foreground dark:text-white"
            >
              <Logo size={32} className="-ml-1" />
              Next Gen
            </motion.div>
          )}
          <button
            onClick={() => {
              const nextCollapsed = !collapsed;
              setCollapsed(nextCollapsed);
              setIsLocked(!nextCollapsed);
            }}
            className={cn(
              "p-2 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all",
              !collapsed && "bg-primary/10 text-primary hover:bg-primary/20"
            )}
          >
            <IconWrapper icon={Menu} size={18} />
          </button>
        </div>
        
        {/* Administrative Scope (Org + Environment) */}
        {!collapsed && (
          <div className="px-4 pb-2 space-y-2">
            {/* Organization Hub */}
            <div className="bg-muted/50 dark:bg-muted/20 border border-border rounded-sm p-2 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Workspace</span>
                <IconWrapper icon={Building2} size={12} className="text-primary" />
              </div>
              
              {role === "Platform Admin" ? (
                /* Platform Admin: Platform Scope + Customer Context Switcher */
                <div className="space-y-2">
                   {clientSignals.map((signal: any, idx: number) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${signal.level === 'ERROR' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                    <span className="text-[10px] font-black uppercase text-white/40">{signal.path}: {signal.count}</span>
                  </div>
                ))}
                   <div className="flex items-center gap-2 px-2 py-1 bg-primary/10 rounded border border-primary/20">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-primary uppercase tracking-tight">Platform Hub</span>
                   </div>
                   <div className="relative group">
                    <select 
                      value={activeCustomer?.id || ""}
                      onChange={(e) => switchCustomer(e.target.value)}
                      className="w-full bg-card dark:bg-black border border-border dark:border-[#333] rounded-sm px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer"
                    >
                      {customers.filter(c => c.status !== "Suspended").map(c => (
                        <option key={c.id} value={c.id}>{c.companyName}</option>
                      ))}
                    </select>
                    <IconWrapper icon={ChevronRight} size={14} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
              ) : (
                /* Regular Users: Scoped Organization Name */
                <div className="flex items-center gap-2 px-2 py-1.5 bg-muted/40 rounded-sm border border-border/50">
                  <div className="w-6 h-6 rounded-sm bg-primary/20 text-primary flex items-center justify-center font-bold text-[10px]">
                    {activeCustomer?.companyName.charAt(0) || "O"}
                  </div>
                  <span className="text-xs font-bold text-foreground truncate">{activeCustomer?.companyName || "No Organization"}</span>
                </div>
              )}
            </div>

            {/* Environment Switcher (Tenant Hub) — Only visible for Active customers */}
            {availableTenants.length > 0 && activeCustomer?.status === "Active" ? (
              <div className="bg-primary/5 border border-primary/20 rounded-sm p-2 flex flex-col gap-2 relative overflow-hidden group">
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 blur-3xl rounded-full -mr-8 -mt-8 group-hover:bg-primary/10 transition-colors" />
                
                <div className="flex items-center justify-between relative z-10">
                  <span className="text-[10px] font-bold text-primary uppercase tracking-widest leading-none">Tenant</span>
                  <div className={cn(
                    "text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase",
                    activeTenant?.type === "PROD" ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-primary text-white"
                  )}>
                    {activeTenant?.type || "DEV"}
                  </div>
                </div>
                
                <div className="relative group z-10">
                  <select 
                    value={activeTenant?.id || ""}
                    onChange={(e) => switchTenant(e.target.value)}
                    className="w-full bg-card dark:bg-black border border-primary/20 rounded-sm px-2 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer transition-all"
                  >
                    {availableTenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                  <IconWrapper icon={ChevronRight} size={14} className="absolute right-2 top-1/2 -translate-y-1/2 rotate-90 text-primary pointer-events-none" />
                </div>
              </div>
            ) : activeCustomer && activeCustomer.status !== "Active" ? (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-sm p-2 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest leading-none">{activeCustomer.status}</span>
                </div>
                <span className="text-[10px] text-muted-foreground leading-snug">Tenant and folder access is restricted until the customer is approved and activated.</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-[#333] py-1.5">
        {!collapsed && (
          <div className="px-6 mb-4 flex flex-col gap-3 group/controls">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Navigation</span>
              <div className="flex items-center gap-1 opacity-0 group-hover/controls:opacity-100 transition-opacity">
                 <button 
                   onClick={expandAll}
                   className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground transition-colors"
                   title="Expand All"
                 >
                   <IconWrapper icon={ChevronRight} size={14} className="rotate-90" />
                 </button>
                 <button 
                   onClick={collapseAll}
                   className="p-1 hover:bg-primary/10 hover:text-primary rounded text-muted-foreground transition-colors"
                   title="Collapse All"
                 >
                   <IconWrapper icon={ChevronRight} size={14} className="-rotate-90" />
                 </button>
              </div>
            </div>
            <label className="relative block">
              <IconWrapper
                icon={Search}
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
                placeholder="Search menu"
                className="w-full rounded-sm border border-border bg-card dark:bg-black px-9 py-2 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/15"
              />
            </label>
          </div>
        )}
        <nav className="flex flex-col gap-3 px-3">
          {menuConfig.map((category, idx) => {
            const filteredItems = category.items.filter(item => {
              // 1. Role Check
              if (!item.allowedRoles.includes(role)) return false;
              
              // 2. Service Check (Only for non-Super Admins in specific tenants)
              if (item.requiredService) {
                const services = Array.isArray(item.requiredService) ? item.requiredService : [item.requiredService];
                const hasService = services.some(s => isServiceEnabled(s));
                if (!hasService) return false;
              }

              if (!normalizedMenuSearch) return true;

              const itemMatches = item.name.toLowerCase().includes(normalizedMenuSearch);
              const subItemMatches = item.subItems?.some((sub) =>
                sub.name.toLowerCase().includes(normalizedMenuSearch) &&
                (!sub.allowedRoles || sub.allowedRoles.includes(role))
              );
              
              return itemMatches || Boolean(subItemMatches);
            });

            if (filteredItems.length === 0) return null;

            return (
              <div key={idx} className="flex flex-col gap-1">
                {!collapsed && (
                  <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground mb-1">
                    {category.title}
                  </div>
                )}
                {filteredItems.map((item) => {
                  const isActive = pathname === item.href || (item.subItems && item.subItems.some((sub) => pathname.startsWith(sub.href)));
                  const hasSubItems = Boolean(item.subItems?.length);
                  const itemMatchesSearch = normalizedMenuSearch
                    ? item.name.toLowerCase().includes(normalizedMenuSearch)
                    : false;
                  const baseSubItems = (item.subItems ?? []).filter(sub => !sub.allowedRoles || sub.allowedRoles.includes(role));
                  const visibleSubItems = normalizedMenuSearch
                    ? itemMatchesSearch
                      ? baseSubItems
                      : baseSubItems.filter((sub) =>
                          sub.name.toLowerCase().includes(normalizedMenuSearch)
                        )
                    : baseSubItems;
                  const isGroupOpen = normalizedMenuSearch
                    ? visibleSubItems.length > 0
                    : openGroups[item.name];

                  return (
                    <div key={item.name} className="flex flex-col">
                      <div
                        role="button"
                        onClick={() => {
                          if (hasSubItems && !collapsed) toggleGroup(item.name);
                        }}
                        className="group relative"
                      >
                        <Link
                          href={hasSubItems ? "#" : item.href}
                          className={cn(
                            "flex items-center justify-between px-3 py-1.5 rounded-sm transition-colors duration-200",
                            isActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <IconWrapper icon={item.icon} size={18} className={cn("flex-shrink-0", isActive && "text-primary")} />
                            {!collapsed && <span className="text-sm font-medium menu-item-label transition-all duration-300">{item.name}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            {!collapsed && item.name === "Action Center" && pendingRequests.length > 0 && (
                              <span className={cn(
                                "text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                pendingRequests.some((r) => r.priority === "Critical" || r.priority === "Urgent")
                                  ? "bg-rose-600 animate-pulse shadow-[0_0_10px_rgba(225,29,72,0.5)]" 
                                  : "bg-primary"
                              )}>
                                {pendingRequests.length}
                              </span>
                            )}
                            {!collapsed && hasSubItems && (
                              <div className="text-muted-foreground transition-transform duration-200" style={{ transform: isGroupOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}>
                                <ChevronRight size={14} />
                              </div>
                            )}
                          </div>
                        </Link>
                      </div>

                      <AnimatePresence>
                        {!collapsed && hasSubItems && isGroupOpen && visibleSubItems.length > 0 && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex flex-col gap-1 mt-1 pl-9 border-l-2 border-border dark:border-[#222] ml-4">
                              {visibleSubItems.map((sub) => (
                                <Link
                                  key={sub.name}
                                  href={sub.href}
                                  className={cn(
                                    "px-3 py-1.5 rounded-sm text-sm transition-colors flex items-center justify-between",
                                    pathname === sub.href
                                      ? "text-indigo-600 dark:text-indigo-400 font-medium"
                                      : "text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
                                  )}
                                >
                                  <span className="submenu-item-label transition-all duration-300">{sub.name}</span>
                                  {sub.name === "Approval Hub" && pendingRequests.length > 0 && (
                                    <span className="text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.4)]">
                                      {pendingRequests.length}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            );
          })}
          {!menuConfig.some((category) =>
            category.items.some((item) => {
              if (!item.allowedRoles.includes(role)) return false;
              if (item.requiredService) {
                const services = Array.isArray(item.requiredService) ? item.requiredService : [item.requiredService];
                const hasService = services.some((s) => isServiceEnabled(s));
                if (!hasService) return false;
              }
              if (!normalizedMenuSearch) return true;
              return (
                item.name.toLowerCase().includes(normalizedMenuSearch) ||
                item.subItems?.some((sub) =>
                  sub.name.toLowerCase().includes(normalizedMenuSearch)
                )
              );
            })
          ) && !collapsed && (
            <div className="px-3 py-4 text-sm text-muted-foreground">
              No menu items match "{menuSearch}".
            </div>
          )}
        </nav>
      </div>

      {/* Account / Footer Area */}
      <div className="p-2 border-t border-border dark:border-[#333]">
        {!collapsed && (
          <div className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground dark:text-muted-foreground mb-2 mt-1">
            Account
          </div>
        )}
        <div className="flex flex-col gap-1">
          {accountConfig.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-sm transition-colors duration-200",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                    : "text-muted-foreground dark:text-muted-foreground hover:bg-muted dark:hover:bg-[#222] hover:text-foreground dark:hover:text-white"
                )}
              >
                <IconWrapper icon={item.icon} size={18} className="flex-shrink-0" />
                {!collapsed && <span className="text-sm font-medium menu-item-label transition-all duration-300">{item.name}</span>}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Alo Agent Quick Launcher */}
      <div className="p-2 border-t border-border dark:border-[#333]">
        <Link
          href="/next-gen/bot-agents"
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-sm transition-all duration-200 group/alo",
            pathname?.startsWith("/next-gen/bot-agents")
              ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400"
              : "text-muted-foreground hover:bg-rose-50 dark:hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
          )}
        >
          <div className="relative flex-shrink-0">
            <MessageSquare size={18} />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          </div>
          {!collapsed && (
            <span className="text-sm font-bold menu-item-label transition-all duration-300">
              Alo Agent
            </span>
          )}
        </Link>
      </div>
    </motion.aside>
  );
};
