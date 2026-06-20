"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { enforceResourceQuota } from "./quotaActions";
import { randomUUID } from "crypto";
import { ResourceType } from "@/generated/prisma-client";
import { syncToLocalFileSystem } from "@/lib/studio/sync";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Persist the entire workflow flow (Nodes + Edges) to PostgreSQL Studio schemas.
 */
export async function saveWorkflow(payload: {
  workflowId?: string | null;
  projectId: string;
  name: string;
  flowJson: string; // The @xyflow export
  nodes: any[];
  edges: any[];
  variables: any[];
  arguments: any[];
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 0. Fetch Project context for Registry linkage
      const project = await tx.project.findUnique({
        where: { id: payload.projectId },
        select: { id: true, tenantId: true, ownerId: true, name: true }
      });

      if (!project) throw new Error("Project context not found for registry synchronization.");

      // 1. Find or Create Workflow Resource
      let existing: any = null;
      if (payload.workflowId) {
        existing = await tx.studioWorkflow.findUnique({
          where: { id: payload.workflowId }
        });
      }

      let resourceId = existing?.resourceId;

      if (!existing && !resourceId) {
        // Provision Platform Resource Entry for new Workflow
        const resource = await tx.resource.create({
          data: {
            resourceType: ResourceType.STUDIO_WORKFLOW,
            name: payload.name,
            ownerId: project.ownerId,
            tenantId: project.tenantId
          }
        });
        resourceId = resource.id;
      }

      // 2. Upsert the StudioWorkflow record
      const workflow = await tx.studioWorkflow.upsert({
        where: { id: payload.workflowId || '00000000-0000-0000-0000-000000000000' },
        update: {
          name: payload.name,
          flowJson: payload.flowJson,
          updatedAt: new Date(),
        },
        create: {
          projectId: payload.projectId,
          name: payload.name,
          flowJson: payload.flowJson,
          resourceId: resourceId
        },
      });

      // 2. Sync Connections (Wipe and reload) - MUST DELETE FIRST due to FK constraints
    await tx.studioConnection.deleteMany({
      where: { workflowId: workflow.id },
    });

    // 3. Sync Nodes (Wipe and reload)
    await tx.studioNode.deleteMany({
      where: { workflowId: workflow.id },
    });

    if (payload.nodes.length > 0) {
      // Ensure all IDs are valid strings or UUIDs
      await tx.studioNode.createMany({
        data: payload.nodes.map((node) => ({
          id: node.id,
          workflowId: workflow.id,
          nodeType: String(node.data?.type || node.data?.dragType || node.type || "action").toLowerCase(),
          name: String(node.data?.label || "Untitled Node"),
          configJson: node.data || {},
          positionX: node.position?.x || 0,
          positionY: node.position?.y || 0,
        })),
      } as any);
    }

    if (payload.edges.length > 0) {
      // 3.1 Safety Check: Filter out "orphan" edges where source or target nodes don't exist in the nodes array.
      // This prevents "Foreign key constraint violated" errors if the UI state is slightly out of sync.
      const validNodeIds = new Set(payload.nodes.map(n => n.id));
      const validEdges = payload.edges.filter(edge => 
        edge.source && 
        edge.target && 
        validNodeIds.has(edge.source) && 
        validNodeIds.has(edge.target)
      );

      if (validEdges.length > 0) {
        await tx.studioConnection.createMany({
          data: validEdges.map((edge) => ({
            workflowId: workflow.id,
            fromNodeId: edge.source,
            toNodeId: edge.target,
            conditionType: edge.data?.condition || edge.label || "DEFAULT",
          })),
        } as any);
      }
    }

    // 4. Sync Variables (Project Level)
    await tx.studioVariable.deleteMany({
      where: { projectId: payload.projectId },
    });
    if (payload.variables && payload.variables.length > 0) {
      await tx.studioVariable.createMany({
        data: payload.variables.map(v => ({
          projectId: payload.projectId,
          name: v.name,
          dataType: v.type,
          defaultValue: v.value,
          scope: v.scope,
          studioWorkflowId: workflow.id
        }))
      });
    }

    // 5. Sync Arguments (Project Level)
    await tx.studioArgument.deleteMany({
      where: { projectId: payload.projectId },
    });
    if (payload.arguments && payload.arguments.length > 0) {
      await tx.studioArgument.createMany({
        data: payload.arguments.map(a => ({
          projectId: payload.projectId,
          name: a.name,
          direction: a.direction,
          dataType: a.type,
          defaultValue: a.defaultValue,
          studioWorkflowId: workflow.id
        }))
      });
    }

    return workflow.id;
  });

    // 6. Sync to local file system (Background-ish, don't block DB success)
    try {
      const project = await prisma.project.findUnique({ where: { id: payload.projectId }, select: { name: true } });
      if (project) {
        await syncToLocalFileSystem(project.name, payload);
      }
    } catch (syncErr) {
      console.error("[StudioAction] Local sync failed:", syncErr);
    }

    revalidatePath("/next-gen/studio");
    return { success: true, workflowId: result };
} catch (e: any) {
  console.error("[StudioAction] Save failed:", e);
  return { success: false, error: e.message };
}
}

/**
 * Load the technical configuration for the Studio Designer
 */
export async function loadWorkflow(workflowId: string) {
  try {
    const workflow = await prisma.studioWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        nodes: true,
        connections: true,
      },
    });

    if (!workflow) return { success: true, workflow: null };

    return { success: true, workflow };
  } catch (e: any) {
    console.error("[StudioAction] Load failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Resource management: Variables and Arguments
 */
export async function getStudioResources(projectId: string) {
  try {
    const [variables, argumentsList, assets] = await Promise.all([
      prisma.studioVariable.findMany({ where: { projectId } }),
      prisma.studioArgument.findMany({ where: { projectId } }),
      prisma.asset.findMany({ where: { projectId } })
    ]);
    
    return { success: true, variables, arguments: argumentsList, assets };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}
export async function getProjectWorkflows(projectId: string) {
  try {
    // 1. Parallelize all core database fetches
    const [workflowsData, projectData, variables, args, assets] = await Promise.all([
      prisma.studioWorkflow.findMany({ where: { projectId }, orderBy: { createdAt: 'asc' } }),
      prisma.project.findUnique({ where: { id: projectId }, select: { name: true, metadata: true } }),
      prisma.studioVariable.findMany({ where: { projectId } }),
      prisma.studioArgument.findMany({ where: { projectId } }),
      prisma.asset.findMany({ where: { projectId } })
    ]);

    let workflows: any[] = workflowsData;
    const metadata = JSON.parse(projectData?.metadata || '{}');
    const isAppProject = metadata.projectType === "APP";

    // 2. Normalize Names for App Projects (Legacy 'Home Dashboard' -> 'App Workspace.xaml')
    if (isAppProject) {
      workflows = workflows.map(w => {
        const n = (w.name || "").toLowerCase();
        if (n === "home dashboard" || n === "home dashboard.xaml") {
          return { ...w, name: "App Workspace.xaml" };
        }
        return w;
      });
    }

    // 2. Ensure Main Process and Input/Output folders exist (Skip for App Builder projects as they use a different lifecycle)
    let hasMain = workflows.some(w => w.isMain || w.name === "Main Process" || w.name === "Main Process.xaml");

    const hasInput = workflows.some(w => w.name === "Input" && (w as any).type === "FOLDER");
    const hasOutput = workflows.some(w => w.name === "Output" && (w as any).type === "FOLDER");

    if (!isAppProject && (!hasMain || !hasInput || !hasOutput)) {
      const resourcesToCreate: any[] = [];
      if (!hasMain) {
        resourcesToCreate.push({ id: randomUUID(), name: "Main Process", projectId, type: "WORKFLOW", isMain: true, status: "ACTIVE" });
      }
      if (!hasInput) resourcesToCreate.push({ id: randomUUID(), name: "Input", projectId, type: "FOLDER", status: "ACTIVE" });
      if (!hasOutput) resourcesToCreate.push({ id: randomUUID(), name: "Output", projectId, type: "FOLDER", status: "ACTIVE" });

      if (resourcesToCreate.length > 0) {
        await prisma.studioWorkflow.createMany({ data: resourcesToCreate as any });
        workflows = [...workflows, ...resourcesToCreate];
      }
    }

    // 3. Scan Local File System (Only if project context exists)
    if (projectData) {
      // Trigger a sync to ensure local is up to date, passing pre-fetched workflows to avoid redundant DB calls
      await syncToLocalFileSystem(projectData.name, { projectId, workflows });

      try {
        const homeDir = os.homedir();
        const projectPath = path.join(homeDir, "NextGen", "Projects", projectData.name.replace(/[^a-z0-9_\-\s]/gi, '_').trim());
        
        if (fs.existsSync(projectPath)) {
          const localResources: any[] = [];
          const scanLocal = (dir: string, parentId?: string) => {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
              if ([".DS_Store"].includes(item.name)) continue;
              const fullPath = path.join(dir, item.name);
              const relativePath = path.relative(projectPath, fullPath);
              const id = `local-${relativePath.replace(/\\/g, '/')}`;
              
              // Deduplication & Sync Status Logic
              const baseName = item.name.replace(/\.(xaml|json|py|md)$/, '');
              const dbMatch = workflows.find(w => {
                const dbName = String(w.name || "").toLowerCase();
                let localName = item.name.toLowerCase();
                
                // Normalization for App Projects local scan
                if (isAppProject && (localName === "home dashboard" || localName === "home dashboard.xaml")) {
                  localName = "app workspace.xaml";
                }
                
                const dbNameBase = dbName.endsWith(".xaml") ? dbName.slice(0, -5) : dbName;
                const localNameBase = localName.endsWith(".xaml") ? localName.slice(0, -5) : localName;

                return (dbName === localName || dbNameBase === localNameBase) && 
                       (String(w.parentId || "null") === String(parentId || "null"));
              });

              if (dbMatch) {
                if (item.isDirectory()) {
                  scanLocal(fullPath, dbMatch.id);
                } else {
                  // Detection for local edits that are ahead of the database (Files only)
                  try {
                    const stats = fs.statSync(fullPath);
                    const localMtime = stats.mtime.getTime();
                    const dbUpdated = new Date(dbMatch.updatedAt).getTime();
                    
                    if (localMtime > dbUpdated + 10000) {
                      dbMatch.isOnlineUpdatePending = true;
                    }
                  } catch (e) {}
                }
                continue;
              }

              let effectiveParentId = parentId;
              if (!parentId) {
                const dbFolder = workflows.find(w => w.name === item.name && (w as any).type === "FOLDER");
                if (dbFolder) { scanLocal(fullPath, dbFolder.id); continue; }
              }

              if (item.isDirectory()) {
                localResources.push({ id, name: item.name, type: "FOLDER", projectId, parentId: effectiveParentId || null, isLocal: true, isOnlineSyncPending: true });
                scanLocal(fullPath, id);
              } else {
                localResources.push({ id, name: item.name, type: "FILE", projectId, parentId: effectiveParentId || null, isLocal: true, isOnlineSyncPending: true, extension: path.extname(item.name) });
              }
            }
          };
          scanLocal(projectPath);
          workflows = [...workflows, ...localResources];
        }
      } catch (err) {
        console.error("[StudioAction] Local scan failed:", err);
      }
    }

    // 4. Force "Main Process" visibility (Safety check - skip for App Projects)
    if (!isAppProject && !workflows.some(w => {
      const n = w.name.toLowerCase();
      return n === "main process" || n === "main process.xaml";
    })) {
      workflows.push({

        id: randomUUID(),
        name: "Main Process",
        type: "WORKFLOW",
        projectId,
        parentId: null,
        isMain: true,
        status: "ACTIVE"
      });
    }

    // 5. Inject Virtual Folders for Assets, Variables, and Arguments (Only if they don't already exist)
    const virtualFolders = [
      { id: "virtual-variables", name: "Variables", type: "FOLDER", projectId, parentId: null, isVirtual: true, icon: "Variable" },
      { id: "virtual-arguments", name: "Arguments", type: "FOLDER", projectId, parentId: null, isVirtual: true, icon: "Workflow" },
      { id: "virtual-assets", name: "Assets", type: "FOLDER", projectId, parentId: null, isVirtual: true, icon: "Database" }
    ].filter(vf => !workflows.some(w => w.name === vf.name && w.type === "FOLDER"));

    const resourceNodes = [
      ...variables.map(v => ({ id: v.id, name: v.name, type: "VARIABLE", projectId, parentId: virtualFolders.some(vf => vf.id === "virtual-variables") ? "virtual-variables" : workflows.find(w => w.name === "Variables" && w.type === "FOLDER")?.id || "virtual-variables", dataType: v.dataType })),
      ...args.map(a => ({ id: a.id, name: a.name, type: "ARGUMENT", projectId, parentId: virtualFolders.some(vf => vf.id === "virtual-arguments") ? "virtual-arguments" : workflows.find(w => w.name === "Arguments" && w.type === "FOLDER")?.id || "virtual-arguments", direction: a.direction, dataType: a.dataType })),
      ...assets.map(as => ({ id: as.id, name: as.name, type: "ASSET", projectId, parentId: virtualFolders.some(vf => vf.id === "virtual-assets") ? "virtual-assets" : workflows.find(w => w.name === "Assets" && w.type === "FOLDER")?.id || "virtual-assets", assetType: (as as any).type }))
    ];

    workflows = [...workflows, ...virtualFolders, ...resourceNodes];

    // 6. Global Deduplication & Cleanup for UI (Case-insensitive name + parentId check)
    const uniqueWorkflows: any[] = [];
    const seen = new Set<string>();

    for (const w of workflows) {
      // Filter out system items for App Projects that shouldn't be edited directly in the explorer
      const name = (w.name || "").toLowerCase();
      if (isAppProject) {
         if (name === "application designer state" || name === "main process" || name === "main process.xaml") continue;
      }

      const key = `${name}|${w.parentId || "root"}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueWorkflows.push(w);
      } else if (w.isLocal && !w.id.startsWith("local-")) {
        // If we have a DB match and a local match, ensure we keep the one with DB context but mark it
        const idx = uniqueWorkflows.findIndex(uw => `${(uw.name || "").toLowerCase()}|${uw.parentId || "root"}` === key);
        if (idx !== -1 && !uniqueWorkflows[idx].isLocal) {
          uniqueWorkflows[idx].hasLocalMirror = true;
        }
      }
    }

    return { success: true, workflows: uniqueWorkflows };
  } catch (e: any) {
    console.error("[StudioAction] Fetch workflows failed:", e);
    return { success: false, error: e.message };
  }
}
/**
 * Create a new resource for a project (Workflow, Folder, Config, Script)
 */
export async function createStudioResource(
  projectId: string, 
  name: string, 
  type: string = "WORKFLOW", 
  parentId?: string
) {
  try {
    let extension: string | null = ".xaml";
    if (type === "CONFIG") extension = ".json";
    if (type === "SCRIPT") extension = ".py";
    if (type === "FOLDER") extension = null;

    const cleanParentId = (parentId === "" || parentId === "undefined" || parentId === "null") ? null : parentId;

    // Check if this is the first workflow for the project to set as Main
    const existingWorkflows = await prisma.studioWorkflow.count({
      where: { 
        projectId,
        type: "WORKFLOW"
      }
    });

    const isFirstWorkflow = existingWorkflows === 0 && type === "WORKFLOW";

    const workflow = await prisma.studioWorkflow.create({
      data: {
        projectId,
        name,
        type: type,
        extension: extension,
        parentId: cleanParentId,
        status: 'DRAFT',
        isMain: isFirstWorkflow
      } as any
    });
    
    revalidatePath("/next-gen/studio");
    return { success: true, workflowId: workflow.id };
  } catch (e: any) {
    console.error("[StudioAction] Create resource failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Rename an existing workflow or folder
 */
export async function renameWorkflow(workflowId: string, name: string) {
  try {
    // 1. Fetch old name for local rename
    const oldWorkflow = await prisma.studioWorkflow.findUnique({
      where: { id: workflowId },
      include: { project: true }
    });

    if (oldWorkflow) {
      try {
        const homeDir = os.homedir();
        const projectPath = path.join(homeDir, "NextGen", "Projects", oldWorkflow.project.name.replace(/[^a-z0-9_\-\s]/gi, '_').trim());
        
        const getFileName = (n: string, t: string) => {
          let fn = n;
          if (t === "WORKFLOW" && !fn.endsWith(".xaml")) fn += ".xaml";
          else if (t === "CONFIG" && !fn.endsWith(".json")) fn += ".json";
          else if (t === "SCRIPT" && !fn.endsWith(".py")) fn += ".py";
          return fn;
        };

        const oldPath = path.join(projectPath, getFileName(oldWorkflow.name, oldWorkflow.type || "WORKFLOW"));
        const newPath = path.join(projectPath, getFileName(name, oldWorkflow.type || "WORKFLOW"));

        if (fs.existsSync(oldPath)) {
          fs.renameSync(oldPath, newPath);
        }
      } catch (err) {
        console.error("[StudioAction] Local rename failed:", err);
      }
    }

    await prisma.studioWorkflow.update({
      where: { id: workflowId },
      data: { name }
    });
    
    revalidatePath("/next-gen/studio");
    return { success: true };
  } catch (e: any) {
    console.error("[StudioAction] Rename workflow failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Delete a workflow and its descendants
 */
export async function deleteWorkflow(workflowId: string) {
  try {
    // 0. Handle Local-only file deletion
    if (workflowId.startsWith("local-")) {
      try {
        const relativePath = workflowId.replace("local-", "");
        // We need the project name to resolve the path. 
        // For simplicity, we'll try to find it from the active project context if possible, 
        // but here we might need to pass it or fetch it.
        // For now, let's look at how IDs are constructed: `local-${relativePath}`
        // We can't easily resolve the absolute path without the project name here.
        // Better: Search for any project that might contain this local path
        const projects = await prisma.project.findMany({ select: { name: true } });
        const homeDir = os.homedir();
        for (const p of projects) {
          const pPath = path.join(homeDir, "NextGen", "Projects", p.name.replace(/[^a-z0-9_\-\s]/gi, '_').trim());
          const fullPath = path.join(pPath, relativePath);
          if (fs.existsSync(fullPath)) {
            if (fs.statSync(fullPath).isDirectory()) fs.rmSync(fullPath, { recursive: true, force: true });
            else fs.unlinkSync(fullPath);
            break;
          }
        }
        revalidatePath("/next-gen/studio");
        return { success: true };
      } catch (err) {
        console.error("[StudioAction] Local-only delete failed:", err);
        return { success: false, error: "Failed to delete local file" };
      }
    }

    // 1. Fetch info for local cleanup before deleting from DB
    const workflow = await prisma.studioWorkflow.findUnique({
      where: { id: workflowId },
      include: { project: true }
    });

    if (workflow) {
      try {
        const homeDir = os.homedir();
        const projectPath = path.join(homeDir, "NextGen", "Projects", workflow.project.name.replace(/[^a-z0-9_\-\s]/gi, '_').trim());
        
        let fileName = workflow.name;
        const type = workflow.type || "WORKFLOW";
        if (type === "WORKFLOW" && !fileName.endsWith(".xaml")) fileName += ".xaml";
        else if (type === "CONFIG" && !fileName.endsWith(".json")) fileName += ".json";
        else if (type === "SCRIPT" && !fileName.endsWith(".py")) fileName += ".py";

        // Handle folders vs files
        let fullPath = path.join(projectPath, fileName);
        
        // If it has a parent, we'd need to resolve the full relative path, 
        // but for now we'll handle the root level cleanup or simple match
        if (fs.existsSync(fullPath)) {
          if (type === "FOLDER") fs.rmSync(fullPath, { recursive: true, force: true });
          else fs.unlinkSync(fullPath);
        }
      } catch (err) {
        console.error("[StudioAction] Local cleanup failed during delete:", err);
      }
    }

    await prisma.studioWorkflow.delete({
      where: { id: workflowId }
    });
    
    revalidatePath("/next-gen/studio");
    return { success: true };
  } catch (e: any) {
    console.error("[StudioAction] Delete workflow failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Duplicate a workflow
 */
export async function duplicateWorkflow(workflowId: string) {
  try {
    const original = await prisma.studioWorkflow.findUnique({
      where: { id: workflowId },
      include: {
        nodes: true,
        connections: true,
        variables: true,
        arguments: true
      }
    });

    if (!original) throw new Error("Original workflow not found");

    const copy = await prisma.studioWorkflow.create({
      data: {
        projectId: original.projectId,
        name: `${original.name} (Copy)`,
        type: (original as any).type,
        extension: (original as any).extension,
        parentId: (original as any).parentId,
        flowJson: original.flowJson,
        status: 'DRAFT',
        nodes: {
          create: original.nodes.map(n => {
            const { id, workflowId, createdAt, updatedAt, ...nodeData } = n;
            return {
              ...nodeData,
              id: (crypto as any).randomUUID(),
              dataJson: nodeData.dataJson as any
            };
          })
        }
      } as any
    });

    revalidatePath("/next-gen/studio");
    return { success: true, workflowId: copy.id };
  } catch (e: any) {
    console.error("[StudioAction] Duplicate failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Set a workflow as the main entry point
 */
export async function setAsMainProcess(workflowId: string, projectId: string) {
  try {
    // Reset all others
    await prisma.studioWorkflow.updateMany({
      where: { projectId },
      data: { isMain: false } as any
    });

    // Set new main
    await prisma.studioWorkflow.update({
      where: { id: workflowId },
      data: { isMain: true } as any
    });

    revalidatePath("/next-gen/studio");
    return { success: true };
  } catch (e: any) {
    console.error("[StudioAction] Set as main failed:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Fetch detailed execution history for all workflows in a project or a specific workflow
 */
export async function getExecutionHistory(projectId: string, workflowId?: string) {
  try {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    const where: any = {};
    
    if (workflowId && uuidRegex.test(workflowId)) {
      where.workflowId = workflowId;
    } else if (projectId && uuidRegex.test(projectId)) {
      where.workflow = { projectId };
    } else {
      return { success: true, logs: [] };
    }

    const logs = await prisma.studioExecutionLog.findMany({
      where,
      include: {
        workflow: {
          select: { name: true, updatedAt: true }
        },
        stepLogs: {
          include: {
            node: {
              select: { name: true }
            }
          },
          orderBy: { startTime: 'asc' }
        }
      },
      orderBy: { startTime: 'desc' },
      take: 50
    });

    return { 
      success: true, 
      logs: logs.map(l => ({
        id: l.id,
        workflowName: l.workflow.name,
        status: l.status.toLowerCase(),
        startTime: l.startTime.toISOString(),
        endTime: l.endTime?.toISOString(),
        duration: l.endTime ? `${((l.endTime.getTime() - l.startTime.getTime()) / 1000).toFixed(1)}s` : "N/A",
        executedBy: (l.metadataJson as any)?.executedBy || "System",
        lastModifiedBy: (l.metadataJson as any)?.lastModifiedBy || "Unknown",
        variables: (l.metadataJson as any)?.variables || {},
        steps: l.stepLogs.map(s => ({
          id: s.id,
          nodeName: (s.inputData as any)?._nodeName || s.node?.name || s.nodeId, 
          status: s.status.toLowerCase(),
          startTime: s.startTime.toISOString(),
          duration: s.durationMs ? `${(s.durationMs / 1000).toFixed(2)}s` : "0s",
          error: s.errorMessage,
          input: s.inputData,
          output: s.outputData
        }))
      }))
    };
  } catch (err: any) {
    console.error("[STUDIO] Failed to fetch execution history:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Clear all execution history for a specific project (Admin/Authorized action)
 */
export async function clearProjectHistory(projectId: string) {
  try {
    await prisma.studioExecutionLog.deleteMany({
      where: {
        workflow: {
          projectId: projectId
        }
      }
    });
    revalidatePath("/next-gen/studio");
    return { success: true };
  } catch (err: any) {
    console.error("[STUDIO] Failed to clear project history:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Record a new execution log (Capture Run results)
 */
export async function logStudioExecution(payload: {
  workflowId: string;
  status: string;
  executedBy: string;
  lastModifiedBy: string;
  variables: any;
  steps: {
    nodeId: string;
    status: string;
    durationMs: number;
    error?: string | null;
    input?: any;
    output?: any;
    label?: string;
    startTime?: string;
  }[];
}) {
  try {
    const totalDuration = payload.steps.reduce((acc, s) => acc + s.durationMs, 0);
    const firstStepStart = payload.steps.length > 0 && payload.steps[0].startTime 
      ? new Date(payload.steps[0].startTime) 
      : new Date();
    const startTime = firstStepStart;
    const endTime = new Date(startTime.getTime() + totalDuration);

    const log = await prisma.studioExecutionLog.create({
      data: {
        workflowId: payload.workflowId,
        status: payload.status,
        startTime,
        endTime,
        metadataJson: {
          executedBy: payload.executedBy,
          lastModifiedBy: payload.lastModifiedBy,
          variables: payload.variables
        } as any,
        stepLogs: {
          create: payload.steps
            .filter(s => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s.nodeId))
            .map(s => ({
              nodeId: s.nodeId,
              status: s.status,
              durationMs: s.durationMs,
              errorMessage: s.error,
              inputData: s.label ? { _nodeName: s.label, ...s.input } : s.input,
              outputData: s.output,
              startTime: s.startTime ? new Date(s.startTime) : new Date(), 
            }))
        }
      } as any
    });

    revalidatePath("/next-gen/studio");
    return { success: true, logId: log.id };
  } catch (err: any) {
    console.error("[STUDIO] Failed to log execution:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Open a local path in the system explorer (Finder/Explorer)
 */
export async function openInExplorer(localPath: string) {
  try {
    const { exec } = require("child_process");
    const platform = process.platform;
    
    // Default to a safe project root if path is empty
    const targetPath = localPath || process.cwd();
    
    const cmd = platform === "win32" 
      ? `explorer "${targetPath.replace(/\//g, '\\')}"` 
      : `open "${targetPath}"`;
      
    exec(cmd);
    return { success: true };
  } catch (err: any) {
    console.error("[STUDIO] Failed to open explorer:", err);
    return { success: false, error: err.message };
  }
}
/**
 * Publish the project for VM execution
 * 1. Gather all project resources
 * 2. Package with dependencies
 * 3. Prepare for VM deployment (~/NetGen/[ProjectName])
 * 4. Include self-cleanup script
 */
export async function publishProject(projectId: string) {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        studioWorkflows: true
      }
    });

    if (!project) throw new Error("Project not found");

    const sanitizedName = project.name.replace(/[^a-z0-9_\-\s]/gi, '_').trim();
    const homeDir = os.homedir();
    const publishDir = path.join(homeDir, "NextGen", "Published", sanitizedName);

    // 1. Create Clean Publish Directory
    if (fs.existsSync(publishDir)) fs.rmSync(publishDir, { recursive: true, force: true });
    fs.mkdirSync(publishDir, { recursive: true });

    // 2. Package Workflows & Resources from Database
    project.studioWorkflows.forEach(wf => {
      let fileName = wf.name;
      const type = wf.type || "WORKFLOW";
      if (type === "WORKFLOW" && !fileName.endsWith(".xaml")) fileName += ".xaml";
      else if (type === "CONFIG" && !fileName.endsWith(".json")) fileName += ".json";
      else if (type === "SCRIPT" && !fileName.endsWith(".py")) fileName += ".py";

      const content = wf.flowJson || "{}";
      fs.writeFileSync(path.join(publishDir, fileName), content);
    });

    // 2.1 Package Local Dependencies (Scans project folder for package.json, requirements.txt, etc.)
    const projectLocalPath = path.join(homeDir, "NextGen", "Projects", sanitizedName);
    if (fs.existsSync(projectLocalPath)) {
      const files = fs.readdirSync(projectLocalPath);
      files.forEach(file => {
        const fullPath = path.join(projectLocalPath, file);
        const destPath = path.join(publishDir, file);
        // Copy non-directories that aren't already written (avoid overwriting DB workflows)
        if (fs.statSync(fullPath).isFile() && !fs.existsSync(destPath)) {
          fs.copyFileSync(fullPath, destPath);
        }
      });
    }

    // 3. Add Project Metadata
    fs.writeFileSync(path.join(publishDir, "project_data.json"), JSON.stringify(project, null, 2));

    // 4. Create Execution & Cleanup Script (Self-Destructing)
    const runScriptContent = `#!/bin/bash
echo "[NextGen] Starting execution of ${project.name}..."
# Simulate execution (In real-world, this calls the NextGen runtime)
sleep 2 
echo "[NextGen] Execution completed."
echo "[NextGen] Cleaning up project folder..."
rm -rf "$0" # Delete this script
cd ..
rm -rf "${sanitizedName}"
echo "[NextGen] Cleanup successful."
`;
    fs.writeFileSync(path.join(publishDir, "run.sh"), runScriptContent, { mode: 0o755 });

    // 5. Create Windows Batch Version
    const batScriptContent = `@echo off
echo [NextGen] Starting execution of ${project.name}...
timeout /t 2 /nobreak > nul
echo [NextGen] Execution completed.
echo [NextGen] Cleaning up project folder...
cd ..
rd /s /q "${sanitizedName}"
echo [NextGen] Cleanup successful.
(goto) 2>nul & del "%~f0"
`;
    fs.writeFileSync(path.join(publishDir, "run.bat"), batScriptContent);

    return { 
      success: true, 
      publishPath: publishDir,
      message: `Project published to ${publishDir}. Execution script included with auto-cleanup.`
    };
  } catch (err: any) {
    console.error("[STUDIO] Publish failed:", err);
    return { success: false, error: err.message };
  }
}
