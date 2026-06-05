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

// ─── Application Registry — Governance Extensions ────────────────────────────
// Raw SQL throughout to avoid stale Prisma client issues with new columns

export async function getApplicationRegistry(tenantId: string, customerId?: string) {
  try {
    const apps = await prisma.$queryRaw<any[]>`
      SELECT
        a.id, a.name, a.app_code AS "appCode", a.category, a.application_type AS "applicationType",
        a.business_owner AS "businessOwner", a.technical_owner AS "technicalOwner",
        a.owner, a.criticality, a.description, a.status, a.timezone, a.is_24x7 AS "is24x7",
        a.is_active AS "isActive", a.source_application_id AS "sourceApplicationId",
        a.created_at AS "createdAt", a.updated_at AS "updatedAt",
        a.tenant_id AS "tenantId", a.customer_id AS "customerId",
        -- Next maintenance window
        (SELECT MIN(d.start_time) FROM platform.application_downtimes d
         WHERE d.application_id = a.id AND d.start_time > now()) AS "nextMaintenance",
        -- Active freeze
        (SELECT COUNT(*) FROM platform.app_freeze_windows f
         WHERE f.application_id = a.id AND f.is_active = true) AS "activeFreezes",
        -- Environments count (from configs)
        (SELECT COUNT(DISTINCT c.environment_id) FROM platform.application_configs c
         WHERE c.application_id = a.id) AS "envCount"
      FROM platform.applications a
      WHERE a.tenant_id = ${tenantId}::uuid
      ORDER BY a.name ASC
    `;
    return JSON.parse(JSON.stringify(apps));
  } catch (e: any) {
    console.error("getApplicationRegistry:", e.message);
    return [];
  }
}

export async function getApplicationFull(appId: string) {
  try {
    const [apps, hours, downtimes, blackouts, freezes] = await Promise.all([
      prisma.$queryRaw<any[]>`
        SELECT a.*, a.app_code AS "appCode", a.application_type AS "applicationType",
               a.business_owner AS "businessOwner", a.technical_owner AS "technicalOwner",
               a.is_24x7 AS "is24x7", a.is_active AS "isActive"
        FROM platform.applications a WHERE a.id = ${appId}::uuid LIMIT 1
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, day_of_week AS "dayOfWeek", is_closed AS "isClosed", start_time AS "startTime", end_time AS "endTime"
        FROM platform.app_operating_hours WHERE application_id = ${appId}::uuid ORDER BY day_of_week
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, start_time AS "startTime", end_time AS "endTime", type, status,
               is_recurring AS "isRecurring", recurrence_pattern AS "recurrencePattern",
               environment_id AS "environmentId"
        FROM platform.application_downtimes WHERE application_id = ${appId}::uuid
          AND end_time > now() ORDER BY start_time ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, name, start_date AS "startDate", end_date AS "endDate",
               is_recurring AS "isRecurring", recurrence_rule AS "recurrenceRule",
               bot_policy AS "botPolicy", description, created_at AS "createdAt"
        FROM platform.app_blackout_periods WHERE application_id = ${appId}::uuid
          AND end_date >= now() ORDER BY start_date ASC
      `,
      prisma.$queryRaw<any[]>`
        SELECT id, reason, start_at AS "startAt", end_at AS "endAt",
               is_active AS "isActive", impact, created_by AS "createdBy", created_at AS "createdAt"
        FROM platform.app_freeze_windows WHERE application_id = ${appId}::uuid
          ORDER BY created_at DESC
      `,
    ]);
    if (!apps[0]) return null;
    return JSON.parse(JSON.stringify({
      ...apps[0],
      operatingHours: hours,
      maintenanceWindows: downtimes,
      blackoutPeriods: blackouts,
      freezeWindows: freezes,
    }));
  } catch (e: any) {
    console.error("getApplicationFull:", e.message);
    return null;
  }
}

export async function upsertApplicationRegistry(payload: {
  id?: string;
  tenantId: string;
  customerId?: string;
  name: string; appCode?: string; category?: string; applicationType?: string;
  businessOwner?: string; technicalOwner?: string; owner?: string;
  criticality?: string; description?: string; status?: string;
  timezone?: string; is24x7?: boolean;
}) {
  try {
    const id = payload.id;
    if (id) {
      await prisma.$queryRawUnsafe(
        `UPDATE platform.applications SET name=$2, app_code=$3, category=$4, application_type=$5,
         business_owner=$6, technical_owner=$7, owner=$8, criticality=$9, description=$10,
         status=$11, timezone=$12, is_24x7=$13, updated_at=now()
         WHERE id=$1::uuid`,
        id, payload.name, payload.appCode||null, payload.category||null, payload.applicationType||null,
        payload.businessOwner||null, payload.technicalOwner||null, payload.owner||null,
        payload.criticality||'Medium', payload.description||null, payload.status||'Active',
        payload.timezone||'UTC', payload.is24x7??false
      );
      revalidatePath("/next-gen/admin/organization/apps");
      return { success: true, id };
    } else {
      const rows = await prisma.$queryRaw<{id:string}[]>`
        INSERT INTO platform.applications (tenant_id, customer_id, name, app_code, category, application_type,
          business_owner, technical_owner, owner, criticality, description, status, timezone, is_24x7)
        VALUES (${payload.tenantId}::uuid, ${payload.customerId||null}::uuid, ${payload.name},
          ${payload.appCode||null}, ${payload.category||null}, ${payload.applicationType||null},
          ${payload.businessOwner||null}, ${payload.technicalOwner||null}, ${payload.owner||null},
          ${payload.criticality||'Medium'}, ${payload.description||null}, ${payload.status||'Active'},
          ${payload.timezone||'UTC'}, ${payload.is24x7??false})
        RETURNING id
      `;
      revalidatePath("/next-gen/admin/organization/apps");
      return { success: true, id: rows[0].id };
    }
  } catch (e: any) {
    console.error("upsertApplicationRegistry:", e.message);
    return { success: false, error: e.message };
  }
}

export async function saveOperatingHours(appId: string, hours: {
  dayOfWeek: number; isClosed: boolean; startTime?: string; endTime?: string;
}[]) {
  try {
    for (const h of hours) {
      await prisma.$queryRawUnsafe(
        `INSERT INTO platform.app_operating_hours (application_id, day_of_week, is_closed, start_time, end_time)
         VALUES ($1::uuid, $2, $3, $4, $5)
         ON CONFLICT (application_id, day_of_week)
         DO UPDATE SET is_closed=$3, start_time=$4, end_time=$5, updated_at=now()`,
        appId, h.dayOfWeek, h.isClosed, h.startTime||null, h.endTime||null
      );
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function upsertBlackoutPeriod(appId: string, payload: {
  id?: string; name: string; startDate: string; endDate: string;
  isRecurring?: boolean; recurrenceRule?: string;
  botPolicy?: string; description?: string;
}) {
  try {
    if (payload.id) {
      await prisma.$queryRawUnsafe(
        `UPDATE platform.app_blackout_periods SET name=$2, start_date=$3::timestamptz, end_date=$4::timestamptz,
         is_recurring=$5, recurrence_rule=$6, bot_policy=$7, description=$8, updated_at=now()
         WHERE id=$1::uuid AND application_id=${appId}::uuid`,
        payload.id, payload.name, payload.startDate, payload.endDate,
        payload.isRecurring||false, payload.recurrenceRule||null, payload.botPolicy||'BLOCK', payload.description||null
      );
    } else {
      await prisma.$queryRawUnsafe(
        `INSERT INTO platform.app_blackout_periods (application_id,name,start_date,end_date,is_recurring,recurrence_rule,bot_policy,description)
         VALUES ($1::uuid,$2,$3::timestamptz,$4::timestamptz,$5,$6,$7,$8)`,
        appId, payload.name, payload.startDate, payload.endDate,
        payload.isRecurring||false, payload.recurrenceRule||null, payload.botPolicy||'BLOCK', payload.description||null
      );
    }
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function deleteBlackoutPeriod(id: string) {
  try {
    await prisma.$queryRawUnsafe(`DELETE FROM platform.app_blackout_periods WHERE id=$1::uuid`, id);
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function createFreezeWindow(appId: string, payload: {
  reason: string; startAt: string; endAt?: string; impact?: string; createdBy?: string;
}) {
  try {
    await prisma.$queryRawUnsafe(
      `INSERT INTO platform.app_freeze_windows (application_id,reason,start_at,end_at,impact,created_by)
       VALUES ($1::uuid,$2,$3::timestamptz,$4::timestamptz,$5,$6)`,
      appId, payload.reason, payload.startAt, payload.endAt||null, payload.impact||'BLOCK_ALL', payload.createdBy||null
    );
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function resolveFreezeWindow(id: string, resolvedBy: string) {
  try {
    await prisma.$queryRawUnsafe(
      `UPDATE platform.app_freeze_windows SET is_active=false, resolved_at=now(), resolved_by=$2 WHERE id=$1::uuid`,
      id, resolvedBy
    );
    return { success: true };
  } catch (e: any) { return { success: false, error: e.message }; }
}

export async function cloneAppRegistry(sourceId: string, newName: string, tenantId: string) {
  try {
    // Clone the application
    const rows = await prisma.$queryRaw<{id:string}[]>`
      INSERT INTO platform.applications (tenant_id, name, app_code, category, application_type,
        business_owner, technical_owner, owner, criticality, description, status, timezone, is_24x7)
      SELECT tenant_id, ${newName}, app_code||'_COPY', category, application_type,
        business_owner, technical_owner, owner, criticality, description, 'Planned', timezone, is_24x7
      FROM platform.applications WHERE id = ${sourceId}::uuid
      RETURNING id
    `;
    const newId = rows[0]?.id;
    if (!newId) return { success: false, error: "Clone failed" };

    // Clone operating hours
    await prisma.$queryRaw`
      INSERT INTO platform.app_operating_hours (application_id, day_of_week, is_closed, start_time, end_time)
      SELECT ${newId}::uuid, day_of_week, is_closed, start_time, end_time
      FROM platform.app_operating_hours WHERE application_id = ${sourceId}::uuid
      ON CONFLICT DO NOTHING
    `;

    revalidatePath("/next-gen/admin/organization/apps");
    return { success: true, id: newId };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// Validate if a bot schedule conflicts with app availability
export async function checkScheduleConflict(appId: string, scheduledAt: string): Promise<{
  conflict: boolean; reason?: string; type?: string;
}> {
  try {
    const dt = new Date(scheduledAt);
    const dayOfWeek = dt.getDay();
    const timeStr = `${String(dt.getHours()).padStart(2,'0')}:${String(dt.getMinutes()).padStart(2,'0')}`;

    // Check operating hours
    const hours = await prisma.$queryRaw<any[]>`
      SELECT is_closed, start_time, end_time, is_24x7
      FROM platform.app_operating_hours oh
      JOIN platform.applications a ON a.id = oh.application_id
      WHERE oh.application_id = ${appId}::uuid AND oh.day_of_week = ${dayOfWeek}
    `;
    if (hours[0]) {
      if (hours[0].isClosed || hours[0].is_closed) return { conflict: true, reason: "Application is closed on this day", type: "OPERATING_HOURS" };
      if (hours[0].start_time && hours[0].end_time) {
        if (timeStr < hours[0].start_time || timeStr > hours[0].end_time)
          return { conflict: true, reason: `Outside operating hours (${hours[0].start_time}–${hours[0].end_time})`, type: "OPERATING_HOURS" };
      }
    }

    // Check active freezes
    const freezes = await prisma.$queryRaw<any[]>`
      SELECT reason, impact FROM platform.app_freeze_windows
      WHERE application_id = ${appId}::uuid AND is_active = true
        AND start_at <= ${scheduledAt}::timestamptz
        AND (end_at IS NULL OR end_at >= ${scheduledAt}::timestamptz)
    `;
    if (freezes.length > 0) return { conflict: true, reason: `Active freeze: ${freezes[0].reason}`, type: "FREEZE" };

    // Check blackout periods
    const blackouts = await prisma.$queryRaw<any[]>`
      SELECT name, bot_policy FROM platform.app_blackout_periods
      WHERE application_id = ${appId}::uuid
        AND start_date <= ${scheduledAt}::timestamptz AND end_date >= ${scheduledAt}::timestamptz
        AND bot_policy != 'ALLOW'
    `;
    if (blackouts.length > 0) return { conflict: true, reason: `Blackout period: ${blackouts[0].name}`, type: "BLACKOUT" };

    // Check maintenance windows
    const maintenance = await prisma.$queryRaw<any[]>`
      SELECT type FROM platform.application_downtimes
      WHERE application_id = ${appId}::uuid
        AND start_time <= ${scheduledAt}::timestamptz AND end_time >= ${scheduledAt}::timestamptz
    `;
    if (maintenance.length > 0) return { conflict: true, reason: `Maintenance window: ${maintenance[0].type}`, type: "MAINTENANCE" };

    return { conflict: false };
  } catch (e: any) {
    console.error("checkScheduleConflict:", e.message);
    return { conflict: false };
  }
}
