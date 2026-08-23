import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

prisma.$on('error', (e: { target: string; message: string }) => {
  logger.error({ event: 'prisma_error', target: e.target, message: e.message });
});

prisma.$on('warn', (e: { target: string; message: string }) => {
  logger.warn({ event: 'prisma_warn', target: e.target, message: e.message });
});

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info({ event: 'prisma_disconnected' });
}
