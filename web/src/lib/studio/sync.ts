import fs from "fs";
import path from "path";
import os from "os";
import { prisma } from "@/lib/prisma";

/**
 * Synchronizes project data to the local file system.
 * Location: ~/NextGen/Projects/[ProjectName]
 */
export async function syncToLocalFileSystem(projectName: string, data: any) {
  try {
    // 1. Resolve local paths
    const homeDir = os.homedir();
    const nextGenDir = path.join(homeDir, "NextGen");
    const projectsDir = path.join(nextGenDir, "Projects");
    
    // Sanitize project name for file system (remove invalid chars)
    const sanitizedName = projectName.replace(/[^a-z0-9_\-\s]/gi, '_').trim();
    const projectPath = path.join(projectsDir, sanitizedName);

    // 2. Create directory structure if it doesn't exist
    if (!fs.existsSync(nextGenDir)) {
      console.log(`[Sync] Creating directory: ${nextGenDir}`);
      fs.mkdirSync(nextGenDir, { recursive: true });
    }
    if (!fs.existsSync(projectsDir)) {
      console.log(`[Sync] Creating directory: ${projectsDir}`);
      fs.mkdirSync(projectsDir, { recursive: true });
    }
    if (!fs.existsSync(projectPath)) {
      console.log(`[Sync] Creating directory: ${projectPath}`);
      fs.mkdirSync(projectPath, { recursive: true });
    }

    // 2.1 Create default Input/Output folders
    const inputDir = path.join(projectPath, "Input");
    const outputDir = path.join(projectPath, "Output");
    if (!fs.existsSync(inputDir)) fs.mkdirSync(inputDir);
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    // 3. Prepare data for export
    const syncData = {
      syncedAt: new Date().toISOString(),
      project: {
        name: projectName,
        ...data
      }
    };

    // 4. Write project_data.json
    const dataFilePath = path.join(projectPath, "project_data.json");
    fs.writeFileSync(dataFilePath, JSON.stringify(syncData, null, 2));

    // 5. If it's a workflow save, write flow.json separately for easier access
    if (data.flowJson) {
      const flowFilePath = path.join(projectPath, "flow.json");
      fs.writeFileSync(flowFilePath, typeof data.flowJson === 'string' ? data.flowJson : JSON.stringify(data.flowJson, null, 2));
    }

    // 6. Write a summary README.md
    const readmePath = path.join(projectPath, "README.md");
    const readmeContent = `# ${projectName}
Synced via NextGen Studio Designer on ${new Date().toLocaleString()}

## Project Details
- **Project Name:** ${projectName}
- **Last Synced:** ${new Date().toISOString()}

This folder contains a local backup of your NextGen project.
- \`project_data.json\`: Full project metadata, nodes, and variables.
- \`flow.json\`: Technical flow definition (ReactFlow JSON).
- \`Input/\`: Place your source files here for processing.
- \`Output/\`: Automation results and generated logs will be stored here.
`;
    fs.writeFileSync(readmePath, readmeContent);

    // 7. Sync all database resources (Workflows, Configs, Scripts, Folders) to local
    if (data.projectId) {
      try {
        const workflows = data.workflows || await prisma.studioWorkflow.findMany({
          where: { projectId: data.projectId }
        });

        const writeResourceRecursive = (parentId: string | null, currentPath: string) => {
          const children = workflows.filter(w => (w.parentId === parentId) || (parentId === null && (!w.parentId || w.parentId === "null" || w.parentId === "undefined")));
          
          for (const child of children) {
            // Skip the top-level Input/Output folders as they are already handled/protected
            if (!parentId && (child.name === "Input" || child.name === "Output")) continue;

            let fileName = child.name;
            const type = (child as any).type || "WORKFLOW";
            
            // Append extensions if missing
            if (type === "WORKFLOW" && !fileName.endsWith(".xaml")) fileName += ".xaml";
            else if (type === "CONFIG" && !fileName.endsWith(".json")) fileName += ".json";
            else if (type === "SCRIPT" && !fileName.endsWith(".py")) fileName += ".py";

            const childPath = path.join(currentPath, fileName);

            if (type === "FOLDER") {
              if (!fs.existsSync(childPath)) fs.mkdirSync(childPath, { recursive: true });
              writeResourceRecursive(child.id, childPath);
            } else {
              // Write the flowJson or a default content if empty
              let content = child.flowJson || "";
              
              // If it's a workflow and content is empty, provide a basic valid structure
              if (!content && type === "WORKFLOW") {
                content = JSON.stringify({
                  nodes: [],
                  edges: [],
                  viewport: { x: 0, y: 0, zoom: 1 }
                }, null, 2);
              } else if (!content && type === "CONFIG") {
                content = "{}";
              }

              // PERFORMANCE OPTIMIZATION: Only write if file is missing or database is newer
              let shouldWrite = true;
              const dbUpdateTime = child.updatedAt ? new Date(child.updatedAt).getTime() : 0;

              if (fs.existsSync(childPath)) {
                const stats = fs.statSync(childPath);
                const localMtime = stats.mtime.getTime();
                
                // DATA LOSS PROTECTION: Never overwrite a local file that has content (>100 bytes) 
                // with a blank template (<100 bytes) from the database.
                if (stats.size > 100 && content.length < 100) {
                  console.warn(`[Sync] DATA LOSS PROTECTION: Skipping overwrite of ${childPath} (${stats.size} bytes) with blank DB content.`);
                  shouldWrite = false;
                }
                
                // If local and DB are within 1 second of each other, they are "synced"
                if (shouldWrite && dbUpdateTime > 0 && Math.abs(localMtime - dbUpdateTime) < 1000) {
                  shouldWrite = false;
                }
              }
              
              if (shouldWrite) {
                fs.writeFileSync(childPath, content);

                // Set local file timestamp to match DB updatedAt 
                if (dbUpdateTime > 0) {
                  const time = new Date(dbUpdateTime);
                  try {
                    fs.utimesSync(childPath, time, time);
                  } catch (e) {}
                }
              }
            }
          }
        };

        writeResourceRecursive(null, projectPath);
      } catch (dbErr) {
        console.error("[Sync] Failed to fetch workflows for mirroring:", dbErr);
      }
    }

    console.log(`[Sync] Successfully synchronized "${projectName}" to local drive: ${projectPath}`);
    return { success: true, path: projectPath };
  } catch (error: any) {
    console.error(`[Sync] Failed to synchronize "${projectName}" to local drive:`, error);
    return { success: false, error: error.message };
  }
}
