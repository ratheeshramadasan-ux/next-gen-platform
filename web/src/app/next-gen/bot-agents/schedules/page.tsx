import { BotAgentLayout, SchedulesPanel } from "@/components/next-gen/bot-agents/agent-hub";

export default function BotAgentSchedulesPage() {
  return (
    <BotAgentLayout
      section="schedules"
      title="Bot Agent Schedules"
      description="Review schedule bindings per agent, including CRON windows, API triggers, event-driven runs, and which bots each runtime is expected to launch."
    >
      <SchedulesPanel />
    </BotAgentLayout>
  );
}
