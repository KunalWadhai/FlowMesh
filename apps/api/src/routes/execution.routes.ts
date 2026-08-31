import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { executionService } from '../services/execution.service';
import { aiService } from '../services/ai.service';
import { authenticate } from '../middleware/auth';
import type { AuthenticatedRequest } from '../types';

// ─── Execution Routes ─────────────────────────────────────────────────────────

export const executionRouter = Router();
executionRouter.use(authenticate);

const triggerSchema = z.object({
  inputData: z.unknown().optional(),
});

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(50).default(20),
});

// POST /workflows/:workflowId/execute
executionRouter.post('/workflows/:workflowId/execute', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const { inputData } = triggerSchema.parse(req.body);

    const execution = await executionService.trigger({
      workflowId: req.params.workflowId as string,
      workspaceId,
      trigger: 'MANUAL',
      inputData,
    });

    res.status(202).json({ success: true, data: execution, message: 'Execution queued' });
  } catch (err) {
    next(err);
  }
});

// GET /executions/metrics - MUST be before /executions/:id to avoid route collision
executionRouter.get('/executions/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const days = Math.min(parseInt(req.query.days as string || '7', 10), 30);
    const metrics = await executionService.getMetrics(workspaceId, days);
    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

// GET /executions/:id
executionRouter.get('/executions/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const execution = await executionService.findById(req.params.id as string, workspaceId);
    res.json({ success: true, data: execution });
  } catch (err) {
    next(err);
  }
});

// GET /workflows/:workflowId/executions
executionRouter.get('/workflows/:workflowId/executions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const { page, pageSize } = paginationSchema.parse(req.query);

    const result = await executionService.listByWorkflow(
      req.params.workflowId as string,
      workspaceId,
      page,
      pageSize
    );

    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /executions/:id/cancel
executionRouter.post('/executions/:id/cancel', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const execution = await executionService.cancel(req.params.id as string, workspaceId);
    res.json({ success: true, data: execution });
  } catch (err) {
    next(err);
  }
});

// GET /activity
executionRouter.get('/activity', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId } = (req as AuthenticatedRequest).user;
    const limit = Math.min(parseInt(req.query.limit as string || '20', 10), 50);
    const activity = await executionService.getRecentActivity(workspaceId, limit);
    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
});

// ─── AI Routes ────────────────────────────────────────────────────────────────

export const aiRouter = Router();
aiRouter.use(authenticate);

const suggestSchema = z.object({
  prompt: z.string().min(5).max(2000),
  existingWorkflow: z.unknown().optional(),
});

const analyzeSchema = z.object({
  workflow: z.object({
    nodes: z.array(z.unknown()),
    edges: z.array(z.unknown()).optional(),
  }),
  question: z.string().max(500).optional(),
});

const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).min(1).max(20),
});

// POST /ai/suggest
aiRouter.post('/suggest', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = suggestSchema.parse(req.body);
    const result = await aiService.suggestWorkflow(input as Parameters<typeof aiService.suggestWorkflow>[0]);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /ai/analyze
aiRouter.post('/analyze', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const input = analyzeSchema.parse(req.body);
    const result = await aiService.analyzeWorkflow(input as Parameters<typeof aiService.analyzeWorkflow>[0]);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
});

// POST /ai/chat
aiRouter.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages } = chatSchema.parse(req.body);
    const response = await aiService.chat(messages);
    res.json({ success: true, data: { response } });
  } catch (err) {
    next(err);
  }
});
