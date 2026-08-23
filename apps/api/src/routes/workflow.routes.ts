import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { workflowService } from '../services/workflow.service';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

const router = Router();

router.use(authenticate);

const workflowNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['http_request', 'transform', 'delay', 'condition', 'ai_agent', 'webhook_trigger', 'schedule_trigger', 'log', 'merge', 'split']),
  label: z.string(),
  description: z.string().optional(),
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.record(z.unknown()),
  retryPolicy: z.object({
    maxAttempts: z.number(),
    backoffMs: z.number(),
    backoffMultiplier: z.number(),
  }).optional(),
});

const workflowEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  condition: z.string().optional(),
});

const definitionSchema = z.object({
  nodes: z.array(workflowNodeSchema),
  edges: z.array(workflowEdgeSchema).optional().default([]),
  variables: z.record(z.unknown()).optional(),
  timeout: z.number().optional(),
});

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  tags: z.array(z.string()).optional(),
  definition: definitionSchema,
  schedule: z.string().optional(),
});

const updateSchema = createSchema.partial();

const listQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(20),
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED']).optional(),
  search: z.string().optional(),
  tags: z.string().optional(),
});

// GET /workflows
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const query = listQuerySchema.parse(req.query);

    const result = await workflowService.list({
      workspaceId,
      ...query,
      tags: query.tags?.split(','),
    });

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// GET /workflows/stats
router.get('/stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const stats = await workflowService.getStats(workspaceId);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /workflows/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const workflow = await workflowService.findById(req.params.id as string, workspaceId);
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// POST /workflows
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const input = createSchema.parse(req.body);
    const workflow = await workflowService.create(workspaceId, input as Parameters<typeof workflowService.create>[1]);
    res.status(201).json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// PUT /workflows/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const input = updateSchema.parse(req.body);
    const workflow = await workflowService.update(req.params.id as string, workspaceId, input as Parameters<typeof workflowService.update>[2]);
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

// DELETE /workflows/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    await workflowService.delete(req.params.id as string, workspaceId);
    res.json({ success: true, message: 'Workflow deleted' });
  } catch (err) {
    next(err);
  }
});

// POST /workflows/:id/activate
router.post('/:id/activate', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const workflow = await workflowService.activate(req.params.id as string, workspaceId);
    res.json({ success: true, data: workflow });
  } catch (err) {
    next(err);
  }
});

export default router;
