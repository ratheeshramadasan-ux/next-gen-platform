"use client";

import React, { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, Search, Globe, Clock, CreditCard, UserCheck, 
  Settings, Trash2, Edit, Save, X, XCircle,
  Download, Copy,
  LayoutGrid, AlertTriangle, CheckCircle2,
  Zap
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { IconWrapper } from "@/components/ui/icon-wrapper";
import { cn } from "@/lib/utils";
import { useAppContext } from "@/lib/context";
import { useSearchParams } from "next/navigation";
import { 
  getPlatformLookups, 
  addLookupItem, 
  addLookupItemsBulk,
  updateLookupItem, 
  removeLookupItem,
  purgeDisabledLookups,
  LookupType
} from "@/app/actions/lookupActions";

// --- CATEGORY CONFIGURATION ---
interface CategoryConfig {
  id: LookupType;
  label: string;
  icon: any;
  headers: string[];
  fields: { key: string; label: string; placeholder?: string; type?: "text" | "textarea" }[];
}

const MASTER_CONFIGS: CategoryConfig[] = [
  { 
    id: "INDUSTRY", 
    label: "Industries", 
    icon: LucideIcons.Building2,
    headers: ["Icon", "Name", "Status"],
    fields: [
      { key: "label", label: "Name", placeholder: "e.g. Technology" },
      { key: "icon", label: "Icon Name", placeholder: "e.g. Zap" }
    ]
  },
  { 
    id: "REGION", 
    label: "Regions", 
    icon: LucideIcons.Globe,
    headers: ["Icon", "Category", "Location", "Status"],
    fields: [
      { key: "category", label: "Category", placeholder: "e.g. Europe" },
      { key: "label", label: "Region Name", placeholder: "e.g. Ireland" },
      { key: "icon", label: "Flag Emoji", placeholder: "e.g. 🇮🇪" }
    ]
  },
  { 
    id: "CURRENCY", 
    label: "Currencies", 
    icon: LucideIcons.CreditCard,
    headers: ["Icon", "Country Code", "Country", "Symbol", "Status"],
    fields: [
      { key: "label", label: "Country", placeholder: "e.g. United States" },
      { key: "code", label: "Country Code", placeholder: "e.g. USD" },
      { key: "symbol", label: "Symbol", placeholder: "e.g. $" },
      { key: "icon", label: "Icon Name", placeholder: "e.g. Wallet" }
    ]
  },
  { 
    id: "TIMEZONE", 
    label: "Time Zones", 
    icon: LucideIcons.Clock,
    headers: ["Region", "Timezone", "Status"],
    fields: [
      { key: "category", label: "Region", placeholder: "e.g. North America" },
      { key: "label", label: "Timezone", placeholder: "e.g. Eastern Standard Time" }
    ]
  },
  { 
    id: "CUSTOMER_TYPE", 
    label: "Customer Types", 
    icon: LucideIcons.UserCheck,
    headers: ["Type", "Description", "Status"],
    fields: [
      { key: "label", label: "Type", placeholder: "e.g. Enterprise" },
      { key: "description", label: "Description", type: "textarea", placeholder: "Define customer tier..." }
    ]
  },
  { 
    id: "PRIORITY", 
    label: "Priorities", 
    icon: LucideIcons.Zap,
    headers: ["Levels", "Description", "Status"],
    fields: [
      { key: "label", label: "Levels", placeholder: "e.g. High" },
      { key: "description", label: "Description", type: "textarea", placeholder: "SLA requirements..." }
    ]
  },
  { 
    id: "ENGAGEMENT_TIER", 
    label: "Engagement Tiers", 
    icon: LucideIcons.Sparkles,
    headers: ["Category", "Tier", "Description", "Status"],
    fields: [
      { key: "category", label: "Category", placeholder: "e.g. Delivery Model" },
      { key: "label", label: "Tier Name", placeholder: "e.g. Self-Service" },
      { key: "description", label: "Definition", type: "textarea" }
    ]
  },
  { 
    id: "CLASSIFICATION", 
    label: "Classifications", 
    icon: LucideIcons.Tag,
    headers: ["Category", "Name", "Description", "Status"],
    fields: [
      { key: "category", label: "Category", placeholder: "e.g. Revenue" },
      { key: "label", label: "Name", placeholder: "e.g. Tier 1" },
      { key: "description", label: "Description", type: "textarea" }
    ]
  }
];

function MastersPageContent() {
  const { role, activeTheme, activeBackground, panelOpacity } = useAppContext();
  
  const searchParams = useSearchParams();
  const initialCat = searchParams.get("cat") as LookupType;
  
  const [selectedCategory, setSelectedCategory] = useState<LookupType>(initialCat || "INDUSTRY");
  const [isLoading, setIsLoading] = useState(true);
  const [lookups, setLookups] = useState<any>({});
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [isBulkAdding, setIsBulkAdding] = useState(false);
  const [bulkInput, setBulkInput] = useState("");

  const activeConfig = MASTER_CONFIGS.find(cfg => cfg.id === selectedCategory)!;

  const refreshData = async () => {
    setIsLoading(true);
    try {
      const res = await getPlatformLookups();
      console.log("[DICTIONARIES] getPlatformLookups raw response:", res);
      
      if (res && res.success) {
        setLookups({
          INDUSTRY: res.industries || [],
          REGION: res.regions || [],
          CURRENCY: res.currencies || [],
          TIMEZONE: res.timezones || [],
          CUSTOMER_TYPE: res.customerTypes || [],
          CLASSIFICATION: res.classifications || [],
          PRIORITY: res.priorities || [],
          ENGAGEMENT_TIER: res.engagementTiers || []
        });
        console.log("[DICTIONARIES] Updated lookups state keys:", Object.keys(lookups));
        console.log("[DICTIONARIES] Engagement Tiers count:", (res.engagementTiers || []).length);
      } else {
        const errorMsg = res?.error || "Empty response from server action";
        console.error("[DICTIONARIES] getPlatformLookups failed:", errorMsg, res);
        
        // Still set empty state so page doesn't stay loading
        setLookups({
          INDUSTRY: [], REGION: [], CURRENCY: [], TIMEZONE: [],
          CUSTOMER_TYPE: [], CLASSIFICATION: [], PRIORITY: [],
          ENGAGEMENT_TIER: []
        });
      }
    } catch (err: any) {
      console.error("[DICTIONARIES] Error calling getPlatformLookups:", err);
      setLookups({
        INDUSTRY: [], REGION: [], CURRENCY: [], TIMEZONE: [],
        CUSTOMER_TYPE: [], CLASSIFICATION: [], PRIORITY: [],
        ENGAGEMENT_TIER: []
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedCategory]);

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label) return;
    setIsSubmitting(true);
    
    let res;
    if (editingId) {
      res = await updateLookupItem(
        selectedCategory, 
        editingId, 
        formData.label, 
        formData.label, 
        formData.isActive ?? true, 
        role, 
        formData.icon,
        formData.category,
        formData.code,
        formData.description,
        formData.symbol
      );
    } else {
      res = await addLookupItem(
        selectedCategory, 
        formData.label, 
        role, 
        formData.icon, 
        formData.category,
        formData.code,
        formData.description,
        formData.symbol
      );
    }

    if (res.success) {
      setFormData({});
      setIsAdding(false);
      setEditingId(null);
      await refreshData();
    } else {
      setFormError(res.error || "Operation failed.");
    }
    setIsSubmitting(false);
  };

  const handleDisable = async (item: any) => {
    setIsSubmitting(true);
    await updateLookupItem(selectedCategory, item.id, item.label, item.label, !item.isActive, role, item.icon, item.category, item.code, item.description, item.symbol);
    await refreshData();
    setIsSubmitting(false);
  };


  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Permanently delete '${label}'?`)) return;
    const res = await removeLookupItem(selectedCategory, id, label, role);
    if (res.success) await refreshData();
    else alert(res.error);
  };

  const handlePurge = async () => {
    if (!confirm("Permanently delete ALL disabled records across all categories? This action cannot be undone.")) return;
    setIsLoading(true);
    const res = await purgeDisabledLookups(role);
    if (res.success) {
      await refreshData();
    } else {
      alert(res.error);
    }
    setIsLoading(false);
  };

  const currentList = (lookups[selectedCategory] || []).filter((item: any) => 
    item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.code || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden relative">
      {/* Background Image Sync */}
      {activeBackground && (
        <div 
          className="absolute inset-0 z-0 bg-cover bg-center transition-opacity"
          style={{ backgroundImage: `url(${activeBackground})`, opacity: 0.15 }}
        />
      )}

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex justify-between items-start">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3 text-muted-foreground mb-1">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Platform Control Center</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter uppercase text-foreground">
              Reference Data
            </h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2 opacity-60">Manage all platform registries</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="px-8 border-b border-border bg-card/40 backdrop-blur-md">
          <div className="flex items-center gap-8">
            {MASTER_CONFIGS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  "relative py-3 flex items-center gap-2.5 text-[11px] font-black uppercase tracking-widest transition-all",
                  selectedCategory === cat.id ? "text-foreground" : "text-muted-foreground hover:text-foreground/80"
                )}
              >
                <IconWrapper 
                  icon={cat.icon} 
                  size={16} 
                  className={selectedCategory === cat.id ? "text-foreground" : "text-muted-foreground group-hover:text-foreground/80"} 
                />
                {cat.label}
                {selectedCategory === cat.id && (
                  <motion.div 
                    layoutId="activeMasterTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--primary)' }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 flex justify-between items-center bg-background/60 backdrop-blur-xl border-b border-border/40">
          <button 
            onClick={() => {
              setFormData({});
              setEditingId(null);
              setIsAdding(true);
            }}
            className="px-5 py-3 bg-primary text-white rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-primary/90 transition-all shadow-xl shadow-primary/20 flex items-center gap-2"
            style={{ backgroundColor: 'var(--primary)' }}
          >
            <Plus size={16} />
            Add New Entry
          </button>

          <button 
            onClick={handlePurge}
            className="px-5 py-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-sm text-[10px] font-black uppercase tracking-[0.2em] hover:bg-rose-500 hover:text-white transition-all shadow-lg shadow-rose-500/5 group flex items-center gap-2"
          >
            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
            Purge Disabled
          </button>

          <div className="flex items-center gap-4">
            <div className="relative group">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <input 
                type="text" 
                placeholder={`Search ${activeConfig.label.toLowerCase()}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 pr-5 py-3.5 bg-card/40 border border-border/60 rounded-sm tracking-widest text-[10px] font-black uppercase focus:ring-4 focus:border-primary transition-all outline-none md:w-80 w-full"
              />
            </div>
            <button 
              onClick={() => setIsBulkAdding(true)}
              className="p-3.5 bg-card/40 border border-border/60 rounded-sm text-muted-foreground hover:text-primary hover:bg-muted transition-all shadow-sm group"
              title="Bulk Import"
            >
              <Download size={16} className="group-hover:-translate-y-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="flex-1 overflow-y-auto px-10 py-8 custom-scrollbar">
          <div className="bg-card/30 border border-border/50 rounded-sm shadow-2xl overflow-hidden backdrop-blur-2xl mb-10">
            <table className="w-full text-left border-collapse cursor-default">
              <thead>
                <tr className="bg-background/40 border-b border-border/80">
                   {activeConfig.headers.map((header, i) => (
                     <th key={header} className={cn("px-4 py-2 text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]", i === 0 ? "text-center w-24" : "")}>{header}</th>
                   ))}
                   <th className="px-4 py-2 text-right text-[10px] font-black text-muted-foreground uppercase tracking-[0.3em]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {isLoading ? (
                  <tr>
                    <td colSpan={activeConfig.headers.length + 1} className="px-8 py-32 text-center">
                       <div className="flex flex-col items-center justify-center gap-4 text-muted-foreground opacity-60">
                           <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                           <span className="text-[10px] font-black uppercase tracking-[0.3em]">Loading Master Registry...</span>
                       </div>
                    </td>
                  </tr>
                ) : currentList.length === 0 ? (
                  <tr>
                    <td colSpan={activeConfig.headers.length + 1} className="px-6 py-20 text-center text-sm text-muted-foreground opacity-60">
                      No records found
                    </td>
                  </tr>
                ) : (
                  currentList.map((item: any) => {
                    // --- SMART ICON RESOLUTION ---
                    let IconToRender = activeConfig.icon;
                    if (item.icon && (LucideIcons as any)[item.icon]) {
                      IconToRender = (LucideIcons as any)[item.icon];
                    } else if (activeConfig.id === "INDUSTRY") {
                      const label = item.label.toLowerCase();
                      if (label.includes("tech") || label.includes("software") || label.includes("digital")) IconToRender = LucideIcons.Cpu;
                      else if (label.includes("finance") || label.includes("bank") || label.includes("invest")) IconToRender = LucideIcons.Wallet;
                      else if (label.includes("health") || label.includes("medical") || label.includes("pharma")) IconToRender = LucideIcons.Activity;
                      else if (label.includes("retail") || label.includes("store") || label.includes("shop")) IconToRender = LucideIcons.ShoppingBag;
                      else if (label.includes("manufact") || label.includes("factory") || label.includes("industrial")) IconToRender = LucideIcons.Factory;
                      else if (label.includes("edu") || label.includes("school") || label.includes("learn")) IconToRender = LucideIcons.BookOpen;
                      else if (label.includes("construct") || label.includes("build") || label.includes("real estate")) IconToRender = LucideIcons.HardHat;
                      else if (label.includes("food") || label.includes("restau") || label.includes("bever")) IconToRender = LucideIcons.Utensils;
                      else if (label.includes("energy") || label.includes("oil") || label.includes("gas") || label.includes("solar")) IconToRender = LucideIcons.Zap;
                    }


                    return (
                      <tr key={item.id} className="hover:bg-muted/10 transition-colors group">

                        {/* Icon column — only for registries that have an Icon header */}
                        {!["TIMEZONE", "CUSTOMER_TYPE", "PRIORITY", "CLASSIFICATION", "ENGAGEMENT_TIER"].includes(activeConfig.id) && (
                          <td className="px-4 py-2 text-center w-24">
                            <div 
                              className="w-10 h-10 bg-primary/5 border border-primary/20 rounded-sm flex items-center justify-center group-hover:bg-primary/20 transition-all mx-auto shadow-sm"
                              style={{ color: 'var(--primary)' }}
                            >
                              {typeof item.icon === "string" && item.icon.match(/[\uD800-\uDBFF][\uDC00-\uDFFF]|\u200D/g) ? (
                                <span className="text-xl">{item.icon}</span>
                              ) : (
                                <IconWrapper icon={IconToRender} size={20} />
                              )}
                            </div>
                          </td>
                        )}

                        {/* Timezone: Region first column */}
                        {activeConfig.id === "TIMEZONE" && (
                          <td className="px-4 py-2">
                            <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground">
                              <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
                              {item.category || "—"}
                            </span>
                          </td>
                        )}

                        {/* Region/Classification/Engagement: Category column */}
                        {["REGION", "CLASSIFICATION", "ENGAGEMENT_TIER"].includes(activeConfig.id) && (
                          <td className="px-4 py-2">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{item.category || "—"}</span>
                          </td>
                        )}

                        {/* Currency: Country Code column */}
                        {activeConfig.id === "CURRENCY" && (
                          <td className="px-4 py-2">
                            <span className="font-mono font-black text-primary text-xs tracking-widest bg-primary/10 border border-primary/20 px-3 py-1 rounded-sm">{item.code || "—"}</span>
                          </td>
                        )}

                        {/* Main label column — Location / Country / Timezone / etc. */}
                        <td className="px-4 py-2">
                          <span className="text-sm font-black text-foreground border-b border-border/0 group-hover:border-primary/40 pb-0.5 transition-colors">{item.label}</span>
                        </td>
                        
                        {/* Type/Priority/Classification/Engagement: Description column */}
                        {["CUSTOMER_TYPE", "PRIORITY", "CLASSIFICATION", "ENGAGEMENT_TIER"].includes(activeConfig.id) && (
                          <td className="px-4 py-2">
                            <span className="text-xs font-medium text-muted-foreground leading-relaxed">{item.description || "—"}</span>
                          </td>
                        )}
                        
                        {/* Currency: Symbol */}
                        {activeConfig.id === "CURRENCY" && (
                          <td className="px-4 py-2">
                             <span className="text-xl font-bold bg-muted/40 rounded-sm w-10 h-10 flex items-center justify-center border border-border/50">{item.symbol || "—"}</span>
                          </td>
                        )}

                        {/* Status Column */}
                        <td className="px-4 py-2">
                          <div className={cn(
                            "inline-flex items-center px-4 py-1 rounded-sm border text-[9px] font-black uppercase tracking-[0.2em] shadow-sm",
                            item.isActive 
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                              : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          )}>
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full mr-2",
                              item.isActive ? "bg-emerald-500" : "bg-rose-500"
                            )}></div>
                            {item.isActive ? "Active" : "Disabled"}
                          </div>
                        </td>

                        {/* Actions Column */}
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                const editItem = { ...item };
                                if (selectedCategory === "INDUSTRY" && (!editItem.icon || editItem.icon === "Building2")) {
                                  const l = editItem.label.toLowerCase();
                                  if (l.includes("tech") || l.includes("software") || l.includes("digital")) editItem.icon = "Cpu";
                                  else if (l.includes("finance") || l.includes("bank") || l.includes("invest")) editItem.icon = "Wallet";
                                  else if (l.includes("health") || l.includes("medical") || l.includes("pharma")) editItem.icon = "Activity";
                                  else if (l.includes("retail") || l.includes("store") || l.includes("shop")) editItem.icon = "ShoppingBag";
                                  else if (l.includes("manufact") || l.includes("factory") || l.includes("industrial")) editItem.icon = "Factory";
                                  else if (l.includes("edu") || l.includes("school") || l.includes("learn")) editItem.icon = "BookOpen";
                                  else if (l.includes("construct") || l.includes("build") || l.includes("real estate")) editItem.icon = "HardHat";
                                  else if (l.includes("food") || l.includes("restau") || l.includes("bever")) editItem.icon = "Utensils";
                                  else if (l.includes("energy") || l.includes("oil") || l.includes("gas") || l.includes("solar")) editItem.icon = "Zap";
                                }
                                setEditingId(item.id);
                                setFormData(editItem);
                                setIsAdding(true);
                              }}
                              className="p-2.5 bg-muted/50 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shadow-sm"
                              title="Edit Record"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => handleDisable(item)}
                              className="p-2.5 bg-muted/50 rounded-sm text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors shadow-sm"
                              title={item.isActive ? "Disable Record" : "Enable Record"}
                            >
                              {item.isActive ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                            </button>
                            <button 
                              onClick={() => handleDelete(item.id, item.label)}
                              className="p-2.5 bg-muted/50 rounded-sm text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors shadow-sm"
                              title="Delete Record"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              className="w-full max-w-lg bg-card rounded-sm shadow-2xl border border-border overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-border bg-muted/20 flex justify-between items-center">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-tight">{editingId ? "Modify Entry" : "Create Master"}</h3>
                <button onClick={() => { setIsAdding(false); setEditingId(null); }} className="p-2 text-muted-foreground hover:bg-muted rounded-sm"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddOrUpdate} className="p-8 space-y-6">
                <div className="space-y-6">
                  {activeConfig.fields.map(field => (
                    <div key={field.key} className="space-y-2">
                       <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{field.label} *</label>
                       {field.type === "textarea" ? (
                         <textarea 
                           required 
                           rows={3}
                           value={formData[field.key] || ""} 
                           onChange={e => setFormData({...formData, [field.key]: e.target.value})} 
                           placeholder={field.placeholder}
                           className="w-full px-4 py-3 bg-muted/10 border border-border rounded-sm text-sm outline-none focus:border-primary resize-none" 
                         />
                       ) : (
                         <input 
                           required={field.key === "label"}
                           value={formData[field.key] || ""} 
                           onChange={e => setFormData({...formData, [field.key]: e.target.value})} 
                           placeholder={field.placeholder}
                           className="w-full px-4 py-2.5 bg-muted/10 border border-border rounded-sm text-sm outline-none focus:border-primary" 
                         />
                       )}
                    </div>
                  ))}
                </div>
                {formError && <p className="text-xs font-bold text-rose-500 uppercase tracking-widest flex items-center gap-2"><AlertTriangle size={14}/> {formError}</p>}
                <button type="submit" disabled={isSubmitting} className="w-full py-4 text-primary-foreground rounded-sm text-[11px] font-black uppercase tracking-widest transition-all hover:brightness-110 disabled:opacity-50" style={{ backgroundColor: 'var(--primary)' }}>
                  {isSubmitting ? "Orchestrating..." : editingId ? "Save Modifications" : "Commit Provisioning"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}

        {isBulkAdding && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-md z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }}
              className="w-full max-w-2xl bg-card rounded-sm shadow-2xl border border-border overflow-hidden"
            >
              <div className="px-8 py-6 border-b border-border bg-muted/10 flex justify-between items-center">
                <h3 className="text-lg font-bold text-foreground uppercase tracking-widest">CSV Batch Orchestration</h3>
                <button onClick={() => setIsBulkAdding(false)} className="p-2 text-muted-foreground hover:bg-muted rounded-sm"><X size={20} /></button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setIsSubmitting(true);
                const res = await addLookupItemsBulk(selectedCategory, bulkInput, role);
                if (res.success) {
                  setBulkInput("");
                  setIsBulkAdding(false);
                  await refreshData();
                } else {
                  setFormError(res.error || "Batch orchestration failure.");
                }
                setIsSubmitting(false);
              }} className="p-8 space-y-6">
                <div className="p-5 bg-primary/5 border border-primary/20 rounded-sm flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary animate-pulse">
                    <Zap size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest leading-relaxed">
                      Intelligence Core Active: Commas or Newlines separate individual items.
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-1">
                      {["INDUSTRY", "TIMEZONE", "CUSTOMER_TYPE", "PRIORITY"].includes(selectedCategory) 
                        ? "Example: Technology, Healthcare, Energy (Simple List)" 
                        : `Format: ${activeConfig.fields.map(f => f.label).join(", ")} (Structured CSV)`}
                    </p>
                  </div>
                </div>

                <textarea 
                  required rows={12} value={bulkInput} onChange={e => setBulkInput(e.target.value)}
                  placeholder={["INDUSTRY", "TIMEZONE", "CUSTOMER_TYPE", "PRIORITY"].includes(selectedCategory) 
                    ? "Paste names separated by commas or enters..." 
                    : "Paste CSV rows here..."}
                  className="w-full px-5 py-4 bg-muted/10 border border-border rounded-sm text-sm font-mono outline-none focus:border-primary resize-none custom-scrollbar"
                />

                <div className="grid grid-cols-2 gap-4">
                   <button type="button" onClick={() => setIsBulkAdding(false)} className="py-4 border border-border rounded-sm text-[10px] font-black uppercase tracking-widest hover:bg-muted transition-all">Abort</button>
                   <button type="submit" disabled={isSubmitting || !bulkInput.trim()} className="py-4 bg-foreground text-background rounded-sm text-[10px] font-black uppercase tracking-widest shadow-xl hover:opacity-90 disabled:opacity-50 transition-all">
                    {isSubmitting ? "Parsing Ecosystem..." : "Commence Batch Sync"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


export default function DictionariesPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Initializing Registry Ecosystem...</span>
        </div>
      </div>
    }>
      <MastersPageContent />
    </Suspense>
  );
}
