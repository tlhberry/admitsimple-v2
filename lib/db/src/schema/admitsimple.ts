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
  role: varchar("role", { length: 50 }).notNull().default("staff"),
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

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 50 }),
  resourceId: integer("resource_id"),
  ipAddress: varchar("ip_address", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow(),
});
