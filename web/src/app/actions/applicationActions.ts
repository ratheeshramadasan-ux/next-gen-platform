"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma, ResourceType } from "@/generated/prisma-client";

/**
 * Audit Log Helper for Applications
 */
async function createApplicationAuditLog(
  entity: string,
  entityId: string,
  action: string,
  changedBy: string,
  oldValue: any = null,
  newValue: any = null
) {
  try {
    await prisma.applicationAuditLog.create({
      data: {
        entity,
        entityId,
        action,
        changedBy,
        oldValue: oldValue ? JSON.parse(JSON.stringify(oldValue)) : null,
        newValue: newValue ? JSON.parse(JSON.stringify(newValue)) : null,
      },
    });
  } catch (e) {
    console.error("Failed to create application audit log:", e);
  }
}

export async function getApplications(tenantId: string) {
  try {
    const apps = await prisma.application.findMany({
      where: { tenantId },
      include: {
        versions: {
          where: { isLatest: true },
          take: 1,
        },
        configs: {
          include: {
            environment: true,
          },
        },
        downtimes: {
          where: {
            endTime: { gte: new Date() },
          },
        },
      },
      orderBy: { name: "asc" },
    });
    return JSON.parse(JSON.stringify(apps));
  } catch (e) {
    console.error("Failed to fetch applications:", e);
    return [];
  }
}

export async function getApplicationDetail(applicationId: string) {
  try {
    const app = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        versions: {
          orderBy: { createdAt: "desc" },
        },
        configs: {
          include: {
            environment: true,
            dependencies: {
              orderBy: { startupOrder: "asc" },
            },
            credentialMappings: true,
            parameters: true,
          },
        },
        downtimes: {
          include: { environment: true },
          orderBy: { startTime: "desc" },
        },
        availabilityOverrides: {
          include: { environment: true },
        },
      },
    });
    return JSON.parse(JSON.stringify(app));
  } catch (e) {
    console.error("Failed to fetch application detail:", e);
    return null;
  }
}

export async function getApplicationEnvironments() {
  try {
    const envs = await prisma.applicationEnvironment.findMany({
      orderBy: { name: "asc" },
    });
    
    // Seed default environments if none exist
    if (envs.length === 0) {
      const defaults = ["DEV", "UAT", "PROD", "GLOBAL"];
      await prisma.applicationEnvironment.createMany({
        data: defaults.map(name => ({ name })),
      });
      return await prisma.applicationEnvironment.findMany({ orderBy: { name: "asc" } });
    }
    
    return JSON.parse(JSON.stringify(envs));
  } catch (e) {
    console.error("Failed to fetch environments:", e);
    return [];
  }
}

export async function upsertApplicationAction(payload: any, userId: string) {
  try {
    const { id, tenantId, name, category, owner, criticality, isActive } = payload;

    const result = await prisma.$transaction(async (tx) => {
      let app;
      if (id) {
        // Update
        const oldApp = await tx.application.findUnique({ where: { id } });
        app = await tx.application.update({
          where: { id },
          data: { name, category, owner, criticality, isActive },
        });
        await createApplicationAuditLog("Application", app.id, "UPDATE", userId, oldApp, app);
      } else {
        // 1. Create Resource via Raw SQL to bypass enum validation mismatch
        const resourceResult = await tx.$queryRawUnsafe<{ id: string }[]>(
          `INSERT INTO "platform"."resources" ("resource_id", "tenant_id", "resource_type", "name") 
           VALUES (gen_random_uuid(), $1::uuid, 'APPLICATION', $2) 
           RETURNING "resource_id" as id`,
          tenantId,
          name
        );
        
        const resourceId = resourceResult[0].id;

        // 2. Create Application linked to the new resource
        app = await tx.application.create({
          data: {
            tenant: { connect: { id: tenantId } },
            name,
            category,
            owner,
            criticality,
            isActive: isActive !== undefined ? isActive : true,
            resource: { connect: { id: resourceId } },
          },
        });
        await createApplicationAuditLog("Application", app.id, "CREATE", userId, null, app);
      }
      return app;
    });

    revalidatePath("/next-gen/admin/organization/apps");
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (e: any) {
    console.error("Failed to upsert application:", e);
    return { success: false, error: e.message };
  }
}

export async function saveApplicationConfigAction(applicationId: string, config: any, userId: string) {
  try {
    const { id, environmentId, versionId, launchType, url, executablePath, workingDirectory, launchArguments, timeoutSeconds, retryCount, requiresVPN, headlessSupported, isActive } = config;

    const result = await prisma.$transaction(async (tx) => {
      let appConfig;
      if (id) {
        const oldConfig = await tx.applicationConfig.findUnique({ where: { id } });
        appConfig = await tx.applicationConfig.update({
          where: { id },
          data: { 
            versionId, environmentId, launchType, url, executablePath, 
            workingDirectory, launchArguments, timeoutSeconds, 
            retryCount, requiresVPN, headlessSupported, isActive 
          },
        });
        await createApplicationAuditLog("ApplicationConfig", appConfig.id, "UPDATE", userId, oldConfig, appConfig);
      } else {
        appConfig = await tx.applicationConfig.create({
          data: { 
            applicationId, versionId, environmentId, launchType, url, 
            executablePath, workingDirectory, launchArguments, 
            timeoutSeconds, retryCount, requiresVPN, headlessSupported, isActive 
          },
        });
        await createApplicationAuditLog("ApplicationConfig", appConfig.id, "CREATE", userId, null, appConfig);
      }

      // Handle Dependencies, Parameters, etc. if provided in full sync
      if (config.dependencies) {
        await tx.applicationDependency.deleteMany({ where: { configId: appConfig.id } });
        if (config.dependencies.length > 0) {
          await tx.applicationDependency.createMany({
            data: config.dependencies.map((d: any) => ({
              configId: appConfig.id,
              name: d.name,
              type: d.type,
              path: d.path,
              startupOrder: d.startupOrder,
              isMandatory: d.isMandatory
            }))
          });
        }
      }

      if (config.parameters) {
        await tx.applicationParameter.deleteMany({ where: { configId: appConfig.id } });
        if (config.parameters.length > 0) {
          await tx.applicationParameter.createMany({
            data: config.parameters.map((p: any) => ({
              configId: appConfig.id,
              key: p.key,
              value: p.value,
              isEncrypted: p.isEncrypted
            }))
          });
        }
      }

      if (config.credentialMappings) {
        await tx.applicationCredentialMapping.deleteMany({ where: { configId: appConfig.id } });
        if (config.credentialMappings.length > 0) {
          await tx.applicationCredentialMapping.createMany({
            data: config.credentialMappings.map((c: any) => ({
              configId: appConfig.id,
              vaultKey: c.vaultKey
            }))
          });
        }
      }

      return appConfig;
    });

    revalidatePath(`/next-gen/admin/organization/apps/${applicationId}`);
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (e: any) {
    console.error("Failed to save application config:", e);
    return { success: false, error: e.message };
  }
}

export async function createApplicationVersionAction(applicationId: string, versionNumber: string, isLatest: boolean, userId: string) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      if (isLatest) {
        await tx.applicationVersion.updateMany({
          where: { applicationId },
          data: { isLatest: false },
        });
      }

      const version = await tx.applicationVersion.create({
        data: {
          applicationId,
          versionNumber,
          isLatest,
          releaseDate: new Date(),
        },
      });

      await createApplicationAuditLog("ApplicationVersion", version.id, "CREATE", userId, null, version);
      return version;
    });

    revalidatePath(`/next-gen/admin/organization/apps/${applicationId}`);
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (e: any) {
    console.error("Failed to create application version:", e);
    return { success: false, error: e.message };
  }
}

/**
 * Replication Logic: Clone Application
 */
export async function cloneApplicationAction(
  applicationId: string, 
  targetTenantId: string, 
  options: { 
    includeConfig: boolean; 
    includeDependencies: boolean; 
    includeParameters: boolean; 
    includeCredentials: boolean;
    isLinked: boolean;
  },
  userId: string
) {
  try {
    const sourceApp = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        versions: true,
        configs: {
          include: {
            dependencies: true,
            parameters: true,
            credentialMappings: true,
          }
        }
      }
    });

    if (!sourceApp) throw new Error("Source application not found");

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Resource in Target Tenant
      const resource = await tx.resource.create({
        data: {
          resourceType: ResourceType.APPLICATION,
          name: sourceApp.name,
          tenantId: targetTenantId,
        },
      });

      // 2. Create Application
      const newApp = await tx.application.create({
        data: {
          tenantId: targetTenantId,
          name: sourceApp.name,
          category: sourceApp.category,
          owner: sourceApp.owner,
          criticality: sourceApp.criticality,
          isActive: sourceApp.isActive,
          sourceApplicationId: sourceApp.id,
          isLinked: options.isLinked,
          resourceId: resource.id,
        },
      });

      // 3. Clone Versions
      const versionMap = new Map();
      for (const v of sourceApp.versions) {
        const newV = await tx.applicationVersion.create({
          data: {
            applicationId: newApp.id,
            versionNumber: v.versionNumber,
            isLatest: v.isLatest,
            releaseDate: v.releaseDate,
          }
        });
        versionMap.set(v.id, newV.id);
      }

      // 4. Clone Configs
      if (options.includeConfig) {
        for (const config of sourceApp.configs) {
          const newConfig = await tx.applicationConfig.create({
            data: {
              applicationId: newApp.id,
              versionId: config.versionId ? versionMap.get(config.versionId) : null,
              environmentId: config.environmentId,
              launchType: config.launchType,
              url: config.url,
              executablePath: config.executablePath,
              workingDirectory: config.workingDirectory,
              launchArguments: config.launchArguments,
              timeoutSeconds: config.timeoutSeconds,
              retryCount: config.retryCount,
              requiresVPN: config.requiresVPN,
              headlessSupported: config.headlessSupported,
              isActive: config.isActive,
            }
          });

          if (options.includeDependencies && config.dependencies.length > 0) {
            await tx.applicationDependency.createMany({
              data: config.dependencies.map(d => ({
                configId: newConfig.id,
                name: d.name,
                type: d.type,
                path: d.path,
                startupOrder: d.startupOrder,
                isMandatory: d.isMandatory
              }))
            });
          }

          if (options.includeParameters && config.parameters.length > 0) {
            await tx.applicationParameter.createMany({
              data: config.parameters.map(p => ({
                configId: newConfig.id,
                key: p.key,
                value: p.value,
                isEncrypted: p.isEncrypted
              }))
            });
          }

          if (options.includeCredentials && config.credentialMappings.length > 0) {
            await tx.applicationCredentialMapping.createMany({
              data: config.credentialMappings.map(c => ({
                configId: newConfig.id,
                vaultKey: c.vaultKey
              }))
            });
          }
        }
      }

      // 5. Log Replication
      await tx.applicationReplicationLog.create({
        data: {
          sourceTenantId: sourceApp.tenantId,
          targetTenantId,
          applicationId: sourceApp.id,
          actionType: "Clone",
          status: "Success",
        }
      });

      await createApplicationAuditLog("Application", newApp.id, "CLONE", userId, { sourceId: sourceApp.id }, newApp);
      
      return newApp;
    });

    revalidatePath("/next-gen/admin/organization/apps");
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (e: any) {
    console.error("Clone application failed:", e);
    return { success: false, error: e.message };
  }
}

export async function bulkReplicateApplicationsAction(
  sourceTenantId: string,
  targetTenantId: string,
  applicationIds: string[],
  mode: 'Merge' | 'Overwrite',
  userId: string
) {
  try {
    const results: any[] = [];
    for (const appId of applicationIds) {
      if (mode === 'Overwrite') {
        // Check if app with same name exists in target and delete it
        const sourceApp = await prisma.application.findUnique({ where: { id: appId } });
        if (sourceApp) {
          const existing = await prisma.application.findFirst({
            where: { tenantId: targetTenantId, name: sourceApp.name }
          });
          if (existing) {
            await prisma.application.delete({ where: { id: existing.id } });
          }
        }
      } else if (mode === 'Merge') {
        // Skip if exists
        const sourceApp = await prisma.application.findUnique({ where: { id: appId } });
        if (sourceApp) {
          const existing = await prisma.application.findFirst({
            where: { tenantId: targetTenantId, name: sourceApp.name }
          });
          if (existing) continue; 
        }
      }

      const res = await cloneApplicationAction(appId, targetTenantId, {
        includeConfig: true,
        includeDependencies: true,
        includeParameters: true,
        includeCredentials: true,
        isLinked: false
      }, userId);
      results.push(res);
    }

    await prisma.applicationReplicationLog.create({
      data: {
        sourceTenantId,
        targetTenantId,
        actionType: "Bulk",
        status: "Success",
      }
    });

    revalidatePath("/next-gen/admin/organization/apps");
    return { success: true, resultsCount: results.length };
  } catch (e: any) {
    console.error("Bulk replication failed:", e);
    return { success: false, error: e.message };
  }
}

export async function setDowntimeAction(applicationId: string, environmentId: string, downtime: any, userId: string) {
  try {
    const result = await prisma.applicationDowntime.create({
      data: {
        applicationId,
        environmentId,
        startTime: new Date(downtime.startTime),
        endTime: new Date(downtime.endTime),
        isRecurring: !!downtime.isRecurring,
        recurrencePattern: downtime.recurrencePattern,
        type: downtime.type,
        status: "Scheduled"
      }
    });
    
    await createApplicationAuditLog("ApplicationDowntime", result.id, "CREATE", userId, null, result);
    revalidatePath(`/next-gen/admin/organization/apps/${applicationId}`);
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (e: any) {
    console.error("Failed to set downtime:", e);
    return { success: false, error: e.message };
  }
}

export async function setAvailabilityOverrideAction(applicationId: string, environmentId: string, isDown: boolean, reason: string, userId: string) {
  try {
    const result = await prisma.applicationAvailabilityOverride.upsert({
      where: { 
        applicationId_environmentId: { applicationId, environmentId }
      },
      update: { isDown, reason },
      create: { applicationId, environmentId, isDown, reason }
    });

    await createApplicationAuditLog("ApplicationAvailabilityOverride", result.id, "UPSERT", userId, null, result);
    revalidatePath(`/next-gen/admin/organization/apps/${applicationId}`);
    return { success: true, data: JSON.parse(JSON.stringify(result)) };
  } catch (e: any) {
    console.error("Failed to set availability override:", e);
    return { success: false, error: e.message };
  }
}
