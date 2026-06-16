"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { TrainingStage, DocumentField, TrainingBatch, WorkflowStep, StepStatus, DocumentClass } from "../types";

interface DocumentReaderContextType {
  activeStage: TrainingStage;
  setActiveStage: (stage: TrainingStage) => void;
  
  // Context Selection
  customerId: string | null;
  setCustomerId: (id: string | null) => void;
  tenantId: string | null;
  setTenantId: (id: string | null) => void;
  folderId: string | null;
  setFolderId: (id: string | null) => void;
  projectId: string | null;
  setProjectId: (id: string | null) => void;

  // Workflow State
  steps: Record<TrainingStage, WorkflowStep>;
  updateStepStatus: (stage: TrainingStage, status: StepStatus) => void;
  canNavigateTo: (stage: TrainingStage) => boolean;

  fields: DocumentField[];
  setFields: React.Dispatch<React.SetStateAction<DocumentField[]>>;
  batches: TrainingBatch[];
  setBatches: React.Dispatch<React.SetStateAction<TrainingBatch[]>>;
  classes: DocumentClass[];
  setClasses: React.Dispatch<React.SetStateAction<DocumentClass[]>>;
}

const DEFAULT_STEPS: Record<TrainingStage, WorkflowStep> = {
  [TrainingStage.INFRASTRUCTURE]: {
    id: TrainingStage.INFRASTRUCTURE,
    label: "INFRASTRUCTURE",
    description: "Enterprise Orchestration & Engine Registry",
    status: "not_started",
    isLocked: false,
  },
  [TrainingStage.DOCUMENT_UPLOAD]: {
    id: TrainingStage.DOCUMENT_UPLOAD,
    label: "DOCUMENT INTAKE",
    description: "Multi-source ingestion, normalization, and bundle detection",
    status: "not_started",
    isLocked: false,
  },
  [TrainingStage.OCR_CONFIGURATION]: {
    id: TrainingStage.OCR_CONFIGURATION,
    label: "OCR PIPELINE",
    description: "Configure distributed extraction and failover policies",
    status: "not_started",
    isLocked: false,
  },
  [TrainingStage.PAGE_SEGREGATION]: {
    id: TrainingStage.PAGE_SEGREGATION,
    label: "SEGREGATION & CLASSIFICATION",
    description: "Logical page grouping, bundling, and taxonomy classification",
    status: "not_started",
    isLocked: false,
  },
  [TrainingStage.CLASSIFICATION]: {
    id: TrainingStage.CLASSIFICATION,
    label: "DOCUMENT INTELLIGENCE",
    description: "Deep learning classification and semantic fingerprinting",
    status: "not_started",
    isLocked: false,
  },

  [TrainingStage.DOCUMENT_TYPE_RESOLUTION]: {
    id: TrainingStage.DOCUMENT_TYPE_RESOLUTION,
    label: "PREBUILT MODEL ROUTING",
    description: "Match to prebuilt taxonomy models for automated extraction",
    status: "not_started",
    isLocked: false,
  },

  [TrainingStage.EXTRACTION]: {
    id: TrainingStage.EXTRACTION,
    label: "EXTRACTION DESIGNER",
    description: "Design custom fields and extraction anchors if no prebuilt model exists",
    status: "not_started",
    isLocked: false,
  },
  [TrainingStage.VALIDATION]: {
    id: TrainingStage.VALIDATION,
    label: "HUMAN VALIDATION",
    description: "Expert-in-the-loop accuracy verification and QA",
    status: "not_started",
    isLocked: false,
  },
  [TrainingStage.TRAINING_REVIEW]: {
    id: TrainingStage.TRAINING_REVIEW,
    label: "TRAINING REVIEW",
    description: "Model performance audit and accuracy benchmarking",
    status: "not_started",
    isLocked: false,
  },
  [TrainingStage.PUBLISH]: {
    id: TrainingStage.PUBLISH,
    label: "DEPLOYMENT PIPELINE",
    description: "Publish to production-ready API and monitoring rail",
    status: "not_started",
    isLocked: false,
  },
  [TrainingStage.EXPORT]: {
    id: TrainingStage.EXPORT,
    label: "SECURE EXPORT",
    description: "Structured JSON/CSV/JSONL export with PII governance",
    status: "not_started",
    isLocked: false,
  },
};

const DocumentReaderContext = createContext<DocumentReaderContextType | undefined>(undefined);

export function DocumentReaderProvider({ children }: { children: React.ReactNode }) {
  const [activeStage, setActiveStage] = useState<TrainingStage>(TrainingStage.EXTRACTION);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  
  const [steps, setSteps] = useState<Record<TrainingStage, WorkflowStep>>(DEFAULT_STEPS);
  const [fields, setFields] = useState<DocumentField[]>([]);
  const [batches, setBatches] = useState<TrainingBatch[]>([]);
  const [classes, setClasses] = useState<DocumentClass[]>([]);

  // Comprehensive Persistence Logic - Loading on Mount
  useEffect(() => {
    const savedStage = localStorage.getItem("doc_reader_stage");
    if (savedStage && savedStage !== TrainingStage.INFRASTRUCTURE) {
      setActiveStage(savedStage as TrainingStage);
    }

    const savedCustomer = localStorage.getItem("doc_reader_customer_id");
    if (savedCustomer) setCustomerId(savedCustomer);

    const savedTenant = localStorage.getItem("doc_reader_tenant_id");
    if (savedTenant) setTenantId(savedTenant);

    const savedFolder = localStorage.getItem("doc_reader_folder_id");
    if (savedFolder) setFolderId(savedFolder);

    const savedProject = localStorage.getItem("doc_reader_project_id");
    if (savedProject) setProjectId(savedProject);
  }, []);

  // Hydrate project-specific states whenever projectId changes
  useEffect(() => {
    if (!projectId) return;

    const savedSteps = localStorage.getItem(`doc_reader_steps_${projectId}`);
    if (savedSteps) {
      try {
        const parsed = JSON.parse(savedSteps);
        const merged = { ...DEFAULT_STEPS };
        Object.keys(parsed).forEach(key => {
          const stage = key as TrainingStage;
          if (merged[stage]) {
            merged[stage] = { ...merged[stage], ...parsed[stage] };
          }
        });
        setSteps(merged);
      } catch (e) {
        console.error("Failed to parse saved steps:", e);
      }
    } else {
      setSteps(DEFAULT_STEPS);
    }

    const savedFields = localStorage.getItem(`doc_reader_fields_${projectId}`);
    if (savedFields) {
      try {
        setFields(JSON.parse(savedFields));
      } catch (e) {
        console.error("Failed to parse saved fields:", e);
      }
    } else {
      setFields([]);
    }

    const savedBatches = localStorage.getItem(`doc_reader_batches_${projectId}`);
    if (savedBatches) {
      try {
        const parsed = JSON.parse(savedBatches);
        const initialized = parsed.map((batch: TrainingBatch) => ({
          ...batch,
          pages: batch.pages || []
        }));
        setBatches(initialized);
      } catch (e) {
        console.error("Failed to parse saved batches:", e);
      }
    } else {
      setBatches([]);
    }

    const savedClasses = localStorage.getItem(`doc_reader_classes_${projectId}`);
    if (savedClasses) {
      try {
        setClasses(JSON.parse(savedClasses));
      } catch (e) {
        console.error("Failed to parse saved classes:", e);
      }
    } else {
      setClasses([]);
    }
  }, [projectId]);

  // Comprehensive Persistence Logic - Saving on State Mutations
  useEffect(() => {
    localStorage.setItem("doc_reader_stage", activeStage);
  }, [activeStage]);

  useEffect(() => {
    if (customerId) {
      localStorage.setItem("doc_reader_customer_id", customerId);
    } else {
      localStorage.removeItem("doc_reader_customer_id");
    }
  }, [customerId]);

  useEffect(() => {
    if (tenantId) {
      localStorage.setItem("doc_reader_tenant_id", tenantId);
    } else {
      localStorage.removeItem("doc_reader_tenant_id");
    }
  }, [tenantId]);

  useEffect(() => {
    if (folderId) {
      localStorage.setItem("doc_reader_folder_id", folderId);
    } else {
      localStorage.removeItem("doc_reader_folder_id");
    }
  }, [folderId]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem("doc_reader_project_id", projectId);
    } else {
      localStorage.removeItem("doc_reader_project_id");
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`doc_reader_steps_${projectId}`, JSON.stringify(steps));
    }
  }, [steps, projectId]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`doc_reader_fields_${projectId}`, JSON.stringify(fields));
    }
  }, [fields, projectId]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`doc_reader_batches_${projectId}`, JSON.stringify(batches));
    }
  }, [batches, projectId]);

  useEffect(() => {
    if (projectId) {
      localStorage.setItem(`doc_reader_classes_${projectId}`, JSON.stringify(classes));
    }
  }, [classes, projectId]);

  // Validation Logic for Navigation
  const canNavigateTo = (targetStage: TrainingStage): boolean => {
    return true; // Dynamic lock bypass for developer assessment and DTR presentation
  };

  const updateStepStatus = (stage: TrainingStage, status: StepStatus) => {
    setSteps(prev => {
      const newSteps = { ...prev };
      newSteps[stage] = { ...newSteps[stage], status };
      
      if (status === "completed") {
        const stageOrder = Object.values(TrainingStage);
        const currentIndex = stageOrder.indexOf(stage);
        if (currentIndex < stageOrder.length - 1) {
          const nextStage = stageOrder[currentIndex + 1];
          newSteps[nextStage] = { ...newSteps[nextStage], isLocked: false };
        }
      }
      
      return newSteps;
    });
  };

  // Wrapped setBatches to ensure page initialization
  const setBatchesWithInit: React.Dispatch<React.SetStateAction<TrainingBatch[]>> = (action) => {
    setBatches(prev => {
      const next = typeof action === 'function' ? action(prev) : action;
      return next.map(batch => {
        if (!batch.pages) {
          return { ...batch, pages: [] };
        }
        return batch;
      });
    });
  };

  return (
    <DocumentReaderContext.Provider value={{
      activeStage,
      setActiveStage,
      customerId,
      setCustomerId,
      tenantId,
      setTenantId,
      folderId,
      setFolderId,
      projectId,
      setProjectId,
      steps,
      updateStepStatus,
      canNavigateTo,
      fields,
      setFields,
      batches,
      setBatches: setBatchesWithInit,
      classes,
      setClasses
    }}>
      {children}
    </DocumentReaderContext.Provider>
  );
}

export function useDocumentReader() {
  const context = useContext(DocumentReaderContext);
  if (!context) throw new Error("useDocumentReader must be used within a DocumentReaderProvider");
  return context;
}
