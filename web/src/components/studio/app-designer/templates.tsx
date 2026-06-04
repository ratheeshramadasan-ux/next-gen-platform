import { 
  Headset, 
  ShieldCheck, 
  Wallet, 
  FileText, 
  Layout, 
  BarChart3, 
  UserCheck, 
  Activity,
  HeartPulse,
  TrendingUp,
  CreditCard,
  ClipboardList
} from "lucide-react";

export interface AppTemplate {
  id: string;
  name: string;
  description: string;
  industry: "Insurance" | "Banking" | "Customer Service" | "General";
  icon: any;
  thumbnailColor: string;
}

export const TEMPLATES: AppTemplate[] = [
  {
    id: "call-center-360",
    name: "Call Center Agent 360",
    description: "Omni-channel console with customer history, sentiment analysis, and quick resolution tools.",
    industry: "Customer Service",
    icon: Headset,
    thumbnailColor: "bg-blue-500"
  },
  {
    id: "insurance-claim-nexus",
    name: "Insurance Claim Nexus",
    description: "End-to-end claim processing hub with fraud detection, document verification, and payout logic.",
    industry: "Insurance",
    icon: ShieldCheck,
    thumbnailColor: "bg-emerald-500"
  },
  {
    id: "bank-kyc-onboarding",
    name: "Digital Banking Onboarding",
    description: "Multi-step KYC and AML verification workflow for new savings and credit account opening.",
    industry: "Banking",
    icon: Wallet,
    thumbnailColor: "bg-amber-500"
  },
  {
    id: "healthcare-patient-portal",
    name: "Patient Intake & Triage",
    description: "Healthcare provider portal for digital patient registration, symptom tracking, and appointment routing.",
    industry: "General",
    icon: HeartPulse,
    thumbnailColor: "bg-rose-500"
  },
  {
    id: "wealth-management-dashboard",
    name: "Wealth Portfolio Manager",
    description: "Investment management view with asset allocation charts, market trends, and risk profiling.",
    industry: "Banking",
    icon: TrendingUp,
    thumbnailColor: "bg-indigo-500"
  },
  {
    id: "mortgage-underwriting",
    name: "Mortgage Underwriting Tool",
    description: "Complex financial analysis tool for evaluating mortgage applications against lending criteria.",
    industry: "Banking",
    icon: ClipboardList,
    thumbnailColor: "bg-slate-500"
  }
];
