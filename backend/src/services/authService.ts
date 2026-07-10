import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, env.JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; purpose?: string };
    if (payload.purpose) return null; // reject reset tokens (and any other special-purpose token) here
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

function hashFragment(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
}

export function signResetToken(userId: string, currentPasswordHash: string): string {
  const pwv = hashFragment(currentPasswordHash);
  return jwt.sign({ userId, purpose: 'reset', pwv }, env.JWT_SECRET, { expiresIn: '30m' });
}

export function verifyResetToken(token: string): { userId: string; pwv: string } | null {
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as { userId: string; purpose: string; pwv: string };
    if (payload.purpose !== 'reset') return null;
    return { userId: payload.userId, pwv: payload.pwv };
  } catch {
    return null;
  }
}

export function matchesCurrentPassword(pwv: string, currentPasswordHash: string): boolean {
  return pwv === hashFragment(currentPasswordHash);
}
