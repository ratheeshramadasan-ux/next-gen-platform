"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { 
  Box, 
  Layout, 
  Type, 
  Square, 
  Table as TableIcon, 
  MousePointer2, 
  Plus, 
  Layers, 
  Settings2, 
  Database, 
  Zap, 
  Monitor, 
  Tablet, 
  Smartphone, 
  Play, 
  CloudUpload,
  ChevronRight,
  Activity,
  Search,
  Eye,
  Download,
  Settings,
  Grid3X3,
  FormInput,
  CheckSquare,
  ChevronDown,
  List,
  Image as ImageIcon,
  Link2,
  Calendar,
  Clock,
  User,
  ArrowRight,
  ChevronLeft,
  Briefcase,
  Headset,
  ShieldCheck,
  Wallet,
  HeartPulse,
  TrendingUp,
  ClipboardList,
  Mail,
  Bot,
  Sparkles,
  FileText,
  Home,
  LayoutTemplate,
  Files,
  Save,
  Loader2,
  Check,
  RotateCcw,
  Menu,
  MoreVertical,
  Trash2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Grid2X2,
  MinusCircle,
  PlusCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { MOCK_TABLES } from "../data-engine/DataEngine";
import { TEMPLATES, AppTemplate } from "./templates";
import { saveStudioWorkflow, getAppProjectAction } from "@/app/actions/tenantActions";
import { StudioDock } from "../StudioPanels";

/* ======================================================================
   TYPES & CONSTANTS
   ====================================================================== */

type DeviceMode = "desktop" | "tablet" | "mobile";
type InspectorTab = "properties" | "data" | "events";

interface CanvasElement {
  id: string;
  type: string;
  label: string;
  timestamp: string;
  x: number;
  y: number;
  w: number;
  h: number;
  parentId?: string;
  // New Business Framework Props
  infoBarStatus?: string[];
  businessHelp?: string;
  isLocked?: boolean;
  properties: Record<string, any>;
}

interface Page {
  id: string;
  name: string;
  elements: CanvasElement[];
  isHome: boolean;
}

interface ComponentDefinition {
  id: string;
  type: string;
  label: string;
  icon: any;
  category: "layout" | "form" | "data" | "action" | "dashboard";
  helpSummary?: string;
  propertiesExplanation?: string;
}

const COMPONENT_LIBRARY: ComponentDefinition[] = [
  // 1. PAGE COMPONENTS
  { 
    id: "container", type: "Container", label: "Container", icon: Box, category: "layout",
    helpSummary: "Groups related components together to keep the screen organized and clean.",
    propertiesExplanation: "Title: Label for the group; Layout: Vertical or Horizontal alignment; Background: Visual style."
  },
  { 
    id: "card", type: "Card", label: "Business Card", icon: Square, category: "layout",
    helpSummary: "A premium container for displaying a specific set of information, like a customer profile.",
    propertiesExplanation: "Elevation: Shadow depth; Padding: Space inside the card; Border: Stroke style."
  },
  
  // 2. INPUT COMPONENTS
  { 
    id: "input", type: "Input", label: "Text Input", icon: FormInput, category: "form",
    helpSummary: "Allows users to enter text information like names, numbers, or comments.",
    propertiesExplanation: "Field Label: Name shown to user; Placeholder: Help text inside; Required: Mandatory field."
  },
  { 
    id: "dropdown", type: "Dropdown", label: "Selection Dropdown", icon: ChevronDown, category: "form",
    helpSummary: "Use when users should select one or more options from a predefined list.",
    propertiesExplanation: "Data Source: Where list comes from; Display Field: Visible text; Multi-Select: Allow many values."
  },
  { 
    id: "datepicker", type: "DatePicker", label: "Business Date Picker", icon: Calendar, category: "form",
    helpSummary: "Capture dates with business calendar awareness (e.g., excluding weekends).",
    propertiesExplanation: "Format: Date display style; Min/Max: Allowed range; Fiscal Support: Fiscal period awareness."
  },
  
  // 3. DATA COMPONENTS
  { 
    id: "table", type: "Table", label: "Data Table", icon: TableIcon, category: "data",
    helpSummary: "Displays business records in a grid. Supports searching, filtering, and inline editing.",
    propertiesExplanation: "Source: Connected table; Enable Search: Toggle search bar; Page Size: Rows per page."
  },
  { 
    id: "datacard", type: "DataCard", label: "Summary Data Card", icon: LayoutTemplate, category: "data",
    helpSummary: "Shows a summarized view of a single business record (e.g., an approval summary).",
    propertiesExplanation: "Fields: Information to display; Icon: Visual indicator; Highlight Rules: Conditional colors."
  },
  
  // 4. ACTION COMPONENTS
  { 
    id: "button", type: "Button", label: "Action Button", icon: MousePointer2, category: "action",
    helpSummary: "Triggers actions like submitting forms, navigating pages, or starting automations.",
    propertiesExplanation: "Action Type: What happens on click; Style: Visual appearance; Confirmation: Safety prompt."
  },
  { 
    id: "approval", type: "ApprovalAction", label: "Approval Action", icon: ShieldCheck, category: "action",
    helpSummary: "Specialized for human decisions. Includes automated SLA and escalation tracking.",
    propertiesExplanation: "Approver: Person or Team; Due Time: SLA limit; Escalation: Next steps if delayed."
  },

  // 5. AUTOMATION COMPONENTS
  { 
    id: "bot-trigger", type: "BotTrigger", label: "Bot Trigger", icon: Zap, category: "action",
    helpSummary: "Launches an RPA workflow or bot with automatic input/output mapping.",
    propertiesExplanation: "Process: Automation to run; Mode: Background or Attended; Input Source: Data mapping."
  },
  { 
    id: "workflow-viewer", type: "WorkflowViewer", label: "Workflow Viewer", icon: Activity, category: "data",
    helpSummary: "Displays the live progress of a business process to keep users informed.",
    propertiesExplanation: "Workflow Source: Connected process; Style: Steps or Timeline; Refresh: Update frequency."
  },

  // 6. AI COMPONENTS
  { 
    id: "ai-assistant", type: "AIAssistant", label: "AI Assistant", icon: Bot, category: "dashboard",
    helpSummary: "Embedded conversational AI to help users complete tasks using natural language.",
    propertiesExplanation: "Model: AI Engine; Allowed Actions: What AI can do; Prompts: Quick-start suggestions."
  },
  { 
    id: "ai-summary", type: "AISummary", label: "AI Smart Summary", icon: Sparkles, category: "dashboard",
    helpSummary: "Automatically analyzes data and generates human-readable business summaries.",
    propertiesExplanation: "Source: Input data; Type: Brief or Detailed; Auto Refresh: Regenerate on change."
  },

  // 7. COMMUNICATION COMPONENTS
  { 
    id: "email", type: "Email", label: "Email Component", icon: Mail, category: "action",
    helpSummary: "Sends notifications with AI-generated content and automatic recipient detection.",
    propertiesExplanation: "Recipient: Target user; Subject: AI suggested subject; Template: Message layout."
  },
  { 
    id: "notification", type: "Notification", label: "Notification", icon: Zap, category: "action",
    helpSummary: "Shows alerts or success/error messages inside the application.",
    propertiesExplanation: "Type: Success/Error; Trigger: When to show; Duration: Visibility time."
  },

  // 8. VISUALIZATION COMPONENTS
  { 
    id: "kpi-card", type: "KPICard", label: "KPI Metric Card", icon: TrendingUp, category: "dashboard",
    helpSummary: "Displays key business metrics with real-time refresh and risk highlighting.",
    propertiesExplanation: "Metric: Data source; Format: Number or %; Thresholds: Color-coded risk rules."
  },
  { 
    id: "chart", type: "Chart", label: "Visual Analytics", icon: Activity, category: "dashboard",
    helpSummary: "Dynamic charts with AI-suggested visualizations based on your data patterns.",
    propertiesExplanation: "Chart Type: Bar/Pie/Line; Group By: Data aggregation; Period: Time filter."
  },

  // 9. FILE COMPONENTS
  { 
    id: "fileupload", type: "FileUpload", label: "File Upload", icon: CloudUpload, category: "form",
    helpSummary: "Upload documents with built-in OCR and AI-powered metadata extraction.",
    propertiesExplanation: "Types: Allowed formats; OCR: Auto-extract data; Storage: Destination folder."
  },
  { 
    id: "image", type: "Image", label: "Image Asset", icon: ImageIcon, category: "data",
    helpSummary: "Displays a static or dynamic image asset with support for multiple fitting modes.",
    propertiesExplanation: "Source: Image URL or Asset; Fit: How image fits container; Alt: Accessibility text."
  },

  // 10. NAVIGATION COMPONENTS
  { 
    id: "menu", type: "Menu", label: "App Menu", icon: List, category: "layout",
    helpSummary: "Main navigation for your application with automatic role-based visibility.",
    propertiesExplanation: "Style: Sidebar or Top; Source: Linked pages; Access: Role visibility."
  }
];

const ICON_LIBRARY = [
  { id: "user", icon: User, label: "User" },
  { id: "mail", icon: Mail, label: "Email" },
  { id: "call", icon: Headset, label: "Call" },
  { id: "database", icon: Database, label: "Database" },
  { id: "zap", icon: Zap, label: "Automation" },
  { id: "shield", icon: ShieldCheck, label: "Security" },
  { id: "wallet", icon: Wallet, label: "Finance" },
  { id: "heart", icon: HeartPulse, label: "Health" },
  { id: "chart", icon: TrendingUp, label: "Growth" },
  { id: "bot", icon: Bot, label: "AI Bot" },
  { id: "sparkles", icon: Sparkles, label: "Magic" },
  { id: "file", icon: FileText, label: "Document" },
  { id: "clock", icon: Clock, label: "Time" },
  { id: "calendar", icon: Calendar, label: "Event" },
  { id: "link", icon: Link2, label: "Link" },
  { id: "image", icon: ImageIcon, label: "Image" },
  { id: "briefcase", icon: Briefcase, label: "Work" },
  { id: "clipboard", icon: ClipboardList, label: "Tasks" }
];

/* ======================================================================
   UTILITY COMPONENTS
   ====================================================================== */

function DataField({ label, value, status }: { label: string, value: string, status?: "success" | "warning" }) {
  return (
    <div className="space-y-1.5 group">
       <label className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/30 ml-1 group-hover:text-primary/40 transition-colors">{label}</label>
       <div className={cn(
          "bg-muted/5 border border-border/20 rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-between group-hover:border-primary/20 transition-all shadow-sm",
          status === "success" && "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
       )}>
          <span>{value}</span>
          <Database size={12} className="opacity-10 group-hover:opacity-40 transition-opacity" />
       </div>
    </div>
  );
}

function SimpleChart({ data, color = "primary" }: { data: number[], color?: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-1.5 h-16 w-full px-2">
       {data.map((val, i) => (
         <motion.div 
           key={i}
           initial={{ height: 0 }}
           animate={{ height: `${(val / max) * 100}%` }}
           transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
           className={cn(
             "flex-1 rounded-t-sm transition-all",
             color === "primary" ? "bg-primary/40 hover:bg-primary/60" : "bg-emerald-500/40 hover:bg-emerald-500/60"
           )}
         />
       ))}
    </div>
  );
}

function StatCard({ label, value, sub }: any) {
  return (
    <div className="p-4 bg-background border border-border/40 rounded-xl space-y-1 hover:border-primary/20 transition-all cursor-default group">
       <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 group-hover:text-primary/40 transition-colors">{label}</p>
       <p className="text-sm font-black text-foreground/80">{value}</p>
       <p className="text-[8px] font-bold text-emerald-500 uppercase">{sub}</p>
    </div>
  );
}

function ActivityItem({ type, date, title }: any) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl hover:bg-background transition-all border border-transparent hover:border-border/40 group cursor-pointer">
       <div className="w-8 h-8 rounded-lg bg-muted/10 flex items-center justify-center shrink-0 border border-border/10 group-hover:border-primary/20 transition-all">
          {type === "Email" && <Mail size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />}
          {type === "Call" && <Headset size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />}
          {type === "Portal" && <User size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />}
       </div>
       <div className="space-y-1">
          <div className="flex items-center gap-2">
             <span className="text-[10px] font-black text-primary/60 uppercase tracking-widest">{type}</span>
             <span className="text-[9px] text-muted-foreground/30 font-medium">{date}</span>
          </div>
          <p className="text-[11px] font-bold leading-tight line-clamp-1">{title}</p>
       </div>
    </div>
  );
}

function StepItem({ number, title, status }: any) {
  return (
    <div className="flex items-center gap-4 group">
       <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border",
          status === "complete" && "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
          status === "active" && "bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-110",
          status === "pending" && "bg-muted/10 border-border/40 text-muted-foreground/40"
       )}>
          {status === "complete" ? <CheckSquare size={14} /> : number}
       </div>
       <span className={cn(
          "text-[10px] font-black uppercase tracking-widest transition-colors",
          status === "active" ? "text-primary" : "text-muted-foreground/40"
       )}>
          {title}
       </span>
    </div>
  );
}

function ElementRenderer({ type, label, properties = {} }: { type: string, label: string, properties?: any }) {
   const style: React.CSSProperties = {
      backgroundColor: properties.background,
      opacity: properties.opacity !== undefined ? properties.opacity / 100 : undefined,
      borderColor: properties.borderColor,
      borderWidth: properties.borderWidth ? `${properties.borderWidth}px` : undefined,
      borderStyle: properties.borderStyle || (properties.borderColor ? "solid" : undefined),
      borderRadius: properties.radius,
      filter: properties.blur ? `blur(${properties.blur}px)` : undefined,
      fontSize: properties.fontSize ? `${properties.fontSize}px` : undefined,
      fontWeight: properties.fontWeight?.toLowerCase(),
      textAlign: properties.textAlign as any,
      boxShadow: properties.shadow === "Small" ? "0 1px 2px 0 rgb(0 0 0 / 0.05)" :
                 properties.shadow === "Medium" ? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" :
                 properties.shadow === "Large" ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" :
                 properties.shadow === "Inner" ? "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)" : undefined,
   };

   if (type === "DataCard") {
      return (
         <div style={style} className="h-full bg-card border border-border/40 rounded-2xl p-6 space-y-4 shadow-xl shadow-black/5 group hover:border-primary/40 transition-all overflow-hidden">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <LayoutTemplate size={24} />
               </div>
               <div>
                  <h4 className="text-xs font-black uppercase tracking-widest text-foreground/80">{label}</h4>
                  <p className="text-[10px] text-muted-foreground/40 font-medium">Record Summary View</p>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
               <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-muted-foreground/30 tracking-widest">Identifier</span>
                  <p className="text-[10px] font-bold">REC-99201</p>
               </div>
               <div className="space-y-1">
                  <span className="text-[8px] font-black uppercase text-muted-foreground/30 tracking-widest">Status</span>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[8px] font-black">ACTIVE</span>
               </div>
            </div>
         </div>
      );
   }
   if (type === "ApprovalAction") {
      return (
         <div style={style} className="h-full bg-amber-500/5 border-2 border-dashed border-amber-500/20 rounded-2xl p-6 flex flex-col items-center justify-center space-y-4 group hover:border-amber-500/40 transition-all overflow-hidden">
            <ShieldCheck size={32} className="text-amber-500/40 group-hover:text-amber-500 transition-colors" />
            <div className="text-center">
               <span className="text-xs font-black uppercase tracking-widest text-amber-500">{label}</span>
               <p className="text-[10px] text-muted-foreground/40  mt-1">Requires Manager Decision</p>
            </div>
            <div className="flex gap-2 w-full">
               <Button className="flex-1 h-8 bg-emerald-500 text-white text-[9px] font-black uppercase rounded-lg">Approve</Button>
               <Button className="flex-1 h-8 bg-rose-500 text-white text-[9px] font-black uppercase rounded-lg">Reject</Button>
            </div>
         </div>
      );
   }
   if (type === "BotTrigger") {
      return (
         <div style={style} className="h-full bg-primary border border-primary/20 rounded-2xl p-6 flex items-center justify-between group hover:shadow-2xl hover:shadow-primary/20 transition-all cursor-pointer overflow-hidden relative">
            <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="space-y-1 relative z-10">
               <span className="text-[10px] font-black uppercase tracking-widest text-white/60">Automation</span>
               <p className="text-sm font-black text-white">{label}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white relative z-10">
               <Zap size={20} className="group-hover:scale-110 transition-transform" />
            </div>
         </div>
      );
   }
   if (type === "WorkflowViewer") {
      return (
         <div style={style} className="h-full bg-card border border-border/40 rounded-2xl p-6 space-y-6 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{label}</span>
               <div className="flex gap-1">
                  {[1,2,3].map(i => <div key={i} className={cn("w-1.5 h-1.5 rounded-full", i === 1 ? "bg-primary" : "bg-muted")} />)}
               </div>
            </div>
            <div className="space-y-4">
               {[1, 2].map(i => (
                  <div key={i} className="flex items-center gap-4 relative">
                     <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-black border", i === 1 ? "bg-primary text-white border-primary" : "bg-muted/10 border-border/40 text-muted-foreground/40")}>
                        {i === 1 ? <Check size={12} /> : i}
                     </div>
                     <span className={cn("text-[10px] font-bold uppercase tracking-widest", i === 1 ? "text-primary" : "text-muted-foreground/40")}>
                        {i === 1 ? "Process Started" : "Verification Pending"}
                     </span>
                     {i === 1 && <div className="absolute left-3 top-6 w-px h-4 bg-primary/20" />}
                  </div>
               ))}
            </div>
         </div>
      );
   }
   if (type === "AIAssistant") {
      return (
         <div style={style} className="h-full bg-gradient-to-br from-primary/10 to-purple-500/10 border-2 border-dashed border-primary/20 rounded-3xl p-6 flex flex-col items-center justify-center space-y-4 group hover:border-primary/40 transition-all overflow-hidden relative">
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:scale-150 transition-transform" />
            <Bot size={40} className="text-primary group-hover:animate-bounce" />
            <div className="text-center space-y-1">
               <span className="text-xs font-black uppercase tracking-widest bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">{label}</span>
               <p className="text-[10px] text-muted-foreground/60  font-medium">Ask me anything about your data</p>
            </div>
            <div className="w-full bg-background/40 border border-white/20 rounded-xl px-4 py-2 flex items-center gap-3">
               <Sparkles size={12} className="text-primary" />
               <span className="text-[10px] font-medium text-muted-foreground/40 ">Type a command...</span>
            </div>
         </div>
      );
   }
   if (type === "AISummary") {
      return (
         <div style={style} className="h-full bg-card border border-border/40 rounded-2xl p-6 space-y-4 shadow-xl shadow-black/5 group hover:border-primary/20 transition-all overflow-hidden relative">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-primary/60">{label}</span>
               <Sparkles size={14} className="text-primary animate-pulse" />
            </div>
            <div className="space-y-2">
               <div className="h-1.5 w-full bg-muted/10 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: "80%" }} className="h-full bg-primary/40" /></div>
               <div className="h-1.5 w-[60%] bg-muted/10 rounded-full overflow-hidden"><motion.div initial={{ width: 0 }} animate={{ width: "90%" }} transition={{ delay: 0.2 }} className="h-full bg-primary/20" /></div>
            </div>
            <p className="text-[11px] font-medium leading-relaxed  text-foreground/70">"Based on current trends, the processing speed has increased by 12% with zero errors in the last 24 hours."</p>
         </div>
      );
   }
   if (type === "Email") {
      return (
         <div style={style} className="h-full bg-muted/5 border border-border/40 rounded-2xl p-6 flex flex-col space-y-4 group hover:bg-background transition-all border-dashed hover:border-primary/20 overflow-hidden">
            <div className="flex items-center justify-between">
               <Mail size={20} className="text-muted-foreground/30 group-hover:text-primary transition-colors" />
               <span className="text-[8px] font-black uppercase text-muted-foreground/20 tracking-widest">Notification Engine</span>
            </div>
            <div className="space-y-1">
               <span className="text-[10px] font-black uppercase text-foreground/60">{label}</span>
               <p className="text-[9px] text-muted-foreground/40 font-medium">To: customer@example.com</p>
            </div>
            <div className="h-px bg-border/10" />
            <p className="text-[10px] font-medium text-muted-foreground/60 line-clamp-2">"Your application has been received and is currently being processed by our team..."</p>
         </div>
      );
   }
   if (type === "KPICard") {
      return (
         <div style={style} className="h-full bg-card border border-border/40 rounded-2xl p-6 space-y-2 shadow-sm group hover:border-primary/20 transition-all overflow-hidden">
            <div className="flex items-center justify-between">
               <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">{label}</span>
               <TrendingUp size={14} className="text-emerald-500/40 group-hover:text-emerald-500 transition-colors" />
            </div>
            <div className="flex items-baseline gap-2">
               <span className="text-3xl font-black tracking-tight text-foreground/80">84.2%</span>
               <span className="text-[10px] font-bold text-emerald-500">↑ 12%</span>
            </div>
            <p className="text-[9px] font-bold text-muted-foreground/20 uppercase tracking-widest">VS LAST PERIOD</p>
         </div>
      );
   }
   if (type === "Menu") {
      return (
         <div style={style} className="h-full bg-card border border-border/40 rounded-2xl flex flex-col overflow-hidden shadow-sm">
            <div className="p-4 border-b border-border/10 bg-muted/5 flex items-center gap-3">
               <Menu size={16} className="text-primary" />
               <span className="text-xs font-black uppercase tracking-widest text-foreground/80">{label}</span>
            </div>
            <div className="flex-1 flex flex-col p-2 gap-1">
               {["Overview", "Management", "Resources", "Settings"].map((item, i) => (
                  <div key={item} className={cn("flex items-center gap-3 p-2.5 rounded-xl transition-all cursor-pointer group", i === 0 ? "bg-primary text-white shadow-lg shadow-primary/10" : "hover:bg-primary/5 text-muted-foreground/60")}>
                     <div className={cn("w-1.5 h-1.5 rounded-full", i === 0 ? "bg-white" : "bg-muted-foreground/20 group-hover:bg-primary")} />
                     <span className="text-[10px] font-black uppercase tracking-widest">{item}</span>
                  </div>
               ))}
            </div>
         </div>
      );
   }
  if (type === "Table") {
     return (
        <div style={style} className="h-full bg-muted/5 border border-dashed border-border/40 rounded-xl flex flex-col items-center justify-center space-y-2 p-4 overflow-hidden">
           <TableIcon size={24} className="text-muted-foreground/10" />
           <span className="text-[10px] font-bold text-muted-foreground/40  text-center">Data Table: {label}</span>
        </div>
     );
  }
  if (type === "Chart") {
     return (
        <div style={style} className="h-full bg-primary/5 border border-dashed border-primary/20 rounded-xl flex flex-col items-center justify-center space-y-3 relative overflow-hidden p-4">
           <div className="absolute inset-0 opacity-[0.05] flex items-end gap-1 px-4">
              {[40, 70, 45, 90, 65, 80, 50, 30, 85].map((h, i) => (
                 <div key={i} style={{ height: `${h}%` }} className="flex-1 bg-primary rounded-t-sm" />
              ))}
           </div>
           <TrendingUp size={24} className="text-primary/20 transition-colors relative z-10" />
           <span className="text-[10px] font-black uppercase text-primary/40 tracking-widest relative z-10 text-center">{label}</span>
        </div>
     );
  }
  if (type === "Container" || type === "Card") {
     return (
        <div style={style} className={cn(
          "h-full border-2 border-dashed rounded-2xl flex flex-col p-4 overflow-hidden",
          type === "Card" ? "bg-card shadow-lg border-border/40" : "bg-muted/5 border-border/10"
        )}>
           <span className="text-[10px] font-black uppercase tracking-widest opacity-20">{label}</span>
        </div>
     );
  }
  if (type === "Button") {
     return (
        <Button style={style} className="w-full h-full rounded-xl bg-primary text-primary-foreground font-bold text-xs uppercase tracking-widest shadow-xl shadow-primary/20 overflow-hidden">{label}</Button>
     );
  }
  if (type === "HorizontalMenu") {
     return (
        <div style={style} className="h-full bg-card border border-border/40 rounded-xl flex items-center gap-6 px-6 shadow-sm overflow-hidden">
           {["Home", "Products", "Solutions", "About"].map(item => (
             <span key={item} className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 hover:text-primary transition-colors cursor-pointer">{item}</span>
           ))}
        </div>
     );
  }
  if (type === "VerticalMenu") {
     return (
        <div style={style} className="h-full bg-card border border-border/40 rounded-xl flex flex-col p-4 shadow-sm gap-2 overflow-hidden">
           {["Dashboard", "Analytics", "Customers", "Settings"].map(item => (
             <div key={item} className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 group transition-all cursor-pointer">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/20 group-hover:bg-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover:text-foreground">{item}</span>
             </div>
           ))}
        </div>
     );
  }
   if (type === "FileUpload") {
      return (
         <div style={style} className="h-full bg-muted/5 border-2 border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center space-y-3 p-6 group hover:border-primary/40 transition-all overflow-hidden">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
               <CloudUpload size={24} className="text-primary" />
            </div>
            <div className="text-center space-y-1">
               <span className="text-xs font-black uppercase tracking-widest text-foreground/80">{label}</span>
               <p className="text-[10px] text-muted-foreground/40 ">Drag & drop files or click to browse</p>
            </div>
         </div>
      );
   }
   if (type === "FileBrowser") {
      return (
         <div style={style} className="h-full bg-card border border-border/40 rounded-xl flex flex-col overflow-hidden shadow-sm">
            <div className="p-3 border-b border-border/10 bg-muted/5 flex items-center justify-between">
               <span className="text-[10px] font-black uppercase tracking-widest text-foreground/60">{label}</span>
               <Search size={12} className="text-muted-foreground/30" />
            </div>
            <div className="p-2 space-y-1">
               {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-primary/5 transition-all cursor-pointer group">
                     <FileText size={14} className="text-muted-foreground/40 group-hover:text-primary transition-colors" />
                     <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-foreground/80">document_0{i}.pdf</span>
                        <span className="text-[8px] text-muted-foreground/40 uppercase">2.4 MB • PDF</span>
                     </div>
                  </div>
               ))}
            </div>
         </div>
      );
   }
   if (type === "Image") {
      return (
         <div style={style} className="h-full border border-border/40 rounded-xl overflow-hidden group hover:border-primary/20 transition-all flex items-center justify-center bg-muted/5">
            {properties.src ? (
               <img 
                  src={properties.src} 
                  alt={label} 
                  className="w-full h-full" 
                  style={{ objectFit: properties.objectFit || "cover" }}
               />
            ) : (
               <div className="flex flex-col items-center gap-2 opacity-20">
                  <ImageIcon size={32} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">No Image Source</span>
               </div>
            )}
         </div>
      );
   }
   if (type === "PieChart") { return (<div style={style} className="h-full bg-card border border-border/40 rounded-xl flex items-center justify-center relative p-4 shadow-sm overflow-hidden"><div className="w-3/4 aspect-square rounded-full border-8 border-primary/20 relative"><div className="absolute inset-0 border-8 border-primary rounded-full" style={{ clipPath: "polygon(50% 50%, 100% 0, 100% 100%, 0 100%)" }} /></div><div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-[10px] font-black text-primary">74%</span></div><div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2"><div className="w-1.5 h-1.5 rounded-full bg-primary" /><div className="w-1.5 h-1.5 rounded-full bg-primary/20" /></div></div>); } if (type === "BarChart") { return (<div style={style} className="h-full bg-card border border-border/40 rounded-xl flex items-end gap-2 px-4 py-6 shadow-sm overflow-hidden">{[40, 70, 45, 90, 65, 80].map((h, i) => (<div key={i} style={{ height: `${h}%` }} className="flex-1 bg-primary/40 rounded-t-sm hover:bg-primary transition-all" />))}</div>); } if (type === "LineChart" || type === "AreaChart") { return (<div style={style} className="h-full bg-card border border-border/40 rounded-xl relative shadow-sm overflow-hidden p-4"><svg className="w-full h-full text-primary" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0 80 Q 25 20, 50 50 T 100 10" fill={type === "AreaChart" ? "currentColor" : "none"} fillOpacity="0.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg><div className="absolute top-4 right-4 flex items-center gap-2"><TrendingUp size={12} className="text-emerald-500" /><span className="text-[10px] font-bold text-emerald-500">+12.5%</span></div></div>); } if (type === "StatCard") { return (<div style={style} className="h-full bg-card border border-border/40 rounded-xl p-4 shadow-sm space-y-2 flex flex-col justify-center overflow-hidden"><span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">{label}</span><div className="flex items-end gap-2"><span className="text-2xl font-black text-foreground">24,402</span><span className="text-[10px] font-bold text-emerald-500 mb-1">↑ 8%</span></div></div>); } return (
      <div style={style} className="h-full space-y-2 p-2 overflow-hidden">
         <label className="text-[10px] font-bold text-muted-foreground/60">{label}</label>
         <div className="h-10 bg-muted/10 border border-border/20 rounded-xl px-4 flex items-center text-xs font-medium text-muted-foreground/40 ">
            Enter {label.toLowerCase()}...
         </div>
      </div>
   );
}

/* ======================================================================
   MAIN COMPONENT
   ====================================================================== */

export function AppDesigner({ projectId, onLoadProject }: { projectId?: string | null, onLoadProject?: (project: any) => void }) {
  const [zoom, setZoom] = useState(100);

  // Resolution-based auto-scaling
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 1200) setZoom(75);
      else if (width < 1440) setZoom(85);
      else if (width < 1600) setZoom(95);
      else setZoom(100);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [device, setDevice] = useState<DeviceMode>("desktop");
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const [activeInspectorTab, setActiveInspectorTab] = useState<InspectorTab>("properties");
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{ startX: number, startY: number, currentX: number, currentY: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeSidebar, setActiveSidebar] = useState<"components" | "templates" | "pages">("components");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, pageId: string } | null>(null);

  const [history, setHistory] = useState<Page[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const addToHistory = (newPages: Page[]) => {
    const cloned = JSON.parse(JSON.stringify(newPages));
    setHistory(prevHist => {
      const nextHist = prevHist.slice(0, historyIndex + 1);
      nextHist.push(cloned);
      if (nextHist.length > 50) nextHist.shift();
      setHistoryIndex(nextHist.length - 1);
      return nextHist;
    });
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prevPages = history[historyIndex - 1];
      const cloned = JSON.parse(JSON.stringify(prevPages));
      setPages(cloned);
      setHistoryIndex(historyIndex - 1);
      toast.info("Undo performed");
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextPages = history[historyIndex + 1];
      const cloned = JSON.parse(JSON.stringify(nextPages));
      setPages(cloned);
      setHistoryIndex(historyIndex + 1);
      toast.info("Redo performed");
    }
  };

  const deleteElement = (id: string) => {
    setPages(prev => {
      const nextPages = prev.map(p => {
        if (p.id !== activePageId) return p;
        
        const getDescendants = (parentId: string): string[] => {
          const directChildren = p.elements.filter(el => el.parentId === parentId);
          return directChildren.flatMap(child => [child.id, ...getDescendants(child.id)]);
        };
        
        const toDelete = [id, ...getDescendants(id)];
        return { ...p, elements: p.elements.filter(el => !toDelete.includes(el.id)) };
      });
      addToHistory(nextPages);
      return nextPages;
    });
    setSelectedElementIds(prev => prev.filter(sid => sid !== id));
    toast.success("Element deleted");
  };
  
  const alignSelectedElements = (direction: 'left' | 'right' | 'center' | 'top' | 'bottom' | 'middle') => {
     if (selectedElementIds.length < 2) return;
     
     const currentPage = pages.find(p => p.id === activePageId);
     if (!currentPage) return;
     
     const elementsToAlign = currentPage.elements.filter(el => selectedElementIds.includes(el.id));
     
     let minX = Math.min(...elementsToAlign.map(e => e.x));
     let maxX = Math.max(...elementsToAlign.map(e => e.x + e.w));
     let minY = Math.min(...elementsToAlign.map(e => e.y));
     let maxY = Math.max(...elementsToAlign.map(e => e.y + e.h));
     
     let centerX = minX + (maxX - minX) / 2;
     let centerY = minY + (maxY - minY) / 2;

     const newElements = currentPage.elements.map(el => {
        if (!selectedElementIds.includes(el.id)) return el;
        
        switch (direction) {
           case 'left': return { ...el, x: minX };
           case 'right': return { ...el, x: maxX - el.w };
           case 'center': return { ...el, x: centerX - el.w / 2 };
           case 'top': return { ...el, y: minY };
           case 'bottom': return { ...el, y: maxY - el.h };
           case 'middle': return { ...el, y: centerY - el.h / 2 };
           default: return el;
        }
     });

     const nextPages = pages.map(p => p.id === activePageId ? { ...p, elements: newElements } : p);
     setPages(nextPages);
     addToHistory(nextPages);
     toast.success(`Aligned elements to ${direction}`);
  };

  const distributeSelectedElements = (axis: 'horizontal' | 'vertical') => {
     if (selectedElementIds.length < 3) return;
     
     const currentPage = pages.find(p => p.id === activePageId);
     if (!currentPage) return;
     
     const elementsToDistribute = [...currentPage.elements]
       .filter(el => selectedElementIds.includes(el.id))
       .sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y);

     const first = elementsToDistribute[0];
     const last = elementsToDistribute[elementsToDistribute.length - 1];
     
     if (axis === 'horizontal') {
        const totalGap = (last.x) - (first.x + first.w);
        const internalWidths = elementsToDistribute.slice(1, -1).reduce((acc, el) => acc + el.w, 0);
        const spacing = (totalGap - internalWidths) / (elementsToDistribute.length - 1);
        
        let currentX = first.x;
        const newElements = currentPage.elements.map(el => {
           const idx = elementsToDistribute.findIndex(d => d.id === el.id);
           if (idx === -1) return el;
           if (idx === 0) { currentX = el.x + el.w + spacing; return el; }
           const updated = { ...el, x: currentX };
           currentX += el.w + spacing;
           return updated;
        });
        const nextPages = pages.map(p => p.id === activePageId ? { ...p, elements: newElements } : p);
        setPages(nextPages);
        addToHistory(nextPages);
     } else {
        const totalGap = (last.y) - (first.y + first.h);
        const internalHeights = elementsToDistribute.slice(1, -1).reduce((acc, el) => acc + el.h, 0);
        const spacing = (totalGap - internalHeights) / (elementsToDistribute.length - 1);
        
        let currentY = first.y;
        const newElements = currentPage.elements.map(el => {
           const idx = elementsToDistribute.findIndex(d => d.id === el.id);
           if (idx === -1) return el;
           if (idx === 0) { currentY = el.y + el.h + spacing; return el; }
           const updated = { ...el, y: currentY };
           currentY += el.h + spacing;
           return updated;
        });
        const nextPages = pages.map(p => p.id === activePageId ? { ...p, elements: newElements } : p);
        setPages(nextPages);
        addToHistory(nextPages);
     }
     toast.success(`Distributed elements ${axis}`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedElementIds.length > 0 && (e.key === "Delete" || e.key === "Backspace")) {
        if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "TEXTAREA") return;
        selectedElementIds.forEach(id => deleteElement(id));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementIds]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null);
    if (contextMenu) {
      window.addEventListener("click", handleClickOutside);
    }
    return () => window.removeEventListener("click", handleClickOutside);
  }, [contextMenu]);
  
  // Multi-page state
  const [pages, setPages] = useState<Page[]>([
    { id: "page-1", name: "App Workspace", elements: [], isHome: true }
  ]);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [activePageId, setActivePageId] = useState("page-1");
  const [variables, setVariables] = useState<any[]>([]);
  const [appArguments, setAppArguments] = useState<any[]>([]);
  
  const activePage = pages.find(p => p.id === activePageId) || pages[0];
  const canvasElements = activePage?.elements || [];
  const selectedElements = canvasElements.filter(el => selectedElementIds.includes(el.id));
  const selectedElement = selectedElements.length > 0 ? selectedElements[selectedElements.length - 1] : null;
  
  useEffect(() => {
    if (selectedElementIds.length > 0 && activeInspectorTab !== "properties") {
      setActiveInspectorTab("properties");
    }
  }, [selectedElementIds]);

  const handleAddPage = () => {
    const name = prompt("Enter Page Name:", "New Page");
    if (!name) return;
    
    const newPage = {
      id: `page-${pages.length + 1}`,
      name,
      elements: [],
      isHome: false
    };
    const newPages = [...pages, newPage];
    setPages(newPages);
    addToHistory(newPages);
    setActivePageId(newPage.id);
  };

  const handleSetMainPage = (pageId: string) => {
    const newPages = pages.map(p => ({
      ...p,
      isHome: p.id === pageId
    }));
    setPages(newPages);
    addToHistory(newPages);
    setContextMenu(null);
    toast.success(`"${newPages.find(p => p.id === pageId)?.name}" is now the main page`);
  };
  
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleDragStart = (e: React.DragEvent, component: ComponentDefinition) => {
    e.dataTransfer.setData("componentType", component.type);
    e.dataTransfer.setData("componentLabel", component.label);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const type = e.dataTransfer.getData("componentType");
    const label = e.dataTransfer.getData("componentLabel");

    if (type && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const dropX = e.clientX - rect.left;
      const dropY = e.clientY - rect.top;

      const currentPage = pages.find(p => p.id === activePageId);
      const parent = currentPage?.elements.findLast(el => 
        (el.type === "Container" || el.type === "Card") &&
        dropX >= el.x && dropX <= el.x + el.w &&
        dropY >= el.y && dropY <= el.y + el.h
      );

      const newElement: CanvasElement = {
        id: Math.random().toString(36).substr(2, 9),
        type,
        label,
        timestamp: new Date().toLocaleTimeString(),
        x: parent ? dropX - parent.x : dropX,
        y: parent ? dropY - parent.y : dropY,
        w: type === "Container" || type === "Card" || type === "Menu" ? 300 : 
           type === "Table" || type === "WorkflowViewer" || type === "Chart" ? 500 : 200,
        h: type === "Container" || type === "Card" ? 200 : 
           type === "Menu" || type === "Table" || type === "WorkflowViewer" || type === "Chart" ? 400 : 80,
        parentId: parent?.id,
        properties: {},
        infoBarStatus: ["Ready", "Managed by AI"]
      };
      
      const nextPages = pages.map(p => 
        p.id === activePageId 
          ? { ...p, elements: [...p.elements, newElement] }
          : p
      );
      setPages(nextPages);
      addToHistory(nextPages);
    }
  };

  const updateElementPosition = (id: string, x: number, y: number) => {
    setPages(prev => prev.map(p => 
      p.id === activePageId 
        ? { ...p, elements: p.elements.map(el => el.id === id ? { ...el, x, y } : el) }
        : p
    ));
  };

  const updateElementSize = (id: string, w: number, h: number) => {
    setPages(prev => prev.map(p => 
      p.id === activePageId 
        ? { ...p, elements: p.elements.map(el => el.id === id ? { ...el, w: Math.max(100, w), h: Math.max(40, h) } : el) }
        : p
    ));
  };

  const updateElementProperties = (ids: string | string[], properties: Record<string, any>) => {
    const targetIds = Array.isArray(ids) ? ids : [ids];
    setPages(prev => {
      const next = prev.map(p => 
        p.id === activePageId 
          ? { ...p, elements: p.elements.map(el => targetIds.includes(el.id) ? { ...el, properties: { ...(el.properties || {}), ...properties } } : el) }
          : p
      );
      addToHistory(next);
      return next;
    });
  };

  const updateElementLabel = (ids: string | string[], label: string) => {
    const targetIds = Array.isArray(ids) ? ids : [ids];
    setPages(prev => {
      const next = prev.map(p => 
        p.id === activePageId 
          ? { ...p, elements: p.elements.map(el => targetIds.includes(el.id) ? { ...el, label } : el) }
          : p
      );
      addToHistory(next);
      return next;
    });
  };

  // Load project data
  useEffect(() => {
    if (projectId) {
      const loadProject = async () => {
        try {
          const result = await getAppProjectAction(projectId);
          if (result.success && result.project) {
            if (onLoadProject) onLoadProject(result.project);
            if (result.workflow) {
              setWorkflowId(result.workflow.id);
              try {
                const flowData = JSON.parse(result.workflow.flowJson);
                if (flowData && flowData.pages) {
                   setPages(flowData.pages);
                   setVariables(flowData.variables || []);
                   setAppArguments(flowData.arguments || []);
                   lastSavedStateRef.current = JSON.stringify({ pages: flowData.pages, variables: flowData.variables, arguments: flowData.arguments });
                }
              } catch (e) {
                console.error("Failed to parse flowJson:", e);
              }
            }
          }
        } catch (e) {
          console.error("Load failed:", e);
        }
      };
      loadProject();
    }
  }, [projectId]);

  // Listen for global save event from StudioLayout
  useEffect(() => {
    const handleGlobalSave = () => performSave(true);
    window.addEventListener("app-designer-save", handleGlobalSave);
    return () => window.removeEventListener("app-designer-save", handleGlobalSave);
  }, [pages, projectId, workflowId]);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const lastSavedStateRef = useRef<string>("");

  // Initialize last saved state on mount
  useEffect(() => {
    lastSavedStateRef.current = JSON.stringify({ projectId, pages });
  }, []);

  const performSave = async (showNotification = false) => {
    if (!projectId) return;
    const currentState = JSON.stringify({ pages, variables, appArguments });
    
    if (!showNotification && currentState === lastSavedStateRef.current) {
      return;
    }

    if (isSaving) return;
    setIsSaving(true);
    
    try {
       // Serialize for StudioWorkflow storage
       const payload = {
         projectId,
         workflowId,
         name: "App Workspace.xaml",
         flowJson: JSON.stringify({ pages, variables, arguments: appArguments }),
         nodes: [], 
         edges: [],
         variables,
         arguments: appArguments
       };

       const result = await saveStudioWorkflow(payload);
       if (result.success) {
          const successResult = result as { success: true; workflowId: string; version: string };
          if (successResult.workflowId) setWorkflowId(successResult.workflowId);
          lastSavedStateRef.current = currentState;
          setLastSaved(new Date());
          if (showNotification) toast.success("Application saved successfully");
       } else {
          const errorMessage = (result as any).error || "Unknown error";
          toast.error(`Save failed: ${errorMessage}`);
       }
    } catch (e) {
       console.error("Save error:", e);
       toast.error("An unexpected error occurred while saving");
    } finally {
       setIsSaving(false);
    }
  };

  const handleSave = () => performSave(true);

  const handleConvertTemplateToCanvas = () => {
    if (!selectedTemplateId) return;
    
    const reconstructions: Record<string, CanvasElement[]> = {
      "call-center-360": [
         { id: `el-${Date.now()}-1`, type: "Container", label: "Active Call Dashboard Header", timestamp: new Date().toLocaleTimeString(), x: 50, y: 50, w: 800, h: 100, properties: {} },
         { id: `el-${Date.now()}-2`, type: "Chart", label: "Sentiment Analysis Trend", timestamp: new Date().toLocaleTimeString(), x: 50, y: 170, w: 500, h: 300, properties: {} },
         { id: `el-${Date.now()}-3`, type: "Table", label: "Real-time Call Transcript", timestamp: new Date().toLocaleTimeString(), x: 570, y: 170, w: 280, h: 300, properties: {} },
         { id: `el-${Date.now()}-4`, type: "Card", label: "Customer History Summary", timestamp: new Date().toLocaleTimeString(), x: 50, y: 490, w: 400, h: 200, properties: {} },
         { id: `el-${Date.now()}-5`, type: "Button", label: "Resolve Interaction", timestamp: new Date().toLocaleTimeString(), x: 470, y: 490, w: 380, h: 200, properties: {} }
      ],
      "insurance-claim-nexus": [
         { id: `el-${Date.now()}-1`, type: "Container", label: "Claim Investigation Hub", timestamp: new Date().toLocaleTimeString(), x: 50, y: 50, w: 800, h: 100, properties: {} },
         { id: `el-${Date.now()}-2`, type: "Chart", label: "Risk & Fraud Analysis", timestamp: new Date().toLocaleTimeString(), x: 50, y: 170, w: 500, h: 400, properties: {} },
         { id: `el-${Date.now()}-3`, type: "Table", label: "Damage Assessment Ledger", timestamp: new Date().toLocaleTimeString(), x: 570, y: 170, w: 280, h: 400, properties: {} },
         { id: `el-${Date.now()}-4`, type: "Button", label: "Approve Payment", timestamp: new Date().toLocaleTimeString(), x: 50, y: 590, w: 800, h: 80, properties: {} }
      ],
      "bank-kyc-onboarding": [
         { id: `el-${Date.now()}-1`, type: "Container", label: "KYC Onboarding Portal", timestamp: new Date().toLocaleTimeString(), x: 50, y: 50, w: 800, h: 100, properties: {} },
         { id: `el-${Date.now()}-2`, type: "Input", label: "Legal Name", timestamp: new Date().toLocaleTimeString(), x: 50, y: 170, w: 400, h: 80, properties: {} },
         { id: `el-${Date.now()}-3`, type: "DatePicker", label: "Birth Date", timestamp: new Date().toLocaleTimeString(), x: 470, y: 170, w: 380, h: 80, properties: {} },
         { id: `el-${Date.now()}-4`, type: "Button", label: "Validate Identity", timestamp: new Date().toLocaleTimeString(), x: 50, y: 270, w: 800, h: 80, properties: {} }
      ]
    };

    const elements = reconstructions[selectedTemplateId] || [
       { id: `el-${Date.now()}-1`, type: "Container", label: `Initialized from ${selectedTemplateId}`, timestamp: new Date().toLocaleTimeString(), x: 50, y: 50, w: 300, h: 200, properties: {} }
    ];

    const nextPages = pages.map(p => p.id === activePageId ? { ...p, elements: [...p.elements, ...elements] } : p);
    setPages(nextPages);
    addToHistory(nextPages);
    setSelectedTemplateId(null);
    toast.success("Template converted to editable components");
  };

  useEffect(() => {
    const timer = setInterval(() => {
      performSave(false);
    }, 60000);
    return () => clearInterval(timer);
  }, [pages, projectId]);

  const selectedTemplate = TEMPLATES.find(t => t.id === selectedTemplateId);

  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden animate-in fade-in duration-500">
      {!onLoadProject && (
      <header className="h-14 border-b border-border/40 bg-card/20 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-50">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" size="sm" 
            onClick={() => window.location.search = ""}
            className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 text-muted-foreground/40 hover:text-primary transition-all"
          >
             <ChevronLeft size={16} />
          </Button>
          <div className="h-6 w-px bg-border/20 mx-1" />
          <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground/40">
             <span>{projectId ? `Project: ${projectId.substring(0,8)}...` : "Application Project"}</span>
             <ChevronRight size={10} />
             <span className="text-foreground/80">{activePage?.name === "Home Dashboard" || activePage?.name === "App Workspace" ? "App Workspace.xaml" : activePage?.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-muted/10 border border-border/40 rounded-xl">
           <button 
             onClick={undo} 
             disabled={historyIndex <= 0} 
             className="p-1.5 text-muted-foreground/40 hover:text-primary disabled:opacity-20 transition-all rounded-lg"
             title="Undo (Ctrl+Z)"
           >
              <RotateCcw size={14} />
           </button>
           <button 
             onClick={redo} 
             disabled={historyIndex >= history.length - 1} 
             className="p-1.5 text-muted-foreground/40 hover:text-primary disabled:opacity-20 transition-all rotate-180 scale-y-[-1] rounded-lg"
             title="Redo (Ctrl+Y)"
           >
              <RotateCcw size={14} />
           </button>
        </div>

        <div className="flex items-center bg-muted/10 border border-border/40 rounded-xl p-1">
          <DeviceButton 
            active={device === "desktop"} onClick={() => setDevice("desktop")} 
            icon={Monitor} label="Desktop" 
          />
          <DeviceButton 
            active={device === "tablet"} onClick={() => setDevice("tablet")} 
            icon={Tablet} label="Tablet" 
          />
          <DeviceButton 
            active={device === "mobile"} onClick={() => setDevice("mobile")} 
            icon={Smartphone} label="Mobile" 
          />
        </div>

        <div className="flex items-center gap-3">
          {lastSaved && (
            <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.15em] mr-2">
               Last saved: {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <Button 
            onClick={handleSave}
            disabled={isSaving}
            variant="ghost" size="sm" className="h-9 gap-2 text-muted-foreground/60 hover:text-primary hover:bg-primary/5 text-[10px] font-black uppercase tracking-widest px-4 rounded-xl transition-all"
          >
             {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
             {isSaving ? "Saving..." : "Save"}
          </Button>
          <div className="h-4 w-px bg-border/20 mx-1" />
          <Button 
            onClick={() => setIsPreview(true)}
            variant="ghost" size="sm" className="h-9 gap-2 text-primary hover:bg-primary/5 text-[10px] font-black uppercase tracking-widest px-4 rounded-xl"
          >
             <Eye size={14} /> Preview
          </Button>
          <Button className="h-9 gap-2 bg-primary text-primary-foreground hover:opacity-90 text-[10px] font-black uppercase tracking-widest px-6 rounded-xl shadow-lg shadow-primary/20">
             <CloudUpload size={14} /> Publish
          </Button>
        </div>
      </header>
      )}

      {/* Full-Screen Preview Mode Overlay */}
      {isPreview && (
        <div className="fixed inset-0 z-[1000] bg-background animate-in fade-in zoom-in-95 duration-300 flex flex-col">
           <div className="h-14 border-b border-border/10 bg-card/40 backdrop-blur-3xl flex items-center justify-between px-8 shrink-0">
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Monitor size={18} />
                 </div>
                 <div className="space-y-0.5">
                    <h3 className="text-xs font-black uppercase tracking-widest text-foreground/80">Application Preview</h3>
                    <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-tighter">Live Interactive Environment</p>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="flex items-center gap-1 bg-muted/10 border border-border/40 rounded-xl p-1 mr-4">
                    <DeviceButton active={device === "desktop"} onClick={() => setDevice("desktop")} icon={Monitor} label="Desktop" />
                    <DeviceButton active={device === "tablet"} onClick={() => setDevice("tablet")} icon={Tablet} label="Tablet" />
                    <DeviceButton active={device === "mobile"} onClick={() => setDevice("mobile")} icon={Smartphone} label="Mobile" />
                 </div>
                 <Button 
                    onClick={() => setIsPreview(false)}
                    className="h-9 gap-2 bg-foreground text-background hover:opacity-90 text-[10px] font-black uppercase tracking-widest px-6 rounded-xl shadow-xl"
                 >
                    <Settings2 size={14} /> Back to Editor
                 </Button>
              </div>
           </div>

           <div className="flex-1 bg-muted/10 p-12 overflow-auto custom-scrollbar flex justify-center">
              <motion.div 
                layout
                className={cn(
                  "bg-background border border-border/10 shadow-[0_0_100px_rgba(0,0,0,0.1)] rounded-[2rem] overflow-hidden flex flex-col transition-all duration-500",
                  device === "desktop" && "w-full max-w-[1280px] aspect-[16/10]",
                  device === "tablet" && "w-[768px] aspect-[4/3]",
                  device === "mobile" && "w-[375px] aspect-[9/19.5]"
                )}
              >
                  <div className="flex-1 p-10 relative bg-white">
                     {canvasElements.filter((el: any) => !el.parentId).map((element) => (
                        <CanvasElementInstance 
                           key={element.id}
                           element={element}
                           canvasElements={canvasElements}
                           selectedElementIds={[]}
                           setSelectedElementIds={() => {}}
                           updateElementPosition={() => {}}
                           updateElementSize={() => {}}
                           deleteElement={() => {}}
                           isPreview={true}
                           addToHistory={() => {}}
                           pages={pages}
                        />
                     ))}
                  </div>
              </motion.div>
           </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden relative">
        
        {mounted && (
           (() => {
             const sidebar = (
               <aside className="h-full bg-transparent flex flex-col shrink-0 relative z-20 w-full">
                 <div className="flex border-b border-border/40 shrink-0">
                    <button 
                       onClick={() => setActiveSidebar("components")}
                       className={cn(
                         "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                         activeSidebar === "components" ? "text-primary border-primary bg-primary/5" : "text-muted-foreground/40 border-transparent hover:text-foreground/60"
                       )}
                    >
                       Components
                    </button>
                    <button 
                       onClick={() => setActiveSidebar("templates")}
                       className={cn(
                         "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                         activeSidebar === "templates" ? "text-primary border-primary bg-primary/5" : "text-muted-foreground/40 border-transparent hover:text-foreground/60"
                       )}
                    >
                       UX Kits
                    </button>
                    <button 
                       onClick={() => setActiveSidebar("pages")}
                       className={cn(
                         "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all border-b-2",
                         activeSidebar === "pages" ? "text-primary border-primary bg-primary/5" : "text-muted-foreground/40 border-transparent hover:text-foreground/60"
                       )}
                    >
                       Explorer
                    </button>
                 </div>

                 <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    <AnimatePresence mode="wait">
                       {activeSidebar === "components" ? (
                         <motion.div 
                           key="components" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                           className="flex-1 flex flex-col overflow-hidden"
                         >
                           <div className="p-4 border-b border-border/40">
                             <div className="relative group">
                               <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />
                               <input 
                                 type="text" 
                                 placeholder="Search components..."
                                 value={searchQuery}
                                 onChange={(e) => setSearchQuery(e.target.value)}
                                 className="w-full bg-muted/10 border border-border/40 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                               />
                             </div>
                           </div>

                           <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8 pb-20">
                             <ComponentCategory title="Layout" items={COMPONENT_LIBRARY.filter(c => c.category === "layout")} onDragStart={handleDragStart} />
                             <ComponentCategory title="Dashboard" items={COMPONENT_LIBRARY.filter(c => c.category === "dashboard")} onDragStart={handleDragStart} />
                             <ComponentCategory title="Form Elements" items={COMPONENT_LIBRARY.filter(c => c.category === "form")} onDragStart={handleDragStart} />
                             <ComponentCategory title="Data Display" items={COMPONENT_LIBRARY.filter(c => c.category === "data")} onDragStart={handleDragStart} />
                             <ComponentCategory title="Action" items={COMPONENT_LIBRARY.filter(c => c.category === "action")} onDragStart={handleDragStart} />
                             
                             <div className="space-y-4">
                                <div className="flex items-center justify-between px-1">
                                   <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/30">Icon Library</h4>
                                   <span className="text-[9px] font-bold text-primary/40 bg-primary/5 px-2 py-0.5 rounded-full border border-primary/10">{ICON_LIBRARY.length}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                   {ICON_LIBRARY.filter(icon => 
                                      !searchQuery || icon.label.toLowerCase().includes(searchQuery.toLowerCase())
                                   ).map((item) => (
                                     <button 
                                       key={item.id}
                                       className="aspect-square rounded-xl bg-card border border-border/40 flex flex-col items-center justify-center gap-1 group hover:border-primary/40 hover:bg-primary/5 transition-all shadow-sm"
                                       title={item.label}
                                     >
                                        <item.icon size={16} className="text-muted-foreground/40 group-hover:text-primary transition-all" />
                                        <span className="text-[7px] font-black uppercase tracking-widest text-muted-foreground/20 group-hover:text-primary/40 transition-all">{item.label}</span>
                                     </button>
                                   ))}
                                </div>
                             </div>
                           </div>
                         </motion.div>
                       ) : activeSidebar === "templates" ? (
                         <motion.div 
                           key="templates" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                           className="flex-1 flex flex-col overflow-hidden"
                         >
                           <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                              {TEMPLATES.map(template => (
                                <button 
                                   key={template.id}
                                   onClick={() => setSelectedTemplateId(template.id)}
                                   className={cn(
                                     "w-full p-4 rounded-2xl border text-left transition-all group relative overflow-hidden",
                                     selectedTemplateId === template.id ? "border-primary bg-primary/5 shadow-lg shadow-primary/5" : "border-border/40 bg-card/20 hover:border-primary/20 hover:bg-primary/5"
                                   )}
                                >
                                   <div className="flex items-start justify-between mb-3">
                                      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg", template.thumbnailColor)}>
                                         <template.icon size={20} />
                                      </div>
                                      <div className="px-2 py-1 rounded bg-muted/20 text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">
                                         {template.industry}
                                      </div>
                                   </div>
                                   <h4 className={cn("text-xs font-black transition-colors", selectedTemplateId === template.id ? "text-primary" : "text-foreground/80")}>{template.name}</h4>
                                   <p className="text-[10px] text-muted-foreground/40 mt-1 line-clamp-2 leading-relaxed ">{template.description}</p>
                                   
                                   {selectedTemplateId === template.id && (
                                     <div className="absolute right-0 bottom-0 p-1">
                                        <div className="w-4 h-4 bg-primary rounded-tl-lg flex items-center justify-center text-white">
                                           <Plus size={10} />
                                        </div>
                                     </div>
                                   )}
                                </button>
                              ))}
                           </div>
                         </motion.div>
                       ) : activeSidebar === "pages" ? (
                         <motion.div 
                           key="pages" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                           className="flex-1 flex flex-col overflow-hidden"
                         >
                           <div className="p-6 border-b border-border/40 space-y-4">
                             <div className="flex items-center justify-between">
                               <h3 className="text-sm font-black uppercase tracking-widest text-foreground/80">Project Explorer</h3>
                               <Button 
                                  onClick={handleAddPage}
                                  variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg hover:bg-primary/10 hover:text-primary"
                               >
                                  <Plus size={16} />
                               </Button>
                             </div>
                           </div>
                           <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-8">
                              <div className="space-y-3">
                                 <div className="flex items-center gap-2 ml-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">Pages</span>
                                 </div>
                                 <div className="space-y-1">
                                   {pages.map(page => (
                                     <button 
                                       key={page.id}
                                       onClick={() => setActivePageId(page.id)}
                                       onContextMenu={(e) => {
                                         e.preventDefault();
                                         setContextMenu({ x: e.clientX, y: e.clientY, pageId: page.id });
                                       }}
                                       className={cn(
                                         "w-full flex items-center justify-between p-3 rounded-2xl border transition-all group",
                                         activePageId === page.id ? "bg-primary/10 border-primary/20 text-primary" : "bg-transparent border-transparent hover:bg-muted/10 text-muted-foreground/60"
                                       )}
                                     >
                                       <div className="flex items-center gap-3">
                                          <FileText size={14} className={cn(activePageId === page.id ? "text-primary" : "text-muted-foreground/30")} />
                                          <span className="text-[11px] font-black uppercase tracking-tight">{page.name === "Home Dashboard" || page.name === "App Workspace" ? "App Workspace.xaml" : page.name}</span>
                                       </div>
                                       <div className="flex items-center gap-2">
                                         {page.isHome && (
                                           <div className="flex items-center gap-1 bg-primary/10 px-1.5 py-0.5 rounded-full border border-primary/20">
                                             <Home size={8} className="text-primary" />
                                             <span className="text-[7px] font-bold text-primary uppercase">Main</span>
                                           </div>
                                         )}
                                         <MoreVertical size={10} className="opacity-0 group-hover:opacity-40 transition-opacity" />
                                       </div>
                                     </button>
                                   ))}
                                 </div>
                              </div>

                              <div className="space-y-3">
                                 <div className="flex items-center gap-2 ml-4">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">Active Layers</span>
                                 </div>
                                 <div className="space-y-1">
                                    {canvasElements.filter(el => !el.parentId).length > 0 ? (
                                       canvasElements.filter(el => !el.parentId).map(el => (
                                          <LayerItem 
                                            key={el.id} 
                                            element={el} 
                                            canvasElements={canvasElements} 
                                            selectedElementIds={selectedElementIds}
                                            setSelectedElementIds={setSelectedElementIds}
                                          />
                                       ))
                                    ) : (
                                       <div className="py-8 text-center border-2 border-dashed border-border/10 rounded-2xl">
                                          <Layers size={24} className="text-muted-foreground/10 mx-auto mb-2" />
                                          <p className="text-[9px] font-bold text-muted-foreground/40 uppercase tracking-widest ">No layers present</p>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                           
                           <div className="p-6 border-t border-border/40 bg-primary/5">
                              <div className="flex items-center justify-between mb-4">
                                 <span className="text-[10px] font-black uppercase text-muted-foreground/40 tracking-widest">Global Navigation</span>
                                 <Settings size={12} className="text-muted-foreground/20" />
                              </div>
                              <div className="flex gap-2">
                                 <div className="flex-1 h-1.5 rounded-full bg-primary/20" />
                                 <div className="flex-1 h-1.5 rounded-full bg-primary/20" />
                                 <div className="flex-1 h-1.5 rounded-full bg-border/20" />
                              </div>
                           </div>
                         </motion.div>
                       ) : null}
                    </AnimatePresence>
                 </div>
               </aside>
             );

             const sidebarTarget = document.getElementById("studio-sidebar-content");
             if (sidebarTarget) {
                return createPortal(sidebar, sidebarTarget);
             }
             return !isPreview ? sidebar : null;
           })()
        )}

        <main 
           ref={canvasRef}
           onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
           onDragLeave={() => setIsDraggingOver(false)}
           onDrop={handleDrop}
           className="flex-1 bg-muted/5 p-8 flex justify-center overflow-auto custom-scrollbar relative"
        >
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          
          
          <motion.div 
            layout
            className={cn(
              "bg-background border border-border/40 shadow-2xl rounded-2xl overflow-hidden flex flex-col transition-all duration-500 relative ring-1 ring-primary/5",
              device === "desktop" && "w-full max-w-[1200px] aspect-[16/10]",
              device === "tablet" && "w-[768px] aspect-[4/3]",
              device === "mobile" && "w-[375px] aspect-[9/19.5]",
              isPreview && "max-w-none w-full h-full aspect-auto rounded-none border-0 ring-0 shadow-none"
            )}
            style={{ 
              transform: `scale(${zoom / 100})`, 
              transformOrigin: 'top center',
              marginTop: device === "desktop" ? '2rem' : '0'
            }}
          >
               <div className="absolute top-4 right-4 flex items-center gap-1.5 p-1 bg-white/80 backdrop-blur-md border border-border/40 rounded-xl shadow-lg z-50">
                  <button onClick={() => setZoom(prev => Math.max(50, prev - 5))} className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground/40 hover:text-primary transition-all"><MinusCircle size={14} /></button>
                  <span className="text-[9px] font-black uppercase tracking-widest min-w-[30px] text-center">{zoom}%</span>
                  <button onClick={() => setZoom(prev => Math.min(150, prev + 5))} className="p-1.5 hover:bg-primary/10 rounded-lg text-muted-foreground/40 hover:text-primary transition-all"><PlusCircle size={14} /></button>
               </div>
              <div className="flex-1 flex flex-col overflow-hidden relative p-8">
                 {canvasElements.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center space-y-6 text-center opacity-20">
                       <Plus size={48} className="text-primary/40 animate-pulse" />
                       <div className="space-y-1">
                          <h3 className="text-lg font-black uppercase tracking-widest">Architectural Void</h3>
                          <p className="text-xs font-medium ">Drag components here to begin your layout</p>
                       </div>
                    </div>
                 ) : (
                    <div 
                       className="relative h-full w-full"
                       onMouseDown={(e) => {
                          if (e.target !== e.currentTarget) return;
                          if (isPreview) return;
                          
                          const rect = e.currentTarget.getBoundingClientRect();
                          const startX = e.clientX - rect.left;
                          const startY = e.clientY - rect.top;
                          
                          setSelectionBox({ startX, startY, currentX: startX, currentY: startY });
                          
                          const onMouseMove = (moveE: MouseEvent) => {
                             setSelectionBox(prev => prev ? { ...prev, currentX: moveE.clientX - rect.left, currentY: moveE.clientY - rect.top } : null);
                          };
                          
                          const onMouseUp = (upE: MouseEvent) => {
                             window.removeEventListener('mousemove', onMouseMove);
                             window.removeEventListener('mouseup', onMouseUp);
                             
                             setSelectionBox(prev => {
                                if (!prev) return null;
                                
                                const minX = Math.min(prev.startX, prev.currentX);
                                const maxX = Math.max(prev.startX, prev.currentX);
                                const minY = Math.min(prev.startY, prev.currentY);
                                const maxY = Math.max(prev.startY, prev.currentY);
                                
                                const inBox = canvasElements.filter(el => {
                                   const centerX = el.x + el.w / 2;
                                   const centerY = el.y + el.h / 2;
                                   return centerX >= minX && centerX <= maxX && centerY >= minY && centerY <= maxY;
                                }).map(el => el.id);
                                
                                if (upE.metaKey || upE.ctrlKey || upE.shiftKey) {
                                   setSelectedElementIds(existing => [...new Set([...existing, ...inBox])]);
                                } else {
                                   setSelectedElementIds(inBox);
                                }
                                return null;
                             });
                          };
                          
                          window.addEventListener('mousemove', onMouseMove);
                          window.addEventListener('mouseup', onMouseUp);
                       }}
                    >
                       {canvasElements.filter((el: any) => !el.parentId).map((element) => (
                          <CanvasElementInstance 
                             key={element.id}
                             element={element}
                             canvasElements={canvasElements}
                             selectedElementIds={selectedElementIds}
                             setSelectedElementIds={setSelectedElementIds}
                             updateElementPosition={updateElementPosition}
                             updateElementSize={updateElementSize}
                             deleteElement={deleteElement}
                             isPreview={isPreview}
                             addToHistory={addToHistory}
                             pages={pages}
                          />
                       ))}
                       {/* Selection Marquee Visual */}
                       {selectionBox && (
                          <div 
                             className="absolute border-2 border-primary bg-primary/10 rounded-lg z-[100] pointer-events-none"
                             style={{
                                left: Math.min(selectionBox.startX, selectionBox.currentX),
                                top: Math.min(selectionBox.startY, selectionBox.currentY),
                                width: Math.abs(selectionBox.currentX - selectionBox.startX),
                                height: Math.abs(selectionBox.currentY - selectionBox.startY)
                             }}
                          />
                       )}
                    </div>
                 )}
              </div>
            </motion.div>
        </main>

        {mounted && (
           (() => {
             const inspector = (
               <aside className="h-full border-l border-border/40 bg-card/80 backdrop-blur-2xl flex flex-col shrink-0 relative z-20 w-full sm:w-[340px]">
                 <div className="flex border-b border-border/40 shrink-0">
                    <InspectorTabButton 
                       active={activeInspectorTab === "properties"} 
                       onClick={() => setActiveInspectorTab("properties")} 
                       label="Properties" 
                    />
                    <InspectorTabButton 
                       active={activeInspectorTab === "data"} 
                       onClick={() => setActiveInspectorTab("data")} 
                       label="Data" 
                    />
                    <InspectorTabButton 
                       active={activeInspectorTab === "events"} 
                       onClick={() => setActiveInspectorTab("events")} 
                       label="Events" 
                    />
                 </div>

                 <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                    <AnimatePresence mode="wait">
                       {activeInspectorTab === "properties" && (
                         <motion.div 
                           key="props" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                           className="space-y-6"
                         >
                            {selectedElement ? (
                               <>
                                 {selectedElementIds.length > 1 && (
                                    <InspectorGroup title="Alignment & Distribution">
                                       <div className="grid grid-cols-4 gap-2 mb-6">
                                          <AlignmentButton onClick={() => alignSelectedElements('left')} icon={AlignLeft} label="Align Left" className="w-full bg-primary/5 rounded-xl h-10" />
                                          <AlignmentButton onClick={() => alignSelectedElements('center')} icon={AlignCenter} label="Align Center" className="w-full bg-primary/5 rounded-xl h-10" />
                                          <AlignmentButton onClick={() => alignSelectedElements('right')} icon={AlignRight} label="Align Right" className="w-full bg-primary/5 rounded-xl h-10" />
                                          <AlignmentButton onClick={() => alignSelectedElements('top')} icon={AlignStartVertical} label="Align Top" className="w-full bg-primary/5 rounded-xl h-10" />
                                          <AlignmentButton onClick={() => alignSelectedElements('middle')} icon={AlignCenterVertical} label="Align Middle" className="w-full bg-primary/5 rounded-xl h-10" />
                                          <AlignmentButton onClick={() => alignSelectedElements('bottom')} icon={AlignEndVertical} label="Align Bottom" className="w-full bg-primary/5 rounded-xl h-10" />
                                          <AlignmentButton onClick={() => distributeSelectedElements('horizontal')} icon={Grid2X2} label="Distribute H" className="w-full bg-primary/5 rounded-xl h-10" />
                                          <AlignmentButton onClick={() => distributeSelectedElements('vertical')} icon={Grid2X2} label="Distribute V" className="w-full bg-primary/5 rounded-xl h-10 rotate-90" />
                                       </div>
                                    </InspectorGroup>
                                 )}
                                 <div className="flex items-center gap-4 mb-8 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-lg shadow-primary/5">
                                       {COMPONENT_LIBRARY.find(c => c.type === selectedElement.type)?.icon ? 
                                          React.createElement(COMPONENT_LIBRARY.find(c => c.type === selectedElement.type)!.icon, { size: 20 }) : 
                                          <Settings2 size={20} />
                                       }
                                    </div>
                                    <div className="flex-1">
                                       <span className="text-[10px] font-black uppercase text-primary tracking-widest block">Inspecting</span>
                                       <span className="text-xs font-bold text-foreground/70">{selectedElement.type}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <button 
                                         onClick={() => deleteElement(selectedElement.id)} 
                                         className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                                         title="Delete Element"
                                       >
                                          <Trash2 size={14} />
                                       </button>
                                       <button onClick={() => setSelectedElementIds([])} className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/30 hover:text-primary hover:bg-primary/5 transition-all"><Plus size={14} className="rotate-45" /></button>
                                    </div>
                                 </div>

                                 <InspectorGroup title="Layout">
                                    <div className="grid grid-cols-2 gap-4">
                                       <PropertyField 
                                         prefix="X" 
                                         type="number"
                                         value={selectedElement.x} 
                                         onChange={(val: number) => updateElementPosition(selectedElement.id, val, selectedElement.y)}
                                       />
                                       <PropertyField 
                                         prefix="Y" 
                                         type="number"
                                         value={selectedElement.y} 
                                         onChange={(val: number) => updateElementPosition(selectedElement.id, selectedElement.x, val)}
                                       />
                                       <PropertyField 
                                         prefix="W" 
                                         type="number"
                                         value={selectedElement.w} 
                                         onChange={(val: number) => updateElementSize(selectedElement.id, val, selectedElement.h)}
                                       />
                                       <PropertyField 
                                         prefix="H" 
                                         type="number"
                                         value={selectedElement.h} 
                                         onChange={(val: number) => updateElementSize(selectedElement.id, selectedElement.w, val)}
                                       />
                                    </div>
                                 </InspectorGroup>

                                 <InspectorGroup title="Common Properties">
                                    <PropertyField label="Element ID" value={selectedElement.id} readOnly />
                                    <PropertyField 
                                      label="Display Label" 
                                      value={selectedElement.label} 
                                      onChange={(val: string) => updateElementLabel(selectedElementIds, val)}
                                    />
                                    <PropertyField 
                                      label="Business Rule" 
                                      type="select" 
                                      options={["Standard", "Strict Validation", "AI-Optimized", "Manual Overwrite"]} 
                                      value={selectedElement.properties?.rule || "Standard"} 
                                      onChange={(val: string) => updateElementProperties(selectedElementIds, { rule: val })}
                                    />
                                 </InspectorGroup>

                                 <InspectorGroup title="Fill">
                                    <PropertyField 
                                      label="Background" 
                                      type="color"
                                      value={selectedElement.properties?.background || "#ffffff"} 
                                      onChange={(val: string) => updateElementProperties(selectedElementIds, { background: val })}
                                    />
                                    <PropertyField 
                                      label="Opacity" 
                                      type="number"
                                      value={selectedElement.properties?.opacity || 100} 
                                      onChange={(val: number) => updateElementProperties(selectedElementIds, { opacity: val })}
                                    />
                                 </InspectorGroup>

                                 <InspectorGroup title="Stroke">
                                    <div className="grid grid-cols-2 gap-4">
                                       <PropertyField 
                                         label="Color" 
                                         type="color"
                                         value={selectedElement.properties?.borderColor || "#e2e8f0"} 
                                         onChange={(val: string) => updateElementProperties(selectedElementIds, { borderColor: val })}
                                       />
                                       <PropertyField 
                                         label="Weight" 
                                         type="number"
                                         value={selectedElement.properties?.borderWidth || 1} 
                                         onChange={(val: number) => updateElementProperties(selectedElementIds, { borderWidth: val })}
                                       />
                                    </div>
                                    <PropertyField 
                                      label="Style" 
                                      type="select"
                                      options={["solid", "dashed", "dotted", "none"]}
                                      value={selectedElement.properties?.borderStyle || "solid"} 
                                      onChange={(val: string) => updateElementProperties(selectedElementIds, { borderStyle: val })}
                                    />
                                 </InspectorGroup>

                                 <InspectorGroup title="Effects">
                                    <PropertyField 
                                      label="Corner Radius" 
                                      type="number"
                                      value={parseInt(selectedElement.properties?.radius || "20")} 
                                      onChange={(val: number) => updateElementProperties(selectedElementIds, { radius: `${val}px` })}
                                    />
                                    <PropertyField 
                                      label="Shadow" 
                                      type="select"
                                      options={["None", "Small", "Medium", "Large", "Inner"]}
                                      value={selectedElement.properties?.shadow || "Small"} 
                                      onChange={(val: string) => updateElementProperties(selectedElementIds, { shadow: val })}
                                    />
                                    <PropertyField 
                                      label="Blur" 
                                      type="number"
                                      value={selectedElement.properties?.blur || 0} 
                                      onChange={(val: number) => updateElementProperties(selectedElementIds, { blur: val })}
                                    />
                                 </InspectorGroup>

                                 {["Button", "Input", "Text", "Label"].includes(selectedElement.type) && (
                                   <InspectorGroup title="Typography">
                                      <PropertyField 
                                        label="Font Size" 
                                        type="number"
                                        value={selectedElement.properties?.fontSize || 12} 
                                        onChange={(val: number) => updateElementProperties(selectedElementIds, { fontSize: val })}
                                      />
                                      <PropertyField 
                                        label="Font Weight" 
                                        type="select"
                                        options={["Normal", "Medium", "Bold", "Black"]}
                                        value={selectedElement.properties?.fontWeight || "Normal"} 
                                        onChange={(val: string) => updateElementProperties(selectedElementIds, { fontWeight: val })}
                                      />
                                      <PropertyField 
                                        label="Text Alignment" 
                                        type="select"
                                        options={["left", "center", "right"]}
                                        value={selectedElement.properties?.textAlign || "left"} 
                                        onChange={(val: string) => updateElementProperties(selectedElementIds, { textAlign: val })}
                                      />
                                   </InspectorGroup>
                                 )}

                                 {selectedElement.type === "Button" && (
                                   <InspectorGroup title="Button Config">
                                      <PropertyField 
                                        label="Action Type" 
                                        type="select" 
                                        options={["Submit Form", "Navigate Page", "Start Automation", "Trigger AI"]} 
                                        value={selectedElement.properties?.actionType || "Submit Form"} 
                                        onChange={(val: string) => updateElementProperties(selectedElementIds, { actionType: val })}
                                      />
                                      <PropertyField 
                                        label="Visual Priority" 
                                        type="select" 
                                        options={["High (Primary)", "Medium (Outline)", "Low (Ghost)", "Critical (Danger)"]} 
                                        value={selectedElement.properties?.priority || "High (Primary)"} 
                                        onChange={(val: string) => updateElementProperties(selectedElementIds, { priority: val })}
                                      />
                                   </InspectorGroup>
                                 )}

                                 {selectedElement.type === "Image" && (
                                   <InspectorGroup title="Image Config">
                                      <PropertyField 
                                        label="Source URL" 
                                        value={selectedElement.properties?.src || ""} 
                                        onChange={(val: string) => updateElementProperties(selectedElementIds, { src: val })}
                                      />
                                      <PropertyField 
                                        label="Fitting Mode" 
                                        type="select" 
                                        options={["cover", "contain", "fill", "none"]} 
                                        value={selectedElement.properties?.objectFit || "cover"} 
                                        onChange={(val: string) => updateElementProperties(selectedElementIds, { objectFit: val })}
                                      />
                                   </InspectorGroup>
                                 )}

                                 {selectedElement.type === "Input" && (
                                   <InspectorGroup title="Input Configuration">
                                      <PropertyField 
                                        label="Placeholder Text" 
                                        value={selectedElement.properties?.placeholder || `Enter ${selectedElement.label}...`} 
                                        onChange={(val: string) => updateElementProperties(selectedElementIds, { placeholder: val })}
                                      />
                                      <PropertyField 
                                        label="Data Category" 
                                        type="select" 
                                        options={["Text", "Email", "Financial", "Personal Identity", "Address"]} 
                                        value={selectedElement.properties?.category || "Text"} 
                                        onChange={(val: string) => updateElementProperties(selectedElementIds, { category: val })}
                                      />
                                   </InspectorGroup>
                                 )}
                               </>
                            ) : (
                               <div className="h-[400px] flex flex-col items-center justify-center text-center space-y-6 px-10">
                                  <div className="w-20 h-20 rounded-3xl bg-muted/5 border border-dashed border-border/20 flex items-center justify-center">
                                     <MousePointer2 size={32} className="text-muted-foreground/10 animate-bounce" />
                                  </div>
                                  <div className="space-y-2">
                                     <h4 className="text-sm font-black uppercase tracking-widest text-foreground/40">No Selection</h4>
                                     <p className="text-[11px] text-muted-foreground/30 font-medium ">Click on any component in the canvas to adjust its properties, logic, and visual styles.</p>
                                  </div>
                               </div>
                            )}
                         </motion.div>
                       )}

                       {activeInspectorTab === "data" && (
                         <motion.div 
                           key="data" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                           className="space-y-6"
                         >
                            <InspectorGroup title="Data Binding">
                               <div className="space-y-4">
                                  <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-center gap-3">
                                     <Database size={18} className="text-primary" />
                                     <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-primary uppercase">Source: Data Engine</span>
                                        <span className="text-xs font-bold">{MOCK_TABLES.length} Available Tables</span>
                                     </div>
                                  </div>
                                  
                                  {MOCK_TABLES.map(table => (
                                    <div key={table.id} className="p-3 bg-muted/5 border border-border/40 rounded-lg group hover:border-primary/20 transition-all cursor-pointer">
                                       <div className="flex items-center justify-between mb-2">
                                          <span className="text-[10px] font-black text-foreground/60 uppercase">{table.displayName}</span>
                                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                       </div>
                                       <div className="flex flex-wrap gap-1">
                                          {table.columns.slice(0, 3).map((col: any) => (
                                             <span key={col.id || col} className="px-1.5 py-0.5 rounded bg-primary/5 text-[8px] font-bold text-primary/60 border border-primary/10">
                                                {col.displayName || col}
                                             </span>
                                          ))}
                                          {table.columns.length > 3 && <span className="text-[8px] font-bold text-muted-foreground/30 px-1">+ {table.columns.length - 3} more</span>}
                                       </div>
                                    </div>
                                  ))}

                                  <div className="h-px bg-border/10 my-4" />
                                  
                                  <PropertyField label="Data Expression" value="{{LoanApplications.amount}}" isCode />
                                  <PropertyField label="Visibility" value="Always" />
                               </div>
                            </InspectorGroup>
                         </motion.div>
                       )}

                       {activeInspectorTab === "events" && (
                         <motion.div 
                           key="events" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                           className="space-y-6"
                         >
                            <InspectorGroup title="Interactions">
                               <EventField label="onClick" action="Run Automation Bot" target="LoanProcessingBot" />
                               <EventField label="onHover" action="Show Tooltip" target="Click to submit" />
                            </InspectorGroup>
                         </motion.div>
                       )}
                    </AnimatePresence>
                 </div>
               </aside>
             );

             const portalTarget = document.getElementById("studio-properties-panel");
             if (portalTarget) {
                return createPortal(inspector, portalTarget);
             }
             return !isPreview ? inspector : null;
           })()
        )}

        {isPreview && (
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100]">
            <Button 
              onClick={() => setIsPreview(false)}
              className="h-10 gap-2 bg-foreground text-background hover:opacity-90 text-[10px] font-black uppercase tracking-widest px-8 rounded-full shadow-2xl border-4 border-background/20"
            >
              <RotateCcw size={14} /> Exit Preview Mode
            </Button>
          </div>
        )}

        {mounted && (
           (() => {
             const dock = (
               <StudioDock 
                 variables={variables}
                 setVariables={setVariables}
                 arguments={appArguments}
                 setArguments={setAppArguments}
               />
             );
             const dockTarget = document.getElementById("studio-bottom-dock");
             if (dockTarget) {
                return createPortal(dock, dockTarget);
             }
             return null;
           })()
        )}

        {contextMenu && (
          <PageContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            pageId={contextMenu.pageId} 
            onSetMain={handleSetMainPage} 
            onClose={() => setContextMenu(null)} 
          />
        )}
      </div>
    </div>
  );
}

function DeviceButton({ active, onClick, icon: Icon, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "p-2 rounded-lg transition-all flex items-center gap-2",
        active ? "bg-background text-primary shadow-sm" : "text-muted-foreground/40 hover:text-primary/60"
      )}
    >
      <Icon size={16} />
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </button>
  );
}

function ToolboxGridItem({ item, onDragStart }: { item: ComponentDefinition, onDragStart: any }) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, item)}
      className="flex flex-col items-center justify-center p-3 rounded-2xl border border-border/40 bg-card/20 hover:bg-primary/5 hover:border-primary/20 transition-all group gap-2 cursor-grab active:cursor-grabbing relative"
    >
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
         <div 
            className="w-5 h-5 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-primary hover:bg-primary/10 transition-all cursor-help"
            onMouseEnter={() => setShowHelp(true)}
            onMouseLeave={() => setShowHelp(false)}
         >
            <Bot size={12} />
         </div>
         {showHelp && <BusinessHelpTooltip component={item} />}
      </div>
      
      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all shadow-sm">
         <item.icon size={20} className="text-primary/60 group-hover:text-primary transition-colors" />
      </div>
      <span className="text-[9px] font-bold text-muted-foreground/60 group-hover:text-foreground text-center line-clamp-1">{item.label}</span>
    </div>
  );
}

function ComponentCategory({ title, items, onDragStart }: { title: string, items: ComponentDefinition[], onDragStart: any }) {
  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 px-2">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <ToolboxGridItem key={item.id} item={item} onDragStart={onDragStart} />
        ))}
      </div>
    </div>
  );
}

function TemplateRenderer({ id }: { id: string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className="flex-1 flex flex-col h-full overflow-hidden"
    >
      {id === "call-center-360" && <CallCenter360 />}
      {id === "insurance-claim-nexus" && <InsuranceClaimNexus />}
      {id === "bank-kyc-onboarding" && <BankKycOnboarding />}
      {!["call-center-360", "insurance-claim-nexus", "bank-kyc-onboarding"].includes(id) && (
        <div className="flex-1 flex items-center justify-center text-muted-foreground/40 ">
           Advanced Layout Preview for {id} is being generated...
        </div>
      )}
    </motion.div>
  );
}

function CallCenter360() {
  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
       {/* Call Header */}
       <div className="h-24 border-b border-border/40 bg-card/40 backdrop-blur-3xl flex items-center justify-between px-10 relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-500 to-primary/40" />
          
          <div className="flex items-center gap-8 relative z-10">
             <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5">
                   <Headset size={28} className="text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-4 border-background flex items-center justify-center">
                   <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                </div>
             </div>
             
             <div className="space-y-1">
                <div className="flex items-center gap-3">
                   <h3 className="text-xl font-black tracking-tight text-foreground/90">Active Call: Jonathan Smith</h3>
                   <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-black uppercase text-emerald-500">Sentiment: Positive</span>
                   </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium text-muted-foreground/50">
                   <span className="flex items-center gap-1.5"><User size={12} className="text-primary/40" /> Policyholder since 2018</span>
                   <div className="w-1 h-1 rounded-full bg-border/40" />
                   <span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-emerald-500/40" /> Premium Member</span>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-12 relative z-10">
             <div className="flex gap-10">
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase text-muted-foreground/30 tracking-widest mb-1">Duration</p>
                   <p className="text-2xl font-mono font-black text-primary leading-none">04:22</p>
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black uppercase text-muted-foreground/30 tracking-widest mb-1">Queue Rank</p>
                   <p className="text-2xl font-mono font-black text-foreground/80 leading-none">#1</p>
                </div>
             </div>
             <div className="h-10 w-px bg-border/20" />
             <Button className="h-12 rounded-2xl bg-red-500 text-white hover:bg-red-600 px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-red-500/20 transition-all active:scale-95">
                End Call
             </Button>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden">
          {/* Customer 360 Left Panel */}
          <aside className="w-[380px] border-r border-border/40 bg-muted/5 flex flex-col shrink-0">
             <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
                {/* Sentiment Trend Graphic */}
                <div className="p-6 bg-card border border-border/40 rounded-3xl space-y-6 shadow-xl shadow-black/5 group">
                   <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 group-hover:text-primary transition-colors">Sentiment Trend</h4>
                      <TrendingUp size={14} className="text-emerald-500" />
                   </div>
                   <SimpleChart data={[40, 65, 30, 85, 90, 75, 95]} color="emerald" />
                   <div className="flex justify-between text-[8px] font-black uppercase text-muted-foreground/20">
                      <span>Last 7 Calls</span>
                      <span className="text-emerald-500/40">+12% Growth</span>
                   </div>
                </div>

                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">Customer Assets (Data Engine)</h4>
                   <div className="grid grid-cols-2 gap-4">
                      <StatCard label="Life Policy" value="$1.2M" sub="Active" />
                      <StatCard label="Auto Policy" value="$500k" sub="Renewal Due" />
                      <StatCard label="Household" value="4 Units" sub="Consolidated" />
                      <StatCard label="Risk Profile" value="Low" sub="Verified" />
                   </div>
                </div>
                
                <div className="space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">Interaction Activity</h4>
                   <div className="space-y-1 bg-card/40 rounded-2xl border border-border/20 p-2">
                      <ActivityItem type="Email" date="2 days ago" title="Query about premium payment" />
                      <ActivityItem type="Call" date="1 week ago" title="Inquiry: Adding new driver" />
                      <ActivityItem type="Portal" date="2 weeks ago" title="Address change updated" />
                   </div>
                </div>
             </div>

             {/* Integrated Bot Rail */}
             <div className="p-6 bg-primary/5 border-t border-border/40 space-y-4">
                <div className="flex items-center justify-between">
                   <span className="text-[10px] font-black uppercase text-primary tracking-[0.1em]">Active Bots</span>
                   <div className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-black">3 RUNNING</div>
                </div>
                <div className="flex gap-2">
                   {[Bot, ShieldCheck, Zap].map((Icon, i) => (
                      <div key={i} className="w-10 h-10 rounded-xl bg-card border border-primary/20 flex items-center justify-center relative group cursor-pointer hover:border-primary transition-all">
                         <Icon size={18} className="text-primary/60 group-hover:text-primary" />
                         <div className="absolute top-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border-2 border-background" />
                      </div>
                   ))}
                   <div className="w-10 h-10 rounded-xl border border-dashed border-border/40 flex items-center justify-center text-muted-foreground/20 hover:text-primary/40 hover:border-primary/20 transition-all cursor-pointer">
                      <Plus size={16} />
                   </div>
                </div>
             </div>
          </aside>

          {/* Live Workspace Center */}
          <main className="flex-1 p-10 space-y-10 overflow-y-auto custom-scrollbar bg-muted/5 relative">
             <div className="absolute inset-0 opacity-[0.01] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

             <div className="space-y-6 relative z-10">
                <div className="flex items-center justify-between">
                   <h4 className="text-2xl font-black tracking-tighter text-foreground/80">Agent Intelligence Assist</h4>
                   <div className="flex items-center gap-2 text-[10px] font-black uppercase text-primary bg-primary/10 px-4 py-1.5 rounded-full border border-primary/20">
                      <Bot size={14} /> AI Copilot Active
                   </div>
                </div>
                
                <div className="p-8 bg-card border border-border/40 rounded-[2rem] shadow-2xl space-y-6 relative overflow-hidden group border-l-4 border-l-primary">
                   <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                      <Zap size={140} className="text-primary" />
                   </div>
                   
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                         <Sparkles size={20} className="text-primary" />
                      </div>
                      <div className="space-y-4">
                         <p className="text-base leading-relaxed font-bold text-foreground/70  max-w-2xl">
                            "I detect Jonathan is concerned about his premium increase. Suggest applying the **Multi-Policy Bundle (MPB-2024)** which reduces his monthly payment by $22.50 while increasing his coverage by 15%."
                         </p>
                         <div className="flex items-center gap-3">
                            <Button className="h-10 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-emerald-500/20">
                               Apply Automation Workflow
                            </Button>
                            <Button variant="ghost" className="h-10 rounded-xl text-[10px] font-black uppercase tracking-widest px-6">
                               Dismiss
                            </Button>
                         </div>
                      </div>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-5 gap-8 relative z-10">
                <div className="col-span-3 space-y-4">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 px-1 flex items-center gap-2">
                      <FileText size={12} /> Live Call Transcription & Notes
                   </h4>
                   <div className="bg-card border border-border/40 rounded-3xl p-6 shadow-xl space-y-4 h-[320px] flex flex-col">
                      <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                         <TranscriptLine speaker="Customer" text="Yes, I was looking at my statement and noticed the auto premium jumped up." />
                         <TranscriptLine speaker="Agent" text="I see that Mr. Smith. Let me run a quick audit of your account to see why." />
                         <TranscriptLine speaker="System" text="Auditing Account Data... [Bot ID: AUD-909] Running..." status="running" />
                         <TranscriptLine speaker="Agent" text="It looks like the previous safe-driver discount expired last month." />
                      </div>
                      <div className="pt-4 border-t border-border/10">
                         <input 
                          className="w-full bg-muted/5 border border-border/20 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-primary transition-all"
                          placeholder="Type internal note or command..."
                         />
                      </div>
                   </div>
                </div>

                <div className="col-span-2 space-y-6">
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">Contextual Knowledge</h4>
                      <div className="grid grid-cols-1 gap-2">
                         {[
                           { title: "Renewal Grace Period", icon: Clock },
                           { title: "Safe Driver Criteria", icon: ShieldCheck },
                           { title: "Payment Deferral Policy", icon: Wallet },
                           { title: "Bundle Discount Rules", icon: Zap }
                         ].map((k, i) => (
                           <div key={i} className="flex items-center justify-between p-4 bg-card border border-border/40 rounded-2xl group hover:border-primary transition-all cursor-pointer shadow-sm hover:shadow-lg hover:shadow-primary/5">
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 rounded-lg bg-muted/10 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                                    <k.icon size={16} className="text-muted-foreground/40 group-hover:text-primary" />
                                 </div>
                                 <span className="text-xs font-black text-foreground/60 group-hover:text-foreground transition-colors">{k.title}</span>
                              </div>
                              <ArrowRight size={14} className="text-muted-foreground/20 group-hover:text-primary transition-colors" />
                           </div>
                         ))}
                      </div>
                   </div>
                </div>
             </div>
          </main>
       </div>
    </div>
  );
}

function ToolboxItem({ component, onDragStart }: { component: ComponentDefinition, onDragStart: (e: React.DragEvent, c: ComponentDefinition) => void }) {
  const [showHelp, setShowHelp] = useState(false);
  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, component)}
      className="flex items-center gap-4 p-4 bg-background border border-border/40 rounded-2xl hover:border-primary/40 hover:bg-primary/5 transition-all cursor-grab active:cursor-grabbing group shadow-sm hover:shadow-xl hover:shadow-primary/5 relative"
    >
      <div className="w-10 h-10 rounded-xl bg-muted/10 flex items-center justify-center text-muted-foreground/40 group-hover:bg-primary/10 group-hover:text-primary transition-all border border-transparent group-hover:border-primary/20">
         <component.icon size={20} />
      </div>
      <div className="flex-1">
         <span className="text-xs font-bold text-foreground/70 group-hover:text-foreground transition-colors">{component.label}</span>
      </div>
      <div 
        className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground/20 hover:text-primary hover:bg-primary/5 transition-all cursor-help relative"
        onMouseEnter={() => setShowHelp(true)}
        onMouseLeave={() => setShowHelp(false)}
      >
        <Bot size={14} />
        {showHelp && <BusinessHelpTooltip component={component} />}
      </div>
      <ChevronRight size={14} className="text-muted-foreground/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
    </div>
  );
}

function BusinessHelpTooltip({ component }: { component: ComponentDefinition }) {
  return (
    <div className="absolute left-full ml-4 top-0 w-72 p-6 bg-card/95 backdrop-blur-3xl border border-primary/20 rounded-3xl shadow-2xl z-[100] animate-in fade-in slide-in-from-left-4 duration-300 pointer-events-none">
       <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
             {React.createElement(component.icon, { size: 20 })}
          </div>
          <div>
             <h4 className="text-xs font-black uppercase tracking-widest text-foreground">{component.label}</h4>
             <span className="text-[8px] font-black uppercase text-primary/60 tracking-widest">Business Help Guide</span>
          </div>
       </div>
       <div className="space-y-4">
          <div className="space-y-1.5">
             <p className="text-[9px] font-black uppercase text-muted-foreground/30 tracking-widest">How to use</p>
             <p className="text-[11px] font-medium text-foreground/70 leading-relaxed ">"{component.helpSummary}"</p>
          </div>
          <div className="h-px bg-border/10" />
          <div className="space-y-2">
             <p className="text-[9px] font-black uppercase text-muted-foreground/30 tracking-widest">Property Configuration</p>
             <div className="p-3 bg-muted/5 rounded-xl border border-border/10">
                <p className="text-[10px] font-medium text-muted-foreground/60 leading-relaxed">
                   {component.propertiesExplanation}
                </p>
             </div>
          </div>
       </div>
    </div>
  );
}

function ComponentInfoBar({ element }: { element: CanvasElement }) {
  const component = COMPONENT_LIBRARY.find(c => c.type === element.type);
  const [showHelp, setShowHelp] = useState(false);
  const status = element.infoBarStatus || ["Ready", "Responsive"];

  return (
    <div className="absolute -bottom-8 left-0 right-0 flex items-center gap-2 px-3 py-1.5 bg-primary/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest rounded-lg shadow-xl z-[60] animate-in slide-in-from-top-2 duration-300 border border-white/20">
      <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      {status.map((s, i) => (
        <React.Fragment key={s}>
          {i > 0 && <span className="opacity-40">•</span>}
          <span>{s}</span>
        </React.Fragment>
      ))}
      <div className="ml-auto flex items-center gap-3">
        <div 
          className="flex items-center gap-1.5 opacity-60 hover:opacity-100 cursor-help transition-all relative"
          onMouseEnter={() => setShowHelp(true)}
          onMouseLeave={() => setShowHelp(false)}
        >
          <Bot size={10} />
          <span className="text-[7px]">Managed by AI</span>
          {showHelp && component && <BusinessHelpTooltip component={component} />}
        </div>
        <div className="h-2 w-px bg-white/20" />
        <ShieldCheck size={10} className="opacity-60" />
      </div>
    </div>
  );
}

function CanvasElementInstance({ 
  element, 
  canvasElements, 
  selectedElementIds, 
  setSelectedElementIds, 
  updateElementPosition, 
  updateElementSize,
  deleteElement,
  isPreview,
  addToHistory,
  pages
}: any) {
  const children = canvasElements.filter((el: any) => el.parentId === element.id);
  
  return (
    <div 
       onMouseDown={(e) => {
          e.stopPropagation();
          if (isPreview) return;

          // Multi-selection logic (Ctrl/Cmd/Shift)
          if (e.metaKey || e.ctrlKey || e.shiftKey) {
             setSelectedElementIds(prev => 
               prev.includes(element.id) 
                 ? prev.filter(id => id !== element.id) 
                 : [...prev, element.id]
             );
          } else {
             if (!selectedElementIds.includes(element.id)) {
                setSelectedElementIds([element.id]);
             }
          }
          
          const startX = e.clientX;
          const startY = e.clientY;
          
          // Store initial positions of ALL selected elements for multi-drag
          const targetIds = selectedElementIds.includes(element.id) ? selectedElementIds : [element.id];
          const initialPositions = canvasElements
            .filter((el: any) => targetIds.includes(el.id))
            .map((el: any) => ({ id: el.id, x: el.x, y: el.y }));

          const onMouseMove = (moveE: MouseEvent) => {
             const dx = moveE.clientX - startX;
             const dy = moveE.clientY - startY;

             initialPositions.forEach(pos => {
                let newX = pos.x + dx;
                let newY = pos.y + dy;
                
                // Constraints (optional: only if single drag or specific logic)
                // For simplicity in multi-drag, we skip individual constraints or apply them carefully
                updateElementPosition(pos.id, newX, newY);
             });
          };

          const onMouseUp = () => {
             window.removeEventListener('mousemove', onMouseMove);
             window.removeEventListener('mouseup', onMouseUp);
             addToHistory(pages);
          };

          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
       }}
       onContextMenu={(e) => {
          if (isPreview) return;
          e.preventDefault();
          e.stopPropagation();
          if (confirm(`Delete ${element.label}?`)) {
             deleteElement(element.id);
          }
       }}
       className={cn(
          "absolute group select-none",
          selectedElementIds.includes(element.id)
             ? "ring-2 ring-primary ring-offset-4 ring-offset-background z-50 shadow-2xl rounded-xl" 
             : cn(
                 "border border-dashed border-border/60 bg-card/5 hover:border-primary/40 hover:bg-card/10 rounded-xl",
                 isPreview && "border-0 bg-transparent shadow-none"
               )
       )}
       style={{ 
          left: element.x, 
          top: element.y, 
          width: element.w, 
          height: element.h,
          cursor: isPreview ? 'default' : 'move'
       }}
    >
       <ElementRenderer type={element.type} label={element.label} />
       
       {/* Render Children */}
       {children.length > 0 && (
         <div className="absolute inset-0 pointer-events-none">
           {children.map((child: any) => (
             <div className="pointer-events-auto" key={child.id}>
               <CanvasElementInstance 
                  element={child}
                  canvasElements={canvasElements}
                  selectedElementIds={selectedElementIds}
                  setSelectedElementIds={setSelectedElementIds}
                  updateElementPosition={updateElementPosition}
                  updateElementSize={updateElementSize}
                  deleteElement={deleteElement}
                  isPreview={isPreview}
                  addToHistory={addToHistory}
                  pages={pages}
               />
             </div>
           ))}
         </div>
       )}

       {/* Resize Handles & Info Bar */}
       {!isPreview && selectedElementIds.length === 1 && selectedElementIds[0] === element.id && (
          <>
             <ComponentInfoBar element={element} />
             <div 
                className="absolute -bottom-2 -right-2 w-5 h-5 bg-primary rounded-lg cursor-nwse-resize z-[70] shadow-2xl border-2 border-background flex items-center justify-center hover:scale-125 transition-transform group/resize" 
                onMouseDown={(e) => {
                   e.stopPropagation();
                   const startW = element.w;
                   const startH = element.h;
                   const startX = e.clientX;
                   const startY = e.clientY;
                   
                   const onMouseMove = (moveE: MouseEvent) => {
                      updateElementSize(element.id, startW + (moveE.clientX - startX), startH + (moveE.clientY - startY));
                   };
                   const onMouseUp = () => {
                      window.removeEventListener('mousemove', onMouseMove);
                      window.removeEventListener('mouseup', onMouseUp);
                      addToHistory(pages);
                   };
                   window.addEventListener('mousemove', onMouseMove);
                   window.addEventListener('mouseup', onMouseUp);
                }}
             >
                <div className="w-1 h-1 bg-white/40 rounded-full" />
             </div>
             <div className="absolute -top-3 -left-3 px-2 py-0.5 bg-primary text-white text-[7px] font-black uppercase rounded shadow-sm">
                {element.type}
             </div>
          </>
       )}
    </div>
  );
}

function LayerItem({ element, canvasElements, depth = 0, selectedElementIds, setSelectedElementIds }: any) {
  const children = canvasElements.filter((el: any) => el.parentId === element.id);
  const isSelected = selectedElementIds.includes(element.id);

  return (
    <div className="space-y-1">
      <button 
        onClick={(e) => {
           if (e.metaKey || e.ctrlKey) {
              setSelectedElementIds((prev: string[]) => 
                prev.includes(element.id) 
                  ? prev.filter(id => id !== element.id) 
                  : [...prev, element.id]
              );
           } else {
              setSelectedElementIds([element.id]);
           }
        }}
        className={cn(
          "w-full flex items-center gap-3 py-2.5 px-4 rounded-xl transition-all group",
          isSelected ? "bg-primary text-white shadow-lg shadow-primary/20" : "hover:bg-primary/5 text-foreground/60"
        )}
        style={{ paddingLeft: `${(depth + 1) * 16}px` }}
      >
        <div className={cn(
          "w-5 h-5 rounded-lg flex items-center justify-center transition-all",
          isSelected ? "bg-white/20" : "bg-primary/5 group-hover:bg-primary/10"
        )}>
           <Layers size={10} className={cn(isSelected ? "text-white" : "text-primary/40")} />
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest truncate">{element.label}</span>
      </button>
      {children.length > 0 && (
        <div className="space-y-1">
          {children.map((child: any) => (
            <LayerItem 
              key={child.id} 
              element={child} 
              canvasElements={canvasElements} 
              depth={depth + 1}
              selectedElementIds={selectedElementIds}
              setSelectedElementIds={setSelectedElementIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AlignmentButton({ onClick, icon: Icon, label, className }: any) {
  return (
    <button 
      onClick={onClick}
      title={label}
      className={cn(
        "h-8 w-8 rounded-xl flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition-all",
        className
      )}
    >
      <Icon size={14} />
    </button>
  );
}

function TranscriptLine({ speaker, text, status }: { speaker: string, text: string, status?: "running" }) {
  return (
    <div className="space-y-1">
       <div className="flex items-center justify-between">
          <span className={cn(
             "text-[9px] font-black uppercase tracking-widest",
             speaker === "Agent" ? "text-primary" : speaker === "Customer" ? "text-muted-foreground/60" : "text-emerald-500"
          )}>{speaker}</span>
          {status === "running" && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
       </div>
       <p className={cn(
          "text-xs font-medium leading-relaxed",
          speaker === "System" ? "text-emerald-500/80 " : "text-foreground/80"
       )}>{text}</p>
    </div>
  );
}

function InsuranceClaimNexus() {
  return (
    <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
       {/* Claim Header */}
       <div className="h-16 border-b border-border/40 bg-card px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <ShieldCheck size={18} className="text-emerald-500" />
             </div>
             <div className="flex items-center gap-3">
                <h3 className="text-sm font-black uppercase tracking-widest">Claim ID: CLM-88902-X</h3>
                <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase">In Review</span>
             </div>
          </div>
          <div className="flex items-center gap-3">
             <Button variant="ghost" size="sm" className="text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-primary">Download Report</Button>
             <Button size="sm" className="h-8 rounded-lg bg-primary text-primary-foreground text-[9px] font-black uppercase tracking-widest px-6 shadow-lg shadow-primary/20">
                Decision Required
             </Button>
          </div>
       </div>

       <div className="flex-1 flex overflow-hidden">
          {/* Main Content Area */}
          <div className="flex-1 p-8 space-y-8 overflow-y-auto custom-scrollbar">
             <div className="grid grid-cols-3 gap-6">
                <div className="col-span-2 space-y-8">
                   {/* Loss Details */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">Occurrence & Loss Details</h4>
                      <div className="p-6 bg-card/40 border border-border/40 rounded-2xl space-y-6">
                         <div className="grid grid-cols-2 gap-8">
                            <DataField label="Date of Loss" value="May 12, 2024" />
                            <DataField label="Type of Loss" value="Collision / Property Damage" />
                            <DataField label="Est. Repair Cost" value="$12,450.00" />
                            <DataField label="Deductible" value="$500.00" />
                         </div>
                         <div className="space-y-2">
                            <label className="text-[9px] font-black uppercase text-muted-foreground/30 ml-1">Incident Description</label>
                            <div className="p-4 bg-muted/5 rounded-xl text-xs font-medium leading-relaxed  text-foreground/70 border border-border/10">
                               "Vehicle was traveling north on Highway 101 when a deer crossed the road. Driver attempted to swerve but impacted the guardrail and the animal. Significant front-end damage sustained."
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Digital Evidence */}
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30 px-1">Digital Evidence</h4>
                      <div className="grid grid-cols-4 gap-4">
                         {[1,2,3,4].map(i => (
                           <div key={i} className="aspect-square rounded-xl bg-muted/10 border border-border/40 flex items-center justify-center group hover:border-primary/40 transition-all cursor-pointer relative overflow-hidden">
                              <ImageIcon size={24} className="text-muted-foreground/20 group-hover:text-primary/40 transition-all" />
                              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                           </div>
                         ))}
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   {/* AI Fraud Intelligence */}
                   <div className="p-6 bg-primary/5 border border-primary/20 rounded-2xl space-y-4 shadow-xl shadow-primary/5">
                      <div className="flex items-center justify-between">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Fraud Risk Score</h4>
                         <CustomActivityIcon size={14} className="text-primary" />
                      </div>
                      <div className="flex flex-col items-center py-4">
                         <span className="text-4xl font-black text-primary tracking-tight">12/100</span>
                         <span className="text-[9px] font-black uppercase text-emerald-500 mt-2">Low Risk Detected</span>
                      </div>
                      <div className="space-y-2">
                         <div className="flex items-center justify-between text-[10px] font-bold opacity-60">
                            <span>Identity Match</span>
                            <span className="text-emerald-500">99%</span>
                         </div>
                         <div className="flex items-center justify-between text-[10px] font-bold opacity-60">
                            <span>Prior Claims</span>
                            <span>None</span>
                         </div>
                         <div className="flex items-center justify-between text-[10px] font-bold opacity-60">
                            <span>Location Sync</span>
                            <span className="text-emerald-500">Match</span>
                         </div>
                      </div>
                   </div>

                   {/* Policy Status */}
                   <div className="p-6 border border-border/40 rounded-2xl space-y-4 bg-card">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/30">Policy Verification</h4>
                      <div className="space-y-3">
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground/40">Status</span>
                            <span className="text-xs font-bold text-emerald-500 uppercase">In Force</span>
                         </div>
                         <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-muted-foreground/40">Premium Status</span>
                            <span className="text-xs font-bold">Paid Current</span>
                         </div>
                         <div className="h-px bg-border/10" />
                         <Button variant="outline" className="w-full h-8 rounded-lg text-[9px] font-black uppercase tracking-widest">View Policy Docs</Button>
                      </div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}

function BankKycOnboarding() {
  return (
    <div className="flex-1 flex flex-col h-full bg-muted/5 items-center justify-center p-12 overflow-hidden">
       <div className="w-full max-w-4xl bg-background border border-border/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
          {/* Progress Stepper */}
          <div className="h-2 border-b border-border/40 flex">
             <div className="w-1/4 h-full bg-primary" />
             <div className="w-1/4 h-full bg-primary" />
             <div className="w-1/4 h-full bg-primary/20" />
             <div className="w-1/4 h-full bg-muted/5" />
          </div>

          <div className="flex-1 flex overflow-hidden">
             {/* Sidebar Steps */}
             <div className="w-[280px] bg-muted/5 border-r border-border/40 p-8 space-y-8">
                <div className="space-y-1">
                   <h3 className="text-lg font-black tracking-tight">Onboarding</h3>
                   <p className="text-[10px] text-muted-foreground/40 font-bold uppercase tracking-widest ">New Account Setup</p>
                </div>

                <div className="space-y-4">
                   <StepItem number={1} title="Identity Info" status="complete" />
                   <StepItem number={2} title="Employment" status="complete" />
                   <StepItem number={3} title="KYC Verification" status="active" />
                   <StepItem number={4} title="Initial Deposit" status="pending" />
                </div>
             </div>

             {/* Form Area */}
             <div className="flex-1 p-12 space-y-10 overflow-y-auto custom-scrollbar">
                <div className="space-y-2">
                   <h2 className="text-2xl font-black tracking-tight text-primary">Identity & Compliance</h2>
                   <p className="text-sm text-muted-foreground/60 font-medium">Please provide your government issued identification and verify your details.</p>
                </div>

                <div className="space-y-8">
                   <div className="grid grid-cols-2 gap-6">
                      <PropertyField label="Identification Type" type="select" options={["Passport", "Driver's License", "National ID"]} value="Passport" />
                      <PropertyField label="ID Number" value="P-988221004" />
                   </div>

                   <div className="p-8 border border-dashed border-primary/20 rounded-3xl bg-primary/5 flex flex-col items-center justify-center space-y-4 group hover:bg-primary/10 transition-all cursor-pointer">
                      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20">
                         <CloudUpload size={32} className="text-primary/40 group-hover:text-primary transition-all" />
                      </div>
                      <div className="text-center">
                         <p className="text-xs font-bold">Upload Passport Document</p>
                         <p className="text-[10px] text-muted-foreground/40 mt-1 uppercase font-black tracking-widest">PDF, JPG, or PNG (Max 10MB)</p>
                      </div>
                   </div>

                   <div className="flex items-center gap-4 pt-6">
                      <Button variant="ghost" className="h-12 px-8 rounded-xl text-[10px] font-black uppercase tracking-widest">Previous Step</Button>
                      <Button className="h-12 flex-1 rounded-xl bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest shadow-xl shadow-primary/20">
                         Verify & Continue
                      </Button>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  );
}


// End of redundant block removal

function InspectorTabButton({ active, onClick, label }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all relative border-b-2",
        active ? "text-primary border-primary bg-primary/5" : "text-muted-foreground/40 border-transparent hover:text-foreground/60"
      )}
    >
      {label}
    </button>
  );
}

function InspectorGroup({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="space-y-4">
       <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border/20" />
          <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 whitespace-nowrap">{title}</span>
          <div className="h-px flex-1 bg-border/20" />
       </div>
       <div className="space-y-4">
          {children}
       </div>
    </div>
  );
}

function PropertyField({ label, value, type = "text", options, isCode, icon: Icon, prefix, onChange, className }: any) {
  return (
    <div className={cn("space-y-1.5", className)}>
       {label && (
         <div className="flex items-center justify-between">
            <label className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground/30 ml-1">{label}</label>
            {isCode && <Zap size={10} className="text-primary" />}
         </div>
       )}
       <div className="relative group">
          {type === "select" ? (
            <div className="relative">
              <select 
                 value={value}
                 onChange={(e) => onChange(e.target.value)}
                 className="w-full bg-muted/10 border border-border/40 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-primary/10 appearance-none transition-all cursor-pointer hover:bg-muted/20"
              >
                 {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
              <ChevronDown size={10} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none" />
            </div>
          ) : type === "color" ? (
            <div className="flex items-center gap-2 bg-muted/10 border border-border/40 rounded-xl p-1.5 hover:bg-muted/20 transition-all">
               <div className="relative w-6 h-6 rounded-lg border border-border/40 overflow-hidden shrink-0 shadow-inner">
                  <input 
                    type="color" 
                    value={value || "#000000"} 
                    onChange={(e) => onChange(e.target.value)}
                    className="absolute -inset-2 w-[200%] h-[200%] cursor-pointer"
                  />
               </div>
               <input 
                 type="text" 
                 value={value || "#000000"} 
                 onChange={(e) => onChange(e.target.value)}
                 className="bg-transparent border-0 text-[10px] font-black uppercase tracking-widest w-full outline-none"
               />
            </div>
          ) : type === "icon" ? (
            <div className="flex items-center gap-2 p-1 bg-muted/10 border border-border/40 rounded-xl overflow-x-auto custom-scrollbar no-scrollbar">
               {ICON_LIBRARY.slice(0, 8).map(item => (
                 <button 
                   key={item.id} 
                   onClick={() => onChange(item.label)}
                   className={cn(
                     "p-2 rounded-lg transition-all shrink-0",
                     item.label === value ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-muted-foreground/40 hover:bg-primary/5 hover:text-primary"
                   )}
                 >
                   <item.icon size={14} />
                 </button>
               ))}
            </div>
          ) : (
            <div className="relative flex items-center">
               {Icon && <Icon size={12} className="absolute left-3 text-muted-foreground/30 group-focus-within:text-primary transition-colors" />}
               {prefix && <span className="absolute left-3 text-[10px] font-black text-muted-foreground/20 uppercase tracking-widest group-focus-within:text-primary/40 transition-colors">{prefix}</span>}
               <input 
                  type={type === "number" ? "number" : "text"} 
                  value={value || ""} 
                  onChange={(e) => onChange(type === "number" ? parseFloat(e.target.value) : e.target.value)}
                  className={cn(
                    "w-full bg-muted/10 border border-border/40 rounded-xl px-3 py-2 text-xs font-bold transition-all focus:border-primary/40 focus:ring-2 focus:ring-primary/10 outline-none hover:bg-muted/20",
                    isCode ? "text-primary border-primary/20 font-mono" : "text-foreground",
                    (Icon || prefix) && "pl-8"
                  )}
               />
               {isCode && <div className="absolute right-3 w-1 h-1 rounded-full bg-primary animate-pulse" />}
            </div>
          )}
       </div>
    </div>
  );
}

function EventField({ label, action, target }: any) {
  return (
    <div className="p-4 bg-muted/10 border border-border/40 rounded-xl space-y-3 group hover:border-primary/20 transition-all">
       <div className="flex items-center justify-between">
          <span className="text-[10px] font-black text-primary uppercase">{label}</span>
          <Settings2 size={12} className="text-muted-foreground/20 group-hover:text-primary transition-colors" />
       </div>
       <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-medium text-muted-foreground/40">Action</span>
             <span className="text-xs font-bold">{action}</span>
          </div>
          <ArrowRight size={14} className="text-muted-foreground/20" />
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-medium text-muted-foreground/40">Target</span>
             <span className="text-xs font-bold text-primary">{target}</span>
          </div>
       </div>
    </div>
  );
}

// Activity icon for Chart
function CustomActivityIcon({ size, className }: any) {
  return (
     <svg 
        width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}
     >
        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
     </svg>
  );
}

function PageContextMenu({ x, y, pageId, onSetMain, onClose }: { x: number, y: number, pageId: string, onSetMain: (id: string) => void, onClose: () => void }) {
  return createPortal(
    <div 
      className="fixed z-[9999] bg-card border border-border/40 rounded-2xl shadow-2xl p-1.5 min-w-[200px] animate-in fade-in zoom-in-95 duration-200"
      style={{ left: x, top: y }}
      onClick={(e) => e.stopPropagation()}
    >
      <button 
        onClick={() => onSetMain(pageId)}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary/5 text-muted-foreground/60 hover:text-primary transition-all group"
      >
        <Home size={14} className="group-hover:scale-110 transition-transform" />
        <span className="text-xs font-black uppercase tracking-widest">Set as Main Page</span>
      </button>
      <div className="h-px bg-border/20 my-1 mx-2" />
      <button 
        onClick={onClose}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/40 text-muted-foreground/40 transition-all group"
      >
        <Zap size={14} />
        <span className="text-xs font-black uppercase tracking-widest">Cancel</span>
      </button>
    </div>,
    document.body
  );
}
