import { Router } from "express";
import { db } from "@workspace/db";
import { activities, users } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/activities", async (req, res) => {
  try {
    const { inquiryId, patientId } = req.query;
    const filters: any[] = [];
    if (inquiryId) filters.push(eq(activities.inquiryId, parseInt(inquiryId as string)));
    if (patientId) filters.push(eq(activities.patientId, parseInt(patientId as string)));
    const rows = await db.select({
      id: activities.id,
      inquiryId: activities.inquiryId,
      patientId: activities.patientId,
      userId: activities.userId,
      userName: users.name,
      type: activities.type,
      subject: activities.subject,
      body: activities.body,
      outcome: activities.outcome,
      scheduledAt: activities.scheduledAt,
      completedAt: activities.completedAt,
      createdAt: activities.createdAt,
    })
    .from(activities)
    .leftJoin(users, eq(activities.userId, users.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(desc(activities.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/activities", async (req, res) => {
  try {
    const sess = req.session as any;
    const data = req.body;
    const [row] = await db.insert(activities).values({
      inquiryId: data.inquiryId ? parseInt(data.inquiryId) : null,
      patientId: data.patientId ? parseInt(data.patientId) : null,
      userId: sess.userId,
      type: data.type,
      subject: data.subject,
      body: data.body,
      outcome: data.outcome,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
      completedAt: data.completedAt ? new Date(data.completedAt) : null,
    }).returning();
    const rows = await db.select({
      id: activities.id,
      inquiryId: activities.inquiryId,
      patientId: activities.patientId,
      userId: activities.userId,
      userName: users.name,
      type: activities.type,
      subject: activities.subject,
      body: activities.body,
      outcome: activities.outcome,
      scheduledAt: activities.scheduledAt,
      completedAt: activities.completedAt,
      createdAt: activities.createdAt,
    }).from(activities).leftJoin(users, eq(activities.userId, users.id)).where(eq(activities.id, row.id));
    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/activities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const update: any = {};
    if (data.type) update.type = data.type;
    if (data.subject !== undefined) update.subject = data.subject;
    if (data.body !== undefined) update.body = data.body;
    if (data.outcome !== undefined) update.outcome = data.outcome;
    if (data.scheduledAt !== undefined) update.scheduledAt = data.scheduledAt ? new Date(data.scheduledAt) : null;
    if (data.completedAt !== undefined) update.completedAt = data.completedAt ? new Date(data.completedAt) : null;
    await db.update(activities).set(update).where(eq(activities.id, id));
    const rows = await db.select({
      id: activities.id,
      inquiryId: activities.inquiryId,
      patientId: activities.patientId,
      userId: activities.userId,
      userName: users.name,
      type: activities.type,
      subject: activities.subject,
      body: activities.body,
      outcome: activities.outcome,
      scheduledAt: activities.scheduledAt,
      completedAt: activities.completedAt,
      createdAt: activities.createdAt,
    }).from(activities).leftJoin(users, eq(activities.userId, users.id)).where(eq(activities.id, id));
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/activities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(activities).where(eq(activities.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
