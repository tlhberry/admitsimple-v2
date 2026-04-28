-- Create a restricted, non-superuser role used only for saved-report execution.
-- The app (postgres superuser) temporarily switches to this role for each report
-- run via SET LOCAL ROLE, so Row-Level Security (RLS) applies and the query
-- can only see rows belonging to the current company.

CREATE ROLE reports_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE;
GRANT USAGE ON SCHEMA public TO reports_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO reports_reader;
--> statement-breakpoint

-- Helper expression used in all policies.
-- Returns -1 (matches nothing) when the variable is unset, so a missing
-- app.current_company_id never silently returns all rows.
-- company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1)

-- ── PHI tables with company_id: enable RLS + company-isolation policy ─────────

ALTER TABLE inquiries               ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients                ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings                ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_sources        ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_accounts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE bd_activity_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_ai_tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_task_completions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_stays           ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_reports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE sms_messages            ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE discharges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_stage_suggestions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- NOTE: We do NOT use FORCE ROW LEVEL SECURITY, so the superuser (postgres)
-- that runs all normal Drizzle ORM queries bypasses RLS entirely — no performance
-- impact or risk of breaking existing routes.  RLS only activates for the
-- non-superuser reports_reader role used in report execution.

CREATE POLICY company_isolation ON inquiries
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON patients
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON activities
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON pipeline_stages
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON reports
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON settings
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON referral_sources
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON insurance_verifications
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON referral_accounts
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON referral_contacts
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON bd_activity_logs
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON beds
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON daily_ai_tasks
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON daily_task_completions
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON patient_stays
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON saved_reports
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON sms_messages
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

-- audit_logs.company_id is nullable; allow rows with NULL company_id through too
CREATE POLICY company_isolation ON audit_logs
  FOR SELECT TO reports_reader
  USING (
    company_id IS NULL OR
    company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1)
  );

CREATE POLICY company_isolation ON discharges
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON ai_stage_suggestions
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));

CREATE POLICY company_isolation ON users
  FOR SELECT TO reports_reader
  USING (company_id = COALESCE(NULLIF(current_setting('app.current_company_id', true), '')::int, -1));
