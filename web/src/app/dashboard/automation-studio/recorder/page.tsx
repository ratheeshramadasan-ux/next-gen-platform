"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, 
  Square, 
  Globe, 
  MousePointer2, 
  Type, 
  Navigation, 
  Clock, 
  Layers,
  ChevronRight,
  Monitor,
  Video,
  Settings2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Flame,
  Zap,
  LayoutDashboard
} from 'lucide-react';
import { useAppContext } from "@/lib/context";
import { Button } from "@/components/ui/button";
import { IconWrapper } from "@/components/ui/icon-wrapper";

// --- Types ---

interface Step {
  stepIndex: number;
  actionType: string;
  selector: string;
  aiLabel: string;
  metadata?: any;
}

interface RecordingStatus {
  status: 'idle' | 'recording' | 'stopped';
  workflowId?: string;
  url?: string;
  stepCount?: number;
}

// --- Main Components ---

export default function AutomationStudioPage() {
  const { currentUser } = useAppContext();
  const [url, setUrl] = useState('https://www.google.com');
  const [workflowName, setWorkflowName] = useState('New Automation Workflow');
  const [browserType, setBrowserType] = useState('chromium');
  const [status, setStatus] = useState<RecordingStatus>({ status: 'idle' });
  const [steps, setSteps] = useState<Step[]>([]);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Real-time Event Stream ---

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connectStream = () => {
      console.log("[Studio] Connecting to event stream...");
      eventSource = new EventSource('/api/automation/events');

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'step_recorded') {
            setSteps(prev => [...prev, data.step]);
          } else if (data.type === 'status_change') {
            setStatus({
              status: data.status,
              workflowId: data.workflowId,
              url: data.url,
              stepCount: data.stepCount
            });
            
            if (data.status === 'stopped' || data.status === 'idle') {
              // Optionally do something on completion
            }
          }
        } catch (err) {
          console.error("[SSE] Parse error:", err);
        }
      };

      eventSource.onerror = (err) => {
        console.warn("[SSE] Connection lost. Reconnecting...");
        eventSource?.close();
        setTimeout(connectStream, 3000);
      };
    };

    connectStream();
    return () => eventSource?.close();
  }, []);

  // Sync scroll on new steps
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps]);

  // --- Actions ---

  const startRecording = async () => {
    setError(null);
    setSteps([]);
    try {
      const res = await fetch('/api/automation/recorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          url,
          workflowName,
          browserType,
          customerId: currentUser.customerId,
          tenantId: currentUser.tenantId,
          actorEmail: currentUser.email // Pass actor for audit log
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const stopRecording = async () => {
    try {
      await fetch('/api/automation/recorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'stop',
          actorEmail: currentUser.email // Pass actor for audit log
        })
      });
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isRecording = status.status === 'recording';

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] gap-6 p-2">
      {/* --- Header Section --- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <IconWrapper icon={Flame} className="text-primary w-8 h-8" />
            Automation Studio
          </h1>
          <p className="text-muted-foreground mt-1">Multi-browser workflow recorder & intelligence portal.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2">
            <Layers className="w-4 h-4" />
            Library
          </Button>
          <Button variant="outline" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full overflow-hidden">
        
        {/* --- Left Column: Controls --- */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6 rounded-sm border border-border/60 bg-card/40 backdrop-blur-2xl p-8 shadow-2xl relative overflow-hidden transition-all duration-500 hover:shadow-primary/5 hover:border-primary/20"
          >
            {isRecording && (
              <motion.div 
                layoutId="pulse"
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="absolute inset-0 bg-primary/10 pointer-events-none"
              />
            )}

            <div className="space-y-4">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                Workflow Identity
              </label>
              <input 
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                disabled={isRecording}
                className="w-full bg-background/50 border border-border rounded-sm px-4 py-3 text-lg font-medium outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                placeholder="Workflow Name"
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Globe className="w-4 h-4" /> Target URL
              </label>
              <input 
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={isRecording}
                className="w-full bg-background/50 border border-border rounded-sm px-4 py-3 font-mono text-sm outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50"
                placeholder="https://..."
              />
            </div>

            <div className="space-y-4">
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Monitor className="w-4 h-4" /> Browser Layer
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['chromium', 'firefox', 'webkit', 'chrome', 'msedge'].map((b) => (
                  <button
                    key={b}
                    onClick={() => setBrowserType(b)}
                    disabled={isRecording}
                    className={`px-3 py-2 rounded-sm text-xs font-semibold capitalize transition-all border ${
                      browserType === b 
                        ? 'bg-primary text-primary-foreground border-primary' 
                        : 'bg-background/20 border-border hover:border-primary/50'
                    } disabled:opacity-30`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-3">
              {!isRecording ? (
                <Button 
                  onClick={startRecording}
                  className="h-16 rounded-sm text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <RecordButtonIcon status="idle" />
                  Launch Recorder
                </Button>
              ) : (
                <Button 
                  onClick={stopRecording}
                  variant="destructive"
                  className="h-16 rounded-sm text-lg font-black uppercase tracking-widest shadow-lg shadow-destructive/20 hover:scale-[1.02] active:scale-[0.98] transition-all border-none bg-rose-500 hover:bg-rose-600"
                >
                  <RecordButtonIcon status="recording" />
                  Stop Flow
                </Button>
              )}

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 p-3 rounded-sm bg-destructive/10 text-destructive text-sm border border-destructive/20"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Stats / Help Card */}
          <div className="flex-1 rounded-sm border border-border bg-card/30 p-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-4">Live Session Statistics</h3>
            <div className="grid grid-cols-2 gap-4">
              <StatItem label="Steps" value={steps.length} icon={Zap} color="text-yellow-500" />
              <StatItem label="Duration" value="00:00" icon={Clock} color="text-blue-500" />
              <StatItem label="Confidence" value={steps.length ? "High" : "---"} icon={CheckCircle2} color="text-green-500" />
              <StatItem label="AI Insight" value="Enabled" icon={Zap} color="text-purple-500" />
            </div>
          </div>
        </div>

        {/* --- Right Column: Step Feed --- */}
        <div className="lg:col-span-8 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center justify-between px-2">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" />
              Interaction Feed
              {isRecording && (
                <span className="flex items-center gap-1.5 ml-2 text-xs font-medium text-destructive px-2 py-0.5 rounded-full bg-destructive/10 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                  LIVE
                </span>
              )}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2 opacity-50">Auto-Intelligence Active</span>
              <Button variant="ghost" size="icon" onClick={() => setSteps([])} className="rounded-sm hover:bg-destructive/10 hover:text-destructive transition-colors">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div 
            ref={scrollRef}
            className="flex-1 overflow-y-auto pr-4 custom-scrollbar flex flex-col gap-3 pb-8"
          >
            <AnimatePresence initial={false}>
              {steps.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center h-full text-center p-12 opacity-50 space-y-4"
                >
                  <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                    <MousePointer2 className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold">No interactions captured yet</p>
                    <p className="text-sm max-w-[280px]">Start the recorder and interact with the target page to see the events stream here.</p>
                  </div>
                </motion.div>
              ) : (
                steps.map((step, idx) => (
                  <StepCard key={idx} step={step} index={idx} />
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function RecordButtonIcon({ status }: { status: 'idle' | 'recording' | 'stopped' }) {
  if (status === 'recording') return <Square className="w-6 h-6 mr-2 fill-current" />;
  return <Play className="w-6 h-6 mr-2 fill-current" />;
}

function StatItem({ label, value, icon: Icon, color }: any) {
  return (
    <div className="bg-background/40 border border-border/50 rounded-sm p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-[10px] uppercase tracking-tighter text-muted-foreground font-bold">{label}</span>
      </div>
      <div className="text-xl font-black">{value}</div>
    </div>
  );
}

function StepCard({ step, index }: { step: Step, index: number }) {
  const Icon = getActionIcon(step.actionType);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="group relative flex gap-4 p-4 rounded-sm border border-border bg-card/60 hover:bg-card hover:border-primary/30 transition-all shadow-sm hover:shadow-xl"
    >
      <div className="flex flex-col items-center gap-2 shrink-0">
        <div className="text-[10px] font-black opacity-30 group-hover:opacity-100 transition-opacity">
          {String(index + 1).padStart(2, '0')}
        </div>
        <div className="w-12 h-12 rounded-sm bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
          <Icon className="w-6 h-6" />
        </div>
      </div>

      <div className="flex-1 space-y-1.5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold tracking-tight leading-none group-hover:text-primary transition-colors">
            {step.aiLabel}
          </h3>
          <div className="text-[10px] font-bold uppercase py-0.5 px-2 rounded-full bg-muted border border-border group-hover:border-primary/20 transition-all">
            {step.actionType}
          </div>
        </div>
        
        <p className="text-sm font-mono text-muted-foreground truncate opacity-80 group-hover:opacity-100 transition-opacity max-w-[400px]">
          {step.selector || 'window'}
        </p>

        {step.metadata?.screenshotUrl && (
          <div className="mt-3 rounded-sm overflow-hidden border border-border max-w-[200px] h-24 relative group/img cursor-pointer">
            <img 
              src={step.metadata.screenshotUrl} 
              alt="Step" 
              className="w-full h-full object-cover grayscale group-hover/img:grayscale-0 transition-all duration-500 scale-105 group-hover/img:scale-100" 
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
              <ExternalLink className="w-5 h-5 text-white" />
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 self-center">
        <Button variant="ghost" size="icon" className="rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
          <Settings2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function getActionIcon(type: string) {
  switch (type) {
    case 'click': return MousePointer2;
    case 'type': return Type;
    case 'navigate': return Navigation;
    case 'select': return LayoutDashboard;
    case 'check': return CheckCircle2;
    default: return Zap;
  }
}
