import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../types';
import type { WorkflowDefinition } from '../types';

const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const WORKFLOW_SYSTEM_PROMPT = `You are FlowMesh AI — an expert workflow orchestration engineer embedded inside the FlowMesh platform.

You help users design, optimize, and debug distributed workflows built as Directed Acyclic Graphs (DAGs).

Available node types in FlowMesh:
- http_request: Make HTTP calls (GET, POST, PUT, DELETE). Config: url, method, headers, body, timeout, retries
- transform: Transform data using JS expressions. Config: expression (function body: receives 'input', returns output)
- delay: Pause execution. Config: delayMs (milliseconds)
- condition: Branch workflow based on logic. Config: condition (JS expression returning boolean)
- ai_agent: Use AI to process/analyze data. Config: prompt, systemPrompt, maxTokens
- log: Emit a log message. Config: message, level
- merge: Merge multiple parallel paths into one
- split: Fan out to multiple parallel paths

Workflow rules:
- Workflows are DAGs (no cycles allowed)
- Nodes connect via edges (source -> target)
- Each node has a unique string ID
- Position is { x: number, y: number } for visual layout
- Edges connect sourceHandle to targetHandle

When generating workflow definitions, ALWAYS output valid JSON in this exact format:
{
  "nodes": [
    { "id": "node-1", "type": "http_request", "label": "Fetch Data", "position": {"x": 100, "y": 100}, "config": {...} }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2" }
  ]
}`;

export interface AISuggestInput {
  prompt: string;
  existingWorkflow?: WorkflowDefinition;
  context?: string;
}

export interface AIAnalyzeInput {
  workflow: WorkflowDefinition;
  executionHistory?: object[];
  question?: string;
}

export interface AIOptimizeInput {
  workflow: WorkflowDefinition;
  metrics?: {
    avgDurationMs: number;
    failureRate: number;
    bottleneckNodeId?: string;
  };
}

export class AIService {
  async suggestWorkflow(input: AISuggestInput): Promise<{
    workflow?: WorkflowDefinition;
    explanation: string;
    suggestions: string[];
  }> {
    const userMessage = input.existingWorkflow
      ? `I have an existing workflow:\n${JSON.stringify(input.existingWorkflow, null, 2)}\n\nRequest: ${input.prompt}`
      : `Create a workflow for: ${input.prompt}`;

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: WORKFLOW_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${userMessage}\n\nRespond with JSON in this format:
{
  "workflow": { ...WorkflowDefinition or null if just suggestions },
  "explanation": "Clear explanation of what this workflow does",
  "suggestions": ["tip 1", "tip 2", "tip 3"]
}`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON found in AI response');

      const parsed = JSON.parse(jsonMatch[0]);

      logger.info({
        event: 'ai_workflow_suggested',
        promptTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      });

      return {
        workflow: parsed.workflow,
        explanation: parsed.explanation ?? 'Workflow generated successfully',
        suggestions: parsed.suggestions ?? [],
      };
    } catch (err) {
      logger.error({ event: 'ai_suggest_error', error: (err as Error).message });
      throw new AppError('AI_ERROR', 'Failed to generate workflow suggestion', 500, err);
    }
  }

  async analyzeWorkflow(input: AIAnalyzeInput): Promise<{
    analysis: string;
    issues: Array<{ severity: 'low' | 'medium' | 'high'; nodeId?: string; message: string }>;
    recommendations: string[];
  }> {
    const prompt = input.question
      ? `Question: ${input.question}\n\nWorkflow: ${JSON.stringify(input.workflow, null, 2)}`
      : `Analyze this workflow for issues, anti-patterns, and optimization opportunities:\n${JSON.stringify(input.workflow, null, 2)}`;

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: WORKFLOW_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${prompt}\n\nRespond with JSON:
{
  "analysis": "Overall analysis paragraph",
  "issues": [{"severity": "high|medium|low", "nodeId": "node-id or null", "message": "issue description"}],
  "recommendations": ["recommendation 1", "recommendation 2"]
}`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      logger.error({ event: 'ai_analyze_error', error: (err as Error).message });
      throw new AppError('AI_ERROR', 'Workflow analysis failed', 500, err);
    }
  }

  async optimizeWorkflow(input: AIOptimizeInput): Promise<{
    optimizedWorkflow: WorkflowDefinition;
    changes: string[];
    estimatedImprovementPercent: number;
  }> {
    const metricsContext = input.metrics
      ? `\nPerformance metrics: avg ${input.metrics.avgDurationMs}ms, ${(input.metrics.failureRate * 100).toFixed(1)}% failure rate${input.metrics.bottleneckNodeId ? `, bottleneck: ${input.metrics.bottleneckNodeId}` : ''}`
      : '';

    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: WORKFLOW_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Optimize this workflow for performance and reliability.${metricsContext}\n\nWorkflow:\n${JSON.stringify(input.workflow, null, 2)}\n\nRespond with JSON:
{
  "optimizedWorkflow": { ...full optimized WorkflowDefinition },
  "changes": ["change 1 description", "change 2 description"],
  "estimatedImprovementPercent": 25
}`,
          },
        ],
      });

      const text = response.content[0].type === 'text' ? response.content[0].text : '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      const result = JSON.parse(jsonMatch[0]);
      logger.info({ event: 'ai_workflow_optimized', changes: result.changes?.length });
      return result;
    } catch (err) {
      logger.error({ event: 'ai_optimize_error', error: (err as Error).message });
      throw new AppError('AI_ERROR', 'Workflow optimization failed', 500, err);
    }
  }

  async chat(messages: Array<{ role: 'user' | 'assistant'; content: string }>): Promise<string> {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: WORKFLOW_SYSTEM_PROMPT,
        messages,
      });

      return response.content[0].type === 'text' ? response.content[0].text : '';
    } catch (err) {
      logger.error({ event: 'ai_chat_error', error: (err as Error).message });
      throw new AppError('AI_ERROR', 'AI chat failed', 500, err);
    }
  }

  // Used inside workflow execution for AI Agent nodes
  async runAgentNode(prompt: string, inputData: unknown, systemPrompt?: string): Promise<string> {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt ?? 'You are a helpful data processing assistant. Process the provided input and return the result.',
      messages: [
        {
          role: 'user',
          content: `Input data:\n${JSON.stringify(inputData, null, 2)}\n\nTask: ${prompt}`,
        },
      ],
    });

    return response.content[0].type === 'text' ? response.content[0].text : '';
  }
}

export const aiService = new AIService();
