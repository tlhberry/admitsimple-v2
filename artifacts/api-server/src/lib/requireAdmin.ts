import { Request, Response, NextFunction } from "express";

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const sess = req.session as any;
  if (!sess?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (sess.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const sess = req.session as any;
    if (!sess?.userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    if (!roles.includes(sess.role)) {
      res.status(403).json({ error: "Access denied for your role" });
      return;
    }
    next();
  };
}

/** Returns true if the session user is a BD rep (block pipeline moves) */
export function isBdRep(req: Request): boolean {
  const sess = req.session as any;
  return sess?.role === "bd" || sess?.role === "bd_rep";
}
