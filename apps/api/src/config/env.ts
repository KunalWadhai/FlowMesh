import path from 'path';
import dotenv from 'dotenv';

// Load from apps/api/.env first, then fallback to root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required env var: ${key}`);
  return value;
}

function optionalEnv(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export const env = {
  NODE_ENV: optionalEnv('NODE_ENV', 'development'),
  PORT: parseInt(optionalEnv('PORT', '3001'), 10),

  // Database
  DATABASE_URL: requireEnv('DATABASE_URL'),

  // Redis
  REDIS_URL: optionalEnv('REDIS_URL', 'redis://localhost:6379'),

  // JWT
  JWT_SECRET: requireEnv('JWT_SECRET'),
  JWT_EXPIRES_IN: optionalEnv('JWT_EXPIRES_IN', '15m'),
  JWT_REFRESH_EXPIRES_IN: optionalEnv('JWT_REFRESH_EXPIRES_IN', '7d'),

  // NVIDIA NIM (OpenAI-compatible) AI
  NVIDIA_API_KEY: requireEnv('NVIDIA_API_KEY'),
  NVIDIA_BASE_URL: optionalEnv('NVIDIA_BASE_URL', 'https://integrate.api.nvidia.com/v1'),
  NVIDIA_MODEL: optionalEnv('NVIDIA_MODEL', 'meta/muse-glimmer-30b'),

  // CORS
  CORS_ORIGINS: optionalEnv('CORS_ORIGINS', 'http://localhost:5173').split(','),

  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: parseInt(optionalEnv('RATE_LIMIT_WINDOW_MS', '900000'), 10),
  RATE_LIMIT_MAX: parseInt(optionalEnv('RATE_LIMIT_MAX', '200'), 10),

  // Worker
  WORKER_CONCURRENCY: parseInt(optionalEnv('WORKER_CONCURRENCY', '10'), 10),
  MAX_EXECUTION_DURATION_MS: parseInt(optionalEnv('MAX_EXECUTION_DURATION_MS', '300000'), 10),

  isDev: () => process.env.NODE_ENV !== 'production',
  isProd: () => process.env.NODE_ENV === 'production',
} as const;
