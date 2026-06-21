"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { getCustomers, getTenantsForCustomer, getUserAccess } from "@/app/actions/tenantActions";

export type Role = "Platform Admin" | "Tenant Admin" | "Admin User";
export type CustomerStatus = "Active" | "Pending Approval" | "Suspended";
export type ThemeName = 
  | "Sand Serenity" | "Ink Wash" | "Jade Pebble" | "Opaline" | "Arctic Reflection" | "Mocha Espresso" | "Minimalist Slate" | "Pure Alabaster" // Light
  | "Woodland" | "Midnight Aurora" | "Wraith" | "Next Gen Ultra" | "Deep Space" | "Cyberpunk Neon" | "Emerald Empire" | "Crimson Velvet" | "Oceanic Depth" | "Jet Black" // Dark
  | "Aurora Glass" | "Frosted Glass" | "Obsidian Glass" | "Silk Glass" | "Horizon Glass" | "Lavender Mist" | "Champagne Glass"; // Glass & Soft
export type IconSetName = "Standard" | "Glow Aura" | "Minimal Thin" | "Vibrant Duotone" | "Sharp Tech" | "Futuristic Cyber" | "Glassmorphic Hologram" | "Retro 8-Bit" | "Neomorphic Tactile";
export type FontName = "Inter" | "Outfit" | "Plus Jakarta Sans" | "Playfair Display" | "JetBrains Mono" | "Manrope" | "Cormorant Garamond" | "Lexend" | "Space Grotesk" | "Montserrat" | "Syne" | "Roboto" | "Open Sans" | "Lato" | "Helvetica" | "Avenir" | "Cambria";
export type TextSize = "Tiny" | "Small" | "Regular" | "Large" | "Extra Large" | "Gigantic";

// Dark-background themes (including dark glass) — drives the `dark` class + React Flow color mode.
export const DARK_THEMES: ThemeName[] = ["Woodland", "Midnight Aurora", "Wraith", "Next Gen Ultra", "Deep Space", "Obsidian Glass", "Aurora Glass"];

// Glass themes that need the glass-mode class.
export const GLASS_THEMES: ThemeName[] = ["Aurora Glass", "Frosted Glass", "Obsidian Glass", "Silk Glass", "Horizon Glass", "Champagne Glass"];

export interface SystemUser {
  name: string;
  fullName?: string;
  email: string;
  role: Role;
  customerId?: string | null;
  tenantId?: string | null;
}

export interface TenantAdminInfo {
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  location: string;
  email: string;
  employeeId: string;
  jobTitle: string;
  department: string;
  manager: string;
  employmentType: string;
  workLocation: string;
  startDate: string;
  endDate: string;
  mfaEnabled: boolean;
}

export interface Customer {
  id: string;
  companyName: string;
  industry: string;
  location: string;
  status: CustomerStatus;
  classification: string;
  priority: string;
  createdAt: string;
  tenantAdmin?: TenantAdminInfo;
  securityContact?: string;
  securityEmail?: string;
  billingEmail?: string;
  isComplianceEnabled?: boolean;
  customerType?: string;
  customerTier?: string;
  logoUrl?: string | null;
  theme?: string;
  slug?: string | null;
  planType?: string;
}

export interface LogEvent {
  id: string;
  timestamp: string;
  role: string;
  userEmail: string;
  action: string;
  target: string;
  metadata?: any;
}

export interface TenantService {
  id: string;
  serviceName: string;
  enabled: boolean;
}

export interface Tenant {
  id: string;
  name: string;
  code: string;
  type: string; // PROD, DEV, UAT, SANDBOX
  status: string; // ACTIVE, INACTIVE, DISABLED
  isDefault: boolean;
  isProtected: boolean;
  customerId: string;
  services: TenantService[];
}

interface AppContextType {
  role: Role;
  currentUser: SystemUser;
  availableAdmins: SystemUser[];
  switchUser: (email: string) => void;
  activeTheme: ThemeName;
  setActiveTheme: (theme: ThemeName) => void;
  isDarkTheme: boolean;
  activeIconSet: IconSetName;
  setActiveIconSet: (iconSet: IconSetName) => void;
  activeFont: FontName;
  setActiveFont: (font: FontName) => void;
  activeBackground: string | null;
  setActiveBackground: (bg: string | null) => void;
  panelOpacity: number;
  setPanelOpacity: (opacity: number) => void;
  activeTextSize: TextSize;
  setActiveTextSize: (size: TextSize) => void;
  customers: Customer[];
  addCustomerRequest: (customer: Customer) => void;
  updateCustomerStatus: (id: string, status: CustomerStatus) => void;
  pendingRequests: Customer[];
  auditLogs: LogEvent[];
  dispatchLog: (action: string, target: string, metadata?: any) => void;
  sendSimulatedEmail: (to: string, subject: string, body: string) => void;
  
  // Customer + Tenant Context
  activeCustomer: Customer | null;
  switchCustomer: (id: string) => void;
  availableTenants: Tenant[];
  activeTenant: Tenant | null;
  switchTenant: (id: string) => void;
  isServiceEnabled: (serviceName: string) => boolean;
  isLoadingCustomers: boolean;
  refreshCustomers: () => Promise<void>;
  refreshActiveTenants: () => Promise<void>;
  tenantId: string | null;
}

const AVAILABLE_USERS: SystemUser[] = [
  { name: "Ratheesh Ramadasan", email: "ratheesh.ramadasan@gmail.com", role: "Platform Admin" },
  { name: "Reshmi Ratheesh", email: "lachureshmi6@gmail.com", role: "Platform Admin" }
];

const AppContext = createContext<AppContextType | undefined>(undefined);

const userAccessCache = new Map<string, Customer[]>();
const userAccessRequestCache = new Map<string, Promise<Customer[]>>();
const tenantCache = new Map<string, Tenant[]>();
const tenantRequestCache = new Map<string, Promise<Tenant[]>>();

async function loadUserAccess(email: string): Promise<Customer[]> {
  const cachedAccess = userAccessCache.get(email);
  if (cachedAccess) return cachedAccess;

  const activeRequest = userAccessRequestCache.get(email);
  if (activeRequest) return activeRequest;

  const request = (getUserAccess(email) as Promise<Customer[]>)
    .then((customers) => {
      userAccessCache.set(email, customers);
      return customers;
    })
    .finally(() => {
      userAccessRequestCache.delete(email);
    });

  userAccessRequestCache.set(email, request);
  return request;
}

async function loadTenantsForCustomer(customerId: string, forceRefresh = false): Promise<Tenant[]> {
  if (forceRefresh) {
    tenantCache.delete(customerId);
    tenantRequestCache.delete(customerId);
  }

  const cachedTenants = tenantCache.get(customerId);
  if (cachedTenants) return cachedTenants;

  const activeRequest = tenantRequestCache.get(customerId);
  if (activeRequest) return activeRequest;

  const request = (getTenantsForCustomer(customerId) as Promise<Tenant[]>)
    .then((tenants) => {
      tenantCache.set(customerId, tenants);
      return tenants;
    })
    .finally(() => {
      tenantRequestCache.delete(customerId);
    });

  tenantRequestCache.set(customerId, request);
  return request;
}

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<SystemUser>(AVAILABLE_USERS[0]);
  const [activeTheme, setActiveTheme] = useState<ThemeName>("Sand Serenity");
  const [activeIconSet, setActiveIconSet] = useState<IconSetName>("Standard");
  const [activeFont, setActiveFont] = useState<FontName>("Inter");
  const [activeBackground, setActiveBackground] = useState<string | null>(null);
  const [panelOpacity, setPanelOpacity] = useState<number>(0.8);
  const [activeTextSize, setActiveTextSize] = useState<TextSize>("Regular");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [auditLogs, setAuditLogs] = useState<LogEvent[]>([]);

  // Customer + Tenant State
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  // 1. Initial Hydration from Data Source
  const hydrateCustomers = async () => {
    setIsLoadingCustomers(true);
    try {
      // Use the new role-based access action
      const dbCustomers = await loadUserAccess(currentUser.email);
      if (dbCustomers) {
        setCustomers(dbCustomers as any);
        return dbCustomers;
      }
    } catch (e) {
      console.error("Critical Customer Hydration Failure:", e);
    } finally {
      setIsLoadingCustomers(false);
    }
    return [];
  };

  const refreshCustomers = async () => {
    await hydrateCustomers();
  };

  // Main Hydration Sequence
  useEffect(() => {
    const initContext = async () => {
      const dbCustomers = await hydrateCustomers() as any[];
      
      // Load persistence
      const savedCustomerId = localStorage.getItem("nextgen_active_customer");
      const savedTenantId = localStorage.getItem("nextgen_active_tenant");

      // Role-based Enforcement
      if (currentUser.customerId) {
        // Scoped User - Lock to their customer
        const matched = dbCustomers.find(c => c.id === currentUser.customerId);
        if (matched) {
          setActiveCustomer(matched);
          // If they are also locked to a tenant
          if (currentUser.tenantId) {
             // We'll let the tenant-loading useEffect handle this
          }
        }
      } else if (savedCustomerId) {
        // Platform Admin with saved context
        const matched = dbCustomers.find(c => c.id === savedCustomerId);
        if (matched && matched.status !== "Suspended") setActiveCustomer(matched);
        else {
          const activeOrPending = dbCustomers.filter(c => c.status !== "Suspended");
          if (activeOrPending.length > 0) setActiveCustomer(activeOrPending[0]);
        }
      } else {
        // Fallback for Platform Admin
        const activeOrPending = dbCustomers.filter(c => c.status !== "Suspended");
        if (activeOrPending.length > 0) setActiveCustomer(activeOrPending[0]);
      }
    };
    initContext();
  }, []);

  // Fetch tenants when activeCustomer changes
  useEffect(() => {
    let isCurrent = true;
    const loadTenants = async () => {
      if (!activeCustomer) {
        setAvailableTenants([]);
        setActiveTenant(null);
        return;
      }
      try {
        const tenants = await loadTenantsForCustomer(activeCustomer.id);
        if (!isCurrent) return;
        setAvailableTenants(tenants);
        
        const savedTenantId = localStorage.getItem("nextgen_active_tenant");
        
        // Selection Logic
        if (currentUser.tenantId) {
          // Locked User
          const matched = tenants.find(t => t.id === currentUser.tenantId);
          setActiveTenant(matched || tenants[0] || null);
        } else if (savedTenantId) {
          // Persisted Selection
          const matched = tenants.find(t => t.id === savedTenantId);
          if (matched) setActiveTenant(matched);
          else setActiveTenant(tenants.find(t => t.isDefault) || tenants[0] || null);
        } else {
          // Default
          setActiveTenant(tenants.find(t => t.isDefault) || tenants[0] || null);
        }
      } catch (e) {
        if (!isCurrent) return;
        console.error("Tenant Hydration Failure:", e);
        setAvailableTenants([]);
        setActiveTenant(null);
      }
    };
    loadTenants();
    return () => {
      isCurrent = false;
    };
  }, [activeCustomer?.id]);

  // Sync Persistence to LocalStorage
  useEffect(() => {
    if (activeCustomer) {
      localStorage.setItem("nextgen_active_customer", activeCustomer.id);
      if (activeCustomer.theme) {
        setActiveTheme(activeCustomer.theme as ThemeName);
        localStorage.setItem("nextgen_theme", activeCustomer.theme);
      }
    }
  }, [activeCustomer]);

  useEffect(() => {
    if (activeTenant) {
      localStorage.setItem("nextgen_active_tenant", activeTenant.id);
    }
  }, [activeTenant]);

  // UI Theme Persistence
  useEffect(() => {
    const savedTheme = localStorage.getItem("nextgen_theme") as ThemeName;
    const savedIcon = localStorage.getItem("nextgen_iconset") as IconSetName;
    const savedFont = localStorage.getItem("nextgen_font") as FontName;
    const savedBg = localStorage.getItem("nextgen_bg_image");
    const savedTextSize = localStorage.getItem("nextgen_textsize") as TextSize;
    const savedOpacity = localStorage.getItem("nextgen_opacity");

    if (savedTheme) setActiveTheme(savedTheme);
    if (savedIcon) setActiveIconSet(savedIcon);
    if (savedFont) setActiveFont(savedFont);
    // Migrate old wrong path (/backgrounds/next-gen/) → correct path (/backgrounds/dashboard/)
    if (savedBg) setActiveBackground(savedBg.replace('/backgrounds/next-gen/', '/backgrounds/dashboard/'));
    if (savedTextSize) setActiveTextSize(savedTextSize);
    if (savedOpacity) setPanelOpacity(parseFloat(savedOpacity));
  }, []);

  // Sync Body Classes for Theme
  useEffect(() => {
    const themeClass = activeTheme.toLowerCase().replace(/\s+/g, '-');
    // Remove all previous theme classes
    Array.from(document.body.classList).forEach(cls => {
      if (cls.startsWith("theme-")) document.body.classList.remove(cls);
    });
    document.body.classList.add(`theme-${themeClass}`);
    localStorage.setItem("nextgen_theme", activeTheme);

    const isDark = DARK_THEMES.includes(activeTheme);
    document.documentElement.classList.toggle("dark", isDark);

    const isGlass = GLASS_THEMES.includes(activeTheme);
    document.documentElement.classList.toggle("glass-mode", isGlass);
  }, [activeTheme]);

  useEffect(() => {
    localStorage.setItem("nextgen_iconset", activeIconSet);
    const iconClass = activeIconSet.toLowerCase().replace(/\s+/g, '-');
    Array.from(document.body.classList).forEach(cls => {
      if (cls.startsWith("icon-set-")) document.body.classList.remove(cls);
    });
    document.body.classList.add(`icon-set-${iconClass}`);
  }, [activeIconSet]);

  useEffect(() => {
    localStorage.setItem("nextgen_font", activeFont);
    const fontClass = activeFont.toLowerCase().replace(/\s+/g, '-');
    Array.from(document.documentElement.classList).forEach(cls => {
      if (cls.startsWith("font-family-")) document.documentElement.classList.remove(cls);
    });
    document.documentElement.classList.add(`font-family-${fontClass}`);
  }, [activeFont]);

  useEffect(() => {
    localStorage.setItem("nextgen_opacity", panelOpacity.toString());
    document.documentElement.style.setProperty('--panel-opacity', panelOpacity.toString());
  }, [panelOpacity]);

  useEffect(() => {
    if (activeBackground) {
      localStorage.setItem("nextgen_bg_image", activeBackground);
    } else {
      localStorage.removeItem("nextgen_bg_image");
    }
  }, [activeBackground]);

  useEffect(() => {
    localStorage.setItem("nextgen_textsize", activeTextSize);
    const sizeClass = `text-size-${activeTextSize.toLowerCase().replace(/\s+/g, '-')}`;
    Array.from(document.documentElement.classList).forEach(cls => {
      if (cls.startsWith("text-size-")) document.documentElement.classList.remove(cls);
    });
    document.documentElement.classList.add(sizeClass);
  }, [activeTextSize]);
  
  const refreshActiveTenants = async () => {
    if (!activeCustomer) return;
    try {
      const tenants = await loadTenantsForCustomer(activeCustomer.id, true);
      setAvailableTenants(tenants);
    } catch (e) {
      console.error("Manual Tenant Refresh Failure:", e);
    }
  };

  const role = currentUser.role;
  const pendingRequests = customers.filter(c => c.status === "Pending Approval");

  const switchUser = (email: string) => {
    const user = AVAILABLE_USERS.find(u => u.email === email);
    if (user) {
      setCurrentUser(user);
      dispatchLog("USER_SWITCH", "Identity Provider", { switchedTo: user.name, role: user.role });
    }
  };

  const dispatchLog = (action: string, target: string, metadata?: any) => {
    const newLog: LogEvent = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        role: currentUser.role,
        userEmail: currentUser.email,
        action: action,
        target: target,
        metadata: metadata
    };
    
    console.group(`[AUDIT] ${action} : ${target}`);
    console.log(`User: ${currentUser.name} (${currentUser.email})`);
    console.log(`Role: ${newLog.role}`);
    if (metadata) console.log(`Payload:`, metadata);
    console.groupEnd();

    setAuditLogs(prev => [newLog, ...prev]);
  };

  const sendSimulatedEmail = (to: string, subject: string, body: string) => {
    dispatchLog("SIMULATED_EMAIL_SENT", to, { subject, body });
    console.log(`%c[EMAIL SIMULATION] To: ${to}\nSubject: ${subject}\nBody: ${body}`, "color: #4f46e5; font-weight: bold; border: 1px solid #4f46e5; padding: 4px; border-radius: 4px;");
  };

  const switchCustomer = (id: string) => {
    const customer = customers.find(c => c.id === id);
    if (customer) {
      setActiveCustomer(customer);
      if (customer.theme) {
        setActiveTheme(customer.theme as ThemeName);
        localStorage.setItem("nextgen_theme", customer.theme);
      }
      dispatchLog("CUSTOMER_SWITCH", customer.companyName, { customerId: customer.id });
    }
  };

  const switchTenant = (id: string) => {
    const tenant = availableTenants.find(t => t.id === id);
    if (tenant) {
      setActiveTenant(tenant);
      dispatchLog("TENANT_SWITCH", tenant.name, { code: tenant.code });
    }
  };

  const isServiceEnabled = (serviceName: string) => {
    if (!activeTenant) return true; // Platform Admin mode / Global view
    return activeTenant.services.some(s => s.serviceName === serviceName && s.enabled);
  };

  const addCustomerRequest = (customer: Customer) => {
    setCustomers(prev => [customer, ...prev]);
  };

  const updateCustomerStatus = (id: string, status: CustomerStatus) => {
    setCustomers(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  return (
    <AppContext.Provider value={{
      role,
      currentUser,
      availableAdmins: AVAILABLE_USERS,
      switchUser,
      activeTheme,
      setActiveTheme,
      isDarkTheme: DARK_THEMES.includes(activeTheme),
      activeIconSet,
      setActiveIconSet,
      activeFont,
      setActiveFont,
      activeBackground,
      setActiveBackground,
      panelOpacity,
      setPanelOpacity,
      activeTextSize,
      setActiveTextSize,
      customers,
      addCustomerRequest,
      updateCustomerStatus,
      pendingRequests,
      auditLogs,
      dispatchLog,
      sendSimulatedEmail,
      activeCustomer,
      switchCustomer,
      availableTenants,
      activeTenant,
      switchTenant,
      isServiceEnabled,
      isLoadingCustomers,
      refreshCustomers,
      refreshActiveTenants,
      tenantId: activeTenant?.id || null
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppContext must be used within AppProvider");
  return context;
};
