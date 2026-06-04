"use client";

import React, { useState } from "react";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronRight, 
  ChevronLeft, 
  Check,
  Type,
  Hash,
  Calendar,
  Clock,
  ChevronDown,
  List,
  CheckSquare,
  DollarSign,
  FileText,
  Variable,
  Info,
  Search,
  Settings,
  Shield,
  Layers,
  Sparkles,
  Zap,
  Building2,
  Database,
  User,
  Users,
  Briefcase,
  AlertTriangle,
  Globe,
  Tag,
  Monitor,
  Activity,
  ChevronUp,
  X,
  Target,
  GitBranch,
  Rocket,
  Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalculatedFieldBuilder } from "./CalculatedFieldBuilder";

interface QueueField {
  id: string;
  name: string;
  key: string;
  dataType: string;
  isMandatory: boolean;
  isSearchable: boolean;
  isEditable: boolean;
  defaultValue: string;
  section: string;
}

const FIELD_TYPES = [
  { name: "Text", icon: Type, type: "TEXT" },
  { name: "Number", icon: Hash, type: "NUMBER" },
  { name: "Date", icon: Calendar, type: "DATE" },
  { name: "Date & Time", icon: Clock, type: "DATETIME" },
  { name: "Dropdown", icon: ChevronDown, type: "DROPDOWN" },
  { name: "Multi Select", icon: List, type: "MULTISELECT" },
  { name: "Boolean", icon: CheckSquare, type: "BOOLEAN" },
  { name: "Currency", icon: DollarSign, type: "CURRENCY" },
  { name: "Attachment", icon: FileText, type: "FILE" },
  { name: "Long Text", icon: Type, type: "LONGTEXT" },
];

export function QueueBuilder({ onCancel, onSave }: { onCancel: () => void, onSave: (data: any) => void }) {
  const [step, setStep] = useState(1);
  const [fields, setFields] = useState<QueueField[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [basicInfo, setBasicInfo] = useState({
    name: "",
    displayName: "",
    description: ""
  });

  const handleDisplayNameChange = (val: string) => {
    setBasicInfo(prev => ({
      ...prev,
      displayName: val,
      name: val.toUpperCase().replace(/[^A-Z0-9\s]/g, "").replace(/\s+/g, "_")
    }));
  };

  const selectedField = fields.find(f => f.id === selectedFieldId);

  const steps = [
    { id: 1, name: "Basic Info", icon: Database },
    { id: 2, name: "Fields", icon: Layers },
    { id: 3, name: "Calculated Fields", icon: Variable },
    { id: 4, name: "SLA & Settings", icon: Monitor },
    { id: 5, name: "Compliance", icon: Shield },
    { id: 6, name: "Integration", icon: Globe },
    { id: 7, name: "Tags & Category", icon: Tag },
    { id: 8, name: "Review", icon: Check },
  ];

  const handleUpdateField = (id: string, updates: Partial<QueueField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const addField = (type: string) => {
    const newField: QueueField = {
      id: Math.random().toString(36).substr(2, 9),
      name: `New ${type} Field`,
      key: `field_${fields.length + 1}`,
      dataType: type,
      isMandatory: false,
      isSearchable: true,
      isEditable: true,
      defaultValue: "",
      section: "Default"
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
  };

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "Identity": true,
    "Processing": true,
    "Governance": true,
    "SLA": true,
    "Compliance": true,
    "Integration": true,
    "Status": true,
    "Tags": true,
    "Intelligence": true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const SectionHeader = ({ title, icon: Icon, section }: { title: string, icon: any, section: string }) => (
    <button 
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between p-5 bg-muted/40 hover:bg-muted/60 transition-all border-b border-border/60 group"
    >
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform shadow-sm">
          <Icon size={18} className="text-primary" />
        </div>
        <h3 className="text-sm font-black text-foreground uppercase tracking-widest">{title}</h3>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-6 h-6 rounded-full bg-background/40 flex items-center justify-center border border-border/20">
           {expandedSections[section] ? <ChevronUp size={14} className="text-primary" /> : <ChevronDown size={14} className="text-muted-foreground/40" />}
        </div>
      </div>
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col bg-background text-foreground animate-in fade-in duration-500 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-8 py-6 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-4">
           <div className="w-10 h-10 rounded-sm bg-primary/10 flex items-center justify-center border border-primary/20">
              <Plus size={20} className="text-primary" />
           </div>
           <h1 className="text-2xl font-black tracking-tight uppercase">Queue Builder</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onCancel} className="text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[10px]">Cancel</Button>
          <Button className="bg-primary hover:bg-primary/90 text-white px-6 rounded-xl font-bold shadow-lg shadow-primary/20 transition-all hover:scale-[1.02] uppercase tracking-widest text-[10px]">Save Draft</Button>
        </div>
      </div>

      {/* Stepper with Icons */}
      <div className="px-12 py-10 shrink-0 bg-primary/5 border-b border-border/10">
        <div className="flex items-center justify-between max-w-6xl mx-auto relative">
          <div className="absolute top-[22px] left-0 w-full h-[2px] bg-muted/20 -translate-y-1/2 z-0" />
          
          {steps.map((s) => (
            <div key={s.id} className="relative z-10 flex flex-col items-center gap-3 group cursor-pointer" onClick={() => setStep(s.id)}>
              <div className={cn(
                "w-11 h-11 rounded-sm flex items-center justify-center transition-all duration-500 border-2",
                step === s.id ? "bg-primary border-primary text-white shadow-[0_0_20px_rgba(var(--primary),0.3)] scale-110 -translate-y-1" : 
                step > s.id ? "bg-primary/10 border-primary/40 text-primary" : "bg-card border-border/40 text-muted-foreground/40 hover:border-primary/40"
              )}>
                {step > s.id ? <Check size={18} strokeWidth={3} /> : <s.icon size={18} strokeWidth={2.5} />}
              </div>
              <span className={cn(
                "text-[9px] font-black uppercase tracking-[0.15em] transition-all duration-300",
                step === s.id ? "text-primary opacity-100" : "text-muted-foreground/40 opacity-60 group-hover:text-foreground group-hover:opacity-100"
              )}>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex gap-6 p-8 bg-muted/10">
        
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2">
            <div className="max-w-7xl mx-auto">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 1. Queue Identity */}
                <div className="bg-card border border-border/60 shadow-2xl transition-all hover:shadow-primary/5 hover:border-primary/30 flex flex-col rounded-sm overflow-hidden">
                   <SectionHeader title="1. Queue Identity" icon={Activity} section="Identity" />
                   {expandedSections["Identity"] && (
                     <div className="p-8 space-y-8 animate-in slide-in-from-top-2 flex-1">
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                 <Monitor size={12} className="text-primary" />
                                 Display Name
                              </label>
                              <div className="group relative">
                                 <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                 <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                    The user-friendly name displayed across the Studio Dashboard and Monitoring screens.
                                 </div>
                              </div>
                           </div>
                           <Input 
                             value={basicInfo.displayName}
                             onChange={(e) => handleDisplayNameChange(e.target.value)}
                             placeholder="Enter friendly name..." 
                             className="h-12 rounded-sm border-border/40 focus:ring-primary/20 text-sm font-bold" 
                           />
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                 <Tag size={12} className="text-primary" />
                                 Queue Name (Unique)
                              </label>
                              <div className="group relative">
                                 <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                 <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                    The system-level identifier used for API calls and internal references. Cannot be changed after creation.
                                 </div>
                              </div>
                           </div>
                           <Input 
                             value={basicInfo.name}
                             onChange={(e) => setBasicInfo(prev => ({ ...prev, name: e.target.value.toUpperCase().replace(/\s+/g, "_") }))}
                             placeholder="ENTER UNIQUE IDENTIFIER..." 
                             className="h-12 rounded-sm border-border/40 focus:ring-primary/20 font-mono text-xs uppercase tracking-tighter" 
                           />
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                 <FileText size={12} className="text-primary" />
                                 Business Description
                              </label>
                              <div className="group relative">
                                 <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                 <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                    Provide context on the business process this queue supports and who the primary stakeholders are.
                                 </div>
                              </div>
                           </div>
                           <textarea 
                             value={basicInfo.description}
                             onChange={(e) => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
                             className="w-full min-h-[120px] rounded-sm border border-border/40 bg-transparent p-4 text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none" 
                             placeholder="Explain the business purpose..." 
                           />
                        </div>
                     </div>
                   )}
                </div>

                {/* 2. Queue Configuration */}
                <div className="bg-card border border-border/60 shadow-2xl transition-all hover:shadow-primary/5 hover:border-primary/30 flex flex-col rounded-sm overflow-hidden">
                   <SectionHeader title="2. Queue Configuration" icon={Settings} section="Processing" />
                   {expandedSections["Processing"] && (
                     <div className="p-8 space-y-8 animate-in slide-in-from-top-2 flex-1">
                        <div className="grid grid-cols-1 gap-5">
                           <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                    <Layers size={12} className="text-primary" />
                                    Queue Type
                                 </label>
                                 <div className="group relative">
                                    <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                       Transactional: Real-time processing. Batch: Periodic high-volume processing.
                                    </div>
                                 </div>
                              </div>
                              <select className="w-full h-12 bg-muted/20 border border-border/40 rounded-sm px-5 text-xs font-black uppercase appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                 <option>Transactional</option>
                                 <option>Batch Processing</option>
                              </select>
                           </div>
                           <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                    <GitBranch size={12} className="text-primary" />
                                    Processing Mode
                                 </label>
                                 <div className="group relative">
                                    <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                       FIFO (First-In-First-Out) is standard. Priority-based uses custom weights.
                                    </div>
                                 </div>
                              </div>
                              <select className="w-full h-12 bg-muted/20 border border-border/40 rounded-sm px-5 text-xs font-black uppercase appearance-none outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer">
                                 <option>FIFO</option>
                                 <option>LIFO</option>
                                 <option>Priority Based</option>
                              </select>
                           </div>
                        </div>
                        <div className="bg-primary/5 rounded-sm p-6 space-y-6 border border-primary/10">
                           <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                                    <Zap size={16} className="text-primary" />
                                 </div>
                                 <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                       <span className="text-xs font-black uppercase tracking-wider text-foreground/80">Auto Retry</span>
                                       <div className="group relative">
                                          <Info size={10} className="text-muted-foreground/40 cursor-help" />
                                          <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                             Automatically requeue items that fail due to transient system errors. Note: This operates at the transactional level.
                                          </div>
                                       </div>
                                    </div>
                                    <span className="text-[8px] font-black text-primary uppercase tracking-[0.1em] mt-0.5">Transactional Level Policy</span>
                                 </div>
                              </div>
                              <button className="w-11 h-6 rounded-full bg-primary relative border border-border/10">
                                 <div className="absolute top-1 left-6 w-4 h-4 rounded-full bg-white shadow-md" />
                              </button>
                           </div>
                           <div className="space-y-4 pt-6 border-t border-border/10">
                              <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                    <AlertTriangle size={12} className="text-primary" />
                                    Max Retry Attempts
                                 </label>
                                 <div className="flex items-center gap-3">
                                    <span className="text-xs font-black text-primary uppercase">3 Times</span>
                                    <div className="group relative">
                                       <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                       <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                          Maximum number of times the system will attempt to process a failed item before moving it to Dead Letter Queue.
                                       </div>
                                    </div>
                                 </div>
                              </div>
                              <input type="range" min="1" max="10" defaultValue="3" className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
                              <div className="flex justify-between px-1">
                                 <span className="text-[8px] font-bold text-muted-foreground/40">1</span>
                                 <span className="text-[8px] font-bold text-muted-foreground/40">5</span>
                                 <span className="text-[8px] font-bold text-muted-foreground/40">10</span>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </div>

                {/* 3. Queue Intelligence / Explanation */}
                <div className="bg-card border border-border/60 shadow-2xl transition-all hover:shadow-primary/5 hover:border-primary/30 flex flex-col rounded-sm overflow-hidden">
                   <SectionHeader title="3. Queue Intelligence" icon={Sparkles} section="Intelligence" />
                   {expandedSections["Intelligence"] && (
                     <div className="p-8 space-y-8 animate-in slide-in-from-top-2 flex-1 overflow-y-auto custom-scrollbar">
                        <div className="space-y-6">
                           <div className="space-y-3">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                 <Layers size={12} />
                                 Queue Type Nuances
                              </h4>
                              <div className="space-y-4">
                                 <div className="p-4 bg-muted/20 border border-border/10 rounded-sm space-y-2">
                                    <span className="text-[10px] font-black uppercase text-foreground">Transactional</span>
                                    <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                                       Designed for <span className="text-primary">Real-Time</span> operations. Items are processed immediately as they arrive.
                                       <br/>
                                       <span className="text-foreground/40 ">Example: Real-time fraud detection, customer chat routing.</span>
                                    </p>
                                 </div>
                                 <div className="p-4 bg-muted/20 border border-border/10 rounded-sm space-y-2">
                                    <span className="text-[10px] font-black uppercase text-foreground">Batch Processing</span>
                                    <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                                       Optimized for <span className="text-primary">High-Volume</span> throughput. Items are grouped and processed in scheduled intervals.
                                       <br/>
                                       <span className="text-foreground/40 ">Example: End-of-day billing, bulk document migration.</span>
                                    </p>
                                 </div>
                              </div>
                           </div>

                           <div className="space-y-3">
                              <h4 className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                 <GitBranch size={12} />
                                 Processing Mode Impact
                              </h4>
                              <div className="space-y-3">
                                 <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-sm">
                                    <div className="mt-1 w-2 h-2 rounded-full bg-primary" />
                                    <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                                       <span className="text-foreground uppercase">FIFO:</span> Guarantees chronological integrity. Items are processed in exact order of arrival.
                                    </p>
                                 </div>
                                 <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-sm">
                                    <div className="mt-1 w-2 h-2 rounded-full bg-primary" />
                                    <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                                       <span className="text-foreground uppercase">LIFO:</span> Last-In-First-Out. The most recent items are processed first. Ideal for stack-based workflows or "hot-data" prioritization.
                                    </p>
                                 </div>
                                 <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/10 rounded-sm">
                                    <div className="mt-1 w-2 h-2 rounded-full bg-primary" />
                                    <p className="text-[10px] text-muted-foreground font-bold leading-relaxed">
                                       <span className="text-foreground uppercase">Priority:</span> Dynamic re-ordering based on business urgency. High-priority items jump to the front.
                                    </p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Fields Builder */}
        {step === 2 && (
          <div className="flex-1 flex gap-6 animate-in slide-in-from-bottom-6 duration-700 overflow-hidden">
            {/* Left: Field Types */}
            <div className="w-72 shrink-0 flex flex-col gap-5 overflow-hidden">
              <div className="bg-card/40 backdrop-blur-xl border border-border/40 rounded-sm p-6 flex flex-col gap-4 shadow-2xl h-full overflow-hidden">
                <div className="flex items-center gap-3 px-1 mb-2">
                   <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Target size={14} className="text-primary" />
                   </div>
                   <h3 className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Available Types</h3>
                </div>
                <div className="flex-1 grid grid-cols-1 gap-2 overflow-y-auto custom-scrollbar pr-1">
                  {FIELD_TYPES.map((t) => (
                    <button 
                      key={t.type}
                      onClick={() => addField(t.name)}
                      className="flex items-center justify-between p-4 rounded-sm hover:bg-primary/10 border border-transparent hover:border-primary/20 transition-all group text-left"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-9 h-9 rounded-xl bg-primary/5 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <t.icon size={16} className="text-primary/40 group-hover:text-primary" strokeWidth={2.5} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-tight text-foreground/60 group-hover:text-foreground">{t.name}</span>
                      </div>
                      <Plus size={14} className="text-muted-foreground/20 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Center: Fields Canvas */}
            <div className="flex-1 min-w-0 bg-card/40 border border-border/40 rounded-sm shadow-sm flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-500">
              <div className="px-10 py-5 border-b border-border/10 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border/20 flex items-center justify-center shadow-sm">
                     <Layers size={18} className="text-foreground/60" />
                  </div>
                  <div className="flex flex-col">
                    <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Queue Schema</h3>
                    <p className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Define the data structure for this entity</p>
                  </div>
                </div>
                <div className="px-5 py-2 bg-foreground text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">
                  {fields.length} Fields Defined
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <table className="w-full border-collapse">
                  <thead className="bg-muted/80 sticky top-0 z-10 backdrop-blur-md">
                    <tr className="border-b border-border/50 text-[9px] font-black uppercase tracking-[0.2em] text-foreground">
                      <th className="w-16 py-4 pl-10 text-left font-extrabold">POS</th>
                      <th className="py-4 text-left font-extrabold">Label & Key</th>
                      <th className="py-4 text-left font-extrabold">Structure</th>
                      <th className="py-4 text-center font-extrabold">Status</th>
                      <th className="w-32 py-4 pr-10 text-right font-extrabold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fields.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-20 text-center">
                           <div className="flex flex-col items-center gap-4 opacity-20">
                              <Layers size={48} strokeWidth={1} />
                              <p className="text-[10px] font-black uppercase tracking-widest">No fields defined yet</p>
                           </div>
                        </td>
                      </tr>
                    ) : (
                      fields.map((field, idx) => (
                        <tr 
                          key={field.id}
                          onClick={() => setSelectedFieldId(field.id)}
                          className={cn(
                            "group transition-all cursor-pointer border-b border-border/10 last:border-0",
                            selectedFieldId === field.id ? "bg-muted/30 border-l-[4px] border-l-foreground" : "hover:bg-muted/30 border-l-[4px] border-l-transparent"
                          )}
                        >
                          <td className="py-5 pl-10">
                             <div className="flex items-center gap-4">
                               <GripVertical size={16} className="text-foreground/10 group-hover:text-foreground/40 transition-colors" />
                               <span className="text-xs font-black text-foreground/40">{idx + 1}</span>
                             </div>
                          </td>
                          <td className="py-5">
                             <div className="flex flex-col gap-0.5">
                               <span className="text-sm font-bold text-foreground/80 group-hover:text-primary transition-colors tracking-tight">{field.name}</span>
                               <span className="text-[10px] font-mono text-foreground/30 uppercase tracking-tighter">{field.key}</span>
                             </div>
                          </td>
                          <td className="py-5">
                             <div className="flex items-center gap-3">
                               <div className="w-9 h-9 rounded-lg bg-background border border-border/20 flex items-center justify-center shadow-sm">
                                 {React.createElement(FIELD_TYPES.find(t => t.name === field.dataType)?.icon || Info, { size: 14, className: "text-foreground/60" })}
                               </div>
                               <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/50">{field.dataType}</span>
                             </div>
                          </td>
                          <td className="py-5 text-center">
                             {field.isMandatory ? (
                               <span className="px-3 py-1 bg-background border border-border/40 text-foreground/80 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm">Mandatory</span>
                             ) : (
                               <span className="px-3 py-1 text-foreground/30 rounded-lg text-[9px] font-black uppercase tracking-widest border border-border/10">Optional</span>
                             )}
                          </td>
                          <td className="py-5 pr-10">
                             <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                               <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-black/5">
                                 <Settings size={14} className="text-foreground/40" />
                               </Button>
                               <Button 
                                 variant="ghost" 
                                 size="icon" 
                                 className="h-8 w-8 rounded-full hover:bg-black/5"
                                 onClick={(e) => {
                                   e.stopPropagation();
                                   setFields(fields.filter(f => f.id !== field.id));
                                 }}
                               >
                                 <Trash2 size={14} className="text-foreground/40" />
                               </Button>
                             </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right: Field Properties */}
            <div className="w-80 shrink-0 bg-card border border-border/60 shadow-2xl flex flex-col rounded-sm p-8 gap-8 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between pb-5 border-b border-border/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border/20 flex items-center justify-center shadow-sm">
                    <Zap size={18} className="text-foreground/60" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Properties</h3>
                </div>
              </div>

               {selectedField ? (
                 <div className="space-y-8">
                   <div className="space-y-3">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                           <FileText size={12} className="text-primary" />
                           Label
                        </label>
                        <div className="group relative">
                           <Info size={12} className="text-muted-foreground/40 cursor-help" />
                           <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                              The human-readable name for this field in the transaction grid and forms.
                           </div>
                        </div>
                     </div>
                     <Input 
                       value={selectedField.name} 
                       onChange={(e) => handleUpdateField(selectedField.id, { name: e.target.value })}
                       className="h-12 rounded-sm bg-muted/20 border-border/40 text-sm font-bold"
                     />
                   </div>
                   <div className="space-y-3">
                     <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 ml-1 flex items-center gap-2">
                           <Database size={12} className="text-primary" />
                           Database Key
                        </label>
                        <div className="group relative">
                           <Info size={12} className="text-muted-foreground/40 cursor-help" />
                           <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                              The internal JSON key used to store this value. Must be unique within the schema.
                           </div>
                        </div>
                     </div>
                     <Input 
                       value={selectedField.key} 
                       onChange={(e) => handleUpdateField(selectedField.id, { key: e.target.value })}
                       className="h-12 rounded-sm bg-muted/40 border-border/20 font-mono text-xs text-muted-foreground uppercase"
                     />
                   </div>
                   <div className="bg-primary/5 rounded-sm p-5 space-y-5 border border-primary/10">
                     {[
                       { key: "isMandatory", label: "Mandatory", icon: Shield, desc: "Require a value before the transaction can be submitted." },
                       { key: "isSearchable", label: "Searchable", icon: Search, desc: "Include this field in the transaction grid search and filters." },
                       { key: "isEditable", label: "Editable", icon: Zap, desc: "Allow users to modify this value after the transaction is created." }
                     ].map(flag => (
                       <div key={flag.key} className="flex items-center justify-between group">
                         <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-xl bg-background border border-border/10 flex items-center justify-center">
                               {React.createElement(flag.icon, { size: 14, className: "text-primary" })}
                            </div>
                            <div className="flex flex-col">
                               <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-foreground/70">{flag.label}</span>
                                  <div className="group relative">
                                     <Info size={10} className="text-muted-foreground/40 cursor-help" />
                                     <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                        {flag.desc}
                                     </div>
                                  </div>
                               </div>
                            </div>
                         </div>
                         <button 
                           onClick={() => handleUpdateField(selectedField.id, { [flag.key]: !((selectedField as any)[flag.key]) })}
                           className={cn(
                             "w-11 h-6 rounded-full transition-all relative border border-border/10",
                             (selectedField as any)[flag.key] ? "bg-primary" : "bg-muted-foreground/20"
                           )}
                         >
                           <div className={cn(
                             "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md",
                             (selectedField as any)[flag.key] ? "left-6" : "left-1"
                           )} />
                         </button>
                       </div>
                     ))}
                   </div>
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col items-center justify-center text-center p-10 border-4 border-dashed border-border/10 rounded-sm">
                    <Info size={40} className="text-muted-foreground/10 mb-5" strokeWidth={1} />
                    <p className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-[0.2em] leading-loose">Select a field to<br/>view properties</p>
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Step 3: Calculated Fields */}
        {step === 3 && (
          <div className="flex-1 overflow-hidden p-2 animate-in slide-in-from-bottom-6 duration-700">
            <CalculatedFieldBuilder />
          </div>
        )}

        {/* Step 4: SLA & Settings */}
        {step === 4 && (
          <div className="flex-1 max-w-5xl mx-auto w-full overflow-y-auto custom-scrollbar pr-2 space-y-8 animate-in slide-in-from-bottom-6 duration-700 pb-20">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
                <div className="bg-card border border-border/60 shadow-2xl transition-all hover:shadow-primary/5 hover:border-primary/30 flex flex-col rounded-sm overflow-hidden">
                   <SectionHeader title="Ownership & Governance" icon={Users} section="Governance" />
                   {expandedSections["Governance"] && (
                     <div className="p-10 space-y-6 animate-in slide-in-from-top-2 flex-1">
                        <div className="grid grid-cols-2 gap-5">
                           <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                    <User size={12} className="text-primary" />
                                    Owner
                                 </label>
                                 <div className="group relative">
                                    <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                       The primary user or group responsible for managing this queue's configuration.
                                    </div>
                                 </div>
                              </div>
                              <Input placeholder="Search users..." className="h-12 rounded-sm pl-10" />
                           </div>
                           <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                    <Building2 size={12} className="text-primary" />
                                    Support Group
                                 </label>
                                 <div className="group relative">
                                    <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                       The IT or Operations group assigned to handle processing failures and escalations.
                                    </div>
                                 </div>
                              </div>
                              <Input placeholder="e.g. IT_SUPPORT" className="h-12 rounded-sm" />
                           </div>
                        </div>
                     </div>
                   )}
                </div>
                <div className="bg-card border border-border/60 shadow-2xl transition-all hover:shadow-primary/5 hover:border-primary/30 flex flex-col rounded-sm overflow-hidden">
                   <SectionHeader title="SLA & Operational Rules" icon={AlertTriangle} section="SLA" />
                   {expandedSections["SLA"] && (
                     <div className="p-10 space-y-8 animate-in slide-in-from-top-2 flex-1">
                        <div className="space-y-4">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                 <Activity size={12} className="text-primary" />
                                 Base Priority
                              </label>
                              <div className="group relative">
                                 <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                 <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                    The default importance level assigned to new items in this queue.
                                 </div>
                              </div>
                           </div>
                           <div className="flex items-center gap-3">
                              {["Low", "Medium", "High", "Critical"].map(p => (
                                <button key={p} className={cn(
                                  "flex-1 h-12 rounded-sm text-[10px] font-black uppercase tracking-widest border transition-all",
                                  p === "Medium" ? "bg-primary text-white border-primary shadow-xl shadow-primary/20" : "bg-muted/10 text-muted-foreground border-transparent hover:bg-muted/20"
                                )}>{p}</button>
                              ))}
                           </div>
                        </div>
                     </div>
                   )}
                </div>
                <div className="bg-card border border-border/60 shadow-2xl transition-all hover:shadow-primary/5 hover:border-primary/30 flex flex-col md:col-span-2 rounded-sm overflow-hidden">
                   <SectionHeader title="Lifecycle Status" icon={Monitor} section="Status" />
                   {expandedSections["Status"] && (
                     <div className="p-10 space-y-6 animate-in slide-in-from-top-2">
                        <div className="flex items-center gap-10">
                           <div className="flex-1 space-y-3">
                              <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                    <Rocket size={12} className="text-primary" />
                                    Initial Deployment State
                                 </label>
                                 <div className="group relative">
                                    <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                    <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                       Active: Immediately available for items. Draft: Configuration only, no processing.
                                    </div>
                                 </div>
                              </div>
                              <div className="flex gap-4">
                                 <Button className="flex-1 h-14 rounded-sm text-[11px] font-black bg-emerald-500 hover:bg-emerald-600 text-white uppercase tracking-widest shadow-lg shadow-emerald-500/20">Active</Button>
                                 <Button variant="outline" className="flex-1 h-14 rounded-sm text-[11px] font-black uppercase tracking-widest border-border/40">Draft Mode</Button>
                              </div>
                           </div>
                           <div className="w-48 space-y-3">
                              <div className="flex items-center justify-between">
                                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                    <GitBranch size={12} className="text-primary" />
                                    Version
                                 </label>
                              </div>
                              <div className="h-14 px-6 bg-muted/20 border border-border/40 rounded-sm flex items-center justify-center text-sm font-black text-primary/60 tracking-tighter">
                                 v0.0.1
                              </div>
                           </div>
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </div>
        )}

        {/* Step 5: Compliance */}
        {step === 5 && (
          <div className="flex-1 max-w-2xl mx-auto w-full animate-in slide-in-from-bottom-6 duration-700">
             <div className="bg-card border border-border/60 shadow-2xl transition-all hover:shadow-primary/5 hover:border-primary/30 flex flex-col rounded-sm overflow-hidden">
                <SectionHeader title="Governance & Compliance" icon={Shield} section="Compliance" />
                {expandedSections["Compliance"] && (
                  <div className="p-10 space-y-8 animate-in slide-in-from-top-2">
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                              <Lock size={12} className="text-primary" />
                              Data Sensitivity Level
                           </label>
                           <div className="group relative">
                              <Info size={12} className="text-muted-foreground/40 cursor-help" />
                              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                 Classify the data to apply appropriate security and access controls.
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                           {["Internal", "Confidential", "Restricted", "Public"].map(lv => (
                             <button key={lv} className={cn(
                               "h-14 rounded-sm text-[10px] font-black uppercase tracking-widest border transition-all flex items-center justify-center gap-3",
                               lv === "Confidential" ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-muted/10 text-muted-foreground border-transparent hover:bg-muted/20"
                             )}>
                               {lv === "Confidential" && <Shield size={12} />}
                               {lv}
                             </button>
                           ))}
                        </div>
                     </div>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                              <FileText size={12} className="text-primary" />
                              Retention Policy Reference
                           </label>
                           <div className="group relative">
                              <Info size={12} className="text-muted-foreground/40 cursor-help" />
                              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                 Link this queue to a corporate data retention schedule (e.g. 7 years for financial records).
                              </div>
                           </div>
                        </div>
                        <div className="relative">
                           <Input placeholder="e.g. RET-FIN-2024" className="h-14 rounded-sm pl-12" />
                           <FileText size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/30" />
                        </div>
                     </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Step 6: Integration */}
        {step === 6 && (
          <div className="flex-1 max-w-2xl mx-auto w-full animate-in slide-in-from-bottom-6 duration-700">
             <div className="bg-card border border-border/60 shadow-2xl transition-all hover:shadow-primary/5 hover:border-primary/30 flex flex-col rounded-sm overflow-hidden">
                <SectionHeader title="System Integration" icon={Globe} section="Integration" />
                {expandedSections["Integration"] && (
                  <div className="p-10 space-y-8 animate-in slide-in-from-top-2">
                     <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                 <Layers size={12} className="text-primary" />
                                 Source System
                              </label>
                              <div className="group relative">
                                 <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                 <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                    The upstream application that generates the data for this queue.
                                 </div>
                              </div>
                           </div>
                           <Input placeholder="e.g. SAP S/4HANA" className="h-14 rounded-sm" />
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                 <Target size={12} className="text-primary" />
                                 Target System
                              </label>
                              <div className="group relative">
                                 <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                 <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                    The downstream application where processed data will be delivered.
                                 </div>
                              </div>
                           </div>
                           <Input placeholder="e.g. Oracle ERP" className="h-14 rounded-sm" />
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                              <Zap size={12} className="text-primary" />
                              Processing Triggers
                           </label>
                           <div className="group relative">
                              <Info size={12} className="text-muted-foreground/40 cursor-help" />
                              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                 Define how processing is initiated. API Driven: External push. Event Driven: Real-time hooks.
                              </div>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                           {["Manual", "API Driven", "Scheduled", "Event Driven"].map(t => (
                             <button key={t} className="h-14 bg-muted/10 rounded-sm text-[10px] font-black uppercase tracking-widest text-muted-foreground border border-transparent hover:border-primary/20 hover:text-primary transition-all">{t}</button>
                           ))}
                        </div>
                     </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Step 7: Tags & Category */}
        {step === 7 && (
          <div className="flex-1 max-w-3xl mx-auto w-full animate-in slide-in-from-bottom-6 duration-700">
             <div className="bg-card border border-border/60 shadow-2xl transition-all hover:shadow-primary/5 hover:border-primary/30 flex flex-col rounded-sm overflow-hidden">
                <SectionHeader title="Categorization & Metadata" icon={Tag} section="Tags" />
                {expandedSections["Tags"] && (
                  <div className="p-10 space-y-8 animate-in slide-in-from-top-2 flex-1">
                     <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                 <Briefcase size={12} className="text-primary" />
                                 Process Category
                              </label>
                              <div className="group relative">
                                 <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                 <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                    Classify this queue within a business process domain for reporting and analytics.
                                 </div>
                              </div>
                           </div>
                           <Input placeholder="e.g. Order-to-Cash" className="h-14 rounded-sm" />
                        </div>
                        <div className="space-y-3">
                           <div className="flex items-center justify-between">
                              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                                 <Monitor size={12} className="text-primary" />
                                 Automation Strategy
                              </label>
                              <div className="group relative">
                                 <Info size={12} className="text-muted-foreground/40 cursor-help" />
                                 <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                    Attended: Human-in-the-loop. Unattended: Fully automated. Hybrid: Mixed processing.
                                 </div>
                              </div>
                           </div>
                           <div className="flex gap-2">
                              {["Attended", "Unattended", "Hybrid"].map(type => (
                                <button key={type} className="flex-1 h-12 rounded-sm text-[9px] font-black uppercase tracking-widest bg-muted/10 text-muted-foreground hover:bg-primary/5 hover:text-primary border border-transparent hover:border-primary/20 transition-all">{type}</button>
                              ))}
                           </div>
                        </div>
                     </div>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1 flex items-center gap-2">
                              <Sparkles size={12} className="text-primary" />
                              Metadata Tags
                           </label>
                           <div className="group relative">
                              <Info size={12} className="text-muted-foreground/40 cursor-help" />
                              <div className="absolute bottom-full right-0 mb-2 w-48 p-2 bg-popover text-[9px] text-popover-foreground rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-border/40 font-bold uppercase tracking-widest leading-loose">
                                 Add searchable keywords to help organize and discover this queue later.
                              </div>
                           </div>
                        </div>
                        <div className="flex flex-wrap gap-3 p-5 bg-muted/5 border border-border/10 rounded-sm min-h-[80px]">
                           {/* Tag list placeholder */}
                           <input placeholder="Add new tag..." className="flex-1 bg-transparent border-none text-[10px] font-bold uppercase tracking-widest outline-none ml-2 min-w-[120px]" />
                        </div>
                     </div>
                  </div>
                )}
             </div>
          </div>
        )}

        {/* Step 8: Review */}
        {step === 8 && (
          <div className="flex-1 max-w-4xl mx-auto w-full animate-in zoom-in-95 duration-700">
             <div className="bg-card border border-border/60 rounded-sm p-16 shadow-2xl flex flex-col items-center text-center space-y-10 border-t-8 border-t-primary overflow-hidden">
                <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center border-4 border-primary/20 shadow-inner">
                   <Check size={56} className="text-primary" strokeWidth={3} />
                </div>
                <div className="space-y-5">
                   <h2 className="text-4xl font-black tracking-tight text-foreground/90 uppercase tracking-tighter">Configuration Validated</h2>
                   <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-loose font-medium">
                      All governance protocols, schema structures, and operational parameters have been successfully mapped. Your processing container is optimized for deployment.
                   </p>
                </div>
                <div className="w-full grid grid-cols-4 gap-4 pt-10">
                   {[
                     { label: "Governance", icon: Users },
                     { label: "Compliance", icon: Shield },
                     { label: "Security", icon: Lock },
                     { label: "Integration", icon: Globe }
                   ].map(cat => (
                     <div key={cat.label} className="p-6 bg-card border border-border/10 rounded-sm space-y-4 hover:shadow-xl hover:scale-105 transition-all">
                        <cat.icon size={28} className="text-primary mx-auto" strokeWidth={2} />
                        <span className="block text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">{cat.label}</span>
                        <div className="flex items-center justify-center gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                           <span className="text-[10px] font-black text-emerald-500 uppercase">Verified</span>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Builder Footer */}
      <div className="h-28 border-t border-border/40 bg-card/40 backdrop-blur-xl px-16 flex items-center justify-between shrink-0 shadow-[0_-15px_50px_rgba(0,0,0,0.1)]">
        <Button 
          variant="ghost" 
          onClick={() => step > 1 ? setStep(prev => prev - 1) : onCancel()}
          className="h-14 px-10 rounded-sm gap-3 text-muted-foreground hover:text-foreground font-black uppercase tracking-widest text-[11px] border border-transparent hover:border-border/40 transition-all"
        >
          {step === 1 ? <><X size={16} /> Cancel Build</> : <><ChevronLeft size={16} /> Back</>}
        </Button>

        <div className="flex items-center gap-16">
          <div className="flex items-center gap-4 px-8 py-3 bg-muted/10 rounded-full border border-border/5">
            {steps.map((s) => (
              <div key={s.id} className={cn("w-2 h-2 rounded-full transition-all duration-700", step === s.id ? "bg-primary w-10 shadow-[0_0_15px_rgba(var(--primary),0.6)]" : "bg-muted-foreground/10")} />
            ))}
          </div>
          <Button 
            onClick={() => setStep(prev => Math.min(8, prev + 1))}
            className="h-16 px-16 rounded-sm gap-4 bg-primary text-white font-black uppercase tracking-widest text-[12px] shadow-[0_10px_40px_rgba(var(--primary),0.4)] hover:scale-[1.05] hover:shadow-primary/50 active:scale-[0.95] transition-all"
          >
            {step === 8 ? "Initiate Creation" : "Continue Build"}
            <ChevronRight size={20} />
          </Button>
        </div>
      </div>
    </div>
  );
}
