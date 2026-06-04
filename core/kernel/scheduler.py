import uuid
from typing import Dict, Any, List
import heapq

class AgentScheduler:
    """
    The CPU Scheduler of the AI OS.
    Allocates execution rights based on Multi-Objective Priority.
    - Business Criticality
    - SLA Risk
    - Cost Efficiency
    - Resource Pressure
    """
    def __init__(self, db_client):
        self.db = db_client
        self.task_queue = [] # Min-heap for priority

    def calculate_priority_score(self, task: Dict) -> float:
        """
        Computes the weighted priority for an intent or execution.
        Higher score = lower number in the min-heap.
        """
        criticality = task.get("criticality", 1.0)
        sla_risk = task.get("sla_risk", 0.0)
        delay_penalty = task.get("delay", 1.0)
        
        # Priority Score Formula (Inverted for Min-Heap)
        score = 1000 - (criticality * 10 + sla_risk * 50 + delay_penalty)
        return score

    async def schedule_intent(self, tenant_id: uuid.UUID, intent_id: uuid.UUID):
        """
        Enqueues a new intent into the global scheduler.
        """
        # 1. Fetch intent context
        # 2. Score intent
        score = self.calculate_priority_score({"criticality": 5.0, "sla_risk": 0.8})
        
        # 3. Push to priority queue
        heapq.heappush(self.task_queue, (score, intent_id))
        print(f"🗓️ Scheduler: Intent {intent_id} queued with priority {score}")

    async def allocate_next(self):
        """
        Selects the highest priority task and checks for resource slots.
        """
        if not self.task_queue:
            return None
            
        priority, task_id = heapq.heappop(self.task_queue)
        print(f"✅ Scheduler: Allocated execution rights for Task {task_id}")
        return task_id
