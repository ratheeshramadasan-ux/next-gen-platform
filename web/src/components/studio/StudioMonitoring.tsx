"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Trash2,
  Play,
  Activity,
  Timer,
  Hash,
  Variable,
  Layers,
  History,
  X,
  ShieldCheck,
  Search,
  Filter,
  User,
  Pencil,
  RefreshCcw,
  Mail,
  Globe,
  Save,
  Rocket,
  Settings,
  MoreHorizontal,
  ChevronLeft,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Plus,
  Terminal,
  Maximize2,
  Sparkles,
  ArrowRight,
  List,
  Star,
  FileCode,
  ShieldAlert
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getExecutionHistory, clearProjectHistory } from "@/app/actions/studioActions";

interface ExecutionLog {
  id: string;
  workflowName: string;
  status: string;
  startTime: string;
  endTime?: string;
  duration: string;
  executedBy: string;
  lastModifiedBy: string;
  variables: Record<string, any>;
  steps: ExecutionStep[];
}

interface ExecutionStep {
  id: string;
  nodeName: string;
  nodeType?: string;
  status: string;
  startTime: string;
  duration: string;
  error?: string | null;
  input?: any;
  output?: any;
  sublabel?: string;
}

export function StudioMonitoring({ projectId, workflowId }: { projectId?: string | null, workflowId?: string | null }) {
  const [executions, setExecutions] = useState<ExecutionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<ExecutionLog | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<"overview" | "input" | "output" | "changes" | "risk">("overview");
  const [activeSidebarTab, setActiveSidebarTab] = useState<"context" | "watchlist">("context");
  const [searchQuery, setSearchQuery] = useState("");
  const [stepSearch, setStepSearch] = useState("");
  const [varSearch, setVarSearch] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  const fetchHistory = React.useCallback(async () => {
    if (!projectId && !workflowId) return;
    setLoading(true);
    const res = await getExecutionHistory(projectId || "", workflowId || "");
    if (res.success) {
      setExecutions(res.logs || []);
      if (res.logs && res.logs.length > 0 && !selectedRun) {
        setSelectedRun(res.logs[0]);
      }
    } else {
      toast.error(res.error || "Failed to load execution history");
    }
    setLoading(false);
  }, [projectId, workflowId, selectedRun]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const currentStep = selectedRun?.steps[selectedStepIndex];

  const getStepIcon = (type: string) => {
    const t = String(type || "").toLowerCase();
    if (t.includes('start')) return <Play size={14} />;
    if (t.includes('message')) return <Layers size={14} />;
    if (t.includes('assign')) return <Terminal size={14} />;
    if (t.includes('substring')) return <Globe size={14} />;
    if (t.includes('if') || t.includes('decision')) return <Activity size={14} />;
    if (t.includes('end')) return <ShieldCheck size={14} />;
    return <Activity size={14} />;
  };

  const handlePurge = async () => {
    if (!projectId) return;
    if (!confirm("Are you sure you want to purge all execution records for this project?")) return;

    setLoading(true);
    try {
      const res = await clearProjectHistory(projectId);
      if (res.success) {
        toast.success("Execution history purged");
        setExecutions([]);
        setSelectedRun(null);
      } else {
        toast.error(res.error || "Failed to purge history");
      }
    } catch (err: any) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredRuns = useMemo(() => {
    return executions
      .filter(run =>
        run.workflowName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.executedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.status.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [executions, searchQuery]);

  const sortedSteps = useMemo(() => {
    if (!selectedRun) return [];
    return [...(selectedRun.steps || [])].sort((a, b) => {
      const timeA = new Date(a.startTime).getTime();
      const timeB = new Date(b.startTime).getTime();

      if (timeA !== timeB) return timeA - timeB;

      // If times are identical, ensure "Start" comes first and "End" comes last
      const nameA = (a.nodeName || "").toLowerCase();
      const nameB = (b.nodeName || "").toLowerCase();

      if (nameA.includes("start")) return -1;
      if (nameB.includes("start")) return 1;
      if (nameA.includes("end")) return 1;
      if (nameB.includes("end")) return -1;

      return 0;
    });
  }, [selectedRun?.id, selectedRun?.steps]);

  if (!selectedRun && executions.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50 p-20 text-center">
        <div className="w-24 h-24 rounded-full bg-muted/20 flex items-center justify-center mb-6 relative">
          <Activity size={48} strokeWidth={1} className="text-muted-foreground/20" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute inset-0 rounded-full bg-primary/5"
          />
        </div>
        <h2 className="text-xl font-black text-foreground/40 tracking-tight mb-2 uppercase">No History Found</h2>
        <p className="text-xs text-muted-foreground/40 max-w-xs leading-relaxed mb-8">
          This project has no execution records yet. Run a workflow to see its trace data and variable states here.
        </p>
        <Button
          variant="outline"
          onClick={fetchHistory}
          className="gap-2 border-border/40 bg-muted/20"
        >
          <RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> Refresh History
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 w-full bg-background overflow-hidden text-foreground">
      {/* Stats Row (Only if a run is selected) */}
      {selectedRun && (
        <div className="px-6 py-4 grid grid-cols-6 lg:grid-cols-7 gap-4 bg-muted/10 border-b border-border/20 shrink-0">
          {[
            { label: "Execution Status", value: selectedRun.status.charAt(0).toUpperCase() + selectedRun.status.slice(1).toLowerCase(), icon: CheckCircle2, color: "text-foreground", bg: "bg-muted/5", border: "border-border/40" },
            { label: "Duration", value: selectedRun.duration, icon: Timer, color: "text-foreground" },
            { label: "Executed By", value: selectedRun.executedBy, icon: User, color: "text-foreground" },
            { label: "Project ID", value: projectId?.slice(0, 8) || "N/A", icon: History, color: "text-foreground" },
            { label: "Started At", value: new Date(selectedRun.startTime).toLocaleString(), icon: Clock, color: "text-foreground" },
            { label: "Total Steps", value: selectedRun?.steps.length || 0, icon: Hash, color: "text-foreground" }
          ].map((stat, i) => (
            <div key={i} className={cn("p-4 rounded-xl border bg-card shadow-sm flex flex-col gap-1", stat.border || "border-border/40")}>
              <div className="flex items-center gap-2">
                <stat.icon size={13} className="text-muted-foreground/60" />
                <span className="text-xs font-semibold text-muted-foreground/60">{stat.label}</span>
              </div>
              <p className={cn("text-sm font-bold tracking-tight truncate text-foreground")}>{stat.value}</p>
            </div>
          ))}
          <div className="flex items-center justify-end">
            <Button variant="outline" className="h-12 w-full gap-2 text-xs font-bold border-border bg-muted/50 hover:bg-muted rounded-sm shadow-sm transition-all">
              <RefreshCcw size={14} /> Re-run Trace
            </Button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden min-h-0 bg-background">

        {/* --- FAR LEFT: Run History --- */}
        <div className="w-[280px] border-r border-border/40 bg-card/50 flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)] backdrop-blur-sm shrink-0">
          <div className="p-5 border-b border-border/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History size={14} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground/80">Execution History</h2>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={fetchHistory}
                className={cn("p-1.5 hover:bg-muted/20 text-muted-foreground/30 hover:text-primary rounded-md transition-all", loading && "animate-spin text-primary")}
                title="Refresh History"
              >
                <RefreshCcw size={14} />
              </button>
              <button
                onClick={handlePurge}
                className="p-1.5 hover:bg-destructive/10 text-muted-foreground/30 hover:text-destructive rounded-md transition-all"
                title="Purge All Records"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          <div className="px-5 py-3 border-b border-border/10">
            <div className="relative group">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
              <input
                type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search records..."
                className="w-full bg-muted/10 border border-border/20 rounded-md pl-9 pr-3 py-1.5 text-[10px] outline-none focus:border-primary/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredRuns.map((run) => (
              <button
                key={run.id}
                onClick={() => { setSelectedRun(run); setSelectedStepIndex(0); }}
                className={cn(
                  "w-full p-3 rounded-lg text-left transition-all group relative border",
                  selectedRun?.id === run.id
                    ? "bg-primary/5 border-primary/20 shadow-sm"
                    : "border-transparent hover:bg-muted/10"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      run.status === "success" ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-rose-500"
                    )} />
                    <span className="text-[10px] font-black uppercase tracking-tight text-foreground/60">{run.workflowName}</span>
                  </div>
                  <span className="text-[9px] text-muted-foreground/40 font-mono">#{run.id.slice(0, 4)}</span>
                </div>

                <div className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-1.5 text-muted-foreground/60">
                    <Clock size={10} />
                    {new Date(run.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground/40 ">
                    <User size={10} /> {run.executedBy.split(' ')[0]}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedRun ? (
          <>
            {/* Middle Sidebar: Execution Timeline */}
            <div className="w-[320px] border-r border-border/40 bg-card flex flex-col shadow-[1px_0_10px_rgba(0,0,0,0.02)] shrink-0">
              <div className="p-5 border-b border-border/10 space-y-4">
                <h2 className="text-sm font-bold text-foreground/80">Execution Timeline</h2>
                <div className="relative group">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                  <input
                    type="text" value={stepSearch} onChange={e => setStepSearch(e.target.value)}
                    placeholder="Search steps..."
                    className="w-full bg-muted/20 border border-border/40 rounded-lg pl-9 pr-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary/30 transition-all placeholder:text-muted-foreground/20"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground/20 hover:text-primary"><Filter size={12} /></button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2 relative">
                {/* Timeline vertical line */}
                <div className="absolute left-[29px] top-6 bottom-6 w-0.5 bg-border/20" />

                {sortedSteps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => setSelectedStepIndex(index)}
                    className={cn(
                      "w-full flex items-center gap-4 p-3 rounded-xl transition-all group relative z-10",
                      selectedStepIndex === index
                        ? "bg-muted/30 border border-border/20 shadow-sm"
                        : "hover:bg-muted/20"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all shadow-sm",
                      selectedStepIndex === index ? "bg-primary border-primary text-primary-foreground" : "bg-card border-border/40 text-muted-foreground/40 group-hover:border-primary/40"
                    )}>
                      <span className="text-xs font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 flex flex-col gap-0.5 text-left min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={cn("text-sm font-bold tracking-tight truncate", selectedStepIndex === index ? "text-foreground" : "text-foreground/70")}>
                          {step.nodeName}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground/40 shrink-0">{step.duration}</span>
                      </div>
                      <span className="text-xs text-muted-foreground/40 truncate">{step.sublabel || "Workflow Step"}</span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center shrink-0",
                      step.status === "success" ? "text-primary" : "text-destructive"
                    )}>
                      {step.status === "success" ? <CheckCircle2 size={12} fill="currentColor" className="text-primary/10" /> : <AlertCircle size={12} />}
                    </div>
                  </button>
                ))}
              </div>
              <div className="p-4 border-t border-border/10 bg-muted/10">
                <Button variant="ghost" size="sm" className="w-full text-xs font-black uppercase tracking-widest text-muted-foreground/40 h-8 gap-2 hover:text-primary">
                  <ChevronDown size={14} className="rotate-180" /> Collapse All
                </Button>
              </div>
            </div>

            {/* Center Panel: Step Details */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
              {currentStep && (
                <div className="flex-1 flex flex-col overflow-hidden">
                  {/* Step Header */}
                  <div className="px-8 py-6 bg-card border-b border-border/10 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 rounded-xl bg-muted/20 border border-border/20 flex items-center justify-center text-primary shadow-inner">
                        <span className="text-sm font-bold">{selectedStepIndex + 1}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-xl font-bold text-foreground tracking-tight">{currentStep.nodeName}</h2>
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
                            <CheckCircle2 size={13} /> Success
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground/60 font-medium mt-0.5">{currentStep.sublabel || "Workflow Step execution detail"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-muted-foreground/40 font-mono text-xs">
                      <div className="flex items-center gap-1.5"><Timer size={14} /> {currentStep.duration}</div>
                      <button className="p-2 hover:bg-muted/10 rounded-full transition-all"><MoreHorizontal size={16} /></button>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="px-8 bg-card border-b border-border/10 shrink-0">
                    <div className="flex gap-8">
                      {["Overview", "Input", "Output", "Changes (\u0394)"].map((tab) => {
                        const id = tab.toLowerCase().split(' ')[0] as any;
                        return (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(id)}
                            className={cn(
                              "py-4 text-sm font-semibold transition-all relative",
                              activeTab === id ? "border-b-2 border-primary text-foreground" : "text-muted-foreground/40 hover:text-muted-foreground/70"
                            )}
                          >
                            {tab}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setActiveTab("risk" as any)}
                        className={cn(
                          "py-4 text-sm font-semibold transition-all relative flex items-center gap-2",
                          activeTab === "risk" ? "border-b-2 border-rose-500 text-rose-500" : "text-muted-foreground/40 hover:text-rose-500/60"
                        )}
                      >
                        <ShieldAlert size={14} /> Risk Profile
                      </button>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 bg-background/40">
                    <AnimatePresence mode="wait">
                      {activeTab === "overview" && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                          className="space-y-8"
                        >
                          {/* Step Information */}
                          <section className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground/80">Step Information</h3>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                              {[
                                { label: "Step Type", value: currentStep?.nodeType || currentStep?.nodeName },
                                { label: "Step Name", value: `${currentStep?.nodeName}: ${currentStep?.sublabel || "Default"}` },
                                { label: "Executed At", value: currentStep ? new Date(currentStep.startTime).toISOString() : "" },
                                { label: "Duration", value: currentStep?.duration, isBadge: true, type: 'duration' },
                                { label: "Status", value: currentStep?.status.toUpperCase(), isBadge: true, type: 'status' }
                              ].map((item, i) => (
                                <div key={i} className="space-y-1.5">
                                  <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-tight">{item.label}</p>
                                  {item.isBadge ? (
                                    <div className={cn(
                                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border shadow-sm",
                                      item.type === 'status' ? "bg-primary/10 text-primary border-primary/20" : "bg-muted/20 text-foreground/70 border-border/40"
                                    )}>
                                      {item.value}
                                    </div>
                                  ) : (
                                    <p className="text-xs font-bold text-foreground/80 tracking-tight">{item.value}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          </section>

                          {/* Input/Output Code Blocks */}
                          <div className="space-y-6">
                            <section className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground/80">Input Data</h3>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground/20 hover:text-primary"><Copy size={12} /></Button>
                              </div>
                              <div className="bg-muted/10 border border-border/40 rounded-xl p-4 font-mono text-xs leading-relaxed relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                                <pre className="text-muted-foreground">{JSON.stringify(currentStep?.input || { _nodeName: currentStep?.nodeName }, null, 2)}</pre>
                              </div>
                            </section>

                            <section className="space-y-3">
                              <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-foreground/80">Output Data</h3>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground/20 hover:text-primary"><Copy size={12} /></Button>
                              </div>
                              <div className="bg-muted/10 border border-border/40 rounded-xl p-4 font-mono text-xs leading-relaxed relative group overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/30" />
                                <pre className="text-muted-foreground">{JSON.stringify(currentStep?.output || {}, null, 2)}</pre>
                              </div>
                            </section>
                          </div>

                          {/* Changes (Delta) */}
                          <section className="space-y-4">
                            <h3 className="text-sm font-bold text-foreground/80">Changes (Delta)</h3>
                            <div className="border border-border/40 rounded-xl overflow-hidden bg-card shadow-sm">
                              <table className="w-full text-left border-collapse">
                                <thead className="bg-muted/20 border-b border-border/40">
                                  <tr>
                                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground/60">Variable</th>
                                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground/60">Before</th>
                                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground/60">After</th>
                                    <th className="px-4 py-3 text-xs font-bold text-muted-foreground/60">Change Type</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                  {Object.entries(currentStep?.output || {}).map(([key, val]) => (
                                    <tr key={key} className="hover:bg-muted/5 transition-colors">
                                      <td className="px-4 py-3 text-xs font-mono font-bold text-foreground/70">{key}</td>
                                      <td className="px-4 py-3">
                                        <span className="px-2 py-0.5 rounded bg-destructive/5 text-destructive text-xs font-mono opacity-50">null</span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="px-2 py-1 rounded bg-muted/20 text-foreground text-xs font-mono font-bold border border-border/40">
                                          {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold">Added</span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </section>

                          {/* Step Notes */}
                          <section className="space-y-3">
                            <div className="flex items-center justify-between">
                              <h3 className="text-sm font-bold text-foreground/80">Step Notes</h3>
                              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground/20 hover:text-primary"><Pencil size={12} /></Button>
                            </div>
                            <div className="relative group">
                              <textarea
                                placeholder="Add notes about this step..."
                                className="w-full bg-muted/10 border border-border/40 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-primary/10 transition-all min-h-[60px] resize-none"
                              />
                            </div>
                          </section>
                        </motion.div>
                      )}

                      {activeTab === "input" && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground/80">Input Parameters</h3>
                            <Button variant="ghost" size="sm" onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(currentStep?.input || {}, null, 2));
                              toast.success("Input copied to clipboard");
                            }} className="h-8 gap-2 text-xs font-bold text-muted-foreground hover:text-primary">
                              <Copy size={14} /> Copy JSON
                            </Button>
                          </div>
                          <div className="bg-card/40 border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                            <div className="h-10 bg-muted/20 border-b border-border/10 flex items-center px-4 gap-2">
                              <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/40" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 ml-2">Request Payload</span>
                            </div>
                            <div className="p-6 font-mono text-xs leading-relaxed overflow-x-auto custom-scrollbar">
                              <pre className="text-foreground/70">{JSON.stringify(currentStep?.input || { _nodeName: currentStep?.nodeName }, null, 2)}</pre>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "output" && (
                        <motion.div
                          initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                          className="space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground/80">Execution Result</h3>
                            <Button variant="ghost" size="sm" onClick={() => {
                              navigator.clipboard.writeText(JSON.stringify(currentStep?.output || {}, null, 2));
                              toast.success("Output copied to clipboard");
                            }} className="h-8 gap-2 text-xs font-bold text-muted-foreground hover:text-primary">
                              <Copy size={14} /> Copy JSON
                            </Button>
                          </div>
                          <div className="bg-card/40 border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                            <div className="h-10 bg-muted/20 border-b border-border/10 flex items-center px-4 gap-2">
                              <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/20 border border-rose-500/40" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/20 border border-amber-500/40" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40" />
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 ml-2">Response Data</span>
                            </div>
                            <div className="p-6 font-mono text-xs leading-relaxed overflow-x-auto custom-scrollbar">
                              <pre className="text-foreground/70">{JSON.stringify(currentStep?.output || {}, null, 2)}</pre>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "changes" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                          className="space-y-6"
                        >
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground/80">Variable Modifications</h3>
                            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-black text-primary uppercase">
                              {Object.keys(currentStep?.output || {}).length} Changes detected
                            </div>
                          </div>
                          
                          <div className="bg-card border border-border/40 rounded-2xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                              <thead className="bg-muted/10 border-b border-border/10">
                                <tr>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Variable</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Value Changed</th>
                                  <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-right">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/5">
                                {Object.entries(currentStep?.output || {}).length > 0 ? (
                                  Object.entries(currentStep?.output || {}).map(([key, val]) => (
                                    <tr key={key} className="hover:bg-muted/5 transition-colors group">
                                      <td className="px-6 py-5">
                                        <div className="flex flex-col gap-1">
                                          <span className="text-xs font-mono font-bold text-foreground/70 group-hover:text-primary transition-colors">{key}</span>
                                          <span className="text-[9px] text-muted-foreground/40 font-bold uppercase tracking-tight">{typeof val}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                          <div className="text-[10px] font-mono line-through text-muted-foreground/30">null</div>
                                          <ArrowRight size={10} className="text-muted-foreground/20" />
                                          <div className="px-2 py-1 rounded bg-muted/20 text-foreground text-xs font-mono font-bold border border-border/40">
                                            {typeof val === 'object' ? 'Object' : String(val)}
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-6 py-5 text-right">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase tracking-widest">Added</span>
                                      </td>
                                    </tr>
                                  ))
                                ) : (
                                  <tr>
                                    <td colSpan={3} className="px-6 py-20 text-center text-muted-foreground/30 text-xs font-bold ">No variables were modified during this step</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </motion.div>
                      )}

                      {activeTab === "risk" && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
                          className="space-y-8"
                        >
                          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-8 space-y-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                              <ShieldAlert size={120} className="text-rose-500" />
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="space-y-1">
                                <h3 className="text-xl font-bold text-foreground tracking-tight">Risk Assessment Report</h3>
                                <p className="text-xs text-muted-foreground/60">Governance and compliance review for {currentStep.nodeName}</p>
                              </div>
                              <div className={cn(
                                "px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase shadow-sm border",
                                "bg-rose-500 text-white border-rose-600"
                              )}>
                                High Risk Detected
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              <div className="bg-card border border-border/40 rounded-xl p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 text-rose-500">
                                  <Activity size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Impact Score</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-black">5</span>
                                  <span className="text-xs text-muted-foreground/40">/ 5</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">Critical financial impact potential. Direct interaction with SAP payment systems.</p>
                              </div>

                              <div className="bg-card border border-border/40 rounded-xl p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 text-amber-500">
                                  <RefreshCcw size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Likelihood</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-black">3</span>
                                  <span className="text-xs text-muted-foreground/40">/ 5</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">Moderate failure rate observed in historical execution logs (approx 12%).</p>
                              </div>

                              <div className="bg-card border border-border/40 rounded-xl p-5 space-y-3 shadow-sm">
                                <div className="flex items-center gap-2 text-primary">
                                  <Hash size={14} />
                                  <span className="text-[10px] font-black uppercase tracking-widest">RPN Score</span>
                                </div>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-black text-rose-500">15</span>
                                  <span className="text-[10px] font-black text-muted-foreground/20 ml-2">CRITICAL</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">Risk Priority Number exceeds enterprise threshold (12). Mandatory mitigation required.</p>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h4 className="text-xs font-black uppercase tracking-widest text-foreground/40">Mitigation Strategy</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-card/50 border border-border/20 rounded-xl p-4 flex gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                                    <ShieldCheck size={16} className="text-emerald-500" />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-bold">Dual Approval Enforcement</p>
                                    <p className="text-[10px] text-muted-foreground/60 leading-relaxed">Requires senior architect sign-off before production deployment.</p>
                                  </div>
                                </div>
                                <div className="bg-card/50 border border-border/20 rounded-xl p-4 flex gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                                    <Terminal size={16} className="text-blue-500" />
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[11px] font-bold">Enhanced Audit Logging</p>
                                    <p className="text-[10px] text-muted-foreground/60 leading-relaxed">Detailed SAP T-code FB60 logs are captured for all transactions.</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-rose-500/10 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                                  <User size={14} className="text-primary" />
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-[10px] font-bold text-foreground">Assigned to: Support Tier 3</span>
                                  <span className="text-[9px] text-muted-foreground/40 ">Governance escalation active</span>
                                </div>
                              </div>
                              <Button size="sm" className="bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-4 h-8 rounded-sm">
                                Mark as Reviewed
                              </Button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                              <h3 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                                <Star size={14} className="text-amber-500" />
                                Risk Comments & Annotations
                              </h3>
                              <div className="bg-card border border-border/40 rounded-xl p-6 space-y-4 shadow-sm">
                                <div className="flex gap-4">
                                  <div className="w-8 h-8 rounded-full bg-muted/20 shrink-0" />
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold">Architect Admin</span>
                                      <span className="text-[10px] text-muted-foreground/40">2 hours ago</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground leading-relaxed ">"Verified SAP connectivity. High risk remains due to financial impact but mitigation steps are verified."</p>
                                  </div>
                                </div>
                                <textarea
                                  placeholder="Add a risk annotation..."
                                  className="w-full bg-muted/10 border border-border/40 rounded-xl px-4 py-3 text-xs outline-none focus:ring-2 focus:ring-rose-500/10 min-h-[100px]"
                                />
                                <Button size="sm" className="w-full bg-muted/20 hover:bg-muted text-foreground/60 text-[10px] font-black uppercase tracking-widest h-9">
                                  Post Annotation
                                </Button>
                              </div>
                            </div>

                            <div className="space-y-4">
                              <h3 className="text-sm font-bold text-foreground/80 flex items-center gap-2">
                                <History size={14} className="text-primary" />
                                Historical Failure Patterns
                              </h3>
                              <div className="space-y-3">
                                {[
                                  { date: "May 04, 2026", error: "SAP Connection Timeout", severity: "High" },
                                  { date: "May 02, 2026", error: "Unauthorized access attempt", severity: "Critical" },
                                  { date: "Apr 28, 2026", error: "Invalid SAP credentials", severity: "Medium" }
                                ].map((p, i) => (
                                  <div key={i} className="flex items-center justify-colors p-4 bg-card border border-border/40 rounded-xl hover:shadow-md transition-all cursor-pointer group">
                                    <div className="flex flex-col gap-1">
                                      <span className="text-[10px] font-bold text-foreground group-hover:text-primary transition-colors">{p.error}</span>
                                      <span className="text-[9px] text-muted-foreground/40">{p.date}</span>
                                    </div>
                                    <div className={cn(
                                      "px-2 py-0.5 rounded text-[9px] font-black uppercase",
                                      p.severity === 'Critical' ? "bg-rose-500/10 text-rose-500" : "bg-muted text-muted-foreground/40"
                                    )}>
                                      {p.severity}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>

            {/* Right Sidebar: Context & Watchlist */}
            <div className="w-[360px] border-l border-border/40 bg-card flex flex-col shadow-[-1px_0_10px_rgba(0,0,0,0.02)]">
              <div className="p-6 border-b border-border/10 shrink-0">
                <div className="bg-muted/20 p-1 rounded-xl flex">
                  <button
                    onClick={() => setActiveSidebarTab("context")}
                    className={cn("flex-1 py-2 text-xs font-semibold rounded-lg transition-all", activeSidebarTab === "context" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/40 hover:text-muted-foreground/60")}
                  >Context</button>
                  <button
                    onClick={() => setActiveSidebarTab("watchlist")}
                    className={cn("flex-1 py-2 text-xs font-semibold rounded-lg transition-all", activeSidebarTab === "watchlist" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground/40 hover:text-muted-foreground/60")}
                  >Watchlist ({Object.keys(selectedRun?.variables || {}).length})</button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                {activeSidebarTab === "context" ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground/80">Variables (Current Step)</h3>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground/20"><List size={14} /></Button>
                      </div>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                        <input
                          type="text" value={varSearch} onChange={e => setVarSearch(e.target.value)}
                          placeholder="Search variables..."
                          className="w-full bg-muted/20 border border-border/20 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:border-primary/20 transition-all"
                        />
                      </div>
                      <div className="border border-border/10 rounded-xl overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                          <thead className="bg-muted/10 border-b border-border/10">
                            <tr>
                              <th className="px-3 py-2 text-xs font-bold text-muted-foreground/40">Variable</th>
                              <th className="px-3 py-2 text-xs font-bold text-muted-foreground/40">Type</th>
                              <th className="px-3 py-2 text-xs font-bold text-muted-foreground/40">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/5 text-xs">
                            {Object.entries(selectedRun?.variables || {}).map(([k, v]) => (
                              <tr key={k} className="hover:bg-muted/5 transition-colors">
                                <td className="px-3 py-2 font-mono font-bold text-muted-foreground">{k}</td>
                                <td className="px-3 py-2 text-muted-foreground/40">{typeof v === 'number' ? 'Number' : typeof v === 'boolean' ? 'Boolean' : 'String'}</td>
                                <td className="px-3 py-2 font-mono font-bold text-foreground">{String(v)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-border/10">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground/80">Watchlist ({Object.keys(selectedRun?.variables || {}).length})</h3>
                        <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs font-semibold text-muted-foreground/40 hover:text-primary"><Pencil size={12} /> Edit</Button>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(selectedRun?.variables || {}).map(([name, value]) => (
                          <div key={name} className="flex items-center justify-between p-3 rounded-xl bg-muted/10 border border-border/10">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold text-foreground/70">{name}</span>
                              <span className="text-xs text-muted-foreground/30 font-semibold">{typeof value === 'number' ? 'Number' : typeof value === 'boolean' ? 'Boolean' : 'String'}</span>
                            </div>
                            <span className="text-xs font-mono font-bold text-foreground truncate max-w-[120px]">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                    <Star size={32} strokeWidth={1} />
                    <p className="text-sm font-bold text-foreground/40">Watchlist Mode Active</p>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="space-y-4 pt-4 border-t border-border/10">
                  <h3 className="text-sm font-bold text-foreground/80">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Copy Step Data", icon: Copy },
                      { label: "Export Step", icon: Download },
                      { label: "View as JSON", icon: FileCode },
                      { label: "Add to Watchlist", icon: Star }
                    ].map(action => (
                      <button key={action.label} className="flex flex-col gap-3 p-4 rounded-xl bg-card border border-border/40 hover:border-primary/40 hover:shadow-md transition-all group text-left">
                        <action.icon size={16} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        <span className="text-xs font-semibold text-foreground/80">{action.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-40 text-foreground">
            <Activity size={32} className="mb-4 text-primary" />
            <p className="text-xs font-bold uppercase tracking-widest">Select a record to view details</p>
          </div>
        )}
      </div>

      {/* Bottom Footer: Progress & Navigation */}
      {selectedRun && (
        <div className="h-14 border-t border-border/40 bg-card flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/10 border border-border/20">
              <span className="text-xs font-semibold text-muted-foreground/60">Execution Progress</span>
              <span className="text-sm font-bold text-primary">{selectedStepIndex + 1} / {selectedRun?.steps.length || 0}</span>
            </div>

            {/* Horizontal Progress Bar */}
            <div className="flex items-center gap-2 w-64 h-1.5 bg-border/20 rounded-full relative ml-4 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${((selectedStepIndex + 1) / (selectedRun?.steps.length || 1)) * 100}%` }}
                className="h-full bg-primary rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"
              />
              <div className="absolute inset-0 flex justify-between px-1">
                {selectedRun?.steps.map((_, i) => (
                  <div key={i} className={cn(
                    "w-1 h-1 rounded-full mt-[1px]",
                    i <= selectedStepIndex ? "bg-white" : "bg-white/40"
                  )} />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-muted-foreground/40 uppercase tracking-tight">Auto-scroll</span>
              <button
                onClick={() => setAutoScroll(!autoScroll)}
                className={cn("w-9 h-5 rounded-full transition-all relative", autoScroll ? "bg-primary" : "bg-muted-foreground/20")}
              >
                <div className={cn("w-3.5 h-3.5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm", autoScroll ? "left-[20px]" : "left-[2px]")} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost" size="sm"
                onClick={() => setSelectedStepIndex(Math.max(0, selectedStepIndex - 1))}
                disabled={selectedStepIndex === 0}
                className="h-9 w-9 p-0 rounded-lg border border-border/40 hover:bg-muted/10"
              >
                <ChevronLeft size={18} />
              </Button>
              <Button
                variant="ghost" size="sm"
                onClick={() => setSelectedStepIndex(Math.min((selectedRun?.steps.length || 1) - 1, selectedStepIndex + 1))}
                disabled={selectedStepIndex === (selectedRun?.steps.length || 1) - 1}
                className="h-9 w-9 p-0 rounded-lg border border-border/40 hover:bg-muted/10"
              >
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
