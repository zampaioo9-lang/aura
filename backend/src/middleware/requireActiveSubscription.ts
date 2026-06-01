import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

// Freemium: all authenticated users have access. Pro features are gated by requirePro.
export async function requireActiveSubscription(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  next();
}
