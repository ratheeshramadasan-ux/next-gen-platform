"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Database, 
  Table as TableIcon, 
  Zap, 
  Search, 
  Plus, 
  Filter, 
  Download, 
  Upload, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  MoreVertical, 
  Layers, 
  Globe, 
  ShieldCheck, 
  Code2, 
  Bot, 
  ArrowRight, 
  Trash2, 
  Copy, 
  FileJson, 
  FileCode, 
  History, 
  Sparkles,
  Link2,
  Activity,
  AlertCircle,
  CheckCircle2,
  Box,
  Terminal,
  Grid3X3,
  ListFilter,
  Eye,
  Edit3,
  Server
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useAppContext } from "@/lib/context";

/* ======================================================================
   TYPES & CONSTANTS
   ====================================================================== */

type ViewMode = "dashboard" | "table-builder" | "data-explorer" | "query-library" | "external-db";
type DataScope = "project" | "global";

interface DataColumn {
  id: string;
  name: string;
  displayName: string;
  type: "Text" | "Number" | "Boolean" | "Date" | "DateTime" | "JSON" | "Lookup" | "Currency" | "Email";
  isNullable: boolean;
  isUnique: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
}

interface DataTable {
  id: string;
  name: string;
  displayName: string;
  description: string;
  scope: DataScope;
  columns: DataColumn[];
  rowCount: number;
  lastModified: string;
  status: "Draft" | "Active" | "Deprecated" | "Archived";
}

interface SavedQuery {
  id: string;
  name: string;
  description: string;
  scope: DataScope;
  sql: string;
  parameters: { name: string; type: string }[];
  lastExecuted: string;
}

/* ======================================================================
   MOCK DATA
   ====================================================================== */

export const MOCK_TABLES: DataTable[] = [
  { 
    id: "t1", name: "LoanApplications", displayName: "Loan Applications", scope: "project", rowCount: 1250, lastModified: "2 hours ago", status: "Active",
    description: "Captures all incoming loan requests and their current processing stage.",
    columns: [
      { id: "c1", name: "id", displayName: "Application ID", type: "Text", isPrimaryKey: true, isNullable: false, isUnique: true },
      { id: "c2", name: "amount", displayName: "Loan Amount", type: "Currency", isPrimaryKey: false, isNullable: false, isUnique: false },
      { id: "c3", name: "status", displayName: "Status", type: "Text", isPrimaryKey: false, isNullable: false, isUnique: false }
    ]
  },
  { 
    id: "t2", name: "CustomerProfiles", displayName: "Customer Profiles", scope: "global", rowCount: 45200, lastModified: "1 day ago", status: "Active",
    description: "Master database for customer identities and historical credit records.",
    columns: [
      { id: "c4", name: "id", displayName: "Customer ID", type: "Text", isPrimaryKey: true, isNullable: false, isUnique: true },
      { id: "c5", name: "creditScore", displayName: "Credit Score", type: "Number", isPrimaryKey: false, isNullable: false, isUnique: false }
    ]
  }
];

const MOCK_QUERIES: SavedQuery[] = [];

/* ======================================================================
   MAIN COMPONENT
   ====================================================================== */

export function DataEngine({ 
  projectId, 
  initialScope = "project",
  isGlobalGovernance = false 
}: { 
  projectId?: string | null;
  initialScope?: DataScope;
  isGlobalGovernance?: boolean;
}) {
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === "Platform Admin" || currentUser?.role === "Tenant Admin";
  
  const [activeView, setActiveView] = useState<ViewMode>("dashboard");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [currentScope, setCurrentScope] = useState<DataScope>(initialScope);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    project: true,
    global: true,
    queries: true,
    external: false
  });

  const selectedTable = useMemo(() => 
    MOCK_TABLES.find(t => t.id === selectedTableId), 
  [selectedTableId]);

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const handleTableView = (id: string) => {
    setSelectedTableId(id);
    setActiveView("data-explorer");
  };

  return (
    <div className="w-full h-full flex bg-background overflow-hidden animate-in fade-in duration-500">
      {/* ── Left Sidebar: Navigator ── */}
      <aside className={cn(
        "border-r border-border/40 bg-card/40 backdrop-blur-3xl flex flex-col transition-all duration-300",
        isSidebarCollapsed ? "w-16" : "w-[280px]"
      )}>
        <div className="h-14 flex items-center justify-between px-4 border-b border-border/40">
          {!isSidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center border border-primary/20">
                <Database size={16} className="text-primary" />
              </div>
              <span className="text-sm font-black uppercase tracking-widest text-foreground/80">Navigator</span>
            </div>
          )}
          <Button 
            variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground/40 hover:text-primary"
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          >
            <ChevronRight size={16} className={cn("transition-transform", !isSidebarCollapsed && "rotate-180")} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-6">
          {/* Project Tables - only if not in Global Governance mode */}
          {!isGlobalGovernance && (
            <NavGroup 
              title="Project Data" 
              icon={Layers} 
              isCollapsed={isSidebarCollapsed} 
              isExpanded={expandedGroups.project}
              onToggle={() => toggleGroup("project")}
              items={MOCK_TABLES.filter(t => t.scope === "project")}
              activeId={selectedTableId}
              onSelect={(id: string) => { handleTableView(id); setCurrentScope("project"); }}
              color="text-primary"
            />
          )}

          {/* Global Tables */}
          <NavGroup 
            title="Global Module" 
            icon={Globe} 
            isCollapsed={isSidebarCollapsed} 
            isExpanded={expandedGroups.global}
            onToggle={() => toggleGroup("global")}
            items={MOCK_TABLES.filter(t => t.scope === "global")}
            activeId={selectedTableId}
            onSelect={(id: string) => { handleTableView(id); setCurrentScope("global"); }}
            color="text-primary"
          />

          {/* Saved Queries */}
          <NavGroup 
            title="Query Library" 
            icon={Zap} 
            isCollapsed={isSidebarCollapsed} 
            isExpanded={expandedGroups.queries}
            onToggle={() => toggleGroup("queries")}
            items={MOCK_QUERIES}
            activeId={null}
            onSelect={() => setActiveView("query-library")}
            color="text-primary"
          />

          {/* External Databases */}
          <NavGroup 
            title="External Sources" 
            icon={Server} 
            isCollapsed={isSidebarCollapsed} 
            isExpanded={expandedGroups.external}
            onToggle={() => toggleGroup("external")}
            items={[]}
            activeId={null}
            onSelect={() => setActiveView("external-db")}
            color="text-primary"
          />
        </div>

        <div className="p-3 border-t border-border/40">
           <Button variant="ghost" className="w-full justify-start gap-3 h-10 px-3 text-muted-foreground/40 hover:text-primary transition-colors rounded-xl group/settings">
              <Settings size={18} className="group-hover/settings:text-primary transition-colors" />
              {!isSidebarCollapsed && <span className="text-xs font-bold uppercase tracking-widest">Data Settings</span>}
           </Button>
        </div>
      </aside>

      {/* ── Main Workspace ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Workspace Header */}
        <header className="h-14 border-b border-border/40 bg-card/20 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black tracking-tight flex items-center gap-3">
              {activeView === "dashboard" && "Data Engine Dashboard"}
              {activeView === "table-builder" && "New Table Wizard"}
              {activeView === "data-explorer" && selectedTable?.displayName}
              {activeView === "query-library" && "Saved Query Library"}
              {activeView === "external-db" && "External Integrations"}
            </h1>
            {selectedTable && (
              <div className={cn(
                "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border",
                selectedTable.scope === "global" ? "bg-amber-500/10 text-amber-500 border-amber-500/20" : "bg-primary/10 text-primary border-primary/20"
              )}>
                {selectedTable.scope}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="relative group hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 group-focus-within:text-primary transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Search tables, queries, or records..."
                className="bg-muted/10 border border-border/40 rounded-full pl-9 pr-4 py-1.5 text-xs w-64 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-all"
              />
            </div>
            <div className="h-6 w-px bg-border/20" />
            <Button size="sm" variant="outline" className="h-8 gap-2 border-border/40 text-[10px] font-black uppercase tracking-widest px-4 rounded-full shadow-sm">
              <Download size={12} /> Export
            </Button>
            <Button size="sm" variant="outline" className="h-8 gap-2 border-border/40 text-[10px] font-black uppercase tracking-widest px-4 rounded-full shadow-sm">
              <Upload size={12} /> Import
            </Button>
            
            {(currentScope === "project" || (isGlobalGovernance && isAdmin)) && (
              <Button 
                size="sm" 
                className="h-9 gap-2 bg-primary text-primary-foreground hover:opacity-90 text-[10px] font-black uppercase tracking-widest px-5 rounded-full shadow-lg shadow-primary/20"
                onClick={() => setActiveView("table-builder")}
              >
                <Plus size={14} /> New Table
              </Button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
           <AnimatePresence mode="wait">
              {activeView === "dashboard" && (
                <DashboardView key="dashboard" onTableSelect={handleTableView} />
              )}
              {activeView === "table-builder" && (
                <TableBuilderView key="table-builder" onCancel={() => setActiveView("dashboard")} />
              )}
              {activeView === "data-explorer" && selectedTable && (
                <DataExplorerView key="data-explorer" table={selectedTable} isAdmin={isAdmin} isGlobalGovernance={isGlobalGovernance} />
              )}
              {activeView === "query-library" && (
                <QueryLibraryView key="query-library" />
              )}
              {activeView === "external-db" && (
                <div key="external-db" className="flex flex-col items-center justify-center h-full gap-4 opacity-40 ">
                   <Server size={48} />
                   <span>External database integration coming soon</span>
                </div>
              )}
           </AnimatePresence>
        </div>

        {/* AI Bottom Rail */}
        <div className="h-16 border-t border-border/40 bg-card/40 backdrop-blur-2xl flex items-center px-8 gap-6 shrink-0 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary/40" />
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                <Bot size={20} className="text-primary" />
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest">Data AI Assistant</span>
                <span className="text-xs font-bold text-foreground/60">Ask me to generate queries or relationships</span>
             </div>
          </div>
          <div className="flex-1 relative max-w-2xl">
             <Sparkles size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40" />
             <input 
                type="text" 
                placeholder="e.g., 'Show me all leads created in the last 7 days with a score over 50'"
                className="w-full bg-background/50 border border-primary/20 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/20 "
             />
          </div>
          <Button variant="ghost" size="sm" className="h-10 px-6 gap-2 text-primary hover:bg-primary/5 text-xs font-black uppercase tracking-widest border border-primary/10 rounded-xl" onClick={() => toast.info("AI Query Generation is initializing...")}>
             Generate Query
          </Button>
        </div>
      </main>
    </div>
  );
}

/* ======================================================================
   SUB-VIEWS
   ====================================================================== */

function DashboardView({ onTableSelect }: { onTableSelect: (id: string) => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
      className="space-y-10"
    >
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard title="Total Tables" value={0} icon={Grid3X3} color="primary" />
        <StatsCard title="Saved Queries" value={0} icon={Zap} color="primary" />
        <StatsCard title="External Connections" value={0} icon={Server} color="primary" />
        <StatsCard title="Data Records" value={0} icon={Activity} color="primary" />
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black tracking-tight flex items-center gap-3">
            <History size={18} className="text-primary/60" />
            Recent Data Activity
          </h2>
          <Button variant="ghost" className="text-xs font-bold text-primary">View Full Audit Log</Button>
        </div>
        
        <div className="bg-card/40 border border-border/40 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left">
            <thead className="bg-muted/10 border-b border-border/40">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Resource Name</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Action</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Performed By</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Timestamp</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              <tr className="hover:bg-muted/5 transition-colors group cursor-pointer">
                <td colSpan={5} className="px-6 py-20 text-center">
                   <div className="flex flex-col items-center gap-3 opacity-20">
                      <History size={32} />
                      <span className="text-[10px] font-black uppercase tracking-widest">No activity history found</span>
                   </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}

function TableBuilderView({ onCancel }: { onCancel: () => void }) {
  const [step, setStep] = useState(1);
  const [tableName, setTableName] = useState("");
  const [columns, setColumns] = useState<Partial<DataColumn>[]>([
    { id: "1", name: "id", displayName: "ID", type: "Text", isPrimaryKey: true, isNullable: false, isUnique: true }
  ]);

  const addColumn = () => {
    setColumns([...columns, { id: Math.random().toString(), name: "", displayName: "", type: "Text" }]);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-black tracking-tight">Create New Data Structure</h2>
          <p className="text-xs text-muted-foreground/60  font-medium">Follow the wizard to define your custom project table.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             {[1, 2, 3].map(i => (
                <div key={i} className={cn("w-8 h-1.5 rounded-full transition-all", step >= i ? "bg-primary shadow-[0_0_8px_rgba(var(--primary),0.4)]" : "bg-muted/20")} />
             ))}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">Step {step} of 3</span>
        </div>
      </div>

      <div className="bg-card/40 border border-border/40 rounded-2xl overflow-hidden shadow-2xl">
         {step === 1 && (
           <div className="p-10 space-y-10 animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-center gap-6">
                 <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                    <Database size={40} className="text-primary" />
                 </div>
                 <div className="space-y-6 flex-1">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Internal Table Name</label>
                       <input 
                          type="text" value={tableName} onChange={e => setTableName(e.target.value)}
                          placeholder="e.g. CustomerLeads"
                          className="w-full bg-background border border-border/40 rounded-xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Business Display Name</label>
                       <input 
                          type="text" 
                          placeholder="e.g. Marketing Leads"
                          className="w-full bg-background border border-border/40 rounded-xl px-5 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 transition-all outline-none"
                       />
                    </div>
                 </div>
              </div>
              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Definition & Purpose</label>
                 <textarea 
                    placeholder="Describe what this data will be used for..."
                    className="w-full h-32 bg-background border border-border/40 rounded-2xl px-5 py-4 text-sm outline-none focus:ring-2 focus:ring-primary/10 resize-none  leading-relaxed"
                 />
              </div>
           </div>
         )}

         {step === 2 && (
           <div className="p-8 space-y-6 animate-in fade-in slide-in-from-right-2">
              <div className="flex items-center justify-between">
                 <h3 className="text-sm font-bold text-foreground tracking-tight">Define Columns (Schema)</h3>
                 <Button size="sm" variant="outline" className="h-8 gap-2 border-primary/20 text-primary text-[10px] font-black" onClick={addColumn}>
                    <Plus size={12} /> Add Field
                 </Button>
              </div>
              <div className="space-y-3">
                 {columns.map((col, idx) => (
                    <div key={col.id} className="grid grid-cols-12 gap-3 p-4 bg-background/40 border border-border/40 rounded-xl items-center group/field">
                       <div className="col-span-1 text-[10px] font-black text-muted-foreground/20 text-center">{idx + 1}</div>
                       <div className="col-span-4">
                          <input type="text" placeholder="Field Name" value={col.name} className="w-full bg-transparent border-none outline-none text-xs font-bold" />
                       </div>
                       <div className="col-span-3">
                          <select className="w-full bg-muted/20 rounded-lg px-3 py-1.5 text-xs font-bold outline-none">
                             <option>Text</option>
                             <option>Number</option>
                             <option>Boolean</option>
                             <option>Date</option>
                             <option>Lookup</option>
                          </select>
                       </div>
                       <div className="col-span-3 flex items-center gap-4">
                          <div className="flex items-center gap-2">
                             <div className={cn("w-3 h-3 rounded-sm border border-primary/40 flex items-center justify-center", col.isPrimaryKey && "bg-primary")} />
                             <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">PK</span>
                          </div>
                          <div className="flex items-center gap-2">
                             <div className={cn("w-3 h-3 rounded-sm border border-primary/40 flex items-center justify-center")} />
                             <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Nullable</span>
                          </div>
                       </div>
                       <div className="col-span-1 text-right">
                          <button className="p-2 text-muted-foreground/20 hover:text-rose-500 opacity-0 group-hover/field:opacity-100 transition-all"><Trash2 size={14} /></button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
         )}

         <div className="bg-muted/10 border-t border-border/40 p-6 flex items-center justify-between">
            <Button variant="ghost" className="h-10 px-8 text-xs font-black uppercase tracking-widest text-muted-foreground/40 hover:text-foreground" onClick={onCancel}>
               Discard Changes
            </Button>
            <div className="flex items-center gap-3">
               {step > 1 && (
                 <Button variant="outline" className="h-10 px-8 text-xs font-black uppercase tracking-widest border-border/40" onClick={() => setStep(step - 1)}>
                    Previous
                 </Button>
               )}
               <Button 
                className="h-10 px-10 gap-3 bg-primary text-primary-foreground text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20"
                onClick={() => step < 2 ? setStep(step + 1) : onCancel()}
               >
                  {step === 2 ? "Publish Table" : "Next Step"}
                  <ArrowRight size={14} />
               </Button>
            </div>
         </div>
      </div>
    </motion.div>
  );
}

function DataExplorerView({ table, isAdmin, isGlobalGovernance }: { table: DataTable, isAdmin: boolean, isGlobalGovernance: boolean }) {
  const [view, setView] = useState<'Grid' | 'SQL'>('Grid');
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="space-y-6 h-full flex flex-col"
    >
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-8">
           <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Total Records</span>
              <span className="text-2xl font-black">{table.rowCount.toLocaleString()}</span>
           </div>
           <div className="h-8 w-px bg-border/20" />
           <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Active Relationships</span>
              <span className="text-2xl font-black">2</span>
           </div>
           <div className="h-8 w-px bg-border/20" />
           <div className="flex flex-col gap-0.5">
              <span className="text-[9px] font-black text-muted-foreground/40 uppercase tracking-widest">Health Score</span>
              <div className="flex items-center gap-2">
                 <span className="text-2xl font-black text-emerald-500">-</span>
              </div>
           </div>
        </div>
        
        <div className="flex items-center gap-2">
           <div className="bg-muted/10 border border-border/40 rounded-xl p-1 flex">
              <button className="px-3 py-1.5 bg-background border border-border/40 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                 <TableIcon size={12} /> Grid View
              </button>
              <button className="px-3 py-1.5 text-muted-foreground/40 hover:text-foreground text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                 <Terminal size={12} /> SQL View
              </button>
           </div>
           {(table.scope === 'project' || (isGlobalGovernance && isAdmin)) && (
              <Button className="h-9 gap-2 bg-primary text-primary-foreground hover:opacity-90 text-[10px] font-black uppercase tracking-widest px-4 rounded-xl shadow-lg shadow-primary/20">
                <Plus size={14} /> Add Record
              </Button>
           )}
        </div>
      </div>

      <div className="flex-1 bg-card/40 border border-border/40 rounded-2xl shadow-xl overflow-hidden flex flex-col">
         <div className="bg-muted/10 border-b border-border/40 p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border/40 rounded-lg text-[10px] font-bold text-muted-foreground/60">
                  <Filter size={12} />
                  Filters (0)
               </div>
               <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border/40 rounded-lg text-[10px] font-bold text-muted-foreground/60">
                  <ListFilter size={12} />
                  Sort: Default
               </div>
            </div>
            <div className="text-[10px] font-bold text-muted-foreground/30 ">
               Showing 1 - 50 of {table.rowCount} entries
            </div>
         </div>
         <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
               <thead className="bg-muted/5 border-b border-border/10 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                     {table.columns.map(col => (
                       <th key={col.id} className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                             <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">{col.displayName}</span>
                             <span className="text-[8px] font-bold text-primary/40 tracking-tight">{col.type} {col.isPrimaryKey ? '• PK' : ''}</span>
                          </div>
                       </th>
                     ))}
                     <th className="px-6 py-4 text-right text-[10px] font-black uppercase text-muted-foreground/20">Actions</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border/5">
                  <tr>
                    <td colSpan={table.columns.length + 1} className="px-6 py-40 text-center">
                       <div className="flex flex-col items-center gap-4 opacity-10">
                          <Box size={48} />
                          <p className="text-xs font-bold uppercase tracking-widest ">This table contains no records yet</p>
                       </div>
                    </td>
                  </tr>
               </tbody>
            </table>
         </div>
      </div>
    </motion.div>
  );
}

function QueryLibraryView() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {MOCK_QUERIES.map(query => (
            <div key={query.id} className="bg-card/40 border border-border/40 rounded-2xl p-6 space-y-4 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 transition-all group">
               <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 text-primary group-hover:scale-110 transition-all">
                     <FileCode size={20} />
                  </div>
                  <div className="px-2 py-1 rounded bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest border border-primary/20">
                     {query.scope}
                  </div>
               </div>
               <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{query.name}</h3>
                  <p className="text-[10px] text-muted-foreground/60 leading-relaxed ">{query.description}</p>
               </div>
               <div className="bg-background/40 rounded-xl p-4 font-mono text-[10px] text-muted-foreground/40 line-clamp-2  leading-relaxed border border-border/10">
                  {query.sql}
               </div>
               <div className="flex items-center justify-between pt-4 border-t border-border/10">
                  <div className="flex items-center gap-2">
                     <History size={10} className="text-muted-foreground/30" />
                     <span className="text-[9px] font-medium text-muted-foreground/30">{query.lastExecuted}</span>
                  </div>
                  <div className="flex items-center gap-1">
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/20 hover:text-primary"><Copy size={12} /></Button>
                     <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground/20 hover:text-primary"><Edit3 size={12} /></Button>
                  </div>
               </div>
            </div>
          ))}
          <button className="bg-primary/5 border border-dashed border-primary/20 rounded-2xl flex flex-col items-center justify-center p-8 gap-4 hover:bg-primary/10 hover:border-primary/40 transition-all group">
             <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-all">
                <Plus size={24} />
             </div>
             <div className="text-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">Define New Query</p>
                <p className="text-[9px] text-primary/30 mt-1 ">Use AI or manual SQL editor</p>
             </div>
          </button>
       </div>
    </motion.div>
  );
}

/* ======================================================================
   HELPERS
   ====================================================================== */

function NavGroup({ title, icon: Icon, isCollapsed, isExpanded, onToggle, items, activeId, onSelect, color }: any) {
  return (
    <div className="space-y-1">
      <button 
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-foreground/5 transition-all group/header",
          isCollapsed && "justify-center"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon size={16} className={cn("transition-colors", isExpanded ? color : "text-muted-foreground/40")} />
          {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 group-hover/header:text-foreground/80 transition-colors">{title}</span>}
        </div>
        {!isCollapsed && (
          <ChevronDown size={14} className={cn("text-muted-foreground/20 transition-transform", !isExpanded && "-rotate-90")} />
        )}
      </button>

      {isExpanded && !isCollapsed && (
        <div className="pl-6 space-y-1 animate-in slide-in-from-top-1 duration-300">
          {items.map((item: any) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold transition-all relative group/item",
                activeId === item.id ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground/40 hover:bg-foreground/5 hover:text-foreground/70"
              )}
            >
              <TableIcon size={14} className={cn("transition-colors", activeId === item.id ? "text-primary" : "text-muted-foreground/20 group-hover/item:text-muted-foreground/40")} />
              <span className="truncate">{item.displayName || item.name}</span>
              {activeId === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-primary rounded-full shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
              )}
            </button>
          ))}
          {items.length === 0 && (
            <div className="px-3 py-4 text-[10px] text-muted-foreground/20  font-medium">No assets created yet</div>
          )}
        </div>
      )}
    </div>
  );
}

function StatsCard({ title, value, icon: Icon, color }: any) {
  const style = { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary" };

  return (
    <div className="bg-card/40 border border-border/40 rounded-2xl p-6 space-y-4 shadow-xl hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] group">
      <div className="flex items-center justify-between">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 group-hover:scale-110 shadow-lg shadow-transparent group-hover:shadow-primary/20", style.bg, style.border, style.text)}>
          <Icon size={20} />
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
           <div className="w-1 h-1 rounded-full bg-primary animate-pulse" />
           <span className="text-[8px] font-black text-primary uppercase tracking-widest">Active</span>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/40">{title}</p>
        <p className="text-3xl font-black text-foreground tracking-tight group-hover:text-primary transition-colors">{value}</p>
      </div>
    </div>
  );
}
