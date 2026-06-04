"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { enforceResourceQuota } from "./quotaActions";

export async function createProjectAction(payload: {
  name: string;
  description?: string;
  folderId?: string | null;
  workspaceId: string;
  tenantId: string;
  customerId: string;
  ownerId: string;
}) {
  try {
    // 0. Enforce Governance Quota
    await enforceResourceQuota(payload.ownerId, "PROJECT");

    const project = await prisma.$transaction(async (tx) => {
      // 1. Provision Platform Resource Entry
      const resource = await tx.resource.create({
        data: {
          resourceType: "PROJECT",
          name: payload.name,
          ownerId: payload.ownerId,
          tenantId: payload.tenantId
        }
      });

      // 2. Create Project linked to Resource
      const project = await tx.project.create({
        data: {
          name: payload.name,
          description: payload.description,
          folderId: payload.folderId,
          workspaceId: payload.workspaceId,
          tenantId: payload.tenantId,
          customerId: payload.customerId,
          ownerId: payload.ownerId,
          resourceId: resource.id
        }
      });

      // 3. Provision Initial Main Workflow (Main.xaml)
      const workflowResource = await tx.resource.create({
        data: {
          resourceType: "STUDIO_WORKFLOW",
          name: "Main.xaml",
          ownerId: payload.ownerId,
          tenantId: payload.tenantId
        }
      });

      await tx.studioWorkflow.create({
        data: {
          projectId: project.id,
          name: "Main.xaml",
          type: "WORKFLOW",
          extension: ".xaml",
          isMain: true,
          status: "DRAFT",
          resourceId: workflowResource.id
        }
      });

      return project;
    });

    revalidatePath("/next-gen/workspaces");
    return { success: true, project };
  } catch (e: any) {
    console.error("[ProjectAction] Creation failed:", e);
    return { success: false, error: e.message };
  }
}

export async function getProjectsByFolder(folderId: string | null, workspaceId: string) {
  try {
    return await prisma.project.findMany({
      where: { 
        folderId: folderId || null,
        workspaceId: workspaceId
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (e) {
    console.error("Failed to fetch projects:", e);
    return [];
  }
}

export async function linkWorkflowToProject(projectId: string, workflowId: string) {
  try {
    await prisma.automationWorkflow.update({
      where: { id: workflowId },
      data: { projectId }
    });
    revalidatePath("/next-gen/workspaces");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
export async function updateProjectMetadata(projectId: string, metadata: string) {
  try {
    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: { metadata: true },
    });
    const safeMetadata = preserveProjectType(existing?.metadata, metadata);

    await prisma.project.update({
      where: { id: projectId },
      data: { metadata: safeMetadata, updatedAt: new Date() }
    });
    return { success: true };
  } catch (e: any) {
    console.error("[ProjectAction] Metadata update failed:", e);
    return { success: false, error: e.message };
  }
}

export async function updateProjectMetadataWithForm(formData: FormData) {
  try {
    const projectId = formData.get("projectId") as string;
    const metadata = formData.get("metadata") as string;
    
    if (!projectId || !metadata) {
      return { success: false, error: "Missing projectId or metadata in FormData" };
    }

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
      select: { metadata: true },
    });
    const safeMetadata = preserveProjectType(existing?.metadata, metadata);

    await prisma.project.update({
      where: { id: projectId },
      data: { metadata: safeMetadata, updatedAt: new Date() }
    });
    return { success: true };
  } catch (e: any) {
    console.error("[ProjectAction] Metadata update failed:", e);
    return { success: false, error: e.message };
  }
}

function preserveProjectType(existingMetadata: string | null | undefined, nextMetadata: string) {
  try {
    const existing = existingMetadata ? JSON.parse(existingMetadata) : {};
    const next = JSON.parse(nextMetadata);
    const inferredType = next.projectType
      || existing.projectType
      || (next.trainingDocuments || next.documentClasses || next.selectedModelId || next.segregationSettings ? "DOC_READER" : undefined);

    return inferredType
      ? JSON.stringify({ ...next, projectType: inferredType })
      : nextMetadata;
  } catch {
    return nextMetadata;
  }
}

export async function getProjectMetadata(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { metadata: true }
    });
    return project?.metadata || null;
  } catch (e) {
    console.error("[ProjectAction] Fetch failed:", e);
    return null;
  }
}
