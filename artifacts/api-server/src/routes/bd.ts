import { Router } from "express";
import { db } from "@workspace/db";
import {
  referralAccounts, referralContacts, bdActivityLogs, users,
} from "@workspace/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();
router.use(requireAuth);

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// ── Referral Accounts ─────────────────────────────────────────────────────────

router.get("/referral-accounts", async (req, res) => {
  try {
    const user = (req as any).user;
    let rows;
    if (user?.role === "bd_rep") {
      rows = await db.select(accountSelect).from(referralAccounts)
        .leftJoin(users, eq(referralAccounts.assignedBdRepId, users.id))
        .where(eq(referralAccounts.assignedBdRepId, user.id))
        .orderBy(desc(referralAccounts.updatedAt));
    } else {
      rows = await db.select(accountSelect).from(referralAccounts)
        .leftJoin(users, eq(referralAccounts.assignedBdRepId, users.id))
        .orderBy(desc(referralAccounts.updatedAt));
    }

    // Attach last activity date to each account
    const accountIds = rows.map(r => r.id);
    const lastActivities: Record<number, Date | null> = {};
    if (accountIds.length > 0) {
      for (const id of accountIds) {
        const [la] = await db.select({ activityDate: bdActivityLogs.activityDate })
          .from(bdActivityLogs)
          .where(eq(bdActivityLogs.accountId, id))
          .orderBy(desc(bdActivityLogs.activityDate))
          .limit(1);
        lastActivities[id] = la?.activityDate ?? null;
      }
    }

    const result = rows.map(r => ({ ...r, lastActivityDate: lastActivities[r.id] ?? null }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referral-accounts", async (req, res) => {
  try {
    const user = (req as any).user;
    const { name, type, address, phone, website, notes, assignedBdRepId } = req.body;
    const [row] = await db.insert(referralAccounts).values({
      name, type, address, phone, website, notes,
      assignedBdRepId: assignedBdRepId ? parseInt(assignedBdRepId) : null,
      createdBy: user?.id ?? null,
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
    const id = parseInt(req.params.id);
    const rows = await db.select(accountSelect).from(referralAccounts)
      .leftJoin(users, eq(referralAccounts.assignedBdRepId, users.id))
      .where(eq(referralAccounts.id, id));
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
    await db.update(referralAccounts).set(update).where(eq(referralAccounts.id, id));
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
    const id = parseInt(req.params.id);
    await db.delete(referralAccounts).where(eq(referralAccounts.id, id));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Contacts ──────────────────────────────────────────────────────────────────

router.get("/referral-accounts/:id/contacts", async (req, res) => {
  try {
    const rows = await db.select().from(referralContacts)
      .where(eq(referralContacts.accountId, parseInt(req.params.id)))
      .orderBy(desc(referralContacts.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referral-accounts/:id/contacts", async (req, res) => {
  try {
    const { name, position, phone, email, notes } = req.body;
    const [row] = await db.insert(referralContacts).values({
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
    const { name, position, phone, email, notes } = req.body;
    const update: any = {};
    if (name !== undefined) update.name = name;
    if (position !== undefined) update.position = position;
    if (phone !== undefined) update.phone = phone;
    if (email !== undefined) update.email = email;
    if (notes !== undefined) update.notes = notes;
    const [row] = await db.update(referralContacts).set(update)
      .where(eq(referralContacts.id, parseInt(req.params.id))).returning();
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/referral-contacts/:id", async (req, res) => {
  try {
    await db.delete(referralContacts).where(eq(referralContacts.id, parseInt(req.params.id)));
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Activity Logs ─────────────────────────────────────────────────────────────

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
    const rows = await db.select(activitySelect).from(bdActivityLogs)
      .leftJoin(users, eq(bdActivityLogs.userId, users.id))
      .leftJoin(referralAccounts, eq(bdActivityLogs.accountId, referralAccounts.id))
      .where(eq(bdActivityLogs.accountId, parseInt(req.params.id)))
      .orderBy(desc(bdActivityLogs.activityDate));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referral-accounts/:id/activities", async (req, res) => {
  try {
    const user = (req as any).user;
    const { activityType, notes, activityDate } = req.body;
    const [row] = await db.insert(bdActivityLogs).values({
      accountId: parseInt(req.params.id),
      userId: user?.id ?? null,
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

// Global activity feed
router.get("/bd-activities", async (req, res) => {
  try {
    const user = (req as any).user;
    let rows;
    if (user?.role === "bd_rep") {
      rows = await db.select(activitySelect).from(bdActivityLogs)
        .leftJoin(users, eq(bdActivityLogs.userId, users.id))
        .leftJoin(referralAccounts, eq(bdActivityLogs.accountId, referralAccounts.id))
        .where(eq(bdActivityLogs.userId, user.id))
        .orderBy(desc(bdActivityLogs.activityDate));
    } else {
      rows = await db.select(activitySelect).from(bdActivityLogs)
        .leftJoin(users, eq(bdActivityLogs.userId, users.id))
        .leftJoin(referralAccounts, eq(bdActivityLogs.accountId, referralAccounts.id))
        .orderBy(desc(bdActivityLogs.activityDate));
    }
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Quick log activity (account selected in form)
router.post("/bd-activities", async (req, res) => {
  try {
    const user = (req as any).user;
    const { accountId, activityType, notes, activityDate } = req.body;
    const [row] = await db.insert(bdActivityLogs).values({
      accountId: accountId ? parseInt(accountId) : null,
      userId: user?.id ?? null,
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

// BD Analytics
router.get("/bd-analytics", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const [totalAccounts] = await db.select({ count: sql<number>`count(*)::int` })
      .from(referralAccounts);

    const activeAccountIds = await db.selectDistinct({ accountId: bdActivityLogs.accountId })
      .from(bdActivityLogs)
      .where(and(gte(bdActivityLogs.activityDate, start), lte(bdActivityLogs.activityDate, end)));

    const [totalActivitiesPeriod] = await db.select({ count: sql<number>`count(*)::int` })
      .from(bdActivityLogs)
      .where(and(gte(bdActivityLogs.activityDate, start), lte(bdActivityLogs.activityDate, end)));

    const byType = await db.select({
      activityType: bdActivityLogs.activityType,
      count: sql<number>`count(*)::int`,
    }).from(bdActivityLogs)
      .where(and(gte(bdActivityLogs.activityDate, start), lte(bdActivityLogs.activityDate, end)))
      .groupBy(bdActivityLogs.activityType);

    const byAccountType = await db.select({
      type: referralAccounts.type,
      count: sql<number>`count(*)::int`,
    }).from(referralAccounts).groupBy(referralAccounts.type);

    const topReps = await db.select({
      userId: bdActivityLogs.userId,
      userName: users.name,
      count: sql<number>`count(*)::int`,
    }).from(bdActivityLogs)
      .leftJoin(users, eq(bdActivityLogs.userId, users.id))
      .where(and(gte(bdActivityLogs.activityDate, start), lte(bdActivityLogs.activityDate, end)))
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

// ── AI Referral Insights ──────────────────────────────────────────────────────

router.post("/ai/referral-insights", async (req, res) => {
  try {
    const { accountId } = req.body;
    const [account] = await db.select().from(referralAccounts).where(eq(referralAccounts.id, accountId));
    if (!account) { res.status(404).json({ error: "Account not found" }); return; }
    const contacts = await db.select().from(referralContacts).where(eq(referralContacts.accountId, accountId));
    const activities = await db.select(activitySelect).from(bdActivityLogs)
      .leftJoin(users, eq(bdActivityLogs.userId, users.id))
      .leftJoin(referralAccounts, eq(bdActivityLogs.accountId, referralAccounts.id))
      .where(eq(bdActivityLogs.accountId, accountId))
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
