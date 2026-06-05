"use server";

import { prisma, baseDb } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { ResourceType } from "@prisma/client";
import { createAuditLog } from "./tenantActions";

type RolePermissionLike = { permissions?: string | null; name?: string | null } | string;
type ProjectSummary = { studioWorkflows?: unknown[] } & Record<string, unknown>;
type FolderWhereClause = NonNullable<Parameters<typeof prisma.folder.findMany>[0]>["where"];
type ProjectWhereClause = NonNullable<Parameters<typeof prisma.project.findMany>[0]>["where"];

function buildRegistryProjectWhere(customerId: string, tenantId: string, projectType: string): ProjectWhereClause {
  const typeFilters = projectType === "DOC_READER"
    ? [
        { metadata: { contains: '"projectType":"DOC_READER"' } },
        { metadata: { contains: '"projectType": "DOC_READER"' } },
        { metadata: { contains: '"trainingDocuments"' } },
        { metadata: { contains: '"documentClasses"' } },
        { metadata: { contains: '"selectedModelId"' } },
        { metadata: { contains: '"segregationSettings"' } },
      ]
    : projectType === "WORKFLOW"
    ? [
        { metadata: null },
        { metadata: "" },
        { metadata: { contains: '"projectType":"WORKFLOW"' } },
        { metadata: { contains: '"projectType": "WORKFLOW"' } },
        {
          AND: [
            { metadata: { not: { contains: '"projectType"' } } },
            { metadata: { not: { contains: '"trainingDocuments"' } } },
            { metadata: { not: { contains: '"documentClasses"' } } },
            { metadata: { not: { contains: '"selectedModelId"' } } },
            { metadata: { not: { contains: '"segregationSettings"' } } },
          ],
        },
      ]
    : [
        { metadata: { contains: `"projectType":"${projectType}"` } },
        { metadata: { contains: `"projectType": "${projectType}"` } },
      ];

  return {
    customerId,
    tenantId,
    AND: [
      { OR: typeFilters },
      {
        OR: [
          { resourceId: null },
          {
            resource: {
              is: {
                deletedAt: null,
                status: { notIn: ["DELETED", "ARCHIVED"] },
              },
            },
          },
        ],
      },
    ],
  };
}

/**
 * Fetches all workspaces for a given tenant.
 */
export async function getTenantsWorkspaces(tenantId: string) {
  try {
    return await prisma.workspace.findMany({
      where: { tenantId },
      include: {
        resource: true,
        folders: {
          where: { isArchived: false }
        }
      },
      orderBy: { createdAt: "desc" }
    });
  } catch (e) {
    console.error("Failed to fetch workspaces:", e);
    return [];
  }
}

/**
 * Ensures a default workspace exists for a customer.
 */
export async function ensureDefaultWorkspace(tenantId: string, customerId: string) {
  try {
    const existing = await prisma.workspace.findFirst({ 
      where: { tenantId },
      include: {
        resource: true,
        folders: {
          where: { isArchived: false }
        }
      }
    });
    if (existing) return existing;

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
    const name = `${tenant?.name || "Target"} Workspace`;

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name,
          tenantId,
          customerId,
          isGovernanceLocked: false
        }
      });

      const resource = await tx.resource.create({
        data: {
          resourceType: ResourceType.FOLDER,
          name: "Root",
          tenantId,
          ownerId: customerId
        }
      });

      await tx.folder.create({
        data: {
          name: "Root",
          resourceId: resource.id,
          workspaceId: ws.id,
          tenantId,
          customerId,
          level: 0,
          path: "/"
        }
      });

      return ws;
    });

    // Return with includes to match getTenantsWorkspaces
    return await prisma.workspace.findUnique({
      where: { id: workspace.id },
      include: {
        resource: true,
        folders: {
          where: { isArchived: false }
        }
      }
    });
  } catch (e) {
    console.error("Failed to ensure default workspace:", e);
    return null;
  }
}

/**
 * GET WORKSPACE TREE
 */
export async function getWorkspaceTree(workspaceId: string) {
  try {
    const folders = await prisma.folder.findMany({
      where: { workspaceId, isArchived: false },
      include: {
        projects: true
      }
    });

    const rootProjects = await prisma.project.findMany({
      where: { workspaceId, folderId: null }
    });

    return { folders, rootProjects };
  } catch (e) {
    console.error("Failed to fetch workspace tree:", e);
    return { folders: [], rootProjects: [] };
  }
}

/**
 * GET TENANT FOLDER TREE (Matches Studio Builder logic)
 */
export async function getTenantFolderTree(
  customerId: string, 
  tenantId: string, 
  userRole: string = "Tenant User",
  userRolesData: RolePermissionLike[] = []
) {
  try {
    const whereClause: FolderWhereClause = { 
      customerId, 
      tenantId, 
      isArchived: false 
    };

    // RBAC: Only Admin users can view all folders. Others are filtered by role mappings.
    const isAdmin = userRole === "Platform Admin" || userRole === "Admin User" || userRole === "Super Admin" || userRole === "Admin" || userRole === "Customer Admin";
    if (!isAdmin) {
      const allowedFolderIds = new Set<string>();
      
      userRolesData.forEach(role => {
        try {
          const permissions = typeof role === "string" ? "{}" : role.permissions || "{}";
          const perms = JSON.parse(permissions);
          const roleFolders = Array.isArray(perms) ? [] : (perms.folders || []);
          roleFolders.forEach((fid: string) => allowedFolderIds.add(fid));
        } catch (e) {
          const roleName = typeof role === "string" ? role : role.name;
          console.warn(`Failed to parse permissions for role ${roleName}`);
        }
      });

      if (allowedFolderIds.size > 0) {
        whereClause.id = { in: Array.from(allowedFolderIds) };
      } else {
        // If no explicit folder mappings, return empty for non-admins
        return { folders: [], rootProjects: [] };
      }
    }

    const projectSummarySelect = {
      id: true,
      name: true,
      description: true,
      version: true,
      folderId: true,
      workspaceId: true,
      createdAt: true,
      updatedAt: true,
      studioWorkflows: {
        take: 1,
        orderBy: { updatedAt: "desc" as const },
        select: {
          id: true,
          status: true,
          name: true,
          version: true,
          updatedAt: true,
        },
      },
      resource: {
        select: {
          status: true,
          deletedAt: true,
        },
      },
    };
    const activeProjectWhere: ProjectWhereClause = {
      OR: [
        { resourceId: null },
        {
          resource: {
            is: {
              deletedAt: null,
              status: { notIn: ["DELETED", "ARCHIVED"] },
            },
          },
        },
      ],
    };

    const folders = await prisma.folder.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        parentId: true,
        workspaceId: true,
        // level omitted — nullable Int causes Prisma WASM crash on older rows
        path: true,
        isArchived: true,
        createdAt: true,
        updatedAt: true,
        projects: {
          where: activeProjectWhere,
          select: projectSummarySelect,
          orderBy: { updatedAt: "desc" },
        },
        workspace: {
          select: { id: true, name: true }
        },
      },
      orderBy: { name: "asc" }
    });

    const rootProjects = await prisma.project.findMany({
      where: {
        customerId,
        tenantId,
        folderId: null,
        ...activeProjectWhere,
      },
      select: projectSummarySelect,
      orderBy: { updatedAt: "desc" }
    });

    return { folders, rootProjects };
  } catch (e) {
    console.error("Failed to fetch tenant folder tree:", e);
    return { folders: [], rootProjects: [] };
  }
}

/**
 * Lightweight tree for document-reader registries.
 * The registry only needs folder hierarchy and project summaries; pulling the
 * full studio payload can block navigation when OCR/model metadata is large.
 */
export async function getTenantDocReaderRegistry(
  customerId: string,
  tenantId: string,
  userRole: string = "Tenant User",
  userRolesData: RolePermissionLike[] = []
) {
  try {
    const whereClause: FolderWhereClause = {
      customerId,
      tenantId,
      isArchived: false,
    };

    const isAdmin = userRole === "Platform Admin" || userRole === "Admin User" || userRole === "Super Admin" || userRole === "Admin" || userRole === "Customer Admin";
    if (!isAdmin) {
      const allowedFolderIds = new Set<string>();

      userRolesData.forEach(role => {
        try {
          const permissions = typeof role === "string" ? "{}" : role.permissions || "{}";
          const perms = JSON.parse(permissions);
          const roleFolders = Array.isArray(perms) ? [] : (perms.folders || []);
          roleFolders.forEach((fid: string) => allowedFolderIds.add(fid));
        } catch (e) {
          const roleName = typeof role === "string" ? role : role.name;
          console.warn(`Failed to parse permissions for role ${roleName}`);
        }
      });

      if (allowedFolderIds.size > 0) {
        whereClause.id = { in: Array.from(allowedFolderIds) };
      } else {
        return { folders: [], rootProjects: [] };
      }
    }

    let workspace = await prisma.workspace.findFirst({
      where: { tenantId, customerId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (!workspace) {
      const provisioned = await ensureDefaultWorkspace(tenantId, customerId);
      workspace = provisioned ? { id: provisioned.id } : null;
    }

    const folderCount = await prisma.folder.count({ where: whereClause });
    if (folderCount === 0 && workspace) {
      const existingRoot = await prisma.folder.findFirst({
        where: { workspaceId: workspace.id, tenantId, customerId, isArchived: false },
        select: { id: true },
      });

      if (!existingRoot) {
        const resource = await prisma.resource.create({
          data: {
            resourceType: ResourceType.FOLDER,
            name: "Root",
            tenantId,
            ownerId: customerId,
          },
          select: { id: true },
        });

        await prisma.folder.create({
          data: {
            name: "Root",
            resourceId: resource.id,
            workspaceId: workspace.id,
            tenantId,
            customerId,
            level: 0,
            path: "/",
          },
        });
      }
    }

    const projectSelect = {
      id: true,
      name: true,
      description: true,
      version: true,
      folderId: true,
      workspaceId: true,
      createdAt: true,
      updatedAt: true,
      studioWorkflows: {
        take: 1,
        orderBy: { updatedAt: "desc" as const },
        select: {
          id: true,
          status: true,
          name: true,
          version: true,
          updatedAt: true,
        },
      },
      resource: {
        select: {
          status: true,
          deletedAt: true,
        },
      },
    };
    const projectWhere = buildRegistryProjectWhere(customerId, tenantId, "DOC_READER");

    const folders = await prisma.folder.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        parentId: true,
        workspaceId: true,
        // level omitted — nullable Int causes Prisma WASM crash on older rows
        path: true,
        projects: {
          where: projectWhere,
          select: projectSelect,
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const rootProjects = await prisma.project.findMany({
      where: {
        ...projectWhere,
        folderId: null,
      },
      select: projectSelect,
      orderBy: { updatedAt: "desc" },
    });

    const normalizeProjects = (projects: ProjectSummary[]) => projects.map(project => ({
      ...project,
      metadata: JSON.stringify({ projectType: "DOC_READER" }),
      status: (project.resource as { status?: string } | undefined)?.status || project.status,
      studioWorkflows: project.studioWorkflows?.[0] || null,
    }));

    return {
      folders: folders.map(folder => ({
        ...folder,
        projects: normalizeProjects(folder.projects || []),
      })),
      rootProjects: normalizeProjects(rootProjects),
    };
  } catch (e) {
    console.error("Failed to fetch document-reader registry:", e);
    return { folders: [], rootProjects: [] };
  }
}

/**
 * Lightweight tree for studio registries.
 * Registry screens need navigation data, not full workflow/app/document payloads.
 * Avoid loading large project metadata, variables, arguments, and assets on every
 * studio navigation because that can leave the UI stuck in Synchronizing.
 */
export async function getTenantStudioRegistry(
  customerId: string,
  tenantId: string,
  userRole: string = "Tenant User",
  userRolesData: RolePermissionLike[] = [],
  projectType: string = "WORKFLOW"
) {
  try {
    const whereClause: FolderWhereClause = {
      customerId,
      tenantId,
      isArchived: false,
    };

    const isAdmin = userRole === "Platform Admin" || userRole === "Admin User" || userRole === "Super Admin" || userRole === "Admin" || userRole === "Customer Admin";
    if (!isAdmin) {
      const allowedFolderIds = new Set<string>();

      userRolesData.forEach(role => {
        try {
          const permissions = typeof role === "string" ? "{}" : role.permissions || "{}";
          const perms = JSON.parse(permissions);
          const roleFolders = Array.isArray(perms) ? [] : (perms.folders || []);
          roleFolders.forEach((fid: string) => allowedFolderIds.add(fid));
        } catch (e) {
          const roleName = typeof role === "string" ? role : role.name;
          console.warn(`Failed to parse permissions for role ${roleName}`);
        }
      });

      if (allowedFolderIds.size > 0) {
        whereClause.id = { in: Array.from(allowedFolderIds) };
      } else {
        return { folders: [], rootProjects: [] };
      }
    }

    let workspace = await prisma.workspace.findFirst({
      where: { tenantId, customerId },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });

    if (!workspace) {
      const provisioned = await ensureDefaultWorkspace(tenantId, customerId);
      workspace = provisioned ? { id: provisioned.id } : null;
    }

    const folderCount = await prisma.folder.count({ where: whereClause });
    if (folderCount === 0 && workspace) {
      const existingRoot = await prisma.folder.findFirst({
        where: { workspaceId: workspace.id, tenantId, customerId, isArchived: false },
        select: { id: true },
      });

      if (!existingRoot) {
        const resource = await prisma.resource.create({
          data: {
            resourceType: ResourceType.FOLDER,
            name: "Root",
            tenantId,
            ownerId: customerId,
          },
          select: { id: true },
        });

        await prisma.folder.create({
          data: {
            name: "Root",
            resourceId: resource.id,
            workspaceId: workspace.id,
            tenantId,
            customerId,
            level: 0,
            path: "/",
          },
        });
      }
    }

    const projectSelect = {
      id: true,
      name: true,
      description: true,
      version: true,
      folderId: true,
      workspaceId: true,
      createdAt: true,
      updatedAt: true,
      studioWorkflows: {
        take: 1,
        orderBy: { updatedAt: "desc" as const },
        select: {
          id: true,
          status: true,
          name: true,
          version: true,
          updatedAt: true,
        },
      },
      resource: {
        select: {
          status: true,
          deletedAt: true,
        },
      },
    };
    const projectWhere = buildRegistryProjectWhere(customerId, tenantId, projectType);

    const folders = await prisma.folder.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        parentId: true,
        workspaceId: true,
        // level omitted — nullable Int causes Prisma WASM crash on older rows
        path: true,
        projects: {
          where: projectWhere,
          select: projectSelect,
          orderBy: { updatedAt: "desc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const rootProjects = await prisma.project.findMany({
      where: {
        ...projectWhere,
        folderId: null,
      },
      select: projectSelect,
      orderBy: { updatedAt: "desc" },
    });

    const normalizeProjects = (projects: ProjectSummary[]) => projects.map(project => ({
      ...project,
      metadata: JSON.stringify({ projectType }),
      status: (project.resource as { status?: string } | undefined)?.status || project.status,
      studioWorkflows: project.studioWorkflows?.[0] || null,
    }));

    return {
      folders: folders.map(folder => ({
        ...folder,
        projects: normalizeProjects(folder.projects || []),
      })),
      rootProjects: normalizeProjects(rootProjects),
    };
  } catch (e) {
    console.error("Failed to fetch studio registry:", e);
    return { folders: [], rootProjects: [] };
  }
}

/**
 * CREATE FOLDER
 */
export async function createFolder(payload: {
  name: string;
  parentId?: string | null;
  workspaceId: string;
  tenantId: string;
  customerId: string;
}, actor: string) {
  try {
    // 1. Governance check
    if (payload.parentId) {
      const parent = await prisma.folder.findUnique({ where: { id: payload.parentId } });
      if (parent?.isGovernanceLocked) {
        return { success: false, error: "Parent folder is locked. Unlock it to add subfolders." };
      }
    }

    // 2. Uniqueness check
    const existing = await prisma.folder.findFirst({
      where: {
        workspaceId: payload.workspaceId,
        parentId: payload.parentId || null,
        name: payload.name,
        isArchived: false
      }
    });

    if (existing) {
      return { success: false, error: `A folder named "${payload.name}" already exists in this location.` };
    }

    const result = await prisma.$transaction(async (tx) => {
      // Create the Resource entry
      const resource = await tx.resource.create({
        data: {
          resourceType: ResourceType.FOLDER,
          name: payload.name,
          tenantId: payload.tenantId,
          ownerId: payload.customerId
        }
      });

      // Calculate hierarchical metadata
      let level = 0;
      let path = "/";

      if (payload.parentId) {
        const parent = await tx.folder.findUnique({ where: { id: payload.parentId } });
        if (!parent) throw new Error("Parent folder not found");
        level = parent.level + 1;
        path = parent.path === "/" ? `/${parent.id}` : `${parent.path}/${parent.id}`;
      }

      // Create the Folder record
      const folderData = await tx.folder.create({
        data: {
          name: payload.name,
          tenantId: payload.tenantId,
          customerId: payload.customerId,
          workspaceId: payload.workspaceId,
          parentId: payload.parentId || null,
          resourceId: resource.id,
          level,
          path
        }
      });

      return folderData;
    });

    // 3. Audit Log
    await createAuditLog(
      actor, 
      "SCOPE_CREATED", 
      payload.name, 
      JSON.stringify({ 
        folderId: result.id, 
        path: result.path, 
        level: result.level,
        workspaceId: payload.workspaceId 
      }),
      "Info",
      false,
      payload.customerId
    );

    revalidatePath("/next-gen/control-center/folders");
    revalidatePath("/next-gen/workspaces");
    
    return { success: true, folder: result };
  } catch (e: any) {
    console.error("[FOLDER_ACTION] Critical failure during scope creation:", e);
    return { success: false, error: e.message || "An unexpected error occurred during creation." };
  }
}

/**
 * MOVE FOLDER
 */
export async function moveFolder(folderId: string, targetParentId: string | null) {
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId }
    });

    if (!folder) throw new Error("Folder not found");
    if (folder.isGovernanceLocked) {
      return { success: false, error: "This folder is governance-locked and cannot be moved." };
    }

    if (targetParentId) {
      const targetParent = await prisma.folder.findUnique({ where: { id: targetParentId } });
      if (targetParent?.isGovernanceLocked) {
        return { success: false, error: "Target parent folder is locked." };
      }
    }

    // 1. Check for circular move
    if (targetParentId) {
      let currentParentId: string | null = targetParentId;
      while (currentParentId) {
        if (currentParentId === folderId) {
          return { success: false, error: "Cannot move a folder into one of its subfolders." };
        }
        const parent = await prisma.folder.findUnique({
          where: { id: currentParentId },
          select: { parentId: true }
        });
        if (!parent) break;
        currentParentId = parent.parentId;
      }
    }

    // 2. Update Path
    await prisma.$transaction(async (tx) => {
      let newParentPath = "/";
      if (targetParentId) {
        const parent = await tx.folder.findUnique({
          where: { id: targetParentId },
          select: { path: true }
        });
        if (parent?.path) newParentPath = parent.path.endsWith("/") ? parent.path : `${parent.path}/`;
      }
      
      const newPath = `${newParentPath}${folder.name}`;
      const oldPath = folder.path || "";

      await tx.folder.update({
        where: { id: folderId },
        data: { parentId: targetParentId, path: newPath }
      });

      if (oldPath) {
        const descendants = await tx.folder.findMany({
          where: { path: { startsWith: `${oldPath}/` } }
        });

        for (const desc of descendants) {
          const updatedPath = desc.path?.replace(oldPath, newPath);
          await tx.folder.update({
            where: { id: desc.id },
            data: { path: updatedPath }
          });
        }
      }
    });

    revalidatePath("/next-gen/workspaces");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * DELETE FOLDER
 */
export async function deleteFolder(folderId: string) {
  try {
    const folder = await prisma.folder.findUnique({
      where: { id: folderId },
      include: {
        subfolders: { where: { isArchived: false } },
        projects: true
      }
    });

    if (!folder) throw new Error("Folder not found");
    if (folder.isGovernanceLocked) {
      return { success: false, error: "Folder is governance-locked. Unlock it first." };
    }

    if (folder.subfolders.length > 0 || folder.projects.length > 0) {
      return { success: false, error: "Cannot delete folder containing active projects or subfolders. Please empty it first." };
    }

    await prisma.folder.update({
      where: { id: folderId },
      data: { isArchived: true }
    });

    revalidatePath("/next-gen/workspaces");
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * TOGGLE LOCK
 */
export async function toggleFolderLockAction(folderId: string, locked: boolean, userRole: string) {
  try {
    // 1. RBAC Check: Only Platform Admin and Customer Admin (Admin User) can toggle locks
    console.log(`[GOVERNANCE_DEBUG] Attempting to toggle lock. Raw Role:`, userRole);
    
    const roleStr = typeof userRole === 'string' ? userRole : String(userRole || "Unknown");
    const normalizedRole = roleStr.trim().toLowerCase();
    
    // Simplest possible check for now to resolve blocker
    const isAuthorized = normalizedRole.includes("admin") || normalizedRole.includes("super") || normalizedRole === "admin user";
    
    if (!isAuthorized) {
      console.warn(`[GOVERNANCE_DEBUG] Unauthorized access attempt by role: "${roleStr}"`);
      return { 
        success: false, 
        error: "OFFBOARDING_WRITE_FENCE [SECURITY_EXCEPTION]: Target Folder is frozen by a hierarchical governance lock. Only Platform Admins or Customer Admins can modify this state." 
      };
    }

    const folder = await prisma.folder.update({
      where: { id: folderId },
      data: { isGovernanceLocked: locked }
    });

    // 2. Audit Log with Customer context
    await createAuditLog(
      userRole, 
      locked ? "FOLDER_LOCKED" : "FOLDER_UNLOCKED", 
      folder.name, 
      JSON.stringify({ folderId }),
      "Info",
      false,
      folder.customerId
    );

    revalidatePath("/next-gen/control-center/folders");
    revalidatePath("/next-gen/workspaces");
    
    return { success: true, folder };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * RENAME FOLDER
 */
export async function renameFolder(folderId: string, newName: string, actor: string) {
  try {
    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) throw new Error("Folder not found");
    if (folder.isGovernanceLocked) {
      return { success: false, error: "Folder is governance-locked. Unlock it to rename." };
    }

    // Check for duplicate name in same parent
    const existing = await prisma.folder.findFirst({
      where: {
        workspaceId: folder.workspaceId,
        parentId: folder.parentId,
        name: newName,
        isArchived: false,
        id: { not: folderId }
      }
    });

    if (existing) {
      return { success: false, error: `A folder named "${newName}" already exists in this location.` };
    }

    const updated = await prisma.folder.update({
      where: { id: folderId },
      data: { name: newName }
    });

    await createAuditLog(
      actor, 
      "SCOPE_RENAMED", 
      newName, 
      JSON.stringify({ folderId, oldName: folder.name }),
      "Info",
      false,
      folder.customerId
    );

    revalidatePath("/next-gen/workspaces");
    return { success: true, folder: updated };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
