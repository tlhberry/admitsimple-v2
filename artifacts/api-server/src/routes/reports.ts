import { Router } from "express";
import { db } from "@workspace/db";
import { reports, users, inquiries } from "@workspace/db/schema";
import { eq, desc, count, sql, isNotNull, inArray, lt } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

// ── Admissions Insights Dashboard ──────────────────────────────────
router.get("/reports/admissions-insights", async (req, res) => {
  try {
    const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const INACTIVE_STATUSES = ["Admitted", "Discharged", "Did Not Admit", "Non-Viable"];

    const [
      totalInquiries,
      vobCompleted,
      scheduledToAdmit,
      admitted,
      needsFollowUp,
      topReps,
      topReferrals,
      lostReasons,
    ] = await Promise.all([
      // Total inquiries (all time)
      db.select({ n: count() }).from(inquiries),

      // VOB completed (has vob data or cost acceptance)
      db.select({ n: count() }).from(inquiries).where(
        sql`(${inquiries.vobData} IS NOT NULL OR ${inquiries.costAcceptance} IS NOT NULL)`
      ),

      // Scheduled to Admit
      db.select({ n: count() }).from(inquiries).where(eq(inquiries.status, "Scheduled to Admit")),

      // Admitted
      db.select({ n: count() }).from(inquiries).where(eq(inquiries.status, "Admitted")),

      // Needs follow-up: active, not updated in 24h
      db.select({ n: count() }).from(inquiries).where(
        sql`${inquiries.status} NOT IN ('Admitted','Discharged','Did Not Admit','Non-Viable') AND ${inquiries.updatedAt} < ${h24}`
      ),

      // Top BD reps by admitted inquiries
      db.select({
        name: users.name,
        admits: count(),
      })
        .from(inquiries)
        .leftJoin(users, eq(inquiries.assignedTo, users.id))
        .where(eq(inquiries.status, "Admitted"))
        .groupBy(users.name)
        .orderBy(desc(count()))
        .limit(5),

      // Top referral sources by admitted inquiries
      db.select({
        source: inquiries.referralSource,
        admits: count(),
      })
        .from(inquiries)
        .where(eq(inquiries.status, "Admitted"))
        .groupBy(inquiries.referralSource)
        .orderBy(desc(count()))
        .limit(8),

      // Lost lead reasons
      db.select({
        reason: inquiries.nonAdmitReason,
        n: count(),
      })
        .from(inquiries)
        .where(inArray(inquiries.status, ["Did Not Admit", "Non-Viable"]))
        .groupBy(inquiries.nonAdmitReason)
        .orderBy(desc(count())),
    ]);

    const total = totalInquiries[0]?.n ?? 0;
    const vob = vobCompleted[0]?.n ?? 0;
    const sched = scheduledToAdmit[0]?.n ?? 0;
    const adm = admitted[0]?.n ?? 0;

    const pct = (a: number, b: number) => b === 0 ? null : Math.round((a / b) * 100);

    res.json({
      funnel: [
        { stage: "Total Inquiries", count: total, pct: null },
        { stage: "VOB Completed", count: vob, pct: pct(vob, total) },
        { stage: "Scheduled to Admit", count: sched, pct: pct(sched, vob || total) },
        { stage: "Admitted", count: adm, pct: pct(adm, sched || total) },
      ],
      needsFollowUp: needsFollowUp[0]?.n ?? 0,
      topReps: topReps.map(r => ({ name: r.name ?? "Unassigned", admits: Number(r.admits) })),
      topReferrals: topReferrals
        .filter(r => r.source)
        .map(r => ({ source: r.source!, admits: Number(r.admits) })),
      lostReasons: lostReasons
        .map(r => ({ reason: r.reason || "Unknown", count: Number(r.n) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const rows = await db.select({
      id: reports.id,
      title: reports.title,
      type: reports.type,
      generatedBy: reports.generatedBy,
      generatedByName: users.name,
      dateRangeStart: reports.dateRangeStart,
      dateRangeEnd: reports.dateRangeEnd,
      parameters: reports.parameters,
      aiNarrative: reports.aiNarrative,
      reportData: reports.reportData,
      createdAt: reports.createdAt,
    }).from(reports).leftJoin(users, eq(reports.generatedBy, users.id)).orderBy(desc(reports.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports", async (req, res) => {
  try {
    const sess = req.session as any;
    const data = req.body;
    const [row] = await db.insert(reports).values({
      title: data.title,
      type: data.type,
      generatedBy: sess.userId,
      dateRangeStart: data.dateRangeStart ? new Date(data.dateRangeStart) : null,
      dateRangeEnd: data.dateRangeEnd ? new Date(data.dateRangeEnd) : null,
      parameters: data.parameters,
      aiNarrative: data.aiNarrative,
      reportData: data.reportData,
    }).returning();
    res.status(201).json({ ...row, generatedByName: sess.name });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select({
      id: reports.id,
      title: reports.title,
      type: reports.type,
      generatedBy: reports.generatedBy,
      generatedByName: users.name,
      dateRangeStart: reports.dateRangeStart,
      dateRangeEnd: reports.dateRangeEnd,
      parameters: reports.parameters,
      aiNarrative: reports.aiNarrative,
      reportData: reports.reportData,
      createdAt: reports.createdAt,
    }).from(reports).leftJoin(users, eq(reports.generatedBy, users.id)).where(eq(reports.id, id));
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/reports/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(reports).where(eq(reports.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
