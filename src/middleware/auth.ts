import type { Request, Response, NextFunction } from 'express';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';
import type { UserRow } from '../db/schema.ts';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
  dbUser?: UserRow;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Sesi tidak ditemukan. Silakan masuk terlebih dahulu.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;

    const email = decodedToken.email || `${decodedToken.uid}@moodtune.local`;
    const displayName =
      typeof decodedToken.name === 'string' ? decodedToken.name : null;

    req.dbUser = await getOrCreateUser(decodedToken.uid, email, displayName);
    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token or syncing user:', error);
    res.status(401).json({ error: 'Token sesi tidak valid atau kedaluwarsa. Silakan masuk kembali.' });
  }
};
