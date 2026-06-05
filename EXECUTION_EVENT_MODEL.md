# Execution Event Model

This document formally defines the Execution Event Model for the platform, outlining canonical events, ownership, replay semantics, lease management, hydration, and governance.

## 1. Canonical Execution Events

The system uses a standardized set of canonical events to represent the state machine of workflows and activities.

*   **WorkflowCreated**: Emitted when a workflow request is accepted and initial state is persisted.
*   **WorkflowStarted**: Emitted when the first execution logic of the workflow begins.
*   **WorkflowSuspended**: Emitted when a workflow yields execution, waiting for an external trigger or timer.
*   **WorkflowResumed**: Emitted when a suspended workflow is woken up by a trigger or timer.
*   **WorkflowCompleted**: Emitted when a workflow successfully finishes its final instruction.
*   **WorkflowFailed**: Emitted when a workflow encounters an unhandled terminal error.
*   **ActivityScheduled**: Emitted when the workflow engine requests an activity to be executed by a worker.
*   **ActivityStarted**: Emitted when a worker acquires the lease for an activity and begins processing.
*   **ActivityCompleted**: Emitted when a worker successfully finishes an activity.
*   **ActivityFailed**: Emitted when an activity fails execution and may or may not be retried based on policy.
*   **ActivityRetried**: Emitted when a failed activity is scheduled for another attempt.
*   **LeaseAcquired**: Emitted when a worker successfully locks an execution task.
*   **LeaseExpired**: Emitted when a worker fails to heartbeat or complete a task within the lease TTL.
*   **ApprovalRequested**: Emitted when a workflow execution hits an approval boundary.
*   **ApprovalGranted**: Emitted when an authorized entity approves the pending request.
*   **ApprovalRejected**: Emitted when an authorized entity rejects the pending request.
*   **GovernanceDenied**: Emitted when an execution action is blocked by governance policies.
*   **AIReasoningGenerated**: Emitted when an AI agent produces a decision, plan, or insight.
*   **CompensationStarted**: Emitted when a workflow begins its compensation sequence due to a failure or cancellation.
*   **CompensationCompleted**: Emitted when all compensation steps have successfully finished.

## 2. Event Ownership Rules

Clear ownership boundaries are strictly enforced to prevent race conditions and maintain state integrity.

*   **Who emits events**: 
    *   *Orchestration Engine*: Emits Workflow, Scheduling, Lease, and general Lifecycle events.
    *   *Workers*: Emit Activity Execution (Started, Completed, Failed) events back to the engine.
    *   *Governance/Security Services*: Emit Governance and Approval events.
*   **Who owns orchestration truth**: The Central Orchestration Engine (and its backing persistent event store) is the single source of truth for workflow progress.
*   **Who owns workflow state**: The Orchestration Engine owns the canonical state. Workers only hold ephemeral, localized state for their current lease.
*   **Who owns retries**: The Orchestration Engine owns the retry policy execution. Workers simply fail and let the engine decide whether to emit an `ActivityRetried` event.
*   **Who owns approvals**: The Identity/Governance Service owns approval state and validation, signaling back to the Orchestration Engine.
*   **Who owns compensation**: The Workflow Definition itself defines the compensation logic, but the Orchestration Engine owns the routing and tracking of the compensation execution state.

## 3. Replay Semantics

To ensure deterministic execution, the workflow engine relies on strict replay rules.

*   **Replay-safe activities**: Activities must be pure and deterministic *or* side-effecting operations must be executed at-most-once by the worker and recorded in the event history so the engine can provide the cached result on replay.
*   **Non-idempotent activities**: Must be wrapped in transactional outboxes or executed with explicit idempotency keys. The orchestration engine guarantees at-most-once scheduling for these if marked.
*   **Compensation rules**: Compensation logic must be idempotent, as compensations themselves can fail and be retried.
*   **Deterministic boundaries**: Workflow logic (the orchestrator code) must be 100% deterministic. Random numbers, current time, and external I/O must be accessed through injected engine APIs that record the values in the event history for consistent replay.
*   **Retry fencing**: Ensures that retries of activities do not overlap. An activity is only retried after the previous attempt has definitively failed or its lease has expired.
*   **Event ordering guarantees**: Events are strictly ordered per workflow execution ID. Replays apply events in the exact sequence they were originally recorded.

## 4. Execution Lease Model

The system uses a lease-based model to distribute work and handle worker failures.

*   **Worker leases**: When a worker pulls a task, it acquires a time-bound lease. The engine records `LeaseAcquired`.
*   **Lease expiration**: If the worker does not complete the task or send a heartbeat before the lease TTL expires, the engine emits `LeaseExpired` and the task becomes available for other workers.
*   **Ownership transfer**: A task can only be owned by one worker at a time. Explicit handoffs require the current worker to release the lease.
*   **Retry fencing**: To prevent split-brain where a delayed worker completes a task after its lease expired and another worker picked it up, all activity completions must include a fencing token (Execution Generation ID).
*   **Split-brain prevention**: The underlying datastore uses conditional writes based on the Execution Generation ID to ensure only the valid leaseholder can commit results.
*   **Execution generation IDs**: A monotonically increasing integer or UUID assigned per lease attempt. Stale generation IDs attempting to commit results are rejected.

## 5. Workflow Hydration Model

Hydration determines how workflow state is restored in memory for active processing or debugging.

*   **What gets persisted**: The canonical event history stream (inputs, outputs of activities, timers, signals).
*   **What gets reconstructed**: The current workflow state (variables, call stack, thread state) is reconstructed by replaying the persisted event history against the workflow definition code.
*   **Hydration boundaries**: Large payloads are not stored directly in the event history. Instead, pointers (URIs) to blob storage are persisted to keep hydration fast.
*   **AI context recovery**: AI reasoning context (e.g., prompt history, context windows) is treated as workflow state. Heavy context is stored in external document stores, with references in the event log, to allow the AI to resume reasoning upon hydration without storing MBs of text in the core event log.
*   **Approval restoration**: Pending approvals halt replay until the `ApprovalGranted` event is encountered in the history.
*   **Execution snapshot rules**: To prevent long replays, the engine periodically persists a snapshot of the fully hydrated state. Future hydrations load the latest snapshot and only replay events that occurred after the snapshot was taken.

## 6. Governance Versioning

Policies and rules change over time; workflows must execute under predictable governance rules.

*   **Policy epoch IDs**: Every version of a governance policy is assigned an immutable Epoch ID.
*   **Execution governance snapshots**: When a workflow is created, it captures the current Policy Epoch IDs for all relevant policies. The workflow executes against this snapshot to ensure consistent rules throughout its lifecycle.
*   **Token invalidation**: If a severe security policy is updated (e.g., revoking access), an out-of-band process can broadcast a token invalidation event, forcibly suspending or failing running workflows that match specific criteria.
*   **Runtime revalidation rules**: Long-running workflows can be configured with revalidation points. At these boundaries, the workflow explicitly requests the latest Policy Epoch ID and updates its internal snapshot, optionally triggering compensation if the new policies are incompatible with the current state.
