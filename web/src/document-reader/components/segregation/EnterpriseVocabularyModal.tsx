"use client";

import React, { useState, useMemo } from "react";
import { 
  X, Tag, Search, Plus, Trash2, Check, ArrowRight, Sparkles, 
  HelpCircle, ChevronRight, Layers, History, AlertTriangle, 
  Database, Play, Upload, Shield, RefreshCw, FileText, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";

interface Mapping {
  id: string;
  scopeType: "Platform" | "Customer" | "Tenant" | "Folder" | "Project";
  scopeName: string;
  localName: string;
  standardType: string;
  confidence: number;
  source: "Manual" | "AI Learned" | "Imported";
  status: "Active" | "Inactive" | "Pending";
  priority: number;
}

interface AISuggestion {
  id: string;
  localName: string;
  suggestedType: string;
  confidence: number;
  reason: string;
}

interface HistoryItem {
  version: string;
  localName: string;
  oldValue: string;
  newValue: string;
  changedBy: string;
  changedAt: string;
}

interface EnterpriseVocabularyModalProps {
  onClose: () => void;
  documentClasses: { classId: string; name: string }[];
}

export function EnterpriseVocabularyModal({ onClose, documentClasses }: EnterpriseVocabularyModalProps) {
  // 1. Initial State Setup
  const [selectedScope, setSelectedScope] = useState<string>("Tenant");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"simulation" | "impact" | "help">("simulation");
  
  // Standard Platforms Types mapping from the documentClasses prop
  const platformStandards = useMemo(() => {
    if (documentClasses && documentClasses.length > 0) {
      return documentClasses.map(c => c.name);
    }
    return ["Invoice", "Medical Claim", "Passport", "Tax Form 1040"];
  }, [documentClasses]);

  // Initial Mappings
  const [mappings, setMappings] = useState<Mapping[]>([
    {
      id: "map-1",
      scopeType: "Platform",
      scopeName: "Global System",
      localName: "Billing Advice",
      standardType: "Invoice / Billing Statement",
      confidence: 98,
      source: "AI Learned",
      status: "Active",
      priority: 100
    },
    {
      id: "map-2",
      scopeType: "Customer",
      scopeName: "Acme Corp (Enterprise)",
      localName: "AP Memo",
      standardType: "Invoice / Billing Statement",
      confidence: 94,
      source: "Manual",
      status: "Active",
      priority: 80
    },
    {
      id: "map-3",
      scopeType: "Tenant",
      scopeName: "Acme US Division",
      localName: "Supplier Bill",
      standardType: "Invoice / Billing Statement",
      confidence: 96,
      source: "AI Learned",
      status: "Active",
      priority: 60
    },
    {
      id: "map-4",
      scopeType: "Folder",
      scopeName: "Accounting Dept",
      localName: "Vendor Statement",
      standardType: "Invoice / Billing Statement",
      confidence: 92,
      source: "Imported",
      status: "Active",
      priority: 40
    },
    {
      id: "map-5",
      scopeType: "Project",
      scopeName: "Q1 Processing",
      localName: "Claim Form",
      standardType: "Medical Claim Form",
      confidence: 95,
      source: "Manual",
      status: "Active",
      priority: 20
    }
  ]);

  // AI Suggestions State
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([
    {
      id: "sug-1",
      localName: "Vendor Billing",
      suggestedType: "Invoice / Billing Statement",
      confidence: 92,
      reason: "Matched OCR keywords: 'total due', 'vat reg', 'remittance address'"
    },
    {
      id: "sug-2",
      localName: "Medical Invoice",
      suggestedType: "Medical Claim Form",
      confidence: 89,
      reason: "High similarity score to patient-care templates and insurance claims"
    },
    {
      id: "sug-3",
      localName: "IRS Statement",
      suggestedType: "Tax Form 1040",
      confidence: 95,
      reason: "Matched exact regex signature matching Form 1040 Section 2"
    }
  ]);

  // History State
  const [history, setHistory] = useState<HistoryItem[]>([
    {
      version: "v3",
      localName: "Supplier Bill",
      oldValue: "Pending",
      newValue: "Invoice / Billing Statement (Active)",
      changedBy: "AI Learned Engine",
      changedAt: "10 mins ago"
    },
    {
      version: "v2",
      localName: "AP Memo",
      oldValue: "Draft",
      newValue: "Invoice / Billing Statement (Active)",
      changedBy: "Admin Ratheesh",
      changedAt: "2 hours ago"
    },
    {
      version: "v1",
      localName: "Billing Advice",
      oldValue: "None",
      newValue: "Invoice / Billing Statement (Active)",
      changedBy: "System Hydrator",
      changedAt: "1 day ago"
    }
  ]);

  // Form states for creating new mapping
  const [newLocalName, setNewLocalName] = useState("");
  const [newStandardType, setNewStandardType] = useState(platformStandards[0] || "");
  const [newScopeType, setNewScopeType] = useState<Mapping["scopeType"]>("Tenant");

  // Simulation input
  const [simInput, setSimInput] = useState("");
  const [simResult, setSimResult] = useState<any>(null);

  // 2. Action Handlers
  const handleCreateMapping = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocalName.trim()) {
      toast.error("Please enter a Customer Document Name");
      return;
    }

    const scopeNames = {
      Platform: "Global System",
      Customer: "Acme Corp (Enterprise)",
      Tenant: "Acme US Division",
      Folder: "Accounting Dept",
      Project: "Q1 Processing"
    };

    const priorities = {
      Platform: 100,
      Customer: 80,
      Tenant: 60,
      Folder: 40,
      Project: 20
    };

    const isDuplicate = mappings.some(
      m => m.localName.toLowerCase() === newLocalName.trim().toLowerCase() && m.scopeType === newScopeType
    );

    if (isDuplicate) {
      toast.warning(`An override mapping for "${newLocalName}" at the ${newScopeType} level already exists!`);
      return;
    }

    const newMapping: Mapping = {
      id: `map-${Date.now()}`,
      scopeType: newScopeType,
      scopeName: scopeNames[newScopeType],
      localName: newLocalName.trim(),
      standardType: newStandardType,
      confidence: 100,
      source: "Manual",
      status: "Active",
      priority: priorities[newScopeType]
    };

    setMappings([newMapping, ...mappings]);
    setHistory([
      {
        version: `v${history.length + 1}`,
        localName: newMapping.localName,
        oldValue: "None",
        newValue: `${newMapping.standardType} (Active)`,
        changedBy: "Admin Ratheesh",
        changedAt: "Just now"
      },
      ...history
    ]);

    setNewLocalName("");
    toast.success(`Created mapping: ${newMapping.localName} ➔ ${newMapping.standardType}`);
  };

  const handleDeleteMapping = (id: string) => {
    const item = mappings.find(m => m.id === id);
    if (!item) return;

    setMappings(mappings.filter(m => m.id !== id));
    setHistory([
      {
        version: `v${history.length + 1}`,
        localName: item.localName,
        oldValue: `${item.standardType} (Active)`,
        newValue: "Deleted",
        changedBy: "Admin Ratheesh",
        changedAt: "Just now"
      },
      ...history
    ]);
    toast.success(`Removed mapping for "${item.localName}"`);
  };

  const handleApproveSuggestion = (sug: AISuggestion) => {
    const scopeNames = {
      Platform: "Global System",
      Customer: "Acme Corp (Enterprise)",
      Tenant: "Acme US Division",
      Folder: "Accounting Dept",
      Project: "Q1 Processing"
    };

    const newMapping: Mapping = {
      id: `map-${Date.now()}`,
      scopeType: "Tenant",
      scopeName: scopeNames["Tenant"],
      localName: sug.localName,
      standardType: sug.suggestedType,
      confidence: sug.confidence,
      source: "AI Learned",
      status: "Active",
      priority: 60
    };

    setMappings([newMapping, ...mappings]);
    setAiSuggestions(aiSuggestions.filter(s => s.id !== sug.id));
    setHistory([
      {
        version: `v${history.length + 1}`,
        localName: sug.localName,
        oldValue: "AI Pending",
        newValue: `${sug.suggestedType} (Approved)`,
        changedBy: "Admin Approved",
        changedAt: "Just now"
      },
      ...history
    ]);
    toast.success(`Approved AI Suggestion: "${sug.localName}" mapped to platform Standard`);
  };

  const handleRejectSuggestion = (id: string) => {
    const sug = aiSuggestions.find(s => s.id === id);
    setAiSuggestions(aiSuggestions.filter(s => s.id !== id));
    toast.info(`Rejected suggestion for "${sug?.localName}"`);
  };

  const handleToggleStatus = (id: string) => {
    setMappings(mappings.map(m => {
      if (m.id === id) {
        const nextStatus = m.status === "Active" ? "Inactive" : "Active";
        toast.info(`Set "${m.localName}" mapping to ${nextStatus}`);
        return { ...m, status: nextStatus };
      }
      return m;
    }));
  };

  // Bulk CSV Upload Simulation
  const handleCSVImport = () => {
    const mockMappings: Mapping[] = [
      {
        id: `map-csv-1`,
        scopeType: "Tenant",
        scopeName: "Acme US Division",
        localName: "Supplier Invoice",
        standardType: "Invoice / Billing Statement",
        confidence: 100,
        source: "Imported",
        status: "Active",
        priority: 60
      },
      {
        id: `map-csv-2`,
        scopeType: "Tenant",
        scopeName: "Acme US Division",
        localName: "Vendor Bill",
        standardType: "Invoice / Billing Statement",
        confidence: 100,
        source: "Imported",
        status: "Active",
        priority: 60
      },
      {
        id: `map-csv-3`,
        scopeType: "Tenant",
        scopeName: "Acme US Division",
        localName: "Tax Return",
        standardType: "Tax Form 1040",
        confidence: 98,
        source: "Imported",
        status: "Active",
        priority: 60
      }
    ];

    setMappings([...mockMappings, ...mappings]);
    toast.success("Successfully imported 3 vocabulary mappings from CSV!");
  };

  // Mapping Simulation Resolver Simulation
  const runSimulation = () => {
    if (!simInput.trim()) {
      toast.error("Please enter a document terminology to test");
      return;
    }

    const matched = mappings.find(
      m => m.localName.toLowerCase() === simInput.trim().toLowerCase() && m.status === "Active"
    );

    if (matched) {
      setSimResult({
        localName: simInput.trim(),
        standardType: matched.standardType,
        scopeType: matched.scopeType,
        scopeName: matched.scopeName,
        priority: matched.priority,
        model: matched.standardType.includes("Invoice") 
          ? "Invoice Intelligence Parser v4.2" 
          : matched.standardType.includes("Claim") 
          ? "Claim Medical Analyzer v2.0" 
          : "Tax Form Extraction Engine v1.5",
        reason: `Matched exact Customer override alias configured at the ${matched.scopeType} level (${matched.scopeName}) with priority weight of ${matched.priority}.`
      });
    } else {
      // Fuzzy / Substring match simulator
      const fuzzyMatch = platformStandards.find(
        std => std.toLowerCase().includes(simInput.trim().toLowerCase()) || 
               simInput.trim().toLowerCase().includes(std.split(" ")[0].toLowerCase())
      );

      if (fuzzyMatch) {
        setSimResult({
          localName: simInput.trim(),
          standardType: fuzzyMatch,
          scopeType: "System Core",
          scopeName: "OCR Fuzzy Matcher",
          priority: 999,
          model: fuzzyMatch.includes("Invoice") 
            ? "Invoice Intelligence Parser v4.2" 
            : fuzzyMatch.includes("Claim") 
            ? "Claim Medical Analyzer v2.0" 
            : "Tax Form Extraction Engine v1.5",
          reason: `No custom vocabulary override was found. Standardized via semantic matching similarity to Platform Standard.`
        });
      } else {
        setSimResult({
          localName: simInput.trim(),
          standardType: "General Document / General OCR",
          scopeType: "Default System Router",
          scopeName: "Fallback Handler",
          priority: 9999,
          model: "General OCR Routing Model v1.0",
          reason: `No custom alias or Platform Standard matched. Routing to fallback unstructured general OCR model.`
        });
      }
    }
    toast.success("Simulation resolution completed!");
  };

  // Filtered mappings list
  const filteredMappings = useMemo(() => {
    return mappings.filter(m => {
      const matchesScope = selectedScope === "All" || m.scopeType === selectedScope;
      const matchesSearch = m.localName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.standardType.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            m.source.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesScope && matchesSearch;
    });
  }, [mappings, selectedScope, searchQuery]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-zinc-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-[1400px] h-[85vh] bg-card border border-border rounded-3xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-350">
        
        {/* PREMIUM MODAL HEADER */}
        <div className="px-8 py-5 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-inner shadow-primary/10">
              <Layers size={22} className="animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
                Enterprise Vocabulary Mapping 
                <span className="text-[9px] font-black tracking-normal px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 uppercase border border-emerald-500/20">
                  Standardized Document DNA
                </span>
              </h2>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 opacity-80">
                Standardize customer-specific document names into reusable platform standard types.
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {/* WORKSPACE LAYOUT GRID */}
        <div className="flex-1 grid grid-cols-[260px_1fr_400px] min-h-0 overflow-hidden bg-background">
          
          {/* COLUMN 1: SCOPE HIERARCHY TREE */}
          <div className="border-r border-border p-5 flex flex-col gap-4 bg-muted/10 overflow-y-auto custom-scrollbar shrink-0">
            <div>
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] block mb-3 px-1">
                Inheritance Tree
              </span>
              
              <div className="space-y-1">
                {[
                  { id: "All", label: "🌐 All Scopes", desc: "View all override levels" },
                  { id: "Platform", label: "⚙️ Platform Level", desc: "Global system defaults" },
                  { id: "Customer", label: "🏢 Customer Level", desc: "Acme Corp Enterprise" },
                  { id: "Tenant", label: "🏬 Tenant Level", desc: "Acme US Division" },
                  { id: "Folder", label: "📁 Folder Level", desc: "Accounting Dept" },
                  { id: "Project", label: "📦 Project Level", desc: "Q1 Processing" }
                ].map((scope) => (
                  <button
                    key={scope.id}
                    onClick={() => setSelectedScope(scope.id)}
                    className={`w-full p-2.5 rounded-xl border text-left transition-all flex flex-col ${
                      selectedScope === scope.id 
                        ? "border-primary bg-primary/5 text-primary shadow-sm" 
                        : "border-transparent text-foreground/70 hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-[11px] font-black uppercase tracking-tight">{scope.label}</span>
                    <span className={`text-[8px] mt-0.5 ${selectedScope === scope.id ? "text-primary/70" : "text-muted-foreground"}`}>{scope.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* PIPELINE VISUALIZATION IN TREE SIDEBAR */}
            <div className="mt-auto border-t border-border/60 pt-4 space-y-3">
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.2em] block px-1">
                Pipeline Stage
              </span>
              <div className="p-3 bg-card border border-border rounded-xl space-y-1.5 text-[9px] font-bold uppercase text-foreground/80">
                <div className="flex items-center gap-1.5 text-muted-foreground opacity-60">
                  <Database size={10} /> 1. Intake
                </div>
                <div className="text-muted-foreground/60 pl-3">↓</div>
                <div className="flex items-center gap-1.5 text-muted-foreground opacity-60">
                  <Play size={10} /> 2. Segregation
                </div>
                <div className="text-muted-foreground/60 pl-3">↓</div>
                <div className="flex items-center gap-1.5 text-primary font-black bg-primary/5 p-1 rounded border border-primary/20">
                  <Tag size={10} /> 3. Type Resolution
                </div>
                <div className="text-primary pl-3">↓</div>
                <div className="flex items-center gap-1.5 pl-3 text-emerald-500 font-black">
                  <CheckCircle2 size={10} /> Customer Mapping
                </div>
                <div className="text-primary pl-3">↓</div>
                <div className="flex items-center gap-1.5 pl-3 text-emerald-500 font-black">
                  <Layers size={10} /> Canonical standard
                </div>
                <div className="text-muted-foreground/60 pl-3">↓</div>
                <div className="flex items-center gap-1.5 text-muted-foreground opacity-60">
                  <Shield size={10} /> 4. Router ➔ Extract
                </div>
              </div>
            </div>
          </div>

          {/* COLUMN 2: CENTER MAPPING GRID */}
          <div className="p-6 flex flex-col gap-5 min-h-0 overflow-hidden">
            
            {/* SEARCH AND QUICK BULK ACTIONS */}
            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              <div className="relative flex-1 w-full">
                <Search size={14} className="absolute left-3.5 top-3.5 text-muted-foreground" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer name, platform standard, or scope..."
                  className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <button 
                onClick={handleCSVImport}
                className="w-full sm:w-auto h-10 px-4 rounded-xl border border-dashed border-border hover:border-primary/50 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 bg-card hover:bg-muted/10 transition-all shrink-0"
              >
                <Upload size={13} className="text-primary" />
                Bulk CSV Import
              </button>
            </div>

            {/* MAPPING ENTRIES GRID */}
            <div className="flex-1 overflow-y-auto border border-border rounded-2xl bg-card flex flex-col min-h-0 custom-scrollbar">
              <div className="grid grid-cols-[140px_1fr_1fr_80px_100px_90px_60px] gap-4 p-4 border-b border-border bg-muted/20 text-[8px] font-black text-muted-foreground uppercase tracking-widest sticky top-0 z-10">
                <div>Scope Level</div>
                <div>Customer Name (Alias)</div>
                <div>Platform Standard</div>
                <div className="text-center">Confidence</div>
                <div>Source</div>
                <div>Status</div>
                <div className="text-center">Action</div>
              </div>

              {filteredMappings.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <Tag size={28} className="text-muted-foreground/30 mb-2" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">No override mappings found</p>
                  <p className="text-[9px] text-muted-foreground/60 uppercase tracking-tight mt-1">Try adjusting your tree filter scope or search query.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 overflow-y-auto">
                  {filteredMappings.map((m) => (
                    <div 
                      key={m.id}
                      className="grid grid-cols-[140px_1fr_1fr_80px_100px_90px_60px] gap-4 p-4 items-center text-xs hover:bg-muted/5 transition-all group"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-black uppercase tracking-wide text-primary">
                          {m.scopeType}
                        </span>
                        <span className="text-[7px] font-bold text-muted-foreground uppercase truncate block max-w-[120px]">
                          {m.scopeName}
                        </span>
                      </div>
                      
                      <div className="font-black text-foreground uppercase tracking-tight font-mono">
                        {m.localName}
                      </div>

                      <div>
                        <span className="px-2 py-1 rounded-lg bg-primary/5 text-primary text-[10px] font-black border border-primary/10 uppercase tracking-tight">
                          {m.standardType}
                        </span>
                      </div>

                      <div className="text-center font-bold text-foreground/80 font-mono">
                        {m.confidence}%
                      </div>

                      <div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                          m.source === "AI Learned" 
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10" 
                            : m.source === "Manual" 
                            ? "bg-primary/10 text-primary border border-primary/10"
                            : "bg-amber-500/10 text-amber-500 border border-amber-500/10"
                        }`}>
                          {m.source}
                        </span>
                      </div>

                      <div>
                        <button 
                          onClick={() => handleToggleStatus(m.id)}
                          className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase tracking-wider ${
                            m.status === "Active" 
                              ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/10" 
                              : "bg-zinc-500/5 text-zinc-500 border-zinc-500/20 hover:bg-zinc-500/10"
                          }`}
                        >
                          {m.status}
                        </button>
                      </div>

                      <div className="text-center">
                        <button 
                          onClick={() => handleDeleteMapping(m.id)}
                          className="w-7 h-7 rounded bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CREATE NEW MAPPING FORM */}
            <form onSubmit={handleCreateMapping} className="p-4 bg-muted/20 border border-border/80 rounded-2xl shrink-0 space-y-3">
              <div className="flex items-center gap-1.5">
                <Plus size={14} className="text-primary" />
                <span className="text-[9px] font-black text-foreground uppercase tracking-widest">
                  Create Vocabulary Override Alias
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-muted-foreground uppercase">Customer Name (Alias)</label>
                  <input 
                    type="text" 
                    value={newLocalName}
                    onChange={(e) => setNewLocalName(e.target.value)}
                    placeholder="e.g. Supplier Bill"
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-muted-foreground uppercase">Platform Standard Type</label>
                  <select 
                    value={newStandardType}
                    onChange={(e) => setNewStandardType(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-primary"
                  >
                    {platformStandards.map(std => (
                      <option key={std} value={std}>{std}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-muted-foreground uppercase">Inheritance Scope Level</label>
                  <select 
                    value={newScopeType}
                    onChange={(e) => setNewScopeType(e.target.value as any)}
                    className="w-full bg-card border border-border rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="Platform">⚙️ Platform System</option>
                    <option value="Customer">🏢 Customer Level</option>
                    <option value="Tenant">🏬 Tenant Override</option>
                    <option value="Folder">📁 Folder Override</option>
                    <option value="Project">📦 Project Override</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button 
                    type="submit"
                    className="w-full h-[34px] rounded-xl bg-primary hover:bg-primary/95 text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/15"
                  >
                    <Plus size={12} />
                    Register Alias
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* COLUMN 3: RIGHT PANEL WORKBENCH */}
          <div className="border-l border-border flex flex-col min-h-0 bg-muted/10 overflow-hidden">
            
            {/* RIGHT PANEL SWITCHER TABS */}
            <div className="flex p-2.5 bg-card border-b border-border shrink-0 gap-1">
              {[
                { id: "simulation", label: "🔬 Sandbox", icon: Play },
                { id: "impact", label: "📊 Impact & Logs", icon: History },
                { id: "help", label: "❓ Business Purpose", icon: HelpCircle }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 py-1.5 px-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${
                    activeTab === tab.id 
                      ? "bg-primary text-primary-foreground border-primary shadow" 
                      : "border-transparent hover:bg-muted text-muted-foreground"
                  }`}
                >
                  <tab.icon size={11} />
                  {tab.label.split(" ")[0]}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-5">
              {activeTab === "simulation" ? (
                <>
                  {/* SANDBOX SIMULATOR */}
                  <div className="p-4 bg-card border border-border rounded-2xl space-y-3.5 shadow-sm">
                    <div className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest border-b border-border/50 pb-2">
                      <Play size={12} />
                      Vocabulary Mapping Sandbox
                    </div>
                    
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tight leading-relaxed">
                      Enter local document variation name to simulate the Platform standard resolution pathway:
                    </p>

                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={simInput}
                        onChange={(e) => setSimInput(e.target.value)}
                        placeholder="e.g. AP Memo or Vendor Bill"
                        className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary"
                      />
                      <button 
                        onClick={runSimulation}
                        className="h-[34px] px-3 rounded-xl bg-primary hover:bg-primary/95 text-white text-[9px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all shadow"
                      >
                        <Play size={10} /> Test
                      </button>
                    </div>

                    {simResult && (
                      <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 text-xs animate-in fade-in duration-300">
                        <div className="flex items-center justify-between border-b border-border/40 pb-1.5">
                          <span className="text-[8px] font-black text-muted-foreground uppercase">Input Text:</span>
                          <span className="font-bold text-foreground font-mono">"{simResult.localName}"</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black text-muted-foreground uppercase">Resolved Standard Type:</span>
                          <span className="font-black text-primary uppercase">{simResult.standardType}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black text-muted-foreground uppercase">Routing Model Target:</span>
                          <span className="font-bold text-emerald-500 uppercase">{simResult.model}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black text-muted-foreground uppercase">Applied Scope:</span>
                          <span className="font-black text-amber-500 uppercase">{simResult.scopeType}</span>
                        </div>
                        <div className="pt-1.5 border-t border-border/40 text-[9px] leading-relaxed text-foreground/80 font-bold uppercase tracking-tight">
                          💡 <span className="font-normal text-muted-foreground">Reasoning:</span> {simResult.reason}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* AI SUGGESTIONS QUEUE */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                        AI Matches Suggestion Queue
                      </span>
                      <span className="text-[8px] font-black text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase animate-pulse">
                        {aiSuggestions.length} Pending
                      </span>
                    </div>

                    {aiSuggestions.length === 0 ? (
                      <div className="p-6 bg-card border border-border border-dashed rounded-2xl text-center">
                        <Sparkles size={20} className="text-muted-foreground/30 mx-auto mb-1.5" />
                        <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block opacity-55">AI suggestion queue clear</span>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {aiSuggestions.map(sug => (
                          <div key={sug.id} className="p-3.5 bg-card border border-border rounded-xl space-y-2.5 shadow-sm group">
                            <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                              <span className="text-xs font-black text-foreground font-mono">"{sug.localName}"</span>
                              <span className="text-[9px] font-black text-emerald-500 font-mono">{sug.confidence}% Conf.</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-black text-muted-foreground uppercase shrink-0">Standard Recommendation:</span>
                              <ArrowRight size={10} className="text-muted-foreground" />
                              <span className="px-2 py-0.5 bg-primary/5 text-primary text-[9px] font-black border border-primary/10 rounded uppercase truncate">
                                {sug.suggestedType}
                              </span>
                            </div>
                            <p className="text-[8px] font-bold text-muted-foreground/80 uppercase tracking-tight leading-relaxed">
                              🧠 {sug.reason}
                            </p>
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/40">
                              <button 
                                onClick={() => handleApproveSuggestion(sug)}
                                className="h-7 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 shadow"
                              >
                                Approve
                              </button>
                              <button 
                                onClick={() => handleRejectSuggestion(sug.id)}
                                className="h-7 rounded-lg bg-card hover:bg-muted border border-border text-muted-foreground text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : activeTab === "impact" ? (
                <>
                  {/* IMPACT ANALYSIS */}
                  <div className="p-4 bg-card border border-border rounded-2xl space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest border-b border-border/50 pb-2">
                      <Shield size={12} className="text-primary" />
                      Active Mapping Impact Analysis
                    </div>
                    <p className="text-[9px] text-muted-foreground uppercase font-black tracking-tight leading-relaxed">
                      Registering or editing these overrides dynamically propagates down standard models:
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 border border-border/60 bg-muted/40 rounded-xl text-center">
                        <span className="text-[8px] font-black text-muted-foreground uppercase block">Models Affected</span>
                        <span className="text-xs font-black text-primary block mt-1">4 Extraction</span>
                      </div>
                      <div className="p-2 border border-border/60 bg-muted/40 rounded-xl text-center">
                        <span className="text-[8px] font-black text-muted-foreground uppercase block">Workflows</span>
                        <span className="text-xs font-black text-primary block mt-1">12 Active</span>
                      </div>
                      <div className="p-2 border border-border/60 bg-muted/40 rounded-xl text-center">
                        <span className="text-[8px] font-black text-muted-foreground uppercase block">Checks</span>
                        <span className="text-xs font-black text-primary block mt-1">2 Rules</span>
                      </div>
                    </div>
                  </div>

                  {/* REVISION HISTORY LOG */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                        Mapping Version Log History
                      </span>
                      <History size={12} className="text-muted-foreground" />
                    </div>

                    <div className="space-y-2">
                      {history.map((hist, idx) => (
                        <div key={idx} className="p-3 bg-card border border-border rounded-xl text-[10px] space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-primary font-mono text-[9px]">{hist.version}</span>
                            <span className="text-[8px] font-bold text-muted-foreground font-mono">{hist.changedAt}</span>
                          </div>
                          <div className="font-bold text-foreground">
                            Alias: <span className="font-black font-mono">"{hist.localName}"</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground font-mono text-[9px]">
                            <span>{hist.oldValue}</span>
                            <ArrowRight size={8} />
                            <span className="text-foreground">{hist.newValue}</span>
                          </div>
                          <div className="text-[8px] font-black text-muted-foreground uppercase pt-1 border-t border-border/40">
                            Operator: <span className="text-foreground">{hist.changedBy}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* HELPFUL SYSTEM INTRODUCTION */}
                  <div className="p-4 bg-card border border-border rounded-2xl space-y-3 shadow-sm">
                    <div className="flex items-center gap-2 text-primary font-black text-[9px] uppercase tracking-widest border-b border-border/50 pb-2">
                      <HelpCircle size={12} className="text-primary animate-bounce" />
                      Why This Exists
                    </div>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight leading-relaxed">
                      Different business organizations use different names for standard templates.
                    </p>
                    <div className="p-3 bg-muted/40 border border-border rounded-xl space-y-2 text-[10px]">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-bold text-muted-foreground">Customer Term:</span>
                        <span className="font-black text-primary">"Billing Advice"</span>
                      </div>
                      <div className="flex items-center justify-between font-mono border-t border-border/40 pt-1.5">
                        <span className="font-bold text-muted-foreground">Platform Standard:</span>
                        <span className="font-black text-emerald-500">"Enterprise Invoice"</span>
                      </div>
                      <div className="flex items-center justify-between font-mono border-t border-border/40 pt-1.5">
                        <span className="font-bold text-muted-foreground">Executed Model:</span>
                        <span className="font-black text-amber-500">Invoice Parser v4.2</span>
                      </div>
                    </div>
                    <ul className="text-[8px] font-black text-muted-foreground uppercase space-y-1.5 tracking-wide pt-1 list-disc pl-3">
                      <li>Avoids training separate extraction models</li>
                      <li>Ensures unified enterprise analytics</li>
                      <li>Allows business users to keep custom names</li>
                    </ul>
                  </div>

                  {/* COMPARISON CHART */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block px-1">
                      Platform Impact Comparison
                    </span>
                    
                    <div className="grid grid-cols-1 gap-2.5 text-[9px] font-bold uppercase tracking-tight">
                      <div className="p-3 border border-rose-500/20 bg-rose-500/[0.02] rounded-xl space-y-1.5">
                        <span className="text-rose-500 font-black text-[9px] block">Without Vocabulary Mapping</span>
                        <div className="text-[8px] font-black text-muted-foreground space-y-1 list-none">
                          <li>• Duplicate extraction models required</li>
                          <li>• Inconsistent platform metrics</li>
                          <li>• Reduced AI classification accuracy</li>
                          <li>• Higher maintenance costs & duplicate workflows</li>
                        </div>
                      </div>

                      <div className="p-3 border border-emerald-500/20 bg-emerald-500/[0.02] rounded-xl space-y-1.5">
                        <span className="text-emerald-500 font-black text-[9px] block">With Vocabulary Mapping</span>
                        <div className="text-[8px] font-black text-muted-foreground space-y-1 list-none">
                          <li>• Highly reusable single Document Model</li>
                          <li>• Completely unified system analytics</li>
                          <li>• High predictive accuracy via context aliases</li>
                          <li>• Minimal training & maintenance costs</li>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

          </div>

        </div>

        {/* MODAL FOOTER */}
        <div className="px-8 py-5 border-t border-border bg-muted/20 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-primary" />
            <span className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">
              Standardization Matrix Policy Governance Active
            </span>
          </div>
          <button
            onClick={onClose}
            className="h-10 px-8 rounded-xl bg-card hover:bg-muted border border-border text-[10px] font-black uppercase tracking-widest transition-all"
          >
            Close Sandbox
          </button>
        </div>

      </div>
    </div>
  );
}
