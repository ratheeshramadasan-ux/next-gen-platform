import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Command, ArrowRight } from "lucide-react";
import { usePersonalizationStore } from "@/stores/usePersonalizationStore";

export function AICommandBar() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { aiCommandBarEnabled, animationLevel } = usePersonalizationStore();

  if (!aiCommandBarEnabled) return null;

  const isAnimated = animationLevel !== "off";

  const suggestions = [
    "Open latest invoice extraction project",
    "Show failed jobs",
    "Create queue",
    "Run payroll automation",
    "Explain this error"
  ];

  return (
    <>
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        <button
          onClick={() => setIsOpen(true)}
          className={`
            group flex items-center gap-3 px-6 py-3 rounded-full
            bg-white/80 border border-slate-200/50 text-slate-700
            dark:bg-slate-900/80 dark:border-slate-700/50 dark:text-slate-300 
            backdrop-blur-xl hover:bg-slate-50 hover:border-blue-400/50
            dark:hover:bg-slate-800 dark:hover:border-blue-500/50
            transition-all shadow-xl dark:shadow-2xl
          `}
        >
          <Sparkles className="w-5 h-5 text-blue-400 group-hover:text-blue-300" />
          <span className="font-medium tracking-wide">AI Command Interface</span>
          <div className="flex items-center gap-1 ml-4 opacity-50">
            <Command className="w-4 h-4" />
            <span className="text-sm font-semibold">K</span>
          </div>
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={isAnimated ? { opacity: 0, y: 20, scale: 0.95 } : { opacity: 1 }}
            animate={isAnimated ? { opacity: 1, y: 0, scale: 1 } : { opacity: 1 }}
            exit={isAnimated ? { opacity: 0, y: 10, scale: 0.95 } : { opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-200/60 dark:bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          >
            <div 
              className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 p-4 border-b border-slate-100 dark:border-slate-800">
                <Sparkles className="w-6 h-6 text-blue-500" />
                <input 
                  type="text"
                  autoFocus
                  placeholder="What would you like to do?"
                  className="flex-1 bg-transparent text-xl text-slate-900 dark:text-white outline-none placeholder:text-slate-400 dark:placeholder:text-slate-600"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                />
              </div>
              
              <div className="p-4 bg-slate-50 dark:bg-slate-900/50">
                <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">Suggestions</h4>
                <div className="flex flex-col gap-2">
                  {suggestions.map((suggestion, i) => (
                    <button
                      key={i}
                      onClick={() => setQuery(suggestion)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors group"
                    >
                      <span>{suggestion}</span>
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-blue-400" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
