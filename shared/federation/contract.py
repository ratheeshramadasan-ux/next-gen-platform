import uuid
from typing import List, Dict, Any
from pydantic import BaseModel

class ExecutionContract(BaseModel):
    """
    The Unit of Interoperability in MADKF.
    A signed, proof-carrying bundle of binary execution.
    """
    contract_id: str = str(uuid.uuid4())
    
    # Lineage
    source_kernel_id: str
    target_kernel_id: str
    tenant_id: str
    
    # Payload
    bytecode: List[Dict] # AK-ISA Instruction Stream
    
    # Proof Bundle (SEPS + Compliance)
    proof_evidence: Dict[str, Any]
    
    # Constraints
    max_cost: float
    max_latency_ms: int
    compliance_region: str
    
    # Safety Signature (Kernel A's stamp)
    signature: str
