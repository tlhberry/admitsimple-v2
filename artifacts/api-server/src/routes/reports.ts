import { Router } from "express";
import { db } from "@workspace/db";
import { reports, users } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

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
