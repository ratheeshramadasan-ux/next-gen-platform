export enum TrainingStage {
  INFRASTRUCTURE = "infrastructure",
  DOCUMENT_UPLOAD = "document_upload",
  OCR_CONFIGURATION = "ocr_configuration",
  PAGE_SEGREGATION = "page_segregation",
  CLASSIFICATION = "classification",
  DOCUMENT_TYPE_RESOLUTION = "document_type_resolution",

  EXTRACTION = "extraction",
  VALIDATION = "validation",
  TRAINING_REVIEW = "training_review",
  PUBLISH = "publish",
  EXPORT = "export"
}

export type StepStatus = "not_started" | "in_progress" | "completed" | "blocked" | "needs_review";

export interface WorkflowStep {
  id: TrainingStage;
  label: string;
  description: string;
  status: StepStatus;
  isLocked: boolean;
}

export interface DocumentField {
  id: string;
  name: string;
  type: string;
  required: boolean;
}

export type SupportedDocumentType = "pdf" | "tiff" | "png" | "jpg" | "jpeg" | "bmp";

export interface OCRWord {
  id: string;
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type AnnotationType = 
  | "bounding-box" 
  | "polygon" 
  | "table" 
  | "anchor" 
  | "key-value" 
  | "signature" 
  | "checkbox" 
  | "repeating-section" 
  | "conditional-region";

export interface Annotation {
  id: string;
  type: AnnotationType;
  pageId: string;
  fieldId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: number[];
  label?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface ExtractionField {
  id: string;
  name: string;
  type: "text" | "date" | "number" | "amount" | "address" | "table";
  required: boolean;
  confidence?: number;
  value?: string;
}

export interface DocumentSegment {
  id: string;
  pageIndices: number[];
  label: string;
}

export interface TrainingPage extends PageMetadata {
  annotations: Annotation[];
  ocrText?: string;
  analysis?: PageAnalysis;
  classification?: {
    classId: string;
    className: string;
    confidence: number;
    method?: "manual" | "system";
    modelName?: string;
    ocrEngineName?: string;
  };
}

export interface TrainingDocument {
  documentId: string;
  name: string;
  pages: TrainingPage[];
  classification?: {
    classId: string;
    className: string;
    confidence: number;
    method?: "manual" | "system";
    modelName?: string;
    ocrEngineName?: string;
  };
  segmentation?: {
    segments: DocumentSegment[];
  };
  extraction?: {
    fields: ExtractionField[];
    annotations: Annotation[];
  };
  unclassifiedSegment?: UnclassifiedSegment;
  metadata?: Record<string, any>;
}

export interface DocumentClass {
  classId: string;
  name: string;
  description: string;
  sampleCount: number;
  minConfidence: number;
  requiredFields: string[];
  optionalFields: string[];
  keywords: string[];
  anchorPhrases: string[];
  layoutPatterns: string[];
  isActive: boolean;
  color: string;
  /** Snapshots of this class's average training confidence, recorded each time
   *  its enabled-document count changes — lets the UI show whether confidence
   *  is improving or degrading as more documents are trained. */
  confidenceHistory?: { count: number; overall: number; classification: number; extraction: number }[];
}

export interface PageMetadata {
  pageId: string;
  pageNumber: number;
  imageHash?: string;
  imageUrl: string;
  ocrText?: string;
  textLayer?: OCRWord[];
  headers?: string[];
  footers?: string[];
  keywords?: string[];
  barcodeValues?: string[];
  qrValues?: string[];
  isBlank?: boolean;
  confidence: number;
  layoutSignature?: string;
  width?: number;
  height?: number;
  detectedLanguage?: string;
  semanticDocumentType?: string;
  tablesDetected?: boolean;
  signaturesDetected?: boolean;
  forensicInsights?: Array<{ type: string; detail: string }>;
  metadata?: Record<string, any>;
}
// Enterprise Segregation Architecture Core Types
export interface PageAnalysis {
  pageNumber: number;
  imagePath?: string;
  extractedText: string;
  classification?: ClassificationResult;
  boundary?: BoundaryResult;
  continuity?: ContinuityResult;
  confidence?: ConfidenceResult;
  preprocessing?: PreprocessingResult;
  explainability?: string[];
  metadata?: any;
}

export interface BoundaryResult {
  isNewDocument: boolean;
  confidence: number;
  reasons: string[];
  scores: {
    semanticShift: number;
    layoutShift: number;
    headerMismatch: number;
    barcodeDetected: number;
  };
}

export interface ClassificationResult {
  documentType: string;
  confidence: number;
  alternativeMatches: {
    type: string;
    confidence: number;
  }[];
}

export interface ContinuityResult {
  belongsToPrevious: boolean;
  confidence: number;
  matchingFactors: string[];
}

export interface ConfidenceResult {
  overall: number;
  status: "HIGH" | "MEDIUM" | "LOW" | "REVIEW_REQUIRED";
  breakdown: {
    ocr: number;
    classification: number;
    continuity: number;
    boundary: number;
  };
}

export interface PreprocessingResult {
  processedImage?: string;
  dpi: number;
  cleaned: boolean;
}


export interface ClassifiedPage extends PageMetadata {
  index: number;
  sourceType: SupportedDocumentType;
  classId: string | null;
  isConfirmed: boolean;
  suggestedClassId?: string;
  textLayer?: OCRWord[];
  correctionHistory: { timestamp: string; from: string | null; to: string }[];
}

export interface TrainingBatch {
  id: string;
  name: string;
  status: "DRAFT" | "READY" | "TRAINING" | "COMPLETED";
  docCount: number;
  pageCount: number;
  uploadedAt: string;
  pages: ClassifiedPage[];
}

// Enterprise Segregation Engine Types
export interface BoundaryDetectionProperties {
  enabled: boolean;
  confidenceThreshold: number;
  allowMultiDocumentBundles: boolean;
  minimumPagesPerDocument: number;
  maximumPagesPerDocument: number;
  useOCRSimilarity: boolean;
  similarityThreshold: number;
  useHeaderMatching: boolean;
  useFooterMatching: boolean;
  useSemanticClassification: boolean;
  useStructuralBoundary: boolean;
  useBarcodeBoundary: boolean;
  useKeywordBoundary: boolean;
  usePageCountBoundary: boolean;
  mergeSmallDocuments: boolean;
  preserveOriginalOrder: boolean;
}

export interface PageContinuityProperties {
  enabled: boolean;
  useTextSimilarity: boolean;
  similarityThreshold: number;
  useTableContinuation: boolean;
  useHeaderContinuation: boolean;
  useFooterContinuation: boolean;
  useSemanticGrouping: boolean;
  allowMissingPages: boolean;
  maxGapPages: number;
}

export interface SeparatorDetectionProperties {
  enabled: boolean;
  barcodeEnabled: boolean;
  qrEnabled: boolean;
  separatorKeywords: string[];
  colorPageDetection: boolean;
  blankSeparatorDetection: boolean;
  separatorConfidence: number;
}

export interface BlankPageProperties {
  enabled: boolean;
  pixelThreshold: number;
  textThreshold: number;
  removeNoise: boolean;
  autoDeskew: boolean;
  autoDespeckle: boolean;
  preserveSeparatorPages: boolean;
  minimumInkCoverage: number;
}

export interface HeaderGroup {
  id: string;
  name: string;
  patterns: string[];
}

export interface HeaderDetectionProperties {
  enabled: boolean;
  topRegionPercentage: number;
  minimumOccurrences: number;
  fuzzyMatching: boolean;
  ignorePageNumbers: boolean;
  multipleHeaderGroups: boolean;
  normalizeWhitespace: boolean;
  useAIHeaderDetection: boolean;
  groups: HeaderGroup[];
}

export interface FooterGroup {
  id: string;
  name: string;
  patterns: string[];
}

export interface FooterDetectionProperties {
  enabled: boolean;
  bottomRegionPercentage: number;
  minimumOccurrences: number;
  fuzzyMatching: boolean;
  detectPageNumbers: boolean;
  normalizeWhitespace: boolean;
  multipleFooterGroups: boolean;
  groups: FooterGroup[];
}

export interface KeywordSegregationProperties {
  enabled: boolean;
  keywords: string[];
  matchType: "exact" | "contains" | "regex";
  caseSensitive: boolean;
  semanticSimilarity: boolean;
  confidenceThreshold: number;
  splitOnMatch: boolean;
  mergeOnMatch: boolean;
}

export interface FixedPageSplitProperties {
  enabled: boolean;
  pagesPerDocument: number;
  startPage?: number;
  endPage?: number;
  preserveLastPartialDocument: boolean;
  resetOnSeparatorPage: boolean;
}

export interface UnclassifiedProperties {
  enabled: boolean;
  confidenceThreshold: number;
  allowPartialClassification: boolean;
  stopPipelineProcessing: boolean;
  autoAssignReviewQueue: boolean;
  reviewQueueName?: string;
  retryWithAdvancedOCR: boolean;
  retryWithAIClassification: boolean;
  allowManualReclassification: boolean;
  includeInTrainingDataset: boolean;
  autoEscalateAfterHours: number;
  preserveOriginalDocument: boolean;
  mergeAdjacentUnclassifiedPages: boolean;
}

export interface RuleCondition {
  type:
    | "HEADER_MATCH"
    | "FOOTER_MATCH"
    | "KEYWORD_MATCH"
    | "BARCODE_MATCH"
    | "BLANK_PAGE"
    | "SEMANTIC_MATCH"
    | "PAGE_COUNT";
  expectedValue?: any;
  confidence?: number;
}

export interface SegregationRule {
  id: string;
  name: string;
  enabled: boolean;
  operator: "AND" | "OR";
  conditions: RuleCondition[];
  action: "SPLIT" | "MERGE" | "IGNORE";
}

export interface SegregationLogicGroup {
  id: string;
  name: string;
  enabled: boolean;
  headerPatterns: string[];
  headerEnabled: boolean;
  footerPatterns: string[];
  footerEnabled: boolean;
  keywords: string[];
  keywordEnabled: boolean;
  barcodePatterns: string[];
  pageRange?: { start: number; end: number };
  pageCountEnabled: boolean;
  operator: "AND" | "OR";
  confidenceThreshold: number;
  color: string;
}

export interface SegregationSettings {
  boundary: BoundaryDetectionProperties;
  continuity: PageContinuityProperties;
  separator: SeparatorDetectionProperties;
  blank: BlankPageProperties;
  header: HeaderDetectionProperties;
  footer: FooterDetectionProperties;
  keyword: KeywordSegregationProperties;
  pageCount: FixedPageSplitProperties;
  unclassified: UnclassifiedProperties;
  rules: SegregationRule[];
  logicGroups: SegregationLogicGroup[];
}

export interface DocumentReaderProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  trainingDocuments: TrainingDocument[];
  documentClasses: DocumentClass[];
  segregationSettings: SegregationSettings;
  groupInsights: Record<string, {
    commonAnchors: { text: string; confidence: number; frequency: number; spatialY: number }[];
    layoutSignature: string;
    differentiatorScore: number;
  }>;
  metadata?: Record<string, any>;
}

export interface UnclassifiedSegment {
  id: string;
  pages: number[];
  reason:
    | "LOW_CONFIDENCE"
    | "NO_MATCH"
    | "MULTIPLE_MATCH"
    | "OCR_FAILURE"
    | "UNKNOWN_LAYOUT"
    | "MANUAL_REJECTION";
  confidenceScore: number;
  requiresHumanReview: boolean;
  autoRetryEnabled: boolean;
  createdAt: string;
}

export interface DocReaderState {
  activeStage: TrainingStage;
  projectId: string | null;
  folderId: string | null;
  tenantId: string | null;
  customerId: string | null;
  steps: Record<TrainingStage, WorkflowStep>;
  fields: DocumentField[];
  batches: TrainingBatch[];
  classes: DocumentClass[];
  segregationSettings: SegregationSettings;
}

// Extraction Infrastructure Interfaces
export enum SupportLevel {
  AVAILABLE = "available",
  PARTIAL = "partial",
  UNSUPPORTED = "unsupported",
  EXPERIMENTAL = "experimental",
  PLUGIN_REQUIRED = "plugin_required",
  GPU_REQUIRED = "gpu_required"
}

export interface OCREngine {
  id: string;
  name: string;
  provider: string;
  version: string;
  runtimeType: "cloud" | "offline" | "hybrid";
  deploymentMode: "saas" | "on-prem" | "edge";
  isGpuSupported: boolean;
  isOfflineSupported: boolean;
  status: "active" | "inactive" | "maintenance" | "pending";
  healthStatus: "healthy" | "degraded" | "critical";
  accuracyScore: number | null;
  latencyScore: number | null;
  memoryRequirement: string;
  supportedLanguages: string[];
  capabilities: Record<string, SupportLevel>;
  licenseType: "enterprise" | "open-source" | "trial";
  gpuMemoryRequirement?: string;
  helpUrl?: string;
  description?: string;
  deployedUrl?: string;
  isConfigured: boolean;
  port?: number;
}

export interface OfflineModel {
  id: string;
  engineId: string;
  name: string;
  version: string;
  format: "ONNX" | "PyTorch" | "TensorFlow" | "HuggingFace" | "GGUF" | "PaddlePaddle" | "Cloud-Managed";
  size: string;
  isActive: boolean;
  validationStatus: "valid" | "pending" | "failed";
  lastValidated: string;
  checksum: string;
  benchmarkScore?: number;
  description?: string;
  helpUrl?: string;
}

export interface RuntimeProfile {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  config: {
    engineId: string;
    thresholds: Record<string, number>;
    useGpu: boolean;
    useCaching: boolean;
    pipeline: string[];
  };
}

export interface RoutingPolicy {
  id: string;
  name: string;
  documentType: string;
  priority: number;
  isEnabled: boolean;
  primaryEngineId: string;
  failoverEngineId: string | null;
  threshold: number;
  isFailoverEnabled: boolean;
}

export interface GPUStatus {
  id: string;
  name: string;
  vramTotal: string;
  vramUsed: string;
  usagePercent: number;
  temperature: number;
  cudaVersion: string;
  activePipelines: number;
  status: "online" | "offline" | "maintenance";
  powerUsage: string;
  fanSpeed: string;
  clockSpeed: string;
}

export interface BenchmarkResult {
  id: string;
  engineId: string;
  timestamp: string;
  accuracy: number;
  latency: number;
  memoryUsage: string;
  gpuUsage?: number;
  confidenceScore: number;
}

export interface PiiPattern {
  id: string;
  name: string;
  pattern: string;
  enabled: boolean;
}

export interface GovernanceSettings {
  piiEntities: string[];
  handlingMode: "redact" | "mask" | "hash";
  customPatterns: PiiPattern[];
  retentionDays: number;
  dataResidency: string;
  auditLevel: "standard" | "enhanced" | "forensic";
  isImmutableLogEnabled: boolean;
  enabledLanguages: string[];
}

export interface AuditLog {
  id: string;
  action: string;
  target: string;
  status: string;
  engine: string;
  compliance: string;
  timestamp: string;
  date: string;
  actor: string;
  rawTimestamp: number;
}

export interface ExtractionInfrastructure {
  engines: OCREngine[];
  offlineModels: OfflineModel[];
  profiles: RuntimeProfile[];
  policies: RoutingPolicy[];
  gpuInventory: GPUStatus[];
  benchmarks: BenchmarkResult[];
  governance: GovernanceSettings;
  primaryEngineId: string;
  transparencyLogs: AuditLog[];
}

// --- ENTERPRISE INGESTION ARCHITECTURE ---

export type IngestionSourceType = 
  | "UPLOAD" 
  | "EMAIL" 
  | "S3" 
  | "AZURE"
  | "SFTP" 
  | "API" 
  | "SHARED_FOLDER" 
  | "SCANNER";

export interface IngestionSource {
  id: string;
  name: string;
  type: IngestionSourceType;
  enabled: boolean;
  configuration: Record<string, any>;
  status: "healthy" | "error" | "polling" | "maintenance";
  lastPollAt?: string;
  processedCount?: number;
  queueDepth: number;
  retryCount: number;
}

export interface IngestionDiagnostics {
  ocrReadiness: number;
  resolution: string;
  rotation: number;
  blur: number;
  isVirusSafe: boolean;
  isDuplicate: boolean;
  metadata: Record<string, any>;
}

export interface IngestionAsset {
  id: string;
  sourceId: string;
  fileName: string;
  originalPath: string;
  normalizedPath?: string;
  mimeType: string;
  fileSize: number;
  checksum: string;
  status: "PENDING" | "VIRUS_SCAN" | "NORMALIZING" | "OCR_READY" | "COMPLETED" | "ERROR";
  diagnostics?: IngestionDiagnostics;
  createdAt: string;
}

export interface IngestionBatch {
  id: string;
  batchName: string;
  sourceType: IngestionSourceType;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
}

// ─── VALIDATION & CONTINUOUS LEARNING STUDIO ──────────────────────────────────

/** R_d weighted components — 3.1 Dynamic Document Risk Score */
export interface RiskScoreBreakdown {
  classificationConfidence: number; // C_c  [0,1]
  meanExtractionConfidence: number; // C_e_bar [0,1]
  structuralVariationPenalty: number; // V_d [0,1]
  businessCriticality: number; // B_d [0,1]
  weights: { wc: number; we: number; wv: number; wb: number };
  riskScore: number; // R_d [0,1]
}

/** C_doc weighted components — 3.2 Overall Document Confidence */
export interface DocumentConfidenceBreakdown {
  classificationConfidence: number; // C_c
  geometricFieldConfidence: number; // (prod C_fi)^(1/n)
  ocrConfidence: number; // C_ocr
  businessRulesPass: boolean; // C_biz_rules
  weights: { w1: number; w2: number; w3: number; w4: number };
  overallConfidence: number; // C_doc [0,1]
}

export type ValidationQueueType =
  | "highest_learning_value"
  | "confidence_review"
  | "manual_escalation"
  | "straight_through";

export interface BusinessRuleCheckResult {
  ruleId: string;
  label: string;
  passed: boolean;
  delta: number;
  expression: string;
}

export interface FieldExplanation {
  fieldId: string;
  fieldName: string;
  confidence: number;
  status: "high" | "medium" | "low";
  ocrAmbiguity?: { observed: string; alternatives: string[] };
  reasons: string[];
}

export interface ValidationDocumentSummary {
  documentId: string;
  name: string;
  className: string;
  riskScore: RiskScoreBreakdown;
  confidence: DocumentConfidenceBreakdown;
  queue: ValidationQueueType;
  businessRules: BusinessRuleCheckResult[];
  fieldExplanations: FieldExplanation[];
  classificationExplanation: {
    matchedKeywords: string[];
    vendorFingerprintMatch: string | null;
  };
}

/** 6.1 Unified Transaction Log Schema */
export interface ValidationTransactionLog {
  transaction_id: string;
  batch_id: string;
  document_id: string;
  model_context: {
    classification_model_version: string;
    extraction_model_id: string;
  };
  explainability_data: {
    ocr_ambiguity_detected: boolean;
  };
  business_rules: {
    mathematical_reconciliation_pass: boolean;
    delta_amount: number;
  };
  timestamp: string;
}

/** 4.8 Training Dataset Governance Ledger */
export interface TrainingLedgerEntry {
  training_sample_id: string;
  document_id: string;
  field_id: string;
  field_name: string;
  predicted_value: string;
  corrected_value: string;
  predicted_confidence: number;
  provenance_metadata: {
    source_user_id: string;
    approval_timestamp: string;
    origin_batch_id: string;
    approver_id: string;
    base_model_version_used: string;
  };
}

/** 4.6 Model Promotion Pipeline lifecycle stages */
export type ModelLifecycleStage =
  | "retained_local"
  | "internal_validation"
  | "shadow_deployment"
  | "canary_staging"
  | "ab_test"
  | "production";

export interface ModelVersionRecord {
  version: string;
  stage: ModelLifecycleStage;
  accuracy: number;
  goldenSetScore: number;
  abTrafficPercent?: number;
  promotedAt?: string;
  isActive: boolean;
  isStable: boolean;
}

/** 4.4 Model Health Center & Drift Analytics */
export interface DriftDataPoint {
  date: string;
  accuracy: number;
}

export interface VendorPerformance {
  vendor: string;
  accuracy: number;
  documentCount: number;
  trend: "up" | "down" | "stable";
}

export interface FieldDecayProfile {
  fieldName: string;
  history: number[]; // last N accuracy samples, 0-100
  current: number;
  status: "stable" | "decaying" | "critical";
}

/** 4.5 Human Performance & Quality Analytics */
export interface AnalystTelemetry {
  analystName: string;
  secondsPerField: number;
  secondsPerDocument: number;
  fieldsReviewed: number;
  documentsReviewed: number;
}

/** 10. Golden Dataset Testing Bench */
export interface GoldenDatasetResult {
  modelVersion: string;
  totalDocuments: number;
  passedDocuments: number;
  score: number; // 0-100
  baselineScore: number; // active production version's score
  ranAt: string;
  passesGate: boolean;
}
// ─── Wave 1: New telemetry + quality types ────────────────────────────────────

export interface IQAReadinessScore {
  dpi_score: number;
  blur_score: number;
  noise_score: number;
  skew_degrees: number;
  readiness_index: number;
  status: "excellent" | "good" | "fair" | "poor";
  warnings: string[];
  assessed_at: string;
}

export interface DocumentFingerprints {
  layout_hash: string;
  content_hash: string;
  visual_hash: string;
  generated_at: string;
  page_count: number;
}

export interface ProcessingPerformanceTelemetry {
  stage: string;
  document_id: string;
  start_time: string;
  end_time: string | null;
  duration_ms: number | null;
  cpu_pct: number | null;
  memory_mb: number | null;
  status: "running" | "completed" | "failed";
  error?: string;
}

export interface CostTelemetry {
  provider: string;
  model: string;
  stage: string;
  document_id: string;
  timestamp: string;
  prompt_tokens: number;
  completion_tokens: number;
  cached_input_tokens: number;
  total_tokens: number;
  cost_usd: number;
}

export interface SampleOptimizationResult {
  current_accuracy: number;
  target_accuracy: number;
  samples_needed: number;
  current_samples: number;
  samples_remaining: number;
  confidence_interval: number;
  estimated_days_to_target: number | null;
}

export interface PiiRedactionResult {
  field_id: string;
  field_name: string;
  original_value: string;
  redacted_value: string;
  matched_patterns: string[];
  handling_mode: "redact" | "mask" | "hash";
}

export interface ArtifactBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type ArtifactType = "staple" | "hole_punch" | "shadow_region" | "crease";
export type ArtifactCorner = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "margin-left" | "margin-right";

export interface ArtifactDetection {
  type: ArtifactType;
  bbox: ArtifactBBox;
  confidence: number;
  corner?: ArtifactCorner;
  severity: "low" | "medium" | "high";
}

export interface ImageEnhancementReport {
  applied: string[];
  artifacts: ArtifactDetection[];
  metrics: {
    shadow_uniformity_before: number;
    shadow_uniformity_after: number;
    artifacts_removed: number;
  };
  processing_ms: number;
}

export type StructuralElementType = "header" | "footer" | "page_number" | "running_title";

export interface StructuralElement {
  type: StructuralElementType;
  text: string;
  bbox: ArtifactBBox;
  confidence: number;
  page_number_value?: number;
  zone: "top" | "bottom";
}

export interface StructuralAnalysis {
  headers: StructuralElement[];
  footers: StructuralElement[];
  page_numbers: StructuralElement[];
  running_titles: StructuralElement[];
  all_exclusion_zones: StructuralElement[];
  header_height_px: number;
  footer_height_px: number;
}

// Force re-index
