import { prisma } from "../src/lib/prisma";
import { Prisma } from "../src/generated/prisma-client";

async function main() {
  console.log("Seeding AI Document Capability Packs into Postgres model registry...");

  // Purge prebuilt models first to avoid duplicates
  await prisma.aiModelRegistry.deleteMany({
    where: { isPrebuilt: true }
  });

  const capabilityPacks = [
    // 1. IDENTITY CAPABILITY PACKS
    {
      modelKey: "claim-medical-ca-v4",
      modelName: "Medical Claim Canada v4",
      category: "Insurance",
      modelType: "extraction",
      version: "4.0.0",
      framework: "pytorch",
      runtime: "onnx",
      inferenceType: "Batch + Stream",
      supportsGpu: true,
      supportsCpu: true,
      requiresGpu: true,
      supportedRegions: ["CA"],
      supportedLanguages: ["English", "French"],
      confidenceScore: 0.98,
      deploymentStatus: "Active",
      isPrebuilt: true,
      packagePath: "/storage/packs/claim-medical-ca-v4.zip",
      dockerImage: "registry.platform.ai/claim-medical-ca:v4",
      checksumSha256: "sha256_8f902ac79b8a3df1c2d",
      metadata: {
        documentType: "Medical Claim",
        strategy: "Vision + AI Structure",
        fieldDefinitions: ["claim_number", "provider", "patient_name", "policy_number", "procedure_codes", "diagnosis_codes", "claim_amount"],
        validationRules: ["claim_amount > 0", "claim_number.startsWith('MC-')"],
        dependencies: ["torch", "transformers", "opencv-python"]
      },
      benchmarkResults: { accuracy: 98.2, latencyMs: 110, throughputFps: 50 },
      schemaDefinition: { outputSchema: "claim-medical-schema-v4" }
    },
    {
      modelKey: "passport-global-v1",
      modelName: "Passport Global Engine",
      category: "Identity",
      modelType: "extraction",
      version: "1.0.0",
      framework: "pytorch",
      runtime: "onnx",
      inferenceType: "Stream",
      supportsGpu: true,
      supportsCpu: true,
      requiresGpu: false,
      supportedRegions: ["US", "CA", "EU"],
      supportedLanguages: ["English", "French", "German"],
      confidenceScore: 0.92,
      deploymentStatus: "Active",
      isPrebuilt: true,
      packagePath: "/storage/packs/passport-global-v1.zip",
      dockerImage: "registry.platform.ai/passport-global:v1",
      checksumSha256: "sha256_5a9e32f87c12b489ef098ac12df8",
      metadata: {
        documentType: "Passport Global",
        strategy: "OCR + Anchor Extraction",
        fieldDefinitions: ["passport_number", "country", "surname", "given_names", "nationality", "date_of_birth", "gender", "expiry_date", "mrz", "photo_region"],
        validationRules: ["mrz.length === 88", "expiry_date > today"],
        dependencies: ["torch", "transformers", "paddleocr"]
      },
      benchmarkResults: { accuracy: 98.2, latencyMs: 120, throughputFps: 45 },
      schemaDefinition: { outputSchema: "passport-schema-v1" }
    },
    {
      modelKey: "dl-us-template-v2",
      modelName: "US Driver License Template Engine",
      category: "Identity",
      modelType: "extraction",
      version: "2.1.0",
      framework: "pytorch",
      runtime: "tensorrt",
      inferenceType: "Stream",
      supportsGpu: true,
      supportsCpu: true,
      requiresGpu: true,
      supportedRegions: ["US"],
      supportedLanguages: ["English"],
      confidenceScore: 0.95,
      deploymentStatus: "Active",
      isPrebuilt: true,
      packagePath: "/storage/packs/dl-us-template-v2.zip",
      dockerImage: "registry.platform.ai/dl-us-template:v2",
      checksumSha256: "sha256_82fc89e2182c1",
      metadata: {
        documentType: "Driver License",
        strategy: "Template + OCR",
        fieldDefinitions: ["license_number", "full_name", "dob", "expiry_date", "address", "class", "restrictions"],
        validationRules: ["license_number.length > 5"],
        dependencies: ["torch", "opencv-python"]
      },
      benchmarkResults: { accuracy: 98.9, latencyMs: 80, throughputFps: 65 },
      schemaDefinition: { outputSchema: "us-dl-schema-v2" }
    },
    {
      modelKey: "national-id-parser-v1",
      modelName: "National ID Parser",
      category: "Identity",
      modelType: "extraction",
      version: "1.0.0",
      framework: "pytorch",
      runtime: "onnx",
      inferenceType: "Stream",
      supportsGpu: true,
      supportsCpu: true,
      requiresGpu: false,
      supportedRegions: ["Global"],
      supportedLanguages: ["English", "Spanish", "Arabic"],
      confidenceScore: 0.94,
      deploymentStatus: "Active",
      isPrebuilt: true,
      packagePath: "/storage/packs/national-id-parser-v1.zip",
      dockerImage: "registry.platform.ai/national-id-parser:v1",
      checksumSha256: "sha256_7b82f8a12bc9",
      metadata: {
        documentType: "National ID",
        strategy: "OCR Structure Match",
        fieldDefinitions: ["id_number", "full_name", "issue_date", "expiry_date"],
        validationRules: [],
        dependencies: ["layoutlmv3"]
      },
      benchmarkResults: { accuracy: 96.4, latencyMs: 140, throughputFps: 35 },
      schemaDefinition: { outputSchema: "national-id-schema-v1" }
    },

    // 2. FINANCIAL CAPABILITY PACKS
    {
      modelKey: "invoice-enterprise-transformer-v3",
      modelName: "Invoice Enterprise Table Transformer",
      category: "Financial",
      modelType: "extraction",
      version: "3.2.0",
      framework: "pytorch",
      runtime: "vllm",
      inferenceType: "Batch",
      supportsGpu: true,
      supportsCpu: false,
      requiresGpu: true,
      supportedRegions: ["US", "CA", "EU"],
      supportedLanguages: ["English", "French", "German", "Spanish"],
      confidenceScore: 0.96,
      deploymentStatus: "Active",
      isPrebuilt: true,
      packagePath: "/storage/packs/invoice-enterprise-transformer-v3.zip",
      dockerImage: "registry.platform.ai/invoice-enterprise:v3",
      checksumSha256: "sha256_ab812cd9e812b",
      metadata: {
        documentType: "Invoice Enterprise",
        strategy: "Table Transformer",
        fieldDefinitions: ["invoice_number", "invoice_date", "vendor_name", "vendor_address", "currency", "line_items", "subtotal", "tax", "total"],
        validationRules: ["subtotal + tax === total"],
        dependencies: ["transformers", "vllm"]
      },
      benchmarkResults: { accuracy: 97.8, latencyMs: 250, throughputFps: 12 },
      schemaDefinition: { outputSchema: "invoice-enterprise-schema-v3" }
    },
    {
      modelKey: "bank-statement-transformer-v1",
      modelName: "Bank Statement Transaction Normalizer",
      category: "Financial",
      modelType: "extraction",
      version: "1.0.5",
      framework: "pytorch",
      runtime: "onnx",
      inferenceType: "Batch",
      supportsGpu: true,
      supportsCpu: true,
      requiresGpu: false,
      supportedRegions: ["US", "CA", "UK"],
      supportedLanguages: ["English"],
      confidenceScore: 0.95,
      deploymentStatus: "Active",
      isPrebuilt: true,
      packagePath: "/storage/packs/bank-statement-transformer-v1.zip",
      dockerImage: "registry.platform.ai/bank-statement:v1",
      checksumSha256: "sha256_fa218bc19d9b2",
      metadata: {
        documentType: "Bank Statement",
        strategy: "Table Transformer",
        fieldDefinitions: ["account_holder", "account_number", "transactions"],
        validationRules: ["transactions.every(t => t.amount !== undefined)"],
        dependencies: ["pandas", "openpyxl"]
      },
      benchmarkResults: { accuracy: 95.6, latencyMs: 180, throughputFps: 22 },
      schemaDefinition: { outputSchema: "bank-statement-schema-v1" }
    },

    // 3. INSURANCE CAPABILITY PACKS
    {
      modelKey: "medical-claim-global-v1",
      modelName: "Insurance Policy Clause Segmenter",
      category: "Insurance",
      modelType: "extraction",
      version: "1.2.0",
      framework: "pytorch",
      runtime: "onnx",
      inferenceType: "Stream",
      supportsGpu: true,
      supportsCpu: true,
      requiresGpu: false,
      supportedRegions: ["Global"],
      supportedLanguages: ["English"],
      confidenceScore: 0.93,
      deploymentStatus: "Active",
      isPrebuilt: true,
      packagePath: "/storage/packs/medical-claim-global-v1.zip",
      dockerImage: "registry.platform.ai/medical-claim-global:v1",
      checksumSha256: "sha256_cd812f8e1a92",
      metadata: {
        documentType: "Insurance Policy",
        strategy: "Vision + AI Structure",
        fieldDefinitions: ["policy_holder", "policy_limit", "deductible"],
        validationRules: [],
        dependencies: ["spacy"]
      },
      benchmarkResults: { accuracy: 96.2, latencyMs: 95, throughputFps: 48 },
      schemaDefinition: { outputSchema: "insurance-policy-schema-v1" }
    },

    // 4. HEALTHCARE CAPABILITY PACKS
    {
      modelKey: "prescription-parser-v2",
      modelName: "Prescription Parser & Drug Normalizer",
      category: "Healthcare",
      modelType: "extraction",
      version: "2.0.0",
      framework: "pytorch",
      runtime: "vllm",
      inferenceType: "Stream",
      supportsGpu: true,
      supportsCpu: false,
      requiresGpu: true,
      supportedRegions: ["US"],
      supportedLanguages: ["English"],
      confidenceScore: 0.90,
      deploymentStatus: "Active",
      isPrebuilt: true,
      packagePath: "/storage/packs/prescription-parser-v2.zip",
      dockerImage: "registry.platform.ai/prescription-parser:v2",
      checksumSha256: "sha256_ff12b8ac9210",
      metadata: {
        documentType: "Prescription",
        strategy: "LLM + LayoutLM",
        fieldDefinitions: ["patient_name", "medication", "dosage", "frequency", "doctor_signature"],
        validationRules: ["refills_count <= 5"],
        dependencies: ["vllm", "trocr"]
      },
      benchmarkResults: { accuracy: 93.5, latencyMs: 320, throughputFps: 8 },
      schemaDefinition: { outputSchema: "prescription-schema-v2" }
    },

    // 5. LOGISTICS CAPABILITY PACKS
    {
      modelKey: "bol-global-v3",
      modelName: "Bill of Lading Global Container Parser",
      category: "Logistics",
      modelType: "extraction",
      version: "3.0.0",
      framework: "pytorch",
      runtime: "onnx",
      inferenceType: "Batch",
      supportsGpu: true,
      supportsCpu: true,
      requiresGpu: false,
      supportedRegions: ["Global", "EU"],
      supportedLanguages: ["English", "German", "Dutch"],
      confidenceScore: 0.94,
      deploymentStatus: "Active",
      isPrebuilt: true,
      packagePath: "/storage/packs/bol-global-v3.zip",
      dockerImage: "registry.platform.ai/bol-global:v3",
      checksumSha256: "sha256_da9a1a2b3c4d",
      metadata: {
        documentType: "Bill of Lading",
        strategy: "Anchor extraction",
        fieldDefinitions: ["shipper", "consignee", "container_number", "port_of_loading", "port_of_discharge", "goods_description"],
        validationRules: ["container_number.length === 11"],
        dependencies: ["torch", "transformers"]
      },
      benchmarkResults: { accuracy: 96.0, latencyMs: 145, throughputFps: 30 },
      schemaDefinition: { outputSchema: "bol-schema-v3" }
    }
  ];

  for (const pack of capabilityPacks) {
    const registry = await prisma.aiModelRegistry.create({
      data: {
        modelKey: pack.modelKey,
        modelName: pack.modelName,
        category: pack.category,
        modelType: pack.modelType,
        version: pack.version,
        framework: pack.framework,
        runtime: pack.runtime,
        inferenceType: pack.inferenceType,
        supportsGpu: pack.supportsGpu,
        supportsCpu: pack.supportsCpu,
        requiresGpu: pack.requiresGpu,
        supportedRegions: pack.supportedRegions as any,
        supportedLanguages: pack.supportedLanguages as any,
        confidenceScore: new Prisma.Decimal(pack.confidenceScore),
        deploymentStatus: pack.deploymentStatus,
        isPrebuilt: pack.isPrebuilt,
        packagePath: pack.packagePath,
        dockerImage: pack.dockerImage,
        checksumSha256: pack.checksumSha256,
        metadata: pack.metadata as any,
        benchmarkResults: pack.benchmarkResults as any,
        schemaDefinition: pack.schemaDefinition as any
      }
    });

    // Seed associated prebuilt version
    await prisma.aiModelVersion.create({
      data: {
        modelId: registry.id,
        version: pack.version,
        packagePath: pack.packagePath,
        changelog: `Standard prebuilt seed capability pack for category: ${pack.category}.`,
        rollbackSupported: true,
        validationStatus: "Verified",
        benchmarkScore: new Prisma.Decimal(pack.benchmarkResults.accuracy),
        isCurrent: true
      }
    });

    // Seed associated prebuilt runtime engine mapping
    await prisma.aiModelRuntimeMapping.create({
      data: {
        modelId: registry.id,
        runtimeEngine: pack.runtime,
        executionMode: pack.requiresGpu ? "GPU" : "CPU",
        cpuRequired: 2,
        gpuRequired: pack.requiresGpu ? 1 : 0,
        ramRequiredGb: 4,
        inferenceTimeoutSec: 30,
        scalingPolicy: { minReplicas: 1, maxReplicas: 3 } as any
      }
    });
  }

  console.log("✅ Successfully seeded all 7 AI Document Capability Categories in model registry!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
