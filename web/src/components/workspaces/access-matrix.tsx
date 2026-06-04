"use client";

import React, { useState, useEffect } from "react";
import { 
  Shield, User, Users, Lock, Unlock, ChevronRight, 
  Check, X, AlertCircle, Info, Trash2, Key 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  getFolderPermissions, 
  updateFolderPermission, 
  breakInheritanceAction 
} from "@/app/actions/folderAccessActions";
import { getIdentityGroups, getIdentityUsers } from "@/app/actions/accessActions";

interface AccessMatrixProps {
  folderId: string;
  folderName: string;
  parentId?: string | null;
  onClose: () => void;
}

export default function AccessMatrix({ folderId, folderName, parentId, onClose }: AccessMatrixProps) {
  const [permissions, setPermissions] = useState<any[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      const [perms, users, groups] = await Promise.all([
        getFolderPermissions(folderId),
        getIdentityUsers({ role: "Platform Admin" }), // Simplified fetch for now
        getIdentityGroups()
      ]);
      setPermissions(perms);
      setAvailableUsers(users);
      setAvailableGroups(groups);
      setLoading(false);
    }
    load();
  }, [folderId]);

  const handleUpdate = async (principalId: string, principalType: string, level: string) => {
    setSaving(true);
    const res = await updateFolderPermission({
      folderId,
      principalType,
      principalId,
      permission: level
    });
    if (res.success) {
      const updated = await getFolderPermissions(folderId);
      setPermissions(updated);
    }
    setSaving(false);
  };

  const handleBreakInheritance = async () => {
    setSaving(true);
    const res = await breakInheritanceAction(folderId);
    if (res.success) {
      const updated = await getFolderPermissions(folderId);
      setPermissions(updated);
    }
    setSaving(false);
  };

  const permissionLevels = ["VIEW", "EDIT", "EXECUTE", "MANAGE"];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-4xl bg-card border border-border rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <header className="p-6 border-b border-border bg-muted/20 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center text-primary">
                <Shield size={24} />
             </div>
             <div>
                <h2 className="text-xl font-bold tracking-tight">Access Matrix: {folderName}</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-0.5">Hierarchical Governance</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-sm transition-colors">
             <X size={20} className="text-muted-foreground" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
           {/* Inheritance Status */}
           <div className={cn(
             "p-4 rounded-sm border flex items-center justify-between",
             parentId ? "bg-indigo-50/50 border-indigo-200 dark:bg-indigo-500/5 dark:border-indigo-500/20" : "bg-muted/50 border-border"
           )}>
              <div className="flex items-center gap-3">
                 {parentId ? <Lock size={20} className="text-indigo-500" /> : <Unlock size={20} className="text-muted-foreground" />}
                 <div>
                    <p className="text-sm font-bold">{parentId ? "Inheriting Permissions" : "Managed Explicitly"}</p>
                    <p className="text-xs text-muted-foreground">
                      {parentId ? "Permissions are being passed down from the parent directory." : "This folder defines its own security boundary."}
                    </p>
                 </div>
              </div>
              {parentId && (
                <button 
                  onClick={handleBreakInheritance}
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-sm text-xs font-extrabold uppercase tracking-widest shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                >
                  Break Inheritance
                </button>
              )}
           </div>

           {/* Matrix Table */}
           <div className="space-y-4">
              <div className="grid grid-cols-[1fr,repeat(4,100px)] gap-4 px-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest border-b border-border pb-2">
                 <span>Identity / Group</span>
                 {permissionLevels.map(lvl => <span key={lvl} className="text-center">{lvl}</span>)}
              </div>

              <div className="space-y-2">
                 {/* Current Permissions */}
                 {permissions.map((perm) => {
                    const isGroup = perm.principalType === "GROUP";
                    const label = isGroup 
                      ? availableGroups.find(g => g.id === perm.principalId)?.name 
                      : availableUsers.find(u => u.id === perm.principalId)?.email;

                    return (
                      <div key={perm.id} className="grid grid-cols-[1fr,repeat(4,100px)] gap-4 px-4 py-3 bg-muted/20 border border-border/50 rounded-sm items-center">
                         <div className="flex items-center gap-3">
                            {isGroup ? <Users size={16} className="text-primary" /> : <User size={16} className="text-muted-foreground" />}
                            <div className="flex flex-col">
                               <span className="text-sm font-bold truncate max-w-[200px]">{label || "Unknown Principal"}</span>
                               {perm.inheritedFlag && <span className="text-[8px] font-extrabold text-indigo-500 uppercase">Inherited</span>}
                            </div>
                         </div>
                         {permissionLevels.map(lvl => (
                           <div key={lvl} className="flex justify-center">
                              <button 
                                onClick={() => handleUpdate(perm.principalId, perm.principalType, lvl)}
                                className={cn(
                                  "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                                  perm.permission === lvl ? "bg-primary text-white" : "bg-muted/50 hover:bg-muted text-muted-foreground"
                                )}
                              >
                                {perm.permission === lvl && <Check size={14} />}
                              </button>
                           </div>
                         ))}
                      </div>
                    );
                 })}

                 {/* Empty State */}
                 {permissions.length === 0 && (
                   <div className="py-20 flex flex-col items-center justify-center text-center opacity-30 gap-4">
                      <Shield size={48} className="stroke-[1]" />
                      <p className="text-sm font-bold uppercase tracking-widest">No explicit permissions set</p>
                   </div>
                 )}
              </div>
           </div>
        </div>

        <footer className="p-6 border-t border-border bg-muted/5 flex justify-between items-center">
           <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Key size={14} /> Deny overrides Allow logic is active by default.
           </div>
           <button onClick={onClose} className="px-8 py-3 bg-primary text-white rounded-sm text-sm font-bold shadow-xl shadow-primary/20 hover:scale-102 active:scale-98 transition-all">
              Save Configuration
           </button>
        </footer>
      </div>
    </motion.div>
  );
}
