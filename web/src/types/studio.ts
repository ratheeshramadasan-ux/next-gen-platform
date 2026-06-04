export type ActivityType = 'event' | 'task' | 'gateway' | 'subprocess';

export type ActivitySubType = 
  | 'start' | 'intermediate' | 'end' // Events
  | 'userTask' | 'serviceTask' | 'scriptTask' | 'businessRuleTask' // Tasks
  | 'xorGateway' | 'andGateway' | 'orGateway' | 'eventGateway' // Gateways
  | 'tryCatch' | 'throwError' | 'break' // Error Handling & Flow Control
  | 'collapsedSubprocess' | 'expandedSubprocess'; // Subprocesses

export type ActivityCategory = 
  | 'UI' | 'API' | 'System' | 'Office365' | 'SAP' | 'OCR' 
  | 'Security' | 'PDF' | 'Data' | 'VM' | 'Logic' | 'Other';

export interface ActivityProperties {
  timeout: number;
  retryCount: number;
  retryInterval: number;
  continueOnError: boolean;
  delayBefore: number;
  delayAfter: number;
  logLevel: 'Verbose' | 'Debug' | 'Info' | 'Warning' | 'Error';
  takeScreenshotOnError: boolean;
}

export interface NodeTheme {
  bgColor: string;
  borderColor: string;
  iconColor: string;
}

export interface NodeExecution {
  async: boolean;
  retry: number;
  timeout: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
}

export interface NodeAudit {
  createdBy: string;
  createdOn: string;
  version: number;
}

export interface RiskMetadata {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  category?: 'Financial' | 'Operational' | 'Security' | 'Compliance' | 'Data';
  impact?: number; // 1-5
  likelihood?: number; // 1-5
  rpn?: number; // Risk Priority Number
  description?: string;
  why?: string;
  patterns?: string;
  mitigation?: string;
  supportNotes?: string;
  disabled?: boolean;
}

export interface UniversalActivity {
  id: string;
  activityId?: string; // System-level identifier
  type: ActivityType;
  subType: ActivitySubType;
  category: ActivityCategory;
  label: string;
  description?: string;
  icon?: string;
  theme?: {
    bgColor?: string;
    borderColor?: string;
    iconColor?: string;
  };
  position?: { x: number; y: number };
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  properties: ActivityProperties;
  execution: Record<string, any>;
  risk?: RiskMetadata;
  onSuccess?: string; // nextNodeId
  onFailure?: string; // errorNodeId
  parallelBranches?: string[]; // array of branch flow IDs or node IDs
  audit?: {
    createdBy: string;
    createdOn: string;
    version: number;
  };
  [key: string]: any; // Add index signature for React Flow compatibility
}

export interface StudioThemeTokens {
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  background: string;
  node: {
    task: string;
    event: string;
    gateway: string;
    subprocess: string;
  };
  [key: string]: any;
}

export interface ElementMetadata {
  selector?: string;
  text?: string;
  tag?: string;
  class?: string;
  attributes?: Record<string, string>;
  position?: { x: number; y: number };
}

export interface SelectorModel {
  primary: string;
  fallbacks: ElementMetadata[];
  context?: {
    parent?: string;
    nearbyText?: string;
  };
}

export const DEFAULT_STUDIO_THEME = {
  primary: "var(--primary)",
  node: {
    event: "var(--primary)",
    task: "var(--primary)",
    gateway: "var(--primary)",
    subprocess: "var(--primary)",
  } as Record<string, string>,
  edge: {
    sequence: "var(--primary)",
    message: "var(--muted-foreground)",
    association: "var(--border)",
  } as Record<string, string>
};
