import { ExtractionStrategy } from "../services/ocrEngine";

export interface PrebuiltField {
  key: string;
  label: string;
  type: "string" | "number" | "date" | "table" | "boolean" | "array";
  required: boolean;
  extractionHint?: string;
  coordinatesEnabled: boolean;
}

export interface PrebuiltModel {
  code: string;
  name: string;
  category: 
    | "Identity Documents"
    | "Financial Documents"
    | "Insurance"
    | "Healthcare"
    | "Legal"
    | "Logistics"
    | "HR Documents"
    | "Government"
    | "Enterprise Forms";
  description: string;
  strategy: ExtractionStrategy;
  supportedRegions: string[];
  supportedLanguages: string[];
  supportsTables: boolean;
  supportsSignatures: boolean;
  supportsHandwriting: boolean;
  requiresGpu: boolean;
  defaultOcrProvider: string;
  version: string;
  confidenceThreshold: number;
  fields: PrebuiltField[];
}

export const PREBUILT_MODELS: PrebuiltModel[] = [
  // 1. IDENTITY DOCUMENTS
  {
    code: "passport_global_v1",
    name: "Global Passport Extractor",
    category: "Identity Documents",
    description: "Multi-strategy MRZ & visual zone extraction for standard ICAO passports.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["Global", "US", "CA", "EU", "UK", "IN"],
    supportedLanguages: ["English", "Spanish", "French", "German", "Multilingual"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.2.0",
    confidenceThreshold: 0.88,
    fields: [
      { key: "passport_number", label: "Passport Number", type: "string", required: true, coordinatesEnabled: true, extractionHint: "Top right block or MRZ bottom row" },
      { key: "surname", label: "Surname", type: "string", required: true, coordinatesEnabled: true },
      { key: "given_name", label: "Given Names", type: "string", required: true, coordinatesEnabled: true },
      { key: "nationality", label: "Nationality", type: "string", required: true, coordinatesEnabled: true },
      { key: "dob", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "expiry_date", label: "Expiry Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "mrz", label: "Machine Readable Zone (MRZ)", type: "string", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "passport_india_v1",
    name: "Indian Passport Extractor",
    category: "Identity Documents",
    description: "India passport model with visual-zone anchors, MRZ validation, dates, place fields, photo, and signature presence.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["IN"],
    supportedLanguages: ["English", "Hindi", "Multilingual"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.90,
    fields: [
      { key: "passport_number", label: "Passport Number", type: "string", required: true, coordinatesEnabled: true, extractionHint: "Top-right visual zone or MRZ second line" },
      { key: "surname", label: "Surname", type: "string", required: true, coordinatesEnabled: true, extractionHint: "Below Surname header" },
      { key: "given_names", label: "Given Names", type: "string", required: true, coordinatesEnabled: true, extractionHint: "Below Given Name(s) header" },
      { key: "nationality", label: "Nationality", type: "string", required: true, coordinatesEnabled: true },
      { key: "sex", label: "Sex", type: "string", required: true, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true, extractionHint: "Supports DD/MM/YYYY format" },
      { key: "place_of_birth", label: "Place of Birth", type: "string", required: true, coordinatesEnabled: true },
      { key: "place_of_issue", label: "Place of Issue", type: "string", required: true, coordinatesEnabled: true },
      { key: "date_of_issue", label: "Date of Issue", type: "date", required: true, coordinatesEnabled: true, extractionHint: "Supports DD/MM/YYYY format" },
      { key: "date_of_expiry", label: "Date of Expiry", type: "date", required: true, coordinatesEnabled: true, extractionHint: "Supports DD/MM/YYYY format" },
      { key: "mrz", label: "Machine Readable Zone (MRZ)", type: "string", required: true, coordinatesEnabled: true },
      { key: "holder_photo", label: "Holder Photo Present", type: "boolean", required: true, coordinatesEnabled: true },
      { key: "holder_signature", label: "Holder Signature Present", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "passport_canada_v1",
    name: "Canada Passport Extractor",
    category: "Identity Documents",
    description: "Canadian passport parser for bilingual visual-zone fields, document number, nationality, dates, place fields, photo, signature, and MRZ.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.90,
    fields: [
      { key: "passport_number", label: "Passport Number", type: "string", required: true, coordinatesEnabled: true, extractionHint: "Document number in visual zone or MRZ" },
      { key: "surname", label: "Surname", type: "string", required: true, coordinatesEnabled: true },
      { key: "given_names", label: "Given Names", type: "string", required: true, coordinatesEnabled: true },
      { key: "nationality", label: "Nationality", type: "string", required: true, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "place_of_birth", label: "Place of Birth", type: "string", required: true, coordinatesEnabled: true },
      { key: "date_of_issue", label: "Date of Issue", type: "date", required: true, coordinatesEnabled: true },
      { key: "date_of_expiry", label: "Date of Expiry", type: "date", required: true, coordinatesEnabled: true },
      { key: "issuing_authority", label: "Issuing Authority", type: "string", required: false, coordinatesEnabled: true },
      { key: "mrz", label: "MRZ", type: "string", required: true, coordinatesEnabled: true },
      { key: "signature_present", label: "Signature Present", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "passport_us_v1",
    name: "US Passport Extractor",
    category: "Identity Documents",
    description: "United States passport parser for passport number, name fields, nationality, sex, dates, authority, endorsement, and MRZ.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["US"],
    supportedLanguages: ["English"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.90,
    fields: [
      { key: "passport_number", label: "Passport Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "surname", label: "Surname", type: "string", required: true, coordinatesEnabled: true },
      { key: "given_names", label: "Given Names", type: "string", required: true, coordinatesEnabled: true },
      { key: "nationality", label: "Nationality", type: "string", required: true, coordinatesEnabled: true },
      { key: "sex", label: "Sex", type: "string", required: false, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "place_of_birth", label: "Place of Birth", type: "string", required: false, coordinatesEnabled: true },
      { key: "date_of_issue", label: "Date of Issue", type: "date", required: true, coordinatesEnabled: true },
      { key: "date_of_expiry", label: "Date of Expiry", type: "date", required: true, coordinatesEnabled: true },
      { key: "mrz", label: "MRZ", type: "string", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "driver_license_us_v3",
    name: "US Driver License",
    category: "Identity Documents",
    description: "Template-aligned and layout-aware parser for United States driver licenses.",
    strategy: ExtractionStrategy.TEMPLATE,
    supportedRegions: ["US"],
    supportedLanguages: ["English", "Spanish"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: false,
    defaultOcrProvider: "google_vision",
    version: "3.2.1",
    confidenceThreshold: 0.85,
    fields: [
      { key: "license_number", label: "License Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "first_name", label: "First Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "last_name", label: "Last Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "address", label: "Street Address", type: "string", required: false, coordinatesEnabled: true },
      { key: "dob", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "expiration_date", label: "Expiration Date", type: "date", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "driver_license_canada_v1",
    name: "Canada Driver License",
    category: "Identity Documents",
    description: "Canadian provincial driver license parser for license number, name, address, class, restrictions, DOB, issue, and expiry.",
    strategy: ExtractionStrategy.TEMPLATE,
    supportedRegions: ["CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: false,
    defaultOcrProvider: "google_vision",
    version: "1.0.0",
    confidenceThreshold: 0.86,
    fields: [
      { key: "license_number", label: "License Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "full_name", label: "Full Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "address", label: "Address", type: "string", required: true, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "license_class", label: "License Class", type: "string", required: false, coordinatesEnabled: true },
      { key: "restrictions", label: "Restrictions", type: "string", required: false, coordinatesEnabled: true },
      { key: "issue_date", label: "Issue Date", type: "date", required: false, coordinatesEnabled: true },
      { key: "expiry_date", label: "Expiry Date", type: "date", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "aadhaar_india_v1",
    name: "Aadhaar Card Parser",
    category: "Identity Documents",
    description: "Localized extractor for India National UID (Aadhaar) supporting front & back scanning.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["IN"],
    supportedLanguages: ["English", "Hindi", "Regional"],
    supportsTables: false,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "paddleocr",
    version: "1.0.0",
    confidenceThreshold: 0.82,
    fields: [
      { key: "aadhaar_number", label: "Aadhaar Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "name", label: "Holder Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "dob", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "gender", label: "Gender", type: "string", required: true, coordinatesEnabled: false }
    ]
  },

  // 2. FINANCIAL DOCUMENTS
  {
    code: "invoice_enterprise_v3",
    name: "Invoice Enterprise Parser",
    category: "Financial Documents",
    description: "Deep learning extraction of fields, tax structures, and nested line items tables.",
    strategy: ExtractionStrategy.MULTI_STAGE,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "German", "French", "Spanish", "Multilingual"],
    supportsTables: true,
    supportsSignatures: false,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "3.4.0",
    confidenceThreshold: 0.80,
    fields: [
      { key: "invoice_number", label: "Invoice Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "invoice_date", label: "Invoice Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "vendor_name", label: "Vendor Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "vendor_tax_id", label: "Vendor Tax ID", type: "string", required: false, coordinatesEnabled: true },
      { key: "line_items", label: "Line Items Table", type: "table", required: true, coordinatesEnabled: true },
      { key: "subtotal", label: "Subtotal", type: "number", required: true, coordinatesEnabled: true },
      { key: "tax_amount", label: "Tax Amount", type: "number", required: false, coordinatesEnabled: true },
      { key: "total_amount", label: "Total Sum Due", type: "number", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "bank_statement_v2",
    name: "Retail Bank Statement",
    category: "Financial Documents",
    description: "High-precision parser for banking accounts, balances, and multi-page tables.",
    strategy: ExtractionStrategy.TABLE_AI,
    supportedRegions: ["Global"],
    supportedLanguages: ["English"],
    supportsTables: true,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "aws_textract",
    version: "2.1.0",
    confidenceThreshold: 0.90,
    fields: [
      { key: "account_number", label: "Account Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "opening_balance", label: "Opening Balance", type: "number", required: true, coordinatesEnabled: true },
      { key: "closing_balance", label: "Closing Balance", type: "number", required: true, coordinatesEnabled: true },
      { key: "transactions", label: "Transaction List Table", type: "table", required: true, coordinatesEnabled: true }
    ]
  },

  // 3. INSURANCE
  {
    code: "medical_claim_ca_v4",
    name: "Canada Medical Claim",
    category: "Insurance",
    description: "State-of-the-art parser for provincial and private Canadian healthcare claims.",
    strategy: ExtractionStrategy.LAYOUT_LLM,
    supportedRegions: ["CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "4.2.0",
    confidenceThreshold: 0.80,
    fields: [
      { key: "claim_number", label: "Claim Identifier", type: "string", required: true, coordinatesEnabled: true },
      { key: "patient_name", label: "Patient Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "provider_id", label: "Provider Registration", type: "string", required: true, coordinatesEnabled: true },
      { key: "diagnosis_code", label: "ICD Diagnosis Code", type: "string", required: true, coordinatesEnabled: true },
      { key: "procedure_list", label: "Procedures Table", type: "table", required: true, coordinatesEnabled: true }
    ]
  },

  // 4. HEALTHCARE
  {
    code: "prescription_parser_v2",
    name: "E-Prescription Recognizer",
    category: "Healthcare",
    description: "Layout-aware semantic parser for doctor prescriptions, dosages, and patient details.",
    strategy: ExtractionStrategy.LAYOUT_LLM,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "Spanish"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "google_doc_ai",
    version: "2.0.0",
    confidenceThreshold: 0.75,
    fields: [
      { key: "patient_name", label: "Patient Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "rx_date", label: "Prescription Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "medication_name", label: "Medication & Dosage", type: "string", required: true, coordinatesEnabled: true },
      { key: "doctor_signature", label: "Doctor Signature Presence", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },

  // 5. LEGAL
  {
    code: "nda_contract_v1",
    name: "NDA & Confidentiality Contract",
    category: "Legal",
    description: "Zero-shot contract extractor capturing parties, liabilities, laws, and bounds.",
    strategy: ExtractionStrategy.ZERO_SHOT_LLM,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "French", "German"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "gpt_vision",
    version: "1.0.0",
    confidenceThreshold: 0.78,
    fields: [
      { key: "contracting_parties", label: "Contracting Parties", type: "array", required: true, coordinatesEnabled: false },
      { key: "effective_date", label: "Effective Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "confidentiality_term", label: "Confidentiality Term", type: "string", required: true, coordinatesEnabled: false },
      { key: "governing_law", label: "Governing Law", type: "string", required: true, coordinatesEnabled: true }
    ]
  },

  // 6. LOGISTICS
  {
    code: "bill_of_lading_v1",
    name: "Bill of Lading Manifest",
    category: "Logistics",
    description: "Specialized shipping manifest, cargo codes, and freight logistics parser.",
    strategy: ExtractionStrategy.MULTI_STAGE,
    supportedRegions: ["Global"],
    supportedLanguages: ["English"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.1.0",
    confidenceThreshold: 0.83,
    fields: [
      { key: "bol_number", label: "BOL ID", type: "string", required: true, coordinatesEnabled: true },
      { key: "shipper", label: "Shipper Name & Address", type: "string", required: true, coordinatesEnabled: true },
      { key: "consignee", label: "Consignee Details", type: "string", required: true, coordinatesEnabled: true },
      { key: "cargo_items", label: "Cargo Items Table", type: "table", required: true, coordinatesEnabled: true }
    ]
  },

  // 7. HR DOCUMENTS
  {
    code: "resume_parser_v2",
    name: "Resume & Profile Parser",
    category: "HR Documents",
    description: "Cognitive layout parser for parsing candidate education, contact, skills, and histories.",
    strategy: ExtractionStrategy.LAYOUT_LLM,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "Spanish", "Multilingual"],
    supportsTables: false,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "google_vision",
    version: "2.1.0",
    confidenceThreshold: 0.80,
    fields: [
      { key: "fullname", label: "Candidate Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "email", label: "Email Address", type: "string", required: true, coordinatesEnabled: true },
      { key: "phone", label: "Phone Number", type: "string", required: false, coordinatesEnabled: true },
      { key: "skills", label: "Core Skills Array", type: "array", required: true, coordinatesEnabled: false },
      { key: "experience_years", label: "Years of Experience", type: "number", required: true, coordinatesEnabled: false }
    ]
  },

  // 8. GOVERNMENT
  {
    code: "tax_form_w2_us",
    name: "US W2 Tax Filing",
    category: "Government",
    description: "Regulatory tax extractor mapping employee wages, employer specs, and tax brackets.",
    strategy: ExtractionStrategy.TEMPLATE,
    supportedRegions: ["US"],
    supportedLanguages: ["English"],
    supportsTables: false,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: false,
    defaultOcrProvider: "google_vision",
    version: "2.0.0",
    confidenceThreshold: 0.95,
    fields: [
      { key: "social_security_number", label: "Employee SSN", type: "string", required: true, coordinatesEnabled: true },
      { key: "employer_ein", label: "Employer EIN", type: "string", required: true, coordinatesEnabled: true },
      { key: "wages_tips", label: "Wages & Tips", type: "number", required: true, coordinatesEnabled: true },
      { key: "fed_income_tax", label: "Federal Income Tax withheld", type: "number", required: true, coordinatesEnabled: true }
    ]
  },

  // 9. ENTERPRISE FORMS
  {
    code: "kyc_onboarding_form",
    name: "KYC & Onboarding Form",
    category: "Enterprise Forms",
    description: "Highly structural scanner for customer registration, checklists, and identity audits.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "Multilingual"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.85,
    fields: [
      { key: "customer_name", label: "Customer Full Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "verified_checklist", label: "Verification Checkbox Array", type: "table", required: true, coordinatesEnabled: true },
      { key: "customer_signature", label: "Customer Signature", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "tax_invoice_global_v2",
    name: "Tax Invoice Parser",
    category: "Financial Documents",
    description: "Global tax invoice parser for GST, VAT, HST, supplier tax IDs, totals, and line-item tax breakdowns.",
    strategy: ExtractionStrategy.MULTI_STAGE,
    supportedRegions: ["Global", "CA", "US", "UK", "EU", "IN", "AU"],
    supportedLanguages: ["English", "French", "German", "Spanish", "Multilingual"],
    supportsTables: true,
    supportsSignatures: false,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "2.0.0",
    confidenceThreshold: 0.86,
    fields: [
      { key: "tax_invoice_number", label: "Tax Invoice Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "invoice_date", label: "Invoice Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "supplier_name", label: "Supplier Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "supplier_tax_id", label: "Supplier Tax ID", type: "string", required: true, coordinatesEnabled: true },
      { key: "buyer_name", label: "Buyer Name", type: "string", required: false, coordinatesEnabled: true },
      { key: "line_items", label: "Taxed Line Items", type: "table", required: true, coordinatesEnabled: true },
      { key: "tax_summary", label: "Tax Summary", type: "table", required: true, coordinatesEnabled: true },
      { key: "grand_total", label: "Grand Total", type: "number", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "purchase_order_v1",
    name: "Purchase Order Parser",
    category: "Financial Documents",
    description: "Procurement document model for PO numbers, buyers, vendors, delivery terms, and ordered item tables.",
    strategy: ExtractionStrategy.TABLE_AI,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "Multilingual"],
    supportsTables: true,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "aws_textract",
    version: "1.0.0",
    confidenceThreshold: 0.84,
    fields: [
      { key: "po_number", label: "Purchase Order Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "po_date", label: "Purchase Order Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "buyer", label: "Buyer", type: "string", required: true, coordinatesEnabled: true },
      { key: "vendor", label: "Vendor", type: "string", required: true, coordinatesEnabled: true },
      { key: "ship_to", label: "Ship To Address", type: "string", required: false, coordinatesEnabled: true },
      { key: "ordered_items", label: "Ordered Items", type: "table", required: true, coordinatesEnabled: true },
      { key: "total_amount", label: "Total Amount", type: "number", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "utility_bill_v1",
    name: "Utility Bill Parser",
    category: "Financial Documents",
    description: "Electricity, gas, telecom, and water bill parser for account, service address, usage, due date, and amount due.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["Global", "CA", "US", "UK", "EU"],
    supportedLanguages: ["English", "French", "Spanish"],
    supportsTables: true,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: false,
    defaultOcrProvider: "google_doc_ai",
    version: "1.0.0",
    confidenceThreshold: 0.83,
    fields: [
      { key: "account_number", label: "Account Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "provider_name", label: "Provider Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "service_address", label: "Service Address", type: "string", required: true, coordinatesEnabled: true },
      { key: "billing_period", label: "Billing Period", type: "string", required: true, coordinatesEnabled: true },
      { key: "usage_summary", label: "Usage Summary", type: "table", required: false, coordinatesEnabled: true },
      { key: "due_date", label: "Due Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "amount_due", label: "Amount Due", type: "number", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "credit_card_statement_v1",
    name: "Credit Card Statement",
    category: "Financial Documents",
    description: "Credit card statement model for cardholder, statement period, payment due, balances, and transaction tables.",
    strategy: ExtractionStrategy.TABLE_AI,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "French"],
    supportsTables: true,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "aws_textract",
    version: "1.0.0",
    confidenceThreshold: 0.88,
    fields: [
      { key: "cardholder_name", label: "Cardholder Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "masked_card_number", label: "Masked Card Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "statement_period", label: "Statement Period", type: "string", required: true, coordinatesEnabled: true },
      { key: "payment_due_date", label: "Payment Due Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "minimum_payment", label: "Minimum Payment", type: "number", required: true, coordinatesEnabled: true },
      { key: "statement_balance", label: "Statement Balance", type: "number", required: true, coordinatesEnabled: true },
      { key: "transactions", label: "Transactions", type: "table", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "insurance_policy_v1",
    name: "Insurance Policy Document",
    category: "Insurance",
    description: "Policy document parser for policyholder, coverage, premium, effective dates, riders, and exclusions.",
    strategy: ExtractionStrategy.LAYOUT_LLM,
    supportedRegions: ["Global", "CA", "US", "UK"],
    supportedLanguages: ["English", "French"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.82,
    fields: [
      { key: "policy_number", label: "Policy Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "policyholder", label: "Policyholder", type: "string", required: true, coordinatesEnabled: true },
      { key: "insured_party", label: "Insured Party", type: "string", required: false, coordinatesEnabled: true },
      { key: "coverage_type", label: "Coverage Type", type: "string", required: true, coordinatesEnabled: true },
      { key: "effective_date", label: "Effective Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "expiry_date", label: "Expiry Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "premium_amount", label: "Premium Amount", type: "number", required: true, coordinatesEnabled: true },
      { key: "coverage_limits", label: "Coverage Limits", type: "table", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "eob_statement_v1",
    name: "Explanation of Benefits",
    category: "Insurance",
    description: "EOB parser for payer, member, provider, services, claim status, patient responsibility, and adjustments.",
    strategy: ExtractionStrategy.TABLE_AI,
    supportedRegions: ["US", "CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: true,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.84,
    fields: [
      { key: "member_id", label: "Member ID", type: "string", required: true, coordinatesEnabled: true },
      { key: "claim_number", label: "Claim Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "patient_name", label: "Patient Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "provider_name", label: "Provider Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "service_lines", label: "Service Lines", type: "table", required: true, coordinatesEnabled: true },
      { key: "allowed_amount", label: "Allowed Amount", type: "number", required: false, coordinatesEnabled: true },
      { key: "patient_responsibility", label: "Patient Responsibility", type: "number", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "lab_report_v1",
    name: "Clinical Lab Report",
    category: "Healthcare",
    description: "Clinical lab report parser for patient demographics, specimen details, test panels, values, and reference ranges.",
    strategy: ExtractionStrategy.TABLE_AI,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "French", "Spanish"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "google_doc_ai",
    version: "1.0.0",
    confidenceThreshold: 0.86,
    fields: [
      { key: "patient_name", label: "Patient Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "patient_id", label: "Patient ID", type: "string", required: true, coordinatesEnabled: true },
      { key: "collection_date", label: "Collection Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "report_date", label: "Report Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "ordering_provider", label: "Ordering Provider", type: "string", required: false, coordinatesEnabled: true },
      { key: "test_results", label: "Test Results", type: "table", required: true, coordinatesEnabled: true },
      { key: "abnormal_flags", label: "Abnormal Flags", type: "array", required: false, coordinatesEnabled: false }
    ]
  },
  {
    code: "discharge_summary_v1",
    name: "Hospital Discharge Summary",
    category: "Healthcare",
    description: "Healthcare summary model for admission, discharge, diagnosis, procedures, medications, and follow-up instructions.",
    strategy: ExtractionStrategy.LAYOUT_LLM,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "French", "Spanish"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "gpt_vision",
    version: "1.0.0",
    confidenceThreshold: 0.78,
    fields: [
      { key: "patient_name", label: "Patient Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "medical_record_number", label: "Medical Record Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "admission_date", label: "Admission Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "discharge_date", label: "Discharge Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "diagnoses", label: "Diagnoses", type: "array", required: true, coordinatesEnabled: false },
      { key: "procedures", label: "Procedures", type: "array", required: false, coordinatesEnabled: false },
      { key: "medications", label: "Discharge Medications", type: "table", required: false, coordinatesEnabled: true },
      { key: "follow_up", label: "Follow-up Instructions", type: "string", required: false, coordinatesEnabled: false }
    ]
  },
  {
    code: "id_card_global_v1",
    name: "National ID Card",
    category: "Identity Documents",
    description: "Generic national ID card parser for ID number, name, date of birth, gender, address, photo, and expiry.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "French", "Spanish", "Multilingual"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.86,
    fields: [
      { key: "id_number", label: "ID Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "full_name", label: "Full Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "gender", label: "Gender", type: "string", required: false, coordinatesEnabled: true },
      { key: "address", label: "Address", type: "string", required: false, coordinatesEnabled: true },
      { key: "issue_date", label: "Issue Date", type: "date", required: false, coordinatesEnabled: true },
      { key: "expiry_date", label: "Expiry Date", type: "date", required: false, coordinatesEnabled: true },
      { key: "photo_present", label: "Photo Present", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "permanent_resident_card_v1",
    name: "Permanent Resident Card",
    category: "Identity Documents",
    description: "Permanent resident card parser for card number, UCI or resident number, name, nationality, dates, and MRZ.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["CA", "US", "Global"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.88,
    fields: [
      { key: "card_number", label: "Card Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "resident_number", label: "Resident Number", type: "string", required: false, coordinatesEnabled: true },
      { key: "surname", label: "Surname", type: "string", required: true, coordinatesEnabled: true },
      { key: "given_names", label: "Given Names", type: "string", required: true, coordinatesEnabled: true },
      { key: "nationality", label: "Nationality", type: "string", required: false, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "expiry_date", label: "Expiry Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "mrz", label: "MRZ", type: "string", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "canada_pr_card_v1",
    name: "Canada PR Card",
    category: "Identity Documents",
    description: "Canada permanent resident card parser for UCI, card number, name, nationality, dates, sex, photo, signature, and MRZ.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.89,
    fields: [
      { key: "uci", label: "UCI", type: "string", required: true, coordinatesEnabled: true },
      { key: "card_number", label: "Card Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "surname", label: "Surname", type: "string", required: true, coordinatesEnabled: true },
      { key: "given_names", label: "Given Names", type: "string", required: true, coordinatesEnabled: true },
      { key: "sex", label: "Sex", type: "string", required: false, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "expiry_date", label: "Expiry Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "nationality", label: "Nationality", type: "string", required: false, coordinatesEnabled: true },
      { key: "mrz", label: "MRZ", type: "string", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "us_green_card_v1",
    name: "US Green Card",
    category: "Identity Documents",
    description: "United States permanent resident card parser for USCIS number, category, resident since date, expiration, name, country of birth, and MRZ.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["US"],
    supportedLanguages: ["English"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.89,
    fields: [
      { key: "uscis_number", label: "USCIS Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "card_number", label: "Card Number", type: "string", required: false, coordinatesEnabled: true },
      { key: "surname", label: "Surname", type: "string", required: true, coordinatesEnabled: true },
      { key: "given_names", label: "Given Names", type: "string", required: true, coordinatesEnabled: true },
      { key: "category", label: "Category", type: "string", required: true, coordinatesEnabled: true },
      { key: "country_of_birth", label: "Country of Birth", type: "string", required: false, coordinatesEnabled: true },
      { key: "resident_since", label: "Resident Since", type: "date", required: false, coordinatesEnabled: true },
      { key: "expiration_date", label: "Expiration Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "mrz", label: "MRZ", type: "string", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "canada_health_card_v1",
    name: "Canada Health Card",
    category: "Identity Documents",
    description: "Canadian provincial health card parser for health number, version code, name, date of birth, sex, province, and expiry.",
    strategy: ExtractionStrategy.TEMPLATE,
    supportedRegions: ["CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: false,
    defaultOcrProvider: "google_vision",
    version: "1.0.0",
    confidenceThreshold: 0.86,
    fields: [
      { key: "health_number", label: "Health Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "version_code", label: "Version Code", type: "string", required: false, coordinatesEnabled: true },
      { key: "full_name", label: "Full Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "sex", label: "Sex", type: "string", required: false, coordinatesEnabled: true },
      { key: "province", label: "Province", type: "string", required: false, coordinatesEnabled: true },
      { key: "expiry_date", label: "Expiry Date", type: "date", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "canada_work_permit_v1",
    name: "Canada Work Permit",
    category: "Government",
    description: "Canadian work permit parser for UCI, document number, applicant name, employer, occupation, conditions, issue, and expiry dates.",
    strategy: ExtractionStrategy.LAYOUT_LLM,
    supportedRegions: ["CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.84,
    fields: [
      { key: "uci", label: "UCI", type: "string", required: true, coordinatesEnabled: true },
      { key: "document_number", label: "Document Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "family_name", label: "Family Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "given_names", label: "Given Names", type: "string", required: true, coordinatesEnabled: true },
      { key: "employer", label: "Employer", type: "string", required: false, coordinatesEnabled: true },
      { key: "occupation", label: "Occupation", type: "string", required: false, coordinatesEnabled: true },
      { key: "conditions", label: "Conditions", type: "string", required: false, coordinatesEnabled: false },
      { key: "issue_date", label: "Issue Date", type: "date", required: false, coordinatesEnabled: true },
      { key: "expiry_date", label: "Expiry Date", type: "date", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "voter_id_india_v1",
    name: "India Voter ID",
    category: "Identity Documents",
    description: "India voter ID parser for EPIC number, elector name, relation name, gender, age, and constituency details.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["IN"],
    supportedLanguages: ["English", "Hindi", "Regional"],
    supportsTables: false,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "paddleocr",
    version: "1.0.0",
    confidenceThreshold: 0.82,
    fields: [
      { key: "epic_number", label: "EPIC Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "elector_name", label: "Elector Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "relation_name", label: "Relation Name", type: "string", required: false, coordinatesEnabled: true },
      { key: "gender", label: "Gender", type: "string", required: false, coordinatesEnabled: true },
      { key: "age_or_dob", label: "Age or Date of Birth", type: "string", required: false, coordinatesEnabled: true },
      { key: "constituency", label: "Constituency", type: "string", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "pan_card_india_v1",
    name: "India PAN Card",
    category: "Identity Documents",
    description: "India PAN card parser for PAN number, holder name, parent name, date of birth, signature, and photo.",
    strategy: ExtractionStrategy.TEMPLATE,
    supportedRegions: ["IN"],
    supportedLanguages: ["English", "Hindi"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: false,
    defaultOcrProvider: "google_vision",
    version: "1.0.0",
    confidenceThreshold: 0.88,
    fields: [
      { key: "pan_number", label: "PAN Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "name", label: "Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "parent_name", label: "Father or Parent Name", type: "string", required: false, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "signature_present", label: "Signature Present", type: "boolean", required: false, coordinatesEnabled: true },
      { key: "photo_present", label: "Photo Present", type: "boolean", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "mortgage_application_v1",
    name: "Mortgage Application",
    category: "Enterprise Forms",
    description: "Mortgage intake model for borrower details, employment, property, income, liabilities, declarations, and signatures.",
    strategy: ExtractionStrategy.MULTI_STAGE,
    supportedRegions: ["US", "CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.80,
    fields: [
      { key: "borrower_name", label: "Borrower Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "co_borrower_name", label: "Co-borrower Name", type: "string", required: false, coordinatesEnabled: true },
      { key: "property_address", label: "Property Address", type: "string", required: true, coordinatesEnabled: true },
      { key: "loan_amount", label: "Loan Amount", type: "number", required: true, coordinatesEnabled: true },
      { key: "income_details", label: "Income Details", type: "table", required: true, coordinatesEnabled: true },
      { key: "liabilities", label: "Liabilities", type: "table", required: false, coordinatesEnabled: true },
      { key: "borrower_signature", label: "Borrower Signature", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "account_opening_form_v1",
    name: "Account Opening Form",
    category: "Enterprise Forms",
    description: "Bank account opening form parser for applicant identity, address, account type selections, nominees, and signatures.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["Global", "IN", "CA", "US"],
    supportedLanguages: ["English", "Multilingual"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.83,
    fields: [
      { key: "applicant_name", label: "Applicant Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "date_of_birth", label: "Date of Birth", type: "date", required: true, coordinatesEnabled: true },
      { key: "address", label: "Address", type: "string", required: true, coordinatesEnabled: true },
      { key: "id_number", label: "Identity Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "account_types", label: "Selected Account Types", type: "array", required: true, coordinatesEnabled: true },
      { key: "nominee_details", label: "Nominee Details", type: "table", required: false, coordinatesEnabled: true },
      { key: "signature_present", label: "Signature Present", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "direct_deposit_form_v1",
    name: "Direct Deposit Form",
    category: "Enterprise Forms",
    description: "Direct deposit and payroll banking form parser for account holder, transit, institution, account, and authorization signature.",
    strategy: ExtractionStrategy.TEMPLATE,
    supportedRegions: ["US", "CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: false,
    defaultOcrProvider: "google_vision",
    version: "1.0.0",
    confidenceThreshold: 0.86,
    fields: [
      { key: "account_holder", label: "Account Holder", type: "string", required: true, coordinatesEnabled: true },
      { key: "bank_name", label: "Bank Name", type: "string", required: false, coordinatesEnabled: true },
      { key: "transit_number", label: "Transit Number", type: "string", required: false, coordinatesEnabled: true },
      { key: "institution_number", label: "Institution Number", type: "string", required: false, coordinatesEnabled: true },
      { key: "routing_number", label: "Routing Number", type: "string", required: false, coordinatesEnabled: true },
      { key: "account_number", label: "Account Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "authorization_signature", label: "Authorization Signature", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "employment_application_v1",
    name: "Employment Application",
    category: "HR Documents",
    description: "Job application parser for applicant details, work history, education, references, consent, and signature.",
    strategy: ExtractionStrategy.MULTI_STAGE,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "Spanish", "French"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.80,
    fields: [
      { key: "applicant_name", label: "Applicant Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "email", label: "Email", type: "string", required: true, coordinatesEnabled: true },
      { key: "phone", label: "Phone", type: "string", required: true, coordinatesEnabled: true },
      { key: "position_applied", label: "Position Applied", type: "string", required: true, coordinatesEnabled: true },
      { key: "work_history", label: "Work History", type: "table", required: false, coordinatesEnabled: true },
      { key: "education", label: "Education", type: "table", required: false, coordinatesEnabled: true },
      { key: "references", label: "References", type: "table", required: false, coordinatesEnabled: true },
      { key: "signature_present", label: "Signature Present", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "pay_stub_v1",
    name: "Pay Stub Parser",
    category: "HR Documents",
    description: "Payroll stub parser for employee, employer, pay period, gross pay, deductions, taxes, and net pay.",
    strategy: ExtractionStrategy.TABLE_AI,
    supportedRegions: ["US", "CA", "Global"],
    supportedLanguages: ["English", "French"],
    supportsTables: true,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "aws_textract",
    version: "1.0.0",
    confidenceThreshold: 0.87,
    fields: [
      { key: "employee_name", label: "Employee Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "employer_name", label: "Employer Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "pay_period", label: "Pay Period", type: "string", required: true, coordinatesEnabled: true },
      { key: "pay_date", label: "Pay Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "gross_pay", label: "Gross Pay", type: "number", required: true, coordinatesEnabled: true },
      { key: "deductions", label: "Deductions", type: "table", required: false, coordinatesEnabled: true },
      { key: "net_pay", label: "Net Pay", type: "number", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "offer_letter_v1",
    name: "Offer Letter",
    category: "HR Documents",
    description: "Employment offer letter parser for candidate, role, compensation, start date, terms, and signature acceptance.",
    strategy: ExtractionStrategy.LAYOUT_LLM,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "gpt_vision",
    version: "1.0.0",
    confidenceThreshold: 0.78,
    fields: [
      { key: "candidate_name", label: "Candidate Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "position_title", label: "Position Title", type: "string", required: true, coordinatesEnabled: true },
      { key: "start_date", label: "Start Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "salary", label: "Salary", type: "number", required: false, coordinatesEnabled: true },
      { key: "employment_type", label: "Employment Type", type: "string", required: false, coordinatesEnabled: true },
      { key: "acceptance_signature", label: "Acceptance Signature", type: "boolean", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "lease_agreement_v1",
    name: "Lease Agreement",
    category: "Legal",
    description: "Lease contract parser for landlord, tenant, property, dates, rent, deposit, terms, and signatures.",
    strategy: ExtractionStrategy.LAYOUT_LLM,
    supportedRegions: ["Global", "CA", "US", "UK"],
    supportedLanguages: ["English", "French", "Spanish"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "gpt_vision",
    version: "1.0.0",
    confidenceThreshold: 0.80,
    fields: [
      { key: "landlord", label: "Landlord", type: "string", required: true, coordinatesEnabled: true },
      { key: "tenant", label: "Tenant", type: "string", required: true, coordinatesEnabled: true },
      { key: "property_address", label: "Property Address", type: "string", required: true, coordinatesEnabled: true },
      { key: "lease_start", label: "Lease Start", type: "date", required: true, coordinatesEnabled: true },
      { key: "lease_end", label: "Lease End", type: "date", required: false, coordinatesEnabled: true },
      { key: "monthly_rent", label: "Monthly Rent", type: "number", required: true, coordinatesEnabled: true },
      { key: "security_deposit", label: "Security Deposit", type: "number", required: false, coordinatesEnabled: true },
      { key: "signatures_present", label: "Signatures Present", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "power_of_attorney_v1",
    name: "Power of Attorney",
    category: "Legal",
    description: "Power of attorney parser for grantor, attorney, authority scope, effective dates, witnesses, notary, and signatures.",
    strategy: ExtractionStrategy.LAYOUT_LLM,
    supportedRegions: ["Global", "US", "CA", "UK"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "gpt_vision",
    version: "1.0.0",
    confidenceThreshold: 0.80,
    fields: [
      { key: "grantor", label: "Grantor", type: "string", required: true, coordinatesEnabled: true },
      { key: "attorney_or_agent", label: "Attorney or Agent", type: "string", required: true, coordinatesEnabled: true },
      { key: "authority_scope", label: "Authority Scope", type: "string", required: true, coordinatesEnabled: false },
      { key: "effective_date", label: "Effective Date", type: "date", required: false, coordinatesEnabled: true },
      { key: "witnesses", label: "Witnesses", type: "array", required: false, coordinatesEnabled: true },
      { key: "notary_present", label: "Notary Present", type: "boolean", required: false, coordinatesEnabled: true },
      { key: "signatures_present", label: "Signatures Present", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "commercial_invoice_v1",
    name: "Commercial Invoice",
    category: "Logistics",
    description: "Cross-border commercial invoice parser for exporter, importer, shipment, incoterms, commodity lines, values, and origin.",
    strategy: ExtractionStrategy.TABLE_AI,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "French", "Spanish", "Multilingual"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.84,
    fields: [
      { key: "invoice_number", label: "Invoice Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "exporter", label: "Exporter", type: "string", required: true, coordinatesEnabled: true },
      { key: "importer", label: "Importer", type: "string", required: true, coordinatesEnabled: true },
      { key: "country_of_origin", label: "Country of Origin", type: "string", required: false, coordinatesEnabled: true },
      { key: "incoterms", label: "Incoterms", type: "string", required: false, coordinatesEnabled: true },
      { key: "commodity_lines", label: "Commodity Lines", type: "table", required: true, coordinatesEnabled: true },
      { key: "total_value", label: "Total Value", type: "number", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "packing_list_v1",
    name: "Packing List",
    category: "Logistics",
    description: "Packing list parser for shipper, consignee, package counts, weights, dimensions, and itemized package tables.",
    strategy: ExtractionStrategy.TABLE_AI,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "Multilingual"],
    supportsTables: true,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: true,
    defaultOcrProvider: "aws_textract",
    version: "1.0.0",
    confidenceThreshold: 0.84,
    fields: [
      { key: "packing_list_number", label: "Packing List Number", type: "string", required: false, coordinatesEnabled: true },
      { key: "shipper", label: "Shipper", type: "string", required: true, coordinatesEnabled: true },
      { key: "consignee", label: "Consignee", type: "string", required: true, coordinatesEnabled: true },
      { key: "shipment_date", label: "Shipment Date", type: "date", required: false, coordinatesEnabled: true },
      { key: "package_count", label: "Package Count", type: "number", required: true, coordinatesEnabled: true },
      { key: "gross_weight", label: "Gross Weight", type: "number", required: false, coordinatesEnabled: true },
      { key: "package_items", label: "Package Items", type: "table", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "customs_declaration_v1",
    name: "Customs Declaration",
    category: "Government",
    description: "Customs declaration parser for declarant, shipment, HS codes, duties, values, origin, and certification signature.",
    strategy: ExtractionStrategy.MULTI_STAGE,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "French", "Spanish", "Multilingual"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.82,
    fields: [
      { key: "declaration_number", label: "Declaration Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "declarant", label: "Declarant", type: "string", required: true, coordinatesEnabled: true },
      { key: "importer_exporter", label: "Importer or Exporter", type: "string", required: true, coordinatesEnabled: true },
      { key: "shipment_reference", label: "Shipment Reference", type: "string", required: false, coordinatesEnabled: true },
      { key: "customs_items", label: "Customs Items", type: "table", required: true, coordinatesEnabled: true },
      { key: "total_duty", label: "Total Duty", type: "number", required: false, coordinatesEnabled: true },
      { key: "certification_signature", label: "Certification Signature", type: "boolean", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "irs_1040_us_v1",
    name: "US IRS Form 1040",
    category: "Government",
    description: "US personal tax return parser for taxpayer, filing status, income, deductions, credits, refund, and amount owed.",
    strategy: ExtractionStrategy.TEMPLATE,
    supportedRegions: ["US"],
    supportedLanguages: ["English"],
    supportsTables: true,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: false,
    defaultOcrProvider: "google_vision",
    version: "1.0.0",
    confidenceThreshold: 0.92,
    fields: [
      { key: "taxpayer_name", label: "Taxpayer Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "ssn", label: "SSN", type: "string", required: true, coordinatesEnabled: true },
      { key: "filing_status", label: "Filing Status", type: "string", required: true, coordinatesEnabled: true },
      { key: "total_income", label: "Total Income", type: "number", required: true, coordinatesEnabled: true },
      { key: "taxable_income", label: "Taxable Income", type: "number", required: true, coordinatesEnabled: true },
      { key: "refund_amount", label: "Refund Amount", type: "number", required: false, coordinatesEnabled: true },
      { key: "amount_owed", label: "Amount Owed", type: "number", required: false, coordinatesEnabled: true },
      { key: "signature_present", label: "Signature Present", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  },
  {
    code: "canada_t4_v1",
    name: "Canada T4 Slip",
    category: "Government",
    description: "Canadian T4 slip parser for employer, employee, SIN, employment income, CPP, EI, and tax deductions.",
    strategy: ExtractionStrategy.TEMPLATE,
    supportedRegions: ["CA"],
    supportedLanguages: ["English", "French"],
    supportsTables: false,
    supportsSignatures: false,
    supportsHandwriting: false,
    requiresGpu: false,
    defaultOcrProvider: "google_vision",
    version: "1.0.0",
    confidenceThreshold: 0.92,
    fields: [
      { key: "employee_name", label: "Employee Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "sin", label: "Social Insurance Number", type: "string", required: true, coordinatesEnabled: true },
      { key: "employer_name", label: "Employer Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "employment_income", label: "Employment Income", type: "number", required: true, coordinatesEnabled: true },
      { key: "income_tax_deducted", label: "Income Tax Deducted", type: "number", required: true, coordinatesEnabled: true },
      { key: "cpp_contributions", label: "CPP Contributions", type: "number", required: false, coordinatesEnabled: true },
      { key: "ei_premiums", label: "EI Premiums", type: "number", required: false, coordinatesEnabled: true }
    ]
  },
  {
    code: "consent_form_v1",
    name: "Consent Form",
    category: "Enterprise Forms",
    description: "Consent and authorization parser for participant, consent scope, selected options, guardian, date, and signatures.",
    strategy: ExtractionStrategy.HYBRID,
    supportedRegions: ["Global"],
    supportedLanguages: ["English", "French", "Spanish"],
    supportsTables: false,
    supportsSignatures: true,
    supportsHandwriting: true,
    requiresGpu: true,
    defaultOcrProvider: "azure_di",
    version: "1.0.0",
    confidenceThreshold: 0.80,
    fields: [
      { key: "participant_name", label: "Participant Name", type: "string", required: true, coordinatesEnabled: true },
      { key: "consent_scope", label: "Consent Scope", type: "string", required: true, coordinatesEnabled: false },
      { key: "selected_options", label: "Selected Options", type: "array", required: false, coordinatesEnabled: true },
      { key: "guardian_name", label: "Guardian Name", type: "string", required: false, coordinatesEnabled: true },
      { key: "consent_date", label: "Consent Date", type: "date", required: true, coordinatesEnabled: true },
      { key: "signature_present", label: "Signature Present", type: "boolean", required: true, coordinatesEnabled: true }
    ]
  }
];
