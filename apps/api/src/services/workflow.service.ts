import { prisma } from '../config/prisma';
import { getRedis } from '../config/redis';
import { logger } from '../config/logger';
import { NotFoundError, ForbiddenError, ValidationError } from '../types';
import type { WorkflowDefinition } from '../types';

const CACHE_TTL = 300; // 5 minutes
const CACHE_PREFIX = 'workflow:';

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  tags?: string[];
  definition: WorkflowDefinition;
  schedule?: string;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  tags?: string[];
  definition?: WorkflowDefinition;
  schedule?: string;
  isActive?: boolean;
}

export interface ListWorkflowsInput {
  workspaceId: string;
  page?: number;
  pageSize?: number;
  status?: string;
  tags?: string[];
  search?: string;
}

export class WorkflowService {
  private cacheKey(id: string): string {
    return `${CACHE_PREFIX}${id}`;
  }

  private async invalidateCache(id: string): Promise<void> {
    await getRedis().del(this.cacheKey(id));
  }

  async create(workspaceId: string, input: CreateWorkflowInput) {
    this.validateDefinition(input.definition);

    const workflow = await prisma.workflow.create({
      data: {
        name: input.name,
        description: input.description,
        tags: input.tags ?? [],
        workspaceId,
        definition: input.definition as object,
        schedule: input.schedule,
        status: 'DRAFT',
        version: 1,
      },
    });

    logger.info({ event: 'workflow_created', workflowId: workflow.id, workspaceId });
    return workflow;
  }

  async findById(id: string, workspaceId: string) {
    // Try cache first
    const cached = await getRedis().get(this.cacheKey(id));
    if (cached) {
      const workflow = JSON.parse(cached);
      if (workflow.workspaceId !== workspaceId) throw new ForbiddenError('Access denied');
      return workflow;
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        _count: { select: { executions: true } },
      },
    });

    if (!workflow) throw new NotFoundError('Workflow');
    if (workflow.workspaceId !== workspaceId) throw new ForbiddenError('Access denied');

    // Cache it
    await getRedis().setex(this.cacheKey(id), CACHE_TTL, JSON.stringify(workflow));

    return workflow;
  }

  async list(input: ListWorkflowsInput) {
    const { workspaceId, page = 1, pageSize = 20, status, search } = input;

    const where = {
      workspaceId,
      ...(status && { status: status as 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED' }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(input.tags?.length && {
        tags: { hasSome: input.tags },
      }),
    };

    const [workflows, total] = await prisma.$transaction([
      prisma.workflow.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { executions: true } },
        },
      }),
      prisma.workflow.count({ where }),
    ]);

    return {
      workflows,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async update(id: string, workspaceId: string, input: UpdateWorkflowInput) {
    const existing = await this.findById(id, workspaceId);

    if (input.definition) {
      this.validateDefinition(input.definition);
    }

    const updated = await prisma.workflow.update({
      where: { id },
      data: {
        ...input,
        ...(input.definition && { definition: input.definition as object }),
        version: existing.version + 1,
      },
    });

    await this.invalidateCache(id);

    logger.info({ event: 'workflow_updated', workflowId: id, workspaceId, version: updated.version });
    return updated;
  }

  async delete(id: string, workspaceId: string): Promise<void> {
    await this.findById(id, workspaceId); // ownership check

    await prisma.workflow.delete({ where: { id } });
    await this.invalidateCache(id);

    logger.info({ event: 'workflow_deleted', workflowId: id, workspaceId });
  }

  async activate(id: string, workspaceId: string) {
    const workflow = await this.findById(id, workspaceId);

    if (workflow.status === 'ARCHIVED') {
      throw new ValidationError('Cannot activate an archived workflow');
    }

    return this.update(id, workspaceId, { isActive: true, ...(workflow.status === 'DRAFT' ? { status: 'ACTIVE' } : {}) });
  }

  async getStats(workspaceId: string) {
    const [total, byStatus, recentExecutions] = await Promise.all([
      prisma.workflow.count({ where: { workspaceId } }),
      prisma.workflow.groupBy({
        by: ['status'],
        where: { workspaceId },
        _count: true,
      }),
      prisma.execution.findMany({
        where: { workflow: { workspaceId } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { workflow: { select: { name: true } } },
      }),
    ]);

    const successCount = await prisma.execution.count({
      where: { workflow: { workspaceId }, status: 'SUCCEEDED' },
    });
    const failedCount = await prisma.execution.count({
      where: { workflow: { workspaceId }, status: 'FAILED' },
    });
    const totalExecutions = successCount + failedCount;

    return {
      totalWorkflows: total,
      byStatus: Object.fromEntries(byStatus.map((s: any) => [s.status, s._count])),
      successRate: totalExecutions > 0 ? Math.round((successCount / totalExecutions) * 100) : 0,
      recentExecutions,
    };
  }

  private validateDefinition(def: WorkflowDefinition): void {
    if (!def.nodes || def.nodes.length === 0) {
      throw new ValidationError('Workflow must have at least one node');
    }

    const nodeIds = new Set(def.nodes.map((n) => n.id));

    // Validate edges reference existing nodes
    for (const edge of def.edges ?? []) {
      if (!nodeIds.has(edge.source)) {
        throw new ValidationError(`Edge references unknown source node: ${edge.source}`);
      }
      if (!nodeIds.has(edge.target)) {
        throw new ValidationError(`Edge references unknown target node: ${edge.target}`);
      }
    }

    // Check for cycle (basic DFS)
    if (this.hasCycle(def)) {
      throw new ValidationError('Workflow contains a cycle — DAGs must be acyclic');
    }
  }

  private hasCycle(def: WorkflowDefinition): boolean {
    const adjacency = new Map<string, string[]>();

    for (const node of def.nodes) {
      adjacency.set(node.id, []);
    }

    for (const edge of def.edges ?? []) {
      adjacency.get(edge.source)?.push(edge.target);
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      inStack.add(nodeId);

      for (const neighbor of adjacency.get(nodeId) ?? []) {
        if (!visited.has(neighbor) && dfs(neighbor)) return true;
        if (inStack.has(neighbor)) return true;
      }

      inStack.delete(nodeId);
      return false;
    };

    for (const node of def.nodes) {
      if (!visited.has(node.id) && dfs(node.id)) return true;
    }

    return false;
  }
}

export const workflowService = new WorkflowService();
