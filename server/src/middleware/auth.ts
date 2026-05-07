import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthPayload {
  userId: string;
  role: string;
  team: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/** Requires ADMIN or DEV role */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'DEV')) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

/** Requires DEV role only */
export function requireDev(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'DEV') {
    res.status(403).json({ error: 'Dev access required' });
    return;
  }
  next();
}
