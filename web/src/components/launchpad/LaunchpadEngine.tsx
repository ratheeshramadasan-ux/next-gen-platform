import React, { useMemo } from "react";
import { ServiceCard } from "./ServiceCard";
import { usePersonalizationStore } from "@/stores/usePersonalizationStore";

export function LaunchpadEngine() {
  const { services, favorites, toggleFavorite, densityMode } = usePersonalizationStore();

  const gridClass = useMemo(() => {
    switch(densityMode) {
      case "compact": return "grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4";
      case "spacious": return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8";
      case "comfortable":
      default: return "grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6";
    }
  }, [densityMode]);

  const favoriteServices = services.filter(s => favorites.includes(s.id));
  const otherServices = services.filter(s => !favorites.includes(s.id));

  return (
    <div className="w-full max-w-7xl mx-auto p-8 pt-16 pb-32 h-full overflow-y-auto custom-scrollbar">
      <div className="mb-12">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-white/50 mb-2 tracking-tight">
          Enterprise AI Launchpad
        </h1>
        <p className="text-lg text-slate-600 dark:text-white/60 font-medium">Select a service to enter your workspace</p>
      </div>

      {favoriteServices.length > 0 && (
        <div className="mb-12">
          <h2 className="text-sm font-black tracking-widest uppercase text-slate-500 dark:text-white/40 mb-6 flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
            Pinned Services
          </h2>
          <div className={`grid ${gridClass}`}>
            {favoriteServices.map(service => (
              <ServiceCard 
                key={service.id} 
                service={service} 
                isFavorite={true}
                onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(service.id); }}
                onClick={() => console.log(`Navigating to ${service.route}`)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-black tracking-widest uppercase text-slate-500 dark:text-white/40 mb-6 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          All Services
        </h2>
        <div className={`grid ${gridClass}`}>
          {otherServices.map(service => (
            <ServiceCard 
              key={service.id} 
              service={service} 
              isFavorite={false}
              onToggleFavorite={(e) => { e.stopPropagation(); toggleFavorite(service.id); }}
              onClick={() => console.log(`Navigating to ${service.route}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
