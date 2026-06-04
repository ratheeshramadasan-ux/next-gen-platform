export type StudioNodeType = 
  | 'recording' 
  | 'click' 
  | 'type' 
  | 'navigation' 
  | 'extract' 
  | 'api_call' 
  | 'excel_read'
  | 'if' 
  | 'loop' 
  | 'agent' 
  | 'center_task';

export interface StudioNodeConfig {
  [key: string]: any;
  // Common properties
  timeout?: number;
  retryPolicy?: 'none' | 'on_failure' | 'exponential';
  errorHandling?: 'stop' | 'continue' | 'retry';
  
  // Specific properties
  endpoint?: string; // for api_call
  prompt?: string; // for agent
  selector?: string; // for click/type
  file?: string; // for excel_read
  condition?: string; // for if
}

export interface StudioNode {
  id: string;
  type: StudioNodeType;
  name: string;
  config: StudioNodeConfig;
  position: { x: number; y: number };
  outputs?: string[]; // variable names
  inputs?: string[]; // variable names
}

export interface StudioConnection {
  id: string;
  from: string;
  to: string;
  condition?: 'YES' | 'NO' | 'DEFAULT';
}

export interface StudioWorkflowJson {
  workflowId: string;
  name: string;
  description?: string;
  version: string;
  nodes: StudioNode[];
  connections: StudioConnection[];
  variables: Array<{
    name: string;
    type: string;
    defaultValue?: any;
    scope: 'GLOBAL' | 'WORKFLOW';
  }>;
}

export interface DynamicSelector {
  type: 'webctrl' | 'uiapp' | 'java' | 'sap';
  base: string;
  dynamic?: string;
  fallbacks: string[];
}
