"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ResourceType } from "@/generated/prisma-client";

/**
 * Fetches all workspaces for a given tenant.
 */
export async function getWorkspaces(tenantId: string) {
  try {
    return await (prisma as any).workspace.findMany({
      where: { tenantId },
      include: {
        resource: true,
        folders: {
          include: {
            // @ts-ignore - resource is logically 1:1 with Folder but relation mapping is inferred
            resource: true
          }
        }
      },
      orderBy: { resource: { name: "asc" } }
    });
  } catch (e) {
    console.error("Failed to fetch workspaces:", e);
    return [];
  }
}

/**
 * Provisions a new Workspace and its root Folder using transactional integrity.
 */
export async function createWorkspaceAction(payload: {
  tenantId: string;
  name: string;
  ownerId?: string;
  description?: string;
}) {
  try {
    const workspace = await prisma.$transaction(async (tx) => {
      // 1. Create the Workspace Resource
      const resource = await tx.resource.create({
        data: {
          tenantId: payload.tenantId,
          resourceType: ResourceType.WORKSPACE,
          name: payload.name,
          ownerId: payload.ownerId,
          metadata: JSON.stringify({ description: payload.description })
        }
      });

      // 2. Create the Workspace record
      const ws = await tx.workspace.create({
        data: {
          name: payload.name,
          resourceId: resource.id,
          tenantId: payload.tenantId,
          customerId: payload.ownerId || payload.tenantId, // Fallback if ownerId is missing
          description: payload.description
        }
      });

      // 3. Create a default "Root" Folder Resource for this workspace
      const rootFolderResource = await tx.resource.create({
        data: {
          tenantId: payload.tenantId,
          parentResourceId: resource.id,
          resourceType: ResourceType.FOLDER,
          name: "Root",
          ownerId: payload.ownerId,
          metadata: JSON.stringify({ path: "/" })
        }
      });

      // 4. Create the Folder record safely
      await tx.folder.create({
        data: {
          name: "Root",
          resourceId: rootFolderResource.id,
          workspaceId: ws.id,
          tenantId: payload.tenantId,
          customerId: payload.ownerId || payload.tenantId,
          level: 0,
          path: "/"
        }
      });

      return ws;
    });

    revalidatePath("/next-gen/spaces");
    return { success: true, workspaceId: workspace.id };
  } catch (e: any) {
    console.error("Failed to create workspace:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Deletes a workspace and its resources.
 */
export async function deleteWorkspaceAction(workspaceId: string, tenantId: string) {
  try {
    // Basic authorization check
    const ws = await prisma.workspace.findFirst({
      where: { id: workspaceId, tenantId }
    });

    if (!ws) throw new Error("Workspace not found or access denied.");
    // @ts-ignore - isDefault exists on Workspace but inference may be clouded by Prisma extension
    if (ws.isDefault) throw new Error("Default workspace cannot be deleted.");

    // Resource cascading handles the cleanup if Prisma onDelete: Cascade is set
    await prisma.resource.delete({
      where: { id: workspaceId }
    });

    revalidatePath("/next-gen/spaces");
    return { success: true };
  } catch (e: any) {
    console.error("Failed to delete workspace:", e);
    return { success: false, error: e.message };
  }
}
