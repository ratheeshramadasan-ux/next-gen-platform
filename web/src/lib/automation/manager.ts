/**
 * Automation Studio — Automation Manager
 * Manages engine lifecycles and provides a centralized bridge for API routes.
 */

import { RecorderEngine } from './recorder-engine';
import { AgentEngine } from './agent-engine';

const globalForAutomation = globalThis as unknown as {
  recorder: RecorderEngine | undefined;
  agent: AgentEngine | undefined;
  eventList: any[];
};

// Unified event list for current session (to be consumed by SSE or Long Polling)
export const eventList = globalForAutomation.eventList ?? [];

export const getRecorder = () => {
  if (!globalForAutomation.recorder) {
    globalForAutomation.recorder = new RecorderEngine({
      onEvent: (event) => {
        eventList.push(event);
        if (eventList.length > 500) eventList.shift(); // Keep buffer sane
      },
      onStatusChange: (status) => {
        eventList.push({ type: 'status_change', ...status });
      }
    });
  }
  return globalForAutomation.recorder;
};

export const getAgent = () => {
  if (!globalForAutomation.agent) {
    globalForAutomation.agent = new AgentEngine({
      onEvent: (event) => {
        eventList.push(event);
        if (eventList.length > 500) eventList.shift();
      },
      onStatusChange: (status) => {
        eventList.push({ type: 'agent_status_change', ...status });
      }
    });
  }
  return globalForAutomation.agent;
};

if (process.env.NODE_ENV !== 'production') {
  globalForAutomation.recorder = getRecorder();
  globalForAutomation.agent = getAgent();
  globalForAutomation.eventList = eventList;
}
