# Replay Validation Report

This document validates the orchestration truth integrity of the NexusAI Platform, proving that the recently implemented append-only lineage is sufficient for replay, and identifying any remaining gaps before scaling complexity.

## 1. Projection Rebuild Validation

**Current Status:** Mutable execution projections (`ExecutionRun` and `AutomationExecutionLog`) can technically be rebuilt from `ExecutionEvent`, but there are gaps in the mapping.

*   **Projection Inconsistencies [P1]**: `AutomationExecutionLog` and `StudioExecutionLog` are currently disjointed from the core `ExecutionRun` state. Replaying from `ExecutionEvent` would reconstruct `ExecutionRun`, but the legacy Next.js log tables do not have an automated re-projection strategy.
*   **Missing Replay Metadata [P2]**: Activity inputs/outputs are stored in `ExecutionLog`, which is mutable. If `ExecutionEvent` does not capture the full payload of activity inputs and outputs natively, we risk data loss during replay.
*   **State Mutation Leakage [P1]**: Legacy routes in the `web` application may still attempt to update `AutomationExecutionLog` directly using Prisma, bypassing the Orchestrator's `executionStore.ts` and `ExecutionEvent` ledger.
*   **Non-Event-Backed Execution State [P0]**: Workflow suspensions and timer state are currently not fully represented in `ExecutionEvent`. If a worker crashes during a suspension, the orchestrator has no timer event to wake it back up deterministically.

## 2. Event Ordering Validation

**Current Status:** The system uses a basic UUID timestamp-based ordering, combined with `generationId` fencing.

*   **Race-Condition Risks [P1]**: While `generationId` prevents an expired lease from committing, concurrent requests from the *same* valid leaseholder (e.g., parallel async updates) could land out of order if they rely purely on the `timestamp` column rather than an explicit `eventSequence` integer.
*   **Duplicate Completion Risks [P2]**: If an `ActivityCompleted` event is received, but the projection update fails, a worker might retry. Fencing prevents this *if* the generation ID is rotated, but explicit idempotency keys per activity attempt are missing.
*   **Stale Generation Edge Cases [P3]**: If the orchestrator crashes between appending to `ExecutionEvent` and updating `ExecutionRun` (which is mitigated by the Prisma transaction), but if the transaction fails due to DB timeouts, the worker will be unaware and hold a stale lease.
*   **Correlation Lineage [Validated]**: `correlationId`, `causationId`, and `rootExecutionId` are explicitly tracked in `executionStore.ts`, providing a solid foundation for tracing.

## 3. Execution Replay Simulation

Simulated scenarios based on the current `executionStore.ts` logic:

*   **Successful Workflow Execution**: Deterministic and fully auditable. The sequence of `WorkflowStarted` -> `ActivityCompleted` -> `WorkflowCompleted` forms a perfect reconstructable lineage.
*   **Worker Crash During Execution**: `LeaseExpired` is not automatically emitted. The system currently relies on manual timeout sweeps (missing). Replay would halt indefinitely without a timeout supervisor.
*   **Retry Takeover via Generation Fencing**: **Pass**. A new worker acquiring the lease rotates the `generationId`. The old worker's commit throws a `Fencing Token Mismatch` and the system state is preserved.
*   **Governance Denial**: **Pass**. The interceptor successfully catches the mutation and appends `GovernanceDenied` before rejecting the HTTP request.
*   **Duplicate Worker Completion**: **Fail (Partial)**. If the worker sends `ActivityCompleted` twice within the same lease generation, the event store will accept both, creating an ambiguous replay history unless the application explicitly deduplicates based on activity ID.

## 4. Side-Effect Classification Audit

See [ACTIVITY_SAFETY_CLASSIFICATION.md](./ACTIVITY_SAFETY_CLASSIFICATION.md) for the detailed activity classification.

## 5. Projection Ownership Validation

**Current Status:** Ambiguous ownership between the API layer and the worker nodes.

*   **Current Ownership Ambiguity**: `executionStore.ts` acts as the projection engine by synchronously updating `ExecutionRun` when an event is committed. This tightly couples event ingestion with projection logic.
*   **Projection Lifecycle Rules**: Projections are currently synchronous. If a projection update fails due to schema validation, the event ingestion also fails, violating the principle that the event log should accept all reality.
*   **Projection Repair Strategy**: Currently non-existent. There is no script to wipe `ExecutionRun` and rebuild it by streaming `ExecutionEvent` from ID 0.
*   **Replay Reconciliation Ownership**: Unclaimed. When a workflow hydrates, there is no component explicitly tasked with reconciling the hydrated memory state against the DB projection.

## 6. Runtime Durability Gaps

**Current Status:** High reliance on active network connections and synchronous processing.

*   **In-Memory Orchestration Assumptions**: The orchestrator (`runIntent.ts`) pushes jobs directly to Redis (`queue.ts`) without recording a `WorkflowScheduled` event in the DB first. If Redis crashes or the worker drops the job, the workflow is lost in the void.
*   **Replay-Breaking Request Dependencies**: Intent processing relies on a live OpenAI HTTP connection (`aiPlanner.ts`) outside of the deterministic worker loop.
*   **Retry Amplification Risks**: The `bot-runner-portal` polling mechanism is synchronous HTTP. If the orchestrator slows down, workers might retry polling aggressively, overwhelming the DB connection pool.
