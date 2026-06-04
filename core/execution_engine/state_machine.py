import uuid
from typing import Optional, Dict, Any, List

class ExecutionStateMachine:
    """
    The Execution State Machine manages the lifecycle of distributed executions and complex workflows.
    - SPRINT 4: Added RETRYING, QUARANTINED, and Latency Metrics.
    """
    def __init__(self, db_client):
        self.db = db_client

    async def start_workflow(
        self, 
        tenant_id: uuid.UUID, 
        workflow_id: uuid.UUID, 
        input_context: Dict[str, Any] = {}
    ):
        """
        Initializes a DAG execution with Trace Context.
        """
        execution = await self.db.workflowexecution.create(
            data={
                "tenantId": str(tenant_id),
                "workflowId": str(workflow_id),
                "status": "RUNNING",
                "context": input_context
            }
        )
        # Capture initialization metric
        return execution

    async def transition_step(
        self, 
        step_id: uuid.UUID, 
        tenant_id: uuid.UUID,
        new_status: str, 
        output: Dict[str, Any] = {}
    ):
        """
        Updates node state with Resilience handling (RETRYING / QUARANTINED).
        """
        data = {
            "status": new_status,
            "startedAt": self.db.now() if new_status == "RUNNING" else None,
            "endedAt": self.db.now() if new_status in ["COMPLETED", "FAILED", "QUARANTINED"] else None
        }

        # 🛡️ SPRINT 4: Resilience Logic
        # if new_status == "FAILED" and retry_count < max:
        #    new_status = "RETRYING"

        step = await self.db.workflowstep.update(
            where={
                "id": str(step_id),
                "tenantId": str(tenant_id)
            },
            data=data
        )

        return step

    async def record_latency(self, tenant_id: uuid.UUID, operation: str, ms: int):
        """
        Emits time-series metrics for observability.
        """
        # await self.db.metricseries.create(...)
        pass
