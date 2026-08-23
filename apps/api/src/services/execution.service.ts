import { Queue } from 'bullmq';
import { prisma } from '../config/prisma';
import { createBullMQConnection } from '../config/redis';
import { logger } from '../config/logger';
import { NotFoundError, ForbiddenError, AppError } from '../types';
import type { ExecutionJobPayload, TriggerType } from '../types';

export const EXECUTION_QUEUE_NAME = 'workflow-executions';

let executionQueue: Queue | null = null;

export function getExecutionQueue(): Queue {
  if (!executionQueue) {
    executionQueue = new Queue(EXECUTION_QUEUE_NAME, {
      connection: createBullMQConnection(),
      defaultJobOptions: {
        attempts: 1, // Workflow-level retries are handled at node level
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 200 },
      },
    });
    logger.info({ event: 'execution_queue_initialized' });
  }
  return executionQueue;
}

export interface TriggerExecutionInput {
  workflowId: string;
  workspaceId: string;
  trigger: TriggerType;
  inputData?: unknown;
}

export class ExecutionService {
  async trigger(input: TriggerExecutionInput) {
    const workflow = await prisma.workflow.findUnique({
      where: { id: input.workflowId },
    });

    if (!workflow) throw new NotFoundError('Workflow');
    if (workflow.workspaceId !== input.workspaceId) throw new ForbiddenError('Access denied');
    if (workflow.status === 'ARCHIVED') {
      throw new AppError('WORKFLOW_ARCHIVED', 'Cannot execute an archived workflow', 400);
    }

    const execution = await prisma.execution.create({
      data: {
        workflowId: input.workflowId,
        status: 'QUEUED',
        trigger: input.trigger,
        inputData: (input.inputData as object) ?? {},
      },
    });

    const jobPayload: ExecutionJobPayload = {
      executionId: execution.id,
      workflowId: input.workflowId,
      workspaceId: input.workspaceId,
      inputData: input.inputData,
      trigger: input.trigger,
    };

    const job = await getExecutionQueue().add('execute', jobPayload, {
      jobId: execution.id, // Use executionId as jobId for idempotency
    });

    logger.info({
      event: 'execution_queued',
      executionId: execution.id,
      workflowId: input.workflowId,
      jobId: job.id,
    });

    return execution;
  }

  async findById(id: string, workspaceId: string) {
    const execution = await prisma.execution.findUnique({
      where: { id },
      include: {
        workflow: { select: { id: true, name: true, workspaceId: true } },
        stepLogs: { orderBy: { startedAt: 'asc' } },
      },
    });

    if (!execution) throw new NotFoundError('Execution');
    if (execution.workflow.workspaceId !== workspaceId) throw new ForbiddenError('Access denied');

    return execution;
  }

  async listByWorkflow(workflowId: string, workspaceId: string, page = 1, pageSize = 20) {
    const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
    if (!workflow) throw new NotFoundError('Workflow');
    if (workflow.workspaceId !== workspaceId) throw new ForbiddenError('Access denied');

    const [executions, total] = await prisma.$transaction([
      prisma.execution.findMany({
        where: { workflowId },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { stepLogs: true } } },
      }),
      prisma.execution.count({ where: { workflowId } }),
    ]);

    return { executions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async cancel(id: string, workspaceId: string) {
    const execution = await this.findById(id, workspaceId);

    if (!['QUEUED', 'RUNNING'].includes(execution.status)) {
      throw new AppError('INVALID_STATE', `Cannot cancel execution in status: ${execution.status}`, 400);
    }

    // Remove from queue if still queued
    const queue = getExecutionQueue();
    const job = await queue.getJob(id);
    if (job) {
      await job.remove();
    }

    const updated = await prisma.execution.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        completedAt: new Date(),
      },
    });

    logger.info({ event: 'execution_cancelled', executionId: id });
    return updated;
  }

  async getRecentActivity(workspaceId: string, limit = 20) {
    return prisma.execution.findMany({
      where: { workflow: { workspaceId } },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        workflow: { select: { id: true, name: true } },
      },
    });
  }

  async getMetrics(workspaceId: string, days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [byStatus, avgDuration, throughput] = await prisma.$transaction([
      prisma.execution.groupBy({
        by: ['status'],
        where: { workflow: { workspaceId }, createdAt: { gte: since } },
        _count: true,
      }),
      prisma.execution.aggregate({
        where: {
          workflow: { workspaceId },
          status: 'SUCCEEDED',
          createdAt: { gte: since },
          durationMs: { not: null },
        },
        _avg: { durationMs: true },
      }),
      prisma.execution.groupBy({
        by: ['workflowId'],
        where: { workflow: { workspaceId }, createdAt: { gte: since } },
        _count: true,
        orderBy: { _count: { workflowId: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      byStatus: Object.fromEntries(byStatus.map((s: { status: string; _count: number }) => [s.status, s._count])),
      avgDurationMs: Math.round(avgDuration._avg.durationMs ?? 0),
      topWorkflows: throughput,
    };
  }
}

export const executionService = new ExecutionService();
