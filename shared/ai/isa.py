from enum import Enum
from typing import Dict, Any, List
from pydantic import BaseModel

class ISAOpCode(str, Enum):
    # L5: Intent
    INTENT_CREATE = "INTENT.CREATE"
    INTENT_AUGMENT = "INTENT.AUGMENT"
    
    # L4: Planning
    GRAPH_CREATE = "GRAPH.CREATE"
    GRAPH_ADD_NODE = "GRAPH.ADD_NODE"
    GRAPH_ADD_EDGE = "GRAPH.ADD_EDGE"
    GRAPH_OPTIMIZE = "GRAPH.OPTIMIZE"
    
    # L3: Execution
    TASK_SUBMIT = "TASK.SUBMIT"
    TASK_WAIT = "TASK.WAIT"
    TASK_RESULT = "TASK.RESULT"
    TASK_RETRY = "TASK.RETRY"
    
    # L2: Resource
    RESOURCE_CLAIM_VM = "RESOURCE.CLAIM_VM"
    RESOURCE_RELEASE_VM = "RESOURCE.RELEASE_VM"
    
    # L1: Governance (Safety Kernel)
    GOVERNANCE_VALIDATE = "GOVERNANCE.VALIDATE"
    GOVERNANCE_AUDIT = "GOVERNANCE.AUDIT_LOG"
    GOVERNANCE_SIMULATE = "GOVERNANCE.SIMULATE"

class AKInstruction(BaseModel):
    opcode: ISAOpCode
    params: Dict[str, Any]
    metadata: Dict[str, Any] = {}
    
    # Traceability
    instruction_id: str
    tenant_id: str
