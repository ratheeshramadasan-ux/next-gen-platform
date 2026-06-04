import os
import sys
import uuid
from typing import Dict, Any

# ============================================
# ⚙️ SYSTEM PATH SETUP (ROOT-LEVEL ACCESS)
# ============================================
# Setting project root to allow absolute imports for core and services
BASE_DIR = os.path.dirname(os.path.abspath(__file__)) # .../services/workflow_service
ROOT_DIR = os.path.dirname(os.path.dirname(BASE_DIR)) # .../next-gen-platform
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from fastapi import FastAPI
from pydantic import BaseModel

# Internal Imports
from services.workflow_service.engine import WorkflowEngine
from services.workflow_service.models import WorkflowRequest
from services.workflow_service.activities.registry import ActivityRegistry
from services.workflow_service.activities.excel import ExcelReadRange, ExcelWriteRange

# Shared Config
from shared.utils.env_loader import load_project_env
load_project_env()

# Enterprise Core Imports (Successfully renamed modules with underscores)
from core.execution_engine.state_machine import ExecutionStateMachine
from core.execution_engine.dag_resolver import DAGResolver
from core.execution_engine.scheduler import DistributedScheduler
from services.governance_service.manager import GovernanceManager

# ============================================
# 🔌 ACTIVITY REGISTRATION
# ============================================
def register_activities():
    """Bootstraps the activity registry with available plugins."""
    ActivityRegistry.register(ExcelReadRange)
    ActivityRegistry.register(ExcelWriteRange)

# ============================================
# 🚀 FASTAPI APP INITIALIZATION
# ============================================
app = FastAPI(title="NextGen Workflow Service")
engine = WorkflowEngine()

@app.on_event("startup")
async def startup_event():
    """Initializes system components on service boot."""
    register_activities()

# ============================================
# 📡 EXECUTION ENDPOINT
# ============================================
@app.post("/execute")
async def execute_workflow(request: WorkflowRequest):
    """
    Direct engine execution for simple/sequential workflows.
    Use this for MVP testing and lightweight tasks.
    """
    return await engine.execute(request)

# ============================================
# 🧠 ENTERPRISE WORKFLOW MANAGER (DAG ORCHESTRATOR)
# ============================================
class WorkflowManager:
    """
    Higher-level manager for distributed, asynchronous DAG execution.
    Handles scheduling, governance, and state persistence.
    """
    def __init__(self, db_client):
        self.state_machine = ExecutionStateMachine(db_client)
        self.resolver = DAGResolver(db_client)
        self.scheduler = DistributedScheduler(db_client)
        self.governance = GovernanceManager(db_client)

    async def launch_workflow(self, tenant_id: uuid.UUID, workflow_id: uuid.UUID, context: Dict[str, Any]):
        """Launches a workflow with synchronous governance check."""
        # 1. Start state track
        execution = await self.state_machine.start_workflow(tenant_id, workflow_id, context)
        
        # ⚖️ Governance Gate
        gov_decision = await self.governance.execute_governance_check(tenant_id, execution.id, context)
        
        if gov_decision == "PAUSE":
            await self.state_machine.finalize_workflow(execution.id, "PAUSED")
            return execution
        elif gov_decision == "TERMINATE":
            await self.state_machine.finalize_workflow(execution.id, "FAILED")
            return execution

        # 2. Resolve DAG and Schedule
        await self.resolver.resolve(execution.id)
        await self.scheduler.schedule_ready_steps(tenant_id)
        
        return execution

    async def handle_step_completion(self, step_id: uuid.UUID, tenant_id: uuid.UUID, output: Dict[str, Any]):
        """Handles post-step logic: state update, resolver trigger, and next-step scheduling."""
        await self.state_machine.complete_step(step_id, output)
        await self.resolver.resolve_after_step(step_id)
        await self.scheduler.schedule_ready_steps(tenant_id)

    async def resume_workflow(self, execution_id: uuid.UUID, tenant_id: uuid.UUID):
        """Resumes a workflow from PAUSED state."""
        await self.state_machine.finalize_workflow(execution_id, "RUNNING")
        await self.scheduler.schedule_ready_steps(tenant_id)
