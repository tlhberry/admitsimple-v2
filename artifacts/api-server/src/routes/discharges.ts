import { Router } from "express";
import { db } from "@workspace/db";
import { discharges, patients, referralSources } from "@workspace/db/schema";
import { eq, ilike, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();
router.use(requireAuth);

router.get("/discharges", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { patientId, dischargeType, startDate, endDate } = req.query;
    let result = await db.select().from(discharges).where(eq(discharges.companyId, companyId)).orderBy(desc(discharges.createdAt));
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

router.get("/discharges/patient/:patientId", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const patientId = parseInt(req.params.patientId);
    const rows = await db.select().from(discharges)
      .where(and(eq(discharges.patientId, patientId), eq(discharges.companyId, companyId)))
      .orderBy(desc(discharges.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/discharges", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const sess = req.session as any;
    const {
      patientId, dischargeType, levelOfCare, levelOfCareOther,
      destinationType, referralSourceId, referralSourceName,
      hospitalName, clinicalTransfer, notes, followUp,
    } = req.body;

    if (!patientId || !dischargeType) {
      res.status(400).json({ error: "patientId and dischargeType are required" });
      return;
    }

    const [discharge] = await db.insert(discharges).values({
      companyId,
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

    await db.update(patients).set({
      status: "discharged",
      dischargeDate: new Date(),
      isAlumni: true,
      updatedAt: new Date(),
    }).where(and(eq(patients.id, parseInt(patientId)), eq(patients.companyId, companyId)));

    res.status(201).json(discharge);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/referral-sources/search", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const q = (req.query.q as string) || "";
    const baseWhere = eq(referralSources.companyId, companyId);
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
        .where(and(baseWhere, ilike(referralSources.name, `%${q}%`)))
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
        .where(baseWhere)
        .limit(20);
    }
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
