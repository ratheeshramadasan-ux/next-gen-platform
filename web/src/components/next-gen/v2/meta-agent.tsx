"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Sparkles, Zap, Cpu, ShieldCheck, ChevronRight } from "lucide-react";
import { usePathname } from "next/navigation";
import { useAppContext } from "@/lib/context";
import { queryMetaAgent } from "@/app/actions/metaAgentActions";
import { cn } from "@/lib/utils";

import { getSovereignBriefing, SovereignBriefing } from "@/app/actions/briefingActions";
import { BriefingModal } from "./briefing-modal";

interface MetaAgentProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MetaAgent = ({ isOpen, onClose }: MetaAgentProps) => {
  const { activeTenant, currentUser } = useAppContext();
  const pathname = usePathname();
  const [messages, setMessages] = useState<any[]>([
    { role: "agent", text: "Greetings. I am the Meta-Agent co-pilot. I have synchronized with your current orbital context. How can I assist?", suggestions: ["Show active runs", "What's my balance?"] }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [briefingData, setBriefingData] = useState<SovereignBriefing | null>(null);
  const [isBriefingOpen, setIsBriefingOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleGenerateBriefing = async () => {
     if (!activeTenant) return;
     setIsTyping(true);
     try {
        const data = await getSovereignBriefing(activeTenant.id);
        setBriefingData(data);
        setIsBriefingOpen(true);
        setMessages(prev => [...prev, { role: "agent", text: "I have synthesized the 24-hour Sovereign Briefing. Access the executive dossier directly or let me know if you need specific module breakdowns.", suggestions: ["Explore Roadmap", "Check Efficiency"] }]);
     } catch (e) {
        setMessages(prev => [...prev, { role: "agent", text: "Synthesis failure in orbital telemetry stream. Please check kernel health." }]);
     }
     setIsTyping(false);
  };

  const handleSend = async (text: string = input) => {
    if (!text.trim() || !activeTenant) return;

    const userMsg = { role: "user", text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    const res = await queryMetaAgent(text, {
      pathname,
      tenantId: activeTenant.id,
      role: currentUser.role,
      history: messages
    });

    if (res.success) {
      setMessages(prev => [...prev, { role: "agent", text: res.response, suggestions: res.suggestions }]);
    } else {
      setMessages(prev => [...prev, { role: "agent", text: "My apologies. The neural link is experiencing interference.", suggestions: ["Retry", "System Health"] }]);
    }
    setIsTyping(false);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-80 h-screen bg-background/60 backdrop-blur-3xl border-l border-border/40 z-[100] shadow-2xl flex flex-col pt-16"
          >
            {/* Header */}
            <div className="p-4 border-b border-border/40 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group animate-pulse">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-widest text-foreground">Meta-Agent</span>
                    <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter">Operational • Context Synced</span>
                  </div>
                </div>
                <button onClick={onClose} className="w-8 h-8 rounded-sm hover:bg-muted flex items-center justify-center transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Briefing Action */}
              <button 
                onClick={handleGenerateBriefing}
                className="w-full flex items-center justify-between px-3 py-2 bg-primary/10 border border-primary/20 rounded-sm group hover:bg-primary transition-all active:scale-95"
              >
                 <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary group-hover:text-primary-foreground" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary group-hover:text-primary-foreground">Daily Briefing</span>
                 </div>
                 <ChevronRight className="w-3 h-3 text-primary group-hover:text-primary-foreground" />
              </button>
            </div>

          {/* Chat area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-6 scroll-smooth">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex flex-col gap-2", msg.role === "user" ? "items-end" : "items-start")}>
                 <div className={cn(
                   "max-w-[85%] p-3 rounded-sm text-xs font-medium leading-relaxed shadow-sm",
                   msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted/40 border border-border/50 rounded-tl-none text-foreground"
                 )}>
                   {msg.text}
                 </div>
                 {msg.suggestions && msg.role === "agent" && (
                   <div className="flex flex-wrap gap-1.5 mt-1">
                      {msg.suggestions.map((s: string) => (
                        <button 
                          key={s} 
                          onClick={() => handleSend(s)}
                          className="text-[9px] font-black uppercase tracking-tighter px-2 py-1 bg-background border border-border/50 rounded-sm hover:bg-muted hover:border-primary/30 transition-all text-muted-foreground hover:text-primary active:scale-95"
                        >
                          {s}
                        </button>
                      ))}
                   </div>
                 )}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-muted-foreground">
                 <div className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]" />
                 <div className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]" />
                 <div className="w-1 h-1 rounded-full bg-current animate-bounce" />
              </div>
            )}
          </div>

          {/* Footer Input */}
          <div className="p-4 border-t border-border/40 bg-background/40">
             <div className="relative group">
                <input 
                  type="text" 
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Query kernel intent..."
                  className="w-full bg-background border border-border/50 rounded-sm pl-4 pr-10 py-2.5 text-xs font-medium focus:outline-none focus:border-primary/50 transition-all shadow-inner"
                />
                <button 
                  onClick={() => handleSend()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-primary text-primary-foreground rounded-sm flex items-center justify-center hover:bg-primary/90 transition-colors shadow-lg active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
             </div>
             <p className="text-[8px] font-bold text-muted-foreground/40 mt-3 text-center uppercase tracking-widest">
                AI OS Meta-Kernel v1.4.2 Interactive Prompt
             </p>
          </div>
        </motion.div>
      )}
      </AnimatePresence>
      <BriefingModal 
        isOpen={isBriefingOpen} 
        onClose={() => setIsBriefingOpen(false)} 
        data={briefingData} 
      />
    </>
  );
};
