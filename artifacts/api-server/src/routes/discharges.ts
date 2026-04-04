import { Router } from "express";
import { db } from "@workspace/db";
import { discharges, patients, referralSources } from "@workspace/db/schema";
import { eq, ilike, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

// GET /api/discharges
router.get("/discharges", async (req, res) => {
  try {
    const { patientId, dischargeType, startDate, endDate } = req.query;
    const rows = await db.select().from(discharges).orderBy(desc(discharges.createdAt));
    let result = rows;
    if (patientId) result = result.filter(r => r.patientId === parseInt(patientId as string));
    if (dischargeType) result = result.filter(r => r.dischargeType === dischargeType);
    if (startDate) result = result.filter(r => r.createdAt && r.createdAt >= new Date(startDate as string));
    if (endDate) result = result.filter(r => r.createdAt && r.createdAt <= new Date(endDate as string));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/discharges/:patientId/history
router.get("/discharges/patient/:patientId", async (req, res) => {
  try {
    const patientId = parseInt(req.params.patientId);
    const rows = await db.select().from(discharges)
      .where(eq(discharges.patientId, patientId))
      .orderBy(desc(discharges.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/discharges
router.post("/discharges", async (req, res) => {
  try {
    const sess = req.session as any;
    const {
      patientId,
      dischargeType,
      levelOfCare,
      levelOfCareOther,
      destinationType,
      referralSourceId,
      referralSourceName,
      hospitalName,
      clinicalTransfer,
      notes,
      followUp,
    } = req.body;

    if (!patientId || !dischargeType) {
      res.status(400).json({ error: "patientId and dischargeType are required" });
      return;
    }

    // 1. Create the discharge record
    const [discharge] = await db.insert(discharges).values({
      patientId: parseInt(patientId),
      dischargeType,
      levelOfCare: levelOfCare || null,
      levelOfCareOther: levelOfCareOther || null,
      destinationType: destinationType || null,
      referralSourceId: referralSourceId ? parseInt(referralSourceId) : null,
      referralSourceName: referralSourceName || null,
      hospitalName: hospitalName || null,
      clinicalTransfer: Boolean(clinicalTransfer),
      notes: notes || null,
      followUp: Boolean(followUp),
      createdBy: sess?.userId ?? null,
    }).returning();

    // 2. Update the patient: status = discharged, discharge_date = now, is_alumni = true
    await db.update(patients).set({
      status: "discharged",
      dischargeDate: new Date(),
      isAlumni: true,
      updatedAt: new Date(),
    }).where(eq(patients.id, parseInt(patientId)));

    // 3. If referralSourceId exists, optionally we can track outbound — referralSources doesn't have a count column,
    //    but we store the referral_source_name and id on the discharge record for analytics queries.

    res.status(201).json(discharge);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/referral-sources/search?q=  (typeahead for discharge modal)
router.get("/referral-sources/search", async (req, res) => {
  try {
    const q = (req.query.q as string) || "";
    let rows;
    if (q.trim()) {
      rows = await db.select({
        id: referralSources.id,
        name: referralSources.name,
        type: referralSources.type,
        contact: referralSources.contact,
        phone: referralSources.phone,
      })
        .from(referralSources)
        .where(ilike(referralSources.name, `%${q}%`))
        .limit(10);
    } else {
      rows = await db.select({
        id: referralSources.id,
        name: referralSources.name,
        type: referralSources.type,
        contact: referralSources.contact,
        phone: referralSources.phone,
      })
        .from(referralSources)
        .limit(20);
    }
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
