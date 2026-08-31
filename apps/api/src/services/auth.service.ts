import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { logger } from '../config/logger';
import {
  AppError,
  AuthError,
  ConflictError,
  NotFoundError,
  JWTPayload,
  WorkspaceRole,
} from '../types';

const SALT_ROUNDS = 12;

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  workspaceName: string;
}

export interface LoginInput {
  email: string;
  password: string;
  workspaceId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export class AuthService {
  private generateTokens(payload: JWTPayload): AuthTokens {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    });

    const refreshToken = jwt.sign(
      { userId: payload.userId, type: 'refresh' },
      env.JWT_SECRET,
      { expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    );

    return { accessToken, refreshToken, expiresIn: 900 }; // 15 min in seconds
  }

  async register(input: RegisterInput): Promise<{ user: object; tokens: AuthTokens }> {
    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

    // Create workspace slug
    const slug = input.workspaceName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48);

    const slugExists = await prisma.workspace.findUnique({ where: { slug } });
    const finalSlug = slugExists ? `${slug}-${Date.now()}` : slug;

    // Atomic: create user + workspace + membership
    const result = await prisma.$transaction(async (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          passwordHash,
        },
        select: { id: true, name: true, email: true, createdAt: true },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: input.workspaceName,
          slug: finalSlug,
          members: {
            create: {
              userId: user.id,
              role: 'OWNER',
            },
          },
        },
      });

      return { user, workspace };
    });

    const payload: JWTPayload = {
      userId: result.user.id,
      workspaceId: result.workspace.id,
      role: 'OWNER' as WorkspaceRole,
      email: input.email,
    };

    const tokens = this.generateTokens(payload);

    // Persist refresh token
    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: result.user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info({ event: 'user_registered', userId: result.user.id, workspaceId: result.workspace.id });

    return { user: result.user, tokens };
  }

  async login(input: LoginInput): Promise<{ user: object; workspace: object; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        workspaceMemberships: {
          include: { workspace: true },
          orderBy: { joinedAt: 'asc' },
          take: 1,
        },
      },
    });

    if (!user) throw new AuthError('Invalid email or password');

    const passwordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordValid) throw new AuthError('Invalid email or password');

    const membership = user.workspaceMemberships[0];
    if (!membership) throw new AppError('NO_WORKSPACE', 'No workspace found', 400);

    const payload: JWTPayload = {
      userId: user.id,
      workspaceId: membership.workspaceId,
      role: membership.role as WorkspaceRole,
      email: user.email,
    };

    const tokens = this.generateTokens(payload);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    logger.info({ event: 'user_logged_in', userId: user.id, workspaceId: membership.workspaceId });

    return {
      user: { id: user.id, name: user.name, email: user.email },
      workspace: { id: membership.workspaceId, name: membership.workspace.name, slug: membership.workspace.slug, role: membership.role },
      tokens,
    };
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let decoded: { userId: string; type: string };

    try {
      decoded = jwt.verify(refreshToken, env.JWT_SECRET) as typeof decoded;
    } catch {
      throw new AuthError('Invalid or expired refresh token');
    }

    if (decoded.type !== 'refresh') throw new AuthError('Invalid token type');

    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.expiresAt < new Date()) {
      throw new AuthError('Refresh token expired or revoked');
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: decoded.userId },
      include: { user: true },
      orderBy: { joinedAt: 'asc' },
    });

    if (!membership) throw new NotFoundError('User');

    const payload: JWTPayload = {
      userId: decoded.userId,
      workspaceId: membership.workspaceId,
      role: membership.role as WorkspaceRole,
      email: membership.user.email,
    };

    // Rotate refresh token
    await prisma.refreshToken.delete({ where: { token: refreshToken } });

    const tokens = this.generateTokens(payload);

    await prisma.refreshToken.create({
      data: {
        token: tokens.refreshToken,
        userId: decoded.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return tokens;
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
    logger.info({ event: 'user_logged_out' });
  }
}

export const authService = new AuthService();
