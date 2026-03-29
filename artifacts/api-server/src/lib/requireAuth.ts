import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const sess = req.session as any;
  if (!sess?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
