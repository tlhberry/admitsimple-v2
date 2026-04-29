import { Router } from "express";
import twilio from "twilio";
import sgMail from "@sendgrid/mail";
import { db } from "@workspace/db";
import { inquiries, users, patients, auditLogs, settings, activities } from "@workspace/db/schema";
import { eq, ilike, or, and, gte, lte, desc, notInArray, inArray, lt, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { isBdRep } from "../lib/requireAdmin";
import { logAudit } from "../lib/logAudit";
import { broadcastSSEToCompany, sendSSEToUser } from "../lib/sse";
import { runAiStageCheck } from "./aiStageSuggestions";
import { getCompanyId } from "../lib/getCompanyId";
import archiver from "archiver";

const router = Router();
router.use(requireAuth);

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
  callStatus: inquiries.callStatus,
  isLocked: inquiries.isLocked,
  lockedAt: inquiries.lockedAt,
};

const INACTIVE_STATUSES = ["Admitted", "Discharged", "Did Not Admit", "Non-Viable"];
const ACTIVE_STATUSES_EXCLUSION = INACTIVE_STATUSES;

router.get("/inquiries", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { search, status, assignedTo, levelOfCare, priority, startDate, endDate, tab } = req.query;
    const filters: any[] = [eq(inquiries.companyId, companyId)];

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
      .where(and(...filters))
      .orderBy(desc(inquiries.createdAt));

    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inquiries", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const data = req.body;
    const sess = req.session as any;
    const sessionUserId = sess?.userId;
    const assignedTo = data.assignedTo ? parseInt(data.assignedTo) : (sessionUserId || null);

    const [row] = await db.insert(inquiries).values({
      companyId,
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

    const inquiryNum = `INQ-${row.id.toString().padStart(6, "0")}`;
    await db.update(inquiries).set({ inquiryNumber: inquiryNum }).where(eq(inquiries.id, row.id));

    await logAudit(req, "Created Inquiry", "inquiry", row.id, { inquiryId: row.id });

    const full = await db.select(fullInquirySelect)
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(eq(inquiries.id, row.id));

    const sgApiKey = process.env.SENDGRID_API_KEY;
    if (sgApiKey) {
      try {
        sgMail.setApiKey(sgApiKey);
        const [facilityEmailRow] = await db.select().from(settings)
          .where(and(eq(settings.key, "facility_email"), eq(settings.companyId, companyId)));
        const adminUsers = await db.select({ email: users.email, name: users.name })
          .from(users)
          .where(and(eq(users.companyId, companyId), eq(users.role, "admin"), eq(users.isActive, true)));
        const notifyEmails = [
          facilityEmailRow?.value,
          ...adminUsers.map(u => u.email),
        ].filter((e): e is string => !!e && e.includes("@"));
        const uniqueEmails = [...new Set(notifyEmails)];
        if (uniqueEmails.length > 0) {
          const inqName = `${row.firstName} ${row.lastName}`.trim();
          const appUrl = process.env.APP_URL || "https://admitsimple.com";
          await sgMail.send({
            to: uniqueEmails,
            from: { email: "austin@admitsimple.com", name: "AdmitSimple" },
            subject: `New Inquiry: ${inqName}`,
            text: `A new inquiry has been submitted.\n\nName: ${inqName}\nPhone: ${row.phone || "N/A"}\nEmail: ${row.email || "N/A"}\nInsurance: ${row.insuranceProvider || "Unknown"}\nStatus: ${row.status}\n\nView in AdmitSimple: ${appUrl}/app`,
            html: `<div style="font-family:sans-serif;max-width:560px;margin:0 auto;">
              <h2 style="color:#5BC8DC;margin-bottom:4px;">New Inquiry</h2>
              <p style="color:#666;margin-top:0;">A new patient inquiry has been submitted in AdmitSimple.</p>
              <table style="font-size:15px;border-collapse:collapse;width:100%;margin:16px 0;">
                <tr><td style="padding:6px 16px 6px 0;color:#888;font-weight:600;">Name</td><td style="color:#1a2233;">${inqName}</td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#888;font-weight:600;">Phone</td><td>${row.phone || "N/A"}</td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#888;font-weight:600;">Email</td><td>${row.email || "N/A"}</td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#888;font-weight:600;">Insurance</td><td>${row.insuranceProvider || "Unknown"}</td></tr>
                <tr><td style="padding:6px 16px 6px 0;color:#888;font-weight:600;">Level of Care</td><td>${row.levelOfCare || "Not specified"}</td></tr>
              </table>
              <p style="margin:24px 0;"><a href="${appUrl}/app" style="background:#5BC8DC;color:#1a2233;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">View in AdmitSimple</a></p>
            </div>`,
          });
        }
      } catch (emailErr) {
        req.log.error({ emailErr }, "Failed to send new inquiry notification email");
      }
    }

    res.status(201).json(full[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inquiries/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const rows = await db.select(fullInquirySelect)
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    if (!rows[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const data = req.body;
    if (isBdRep(req) && data.status !== undefined) {
      res.status(403).json({ error: "BD reps cannot change inquiry pipeline status" }); return;
    }

    const [before] = await db.select().from(inquiries).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    if (!before) { res.status(404).json({ error: "Not found" }); return; }

    const update: any = { updatedAt: new Date() };
    const fields = [
      "firstName","lastName","phone","email","dob","insuranceProvider","insuranceMemberId",
      "primaryDiagnosis","substanceHistory","medicalHistory","mentalHealthHistory","levelOfCare",
      "referralSource","referralContact","searchKeywords","status","priority","notes",
      "preAssessmentCompleted","preAssessmentNotes","calendarEventId","referralDestination",
      "presentingProblem","primarySubstance","callerIsNotPatient","callerName","callerRelationship","patientPhone",
    ];
    fields.forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });
    if (data.assignedTo !== undefined) update.assignedTo = data.assignedTo ? parseInt(data.assignedTo) : null;
    if (data.preAssessmentDate !== undefined) update.preAssessmentDate = data.preAssessmentDate ? new Date(data.preAssessmentDate) : null;
    if (data.appointmentDate !== undefined) update.appointmentDate = data.appointmentDate ? new Date(data.appointmentDate) : null;
    await db.update(inquiries).set(update).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));

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

    const meaningfulChange = data.notes !== undefined || data.status !== undefined ||
      data.insuranceProvider !== undefined || data.primaryDiagnosis !== undefined ||
      data.substanceHistory !== undefined || data.preAssessmentCompleted !== undefined;
    if (meaningfulChange) {
      setImmediate(() => runAiStageCheck(id, companyId, req.log));
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/inquiries/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    await db.delete(inquiries).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inquiries/:id/convert", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const { admitDate, levelOfCare, assignedClinician, notes } = req.body;
    const [inq] = await db.select().from(inquiries).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    if (!inq) { res.status(404).json({ error: "Inquiry not found" }); return; }

    const sess = req.session as any;
    const creditUserId = inq.assignedTo || sess?.userId || null;

    const [patient] = await db.insert(patients).values({
      companyId,
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

    await db.update(inquiries).set({ status: "admitted", updatedAt: new Date() }).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
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
    }).from(patients).leftJoin(users, eq(patients.assignedClinician, users.id)).where(eq(patients.id, patient.id));

    res.status(201).json(rows[0]);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inquiries/:id/pre-cert-form", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const [row] = await db.select({ formData: inquiries.preCertFormData, isComplete: inquiries.preCertFormComplete }).from(inquiries).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ formData: row.formData || {}, isComplete: row.isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id/pre-cert-form", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const { formData, isComplete } = req.body;
    await db.update(inquiries).set({ preCertFormData: formData, preCertFormComplete: isComplete || "no", updatedAt: new Date() }).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    res.json({ formData, isComplete: isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inquiries/:id/nursing-assessment", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const [row] = await db.select({ formData: inquiries.nursingAssessmentData, isComplete: inquiries.nursingAssessmentComplete }).from(inquiries).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ formData: row.formData || {}, isComplete: row.isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id/nursing-assessment", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const { formData, isComplete } = req.body;
    await db.update(inquiries).set({ nursingAssessmentData: formData, nursingAssessmentComplete: isComplete || "no", updatedAt: new Date() }).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    res.json({ formData, isComplete: isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inquiries/:id/pre-screening", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const [row] = await db.select({ formData: inquiries.preScreeningData, isComplete: inquiries.preScreeningComplete }).from(inquiries).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ formData: row.formData || {}, isComplete: row.isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id/pre-screening", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const { formData, isComplete } = req.body;
    await db.update(inquiries).set({ preScreeningData: formData, preScreeningComplete: isComplete || "no", updatedAt: new Date() }).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    res.json({ formData, isComplete: isComplete || "no" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inquiries/:id/download-pre-assessment-forms", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const [row] = await db.select({
      firstName: inquiries.firstName, lastName: inquiries.lastName,
      preCertFormData: inquiries.preCertFormData, preCertFormComplete: inquiries.preCertFormComplete,
      nursingAssessmentData: inquiries.nursingAssessmentData, nursingAssessmentComplete: inquiries.nursingAssessmentComplete,
      preScreeningData: inquiries.preScreeningData, preScreeningComplete: inquiries.preScreeningComplete,
    }).from(inquiries).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));

    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    const hasAnyData = row.preCertFormData || row.nursingAssessmentData || row.preScreeningData;
    if (!hasAnyData) { res.status(400).json({ error: "No forms have been completed yet." }); return; }

    const name = `${row.firstName}-${row.lastName}`.replace(/\s+/g, "-");
    const date = new Date().toISOString().split("T")[0];
    const filename = `PreAssessment-${name}-${date}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);
    archive.append(JSON.stringify({ generatedAt: new Date().toISOString(), patient: `${row.firstName} ${row.lastName}`, status: row.preCertFormComplete, data: row.preCertFormData || {} }, null, 2), { name: "01-RB-PreCert-Clinical.json" });
    archive.append(JSON.stringify({ generatedAt: new Date().toISOString(), patient: `${row.firstName} ${row.lastName}`, status: row.nursingAssessmentComplete, data: row.nursingAssessmentData || {} }, null, 2), { name: "02-Nursing-Assessment.json" });
    archive.append(JSON.stringify({ generatedAt: new Date().toISOString(), patient: `${row.firstName} ${row.lastName}`, status: row.preScreeningComplete, data: row.preScreeningData || {} }, null, 2), { name: "03-Pre-Screening.json" });
    await archive.finalize();
  } catch (err) {
    req.log.error(err);
    if (!res.headersSent) res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id/vob", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { vobData, costAcceptance } = req.body;
    const update: any = { updatedAt: new Date() };
    if (vobData !== undefined) update.vobData = vobData;
    if (costAcceptance !== undefined) {
      update.costAcceptance = costAcceptance;
      if (costAcceptance === "cannot_pay") update.status = "Non-Viable";
    }
    const [row] = await db.update(inquiries).set(update).where(and(eq(inquiries.id, parseInt(req.params.id)), eq(inquiries.companyId, companyId))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    await logAudit(req, costAcceptance ? `cost_acceptance:${costAcceptance}` : "vob_saved", "inquiry", row.id);
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/inquiries/:id/non-admit", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (isBdRep(req)) { res.status(403).json({ error: "BD reps cannot record non-admit decisions" }); return; }
    const { reason, notes } = req.body;
    if (!reason) { res.status(400).json({ error: "reason is required" }); return; }
    const [row] = await db.update(inquiries).set({
      status: "Did Not Admit",
      stageId: 36,
      nonAdmitReason: reason,
      nonAdmitNotes: notes || null,
      updatedAt: new Date(),
    }).where(and(eq(inquiries.id, parseInt(req.params.id)), eq(inquiries.companyId, companyId))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    await logAudit(req, "Did Not Admit", "inquiry", row.id, { inquiryId: row.id, details: { reason, notes } });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inquiries/:id/refer-out", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (isBdRep(req)) { res.status(403).json({ error: "BD reps cannot record refer-out decisions" }); return; }
    const { type, message } = req.body;
    if (!type || !message) { res.status(400).json({ error: "type and message are required" }); return; }
    const [row] = await db.update(inquiries).set({
      referralOutAt: new Date(),
      referralOutType: type,
      referralOutMessage: message,
      updatedAt: new Date(),
    }).where(and(eq(inquiries.id, parseInt(req.params.id)), eq(inquiries.companyId, companyId))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    await logAudit(req, `Referred Out: ${type}`, "inquiry", row.id, { inquiryId: row.id, details: { type } });
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/inquiries/:id/audit-log", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const rows = await db
      .select({ id: auditLogs.id, action: auditLogs.action, details: auditLogs.details, createdAt: auditLogs.createdAt, userName: users.name, userId: auditLogs.userId })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(and(eq(auditLogs.inquiryId, id), eq(auditLogs.companyId, companyId)))
      .orderBy(desc(auditLogs.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/calls/token", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const sess = req.session as any;

    const [acctSidRow]   = await db.select().from(settings).where(and(eq(settings.key, "twilio_account_sid"),   eq(settings.companyId, companyId)));
    const [authTokenRow] = await db.select().from(settings).where(and(eq(settings.key, "twilio_auth_token"),    eq(settings.companyId, companyId)));
    const [keySidRow]    = await db.select().from(settings).where(and(eq(settings.key, "twilio_api_key_sid"),   eq(settings.companyId, companyId)));
    const [keySecretRow] = await db.select().from(settings).where(and(eq(settings.key, "twilio_api_key_secret"),eq(settings.companyId, companyId)));
    const [appSidRow]    = await db.select().from(settings).where(and(eq(settings.key, "twilio_twiml_app_sid"), eq(settings.companyId, companyId)));

    const accountSid = acctSidRow?.value   || process.env.TWILIO_ACCOUNT_SID;
    const authToken  = authTokenRow?.value || process.env.TWILIO_AUTH_TOKEN;
    const resolvedAppSid = appSidRow?.value || process.env.TWILIO_TWIML_APP_SID;

    if (!accountSid || !authToken) {
      res.status(503).json({ error: "Twilio not configured" }); return;
    }
    if (!resolvedAppSid) {
      res.status(503).json({ error: "Twilio not configured" }); return;
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant  = AccessToken.VoiceGrant;
    const identity = String(sess.userId ?? `guest-${Date.now()}`);
    const apiKeySid    = (keySidRow?.value    || process.env.TWILIO_API_KEY_SID)    ?? accountSid;
    const apiKeySecret = (keySecretRow?.value || process.env.TWILIO_API_KEY_SECRET) ?? authToken;
    const accessToken = new AccessToken(accountSid, apiKeySid, apiKeySecret, { identity, ttl: 3600 } as any);
    const voiceGrant  = new VoiceGrant({ outgoingApplicationSid: resolvedAppSid, incomingAllow: true });
    accessToken.addGrant(voiceGrant);
    res.json({ token: accessToken.toJwt(), identity });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/calls/active", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const rows = await db
      .select({
        id: inquiries.id, firstName: inquiries.firstName, lastName: inquiries.lastName, phone: inquiries.phone,
        callStatus: inquiries.callStatus, isLocked: inquiries.isLocked, lockedAt: inquiries.lockedAt,
        assignedTo: inquiries.assignedTo, assignedToName: users.name, callDateTime: inquiries.callDateTime,
        ctmSource: inquiries.ctmSource, ctmCallId: inquiries.ctmCallId,
      })
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(and(eq(inquiries.companyId, companyId), sql`${inquiries.callStatus} IN ('ringing', 'active')`))
      .orderBy(desc(inquiries.callDateTime));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/calls/log", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todayCalls = await db.select({
      id: inquiries.id, firstName: inquiries.firstName, lastName: inquiries.lastName, phone: inquiries.phone,
      callStatus: inquiries.callStatus, callDurationSeconds: inquiries.callDurationSeconds,
      callDateTime: inquiries.callDateTime, ctmSource: inquiries.ctmSource,
    }).from(inquiries)
      .where(and(eq(inquiries.companyId, companyId), sql`${inquiries.callDateTime} IS NOT NULL`, gte(inquiries.callDateTime, todayStart)))
      .orderBy(desc(inquiries.callDateTime));

    const total     = todayCalls.length;
    const missed    = todayCalls.filter(c => c.callStatus === "missed").length;
    const answered  = todayCalls.filter(c => c.callStatus === "completed" || c.callStatus === "active").length;
    const answerRate = total > 0 ? Math.round((answered / total) * 100) : 100;

    const recentRows = await db.select({
      id: inquiries.id, firstName: inquiries.firstName, lastName: inquiries.lastName, phone: inquiries.phone,
      callStatus: inquiries.callStatus, callDurationSeconds: inquiries.callDurationSeconds,
      callDateTime: inquiries.callDateTime, ctmSource: inquiries.ctmSource,
    }).from(inquiries)
      .where(and(eq(inquiries.companyId, companyId), sql`${inquiries.callDateTime} IS NOT NULL`))
      .orderBy(desc(inquiries.callDateTime))
      .limit(30);

    const format = (r: typeof recentRows[number]) => ({
      id: r.id, name: `${r.firstName} ${r.lastName}`.trim(), phone: r.phone,
      status: r.callStatus, duration: r.callDurationSeconds, callDateTime: r.callDateTime, source: r.ctmSource,
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

router.post("/inquiries/:id/claim", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const sess = req.session as any;
    const userId: number = sess?.userId;
    if (!userId) { res.status(401).json({ error: "Not authenticated" }); return; }

    const [current] = await db
      .select({ isLocked: inquiries.isLocked, assignedTo: inquiries.assignedTo })
      .from(inquiries)
      .where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    if (!current) { res.status(404).json({ error: "Inquiry not found" }); return; }

    if (current.isLocked && current.assignedTo !== userId) {
      const [owner] = await db.select({ name: users.name }).from(users).where(eq(users.id, current.assignedTo!));
      res.status(409).json({ error: "already_claimed", message: `Already claimed by ${owner?.name ?? "another rep"}`, claimedBy: owner?.name ?? "another rep" });
      return;
    }

    const [inqData] = await db.select({ ctmCallId: inquiries.ctmCallId }).from(inquiries).where(eq(inquiries.id, id));
    await db.update(inquiries).set({ assignedTo: userId, isLocked: true, lockedAt: new Date(), callStatus: "active", updatedAt: new Date() }).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));

    const [rep] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId));
    broadcastSSEToCompany(companyId, "call_claimed", { inquiryId: id, repId: userId, repName: rep?.name ?? "A rep" });

    const callSid = inqData?.ctmCallId;
    if (callSid) {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken  = process.env.TWILIO_AUTH_TOKEN;
      if (accountSid && authToken) {
        const twilioClient = twilio(accountSid, authToken);
        const dialTwiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial timeout="30"><Client>${userId}</Client></Dial></Response>`;
        twilioClient.calls(callSid).update({ twiml: dialTwiml }).catch((err: Error) => {
          console.error(`[Claim] Failed to redirect call ${callSid}:`, err.message);
        });
      }
    }

    res.json({ ok: true, message: "Claimed successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inquiries/:id/complete-call", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    await db.update(inquiries).set({ callStatus: "completed", updatedAt: new Date() }).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
    broadcastSSEToCompany(companyId, "call_status", { inquiryId: id, status: "completed" });
    res.json({ ok: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/inquiries/:id/call-outcome", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const { action, reason, referralSourceName, levelOfCare, location } = req.body;
    const userId = (req as any).session?.userId;

    if (action === "vob_sent") {
      await db.update(inquiries).set({ status: "Insurance Verification", updatedAt: new Date() }).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
      const [billingRow] = await db.select().from(settings).where(and(eq(settings.key, "billing_email"), eq(settings.companyId, companyId)));
      const [facilityRow] = await db.select().from(settings).where(and(eq(settings.key, "facility_email"), eq(settings.companyId, companyId)));
      const billingEmail = billingRow?.value || facilityRow?.value || "";
      await db.insert(auditLogs).values({ companyId, userId, action: "vob_sent", resourceType: "inquiry", resourceId: id, inquiryId: id, details: "VOB request initiated from post-call flow" });
      res.json({ ok: true, billingEmail });

    } else if (action === "referred_out") {
      await db.update(inquiries).set({ referralOutAt: new Date(), referralOutType: "external", referralOutMessage: referralSourceName || "", status: "Did Not Admit", updatedAt: new Date() }).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
      await db.insert(auditLogs).values({ companyId, userId, action: "referred_out", resourceType: "inquiry", resourceId: id, inquiryId: id, details: JSON.stringify({ referralSourceName, levelOfCare, location }) });
      res.json({ ok: true });

    } else if (action === "did_not_admit") {
      await db.update(inquiries).set({ status: "Did Not Admit", nonAdmitReason: reason || null, updatedAt: new Date() }).where(and(eq(inquiries.id, id), eq(inquiries.companyId, companyId)));
      await db.insert(auditLogs).values({ companyId, userId, action: "did_not_admit", resourceType: "inquiry", resourceId: id, inquiryId: id, details: JSON.stringify({ reason }) });
      res.json({ ok: true });

    } else {
      res.status(400).json({ error: "Unknown action" });
    }
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/calls/log", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { to, name, duration, inquiryId: rawInquiryId } = req.body as { to?: string; name?: string; duration?: number; inquiryId?: number };

    let resolvedInquiryId = rawInquiryId ?? null;
    if (!resolvedInquiryId && to) {
      const [found] = await db.select({ id: inquiries.id }).from(inquiries)
        .where(and(eq(inquiries.phone, to), eq(inquiries.companyId, companyId)))
        .orderBy(desc(inquiries.createdAt)).limit(1);
      if (found) resolvedInquiryId = found.id;
    }

    if (!resolvedInquiryId) { res.json({ ok: true, logged: false }); return; }

    const durationLabel = duration != null ? `${Math.floor(duration / 60)}m ${duration % 60}s` : null;
    await db.insert(activities).values({
      companyId,
      inquiryId: resolvedInquiryId,
      userId: (req as any).session?.userId ?? null,
      type: "call",
      subject: `Outbound call${name ? ` to ${name}` : ""}${to ? ` (${to})` : ""}`,
      body: durationLabel ? `Duration: ${durationLabel}` : null,
    });

    res.json({ ok: true, logged: true, inquiryId: resolvedInquiryId });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to log call" });
  }
});

export default router;
