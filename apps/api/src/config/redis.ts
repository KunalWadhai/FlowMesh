import Redis from 'ioredis';
import { env } from './env';
import { logger } from './logger';

let redisInstance: Redis | null = null;

export function getRedis(): Redis {
  if (!redisInstance) {
    redisInstance = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: null, // Required for BullMQ
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        logger.warn({ event: 'redis_reconnecting', attempt: times, delayMs: delay });
        return delay;
      },
      enableReadyCheck: false,
    });

    redisInstance.on('connect', () => {
      logger.info({ event: 'redis_connected', url: env.REDIS_URL });
    });

    redisInstance.on('error', (err) => {
      logger.error({ event: 'redis_error', error: err.message });
    });

    redisInstance.on('close', () => {
      logger.warn({ event: 'redis_disconnected' });
    });
  }

  return redisInstance;
}

// Separate connection for BullMQ (needs maxRetriesPerRequest: null)
export function createBullMQConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 50, 2000),
  });
}

export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    await redisInstance.quit();
    redisInstance = null;
    logger.info({ event: 'redis_closed' });
  }
}
