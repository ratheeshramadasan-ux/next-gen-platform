"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Building2, 
  Globe, 
  Palette, 
  Type, 
  Sparkles, 
  History, 
  KeyRound, 
  Fingerprint,
  Monitor,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Laptop
} from "lucide-react";
import { useAppContext } from "@/lib/context";
import { cn } from "@/lib/utils";
import { IconWrapper } from "@/components/ui/icon-wrapper";

export default function ProfilePage() {
  const { 
    currentUser, 
    role, 
    activeCustomer, 
    activeTenant,
    activeTheme,
    activeFont,
    activeIconSet,
    auditLogs
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"overview" | "security">("overview");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 24 }
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar pb-10">
      {/* Header / Hero Section */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-sm p-8 border border-white/10 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent backdrop-blur-md"
      >
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-4 border-white/20 shadow-2xl relative overflow-hidden">
              <span className="text-4xl font-black text-primary drop-shadow-sm">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </span>
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/40 to-transparent pointer-events-none" />
            </div>
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 border-4 border-background flex items-center justify-center shadow-lg"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
            </motion.div>
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-2">
            <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{currentUser.name}</h1>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">{role}</span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="w-4 h-4" />
                <span>{currentUser.email}</span>
              </div>
              <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              <div className="flex items-center gap-2 text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>Identity Verified</span>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
             <div className="flex flex-col items-end px-6 py-3 rounded-sm bg-white/5 border border-white/10 backdrop-blur-sm">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mb-1">Status</span>
                <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  Active
                </span>
             </div>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-primary/20 rounded-full blur-[80px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none" />
      </motion.div>

      {/* Tabs / Navigation */}
      <div className="flex items-center gap-1 p-1 bg-white/5 border border-white/10 rounded-sm w-fit">
        {[
          { id: "overview", label: "Identity Overview", icon: Laptop },
          { id: "security", label: "Security & Access", icon: Fingerprint },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-sm text-xs font-bold transition-all duration-300",
              activeTab === tab.id 
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <motion.div 
        key={activeTab}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {activeTab === "overview" && (
          <>
            {/* Account Scope Card */}
            <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-sm bg-white/5 border border-white/10 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                       <Building2 className="w-4 h-4 text-primary" />
                       Organization Profile
                    </h3>
                    <ExternalLink className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Active Customer</span>
                      <span className="text-lg font-bold text-foreground tracking-tight">{activeCustomer?.companyName || "N/A"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Industry</span>
                      <span className="text-sm font-medium text-foreground">{activeCustomer?.industry || "Enterprise Automation"}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase">
                        {activeCustomer?.status || "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-sm bg-white/5 border border-white/10 backdrop-blur-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                       <Globe className="w-4 h-4 text-primary" />
                       Domain Environment
                    </h3>
                    <Monitor className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Current Tenant</span>
                      <span className="text-lg font-bold text-foreground tracking-tight">{activeTenant?.name || "Global Control"}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Deployment Code</span>
                      <span className="text-sm font-mono font-bold text-primary">{activeTenant?.code || "GEN-SYS-001"}</span>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <span className={cn(
                        "text-[10px] font-bold px-2 py-0.5 rounded uppercase",
                        activeTenant?.type === "PROD" ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "bg-primary text-white"
                      )}>
                        {activeTenant?.type || "STAGING"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* System Preferences Card */}
              <div className="p-6 rounded-sm bg-white/5 border border-white/10 backdrop-blur-sm space-y-6">
                 <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                     <Palette className="w-4 h-4 text-primary" />
                     System Preferences
                  </h3>
                  <a 
                    href="/dashboard/settings/theme"
                    className="flex items-center gap-2 px-4 py-2 rounded-sm bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
                  >
                    Customize Appearance
                    <ChevronRight className="w-3 h-3" />
                  </a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Active Theme</span>
                      <div className="flex items-center gap-2">
                         <div className="w-2 h-2 rounded-full bg-primary" />
                         <span className="text-sm font-bold">{activeTheme}</span>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Interface Font</span>
                      <div className="flex items-center gap-2">
                         <Type className="w-3 h-3 text-muted-foreground" />
                         <span className="text-sm font-bold">{activeFont}</span>
                      </div>
                   </div>
                   <div className="space-y-1">
                      <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Icon Set</span>
                      <div className="flex items-center gap-2">
                         <Sparkles className="w-3 h-3 text-muted-foreground" />
                         <span className="text-sm font-bold">{activeIconSet}</span>
                      </div>
                   </div>
                </div>
              </div>
            </motion.div>

            {/* Side Status Panel */}
            <motion.div variants={itemVariants} className="space-y-6">
              <div className="p-6 rounded-sm bg-white/5 border border-white/10 backdrop-blur-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                     <History className="w-4 h-4 text-primary" />
                     Recent Activity
                  </h3>
                </div>
                <div className="space-y-4">
                  {auditLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="flex gap-3 p-2 rounded-sm hover:bg-white/5 transition-colors border border-transparent group">
                      <div className="w-1 h-full self-stretch rounded-full bg-primary/30 group-hover:bg-primary transition-colors" />
                      <div className="flex-1 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold text-foreground">{log.action}</span>
                          <span className="text-[8px] font-mono text-muted-foreground/50">
                            {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground line-clamp-1">
                          Ref: {log.target}
                        </p>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-4">No recent session data.</p>
                  )}
                </div>
              </div>

               <div className="p-6 rounded-sm bg-gradient-to-br from-indigo-500/10 to-primary/5 border border-white/10 backdrop-blur-md space-y-6">
                 <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">System Entitlements</h3>
                 <div className="space-y-4">
                   {[
                     { label: "Studio Designer", status: "Full Access" },
                     { label: "Cloud Execution", status: "Enterprise" },
                     { label: "AI Insights", status: "Advanced" },
                     { label: "Governance Engine", status: "Admin" },
                   ].map((item) => (
                     <div key={item.label} className="flex items-center justify-between group">
                       <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                       <span className="text-[10px] font-black text-primary uppercase tracking-widest">{item.status}</span>
                     </div>
                   ))}
                 </div>
                 <div className="pt-4 border-t border-white/5">
                   <button className="w-full py-3 rounded-sm bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground hover:bg-white/10 transition-all">
                      Upgrade Licenses
                   </button>
                 </div>
               </div>

               <div className="p-6 rounded-sm bg-white/5 border border-white/10 backdrop-blur-sm space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Platform Version</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-black text-foreground">v.2.8.4</span>
                    <span className="text-[10px] font-bold text-emerald-500 uppercase">Up to date</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Experience the next generation of automation architecture.
                  </p>
               </div>
            </motion.div>
          </>
        )}

        {activeTab === "security" && (
          <motion.div variants={itemVariants} className="lg:col-span-3 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-6 rounded-sm bg-white/5 border border-white/10 backdrop-blur-sm space-y-8">
                 <div className="space-y-2">
                   <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                     <KeyRound className="w-4 h-4 text-primary" />
                     Authentication Methods
                   </h3>
                   <p className="text-xs text-muted-foreground">Manage how you access the Next Gen ecosystem.</p>
                 </div>

                 <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 rounded-sm bg-white/5 border border-white/10 group hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center text-primary">
                          <Fingerprint className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">Multi-Factor Auth</span>
                          <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Enabled & Verified</span>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 rounded-sm bg-white/5 text-[10px] font-bold uppercase hover:bg-white/10 transition-colors">Configure</button>
                   </div>

                   <div className="flex items-center justify-between p-4 rounded-sm bg-white/5 border border-white/10 group hover:border-primary/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center text-primary">
                          <KeyRound className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold">Platform Password</span>
                          <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Last changed 4 months ago</span>
                        </div>
                      </div>
                      <button className="px-3 py-1.5 rounded-sm bg-white/5 text-[10px] font-bold uppercase hover:bg-white/10 transition-colors">Update</button>
                   </div>
                 </div>
              </div>

              <div className="p-6 rounded-sm bg-white/5 border border-white/10 backdrop-blur-sm space-y-6">
                 <div className="space-y-2">
                   <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                     <ShieldCheck className="w-4 h-4 text-primary" />
                     Access Control (RBAC)
                   </h3>
                   <p className="text-xs text-muted-foreground">Permissions inherited from your assigned roles.</p>
                 </div>

                 <div className="flex flex-wrap gap-2">
                   {["IAM_ADMIN", "ORCHESTRATOR_READ", "STUDIO_FULL", "AUDIT_REPORTER", "MFA_OVERRIDE"].map(perm => (
                     <div key={perm} className="px-3 py-1.5 rounded-sm bg-primary/5 border border-primary/20 text-[10px] font-mono font-bold text-primary">
                       {perm}
                     </div>
                   ))}
                 </div>
                 
                 <div className="p-4 rounded-sm bg-amber-500/5 border border-amber-500/20">
                    <p className="text-[10px] text-amber-500 font-bold leading-relaxed mb-1">IMPERSONATION POLICY</p>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      As a {role}, your identity is protected by the Enterprise Security Gateway. 
                      All login attempts from new devices will trigger an automated SOC alert.
                    </p>
                 </div>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
