import { Router } from "express";
import { db } from "@workspace/db";
import { beds, patientStays, inquiries } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

// ── List beds ────────────────────────────────────────────────────────────────
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

// ── Assign patient to a bed ───────────────────────────────────────────────────
// Creates a patient_stay record and marks the bed as occupied
router.post("/beds/:id/assign", async (req, res) => {
  try {
    const bedId = parseInt(req.params.id);
    const { patientName, inquiryId, admitDate, expectedDischargeDate, gender, notes } = req.body;
    if (!patientName) { res.status(400).json({ error: "patientName is required" }); return; }

    // Close any existing active stay for this bed
    await db.update(patientStays).set({
      status: "discharged",
      actualDischargeDate: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(patientStays.bedId, bedId), eq(patientStays.status, "active")));

    // Create new stay record
    const [stay] = await db.insert(patientStays).values({
      inquiryId: inquiryId ? parseInt(inquiryId) : null,
      patientName,
      bedId,
      admitDate: admitDate ? new Date(admitDate) : new Date(),
      expectedDischargeDate: expectedDischargeDate ? new Date(expectedDischargeDate) : null,
      status: "active",
      notes: notes || null,
    }).returning();

    // Update bed
    const [bed] = await db.update(beds).set({
      status: "occupied",
      currentPatientName: patientName,
      gender: gender || null,
      expectedDischargeDate: expectedDischargeDate ? new Date(expectedDischargeDate) : null,
      notes: notes || null,
      updatedAt: new Date(),
    }).where(eq(beds.id, bedId)).returning();

    res.json({ bed, stay });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to assign patient" });
  }
});

// ── Discharge patient from bed ────────────────────────────────────────────────
router.post("/beds/:id/discharge", async (req, res) => {
  try {
    const bedId = parseInt(req.params.id);

    // Mark active stay as discharged
    await db.update(patientStays).set({
      status: "discharged",
      actualDischargeDate: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(patientStays.bedId, bedId), eq(patientStays.status, "active")));

    // Free the bed
    const [bed] = await db.update(beds).set({
      status: "available",
      currentPatientName: null,
      gender: null,
      expectedDischargeDate: null,
      notes: null,
      updatedAt: new Date(),
    }).where(eq(beds.id, bedId)).returning();

    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json({ bed });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to discharge patient" });
  }
});

// ── Reserve a bed ─────────────────────────────────────────────────────────────
router.post("/beds/:id/reserve", async (req, res) => {
  try {
    const bedId = parseInt(req.params.id);
    const { patientName, gender, scheduledAdmitDate, notes } = req.body;

    const [bed] = await db.update(beds).set({
      status: "reserved",
      currentPatientName: patientName || null,
      gender: gender || null,
      expectedDischargeDate: scheduledAdmitDate ? new Date(scheduledAdmitDate) : null,
      notes: notes || null,
      updatedAt: new Date(),
    }).where(eq(beds.id, bedId)).returning();

    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json({ bed });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reserve bed" });
  }
});

// ── Quick status change ───────────────────────────────────────────────────────
router.post("/beds/:id/status", async (req, res) => {
  try {
    const bedId = parseInt(req.params.id);
    const { status } = req.body;
    if (!["available", "occupied", "reserved"].includes(status)) {
      res.status(400).json({ error: "Invalid status" }); return;
    }

    const updates: any = { status, updatedAt: new Date() };
    if (status === "available") {
      updates.currentPatientName = null;
      updates.gender = null;
      updates.expectedDischargeDate = null;
    }

    const [bed] = await db.update(beds).set(updates).where(eq(beds.id, bedId)).returning();
    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json({ bed });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

// ── Patient stays list ────────────────────────────────────────────────────────
router.get("/patient-stays", async (req, res) => {
  try {
    const { bedId, status } = req.query;
    let query = db.select().from(patientStays).orderBy(desc(patientStays.admitDate));
    const rows = await query;
    const filtered = rows.filter(s => {
      if (bedId && s.bedId !== parseInt(bedId as string)) return false;
      if (status && s.status !== status) return false;
      return true;
    });
    res.json(filtered);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch patient stays" });
  }
});

export default router;
