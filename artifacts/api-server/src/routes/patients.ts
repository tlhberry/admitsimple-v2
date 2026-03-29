import { Router } from "express";
import { db } from "@workspace/db";
import { patients, users } from "@workspace/db/schema";
import { eq, ilike, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

const patientSelect = {
  id: patients.id,
  inquiryId: patients.inquiryId,
  firstName: patients.firstName,
  lastName: patients.lastName,
  phone: patients.phone,
  email: patients.email,
  dob: patients.dob,
  insuranceProvider: patients.insuranceProvider,
  insuranceMemberId: patients.insuranceMemberId,
  levelOfCare: patients.levelOfCare,
  admitDate: patients.admitDate,
  dischargeDate: patients.dischargeDate,
  currentStage: patients.currentStage,
  assignedClinician: patients.assignedClinician,
  assignedClinicianName: users.name,
  assignedAdmissions: patients.assignedAdmissions,
  status: patients.status,
  notes: patients.notes,
  createdAt: patients.createdAt,
  updatedAt: patients.updatedAt,
};

router.get("/patients", async (req, res) => {
  try {
    const { levelOfCare, status, assignedClinician, search } = req.query;
    const filters: any[] = [];
    if (levelOfCare) filters.push(eq(patients.levelOfCare, levelOfCare as string));
    if (status) filters.push(eq(patients.status, status as string));
    if (assignedClinician) filters.push(eq(patients.assignedClinician, parseInt(assignedClinician as string)));
    if (search) {
      filters.push(
        ilike(patients.firstName, `%${search}%`)
      );
    }
    const rows = await db.select(patientSelect)
      .from(patients)
      .leftJoin(users, eq(patients.assignedClinician, users.id))
      .where(filters.length > 0 ? and(...filters) : undefined);
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/patients", async (req, res) => {
  try {
    const data = req.body;
    const [patient] = await db.insert(patients).values({
      inquiryId: data.inquiryId ? parseInt(data.inquiryId) : null,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      dob: data.dob,
      insuranceProvider: data.insuranceProvider,
      insuranceMemberId: data.insuranceMemberId,
      levelOfCare: data.levelOfCare,
      admitDate: data.admitDate ? new Date(data.admitDate) : null,
      assignedClinician: data.assignedClinician ? parseInt(data.assignedClinician) : null,
      status: "active",
      notes: data.notes,
    }).returning();
    const rows = await db.select(patientSelect).from(patients).leftJoin(users, eq(patients.assignedClinician, users.id)).where(eq(patients.id, patient.id));
    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select(patientSelect).from(patients).leftJoin(users, eq(patients.assignedClinician, users.id)).where(eq(patients.id, id));
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const update: any = { updatedAt: new Date() };
    const fields = ["firstName","lastName","phone","email","dob","insuranceProvider","insuranceMemberId","levelOfCare","currentStage","status","notes"];
    fields.forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });
    if (data.admitDate !== undefined) update.admitDate = data.admitDate ? new Date(data.admitDate) : null;
    if (data.dischargeDate !== undefined) update.dischargeDate = data.dischargeDate ? new Date(data.dischargeDate) : null;
    if (data.assignedClinician !== undefined) update.assignedClinician = data.assignedClinician ? parseInt(data.assignedClinician) : null;
    if (data.assignedAdmissions !== undefined) update.assignedAdmissions = data.assignedAdmissions ? parseInt(data.assignedAdmissions) : null;
    await db.update(patients).set(update).where(eq(patients.id, id));
    const rows = await db.select(patientSelect).from(patients).leftJoin(users, eq(patients.assignedClinician, users.id)).where(eq(patients.id, id));
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/patients/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(patients).where(eq(patients.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
