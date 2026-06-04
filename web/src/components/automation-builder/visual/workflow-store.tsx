"use client";

import React, { createContext, useContext, useReducer, useCallback } from "react";
import { 
  Node, 
  Edge, 
  OnNodesChange, 
  OnEdgesChange, 
  applyNodeChanges, 
  applyEdgeChanges, 
  Connection, 
  addEdge,
  NodeChange,
  EdgeChange
} from "@xyflow/react";

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  logs: { timestamp: string; level: "INFO" | "WARN" | "ERROR"; message: string }[];
  isExecuting: boolean;
  isValid: boolean;
}

type WorkflowAction =
  | { type: "SET_NODES"; payload: Node[] }
  | { type: "ON_NODES_CHANGE"; payload: NodeChange[] }
  | { type: "ON_EDGES_CHANGE"; payload: EdgeChange[] }
  | { type: "ON_CONNECT"; payload: Connection }
  | { type: "SELECT_NODE"; payload: string | null }
  | { type: "ADD_NODE"; payload: Node }
  | { type: "UPDATE_NODE_CONFIG"; payload: { id: string; config: any } }
  | { type: "ADD_LOG"; payload: { level: "INFO" | "WARN" | "ERROR"; message: string } }
  | { type: "SET_EXECUTING"; payload: boolean }
  | { type: "CLEAR_LOGS" }
  | { type: "EXECUTION_START" }
  | { type: "EXECUTION_SUCCESS" }
  | { type: "EXECUTION_FAILED"; payload: string };

const WorkflowContext = createContext<{
  state: WorkflowState;
  dispatch: React.Dispatch<WorkflowAction>;
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (params: Connection) => void;
} | null>(null);

function workflowReducer(state: WorkflowState, action: WorkflowAction): WorkflowState {
  switch (action.type) {
    case "ON_NODES_CHANGE":
      return { ...state, nodes: applyNodeChanges(action.payload, state.nodes) };
    case "ON_EDGES_CHANGE":
      return { ...state, edges: applyEdgeChanges(action.payload, state.edges) };
    case "ON_CONNECT":
      return { ...state, edges: addEdge(action.payload, state.edges) };
    case "SELECT_NODE":
      return { ...state, selectedNodeId: action.payload };
    case "ADD_NODE":
      return { ...state, nodes: [...state.nodes, action.payload] };
    case "UPDATE_NODE_CONFIG":
      return {
        ...state,
        nodes: state.nodes.map((node) =>
          node.id === action.payload.id ? { ...node, data: { ...node.data, config: action.payload.config } } : node
        ),
      };
    case "ADD_LOG":
      return {
        ...state,
        logs: [...state.logs, { timestamp: new Date().toLocaleTimeString(), ...action.payload }],
      };
    case "SET_EXECUTING":
      return { ...state, isExecuting: action.payload };
    case "CLEAR_LOGS":
      return { ...state, logs: [] };
    case "EXECUTION_START":
      return { ...state, isExecuting: true, logs: [{ timestamp: new Date().toLocaleTimeString(), level: "INFO", message: "Kernel: Initializing Sovereign Execution..." }] };
    case "EXECUTION_SUCCESS":
      return { ...state, isExecuting: false };
    case "EXECUTION_FAILED":
      return { ...state, isExecuting: false, logs: [...state.logs, { timestamp: new Date().toLocaleTimeString(), level: "ERROR", message: `Terminal Failure: ${action.payload}` }] };
    default:
      return state;
  }
}

export const WorkflowProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(workflowReducer, {
    nodes: [],
    edges: [],
    selectedNodeId: null,
    logs: [],
    isExecuting: false,
    isValid: true,
  });

  const onNodesChange: OnNodesChange = useCallback((changes) => dispatch({ type: "ON_NODES_CHANGE", payload: changes }), []);
  const onEdgesChange: OnEdgesChange = useCallback((changes) => dispatch({ type: "ON_EDGES_CHANGE", payload: changes }), []);
  const onConnect = useCallback((params: Connection) => dispatch({ type: "ON_CONNECT", payload: params }), []);

  return (
    <WorkflowContext.Provider value={{ state, dispatch, onNodesChange, onEdgesChange, onConnect }}>
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) throw new Error("useWorkflow must be used within WorkflowProvider");
  return context;
};
