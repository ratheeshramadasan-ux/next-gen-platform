"use client";

import React, { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Cpu,
  FileText,
  Filter,
  Gauge,
  Globe2,
  Hand,
  Languages,
  LayoutTemplate,
  Network,
  Search,
  ShieldCheck,
  Signature,
  Sparkles,
  Table2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PREBUILT_MODELS, PrebuiltModel } from "../constants/prebuiltModels";
import { useDocumentReader } from "../store/documentReaderContext";
import { usePipelineStore } from "../store/studioStore";
import { DocumentClass, TrainingDocument, TrainingStage } from "../types";

type RouteTarget = {
  id: string;
  name: string;
  source: "document_type" | "document";
  subtitle: string;
  color: string;
  confidence?: number;
  hintText: string;
};

type SavedRoutingConfig = {
  targetId: string;
  targetName: string;
  source: RouteTarget["source"];
  mode?: "prebuilt" | "blank_custom" | "browse";
  modelCode?: string;
  modelName?: string;
  modelVersion?: string;
  confidenceThreshold?: number;
  fields?: string[];
};

type SavedRoutingState = {
  modelOverrides: Record<string, string>;
  blank: Record<string, boolean>;
  browse: Record<string, boolean>;
};

const CATEGORY_ALL = "All Models";
const ROUTING_STORAGE_KEY = "documentReader.prebuiltModelRouting";

const MODEL_KEYWORDS: Record<string, string[]> = {
  passport_global_v1: ["passport", "mrz", "visa", "surname", "nationality", "republic of india", "place of birth"],
  passport_india_v1: ["indian passport", "republic of india", "india", "passport", "mrz", "surname", "given names", "place of birth", "place of issue", "date of issue"],
  passport_canada_v1: ["canada passport", "canadian passport", "canada", "passport", "issuing authority", "bilingual"],
  passport_us_v1: ["us passport", "usa passport", "united states passport", "passport", "endorsements"],
  id_card_global_v1: ["national id", "identity card", "id card", "identity number", "photo id"],
  permanent_resident_card_v1: ["permanent resident", "pr card", "resident card", "uci", "resident number"],
  canada_pr_card_v1: ["canada pr", "canadian pr", "permanent resident", "pr card", "uci", "canada"],
  us_green_card_v1: ["green card", "permanent resident card", "uscis", "resident since", "category"],
  canada_health_card_v1: ["health card", "health number", "provincial health", "version code"],
  canada_work_permit_v1: ["work permit", "canada work permit", "uci", "employer", "occupation", "conditions"],
  voter_id_india_v1: ["voter id", "epic", "election", "elector", "constituency"],
  pan_card_india_v1: ["pan", "permanent account number", "income tax department"],
  driver_license_us_v3: ["driver", "licence", "license", "dmv", "vehicle", "dl"],
  driver_license_canada_v1: ["canada driver", "canadian driver", "driver licence", "driver license", "province", "license class"],
  aadhaar_india_v1: ["aadhaar", "adhar", "uidai", "uid", "government of india"],
  invoice_enterprise_v3: ["invoice", "bill to", "vendor", "supplier", "subtotal", "tax amount"],
  tax_invoice_global_v2: ["tax invoice", "gst", "vat", "hst", "tax id", "tax summary"],
  purchase_order_v1: ["purchase order", "po number", "ship to", "ordered items", "procurement"],
  utility_bill_v1: ["utility bill", "electricity", "water bill", "gas bill", "telecom", "amount due"],
  credit_card_statement_v1: ["credit card", "statement balance", "minimum payment", "cardholder"],
  bank_statement_v2: ["bank", "statement", "account", "balance", "transaction", "deposit"],
  medical_claim_ca_v4: ["claim", "insurance", "provider", "diagnosis", "patient", "medical"],
  insurance_policy_v1: ["insurance policy", "policy number", "policyholder", "coverage", "premium"],
  eob_statement_v1: ["explanation of benefits", "eob", "patient responsibility", "allowed amount"],
  prescription_parser_v2: ["prescription", "rx", "dosage", "doctor", "medication", "pharmacy"],
  lab_report_v1: ["lab report", "test results", "specimen", "reference range", "abnormal"],
  discharge_summary_v1: ["discharge summary", "admission", "discharge", "diagnoses", "medications"],
  nda_contract_v1: ["nda", "contract", "agreement", "confidential", "governing law", "party"],
  lease_agreement_v1: ["lease", "tenant", "landlord", "monthly rent", "security deposit"],
  power_of_attorney_v1: ["power of attorney", "grantor", "attorney", "notary", "witness"],
  bill_of_lading_v1: ["bill of lading", "bol", "shipper", "consignee", "cargo", "freight"],
  commercial_invoice_v1: ["commercial invoice", "exporter", "importer", "incoterms", "commodity"],
  packing_list_v1: ["packing list", "package", "gross weight", "shipper", "consignee"],
  resume_parser_v2: ["resume", "cv", "candidate", "experience", "skills", "education"],
  employment_application_v1: ["employment application", "job application", "work history", "references"],
  pay_stub_v1: ["pay stub", "paystub", "pay period", "gross pay", "net pay", "deductions"],
  offer_letter_v1: ["offer letter", "position title", "start date", "salary", "employment type"],
  tax_form_w2_us: ["w2", "w-2", "tax", "wages", "social security", "withheld"],
  irs_1040_us_v1: ["1040", "irs", "tax return", "filing status", "refund", "amount owed"],
  canada_t4_v1: ["t4", "canada", "employment income", "sin", "cpp", "ei premiums"],
  customs_declaration_v1: ["customs declaration", "hs code", "duty", "declarant", "customs"],
  kyc_onboarding_form: ["kyc", "onboarding", "customer", "checklist", "verification", "application"],
  mortgage_application_v1: ["mortgage", "borrower", "loan amount", "property address", "liabilities"],
  account_opening_form_v1: ["account opening", "savings", "checking", "nominee", "account type"],
  direct_deposit_form_v1: ["direct deposit", "routing number", "transit", "institution number"],
  consent_form_v1: ["consent", "authorization", "guardian", "selected options", "participant"],
};

function normalize(value: string) {
  return value.toLowerCase().replace(/[_-]/g, " ");
}

function searchTokens(value: string) {
  return normalize(value)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(token => token.length > 1);
}

function providerLabel(provider: string) {
  return provider
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function strategyLabel(strategy: PrebuiltModel["strategy"]) {
  return strategy.replace(/_/g, " ");
}

function readSavedRoutingState(): SavedRoutingState {
  if (typeof window === "undefined") return { modelOverrides: {}, blank: {}, browse: {} };

  try {
    const saved = window.localStorage.getItem(ROUTING_STORAGE_KEY);
    const routes = saved ? JSON.parse(saved) as SavedRoutingConfig[] : [];
    return routes.reduce<SavedRoutingState>((state, route) => {
      if (route.mode === "blank_custom") state.blank[route.targetId] = true;
      if (route.mode === "browse") state.browse[route.targetId] = true;
      if (route.mode === "prebuilt" && route.modelCode) state.modelOverrides[route.targetId] = route.modelCode;
      return state;
    }, { modelOverrides: {}, blank: {}, browse: {} });
  } catch {
    return { modelOverrides: {}, blank: {}, browse: {} };
  }
}

function routeTargetFromClass(documentClass: DocumentClass): RouteTarget {
  return {
    id: documentClass.classId,
    name: documentClass.name,
    source: "document_type",
    subtitle: `${documentClass.sampleCount || 0} samples mapped`,
    color: documentClass.color || "var(--primary)",
    confidence: documentClass.minConfidence,
    hintText: [
      documentClass.name,
      documentClass.description,
      ...documentClass.keywords,
      ...documentClass.anchorPhrases,
      ...documentClass.requiredFields,
      ...documentClass.optionalFields,
    ].join(" "),
  };
}

function routeTargetFromDocument(document: TrainingDocument, index: number): RouteTarget {
  const firstPageText = document.pages?.[0]?.ocrText || "";
  const className = document.classification?.className;

  return {
    id: document.documentId,
    name: className || document.name || `Document ${index + 1}`,
    source: "document",
    subtitle: className ? document.name : `${document.pages?.length || 0} pages loaded`,
    color: "var(--primary)",
    confidence: document.classification?.confidence,
    hintText: `${document.name} ${className || ""} ${firstPageText}`,
  };
}

function scoreModelForTarget(model: PrebuiltModel, target: RouteTarget) {
  const haystack = normalize(`${target.name} ${target.subtitle} ${target.hintText}`);
  const modelKeywords = MODEL_KEYWORDS[model.code] || [];
  const categoryWords = normalize(`${model.name} ${model.category} ${model.description}`).split(/\s+/);

  let score = 0;
  modelKeywords.forEach(keyword => {
    if (haystack.includes(normalize(keyword))) score += keyword.length > 4 ? 16 : 8;
  });

  categoryWords.forEach(word => {
    if (word.length > 4 && haystack.includes(word)) score += 2;
  });

  if (target.source === "document" && model.category === "Identity Documents" && haystack.includes("passport")) score += 20;
  if (model.code === "passport_india_v1" && haystack.includes("passport") && (haystack.includes("india") || haystack.includes("republic of india"))) score += 30;
  if (target.source === "document_type" && normalize(target.name).includes(normalize(model.name))) score += 24;

  return score;
}

function bestModelForTarget(target: RouteTarget) {
  return PREBUILT_MODELS.reduce((best, model) => {
    const nextScore = scoreModelForTarget(model, target);
    return nextScore > best.score ? { model, score: nextScore } : best;
  }, { model: PREBUILT_MODELS[0], score: -1 }).model;
}

function ModelCapability({ active, label, icon: Icon }: { active: boolean; label: string; icon: React.ElementType }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-tight",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-border/60 bg-muted/30 text-muted-foreground"
      )}
    >
      <Icon size={11} />
      {label}
    </span>
  );
}

export default function DocumentTypeResolution() {
  const { documentClasses, activeDocument, trainingDocuments } = usePipelineStore();
  const { setActiveStage, updateStepStatus } = useDocumentReader();
  const [savedRoutingState] = useState(readSavedRoutingState);

  const routeTargets = useMemo<RouteTarget[]>(() => {
    const documents = trainingDocuments.length > 0 ? trainingDocuments : activeDocument ? [activeDocument] : [];
    if (documents.length > 0) return documents.map(routeTargetFromDocument);

    const activeClasses = documentClasses.filter(documentClass => documentClass.isActive);
    return activeClasses.map(routeTargetFromClass);
  }, [activeDocument, documentClasses, trainingDocuments]);

  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [modelSelectionOverrides, setModelSelectionOverrides] = useState<Record<string, string>>(savedRoutingState.modelOverrides);
  const [blankRoutes, setBlankRoutes] = useState<Record<string, boolean>>(savedRoutingState.blank);
  const [browseRoutes, setBrowseRoutes] = useState<Record<string, boolean>>(savedRoutingState.browse);
  const [categoryFilter, setCategoryFilter] = useState(CATEGORY_ALL);
  const [search, setSearch] = useState("");

  const modelSelections = useMemo(() => {
    const defaults: Record<string, string> = {};
    routeTargets.forEach(target => {
      defaults[target.id] = bestModelForTarget(target).code;
    });
    return { ...defaults, ...modelSelectionOverrides };
  }, [modelSelectionOverrides, routeTargets]);

  const selectedTarget = useMemo(
    () => routeTargets.find(target => target.id === selectedTargetId) || routeTargets[0] || null,
    [routeTargets, selectedTargetId]
  );

  const selectedModel = useMemo(() => {
    if (!selectedTarget) return null;
    if (blankRoutes[selectedTarget.id]) return null;
    if (browseRoutes[selectedTarget.id] && !modelSelectionOverrides[selectedTarget.id]) return null;
    return PREBUILT_MODELS.find(model => model.code === modelSelections[selectedTarget.id]) || null;
  }, [blankRoutes, browseRoutes, modelSelectionOverrides, modelSelections, selectedTarget]);

  const recommendedModel = useMemo(
    () => selectedTarget ? bestModelForTarget(selectedTarget) : null,
    [selectedTarget]
  );

  const isSelectedRouteBlank = selectedTarget ? Boolean(blankRoutes[selectedTarget.id]) : false;
  const isSelectedRouteBrowsing = selectedTarget ? Boolean(browseRoutes[selectedTarget.id] && !modelSelectionOverrides[selectedTarget.id]) : false;

  const recommendedModels = useMemo(() => {
    if (!selectedTarget) return [];

    return PREBUILT_MODELS
      .map(model => ({ model, score: scoreModelForTarget(model, selectedTarget) }))
      .filter(item => item.score > 0 && item.model.code !== selectedModel?.code)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4);
  }, [selectedModel?.code, selectedTarget]);

  const selectedFieldGroups = useMemo(() => {
    if (!selectedModel) return [];

    return Object.entries(
      selectedModel.fields.reduce<Record<string, typeof selectedModel.fields>>((groups, field) => {
        const key = field.required ? "Required Fields" : "Optional Fields";
        groups[key] = groups[key] || [];
        groups[key].push(field);
        return groups;
      }, {})
    );
  }, [selectedModel]);

  const categories = useMemo(
    () => [CATEGORY_ALL, ...Array.from(new Set(PREBUILT_MODELS.map(model => model.category)))],
    []
  );

  const categoryCounts = useMemo(
    () => categories
      .filter(category => category !== CATEGORY_ALL)
      .map(category => ({
        category,
        count: PREBUILT_MODELS.filter(model => model.category === category).length,
      })),
    [categories]
  );

  const filteredModels = useMemo(() => {
    const query = normalize(search.trim());
    const tokens = searchTokens(search);

    return PREBUILT_MODELS.filter(model => {
      const categoryMatch = categoryFilter === CATEGORY_ALL || model.category === categoryFilter;
      const modelText = normalize(`${model.name} ${model.category} ${model.description} ${model.supportedRegions.join(" ")} ${model.fields.map(field => field.label).join(" ")}`);
      const modelKeywords = MODEL_KEYWORDS[model.code]?.map(normalize).join(" ") || "";
      const searchableText = `${modelText} ${modelKeywords}`;
      const searchMatch = !query
        || searchableText.includes(query)
        || tokens.some(token => searchableText.includes(token));
      return categoryMatch && searchMatch;
    });
  }, [categoryFilter, search]);

  const selectedCount = routeTargets.filter(target => blankRoutes[target.id] || (!browseRoutes[target.id] && modelSelections[target.id])).length;

  const buildRoutingConfig = (
    modelOverrides: Record<string, string>,
    blanks: Record<string, boolean>,
    browse: Record<string, boolean>
  ): SavedRoutingConfig[] => routeTargets.map(target => {
    const isBlank = Boolean(blanks[target.id]);
    const isBrowse = Boolean(browse[target.id] && !modelOverrides[target.id]);
    const modelCode = modelOverrides[target.id] || modelSelections[target.id];
    const model = isBlank || isBrowse ? null : PREBUILT_MODELS.find(item => item.code === modelCode);
    return {
      targetId: target.id,
      targetName: target.name,
      source: target.source,
      mode: isBlank ? "blank_custom" : isBrowse ? "browse" : "prebuilt",
      modelCode: model?.code,
      modelName: model?.name,
      modelVersion: model?.version,
      confidenceThreshold: model?.confidenceThreshold,
      fields: model?.fields.map(field => field.key) || [],
    };
  });

  const saveRoutingConfig = (
    modelOverrides = modelSelectionOverrides,
    blanks = blankRoutes,
    browse = browseRoutes
  ) => {
    window.localStorage.setItem(ROUTING_STORAGE_KEY, JSON.stringify(buildRoutingConfig(modelOverrides, blanks, browse)));
  };

  const handleSelectModel = (modelCode: string) => {
    if (!selectedTarget) return;

    const nextOverrides = { ...modelSelectionOverrides, [selectedTarget.id]: modelCode };
    const nextBlankRoutes = { ...blankRoutes, [selectedTarget.id]: false };
    const nextBrowseRoutes = { ...browseRoutes, [selectedTarget.id]: false };
    setModelSelectionOverrides(nextOverrides);
    setBlankRoutes(nextBlankRoutes);
    setBrowseRoutes(nextBrowseRoutes);
    saveRoutingConfig(nextOverrides, nextBlankRoutes, nextBrowseRoutes);
    const model = PREBUILT_MODELS.find(item => item.code === modelCode);
    toast.success(`${model?.name || "Prebuilt model"} selected for ${selectedTarget.name}`);
  };

  const handleShowRecommendedMatches = () => {
    if (!selectedTarget) return;

    const keywords = MODEL_KEYWORDS[recommendedModel?.code || ""]
      ?.slice(0, 4)
      .join(" ");
    setCategoryFilter(CATEGORY_ALL);
    setSearch(keywords || selectedTarget.name);
    toast.info("Showing recommended and related prebuilt models.");
  };

  const handleStartBlank = () => {
    if (!selectedTarget) return;
    const nextBlankRoutes = { ...blankRoutes, [selectedTarget.id]: true };
    const nextBrowseRoutes = { ...browseRoutes, [selectedTarget.id]: false };
    const nextOverrides = { ...modelSelectionOverrides };
    delete nextOverrides[selectedTarget.id];
    setBlankRoutes(nextBlankRoutes);
    setBrowseRoutes(nextBrowseRoutes);
    setModelSelectionOverrides(nextOverrides);
    saveRoutingConfig(nextOverrides, nextBlankRoutes, nextBrowseRoutes);
    toast.info(`${selectedTarget.name} will start as a blank custom extraction model.`);
  };

  const handleBrowseLibrary = () => {
    if (!selectedTarget) return;
    const nextBlankRoutes = { ...blankRoutes, [selectedTarget.id]: false };
    const nextBrowseRoutes = { ...browseRoutes, [selectedTarget.id]: true };
    const nextOverrides = { ...modelSelectionOverrides };
    delete nextOverrides[selectedTarget.id];
    setBlankRoutes(nextBlankRoutes);
    setBrowseRoutes(nextBrowseRoutes);
    setModelSelectionOverrides(nextOverrides);
    saveRoutingConfig(nextOverrides, nextBlankRoutes, nextBrowseRoutes);
    setCategoryFilter(CATEGORY_ALL);
    setSearch("");
    toast.info("Browse mode enabled. Select a model from the library to map this document.");
  };

  const handleContinue = () => {
    if (routeTargets.length === 0) {
      toast.warning("Add or classify at least one document before selecting a prebuilt model.");
      return;
    }

    const missingTargets = routeTargets.filter(target => !blankRoutes[target.id] && (browseRoutes[target.id] || !modelSelections[target.id]));
    if (missingTargets.length > 0) {
      toast.warning(`Select a model for ${missingTargets[0].name} before continuing.`);
      setSelectedTargetId(missingTargets[0].id);
      return;
    }

    const routingConfig = buildRoutingConfig(modelSelectionOverrides, blankRoutes, browseRoutes);
    window.localStorage.setItem(ROUTING_STORAGE_KEY, JSON.stringify(routingConfig));
    updateStepStatus(TrainingStage.DOCUMENT_TYPE_RESOLUTION, "completed");
    setActiveStage(TrainingStage.EXTRACTION);
    toast.success(`Prebuilt model routing saved for ${routingConfig.length} document route${routingConfig.length === 1 ? "" : "s"}.`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background text-xs">
      <div className="z-10 flex shrink-0 items-center justify-between border-b border-border/60 bg-card px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-inner">
            <Network size={19} strokeWidth={2.4} />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-foreground">Prebuilt Model Routing</h2>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Choose reusable extraction models for each document or document type
            </p>
          </div>
        </div>

        <button
          onClick={handleContinue}
          className="group flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-primary-foreground shadow-md transition-all hover:shadow-primary/20"
        >
          Continue to Extraction Designer
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-80 shrink-0 flex-col border-r border-border/60 bg-muted/10">
          <div className="border-b border-border/40 p-4">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Filter size={12} /> Documents / Types
              </span>
              <span className="rounded-md bg-primary/10 px-2 py-1 text-[9px] font-black uppercase text-primary">
                {selectedCount}/{routeTargets.length || 0} mapped
              </span>
            </div>
          </div>

          <div className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3">
            {routeTargets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card p-6 text-center">
                <FileText size={22} className="mx-auto mb-3 text-muted-foreground/40" />
                <p className="text-[10px] font-black uppercase text-foreground">No documents ready</p>
                <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                  Load or classify a document first, then assign a prebuilt model here.
                </p>
              </div>
            ) : (
              routeTargets.map(target => {
                const isActive = target.id === selectedTarget?.id;
                const model = PREBUILT_MODELS.find(item => item.code === modelSelections[target.id]);
                const isBlank = Boolean(blankRoutes[target.id]);
                const isBrowsing = Boolean(browseRoutes[target.id] && !modelSelectionOverrides[target.id]);

                return (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTargetId(target.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left transition-all",
                      isActive
                        ? "border-primary bg-primary/[0.04] shadow-sm"
                        : "border-border/50 bg-card hover:border-primary/40 hover:bg-muted/20"
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: target.color }} />
                      <span className="truncate text-[11px] font-black uppercase tracking-tight text-foreground">{target.name}</span>
                    </div>
                    <p className="truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{target.subtitle}</p>
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/30 px-2.5 py-2">
                      <span className="max-w-[190px] truncate text-[9px] font-black uppercase text-foreground">
                        {isBlank ? "Blank custom setup" : isBrowsing ? "Choose from library" : model?.name || "Model not selected"}
                      </span>
                      {isBlank || (!isBrowsing && model) ? <CheckCircle2 size={12} className="text-emerald-500" /> : <LayoutTemplate size={12} className="text-muted-foreground" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className="custom-scrollbar flex-1 overflow-y-auto bg-card/10 p-6">
          {selectedTarget ? (
            <div className="grid w-full grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_420px]">
              <section className="space-y-5">
                <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-md bg-primary/10 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-primary">
                          {selectedTarget.source === "document_type" ? "Document Type" : "Document"}
                        </span>
                        {selectedTarget.confidence ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">
                            {Math.round(selectedTarget.confidence * 100)}% confidence
                          </span>
                        ) : null}
                      </div>
                      <h1 className="text-xl font-black uppercase tracking-tight text-foreground">{selectedTarget.name}</h1>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                        Choose the easiest path for this document: use the recommended prebuilt model, pick another model, or start from a blank custom setup.
                      </p>
                    </div>

                    <div className="relative min-w-[260px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={event => setSearch(event.target.value)}
                        placeholder="Search models or fields..."
                        className="h-10 w-full rounded-xl border border-border/70 bg-background pl-9 pr-3 text-[11px] font-bold outline-none transition focus:border-primary"
                      />
                    </div>
                  </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-3">
                      <button
                      onClick={handleShowRecommendedMatches}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all hover:border-primary/40",
                        search.trim().length > 0 && !isSelectedRouteBlank
                          ? "border-primary bg-primary/[0.06]"
                          : "border-border/60 bg-muted/10"
                      )}
                    >
                      <p className="text-[10px] font-black uppercase text-primary">Recommended</p>
                      <p className="mt-1 text-[12px] font-black uppercase text-foreground">{recommendedModel?.name || "No model found"}</p>
                      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Show the best match plus related models using loose keyword search.</p>
                    </button>

                    <button
                      onClick={handleBrowseLibrary}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all hover:border-primary/40",
                        isSelectedRouteBrowsing
                          ? "border-primary bg-primary/[0.06]"
                          : "border-border/60 bg-muted/10"
                      )}
                    >
                      <p className="text-[10px] font-black uppercase text-primary">Choose Another</p>
                      <p className="mt-1 text-[12px] font-black uppercase text-foreground">Browse model library</p>
                      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Use this when the recommendation is close but not quite right.</p>
                    </button>

                    <button
                      onClick={handleStartBlank}
                      className={cn(
                        "rounded-xl border p-4 text-left transition-all hover:border-primary/40",
                        isSelectedRouteBlank
                          ? "border-primary bg-primary/[0.06]"
                          : "border-border/60 bg-muted/10"
                      )}
                    >
                      <p className="text-[10px] font-black uppercase text-primary">Build Manually</p>
                      <p className="mt-1 text-[12px] font-black uppercase text-foreground">Start blank</p>
                      <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Skip prebuilt fields and design fields/anchors yourself.</p>
                    </button>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {categories.map(category => (
                      <button
                        key={category}
                        onClick={() => setCategoryFilter(category)}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-[9px] font-black uppercase tracking-wider transition-all",
                          categoryFilter === category
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border/60 bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        )}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {filteredModels.map(model => {
                    const isSelected = model.code === selectedModel?.code;
                    const matchScore = selectedTarget ? scoreModelForTarget(model, selectedTarget) : 0;

                    return (
                      <button
                        key={model.code}
                        onClick={() => handleSelectModel(model.code)}
                        className={cn(
                          "group flex min-h-[230px] flex-col rounded-2xl border bg-card p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
                          isSelected && "border-primary bg-primary/[0.035] shadow-primary/10"
                        )}
                      >
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", isSelected ? "border-primary/30 bg-primary/10 text-primary" : "border-border/60 bg-muted/30 text-muted-foreground")}>
                              <Cpu size={16} />
                            </div>
                            <div>
                              <h3 className="text-[12px] font-black uppercase tracking-tight text-foreground">{model.name}</h3>
                              <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                {model.category} • v{model.version}
                              </p>
                            </div>
                          </div>
                          {isSelected ? <BadgeCheck size={18} className="shrink-0 text-primary" /> : null}
                        </div>

                        <p className="mb-4 line-clamp-3 flex-1 text-[10px] leading-relaxed text-muted-foreground">{model.description}</p>

                        <div className="mb-4 grid grid-cols-2 gap-2 text-[9px] font-black uppercase">
                          <div className="rounded-lg bg-muted/30 p-2">
                            <span className="block text-muted-foreground">Fields</span>
                            <span className="mt-1 block text-foreground">{model.fields.length}</span>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2">
                            <span className="block text-muted-foreground">Threshold</span>
                            <span className="mt-1 block text-foreground">{Math.round(model.confidenceThreshold * 100)}%</span>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2">
                            <span className="block text-muted-foreground">Strategy</span>
                            <span className="mt-1 block text-foreground">{strategyLabel(model.strategy)}</span>
                          </div>
                          <div className="rounded-lg bg-muted/30 p-2">
                            <span className="block text-muted-foreground">Match</span>
                            <span className={cn("mt-1 block", matchScore > 0 ? "text-emerald-600" : "text-muted-foreground")}>
                              {matchScore > 0 ? "Recommended" : "Available"}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 border-t border-border/40 pt-3">
                          <ModelCapability active={model.supportsTables} label="Tables" icon={Table2} />
                          <ModelCapability active={model.supportsSignatures} label="Signatures" icon={Signature} />
                          <ModelCapability active={model.supportsHandwriting} label="Handwriting" icon={Hand} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              <aside className="space-y-4 2xl:sticky 2xl:top-0 2xl:self-start">
                <div className="rounded-2xl border border-primary/20 bg-card p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <ShieldCheck size={13} /> Right Panel Selection
                    </span>
                    {isSelectedRouteBlank ? (
                      <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-blue-700">Manual</span>
                    ) : isSelectedRouteBrowsing ? (
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-700">Browsing</span>
                    ) : selectedModel ? (
                      <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">Ready</span>
                    ) : (
                      <span className="rounded-md bg-amber-50 px-2 py-1 text-[9px] font-black uppercase text-amber-700">Select</span>
                    )}
                  </div>

                  {isSelectedRouteBlank ? (
                    <div className="space-y-4">
                      <div>
                        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-primary">Custom Setup</p>
                        <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Start Blank</h3>
                        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                          No prebuilt fields will be created. Extraction Studio will open with this document ready for manual field and anchor design.
                        </p>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                        <p className="truncate text-[11px] font-black uppercase text-foreground">{selectedTarget.name}</p>
                        <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{selectedTarget.subtitle}</p>
                      </div>
                    </div>
                  ) : isSelectedRouteBrowsing ? (
                    <div className="space-y-4">
                      <div>
                        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-primary">Browse Mode</p>
                        <h3 className="text-sm font-black uppercase tracking-tight text-foreground">Choose From Library</h3>
                        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">
                          Select one of the model cards in the library. Until you choose a model, this document is intentionally not mapped.
                        </p>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <LayoutTemplate size={14} className="mb-2 text-primary" />
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Available</p>
                          <p className="mt-1 text-[12px] font-black text-foreground">{PREBUILT_MODELS.length}</p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <Filter size={14} className="mb-2 text-primary" />
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Showing</p>
                          <p className="mt-1 text-[12px] font-black text-foreground">{filteredModels.length}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                        <p className="mb-1 text-[10px] font-black uppercase text-amber-800">Action Needed</p>
                        <p className="text-[10px] leading-relaxed text-amber-800">
                          Click a model card or use a category below to narrow the list.
                        </p>
                      </div>
                    </div>
                  ) : selectedModel ? (
                    <div className="space-y-4">
                      <div>
                        <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-primary">Selected Prebuilt Model</p>
                        <h3 className="text-sm font-black uppercase tracking-tight text-foreground">{selectedModel.name}</h3>
                        <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{selectedModel.description}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <Gauge size={14} className="mb-2 text-primary" />
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Confidence</p>
                          <p className="mt-1 text-[12px] font-black text-foreground">{Math.round(selectedModel.confidenceThreshold * 100)}%</p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <Sparkles size={14} className="mb-2 text-primary" />
                          <p className="text-[9px] font-black uppercase text-muted-foreground">OCR</p>
                          <p className="mt-1 text-[12px] font-black uppercase text-foreground">{providerLabel(selectedModel.defaultOcrProvider)}</p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <Globe2 size={14} className="mb-2 text-primary" />
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Regions</p>
                          <p className="mt-1 text-[12px] font-black text-foreground">{selectedModel.supportedRegions.slice(0, 3).join(", ")}</p>
                        </div>
                        <div className="rounded-xl border border-border/50 bg-muted/20 p-3">
                          <Languages size={14} className="mb-2 text-primary" />
                          <p className="text-[9px] font-black uppercase text-muted-foreground">Languages</p>
                          <p className="mt-1 text-[12px] font-black text-foreground">{selectedModel.supportedLanguages.slice(0, 2).join(", ")}</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-primary/20 bg-primary/[0.03] p-3">
                        <p className="mb-1 text-[10px] font-black uppercase text-primary">Routing Behavior</p>
                        <p className="text-[10px] leading-relaxed text-muted-foreground">
                          Use this model first. If confidence falls below {Math.round(selectedModel.confidenceThreshold * 100)}%, continue into custom anchors and OCR validation in Extraction Studio.
                        </p>
                      </div>

                      <div className="rounded-xl border border-border/60 bg-muted/10 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-[10px] font-black uppercase text-foreground">Route</p>
                          <span className="rounded-md bg-background px-2 py-1 text-[9px] font-black uppercase text-muted-foreground">
                            {selectedTarget.source === "document_type" ? "Type" : "Document"}
                          </span>
                        </div>
                        <p className="truncate text-[11px] font-black uppercase text-foreground">{selectedTarget.name}</p>
                        <p className="mt-1 truncate text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{selectedTarget.subtitle}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/70 p-5 text-center text-[10px] font-bold text-muted-foreground">
                      Choose a recommended model, browse another model, or start blank.
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/50 p-4">
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <Sparkles size={13} /> Suggested Alternatives
                    </span>
                    <span className="text-[10px] font-black text-foreground">{recommendedModels.length}</span>
                  </div>
                  <div className="space-y-2 p-3">
                    {recommendedModels.length > 0 ? recommendedModels.map(({ model, score }) => (
                      <button
                        key={model.code}
                        onClick={() => handleSelectModel(model.code)}
                        className="w-full rounded-xl border border-border/50 bg-muted/10 p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/[0.03]"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-[10px] font-black uppercase text-foreground">{model.name}</p>
                            <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground">{model.category}</p>
                          </div>
                          <span className="rounded-md bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase text-emerald-700">
                            {score}
                          </span>
                        </div>
                      </button>
                    )) : (
                      <div className="rounded-xl border border-dashed border-border/70 p-4 text-center text-[10px] font-bold text-muted-foreground">
                        No close alternatives for this route.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/50 p-4">
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <LayoutTemplate size={13} /> Prebuilt Fields
                    </span>
                    <span className="text-[10px] font-black text-foreground">{selectedModel?.fields.length || 0}</span>
                  </div>

                  {selectedModel && selectedModel.fields.length > 0 ? (
                    <div className="custom-scrollbar max-h-[430px] overflow-y-auto p-3">
                      <div className="space-y-4">
                        {selectedFieldGroups.map(([groupName, fields]) => (
                          <div key={groupName}>
                            <div className="mb-2 flex items-center justify-between px-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">{groupName}</p>
                              <span className="text-[9px] font-black text-foreground">{fields.length}</span>
                            </div>
                            <div className="space-y-2">
                              {fields.map(field => (
                                <div key={field.key} className="rounded-xl border border-border/50 bg-muted/10 p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="text-[11px] font-black uppercase text-foreground">{field.label}</p>
                                      <p className="mt-1 text-[9px] font-black uppercase tracking-wider text-muted-foreground">{field.key}</p>
                                    </div>
                                    <span className="rounded-md bg-background px-2 py-1 text-[9px] font-black uppercase text-muted-foreground">{field.type}</span>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-1.5">
                                    {field.coordinatesEnabled ? <span className="rounded-md bg-blue-50 px-2 py-1 text-[9px] font-black uppercase text-blue-700">Coordinate aware</span> : null}
                                  </div>
                                  {field.extractionHint ? (
                                    <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{field.extractionHint}</p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-8 text-center">
                      <FileText size={20} className="mx-auto mb-3 text-muted-foreground/40" />
                      <p className="text-[10px] font-black uppercase text-muted-foreground">No model selected</p>
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-border/60 bg-card shadow-sm">
                  <div className="flex items-center justify-between border-b border-border/50 p-4">
                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      <Filter size={13} /> Model Categories
                    </span>
                    <span className="text-[10px] font-black text-foreground">{PREBUILT_MODELS.length}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 p-3">
                    {categoryCounts.map(({ category, count }) => (
                      <button
                        key={category}
                        onClick={() => setCategoryFilter(category)}
                        className={cn(
                          "rounded-xl border p-3 text-left transition-all",
                          categoryFilter === category
                            ? "border-primary bg-primary/[0.06]"
                            : "border-border/50 bg-muted/10 hover:border-primary/40"
                        )}
                      >
                        <p className="truncate text-[9px] font-black uppercase text-foreground">{category}</p>
                        <p className="mt-1 text-[12px] font-black text-primary">{count}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center opacity-70">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl border border-border/60 bg-muted shadow-inner">
                <Network size={24} className="text-muted-foreground" />
              </div>
              <p className="mb-2 text-xs font-black uppercase text-foreground">No route selected</p>
              <p className="text-[10px] text-muted-foreground">Select a document or document type from the left panel.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
