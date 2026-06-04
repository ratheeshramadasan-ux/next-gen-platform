"use server";

import React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import WorkspaceClient from "./workspace-client";
import { getTenantsWorkspaces, getWorkspaceTree } from "@/app/actions/folderActions";
import { prisma } from "@/lib/prisma";

export default async function WorkspacesPage({
  searchParams,
}: {
  searchParams: { tenantId?: string; workspaceId?: string };
}) {
  // 1. Initial Data Fetching (SSR)
  // In a real app, we'd get the current tenant from the session/context
  // For now, we rely on searchParams or defaults
  const workspaces = searchParams.tenantId 
    ? await getTenantsWorkspaces(searchParams.tenantId)
    : [];

  const activeWorkspaceId = searchParams.workspaceId || workspaces[0]?.id;
  
  const treeData = activeWorkspaceId 
    ? await getWorkspaceTree(activeWorkspaceId)
    : { folders: [], rootProjects: [] };

  return (
    <div className="flex h-full bg-background overflow-hidden">
      <main className="flex-1 flex flex-col overflow-hidden">
        <WorkspaceClient 
          initialWorkspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          initialTree={treeData}
        />
      </main>
    </div>
  );
}
