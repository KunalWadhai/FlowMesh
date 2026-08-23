import { Request } from 'express';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface JWTPayload {
  userId: string;
  workspaceId: string;
  role: WorkspaceRole;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';

// ─── Workflow DAG Types ───────────────────────────────────────────────────────

export type NodeType =
  | 'http_request'
  | 'transform'
  | 'delay'
  | 'condition'
  | 'ai_agent'
  | 'webhook_trigger'
  | 'schedule_trigger'
  | 'log'
  | 'merge'
  | 'split';

export interface WorkflowNodeConfig {
  // HTTP Request
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  retries?: number;

  // Transform
  expression?: string; // JS expression: (input) => output

  // Delay
  delayMs?: number;

  // Condition
  condition?: string; // JS expression: (input) => boolean
  trueEdge?: string;
  falseEdge?: string;

  // AI Agent
  prompt?: string;
  model?: string;
  maxTokens?: number;
  systemPrompt?: string;

  // Log
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
  retryPolicy?: {
    maxAttempts: number;
    backoffMs: number;
    backoffMultiplier: number;
  };
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
  timeout?: number; // ms
}

// ─── Execution ───────────────────────────────────────────────────────────────

export type ExecutionStatus = 'QUEUED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED' | 'SKIPPED';
export type TriggerType = 'MANUAL' | 'SCHEDULED' | 'API' | 'WEBHOOK' | 'EVENT';

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  workspaceId: string;
  variables: Record<string, unknown>;
  nodeOutputs: Record<string, unknown>;
  logs: string[];
}

export interface NodeRunResult {
  success: boolean;
  output?: unknown;
  error?: string;
  logs?: string[];
  durationMs: number;
}

// ─── Queue Jobs ──────────────────────────────────────────────────────────────

export interface ExecutionJobPayload {
  executionId: string;
  workflowId: string;
  workspaceId: string;
  inputData?: unknown;
  trigger: TriggerType;
}

export interface NodeJobPayload {
  executionId: string;
  nodeId: string;
  workflowId: string;
  workspaceId: string;
  inputData: unknown;
  context: ExecutionContext;
}

// ─── WebSocket Events ─────────────────────────────────────────────────────────

export type SocketEvent =
  | 'execution:started'
  | 'execution:step:started'
  | 'execution:step:completed'
  | 'execution:step:failed'
  | 'execution:completed'
  | 'execution:failed'
  | 'execution:cancelled'
  | 'workflow:updated'
  | 'workspace:notification';

export interface ExecutionStepEvent {
  executionId: string;
  workflowId: string;
  nodeId: string;
  nodeName: string;
  status: ExecutionStatus;
  output?: unknown;
  error?: string;
  durationMs?: number;
  timestamp: string;
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  meta?: {
    page?: number;
    pageSize?: number;
    total?: number;
    totalPages?: number;
  };
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly context?: unknown;

  constructor(
    code: string,
    message: string,
    statusCode = 500,
    context?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    this.context = context;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: unknown) {
    super('VALIDATION_ERROR', message, 400, context);
  }
}

export class AuthError extends AppError {
  constructor(message = 'Unauthorized') {
    super('AUTH_ERROR', message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
  }
}
