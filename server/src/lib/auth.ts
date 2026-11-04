import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { CookieOptions, Request, Response } from 'express';
import { config } from '../config.js';

export type Role = 'student' | 'staff' | 'owner' | 'admin';

export interface AuthUser {
  id: string;
  role: Role;
  email: string;
  name: string;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  email: string;
  name: string;
}

export function hashPassword(plain: string): string {
  return bcrypt.hashSync(plain, 10);
}

export function verifyPassword(plain: string, hash: string): boolean {
  return bcrypt.compareSync(plain, hash);
}

export function signToken(user: AuthUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, config.jwt.secret) as JwtPayload;
  } catch {
    return null;
  }
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(config.jwt.cookieName, token, cookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(config.jwt.cookieName, { ...cookieOptions(), maxAge: undefined });
}

export function tokenFromRequest(req: Request): string | null {
  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    config.jwt.cookieName
  ];
  if (cookieToken) return cookieToken;
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}
