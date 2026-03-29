import { Router } from "express";
import { db } from "@workspace/db";
import { auditLogs, users } from "@workspace/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/audit-logs", async (req, res) => {
  try {
    const { limit = "50", resourceType, since } = req.query;

    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        createdAt: auditLogs.createdAt,
        userId: auditLogs.userId,
        userName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(parseInt(limit as string));

    const result = rows.map(r => ({
      ...r,
      userInitials: r.userName
        ? (() => {
            const parts = r.userName.trim().split(/\s+/);
            return parts.length === 1
              ? parts[0][0].toUpperCase()
              : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
          })()
        : "?",
    }));

    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
