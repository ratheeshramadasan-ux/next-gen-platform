"use client";

import React from "react";
import { Rocket, ArrowRight, Shield, Zap, Database } from "lucide-react";
import { motion } from "framer-motion";

export default function DeployPage() {
  const environments = [
    { name: "Development", code: "DEV", color: "bg-emerald-500", borderColor: "border-emerald-500/20", bgColor: "bg-emerald-500/5", icon: Zap },
    { name: "User Acceptance Testing", code: "UAT", color: "bg-blue-500", borderColor: "border-blue-500/20", bgColor: "bg-blue-500/5", icon: Database },
    { name: "Production", code: "PROD", color: "bg-rose-500", borderColor: "border-rose-500/20", bgColor: "bg-rose-500/5", icon: Shield },
  ];

  return (
    <div className="space-y-8 overflow-y-auto h-full custom-scrollbar">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
            <Rocket size={22} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight">Deployment Manager</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-xl">
          Promote your automations across environments. Manage releases with version control and approval gates.
        </p>
      </div>

      {/* Pipeline Visualization */}
      <div className="flex items-center gap-4 p-6 bg-card border border-border/40 rounded-sm">
        {environments.map((env, i) => (
          <React.Fragment key={env.code}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.15 }}
              className={`flex-1 p-5 rounded-sm border ${env.borderColor} ${env.bgColor} flex flex-col items-center gap-3 text-center`}
            >
              <div className={`w-10 h-10 rounded-sm ${env.color} text-white flex items-center justify-center`}>
                <env.icon size={20} />
              </div>
              <div>
                <p className="text-sm font-bold">{env.name}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/50 mt-1">{env.code}</p>
              </div>
              <span className="text-[10px] text-muted-foreground/40 italic">No packages deployed</span>
            </motion.div>
            {i < environments.length - 1 && (
              <div className="flex flex-col items-center gap-1 text-muted-foreground/30">
                <ArrowRight size={20} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Promote</span>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Empty State */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center justify-center py-12 text-center"
      >
        <p className="text-sm text-muted-foreground/40 max-w-md">
          Build and save an automation in the Visual Designer, then return here to deploy it across your environments.
        </p>
      </motion.div>
    </div>
  );
}
