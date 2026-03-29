import { Router } from "express";
import { db } from "@workspace/db";
import { inquiries, patients, users, referralSources } from "@workspace/db/schema";
import { eq, and, gte, lte, count, desc, asc, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/analytics/dashboard", async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todaysInquiries] = await db.select({ count: count() }).from(inquiries).where(gte(inquiries.createdAt, today));
    const [weeksAdmissions] = await db.select({ count: count() }).from(patients).where(gte(patients.admitDate, weekStart));
    const [census] = await db.select({ count: count() }).from(patients).where(eq(patients.status, "active"));
    const [monthInquiries] = await db.select({ count: count() }).from(inquiries).where(gte(inquiries.createdAt, monthStart));
    const [monthAdmitted] = await db.select({ count: count() }).from(inquiries).where(and(gte(inquiries.createdAt, monthStart), eq(inquiries.status, "admitted")));

    const conversionRate = Number(monthInquiries.count) > 0
      ? Math.round((Number(monthAdmitted.count) / Number(monthInquiries.count)) * 100)
      : 0;

    const recentInquiries = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      phone: inquiries.phone,
      email: inquiries.email,
      dob: inquiries.dob,
      insuranceProvider: inquiries.insuranceProvider,
      insuranceMemberId: inquiries.insuranceMemberId,
      primaryDiagnosis: inquiries.primaryDiagnosis,
      substanceHistory: inquiries.substanceHistory,
      medicalHistory: inquiries.medicalHistory,
      mentalHealthHistory: inquiries.mentalHealthHistory,
      levelOfCare: inquiries.levelOfCare,
      referralSource: inquiries.referralSource,
      referralContact: inquiries.referralContact,
      assignedTo: inquiries.assignedTo,
      assignedToName: users.name,
      status: inquiries.status,
      priority: inquiries.priority,
      notes: inquiries.notes,
      aiParsedData: inquiries.aiParsedData,
      parsedAt: inquiries.parsedAt,
      createdAt: inquiries.createdAt,
      updatedAt: inquiries.updatedAt,
    }).from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .orderBy(desc(inquiries.createdAt))
      .limit(10);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyCounts = await db.select({
      date: sql<string>`DATE(${inquiries.createdAt})`.as("date"),
      count: count(),
    }).from(inquiries)
      .where(gte(inquiries.createdAt, thirtyDaysAgo))
      .groupBy(sql`DATE(${inquiries.createdAt})`)
      .orderBy(asc(sql`DATE(${inquiries.createdAt})`));

    const statusCounts = await db.select({
      status: inquiries.status,
      count: count(),
    }).from(inquiries).groupBy(inquiries.status);

    const referralCounts = await db.select({
      source: inquiries.referralSource,
      count: count(),
    }).from(inquiries)
      .where(sql`${inquiries.referralSource} IS NOT NULL`)
      .groupBy(inquiries.referralSource)
      .orderBy(desc(count()))
      .limit(8);

    res.json({
      kpi: {
        todaysInquiries: Number(todaysInquiries.count),
        weeksAdmissions: Number(weeksAdmissions.count),
        census: Number(census.count),
        conversionRate,
      },
      recentInquiries,
      inquiriesByDay: dailyCounts,
      statusBreakdown: statusCounts.map(r => ({ status: r.status, count: Number(r.count) })),
      referralBreakdown: referralCounts.map(r => ({ source: r.source || "Unknown", count: Number(r.count) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/analytics/charts", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const dailyCounts = await db.select({
      date: sql<string>`DATE(${inquiries.createdAt})`.as("date"),
      count: count(),
    }).from(inquiries)
      .where(and(gte(inquiries.createdAt, start), lte(inquiries.createdAt, end)))
      .groupBy(sql`DATE(${inquiries.createdAt})`)
      .orderBy(asc(sql`DATE(${inquiries.createdAt})`));

    const statusCounts = await db.select({
      status: inquiries.status,
      count: count(),
    }).from(inquiries).groupBy(inquiries.status);

    const funnelData = [
      { stage: "Inquiries", count: await db.select({ count: count() }).from(inquiries).where(and(gte(inquiries.createdAt, start), lte(inquiries.createdAt, end))).then(r => Number(r[0].count)) },
      { stage: "Contacted", count: await db.select({ count: count() }).from(inquiries).where(and(gte(inquiries.createdAt, start), lte(inquiries.createdAt, end), eq(inquiries.status, "contacted"))).then(r => Number(r[0].count)) },
      { stage: "Qualified", count: await db.select({ count: count() }).from(inquiries).where(and(gte(inquiries.createdAt, start), lte(inquiries.createdAt, end), eq(inquiries.status, "qualified"))).then(r => Number(r[0].count)) },
      { stage: "Admitted", count: await db.select({ count: count() }).from(inquiries).where(and(gte(inquiries.createdAt, start), lte(inquiries.createdAt, end), eq(inquiries.status, "admitted"))).then(r => Number(r[0].count)) },
    ];

    const referralPerf = await db.select({
      source: inquiries.referralSource,
      inquiries: count(),
    }).from(inquiries)
      .where(and(sql`${inquiries.referralSource} IS NOT NULL`, gte(inquiries.createdAt, start), lte(inquiries.createdAt, end)))
      .groupBy(inquiries.referralSource)
      .orderBy(desc(count()))
      .limit(10);

    const referralWithConv = await Promise.all(referralPerf.map(async r => {
      const [admittedCount] = await db.select({ count: count() }).from(inquiries)
        .where(and(eq(inquiries.referralSource, r.source!), eq(inquiries.status, "admitted"), gte(inquiries.createdAt, start), lte(inquiries.createdAt, end)));
      return {
        source: r.source || "Unknown",
        inquiries: Number(r.inquiries),
        admitted: Number(admittedCount.count),
        conversionRate: Number(r.inquiries) > 0 ? Math.round((Number(admittedCount.count) / Number(r.inquiries)) * 100) : 0,
      };
    }));

    const locDist = await db.select({
      levelOfCare: inquiries.levelOfCare,
      count: count(),
    }).from(inquiries)
      .where(sql`${inquiries.levelOfCare} IS NOT NULL`)
      .groupBy(inquiries.levelOfCare);

    const staffPerf = await db.select({
      name: users.name,
      inquiries: count(),
    }).from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(sql`${inquiries.assignedTo} IS NOT NULL`)
      .groupBy(users.name)
      .orderBy(desc(count()))
      .limit(10);

    const payerMix = await db.select({
      provider: inquiries.insuranceProvider,
      count: count(),
    }).from(inquiries)
      .where(sql`${inquiries.insuranceProvider} IS NOT NULL`)
      .groupBy(inquiries.insuranceProvider)
      .orderBy(desc(count()))
      .limit(8);

    res.json({
      admissionsOverTime: dailyCounts,
      inquiriesByStatus: statusCounts.map(r => ({ status: r.status, count: Number(r.count) })),
      conversionFunnel: funnelData,
      referralPerformance: referralWithConv,
      levelOfCareDistribution: locDist.map(r => ({ levelOfCare: r.levelOfCare || "Unknown", count: Number(r.count) })),
      staffPerformance: staffPerf.map(r => ({ name: r.name || "Unassigned", inquiries: Number(r.inquiries) })),
      payerMix: payerMix.map(r => ({ provider: r.provider || "Unknown", count: Number(r.count) })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
