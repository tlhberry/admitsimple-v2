CREATE TABLE "activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer,
	"patient_id" integer,
	"user_id" integer,
	"type" varchar(50) NOT NULL,
	"subject" varchar(255),
	"body" text,
	"outcome" varchar(100),
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_stage_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer NOT NULL,
	"current_stage" varchar(100) NOT NULL,
	"suggested_stage" varchar(100) NOT NULL,
	"reasoning" text,
	"confidence" varchar(20),
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp,
	"resolved_by" integer
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" integer,
	"inquiry_id" integer,
	"details" text,
	"ip_address" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "bd_activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer,
	"user_id" integer,
	"activity_type" varchar(50) NOT NULL,
	"notes" text,
	"activity_date" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "beds" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"unit" varchar(100) DEFAULT 'general' NOT NULL,
	"status" varchar(20) DEFAULT 'available' NOT NULL,
	"current_patient_name" varchar(255),
	"gender" varchar(20),
	"expected_discharge_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "chatbot_sessions" (
	"session_id" varchar(100) PRIMARY KEY NOT NULL,
	"messages" jsonb DEFAULT '[]'::jsonb,
	"notified_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "daily_ai_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_date" varchar(10) NOT NULL,
	"tasks_data" jsonb NOT NULL,
	"generated_at" timestamp DEFAULT now(),
	CONSTRAINT "daily_ai_tasks_task_date_unique" UNIQUE("task_date")
);
--> statement-breakpoint
CREATE TABLE "daily_task_completions" (
	"id" serial PRIMARY KEY NOT NULL,
	"task_date" varchar(10) NOT NULL,
	"user_id" integer,
	"inquiry_id" integer,
	"task_type" varchar(50) NOT NULL,
	"completed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "discharges" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" integer NOT NULL,
	"discharge_type" varchar(100) NOT NULL,
	"level_of_care" varchar(100),
	"level_of_care_other" varchar(255),
	"destination_type" varchar(100),
	"referral_source_id" integer,
	"referral_source_name" varchar(255),
	"hospital_name" varchar(255),
	"clinical_transfer" boolean DEFAULT false NOT NULL,
	"notes" text,
	"follow_up" boolean DEFAULT false NOT NULL,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"dob" varchar(20),
	"insurance_provider" varchar(255),
	"insurance_member_id" varchar(100),
	"insurance_group_number" varchar(100),
	"insurance_carrier_phone" varchar(30),
	"city" varchar(100),
	"state" varchar(50),
	"primary_diagnosis" text,
	"substance_history" text,
	"medical_history" text,
	"mental_health_history" text,
	"level_of_care" varchar(100),
	"referral_source" varchar(255),
	"referral_contact" varchar(255),
	"assigned_to" integer,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium',
	"notes" text,
	"ai_parsed_data" jsonb,
	"parsed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"search_keywords" text,
	"pre_cert_form_data" jsonb,
	"pre_cert_form_complete" varchar(10) DEFAULT 'no',
	"nursing_assessment_data" jsonb,
	"nursing_assessment_complete" varchar(10) DEFAULT 'no',
	"pre_screening_data" jsonb,
	"pre_screening_complete" varchar(10) DEFAULT 'no',
	"pre_assessment_completed" varchar(10) DEFAULT 'no',
	"pre_assessment_date" timestamp,
	"pre_assessment_notes" text,
	"vob_data" jsonb,
	"cost_acceptance" varchar(50),
	"non_admit_reason" varchar(255),
	"non_admit_notes" text,
	"referral_out_at" timestamp,
	"referral_out_type" varchar(20),
	"referral_out_message" text,
	"appointment_date" timestamp,
	"calendar_event_id" varchar(255),
	"reminder_sent_at" jsonb,
	"referral_destination" varchar(255),
	"inquiry_number" varchar(20),
	"ctm_call_id" varchar(100),
	"ctm_tracking_number" varchar(50),
	"ctm_source" varchar(100),
	"call_duration_seconds" integer,
	"call_recording_url" text,
	"call_date_time" timestamp,
	"referral_details" varchar(255),
	"online_source" varchar(100),
	"referral_origin" varchar(50),
	"transcription" text,
	"ai_extracted_data" text,
	"call_summary" text,
	"call_status" varchar(20),
	"is_locked" boolean DEFAULT false NOT NULL,
	"locked_at" timestamp,
	"presenting_problem" text,
	"primary_substance" varchar(100),
	"caller_is_not_patient" boolean DEFAULT false NOT NULL,
	"caller_name" varchar(255),
	"caller_relationship" varchar(100),
	"patient_phone" varchar(30)
);
--> statement-breakpoint
CREATE TABLE "insurance_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer,
	"patient_id" integer,
	"provider" varchar(255),
	"member_id" varchar(100),
	"group_number" varchar(100),
	"deductible" varchar(50),
	"deductible_met" varchar(50),
	"out_of_pocket" varchar(50),
	"coverage_details" text,
	"verified_by" integer,
	"verified_at" timestamp,
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"token" varchar(128) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "patient_stays" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer,
	"patient_name" varchar(255) NOT NULL,
	"bed_id" integer,
	"admit_date" timestamp DEFAULT now(),
	"expected_discharge_date" timestamp,
	"actual_discharge_date" timestamp,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(30),
	"email" varchar(255),
	"dob" varchar(20),
	"insurance_provider" varchar(255),
	"insurance_member_id" varchar(100),
	"level_of_care" varchar(100),
	"admit_date" timestamp,
	"discharge_date" timestamp,
	"current_stage" varchar(100),
	"assigned_clinician" integer,
	"assigned_admissions" integer,
	"credit_user_id" integer,
	"credit_override_by" integer,
	"credit_overridden_at" timestamp,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"is_alumni" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pipeline_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer NOT NULL,
	"color" varchar(50) DEFAULT '#3B82F6',
	"description" text,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "referral_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50),
	"address" text,
	"phone" varchar(50),
	"website" varchar(255),
	"notes" text,
	"assigned_bd_rep_id" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"account_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"position" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100),
	"contact" varchar(255),
	"phone" varchar(30),
	"email" varchar(255),
	"address" text,
	"notes" text,
	"is_active" boolean DEFAULT true,
	"owned_by_user_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"generated_by" integer,
	"date_range_start" timestamp,
	"date_range_end" timestamp,
	"parameters" jsonb,
	"ai_narrative" text,
	"report_data" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"user_id" integer,
	"sql_query" text NOT NULL,
	"columns" jsonb,
	"visualization_type" varchar(50) DEFAULT 'table',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" text,
	"category" varchar(50),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "sms_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"phone" varchar(50) NOT NULL,
	"direction" varchar(10) NOT NULL,
	"body" text NOT NULL,
	"twilio_sid" varchar(100),
	"status" varchar(20) DEFAULT 'sent',
	"inquiry_id" integer,
	"user_id" integer,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" varchar(100) NOT NULL,
	"password" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'admissions' NOT NULL,
	"initials" varchar(10),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_stage_suggestions" ADD CONSTRAINT "ai_stage_suggestions_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_stage_suggestions" ADD CONSTRAINT "ai_stage_suggestions_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bd_activity_logs" ADD CONSTRAINT "bd_activity_logs_account_id_referral_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."referral_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bd_activity_logs" ADD CONSTRAINT "bd_activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_task_completions" ADD CONSTRAINT "daily_task_completions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_task_completions" ADD CONSTRAINT "daily_task_completions_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discharges" ADD CONSTRAINT "discharges_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discharges" ADD CONSTRAINT "discharges_referral_source_id_referral_sources_id_fk" FOREIGN KEY ("referral_source_id") REFERENCES "public"."referral_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discharges" ADD CONSTRAINT "discharges_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_verifications" ADD CONSTRAINT "insurance_verifications_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_verifications" ADD CONSTRAINT "insurance_verifications_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "insurance_verifications" ADD CONSTRAINT "insurance_verifications_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_stays" ADD CONSTRAINT "patient_stays_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_stays" ADD CONSTRAINT "patient_stays_bed_id_beds_id_fk" FOREIGN KEY ("bed_id") REFERENCES "public"."beds"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_clinician_users_id_fk" FOREIGN KEY ("assigned_clinician") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_assigned_admissions_users_id_fk" FOREIGN KEY ("assigned_admissions") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_credit_user_id_users_id_fk" FOREIGN KEY ("credit_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_credit_override_by_users_id_fk" FOREIGN KEY ("credit_override_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_accounts" ADD CONSTRAINT "referral_accounts_assigned_bd_rep_id_users_id_fk" FOREIGN KEY ("assigned_bd_rep_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_accounts" ADD CONSTRAINT "referral_accounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_contacts" ADD CONSTRAINT "referral_contacts_account_id_referral_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."referral_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_sources" ADD CONSTRAINT "referral_sources_owned_by_user_id_users_id_fk" FOREIGN KEY ("owned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_users_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;