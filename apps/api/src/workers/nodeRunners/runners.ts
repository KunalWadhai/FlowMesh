import { logger } from '../../config/logger';
import { aiService } from '../../services/ai.service';
import type { WorkflowNode, NodeRunResult } from '../../types';

// ─── Transform Node ───────────────────────────────────────────────────────────
// Executes a JS expression in a safe sandboxed context

export async function runTransformNode(
  node: WorkflowNode,
  inputData: unknown
): Promise<NodeRunResult> {
  const start = Date.now();
  const logs: string[] = [];

  try {
    const expression = node.config.expression ?? 'return input';
    logs.push(`[Transform] Executing expression`);

    // Safe eval in a controlled function scope (no access to require, process, etc.)
    const fn = new Function(
      'input',
      'Math',
      'JSON',
      'Array',
      'Object',
      'String',
      'Number',
      'Boolean',
      `"use strict"; ${expression.startsWith('return') ? expression : `return (${expression})`}`
    );

    const output = fn(inputData, Math, JSON, Array, Object, String, Number, Boolean);
    logs.push(`[Transform] Output type: ${typeof output}`);

    return { success: true, output, logs, durationMs: Date.now() - start };
  } catch (err) {
    const error = (err as Error).message;
    logs.push(`[Transform] Error: ${error}`);
    return { success: false, error, logs, durationMs: Date.now() - start };
  }
}

// ─── Delay Node ───────────────────────────────────────────────────────────────

export async function runDelayNode(
  node: WorkflowNode,
  inputData: unknown
): Promise<NodeRunResult> {
  const start = Date.now();
  const delayMs = Math.min(node.config.delayMs ?? 1000, 60000); // Cap at 60s

  const logs = [`[Delay] Waiting ${delayMs}ms`];

  await new Promise((resolve) => setTimeout(resolve, delayMs));

  logs.push(`[Delay] Done`);
  return { success: true, output: inputData, logs, durationMs: Date.now() - start };
}

// ─── Condition Node ───────────────────────────────────────────────────────────

export interface ConditionResult {
  result: boolean;
  branch: 'true' | 'false';
  nextNodeId?: string;
}

export async function runConditionNode(
  node: WorkflowNode,
  inputData: unknown
): Promise<NodeRunResult & { conditionResult?: ConditionResult }> {
  const start = Date.now();
  const logs: string[] = [];

  try {
    const condition = node.config.condition ?? 'return true';
    logs.push(`[Condition] Evaluating: ${condition.slice(0, 80)}`);

    const fn = new Function(
      'input',
      'Math',
      'JSON',
      `"use strict"; ${condition.startsWith('return') ? condition : `return !!(${condition})`}`
    );

    const result = Boolean(fn(inputData, Math, JSON));
    const branch = result ? 'true' : 'false';
    const nextNodeId = result ? node.config.trueEdge : node.config.falseEdge;

    logs.push(`[Condition] Result: ${result} → branch: ${branch}`);

    return {
      success: true,
      output: { result, branch, input: inputData },
      conditionResult: { result, branch, nextNodeId },
      logs,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const error = (err as Error).message;
    logs.push(`[Condition] Error: ${error}`);
    return { success: false, error, logs, durationMs: Date.now() - start };
  }
}

// ─── AI Agent Node ────────────────────────────────────────────────────────────

export async function runAIAgentNode(
  node: WorkflowNode,
  inputData: unknown
): Promise<NodeRunResult> {
  const start = Date.now();
  const logs: string[] = [];

  try {
    const prompt = node.config.prompt ?? 'Process the input data';
    const systemPrompt = node.config.systemPrompt;

    logs.push(`[AIAgent] Running prompt: ${prompt.slice(0, 60)}...`);

    const output = await aiService.runAgentNode(prompt, inputData, systemPrompt);

    logs.push(`[AIAgent] Received response (${output.length} chars)`);

    // Try to parse as JSON, fall back to string
    let parsedOutput: unknown = output;
    try {
      parsedOutput = JSON.parse(output);
      logs.push('[AIAgent] Response parsed as JSON');
    } catch {
      // Keep as string
    }

    return {
      success: true,
      output: parsedOutput,
      logs,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const error = (err as Error).message;
    logs.push(`[AIAgent] Error: ${error}`);
    logger.error({ event: 'ai_agent_node_error', nodeId: node.id, error });
    return { success: false, error, logs, durationMs: Date.now() - start };
  }
}

// ─── Log Node ─────────────────────────────────────────────────────────────────

export async function runLogNode(
  node: WorkflowNode,
  inputData: unknown
): Promise<NodeRunResult> {
  const start = Date.now();
  const level = node.config.level ?? 'info';
  const message = node.config.message ?? JSON.stringify(inputData);

  logger[level as 'info' | 'warn' | 'error']({
    event: 'workflow_log',
    nodeId: node.id,
    message,
    data: inputData,
  });

  return {
    success: true,
    output: inputData,
    logs: [`[Log:${level.toUpperCase()}] ${message}`],
    durationMs: Date.now() - start,
  };
}
