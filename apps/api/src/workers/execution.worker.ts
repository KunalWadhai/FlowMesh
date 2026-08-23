import { Worker, Job } from 'bullmq';
import { prisma } from '../config/prisma';
import { createBullMQConnection, getRedis } from '../config/redis';
import { logger } from '../config/logger';
import { EXECUTION_QUEUE_NAME } from '../services/execution.service';
import { runHttpNode } from './nodeRunners/http.runner';
import { runTransformNode, runDelayNode, runConditionNode, runAIAgentNode, runLogNode } from './nodeRunners/runners';
import type {
  ExecutionJobPayload,
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  ExecutionContext,
  NodeRunResult,
} from '../types';
import { env } from '../config/env';

const SOCKET_CHANNEL = 'execution:events';

// Publish event via Redis pub/sub so the main server can forward to Socket.io
async function publishEvent(event: string, data: object): Promise<void> {
  await getRedis().publish(SOCKET_CHANNEL, JSON.stringify({ event, data }));
}

// Build adjacency list + in-degree map for topological sort
function buildGraph(edges: WorkflowEdge[]): {
  adjacency: Map<string, string[]>;
  inDegree: Map<string, number>;
  edgeConditions: Map<string, string | undefined>;
} {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const edgeConditions = new Map<string, string | undefined>();

  for (const edge of edges) {
    if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
    adjacency.get(edge.source)!.push(edge.target);

    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    if (!inDegree.has(edge.source)) inDegree.set(edge.source, 0);

    edgeConditions.set(`${edge.source}->${edge.target}`, edge.condition);
  }

  return { adjacency, inDegree, edgeConditions };
}

// Topological sort (Kahn's algorithm) to determine execution order
function topologicalSort(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): string[] {
  const { adjacency, inDegree } = buildGraph(edges);

  // Seed inDegree for all nodes
  for (const node of nodes) {
    if (!inDegree.has(node.id)) inDegree.set(node.id, 0);
  }

  const queue = [...inDegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id);

  const order: string[] = [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    order.push(nodeId);

    for (const neighbor of adjacency.get(nodeId) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  return order;
}

async function executeNode(
  node: WorkflowNode,
  context: ExecutionContext
): Promise<NodeRunResult> {
  const inputData = context.nodeOutputs[node.id] ?? context.variables?.input ?? {};

  switch (node.type) {
    case 'http_request':
      return runHttpNode(node, inputData, context.variables);
    case 'transform':
      return runTransformNode(node, inputData);
    case 'delay':
      return runDelayNode(node, inputData);
    case 'condition':
      return runConditionNode(node, inputData);
    case 'ai_agent':
      return runAIAgentNode(node, inputData);
    case 'log':
      return runLogNode(node, inputData);
    default:
      return {
        success: true,
        output: inputData,
        logs: [`[${node.type}] Pass-through (unsupported type)`],
        durationMs: 0,
      };
  }
}

async function runExecution(job: Job<ExecutionJobPayload>): Promise<void> {
  const { executionId, workflowId, workspaceId, inputData } = job.data;
  const executionStart = Date.now();

  logger.info({ event: 'execution_started', executionId, workflowId });

  // Mark as running
  await prisma.execution.update({
    where: { id: executionId },
    data: { status: 'RUNNING', startedAt: new Date() },
  });

  await publishEvent('execution:started', {
    executionId,
    workflowId,
    workspaceId,
    timestamp: new Date().toISOString(),
  });

  // Load workflow definition
  const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
  if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

  const definition = workflow.definition as unknown as WorkflowDefinition;
  const nodeMap = new Map(definition.nodes.map((n) => [n.id, n]));
  const executionOrder = topologicalSort(definition.nodes, definition.edges ?? []);

  const { adjacency } = buildGraph(definition.edges ?? []);

  const context: ExecutionContext = {
    executionId,
    workflowId,
    workspaceId,
    variables: { ...(definition.variables ?? {}), input: inputData },
    nodeOutputs: {},
    logs: [],
  };

  let failed = false;
  let failureError = '';

  // Execute nodes in topological order
  for (const nodeId of executionOrder) {
    const node = nodeMap.get(nodeId);
    if (!node) continue;

    // Set input from predecessor outputs
    const predecessors = [...(adjacency.entries())]
      .filter(([, targets]) => targets.includes(nodeId))
      .map(([src]) => src);

    if (predecessors.length === 1) {
      context.nodeOutputs[nodeId] = context.nodeOutputs[predecessors[0]];
    } else if (predecessors.length > 1) {
      // Merge mode: combine all predecessor outputs
      context.nodeOutputs[nodeId] = predecessors.map((pid) => context.nodeOutputs[pid]);
    }

    // Create step log
    const stepLog = await prisma.executionStepLog.create({
      data: {
        executionId,
        nodeId,
        nodeName: node.label,
        nodeType: node.type,
        status: 'RUNNING',
        inputData: (context.nodeOutputs[nodeId] as object) ?? {},
      },
    });

    await publishEvent('execution:step:started', {
      executionId,
      workflowId,
      workspaceId,
      nodeId,
      nodeName: node.label,
      stepLogId: stepLog.id,
      timestamp: new Date().toISOString(),
    });

    job.updateProgress({ currentNode: nodeId, completedNodes: executionOrder.indexOf(nodeId) });

    // Run the node
    const result = await executeNode(node, context);

    if (result.success) {
      context.nodeOutputs[nodeId] = result.output;

      await prisma.executionStepLog.update({
        where: { id: stepLog.id },
        data: {
          status: 'SUCCEEDED',
          outputData: (result.output as object) ?? {},
          logs: result.logs ?? [],
          completedAt: new Date(),
          durationMs: result.durationMs,
        },
      });

      await publishEvent('execution:step:completed', {
        executionId,
        workflowId,
        workspaceId,
        nodeId,
        nodeName: node.label,
        status: 'SUCCEEDED',
        output: result.output,
        durationMs: result.durationMs,
        timestamp: new Date().toISOString(),
      });
    } else {
      await prisma.executionStepLog.update({
        where: { id: stepLog.id },
        data: {
          status: 'FAILED',
          error: result.error,
          logs: result.logs ?? [],
          completedAt: new Date(),
          durationMs: result.durationMs,
        },
      });

      await publishEvent('execution:step:failed', {
        executionId,
        workflowId,
        workspaceId,
        nodeId,
        nodeName: node.label,
        status: 'FAILED',
        error: result.error,
        durationMs: result.durationMs,
        timestamp: new Date().toISOString(),
      });

      failed = true;
      failureError = result.error ?? 'Node execution failed';
      break;
    }
  }

  const totalDuration = Date.now() - executionStart;
  const finalStatus = failed ? 'FAILED' : 'SUCCEEDED';

  await prisma.execution.update({
    where: { id: executionId },
    data: {
      status: finalStatus,
      completedAt: new Date(),
      durationMs: totalDuration,
      outputData: failed ? undefined : (context.nodeOutputs[executionOrder[executionOrder.length - 1]] as object),
      error: failed ? failureError : undefined,
    },
  });

  await publishEvent(failed ? 'execution:failed' : 'execution:completed', {
    executionId,
    workflowId,
    workspaceId,
    status: finalStatus,
    durationMs: totalDuration,
    error: failed ? failureError : undefined,
    timestamp: new Date().toISOString(),
  });

  logger.info({
    event: 'execution_finished',
    executionId,
    status: finalStatus,
    durationMs: totalDuration,
  });
}

export function startWorker(): Worker<ExecutionJobPayload> {
  const worker = new Worker<ExecutionJobPayload>(
    EXECUTION_QUEUE_NAME,
    async (job) => {
      await runExecution(job);
    },
    {
      connection: createBullMQConnection(),
      concurrency: env.WORKER_CONCURRENCY,
    }
  );

  worker.on('completed', (job) => {
    logger.info({ event: 'job_completed', jobId: job.id });
  });

  worker.on('failed', (job, err) => {
    logger.error({ event: 'job_failed', jobId: job?.id, error: err.message });
  });

  worker.on('stalled', (jobId) => {
    logger.warn({ event: 'job_stalled', jobId });
  });

  logger.info({ event: 'worker_started', concurrency: env.WORKER_CONCURRENCY });
  return worker;
}
