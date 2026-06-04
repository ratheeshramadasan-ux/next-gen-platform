import {
  Activity,
  Box,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Code2,
  Download,
  Laptop,
  Layers,
  MessageSquare,
  Monitor,
  Package,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { getBotPackageCatalog } from "@/lib/services/bot-package-db";
import { DownloadCard } from "@/components/dashboard/download-card";
import { Card } from "@/components/ui/card";

export default async function DownloadsPage() {
  const { agents, source } = await getBotPackageCatalog();
  const vmAgents = agents.filter((agent) => agent.kind === "installer" && agent.target !== "uao-sdk");
  const containerAgents = agents.filter((agent) => agent.kind === "bundle" && agent.target !== "uao-sdk");
  const sdkAgents = agents.filter((agent) => agent.target === "uao-sdk");

  const totalPlatforms = agents.length;
  const publishedVersions = agents.reduce(
    (acc, agent) => acc + agent.availableVersions.length,
    0
  );
  const readyInstallers = vmAgents.filter(
    (agent) => agent.status === "available"
  ).length;
  const latestVersion =
    agents
      .flatMap((a) => a.availableVersions)
      .sort((a, b) =>
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")
      )[0]?.version ?? "—";

  /* Build a release timeline from version data */
  const releaseTimeline = agents
    .flatMap((agent) =>
      agent.availableVersions.map((v) => ({
        platform: agent.target,
        title: agent.title,
        version: v.version,
        publishedAt: v.publishedAt ?? "Unknown",
        changelog: v.changelog ?? null,
        kind: agent.kind,
      }))
    )
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, 8);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* ─── Hero Section ─── */}
        <section className="overflow-hidden rounded-sm border border-border bg-card/80 shadow-sm">
          <div className="grid gap-6 p-6 xl:grid-cols-[1.5fr_1fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.22em] text-primary">
                <Download className="h-3.5 w-3.5" />
                Agent Distribution Center
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground md:text-4xl">
                  Bot Runner Runtime
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">
                  Provision production-grade runtime packages for VM, Docker, and
                  Kubernetes. Each bundle includes the core worker service, 
                  heartbeat telemetry, and native system integration tools.
                </p>
              </div>

              {/* Metric Tiles */}
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <MetricTile
                  label="Platforms"
                  value={`${totalPlatforms}`}
                  detail="Win, Linux, Mac, Docker, K8s"
                  icon={Layers}
                />
                <MetricTile
                  label="Releases"
                  value={`${publishedVersions}`}
                  detail="Available versions"
                  icon={Package}
                />
                <MetricTile
                  label="Core Status"
                  value="Online"
                  detail="Registry sync active"
                  icon={CheckCircle2}
                />
                <MetricTile
                  label="Current"
                  value={`v${latestVersion}`}
                  detail="Latest production build"
                  icon={Sparkles}
                />
              </div>
            </div>

            {/* Sidebar: source + compatibility */}
            <div className="rounded-sm border border-border bg-background/70 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
                    Runtime Specification
                  </p>
                  <h2 className="mt-2 text-2xl font-black tracking-tight text-foreground">
                    .NET 8.0 Core
                  </h2>
                </div>
                <div className="rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-600">
                  Stable
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <SpecRow label="Architecture" value="Self-contained binary" />
                <SpecRow label="Mac Support" value="Apple Silicon + Intel" />
                <SpecRow label="Linux Support" value="Ubuntu / Debian (x64)" />
                <SpecRow label="Trust Model" value="mTLS + Hardware Binding" />
                <SpecRow label="Security" value="AES-256 State Encryption" />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Quick Start Guide ─── */}
        <section className="rounded-sm border border-border bg-primary/5 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight text-foreground sm:text-5xl">
                Agent Cockpit
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-muted-foreground leading-relaxed">
                Connect your infrastructure to the platform. Follow these simple steps to link a Robot Agent to the Automation Hub.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <QuickStartStep
              number={1}
              title="Acquire Runtime"
              description="Choose your platform from the catalog below and download the self-contained package."
              icon={Download}
            />
            <QuickStartStep
              number={2}
              title="Connect & Bind"
              description="Point the agent to your custom portal endpoint using your Organization Key."
              icon={Terminal}
            />
            <QuickStartStep
              number={3}
              title="Activate Identity"
              description="Approve the registration in the Cockpit to enable heartbeat and bot assignments."
              icon={Activity}
            />
          </div>
        </section>

        {/* ─── Release Timeline ─── */}
        <section className="rounded-sm border border-border bg-card/80 p-6 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black tracking-tight text-foreground">
                Release Timeline
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Latest publications across all infrastructure targets.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-sm border border-border px-2 py-1">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {releaseTimeline.length} entries
              </span>
            </div>
          </div>
          <div className="mt-5 grid gap-2">
            {releaseTimeline.map((entry, idx) => (
              <div
                key={`${entry.platform}-${entry.version}-${idx}`}
                className="flex items-center gap-4 rounded-sm border border-border/70 bg-background/50 px-4 py-3 transition hover:border-primary/20 hover:bg-primary/5"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary/10 text-primary">
                  {getPlatformIcon(entry.platform)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {entry.title}
                    </span>
                    <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                      v{entry.version}
                    </span>
                    {idx === 0 && (
                      <span className="rounded-sm bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                        Stable
                      </span>
                    )}
                  </div>
                  {entry.changelog && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {entry.changelog}
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs text-muted-foreground">
                    {entry.publishedAt}
                  </span>
                  <div className="mt-0.5">
                    <span className="rounded-sm px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground bg-muted/50">
                      {entry.kind === "installer" ? "Installer" : "Bundle"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ─── Catalog Header ─── */}
        <section className="mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-3">
             <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary text-primary-foreground">
               <Layers className="h-4 w-4" />
             </div>
             <h2 className="text-2xl font-black tracking-tight text-foreground">Robot Catalog</h2>
          </div>
          <p className="text-sm text-muted-foreground">Select the agent type that matches your computing environment.</p>
        </section>

        {/* ─── VM Agents Section ─── */}
        <section className="rounded-sm border border-border bg-background/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">
                  Desktop & Server Agents
                </h2>
                <p className="text-sm text-muted-foreground">
                  Traditional installers for persistent machines and user desktops.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-sm border border-border bg-card/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                {vmAgents.length} targets
              </span>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {vmAgents.map((agent) => (
            <DownloadCard
              key={agent.target}
              target={agent.target}
              iconName={getAgentIconName(agent.target)}
              title={agent.title}
              description={agent.description}
              detail={agent.detail}
              specs={[
                { label: "Status", value: agent.statusText },
                { label: "Format", value: agent.format },
                ...agent.specs,
                ...(agent.silentInstall
                  ? [{ label: "Remote Deploy", value: agent.silentInstall }]
                  : []),
              ]}
              buttonLabel={agent.downloadLabel}
              disabled={agent.status !== "available"}
              availableVersions={agent.availableVersions}
              selectedVersion={agent.selectedVersion}
              format={agent.format}
              fileName={agent.fileName}
            />
          ))}
        </section>

        {/* ─── Container Runtime Section ─── */}
        <section className="rounded-sm border border-border bg-background/70 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
                <Box className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-foreground">
                  Cloud & Cluster Runtimes
                </h2>
                <p className="text-sm text-muted-foreground">
                  Scalable container-based agents for modern cloud infrastructure.
                </p>
              </div>
            </div>
            <span className="rounded-sm border border-border bg-card/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              {containerAgents.length} targets
            </span>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {containerAgents.map((agent) => (
            <DownloadCard
              key={agent.target}
              target={agent.target}
              iconName={getAgentIconName(agent.target)}
              title={agent.title}
              description={agent.description}
              detail={agent.detail}
              specs={[
                { label: "Status", value: agent.statusText },
                { label: "Type", value: agent.format },
                ...agent.specs,
              ]}
              buttonLabel={agent.downloadLabel}
              disabled={agent.status !== "available"}
              availableVersions={agent.availableVersions}
              selectedVersion={agent.selectedVersion}
              format={agent.format}
              fileName={agent.fileName}
            />
          ))}
        </section>

        {/* ─── Developer SDK Section ─── */}
        {sdkAgents.length > 0 && (
          <>
            <section className="rounded-sm border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-primary/10 text-primary">
                    <Code2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">
                      Developer SDK
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Embed the Universal Agent runtime directly into your Node.js or Electron application
                    </p>
                  </div>
                </div>
                <div className="rounded-sm border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-primary">
                  TypeScript
                </div>
              </div>

              {/* Install snippet */}
              <div className="mt-5 rounded-sm border border-border bg-background/80 px-4 py-3 font-mono text-sm">
                <span className="text-muted-foreground">$ </span>
                <span className="text-foreground font-semibold">pnpm add @nextgen/universal-agent-object</span>
              </div>

              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div className="rounded-sm border border-border bg-background/50 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Platform Support</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Windows · macOS · Linux · Docker · K8s</p>
                </div>
                <div className="rounded-sm border border-border bg-background/50 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Executors</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Web · UIA · AX · AT-SPI · Terminal · API</p>
                </div>
                <div className="rounded-sm border border-border bg-background/50 px-3 py-2.5">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Schema</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">Zod-validated UAO contract</p>
                </div>
              </div>
            </section>

            <section className="grid gap-4">
              {sdkAgents.map((agent) => (
                <DownloadCard
                  key={agent.target}
                  target={agent.target}
                  iconName={getAgentIconName(agent.target)}
                  title={agent.title}
                  description={agent.description}
                  detail={agent.detail}
                  specs={[
                    { label: "Channel", value: agent.statusText },
                    { label: "Registry", value: agent.format },
                    ...agent.specs,
                  ]}
                  buttonLabel={agent.downloadLabel}
                  disabled={false}
                  availableVersions={agent.availableVersions}
                  selectedVersion={agent.selectedVersion}
                  format={agent.format}
                  fileName={agent.fileName}
                />
              ))}
            </section>
          </>
        )}

      </div>
    </div>
  );
}

/* ─── Sub-components ─── */

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
      <h3 className="mt-3 text-3xl font-black tracking-tight text-foreground">
        {props.value}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{props.detail}</p>
    </div>
  );
}

function SpecRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-sm border border-border/70 bg-background/50 px-3 py-2.5 text-sm">
      <span className="text-muted-foreground">{props.label}</span>
      <span className="text-right font-medium text-foreground">
        {props.value}
      </span>
    </div>
  );
}

function QuickStartStep(props: {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
}) {
  const Icon = props.icon;
  return (
    <div className="rounded-sm border border-border bg-background/70 p-5 transition hover:border-primary/20 hover:bg-primary/5">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-sm font-black text-primary">
          {props.number}
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="mt-3 text-sm font-black text-foreground">{props.title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        {props.description}
      </p>
    </div>
  );
}

function getPlatformIcon(target: string) {
  switch (target) {
    case "windows":
      return <Monitor className="h-4 w-4" />;
    case "linux":
      return <Server className="h-4 w-4" />;
    case "mac":
      return <Laptop className="h-4 w-4" />;
    case "docker":
      return <Box className="h-4 w-4" />;
    case "k8s":
      return <Server className="h-4 w-4" />;
    case "uao-sdk":
      return <Code2 className="h-4 w-4" />;
    default:
      return <Download className="h-4 w-4" />;
    }
}

function getAgentIconName(target: string) {
  switch (target) {
    case "windows":
    case "linux":
    case "mac":
    case "docker":
    case "k8s":
    case "uao-sdk":
      return target as "windows" | "linux" | "mac" | "docker" | "k8s";
    default:
      return "default" as const;
  }
}
