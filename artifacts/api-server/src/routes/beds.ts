import { Router } from "express";
import { db } from "@workspace/db";
import { beds } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/beds", async (req, res) => {
  try {
    const { unit, status, gender } = req.query;
    let rows = await db.select().from(beds).orderBy(beds.unit, beds.name);
    if (unit && typeof unit === "string") rows = rows.filter(b => b.unit.toLowerCase() === unit.toLowerCase());
    if (status && typeof status === "string") rows = rows.filter(b => b.status === status);
    if (gender && typeof gender === "string") rows = rows.filter(b => b.gender?.toLowerCase() === gender.toLowerCase());
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch beds" });
  }
});

router.get("/beds/:id", async (req, res) => {
  try {
    const [bed] = await db.select().from(beds).where(eq(beds.id, parseInt(req.params.id)));
    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json(bed);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch bed" });
  }
});

router.post("/beds", async (req, res) => {
  try {
    const { name, unit, status, currentPatientName, gender, expectedDischargeDate, notes } = req.body;
    if (!name || !unit) { res.status(400).json({ error: "name and unit are required" }); return; }
    const [bed] = await db.insert(beds).values({
      name, unit,
      status: status || "available",
      currentPatientName: currentPatientName || null,
      gender: gender || null,
      expectedDischargeDate: expectedDischargeDate ? new Date(expectedDischargeDate) : null,
      notes: notes || null,
      updatedAt: new Date(),
    }).returning();
    res.status(201).json(bed);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create bed" });
  }
});

router.put("/beds/:id", async (req, res) => {
  try {
    const { name, unit, status, currentPatientName, gender, expectedDischargeDate, notes } = req.body;
    const [bed] = await db.update(beds).set({
      ...(name !== undefined && { name }),
      ...(unit !== undefined && { unit }),
      ...(status !== undefined && { status }),
      currentPatientName: currentPatientName ?? null,
      ...(gender !== undefined && { gender: gender || null }),
      expectedDischargeDate: expectedDischargeDate ? new Date(expectedDischargeDate) : null,
      ...(notes !== undefined && { notes }),
      updatedAt: new Date(),
    }).where(eq(beds.id, parseInt(req.params.id))).returning();
    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json(bed);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update bed" });
  }
});

router.delete("/beds/:id", async (req, res) => {
  try {
    await db.delete(beds).where(eq(beds.id, parseInt(req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete bed" });
  }
});

export default router;
