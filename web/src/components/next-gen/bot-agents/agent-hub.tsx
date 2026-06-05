import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Copy,
  Download,
  ExternalLink,
  Fingerprint,
  Heart,
  MessageSquareMore,
  Monitor,
  Package,
  Play,
  RadioTower,
  RefreshCw,
  ScrollText,
  Send,
  Settings2,
  Shield,
  ShieldCheck,
  Signal,
  Terminal,
  Timer,
  User,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

type SectionKey =
  | "overview"
  | "schedules"
  | "published"
  | "chat"
  | "logs"
  | "activation"
  | "profile";

const navItems: Array<{ key: SectionKey; label: string; href: string }> = [
  { key: "overview", label: "Overview", href: "/next-gen/bot-agents" },
  { key: "schedules", label: "Schedules", href: "/next-gen/bot-agents/schedules" },
  { key: "published", label: "Published Bots", href: "/next-gen/bot-agents/published" },
  { key: "chat", label: "Agent Mesh Chat", href: "/next-gen/bot-agents/chat" },
  { key: "logs", label: "Logs", href: "/next-gen/bot-agents/logs" },
  { key: "activation", label: "Activation", href: "/next-gen/bot-agents/activation" },
  { key: "profile", label: "Profile & Settings", href: "/next-gen/bot-agents/profile" },
];

// Removed demo constants (demoSchedules, demoPublishedBots, demoChatMessages, demoRuntimeLogs, etc.)

type AgentSnapshot = {
  id: string;
  name: string;
  tenant: string;
  platform: string;
  version: string;
  status: string;
  mode: string;
  heartbeat: string;
  trustScore: number;
  activationCode: string;
  fingerprint: string;
  certificateStatus: string;
  linkedBots: number;
  scheduleCount: number;
  logCount: number;
};

async function getBotAgentState(customerId?: string) {
  const [hosts, auditLogs] = await Promise.all([
    prisma.botHost.findMany({
      where: customerId ? {
        tenant: {
          customerId: customerId
        }
      } : {},
      include: {
        tenant: {
          select: {
            name: true,
            customerId: true
          },
        },
        sessions: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          include: {
            jobs: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.auditLog.findMany({
      where: {
        action: {
          startsWith: "BOT_RUNNER_",
        },
        ...(customerId ? { customerId } : {})
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 20,
    }),
  ]);

  const agents: AgentSnapshot[] = hosts.map((host) => {
    const latestSession = host.sessions[0];
    const runningJobs =
      latestSession?.jobs.filter((job) => job.status === "Running").length ?? 0;

    return {
      id: host.id,
      name: host.hostname,
      tenant: host.tenant.name,
      platform: host.osType,
      version: latestSession?.agentVersion ?? "Unknown",
      status: host.status,
      mode: inferMode(host.osType, runningJobs),
      heartbeat: formatTimeAgo(host.lastHeartbeat),
      trustScore: calculateTrustScore(host),
      activationCode: host.activationToken ?? "Activated",
      fingerprint: host.fingerprint ?? "Pending fingerprint",
      certificateStatus: host.mtlsCertThumbprint ? "ISSUED" : "PENDING",
      linkedBots: runningJobs,
      scheduleCount: 0,
      logCount: auditLogs.filter((log) => log.target === host.hostname).length,
    };
  });

  return {
    agents,
    selectedAgent: agents[0] ?? null,
    auditLogs,
  };
}

function inferMode(osType: string, runningJobs: number) {
  if (osType.toLowerCase().includes("mac") || osType.toLowerCase().includes("windows")) {
    return runningJobs > 0 ? "ATTENDED / UNATTENDED" : "ATTENDED READY";
  }

  return "UNATTENDED";
}

function calculateTrustScore(host: {
  fingerprint: string | null;
  mtlsCertThumbprint: string | null;
  lastHeartbeat: Date | null;
}) {
  let score = 40;
  if (host.fingerprint) score += 25;
  if (host.mtlsCertThumbprint) score += 25;
  if (host.lastHeartbeat) score += 10;
  return score;
}

function formatTimeAgo(date: Date | null) {
  if (!date) return "No heartbeat";
  const elapsedMs = Date.now() - new Date(date).getTime();
  const minutes = Math.max(0, Math.floor(elapsedMs / 60000));
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "Just now";
}

export async function BotAgentLayout(props: {
  section: SectionKey;
  title: string;
  description: string;
  children: ReactNode;
}) {
  const { agents, selectedAgent } = await getBotAgentState();
  const activeAgents = agents.filter((agent) => agent.status.toLowerCase() === "active").length;

  return (
    <div className="h-full overflow-y-auto pr-2 custom-scrollbar space-y-6">
      <section className="overflow-hidden rounded-sm border border-border bg-card/80 shadow-sm">
        <div className="grid gap-6 p-6 xl:grid-cols-[1.5fr_1fr]">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-primary">
              <RadioTower className="h-3.5 w-3.5" />
              Bot Agent Control Cockpit
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                {props.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                {props.description}
              </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <MetricTile
                label="Active Agents"
                value={`${activeAgents}`}
                detail="Tenant-aware runtime inventory"
                icon={Activity}
              />
              <MetricTile
                label="Published Bots"
                value={`${selectedAgent?.linkedBots ?? 0}`}
                detail="Packages assigned to this runtime"
                icon={Bot}
              />
              <MetricTile
                label="Schedules"
                value={`${selectedAgent?.scheduleCount ?? 0}`}
                detail="Agent-specific execution windows"
                icon={CalendarClock}
              />
              <MetricTile
                label="Trust Posture"
                value={selectedAgent ? `${selectedAgent.trustScore}%` : "0%"}
                detail="Fingerprint + token + mTLS"
                icon={ShieldCheck}
              />
            </div>
          </div>

          <div className="rounded-sm border border-border bg-background/70 p-5">
            {selectedAgent ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                      Selected Agent
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                      {selectedAgent.name}
                    </h2>
                  </div>
                  <StatusBadge value={selectedAgent.status.toUpperCase()} />
                </div>

                <div className="mt-4 grid gap-3 text-sm text-muted-foreground">
                  <InfoRow label="Tenant" value={selectedAgent.tenant} />
                  <InfoRow label="Platform" value={`${selectedAgent.platform} · ${selectedAgent.mode}`} />
                  <InfoRow label="Version" value={selectedAgent.version} />
                  <InfoRow label="Heartbeat" value={selectedAgent.heartbeat} />
                  <InfoRow label="Activation code" value={selectedAgent.activationCode} />
                  <InfoRow label="Certificate" value={selectedAgent.certificateStatus} />
                </div>

                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <MiniCounter label="Bots" value={selectedAgent.linkedBots} />
                  <MiniCounter label="Schedules" value={selectedAgent.scheduleCount} />
                  <MiniCounter label="Logs" value={selectedAgent.logCount} />
                </div>
              </>
            ) : (
              <EmptyState
                title="No registered Bot Agents yet"
                description="Start a runner and point it to the portal to see live agent registrations here."
              />
            )}
          </div>
        </div>
      </section>

      <section className="rounded-sm border border-border bg-background/70 p-3">
        <div className="flex flex-wrap gap-2">
          {navItems.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={cn(
                "rounded-sm border px-3 py-2 text-xs font-bold uppercase tracking-[0.16em] transition",
                props.section === item.key
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card/80 text-muted-foreground hover:border-primary/30 hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      {props.children}
    </div>
  );
}

export async function OverviewPanels() {
  const { selectedAgent, auditLogs } = await getBotAgentState();

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.95fr]">
      <div className="space-y-6">
        {/* Heartbeat Status Card */}
        <Card className="border-border/60 bg-card/50 p-6">
          <SectionHeading title="Heartbeat Status" subtitle="Live agent connectivity, uptime, and signal quality." />
          {selectedAgent ? (
            <div className="mt-5 space-y-4">
              <div className={cn(
                "flex items-center gap-4 rounded-sm border p-4",
                selectedAgent.status.toLowerCase() === "active" 
                  ? "border-emerald-500/20 bg-emerald-500/5" 
                  : "border-amber-500/20 bg-amber-500/5"
              )}>
                <div className="relative">
                  <Heart className={cn(
                    "h-8 w-8",
                    selectedAgent.status.toLowerCase() === "active" ? "text-emerald-500" : "text-amber-500"
                  )} />
                  {selectedAgent.status.toLowerCase() === "active" && (
                    <div className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-emerald-500/20 bg-emerald-500 animate-pulse" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-foreground">{selectedAgent.name}</h3>
                    <StatusBadge value={selectedAgent.status.toUpperCase()} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">Last heartbeat: {selectedAgent.heartbeat}</p>
                </div>
                <div className="text-right">
                  <div className={cn(
                    "flex items-center gap-1.5",
                    selectedAgent.status.toLowerCase() === "active" ? "text-emerald-600" : "text-amber-600"
                  )}>
                    <Signal className="h-4 w-4" />
                    <span className="text-sm font-bold">
                      {selectedAgent.status.toLowerCase() === "active" ? "Connected" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-sm border border-border bg-background/70 p-3 text-center">
                  <Timer className="mx-auto h-5 w-5 text-primary" />
                  <div className="mt-2 text-xl font-black text-foreground">--</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Uptime</div>
                </div>
                <div className="rounded-sm border border-border bg-background/70 p-3 text-center">
                  <Zap className="mx-auto h-5 w-5 text-primary" />
                  <div className="mt-2 text-xl font-black text-foreground">{selectedAgent.scheduleCount}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Schedules</div>
                </div>
                <div className="rounded-sm border border-border bg-background/70 p-3 text-center">
                  <Bot className="mx-auto h-5 w-5 text-primary" />
                  <div className="mt-2 text-xl font-black text-foreground">{selectedAgent.linkedBots}</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Bots</div>
                </div>
                <div className="rounded-sm border border-border bg-background/70 p-3 text-center">
                  <ShieldCheck className="mx-auto h-5 w-5 text-primary" />
                  <div className="mt-2 text-xl font-black text-foreground">{selectedAgent.trustScore}%</div>
                  <div className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Trust</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-5"><EmptyState title="No heartbeat data" description="Register and activate a Bot Runner to see live heartbeat status." /></div>
          )}
        </Card>

        {/* Runtime Cockpit Quick Links */}
        <Card className="border-border/60 bg-card/50 p-6">
          <SectionHeading title="Runtime cockpit" subtitle="Quick access to agent operational modules." />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <PanelCard title="Schedules" kicker="Execution lanes" value={`${selectedAgent?.scheduleCount ?? 0}`} href="/next-gen/bot-agents/schedules" description="CRON and event-driven schedules assigned to this agent." />
            <PanelCard title="Published bots" kicker="Packages" value={`${selectedAgent?.linkedBots ?? 0}`} href="/next-gen/bot-agents/published" description="Bot packages assigned for execution on this runtime." />
            <PanelCard title="Mesh chat" kicker="Coordination" value="0" href="/next-gen/bot-agents/chat" description="Inter-agent coordination and handoff events." />
            <PanelCard title="Recent logs" kicker="Observability" value={`${selectedAgent?.logCount ?? 0}`} href="/next-gen/bot-agents/logs" description="Runtime events, executor output, and heartbeat telemetry." />
          </div>
        </Card>
      </div>

      {/* Portal Registry - Replaces Activation posture for Overview */}
      <Card className="border-border/60 bg-card/50 p-6">
        <SectionHeading title="System Events" subtitle="Recent administrative and runtime events for this agent." />
        <div className="mt-5 space-y-3">
          {auditLogs.length > 0 ? auditLogs.map((log) => (
            <div key={log.id} className="rounded-sm border border-border bg-background/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-foreground">{log.action.replace(/_/g, ' ')}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{log.details || log.target}</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            </div>
          )) : (
            <EmptyState title="No events recorded" description="Audit events will appear here as the agent interacts with the portal." />
          )}
        </div>
      </Card>
    </div>
  );
}

export async function SchedulesPanel() {
  return (
    <Card className="border-border/60 bg-card/50 p-6">
      <div className="flex items-start justify-between">
        <SectionHeading title="Agent Schedules" subtitle="CRON windows, API triggers, and event-driven runs." />
        <div className="rounded-sm border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-xs text-emerald-600">
          <span className="font-bold">Identity Context:</span> Filtered to active runner
        </div>
      </div>
      <div className="mt-10 py-20 text-center">
        <CalendarClock className="mx-auto h-12 w-12 text-muted-foreground/20" />
        <h3 className="mt-4 text-lg font-black text-foreground">No active schedules</h3>
        <p className="mt-2 text-sm text-muted-foreground">Assignments will appear here once you link a bot to this agent in the Studio.</p>
      </div>
    </Card>
  );
}

export async function PublishedBotsPanel() {
  return (
    <Card className="border-border/60 bg-card/50 p-6">
      <div className="flex items-start justify-between">
        <SectionHeading title="Published Bots" subtitle="Bot packages assigned to this agent runtime." />
      </div>
      <div className="mt-10 py-20 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground/20" />
        <h3 className="mt-4 text-lg font-black text-foreground">No bots published</h3>
        <p className="mt-2 text-sm text-muted-foreground">Publish a project from the Studio to see it available for deployment here.</p>
      </div>
    </Card>
  );
}

export async function ChatPanel() {
  return (
    <Card className="border-border/60 bg-card/50 p-6">
      <div className="flex items-start justify-between">
        <SectionHeading title="Agent Mesh Chat" subtitle="Real-time inter-agent coordination threads." />
      </div>
      <div className="mt-10 py-20 text-center">
        <MessageSquareMore className="mx-auto h-12 w-12 text-muted-foreground/20" />
        <h3 className="mt-4 text-lg font-black text-foreground">No mesh threads</h3>
        <p className="mt-2 text-sm text-muted-foreground">Mesh chat initializes during multi-agent handoff sequences.</p>
      </div>
    </Card>
  );
}

export async function LogsPanel() {
  const { auditLogs } = await getBotAgentState();

  return (
    <Card className="border-border/60 bg-card/50 p-6">
      <div className="flex items-center justify-between gap-4">
        <SectionHeading title="Runtime Log" subtitle="Portal audit events and runtime telemetry." />
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-sm border border-border px-2 py-1">
            <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{auditLogs.length} entries</span>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-sm border border-border bg-[#0a0a0a] p-4 font-mono text-xs max-h-[600px] overflow-y-auto">
        {auditLogs.length > 0 ? (
          auditLogs.map((log) => (
            <div key={log.id} className="flex gap-3 py-1.5 border-b border-white/5 last:border-0">
              <span className="shrink-0 text-white/30">{new Date(log.timestamp).toLocaleTimeString()}</span>
              <span className={cn(
                "shrink-0 w-12 font-bold uppercase", 
                log.severity === "High" ? "text-rose-400" : "text-emerald-400"
              )}>
                {log.severity || "Info"}
              </span>
              <span className="shrink-0 w-20 text-primary/70">[{log.action.split('_')[0]}]</span>
              <span className="text-white/80">{log.details || log.action}</span>
            </div>
          ))
        ) : (
          <div className="py-10 text-center text-white/20">-- END OF LOG --</div>
        )}
      </div>
    </Card>
  );
}

export async function ActivationPanel() {
  const { selectedAgent } = await getBotAgentState();

  return (
    <div className="space-y-6">
      {/* Guided Activation Wizard */}
      <Card className="border-border/60 bg-card/50 p-6">
        <SectionHeading title="Activation Wizard" subtitle="Step-by-step guide to pair a Bot Runner with the Orchestrator portal." />
        <div className="mt-5 grid gap-3">
          {[
            { id: "w1", label: "Download Agent", detail: "Download the correct agent package for your platform from the Downloads page.", icon: Download, state: "DONE" as const },
            { id: "w2", label: "Install Runtime", detail: "Run the installer on your target machine. Use silent mode for unattended setup.", icon: Monitor, state: "DONE" as const },
            { id: "w3", label: "Configure Orchestrator URL", detail: "Point the agent to the portal's orchestrator endpoint in its config file.", icon: Settings2, state: "DONE" as const },
            { id: "w4", label: "Register with Portal", detail: "Start the agent service. It auto-registers and requests activation.", icon: RadioTower, state: selectedAgent ? "DONE" as const : "CURRENT" as const },
            { id: "w5", label: "Admin Approves", detail: "A tenant admin reviews and approves the registration in this portal.", icon: ShieldCheck, state: selectedAgent?.status === "Active" ? "DONE" as const : "CURRENT" as const },
            { id: "w6", label: "Verify Heartbeat", detail: "Once activated, confirm the heartbeat is live and the trust posture is green.", icon: Heart, state: selectedAgent?.status === "Active" ? "DONE" as const : "PENDING" as const },
          ].map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.id} className={cn("flex gap-4 rounded-sm border p-4 transition", step.state === "DONE" && "border-emerald-500/20 bg-emerald-500/5", step.state === "CURRENT" && "border-primary/30 bg-primary/5 shadow-sm", step.state === "PENDING" && "border-border bg-background/60 opacity-60")}>
                <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", step.state === "DONE" ? "bg-emerald-500/15 text-emerald-600" : step.state === "CURRENT" ? "bg-primary/15 text-primary animate-pulse" : "bg-muted text-muted-foreground")}>
                  {step.state === "DONE" ? <CheckCircle2 className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground">Step {idx + 1}</span>
                    <StatusBadge value={step.state} />
                  </div>
                  <h3 className="mt-1 text-sm font-black text-foreground">{step.label}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        {/* Trust & Identity Module */}
        <Card className="border-border/60 bg-card/50 p-6">
          <SectionHeading title="Agent Trust Identity" subtitle="Fingerprint, token posture, and certificate readiness." />
          {selectedAgent ? (
            <div className="mt-5 space-y-3">
              <InfoRow label="Agent name" value={selectedAgent.name} />
              <InfoRow label="Fingerprint" value={selectedAgent.fingerprint} />
              <InfoRow label="Activation code" value={selectedAgent.activationCode} />
              <InfoRow label="Certificate state" value={selectedAgent.certificateStatus} />
              <InfoRow label="Trust score" value={`${selectedAgent.trustScore}%`} />
              <InfoRow label="Mode" value={selectedAgent.mode} />
            </div>
          ) : (
            <div className="mt-5"><EmptyState title="No activation candidate" description="Register a Bot Runner to see activation details." /></div>
          )}
        </Card>

        {/* Connection Config */}
        <Card className="border-border/60 bg-card/50 p-6">
          <SectionHeading title="Orchestrator Connection" subtitle="Configuration values needed to pair the agent runtime." />
          <div className="mt-5 space-y-3">
            <div className="rounded-sm border border-border bg-background/70 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Orchestrator URL</div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-sm bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground">https://portal.nextgen-platform.io/api/orchestrator</code>
                <div className="rounded-sm border border-border p-1.5 cursor-pointer hover:bg-primary/10 transition"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></div>
              </div>
            </div>
            <div className="rounded-sm border border-border bg-background/70 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Tenant ID</div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-sm bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground">{selectedAgent?.tenant ?? "No tenant selected"}</code>
                <div className="rounded-sm border border-border p-1.5 cursor-pointer hover:bg-primary/10 transition"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></div>
              </div>
            </div>
            <div className="rounded-sm border border-border bg-background/70 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Activation Token</div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 rounded-sm bg-muted/50 px-3 py-1.5 text-xs font-mono font-medium text-foreground">{selectedAgent?.activationCode ?? "Pending registration"}</code>
                <div className="rounded-sm border border-border p-1.5 cursor-pointer hover:bg-primary/10 transition"><Copy className="h-3.5 w-3.5 text-muted-foreground" /></div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export async function ProfilePanel() {
  const { selectedAgent } = await getBotAgentState();

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card className="border-border/60 bg-card/50 p-6">
        <SectionHeading
          title="Agent profile"
          subtitle="Core identity, runtime assignment, platform type, and operational scope."
        />
        {selectedAgent ? (
          <div className="mt-5 grid gap-3">
            <InfoRow label="Profile name" value={selectedAgent.name} />
            <InfoRow label="Tenant" value={selectedAgent.tenant} />
            <InfoRow label="Platform" value={selectedAgent.platform} />
            <InfoRow label="Region" value="Not reported" />
            <InfoRow label="Version" value={selectedAgent.version} />
            <InfoRow label="Linked bots" value={`${selectedAgent.linkedBots}`} />
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No Bot Agent profile available"
              description="Register a runner to see real profile information here."
            />
          </div>
        )}
      </Card>


      <Card className="border-border/60 bg-card/50 p-6">
        <SectionHeading
          title="Runtime settings"
          subtitle="A configuration-facing summary for queueing, attended mode, activation policy, and observability hooks."
        />
        {selectedAgent ? (
          <div className="mt-5 space-y-3">
            <SettingRow label="Execution mode" value={selectedAgent.mode} />
            <SettingRow label="Schedule capacity" value="No live schedule capacity mapped yet" />
            <SettingRow label="Queue depth threshold" value="Not configured in portal data yet" />
            <SettingRow label="Log streaming" value="Portal audit events only" />
            <SettingRow label="Trust policy" value="Fingerprint + JWT + mTLS enforced when activated" />
            <SettingRow label="Human-in-loop" value="Available when the runner is used for attended automation" />
          </div>
        ) : (
          <div className="mt-5">
            <EmptyState
              title="No runtime settings available"
              description="Runtime settings will appear here after a Bot Runner is registered."
            />
          </div>
        )}
      </Card>
    </div>
  );
}

function EmptyState(props: { title: string; description: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/60 p-6 text-center">
      <h3 className="text-lg font-black tracking-tight text-foreground">{props.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{props.description}</p>
    </div>
  );
}

function MetricTile(props: {
  label: string;
  value: string;
  detail: string;
  icon: React.ElementType;
}) {
  const Icon = props.icon;

  return (
    <div className="rounded-sm border border-border bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
          {props.label}
        </p>
        <div className="rounded-sm bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <h3 className="mt-3 text-3xl font-black tracking-tight text-foreground">{props.value}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{props.detail}</p>
    </div>
  );
}

function PanelCard(props: {
  kicker: string;
  title: string;
  value: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={props.href}
      className="rounded-sm border border-border bg-background/70 p-5 transition hover:border-primary/30 hover:bg-primary/5"
    >
      <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">
        {props.kicker}
      </p>
      <div className="mt-3 flex items-center justify-between gap-3">
        <h3 className="text-lg font-black tracking-tight text-foreground">{props.title}</h3>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="mt-3 text-3xl font-black tracking-tight text-foreground">{props.value}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{props.description}</p>
    </Link>
  );
}

function SectionHeading(props: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-xl font-black tracking-tight text-foreground">{props.title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{props.subtitle}</p>
    </div>
  );
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-sm border border-border/70 bg-background/50 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{props.label}</span>
      <span className="text-right font-medium text-foreground">{props.value}</span>
    </div>
  );
}

function MiniCounter(props: { label: string; value: number }) {
  return (
    <div className="rounded-sm border border-border bg-card/80 px-3 py-3 text-center">
      <div className="text-2xl font-black tracking-tight text-foreground">{props.value}</div>
      <div className="mt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {props.label}
      </div>
    </div>
  );
}

function DraftField(props: { label: string; value: string; multiline?: boolean }) {
  return (
    <div className="grid gap-2">
      <span className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
        {props.label}
      </span>
      <div
        className={cn(
          "rounded-sm border border-border bg-background/70 px-4 py-3 text-sm text-foreground",
          props.multiline && "min-h-28 leading-6",
        )}
      >
        {props.value}
      </div>
    </div>
  );
}

function SettingRow(props: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-background/70 p-4">
      <div className="text-xs font-black uppercase tracking-[0.14em] text-muted-foreground">
        {props.label}
      </div>
      <div className="mt-2 text-sm font-medium text-foreground">{props.value}</div>
    </div>
  );
}

function StatusBadge(props: { value: string }) {
  const tone =
    props.value === "ACTIVE" ||
    props.value === "DONE" ||
    props.value === "ISSUED" ||
    props.value === "RESOLVED"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
      : props.value === "CURRENT" ||
          props.value === "ATTENDED" ||
          props.value === "OPEN"
        ? "border-primary/30 bg-primary/10 text-primary"
        : props.value === "WARN" ||
            props.value === "WAITING" ||
            props.value === "PAUSED" ||
            props.value === "ROTATING"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-600"
          : "border-rose-500/30 bg-rose-500/10 text-rose-600";

  return (
    <span className={cn("rounded-sm border px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em]", tone)}>
      {props.value}
    </span>
  );
}
