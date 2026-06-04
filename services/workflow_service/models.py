from pydantic import BaseModel

class WorkflowNode(BaseModel):
    activityId: str
    inputs: dict = {}
    outputVariable: str | None = None

class WorkflowRequest(BaseModel):
    tenantId: str
    nodes: list[WorkflowNode]