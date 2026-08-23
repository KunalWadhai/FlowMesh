export type NodeType =
  | 'http_request'
  | 'transform'
  | 'delay'
  | 'condition'
  | 'ai_agent'
  | 'log'
  | 'merge'
  | 'split';

export interface WorkflowNodeConfig {
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;
  expression?: string;
  delayMs?: number;
  condition?: string;
  trueEdge?: string;
  falseEdge?: string;
  prompt?: string;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;
  message?: string;
  level?: 'info' | 'warn' | 'error';
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  description?: string;
  position: { x: number; y: number };
  config: WorkflowNodeConfig;
  retryPolicy?: { maxAttempts: number; backoffMs: number; backoffMultiplier: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  condition?: string;
}

export interface WorkflowDefinition {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables?: Record<string, unknown>;
  timeout?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  workspaceId: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  definition: WorkflowDefinition;
  schedule?: string;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  _count?: { executions: number };
}

export interface Execution {
  id: string;
  workflowId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  trigger: string;
  inputData?: unknown;
  outputData?: unknown;
  error?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  createdAt: string;
  workflow?: { id: string; name: string };
  stepLogs?: StepLog[];
}

export interface StepLog {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: string;
  inputData?: unknown;
  outputData?: unknown;
  error?: string;
  logs: string[];
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  retryCount: number;
}
