"use server";

// Note: In a real Next.js app, these would be in a "use server" file.
// For this platform's pattern, I'll follow the existing convention for actions.

import { prisma } from "@/lib/prisma";
import { 
  EnvironmentType, 
  AssessmentStatus, 
  AssetType, 
  DiscoveryJobStatus,
  AccountType,
  RiskSeverity,
  ComplianceStatus,
  OnboardingStatus
} from "@prisma/client";

/**
 * Retrieves all discovery assessments for a customer/tenant.
 */
export async function getDiscoveryAssessments(customerId: string) {
  try {
    const assessments = await prisma.discoveryAssessment.findMany({
      where: { organizationId: customerId },
      include: {
        businessUnit: true,
        region: true,
        _count: {
          select: { assets: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, assessments };
  } catch (error: any) {
    console.error("getDiscoveryAssessments Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Creates a new discovery assessment.
 */
export async function createDiscoveryAssessment(data: {
  name: string;
  organizationId: string;
  businessUnitId: string;
  environmentType: EnvironmentType;
  regionId?: string;
  createdBy: string;
}) {
  try {
    const assessment = await prisma.discoveryAssessment.create({
      data: {
        ...data,
        status: "DRAFT"
      }
    });
    return { success: true, assessment };
  } catch (error: any) {
    console.error("createDiscoveryAssessment Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves assets for a specific assessment with filtering.
 */
export async function getDiscoveryAssets(assessmentId: string, filters?: any) {
  try {
    const assets = await prisma.discoveryAsset.findMany({
      where: { 
        assessmentId,
        ...(filters?.assetType && { assetType: filters.assetType }),
        ...(filters?.criticality && { criticality: filters.criticality })
      },
      include: {
        accounts: true,
        risks: true,
        readiness: true,
        compliance: {
          include: { control: true }
        }
      },
      orderBy: { discoveredDate: 'desc' }
    });
    return { success: true, assets };
  } catch (error: any) {
    console.error("getDiscoveryAssets Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Starts a discovery job.
 */
export async function startDiscoveryJob(assessmentId: string, connectorId: string) {
  try {
    // 1. Create the job record
    const job = await prisma.discoveryJob.create({
      data: {
        assessmentId,
        connectorId,
        status: "PENDING"
      }
    });

    // 2. Trigger the background process (Mocked for now)
    // In a real system, this would push to a Redis queue or trigger an Edge Function.
    
    return { success: true, jobId: job.id };
  } catch (error: any) {
    console.error("startDiscoveryJob Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves compliance frameworks and their overall posture.
 */
export async function getCompliancePosture(customerId: string) {
  try {
    const frameworks = await prisma.complianceFramework.findMany({
      include: {
        controls: {
          include: {
            mappings: {
              select: { status: true }
            }
          }
        }
      }
    });

    // Calculate scores (Mock logic)
    const posture = frameworks.map(fw => {
      const totalControls = fw.controls.length;
      const compliantControls = fw.controls.filter(c => 
        c.mappings.length > 0 && c.mappings.every(m => m.status === "COMPLIANT")
      ).length;
      
      return {
        ...fw,
        score: totalControls > 0 ? Math.round((compliantControls / totalControls) * 100) : 0
      };
    });

    return { success: true, posture };
  } catch (error: any) {
    console.error("getCompliancePosture Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves risk findings for a tenant.
 */
export async function getRiskFindings(customerId: string) {
  try {
    const findings = await prisma.riskFinding.findMany({
      where: {
        asset: {
          assessment: {
            organizationId: customerId
          }
        }
      },
      include: {
        asset: true
      },
      orderBy: { severity: 'desc' }
    });
    return { success: true, findings };
  } catch (error: any) {
    console.error("getRiskFindings Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves all registered discovery connectors.
 */
export async function getDiscoveryConnectors() {
  try {
    const connectors = await prisma.discoveryConnector.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, connectors };
  } catch (error: any) {
    console.error("getDiscoveryConnectors Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Registers a new discovery connector.
 */
export async function createDiscoveryConnector(data: {
  name: string;
  connectorType: string;
  config: any;
  resourceId?: string;
}) {
  try {
    const connector = await prisma.discoveryConnector.create({
      data
    });
    return { success: true, connector };
  } catch (error: any) {
    console.error("createDiscoveryConnector Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves a summary of PAM readiness across all assets.
 */
export async function getPamReadinessSummary(customerId: string) {
  try {
    const readiness = await prisma.pamReadiness.findMany({
      where: {
        asset: {
          assessment: {
            organizationId: customerId
          }
        }
      },
      include: {
        asset: true,
        platform: true
      }
    });

    const summary = {
      total: readiness.length,
      ready: readiness.filter(r => r.onboardingStatus === "READY").length,
      notReady: readiness.filter(r => r.onboardingStatus === "NOT_READY").length,
      inProgress: readiness.filter(r => r.onboardingStatus === "IN_PROGRESS").length,
      onboarded: readiness.filter(r => r.onboardingStatus === "ONBOARDED").length,
      cpmReady: readiness.filter(r => r.cpmReady).length,
      psmReady: readiness.filter(r => r.psmReady).length
    };

    return { success: true, summary, details: readiness };
  } catch (error: any) {
    console.error("getPamReadinessSummary Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Runs a discovery job (Simulated background worker).
 */
export async function runDiscoveryJob(jobId: string) {
  try {
    const job = await prisma.discoveryJob.findUnique({
      where: { id: jobId },
      include: { assessment: true, connector: true }
    });

    if (!job) return { success: false, error: "Job not found" };

    // Update to RUNNING
    await prisma.discoveryJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() }
    });

    // Simulate Network Scanning delay
    await new Promise(resolve => setTimeout(resolve, 3000));

    const assetCount = Math.floor(Math.random() * 15) + 5;
    
    // Create Mock Assets
    for (let i = 0; i < assetCount; i++) {
      const hostname = `${job.connector.name.split(' ')[0].toLowerCase()}-node-${i+1}.internal.corp`;
      const asset = await prisma.discoveryAsset.create({
        data: {
          assessmentId: job.assessmentId,
          hostname: hostname,
          ipAddress: `10.10.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
          osType: job.connector.connectorType === "AD" ? "WINDOWS" : "LINUX",
          osVersion: job.connector.connectorType === "AD" ? "Windows Server 2019" : "Ubuntu 22.04 LTS",
          assetType: "VIRTUAL_MACHINE",
          criticality: hostname.includes("vault") || hostname.includes("prod") ? "CRITICAL" : "MEDIUM",
          metadata: JSON.stringify({
            discoverySource: job.connector.name,
            macAddress: "00:1A:2B:3C:4D:5E",
            discoveryTime: new Date().toISOString()
          })
        }
      });

      // Create Mock Accounts for each asset
      await prisma.discoveredAccount.createMany({
        data: [
          {
            assetId: asset.id,
            username: "Administrator",
            privilegedLevel: "ADMIN",
            mfaEnabled: Math.random() > 0.5,
            lastLogin: new Date(),
            status: "ACTIVE"
          },
          {
            assetId: asset.id,
            username: "svc_backup",
            privilegedLevel: "SERVICE",
            mfaEnabled: false,
            lastLogin: new Date(Date.now() - 86400000 * 30),
            status: "INACTIVE"
          }
        ]
      });
    }

    // Finalize Job
    await prisma.discoveryJob.update({
      where: { id: jobId },
      data: { 
        status: "COMPLETED", 
        completedAt: new Date(),
        assetsFound: assetCount,
        progress: 100
      }
    });

    return { success: true, assetsFound: assetCount };
  } catch (error: any) {
    console.error("runDiscoveryJob Error:", error);
    await prisma.discoveryJob.update({
      where: { id: jobId },
      data: { status: "FAILED", metadata: JSON.stringify({ error: error.message }) }
    });
    return { success: false, error: error.message };
  }
}

/**
 * Generates a comprehensive assessment report.
 */
export async function generateAssessmentReport(assessmentId: string) {
  try {
    const assessment = await prisma.discoveryAssessment.findUnique({
      where: { id: assessmentId },
      include: {
        assets: {
          include: { accounts: true, risks: true, compliance: true }
        },
        businessUnit: true,
        region: true
      }
    });

    if (!assessment) return { success: false, error: "Assessment not found" };

    const totalAssets = assessment.assets.length;
    const criticalAssets = assessment.assets.filter(a => a.criticality === "CRITICAL").length;
    const highRisks = assessment.assets.reduce((acc, a) => acc + a.risks.filter(r => r.severity === "HIGH" || r.severity === "CRITICAL").length, 0);
    
    const pamReadiness = totalAssets > 0 
      ? Math.round((assessment.assets.filter(a => a.hostname.includes("vault") || a.accounts.some(acc => acc.privilegedLevel === "ADMIN")).length / totalAssets) * 100)
      : 0;

    const report = {
      summary: {
        assessmentName: assessment.name,
        businessUnit: assessment.businessUnit?.name,
        totalAssets,
        criticalAssets,
        highRisks,
        pamReadinessScore: pamReadiness,
        generatedAt: new Date().toISOString()
      },
      topRisks: assessment.assets
        .flatMap(a => a.risks)
        .sort((a, b) => b.severity.localeCompare(a.severity))
        .slice(0, 5),
      platformRecommendation: {
        primary: assessment.environmentType === "CLOUD" ? "BeyondTrust Cloud" : "CyberArk PAM Self-Hosted",
        reasoning: `Based on ${assessment.environmentType} infrastructure and ${totalAssets} discovered assets.`
      }
    };

    return { success: true, report };
  } catch (error: any) {
    console.error("generateAssessmentReport Error:", error);
    return { success: false, error: error.message };
  }
}

// ── Global Resource Registry ──────────────────────────────────────────────────

export async function getAllResources(filters?: { resourceType?: string; status?: string }) {
  try {
    const where: any = { deletedAt: null };
    if (filters?.resourceType) where.resourceType = filters.resourceType;
    if (filters?.status) where.status = filters.status;

    const resources = await prisma.resource.findMany({
      where,
      orderBy: [{ resourceType: "asc" }, { createdAt: "desc" }],
      take: 500,
    });
    return JSON.parse(JSON.stringify(resources));
  } catch (e: any) {
    console.error("getAllResources:", e.message);
    return [];
  }
}

export async function getRegistryStats() {
  try {
    const [total, byType, tenants, workflows] = await Promise.all([
      prisma.resource.count({ where: { deletedAt: null } }),
      prisma.resource.groupBy({
        by: ["resourceType"],
        _count: { id: true },
        where: { deletedAt: null },
      }),
      prisma.tenant.count({ where: { deletedAt: null } }),
      prisma.studioWorkflow.count(),
    ]);

    const byTypeMap: Record<string, number> = {};
    byType.forEach(r => { byTypeMap[r.resourceType] = r._count.id; });

    return { total, byType: byTypeMap, tenants, workflows };
  } catch (e: any) {
    console.error("getRegistryStats:", e.message);
    return { total: 0, byType: {}, tenants: 0, workflows: 0 };
  }
}
