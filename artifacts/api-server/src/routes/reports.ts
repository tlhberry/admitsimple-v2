import { Router } from "express";
import { db } from "@workspace/db";
import { reports, users, inquiries } from "@workspace/db/schema";
import { eq, desc, count, sql, inArray, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();
router.use(requireAuth);

router.get("/reports/admissions-insights", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const h24 = new Date(Date.now() - 24 * 60 * 60 * 1000);

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
      db.select({ n: count() }).from(inquiries).where(eq(inquiries.companyId, companyId)),
      db.select({ n: count() }).from(inquiries).where(and(eq(inquiries.companyId, companyId), sql`(${inquiries.vobData} IS NOT NULL OR ${inquiries.costAcceptance} IS NOT NULL)`)),
      db.select({ n: count() }).from(inquiries).where(and(eq(inquiries.companyId, companyId), eq(inquiries.status, "Scheduled to Admit"))),
      db.select({ n: count() }).from(inquiries).where(and(eq(inquiries.companyId, companyId), eq(inquiries.status, "Admitted"))),
      db.select({ n: count() }).from(inquiries).where(and(eq(inquiries.companyId, companyId), sql`${inquiries.status} NOT IN ('Admitted','Discharged','Did Not Admit','Non-Viable') AND ${inquiries.updatedAt} < ${h24}`)),
      db.select({ name: users.name, admits: count() }).from(inquiries)
        .leftJoin(users, eq(inquiries.assignedTo, users.id))
        .where(and(eq(inquiries.companyId, companyId), eq(inquiries.status, "Admitted")))
        .groupBy(users.name).orderBy(desc(count())).limit(5),
      db.select({ source: inquiries.referralSource, admits: count() }).from(inquiries)
        .where(and(eq(inquiries.companyId, companyId), eq(inquiries.status, "Admitted")))
        .groupBy(inquiries.referralSource).orderBy(desc(count())).limit(8),
      db.select({ reason: inquiries.nonAdmitReason, n: count() }).from(inquiries)
        .where(and(eq(inquiries.companyId, companyId), inArray(inquiries.status, ["Did Not Admit", "Non-Viable"])))
        .groupBy(inquiries.nonAdmitReason).orderBy(desc(count())),
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
      topReferrals: topReferrals.filter(r => r.source).map(r => ({ source: r.source!, admits: Number(r.admits) })),
      lostReasons: lostReasons.map(r => ({ reason: r.reason || "Unknown", count: Number(r.n) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/reports", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
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
    }).from(reports).leftJoin(users, eq(reports.generatedBy, users.id)).where(eq(reports.companyId, companyId)).orderBy(desc(reports.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reports", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const sess = req.session as any;
    const data = req.body;
    const [row] = await db.insert(reports).values({
      companyId,
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
    const companyId = getCompanyId(req);
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
    }).from(reports).leftJoin(users, eq(reports.generatedBy, users.id)).where(and(eq(reports.id, id), eq(reports.companyId, companyId)));
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/reports/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    await db.delete(reports).where(and(eq(reports.id, id), eq(reports.companyId, companyId)));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
