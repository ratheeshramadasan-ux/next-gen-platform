"use client";

import React from "react";
import { Bug, Play, FileText, Settings } from "lucide-react";
import { motion } from "framer-motion";

export default function TestLabPage() {
  return (
    <div className="space-y-6 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-primary/20 flex items-center justify-center text-primary border border-primary/30">
              <Bug size={22} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Test Studio</h1>
          </div>
          <p className="text-muted-foreground text-sm max-w-xl">
            Test and debug your automations before deploying to production. Run simulations with test data and review execution traces.
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Play, title: "Run Test", desc: "Execute a workflow with test data", color: "text-emerald-500", bg: "bg-emerald-500/5 border-emerald-500/20" },
          { icon: FileText, title: "Test Suites", desc: "Manage reusable test configurations", color: "text-blue-500", bg: "bg-blue-500/5 border-blue-500/20" },
          { icon: Settings, title: "Test Settings", desc: "Configure test environments and timeouts", color: "text-amber-500", bg: "bg-amber-500/5 border-amber-500/20" },
        ].map((action, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className={`flex flex-col items-start gap-3 p-5 rounded-sm border ${action.bg} hover:shadow-md transition-all text-left group`}
          >
            <action.icon size={22} className={action.color} />
            <div>
              <p className="text-sm font-bold group-hover:text-primary transition-colors">{action.title}</p>
              <p className="text-[11px] text-muted-foreground/50 mt-1">{action.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Empty State */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div className="w-16 h-16 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-6">
          <Bug size={28} className="text-amber-500/40" />
        </div>
        <h3 className="text-lg font-bold text-foreground/60 mb-2">No test results yet</h3>
        <p className="text-sm text-muted-foreground/50 max-w-sm">
          Run your first test to see execution traces, variable states, and performance metrics here.
        </p>
      </motion.div>
    </div>
  );
}
