import uuid
from typing import List, Optional, Dict, Any

class ResourceGraphEngine:
    """
    The Resource Graph Engine is the heart of the platform abstraction layer.
    It manages the canonical 'Resource' entity and its hierarchical relationships.
    """
    def __init__(self, db_client):
        self.db = db_client

    async def create_resource(
        self, 
        tenant_id: uuid.UUID, 
        name: str, 
        resource_type: str, 
        parent_id: Optional[uuid.UUID] = None,
        metadata: Dict[str, Any] = {}
    ):
        """
        Creates a new node in the Resource Graph.
        Every mutation here automatically triggers an Outbox Event (via SQL trigger).
        """
        # Note: In a real implementation, we would use the self.db (Prisma/ORM)
        # For the MVP, we assume a standard async client interface
        return await self.db.resource.create(
            data={
                "tenantId": str(tenant_id),
                "name": name,
                "resourceType": resource_type,
                "parentResourceId": str(parent_id) if parent_id else None,
                "metadata": metadata,
                "status": "ACTIVE"
            }
        )

    async def get_resource(self, resource_id: uuid.UUID, tenant_id: uuid.UUID):
        """
        Fetches a specific resource with tenant isolation.
        """
        return await self.db.resource.find_first(
            where={
                "id": str(resource_id),
                "tenantId": str(tenant_id)
            }
        )

    async def get_tenant_tree(self, tenant_id: uuid.UUID):
        """
        Returns the entire resource hierarchy for a tenant.
        In production, this would use a recursive CTE or a specialized graph query.
        """
        return await self.db.resource.find_many(
            where={
                "tenantId": str(tenant_id)
            },
            order_by={
                "createdAt": "asc"
            }
        )

    async def delete_resource(self, resource_id: uuid.UUID, tenant_id: uuid.UUID):
        """
        Performs a logical or physical delete of a resource branch.
        """
        return await self.db.resource.delete(
            where={
                "id": str(resource_id),
                "tenantId": str(tenant_id)
            }
        )
