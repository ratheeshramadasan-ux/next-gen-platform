from enum import Enum
from typing import List, Dict, Any
from pydantic import BaseModel

class PolicyLevel(int, Enum):
    GLOBAL_CONSTITUTION = 100
    REGIONAL_LAW = 80
    TENANT_POLICY = 60
    WORKSPACE_RULE = 40
    EXECUTION_CONTEXT = 20

class ConstitutionalRule(BaseModel):
    rule_id: str
    level: PolicyLevel
    scope: str # 'GLOBAL' | 'TENANT' | 'REGION'
    condition: str
    effect: str # 'ALLOW' | 'DENY' | 'REROUTE' | 'PRICE_ADJUST'
    
class ARLConstitution:
    """
    The Machine-Executable Root Law of the AI OS.
    Defines the binding boundaries for all autonomous agents.
    """
    def __init__(self):
        self.rules: List[ConstitutionalRule] = [
            ConstitutionalRule(
                rule_id="ROOT_ISOLATION",
                level=PolicyLevel.GLOBAL_CONSTITUTION,
                scope="GLOBAL",
                condition="request.tenant_id == kernel.tenant_id",
                effect="ALLOW"
            ),
            ConstitutionalRule(
                rule_id="GDPR_REGIONALITY",
                level=PolicyLevel.REGIONAL_LAW,
                scope="REGION",
                condition="data.classification == 'SENSITIVE' AND region == 'EU'",
                effect="REROUTE"
            )
        ]
        
    def get_precedence_graph(self) -> List[ConstitutionalRule]:
        """Returns rules sorted by hierarchical precedence."""
        return sorted(self.rules, key=lambda x: x.level, reverse=True)
