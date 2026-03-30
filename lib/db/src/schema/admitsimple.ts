import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: varchar("role", { length: 50 }).notNull().default("admissions"),
  initials: varchar("initials", { length: 10 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const inquiries = pgTable("inquiries", {
  id: serial("id").primaryKey(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  dob: varchar("dob", { length: 20 }),
  insuranceProvider: varchar("insurance_provider", { length: 255 }),
  insuranceMemberId: varchar("insurance_member_id", { length: 100 }),
  primaryDiagnosis: text("primary_diagnosis"),
  substanceHistory: text("substance_history"),
  medicalHistory: text("medical_history"),
  mentalHealthHistory: text("mental_health_history"),
  levelOfCare: varchar("level_of_care", { length: 100 }),
  referralSource: varchar("referral_source", { length: 255 }),
  referralContact: varchar("referral_contact", { length: 255 }),
  assignedTo: integer("assigned_to").references(() => users.id),
  status: varchar("status", { length: 50 }).notNull().default("new"),
  priority: varchar("priority", { length: 20 }).default("medium"),
  notes: text("notes"),
  aiParsedData: jsonb("ai_parsed_data"),
  parsedAt: timestamp("parsed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  searchKeywords: text("search_keywords"),
  // Pre-assessment forms
  preCertFormData: jsonb("pre_cert_form_data"),
  preCertFormComplete: varchar("pre_cert_form_complete", { length: 10 }).default("no"),
  nursingAssessmentData: jsonb("nursing_assessment_data"),
  nursingAssessmentComplete: varchar("nursing_assessment_complete", { length: 10 }).default("no"),
  preScreeningData: jsonb("pre_screening_data"),
  preScreeningComplete: varchar("pre_screening_complete", { length: 10 }).default("no"),
  preAssessmentCompleted: varchar("pre_assessment_completed", { length: 10 }).default("no"),
  preAssessmentDate: timestamp("pre_assessment_date"),
  preAssessmentNotes: text("pre_assessment_notes"),
  vobData: jsonb("vob_data"),
  costAcceptance: varchar("cost_acceptance", { length: 50 }),
  nonAdmitReason: varchar("non_admit_reason", { length: 255 }),
  nonAdmitNotes: text("non_admit_notes"),
  referralOutAt: timestamp("referral_out_at"),
  referralOutType: varchar("referral_out_type", { length: 20 }),
  referralOutMessage: text("referral_out_message"),
  // Scheduled to Admit
  appointmentDate: timestamp("appointment_date"),
  calendarEventId: varchar("calendar_event_id", { length: 255 }),
  reminderSentAt: jsonb("reminder_sent_at"),
  // Did Not Admit tracking
  referralDestination: varchar("referral_destination", { length: 255 }),
  // Unique inquiry number (INQ-000001)
  inquiryNumber: varchar("inquiry_number", { length: 20 }),
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiries.$inferSelect;

export const patients = pgTable("patients", {
  id: serial("id").primaryKey(),
  inquiryId: integer("inquiry_id").references(() => inquiries.id),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  dob: varchar("dob", { length: 20 }),
  insuranceProvider: varchar("insurance_provider", { length: 255 }),
  insuranceMemberId: varchar("insurance_member_id", { length: 100 }),
  levelOfCare: varchar("level_of_care", { length: 100 }),
  admitDate: timestamp("admit_date"),
  dischargeDate: timestamp("discharge_date"),
  currentStage: varchar("current_stage", { length: 100 }),
  assignedClinician: integer("assigned_clinician").references(() => users.id),
  assignedAdmissions: integer("assigned_admissions").references(() => users.id),
  creditUserId: integer("credit_user_id").references(() => users.id),
  creditOverrideBy: integer("credit_override_by").references(() => users.id),
  creditOverriddenAt: timestamp("credit_overridden_at"),
  status: varchar("status", { length: 50 }).notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPatientSchema = createInsertSchema(patients).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertPatient = z.infer<typeof insertPatientSchema>;
export type Patient = typeof patients.$inferSelect;

export const pipelineStages = pgTable("pipeline_stages", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  order: integer("order").notNull(),
  color: varchar("color", { length: 50 }).default("#3B82F6"),
  description: text("description"),
  isActive: boolean("is_active").default(true),
});

export const insertPipelineStageSchema = createInsertSchema(pipelineStages).omit({ id: true });
export type InsertPipelineStage = z.infer<typeof insertPipelineStageSchema>;
export type PipelineStage = typeof pipelineStages.$inferSelect;

export const activities = pgTable("activities", {
  id: serial("id").primaryKey(),
  inquiryId: integer("inquiry_id").references(() => inquiries.id),
  patientId: integer("patient_id").references(() => patients.id),
  userId: integer("user_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  subject: varchar("subject", { length: 255 }),
  body: text("body"),
  outcome: varchar("outcome", { length: 100 }),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertActivitySchema = createInsertSchema(activities).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  generatedBy: integer("generated_by").references(() => users.id),
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  parameters: jsonb("parameters"),
  aiNarrative: text("ai_narrative"),
  reportData: jsonb("report_data"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReportSchema = createInsertSchema(reports).omit({ id: true, createdAt: true });
export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  category: varchar("category", { length: 50 }),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Setting = typeof settings.$inferSelect;

export const referralSources = pgTable("referral_sources", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }),
  contact: varchar("contact", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  notes: text("notes"),
  isActive: boolean("is_active").default(true),
  ownedByUserId: integer("owned_by_user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ReferralSource = typeof referralSources.$inferSelect;

export const insuranceVerifications = pgTable("insurance_verifications", {
  id: serial("id").primaryKey(),
  inquiryId: integer("inquiry_id").references(() => inquiries.id),
  patientId: integer("patient_id").references(() => patients.id),
  provider: varchar("provider", { length: 255 }),
  memberId: varchar("member_id", { length: 100 }),
  groupNumber: varchar("group_number", { length: 100 }),
  deductible: varchar("deductible", { length: 50 }),
  deductibleMet: varchar("deductible_met", { length: 50 }),
  outOfPocket: varchar("out_of_pocket", { length: 50 }),
  coverageDetails: text("coverage_details"),
  verifiedBy: integer("verified_by").references(() => users.id),
  verifiedAt: timestamp("verified_at"),
  status: varchar("status", { length: 50 }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type InsuranceVerification = typeof insuranceVerifications.$inferSelect;

// ─── BD Module ───────────────────────────────────────────────────────────────

export const accountTypes = [
  "hospital", "private_practice", "mat_clinic", "outpatient_facility",
  "residential_facility", "attorneys", "ed_consultant", "community", "other"
] as const;

export const accountTypeDisplayNames: Record<string, string> = {
  hospital: "Hospital",
  private_practice: "Private Practice",
  mat_clinic: "MAT Clinic",
  outpatient_facility: "Outpatient Facility",
  residential_facility: "Residential Facility",
  attorneys: "Attorneys",
  ed_consultant: "Ed Consultant",
  community: "Community",
  other: "Other",
};

export const bdActivityTypes = [
  "face_to_face", "phone_call", "email", "meeting", "lunch", "presentation", "other"
] as const;

export const bdActivityTypeDisplayNames: Record<string, string> = {
  face_to_face: "Face-to-Face Visit",
  phone_call: "Phone Call",
  email: "Email",
  meeting: "Meeting",
  lunch: "Lunch/Coffee",
  presentation: "Presentation",
  other: "Other",
};

export const referralAccounts = pgTable("referral_accounts", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 50 }),
  address: text("address"),
  phone: varchar("phone", { length: 50 }),
  website: varchar("website", { length: 255 }),
  notes: text("notes"),
  assignedBdRepId: integer("assigned_bd_rep_id").references(() => users.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertReferralAccountSchema = createInsertSchema(referralAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export type ReferralAccount = typeof referralAccounts.$inferSelect;
export type InsertReferralAccount = z.infer<typeof insertReferralAccountSchema>;

export const referralContacts = pgTable("referral_contacts", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull().references(() => referralAccounts.id),
  name: varchar("name", { length: 255 }).notNull(),
  position: varchar("position", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  email: varchar("email", { length: 255 }),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReferralContactSchema = createInsertSchema(referralContacts).omit({ id: true, createdAt: true });
export type ReferralContact = typeof referralContacts.$inferSelect;

export const bdActivityLogs = pgTable("bd_activity_logs", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").references(() => referralAccounts.id),
  userId: integer("user_id").references(() => users.id),
  activityType: varchar("activity_type", { length: 50 }).notNull(),
  notes: text("notes"),
  activityDate: timestamp("activity_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBdActivityLogSchema = createInsertSchema(bdActivityLogs).omit({ id: true, createdAt: true });
export type BdActivityLog = typeof bdActivityLogs.$inferSelect;

// ─── Bed Board ───────────────────────────────────────────────────────────────
export const beds = pgTable("beds", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  unit: varchar("unit", { length: 100 }).notNull().default("general"),
  status: varchar("status", { length: 20 }).notNull().default("available"),
  currentPatientName: varchar("current_patient_name", { length: 255 }),
  gender: varchar("gender", { length: 20 }),
  expectedDischargeDate: timestamp("expected_discharge_date"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertBedSchema = createInsertSchema(beds).omit({ id: true, createdAt: true, updatedAt: true });
export type Bed = typeof beds.$inferSelect;
export type InsertBed = z.infer<typeof insertBedSchema>;

// ─── Daily AI Task Board ──────────────────────────────────────────────────────
export const dailyAiTasks = pgTable("daily_ai_tasks", {
  id: serial("id").primaryKey(),
  taskDate: varchar("task_date", { length: 10 }).notNull().unique(),
  tasksData: jsonb("tasks_data").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
});

export const dailyTaskCompletions = pgTable("daily_task_completions", {
  id: serial("id").primaryKey(),
  taskDate: varchar("task_date", { length: 10 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  inquiryId: integer("inquiry_id").references(() => inquiries.id),
  taskType: varchar("task_type", { length: 50 }).notNull(),
  completedAt: timestamp("completed_at").defaultNow(),
});

// ─── Saved Reports ────────────────────────────────────────────────────────────
export const savedReports = pgTable("saved_reports", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  userId: integer("user_id").references(() => users.id),
  sqlQuery: text("sql_query").notNull(),
  columns: jsonb("columns"),
  visualizationType: varchar("visualization_type", { length: 50 }).default("table"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ─── Audit Logs ───────────────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: integer("resource_id"),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});
