"use client";

import React from "react";
import { Zap, Share2, Webhook, Box, Cloud, Key, Link2 } from "lucide-react";
import { motion } from "framer-motion";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import Link from "next/link";

export default function IntegrationHubPage() {
  const modules = [
    { title: "API Connectors", desc: "REST / SOAP / XML integration pool", icon: Share2, href: "/next-gen/integration-hub/connectors", color: "bg-blue-600" },
    { title: "Webhook Manager", desc: "Event-driven system triggers", icon: Webhook, href: "/next-gen/integration-hub/webhooks", color: "bg-orange-600" },
    { title: "External Tools", desc: "SAP, Salesforce, SAP, ServiceNow", icon: Box, href: "/next-gen/integration-hub/tools", color: "bg-indigo-600" },
    { title: "Swagger Hub", desc: "Auto-generated API documentation", icon: Link2, href: "/next-gen/integration-hub/swagger", color: "bg-emerald-600" },
  ];

  return (
    <div className="space-y-12">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-sm bg-orange-500/20 flex items-center justify-center text-orange-500 border border-orange-500/30">
                <Zap size={22} />
             </div>
             <h1 className="text-3xl font-extrabold tracking-tight">Integration Hub</h1>
          </div>
          <p className="text-muted-foreground text-lg max-w-2xl">
            Connect the platform to your entire digital ecosystem. 
            Manage API credentials, configure webhooks, and explore pre-built enterprise connectors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {modules.map((mod, i) => (
          <motion.div key={mod.title} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
            <Link href={mod.href} className="flex flex-col h-full bg-white/5 border border-white/10 rounded-sm p-8 hover:bg-white/[0.08] transition-all group">
              <div className={cn("w-14 h-14 rounded-sm flex items-center justify-center mb-6 text-white text-xl shadow-xl shadow-orange-500/10", mod.color)}>
                 <IconWrapper icon={mod.icon} size={28} />
              </div>
              <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">{mod.title}</h3>
              <p className="text-sm text-muted-foreground">{mod.desc}</p>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Integration Cloud Grid */}
      <div className="bg-white/5 border border-white/10 rounded-sm p-10">
         <h4 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-10 flex items-center gap-2">
            <Cloud size={16} /> Connected Services
         </h4>
         <div className="grid grid-cols-2 md:grid-cols-6 gap-8 grayscale hover:grayscale-0 transition-all opacity-50 hover:opacity-100">
            <IntegrationLogo name="SAP" />
            <IntegrationLogo name="Salesforce" />
            <IntegrationLogo name="ServiceNow" />
            <IntegrationLogo name="Azure AD" />
            <IntegrationLogo name="AWS" />
            <IntegrationLogo name="GCP" />
         </div>
      </div>

      <div className="flex gap-6">
         <div className="flex-1 bg-primary/10 border border-primary/20 rounded-sm p-8 flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="w-12 h-12 rounded-sm bg-primary flex items-center justify-center text-white">
                  <Key size={24} />
               </div>
               <div>
                  <h4 className="text-lg font-bold">Credential Vault</h4>
                  <p className="text-sm text-muted-foreground">Securely manage OAuth tokens and API keys.</p>
               </div>
            </div>
            <button className="px-6 py-2 bg-primary text-white rounded-sm text-sm font-bold">Manage Keys</button>
         </div>
      </div>
    </div>
  );
}

const IntegrationLogo = ({ name }: { name: string }) => (
  <div className="aspect-square bg-white/5 rounded-sm border border-white/5 flex items-center justify-center text-xs font-bold text-muted-foreground uppercase tracking-widest hover:border-white/20 hover:bg-white/10 transition-all cursor-pointer">
     {name}
  </div>
);

const cn = (...classes: any[]) => classes.filter(Boolean).join(" ");
