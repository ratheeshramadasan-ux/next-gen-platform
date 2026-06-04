import { ExecutionContext } from "../Context";

export async function runParallelBranches(
  branches: string[][],
  engine: any,
  context: ExecutionContext,
  config: { maxThreads?: number; waitForAll?: boolean } = {}
) {
  const { maxThreads = 5, waitForAll = true } = config;
  const results: any[] = [];
  let activePromises: Promise<any>[] = [];

  for (const branch of branches) {
    const promise = engine.executeBranch(branch, context);
    activePromises.push(promise);

    if (activePromises.length >= maxThreads) {
      // In a real implementation, we would use p-limit or similar
      // For now, we wait for one to finish
      const res = await Promise.race(activePromises);
      results.push(res);
      // This is a simplified race removal
      activePromises = activePromises.filter(p => p !== promise);
    }
  }

  if (waitForAll) {
    const remaining = await Promise.all(activePromises);
    results.push(...remaining);
  } else {
    if (activePromises.length > 0) {
      const first = await Promise.race(activePromises);
      results.push(first);
    }
  }

  return results;
}
