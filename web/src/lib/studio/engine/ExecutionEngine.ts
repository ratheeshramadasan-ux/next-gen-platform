import { v4 as uuid } from "uuid";
import { Node, Edge } from "@xyflow/react";
import { FlowParser } from "./FlowParser";
import { ExecutionContext } from "./Context";
import { activities } from "./activities";
import { retry } from "./utils/retry";
import { executionLogger } from "./utils/logger";
import { runParallelBranches } from "./utils/parallelExecutor";

export class ExecutionEngine {
  private flow: { nodes: Node[]; edges: Edge[] };
  private parser: FlowParser;
  private context: ExecutionContext;
  public executionId: string;

  constructor(nodes: Node[], edges: Edge[], options?: { onPrompt?: (config: any) => Promise<string> }) {
    this.flow = { nodes, edges };
    this.parser = new FlowParser(nodes, edges);
    this.executionId = uuid();
    this.context = new ExecutionContext(this.executionId);
    if (options?.onPrompt) {
      (this.context as any).onPrompt = options.onPrompt;
    }
  }

  async execute() {
    let activeNodes: Node[] = [this.parser.getStartNode()].filter(Boolean) as Node[];
    executionLogger.clear();
    const visited = new Set<string>();

    while (activeNodes.length > 0) {
      const currentNode = activeNodes.shift()!;
      const nodeId = currentNode.id;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const nodeLabel = String(currentNode.data?.label || currentNode.type || "Unnamed Node");
      const startTime = Date.now();
      const nodeData = currentNode.data as any;

      // 1. General Controls: Enabled/Disabled Check
      const isEnabled = nodeData?.execution?.enabled !== false;
      if (!isEnabled) {
        executionLogger.log({
          executionId: this.executionId,
          nodeId,
          nodeLabel,
          status: "SKIPPED",
          level: "Info"
        });
        const nextNodes = this.parser.getNextNodes(currentNode, null);
        activeNodes.push(...nextNodes);
        continue;
      }

      // Helper to resolve variables like {varName} or ${varName} from context
      const resolveValue = (val: any): any => {
        if (val === undefined || val === null) return val;
        const valStr = String(val).trim();
        const match = valStr.match(/^\$?\{([^}]+)\}$/);
        if (match) {
          const varName = match[1].trim();
          const contextVal = this.context.get(varName);
          return contextVal !== undefined ? contextVal : val;
        }
        
        // Inline variable templates (e.g., "Delay of {myDelay} ms")
        let resolved = valStr;
        const regex = /\$?\{([^}]+)\}/g;
        let m;
        while ((m = regex.exec(valStr)) !== null) {
          const varName = m[1].trim();
          const varVal = this.context.get(varName);
          if (varVal !== undefined) {
            resolved = resolved.replace(m[0], String(varVal));
          }
        }
        if (/^\d+$/.test(resolved)) {
          return parseInt(resolved, 10);
        }
        return resolved;
      };

      // 2. Performance: Delay Before
      const delayBeforeRaw = nodeData?.properties?.delayBefore ?? 0;
      const delayBefore = parseInt(String(resolveValue(delayBeforeRaw))) || 0;
      if (delayBefore > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBefore));
      }

      // Helper to parse interval durations like "00:00:10" to ms
      const parseDurationToMs = (dur: string | undefined, defaultMs: number): number => {
        if (!dur) return defaultMs;
        const parts = dur.split(":");
        if (parts.length !== 3) return defaultMs;
        const hrs = parseInt(parts[0]) || 0;
        const mins = parseInt(parts[1]) || 0;
        const secs = parseInt(parts[2]) || 0;
        return ((hrs * 3600) + (mins * 60) + secs) * 1000;
      };

      // Helper to mask sensitive fields in inputs/outputs
      const maskSensitiveData = (data: any, fieldsToMask: string[]): any => {
        if (!data) return data;
        if (typeof data !== "object") return data;
        if (Array.isArray(data)) {
          return data.map(item => maskSensitiveData(item, fieldsToMask));
        }
        const result = { ...data };
        for (const key of Object.keys(result)) {
          const isSensitive = fieldsToMask.some(f => key.toLowerCase().includes(f.toLowerCase()));
          if (isSensitive) {
            result[key] = "[MASKED]";
          } else if (typeof result[key] === "object") {
            result[key] = maskSensitiveData(result[key], fieldsToMask);
          }
        }
        return result;
      };

      // Gather logging configs
      const loggingProps = nodeData?.logging;
      const configuredLogLevel = loggingProps?.logLevel || nodeData?.properties?.logLevel || "Info";
      const logInputsAllowed = loggingProps?.logInputs !== false;
      const logOutputsAllowed = loggingProps?.logOutputs !== false;
      
      const maskFieldsList = [
        ...(nodeData?.security?.maskFields || []),
        ...(nodeData?.compliance?.piiFields || []),
        ...(nodeData?.compliance?.pciFields || [])
      ];

      try {
        // Log Started
        let initialInputLog = undefined;
        if (logInputsAllowed) {
          initialInputLog = nodeData?.inputs;
          if (loggingProps?.maskSensitiveFields && maskFieldsList.length > 0) {
            initialInputLog = maskSensitiveData(initialInputLog, maskFieldsList);
          }
        }

        executionLogger.log({
          executionId: this.executionId,
          nodeId,
          nodeLabel,
          status: "STARTED",
          input: initialInputLog,
          level: "Info"
        }, configuredLogLevel);

        let result: any = null;

        // Parse timeout configuration
        const timeoutLimitRaw = nodeData?.timeout?.timeout || nodeData?.properties?.timeout || "30000";
        const timeoutLimitMs = typeof timeoutLimitRaw === "number" 
          ? timeoutLimitRaw 
          : /^\d+$/.test(String(resolveValue(timeoutLimitRaw)))
            ? parseInt(String(resolveValue(timeoutLimitRaw))) || 30000
            : parseDurationToMs(String(resolveValue(timeoutLimitRaw)), 30000);

        const warningThresholdRaw = nodeData?.timeout?.warningAt || "24000";
        const warningThresholdMs = typeof warningThresholdRaw === "number"
          ? warningThresholdRaw
          : /^\d+$/.test(String(resolveValue(warningThresholdRaw)))
            ? parseInt(String(resolveValue(warningThresholdRaw))) || 24000
            : parseDurationToMs(String(resolveValue(warningThresholdRaw)), 24000);

        // Timeout promise wrapper
        const runWithTimeout = async (action: () => Promise<any>, timeoutMs: number) => {
          let timeoutId: any;
          const timeoutPromise = new Promise((_, reject) => {
            timeoutId = setTimeout(() => {
              reject(new Error(`Timeout of ${timeoutMs}ms exceeded`));
            }, timeoutMs);
          });
          try {
            return await Promise.race([action(), timeoutPromise]);
          } finally {
            clearTimeout(timeoutId);
          }
        };

        // Execution executor activity runner with Timeout & Retry
        const executeActivity = async (dragType: string, executor: any) => {
          const retryEnabled = nodeData?.retry?.retryEnabled;
          const retryCountRaw = retryEnabled 
            ? (nodeData?.retry?.retryCount) 
            : (nodeData?.properties?.retryCount);
          const retryCount = parseInt(String(resolveValue(retryCountRaw ?? 1))) || 1;

          const retryIntervalRaw = retryEnabled
            ? (nodeData?.retry?.interval)
            : (nodeData?.properties?.retryInterval);
          const retryIntervalMs = typeof retryIntervalRaw === "number"
            ? retryIntervalRaw
            : /^\d+$/.test(String(resolveValue(retryIntervalRaw)))
              ? parseInt(String(resolveValue(retryIntervalRaw))) || 2000
              : parseDurationToMs(String(resolveValue(retryIntervalRaw || "00:00:02")), 2000);

          const backoffType = nodeData?.retry?.backoff || nodeData?.properties?.backoff || "Fixed";
          const maxDelayMs = parseDurationToMs(String(resolveValue(nodeData?.retry?.maxDelay || "00:05:00")), 300000);

          let attempts = 0;
          while (true) {
            try {
              attempts++;
              const actionStartTime = Date.now();
              const res = await runWithTimeout(
                () => executor(currentNode, this.context),
                timeoutLimitMs
              );
              
              // Warning alert check
              const duration = Date.now() - actionStartTime;
              if (duration > warningThresholdMs) {
                executionLogger.log({
                  executionId: this.executionId,
                  nodeId,
                  nodeLabel,
                  status: "SUCCESS",
                  error: `Warning: Execution time (${duration}ms) exceeded threshold of ${warningThresholdMs}ms`,
                  level: "Warning"
                }, configuredLogLevel);
              }
              return res;
            } catch (err: any) {
              if (attempts >= retryCount) {
                throw err;
              }
              
              // Calculate backoff
              let delay = retryIntervalMs;
              if (backoffType === "Linear") {
                delay = retryIntervalMs * attempts;
              } else if (backoffType === "Exponential") {
                delay = retryIntervalMs * Math.pow(2, attempts - 1);
              }
              if (delay > maxDelayMs) {
                delay = maxDelayMs;
              }
              
              executionLogger.log({
                executionId: this.executionId,
                nodeId,
                nodeLabel,
                status: "FAILED",
                error: `Attempt ${attempts} failed. Retrying in ${delay}ms... Details: ${err.message}`,
                level: "Warning"
              }, configuredLogLevel);

              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }
        };

        // Route Parallel Nodes / Parallel Splits
        if (
          nodeData?.type === "PARALLEL" || 
          currentNode.type === "parallelNode" ||
          nodeData?.type === "parallelSplit" ||
          currentNode.type === "parallelSplitNode"
        ) {
          if (nodeData?.parallelSplitProperties) {
            const { executeParallelSplit } = await import("./utils/parallelExecutor");
            result = await executeParallelSplit(currentNode, this, this.context);
          } else {
            const branches = (nodeData as any).branches || [];
            result = await runParallelBranches(
              branches,
              this,
              this.context,
              (nodeData as any).properties
            );
          }
        } 
        // Route Standard Activities
        else if (nodeData?.subType !== "start" && nodeData?.subType !== "end") {
          const dragType = (nodeData as any).dragType || nodeData?.subType || nodeData?.label;
          
          if ((dragType === "Message Box" || dragType === "MsgBox") && (this.context as any).onPrompt) {
             const message = (nodeData as any).inputs?.message || (nodeData as any).dialogMessage || nodeLabel;
             const title = (nodeData as any).inputs?.title || (nodeData as any).dialogTitle || "Message";
             result = await (this.context as any).onPrompt({ message, title, node: currentNode });
          } else {
            const executor = activities[dragType];
            if (executor) {
              result = await executeActivity(dragType, executor);
            } else {
              console.warn(`No executor found for activity: ${dragType}`);
            }
          }
        }

        this.context.setLast(result);

        // Gather output and apply masking
        let finalOutput = undefined;
        if (logOutputsAllowed) {
          finalOutput = result;
          if (loggingProps?.maskSensitiveFields && maskFieldsList.length > 0) {
            finalOutput = maskSensitiveData(finalOutput, maskFieldsList);
          }
        }

        executionLogger.log({
          executionId: this.executionId,
          nodeId,
          nodeLabel,
          status: "SUCCESS",
          input: initialInputLog,
          output: finalOutput,
          durationMs: Date.now() - startTime,
          level: "Info"
        }, configuredLogLevel);

        // Performance: Delay After
        const delayAfterRaw = nodeData?.properties?.delayAfter ?? 0;
        const delayAfter = parseInt(String(resolveValue(delayAfterRaw))) || 0;
        if (delayAfter > 0) {
          await new Promise(resolve => setTimeout(resolve, delayAfter));
        }

        // Termination check
        if (nodeData?.subType === "end") {
          console.log("Terminal node reached.");
        } else {
          const nextNodes = this.parser.getNextNodes(currentNode, result);
          activeNodes.push(...nextNodes);
        }

      } catch (err: any) {
        // Exception properties handling
        const continueOnException = !!nodeData?.exception?.continueOnException || !!nodeData?.execution?.continueOnError;
        const severity = nodeData?.exception?.severity || "Error";
        const customMsg = nodeData?.exception?.customMessage || err.message;

        executionLogger.log({
          executionId: this.executionId,
          nodeId,
          nodeLabel,
          status: "FAILED",
          error: customMsg,
          durationMs: Date.now() - startTime,
          level: severity === "Critical" ? "Error" : (severity as any)
        }, configuredLogLevel);

        if (!continueOnException) {
          throw err;
        } else {
          // If continuing, Route to next node anyway (with null or error state)
          const nextNodes = this.parser.getNextNodes(currentNode, null);
          activeNodes.push(...nextNodes);
        }
      }
    }

    return {
      executionId: this.executionId,
      logs: executionLogger.getLogs(),
      variables: this.context.variables
    };
  }

  // Branch execution for parallel blocks
  async executeBranch(nodeIds: string[], context: ExecutionContext) {
    let lastResult: any = null;
    for (const nodeId of nodeIds) {
      const node = this.flow.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      const dragType = (node.data as any).dragType || node.data?.subType || node.data?.label;
      const executor = activities[dragType];
      
      if (executor) {
        lastResult = await executor(node, context);
      }
    }
    return lastResult;
  }
}
