# Activity Safety Classification

This document classifies all existing and planned activities within the platform based on their replay safety, determinism, and side-effect properties.

## Classification Categories

1.  **Pure**: No side effects, fully deterministic (e.g., data transformation).
2.  **Replay-Safe (Idempotent)**: Can be re-executed safely without changing final state.
3.  **Compensatable**: Has side effects, but provides an explicit rollback/compensation activity.
4.  **External Side-Effect**: Mutates external state without guarantees of idempotency (Unsafe).
5.  **AI Non-Deterministic**: Relies on LLMs; output varies between executions.
6.  **Unsafe/Non-Replayable**: Violates determinism rules entirely (e.g., raw filesystem reads, unseeded randoms).

---

## 1. Orchestrator & AI Activities

### `generateWorkflow` (aiPlanner.ts)
*   **Classification**: **AI Non-Deterministic**
*   **Safety**: **UNSAFE FOR AUTOMATIC REPLAY**
*   **Details**: Calls OpenAI to generate a DAG. If replayed, it will generate a different DAG, corrupting the subsequent workflow history.
*   **Remediation**: The generated DAG must be snapshotted into a `WorkflowPlanned` event payload. Replays must read from this payload, completely bypassing `aiPlanner.ts`.

### `enqueueJobs` (queue.ts)
*   **Classification**: **External Side-Effect**
*   **Safety**: **RISKY**
*   **Details**: Pushes to Redis. If a workflow fails and retries, it might enqueue the job twice.
*   **Remediation**: Requires a transactional outbox or an explicit deduplication ID derived from the `rootExecutionId` + `activityId`.

## 2. Bot Runner / RPA Activities

### `BrowserAutomation` / `DOM_Scrape`
*   **Classification**: **External Side-Effect** (Read-Only)
*   **Safety**: **RISKY**
*   **Details**: Scraping the same URL twice might yield different DOMs if the site updated or has dynamic ads.
*   **Remediation**: Scraped output must be snapshotted to the event log. Replays must return the cached DOM payload.

### `Form_Submit` / `Click_Checkout`
*   **Classification**: **External Side-Effect** (Mutating)
*   **Safety**: **UNSAFE**
*   **Details**: Clicking "Buy" or submitting a form twice causes duplicate transactions.
*   **Remediation**: Cannot be replayed. Orchestrator must provide explicit idempotency keys to the worker, and the worker must use them if the target system supports it. Otherwise, requires human-in-the-loop approval before retry.

## 3. Platform Internal Activities

### `CAService.issueVMCertificate`
*   **Classification**: **External Side-Effect** (Idempotent by logic, but generates new certs)
*   **Safety**: **REPLAY-SAFE (With Caveats)**
*   **Details**: Generates a new cryptographic keypair. However, since the output is saved to the DB and returned to the worker, replaying the exact request will generate a *different* cert, but won't break the system mechanically.
*   **Remediation**: The orchestrator shouldn't be replaying certificate issuance as part of a business workflow anyway.

## Summary of Debt & Immediate Actions

> [!WARNING]
> **Critical Determinism Violation Identified**
> `aiPlanner.ts` is currently invoked synchronously in the API route *before* any execution events are persisted. This prevents the initial AI planning phase from being governed by the replay engine.
> 
> **Action**: `generateWorkflow` must be wrapped as a formal Activity whose output is firmly recorded in the `ExecutionEvent` ledger.

*   **Activities requiring snapshotting**: All AI calls, all Browser Scrapes, all HTTP GETs.
*   **Activities requiring compensation logic**: Payment processing, 3rd party API POSTs (e.g., Salesforce updates).
*   **Activities unsafe for automatic replay**: Form submissions without idempotency tokens.
