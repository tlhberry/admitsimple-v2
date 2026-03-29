import { db } from "@workspace/db";
import { auditLogs, users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { Request } from "express";

export async function logAudit(
  req: Request,
  action: string,
  resourceType: string,
  resourceId?: number,
) {
  try {
    const sess = req.session as any;
    const userId = sess?.userId;
    if (!userId) return;
    await db.insert(auditLogs).values({
      userId,
      action,
      resourceType,
      resourceId: resourceId ?? null,
      ipAddress: req.ip || null,
    });
  } catch {
    // never throw from audit logging
  }
}

export function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
