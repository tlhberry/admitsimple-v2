import { db } from "@workspace/db";
import { patients, patientStays, discharges, smsMessages, inquiries, beds, users } from "@workspace/db/schema";
import { inArray } from "drizzle-orm";

function daysAgo(d: number): Date { const dt = new Date(); dt.setDate(dt.getDate() - d); return dt; }
function rnd(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN<T>(arr: T[], n: number): T[] { return [...arr].sort(() => Math.random() - 0.5).slice(0, n); }

const levelOfCareOptions = ["Residential (RTC)","PHP (Partial Hospitalization)","IOP (Intensive Outpatient)","Medically Managed Detox","Medical Detox + Residential","Dual Diagnosis Residential"];
const referralSourceNames = ["Banner Desert Medical Center","Phoenix VA Medical Center","Desert Hope Detox","Dr. Patricia Reyes, LCSW","Google / Website","Alumni Referral","Family Referral"];
const smsInbound = ["Hi I'm looking for help with my drinking, a friend told me to reach out","My son needs treatment for heroin, do you take Aetna?","Can someone call me back? I need help","Do you have beds available? My insurance is BCBS PPO","Is detox included in the program?","How long is the program?","Can family come visit?","I relapsed again and I need help right away","Do you accept Medicaid/AHCCCS?"];
const smsOutbound = ["Hi! This is Jake from Sunrise Recovery. Thanks for reaching out — I'd love to chat. Are you available for a quick call today?","Great to hear from you. We do accept BCBS PPO. Let me check your benefits right now.","Absolutely, we have beds available and can move quickly.","Our detox program is 5-7 days medically supervised, then residential if appropriate.","Visiting hours are Saturday and Sunday 1-4pm. Let me send you our address.","You've taken a brave step reaching out. Let's get you the help you need today.","Yes, we work with AHCCCS — let me verify your coverage right now."];

export async function main() {
  const allInquiryRows = await db.select().from(inquiries).where(inArray(inquiries.status, ["Admitted","Discharged"]));
  const existingPts = await db.select({ inquiryId: patients.inquiryId }).from(patients);
  const existingIds = new Set(existingPts.map(p => p.inquiryId).filter(Boolean));
  const needed = allInquiryRows.filter(r => !existingIds.has(r.id));

  const allUsers = await db.select().from(users);
  const admissionsUsers = allUsers.filter(u => u.isActive);
  const allBeds = await db.select().from(beds);
  const occupiedBeds = allBeds.filter(b => b.status === "occupied");

  console.log(`Creating patients for ${needed.length} inquiries...`);
  let bedIdx = 0;
  let patientCount = 0;
  const dischargedIds = new Set(allInquiryRows.filter(r => r.status === "Discharged").map(r => r.id));

  for (const inq of needed) {
    const isDischarge = dischargedIds.has(inq.id);
    const admitDaysAgo = rnd(5, 150);
    const admitDate = daysAgo(admitDaysAgo);
    const dischargeDate = isDischarge ? daysAgo(rnd(0, admitDaysAgo - 5)) : undefined;

    const [p] = await db.insert(patients).values({
      inquiryId: inq.id,
      firstName: inq.firstName,
      lastName: inq.lastName,
      phone: inq.phone ?? undefined,
      email: inq.email ?? undefined,
      dob: inq.dob ?? undefined,
      insuranceProvider: inq.insuranceProvider ?? undefined,
      insuranceMemberId: inq.insuranceMemberId ?? undefined,
      levelOfCare: inq.levelOfCare ?? pick(levelOfCareOptions),
      admitDate,
      dischargeDate: dischargeDate ?? undefined,
      currentStage: isDischarge ? "Discharged" : "Admitted",
      assignedAdmissions: pick(admissionsUsers).id,
      status: isDischarge ? "discharged" : "active",
      isAlumni: isDischarge && Math.random() > 0.5,
      notes: `Admitted ${admitDate.toLocaleDateString()}. ${pick(levelOfCareOptions)} level of care.`,
    } as any).returning();
    patientCount++;

    if (!isDischarge && occupiedBeds[bedIdx]) {
      await db.insert(patientStays).values({ inquiryId: inq.id, patientName: `${inq.firstName} ${inq.lastName}`, bedId: occupiedBeds[bedIdx].id, admitDate, status: "active" } as any);
      bedIdx++;
    }

    if (isDischarge && p) {
      await db.insert(discharges).values({
        patientId: p.id,
        dischargeType: pick(["Completed Program","AMA (Against Medical Advice)","Clinical Step-Down","Successful Completion"]),
        levelOfCare: pick(["PHP (Partial Hospitalization)","IOP (Intensive Outpatient)","Outpatient"]),
        destinationType: pick(["Sober living home","PHP program","Home","IOP program"]),
        referralSourceName: pick(referralSourceNames),
        clinicalTransfer: Math.random() > 0.8,
        notes: `Patient completed ${pick(["30","45","60","90"])} day program. ${pick(["Discharged to sober living","Stepping down to PHP","Returning home with outpatient follow-up"])}.`,
        followUp: Math.random() > 0.4,
        createdBy: pick(admissionsUsers).id,
      } as any);
    }
  }
  console.log(`✅ Created ${patientCount} patients`);

  // SMS for inquiries that have a phone and no SMS yet
  const allInqs = await db.select().from(inquiries);
  const smsInqs = pickN(allInqs.filter(r => r.phone), 60);
  const smsData = [];
  for (const inq of smsInqs) {
    const n = rnd(2, 8);
    let d = rnd(1, 90);
    for (let m = 0; m < n; m++) {
      const isInbound = m % 2 === 0;
      smsData.push({ phone: inq.phone!, direction: isInbound ? "inbound" : "outbound", body: isInbound ? pick(smsInbound) : pick(smsOutbound), status: "delivered", inquiryId: inq.id, userId: isInbound ? undefined : pick(admissionsUsers).id, readAt: daysAgo(Math.max(0, d - 1)), createdAt: daysAgo(d) });
      d = Math.max(0, d - rnd(0, 3));
    }
  }
  for (let i = 0; i < smsData.length; i += 100) await db.insert(smsMessages).values(smsData.slice(i, i+100) as any);
  console.log(`✅ Created ${smsData.length} SMS messages`);

}

if (process.argv[1]?.endsWith("demoSeedPatients.ts") || process.argv[1]?.endsWith("demoSeedPatients.js")) {
  main().catch(e => { console.error(e); process.exit(1); });
}
