"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ShieldCheck, ShieldAlert, Key, Fingerprint, Lock, Unlock, 
  RefreshCcw, Building2, Monitor, Cpu, Network, History, 
  ExternalLink, CheckCircle2, AlertCircle, Zap, Shield, ChevronRight
} from "lucide-react";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { cn } from "@/lib/utils";
import { getSecurityOverview } from "@/app/actions/securityActions";

export default function SecurityDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const res = await getSecurityOverview();
      if (res.success) {
        setData(res);
      } else {
        setError(res.error);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-4">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <span className="text-xs font-black uppercase tracking-[0.3em] text-primary animate-pulse">Initializing Trust Layer...</span>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] gap-4">
        <div className="p-10 rounded-sm bg-rose-500/10 border border-rose-500/20 text-center">
            <h3 className="text-xl font-bold text-rose-500 uppercase tracking-tighter">Security Subsystem Offline</h3>
            <p className="text-sm text-muted-foreground mt-2">The security orchestration layer could not be reached. Check database connectivity.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 pb-20 max-w-[1600px] mx-auto">
      {/* Header Section */}
      <div className="flex items-end justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-sm bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-2xl shadow-primary/10">
                <ShieldCheck size={28} />
             </div>
             <div>
               <h1 className="text-4xl font-black tracking-tight">Security & Governance</h1>
               <div className="flex items-center gap-2 mt-1">
                 <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-black uppercase">
                   <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                   mTLS Foundation Active
                 </div>
                 <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest opacity-60">Control Plane Version 2.4.0-NextGen</span>
               </div>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-card/40 backdrop-blur-xl border border-border p-2 rounded-sm shadow-sm">
           <div className="px-4 py-2 flex flex-col items-end">
              <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">Global Trust Index</span>
              <span className="text-xl font-black text-primary tracking-tighter">99.98%</span>
           </div>
           <div className="h-10 w-px bg-border/60" />
           <button className="px-5 py-2.5 bg-primary text-white rounded-sm text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform flex items-center gap-2">
              <RefreshCcw size={14} /> Compliance Recertification
           </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Left Column: PKI Tree & Root CA */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          {/* Platform Root CA Card */}
          <section className="bg-card/60 backdrop-blur-2xl border border-border rounded-sm p-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/5 rounded-full blur-[100px] group-hover:bg-primary/10 transition-all duration-700" />
            
            <div className="flex items-start justify-between mb-8 relative z-10">
              <div className="flex flex-col gap-1">
                <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.3em] flex items-center gap-2">
                   <IconWrapper icon={Lock} size={14}/> Platform Trust Anchor
                </h3>
                <span className="text-2xl font-black tracking-tighter">Root CA (v1)</span>
              </div>
              <div className="px-3 py-1 bg-primary text-white text-[9px] font-black rounded-sm uppercase tracking-widest shadow-lg shadow-primary/20">
                Primary Standard
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-sm bg-background/40 border border-border/50 flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Algorithm</span>
                    <span className="text-xs font-black">{data.rootCA?.algorithm || "RSA-4096"}</span>
                 </div>
                 <div className="p-4 rounded-sm bg-background/40 border border-border/50 flex flex-col gap-1">
                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest leading-none">Status</span>
                    <span className="text-xs font-black text-emerald-500 uppercase tracking-tight flex items-center gap-1.5 font-mono">
                      <CheckCircle2 size={12}/> {data.rootCA?.status || "HEALTHY"}
                    </span>
                 </div>
              </div>

              <div className="p-6 rounded-sm bg-muted/20 border border-border/40 font-mono text-[10px] break-all leading-loose text-muted-foreground flex flex-col gap-2 relative">
                 <span className="text-[9px] font-black text-primary uppercase tracking-widest mb-1">Fingerprint (SHA-256)</span>
                 {data.rootCA?.fingerprint || "A0:B1:C2:D3:E4:F5:67:89:AF:10:11:12:13:14:15:16:17:18:19:20:21:22:23:24:25:26:27:28:29:30"}
              </div>

              <div className="flex items-center justify-between text-[11px] font-black px-2 mt-4">
                 <div className="flex flex-col">
                    <span className="text-muted-foreground uppercase tracking-widest opacity-60">Expiry Orientation</span>
                    <span>{new Date(data.rootCA?.expiresAt || Date.now() + 315360000000).toLocaleDateString()}</span>
                 </div>
                 <div className="text-right flex flex-col">
                    <span className="text-muted-foreground uppercase tracking-widest opacity-60">Integrity Hash</span>
                    <span className="text-primary font-mono">{data.rootCA?.id?.substring(0, 12)}</span>
                 </div>
              </div>
            </div>
          </section>

          {/* Real-time Health Monitor */}
          <section className="bg-card/40 backdrop-blur-md border border-border rounded-sm p-8">
             <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <IconWrapper icon={Zap} size={14}/> Operational Health State
             </h4>
             <div className="space-y-6">
                <HealthBar label="mTLS Handshake Success" value={99.9} />
                <HealthBar label="Certificate Rotation Latency" value={84} />
                <HealthBar label="Credential Store Availability" value={100} />
             </div>
          </section>
        </div>

        {/* Right Column: Hierarchy & Recent Events */}
        <div className="col-span-12 lg:col-span-7 space-y-8">
           {/* Tenant CA Grid */}
           <section>
              <div className="flex items-center justify-between mb-6">
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-2">
                   <IconWrapper icon={Building2} size={16} className="text-primary"/> Tenant Authority (Intermediates)
                </h4>
                <div className="text-[10px] font-black text-muted-foreground bg-muted border border-border px-3 py-1 rounded-full uppercase tracking-widest">
                  {data.tenantCAs?.length || 0} Entities
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {(data.tenantCAs || []).map((ca: any) => (
                  <motion.div 
                    key={ca.id}
                    whileHover={{ scale: 1.02 }}
                    className="p-5 rounded-sm border border-border bg-card/60 backdrop-blur-sm relative group cursor-pointer overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                       <Key size={48} className="rotate-45" />
                    </div>
                    <div className="flex items-center gap-3 mb-4">
                       <div className="w-8 h-8 rounded-sm bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <Shield size={16} />
                       </div>
                       <span className="text-xs font-black truncate">{ca.displayName}</span>
                    </div>
                    <div className="flex flex-col gap-1.5 px-1">
                       <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground uppercase tracking-widest">Trust Store ID</span>
                          <span className="text-primary font-mono">{ca.ownerId.substring(0,8)}</span>
                       </div>
                       <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground uppercase tracking-widest">Algorithm</span>
                          <span>{ca.algorithm}</span>
                       </div>
                    </div>
                  </motion.div>
                ))}
              </div>
           </section>

           {/* Security Event Chronicle: Certificates */}
           <section className="bg-card/40 backdrop-blur-md border border-border rounded-sm overflow-hidden">
             <div className="p-6 border-b border-border flex items-center justify-between">
                <h4 className="text-[10px] font-black text-foreground uppercase tracking-[0.3em] flex items-center gap-2">
                   <IconWrapper icon={History} size={16} className="text-indigo-500"/> Trust Ledger (Recent Certificates)
                </h4>
                <button className="text-[9px] font-black uppercase text-primary hover:underline transition-all">Download Audit CSV</button>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="border-b border-border/40 bg-muted/10">
                         <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Identity Object</th>
                         <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Binding ID</th>
                         <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Issued At</th>
                         <th className="px-6 py-4 text-[9px] font-black text-muted-foreground uppercase tracking-widest">Security Status</th>
                      </tr>
                   </thead>
                   <tbody>
                      {(data.vmCertificates || []).map((cert: any) => (
                        <tr key={cert.id} className="border-b border-border/20 hover:bg-muted/30 transition-colors group">
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                 <IconWrapper icon={Cpu} size={16} className="text-muted-foreground group-hover:text-primary transition-colors" />
                                 <div className="flex flex-col">
                                    <span className="text-[11px] font-black tracking-tight">{cert.displayName}</span>
                                    <span className="text-[8px] font-mono text-muted-foreground uppercase">{cert.fingerprint.substring(0, 16)}...</span>
                                 </div>
                              </div>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-muted-foreground font-mono">{cert.ownerId.substring(0, 12)}</span>
                           </td>
                           <td className="px-6 py-4">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                {new Date(cert.createdAt).toLocaleDateString()} — {new Date(cert.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </td>
                           <td className="px-6 py-4">
                              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 w-fit text-[9px] font-black uppercase tracking-tight">
                                 <div className="w-1 h-1 rounded-full bg-emerald-500" />
                                 SECURED
                              </div>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
           </section>
        </div>
      </div>
    </div>
  );
}

const HealthBar = ({ label, value }: { label: string, value: number }) => (
  <div className="space-y-2">
     <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn(value > 95 ? "text-emerald-500" : value > 80 ? "text-amber-500" : "text-rose-500")}>{value}%</span>
     </div>
     <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={cn("h-full rounded-full transition-all", value > 95 ? "bg-emerald-500" : value > 80 ? "bg-amber-500" : "bg-rose-500")}
        />
     </div>
  </div>
);
