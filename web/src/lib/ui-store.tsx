"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type ContextPanelType = "JOB_DETAILS" | "VM_HEALTH" | "QUEUE_ITEM" | "LOG_ENTRY" | null;

interface UIStoreContextType {
  // Global Search
  isSearchOpen: boolean;
  setSearchOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Context Panel
  contextPanelType: ContextPanelType;
  contextPanelData: any;
  openContextPanel: (type: ContextPanelType, data?: any) => void;
  closeContextPanel: () => void;

  // Sidebar
  isSidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const UIStoreContext = createContext<UIStoreContextType | undefined>(undefined);

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
  const [isSearchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [contextPanelType, setContextPanelType] = useState<ContextPanelType>(null);
  const [contextPanelData, setContextPanelData] = useState<any>(null);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);

  const openContextPanel = useCallback((type: ContextPanelType, data?: any) => {
    setContextPanelType(type);
    setContextPanelData(data || null);
  }, []);

  const closeContextPanel = useCallback(() => {
    setContextPanelType(null);
    setContextPanelData(null);
  }, []);

  return (
    <UIStoreContext.Provider value={{
      isSearchOpen,
      setSearchOpen,
      searchQuery,
      setSearchQuery,
      contextPanelType,
      contextPanelData,
      openContextPanel,
      closeContextPanel,
      isSidebarCollapsed,
      setSidebarCollapsed
    }}>
      {children}
    </UIStoreContext.Provider>
  );
};

export const useUIStore = () => {
  const context = useContext(UIStoreContext);
  if (!context) throw new Error("useUIStore must be used within UIProvider");
  return context;
};
