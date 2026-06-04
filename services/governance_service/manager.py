import uuid
from typing import Dict, Any
from core.governance_engine.policy_hub import PolicyDecisionHub
from core.governance_engine.approval_engine import ApprovalDAGEngine

class GovernanceManager:
    """
    The Governance Service is the orchestration layer for compliance and approvals.
    It coordinates between the Policy Hub and the Approval DAG Engine.
    """
    def __init__(self, db_client):
        self.db = db_client
        self.policy_hub = PolicyDecisionHub(db_client)
        self.approval_engine = ApprovalDAGEngine(db_client)

    async def execute_governance_check(self, tenant_id: uuid.UUID, execution_id: uuid.UUID, context: Dict[str, Any]):
        """
        Performs the pre-execution intercept.
        """
        # 1. Evaluate Policies
        result = await self.policy_hub.evaluate_execution(tenant_id, context)
        
        # 2. Log Evaluation
        await self.policy_hub.log_evaluation({**result, "execution_id": str(execution_id), "tenant_id": str(tenant_id)})
        
        # 3. Handle Decision
        if result["decision"] == "REQUIRE_APPROVAL":
            # Create Approval Flow
            await self.approval_engine.create_approval_flow(tenant_id, execution_id, result)
            return "PAUSE"
            
        elif result["decision"] == "DENY":
            return "TERMINATE"
            
        return "ALLOW"

    async def record_decision(self, node_id: uuid.UUID, user_id: uuid.UUID, action: str, comments: str):
        """
        Processes a manual approval/rejection.
        """
        await self.approval_engine.process_decision(node_id, user_id, action, comments)
