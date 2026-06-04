import uuid
from typing import List, Dict, Any

class ComputeContract(dict):
    """The unit of work in the ELAK market."""
    pass

class KernelBid(dict):
    """A proposal from a sovereign kernel to execute a contract."""
    pass

class ELAKMarketEngine:
    """
    The Market-Clearing Scheduler (The Economic Heart).
    Replaces static scheduling with dynamic compute bidding.
    """
    def __init__(self, ledger):
        self.ledger = ledger

    async def broadcast_contract(self, contract: ComputeContract) -> List[KernelBid]:
        """
        Publishes a task to the kernel mesh and collects bids.
        """
        print(f"💰 ELAK: Broadcasting ComputeContract for work {contract.get('task_id')}")
        # Simulated bids from mesh
        return [
            {"kernel_id": "K1", "price": 10.5, "trust": 0.98},
            {"kernel_id": "K2", "price": 8.0, "trust": 0.75}
        ]

    async def clear_market(self, bids: List[KernelBid]) -> str:
        """
        Selects the optimal winner based on Price + Risk Premium.
        """
        print(f"⚖️ ELAK: Clearing market for {len(bids)} bids...")
        
        # Winner Logic: Score = Price + (1 - Trust) * 100
        scored_bids = []
        for bid in bids:
            score = bid["price"] + (1 - bid["trust"]) * 100
            scored_bids.append((score, bid["kernel_id"]))
            
        winner = min(scored_bids, key=lambda x: x[0])
        print(f"🏆 ELAK: Winner selected: {winner[1]} with score {winner[0]}")
        return winner[1]
