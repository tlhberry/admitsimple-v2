import { Router } from "express";
import { db } from "@workspace/db";
import { patients, users, bdActivityLogs, inquiries } from "@workspace/db/schema";
import { eq, and, gte, count, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();
router.use(requireAuth);

router.get("/bd-reports", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const allUsers = await db.select().from(users).where(
      and(eq(users.companyId, companyId), sql`role IN ('bd_rep', 'staff', 'admin')`)
    );

    const repMetrics = await Promise.all(allUsers.map(async (u) => {
      const [f2fWeek] = await db.select({ count: count() }).from(bdActivityLogs).where(
        and(eq(bdActivityLogs.companyId, companyId), eq(bdActivityLogs.userId, u.id), eq(bdActivityLogs.activityType, "face_to_face"), gte(bdActivityLogs.activityDate, startOfWeek))
      );
      const [f2fMonth] = await db.select({ count: count() }).from(bdActivityLogs).where(
        and(eq(bdActivityLogs.companyId, companyId), eq(bdActivityLogs.userId, u.id), eq(bdActivityLogs.activityType, "face_to_face"), gte(bdActivityLogs.activityDate, startOfMonth))
      );
      const [creditedAdmits] = await db.select({ count: count() }).from(patients).where(
        and(eq(patients.companyId, companyId), eq(patients.creditUserId, u.id))
      );
      const admitsBySource = await db.select({ source: inquiries.referralSource, count: count() }).from(patients)
        .leftJoin(inquiries, eq(patients.inquiryId, inquiries.id))
        .where(and(eq(patients.companyId, companyId), eq(patients.creditUserId, u.id), sql`${inquiries.referralSource} IS NOT NULL`))
        .groupBy(inquiries.referralSource);

      const initials = (() => {
        const parts = u.name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0][0].toUpperCase();
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      })();

      return {
        userId: u.id,
        name: u.name,
        initials,
        role: u.role,
        f2fThisWeek: Number(f2fWeek?.count ?? 0),
        f2fThisMonth: Number(f2fMonth?.count ?? 0),
        creditedAdmissions: Number(creditedAdmits?.count ?? 0),
        admissionsBySource: admitsBySource.map(r => ({ source: r.source, count: Number(r.count) })),
      };
    }));

    res.json(repMetrics);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
