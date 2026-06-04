import { BotAgentLayout, LogsPanel } from "@/components/dashboard/bot-agents/agent-hub";

export default function BotAgentLogsPage() {
  return (
    <BotAgentLayout
      section="logs"
      title="Bot Agent Logs"
      description="Inspect runtime logs, trust failures, queue pressure, and execution events that belong specifically to Bot Runner agents."
    >
      <LogsPanel />
    </BotAgentLayout>
  );
}
