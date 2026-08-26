import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';

import { env } from './config/env';
import { logger } from './config/logger';
import { closePrisma } from './config/prisma';
import { closeRedis } from './config/redis';
import { initSocketServer } from './socket/events';
import { startWorker } from './workers/execution.worker';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

import authRoutes from './routes/auth.routes';
import workflowRoutes from './routes/workflow.routes';
import { executionRouter, aiRouter } from './routes/execution.routes';

async function bootstrap() {
  const app = express();
  const httpServer = http.createServer(app);

  // ─── Security ───────────────────────────────────────────────────────────────
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  app.use(cors({
    // origin: env.CORS_ORIGINS,
    // credentials: true,
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'X-Request-Id'],
  }));

  // ─── Request Parsing ─────────────────────────────────────────────────────────
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ─── Rate Limiting ────────────────────────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: 'RATE_LIMIT', message: 'Too many requests' },
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: { success: false, error: 'RATE_LIMIT', message: 'Too many auth attempts' },
  });

  app.use('/api/', apiLimiter);
  app.use('/api/auth', authLimiter);

  // ─── Logging ─────────────────────────────────────────────────────────────────
  app.use(morgan(env.isProd() ? 'combined' : 'dev'));

  // ─── Health Check ─────────────────────────────────────────────────────────────
  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    });
  });

  // ─── API Routes ───────────────────────────────────────────────────────────────
  app.use('/api/auth', authRoutes);
  app.use('/api/workflows', workflowRoutes);
  app.use('/api', executionRouter);
  app.use('/api/ai', aiRouter);

  // ─── Error Handling ───────────────────────────────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  // ─── WebSocket ────────────────────────────────────────────────────────────────
  initSocketServer(httpServer);

  // ─── Background Worker (inline for monorepo dev; extract for production) ──────
  const worker = startWorker();

  // ─── Start Server ─────────────────────────────────────────────────────────────
  httpServer.listen(env.PORT, () => {
    console.log(`server running on port ${env.PORT}----`)
    logger.info({
      event: 'server_started',
      port: env.PORT,
      environment: env.NODE_ENV,
      workerConcurrency: env.WORKER_CONCURRENCY,
    });
  });

  // ─── Graceful Shutdown ────────────────────────────────────────────────────────
  async function shutdown(signal: string) {
    logger.info({ event: 'shutdown_initiated', signal });

    httpServer.close(async () => {
      try {
        await worker.close();
        await closePrisma();
        await closeRedis();
        logger.info({ event: 'shutdown_complete' });
        process.exit(0);
      } catch (err) {
        logger.error({ event: 'shutdown_error', error: (err as Error).message });
        process.exit(1);
      }
    });

    // Force exit after 15s
    setTimeout(() => {
      logger.error({ event: 'forced_shutdown' });
      process.exit(1);
    }, 15000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ event: 'unhandled_rejection', reason });
  });

  process.on('uncaughtException', (err) => {
    logger.error({ event: 'uncaught_exception', error: err.message, stack: err.stack });
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
