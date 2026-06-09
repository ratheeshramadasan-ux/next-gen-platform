import { ExecutionContext } from "../Context";

export async function runParallelBranches(
  branches: string[][],
  engine: any,
  context: ExecutionContext,
  config: any = {}
) {
  // Backwards compatibility fallback if config is empty or doesn't have parallelSplit properties
  const splitProperties = config.parallelSplitProperties || {
    splitMode: config.waitForAll !== false ? "wait-all" : "wait-any",
    concurrency: { maxParallelBranches: config.maxThreads || 5, queueExcess: true },
    branches: branches.map((b, idx) => ({
      branchId: `branch_${idx}`,
      branchName: `Branch ${idx}`,
      targetNodeId: b[0] || "",
    })),
    timeout: { enabled: false },
    retry: { enabled: false },
    errorHandling: { strategy: "continue" },
    outputMerge: { strategy: "merge" },
  };

  return await executeParallelSplit({ data: { parallelSplitProperties: splitProperties } } as any, engine, context);
}

export async function executeParallelSplit(
  node: any,
  engine: any,
  context: ExecutionContext
) {
  const props = node.data?.parallelSplitProperties || {
    splitMode: "wait-all",
    concurrency: { maxParallelBranches: 5 },
    branches: [],
    timeout: { enabled: false },
    retry: { enabled: false },
    errorHandling: { strategy: "continue" },
    outputMerge: { strategy: "merge" },
  };

  const splitId = node.id || "split_" + Date.now();
  const branchesList = props.branches || [];
  const splitMode = props.splitMode || "wait-all";
  const requiredCount = props.requiredBranches || 1;
  const maxConcurrency = props.concurrency?.maxParallelBranches || 5;
  const cancelOnSuccess = !!props.cancelRemainingOnSuccess;
  
  // Parse delay/duration helper
  const parseTimeToMs = (timeStr: string | undefined, defaultMs: number): number => {
    if (!timeStr) return defaultMs;
    const num = parseFloat(timeStr);
    if (isNaN(num)) return defaultMs;
    if (timeStr.endsWith("s")) return num * 1000;
    if (timeStr.endsWith("m")) return num * 60 * 1000;
    if (timeStr.endsWith("h")) return num * 3600 * 1000;
    return num;
  };

  const branchTimeoutMs = props.timeout?.enabled ? parseTimeToMs(props.timeout?.duration, 300000) : 0;
  const retryEnabled = props.retry?.enabled;
  const maxAttempts = retryEnabled ? (props.retry?.maxAttempts || 3) : 1;
  const retryDelayMs = parseTimeToMs(props.retry?.delay, 2000);
  const backoffType = props.retry?.backoff || "fixed";
  const errorStrategy = props.errorHandling?.strategy || "continue";

  const branchStates: any[] = [];
  const activeAborts: Record<string, () => void> = {};

  const executeBranchWithPolicies = async (branch: any) => {
    const branchId = branch.branchId;
    const targetNodeId = branch.targetNodeId;
    const startTime = Date.now();

    const branchState = {
      branchId,
      status: "running",
      startedAt: new Date().toISOString(),
    };
    branchStates.push(branchState);

    let attempts = 0;
    let lastError: any = null;
    let branchResult: any = null;

    // Timeout Promise wrapper
    const runTimeoutPromise = (ms: number, abortCallback: (cb: () => void) => void) => {
      let timeoutId: any;
      let isSettled = false;
      const p = new Promise<any>(async (resolve, reject) => {
        timeoutId = setTimeout(() => {
          if (!isSettled) {
            isSettled = true;
            reject(new Error(`Timeout exceeded for branch: ${branchId}`));
          }
        }, ms);

        abortCallback(() => {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            reject(new Error("Cancelled"));
          }
        });

        try {
          const res = await engine.executeBranch([targetNodeId], context);
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            resolve(res);
          }
        } catch (err) {
          if (!isSettled) {
            isSettled = true;
            clearTimeout(timeoutId);
            reject(err);
          }
        }
      });
      return p;
    };

    while (attempts < maxAttempts) {
      attempts++;
      try {
        if (branchTimeoutMs > 0) {
          branchResult = await runTimeoutPromise(branchTimeoutMs, (cancelFn) => {
            activeAborts[branchId] = cancelFn;
          });
        } else {
          let aborted = false;
          activeAborts[branchId] = () => { aborted = true; };
          const res = await engine.executeBranch([targetNodeId], context);
          if (aborted) throw new Error("Cancelled");
          branchResult = res;
        }
        
        // Success
        branchState.status = "completed";
        (branchState as any).completedAt = new Date().toISOString();
        (branchState as any).durationMs = Date.now() - startTime;
        return { branchId, success: true, result: branchResult };
      } catch (err: any) {
        lastError = err;
        if (err.message === "Cancelled") {
          branchState.status = "skipped";
          return { branchId, success: false, error: err.message };
        }

        // Apply backoff delay if retrying
        if (attempts < maxAttempts) {
          let delay = retryDelayMs;
          if (backoffType === "linear") {
            delay = retryDelayMs * attempts;
          } else if (backoffType === "exponential") {
            delay = retryDelayMs * Math.pow(2, attempts - 1);
          }
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Mark as failed
    branchState.status = "failed";
    (branchState as any).completedAt = new Date().toISOString();
    (branchState as any).durationMs = Date.now() - startTime;
    (branchState as any).error = lastError?.message || "Unknown error";

    if (errorStrategy === "fail-workflow") {
      throw lastError || new Error(`Branch ${branchId} failed`);
    }

    return { branchId, success: false, result: null, error: lastError?.message };
  };

  // Execution Pool with Concurrency Limiting
  const results: any[] = [];
  const runningPromises: Map<string, Promise<any>> = new Map();
  const queue = [...branchesList];

  let successCount = 0;

  const triggerNext = (): Promise<void> | null => {
    if (queue.length === 0) return null;
    const branch = queue.shift()!;
    const p = executeBranchWithPolicies(branch).then((res) => {
      runningPromises.delete(branch.branchId);
      if (res.success) {
        successCount++;
      }
      results.push(res);

      // Trigger next items in the queue
      const next = triggerNext();
      return next ? next : Promise.resolve();
    });
    runningPromises.set(branch.branchId, p);
    return p;
  };

  // Bootstrap initial concurrent execution
  const initialTriggers: Promise<any>[] = [];
  while (initialTriggers.length < maxConcurrency && queue.length > 0) {
    const p = triggerNext();
    if (p) initialTriggers.push(p);
  }

  // Handle Wait Modes
  const waitPromises = () => Array.from(runningPromises.values());

  if (splitMode === "wait-all") {
    while (runningPromises.size > 0 || queue.length > 0) {
      await Promise.all(waitPromises());
    }
  } else if (splitMode === "wait-any") {
    while (successCount === 0 && (runningPromises.size > 0 || queue.length > 0)) {
      await Promise.race(waitPromises());
    }
    // Cancel rest if cancel remaining on success
    if (cancelOnSuccess && successCount > 0) {
      for (const [bId, abort] of Object.entries(activeAborts)) {
        const state = branchStates.find(s => s.branchId === bId);
        if (state && state.status === "running") {
          abort();
        }
      }
    }
  } else if (splitMode === "wait-n") {
    while (successCount < requiredCount && (runningPromises.size > 0 || queue.length > 0)) {
      await Promise.race(waitPromises());
    }
    if (cancelOnSuccess && successCount >= requiredCount) {
      for (const [bId, abort] of Object.entries(activeAborts)) {
        const state = branchStates.find(s => s.branchId === bId);
        if (state && state.status === "running") {
          abort();
        }
      }
    }
  } else if (splitMode === "fire-and-forget") {
    // Fire all initial and don't wait for resolution
    Promise.allSettled(waitPromises()).catch(console.error);
    return [];
  }

  // Calculate enterprise metrics
  const completedDurations = branchStates
    .filter(s => s.durationMs !== undefined)
    .map(s => s.durationMs as number);

  const totalBranches = branchStates.length;
  const completedBranches = branchStates.filter(s => s.status === "completed").length;
  const failedBranches = branchStates.filter(s => s.status === "failed").length;

  const avgExecutionTime = completedDurations.length > 0 
    ? Math.round(completedDurations.reduce((a, b) => a + b, 0) / completedDurations.length) 
    : 0;
  const maxExecutionTime = completedDurations.length > 0 ? Math.max(...completedDurations) : 0;
  const minExecutionTime = completedDurations.length > 0 ? Math.min(...completedDurations) : 0;

  const splitState = {
    splitId,
    workflowInstanceId: engine.executionId,
    status: failedBranches === 0 ? "completed" : completedBranches > 0 ? "partial" : "failed",
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    branches: branchStates,
    metrics: {
      totalBranches,
      completedBranches,
      failedBranches,
      avgExecutionTime,
      maxExecutionTime,
      minExecutionTime
    }
  };

  // Attach state to node
  node.data.parallelSplitState = splitState;

  // Merge output strategy
  const outputStrategy = props.outputMerge?.strategy || "merge";
  const outputResults = results.map(r => r.result).filter(Boolean);

  if (outputStrategy === "first-win" && outputResults.length > 0) {
    return outputResults[0];
  } else if (outputStrategy === "last-win" && outputResults.length > 0) {
    return outputResults[outputResults.length - 1];
  } else if (outputStrategy === "overwrite" && outputResults.length > 0) {
    return outputResults[outputResults.length - 1];
  }

  // Default: merge results into a single object
  const merged = {};
  for (const res of outputResults) {
    if (typeof res === "object") {
      Object.assign(merged, res);
    }
  }
  return merged;
}
