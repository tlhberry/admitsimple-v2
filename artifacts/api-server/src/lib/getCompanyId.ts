import { Request } from "express";

/**
 * Extract the companyId from the session.
 * Throws a 401 error if not present — call this in every authenticated route
 * that needs tenant isolation.
 */
export function getCompanyId(req: Request): number {
  const sess = req.session as any;
  const id = sess?.companyId;
  if (!id) {
    const err: any = new Error("No company in session — please log in again");
    err.status = 401;
    throw err;
  }
  return id as number;
}
