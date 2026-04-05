import { db } from "@workspace/db";
import { auditLogs } from "@workspace/db/schema";

interface AuditParams {
  userId?: number | null;
  action: string;
  resourceType?: string;
  resourceId?: number | null;
  inquiryId?: number | null;
  details?: string;
  ipAddress?: string;
}

export async function logAudit(params: AuditParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId ?? null,
      action: params.action,
      resourceType: params.resourceType ?? null,
      resourceId: params.resourceId ?? null,
      inquiryId: params.inquiryId ?? null,
      details: params.details ?? null,
      ipAddress: params.ipAddress ?? null,
    });
  } catch {
    // Never let audit logging crash the main request
  }
}

export function getClientIp(req: { ip?: string; headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(",")[0].trim();
  }
  return req.ip ?? "unknown";
}
