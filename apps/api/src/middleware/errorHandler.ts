import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../types';
import { logger } from '../config/logger';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const requestId = req.headers['x-request-id'] as string;

  // Zod validation errors
  if (err instanceof ZodError) {
    logger.warn({
      event: 'validation_error',
      requestId,
      path: req.path,
      errors: err.errors,
    });

    res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Invalid request data',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Operational errors (known, expected)
  if (err instanceof AppError && err.isOperational) {
    if (err.statusCode >= 500) {
      logger.error({
        event: 'operational_error',
        requestId,
        code: err.code,
        message: err.message,
        context: err.context,
        stack: err.stack,
      });
    } else {
      logger.warn({
        event: 'client_error',
        requestId,
        code: err.code,
        message: err.message,
      });
    }

    res.status(err.statusCode).json({
      success: false,
      error: err.code,
      message: err.message,
    });
    return;
  }

  // Unknown / programmer errors — don't leak details
  logger.error({
    event: 'unhandled_error',
    requestId,
    path: req.path,
    method: req.method,
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
}
