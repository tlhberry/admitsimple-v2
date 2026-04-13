import { db } from "@workspace/db";
import { users, pipelineStages, settings } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./lib/logger";

export async function seedDatabase(): Promise<void> {
  logger.info("Checking if seed is needed...");

  const [userCount] = await db.select({ count: count() }).from(users);

  // Always force-reset admin password on every startup to ensure access
  if (Number(userCount.count) > 0) {
    const hash = await bcrypt.hash("admin", 12);
    await db.update(users).set({ password: hash }).where(eq(users.username, "admin"));
    logger.info("Admin password reset to default on startup");
    logger.info("Database already seeded, skipping.");
    return;
  }

  logger.info("Seeding database...");

  const adminHash = await bcrypt.hash("admin", 12);

  await db.insert(users).values([
    {
      username: "admin",
      password: adminHash,
      name: "Administrator",
      email: "admin@admitsimple.com",
      role: "admin",
      isActive: true,
    },
  ]);

  await db.insert(pipelineStages).values([
    { name: "New Inquiry", order: 1, color: "#3B82F6", description: "Initial contact received" },
    { name: "Initial Contact", order: 2, color: "#F97316", description: "First contact made" },
    { name: "Insurance Verification", order: 3, color: "#8B5CF6", description: "Verifying insurance coverage" },
    { name: "Pre-Assessment", order: 4, color: "#10B981", description: "Clinical evaluation in progress" },
    { name: "Scheduled to Admit", order: 5, color: "#EF4444", description: "Final admissions decision" },
    { name: "Admitted", order: 6, color: "#22C55E", description: "Patient confirmed for admission" },
    { name: "Discharged", order: 7, color: "#6B7280", description: "Patient has been discharged" },
    { name: "Did Not Admit", order: 8, color: "#EF4444", description: "Patient did not admit" },
  ]);

  await db.insert(settings).values([
    { key: "facility_name", value: "", category: "facility" },
    { key: "facility_phone", value: "", category: "facility" },
    { key: "facility_fax", value: "", category: "facility" },
    { key: "facility_email", value: "", category: "facility" },
    { key: "facility_address", value: "", category: "facility" },
    { key: "facility_bed_capacity", value: "", category: "facility" },
    { key: "facility_license", value: "", category: "facility" },
    { key: "facility_npi", value: "", category: "facility" },
    { key: "facility_timezone", value: "America/New_York", category: "facility" },
    { key: "ai_model", value: "claude-opus-4-5", category: "ai" },
    { key: "ai_auto_summarize", value: "true", category: "ai" },
    { key: "ai_pipeline_suggestions", value: "true", category: "ai" },
    { key: "notify_new_inquiry", value: "true", category: "notifications" },
    { key: "notify_status_change", value: "true", category: "notifications" },
    { key: "notify_daily_digest", value: "false", category: "notifications" },
    { key: "notify_assignment", value: "true", category: "notifications" },
  ]);

  logger.info("Database seeded successfully!");
}

export async function migratePipelineStages(): Promise<void> {
  logger.info("Running pipeline stage migration...");
  try {
    // Rename old stage names → new names (idempotent: only updates if the old name exists)
    await db.update(pipelineStages)
      .set({ name: "Pre-Assessment", order: 4, color: "#F97316" })
      .where(eq(pipelineStages.name, "Clinical Assessment"));

    await db.update(pipelineStages)
      .set({ name: "Scheduled to Admit", order: 5, color: "#10B981" })
      .where(eq(pipelineStages.name, "Admissions Decision"));

    // Ensure correct order for all base stages
    const baseOrders: Record<string, number> = {
      "New Inquiry": 1,
      "Initial Contact": 2,
      "Insurance Verification": 3,
      "Pre-Assessment": 4,
      "Scheduled to Admit": 5,
    };
    for (const [name, order] of Object.entries(baseOrders)) {
      await db.update(pipelineStages).set({ order }).where(eq(pipelineStages.name, name));
    }

    // Add missing terminal/post-admit stages if they don't exist
    const existingRows = await db.select({ name: pipelineStages.name }).from(pipelineStages);
    const existingNames = new Set(existingRows.map((r) => r.name));

    const missing = [
      { name: "Admitted", order: 6, color: "#22C55E", description: "Patient confirmed for admission" },
      { name: "Discharged", order: 7, color: "#6B7280", description: "Patient has been discharged" },
      { name: "Did Not Admit", order: 8, color: "#EF4444", description: "Patient did not admit" },
    ].filter((s) => !existingNames.has(s.name));

    if (missing.length > 0) {
      await db.insert(pipelineStages).values(missing);
      logger.info(`Added ${missing.length} missing pipeline stage(s): ${missing.map((s) => s.name).join(", ")}`);
    }

    logger.info("Pipeline stage migration complete.");
  } catch (err) {
    logger.error(err, "Pipeline stage migration failed (non-fatal)");
  }
}
