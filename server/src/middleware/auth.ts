import type { NextFunction, Request, Response } from 'express';
import { tokenFromRequest, verifyToken, type AuthUser, type Role } from '../lib/auth.js';
import { get } from '../db/index.js';
import { forbidden, unauthorized } from '../lib/errors.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: number;
}

/** Require a valid session. Loads the user from the DB so role/active changes apply immediately. */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = tokenFromRequest(req);
  if (!token) return next(unauthorized());
  const payload = verifyToken(token);
  if (!payload) return next(unauthorized('Session expired or invalid'));
  const user = get<UserRow>('SELECT id, email, name, role, is_active FROM users WHERE id = ?', [
    payload.sub,
  ]);
  if (!user) return next(unauthorized('Account no longer exists'));
  if (!user.is_active) return next(forbidden('Account is disabled'));
  req.user = { id: user.id, email: user.email, name: user.name, role: user.role };
  next();
}

/** Require one of the given roles. Use after requireAuth. */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

/** Admin bypasses cafe scoping; owners/staff must belong to the target cafe. */
export function assertCafeAccess(user: AuthUser, cafeId: string): void {
  if (user.role === 'admin') return;
  if (user.role === 'owner' || user.role === 'staff') {
    const member = get('SELECT id FROM cafe_members WHERE cafe_id = ? AND user_id = ?', [
      cafeId,
      user.id,
    ]);
    if (member) return;
  }
  throw forbidden('You do not have access to this cafe');
}

export function requireCafeAccess(cafeIdParam = 'cafeId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(unauthorized());
    const cafeId = String(req.params[cafeIdParam] ?? req.body?.cafeId ?? '');
    try {
      assertCafeAccess(req.user, cafeId);
      next();
    } catch (err) {
      next(err);
    }
  };
}
