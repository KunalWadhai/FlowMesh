import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { getRedis } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../config/logger';
import type { JWTPayload } from '../types';

const SOCKET_CHANNEL = 'execution:events';

let io: SocketServer | null = null;

export function initSocketServer(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      // origin : env.CORS_ORIGINS,
      // credentials: true,
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
     // allowedHeaders: ['Content-Type', 'Authorization', 'X-Workspace-Id', 'X-Request-Id'],
    },
    transports: ['websocket', 'polling'],
  });

  // Auth middleware for socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      socket.data.user = payload;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user as JWTPayload;

    logger.info({
      event: 'socket_connected',
      socketId: socket.id,
      userId: user.userId,
      workspaceId: user.workspaceId,
    });

    // Auto-join workspace room for scoped broadcasts
    const workspaceRoom = `workspace:${user.workspaceId}`;
    socket.join(workspaceRoom);

    // Subscribe to specific execution updates
    socket.on('execution:subscribe', (executionId: string) => {
      socket.join(`execution:${executionId}`);
      logger.debug({ event: 'socket_subscribed_execution', executionId, socketId: socket.id });
    });

    socket.on('execution:unsubscribe', (executionId: string) => {
      socket.leave(`execution:${executionId}`);
    });

    socket.on('disconnect', (reason) => {
      logger.info({ event: 'socket_disconnected', socketId: socket.id, reason });
    });
  });

  // Bridge Redis pub/sub to Socket.io rooms
  subscribeToRedisEvents();

  logger.info({ event: 'socket_server_initialized' });
  return io;
}

function subscribeToRedisEvents(): void {
  // Create dedicated subscriber connection
  const subscriber = getRedis().duplicate();

  subscriber.subscribe(SOCKET_CHANNEL, (err) => {
    if (err) {
      logger.error({ event: 'redis_subscribe_error', channel: SOCKET_CHANNEL, error: err.message });
    } else {
      logger.info({ event: 'redis_subscribed', channel: SOCKET_CHANNEL });
    }
  });

  subscriber.on('message', (_channel, message) => {
    try {
      const { event, data } = JSON.parse(message) as {
        event: string;
        data: {
          executionId?: string;
          workspaceId?: string;
          [key: string]: unknown;
        };
      };

      if (!io) return;

      // Broadcast to execution-specific room
      if (data.executionId) {
        io.to(`execution:${data.executionId}`).emit(event, data);
      }

      // Also broadcast to workspace room
      if (data.workspaceId) {
        io.to(`workspace:${data.workspaceId}`).emit(event, data);
      }

      logger.debug({ event: 'socket_event_broadcast', socketEvent: event, executionId: data.executionId });
    } catch (err) {
      logger.error({ event: 'socket_bridge_error', error: (err as Error).message });
    }
  });
}

export function getIO(): SocketServer | null {
  return io;
}
