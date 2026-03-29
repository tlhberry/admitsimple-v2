import { Router } from "express";
import { db } from "@workspace/db";
import { settings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/settings", async (req, res) => {
  try {
    const rows = await db.select().from(settings);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const { settings: settingsArr } = req.body;
    for (const s of settingsArr) {
      await db.insert(settings).values({ key: s.key, value: s.value, updatedAt: new Date() })
        .onConflictDoUpdate({ target: settings.key, set: { value: s.value, updatedAt: new Date() } });
    }
    res.json({ message: "Updated" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/settings/:key", async (req, res) => {
  try {
    const [row] = await db.select().from(settings).where(eq(settings.key, req.params.key));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings/:key", async (req, res) => {
  try {
    const { value } = req.body;
    const result = await db.insert(settings).values({ key: req.params.key, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: settings.key, set: { value, updatedAt: new Date() } })
      .returning();
    res.json(result[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
