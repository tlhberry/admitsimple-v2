import { Router } from "express";
import { db } from "@workspace/db";
import { inquiries, users, patients } from "@workspace/db/schema";
import { eq, ilike, or, and, gte, lte, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { logAudit } from "../lib/logAudit";
import archiver from "archiver";

const router = Router();
router.use(requireAuth);

// Helper: build the full inquiry select object (includes pre-assessment columns)
const fullInquirySelect = {
  id: inquiries.id,
  firstName: inquiries.firstName,
  lastName: inquiries.lastName,
  phone: inquiries.phone,
  email: inquiries.email,
  dob: inquiries.dob,
  insuranceProvider: inquiries.insuranceProvider,
  insuranceMemberId: inquiries.insuranceMemberId,
  primaryDiagnosis: inquiries.primaryDiagnosis,
  substanceHistory: inquiries.substanceHistory,
  medicalHistory: inquiries.medicalHistory,
  mentalHealthHistory: inquiries.mentalHealthHistory,
  levelOfCare: inquiries.levelOfCare,
  referralSource: inquiries.referralSource,
  referralContact: inquiries.referralContact,
  searchKeywords: inquiries.searchKeywords,
  assignedTo: inquiries.assignedTo,
  assignedToName: users.name,
  status: inquiries.status,
  priority: inquiries.priority,
  notes: inquiries.notes,
  aiParsedData: inquiries.aiParsedData,
  parsedAt: inquiries.parsedAt,
  createdAt: inquiries.createdAt,
  updatedAt: inquiries.updatedAt,
  preCertFormData: inquiries.preCertFormData,
  preCertFormComplete: inquiries.preCertFormComplete,
  nursingAssessmentData: inquiries.nursingAssessmentData,
  nursingAssessmentComplete: inquiries.nursingAssessmentComplete,
  preScreeningData: inquiries.preScreeningData,
  preScreeningComplete: inquiries.preScreeningComplete,
  preAssessmentCompleted: inquiries.preAssessmentCompleted,
  preAssessmentDate: inquiries.preAssessmentDate,
  preAssessmentNotes: inquiries.preAssessmentNotes,
};

router.get("/inquiries", async (req, res) => {
  try {
    const { search, status, assignedTo, levelOfCare, priority, startDate, endDate } = req.query;
    const filters: any[] = [];
    if (search && typeof search === "string") {
      filters.push(or(
        ilike(inquiries.firstName, `%${search}%`),
        ilike(inquiries.lastName, `%${search}%`),
        ilike(inquiries.phone, `%${search}%`),
        ilike(inquiries.email, `%${search}%`)
      ));
    }
    if (status && typeof status === "string") filters.push(eq(inquiries.status, status));
    if (assignedTo) filters.push(eq(inquiries.assignedTo, parseInt(assignedTo as string)));
    if (levelOfCare && typeof levelOfCare === "string") filters.push(eq(inquiries.levelOfCare, levelOfCare));
    if (priority && typeof priority === "string") filters.push(eq(inquiries.priority, priority));
    if (startDate) filters.push(gte(inquiries.createdAt, new Date(startDate as string)));
    if (endDate) filters.push(lte(inquiries.createdAt, new Date(endDate as string)));

    const rows = await db
      .select(fullInquirySelect)
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(filters.length > 0 ? and(...filters) : undefined)
      .orderBy(desc(inquiries.createdAt));

    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inquiries", async (req, res) => {
  try {
    const data = req.body;
    const sess = req.session as any;
    const sessionUserId = sess?.userId;
    // Auto-assign creator as owner if not explicitly set
    const assignedTo = data.assignedTo ? parseInt(data.assignedTo) : (sessionUserId || null);

    const [row] = await db.insert(inquiries).values({
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      email: data.email,
      dob: data.dob,
      insuranceProvider: data.insuranceProvider,
      insuranceMemberId: data.insuranceMemberId,
      primaryDiagnosis: data.primaryDiagnosis,
      substanceHistory: data.substanceHistory,
      medicalHistory: data.medicalHistory,
      mentalHealthHistory: data.mentalHealthHistory,
      levelOfCare: data.levelOfCare,
      referralSource: data.referralSource,
      referralContact: data.referralContact,
      searchKeywords: data.searchKeywords,
      assignedTo,
      status: data.status || "new",
      priority: data.priority || "medium",
      notes: data.notes,
    }).returning();

    await logAudit(req, "Created Inquiry", "inquiry", row.id);

    const full = await db.select(fullInquirySelect)
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(eq(inquiries.id, row.id));

    res.status(201).json(full[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inquiries/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db.select(fullInquirySelect)
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(eq(inquiries.id, id));
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const update: any = { updatedAt: new Date() };
    const fields = [
      "firstName","lastName","phone","email","dob","insuranceProvider","insuranceMemberId",
      "primaryDiagnosis","substanceHistory","medicalHistory","mentalHealthHistory","levelOfCare",
      "referralSource","referralContact","searchKeywords","status","priority","notes",
      "preAssessmentCompleted","preAssessmentNotes",
    ];
    fields.forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });
    if (data.assignedTo !== undefined) update.assignedTo = data.assignedTo ? parseInt(data.assignedTo) : null;
    if (data.preAssessmentDate !== undefined) update.preAssessmentDate = data.preAssessmentDate ? new Date(data.preAssessmentDate) : null;
    await db.update(inquiries).set(update).where(eq(inquiries.id, id));
    await logAudit(req, "Updated Inquiry", "inquiry", id);

    const rows = await db.select(fullInquirySelect)
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(eq(inquiries.id, id));
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/inquiries/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(inquiries).where(eq(inquiries.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inquiries/:id/convert", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { admitDate, levelOfCare, assignedClinician, notes } = req.body;
    const [inq] = await db.select().from(inquiries).where(eq(inquiries.id, id));
    if (!inq) { res.status(404).json({ error: "Inquiry not found" }); return; }

    const sess = req.session as any;
    // Credit goes to inquiry owner by default; fallback to session user
    const creditUserId = inq.assignedTo || sess?.userId || null;

    const [patient] = await db.insert(patients).values({
      inquiryId: id,
      firstName: inq.firstName,
      lastName: inq.lastName,
      phone: inq.phone,
      email: inq.email,
      dob: inq.dob,
      insuranceProvider: inq.insuranceProvider,
      insuranceMemberId: inq.insuranceMemberId,
      levelOfCare: levelOfCare || inq.levelOfCare,
      admitDate: admitDate ? new Date(admitDate) : new Date(),
      assignedClinician: assignedClinician ? parseInt(assignedClinician) : null,
      creditUserId,
      status: "active",
      notes: notes || inq.notes,
    }).returning();

    await db.update(inquiries).set({ status: "admitted", updatedAt: new Date() }).where(eq(inquiries.id, id));
    await logAudit(req, "Converted to Patient", "inquiry", id);

    const rows = await db.select({
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
    })
    .from(patients)
    .leftJoin(users, eq(patients.assignedClinician, users.id))
    .where(eq(patients.id, patient.id));

    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Pre-Assessment Form Routes ───────────────────────────────────────────────

// Form 1: RB Pre-Cert / Clinical
router.get("/inquiries/:id/pre-cert-form", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select({
      formData: inquiries.preCertFormData,
      isComplete: inquiries.preCertFormComplete,
    }).from(inquiries).where(eq(inquiries.id, id));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ formData: row.formData || {}, isComplete: row.isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id/pre-cert-form", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { formData, isComplete } = req.body;
    await db.update(inquiries).set({
      preCertFormData: formData,
      preCertFormComplete: isComplete || "no",
      updatedAt: new Date(),
    }).where(eq(inquiries.id, id));
    res.json({ formData, isComplete: isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Form 2: Nursing Assessment
router.get("/inquiries/:id/nursing-assessment", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select({
      formData: inquiries.nursingAssessmentData,
      isComplete: inquiries.nursingAssessmentComplete,
    }).from(inquiries).where(eq(inquiries.id, id));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ formData: row.formData || {}, isComplete: row.isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id/nursing-assessment", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { formData, isComplete } = req.body;
    await db.update(inquiries).set({
      nursingAssessmentData: formData,
      nursingAssessmentComplete: isComplete || "no",
      updatedAt: new Date(),
    }).where(eq(inquiries.id, id));
    res.json({ formData, isComplete: isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Form 3: Pre-Screening
router.get("/inquiries/:id/pre-screening", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select({
      formData: inquiries.preScreeningData,
      isComplete: inquiries.preScreeningComplete,
    }).from(inquiries).where(eq(inquiries.id, id));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ formData: row.formData || {}, isComplete: row.isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id/pre-screening", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { formData, isComplete } = req.body;
    await db.update(inquiries).set({
      preScreeningData: formData,
      preScreeningComplete: isComplete || "no",
      updatedAt: new Date(),
    }).where(eq(inquiries.id, id));
    res.json({ formData, isComplete: isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Download: ZIP of all three forms as JSON
router.get("/inquiries/:id/download-pre-assessment-forms", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [row] = await db.select({
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      preCertFormData: inquiries.preCertFormData,
      preCertFormComplete: inquiries.preCertFormComplete,
      nursingAssessmentData: inquiries.nursingAssessmentData,
      nursingAssessmentComplete: inquiries.nursingAssessmentComplete,
      preScreeningData: inquiries.preScreeningData,
      preScreeningComplete: inquiries.preScreeningComplete,
    }).from(inquiries).where(eq(inquiries.id, id));

    if (!row) { res.status(404).json({ error: "Not found" }); return; }

    const hasAnyData = row.preCertFormData || row.nursingAssessmentData || row.preScreeningData;
    if (!hasAnyData) {
      res.status(400).json({ error: "No forms have been completed yet." });
      return;
    }

    const name = `${row.firstName}-${row.lastName}`.replace(/\s+/g, "-");
    const date = new Date().toISOString().split("T")[0];
    const filename = `PreAssessment-${name}-${date}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    archive.append(
      JSON.stringify({ generatedAt: new Date().toISOString(), patient: `${row.firstName} ${row.lastName}`, status: row.preCertFormComplete, data: row.preCertFormData || {} }, null, 2),
      { name: "01-RB-PreCert-Clinical.json" }
    );
    archive.append(
      JSON.stringify({ generatedAt: new Date().toISOString(), patient: `${row.firstName} ${row.lastName}`, status: row.nursingAssessmentComplete, data: row.nursingAssessmentData || {} }, null, 2),
      { name: "02-Nursing-Assessment.json" }
    );
    archive.append(
      JSON.stringify({ generatedAt: new Date().toISOString(), patient: `${row.firstName} ${row.lastName}`, status: row.preScreeningComplete, data: row.preScreeningData || {} }, null, 2),
      { name: "03-Pre-Screening.json" }
    );

    await archive.finalize();
  } catch (err) {
    req.log.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
