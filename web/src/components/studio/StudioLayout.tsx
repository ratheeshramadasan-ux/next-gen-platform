"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import {
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  ChevronUp,
  ChevronDown,
  Play,
  Bug,
  Rocket,
  ArrowLeft,
  Settings,
  Bot,
  Sparkles,
  ChevronRight,
  Workflow,
  FolderOpen,
  FileText,
  Folder,
  Plus,
  Search,
  Clock,
  CheckCircle,
  Building2,
  Layers,
  Save,
  GitBranch,
  LayoutGrid,
  Download,
  Upload,
  Mail,
  PanelLeft,
  Activity,
  ClipboardCheck,
  Link2,
  Spline,
  Minus,
  Database,
  GlobeLock,
  ShieldCheck,
  History as HistoryIcon,
  Undo2,
  Redo2,
  type LucideIcon
} from "lucide-react";

import { ContextSwitcher } from "./ContextSwitcher";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAppContext } from "@/lib/context";
import {
  StudioToolbox,
  StudioInspector,
  StudioFolderPanel,
  StudioDock,
  FlowToolsPanel,
  FlowFormattingPanel
} from "./StudioPanels";

// Lazy-load monitoring and other heavier components
const StudioMonitoring = dynamic(() => import("./StudioMonitoring").then(m => m.StudioMonitoring), { ssr: false });
const QueueManager = dynamic(() => import("./queue/QueueManager").then(m => m.QueueManager), { ssr: false });
const DataEngine = dynamic(() => import("./data-engine/DataEngine").then(m => m.DataEngine), { ssr: false });
const AssetManager = dynamic(() => import("./assets/AssetManager").then(m => m.AssetManager), { ssr: false });

interface StudioLayoutProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  properties?: React.ReactNode;
  bottomDock?: React.ReactNode;
  toolboxLabel?: string;
  toolboxIcon?: LucideIcon;
  projectName: string;
  workflowName?: string;

  activeProjectId?: string | null;
  workspaceId?: string | null;
  folderId?: string | null;
  folderName?: string | null;
  onSave?: () => void;
  onRun?: () => void;
  onValidate?: () => void;
  onSelectFolder?: (folderId: string) => void;
  onWorkflowSelect?: (workflow: any) => void;
  createdBy?: string;
  modifiedBy?: string;
  lastModified?: string;
  lastSaved?: Date | null;
  onExport?: () => void;
  onImport?: (event: React.ChangeEvent<HTMLInputElement>) => void;

  isBusy?: boolean;
  onDeploy?: () => void;
  activeWorkflowId?: string | null;
  selectionActive?: boolean;
  activeEngine?: string;
  onEngineChange?: (engine: string) => void;
  onAlign?: (direction: string) => void;
  onDistribute?: (direction: string) => void;
  onAutoLayout?: () => void;
  onEdgeTypeChange?: (type: string) => void;
  activeEdgeType?: string;
  activeSelectionId?: string | null;
  onRunWorkflow?: (workflowId: string) => void;
  onDebugWorkflow?: (workflowId: string) => void;
  defaultTab?: string;
  studioLabel?: string;
  moduleName?: string;
  hiddenTabs?: string[];
  basePath?: string;
  backHref?: string;
  hideProjectPanel?: boolean;
  showBatchesTab?: boolean;
  activeSideTab?: string;
  onSideTabChange?: (tab: string) => void;
  hideSubHeader?: boolean;
  hideRightPanel?: boolean;
  hideBottomDock?: boolean;
}


export function StudioLayout({
  children,
  sidebar,
  properties,
  bottomDock,
  toolboxLabel = "Activities",
  toolboxIcon = Activity,
  projectName,
  workflowName,
  activeProjectId,
  workspaceId,
  folderId,
  folderName,
  onSave,
  onRun,
  onSelectFolder,
  onWorkflowSelect,
  createdBy,
  modifiedBy,
  lastModified,
  lastSaved,
  onExport,
  onImport,
  isBusy = false,
  onDeploy,
  onValidate,
  activeWorkflowId,
  selectionActive = false,
  activeEngine = "react-flow",
  onEngineChange,
  onAlign,
  onDistribute,
  onAutoLayout,
  onEdgeTypeChange,
  activeEdgeType,
  activeSelectionId,
  onRunWorkflow,
  onDebugWorkflow,
  defaultTab = "studio",
  studioLabel = "Studio",
  moduleName = "Flow Studio",
  hiddenTabs = [],
  basePath,
  backHref = "/next-gen/studio",
  hideProjectPanel = false,
  showBatchesTab = false,
  activeSideTab: propActiveSideTab,
  onSideTabChange,
  hideSubHeader = false,
  hideRightPanel = false,
  hideBottomDock = false
}: StudioLayoutProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const isMounted = useRef(false);
  
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [folderState, setFolderState] = useState<"expanded" | "collapsed" | "hidden">("expanded");
  const [rightState, setRightState] = useState<"expanded" | "collapsed" | "hidden">("expanded");
  const [bottomSize, setBottomSize] = useState<"normal" | "hidden">("normal");
  const [internalActiveSideTab, setInternalActiveSideTab] = useState<string>(hideProjectPanel ? "activities" : "project");
  const activeSideTab = propActiveSideTab || internalActiveSideTab;
  
  const handleSideTabChange = (tab: string) => {
    if (onSideTabChange) {
      onSideTabChange(tab);
    } else {
      setInternalActiveSideTab(tab);
    }
  };

  const [activeRightSideTab, setActiveRightSideTab] = useState<"properties" | "flow-tool" | "flow-formatting">("properties");
  
  const [bottomHeight, setBottomHeight] = useState(240);
  const [isResizingBottom, setIsResizingBottom] = useState(false);
  
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);
  const [showSideNav, setShowSideNav] = useState(true);
  const { currentUser } = useAppContext();
  const isAdmin = currentUser?.role === 'Platform Admin';

  useEffect(() => {
    setMounted(true);
    isMounted.current = true;
    
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      isMounted.current = false;
    };
  }, []);

  const startResizingBottom = useCallback((e: React.MouseEvent) => {
    setIsResizingBottom(true);
    e.preventDefault();
  }, []);

  const stopResizingBottom = useCallback(() => {
    setIsResizingBottom(false);
  }, []);

  const resizeBottom = useCallback((e: MouseEvent) => {
    if (isResizingBottom) {
      const newHeight = window.innerHeight - e.clientY;
      if (newHeight > 100 && newHeight < 600) {
        setBottomHeight(newHeight);
      }
    }
  }, [isResizingBottom]);

  useEffect(() => {
    if (isResizingBottom) {
      window.addEventListener('mousemove', resizeBottom);
      window.addEventListener('mouseup', stopResizingBottom);
    }
    return () => {
      window.removeEventListener('mousemove', resizeBottom);
      window.removeEventListener('mouseup', stopResizingBottom);
    };
  }, [isResizingBottom, resizeBottom, stopResizingBottom]);

  if (!mounted) return null;

  const navTabs = [
    { id: 'studio', label: studioLabel, icon: Spline },
    { id: 'assets', label: 'Assets', icon: ShieldCheck },
    { id: 'queue', label: 'Queue', icon: Clock },
    { id: 'data-engine', label: 'Data Engine', icon: Database },
    { id: 'schedule', label: 'Schedule', icon: Rocket },
    { id: 'trigger', label: 'Trigger', icon: Sparkles },
    { id: 'connectors', label: 'Connectors', icon: Building2 },
    { id: 'published', label: 'Published', icon: FolderOpen },
    { id: 'monitoring', label: 'Monitoring', icon: Layers },
  ].filter(tab => !hiddenTabs.includes(tab.id.toLowerCase()));

  const leftSideRailTabs = [
    { id: 'project', label: 'Project Structure', icon: Folder },
    { id: 'activities', label: 'Activity Toolbox', icon: Activity },
    ...(showBatchesTab ? [{ id: 'batches', label: 'Batches', icon: Layers }] : []),
  ].filter(tab => !(hideProjectPanel && tab.id === 'project'));

  const rightSideRailTabs = [
    { id: 'properties', label: 'Properties', icon: Settings },
    { id: 'flow-tool', label: 'Flow Tools', icon: GitBranch },
    { id: 'flow-formatting', label: 'Formatting', icon: LayoutGrid },
  ];

  const headerScale = windowWidth < 1200 ? 0.85 : windowWidth < 1440 ? 0.92 : 1;
  const headerHeight = Math.max(40, 48 * headerScale);

  return (
    <div className="w-full h-full p-1 transition-all duration-300 overflow-hidden flex flex-col bg-background text-foreground font-sans">
      {/* ── Top Bar ── */}
      <header 
        className={cn(
          "m-0 rounded-sm border border-border/40 bg-muted/20 backdrop-blur-xl flex items-center justify-between shrink-0 z-40 shadow-xl transition-all duration-300",
          windowWidth < 1200 ? "px-2" : "px-5"
        )}
        style={{ height: `${headerHeight}px` }}
      >
        <div className="flex items-center gap-4">
          {/* Back button */}
          <a
            href={backHref}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-primary/5 transition-all group mr-1 relative z-50 cursor-pointer"
          >
            <div className="w-6 h-6 rounded-md bg-primary/5 flex items-center justify-center border border-primary/10 group-hover:bg-primary/10 transition-colors pointer-events-none">
              <ArrowLeft size={12 * (windowWidth < 1200 ? 0.85 : windowWidth < 1440 ? 0.92 : 1) + 2} className="text-muted-foreground/60 group-hover:text-primary" />
            </div>
            <span 
              className="font-black uppercase tracking-[0.2em] text-muted-foreground/60 group-hover:text-primary hidden sm:block pointer-events-none"
              style={{ fontSize: `${10 * (windowWidth < 1200 ? 0.85 : windowWidth < 1440 ? 0.92 : 1)}px` }}
            >
              {moduleName}
            </span>
          </a>


          <button
            onClick={() => setShowSideNav(!showSideNav)}
            className="w-8 h-8 rounded-lg hover:bg-primary/5 flex items-center justify-center transition-all text-muted-foreground/30 hover:text-primary"
          >
            {showSideNav ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>

          <div className="h-6 w-px bg-border/20 mx-1" />

          {/* Folder/Project Breadcrumb Path */}
          <div className="flex items-center gap-1 px-2 py-1 bg-background/40 rounded-lg border border-border/30 overflow-hidden max-w-[120px] md:max-w-none">
            {folderName && (
              <>
                <span 
                  className="font-black uppercase tracking-widest text-muted-foreground/30 truncate"
                  style={{ fontSize: `${windowWidth < 1200 ? 8 : 9}px` }}
                >
                  {folderName}
                </span>
                <ChevronRight size={windowWidth < 1200 ? 8 : 10} className="text-muted-foreground/20" />
              </>
            )}
            <span 
              className="font-black uppercase tracking-widest text-primary truncate"
              style={{ fontSize: `${windowWidth < 1200 ? 8 : 10}px` }}
            >
              {projectName}
            </span>
          </div>


          <div className="h-6 w-px bg-border/20 mx-1" />


           {/* Visible tab rendering */}
          <div className="flex items-center gap-0">
            {navTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-2 md:px-3 py-1.5 font-black uppercase tracking-widest transition-all rounded-md flex items-center gap-2 shrink-0",
                  activeTab === tab.id
                    ? "text-primary bg-primary/10 shadow-sm"
                    : "text-muted-foreground/40 hover:text-primary hover:bg-primary/5"
                )}
                style={{ fontSize: `${10 * (windowWidth < 1200 ? 0.85 : windowWidth < 1440 ? 0.92 : 1)}px` }}
              >
                {tab.icon && <tab.icon size={10 * (windowWidth < 1200 ? 0.85 : windowWidth < 1440 ? 0.92 : 1) + 2} className={cn(activeTab === tab.id ? "text-primary" : "text-muted-foreground/30")} />}
                <span className={cn(windowWidth < 1200 && tab.id !== activeTab && "hidden")}>{tab.label}</span>
              </button>
            ))}
          </div>

        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 ml-auto">
            {lastSaved && (
              <span className="text-[9px] font-bold text-muted-foreground/30 uppercase tracking-[0.15em] mr-2">
                 Last saved: {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={isBusy}
              className="h-8 gap-2 border-border/60 bg-background/40 hover:bg-accent text-[10px] font-black uppercase tracking-widest px-2 md:px-4 rounded-sm shadow-sm"
              title="Save changes"
            >
              <Save size={12} className={cn(isBusy && "animate-pulse")} />
              <span className={cn(windowWidth < 1200 && "hidden")}>{isBusy ? "Processing..." : "Save"}</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onValidate}
              disabled={isBusy}
              className="h-8 gap-2 border-border/60 bg-background/40 hover:bg-accent text-[10px] font-black uppercase tracking-widest px-2 md:px-4 rounded-sm shadow-sm"
              title="Validate model"
            >
              <ClipboardCheck size={12} className="text-emerald-500" />
              <span className={cn(windowWidth < 1200 && "hidden")}>Validate</span>
            </Button>
            <Button
              size="sm"
              onClick={onRun}
              disabled={isBusy}
              className="h-8 gap-2 bg-primary text-primary-foreground hover:opacity-90 text-[10px] font-black uppercase tracking-widest px-2 md:px-5 rounded-sm shadow-lg shadow-primary/20"
              title="Run workflow"
            >
              <Play size={12} fill="currentColor" className={cn(isBusy && "animate-pulse")} />
              <span className={cn(windowWidth < 1200 && "hidden")}>Run</span>
            </Button>
            <Button
              size="sm"
              onClick={onDeploy}
              disabled={isBusy}
              className="h-8 gap-2 bg-primary text-primary-foreground hover:opacity-90 text-[10px] font-black uppercase tracking-widest px-2 md:px-4 rounded-sm shadow-lg shadow-primary/20"
              title="Deploy to production"
            >
              <Rocket size={12} className={cn(isBusy && "animate-pulse")} />
              <span className={cn(windowWidth < 1200 && "hidden")}>Deploy</span>
            </Button>
            <div className="h-8 w-px bg-border/20 mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5">
              <HistoryIcon size={16} className="text-muted-foreground/30" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5">
              <Bot size={16} className="text-muted-foreground/30" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/5">
              <Settings size={16} className="text-muted-foreground/30" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Sub-header Actions ── */}
      {!hideSubHeader && ["studio", "application"].includes(activeTab) && (
        <div className="px-5 py-2 flex items-center justify-between border-b border-border/10 bg-card/20 shrink-0">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/40 mr-2">Zoom</span>
              <button className="p-1 rounded hover:bg-primary/5 text-muted-foreground/40 transition-colors"><Minus size={12} /></button>
              <span className="text-[10px] font-black text-primary px-2 min-w-[40px] text-center">100%</span>
              <button className="p-1 rounded hover:bg-primary/5 text-muted-foreground/40 transition-colors"><Plus size={12} /></button>
            </div>
            <div className="h-4 w-px bg-border/20" />
            <div className="flex items-center gap-3">
              <button className="p-1.5 rounded-md text-muted-foreground/30 hover:bg-primary/5 hover:text-primary transition-all"><Undo2 size={14} /></button>
              <button className="p-1.5 rounded-md text-muted-foreground/30 hover:bg-primary/5 hover:text-primary transition-all"><Redo2 size={14} /></button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={onExport}
              className="px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all text-muted-foreground/60 hover:bg-primary/5 flex items-center gap-2"
              title="Export Workflow as JSON"
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={() => document.getElementById('flow-import-input')?.click()}
              className="px-3 py-1.5 rounded-md text-[9px] font-black uppercase tracking-widest transition-all text-muted-foreground/60 hover:bg-primary/5 flex items-center gap-2"
              title="Import Workflow from JSON"
            >
              <Upload size={12} /> Import
            </button>
          </div>
        </div>
      )}


      {/* ── Main Workspace ── */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative mt-3 md:mt-4 pb-3 md:pb-4 px-3 md:px-4 gap-3 md:gap-4">
        {/* Left Sidebars */}
        {["studio", "application"].includes(activeTab) && showSideNav && (
          <div className="flex h-full gap-1 overflow-hidden">
            {/* Tab Content Panel */}
            <aside
              className={cn(
                "rounded-sm border border-border/10 transition-all duration-300 flex flex-col group/sidebar relative z-40 shadow-2xl overflow-hidden min-h-0 bg-card",
                folderState === "expanded" ? "w-[380px]" : folderState === "collapsed" ? "w-0 m-0" : "w-0 m-0 border-none"
              )}
            >
              {/* Panel Header */}
              <div className="h-14 flex items-center justify-between px-3 bg-muted/5 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/20">
                  {leftSideRailTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleSideTabChange(tab.id)}
                      className={cn(
                        "p-2 rounded-lg transition-all relative group",
                        activeSideTab === tab.id 
                          ? "bg-primary text-primary-foreground shadow-lg" 
                          : "text-muted-foreground/40 hover:bg-primary/5"
                      )}
                      title={tab.label}
                    >
                      <tab.icon size={16} />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setFolderState("hidden")}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-500 transition-colors"
                  >
                    <ChevronRight size={14} className="rotate-180" />
                  </button>
                </div>
              </div>


              {/* Dynamic Content */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className={cn("flex-1 flex flex-col min-h-0", activeSideTab !== "project" && "hidden")}>
                  <StudioFolderPanel
                    projectId={activeProjectId}
                    workspaceId={workspaceId}
                    folderId={folderId}
                    folderName={folderName}
                    collapsed={false}
                    onWorkflowSelect={onWorkflowSelect}
                    onRun={onRunWorkflow}
                    onDebug={onDebugWorkflow}
                    basePath={basePath}
                  />
                </div>
                <div className={cn("flex-1 flex flex-col min-h-0", (activeSideTab !== "activities" && activeSideTab !== "batches") && "hidden")}>
                  {sidebar || (
                    <StudioToolbox
                      projectId={activeProjectId || undefined}
                      workflowId={activeWorkflowId || undefined}
                    />
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 relative flex flex-col min-w-0 min-h-0 bg-transparent overflow-hidden">
          <div className="flex-1 relative min-h-0">
            <div className="absolute inset-0 overflow-hidden flex flex-col">
              {activeTab === "studio" ? (
                children
              ) : activeTab === "monitoring" ? (
                <StudioMonitoring {...{projectId: activeProjectId, workflowId: activeWorkflowId} as any} />
              ) : activeTab === "queue" ? (
                <QueueManager {...{projectId: activeProjectId} as any} />
              ) : activeTab === "data-engine" ? (
                <DataEngine {...{projectId: activeProjectId} as any} />
              ) : activeTab === "assets" ? (
                <AssetManager {...{projectId: activeProjectId} as any} />
              ) : activeTab === "schedule" ? (
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Rocket size={24} className="text-primary" /></div>
                      <div>
                        <h2 className="text-lg font-black uppercase tracking-widest">Schedules</h2>
                        <p className="text-xs font-bold text-muted-foreground/40 ">View-only — Scheduled versions and their status</p>
                      </div>
                    </div>
                    {[
                      { name: "Daily Invoice Processing", version: "v2.4", status: "Active", cron: "0 8 * * 1-5", lastRun: "Today 08:00" },
                      { name: "Weekly Report Generator", version: "v1.2", status: "Active", cron: "0 6 * * 1", lastRun: "Mon 06:00" },
                      { name: "Monthly Reconciliation", version: "v3.0", status: "Inactive", cron: "0 0 1 * *", lastRun: "May 01 00:00" },
                    ].map((s, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-card border border-border/40 flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-2.5 h-2.5 rounded-full", s.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/20")} />
                          <div>
                            <span className="text-sm font-black">{s.name}</span>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary">{s.version}</span>
                              <span className="text-[9px] font-bold text-muted-foreground/40">{s.cron}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-[9px] font-bold text-muted-foreground/30">Last: {s.lastRun}</span>
                          <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", s.status === "Active" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground/40 bg-muted/10 border-border/20")}>{s.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === "trigger" ? (
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Sparkles size={24} className="text-primary" /></div>
                      <div>
                        <h2 className="text-lg font-black uppercase tracking-widest">Triggers</h2>
                        <p className="text-xs font-bold text-muted-foreground/40 ">View-only — Trigger configurations and scheduled versions</p>
                      </div>
                    </div>
                    {[
                      { name: "Email Arrival Trigger", version: "v1.8", status: "Active", type: "Email", filter: "Subject contains 'Invoice'" },
                      { name: "File Drop Watcher", version: "v2.1", status: "Active", type: "File System", filter: "*.pdf in /uploads/" },
                      { name: "API Webhook Trigger", version: "v1.0", status: "Inactive", type: "Webhook", filter: "POST /api/trigger/start" },
                    ].map((t, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-card border border-border/40 flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-2.5 h-2.5 rounded-full", t.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/20")} />
                          <div>
                            <span className="text-sm font-black">{t.name}</span>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary">{t.version}</span>
                              <span className="text-[9px] font-bold text-muted-foreground/40">{t.type} — {t.filter}</span>
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", t.status === "Active" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground/40 bg-muted/10 border-border/20")}>{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === "connectors" ? (
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 size={24} className="text-primary" /></div>
                      <div>
                        <h2 className="text-lg font-black uppercase tracking-widest">Connectors</h2>
                        <p className="text-xs font-bold text-muted-foreground/40 ">View-only — Attached connectors and their version status</p>
                      </div>
                    </div>
                    {[
                      { name: "SAP ERP Connector", version: "v3.2", status: "Active", type: "Enterprise" },
                      { name: "Salesforce CRM", version: "v2.0", status: "Active", type: "Cloud" },
                      { name: "SMTP Mail Server", version: "v1.5", status: "Active", type: "Communication" },
                      { name: "Azure Blob Storage", version: "v1.1", status: "Inactive", type: "Storage" },
                    ].map((c, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-card border border-border/40 flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-2.5 h-2.5 rounded-full", c.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/20")} />
                          <div>
                            <span className="text-sm font-black">{c.name}</span>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary">{c.version}</span>
                              <span className="text-[9px] font-bold text-muted-foreground/40">{c.type}</span>
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", c.status === "Active" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground/40 bg-muted/10 border-border/20")}>{c.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : activeTab === "published" ? (
                <div className="flex-1 overflow-y-auto p-8">
                  <div className="max-w-4xl mx-auto space-y-6">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center"><FolderOpen size={24} className="text-primary" /></div>
                      <div>
                        <h2 className="text-lg font-black uppercase tracking-widest">Published Versions</h2>
                        <p className="text-xs font-bold text-muted-foreground/40 ">Deployed package versions and folder groups</p>
                      </div>
                    </div>
                    {[
                      { name: "Production Release", version: "v4.2.1", status: "Active", date: "May 10, 2026", env: "PROD" },
                      { name: "Staging Build", version: "v4.3.0-rc1", status: "Active", date: "May 11, 2026", env: "STAGING" },
                      { name: "Legacy Archive", version: "v3.8.0", status: "Inactive", date: "Apr 15, 2026", env: "ARCHIVE" },
                    ].map((p, i) => (
                      <div key={i} className="p-6 rounded-2xl bg-card border border-border/40 flex items-center justify-between group hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-2.5 h-2.5 rounded-full", p.status === "Active" ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/20")} />
                          <div>
                            <span className="text-sm font-black">{p.name}</span>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 text-primary">{p.version}</span>
                              <span className="text-[9px] font-bold text-muted-foreground/40">{p.env} — {p.date}</span>
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border", p.status === "Active" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground/40 bg-muted/10 border-border/20")}>{p.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4 max-w-md">
                    <div className="w-16 h-16 rounded-sm bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                      <Layers size={28} className="text-primary/60" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground/80 capitalize">{activeTab}</h2>
                    <p className="text-base text-muted-foreground/50 leading-relaxed">
                      This module is being configured for your workspace.
                    </p>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Right Side Panels */}
        {!hideRightPanel && ["studio", "application"].includes(activeTab) && (
          <div className="flex h-full gap-1 overflow-hidden">
            {/* Tab Content Panel */}
            <aside
              className={cn(
                "rounded-sm border border-border/10 transition-all duration-300 flex flex-col relative z-40 shadow-2xl overflow-hidden min-h-0 bg-card",
                rightState === "expanded" ? "w-[380px]" : rightState === "collapsed" ? "w-0 m-0" : "w-0 m-0 border-none"
              )}
            >
              {/* Panel Header */}
              <div className="h-14 flex items-center justify-between px-3 bg-muted/5 border-b border-border/40 shrink-0">
                 <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setRightState("hidden")}
                    className="p-1.5 rounded-md hover:bg-red-500/10 text-muted-foreground/30 hover:text-red-500 transition-colors"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-1 bg-background/50 p-1 rounded-xl border border-border/20">
                  {rightSideRailTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveRightSideTab(tab.id as any)}
                      className={cn(
                        "p-2 rounded-lg transition-all relative group",
                        activeRightSideTab === tab.id 
                          ? "bg-primary text-primary-foreground shadow-lg" 
                          : "text-muted-foreground/40 hover:bg-primary/5"
                      )}
                      title={tab.label}
                    >
                      <tab.icon size={16} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Content */}
              <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className={cn("flex-1 overflow-hidden flex flex-col", activeRightSideTab !== "properties" && "hidden")}>
                  {React.isValidElement(properties) && (
                    typeof properties.type === 'string' 
                      ? properties 
                      : React.cloneElement(properties as React.ReactElement<any>, { embedded: true })
                  )}
                </div>
                <div className={cn("flex-1 overflow-hidden flex flex-col", activeRightSideTab !== "flow-tool" && "hidden")}>
                  <FlowToolsPanel onEdgeTypeChange={onEdgeTypeChange} />
                </div>
                <div className={cn("flex-1 overflow-hidden flex flex-col", activeRightSideTab !== "flow-formatting" && "hidden")}>
                  <FlowFormattingPanel 
                    onAlign={onAlign} 
                    onDistribute={onDistribute} 
                    onAutoLayout={onAutoLayout} 
                  />
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>

      {/* ── Bottom Dock ── */}
      {!hideBottomDock && ["studio", "application"].includes(activeTab) && (
        <section
          style={{ height: bottomSize === "hidden" ? "36px" : `${bottomHeight}px` }}
          className={cn(
            "mb-3 md:mb-4 rounded-sm border border-border/60 bg-card/40 backdrop-blur-3xl transition-all relative z-50 shadow-2xl overflow-hidden shrink-0",
            isResizingBottom ? "transition-none" : "duration-300",
            bottomSize === "hidden" && "mb-0"
          )}
        >
          {/* Resize Handle */}
          <div 
            onMouseDown={startResizingBottom}
            className="absolute top-0 left-0 w-full h-1 cursor-ns-resize hover:bg-primary/40 z-[60] transition-colors"
          />

          <div className="h-14 flex items-center justify-between px-6 bg-primary/5 border-b border-border/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-primary/10 flex items-center justify-center">
                <LayoutGrid size={12} className="text-primary" />
              </div>
              <span className="text-base font-bold text-foreground/90">Resource Dock</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-foreground/5"
                onClick={() => setBottomSize(prev => prev === "hidden" ? "normal" : "hidden")}
                title={bottomSize === "hidden" ? "Restore" : "Minimize"}
              >
                {bottomSize === "hidden" ? <ChevronUp size={13} className="opacity-40" /> : <ChevronDown size={13} className="opacity-40" />}
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
             {bottomDock || (
                <StudioDock />
             )}
          </div>
        </section>
      )}

      {/* Hidden File Input for Import */}
      <input 
        id="flow-import-input"
        type="file" 
        accept=".json" 
        className="hidden" 
        onChange={onImport}
      />
    </div>
  );
}

// Sub-components for better organization
const StudioMonitoringPlaceholder = () => <div>Monitoring...</div>;
