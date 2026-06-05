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

  return (
    <div className="w-full h-full transition-all duration-300 overflow-hidden flex flex-col bg-background text-foreground font-sans">
      {/* ── Top Bar — Document-Processing style h-20 header ── */}
      <header
        className="h-20 px-6 flex items-center justify-between shrink-0 z-50"
        style={{
          background: "var(--studio-surface-raised)",
          borderBottom: "1.5px solid var(--studio-border)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.10), 0 1px 0 0 var(--studio-border)",
        }}
      >
        {/* Left: Back + Brand + Flow Identity */}
        <div className="flex items-center gap-4">
          <a
            href={backHref}
            className="w-10 h-10 rounded-xl bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center justify-center shadow-sm group hover:-translate-x-0.5 shrink-0"
            title={`Back to ${moduleName}`}
          >
            <ArrowLeft size={16} strokeWidth={3} className="transition-transform group-hover:scale-110" />
          </a>

          {/* Branded Studio Icon */}
          <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-[0_8px_20px_-6px_rgba(var(--primary),0.4)] border border-white/20 shrink-0">
            <Workflow size={22} strokeWidth={2.5} />
          </div>

          {/* Title + Identity */}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black tracking-tight text-foreground/80 uppercase whitespace-nowrap">{studioLabel.toUpperCase()} DESIGNER</h1>
              <div className="px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-xs font-black text-primary uppercase tracking-widest whitespace-nowrap">
                {moduleName}
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {projectName && (
                <span className="text-xs font-black text-foreground uppercase tracking-wide bg-muted px-2 py-0.5 rounded-lg border border-border truncate max-w-[200px]">
                  {folderName ? `${folderName} / ` : ''}{projectName}
                </span>
              )}
              {workflowName && (
                <>
                  <div className="w-1 h-1 rounded-full bg-border" />
                  <span className="text-xs font-black text-primary uppercase tracking-wide truncate max-w-[160px]">{workflowName}</span>
                </>
              )}
              <div className="w-1 h-1 rounded-full bg-border" />
              <span className="text-xs font-black text-primary/60 uppercase tracking-[0.15em] opacity-80">v2.0 Flow</span>
            </div>
          </div>
        </div>

        {/* Right: Sync status + progress + actions */}
        <div className="flex items-center gap-5">
          {/* Local Sync Indicator */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-2 mb-1.5">
              <Link2 size={12} className="text-emerald-500" />
              <p className="text-xs font-black text-foreground/80 uppercase tracking-[0.2em]">Local Sync</p>
            </div>
            <div className="flex items-center gap-1.5">
              {[0,1,2,3,4].map((i) => (
                <div key={i} className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  lastSaved ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.3)]" : "bg-muted/40",
                  i === 2 && !lastSaved ? "w-8 bg-primary/40" : "w-5"
                )} />
              ))}
            </div>
          </div>

          <div className="h-10 w-px bg-border/50" />

          {/* Save status */}
          {lastSaved && (
            <div className="flex flex-col items-end">
              <span className="text-xs font-black text-muted-foreground/50 uppercase tracking-[0.15em]">Last Saved</span>
              <span className="text-xs font-bold text-emerald-500">{lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          )}

          <div className="h-10 w-px bg-border/50" />

          {/* Side nav toggle */}
          <button
            onClick={() => setShowSideNav(!showSideNav)}
            className="w-10 h-10 rounded-xl border border-border/50 flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-all"
            title={showSideNav ? "Hide panel" : "Show panel"}
          >
            {showSideNav ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>

          {/* Action buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={onValidate}
            disabled={isBusy}
            className="h-9 gap-2 border-border/60 bg-background/40 hover:bg-accent text-xs font-semibold uppercase tracking-wide px-3 rounded-xl shadow-sm"
            title="Validate flow"
          >
            <ClipboardCheck size={13} className="text-emerald-500" />
            <span className="hidden lg:block">Validate</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onSave}
            disabled={isBusy}
            className="h-9 gap-2 border-border/60 bg-background/40 hover:bg-accent text-xs font-semibold uppercase tracking-wide px-3 rounded-xl shadow-sm"
            title="Save flow"
          >
            <Save size={13} className={cn(isBusy && "animate-pulse")} />
            <span className="hidden lg:block">{isBusy ? "Saving..." : "Save"}</span>
          </Button>
          <Button
            size="sm"
            onClick={onRun}
            disabled={isBusy}
            className="h-9 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold uppercase tracking-wide px-4 rounded-xl shadow-lg shadow-emerald-600/20"
            title="Run flow"
          >
            <Play size={13} fill="currentColor" className={cn(isBusy && "animate-pulse")} />
            <span className="hidden lg:block">Run</span>
          </Button>
          <Button
            size="sm"
            onClick={onDeploy}
            disabled={isBusy}
            className="h-9 gap-2 bg-primary text-primary-foreground hover:opacity-90 text-xs font-semibold uppercase tracking-wide px-4 rounded-xl shadow-lg shadow-primary/20"
            title="Deploy to production"
          >
            <Rocket size={13} className={cn(isBusy && "animate-pulse")} />
            <span className="hidden lg:block">Deploy</span>
          </Button>
          <div className="h-9 w-px bg-border/50" />
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5" title="History">
            <HistoryIcon size={16} className="text-muted-foreground/60" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5" title="AI Assistant">
            <Bot size={16} className="text-muted-foreground/60" />
          </Button>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-primary/5" title="Settings">
            <Settings size={16} className="text-muted-foreground/60" />
          </Button>
        </div>
      </header>

      {/* ── Nav Tabs Sub-Header ── */}
      <div
        className="h-10 px-6 flex items-center shrink-0 z-40"
        style={{
          background: "var(--studio-surface)",
          borderBottom: "1px solid var(--studio-border)",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}
      >
        <div className="flex items-center gap-0 flex-1">
          {navTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 h-10 font-semibold uppercase tracking-wide transition-all flex items-center gap-1.5 shrink-0 border-b-2 text-xs",
                activeTab === tab.id
                  ? "text-primary border-primary bg-primary/5"
                  : "text-muted-foreground/50 border-transparent hover:text-primary/70 hover:bg-primary/5"
              )}
            >
              {tab.icon && <tab.icon size={12} className={cn(activeTab === tab.id ? "text-primary" : "text-muted-foreground/40")} />}
              <span className={cn(windowWidth < 1280 && tab.id !== activeTab ? "hidden" : "")}>{tab.label}</span>
            </button>
          ))}
        </div>
        {/* ── Canvas toolbar slot — StudioCanvas portals its buttons here ── */}
        {["studio", "application"].includes(activeTab) && !hideSubHeader && (
          <div className="flex items-center ml-auto">
            {/* Toolbar buttons are injected by StudioCanvas via createPortal */}
            <div id="studio-canvas-toolbar" className="flex items-center" />

            <div className="h-5 w-px mx-3" style={{ background: "var(--studio-border)" }} />

            <button
              onClick={onExport}
              className="px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--foreground)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"}
              title="Export flow as JSON"
            >
              <Download size={12} /> Export
            </button>
            <button
              onClick={() => document.getElementById('flow-import-input')?.click()}
              className="px-2 py-1 rounded-md text-xs font-medium transition-all flex items-center gap-1.5"
              style={{ color: "var(--muted-foreground)" }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "var(--foreground)"}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "var(--muted-foreground)"}
              title="Import flow from JSON"
            >
              <Upload size={12} /> Import
            </button>
          </div>
        )}
      </div>

      {/* ── Main Workspace ── */}
      {/* Canvas area uses --background (white/base) so it sits visually
          below the surrounding panels which use --studio-surface (off-white) */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative gap-0" style={{ background: "var(--background)" }}>
        {/* Left Sidebars */}
        {["studio", "application"].includes(activeTab) && showSideNav && (
          <div className="flex h-full gap-1 overflow-hidden">
            {/* Tab Content Panel */}
            <aside
              className={cn(
                "transition-all duration-300 flex flex-col group/sidebar relative z-40 overflow-hidden min-h-0",
                folderState === "expanded" ? "w-[380px]" : folderState === "collapsed" ? "w-0" : "w-0"
              )}
              style={{
                background: "var(--studio-surface)",
                borderRight: "1.5px solid var(--studio-border)",
                boxShadow: "4px 0 18px rgba(0,0,0,0.07)",
                borderRadius: "0 12px 12px 0",
              }}
            >
              {/* Panel Header */}
              <div
                className="h-12 flex items-center justify-between px-3 shrink-0"
                style={{
                  background: "var(--studio-surface-raised)",
                  borderBottom: "1px solid var(--studio-border)",
                }}
              >
                <div className="flex items-center gap-0.5">
                  {leftSideRailTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => handleSideTabChange(tab.id)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[12px] font-semibold",
                        activeSideTab === tab.id
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground/60 hover:bg-primary/5 hover:text-primary"
                      )}
                    >
                      <tab.icon size={14} />
                      <span>{tab.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setFolderState("hidden")}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground/40 hover:text-foreground transition-colors"
                  title="Close panel"
                >
                  <PanelLeftClose size={15} />
                </button>
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
                        <h2 className="text-lg font-semibold uppercase tracking-wide">Schedules</h2>
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
                              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary">{s.version}</span>
                              <span className="text-xs font-bold text-muted-foreground/40">{s.cron}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs font-bold text-muted-foreground/30">Last: {s.lastRun}</span>
                          <span className={cn("text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full border", s.status === "Active" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground/40 bg-muted/10 border-border/20")}>{s.status}</span>
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
                        <h2 className="text-lg font-semibold uppercase tracking-wide">Triggers</h2>
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
                              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary">{t.version}</span>
                              <span className="text-xs font-bold text-muted-foreground/40">{t.type} — {t.filter}</span>
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full border", t.status === "Active" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground/40 bg-muted/10 border-border/20")}>{t.status}</span>
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
                        <h2 className="text-lg font-semibold uppercase tracking-wide">Connectors</h2>
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
                              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary">{c.version}</span>
                              <span className="text-xs font-bold text-muted-foreground/40">{c.type}</span>
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full border", c.status === "Active" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground/40 bg-muted/10 border-border/20")}>{c.status}</span>
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
                        <h2 className="text-lg font-semibold uppercase tracking-wide">Published Versions</h2>
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
                              <span className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-primary/10 text-primary">{p.version}</span>
                              <span className="text-xs font-bold text-muted-foreground/40">{p.env} — {p.date}</span>
                            </div>
                          </div>
                        </div>
                        <span className={cn("text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full border", p.status === "Active" ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-muted-foreground/40 bg-muted/10 border-border/20")}>{p.status}</span>
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
                "transition-all duration-300 flex flex-col relative z-40 overflow-hidden min-h-0",
                rightState === "expanded" ? "w-[380px]" : rightState === "collapsed" ? "w-0" : "w-0"
              )}
              style={{
                background: "var(--studio-surface)",
                borderLeft: "1.5px solid var(--studio-border)",
                boxShadow: "-4px 0 18px rgba(0,0,0,0.07)",
                borderRadius: "12px 0 0 12px",
              }}
            >
              {/* Panel Header */}
              <div
                className="h-12 flex items-center justify-between px-3 shrink-0"
                style={{
                  background: "var(--studio-surface-raised)",
                  borderBottom: "1px solid var(--studio-border)",
                }}
              >
                <button
                  onClick={() => setRightState("hidden")}
                  className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground/40 hover:text-foreground transition-colors"
                  title="Close panel"
                >
                  <PanelRightClose size={15} />
                </button>
                <div className="flex items-center gap-0.5">
                  {rightSideRailTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveRightSideTab(tab.id as any)}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-[12px] font-semibold",
                        activeRightSideTab === tab.id
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "text-muted-foreground/60 hover:bg-primary/5 hover:text-primary"
                      )}
                      title={tab.label}
                    >
                      <tab.icon size={14} />
                      <span>{tab.label}</span>
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
          style={{
            height: bottomSize === "hidden" ? "40px" : `${bottomHeight}px`,
            background: "var(--studio-surface)",
            borderTop: "1.5px solid var(--studio-border)",
            boxShadow: "0 -4px 18px rgba(0,0,0,0.08)",
            borderRadius: "12px 12px 0 0",
          }}
          className={cn(
            "transition-all relative z-50 overflow-hidden shrink-0",
            isResizingBottom ? "transition-none" : "duration-300"
          )}
        >
          {/* Resize Handle */}
          <div
            onMouseDown={startResizingBottom}
            className="absolute top-0 left-0 w-full h-1.5 cursor-ns-resize hover:bg-primary/30 z-[60] transition-colors"
          />

          <div
            className="h-10 flex items-center justify-between px-5 shrink-0"
            style={{
              background: "var(--studio-surface-raised)",
              borderBottom: "1px solid var(--studio-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <LayoutGrid size={13} className="text-primary" />
              </div>
              <span className="text-sm font-bold text-foreground">Resource Dock</span>
              <span className="text-xs text-muted-foreground/50 font-medium">Variables · Arguments · Logs · Profiler</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg hover:bg-muted text-muted-foreground/50 hover:text-foreground"
              onClick={() => setBottomSize(prev => prev === "hidden" ? "normal" : "hidden")}
              title={bottomSize === "hidden" ? "Restore" : "Minimize"}
            >
              {bottomSize === "hidden" ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
             {bottomDock || <StudioDock />}
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
