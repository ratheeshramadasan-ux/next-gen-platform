from services.workflow_service.activities.registry import ActivityRegistry
from services.workflow_service.context import ExecutionContext
import uuid

class WorkflowEngine:

    async def execute(self, request):
        context = ExecutionContext(
            execution_id=str(uuid.uuid4()),
            tenant_id=request.tenantId
        )

        for node in request.nodes:
            activity = ActivityRegistry.get(node["activityId"])

            context.inputs = node.get("inputs", {})

            result = await activity.execute(context)

            if not result["success"]:
                return result

            if node.get("outputVariable"):
                context.variables[node["outputVariable"]] = result.get("output")

        return {
            "executionId": context.execution_id,
            "variables": context.variables,
            "logs": context.logs
        }