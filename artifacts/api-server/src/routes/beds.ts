import { Router } from "express";
import { db } from "@workspace/db";
import { beds, patientStays } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();
router.use(requireAuth);

router.get("/beds", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { unit, status, gender } = req.query;
    let rows = await db.select().from(beds).where(eq(beds.companyId, companyId)).orderBy(beds.unit, beds.name);
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
    const companyId = getCompanyId(req);
    const [bed] = await db.select().from(beds).where(and(eq(beds.id, parseInt(req.params.id)), eq(beds.companyId, companyId)));
    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json(bed);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch bed" });
  }
});

router.post("/beds", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { name, unit, status, currentPatientName, gender, expectedDischargeDate, notes } = req.body;
    if (!name || !unit) { res.status(400).json({ error: "name and unit are required" }); return; }
    const [bed] = await db.insert(beds).values({
      companyId,
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
    const companyId = getCompanyId(req);
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
    }).where(and(eq(beds.id, parseInt(req.params.id)), eq(beds.companyId, companyId))).returning();
    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json(bed);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update bed" });
  }
});

router.delete("/beds/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    await db.delete(beds).where(and(eq(beds.id, parseInt(req.params.id)), eq(beds.companyId, companyId)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to delete bed" });
  }
});

router.post("/beds/:id/assign", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const bedId = parseInt(req.params.id);
    const { patientName, inquiryId, admitDate, expectedDischargeDate, gender, notes } = req.body;
    if (!patientName) { res.status(400).json({ error: "patientName is required" }); return; }

    await db.update(patientStays).set({
      status: "discharged",
      actualDischargeDate: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(patientStays.bedId, bedId), eq(patientStays.status, "active"), eq(patientStays.companyId, companyId)));

    const [stay] = await db.insert(patientStays).values({
      companyId,
      inquiryId: inquiryId ? parseInt(inquiryId) : null,
      patientName,
      bedId,
      admitDate: admitDate ? new Date(admitDate) : new Date(),
      expectedDischargeDate: expectedDischargeDate ? new Date(expectedDischargeDate) : null,
      status: "active",
      notes: notes || null,
    }).returning();

    const [bed] = await db.update(beds).set({
      status: "occupied",
      currentPatientName: patientName,
      gender: gender || null,
      expectedDischargeDate: expectedDischargeDate ? new Date(expectedDischargeDate) : null,
      notes: notes || null,
      updatedAt: new Date(),
    }).where(and(eq(beds.id, bedId), eq(beds.companyId, companyId))).returning();

    res.json({ bed, stay });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to assign patient" });
  }
});

router.post("/beds/:id/discharge", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const bedId = parseInt(req.params.id);

    await db.update(patientStays).set({
      status: "discharged",
      actualDischargeDate: new Date(),
      updatedAt: new Date(),
    }).where(and(eq(patientStays.bedId, bedId), eq(patientStays.status, "active"), eq(patientStays.companyId, companyId)));

    const [bed] = await db.update(beds).set({
      status: "available",
      currentPatientName: null,
      gender: null,
      expectedDischargeDate: null,
      notes: null,
      updatedAt: new Date(),
    }).where(and(eq(beds.id, bedId), eq(beds.companyId, companyId))).returning();

    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json({ bed });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to discharge patient" });
  }
});

router.post("/beds/:id/reserve", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const bedId = parseInt(req.params.id);
    const { patientName, gender, scheduledAdmitDate, notes } = req.body;

    const [bed] = await db.update(beds).set({
      status: "reserved",
      currentPatientName: patientName || null,
      gender: gender || null,
      expectedDischargeDate: scheduledAdmitDate ? new Date(scheduledAdmitDate) : null,
      notes: notes || null,
      updatedAt: new Date(),
    }).where(and(eq(beds.id, bedId), eq(beds.companyId, companyId))).returning();

    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json({ bed });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to reserve bed" });
  }
});

router.post("/beds/:id/status", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
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

    const [bed] = await db.update(beds).set(updates).where(and(eq(beds.id, bedId), eq(beds.companyId, companyId))).returning();
    if (!bed) { res.status(404).json({ error: "Bed not found" }); return; }
    res.json({ bed });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

router.get("/patient-stays", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { bedId, status } = req.query;
    const filters: any[] = [eq(patientStays.companyId, companyId)];
    if (bedId) filters.push(eq(patientStays.bedId, parseInt(bedId as string)));
    if (status) filters.push(eq(patientStays.status, status as string));
    const rows = await db.select().from(patientStays).where(and(...filters)).orderBy(desc(patientStays.admitDate));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch patient stays" });
  }
});

export default router;
