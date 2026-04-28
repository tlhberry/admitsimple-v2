import { Router } from "express";
import { db } from "@workspace/db";
import {
  referralAccounts, referralContacts, bdActivityLogs, users,
} from "@workspace/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { getAnthropicClient } from "../lib/anthropicClient";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();
router.use(requireAuth);

const accountSelect = {
  id: referralAccounts.id,
  name: referralAccounts.name,
  type: referralAccounts.type,
  address: referralAccounts.address,
  phone: referralAccounts.phone,
  website: referralAccounts.website,
  notes: referralAccounts.notes,
  assignedBdRepId: referralAccounts.assignedBdRepId,
  assignedBdRepName: users.name,
  createdBy: referralAccounts.createdBy,
  createdAt: referralAccounts.createdAt,
  updatedAt: referralAccounts.updatedAt,
};

router.get("/referral-accounts", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const user = (req as any).user;
    let rows;
    if (user?.role === "bd_rep") {
      rows = await db.select(accountSelect).from(referralAccounts)
        .leftJoin(users, eq(referralAccounts.assignedBdRepId, users.id))
        .where(and(eq(referralAccounts.companyId, companyId), eq(referralAccounts.assignedBdRepId, user.id)))
        .orderBy(desc(referralAccounts.updatedAt));
    } else {
      rows = await db.select(accountSelect).from(referralAccounts)
        .leftJoin(users, eq(referralAccounts.assignedBdRepId, users.id))
        .where(eq(referralAccounts.companyId, companyId))
        .orderBy(desc(referralAccounts.updatedAt));
    }

    const accountIds = rows.map(r => r.id);
    const lastActivities: Record<number, Date | null> = {};
    for (const id of accountIds) {
      const [la] = await db.select({ activityDate: bdActivityLogs.activityDate })
        .from(bdActivityLogs)
        .where(eq(bdActivityLogs.accountId, id))
        .orderBy(desc(bdActivityLogs.activityDate))
        .limit(1);
      lastActivities[id] = la?.activityDate ?? null;
    }

    res.json(rows.map(r => ({ ...r, lastActivityDate: lastActivities[r.id] ?? null })));
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referral-accounts", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const user = (req as any).user;
    const sess = req.session as any;
    const { name, type, address, phone, website, notes, assignedBdRepId } = req.body;
    const [row] = await db.insert(referralAccounts).values({
      companyId,
      name, type, address, phone, website, notes,
      assignedBdRepId: assignedBdRepId ? parseInt(assignedBdRepId) : null,
      createdBy: user?.id ?? sess?.userId ?? null,
    }).returning();
    const full = await db.select(accountSelect).from(referralAccounts)
      .leftJoin(users, eq(referralAccounts.assignedBdRepId, users.id))
      .where(eq(referralAccounts.id, row.id));
    res.status(201).json({ ...full[0], lastActivityDate: null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/referral-accounts/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const rows = await db.select(accountSelect).from(referralAccounts)
      .leftJoin(users, eq(referralAccounts.assignedBdRepId, users.id))
      .where(and(eq(referralAccounts.id, id), eq(referralAccounts.companyId, companyId)));
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    const [la] = await db.select({ activityDate: bdActivityLogs.activityDate })
      .from(bdActivityLogs).where(eq(bdActivityLogs.accountId, id))
      .orderBy(desc(bdActivityLogs.activityDate)).limit(1);
    res.json({ ...rows[0], lastActivityDate: la?.activityDate ?? null });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/referral-accounts/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const { name, type, address, phone, website, notes, assignedBdRepId } = req.body;
    const update: any = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (type !== undefined) update.type = type;
    if (address !== undefined) update.address = address;
    if (phone !== undefined) update.phone = phone;
    if (website !== undefined) update.website = website;
    if (notes !== undefined) update.notes = notes;
    if (assignedBdRepId !== undefined) update.assignedBdRepId = assignedBdRepId ? parseInt(assignedBdRepId) : null;
    await db.update(referralAccounts).set(update).where(and(eq(referralAccounts.id, id), eq(referralAccounts.companyId, companyId)));
    const rows = await db.select(accountSelect).from(referralAccounts)
      .leftJoin(users, eq(referralAccounts.assignedBdRepId, users.id))
      .where(eq(referralAccounts.id, id));
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/referral-accounts/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    await db.delete(referralAccounts).where(and(eq(referralAccounts.id, id), eq(referralAccounts.companyId, companyId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/referral-accounts/:id/contacts", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const accountId = parseInt(req.params.id);
    const rows = await db.select().from(referralContacts)
      .where(and(eq(referralContacts.accountId, accountId), eq(referralContacts.companyId, companyId)))
      .orderBy(desc(referralContacts.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referral-accounts/:id/contacts", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { name, position, phone, email, notes } = req.body;
    const [row] = await db.insert(referralContacts).values({
      companyId,
      accountId: parseInt(req.params.id), name, position, phone, email, notes,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/referral-contacts/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { name, position, phone, email, notes } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (position !== undefined) update.position = position;
    if (phone !== undefined) update.phone = phone;
    if (email !== undefined) update.email = email;
    if (notes !== undefined) update.notes = notes;
    const [row] = await db.update(referralContacts).set(update)
      .where(and(eq(referralContacts.id, parseInt(req.params.id)), eq(referralContacts.companyId, companyId))).returning();
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/referral-contacts/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await db.delete(referralContacts).where(and(eq(referralContacts.id, parseInt(req.params.id)), eq(referralContacts.companyId, companyId)));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

const activitySelect = {
  id: bdActivityLogs.id,
  accountId: bdActivityLogs.accountId,
  accountName: referralAccounts.name,
  userId: bdActivityLogs.userId,
  userName: users.name,
  activityType: bdActivityLogs.activityType,
  notes: bdActivityLogs.notes,
  activityDate: bdActivityLogs.activityDate,
  createdAt: bdActivityLogs.createdAt,
};

router.get("/referral-accounts/:id/activities", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const rows = await db.select(activitySelect).from(bdActivityLogs)
      .leftJoin(users, eq(bdActivityLogs.userId, users.id))
      .leftJoin(referralAccounts, eq(bdActivityLogs.accountId, referralAccounts.id))
      .where(and(eq(bdActivityLogs.accountId, parseInt(req.params.id)), eq(bdActivityLogs.companyId, companyId)))
      .orderBy(desc(bdActivityLogs.activityDate));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referral-accounts/:id/activities", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const user = (req as any).user;
    const sess = req.session as any;
    const { activityType, notes, activityDate } = req.body;
    const [row] = await db.insert(bdActivityLogs).values({
      companyId,
      accountId: parseInt(req.params.id),
      userId: user?.id ?? sess?.userId ?? null,
      activityType,
      notes,
      activityDate: activityDate ? new Date(activityDate) : new Date(),
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/bd-activities", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const user = (req as any).user;
    const sess = req.session as any;
    let rows;
    const userId = user?.id ?? sess?.userId;
    const userRole = user?.role ?? sess?.role;
    if (userRole === "bd_rep" && userId) {
      rows = await db.select(activitySelect).from(bdActivityLogs)
        .leftJoin(users, eq(bdActivityLogs.userId, users.id))
        .leftJoin(referralAccounts, eq(bdActivityLogs.accountId, referralAccounts.id))
        .where(and(eq(bdActivityLogs.companyId, companyId), eq(bdActivityLogs.userId, userId)))
        .orderBy(desc(bdActivityLogs.activityDate));
    } else {
      rows = await db.select(activitySelect).from(bdActivityLogs)
        .leftJoin(users, eq(bdActivityLogs.userId, users.id))
        .leftJoin(referralAccounts, eq(bdActivityLogs.accountId, referralAccounts.id))
        .where(eq(bdActivityLogs.companyId, companyId))
        .orderBy(desc(bdActivityLogs.activityDate));
    }
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/bd-activities", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const user = (req as any).user;
    const sess = req.session as any;
    const { accountId, activityType, notes, activityDate } = req.body;
    const [row] = await db.insert(bdActivityLogs).values({
      companyId,
      accountId: accountId ? parseInt(accountId) : null,
      userId: user?.id ?? sess?.userId ?? null,
      activityType,
      notes,
      activityDate: activityDate ? new Date(activityDate) : new Date(),
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/bd-analytics", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [totalAccounts] = await db.select({ count: sql<number>`count(*)::int` })
      .from(referralAccounts).where(eq(referralAccounts.companyId, companyId));

    const activeAccountIds = await db.selectDistinct({ accountId: bdActivityLogs.accountId })
      .from(bdActivityLogs)
      .where(and(eq(bdActivityLogs.companyId, companyId), gte(bdActivityLogs.activityDate, start), lte(bdActivityLogs.activityDate, end)));

    const [totalActivitiesPeriod] = await db.select({ count: sql<number>`count(*)::int` })
      .from(bdActivityLogs)
      .where(and(eq(bdActivityLogs.companyId, companyId), gte(bdActivityLogs.activityDate, start), lte(bdActivityLogs.activityDate, end)));

    const byType = await db.select({
      activityType: bdActivityLogs.activityType,
      count: sql<number>`count(*)::int`,
    }).from(bdActivityLogs)
      .where(and(eq(bdActivityLogs.companyId, companyId), gte(bdActivityLogs.activityDate, start), lte(bdActivityLogs.activityDate, end)))
      .groupBy(bdActivityLogs.activityType);

    const byAccountType = await db.select({
      type: referralAccounts.type,
      count: sql<number>`count(*)::int`,
    }).from(referralAccounts).where(eq(referralAccounts.companyId, companyId)).groupBy(referralAccounts.type);

    const topReps = await db.select({
      userId: bdActivityLogs.userId,
      userName: users.name,
      count: sql<number>`count(*)::int`,
    }).from(bdActivityLogs)
      .leftJoin(users, eq(bdActivityLogs.userId, users.id))
      .where(and(eq(bdActivityLogs.companyId, companyId), gte(bdActivityLogs.activityDate, start), lte(bdActivityLogs.activityDate, end)))
      .groupBy(bdActivityLogs.userId, users.name)
      .orderBy(sql`count(*) desc`);

    res.json({
      totalAccounts: totalAccounts?.count ?? 0,
      activeAccounts30: activeAccountIds.length,
      totalActivities30: totalActivitiesPeriod?.count ?? 0,
      activitiesByType: byType,
      accountsByType: byAccountType,
      topBdReps: topReps,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/ai/referral-insights", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { accountId } = req.body;
    const [account] = await db.select().from(referralAccounts).where(and(eq(referralAccounts.id, accountId), eq(referralAccounts.companyId, companyId)));
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    const contacts = await db.select().from(referralContacts).where(and(eq(referralContacts.accountId, accountId), eq(referralContacts.companyId, companyId)));
    const activities = await db.select(activitySelect).from(bdActivityLogs)
      .leftJoin(users, eq(bdActivityLogs.userId, users.id))
      .leftJoin(referralAccounts, eq(bdActivityLogs.accountId, referralAccounts.id))
      .where(and(eq(bdActivityLogs.accountId, accountId), eq(bdActivityLogs.companyId, companyId)))
      .orderBy(desc(bdActivityLogs.activityDate));

    const prompt = `You are an expert business development analyst for an addiction treatment center.

Analyze this referral account and provide actionable insights:

Account: ${account.name}
Type: ${account.type}
Phone: ${account.phone || "N/A"}
Address: ${account.address || "N/A"}
Notes: ${account.notes || "N/A"}

Contacts (${contacts.length}):
${contacts.map(c => `- ${c.name} (${c.position || "Unknown role"}) — ${c.email || ""} ${c.phone || ""}`).join("\n") || "None"}

Activity History (${activities.length} total):
${activities.slice(0, 20).map(a => `- ${a.activityType} on ${new Date(a.activityDate!).toLocaleDateString()}: ${a.notes || "No notes"}`).join("\n") || "No activities yet"}

Please provide:
1. Relationship health assessment (strong/moderate/needs attention)
2. Last contact summary and recency analysis
3. Suggested next steps and outreach recommendations
4. Key opportunities or risks to be aware of
5. Recommended contact frequency for this account type`;

    const anthropic = await getAnthropicClient(getCompanyId(req));
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    res.json({ insights: text, accountName: account.name });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
