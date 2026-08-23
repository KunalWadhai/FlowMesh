import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AuthenticatedRequest, JWTPayload, AuthError, ForbiddenError, WorkspaceRole } from '../types';

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;

    (req as AuthenticatedRequest).user = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(new AuthError('Invalid token'));
    } else if (err instanceof jwt.TokenExpiredError) {
      next(new AuthError('Token expired'));
    } else {
      next(err);
    }
  }
}

export function requireRole(...roles: WorkspaceRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return next(new AuthError());
    }

    if (!roles.includes(user.role)) {
      return next(new ForbiddenError(`Required role: ${roles.join(' or ')}`));
    }

    next();
  };
}

export function requireWorkspace(req: Request, res: Response, next: NextFunction): void {
  const user = (req as AuthenticatedRequest).user;
  const workspaceId = req.headers['x-workspace-id'] as string || req.params.workspaceId;

  if (!workspaceId) {
    return next(new AuthError('Workspace ID required'));
  }

  if (user.workspaceId !== workspaceId) {
    return next(new ForbiddenError('Access denied to this workspace'));
  }

  next();
}
