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

router.get("/admissions-performance", async (req, res) => {
  try {
    const now = new Date();
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());

    // ── 1. Week Performance ──────────────────────────────────────────────────
    const [weekLeadsRow] = await db.select({ count: count() }).from(inquiries)
      .where(gte(inquiries.createdAt, weekStart));
    const [weekAdmitsRow] = await db.select({ count: count() }).from(inquiries)
      .where(and(gte(inquiries.createdAt, weekStart), eq(inquiries.status, "admitted")));
    const weekLeads = Number(weekLeadsRow.count);
    const weekAdmits = Number(weekAdmitsRow.count);
    const weekConversion = weekLeads > 0 ? Math.round((weekAdmits / weekLeads) * 100) : 0;

    // ── 1b. Month Performance ─────────────────────────────────────────────────
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const [monthLeadsRow] = await db.select({ count: count() }).from(inquiries)
      .where(gte(inquiries.createdAt, monthStart));
    const [monthAdmitsRow] = await db.select({ count: count() }).from(inquiries)
      .where(and(gte(inquiries.createdAt, monthStart), eq(inquiries.status, "admitted")));
    const monthLeads = Number(monthLeadsRow.count);
    const monthAdmits = Number(monthAdmitsRow.count);
    const monthConversion = monthLeads > 0 ? Math.round((monthAdmits / monthLeads) * 100) : 0;

    // ── 2. Referral Sources ──────────────────────────────────────────────────
    const refRows = await db.select({
      source: inquiries.referralSource,
      leads: count(),
    }).from(inquiries)
      .where(and(sql`${inquiries.referralSource} IS NOT NULL`, gte(inquiries.createdAt, weekStart)))
      .groupBy(inquiries.referralSource)
      .orderBy(desc(count()))
      .limit(8);

    const referralSources2 = await Promise.all(refRows.map(async r => {
      const [admRow] = await db.select({ count: count() }).from(inquiries)
        .where(and(eq(inquiries.referralSource, r.source!), eq(inquiries.status, "admitted"), gte(inquiries.createdAt, weekStart)));
      const leads = Number(r.leads);
      const admits = Number(admRow.count);
      return { source: r.source || "Unknown", leads, admits, conversion: leads > 0 ? Math.round((admits/leads)*100) : 0 };
    }));
    referralSources2.sort((a,b) => b.admits - a.admits);

    // ── 3. Top Performers ────────────────────────────────────────────────────
    const repAdmits = await db.select({
      userId: inquiries.assignedTo,
      name: users.name,
      admits: count(),
    }).from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(and(sql`${inquiries.assignedTo} IS NOT NULL`, eq(inquiries.status, "admitted"), gte(inquiries.createdAt, weekStart)))
      .groupBy(inquiries.assignedTo, users.name)
      .orderBy(desc(count()))
      .limit(1);

    const repLeads = await db.select({
      userId: inquiries.assignedTo,
      name: users.name,
      leads: count(),
    }).from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(and(sql`${inquiries.assignedTo} IS NOT NULL`, gte(inquiries.createdAt, weekStart)))
      .groupBy(inquiries.assignedTo, users.name)
      .orderBy(desc(count()))
      .limit(1);

    // Top credit rep (person who gets credit for the admit) from patients table
    const bdReps = await db.select({
      repId: patients.creditUserId,
      name: users.name,
      leads: count(),
    }).from(patients)
      .leftJoin(users, eq(patients.creditUserId, users.id))
      .where(and(sql`${patients.creditUserId} IS NOT NULL`, gte(patients.admitDate, weekStart)))
      .groupBy(patients.creditUserId, users.name)
      .orderBy(desc(count()))
      .limit(1);

    // ── 4. Call Performance ───────────────────────────────────────────────────
    const [totalCallsToday] = await db.select({ count: count() }).from(inquiries)
      .where(and(sql`${inquiries.callDateTime} IS NOT NULL`, gte(inquiries.callDateTime, todayStart)));
    const [missedToday] = await db.select({ count: count() }).from(inquiries)
      .where(and(
        sql`${inquiries.callDateTime} IS NOT NULL`,
        gte(inquiries.callDateTime, todayStart),
        sql`(${inquiries.callStatus} = 'missed' OR ${inquiries.callDurationSeconds} < 15)`,
      ));
    const [totalCallsWeek] = await db.select({ count: count() }).from(inquiries)
      .where(and(sql`${inquiries.callDateTime} IS NOT NULL`, gte(inquiries.callDateTime, weekStart)));
    const [missedWeek] = await db.select({ count: count() }).from(inquiries)
      .where(and(
        sql`${inquiries.callDateTime} IS NOT NULL`,
        gte(inquiries.callDateTime, weekStart),
        sql`(${inquiries.callStatus} = 'missed' OR ${inquiries.callDurationSeconds} < 15)`,
      ));
    const totalW = Number(totalCallsWeek.count);
    const missedW = Number(missedWeek.count);
    const answerRate = totalW > 0 ? Math.round(((totalW - missedW) / totalW) * 100) : 100;

    // ── 5. Speed to Admit ─────────────────────────────────────────────────────
    const admittedThisWeek = await db.select({
      createdAt: inquiries.createdAt,
      admitDate: patients.admitDate,
    }).from(inquiries)
      .leftJoin(patients, sql`${patients.inquiryId} = ${inquiries.id}`)
      .where(and(
        eq(inquiries.status, "admitted"),
        gte(inquiries.createdAt, weekStart),
        sql`${patients.admitDate} IS NOT NULL`,
      ));

    let avgHoursToAdmit: number | null = null;
    if (admittedThisWeek.length > 0) {
      const totalMs = admittedThisWeek.reduce((sum, r) => {
        const diff = new Date(r.admitDate!).getTime() - new Date(r.createdAt!).getTime();
        return sum + (diff > 0 ? diff : 0);
      }, 0);
      avgHoursToAdmit = Math.round((totalMs / admittedThisWeek.length) / 3600000);
    }

    // ── 6. Pipeline Snapshot ──────────────────────────────────────────────────
    const [activeCount] = await db.select({ count: count() }).from(inquiries)
      .where(sql`${inquiries.status} NOT IN ('admitted','discharged','did_not_admit','referred_out')`);
    const [vobPending] = await db.select({ count: count() }).from(inquiries)
      .where(and(
        sql`${inquiries.vobData} IS NULL`,
        sql`${inquiries.insuranceProvider} IS NOT NULL`,
        sql`${inquiries.status} NOT IN ('admitted','discharged','did_not_admit','referred_out')`,
      ));
    const [readyToAdmit] = await db.select({ count: count() }).from(inquiries)
      .where(and(
        sql`${inquiries.appointmentDate} IS NOT NULL`,
        sql`${inquiries.status} NOT IN ('admitted','discharged')`,
      ));

    res.json({
      week:  { leads: weekLeads,  admits: weekAdmits,  conversion: weekConversion },
      month: { leads: monthLeads, admits: monthAdmits, conversion: monthConversion },
      referralSources: referralSources2,
      topPerformers: {
        admissionsRep: repAdmits[0] ? { name: repAdmits[0].name, admits: Number(repAdmits[0].admits) } : null,
        leadRep: repLeads[0] ? { name: repLeads[0].name, leads: Number(repLeads[0].leads) } : null,
        bdRep: bdReps[0] ? { name: bdReps[0].name, leads: Number(bdReps[0].leads) } : null,
      },
      calls: {
        missedToday: Number(missedToday.count),
        totalToday: Number(totalCallsToday.count),
        missedWeek: missedW,
        totalWeek: totalW,
        answerRate,
      },
      speed: { avgHoursToAdmit, sampleSize: admittedThisWeek.length },
      pipeline: {
        active: Number(activeCount.count),
        vobPending: Number(vobPending.count),
        readyToAdmit: Number(readyToAdmit.count),
      },
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Command Center (Home Dashboard) ────────────────────────────────────────
router.get("/dashboard/command-center", async (req, res) => {
  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 3600000);
    const fortyEightHoursAgo = new Date(now.getTime() - 48 * 3600000);

    // Last 5 active inquiries created (exclude terminal statuses)
    const recentRows = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      phone: inquiries.phone,
      status: inquiries.status,
      referralSource: inquiries.referralSource,
      createdAt: inquiries.createdAt,
    }).from(inquiries)
      .where(sql`${inquiries.status} NOT IN ('did_not_admit','discharged','referred_out')`)
      .orderBy(desc(inquiries.createdAt))
      .limit(5);

    // Ready to Admit — has appointment date, not yet admitted/discharged
    const readyRows = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      status: inquiries.status,
      appointmentDate: inquiries.appointmentDate,
      updatedAt: inquiries.updatedAt,
    }).from(inquiries)
      .where(and(
        sql`${inquiries.appointmentDate} IS NOT NULL`,
        sql`${inquiries.status} NOT IN ('admitted','discharged','did_not_admit','referred_out')`,
      ))
      .orderBy(asc(inquiries.appointmentDate))
      .limit(10);

    // Stuck leads — active leads not updated in 24+ hours in VOB or pre-assessment
    const [stuckVob] = await db.select({ count: count() }).from(inquiries)
      .where(and(
        eq(inquiries.status, "insurance_verification"),
        lte(inquiries.updatedAt, twentyFourHoursAgo),
      ));
    const [stuckPreAssess] = await db.select({ count: count() }).from(inquiries)
      .where(and(
        eq(inquiries.status, "pre_assessment"),
        lte(inquiries.updatedAt, twentyFourHoursAgo),
      ));
    const [stuckInitial] = await db.select({ count: count() }).from(inquiries)
      .where(and(
        sql`${inquiries.status} IN ('new','initial_contact')`,
        lte(inquiries.updatedAt, fortyEightHoursAgo),
      ));

    // Recent missed calls — list for action
    const missedCallRows = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      phone: inquiries.phone,
      callDateTime: inquiries.callDateTime,
      callStatus: inquiries.callStatus,
    }).from(inquiries)
      .where(and(
        sql`${inquiries.callStatus} = 'missed'`,
        sql`${inquiries.callDateTime} IS NOT NULL`,
      ))
      .orderBy(desc(inquiries.callDateTime))
      .limit(8);

    res.json({
      recentInquiries: recentRows.map(r => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        phone: r.phone,
        status: r.status,
        referralSource: r.referralSource,
        createdAt: r.createdAt,
      })),
      readyToAdmit: readyRows.map(r => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        status: r.status,
        appointmentDate: r.appointmentDate,
        updatedAt: r.updatedAt,
      })),
      stuckLeads: {
        vob: Number(stuckVob.count),
        preAssess: Number(stuckPreAssess.count),
        initialContact: Number(stuckInitial.count),
        total: Number(stuckVob.count) + Number(stuckPreAssess.count) + Number(stuckInitial.count),
      },
      missedCalls: missedCallRows.map(r => ({
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        phone: r.phone,
        callDateTime: r.callDateTime,
        callStatus: r.callStatus,
      })),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
