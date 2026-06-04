import { BotAgentLayout, OverviewPanels } from "@/components/dashboard/bot-agents/agent-hub";

export default function BotAgentsPage() {
  return (
    <BotAgentLayout
      section="overview"
      title="Bot Agent Runtime Manager"
      description="Manage Bot Runner identities, agent-specific schedules, published bot assignments, trust posture, mesh chat, and operational logs from a single runtime cockpit."
    >
      <OverviewPanels />
    </BotAgentLayout>
  );
}
