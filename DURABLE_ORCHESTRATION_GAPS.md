# Durable Orchestration Gaps

This document identifies the remaining replay and durable execution gaps that must be eliminated to achieve stable orchestration truth, as discovered during Phase 2.

## 1. Durable Suspension Model Gaps
Currently, workflows execute in memory and cannot safely suspend and wake up.
*   **Missing Events**: We lack `WorkflowSuspended`, `WorkflowResumed`, `TimerScheduled`, `TimerTriggered`, and `LeaseExpired` in our formal event dictionary.
*   **Forever Suspended Risk**: If a worker yields (e.g., waiting for an approval) and crashes, the orchestrator does not know it needs to re-queue the workflow. It remains in memory.
*   **Missing Wake Orchestration**: There is no durable mechanism that wakes up a sleeping workflow when a timer fires.

## 2. Activity Attempt Identity Gaps
*   **Duplicate Protection**: The current `generationId` protects against stale leases, but does NOT protect against duplicate `ActivityCompleted` payloads if a worker successfully completes an activity twice within the *same* generation (e.g., local thread race).
*   **Attempt Lineage**: We cannot track "Attempt 1 failed, Attempt 2 succeeded" deterministically without a unique `activityAttemptId` embedded in the event schema or payload.

## 3. Event Acceptance Decoupling Gaps
*   **Coupled Ingestion**: `commitExecutionEvent` inside `executionStore.ts` writes the `ExecutionEvent` and updates `ExecutionRun` in the *same* Prisma transaction.
*   **Rejection Risk**: If the projection update fails (e.g., due to a data constraint error on a mutated JSON column), the entire transaction rolls back. This drops the event completely, losing the authoritative truth. Event ingestion must never fail because a projection fails.

## 4. Projection Rebuild Gaps
*   **No Rebuild Tooling**: There is no script or engine to truncate `ExecutionRun` and replay the `ExecutionEvent` stream from `id=0`.
*   **Hidden State**: Rebuilding requires a formal state machine that doesn't exist yet (the projection logic is currently hardcoded synchronously).

## 5. Durable Timer Supervisor Gaps
*   **No Supervisor**: We rely entirely on the worker staying alive for timeouts. If a worker dies, its timers die with it.

## 6. AI Planning Eventization Gaps
*   **Synchronous AI Call**: `runIntent.ts` calls `aiPlanner.ts` directly over HTTP. If this fails, no record is kept. If it succeeds, the workflow is built, but replaying the workflow will call OpenAI again, resulting in a different DAG (non-deterministic).
*   **Missing Event**: We need a `WorkflowPlanned` event that snapshots the generated DAG.

## 7. Determinism Enforcement Violations
*   `aiPlanner.ts` violates determinism by making direct HTTP calls outside of the event lineage.
