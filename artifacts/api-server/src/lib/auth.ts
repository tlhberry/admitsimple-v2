import bcrypt from "bcryptjs";
import { Request, Response, NextFunction } from "express";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const session = req.session as any;
  if (!session?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
    name: string;
    email: string;
    role: string;
  }
}
