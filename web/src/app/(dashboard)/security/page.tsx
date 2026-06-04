"use client";

import React from "react";
import { PageContainer } from "@/components/dashboard/v2/page-container";
import { Lock, Shield, Key, Users, History, AlertCircle, Fingerprint } from "lucide-react";
import { getTenantUsers } from "@/app/actions/adminActions";
import { useAppContext } from "@/lib/context";

export default function SecurityPage() {
  const { activeTenant } = useAppContext();
  const [users, setUsers] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (activeTenant) {
       getTenantUsers(activeTenant.id).then(setUsers);
    }
  }, [activeTenant?.id]);

  return (
    <PageContainer
      title="Security & Identity"
      description="Manage the sovereign identity kernel, access control policies, and cryptographic keys."
      actions={
         <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Rotate Keys
         </button>
      }
    >
      <div className="flex flex-col gap-8">
        {/* User Management Section */}
        <div className="flex flex-col gap-4">
           <div className="flex items-center justify-between px-1">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Tenant Members ({users.length})</h4>
              <button className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                 <Shield className="w-3 h-3" />
                 Grant Access
              </button>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map((user) => (
                <div key={user.id} className="bg-muted/30 border border-border/40 p-5 rounded-2xl flex items-center justify-between group hover:bg-muted/50 transition-all">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center text-primary font-black text-xs">
                         {user.firstName?.[0] || user.email[0].toUpperCase()}
                      </div>
                      <div className="flex flex-col">
                         <span className="text-sm font-bold">{user.firstName} {user.lastName}</span>
                         <span className="text-[10px] font-medium text-muted-foreground">{user.email}</span>
                      </div>
                   </div>
                   <div className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 text-[8px] font-black uppercase">
                      {user.roleType || "User"}
                   </div>
                </div>
              ))}
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="bg-muted/30 border border-border/40 p-6 rounded-3xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center border border-border/50">
                 <Key className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                 <h3 className="text-lg font-bold">API Key Vault</h3>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                   Manage persistent authentication keys for external service interactions and kernel access.
                 </p>
              </div>
              <button className="bg-muted border border-border/50 py-2 rounded-xl text-xs font-bold mt-auto">Manage Keys</button>
           </div>

           <div className="bg-muted/30 border border-border/40 p-6 rounded-3xl flex flex-col gap-4">
              <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center border border-border/50">
                 <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex flex-col gap-1">
                 <h3 className="text-lg font-bold">RBAC Scopes</h3>
                 <p className="text-xs text-muted-foreground leading-relaxed">
                   Define fine-grained access control templates based on organizational roles and resource paths.
                 </p>
              </div>
              <button className="bg-muted border border-border/50 py-2 rounded-xl text-xs font-bold mt-auto">Edit Roles</button>
           </div>
        </div>

        <div className="flex flex-col gap-4 mt-4">
           <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Global Security Log</h4>
           <div className="bg-muted/10 border border-border/40 rounded-2xl p-8 min-h-[250px] flex flex-col items-center justify-center text-center gap-4 relative overflow-hidden">
              <div className="absolute inset-0 studio-grid-dots opacity-20" />
              <History className="w-8 h-8 opacity-20 relative z-10" />
              <p className="text-xs font-medium text-muted-foreground relative z-10 uppercase tracking-widest leading-loose">No critical security events detected in the last 48 hours.</p>
           </div>
        </div>
      </div>
    </PageContainer>
  );
}
