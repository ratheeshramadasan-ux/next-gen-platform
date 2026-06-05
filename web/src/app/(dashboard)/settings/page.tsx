"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { PageContainer } from "@/components/next-gen/v2/page-container";
import { Settings, User, Bell, Globe, Database, Key, ShieldCheck, Palette } from "lucide-react";

export default function SettingsPage() {
  return (
    <PageContainer
      title="Settings"
      description="Configure your personal preferences, workspace environments, and platform-wide defaults."
      actions={
         <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95">
            Save Preferences
         </button>
      }
    >
      <div className="flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
           {/* Sidebar Links for Settings */}
           <div className="lg:col-span-1 flex flex-col gap-1">
              {[
                { label: "General", icon: Settings, active: true },
                { label: "Profile", icon: User },
                { label: "Notifications", icon: Bell },
                { label: "Language", icon: Globe },
                { label: "Personalization", icon: Palette },
                { label: "Advanced", icon: Key },
              ].map(link => (
                <button 
                  key={link.label}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-left",
                    link.active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                   <link.icon className="w-4 h-4" />
                   {link.label}
                </button>
              ))}
           </div>

           {/* Settings Content Area */}
           <div className="lg:col-span-3 flex flex-col gap-8">
              <div className="flex flex-col gap-6">
                 <div className="flex flex-col gap-1 border-b border-border/30 pb-4">
                    <h3 className="text-xl font-bold tracking-tight">General Options</h3>
                    <p className="text-xs text-muted-foreground">Manage your primary system experience and default behaviors.</p>
                 </div>

                 <div className="space-y-6">
                    <div className="flex items-center justify-between group">
                       <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">Immersive View</span>
                          <span className="text-xs text-muted-foreground">Automatically hide UI elements when using the Visual Designer.</span>
                       </div>
                       <div className="w-10 h-5 rounded-full bg-primary relative cursor-pointer">
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white" />
                       </div>
                    </div>

                    <div className="flex items-center justify-between group">
                       <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-bold">Autosave Logic</span>
                          <span className="text-xs text-muted-foreground">Continuously sync logic mutations to the forensic ledger.</span>
                       </div>
                       <div className="w-10 h-5 rounded-full bg-primary relative cursor-pointer">
                          <div className="absolute top-1 right-1 w-3 h-3 rounded-full bg-white" />
                       </div>
                    </div>

                    <div className="flex flex-col gap-2">
                       <span className="text-sm font-bold">Default AI Instance</span>
                       <select className="bg-background border border-border/60 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer">
                          <option>Sovereign GPT-4o (Standard)</option>
                          <option>Claude 3.5 Sonnet</option>
                          <option>Llama 3 Local Hub</option>
                       </select>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-6 pt-4">
                 <div className="flex flex-col gap-1 border-b border-border/30 pb-4">
                    <h3 className="text-xl font-bold tracking-tight text-rose-500">Danger Zone</h3>
                    <p className="text-xs text-muted-foreground">Irreversible workspace actions that impact data integrity.</p>
                 </div>
                 <div className="flex items-center justify-between p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl">
                    <div className="flex flex-col gap-0.5">
                       <span className="text-sm font-bold text-rose-500">Purge Audit Logs</span>
                       <span className="text-xs text-muted-foreground">This will permanently delete all forensic traces in the current space.</span>
                    </div>
                    <button className="bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg active:scale-95">
                        Destroy History
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </div>
    </PageContainer>
  );
}

