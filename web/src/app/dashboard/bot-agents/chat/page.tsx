import { BotAgentLayout, ChatPanel } from "@/components/dashboard/bot-agents/agent-hub";

export default function BotAgentChatPage() {
  return (
    <BotAgentLayout
      section="chat"
      title="Agent Mesh Chat"
      description="A human-supervised collaboration surface where one agent can coordinate capacity, handoff, and approval context with another agent."
    >
      <ChatPanel />
    </BotAgentLayout>
  );
}
