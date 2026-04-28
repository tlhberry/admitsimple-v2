-- Create companies table
CREATE TABLE "companies" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(255) NOT NULL,
  "slug" varchar(100) NOT NULL,
  "plan" varchar(50) DEFAULT 'trial' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint

-- Insert default company for existing data
INSERT INTO "companies" ("id", "name", "slug", "plan", "is_active")
VALUES (1, 'Default', 'default', 'trial', true)
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint

-- Add company_id columns (nullable first so we can backfill)
ALTER TABLE "users" ADD COLUMN "company_id" integer;
ALTER TABLE "inquiries" ADD COLUMN "company_id" integer;
ALTER TABLE "patients" ADD COLUMN "company_id" integer;
ALTER TABLE "pipeline_stages" ADD COLUMN "company_id" integer;
ALTER TABLE "activities" ADD COLUMN "company_id" integer;
ALTER TABLE "reports" ADD COLUMN "company_id" integer;
ALTER TABLE "settings" ADD COLUMN "company_id" integer;
ALTER TABLE "referral_sources" ADD COLUMN "company_id" integer;
ALTER TABLE "insurance_verifications" ADD COLUMN "company_id" integer;
ALTER TABLE "referral_accounts" ADD COLUMN "company_id" integer;
ALTER TABLE "referral_contacts" ADD COLUMN "company_id" integer;
ALTER TABLE "bd_activity_logs" ADD COLUMN "company_id" integer;
ALTER TABLE "beds" ADD COLUMN "company_id" integer;
ALTER TABLE "daily_ai_tasks" ADD COLUMN "company_id" integer;
ALTER TABLE "daily_task_completions" ADD COLUMN "company_id" integer;
ALTER TABLE "patient_stays" ADD COLUMN "company_id" integer;
ALTER TABLE "saved_reports" ADD COLUMN "company_id" integer;
ALTER TABLE "sms_messages" ADD COLUMN "company_id" integer;
ALTER TABLE "audit_logs" ADD COLUMN "company_id" integer;
ALTER TABLE "discharges" ADD COLUMN "company_id" integer;
ALTER TABLE "ai_stage_suggestions" ADD COLUMN "company_id" integer;
--> statement-breakpoint

-- Backfill all existing rows to company 1
UPDATE "users" SET "company_id" = 1;
UPDATE "inquiries" SET "company_id" = 1;
UPDATE "patients" SET "company_id" = 1;
UPDATE "pipeline_stages" SET "company_id" = 1;
UPDATE "activities" SET "company_id" = 1;
UPDATE "reports" SET "company_id" = 1;
UPDATE "settings" SET "company_id" = 1;
UPDATE "referral_sources" SET "company_id" = 1;
UPDATE "insurance_verifications" SET "company_id" = 1;
UPDATE "referral_accounts" SET "company_id" = 1;
UPDATE "referral_contacts" SET "company_id" = 1;
UPDATE "bd_activity_logs" SET "company_id" = 1;
UPDATE "beds" SET "company_id" = 1;
UPDATE "daily_ai_tasks" SET "company_id" = 1;
UPDATE "daily_task_completions" SET "company_id" = 1;
UPDATE "patient_stays" SET "company_id" = 1;
UPDATE "saved_reports" SET "company_id" = 1;
UPDATE "sms_messages" SET "company_id" = 1;
UPDATE "audit_logs" SET "company_id" = 1;
UPDATE "discharges" SET "company_id" = 1;
UPDATE "ai_stage_suggestions" SET "company_id" = 1;
--> statement-breakpoint

-- Now make NOT NULL
ALTER TABLE "users" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "inquiries" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "patients" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "pipeline_stages" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "activities" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "reports" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "settings" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "referral_sources" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "insurance_verifications" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "referral_accounts" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "referral_contacts" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "bd_activity_logs" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "beds" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "daily_ai_tasks" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "daily_task_completions" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "patient_stays" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "saved_reports" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "sms_messages" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "audit_logs" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "discharges" ALTER COLUMN "company_id" SET NOT NULL;
ALTER TABLE "ai_stage_suggestions" ALTER COLUMN "company_id" SET NOT NULL;
--> statement-breakpoint

-- Drop old single-column unique constraints that need to be per-company
ALTER TABLE "settings" DROP CONSTRAINT IF EXISTS "settings_key_unique";
ALTER TABLE "daily_ai_tasks" DROP CONSTRAINT IF EXISTS "daily_ai_tasks_task_date_unique";
--> statement-breakpoint

-- Add new compound unique constraints
ALTER TABLE "settings" ADD CONSTRAINT "settings_company_id_key_unique" UNIQUE("company_id", "key");
ALTER TABLE "daily_ai_tasks" ADD CONSTRAINT "daily_ai_tasks_company_id_task_date_unique" UNIQUE("company_id", "task_date");
--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "patients" ADD CONSTRAINT "patients_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "pipeline_stages" ADD CONSTRAINT "pipeline_stages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "activities" ADD CONSTRAINT "activities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "reports" ADD CONSTRAINT "reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "settings" ADD CONSTRAINT "settings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "referral_sources" ADD CONSTRAINT "referral_sources_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "insurance_verifications" ADD CONSTRAINT "insurance_verifications_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "referral_accounts" ADD CONSTRAINT "referral_accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "referral_contacts" ADD CONSTRAINT "referral_contacts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "bd_activity_logs" ADD CONSTRAINT "bd_activity_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "beds" ADD CONSTRAINT "beds_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_ai_tasks" ADD CONSTRAINT "daily_ai_tasks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "daily_task_completions" ADD CONSTRAINT "daily_task_completions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "patient_stays" ADD CONSTRAINT "patient_stays_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "saved_reports" ADD CONSTRAINT "saved_reports_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sms_messages" ADD CONSTRAINT "sms_messages_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "discharges" ADD CONSTRAINT "discharges_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ai_stage_suggestions" ADD CONSTRAINT "ai_stage_suggestions_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;
