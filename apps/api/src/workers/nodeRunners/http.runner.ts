import axios, { AxiosError } from 'axios';
import { logger } from '../../config/logger';
import type { WorkflowNode, NodeRunResult } from '../../types';

export async function runHttpNode(
  node: WorkflowNode,
  inputData: unknown,
  variables: Record<string, unknown>
): Promise<NodeRunResult> {
  const start = Date.now();
  const config = node.config;
  const logs: string[] = [];

  const maxAttempts = node.retryPolicy?.maxAttempts ?? config.retries ?? 3;
  const backoffMs = node.retryPolicy?.backoffMs ?? 1000;
  const backoffMultiplier = node.retryPolicy?.backoffMultiplier ?? 2;

  // Interpolate variables in URL and body
  const url = interpolate(config.url ?? '', { ...variables, input: inputData });
  const method = config.method ?? 'GET';
  const timeout = config.timeout ?? 30000;

  logs.push(`[HTTP] ${method} ${url}`);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        const delay = backoffMs * Math.pow(backoffMultiplier, attempt - 2);
        logs.push(`[HTTP] Retry attempt ${attempt}/${maxAttempts}, waiting ${delay}ms`);
        await sleep(delay);
      }

      const response = await axios({
        method,
        url,
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers ?? {}),
        },
        data: config.body
          ? interpolateObject(config.body, { ...variables, input: inputData })
          : undefined,
        timeout,
        validateStatus: null, // Don't throw on 4xx/5xx
      });

      logs.push(`[HTTP] Response: ${response.status} ${response.statusText}`);

      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data).slice(0, 200)}`);
      }

      logger.debug({
        event: 'http_node_success',
        nodeId: node.id,
        method,
        url,
        status: response.status,
        attempt,
        durationMs: Date.now() - start,
      });

      return {
        success: true,
        output: {
          status: response.status,
          headers: response.headers,
          body: response.data,
        },
        logs,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      lastError = err as Error;
      const isAxiosError = err instanceof AxiosError;
      const isRetryable = isAxiosError
        ? !err.response || err.response.status >= 500
        : true;

      logs.push(`[HTTP] Attempt ${attempt} failed: ${lastError.message}`);

      if (!isRetryable || attempt === maxAttempts) {
        break;
      }
    }
  }

  logger.warn({
    event: 'http_node_failed',
    nodeId: node.id,
    method,
    url,
    error: lastError?.message,
    durationMs: Date.now() - start,
  });

  return {
    success: false,
    error: lastError?.message ?? 'HTTP request failed',
    logs,
    durationMs: Date.now() - start,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function interpolate(template: string, context: Record<string, unknown>): string {
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, key) => {
    const value = key.split('.').reduce((obj: unknown, k: string) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[k];
      return undefined;
    }, context as unknown);
    return value !== undefined ? String(value) : `{{${key}}}`;
  });
}

function interpolateObject(obj: unknown, context: Record<string, unknown>): unknown {
  if (typeof obj === 'string') return interpolate(obj, context);
  if (Array.isArray(obj)) return obj.map((item) => interpolateObject(item, context));
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, interpolateObject(v, context)])
    );
  }
  return obj;
}
