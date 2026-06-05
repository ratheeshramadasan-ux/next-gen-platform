import { create } from "zustand";

export type NavigationMode = "classic" | "hybrid" | "immersive";
export type ThemeKey = "midnight-ai" | "enterprise-dark" | "aurora-neon" | "slate-professional" | "light-executive" | "adaptive";
export type AnimationLevel = "off" | "minimal" | "standard" | "cinematic";

export interface PersonalizationState {
  navigationMode: NavigationMode;
  themeKey: ThemeKey;
  animationLevel: AnimationLevel;
  leftNavCollapsed: boolean;
  immersiveEffectsEnabled: boolean;
  aiCommandBarEnabled: boolean;
  densityMode: "compact" | "comfortable" | "spacious";
  fontScale: "small" | "normal" | "large" | "xlarge";
  soundEffectsEnabled: boolean;
  
  // Available Data
  services: any[];
  favorites: string[];
  recentServices: string[];
  themes: any[];
  
  isLoading: boolean;
  userId: string | null;

  // Actions
  setUserId: (userId: string) => void;
  loadWorkspace: () => Promise<void>;
  updatePreferences: (updates: Partial<PersonalizationState>) => Promise<void>;
  toggleFavorite: (serviceId: string) => Promise<void>;
}

export const usePersonalizationStore = create<PersonalizationState>((set, get) => ({
  navigationMode: "hybrid",
  themeKey: "midnight-ai",
  animationLevel: "standard",
  leftNavCollapsed: false,
  immersiveEffectsEnabled: true,
  aiCommandBarEnabled: true,
  densityMode: "comfortable",
  fontScale: "normal",
  soundEffectsEnabled: false,

  services: [],
  favorites: [],
  recentServices: [],
  themes: [],

  isLoading: true,
  userId: null,

  setUserId: (userId) => set({ userId }),

  loadWorkspace: async () => {
    const { userId } = get();
    if (!userId) return;

    set({ isLoading: true });
    try {
      const res = await fetch(`/api/workspace/bootstrap?userId=${userId}`);
      if (!res.ok) throw new Error("Failed to load workspace");
      
      const data = await res.json();
      
      set({
        ...data.personalization,
        services: data.services,
        favorites: data.favorites.map((f: any) => f.serviceId),
        recentServices: data.recentServices.map((r: any) => r.serviceId),
        themes: data.themes,
        isLoading: false
      });
    } catch (err) {
      console.error(err);
      set({ isLoading: false });
    }
  },

  updatePreferences: async (updates) => {
    const { userId } = get();
    set(updates); // Optimistic UI update
    
    if (!userId) return;

    try {
      await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, ...updates })
      });
    } catch (err) {
      console.error("Failed to save preferences", err);
    }
  },

  toggleFavorite: async (serviceId) => {
    const { favorites } = get();
    const isFav = favorites.includes(serviceId);
    
    const newFavorites = isFav 
      ? favorites.filter(id => id !== serviceId)
      : [...favorites, serviceId];
      
    set({ favorites: newFavorites });
    // TODO: implement API to save favorites
  }
}));
