"use server";

import { prisma } from "@/lib/prisma";

export type SearchResult = {
  id: string;
  name: string;
  type: "WORKSPACE" | "AGENT" | "WORKFLOW" | "RESOURCE" | "MODULE";
  path: string;
  description?: string;
};

/**
 * Performs a global fuzzy search across all operational platform schemas.
 */
export async function globalSearch(tenantId: string, query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];

  try {
    const q = query.toLowerCase();

    // 1. Search Workspaces & Folders
    const workspaces = await (prisma as any).workspace.findMany({
      where: { 
        tenantId,
        resource: { name: { contains: query, mode: "insensitive" } }
      },
      include: { resource: true },
      take: 5
    });

    // 2. Search Agent Instances
    const agents = await prisma.agentInstance.findMany({
      where: { 
        tenantId,
        name: { contains: query, mode: "insensitive" }
      },
      take: 5
    });

    // 3. Search Workflow Definitions
    const workflows = await prisma.workflowDefinition.findMany({
      where: { 
        tenantId,
        name: { contains: query, mode: "insensitive" }
      },
      take: 5
    });

    // Map to results
    const results: SearchResult[] = [
      ...workspaces.map((w: any) => ({
        id: w.id,
        name: w.resource?.name || "Unnamed Workspace",
        type: "WORKSPACE" as const,
        path: `/spaces`
      })),
      ...agents.map(a => ({
        id: a.id,
        name: a.name,
        type: "AGENT" as const,
        path: `/ai-hub`
      })),
      ...workflows.map(w => ({
        id: w.id,
        name: w.name,
        type: "WORKFLOW" as const,
        path: `/automation-builder`
      }))
    ];

    return results;
  } catch (e) {
    console.error("Global search failure:", e);
    return [];
  }
}
