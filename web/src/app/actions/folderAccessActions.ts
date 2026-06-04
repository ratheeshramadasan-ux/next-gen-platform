"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

function mapPermissionFlags(permission: string) {
  const normalized = (permission || "").toUpperCase();
  return {
    canView: ["VIEW", "EDIT", "EXECUTE", "MANAGE"].includes(normalized),
    canCreate: ["EDIT", "MANAGE"].includes(normalized),
    canEdit: ["EDIT", "MANAGE"].includes(normalized),
    canDelete: ["MANAGE"].includes(normalized),
    canManage: ["MANAGE"].includes(normalized),
  };
}

export async function getFolderPermissions(folderId: string) {
  try {
    return await prisma.folderPermission.findMany({
      where: { folderId },
      orderBy: { createdAt: "asc" }
    });
  } catch (e) {
    console.error("Failed to fetch folder permissions:", e);
    return [];
  }
}

export async function updateFolderPermission(payload: {
  folderId: string;
  principalType: string; // USER, GROUP
  principalId: string;
  permission: string; // VIEW, EDIT, EXECUTE, MANAGE
}) {
  try {
    const existing = await prisma.folderPermission.findFirst({
      where: {
        folderId: payload.folderId,
        principalId: payload.principalId
      }
    });

    if (existing) {
      await prisma.folderPermission.update({
        where: { id: existing.id },
        data: { 
          ...mapPermissionFlags(payload.permission),
          inheritedFlag: false 
        }
      });
    } else {
      await prisma.folderPermission.create({
        data: {
          folderId: payload.folderId,
          principalType: payload.principalType,
          principalId: payload.principalId,
          ...mapPermissionFlags(payload.permission),
          inheritedFlag: false
        }
      });
    }

    revalidatePath("/next-gen/workspaces");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function breakInheritanceAction(folderId: string) {
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: { 
        parent: { 
          include: { 
            permissions: true 
          } 
        } 
      }
    });

    if (!folder?.parentId || !folder.parent) {
      return { success: false, error: "This folder has no parent to inherit from." };
    }

    // Clone parent permissions as explicit ones
    const parentPermissions = folder.parent.permissions;
    
    await prisma.$transaction(
      parentPermissions.map((p: any) => prisma.folderPermission.create({
        data: {
          folderId: folderId,
          principalType: p.principalType,
          principalId: p.principalId,
          canView: !!p.canView,
          canCreate: !!p.canCreate,
          canEdit: !!p.canEdit,
          canDelete: !!p.canDelete,
          canManage: !!p.canManage,
          inheritedFlag: false
        }
      }))
    );

    revalidatePath("/next-gen/workspaces");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
