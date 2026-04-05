import { db } from "@workspace/db";
import { users, pipelineStages, settings, referralSources, inquiries, patients } from "@workspace/db/schema";
import { eq, count } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { logger } from "./lib/logger";

export async function seedDatabase(): Promise<void> {
  logger.info("Checking if seed is needed...");

  const [userCount] = await db.select({ count: count() }).from(users);

  // Always sync admin password from env var if provided (allows password reset via redeploy)
  const envAdminPassword = process.env.ADMIN_PASSWORD;
  if (envAdminPassword && Number(userCount.count) > 0) {
    const hash = await bcrypt.hash(envAdminPassword, 12);
    await db.update(users).set({ password: hash }).where(eq(users.username, "admin"));
    logger.info("Admin password synced from ADMIN_PASSWORD env var.");
  }

  if (Number(userCount.count) > 0) {
    logger.info("Database already seeded, skipping.");
    return;
  }

  logger.info("Seeding database...");

  const adminHash = await bcrypt.hash("admin123", 12);
  const staffHash = await bcrypt.hash("staff123", 12);
  const clinicHash = await bcrypt.hash("clinical123", 12);

  const [admin] = await db.insert(users).values([
    { username: "admin", password: adminHash, name: "Administrator", email: "admin@admitsimple.com", role: "admin" },
    { username: "jsmith", password: staffHash, name: "Jennifer Smith", email: "jsmith@admitsimple.com", role: "staff" },
    { username: "mwilson", password: staffHash, name: "Marcus Wilson", email: "mwilson@admitsimple.com", role: "staff" },
    { username: "drjones", password: clinicHash, name: "Dr. Rebecca Jones", email: "drjones@admitsimple.com", role: "clinical" },
  ]).returning();

  await db.insert(pipelineStages).values([
    { name: "New Inquiry", order: 1, color: "#3B82F6", description: "Initial contact received" },
    { name: "Initial Contact", order: 2, color: "#F97316", description: "First contact made" },
    { name: "Insurance Verification", order: 3, color: "#8B5CF6", description: "Verifying insurance coverage" },
    { name: "Clinical Assessment", order: 4, color: "#10B981", description: "Clinical evaluation in progress" },
    { name: "Admissions Decision", order: 5, color: "#EF4444", description: "Final admissions decision" },
  ]);

  await db.insert(settings).values([
    { key: "facility_name", value: "Sunrise Recovery Center", category: "facility" },
    { key: "facility_phone", value: "(555) 123-4567", category: "facility" },
    { key: "facility_fax", value: "(555) 123-4568", category: "facility" },
    { key: "facility_email", value: "admissions@sunriserecovery.com", category: "facility" },
    { key: "facility_address", value: "1234 Hope Lane, Phoenix, AZ 85001", category: "facility" },
    { key: "facility_bed_capacity", value: "48", category: "facility" },
    { key: "facility_license", value: "AZ-BHS-2024-0123", category: "facility" },
    { key: "facility_npi", value: "1234567890", category: "facility" },
    { key: "facility_timezone", value: "America/Phoenix", category: "facility" },
    { key: "ai_model", value: "claude-opus-4-5", category: "ai" },
    { key: "ai_auto_summarize", value: "true", category: "ai" },
    { key: "ai_pipeline_suggestions", value: "true", category: "ai" },
    { key: "notify_new_inquiry", value: "true", category: "notifications" },
    { key: "notify_status_change", value: "true", category: "notifications" },
    { key: "notify_daily_digest", value: "false", category: "notifications" },
    { key: "notify_assignment", value: "true", category: "notifications" },
  ]);

  const [ref1, ref2, ref3, ref4] = await db.insert(referralSources).values([
    { name: "Phoenix General Hospital", type: "hospital", contact: "Dr. Michael Chen", phone: "(555) 200-1000", email: "referrals@phxgeneral.com", isActive: true },
    { name: "Valley Detox Center", type: "detox", contact: "Sarah Martinez", phone: "(555) 300-2000", email: "info@valleydetox.com", isActive: true },
    { name: "Desert Counseling Associates", type: "therapist", contact: "Lisa Brown", phone: "(555) 400-3000", email: "lbrown@desertcounseling.com", isActive: true },
    { name: "BlueCross Insurance Network", type: "insurance", contact: "Claims Dept", phone: "(800) 555-1234", email: "referrals@bcbs.com", isActive: true },
  ]).returning();

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000);

  const [allUsers] = await db.select().from(users);
  const allUsersRows = await db.select().from(users);

  const [inq1, inq2, inq3, inq4, inq5, inq6, inq7] = await db.insert(inquiries).values([
    {
      firstName: "John", lastName: "Martinez",
      phone: "(602) 555-1001", email: "jmartinez@email.com",
      dob: "05/12/1985",
      insuranceProvider: "BlueCross BlueShield", insuranceMemberId: "BCB123456789",
      primaryDiagnosis: "Alcohol Use Disorder, Severe",
      substanceHistory: "Daily alcohol use for 8 years, approximately 12-15 drinks per day",
      medicalHistory: "Hypertension, mild liver disease",
      mentalHealthHistory: "Depression, anxiety",
      levelOfCare: "Detox",
      referralSource: "Phoenix General Hospital",
      assignedTo: allUsersRows[1]?.id,
      status: "new", priority: "high",
      notes: "Urgent detox needed. Wife called in, patient cooperative.",
      createdAt: daysAgo(1),
    },
    {
      firstName: "Sarah", lastName: "Thompson",
      phone: "(602) 555-1002", email: "sthompson@email.com",
      dob: "09/23/1990",
      insuranceProvider: "Aetna", insuranceMemberId: "AET987654321",
      primaryDiagnosis: "Opioid Use Disorder",
      substanceHistory: "Heroin use for 3 years, escalating. Previous overdose 6 months ago.",
      levelOfCare: "RTC",
      referralSource: "Valley Detox Center",
      assignedTo: allUsersRows[2]?.id,
      status: "contacted", priority: "high",
      notes: "Completed detox at Valley. Ready for RTC placement.",
      createdAt: daysAgo(3),
    },
    {
      firstName: "Michael", lastName: "Davis",
      phone: "(602) 555-1003", email: "mdavis@email.com",
      dob: "03/07/1978",
      insuranceProvider: "Cigna", insuranceMemberId: "CIG456789012",
      primaryDiagnosis: "Methamphetamine Use Disorder",
      substanceHistory: "Meth use for 5 years, daily. Lost job, family affected.",
      levelOfCare: "PHP",
      referralSource: "Desert Counseling Associates",
      assignedTo: allUsersRows[1]?.id,
      status: "qualified", priority: "medium",
      createdAt: daysAgo(5),
    },
    {
      firstName: "Emily", lastName: "Rodriguez",
      phone: "(602) 555-1004", email: "erodriguez@email.com",
      dob: "11/30/1995",
      insuranceProvider: "United Healthcare", insuranceMemberId: "UHC345678901",
      primaryDiagnosis: "Alcohol and Benzodiazepine Use Disorder",
      substanceHistory: "Alcohol daily, Xanax use for 2 years. Prescribed initially.",
      levelOfCare: "Detox",
      referralSource: "BlueCross Insurance Network",
      assignedTo: allUsersRows[2]?.id,
      status: "admitted", priority: "high",
      createdAt: daysAgo(7),
    },
    {
      firstName: "Robert", lastName: "Johnson",
      phone: "(602) 555-1005",
      dob: "06/15/1968",
      insuranceProvider: "Medicare", insuranceMemberId: "MED567890123",
      primaryDiagnosis: "Alcohol Use Disorder, Moderate",
      substanceHistory: "Escalating alcohol use after retirement. 6-8 drinks daily.",
      levelOfCare: "IOP",
      referralSource: "Phoenix General Hospital",
      assignedTo: allUsersRows[1]?.id,
      status: "contacted", priority: "medium",
      createdAt: daysAgo(10),
    },
    {
      firstName: "Ashley", lastName: "Wilson",
      phone: "(602) 555-1006", email: "awilson@email.com",
      dob: "02/19/2000",
      levelOfCare: "RTC",
      referralSource: "Desert Counseling Associates",
      status: "new", priority: "medium",
      notes: "Young adult, first treatment attempt.",
      createdAt: daysAgo(0),
    },
    {
      firstName: "David", lastName: "Lee",
      phone: "(602) 555-1007", email: "dlee@email.com",
      dob: "08/04/1982",
      insuranceProvider: "Humana", insuranceMemberId: "HUM234567890",
      primaryDiagnosis: "Cocaine Use Disorder",
      substanceHistory: "Cocaine binge use on weekends, functional at work currently.",
      levelOfCare: "OP",
      status: "declined", priority: "low",
      notes: "Patient declined treatment, may reconsider.",
      createdAt: daysAgo(14),
    },
  ]).returning();

  await db.insert(patients).values([
    {
      inquiryId: inq4.id,
      firstName: "Emily", lastName: "Rodriguez",
      phone: "(602) 555-1004", email: "erodriguez@email.com",
      dob: "11/30/1995",
      insuranceProvider: "United Healthcare", insuranceMemberId: "UHC345678901",
      levelOfCare: "Detox",
      admitDate: daysAgo(7),
      assignedClinician: allUsersRows[3]?.id,
      assignedAdmissions: allUsersRows[2]?.id,
      status: "active",
      currentStage: "Detox",
      notes: "Progressing well. Day 7 of detox.",
    },
    {
      firstName: "James", lastName: "Parker",
      phone: "(602) 555-2001",
      levelOfCare: "RTC",
      admitDate: daysAgo(14),
      assignedClinician: allUsersRows[3]?.id,
      status: "active",
      currentStage: "Primary Treatment",
    },
    {
      firstName: "Maria", lastName: "Gonzalez",
      phone: "(602) 555-2002",
      levelOfCare: "PHP",
      admitDate: daysAgo(21),
      assignedClinician: allUsersRows[3]?.id,
      status: "active",
      currentStage: "Step-down",
    },
  ]);

  logger.info("Database seeded successfully!");
}
