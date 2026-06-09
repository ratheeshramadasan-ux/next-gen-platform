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
  level?: "Verbose" | "Debug" | "Info" | "Warning" | "Error";
}

const SEVERITY_LEVELS = {
  "Verbose": 0,
  "Debug": 1,
  "Info": 2,
  "Warning": 3,
  "Error": 4
};

class Logger {
  private logs: LogEntry[] = [];

  log(entry: Omit<LogEntry, "logId" | "timestamp"> & { level?: "Verbose" | "Debug" | "Info" | "Warning" | "Error" }, configuredLevel?: "Verbose" | "Debug" | "Info" | "Warning" | "Error") {
    const entryLevel = entry.level || (entry.status === "FAILED" ? "Error" : "Info");
    
    // Severity level check
    const currentSeverity = SEVERITY_LEVELS[entryLevel] ?? 2;
    const targetSeverity = SEVERITY_LEVELS[configuredLevel || "Info"] ?? 2;
    
    if (currentSeverity < targetSeverity) {
      // Skip logging if it is below the configured severity threshold
      return;
    }

    const fullEntry: LogEntry = {
      logId: uuid(),
      timestamp: new Date(),
      level: entryLevel,
      ...entry,
    };

    this.logs.push(fullEntry);
    console.log(`[${entry.status}] [${entryLevel}] Node:${entry.nodeId} (${entry.nodeLabel || "unnamed"})`, entry.error || entry.output || "");
  }

  getLogs() {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const executionLogger = new Logger();
