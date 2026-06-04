import uuid
from typing import Dict, Any

class ELAKBiddingAgent:
    """
    The Autonomous Bidding Logic (The Kernel's Wallet).
    Decides the 'Ask' price for a kernel based on load and trust.
    """
    def __init__(self, kernel_id: str, load_monitor):
        self.kernel_id = kernel_id
        self.monitor = load_monitor

    async def calculate_bid(self, contract: Dict) -> float:
        """
        Dynamically prices a compute job.
        Price = Base_Cost * (1 + Resource_Pressure)
        """
        base_cost = 10.0
        pressure = self.monitor.get_current_pressure() # 0.0 to 1.0
        
        # Urgency Premium
        is_urgent = contract.get("deadline_ms", 5000) < 1000
        multiplier = 1.5 if is_urgent else 1.0
        
        final_ask = base_cost * (1 + pressure) * multiplier
        print(f"💰 Agent: Kernel {self.kernel_id} bidding {final_ask} for task.")
        return final_ask
