import { create } from "zustand";
import { 
  TrainingStage, 
  PageMetadata, 
  BoundaryDetectionProperties, 
  PageContinuityProperties, 
  SeparatorDetectionProperties, 
  BlankPageProperties, 
  HeaderDetectionProperties, 
  FooterDetectionProperties, 
  KeywordSegregationProperties, 
  FixedPageSplitProperties, 
  UnclassifiedProperties, 
  UnclassifiedSegment,
  SegregationSettings,
  SegregationLogicGroup,
  DocumentReaderProject,
  DocumentClass,
  DocumentSegment,
  TrainingDocument,
  TrainingPage,
  PageAnalysis,
  ClassificationResult,
  BoundaryResult,
  ContinuityResult,
  ConfidenceResult,
  ExtractionInfrastructure,
  OCREngine,
  OfflineModel,
  RuntimeProfile,
  RoutingPolicy,
  GPUStatus,
  BenchmarkResult,
  SupportLevel,
  GovernanceSettings,
  PiiPattern,
  AuditLog,
  IngestionSource,
  IngestionBatch,
  IngestionSourceType,
  Annotation,
  AnnotationType,
  ExtractionField,
  SegregationRule
} from "../types";
import { updateProjectMetadataWithForm, getProjectMetadata } from "@/app/actions/projectActions";
import { OCREngine as OCREngineService } from "../services/ocrEngine";

const DB_METADATA_AUTOSAVE_LIMIT_BYTES = 50_000_000;

// Every store mutation calls saveProject() immediately, so a flurry of edits
// (e.g. changing several field types in a row) fires many concurrent DB
// writes. Without serialization, an earlier request can resolve after a
// later one and silently overwrite newer edits with stale data. These guard
// flags ensure only one write is ever in flight, and that the most recent
// state is always the last one sent.
let dbSaveInFlight = false;
let dbSaveQueued = false;

export type { 
  TrainingDocument, 
  TrainingPage, 
  DocumentClass, 
  Annotation,
  AnnotationType,
  ExtractionInfrastructure,
  BenchmarkResult,
  OCREngine,
  OfflineModel
} from "../types";


interface PipelineStore {
  // Model-level Segregation Settings
  selectedModelId: string;
  modelSegregationSettings: Record<string, SegregationSettings>;
  setSelectedModelId: (modelId: string) => void;

  // Global Collection
  trainingDocuments: TrainingDocument[];
  
  // Selection
  activeDocument?: TrainingDocument;
  activePage?: TrainingPage;
  
  // App State
  projectId: string | null;
  folderId: string | null;
  loading: boolean;
  ocrProgress: number;

  // Taxonomy
  documentClasses: DocumentClass[];
  
  // Segregation Engine State
  segregationSettings: SegregationSettings;

  // Selection & AI Insights
  selectedPageIds: string[];
  groupInsights: Record<string, {
    commonAnchors: { text: string; confidence: number; frequency: number; spatialY: number }[];
    layoutSignature: string;
    differentiatorScore: number;
  }>;

  // Infrastructure Manager
  infrastructure: ExtractionInfrastructure;

  // Ingestion Engine
  ingestionSources: IngestionSource[];
  ingestionBatches: IngestionBatch[];

  // Actions
  setTrainingDocuments: (docs: TrainingDocument[]) => void;
  updateTrainingDocument: (docId: string, updates: Partial<TrainingDocument>) => void;
  replaceDocumentWithSegments: (docId: string, segments: TrainingDocument[]) => void;
  
  addClass: (cls: DocumentClass) => void;
  deleteClass: (id: string) => void;
  updateClassConfig: (id: string, updates: Partial<DocumentClass>) => void;
  recordClassConfidenceSnapshot: (id: string, snapshot: { count: number; overall: number; classification: number; extraction: number }) => void;
  updateDocumentClass: (docId: string, id: string, method?: "manual" | "system", modelName?: string, ocrEngineName?: string) => void;
  updatePageClass: (pageId: string, id: string, method?: "manual" | "system", modelName?: string, ocrEngineName?: string) => void;
  deleteTrainingDocument: (docId: string) => void;
  
  // Segregation Actions
  splitDocument: (docId: string, pageIndex: number) => void;
  mergeDocuments: (docIds: string[]) => void;
  deletePage: (pageId: string) => void;
  reorderPages: (docId: string, pageIds: string[]) => void;
  movePages: (sourceDocId: string, targetDocId: string | "NEW", pageIds: string[]) => void;
  runAutoSegregation: () => void;
  updateSegregationSettings: (updates: Partial<PipelineStore["segregationSettings"]>) => void;
  addSegregationRule: (rule: SegregationRule) => void;
  addLogicGroup: (group: SegregationLogicGroup) => void;
  updateLogicGroup: (groupId: string, updates: Partial<SegregationLogicGroup>) => void;
  createManualDocument: (pageIds: string[], name: string) => void;
  deleteLogicGroup: (groupId: string) => void;
  
  // Ingestion Actions
  updateIngestionSource: (id: string, config: Partial<IngestionSource>) => void;
  addIngestionSource: (source: IngestionSource) => void;
  deleteIngestionSource: (id: string) => void;
  addIngestionBatch: (batch: IngestionBatch) => void;
  
  // Manual & AI Actions
  setSelectedPageIds: (ids: string[]) => void;
  mapPagesToGroup: (pageIds: string[], groupId: string) => void;
  analyzeGroupDifferentiators: (groupId: string) => void;
  promoteInsightToRule: (groupId: string, insightType: "header" | "keyword", value: string) => void;
  
  setActiveDocument: (doc: TrainingDocument | undefined) => void;
  setActivePage: (page: TrainingPage | undefined) => void;
  
  addAnnotation: (pageId: string, annotation: Partial<Annotation>) => void;
  updateAnnotation: (pageId: string, annotation: Annotation) => void;
  deleteAnnotation: (pageId: string, annotationId: string) => void;
  
  // Persistence Actions
  setProjectId: (id: string | null) => void;
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
  clearAllState: () => void;
  syncInfrastructure: () => void;
  
  // Project Container Actions
  exportProject: () => void;
  importProject: (project: DocumentReaderProject) => void;

  // Infrastructure Actions
  updateEngineStatus: (engineId: string, status: OCREngine["status"]) => void;
  updateEnginePort: (engineId: string, port: number) => void;
  toggleModel: (modelId: string, active: boolean) => void;
  saveRoutingPolicy: (policy: RoutingPolicy) => void;
  deleteRoutingPolicy: (policyId: string) => void;
  executeBenchmark: (engineId: string) => void;
  configureEngine: (engineId: string) => void;
  updateGovernance: (updates: Partial<GovernanceSettings>) => void;
  toggleLanguage: (language: string) => void;
  saveProject: (forceState?: any) => Promise<void>;
  setPrimaryEngine: (engineId: string) => void;
  batchSaveRoutingPolicies: (policies: RoutingPolicy[]) => void;
  runAllBenchmarks: () => Promise<void>;
  addAuditLog: (log: Omit<AuditLog, "id" | "timestamp" | "date">) => void;
  executeOCR: () => Promise<void>;
  
  // Cleanup/Reset
  clearDocuments: () => void;
}



const MOCK_INFRASTRUCTURE: ExtractionInfrastructure = {
  engines: [
    {
      id: "google-doc-ai",
      name: "Google Document AI",
      provider: "Google Cloud",
      version: "v1.2 (LTS)",
      runtimeType: "cloud",
      deploymentMode: "saas",
      isGpuSupported: true,
      isOfflineSupported: false,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: false,
      accuracyScore: 0.985,
      latencyScore: 1.2,
      memoryRequirement: "N/A",
      supportedLanguages: ["en", "fr", "de", "es", "ja", "ko"],
      licenseType: "enterprise",
      helpUrl: "https://cloud.google.com/document-ai",
      description: "Google's flagship AI for structured document extraction.",
      capabilities: { 
        "OCR Text": SupportLevel.AVAILABLE, 
        "Tables": SupportLevel.AVAILABLE, 
        "Form Fields": SupportLevel.AVAILABLE,
        "Signatures": SupportLevel.AVAILABLE,
        "Checkboxes": SupportLevel.AVAILABLE,
        "RadioButtons": SupportLevel.AVAILABLE
      }
    },
    {
      id: "aws-textract",
      name: "AWS Textract",
      provider: "Amazon Web Services",
      version: "v2024.1",
      runtimeType: "cloud",
      deploymentMode: "saas",
      isGpuSupported: true,
      isOfflineSupported: false,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: false,
      accuracyScore: 0.978,
      latencyScore: 1.1,
      memoryRequirement: "N/A",
      supportedLanguages: ["en", "fr", "de", "es", "it", "pt"],
      licenseType: "enterprise",
      helpUrl: "https://aws.amazon.com/textract/",
      description: "Powerful cloud OCR with automated table and form extraction.",
      capabilities: { 
        "OCR Text": SupportLevel.AVAILABLE, 
        "Tables": SupportLevel.AVAILABLE, 
        "Signatures": SupportLevel.PARTIAL,
        "Checkboxes": SupportLevel.AVAILABLE
      }
    },
    {
      id: "azure-doc-intel",
      name: "Azure AI Document Intelligence",
      provider: "Microsoft Azure",
      version: "v3.1 (GA)",
      runtimeType: "cloud",
      deploymentMode: "saas",
      isGpuSupported: true,
      isOfflineSupported: false,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: false,
      accuracyScore: 0.982,
      latencyScore: 0.95,
      memoryRequirement: "N/A",
      supportedLanguages: ["en", "90+ languages"],
      licenseType: "enterprise",
      helpUrl: "https://azure.microsoft.com/en-us/products/ai-services/ai-document-intelligence",
      description: "Advanced layout and key-value pair extraction from Microsoft.",
      capabilities: { 
        "OCR Text": SupportLevel.AVAILABLE, 
        "Tables": SupportLevel.AVAILABLE, 
        "Layout": SupportLevel.AVAILABLE,
        "Signatures": SupportLevel.AVAILABLE,
        "Checkboxes": SupportLevel.AVAILABLE,
        "RadioButtons": SupportLevel.AVAILABLE
      }
    },
    {
      id: "paddle-ocr-v4",
      name: "PaddleOCR (LTS)",
      provider: "Baidu / Open Source",
      version: "v4.0",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "active",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.945,
      latencyScore: 0.35,
      memoryRequirement: "4GB",
      gpuMemoryRequirement: "8GB",
      supportedLanguages: ["en", "zh", "multilingual"],
      licenseType: "open-source",
      helpUrl: "https://github.com/PaddlePaddle/PaddleOCR",
      description: "Ultra-lightweight OCR system with deep learning based layout and table analysis.",
      deployedUrl: "http://localhost:8080/v1/paddle-ocr",
      port: 8080,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Tables": SupportLevel.AVAILABLE, "Layout": SupportLevel.AVAILABLE }
    },
    {
      id: "opencv-micr-v1",
      name: "OpenCV + MICR",
      provider: "Local Custom Pipeline",
      version: "v1.0",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: false,
      isOfflineSupported: true,
      status: "active",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.99,
      latencyScore: 0.1,
      memoryRequirement: "500MB",
      supportedLanguages: ["micr", "en"],
      licenseType: "open-source",
      helpUrl: "",
      description: "Specialized OpenCV morphological extraction pipeline for E-13B/CMC-7 MICR routing bands on financial documents.",
      deployedUrl: "http://localhost:8090/extract",
      port: 8090,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Layout": SupportLevel.PARTIAL }
    },
    {
      id: "tesseract-ocr-v5",
      name: "Tesseract OCR",
      provider: "Open Source / HP / Google",
      version: "v5.3",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: false,
      isOfflineSupported: true,
      status: "active",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.892,
      latencyScore: 0.22,
      memoryRequirement: "2GB",
      supportedLanguages: ["en", "fr", "de", "es", "ja", "zh", "100+ others"],
      licenseType: "open-source",
      helpUrl: "https://github.com/tesseract-ocr/tesseract",
      description: "The most widely used open-source OCR engine, ideal for standard document formats.",
      deployedUrl: "http://localhost:8081/v1/tesseract",
      port: 8081,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Layout": SupportLevel.PARTIAL }
    },
    {
      id: "easy-ocr",
      name: "EasyOCR",
      provider: "Jaided AI / Open Source",
      version: "v1.7",
      runtimeType: "offline",
      deploymentMode: "edge",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.912,
      latencyScore: 0.45,
      memoryRequirement: "2GB",
      gpuMemoryRequirement: "4GB",
      supportedLanguages: ["en", "ko", "ja", "zh", "80+ others"],
      licenseType: "open-source",
      helpUrl: "https://github.com/JaidedAI/EasyOCR",
      description: "Ready-to-use OCR with 80+ supported languages and deep learning recognition.",
      deployedUrl: "http://localhost:8082/v1/easy-ocr",
      port: 8082,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Handwriting": SupportLevel.PARTIAL }
    },
    {
      id: "kraken-ocr",
      name: "Kraken OCR",
      provider: "Open Source",
      version: "v4.3",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.928,
      latencyScore: 0.52,
      memoryRequirement: "4GB",
      gpuMemoryRequirement: "8GB",
      supportedLanguages: ["en", "fr", "la", "de"],
      licenseType: "open-source",
      helpUrl: "https://github.com/mittagessen/kraken",
      description: "Advanced OCR system for historical and handwritten documents with flexible layout analysis.",
      deployedUrl: "http://localhost:8083/v1/kraken",
      port: 8083,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Historical": SupportLevel.AVAILABLE, "Degraded": SupportLevel.AVAILABLE }
    },
    {
      id: "ocropus",
      name: "OCRopus",
      provider: "Research / Open Source",
      version: "v1.0",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: false,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.905,
      latencyScore: 0.41,
      memoryRequirement: "2GB",
      supportedLanguages: ["en", "de"],
      licenseType: "open-source",
      helpUrl: "https://github.com/ocropus/ocropus",
      description: "Python-based OCR package focused on research and historical document recognition.",
      deployedUrl: "http://localhost:8084/v1/ocropus",
      port: 8084,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Historical": SupportLevel.AVAILABLE }
    },
    {
      id: "calamari-ocr",
      name: "Calamari OCR",
      provider: "Open Source",
      version: "v2.2",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.938,
      latencyScore: 0.32,
      memoryRequirement: "4GB",
      gpuMemoryRequirement: "6GB",
      supportedLanguages: ["en", "de", "la"],
      licenseType: "open-source",
      helpUrl: "https://github.com/Calamari-OCR/calamari",
      description: "High-performance OCR engine utilizing deep learning for line-based recognition.",
      deployedUrl: "http://localhost:8085/v1/calamari",
      port: 8085,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Historical": SupportLevel.AVAILABLE }
    },
    {
      id: "doctr",
      name: "docTR (Mindee)",
      provider: "Mindee / Open Source",
      version: "v0.7",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.952,
      latencyScore: 0.58,
      memoryRequirement: "4GB",
      gpuMemoryRequirement: "8GB",
      supportedLanguages: ["en", "fr", "de", "es"],
      licenseType: "open-source",
      helpUrl: "https://github.com/mindee/doctr",
      description: "Seamless document text recognition using transformer-based architectures.",
      deployedUrl: "http://localhost:8086/v1/doctr",
      port: 8086,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Layout": SupportLevel.AVAILABLE, "Tables": SupportLevel.AVAILABLE }
    },
    {
      id: "mmocr",
      name: "MMOCR",
      provider: "OpenMMLab",
      version: "v1.0",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.958,
      latencyScore: 0.72,
      memoryRequirement: "8GB",
      gpuMemoryRequirement: "12GB",
      supportedLanguages: ["en", "zh"],
      licenseType: "open-source",
      helpUrl: "https://github.com/open-mmlab/mmocr",
      description: "A comprehensive toolkit for text detection, recognition and understanding.",
      deployedUrl: "http://localhost:8087/v1/mmocr",
      port: 8087,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Layout": SupportLevel.AVAILABLE }
    },
    {
      id: "trocr",
      name: "TrOCR",
      provider: "Microsoft / Open Source",
      version: "v1.0",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.972,
      latencyScore: 1.05,
      memoryRequirement: "4GB",
      gpuMemoryRequirement: "8GB",
      supportedLanguages: ["en"],
      licenseType: "open-source",
      helpUrl: "https://github.com/microsoft/unilm/tree/master/trocr",
      description: "Transformer-based optical character recognition for handwriting and printed text.",
      deployedUrl: "http://localhost:8088/v1/trocr",
      port: 8088,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Handwriting": SupportLevel.AVAILABLE }
    },
    {
      id: "spacy-ocr",
      name: "spaCy + OCR",
      provider: "Explosion AI",
      version: "v3.7",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: false,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.924,
      latencyScore: 0.48,
      memoryRequirement: "2GB",
      gpuMemoryRequirement: "0GB",
      supportedLanguages: ["en", "multi-12+"],
      licenseType: "open-source",
      helpUrl: "https://spacy.io",
      description: "Advanced NLP pipelines combined with OCR for semantic document extraction.",
      deployedUrl: "http://localhost:8095/v1/spacy-ocr",
      port: 8095,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "NLP": SupportLevel.AVAILABLE }
    },
    {
      id: "surya-ocr",
      name: "Surya OCR",
      provider: "Open Source",
      version: "v0.17",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "active",
      healthStatus: "healthy",
      isConfigured: true,
      port: 8089,
      accuracyScore: 0.962,
      latencyScore: 0.28,
      memoryRequirement: "4GB",
      gpuMemoryRequirement: "6GB",
      supportedLanguages: ["en", "90+ others"],
      licenseType: "open-source",
      helpUrl: "https://github.com/vikas-paruchuri/surya",
      description: "Highly efficient OCR and layout analysis system.",
      deployedUrl: "http://localhost:8089/v1/surya",
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Layout": SupportLevel.AVAILABLE }
    },
    {
      id: "efficient-ocr",
      name: "EfficientOCR",
      provider: "Research",
      version: "v0.1",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.898,
      latencyScore: 0.12,
      memoryRequirement: "4GB",
      gpuMemoryRequirement: "8GB",
      supportedLanguages: ["en"],
      licenseType: "open-source",
      description: "Optimized OCR framework for high-throughput pipelines.",
      deployedUrl: "http://localhost:8090/v1/efficient-ocr",
      port: 8090,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE }
    },
    {
      id: "easy-ocr-pro",
      name: "EasyOCR",
      provider: "JaidedAI / Open Source",
      version: "v1.7",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.925,
      latencyScore: 0.38,
      memoryRequirement: "4GB",
      gpuMemoryRequirement: "4GB",
      supportedLanguages: ["en", "multi-80+"],
      licenseType: "open-source",
      helpUrl: "https://github.com/JaidedAI/EasyOCR",
      description: "Ready-to-use OCR with 80+ supported languages.",
      deployedUrl: "http://localhost:8091/v1/easy-ocr",
      port: 8091,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Checkboxes": SupportLevel.AVAILABLE }
    },
    {
      id: "layout-lm-v3-engine",
      name: "LayoutLMv3",
      provider: "Microsoft Research",
      version: "v3.0",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.965,
      latencyScore: 0.88,
      memoryRequirement: "8GB",
      gpuMemoryRequirement: "12GB",
      supportedLanguages: ["en"],
      licenseType: "open-source",
      helpUrl: "https://github.com/microsoft/unilm/tree/master/layoutlmv3",
      description: "State-of-the-art multimodal pre-training.",
      deployedUrl: "http://localhost:8092/v1/layoutlmv3",
      port: 8092,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Layout": SupportLevel.AVAILABLE, "Tables": SupportLevel.AVAILABLE }
    },
    {
      id: "donut-engine",
      name: "Donut",
      provider: "Naver AI",
      version: "v1.0",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: true,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.942,
      latencyScore: 1.25,
      memoryRequirement: "8GB",
      gpuMemoryRequirement: "16GB",
      supportedLanguages: ["en", "ko", "ja"],
      licenseType: "open-source",
      helpUrl: "https://github.com/clovaai/donut",
      description: "OCR-free Document Understanding Transformer.",
      deployedUrl: "http://localhost:8093/v1/donut",
      port: 8093,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Layout": SupportLevel.AVAILABLE }
    },
    {
      id: "opencv-micr",
      name: "OpenCV + MICR",
      provider: "Custom Integration",
      version: "v2.1",
      runtimeType: "offline",
      deploymentMode: "on-prem",
      isGpuSupported: false,
      isOfflineSupported: true,
      status: "inactive",
      healthStatus: "healthy",
      isConfigured: true,
      accuracyScore: 0.992,
      latencyScore: 0.08,
      memoryRequirement: "1GB",
      gpuMemoryRequirement: "0GB",
      supportedLanguages: ["numeric"],
      licenseType: "enterprise",
      helpUrl: "https://opencv.org",
      description: "Optimized computer vision pipeline for MICR line and barcode recognition.",
      deployedUrl: "http://localhost:8094/v1/opencv-micr",
      port: 8094,
      capabilities: { "OCR Text": SupportLevel.AVAILABLE, "Signatures": SupportLevel.AVAILABLE }
    }
  ],
  offlineModels: [
    {
      id: "google-procurement-v1",
      engineId: "google-doc-ai",
      name: "Procurement Processor",
      version: "1.2.0",
      format: "Cloud-Managed",
      size: "N/A",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "managed-by-google",
      benchmarkScore: 0.98,
      description: "High-accuracy cloud processor for invoices and receipts.",
      helpUrl: "https://cloud.google.com/document-ai/docs/processors-list"
    },
    {
      id: "layout-lm-v3",
      engineId: "paddle-ocr-v4",
      name: "LayoutLM-v3 Base",
      version: "1.0.2",
      format: "ONNX",
      size: "1.2GB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:7a8b9c...",
      benchmarkScore: 0.94,
      description: "State-of-the-art layout-aware document understanding model.",
      helpUrl: "https://github.com/microsoft/unilm/tree/master/layoutlmv3"
    },
    {
      id: "tess-eng-best",
      engineId: "tesseract-ocr-v5",
      name: "English Best (LTS)",
      version: "5.0.0",
      format: "TensorFlow",
      size: "15MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:e3b0c4...",
      benchmarkScore: 0.85,
      description: "Highly accurate English language model for Tesseract.",
      helpUrl: "https://github.com/tesseract-ocr/tessdata_best"
    },
    {
      id: "paddle-en-pp-ocrv4",
      engineId: "paddle-ocr-v4",
      name: "English PP-OCRv4",
      version: "4.0.1",
      format: "PaddlePaddle",
      size: "124MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:9f8e7d...",
      benchmarkScore: 0.96,
      description: "Ultra-fast English detection and recognition model.",
      helpUrl: "https://github.com/PaddlePaddle/PaddleOCR"
    },
    {
      id: "doctr-resnet50",
      engineId: "doctr",
      name: "ResNet50 Recognition",
      version: "0.7.0",
      format: "PyTorch",
      size: "210MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:d1c2b3...",
      benchmarkScore: 0.92,
      description: "High-stability recognition backbone for docTR pipelines.",
      helpUrl: "https://github.com/mindee/doctr"
    },
    {
      id: "mmocr-satrn",
      engineId: "mmocr",
      name: "SATRN Recognition",
      version: "1.1.0",
      format: "ONNX",
      size: "340MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:m0o1p2...",
      benchmarkScore: 0.94,
      description: "Arbitrary-shaped text recognition model for complex layouts.",
      helpUrl: "https://github.com/open-mmlab/mmocr"
    },
    {
      id: "trocr-base-printed",
      engineId: "trocr",
      name: "TrOCR Base Printed",
      version: "1.0.0",
      format: "PyTorch",
      size: "1.3GB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:t3r0c1...",
      benchmarkScore: 0.97,
      description: "Encoder-decoder model for high-precision printed text recognition.",
      helpUrl: "https://github.com/microsoft/unilm/tree/master/trocr"
    },
    {
      id: "surya-layout-xl",
      engineId: "surya-ocr",
      name: "Surya Layout-XL",
      version: "0.4.2",
      format: "ONNX",
      size: "820MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:s8u7r6...",
      benchmarkScore: 0.95,
      description: "Advanced layout analysis and text detection for multi-column documents.",
      helpUrl: "https://github.com/vikas-paruchuri/surya"
    },
    {
      id: "efficient-ocr-nano",
      engineId: "efficient-ocr",
      name: "EfficientOCR Nano",
      version: "0.1.5",
      format: "TensorFlow",
      size: "45MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:e0c1r2...",
      benchmarkScore: 0.89,
      description: "Lightweight OCR weights for edge-computing scenarios.",
      helpUrl: "https://github.com/EfficientOCR"
    },
    {
      id: "mmocr-sar",
      engineId: "mmocr",
      name: "SAR Recognition Model",
      version: "1.0.0",
      format: "PyTorch",
      size: "185MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:f1e2d3...",
      benchmarkScore: 0.95,
      description: "Show, Attend and Read (SAR) model for robust text recognition.",
      helpUrl: "https://github.com/open-mmlab/mmocr"
    },
    {
      id: "surya-layout-v1",
      engineId: "surya-ocr",
      name: "Surya Layout Analyzer",
      version: "0.4.2",
      format: "ONNX",
      size: "450MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:c3b2a1...",
      benchmarkScore: 0.91,
      description: "Advanced layout analysis and spatial anchoring model.",
      helpUrl: "https://github.com/vikas-paruchuri/surya"
    },
    {
      id: "aws-analyze-doc-v2",
      engineId: "aws-textract",
      name: "Analyze Document V2",
      version: "2.1.0",
      format: "Cloud-Managed",
      size: "N/A",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "managed-by-aws",
      benchmarkScore: 0.96,
      description: "Standard AWS Textract processor for general document analysis.",
      helpUrl: "https://aws.amazon.com/textract/"
    },
    {
      id: "azure-prebuilt-invoice-v3",
      engineId: "azure-doc-intel",
      name: "Prebuilt Invoice V3",
      version: "3.1.2",
      format: "Cloud-Managed",
      size: "N/A",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "managed-by-microsoft",
      benchmarkScore: 0.97,
      description: "Optimized Azure model for multi-lingual invoice extraction.",
      helpUrl: "https://azure.microsoft.com/en-us/products/ai-services/ai-document-intelligence"
    },
    {
      id: "easyocr-english-v1",
      engineId: "easy-ocr",
      name: "English Recognition V1",
      version: "1.7.1",
      format: "PyTorch",
      size: "145MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:ea5y0c...",
      benchmarkScore: 0.92,
      description: "Lightweight English detection and recognition model for EasyOCR.",
      helpUrl: "https://github.com/JaidedAI/EasyOCR"
    },
    {
      id: "ocropus-fraktur-v1",
      engineId: "ocropus",
      name: "Historical Fraktur",
      version: "1.0.0",
      format: "PyTorch",
      size: "85MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:ocro01...",
      benchmarkScore: 0.84,
      description: "Specialized model for reading historical Fraktur script.",
      helpUrl: "https://github.com/ocropus/ocropus"
    },
    {
      id: "calamari-de-hist-v2",
      engineId: "calamari-ocr",
      name: "German Historical (LTS)",
      version: "2.2.0",
      format: "TensorFlow",
      size: "120MB",
      isActive: true,
      validationStatus: "valid",
      lastValidated: new Date().toISOString(),
      checksum: "sha256:cal02...",
      benchmarkScore: 0.95,
      description: "High-precision model for historical German document recognition.",
      helpUrl: "https://github.com/Calamari-OCR/calamari"
    }
  ],
  profiles: [
    {
      id: "fast-ocr",
      name: "Fast OCR (High Throughput)",
      description: "Optimized for speed using cloud engines.",
      isSystem: true,
      config: { engineId: "google-doc-ai", thresholds: { confidence: 0.6 }, useGpu: false, useCaching: true, pipeline: ["OCR"] }
    }
  ],
  policies: [],
  gpuInventory: [
    {
      id: "gpu-node-01",
      name: "NVIDIA H100 (80GB)",
      vramTotal: "80GB",
      vramUsed: "12.4GB",
      usagePercent: 15,
      temperature: 38,
      cudaVersion: "12.4",
      activePipelines: 2,
      status: "online",
      powerUsage: "142W",
      fanSpeed: "28%",
      clockSpeed: "2.4GHz"
    },
    {
      id: "gpu-node-02",
      name: "NVIDIA A100 (40GB)",
      vramTotal: "40GB",
      vramUsed: "28.8GB",
      usagePercent: 72,
      temperature: 64,
      cudaVersion: "12.2",
      activePipelines: 12,
      status: "online",
      powerUsage: "285W",
      fanSpeed: "65%",
      clockSpeed: "1.4GHz"
    },
    {
      id: "gpu-node-03",
      name: "NVIDIA L40S (48GB)",
      vramTotal: "48GB",
      vramUsed: "8.2GB",
      usagePercent: 17,
      temperature: 42,
      cudaVersion: "12.3",
      activePipelines: 4,
      status: "online",
      powerUsage: "115W",
      fanSpeed: "34%",
      clockSpeed: "2.5GHz"
    },
    {
      id: "gpu-node-04",
      name: "NVIDIA A30 (24GB)",
      vramTotal: "24GB",
      vramUsed: "0GB",
      usagePercent: 0,
      temperature: 32,
      cudaVersion: "12.1",
      activePipelines: 0,
      status: "online",
      powerUsage: "15W",
      fanSpeed: "10%",
      clockSpeed: "0.8GHz"
    }
  ],
  benchmarks: [],
  governance: {
    piiEntities: ["ssn", "email", "phone", "passport"],
    handlingMode: "redact",
    customPatterns: [
      { id: "PAT-001", name: "Internal Employee ID", pattern: "EMP-[0-9]{5}", enabled: true },
    ],
    retentionDays: 30,
    dataResidency: "EU-West-1",
    auditLevel: "standard",
    isImmutableLogEnabled: true,
    enabledLanguages: ["English", "French", "German", "Spanish", "Chinese", "Japanese"]
  },
  primaryEngineId: "tesseract-ocr-v5",
  transparencyLogs: []
};

const DEFAULT_INFRASTRUCTURE: ExtractionInfrastructure = MOCK_INFRASTRUCTURE;

const DEFAULT_SEGREGATION_SETTINGS: PipelineStore["segregationSettings"] = {
  boundary: {
    enabled: true,
    confidenceThreshold: 0.7,
    allowMultiDocumentBundles: true,
    minimumPagesPerDocument: 1,
    maximumPagesPerDocument: 100,
    useOCRSimilarity: true,
    similarityThreshold: 0.8,
    useHeaderMatching: true,
    useFooterMatching: true,
    useSemanticClassification: true,
    useStructuralBoundary: true,
    useBarcodeBoundary: true,
    useKeywordBoundary: true,
    usePageCountBoundary: false,
    mergeSmallDocuments: false,
    preserveOriginalOrder: true
  },
  continuity: {
    enabled: true,
    useTextSimilarity: true,
    similarityThreshold: 0.8,
    useTableContinuation: true,
    useHeaderContinuation: true,
    useFooterContinuation: true,
    useSemanticGrouping: true,
    allowMissingPages: false,
    maxGapPages: 0
  },
  separator: {
    enabled: false,
    barcodeEnabled: true,
    qrEnabled: true,
    separatorKeywords: ["SEPARATOR", "COVER SHEET"],
    colorPageDetection: false,
    blankSeparatorDetection: true,
    separatorConfidence: 0.9
  },
  blank: {
    enabled: true,
    pixelThreshold: 0.05,
    textThreshold: 5,
    removeNoise: true,
    autoDeskew: true,
    autoDespeckle: true,
    preserveSeparatorPages: true,
    minimumInkCoverage: 0.01
  },
  header: {
    enabled: true,
    topRegionPercentage: 20,
    minimumOccurrences: 2,
    fuzzyMatching: true,
    ignorePageNumbers: true,
    multipleHeaderGroups: true,
    normalizeWhitespace: true,
    useAIHeaderDetection: true,
    groups: []
  },
  footer: {
    enabled: true,
    bottomRegionPercentage: 15,
    minimumOccurrences: 2,
    fuzzyMatching: true,
    detectPageNumbers: true,
    normalizeWhitespace: true,
    multipleFooterGroups: true,
    groups: []
  },
  keyword: {
    enabled: true,
    keywords: [],
    matchType: "contains",
    caseSensitive: false,
    semanticSimilarity: true,
    confidenceThreshold: 0.8,
    splitOnMatch: true,
    mergeOnMatch: false
  },
  pageCount: {
    enabled: false,
    pagesPerDocument: 1,
    preserveLastPartialDocument: true,
    resetOnSeparatorPage: true
  },
  unclassified: {
    enabled: true,
    confidenceThreshold: 0.6,
    allowPartialClassification: true,
    stopPipelineProcessing: true,
    autoAssignReviewQueue: true,
    reviewQueueName: "Manual Review",
    retryWithAdvancedOCR: true,
    retryWithAIClassification: true,
    allowManualReclassification: true,
    includeInTrainingDataset: true,
    autoEscalateAfterHours: 24,
    preserveOriginalDocument: true,
    mergeAdjacentUnclassifiedPages: true
  },
  rules: [],
  logicGroups: []
};

export const usePipelineStore = create<PipelineStore>((set, get) => ({
  trainingDocuments: [] as TrainingDocument[],
  documentClasses: [] as DocumentClass[],
  projectId: null,
  folderId: null,
  loading: false,
  ocrProgress: 0,
  infrastructure: MOCK_INFRASTRUCTURE,
  selectedPageIds: [] as string[],
  groupInsights: {} as Record<string, any>,
  segregationSettings: DEFAULT_SEGREGATION_SETTINGS,
  selectedModelId: "passport-global-v1",
  modelSegregationSettings: {
    "passport-global-v1": DEFAULT_SEGREGATION_SETTINGS
  } as Record<string, SegregationSettings>,
  activeDocument: undefined as TrainingDocument | undefined,
  activePage: undefined as TrainingPage | undefined,
  
  // Ingestion Engine Defaults
  ingestionSources: [],
  ingestionBatches: [],

  updateIngestionSource: (id, config) => set((state) => ({
    ingestionSources: state.ingestionSources.map(s => s.id === id ? { ...s, ...config } : s)
  })),

  addIngestionSource: (source) => set((state) => ({
    ingestionSources: [...state.ingestionSources, source]
  })),

  deleteIngestionSource: (id) => set((state) => ({
    ingestionSources: state.ingestionSources.filter(s => s.id !== id)
  })),

  addIngestionBatch: (batch) => {
    set((state) => ({
      ingestionBatches: [batch, ...state.ingestionBatches]
    }));
    get().saveProject();
  },

  setProjectId: (id: string | null) => {
    const currentState = get();
    if (currentState.projectId !== id) {
      set({ 
        projectId: id,
        trainingDocuments: [],
        documentClasses: [],
        ingestionBatches: [],
        ingestionSources: [],
        activeDocument: undefined,
        activePage: undefined
      });
    }
  },

  setSelectedModelId: (modelId: string) => {
    set((state) => {
      const existingSettings = state.modelSegregationSettings[modelId] || JSON.parse(JSON.stringify(DEFAULT_SEGREGATION_SETTINGS));
      const updatedModelSettings = {
        ...state.modelSegregationSettings,
        [modelId]: existingSettings
      };
      return {
        selectedModelId: modelId,
        segregationSettings: existingSettings,
        modelSegregationSettings: updatedModelSettings
      };
    });
    get().saveProject();
  },

  saveProject: async (forceState?: any) => {
    const state = forceState || get();
    const projectId = state.projectId || 'default';
    
    const payload = {
      projectType: "DOC_READER",
      trainingDocuments: state.trainingDocuments,
      documentClasses: state.documentClasses,
      segregationSettings: state.segregationSettings,
      modelSegregationSettings: state.modelSegregationSettings,
      selectedModelId: state.selectedModelId,
      groupInsights: state.groupInsights,
      infrastructure: state.infrastructure,
      ingestionSources: state.ingestionSources,
      ingestionBatches: state.ingestionBatches
    };

    const payloadStr = JSON.stringify(payload);
    
    // 1. Local Persistence (Fast) with Quota Guard
    try {
      localStorage.setItem(`studio_state_${projectId}`, payloadStr);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED') {
        console.warn("[StudioStore] LocalStorage full. Attempting pruned save...");
        try {
          // Pruned Save: Skip training documents in local storage, keep only metadata
          const prunedPayload = { ...payload, trainingDocuments: [] };
          localStorage.setItem(`studio_state_${projectId}`, JSON.stringify(prunedPayload));
          
          // Cleanup old studio states to free space
          Object.keys(localStorage)
            .filter(key => key.startsWith('studio_state_') && key !== `studio_state_${projectId}`)
            .forEach(key => localStorage.removeItem(key));
            
        } catch (innerError) {
          console.error("[StudioStore] Critical Quota Failure. Skipping Local Storage.");
        }
      }
    }
    
    // 2. Database Persistence (Reliable) - background only.
    // Large OCR/image payloads can take minutes to write as project metadata and block app navigation.
    if (state.projectId) {
      if (payloadStr.length > DB_METADATA_AUTOSAVE_LIMIT_BYTES) {
        console.warn(`[StudioStore] Skipping DB autosave for large document payload (${Math.round(payloadStr.length / 1024)} KB). Local state remains available.`);
        return;
      }

      if (dbSaveInFlight) {
        // A save is already in flight. Don't fire a concurrent request that
        // could resolve out of order and overwrite newer data — just mark
        // that another save is needed once the current one finishes.
        dbSaveQueued = true;
        return;
      }

      dbSaveInFlight = true;
      try {
        const formData = new FormData();
        formData.append("projectId", state.projectId);
        formData.append("metadata", payloadStr);
        const result = await updateProjectMetadataWithForm(formData);
        if (result?.success) {
          console.log("[StudioStore] Project persisted to DB successfully.");
        } else {
          console.warn("[StudioStore] DB Persistence skipped or failed:", result?.error);
        }
      } catch (err) {
        console.error("[StudioStore] DB Persistence failed:", err);
      } finally {
        dbSaveInFlight = false;
        if (dbSaveQueued) {
          dbSaveQueued = false;
          // Re-read the freshest state rather than reusing the closure —
          // more edits may have landed while this request was in flight.
          void get().saveProject();
        }
      }
    }
  },

  setTrainingDocuments: (docs) => {
    set((state) => ({ 
      trainingDocuments: docs.map(d => ({
        ...d,
        pages: d.pages.map(p => ({
          ...p,
          metadata: { ...p.metadata, isNew: true, capturedAt: new Date().toISOString() }
        }))
      })),
      activeDocument: state.activeDocument || docs[0],
      activePage: state.activePage || docs[0]?.pages[0]
    }));
    get().saveProject();
  },

  updateTrainingDocument: (docId, updates) => {
    set((state) => ({
      trainingDocuments: state.trainingDocuments.map(doc =>
        doc.documentId === docId ? { ...doc, ...updates } : doc
      ),
      activeDocument: state.activeDocument?.documentId === docId
        ? { ...state.activeDocument, ...updates }
        : state.activeDocument
    }));
    get().saveProject();
  },

  replaceDocumentWithSegments: (docId, segments) => {
    set((state) => {
      const otherDocs = state.trainingDocuments.filter(d => d.documentId !== docId);
      const wasActive = state.activeDocument?.documentId === docId;
      return {
        trainingDocuments: [...otherDocs, ...segments],
        activeDocument: wasActive ? (segments[0] || state.activeDocument) : state.activeDocument,
        activePage: wasActive ? (segments[0]?.pages[0] || state.activePage) : state.activePage,
      };
    });
    get().saveProject();
  },

  addClass: (cls) => {
    set((state) => {
      const exists = state.documentClasses.some(c => c.classId === cls.classId || c.name.toLowerCase() === cls.name.toLowerCase());
      if (exists) return state;
      return {
        documentClasses: [...state.documentClasses, cls]
      };
    });
    get().saveProject();
  },
  
  deleteClass: (id) => {
    set((state) => ({
      documentClasses: state.documentClasses.filter(c => c.classId !== id)
    }));
    get().saveProject();
  },

  updateClassConfig: (id, updates) => {
    set((state) => ({
      documentClasses: state.documentClasses.map(c => c.classId === id ? { ...c, ...updates } : c)
    }));
    get().saveProject();
  },

  recordClassConfidenceSnapshot: (id, snapshot) => {
    const state = get();
    const cls = state.documentClasses.find(c => c.classId === id);
    if (!cls) return;
    const history = cls.confidenceHistory || [];
    const last = history[history.length - 1];
    const roughly = (a: number, b: number) => Math.abs(a - b) < 0.0005;
    if (last && last.count === snapshot.count && roughly(last.overall, snapshot.overall)
      && roughly(last.classification, snapshot.classification) && roughly(last.extraction, snapshot.extraction)) {
      return;
    }
    set((state) => ({
      documentClasses: state.documentClasses.map(c => {
        if (c.classId !== id) return c;
        const history = c.confidenceHistory || [];
        const last = history[history.length - 1];
        const next = last && last.count === snapshot.count
          ? [...history.slice(0, -1), snapshot]
          : [...history, snapshot].slice(-20);
        return { ...c, confidenceHistory: next };
      })
    }));
    get().saveProject();
  },

  updateDocumentClass: (docId, id, method = "manual", modelName = "User Override", ocrEngineName = "Manual Layout Selection") => {
    set((state) => {
      const className = state.documentClasses.find(c => c.classId === id)?.name || "";
      const updatedDocs = state.trainingDocuments.map(doc => 
        doc.documentId === docId 
          ? { 
              ...doc, 
              classification: { 
                classId: id, 
                className, 
                confidence: method === "manual" ? 1.0 : 0.85 + Math.random() * 0.14,
                method,
                modelName,
                ocrEngineName
              } 
            }
          : doc
      );

      return {
        trainingDocuments: updatedDocs,
        activeDocument: (state.activeDocument && state.activeDocument.documentId === docId)
          ? { 
              ...state.activeDocument, 
              classification: { 
                classId: id, 
                className, 
                confidence: method === "manual" ? 1.0 : 0.85 + Math.random() * 0.14,
                method,
                modelName,
                ocrEngineName
              } 
            } as TrainingDocument
          : state.activeDocument
      };
    });
    get().saveProject();
  },

  updatePageClass: (pageId, id, method = "manual", modelName = "User Override", ocrEngineName = "Manual Layout Selection") => {
    set((state) => {
      const className = state.documentClasses.find(c => c.classId === id)?.name || "";
      const updatedDocs = state.trainingDocuments.map(doc => ({
        ...doc,
        pages: doc.pages.map(page => 
          page.pageId === pageId 
            ? { 
                ...page, 
                classification: { 
                  classId: id, 
                  className, 
                  confidence: method === "manual" ? 1.0 : 0.85 + Math.random() * 0.14,
                  method,
                  modelName,
                  ocrEngineName
                } 
              } as TrainingPage
            : page
        )
      }));

      const updatedActivePage = (state.activePage && state.activePage.pageId === pageId)
        ? { 
            ...state.activePage, 
            classification: { 
              classId: id, 
              className, 
              confidence: method === "manual" ? 1.0 : 0.85 + Math.random() * 0.14,
              method,
              modelName,
              ocrEngineName
            } 
          } as TrainingPage
        : state.activePage;

      return {
        trainingDocuments: updatedDocs,
        activePage: updatedActivePage
      };
    });
    get().saveProject();
  },

  splitDocument: (docId, pageIndex) => {
    set((state) => {
      const doc = state.trainingDocuments.find(d => d.documentId === docId);
      if (!doc || pageIndex <= 0 || pageIndex >= doc.pages.length) return state;

      const firstHalfPages = doc.pages.slice(0, pageIndex);
      const secondHalfPages = doc.pages.slice(pageIndex);

      const firstHalf: TrainingDocument = {
        ...doc,
        documentId: Math.random().toString(36).substr(2, 9),
        name: `${doc.name} (Part 1)`,
        pages: firstHalfPages
      };

      const secondHalf: TrainingDocument = {
        ...doc,
        documentId: Math.random().toString(36).substr(2, 9),
        name: `${doc.name} (Part 2)`,
        pages: secondHalfPages
      };

      const otherDocs = state.trainingDocuments.filter(d => d.documentId !== docId);
      
      return {
        trainingDocuments: [...otherDocs, firstHalf, secondHalf],
        activeDocument: firstHalf
      };
    });
    get().saveProject();
  },

  mergeDocuments: (docIds) => {
    set((state) => {
      const docsToMerge = state.trainingDocuments.filter(d => docIds.includes(d.documentId));
      if (docsToMerge.length < 2) return state;

      const allPages = docsToMerge.flatMap(d => d.pages);
      const mergedDoc: TrainingDocument = {
        ...docsToMerge[0],
        documentId: Math.random().toString(36).substr(2, 9),
        name: `Merged Group (${docsToMerge.length} items)`,
        pages: allPages
      };

      const remainingDocs = state.trainingDocuments.filter(d => !docIds.includes(d.documentId));

      return {
        trainingDocuments: [...remainingDocs, mergedDoc],
        activeDocument: mergedDoc
      };
    });
    get().saveProject();
  },

  deletePage: (pageId) => {
    set((state) => {
      const updatedDocs = state.trainingDocuments.map(doc => ({
        ...doc,
        pages: doc.pages.filter(p => p.pageId !== pageId)
      })).filter(doc => doc.pages.length > 0);

      return {
        trainingDocuments: updatedDocs,
        activePage: state.activePage?.pageId === pageId ? undefined : state.activePage,
        activeDocument: updatedDocs.find(d => d.documentId === state.activeDocument?.documentId) || updatedDocs[0]
      };
    });
    get().saveProject();
  },

  updateSegregationSettings: (updates) => {
    set((state) => {
      const nextSettings = { ...state.segregationSettings, ...updates };
      return {
        segregationSettings: nextSettings,
        modelSegregationSettings: {
          ...state.modelSegregationSettings,
          [state.selectedModelId]: nextSettings
        }
      };
    });
    get().saveProject();
  },

  addSegregationRule: (rule) => {
    set((state) => ({
      segregationSettings: {
        ...state.segregationSettings,
        rules: [...state.segregationSettings.rules, rule]
      }
    }));
    get().saveProject();
  },

  addLogicGroup: (group) => {
    set((state) => {
      const nextSettings = {
        ...state.segregationSettings,
        logicGroups: [...state.segregationSettings.logicGroups, group]
      };
      return {
        segregationSettings: nextSettings,
        modelSegregationSettings: {
          ...state.modelSegregationSettings,
          [state.selectedModelId]: nextSettings
        }
      };
    });
    get().saveProject();
  },

  updateLogicGroup: (groupId, updates) => {
    set((state) => {
      const nextSettings = {
        ...state.segregationSettings,
        logicGroups: state.segregationSettings.logicGroups.map(g => 
          g.id === groupId ? { ...g, ...updates } : g
        )
      };
      return {
        segregationSettings: nextSettings,
        modelSegregationSettings: {
          ...state.modelSegregationSettings,
          [state.selectedModelId]: nextSettings
        }
      };
    });
    get().saveProject();
  },

  deleteLogicGroup: (groupId) => {
    set((state) => {
      const nextSettings = {
        ...state.segregationSettings,
        logicGroups: state.segregationSettings.logicGroups.filter(g => g.id !== groupId)
      };
      return {
        segregationSettings: nextSettings,
        modelSegregationSettings: {
          ...state.modelSegregationSettings,
          [state.selectedModelId]: nextSettings
        }
      };
    });
    get().saveProject();
  },

  runAutoSegregation: () => {
    const { trainingDocuments, segregationSettings: settings } = get();
    const allPages = trainingDocuments.flatMap(doc => doc.pages).sort((a, b) => (a.pageNumber || 0) - (b.pageNumber || 0));
    
    if (allPages.length === 0) return;

    // Helper to calculate semantic similarity (MOCK for now, simulating shift)
    const calculateSemanticShift = (current: string, prev?: string) => {
      if (!prev) return 0;
      const cWords = current.split(/\s+/).length;
      const pWords = prev.split(/\s+/).length;
      return Math.min(1, Math.abs(cWords - pWords) / Math.max(cWords, pWords, 1) + 0.1);
    };

    // A helper to evaluate logic for a single page (Enterprise Orchestrator Pattern)
    const evaluatePageEnterprise = (page: any, prevPage?: any, currentSegmentCount: number = 0): PageAnalysis => {
      const normalize = (text: string) => (text || "")
        .replace(/[^\w\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();

      const normalizedOCR = normalize(page.ocrText);
      const prevOCR = prevPage ? normalize(prevPage.ocrText) : "";

      // 1. Classification Phase
      let classResult: ClassificationResult = { documentType: "UNCLASSIFIED", confidence: 0.4, alternativeMatches: [] };
      let matchedBy: string[] = [];
      
      for (const group of settings.logicGroups) {
        if (!group.enabled) continue;
        const hasHeader = group.headerEnabled && group.headerPatterns.some(p => normalizedOCR.includes(normalize(p)));
        const hasFooter = group.footerEnabled && group.footerPatterns.some(p => normalizedOCR.includes(normalize(p)));
        const hasKeyword = group.keywordEnabled && group.keywords.some(k => normalizedOCR.includes(normalize(k.replace(/"/g, ''))));
        const hasPageCount = group.pageCountEnabled && currentSegmentCount >= (group.pageRange?.end || 1);
        
        if (group.operator === "OR") {
          if (hasHeader || hasFooter || hasKeyword || hasPageCount) {
             classResult = { documentType: group.name, confidence: hasHeader ? 0.98 : hasKeyword ? 0.85 : 0.7, alternativeMatches: [] };
             if (hasHeader) matchedBy.push("HEADER");
             if (hasFooter) matchedBy.push("FOOTER");
             if (hasKeyword) matchedBy.push("KEYWORD");
             if (hasPageCount) matchedBy.push("PAGE_COUNT");
             break;
          }
        } else {
          // AND Logic
          const conditions = [
            group.headerEnabled ? hasHeader : true,
            group.footerEnabled ? hasFooter : true,
            group.keywordEnabled ? hasKeyword : true,
            group.pageCountEnabled ? hasPageCount : true
          ];
          const anyEnabled = group.headerEnabled || group.footerEnabled || group.keywordEnabled || group.pageCountEnabled;
          if (anyEnabled && conditions.every(c => c)) {
             classResult = { documentType: group.name, confidence: 0.95, alternativeMatches: [] };
             matchedBy.push("LOGIC_GROUP_CHAIN");
             break;
          }
        }
      }

      // 2. Boundary Phase
      const semanticShift = calculateSemanticShift(normalizedOCR, prevOCR);
      const isForcedSplit = matchedBy.length > 0;
      const layoutShift = page.layoutSignature !== prevPage?.layoutSignature;
      
      const boundary: BoundaryResult = {
        isNewDocument: !prevPage || isForcedSplit || semanticShift > 0.6 || (settings.boundary.useStructuralBoundary && layoutShift),
        confidence: Math.max(semanticShift, isForcedSplit ? 1 : 0),
        reasons: [],
        scores: {
          semanticShift,
          layoutShift: layoutShift ? 0.7 : 0,
          headerMismatch: isForcedSplit ? 1.0 : 0,
          barcodeDetected: (page.barcodeValues?.length || 0) > 0 ? 1.0 : 0
        }
      };
      if (!prevPage) boundary.reasons.push("FIRST_PAGE");
      if (matchedBy.includes("HEADER")) boundary.reasons.push("HEADER_SIGNATURE_MATCH");
      if (matchedBy.includes("FOOTER")) boundary.reasons.push("FOOTER_ANCHOR_DETECTED");
      if (matchedBy.includes("KEYWORD")) boundary.reasons.push("KEYWORD_TRIGGER_MATCH");
      if (matchedBy.includes("PAGE_COUNT")) boundary.reasons.push("FIXED_PAGE_THRESHOLD");
      if (matchedBy.includes("LOGIC_GROUP_CHAIN")) boundary.reasons.push("COMPOSITE_LOGIC_MATCH");
      if (semanticShift > 0.6) boundary.reasons.push("SEMANTIC_CONTEXT_SHIFT");
      if (layoutShift && settings.boundary.useStructuralBoundary) boundary.reasons.push("STRUCTURAL_LAYOUT_CHANGE");

      // 3. Continuity Phase
      const continuity: ContinuityResult = {
        belongsToPrevious: prevPage && !boundary.isNewDocument,
        confidence: 1 - semanticShift,
        matchingFactors: !boundary.isNewDocument ? ["SEMANTIC_CONTINUITY"] : []
      };

      // 4. Confidence Phase
      const overallConfidence = (
        (page.confidence || 0.8) * 0.2 +
        classResult.confidence * 0.3 +
        continuity.confidence * 0.2 +
        (1 - boundary.confidence) * 0.3
      );

      const confidence: ConfidenceResult = {
        overall: overallConfidence,
        status: overallConfidence > 0.85 ? "HIGH" : overallConfidence > 0.65 ? "MEDIUM" : "REVIEW_REQUIRED",
        breakdown: {
          ocr: page.confidence || 0.8,
          classification: classResult.confidence,
          continuity: continuity.confidence,
          boundary: 1 - boundary.confidence
        }
      };

      return {
        pageNumber: page.pageNumber || 0,
        extractedText: page.ocrText || "",
        classification: classResult,
        boundary,
        continuity,
        confidence,
        explainability: boundary.reasons
      };
    };

    const boundaries: { index: number; groupName?: string; method: string; analysis?: PageAnalysis }[] = [];
    let currentSegmentPageCount = 0;
    
    for (let i = 0; i < allPages.length; i++) {
      const page = allPages[i];
      const analysis = evaluatePageEnterprise(page, allPages[i-1], currentSegmentPageCount);
      page.analysis = analysis;

      if (analysis.boundary?.isNewDocument) {
        boundaries.push({
          index: i,
          groupName: analysis.classification?.documentType,
          method: analysis.boundary.reasons.join(", "),
          analysis
        });
        currentSegmentPageCount = 1; // Start new segment count
      } else {
        currentSegmentPageCount++;
      }
    }

    // Reconstruction phase
    const newDocs: TrainingDocument[] = [];
    for (let i = 0; i < boundaries.length; i++) {
      const start = boundaries[i].index;
      const end = i < boundaries.length - 1 ? boundaries[i+1].index : allPages.length;
      const docPages = allPages.slice(start, end);
      const groupName = boundaries[i].groupName || "Unclassified Document";
      
      newDocs.push({
        documentId: Math.random().toString(36).substr(2, 9),
        name: groupName,
        pages: docPages.map((p, idx) => ({
          ...p,
          pageNumber: idx + 1
        })),
        unclassifiedSegment: groupName === "Unclassified Document" ? {
          id: Math.random().toString(36).substr(2, 9),
          pages: docPages.map((_, idx) => idx),
          reason: "NO_MATCH",
          confidenceScore: boundaries[i].analysis?.confidence?.overall || 0,
          requiresHumanReview: true,
          autoRetryEnabled: false,
          createdAt: new Date().toISOString()
        } : undefined,
        classification: {
          classId: groupName,
          className: groupName,
          confidence: boundaries[i].analysis?.confidence?.overall || 0.5
        },
        metadata: {
          splitMethod: boundaries[i].method,
          isAutoSegregated: true,
          enterpriseAnalysis: boundaries[i].analysis,
          capturedAt: new Date().toISOString()
        }
      });
    }

    set({ 
      trainingDocuments: newDocs, 
      activeDocument: newDocs[0],
      activePage: newDocs[0]?.pages[0],
      loading: false 
    });
    get().saveProject();
    
    get().addAuditLog({
      action: "Enterprise Orchestrator Executed",
      target: `${newDocs.length} Documents Created`,
      status: "Success",
      engine: "Forensic Segregation v4",
      compliance: "FULL_AUDIT_TRAIL_GENERATED",
      actor: "System Intelligence",
      rawTimestamp: Date.now()
    });
  },

  setSelectedPageIds: (selectedPageIds) => set({ selectedPageIds }),
  
  deleteTrainingDocument: (docId: string) => {
    set((state) => {
      const updatedDocs = state.trainingDocuments.filter(d => d.documentId !== docId);
      const isActive = state.activeDocument?.documentId === docId;
      
      return {
        trainingDocuments: updatedDocs,
        activeDocument: isActive ? updatedDocs[0] : state.activeDocument,
        activePage: isActive ? updatedDocs[0]?.pages[0] : state.activePage
      };
    });
    get().addAuditLog({
      action: "Asset Purged",
      target: `Document ${docId.slice(0, 8)} removed`,
      status: "Success",
      engine: "System Core",
      compliance: "USER_DIRECTED_DELETION",
      actor: "System Admin",
      rawTimestamp: Date.now()
    });
    get().saveProject();
  },

  mapPagesToGroup: (pageIds, groupId) => {
    set((state) => {
      const group = state.segregationSettings.logicGroups.find(g => g.id === groupId);
      if (!group) return state;

      const allPages = state.trainingDocuments.flatMap(doc => doc.pages);
      const movingPages = allPages.filter(p => pageIds.includes(p.pageId));
      
      // 1. Remove pages from existing docs
      const updatedDocs = state.trainingDocuments.map(doc => ({
        ...doc,
        pages: doc.pages.filter(p => !pageIds.includes(p.pageId))
      })).filter(doc => doc.pages.length > 0);

      // 2. Find or create target doc
      let targetDoc = updatedDocs.find(d => d.name === group.name);
      if (targetDoc) {
        targetDoc.pages.push(...movingPages);
      } else {
        targetDoc = {
          documentId: Math.random().toString(36).substr(2, 9),
          name: group.name,
          pages: movingPages,
          classification: {
            classId: group.id,
            className: group.name,
            confidence: 1.0
          },
          metadata: {
            splitMethod: "Manual Re-assignment",
            capturedAt: new Date().toISOString()
          }
        };
        updatedDocs.push(targetDoc);
      }

      return {
        trainingDocuments: updatedDocs,
        selectedPageIds: [],
        activeDocument: targetDoc
      };
    });
    get().saveProject();
  },

  reorderPages: (docId, pageIds) => {
    set((state) => {
      const updatedDocs = state.trainingDocuments.map(d => {
        if (d.documentId === docId) {
          const orderedPages = pageIds.map(id => d.pages.find(p => p.pageId === id)!).filter(Boolean);
          return { ...d, pages: orderedPages.map((p, i) => ({ ...p, pageNumber: i + 1 })) };
        }
        return d;
      });
      const nextActiveDoc = updatedDocs.find(d => d.documentId === state.activeDocument?.documentId);
      const nextActivePage = nextActiveDoc?.pages.find(p => p.pageId === state.activePage?.pageId);
      
      return { 
        trainingDocuments: updatedDocs,
        activeDocument: nextActiveDoc || state.activeDocument,
        activePage: nextActivePage || state.activePage
      };
    });
    get().saveProject();
  },

  movePages: (sourceDocId, targetDocId, pageIds) => {
    set((state) => {
      const sourceDoc = state.trainingDocuments.find(d => d.documentId === sourceDocId);
      if (!sourceDoc) return state;

      const movingPages = sourceDoc.pages.filter(p => pageIds.includes(p.pageId));
      const remainingPages = sourceDoc.pages.filter(p => !pageIds.includes(p.pageId));

      let updatedDocs = state.trainingDocuments.map(d => {
        if (d.documentId === sourceDocId) return { ...d, pages: remainingPages.map((p, i) => ({ ...p, pageNumber: i + 1 })) };
        return d;
      }).filter(d => d.pages.length > 0);

      let newActiveDoc = state.activeDocument;

      if (targetDocId === "NEW") {
        const newDoc: TrainingDocument = {
          documentId: Math.random().toString(36).substr(2, 9),
          name: "New Group",
          pages: movingPages.map((p, i) => ({ ...p, pageNumber: i + 1 })),
          metadata: { splitMethod: "Manual Move", capturedAt: new Date().toISOString() }
        };
        updatedDocs.push(newDoc);
        newActiveDoc = newDoc;
      } else {
        updatedDocs = updatedDocs.map(d => {
          if (d.documentId === targetDocId) {
             const newPages = [...d.pages, ...movingPages];
             return { ...d, pages: newPages.map((p, i) => ({ ...p, pageNumber: i + 1 })) };
          }
          return d;
        });
        newActiveDoc = updatedDocs.find(d => d.documentId === targetDocId);
      }

      return { 
        trainingDocuments: updatedDocs,
        selectedPageIds: [],
        activeDocument: newActiveDoc
      };
    });
    get().addAuditLog({
      action: "Pages Re-routed",
      target: `${pageIds.length} Pages moved to ${targetDocId}`,
      status: "Success",
      engine: "Manual Orchestrator",
      compliance: "MANUAL_RE_ROUTING_AUTHORIZED",
      actor: "System Admin",
      rawTimestamp: Date.now()
    });
    get().saveProject();
  },

  createManualDocument: (pageIds, name) => {
    set((state) => {
      // 1. EXTRACT MOVING PAGES FROM ALL DOCUMENTS
      let movingPages: TrainingPage[] = [];
      const updatedDocs = state.trainingDocuments.map(doc => {
        const remainingPages = doc.pages.filter(p => !pageIds.includes(p.pageId));
        const found = doc.pages.filter(p => pageIds.includes(p.pageId));
        movingPages = [...movingPages, ...found];
        
        return { 
          ...doc, 
          pages: remainingPages.map((p, i) => ({ ...p, pageNumber: i + 1 })) 
        };
      }).filter(d => d.pages.length > 0);

      if (movingPages.length === 0) return state;

      // 2. CREATE NEW DOCUMENT
      const newDoc: TrainingDocument = {
        documentId: Math.random().toString(36).substr(2, 9),
        name: name || "Manual Document Bundle",
        pages: movingPages.map((p, i) => ({ ...p, pageNumber: i + 1 })),
        metadata: { 
          splitMethod: "Manual Regroup", 
          capturedAt: new Date().toISOString(),
          isManual: true
        }
      };

      // 3. UPDATE STATE
      return {
        trainingDocuments: [...updatedDocs, newDoc],
        selectedPageIds: [],
        activeDocument: newDoc
      };
    });

    get().addAuditLog({
      action: "Manual Regroup",
      target: `${pageIds.length} Pages moved to new group: ${name}`,
      status: "Success",
      engine: "Manual Orchestrator",
      compliance: "MANUAL_RE_GROUPING_AUTHORIZED",
      actor: "System Admin",
      rawTimestamp: Date.now()
    });
    get().saveProject();
  },

  analyzeGroupDifferentiators: (groupId) => {
    const { segregationSettings, trainingDocuments, activeDocument } = get();
    const group = segregationSettings.logicGroups.find(g => g.id === groupId);
    
    // Prioritize active document content for DNA analysis if it exists
    const contextSource = activeDocument ? activeDocument.name.toUpperCase() : (group?.name?.toUpperCase() || "");
    const ocrSource = activeDocument?.pages[0]?.ocrText?.toUpperCase() || "";
    
    let commonAnchors = [
      { text: "DOCUMENT_IDENTIFIER", confidence: 0.92, frequency: 1.0, spatialY: 0.1 }
    ];

    let layoutSignature = "GENERIC_STRUCTURE";

    // Dynamic detection based on either the group name or the actual OCR content of the selected doc
    const isIdentity = contextSource.includes("PASSPORT") || contextSource.includes("IDENTITY") || ocrSource.includes("PASSPORT") || ocrSource.includes("SURNAME");
    const isMedical = contextSource.includes("CLAIM") || contextSource.includes("MEDICAL") || ocrSource.includes("CLAIM") || ocrSource.includes("HEALTH INSURANCE");
    const isFinancial = contextSource.includes("INVOICE") || contextSource.includes("FINANCIAL") || ocrSource.includes("INVOICE") || ocrSource.includes("TOTAL AMOUNT");

    if (isIdentity) {
      commonAnchors = [
        { text: "PASSPORT NUMBER", confidence: 0.98, frequency: 1.0, spatialY: 0.15 },
        { text: "SURNAME", confidence: 0.95, frequency: 1.0, spatialY: 0.25 },
        { text: "EXPIRY DATE", confidence: 0.88, frequency: 0.95, spatialY: 0.82 }
      ];
      layoutSignature = "IDENTITY_CARD_LAYOUT";
    } else if (isMedical) {
      commonAnchors = [
        { text: "POLICY NUMBER", confidence: 0.94, frequency: 1.0, spatialY: 0.22 },
        { text: "DIAGNOSIS CODE", confidence: 0.91, frequency: 0.85, spatialY: 0.45 },
        { text: "CMS-1500", confidence: 0.99, frequency: 1.0, spatialY: 0.05 }
      ];
      layoutSignature = "MULTI_PAGE_CLAIM_FORM";
    } else if (isFinancial) {
      commonAnchors = [
        { text: "TOTAL AMOUNT", confidence: 0.98, frequency: 1.0, spatialY: 0.85 },
        { text: "INVOICE NO", confidence: 0.95, frequency: 0.9, spatialY: 0.12 },
        { text: "VENDOR TAX ID", confidence: 0.88, frequency: 0.75, spatialY: 0.08 }
      ];
      layoutSignature = "FINANCIAL_LEDGER_GRID";
    }

    const insights = {
      commonAnchors,
      layoutSignature,
      differentiatorScore: 0.82 + Math.random() * 0.16
    };

    // Deep merge to ensure reactivity
    set((state) => ({
      groupInsights: {
        ...state.groupInsights,
        [groupId]: { ...insights }
      }
    }));
    get().saveProject();
  },

  promoteInsightToRule: (groupId, insightType, value) => {
    set((state) => {
      const groups = state.segregationSettings.logicGroups.map(g => {
        if (g.id === groupId) {
          if (insightType === "header") {
            return { ...g, headerPatterns: [...new Set([...g.headerPatterns, value])] };
          } else {
            return { ...g, keywords: [...new Set([...g.keywords, value])] };
          }
        }
        return g;
      });

      const nextSettings = {
        ...state.segregationSettings,
        logicGroups: groups
      };

      return {
        segregationSettings: nextSettings,
        modelSegregationSettings: {
          ...state.modelSegregationSettings,
          [state.selectedModelId]: nextSettings
        }
      };
    });
    get().saveProject();
  },

  setActiveDocument: (activeDocument) => set({ 
    activeDocument,
    activePage: activeDocument?.pages?.[0]
  }),
  setActivePage: (activePage) => set({ activePage }),

  addAnnotation: (pageId, annotation) => {
    const fullAnnotation = {
      ...annotation,
      id: annotation.id || crypto.randomUUID(),
      pageId: pageId,
      type: annotation.type || 'field'
    } as Annotation;
    set((state) => {
      const updatedDocs = state.trainingDocuments.map(doc => ({
        ...doc,
        pages: doc.pages.map(page => 
          page.pageId === pageId 
            ? { ...page, annotations: [...page.annotations, fullAnnotation] }
            : page
        )
      }));

      return {
        trainingDocuments: updatedDocs,
        activePage: (state.activePage && state.activePage.pageId === pageId)
          ? { ...state.activePage, annotations: [...state.activePage.annotations, fullAnnotation] } as TrainingPage
          : state.activePage
      };
    });
    get().saveProject();
  },

  updateAnnotation: (pageId, annotation) => {
    set((state) => {
      const updatedDocs = state.trainingDocuments.map(doc => ({
        ...doc,
        pages: doc.pages.map(page => 
          page.pageId === pageId 
            ? { ...page, annotations: page.annotations.map(a => a.id === annotation.id ? annotation : a) }
            : page
        )
      }));

      return {
        trainingDocuments: updatedDocs,
        activePage: (state.activePage && state.activePage.pageId === pageId)
          ? { ...state.activePage, annotations: state.activePage.annotations.map(a => a.id === annotation.id ? annotation : a) } as TrainingPage
          : state.activePage
      };
    });
    get().saveProject();
  },

  deleteAnnotation: (pageId, annotationId) => {
    set((state) => {
      const updatedDocs = state.trainingDocuments.map(doc => ({
        ...doc,
        pages: doc.pages.map(page => 
          page.pageId === pageId 
            ? { ...page, annotations: page.annotations.filter(a => a.id !== annotationId) }
            : page
        )
      }));

      return {
        trainingDocuments: updatedDocs,
        activePage: (state.activePage && state.activePage.pageId === pageId)
          ? { ...state.activePage, annotations: state.activePage.annotations.filter(a => a.id !== annotationId) } as TrainingPage
          : state.activePage
      };
    });
    get().saveProject();
  },

  updateEngineStatus: (engineId, status) => {
    const state = get();
    const engine = state.infrastructure.engines.find(e => e.id === engineId);
    const now = new Date();
    const newLog: AuditLog = {
      id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
      action: status === "active" ? "Engine Activated" : "Engine Deactivated",
      target: `Engine: ${engine?.name || engineId}`,
      status: "Verified",
      engine: "System Orchestrator",
      compliance: `${engine?.status?.toUpperCase() || 'UNKNOWN'} → ${status.toUpperCase()}`,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
      actor: "System Admin",
      rawTimestamp: now.getTime()
    };

    const retentionDays = state.infrastructure.governance.retentionDays || 90;
    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    const newState = {
      infrastructure: {
        ...state.infrastructure,
        engines: state.infrastructure.engines.map(e => e.id === engineId ? { ...e, status } : e),
        transparencyLogs: [newLog, ...(state.infrastructure.transparencyLogs || [])].filter(log => (log.rawTimestamp || 0) > cutoff)
      }
    };
    
    set(newState);
    get().saveProject();
  },

  updateEnginePort: (engineId, port) => {
    const state = get();
    const newState = {
      infrastructure: {
        ...state.infrastructure,
        engines: state.infrastructure.engines.map(e => e.id === engineId ? { ...e, port } : e)
      }
    };
    set(newState);
    get().saveProject();
  },

  syncInfrastructure: () => {
    const state = get();
    const mergedEngines = MOCK_INFRASTRUCTURE.engines.map(mockEngine => {
      const existing = state.infrastructure.engines.find(e => e.id === mockEngine.id);
      if (existing) {
        return { 
          ...existing, 
          isConfigured: mockEngine.isConfigured || existing.isConfigured,
          status: mockEngine.status,
          runtimeType: mockEngine.runtimeType,
          port: existing.port || mockEngine.port,
          version: mockEngine.version
        };
      }
      return mockEngine as OCREngine;
    });

    const newState = {
      infrastructure: {
        ...state.infrastructure,
        engines: mergedEngines,
        gpuInventory: MOCK_INFRASTRUCTURE.gpuInventory,
        benchmarks: MOCK_INFRASTRUCTURE.benchmarks
      }
    };
    
    set(newState);
    get().saveProject();
  },

  toggleModel: (modelId, active) => {
    const state = get();
    const model = state.infrastructure.offlineModels.find(m => m.id === modelId);
    const now = new Date();
    const newLog: AuditLog = {
      id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
      action: active ? "Model Activated" : "Model Deactivated",
      target: `Model: ${model?.name || modelId}`,
      status: "Verified",
      engine: "Offline Orchestrator",
      compliance: `${model?.isActive ? 'ACTIVE' : 'INACTIVE'} → ${active ? 'ACTIVE' : 'INACTIVE'}`,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
      actor: "System Admin",
      rawTimestamp: now.getTime()
    };

    const retentionDays = state.infrastructure.governance.retentionDays || 90;
    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    const newState = {
      infrastructure: {
        ...state.infrastructure,
        offlineModels: state.infrastructure.offlineModels.map(m => m.id === modelId ? { ...m, isActive: active } : m),
        transparencyLogs: [
          { ...newLog, rawTimestamp: now.getTime() }, 
          ...(state.infrastructure.transparencyLogs || [])
        ].filter(log => (log.rawTimestamp || 0) > cutoff)
      }
    };
    
    set(newState);
    get().saveProject();
  },

  saveRoutingPolicy: (policy) => {
    set((state) => {
      const exists = state.infrastructure.policies.find(p => p.id === policy.id);
      const newPolicies = exists 
        ? state.infrastructure.policies.map(p => p.id === policy.id ? policy : p)
        : [...state.infrastructure.policies, policy];
        
      const now = new Date();
      let action = exists ? "Routing Policy Modified" : "Routing Policy Created";
      let compliance = exists 
        ? `Modified → ${policy.primaryEngineId}`
        : `Created → ${policy.primaryEngineId}`;

      if (exists && exists.isEnabled !== policy.isEnabled) {
        action = policy.isEnabled ? "Routing Policy Enabled" : "Routing Policy Disabled";
        compliance = policy.isEnabled ? "SERVICE_RESTORED" : "TRAFFIC_SUSPENDED";
      }

      const newLog: AuditLog = {
        id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
        action,
        target: `Policy: ${policy.name}`,
        status: "Verified",
        engine: "Policy Orchestrator",
        compliance,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
        actor: "System Admin",
        rawTimestamp: now.getTime()
      };

      const retentionDays = state.infrastructure.governance.retentionDays || 90;
      const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      return {
        infrastructure: {
          ...state.infrastructure,
          policies: newPolicies,
          transparencyLogs: [
            { ...newLog, rawTimestamp: now.getTime() }, 
            ...(state.infrastructure.transparencyLogs || [])
          ].filter(log => (log.rawTimestamp || 0) > cutoff)
        }
      };
    });
    get().saveProject();
  },

  batchSaveRoutingPolicies: (policies) => {
    set((state) => {
      let currentPolicies = [...state.infrastructure.policies];
      let currentLogs = [...(state.infrastructure.transparencyLogs || [])];
      const now = new Date();
      const retentionDays = state.infrastructure.governance.retentionDays || 90;
      const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      policies.forEach(policy => {
        const exists = currentPolicies.find(p => p.id === policy.id);
        if (exists) {
          currentPolicies = currentPolicies.map(p => p.id === policy.id ? policy : p);
        } else {
          currentPolicies.push(policy);
        }

        const newLog: AuditLog = {
          id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
          action: "Policy Batch Provisioned",
          target: `Policy: ${policy.name}`,
          status: "Verified",
          engine: "Policy Orchestrator",
          compliance: `Provisioned → ${policy.primaryEngineId}`,
          timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
          actor: "System Admin",
          rawTimestamp: now.getTime()
        };
        currentLogs.unshift(newLog);
      });

      return {
        infrastructure: {
          ...state.infrastructure,
          policies: currentPolicies,
          transparencyLogs: currentLogs.filter(log => (log.rawTimestamp || 0) > cutoff)
        }
      };
    });
    get().saveProject();
  },

  deleteRoutingPolicy: (policyId) => {
    set((state) => {
      const policy = state.infrastructure.policies.find(p => p.id === policyId);
      const now = new Date();
      const newLog: AuditLog = {
        id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
        action: "Routing Policy Deleted",
        target: `Policy: ${policy?.name || policyId}`,
        status: "Verified",
        engine: "Policy Orchestrator",
        compliance: "DELETED",
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
        actor: "System Admin",
        rawTimestamp: now.getTime()
      };

      const retentionDays = state.infrastructure.governance.retentionDays || 90;
      const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      return {
        infrastructure: {
          ...state.infrastructure,
          policies: state.infrastructure.policies.filter(p => p.id !== policyId),
          transparencyLogs: [
            newLog, 
            ...(state.infrastructure.transparencyLogs || [])
          ].filter(log => (log.rawTimestamp || 0) > cutoff)
        }
      };
    });
    get().saveProject();
  },

  executeBenchmark: (engineId) => {
    set((state) => {
      const engine = state.infrastructure.engines.find(e => e.id === engineId);
      if (!engine) return state;

      const baseAccuracy = engine.accuracyScore || 0.90;
      const baseLatency = engine.latencyScore || 0.5;
      
      const result: BenchmarkResult = {
        id: Math.random().toString(36).substr(2, 9),
        engineId,
        timestamp: new Date().toISOString(),
        accuracy: baseAccuracy - 0.02 + Math.random() * 0.04,
        latency: baseLatency * (0.9 + Math.random() * 0.2),
        memoryUsage: engine.memoryRequirement || "2.4GB",
        gpuUsage: engine.isGpuSupported ? (40 + Math.random() * 30) : 0,
        confidenceScore: (baseAccuracy + 0.02) * (0.95 + Math.random() * 0.05)
      };

      return {
        infrastructure: {
          ...state.infrastructure,
          engines: state.infrastructure.engines.map(e => e.id === engineId ? { 
            ...e, 
            accuracyScore: result.accuracy, 
            latencyScore: result.latency,
            isConfigured: true 
          } : e),
          benchmarks: [result, ...(state.infrastructure.benchmarks || [])].slice(0, 50)
        }
      };
    });
    get().addAuditLog({
      action: "Benchmark Executed",
      target: `Engine: ${engineId}`,
      status: "Verified",
      engine: "Validation Guard",
      compliance: "PERFORMANCE_SYNCED",
      actor: "System Admin",
      rawTimestamp: Date.now()
    });
    get().saveProject();
  },

  runAllBenchmarks: async () => {
    const state = get();
    const activeEngines = state.infrastructure.engines.filter(e => e.status === "active");
    
    for (const engine of activeEngines) {
      get().executeBenchmark(engine.id);
      // Small delay to simulate processing and avoid log timestamp collisions
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  },

  configureEngine: (engineId) => {
    set((state) => {
      const engine = state.infrastructure.engines.find(e => e.id === engineId);
      const now = new Date();
      const newLog: AuditLog = {
        id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
        action: "Engine Configured",
        target: `Engine: ${engine?.name || engineId}`,
        status: "Authorized",
        engine: "System Orchestrator",
        compliance: "CONFIG_LOCKED",
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
        actor: "System Admin",
        rawTimestamp: now.getTime()
      };

      return {
        infrastructure: {
          ...state.infrastructure,
          engines: state.infrastructure.engines.map(e => e.id === engineId ? { ...e, isConfigured: true } : e),
          transparencyLogs: [newLog, ...(state.infrastructure.transparencyLogs || [])]
        }
      };
    });
    get().saveProject();
  },

  updateGovernance: (updates) => {
    set((state) => {
      const changeKey = Object.keys(updates)[0] as keyof GovernanceSettings;
      const oldVal = state.infrastructure.governance[changeKey];
      const newVal = updates[changeKey];
      const now = new Date();
      
      const formatVal = (v: any) => {
        if (Array.isArray(v)) return `${v.length} items`;
        if (typeof v === 'boolean') return v ? 'ENABLED' : 'DISABLED';
        return String(v).toUpperCase();
      };

      const newLog: AuditLog = {
        id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
        action: "Policy Update",
        target: `Governance: ${changeKey}`,
        status: "Enforced",
        engine: "Infrastructure Guard",
        compliance: `${formatVal(oldVal)} → ${formatVal(newVal)}`,
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
        actor: "System Admin",
        rawTimestamp: now.getTime()
      };

      return {
        infrastructure: {
          ...state.infrastructure,
          governance: {
            ...state.infrastructure.governance,
            ...updates
          },
          transparencyLogs: [newLog, ...(state.infrastructure.transparencyLogs || [])]
        }
      };
    });
    get().saveProject();
  },

  toggleLanguage: (language: string) => {
    set((state) => {
      const currentLangs = state.infrastructure.governance.enabledLanguages || [];
      const isEnabled = currentLangs.includes(language);
      
      const newLangs = isEnabled 
        ? currentLangs.filter(l => l !== language)
        : [...currentLangs, language];

      const now = new Date();
      const newLog: AuditLog = {
        id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
        action: isEnabled ? "Language Disabled" : "Language Enabled",
        target: `Locale: ${language}`,
        status: "Authorized",
        engine: "Linguistic Guard",
        compliance: isEnabled ? "LOCALIZATION_REVOKED" : "LOCALIZATION_PROVISIONED",
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
        actor: "System Admin",
        rawTimestamp: now.getTime()
      };

      const retentionDays = state.infrastructure.governance.retentionDays || 90;
      const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

      return {
        infrastructure: {
          ...state.infrastructure,
          governance: {
            ...state.infrastructure.governance,
            enabledLanguages: newLangs
          },
          transparencyLogs: [
            { ...newLog, rawTimestamp: now.getTime() }, 
            ...(state.infrastructure.transparencyLogs || [])
          ].filter(log => (log.rawTimestamp || 0) > cutoff)
        }
      };
    });
    get().saveProject();
  },

  setPrimaryEngine: (engineId: string) => {
    set((state) => {
      const engine = state.infrastructure.engines.find(e => e.id === engineId);
      const now = new Date();
      const newLog: AuditLog = {
        id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
        action: "Primary Engine Updated",
        target: `Active: ${engine?.name || engineId}`,
        status: "Verified",
        engine: "Policy Orchestrator",
        compliance: "ORCHESTRATION_SYNCED",
        timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
        actor: "System Admin",
        rawTimestamp: now.getTime()
      };

      return {
        infrastructure: {
          ...state.infrastructure,
          primaryEngineId: engineId,
          transparencyLogs: [newLog, ...(state.infrastructure.transparencyLogs || [])]
        }
      };
    });
    get().saveProject();
  },

  saveState: async () => {
    await get().saveProject();
    console.log("Studio state persisted successfully.");
  },

  loadState: async () => {
    const state = get();
    const projectId = state.projectId || 'default';

    // If documents are already live in memory for this project, don't overwrite
    // them with (possibly pruned or stale) localStorage data. The in-memory state
    // is always the authoritative source for an active session.
    if (state.trainingDocuments && state.trainingDocuments.length > 0) {
      return;
    }

    let raw = localStorage.getItem(`studio_state_${projectId}`);
    let data: any = null;

    if (raw) {
      try {
        data = JSON.parse(raw);
        if ((!data.trainingDocuments || data.trainingDocuments.length === 0) && state.projectId) {
          console.warn("[StudioStore] Local state is pruned. Attempting to fetch full metadata from DB...");
          const dbMetadata = await getProjectMetadata(state.projectId);
          if (dbMetadata) {
            const parsedDb = JSON.parse(dbMetadata);
            // Merge DB training documents with local state, preferring DB if local is missing
            if (parsedDb.trainingDocuments && parsedDb.trainingDocuments.length > 0) {
              data = parsedDb;
              console.log("[StudioStore] Successfully hydrated full metadata from DB.");
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse local studio state:", e);
      }
    } else if (state.projectId) {
      console.warn("[StudioStore] No local studio state found. Fetching from DB...");
      const dbMetadata = await getProjectMetadata(state.projectId);
      if (dbMetadata) {
        try {
          data = JSON.parse(dbMetadata);
          console.log("[StudioStore] Successfully loaded state from DB.");
        } catch (e) {
          console.error("Failed to parse DB metadata:", e);
        }
      }
    }

    if (!data) {
      console.log(`[StudioStore] No state found for project ${projectId}. Initializing clean project-specific state.`);
      set({
        trainingDocuments: [],
        documentClasses: [],
        segregationSettings: JSON.parse(JSON.stringify(DEFAULT_SEGREGATION_SETTINGS)),
        modelSegregationSettings: {
          "passport-global-v1": JSON.parse(JSON.stringify(DEFAULT_SEGREGATION_SETTINGS))
        },
        selectedModelId: "passport-global-v1",
        groupInsights: {},
        infrastructure: JSON.parse(JSON.stringify(DEFAULT_INFRASTRUCTURE)),
        ingestionSources: [],
        ingestionBatches: [],
        activeDocument: undefined,
        activePage: undefined
      });
      return;
    }

    try {
      const selectedModelId = data.selectedModelId || "passport-global-v1";
      const modelSegregationSettings = data.modelSegregationSettings || {
        [selectedModelId]: data.segregationSettings || JSON.parse(JSON.stringify(DEFAULT_SEGREGATION_SETTINGS))
      };
      const activeSegregationSettings = modelSegregationSettings[selectedModelId] || JSON.parse(JSON.stringify(DEFAULT_SEGREGATION_SETTINGS));

      set({
        trainingDocuments: data.trainingDocuments || [],
        documentClasses: data.documentClasses ? 
          data.documentClasses.filter((cls, index, self) => 
            self.findIndex(c => c.classId === cls.classId || c.name.toLowerCase() === cls.name.toLowerCase()) === index
          ) : [],
        selectedModelId,
        modelSegregationSettings,
        segregationSettings: activeSegregationSettings,
        groupInsights: data.groupInsights || {},
        infrastructure: data.infrastructure ? {
          ...data.infrastructure,
          benchmarks: data.infrastructure.benchmarks || [],
          governance: data.infrastructure.governance ? {
            ...data.infrastructure.governance,
            enabledLanguages: (data.infrastructure.governance.enabledLanguages && data.infrastructure.governance.enabledLanguages.length > 0)
              ? data.infrastructure.governance.enabledLanguages 
              : MOCK_INFRASTRUCTURE.governance.enabledLanguages
          } : MOCK_INFRASTRUCTURE.governance,
          transparencyLogs: data.infrastructure.transparencyLogs || []
        } : state.infrastructure,
        ingestionSources: data.ingestionSources || [],
        ingestionBatches: data.ingestionBatches || [],
        activeDocument: data.trainingDocuments?.[0],
        activePage: data.trainingDocuments?.[0]?.pages?.[0]
      });
      console.log("Studio state hydrated successfully.");
      get().syncInfrastructure();
    } catch (e) {
      console.error("Failed to hydrate studio state:", e);
    }
  },

  clearAllState: () => {
    set({ 
      trainingDocuments: [], 
      documentClasses: [], 
      activeDocument: undefined, 
      activePage: undefined,
      groupInsights: {},
      selectedPageIds: []
    });
    localStorage.removeItem(`studio_state_default`);
  },

  exportProject: () => {
    const state = get();
    const project: DocumentReaderProject = {
      id: state.projectId || Math.random().toString(36).substr(2, 9),
      name: "Exported Project",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      trainingDocuments: state.trainingDocuments,
      documentClasses: state.documentClasses,
      segregationSettings: state.segregationSettings,
      groupInsights: state.groupInsights
    };

    const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `doc_reader_project_${project.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  },

  importProject: (project) => {
    set({
      projectId: project.id,
      trainingDocuments: project.trainingDocuments,
      documentClasses: project.documentClasses,
      segregationSettings: project.segregationSettings,
      groupInsights: project.groupInsights,
      activeDocument: project.trainingDocuments[0],
      activePage: project.trainingDocuments[0]?.pages[0]
    });
    get().saveProject();
  },

  addAuditLog: (log) => {
    const state = get();
    const now = new Date();
    const retentionDays = state.infrastructure.governance.retentionDays || 90;
    const cutoff = Date.now() - (retentionDays * 24 * 60 * 60 * 1000);

    const newLog: AuditLog = {
      ...log,
      id: `AUDIT-${Math.floor(Math.random() * 100000)}`,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }),
      actor: (log as any).actor || "System Admin",
      rawTimestamp: (log as any).rawTimestamp || now.getTime()
    };
    
    const newState = {
      infrastructure: {
        ...state.infrastructure,
        transparencyLogs: [
          newLog, 
          ...(state.infrastructure.transparencyLogs || [])
        ].filter(log => (log.rawTimestamp || 0) > cutoff)
      }
    };
    
    set(newState);
    get().saveProject();
  },

  executeOCR: async () => {
    const state = get();
    const { trainingDocuments, infrastructure } = state;
    const engineId = infrastructure.primaryEngineId;
    
    if (!engineId || trainingDocuments.length === 0) return;

    set({ loading: true, ocrProgress: 0 });
    
    try {
      const updatedDocs = [...trainingDocuments];
      const totalPages = updatedDocs.reduce((acc, doc) => acc + doc.pages.length, 0);
      let processedPages = 0;
      
      for (let i = 0; i < updatedDocs.length; i++) {
        const doc = { ...updatedDocs[i] };
        


        const updatedPages = [...doc.pages].sort((a, b) => a.pageNumber - b.pageNumber);
        
        for (let j = 0; j < updatedPages.length; j++) {
          const page = updatedPages[j];
          const currentEngine = infrastructure.engines.find(e => e.id === engineId);
          const processedPage = await OCREngineService.processPage(page as any, engineId, currentEngine?.port);
          
          processedPages++;
          set({ ocrProgress: Math.round((processedPages / totalPages) * 100) });
          
          updatedPages[j] = {
            ...processedPage,
            ocrText: processedPage.ocrText || (processedPage.textLayer || []).map(w => w.text).join(" ")
          };
          console.log(`[PIPELINE] Page ${j} processed using ${engineId}. Confidence: ${updatedPages[j].confidence}`);
        }
        
        updatedDocs[i] = {
          ...doc,
          pages: [...updatedPages]
        };
      }
      
      set((state) => {
        const updatedActiveDoc = updatedDocs.find(d => d.documentId === state.activeDocument?.documentId);
        const updatedActivePage = updatedActiveDoc?.pages.find(p => p.pageId === state.activePage?.pageId);
        
        return {
          trainingDocuments: updatedDocs,
          activeDocument: updatedActiveDoc || state.activeDocument,
          activePage: updatedActivePage || state.activePage,
          loading: false,
          ocrProgress: 100
        };
      });
      get().addAuditLog({
        action: "OCR Pipeline Executed",
        target: `${updatedDocs.length} Documents`,
        status: "Success",
        engine: infrastructure.engines.find(e => e.id === engineId)?.name || engineId,
        compliance: "DATA_CAPTURED",
        actor: "System Admin",
        rawTimestamp: Date.now()
      });
      get().saveProject();
    } catch (error) {
      console.error("OCR Pipeline failed:", error);
      set({ loading: false });
    }
  },

  clearDocuments: () => set({ trainingDocuments: [], activeDocument: undefined, activePage: undefined })
}));
