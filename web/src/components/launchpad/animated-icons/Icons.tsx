import React from "react";
import { motion } from "framer-motion";

export function DocIntelIcon({ color }: { color: string }) {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      {/* Document Outline */}
      <motion.svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        className="w-8 h-8 text-slate-400 dark:text-slate-500 absolute"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M16 13H8" />
        <path d="M16 17H8" />
        <path d="M10 9H8" />
      </motion.svg>
      
      {/* Scanning Laser */}
      <motion.div 
        animate={{ y: [-12, 12, -12] }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="absolute w-10 h-0.5 shadow-[0_0_8px_2px_currentColor]"
        style={{ backgroundColor: color, color: color }}
      />
      
      {/* Scanning Grid Background */}
      <motion.div 
        animate={{ opacity: [0.2, 0.6, 0.2] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute inset-0 bg-[linear-gradient(rgba(0,180,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,180,255,0.1)_1px,transparent_1px)] bg-[size:4px_4px] rounded overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black,transparent)]"
        style={{ color: color }}
      />
    </div>
  );
}

export function AutomationIcon({ color }: { color: string }) {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      {/* Center Node */}
      <motion.div 
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute w-3 h-3 rounded-full z-10"
        style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}` }}
      />
      
      {/* Orbiting Nodes */}
      {[0, 120, 240].map((deg, i) => (
        <motion.div
          key={i}
          animate={{ rotate: [deg, deg + 360] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute w-8 h-8 rounded-full border border-dashed border-slate-300 dark:border-slate-600"
        >
          <motion.div 
            animate={{ scale: [0.8, 1.5, 0.8] }}
            transition={{ duration: 1.5, delay: i * 0.5, repeat: Infinity }}
            className="absolute -top-1 left-1/2 w-2 h-2 rounded-full -translate-x-1/2"
            style={{ backgroundColor: color, opacity: 0.8 }}
          />
        </motion.div>
      ))}
      
      {/* Pulsing connections */}
      <svg className="absolute inset-0 w-full h-full" style={{ color: color }}>
        <motion.circle 
          cx="20" cy="20" r="14" 
          stroke="currentColor" strokeWidth="0.5" fill="none"
          animate={{ strokeDasharray: ["0, 100", "100, 0"], opacity: [0, 1, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
      </svg>
    </div>
  );
}

export function AIHubIcon({ color }: { color: string }) {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      {/* Neural Core */}
      <motion.svg 
        viewBox="0 0 24 24" 
        className="w-6 h-6 absolute z-10"
        style={{ color: color }}
        animate={{ filter: ["drop-shadow(0 0 2px currentColor)", "drop-shadow(0 0 8px currentColor)", "drop-shadow(0 0 2px currentColor)"] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </motion.svg>
      
      {/* Concentric rotating rings */}
      {[24, 32, 40].map((size, i) => (
        <motion.div
          key={i}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 10 + i * 2, repeat: Infinity, ease: "linear" }}
          className="absolute rounded-full border-t border-r"
          style={{ 
            width: size, height: size, 
            borderColor: color, 
            opacity: 0.2 + (i * 0.2) 
          }}
        />
      ))}
    </div>
  );
}

export function ExecutionIcon({ color }: { color: string }) {
  return (
    <div className="relative w-10 h-10 flex flex-col justify-between py-2">
      {[0, 1, 2].map((row) => (
        <div key={row} className="w-10 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 relative overflow-hidden">
          <motion.div 
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ 
              duration: 1.5 + Math.random(), 
              delay: Math.random(), 
              repeat: Infinity,
              ease: "linear" 
            }}
            className="absolute top-0 bottom-0 w-4 shadow-[0_0_8px_currentColor]"
            style={{ backgroundColor: color, color: color }}
          />
        </div>
      ))}
    </div>
  );
}

export function GovernanceIcon({ color }: { color: string }) {
  return (
    <div className="relative w-10 h-10 flex items-center justify-center">
      {/* Base Shield */}
      <motion.svg 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        className="w-8 h-8 text-slate-300 dark:text-slate-600 absolute"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </motion.svg>

      {/* Energy Matrix Overlay */}
      <motion.div 
        className="absolute inset-0 overflow-hidden"
        style={{
          maskImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E\")",
          WebkitMaskImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z'/%3E%3C/svg%3E\")",
          maskSize: "80%",
          WebkitMaskSize: "80%",
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat"
        }}
      >
        <motion.div 
          animate={{ y: ["-100%", "100%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
          className="w-full h-4 shadow-[0_0_12px_4px_currentColor] opacity-60"
          style={{ backgroundColor: color, color: color }}
        />
        {/* Hex grid inside shield */}
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjE0Ij4KICA8cGF0aCBkPSJNMCAwbDQtNCA0IDR2NmwtNCA0LTQtNFYweiIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiLz4KPC9zdmc+')] bg-[length:8px_14px]" style={{ color: color }} />
      </motion.div>
    </div>
  );
}
