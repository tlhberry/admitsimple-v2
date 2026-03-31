import { Router } from "express";
import { db } from "@workspace/db";
import { inquiries, users, patients, auditLogs, settings } from "@workspace/db/schema";
import { eq, ilike, or, and, gte, lte, desc, notInArray, inArray, lt, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { isBdRep } from "../lib/requireAdmin";
import { logAudit } from "../lib/logAudit";
import { broadcastSSE, sendSSEToUser } from "../lib/sse";
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
  insuranceGroupNumber: inquiries.insuranceGroupNumber,
  insuranceCarrierPhone: inquiries.insuranceCarrierPhone,
  city: inquiries.city,
  state: inquiries.state,
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
  vobData: inquiries.vobData,
  costAcceptance: inquiries.costAcceptance,
  nonAdmitReason: inquiries.nonAdmitReason,
  nonAdmitNotes: inquiries.nonAdmitNotes,
  referralOutAt: inquiries.referralOutAt,
  referralOutType: inquiries.referralOutType,
  referralOutMessage: inquiries.referralOutMessage,
  appointmentDate: inquiries.appointmentDate,
  calendarEventId: inquiries.calendarEventId,
  referralDestination: inquiries.referralDestination,
  inquiryNumber: inquiries.inquiryNumber,
  // CTM fields
  ctmCallId: inquiries.ctmCallId,
  ctmTrackingNumber: inquiries.ctmTrackingNumber,
  ctmSource: inquiries.ctmSource,
  callDurationSeconds: inquiries.callDurationSeconds,
  callRecordingUrl: inquiries.callRecordingUrl,
  callDateTime: inquiries.callDateTime,
  referralDetails: inquiries.referralDetails,
  onlineSource: inquiries.onlineSource,
  referralOrigin: inquiries.referralOrigin,
  transcription: inquiries.transcription,
  aiExtractedData: inquiries.aiExtractedData,
  callSummary: inquiries.callSummary,
  // Call ownership
  callStatus: inquiries.callStatus,
  isLocked: inquiries.isLocked,
  lockedAt: inquiries.lockedAt,
};

// Constants for tab filtering
const INACTIVE_STATUSES = ["Admitted", "Discharged", "Did Not Admit", "Non-Viable"];
const ACTIVE_STATUSES_EXCLUSION = INACTIVE_STATUSES;

router.get("/inquiries", async (req, res) => {
  try {
    const { search, status, assignedTo, levelOfCare, priority, startDate, endDate, tab } = req.query;
    const filters: any[] = [];

    // Tab-based filtering (overrides status filter when present)
    if (tab && typeof tab === "string") {
      const now = new Date();
      const h24 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const h48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      if (tab === "active") {
        filters.push(notInArray(inquiries.status, ACTIVE_STATUSES_EXCLUSION));
      } else if (tab === "new") {
        filters.push(gte(inquiries.createdAt, h48));
      } else if (tab === "needs_action") {
        filters.push(notInArray(inquiries.status, ACTIVE_STATUSES_EXCLUSION));
        filters.push(lt(inquiries.updatedAt, h24));
      } else if (tab === "admitted") {
        filters.push(eq(inquiries.status, "Admitted"));
      } else if (tab === "discharged") {
        filters.push(eq(inquiries.status, "Discharged"));
      } else if (tab === "did_not_admit") {
        filters.push(inArray(inquiries.status, ["Did Not Admit", "Non-Viable"]));
      }
      // "all" = no extra filter
    } else if (status && typeof status === "string") {
      filters.push(eq(inquiries.status, status));
    }

    if (search && typeof search === "string") {
      filters.push(or(
        ilike(inquiries.firstName, `%${search}%`),
        ilike(inquiries.lastName, `%${search}%`),
        ilike(inquiries.phone, `%${search}%`),
        ilike(inquiries.email, `%${search}%`),
        ilike(inquiries.inquiryNumber, `%${search}%`)
      ));
    }
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

    // Generate unique inquiry number after insert (uses the serial ID)
    const inquiryNum = `INQ-${row.id.toString().padStart(6, "0")}`;
    await db.update(inquiries).set({ inquiryNumber: inquiryNum }).where(eq(inquiries.id, row.id));

    await logAudit(req, "Created Inquiry", "inquiry", row.id, { inquiryId: row.id });

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
    if (isBdRep(req) && data.status !== undefined) {
      res.status(403).json({ error: "BD reps cannot change inquiry pipeline status" }); return;
    }

    // Fetch current state before updating so we can diff changes
    const [before] = await db.select().from(inquiries).where(eq(inquiries.id, id));

    const update: any = { updatedAt: new Date() };
    const fields = [
      "firstName","lastName","phone","email","dob","insuranceProvider","insuranceMemberId",
      "primaryDiagnosis","substanceHistory","medicalHistory","mentalHealthHistory","levelOfCare",
      "referralSource","referralContact","searchKeywords","status","priority","notes",
      "preAssessmentCompleted","preAssessmentNotes","calendarEventId","referralDestination",
      // Live call intake fields
      "presentingProblem","primarySubstance","callerIsNotPatient","callerName","callerRelationship","patientPhone",
    ];
    fields.forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });
    if (data.assignedTo !== undefined) update.assignedTo = data.assignedTo ? parseInt(data.assignedTo) : null;
    if (data.preAssessmentDate !== undefined) update.preAssessmentDate = data.preAssessmentDate ? new Date(data.preAssessmentDate) : null;
    if (data.appointmentDate !== undefined) update.appointmentDate = data.appointmentDate ? new Date(data.appointmentDate) : null;
    await db.update(inquiries).set(update).where(eq(inquiries.id, id));

    // Build human-readable labels for changed fields
    const FIELD_LABELS: Record<string, string> = {
      firstName: "First Name", lastName: "Last Name", phone: "Phone", email: "Email",
      dob: "Date of Birth", insuranceProvider: "Insurance Provider", insuranceMemberId: "Member ID",
      levelOfCare: "Level of Care", status: "Stage", priority: "Priority", assignedTo: "Assigned To",
      referralSource: "Referral Source", notes: "Notes", primaryDiagnosis: "Primary Diagnosis",
      substanceHistory: "Substance History", medicalHistory: "Medical History",
      mentalHealthHistory: "Mental Health History", preAssessmentCompleted: "Pre-Assessment",
      appointmentDate: "Appointment", referralDestination: "Referral Destination",
    };
    const changedFields: string[] = [];
    for (const [key, label] of Object.entries(FIELD_LABELS)) {
      if (key === "assignedTo") {
        const newVal = data.assignedTo !== undefined ? (data.assignedTo ? parseInt(data.assignedTo) : null) : undefined;
        if (newVal !== undefined && newVal !== (before as any)?.[key]) changedFields.push(label);
      } else if (data[key] !== undefined && data[key] !== (before as any)?.[key]) {
        changedFields.push(label);
      }
    }
    if (changedFields.length > 0) {
      const action = changedFields.length === 1
        ? `Updated ${changedFields[0]}`
        : `Updated ${changedFields.slice(0, 2).join(", ")}${changedFields.length > 2 ? ` +${changedFields.length - 2} more` : ""}`;
      const details: Record<string, any> = {};
      changedFields.forEach(label => {
        const key = Object.keys(FIELD_LABELS).find(k => FIELD_LABELS[k] === label)!;
        const oldVal = (before as any)?.[key];
        const newVal = key === "assignedTo" ? (data.assignedTo ? parseInt(data.assignedTo) : null) : data[key];
        details[label] = { from: oldVal ?? null, to: newVal ?? null };
      });
      await logAudit(req, action.slice(0, 100), "inquiry", id, { inquiryId: id, details });
    } else {
      await logAudit(req, "Viewed/Saved Inquiry", "inquiry", id, { inquiryId: id });
    }

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

// ─── VOB Save ─────────────────────────────────────────────────────────────────
router.put("/inquiries/:id/vob", async (req, res) => {
  try {
    const { vobData, costAcceptance } = req.body;
    const update: any = { updatedAt: new Date() };
    if (vobData !== undefined) update.vobData = vobData;
    if (costAcceptance !== undefined) {
      update.costAcceptance = costAcceptance;
      if (costAcceptance === "cannot_pay") update.status = "Non-Viable";
    }
    const [row] = await db.update(inquiries).set(update).where(eq(inquiries.id, parseInt(req.params.id))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    await logAudit(req, costAcceptance ? `cost_acceptance:${costAcceptance}` : "vob_saved", "inquiry", row.id);
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Non-Admit / Did Not Admit ────────────────────────────────────────────────
router.put("/inquiries/:id/non-admit", async (req, res) => {
  try {
    if (isBdRep(req)) { res.status(403).json({ error: "BD reps cannot record non-admit decisions" }); return; }
    const { reason, notes } = req.body;
    if (!reason) { res.status(400).json({ error: "reason is required" }); return; }
    const [row] = await db.update(inquiries).set({
      status: "Did Not Admit",
      stageId: 36,
      nonAdmitReason: reason,
      nonAdmitNotes: notes || null,
      updatedAt: new Date(),
    }).where(eq(inquiries.id, parseInt(req.params.id))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    await logAudit(req, "Did Not Admit", "inquiry", row.id, { inquiryId: row.id, details: { reason, notes } });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Refer Out ────────────────────────────────────────────────────────────────
router.post("/inquiries/:id/refer-out", async (req, res) => {
  try {
    if (isBdRep(req)) { res.status(403).json({ error: "BD reps cannot record refer-out decisions" }); return; }
    const { type, message } = req.body;
    if (!type || !message) { res.status(400).json({ error: "type and message are required" }); return; }
    const [row] = await db.update(inquiries).set({
      referralOutAt: new Date(),
      referralOutType: type,
      referralOutMessage: message,
      updatedAt: new Date(),
    }).where(eq(inquiries.id, parseInt(req.params.id))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    await logAudit(req, `Referred Out: ${type}`, "inquiry", row.id, { inquiryId: row.id, details: { type } });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Audit Log for a specific inquiry ─────────────────────────────────────────
router.get("/inquiries/:id/audit-log", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        details: auditLogs.details,
        createdAt: auditLogs.createdAt,
        userName: users.name,
        userId: auditLogs.userId,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(eq(auditLogs.inquiryId, id))
      .orderBy(desc(auditLogs.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/calls/active — live & ringing calls (admin view) ──────────────
router.get("/calls/active", async (req, res) => {
  try {
    const rows = await db
      .select({
        id: inquiries.id,
        firstName: inquiries.firstName,
        lastName: inquiries.lastName,
        phone: inquiries.phone,
        callStatus: inquiries.callStatus,
        isLocked: inquiries.isLocked,
        lockedAt: inquiries.lockedAt,
        assignedTo: inquiries.assignedTo,
        assignedToName: users.name,
        callDateTime: inquiries.callDateTime,
        ctmSource: inquiries.ctmSource,
      })
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(sql`${inquiries.callStatus} IN ('ringing', 'active')`)
      .orderBy(desc(inquiries.callDateTime));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── GET /api/calls/log — today summary + missed + recent 30 calls ────────────
router.get("/calls/log", async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // All calls today (have a callDateTime today)
    const todayCalls = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      phone: inquiries.phone,
      callStatus: inquiries.callStatus,
      callDurationSeconds: inquiries.callDurationSeconds,
      callDateTime: inquiries.callDateTime,
      ctmSource: inquiries.ctmSource,
    }).from(inquiries)
      .where(and(
        sql`${inquiries.callDateTime} IS NOT NULL`,
        gte(inquiries.callDateTime, todayStart),
      ))
      .orderBy(desc(inquiries.callDateTime));

    const total     = todayCalls.length;
    const missed    = todayCalls.filter(c => c.callStatus === "missed").length;
    const answered  = todayCalls.filter(c => c.callStatus === "completed" || c.callStatus === "active").length;
    const answerRate = total > 0 ? Math.round((answered / total) * 100) : 100;

    // Recent calls — last 30 with any callDateTime, for the full log
    const recentRows = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      phone: inquiries.phone,
      callStatus: inquiries.callStatus,
      callDurationSeconds: inquiries.callDurationSeconds,
      callDateTime: inquiries.callDateTime,
      ctmSource: inquiries.ctmSource,
    }).from(inquiries)
      .where(sql`${inquiries.callDateTime} IS NOT NULL`)
      .orderBy(desc(inquiries.callDateTime))
      .limit(30);

    const format = (r: typeof recentRows[number]) => ({
      id: r.id,
      name: `${r.firstName} ${r.lastName}`.trim(),
      phone: r.phone,
      status: r.callStatus,
      duration: r.callDurationSeconds,
      callDateTime: r.callDateTime,
      source: r.ctmSource,
    });

    res.json({
      summary: { total, missed, answered, answerRate },
      missedToday: todayCalls.filter(c => c.callStatus === "missed").map(format),
      recentCalls: recentRows.map(format),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/inquiries/:id/claim — atomically claim an inquiry for this rep ─
router.post("/inquiries/:id/claim", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sess = req.session as any;
    const userId: number = sess?.userId;

    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Fetch current state
    const [current] = await db
      .select({ isLocked: inquiries.isLocked, assignedTo: inquiries.assignedTo })
      .from(inquiries)
      .where(eq(inquiries.id, id));

    if (!current) {
      res.status(404).json({ error: "Inquiry not found" });
      return;
    }

    // Already locked by someone else?
    if (current.isLocked && current.assignedTo !== userId) {
      const [owner] = await db
        .select({ name: users.name })
        .from(users)
        .where(eq(users.id, current.assignedTo!));
      res.status(409).json({
        error: "already_claimed",
        message: `Already claimed by ${owner?.name ?? "another rep"}`,
        claimedBy: owner?.name ?? "another rep",
      });
      return;
    }

    // Atomic claim
    await db.update(inquiries).set({
      assignedTo: userId,
      isLocked: true,
      lockedAt: new Date(),
      callStatus: "active",
      updatedAt: new Date(),
    }).where(eq(inquiries.id, id));

    // Fetch rep name
    const [rep] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));

    // Broadcast to all so other reps dismiss their notification
    broadcastSSE("call_claimed", {
      inquiryId: id,
      repId: userId,
      repName: rep?.name ?? "A rep",
    });

    res.json({ ok: true, message: "Claimed successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/inquiries/:id/complete-call — mark call completed ────────────
router.post("/inquiries/:id/complete-call", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(inquiries).set({
      callStatus: "completed",
      updatedAt: new Date(),
    }).where(eq(inquiries.id, id));

    broadcastSSE("call_status", { inquiryId: id, status: "completed" });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /api/inquiries/:id/call-outcome — post-call automation ────────────
router.post("/inquiries/:id/call-outcome", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { action, reason, referralSourceName, levelOfCare, location } = req.body;
    const userId = (req as any).session?.userId;

    if (action === "vob_sent") {
      // Move to Insurance Verification stage
      await db.update(inquiries).set({
        status: "Insurance Verification",
        updatedAt: new Date(),
      }).where(eq(inquiries.id, id));

      // Get billing email from settings (fall back to facility email)
      const [billingRow] = await db.select().from(settings).where(eq(settings.key, "billing_email"));
      const [facilityRow] = await db.select().from(settings).where(eq(settings.key, "facility_email"));
      const billingEmail = billingRow?.value || facilityRow?.value || "";

      // Log audit
      await db.insert(auditLogs).values({
        userId,
        action: "vob_sent",
        resourceType: "inquiry",
        resourceId: id,
        inquiryId: id,
        details: "VOB request initiated from post-call flow",
      });

      res.json({ ok: true, billingEmail });

    } else if (action === "referred_out") {
      // Mark as referred out
      await db.update(inquiries).set({
        referralOutAt: new Date(),
        referralOutType: "external",
        referralOutMessage: referralSourceName || "",
        status: "Did Not Admit",
        updatedAt: new Date(),
      }).where(eq(inquiries.id, id));

      await db.insert(auditLogs).values({
        userId,
        action: "referred_out",
        resourceType: "inquiry",
        resourceId: id,
        inquiryId: id,
        details: JSON.stringify({ referralSourceName, levelOfCare, location }),
      });

      res.json({ ok: true });

    } else if (action === "did_not_admit") {
      await db.update(inquiries).set({
        status: "Did Not Admit",
        nonAdmitReason: reason || null,
        updatedAt: new Date(),
      }).where(eq(inquiries.id, id));

      await db.insert(auditLogs).values({
        userId,
        action: "did_not_admit",
        resourceType: "inquiry",
        resourceId: id,
        inquiryId: id,
        details: JSON.stringify({ reason }),
      });

      res.json({ ok: true });

    } else {
      res.status(400).json({ error: "Unknown action" });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
