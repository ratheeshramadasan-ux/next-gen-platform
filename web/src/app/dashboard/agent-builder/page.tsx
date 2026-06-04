"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bot, 
  Sparkles, 
  Send, 
  Terminal, 
  BrainCircuit, 
  Cpu, 
  Layers,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { useAppContext } from "@/lib/context";

const AGENT_STATUSES = [
  { id: 'analyzing', label: 'Analyzing Intent', icon: BrainCircuit, color: 'text-blue-400' },
  { id: 'fetching', label: 'Schema Discovery', icon: Layers, color: 'text-indigo-400' },
  { id: 'reasoning', label: 'Logic Synthesis', icon: Cpu, color: 'text-purple-400' },
  { id: 'finalizing', label: 'Building Flow', icon: Zap, color: 'text-amber-400' }
];

export default function AgentBuilderPage() {
  const { currentUser } = useAppContext();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStatusIdx, setCurrentStatusIdx] = useState(0);
  const [generatedWorkflow, setGeneratedWorkflow] = useState<any>(null);

  // Simulation loop for 'Generating' state
  useEffect(() => {
    let interval: any;
    if (isGenerating) {
      interval = setInterval(() => {
        setCurrentStatusIdx(prev => {
          if (prev < AGENT_STATUSES.length - 1) return prev + 1;
          clearInterval(interval);
          handleFinishGeneration();
          return prev;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isGenerating]);

  const handleFinishGeneration = () => {
    setIsGenerating(false);
    setGeneratedWorkflow({
      id: "wf_" + Math.random().toString(36).substr(2, 9),
      name: prompt.length > 30 ? prompt.substring(0, 30) + "..." : prompt,
      steps: 4,
      accuracy: "98.4%",
      latency: "1.2s"
    });
  };

  const startGeneration = () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setCurrentStatusIdx(0);
    setGeneratedWorkflow(null);
  };

  return (
    <div className="flex flex-col gap-12 p-12 max-w-7xl mx-auto min-h-full">
      {/* Header Area */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-sm bg-primary/10 border border-primary/20 shadow-inner">
            <IconWrapper icon={Bot} size={32} className="text-primary" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">
              Agent Builder
            </h1>
            <p className="text-muted-foreground font-medium">Next-generation AI orchestration and autonomous workflow synthesis.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Interface */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* Prompt Hub */}
          <Card className="p-8 rounded-sm border-primary/10 bg-card/30 backdrop-blur-3xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32 transition-colors duration-500 group-hover:bg-primary/10" />
            
            <div className="flex flex-col gap-6 relative z-10">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="rounded-full px-4 py-1 text-[10px] font-black uppercase tracking-[0.2em] bg-background/50 border-primary/20 text-primary">
                  Ready to Synthesize
                </Badge>
                <div className="flex gap-1">
                  {[1,2,3].map(i => <div key={i} className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />)}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-bold tracking-tight">What automation should I build today?</h2>
                <p className="text-sm text-muted-foreground">Describe your goal in plain text. Our agent will analyze the target application, map the data points, and synthesize the logical flow.</p>
              </div>

              <div className="relative group/input">
                <textarea 
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Log in to the SAP portal, extract the monthly expense report for the HR department, and notify the manager on Slack..."
                  className="w-full min-h-[160px] bg-background/50 border-border/60 rounded-sm p-6 text-lg font-medium focus:ring-4 focus:ring-primary/10 focus:border-primary/40 transition-all outline-none resize-none placeholder:text-muted-foreground/40"
                />
                <Button 
                  onClick={startGeneration}
                  disabled={isGenerating || !prompt.trim()}
                  className="absolute bottom-4 right-4 h-14 w-14 rounded-full shadow-2xl shadow-primary/20 hover:scale-110 active:scale-95 transition-all p-0"
                >
                  <IconWrapper icon={isGenerating ? Sparkles : Send} size={24} className={isGenerating ? "animate-spin-slow" : ""} />
                </Button>
              </div>
            </div>
          </Card>

          {/* Generative UI Section */}
          <AnimatePresence mode="wait">
            {isGenerating && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col gap-8"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {AGENT_STATUSES.map((status, idx) => (
                    <Card 
                      key={status.id}
                      className={`p-6 rounded-sm flex flex-col items-center gap-4 border transition-all duration-500 bg-card/50 backdrop-blur-xl ${idx === currentStatusIdx ? 'border-primary ring-4 ring-primary/5' : idx < currentStatusIdx ? 'border-green-500/30 bg-green-500/5 opacity-60' : 'border-border opacity-40'}`}
                    >
                      <div className={`p-4 rounded-full bg-background dark:bg-black/40 ${idx === currentStatusIdx ? 'animate-bounce' : ''}`}>
                        <IconWrapper icon={idx < currentStatusIdx ? CheckCircle2 : status.icon} size={24} className={idx < currentStatusIdx ? 'text-green-500' : status.color} />
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest">{status.label}</span>
                    </Card>
                  ))}
                </div>

                <Card className="p-8 rounded-sm bg-black/5 dark:bg-black/40 border-dashed border-2 border-border flex flex-col items-center justify-center min-h-[300px] overflow-hidden relative">
                   <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent animate-pulse" />
                   <div className="relative z-10 flex flex-col items-center gap-4 text-center">
                      <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                      <div>
                        <h4 className="font-bold text-lg tracking-tight">Generating Logical Tree...</h4>
                        <p className="text-sm text-muted-foreground max-w-[300px]">Our engine is currently mapping your natural language prompt to low-level automation primitives.</p>
                      </div>
                   </div>
                </Card>
              </motion.div>
            )}

            {generatedWorkflow && !isGenerating && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-sm border border-green-500/20 bg-green-500/5 p-8 flex flex-col gap-6"
              >
                 <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500 rounded-sm text-white shadow-lg shadow-green-500/20">
                        <IconWrapper icon={CheckCircle2} size={24} />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="text-xl font-bold tracking-tight">Workflow Synthesized!</h3>
                        <p className="text-sm text-muted-foreground">Successfully mapped to {generatedWorkflow.steps} logical steps with {generatedWorkflow.accuracy} confidence.</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <Button variant="outline" className="rounded-sm border-green-500/20 hover:bg-green-500/10 transition-all font-bold">Discard</Button>
                       <Button className="rounded-sm bg-green-600 hover:bg-green-700 font-bold px-8">Save to Library</Button>
                    </div>
                 </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 flex flex-col gap-8">
          <Card className="p-8 rounded-sm border-border bg-card/20 backdrop-blur-xl flex flex-col gap-6 ">
             <div className="flex items-center justify-between">
               <h3 className="font-bold tracking-tight flex items-center gap-2">
                 <IconWrapper icon={Zap} size={18} className="text-primary" />
                 Capabilities
               </h3>
               <span className="text-[10px] font-black text-muted-foreground">GPT-4o Matrix</span>
             </div>
             <div className="flex flex-col gap-4">
                {[
                  { label: 'Auto-Navigation', val: 'Active', icon: ArrowRight },
                  { label: 'Data Extraction', val: 'Deep', icon: Terminal },
                  { label: 'Error Handling', val: 'Autonomous', icon: ShieldAlert }
                ].map(cap => (
                  <div key={cap.label} className="flex items-center justify-between p-4 rounded-sm bg-background/50 border border-border/40">
                    <div className="flex items-center gap-3">
                      <IconWrapper icon={cap.icon} size={16} className="text-muted-foreground" />
                      <span className="text-xs font-semibold">{cap.label}</span>
                    </div>
                    <span className="text-[10px] font-black text-primary px-2 py-0.5 rounded-full bg-primary/10">{cap.val}</span>
                  </div>
                ))}
             </div>
          </Card>

          <Card className="p-8 rounded-sm bg-gradient-to-br from-primary/10 via-background to-background border-primary/20 flex flex-col gap-4">
             <h3 className="font-bold tracking-tight">System Tip</h3>
             <p className="text-xs text-muted-foreground leading-relaxed">
               For best results, specify the target application name and the exact data fields you need to extract. The agent performs better with high-context instructions.
             </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
