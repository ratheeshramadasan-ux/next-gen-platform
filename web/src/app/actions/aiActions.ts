"use server";

import { prisma } from "@/lib/prisma";

/**
 * Analyzes raw asset metadata and suggests enterprise-grade classifications.
 * In a real production system, this would call a Gemini/Vertex AI model.
 */
export async function analyzeAssetIntelligence(assetId: string) {
  try {
    const asset = await prisma.discoveryAsset.findUnique({
      where: { id: assetId },
      include: { accounts: true }
    });

    if (!asset) return { success: false, error: "Asset not found" };

    // MOCK AI LOGIC - Simulating an LLM analysis of the metadata
    const metadata = asset.metadata as any || {};
    const hostname = asset.hostname.toLowerCase();
    
    let suggestions = {
      criticality: "MEDIUM",
      assetType: asset.assetType,
      pamReadiness: "NOT_READY",
      complianceFrameworks: [] as string[],
      reasoning: ""
    };

    // 1. Criticality Inference
    if (hostname.includes("dc") || hostname.includes("vault") || hostname.includes("prod")) {
      suggestions.criticality = "CRITICAL";
      suggestions.reasoning += "Identified as Tier-0/Production based on naming convention. ";
    } else if (hostname.includes("dev") || hostname.includes("test")) {
      suggestions.criticality = "LOW";
    }

    // 2. Compliance Applicability
    if (suggestions.criticality === "CRITICAL") {
      suggestions.complianceFrameworks.push("NIST", "SOC2");
    }
    if (asset.ipAddress?.startsWith("10.50")) { // Mock PCI segment
      suggestions.complianceFrameworks.push("PCI-DSS");
      suggestions.reasoning += "Located in PCI-scoped network segment. ";
    }

    // 3. PAM Onboarding Wave
    const hasPrivAccounts = asset.accounts.some(a => a.privilegedLevel === "ADMIN" || a.privilegedLevel === "ROOT");
    if (hasPrivAccounts) {
      suggestions.pamReadiness = "READY";
      suggestions.reasoning += "Privileged accounts detected. PSM proxying recommended. ";
    }

    return { 
      success: true, 
      suggestions,
      aiConfidence: 0.92 // 92% confidence score
    };
  } catch (error: any) {
    console.error("analyzeAssetIntelligence Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Generates automated risk findings for an assessment.
 */
export async function generateAutoRiskFindings(assessmentId: string) {
  try {
    const assets = await prisma.discoveryAsset.findMany({
      where: { assessmentId },
      include: { accounts: true }
    });

    let findingsCreated = 0;

    for (const asset of assets) {
      // Logic for "Weak Passwords" (Mocked)
      // Logic for "No MFA"
      const noMfaAccounts = asset.accounts.filter(a => !a.mfaEnabled && a.privilegedLevel !== "USER");
      
      if (noMfaAccounts.length > 0) {
        await prisma.riskFinding.create({
          data: {
            assetId: asset.id,
            riskType: "No MFA on Privileged Account",
            severity: "HIGH",
            description: `${noMfaAccounts.length} accounts found without MFA enforcement.`,
            remediation: "Enforce MFA via Entra ID or Duo integration."
          }
        });
        findingsCreated++;
      }

      // Logic for "EOL OS"
      if (asset.osVersion?.includes("2012") || asset.osVersion?.includes("2008")) {
        await prisma.riskFinding.create({
          data: {
            assetId: asset.id,
            riskType: "End-of-Life Operating System",
            severity: "CRITICAL",
            description: `Host is running an unsupported OS version: ${asset.osVersion}`,
            remediation: "Upgrade to Windows Server 2022 or migrate to Azure."
          }
        });
        findingsCreated++;
      }
    }

    return { success: true, findingsCreated };
  } catch (error: any) {
    console.error("generateAutoRiskFindings Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Recommends a PAM platform based on asset environment and compliance requirements.
 */
export async function recommendPamArchitecture(assessmentId: string) {
  try {
    const assessment = await prisma.discoveryAssessment.findUnique({
      where: { id: assessmentId },
      include: { 
        _count: { select: { assets: true } }
      }
    });

    if (!assessment) return { success: false };

    // Recommendation logic
    let platform = "CyberArk";
    let reasoning = "Recommended for large-scale hybrid enterprise infrastructure.";

    if (assessment.environmentType === "CLOUD") {
      platform = "BeyondTrust (SaaS)";
      reasoning = "Cloud-native architecture detected. BeyondTrust Cloud provides superior integration for multi-cloud workloads.";
    }

    return { 
      success: true, 
      recommendation: {
        platform,
        reasoning,
        estimatedOnboardingWaves: 3,
        complexityScore: "Medium"
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Validates an uploaded AI model package ZIP file.
 */
export async function validateUploadedModelPackageAction(packageName: string, mockFilesList?: string[]) {
  try {
    const { validateModelPackage } = await import("@/document-reader/services/modelRegistryService");
    const manifest = await validateModelPackage(packageName, mockFilesList);
    return { success: true, manifest };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Registers an uploaded AI model package in the Postgres registry database.
 */
export async function registerUploadedModelAction(manifest: any, packagePath: string, runtimeConfig?: any, benchmarkConfig?: any) {
  try {
    const { registerModel } = await import("@/document-reader/services/modelRegistryService");
    const record = await registerModel(manifest, packagePath, runtimeConfig, benchmarkConfig);
    return { success: true, record };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Retrieves all dynamic capability packs from the Postgres registry.
 */
export async function getRegisteredCapabilityPacksAction() {
  try {
    const packs = await prisma.aiModelRegistry.findMany({
      where: { isActive: true },
      orderBy: { uploadedAt: "desc" }
    });

    const mapped = packs.map(p => {
      const meta = (p.metadata as any) || {};
      const bench = (p.benchmarkResults as any) || {};
      return {
        id: p.modelKey,
        name: p.modelName,
        code: p.modelKey,
        category: p.category || "Identity",
        accuracy: Number(bench.accuracy || p.confidenceScore?.toString() || "95.0"),
        strategy: meta.strategy || p.modelType || "OCR + Anchor",
        languages: p.supportedLanguages as string[] || ["English"],
        regions: p.supportedRegions as string[] || ["US"],
        requiresGpu: p.requiresGpu,
        isActive: p.isActive
      };
    });

    return { success: true, packs: mapped };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
