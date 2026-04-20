/**
 * Continuation seed — runs only the remaining steps after the first
 * batch (inquiries + activities) was already inserted.
 */
import { db } from "@workspace/db";
import {
  inquiries, patients, patientStays, discharges,
  smsMessages, aiStageSuggestions, beds, users,
} from "@workspace/db/schema";
import { eq, inArray, count as drizzleCount } from "drizzle-orm";

function daysAgo(d: number): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt;
}
function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}

const levelOfCareOptions = [
  "Residential (RTC)", "PHP (Partial Hospitalization)", "IOP (Intensive Outpatient)",
  "Medically Managed Detox", "Medical Detox + Residential", "Dual Diagnosis Residential"
];
const referralSourceNames = [
  "Banner Desert Medical Center", "Phoenix VA Medical Center", "Desert Hope Detox",
  "Verde Valley Detox", "Southwest MAT Clinic", "Mesa General Hospital ER",
  "Dr. Patricia Reyes, LCSW", "Google / Website", "Alumni Referral", "Family Referral",
];
const smsInbound = [
  "Hi I'm looking for help with my drinking, a friend told me to reach out",
  "My son needs treatment for heroin, do you take Aetna?",
  "Can someone call me back? I need help",
  "Do you have beds available? My insurance is BCBS PPO",
  "Is detox included in the program?",
  "How long is the program?",
  "Can family come visit?",
  "What's the address? I want to bring my daughter today",
  "I relapsed again and I need help right away",
  "Do you accept Medicaid/AHCCCS?",
];
const smsOutbound = [
  "Hi! This is Jake from Sunrise Recovery. Thanks for reaching out — I'd love to chat. Are you available for a quick call today?",
  "Great to hear from you. We do accept BCBS PPO. Let me check your benefits right now — can you send me your member ID?",
  "Absolutely, I'll call you shortly. We have beds available and can move quickly.",
  "Our detox program is 5-7 days medically supervised, then residential if clinically appropriate.",
  "Visiting hours are Saturday and Sunday 1-4pm. Let me send you our address.",
  "I completely understand. You've taken a brave step reaching out. Let's get you the help you need today.",
  "Yes, we work with AHCCCS — let me verify your coverage right now.",
  "The program is 30-90 days depending on your clinical needs and insurance authorization.",
];
const stagePairs: [string, string][] = [
  ["New Inquiry", "Initial Contact"],
  ["Initial Contact", "Insurance Verification"],
  ["Insurance Verification", "Pre-Assessment"],
  ["Pre-Assessment", "Scheduled to Admit"],
];

async function main() {
  console.log("▶ Continuing demo seed from patients step...\n");

  // Fetch all existing inquiries
  const allInquiryRows = await db.select().from(inquiries);
  const inquiryMap = new Map(allInquiryRows.map(r => [r.id, r]));
  console.log(`Found ${allInquiryRows.length} existing inquiries`);

  // Fetch staff users (skip admin)
  const staffUsers = await db.select().from(users);
  const admissionsUsers = staffUsers.filter(u => u.username !== "admin");
  if (admissionsUsers.length === 0) {
    console.log("No staff users found — using admin user");
    admissionsUsers.push(...staffUsers);
  }

  // Fetch beds
  const allBeds = await db.select().from(beds);
  const occupiedBeds = allBeds.filter(b => b.status === "occupied");

  // Identify admitted/discharged inquiries
  const admittedRows = allInquiryRows.filter(r => r.status === "Admitted");
  const dischargedRows = allInquiryRows.filter(r => r.status === "Discharged");
  console.log(`  Admitted: ${admittedRows.length}, Discharged: ${dischargedRows.length}`);

  // Check if patients already exist to avoid duplicates
  const [{ count: existingPatientCount }] = await db.select({ count: drizzleCount() }).from(patients);
  if (Number(existingPatientCount) > 0) {
    console.log(`  ⚠️  ${existingPatientCount} patient records already exist — skipping patient creation`);
  } else {
    // ── Patients ────────────────────────────────────────────────────────────
    console.log("Creating patients...");
    let patientCount = 0;
    let bedIdx = 0;

    for (const inq of [...admittedRows, ...dischargedRows]) {
      const isDischarge = inq.status === "Discharged";
      const admitDaysAgo = randomBetween(5, 150);
      const admitDate = daysAgo(admitDaysAgo);
      const dischargeDate = isDischarge ? daysAgo(randomBetween(0, admitDaysAgo - 5)) : undefined;

      const [p] = await db.insert(patients).values({
        inquiryId: inq.id,
        firstName: inq.firstName,
        lastName: inq.lastName,
        phone: inq.phone ?? undefined,
        email: inq.email ?? undefined,
        dob: inq.dob ?? undefined,
        insuranceProvider: inq.insuranceProvider ?? undefined,
        insuranceMemberId: inq.insuranceMemberId ?? undefined,
        levelOfCare: inq.levelOfCare ?? undefined,
        admitDate,
        dischargeDate: dischargeDate ?? undefined,
        currentStage: isDischarge ? "Discharged" : "Admitted",
        assignedAdmissions: pick(admissionsUsers).id,
        status: isDischarge ? "discharged" : "active",
        isAlumni: isDischarge && Math.random() > 0.5,
        notes: `Admitted ${admitDate.toLocaleDateString()}. ${pick(levelOfCareOptions)} level of care.`,
      } as any).returning();

      patientCount++;

      // Bed assignment for currently admitted
      if (!isDischarge && occupiedBeds[bedIdx]) {
        await db.insert(patientStays).values({
          inquiryId: inq.id,
          patientName: `${inq.firstName} ${inq.lastName}`,
          bedId: occupiedBeds[bedIdx].id,
          admitDate,
          status: "active",
        } as any);
        bedIdx++;
      }

      // Discharge record
      if (isDischarge && p) {
        await db.insert(discharges).values({
          patientId: p.id,
          dischargeType: pick(["Completed Program","AMA (Against Medical Advice)","Clinical Step-Down","Successful Completion"]),
          levelOfCare: pick(["PHP (Partial Hospitalization)","IOP (Intensive Outpatient)","Outpatient","Home with support services"]),
          destinationType: pick(["Sober living home","PHP program","Home","IOP program"]),
          referralSourceName: pick(referralSourceNames),
          clinicalTransfer: Math.random() > 0.8,
          notes: `Patient completed ${pick(["30","45","60","90"])} day program. ${pick(["Discharged to sober living","Stepping down to PHP","Returning home","Transferring to IOP"])}.`,
          followUp: Math.random() > 0.4,
          createdBy: pick(admissionsUsers).id,
        } as any);
      }
    }
    console.log(`  Created ${patientCount} patients`);
  }

  // ── SMS messages ─────────────────────────────────────────────────────────
  const [{ count: existingSmsCount }] = await db.select({ count: drizzleCount() }).from(smsMessages);
  if (Number(existingSmsCount) > 0) {
    console.log(`  ⚠️  ${existingSmsCount} SMS messages already exist — skipping`);
  } else {
    console.log("Creating SMS conversations...");
    const smsInquiries = pickN(allInquiryRows.filter(r => r.phone), 60);
    const smsData = [];
    for (const inq of smsInquiries) {
      const numMessages = randomBetween(2, 8);
      let daysBackSms = randomBetween(1, 90);
      for (let m = 0; m < numMessages; m++) {
        const isInbound = m % 2 === 0;
        smsData.push({
          phone: inq.phone!,
          direction: isInbound ? "inbound" : "outbound",
          body: isInbound ? pick(smsInbound) : pick(smsOutbound),
          status: "delivered",
          inquiryId: inq.id,
          userId: isInbound ? undefined : pick(admissionsUsers).id,
          readAt: daysAgo(Math.max(0, daysBackSms - 1)),
          createdAt: daysAgo(daysBackSms),
        });
        daysBackSms = Math.max(0, daysBackSms - randomBetween(0, 3));
      }
    }
    for (let i = 0; i < smsData.length; i += 100) {
      await db.insert(smsMessages).values(smsData.slice(i, i + 100) as any);
    }
    console.log(`  Created ${smsData.length} SMS messages`);
  }

  // ── AI stage suggestions ──────────────────────────────────────────────────
  const [{ count: existingSuggestions }] = await db.select({ count: drizzleCount() }).from(aiStageSuggestions);
  if (Number(existingSuggestions) > 0) {
    console.log(`  ⚠️  ${existingSuggestions} AI suggestions already exist — skipping`);
  } else {
    console.log("Creating AI stage suggestions...");
    const suggestionInquiries = pickN(allInquiryRows, 35);
    const suggestionData = suggestionInquiries.map(inq => {
      const [current, suggested] = pick(stagePairs);
      return {
        inquiryId: inq.id,
        currentStage: current,
        suggestedStage: suggested,
        reasoning: pick([
          "Patient has confirmed insurance coverage and completed initial screening. Ready to advance.",
          "Multiple successful contact attempts logged. Pre-assessment call scheduled.",
          "VOB completed with active authorization received from payer. Clinical team ready.",
          "Clinical pre-assessment notes indicate medical necessity met. Admission date discussable.",
          "Patient expressed strong commitment to treatment during last call. Insurance active.",
        ]),
        confidence: pick(["high","high","medium"]),
        status: pick(["pending","pending","accepted","dismissed"]),
        createdAt: daysAgo(randomBetween(0, 14)),
      };
    });
    await db.insert(aiStageSuggestions).values(suggestionData as any);
    console.log(`  Created ${suggestionData.length} AI stage suggestions`);
  }

  console.log("\n✅ Continuation seed complete!");
  process.exit(0);
}

main().catch(err => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
