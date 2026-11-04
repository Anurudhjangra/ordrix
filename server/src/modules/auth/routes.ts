import { Router } from 'express';
import { z } from 'zod';
import { get, run, tx } from '../../db/index.js';
import { id } from '../../lib/ids.js';
import {
  clearAuthCookie,
  hashPassword,
  setAuthCookie,
  signToken,
  verifyPassword,
  type AuthUser,
  type Role,
} from '../../lib/auth.js';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { badRequest, conflict, notFound, unauthorized } from '../../lib/errors.js';
import { requireAuth } from '../../middleware/auth.js';
import { audit } from '../../lib/audit.js';

export const authRouter = Router();

const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email address');
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128);

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80),
  email: emailSchema,
  phone: z.string().trim().min(6).max(20).optional(),
  password: passwordSchema,
  university: z.string().trim().max(120).optional(),
  studentId: z.string().trim().max(60).optional(),
});

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: Role;
  is_active: number;
  password_hash: string;
}

function toPublicUser(row: {
  id: string;
  email: string;
  name: string;
  role: Role;
}): AuthUser {
  return { id: row.id, email: row.email, name: row.name, role: row.role };
}

authRouter.post(
  '/register',
  asyncHandler(async (req, res) => {
    const data = registerSchema.parse(req.body);
    const existing = get<UserRow>('SELECT id FROM users WHERE email = ?', [data.email]);
    if (existing) throw conflict('An account with this email already exists');

    const userId = id();
    tx(() => {
      run(
        `INSERT INTO users (id, email, name, phone, password_hash, role, is_active)
         VALUES (?,?,?,?,?,'student',1)`,
        [userId, data.email, data.name, data.phone ?? null, hashPassword(data.password)],
      );
      run(
        'INSERT INTO student_profiles (user_id, university, student_id) VALUES (?,?,?)',
        [userId, data.university ?? null, data.studentId ?? null],
      );
    });

    const user: AuthUser = { id: userId, email: data.email, name: data.name, role: 'student' };
    setAuthCookie(res, signToken(user));
    audit({ actorId: userId, action: 'user.register', entityType: 'user', entityId: userId });
    res.status(201).json({ user });
  }),
);

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const data = loginSchema.parse(req.body);
    const row = get<UserRow>('SELECT * FROM users WHERE email = ?', [data.email]);
    if (!row || !verifyPassword(data.password, row.password_hash)) {
      throw unauthorized('Invalid email or password');
    }
    if (!row.is_active) throw unauthorized('This account is disabled');
    const user = toPublicUser(row);
    setAuthCookie(res, signToken(user));
    audit({ actorId: user.id, action: 'user.login', entityType: 'user', entityId: user.id });
    res.json({ user });
  }),
);

authRouter.post('/logout', (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const profile = get(
      'SELECT university, student_id, default_notes FROM student_profiles WHERE user_id = ?',
      [user.id],
    );
    const memberships = get(
      'SELECT cm.cafe_id, cm.role_in_cafe, c.name as cafe_name FROM cafe_members cm JOIN cafes c ON c.id = cm.cafe_id WHERE cm.user_id = ?',
      [user.id],
    );
    res.json({ user, profile: profile ?? null, cafeMembership: memberships ?? null });
  }),
);

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(20).nullable().optional(),
  university: z.string().trim().max(120).nullable().optional(),
  studentId: z.string().trim().max(60).nullable().optional(),
  defaultNotes: z.string().trim().max(300).nullable().optional(),
});

authRouter.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    const user = req.user!;
    tx(() => {
      if (data.name !== undefined || data.phone !== undefined) {
        const current = get<UserRow>('SELECT * FROM users WHERE id = ?', [user.id]);
        if (!current) throw notFound('User not found');
        run("UPDATE users SET name = ?, phone = ?, updated_at = datetime('now') WHERE id = ?", [
          data.name ?? current.name,
          data.phone === undefined ? (current as unknown as { phone: string | null }).phone : data.phone,
          user.id,
        ]);
      }
      const profileFields: Record<string, string | null> = {};
      if (data.university !== undefined) profileFields.university = data.university;
      if (data.studentId !== undefined) profileFields.student_id = data.studentId;
      if (data.defaultNotes !== undefined) profileFields.default_notes = data.defaultNotes;
      if (Object.keys(profileFields).length) {
        const existing = get('SELECT user_id FROM student_profiles WHERE user_id = ?', [user.id]);
        if (!existing) {
          run('INSERT INTO student_profiles (user_id) VALUES (?)', [user.id]);
        }
        for (const [field, value] of Object.entries(profileFields)) {
          run(`UPDATE student_profiles SET ${field} = ?, updated_at = datetime('now') WHERE user_id = ?`, [
            value,
            user.id,
          ]);
        }
      }
    });
    const fresh = get<UserRow>('SELECT * FROM users WHERE id = ?', [user.id]);
    if (!fresh) throw badRequest('Failed to load updated profile');
    res.json({ user: toPublicUser(fresh) });
  }),
);
