import { v4 as uuid } from "uuid";

export interface LogEntry {
  logId: string;
  executionId: string;
  nodeId: string;
  nodeLabel?: string;
  status: "STARTED" | "SUCCESS" | "FAILED" | "SKIPPED";
  input?: any;
  output?: any;
  error?: string;
  durationMs?: number;
  timestamp: Date;
}

class Logger {
  private logs: LogEntry[] = [];

  log(entry: Omit<LogEntry, "logId" | "timestamp">) {
    const fullEntry: LogEntry = {
      logId: uuid(),
      timestamp: new Date(),
      ...entry,
    };

    this.logs.push(fullEntry);
    console.log(`[${entry.status}] Node:${entry.nodeId} (${entry.nodeLabel || "unnamed"})`, entry.error || entry.output || "");
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const executionLogger = new Logger();
