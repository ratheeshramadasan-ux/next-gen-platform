import React, { useState } from "react";
import { motion } from "framer-motion";
import { Star, BarChart2, Activity, ShieldAlert, Cpu } from "lucide-react";
import { usePersonalizationStore } from "@/stores/usePersonalizationStore";
import { DocIntelIcon, AutomationIcon, AIHubIcon, ExecutionIcon, GovernanceIcon } from "./animated-icons/Icons";

interface ServiceCardProps {
  service: any;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent) => void;
  onClick: () => void;
}

export function ServiceCard({ service, isFavorite, onToggleFavorite, onClick }: ServiceCardProps) {
  const { animationLevel } = usePersonalizationStore();
  const [isFlipping, setIsFlipping] = useState(false);
  
  // Disable motion based on personalization setting
  const isAnimated = animationLevel !== "off";

  const handleClick = () => {
    if (!isAnimated) {
      onClick();
      return;
    }
    
    setIsFlipping(true);
    setTimeout(() => {
      onClick();
      // Reset flip after navigation triggers
      setTimeout(() => setIsFlipping(false), 200);
    }, 500); // 500ms delay to let the coin flip finish before unmounting/navigating
  };
  
  return (
    <motion.div
      onClick={handleClick}
      animate={isFlipping ? { rotateY: 180, scale: 1.05 } : { rotateY: 0, scale: 1 }}
      whileHover={isAnimated && !isFlipping ? { scale: 1.02, y: -4 } : {}}
      whileTap={isAnimated && !isFlipping ? { scale: 0.98 } : {}}
      className={`
        glass-card
        relative overflow-hidden cursor-pointer rounded-2xl p-6
        bg-card border-border text-card-foreground shadow-sm
        hover:border-primary/50 transition-all duration-300 group border
      `}
      style={{
        boxShadow: isAnimated ? "0 4px 20px rgba(0, 0, 0, 0.2)" : "none"
      }}
    >
      {/* Glow Effect (Conditional on animation level) */}
      {isAnimated && animationLevel !== "minimal" && (
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${service.accentColor || '#3b82f6'}30, transparent 70%)`
          }}
        />
      )}

      <div className="flex justify-between items-start mb-8">
        {/* We wrap the icon in a large container to give it 300% more space, and apply scale to the SVG elements */}
        <div className="w-24 h-24 p-4 rounded-3xl bg-muted text-primary shadow-inner flex items-center justify-center border border-border/50">
          {(!isAnimated || animationLevel === "minimal") ? (
            <Cpu className="w-16 h-16" style={{ color: "var(--primary)" }} />
          ) : (
            <div className="transform scale-[2.5]">
              {service.iconType === "document-scan" && <DocIntelIcon color="var(--primary)" />}
              {service.iconType === "git-merge" && <AutomationIcon color="var(--primary)" />}
              {service.iconType === "brain" && <AIHubIcon color="var(--primary)" />}
              {service.iconType === "activity" && <ExecutionIcon color="var(--primary)" />}
              {service.iconType === "shield-alert" && <GovernanceIcon color="var(--primary)" />}
              {/* Fallback */}
              {!["document-scan", "git-merge", "brain", "activity", "shield-alert"].includes(service.iconType) && (
                <Cpu className="w-16 h-16" style={{ color: "var(--primary)" }} />
              )}
            </div>
          )}
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(e); }}
          className="text-muted-foreground hover:text-yellow-400 transition-colors p-2"
        >
          <Star className={`w-5 h-5 ${isFavorite ? "fill-yellow-400 text-yellow-400" : ""}`} />
        </button>
      </div>

      <h3 className="text-xl font-bold text-card-foreground mb-1 group-hover:text-primary transition-colors">{service.displayName}</h3>
      <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-4">{service.description}</p>

      {/* Metrics Footer */}
      <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground pt-4 border-t border-border/50">
        <div className="flex items-center gap-1">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-emerald-400/80">Healthy</span>
        </div>
        <div className="flex items-center gap-1">
          <BarChart2 className="w-4 h-4" />
          <span>Active</span>
        </div>
      </div>
    </motion.div>
  );
}
