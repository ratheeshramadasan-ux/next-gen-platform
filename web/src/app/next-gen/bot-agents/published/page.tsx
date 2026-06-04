import { BotAgentLayout, PublishedBotsPanel } from "@/components/next-gen/bot-agents/agent-hub";

export default function BotAgentPublishedPage() {
  return (
    <BotAgentLayout
      section="published"
      title="Published Bots by Agent"
      description="Track versioned bot packages distributed to each agent, along with rollout policy, execution mode, and target runtime compatibility."
    >
      <PublishedBotsPanel />
    </BotAgentLayout>
  );
}
