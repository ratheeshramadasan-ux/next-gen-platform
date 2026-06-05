# Orchestration Determinism Rules

To ensure reliable, replayable, and safe workflow execution, strict determinism rules apply to all orchestration logic. These rules ensure that workflow replays from event history always result in the exact same state transitions.

## 1. No Mutable Globals
Workflows must not rely on or modify any global variables. Global state causes execution paths to diverge during concurrent executions or replays. State must only exist within the bounds of the workflow execution context or be passed explicitly as arguments.

## 2. No `Date.now()` or Native Timers
Direct usage of `Date.now()`, `new Date()`, `setTimeout`, or `setInterval` within orchestration logic is **strictly forbidden**.
*   **Why**: Time changes constantly. Replaying a workflow at a later date will yield different times, breaking determinism.
*   **Solution**: Use the injected `orchestrator.now()` or equivalent engine API, which returns the time recorded in the deterministic event history.

## 3. No Random Numbers
Direct usage of `Math.random()`, UUID generators, or any other non-deterministic source of randomness is **strictly forbidden**.
*   **Why**: A random number generated during the first execution will not match the random number generated during a replay.
*   **Solution**: Use the injected `orchestrator.random()` or equivalent engine API that records the random seed or value in the event history.

## 4. No Uncontrolled Async Races
Using `Promise.race()`, relying on arbitrary `setTimeout` delays to sequence events, or creating uncoordinated background promises is **forbidden**.
*   **Why**: The order in which unresolved async tasks complete in V8/Node.js depends on the microtask queue, OS scheduler, and I/O latency, meaning execution order is not guaranteed during replays.
*   **Solution**: Use deterministic concurrency primitives provided by the engine (e.g., `orchestrator.waitAll()`, `orchestrator.race()`).

## 5. No Filesystem Access
Direct filesystem access (e.g., `fs.readFileSync`, `fs.writeFileSync`) from within orchestration logic is **strictly forbidden**.
*   **Why**: The file system is external mutable state. Files might be deleted, modified, or have different permissions across different worker nodes or over time.
*   **Solution**: Any interaction with files must be modeled as an Activity. Activities execute exactly once, and their results (e.g., file metadata or contents) are recorded in the event history for deterministic replay.

## 6. No Direct HTTP / Network Calls
Making direct HTTP requests (e.g., `fetch()`, `axios.get()`), database queries (e.g., `prisma.findUnique()`), or arbitrary network calls from orchestration logic is **strictly forbidden**.
*   **Why**: Network calls are inherently non-deterministic. They can fail, return different data, or experience high latency.
*   **Solution**: Wrap all network calls and database queries in Activities. The result of the activity is committed to the event log, ensuring replays use the cached result without making the external call again.
