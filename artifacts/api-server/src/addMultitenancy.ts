/**
 * One-time migration: add multi-tenancy (company_id) to all tables.
 * Run with: node --loader tsx artifacts/api-server/src/addMultitenancy.ts
 * Or via esbuild + node after building.
 *
 * Safe to run multiple times (idempotent).
 */
import pg from "pg";

const { Pool } = pg;

async function run() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    console.log("1. Creating companies table if not exists...");
    await client.query(`
      CREATE TABLE IF NOT EXISTS companies (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(100) NOT NULL UNIQUE,
        plan VARCHAR(50) NOT NULL DEFAULT 'trial',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    console.log("2. Inserting default company (id=1)...");
    await client.query(`
      INSERT INTO companies (id, name, slug, plan)
      VALUES (1, 'Demo Facility', 'demo-facility', 'trial')
      ON CONFLICT (id) DO NOTHING
    `);
    // Reset sequence so next insert gets id > 1
    await client.query(`SELECT setval('companies_id_seq', GREATEST(1, (SELECT MAX(id) FROM companies)))`);

    const tables = [
      "users",
      "inquiries",
      "patients",
      "activities",
      "reports",
      "settings",
      "referral_sources",
      "insurance_verifications",
      "referral_accounts",
      "referral_contacts",
      "bd_activity_logs",
      "beds",
      "daily_ai_tasks",
      "daily_task_completions",
      "patient_stays",
      "saved_reports",
      "sms_messages",
      "audit_logs",
      "discharges",
      "ai_stage_suggestions",
      "pipeline_stages",
    ];

    for (const table of tables) {
      // Check if table exists first
      const exists = await client.query(
        `SELECT 1 FROM information_schema.tables WHERE table_name = $1 AND table_schema = 'public'`,
        [table]
      );
      if (exists.rowCount === 0) {
        console.log(`  Skipping ${table} (table does not exist)`);
        continue;
      }

      // Add company_id column if it doesn't exist
      const colExists = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = 'company_id' AND table_schema = 'public'`,
        [table]
      );
      if (colExists.rowCount === 0) {
        console.log(`  Adding company_id to ${table}...`);
        await client.query(`ALTER TABLE ${table} ADD COLUMN company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE`);
      } else {
        console.log(`  ${table} already has company_id`);
      }

      // Backfill nulls to company 1
      await client.query(`UPDATE ${table} SET company_id = 1 WHERE company_id IS NULL`);
    }

    // Fix settings: drop old unique(key) if it exists, add unique(company_id, key)
    console.log("3. Fixing settings unique constraint...");
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_key_unique;
        ALTER TABLE settings DROP CONSTRAINT IF EXISTS settings_company_id_key_unique;
      EXCEPTION WHEN OTHERS THEN NULL; END $$
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE settings ADD CONSTRAINT settings_company_id_key_unique UNIQUE (company_id, key);
      EXCEPTION WHEN duplicate_table THEN NULL; END $$
    `);

    // Fix daily_ai_tasks: drop old unique(task_date), add unique(company_id, task_date)
    console.log("4. Fixing daily_ai_tasks unique constraint...");
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE daily_ai_tasks DROP CONSTRAINT IF EXISTS daily_ai_tasks_task_date_unique;
        ALTER TABLE daily_ai_tasks DROP CONSTRAINT IF EXISTS daily_ai_tasks_company_id_task_date_unique;
      EXCEPTION WHEN OTHERS THEN NULL; END $$
    `);
    await client.query(`
      DO $$ BEGIN
        ALTER TABLE daily_ai_tasks ADD CONSTRAINT daily_ai_tasks_company_id_task_date_unique UNIQUE (company_id, task_date);
      EXCEPTION WHEN duplicate_table THEN NULL; END $$
    `);

    await client.query("COMMIT");
    console.log("✅ Multi-tenancy migration complete.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
