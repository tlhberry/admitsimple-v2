/**
 * AdmitSimple Demo Seed
 * Populates the database with 6 months of realistic data for a 34-bed
 * treatment center called "Sunrise Recovery Center" in Phoenix, AZ.
 *
 * Run: pnpm --filter @workspace/api-server exec tsx src/demoSeed.ts
 */

import { db } from "@workspace/db";
import {
  users, inquiries, patients, activities,
  referralSources, referralAccounts, referralContacts,
  bdActivityLogs, beds, insuranceVerifications,
  smsMessages, settings, patientStays, discharges,
  aiStageSuggestions,
} from "@workspace/db/schema";
import bcrypt from "bcryptjs";
import { eq, count } from "drizzle-orm";

// ── Helpers ──────────────────────────────────────────────────────────────────

function daysAgo(d: number): Date {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return dt;
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ── Static data ───────────────────────────────────────────────────────────────

const maleFirstNames = ["Marcus","James","Tyler","Daniel","Kevin","Robert","Michael","Jason","Brian","Derek","Chris","Nathan","Ethan","Aaron","Kyle","Travis","Brandon","Justin","Ryan","Sean","David","Carlos","Anthony","Jose","Patrick","Andrew","Benjamin","Gregory","Timothy","Eric"];
const femaleFirstNames = ["Sarah","Megan","Ashley","Jennifer","Amanda","Jessica","Rachel","Emily","Lauren","Brittany","Kayla","Tiffany","Stephanie","Nicole","Christina","Danielle","Heather","Melissa","Amber","Crystal","Monica","Vanessa","Tanya","Maria","Lisa","Amy","Kelly","Shannon","Brenda","Sandra"];
const lastNames = ["Thompson","Martinez","Johnson","Williams","Davis","Brown","Jones","Miller","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin","Garcia","Rodriguez","Lewis","Lee","Walker","Hall","Allen","Young","Hernandez","King","Wright","Lopez","Hill","Scott","Green","Adams","Baker","Gonzalez","Nelson","Carter","Mitchell","Perez","Roberts","Turner","Phillips","Campbell","Parker","Evans","Edwards","Collins","Stewart","Sanchez","Morris"];

const phoneNumbers = () => `(${randomBetween(480,928)}) ${randomBetween(200,999)}-${String(randomBetween(1000,9999))}`;

const insuranceProviders = [
  { name: "Blue Cross Blue Shield", type: "PPO" },
  { name: "Aetna", type: "PPO" },
  { name: "UnitedHealthcare", type: "PPO" },
  { name: "Cigna", type: "PPO" },
  { name: "Humana", type: "HMO" },
  { name: "Magellan Health", type: "Behavioral Health" },
  { name: "Beacon Health Options", type: "Behavioral Health" },
  { name: "Tricare", type: "Military" },
  { name: "Medicare", type: "Government" },
  { name: "AHCCCS (Arizona Medicaid)", type: "Government" },
  { name: "Ambetter", type: "Marketplace" },
  { name: "Molina Healthcare", type: "Medicaid" },
  { name: "Self-Pay", type: "Self-Pay" },
];

const diagnoses = [
  "Alcohol Use Disorder, Severe (F10.20)",
  "Opioid Use Disorder, Severe (F11.20)",
  "Methamphetamine Use Disorder, Severe (F15.20)",
  "Cocaine Use Disorder, Moderate (F14.10)",
  "Cannabis Use Disorder, Moderate (F12.20)",
  "Polysubstance Use Disorder (F19.20)",
  "Alcohol Use Disorder with Anxiety (F10.20, F41.1)",
  "Opioid Use Disorder with Depression (F11.20, F32.9)",
  "Benzodiazepine Use Disorder, Severe (F13.20)",
  "Stimulant Use Disorder, Severe (F15.20)",
];

const levelOfCareOptions = [
  "Residential (RTC)", "PHP (Partial Hospitalization)", "IOP (Intensive Outpatient)",
  "Medically Managed Detox", "Medical Detox + Residential", "Dual Diagnosis Residential"
];

const substanceHistories = [
  "Daily alcohol use for 8+ years, multiple prior treatment episodes",
  "Heroin and fentanyl IV use, last use 2 days ago, on Suboxone previously",
  "Methamphetamine use 3-4x daily, no prior treatment",
  "Cocaine and alcohol polysubstance, first treatment episode",
  "Prescription opioid dependency, escalated to heroin use",
  "Daily cannabis use, secondary alcohol issues",
  "Benzodiazepine dependency from prescribed medication",
  "IV fentanyl, Narcan administered twice in past month",
  "Alcohol and methamphetamine, prior detox at Banner Desert",
  "Crack cocaine, alcohol, minimal treatment history",
];

const referralSourceNames = [
  "Banner Desert Medical Center", "Phoenix VA Medical Center", "Desert Hope Detox",
  "Verde Valley Detox", "Southwest MAT Clinic", "Mesa General Hospital ER",
  "Dr. Patricia Reyes, LCSW", "Dr. Marcus Webb, MD (Psychiatry)", "Hope Springs Outpatient",
  "Scottsdale Behavioral Health", "Maricopa County Superior Court", "Google / Website",
  "Family Referral", "Alumni Referral", "Inbound Call (Direct)", "Psychology Today",
  "Recovery Coaches of Arizona", "Employee Assistance Program", "Arizona AHCCCS",
];

const nonAdmitReasons = [
  "Insurance denied authorization", "Patient chose different facility",
  "Financial — unable to pay copay", "No beds available at time of admission",
  "Patient went to ER instead", "Lost contact with patient/family",
  "Clinically inappropriate level of care", "Patient chose outpatient instead",
  "Geographic barriers", "Waitlisted — transferred to other center",
];

const activityNotes = [
  "Spoke with patient's mother, patient is willing to go to treatment. Insurance verified active.",
  "Left voicemail, will follow up tomorrow morning.",
  "Completed pre-screening over the phone. Patient meets medical necessity criteria.",
  "Insurance VOB completed — BCBS PPO. Deductible $1,500, partially met. Auth submitted.",
  "Authorization received. Scheduled admission for next Monday.",
  "Follow-up call with patient. Confirmed bed assignment and arrival time.",
  "Emailed pre-admission paperwork. Patient confirmed receipt.",
  "Patient called back, has questions about detox process. Answered and re-confirmed commitment.",
  "Spoke with ER social worker at Banner Desert, patient ready for transfer.",
  "Family conference call completed. Family supportive of treatment.",
  "Received referral fax from Dr. Reyes' office. Reviewing documentation.",
  "VOB in process — called BCBS behavioral health line, hold 45 min, case number obtained.",
  "Clinical team reviewed referral. Appropriate for detox + residential level of care.",
  "Text sent to patient: 'Hi, this is Jake from Sunrise Recovery — wanted to follow up on your inquiry.'",
  "Patient arrived for assessment, waiting on nursing to complete intake vitals.",
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

// ── Main ──────────────────────────────────────────────────────────────────────

export async function main() {
  console.log("🌱 Starting demo seed...\n");

  // Skip if demo data already exists
  const [existingUsers] = await db.select({ count: count() }).from(users).where(eq(users.username, "sarah.mitchell"));
  if (Number(existingUsers.count) > 0) {
    console.log("✅ Demo data already exists — skipping demoSeed.");
    return;
  }

  // ── 1. Facility settings ──────────────────────────────────────────────────
  console.log("Setting facility info...");
  const facilitySettings: [string, string][] = [
    ["facility_name", "Sunrise Recovery Center"],
    ["facility_phone", "(602) 555-0180"],
    ["facility_fax", "(602) 555-0181"],
    ["facility_email", "admissions@sunriserecovery.com"],
    ["facility_address", "4850 E Camelback Rd, Phoenix, AZ 85018"],
    ["facility_bed_capacity", "34"],
    ["facility_license", "AZ-BHS-2019-0847"],
    ["facility_npi", "1234567890"],
    ["facility_timezone", "America/Phoenix"],
  ];
  for (const [key, value] of facilitySettings) {
    await db.update(settings).set({ value }).where(eq(settings.key, key));
  }

  // ── 2. Staff users ────────────────────────────────────────────────────────
  console.log("Creating staff users...");
  const defaultPw = await bcrypt.hash("demo1234", 12);
  const staffData = [
    { username: "sarah.mitchell", name: "Sarah Mitchell", email: "sarah@sunriserecovery.com", role: "admin", initials: "SM" },
    { username: "jake.torres", name: "Jake Torres", email: "jake@sunriserecovery.com", role: "admissions", initials: "JT" },
    { username: "megan.park", name: "Megan Park", email: "megan@sunriserecovery.com", role: "admissions", initials: "MP" },
    { username: "tom.hawkins", name: "Tom Hawkins", email: "tom@sunriserecovery.com", role: "admissions", initials: "TH" },
    { username: "lisa.chen", name: "Lisa Chen", email: "lisa@sunriserecovery.com", role: "admissions", initials: "LC" },
  ];
  const insertedStaff = await db.insert(users).values(
    staffData.map(s => ({ ...s, password: defaultPw, isActive: true }))
  ).returning();
  const allUsers = [{ id: 1, name: "Administrator" }, ...insertedStaff];
  const admissionsUsers = insertedStaff.filter(u => ["jake.torres","megan.park","tom.hawkins","lisa.chen"].includes(u.username));

  // ── 3. Referral sources ───────────────────────────────────────────────────
  console.log("Creating referral sources...");
  const refSourceData = [
    { name: "Banner Desert Medical Center", type: "Hospital", contact: "Social Work Dept", phone: "(480) 412-3456" },
    { name: "Phoenix VA Medical Center", type: "Hospital", contact: "Dr. Sharon Kellner", phone: "(602) 277-5551" },
    { name: "Desert Hope Detox", type: "Detox Facility", contact: "Admissions", phone: "(602) 555-0220" },
    { name: "Verde Valley Detox", type: "Detox Facility", contact: "Discharge Planner", phone: "(928) 555-0110" },
    { name: "Southwest MAT Clinic", type: "MAT Clinic", contact: "Dr. Ramon Okafor", phone: "(602) 555-0310" },
    { name: "Mesa General Hospital ER", type: "Hospital", contact: "ER Social Work", phone: "(480) 555-0400" },
    { name: "Dr. Patricia Reyes, LCSW", type: "Private Practice", contact: "Patricia Reyes", phone: "(602) 555-0501" },
    { name: "Dr. Marcus Webb, MD", type: "Private Practice", contact: "Marcus Webb", phone: "(480) 555-0601" },
    { name: "Hope Springs Outpatient", type: "Outpatient Facility", contact: "Case Manager", phone: "(602) 555-0710" },
    { name: "Scottsdale Behavioral Health", type: "Outpatient Facility", contact: "Referral Coordinator", phone: "(480) 555-0810" },
    { name: "Maricopa County Superior Court", type: "Court / Legal", contact: "Probation Officer Team", phone: "(602) 506-3800" },
    { name: "Google / Website Inquiry", type: "Online", contact: "", phone: "" },
    { name: "Alumni Referral", type: "Alumni", contact: "", phone: "" },
    { name: "Family Referral", type: "Family", contact: "", phone: "" },
    { name: "Recovery Coaches of Arizona", type: "Community", contact: "Coach Network", phone: "(602) 555-0920" },
    { name: "Employee Assistance Program (EAP)", type: "EAP", contact: "EAP Coordinator", phone: "(800) 555-1000" },
    { name: "Psychology Today", type: "Online", contact: "", phone: "" },
  ];
  const insertedRefSources = await db.insert(referralSources).values(
    refSourceData.map(r => ({ ...r, isActive: true, ownedByUserId: pick(admissionsUsers).id }))
  ).returning();

  // ── 4. Referral accounts (BD module) ─────────────────────────────────────
  console.log("Creating BD referral accounts...");
  const bdAccounts = [
    { name: "Banner Desert Medical Center", type: "hospital", address: "1400 S Dobson Rd, Mesa, AZ 85202", phone: "(480) 412-3456" },
    { name: "Phoenix VA Medical Center", type: "hospital", address: "650 E Indian School Rd, Phoenix, AZ 85012", phone: "(602) 277-5551" },
    { name: "Mesa General Hospital", type: "hospital", address: "515 N Mesa Dr, Mesa, AZ 85201", phone: "(480) 969-9111" },
    { name: "Chandler Regional Medical Center", type: "hospital", address: "1955 W Frye Rd, Chandler, AZ 85224", phone: "(480) 728-3000" },
    { name: "Desert Hope Detox", type: "residential_facility", address: "2465 E Thomas Rd, Phoenix, AZ 85016", phone: "(602) 555-0220" },
    { name: "Verde Valley Detox", type: "residential_facility", address: "550 W Finnie Flat Rd, Camp Verde, AZ 86322", phone: "(928) 555-0110" },
    { name: "Southwest MAT Clinic", type: "mat_clinic", address: "3802 E McDowell Rd, Phoenix, AZ 85008", phone: "(602) 555-0310" },
    { name: "AZ Recovery MAT", type: "mat_clinic", address: "1430 W Southern Ave, Mesa, AZ 85202", phone: "(480) 555-0320" },
    { name: "Hope Springs Outpatient", type: "outpatient_facility", address: "7025 E McDowell Rd #100, Scottsdale, AZ 85257", phone: "(602) 555-0710" },
    { name: "Scottsdale Behavioral Health", type: "outpatient_facility", address: "7400 E McDonald Dr, Scottsdale, AZ 85250", phone: "(480) 555-0810" },
    { name: "Dr. Patricia Reyes, LCSW", type: "private_practice", address: "2525 E Arizona Biltmore Cir #B216, Phoenix, AZ 85016", phone: "(602) 555-0501" },
    { name: "Dr. Marcus Webb, MD (Psychiatry)", type: "private_practice", address: "9375 E Shea Blvd #100, Scottsdale, AZ 85260", phone: "(480) 555-0601" },
    { name: "Maricopa County Superior Court", type: "community", address: "201 W Jefferson St, Phoenix, AZ 85003", phone: "(602) 506-3800" },
    { name: "Recovery Coaches of Arizona", type: "community", address: "Phoenix, AZ", phone: "(602) 555-0920" },
    { name: "Valleywise Health", type: "hospital", address: "2601 E Roosevelt St, Phoenix, AZ 85008", phone: "(602) 344-5011" },
    { name: "Dignity Health – St. Joseph's", type: "hospital", address: "350 W Thomas Rd, Phoenix, AZ 85013", phone: "(602) 406-3000" },
    { name: "Arizona Wellness Center", type: "outpatient_facility", address: "4550 E Bell Rd #180, Phoenix, AZ 85032", phone: "(602) 555-0820" },
    { name: "Choices Recovery Coaching", type: "community", address: "Scottsdale, AZ", phone: "(480) 555-0930" },
    { name: "High Desert Counseling", type: "private_practice", address: "2201 N Central Ave, Phoenix, AZ 85004", phone: "(602) 555-0510" },
    { name: "Arizona Attorney Network", type: "attorneys", address: "Phoenix, AZ", phone: "(602) 555-0990" },
  ];
  const bdReps = admissionsUsers.slice(0, 2); // Tom and Lisa as BD reps
  const insertedAccounts = await db.insert(referralAccounts).values(
    bdAccounts.map((a, i) => ({
      ...a,
      assignedBdRepId: pick(bdReps).id,
      createdBy: pick(allUsers).id,
    }))
  ).returning();

  // Contacts for each account
  const contactFirstNames = ["Jennifer","Michael","Sandra","Robert","Karen","David","Lisa","James","Patricia","Christopher"];
  const contactLastNames = ["Walsh","Torres","Kim","Nguyen","Okafor","Chang","Rodriguez","Bennett","Patel","Sullivan"];
  const positions = ["Social Worker","Discharge Planner","Case Manager","Nurse Practitioner","Psychiatrist","Probation Officer","EAP Coordinator","Program Director","Admissions Coordinator","Office Manager"];
  for (const acc of insertedAccounts) {
    const numContacts = randomBetween(1, 3);
    await db.insert(referralContacts).values(
      Array.from({ length: numContacts }, () => ({
        accountId: acc.id,
        name: `${pick(contactFirstNames)} ${pick(contactLastNames)}`,
        position: pick(positions),
        phone: phoneNumbers(),
        email: `contact@${acc.name.toLowerCase().replace(/[^a-z]/g, "")}.com`,
      }))
    );
  }

  // BD Activity logs — ~250 over 6 months
  console.log("Creating BD activity logs...");
  const bdActivityNotes = [
    "Dropped off brochures and resource packs, spoke with discharge coordinator for 20 minutes.",
    "Lunch meeting with Dr. Reyes — discussed complex dual-diagnosis cases and mutual referral process.",
    "Left voicemail for social work department, will follow up next week.",
    "Attended hospital grand rounds, presented Sunrise Recovery's continuum of care.",
    "Cold call to new MAT clinic in Chandler — spoke with office manager, sending info packet.",
    "Follow-up visit post-referral, thanked team for sending Marcus T. — positive outcome.",
    "Email sent with updated insurance grid and bed availability.",
    "Coffee meeting with probation officer from Maricopa County, discussed court-ordered treatment.",
    "Presented to ER staff at Chandler Regional on recognizing substance use readiness.",
    "Dropped holiday gift baskets to top 5 referring accounts.",
    "Phone call to check in on case status of mutual client, confirmed admission.",
    "Attended NAADAC regional conference, networked with 12 new contacts.",
    "Zoom presentation to employee assistance program team, 22 attendees.",
    "Face-to-face with hospital social work team, reviewed 3 pending cases.",
    "Monthly check-in call with Verde Valley Detox discharge planner.",
  ];
  const bdActivityTypesArr = ["face_to_face","phone_call","email","meeting","lunch","presentation","other"];
  const bdActivityLogData = [];
  for (let i = 0; i < 280; i++) {
    bdActivityLogData.push({
      accountId: pick(insertedAccounts).id,
      userId: pick(bdReps).id,
      activityType: pick(bdActivityTypesArr),
      notes: pick(bdActivityNotes),
      activityDate: daysAgo(randomBetween(0, 180)),
    });
  }
  await db.insert(bdActivityLogs).values(bdActivityLogData);

  // ── 5. Beds (34 total) ────────────────────────────────────────────────────
  console.log("Creating 34 beds...");
  const bedData: Array<{ name: string; unit: string; status: string; gender?: string }> = [];
  for (let i = 1; i <= 12; i++) bedData.push({ name: `D-${String(i).padStart(2,"0")}`, unit: "Detox", status: i <= 9 ? "occupied" : "available", gender: i % 2 === 0 ? "Female" : "Male" });
  for (let i = 1; i <= 12; i++) bedData.push({ name: `M-${String(i).padStart(2,"0")}`, unit: "Men's Residential", status: i <= 10 ? "occupied" : "available", gender: "Male" });
  for (let i = 1; i <= 10; i++) bedData.push({ name: `W-${String(i).padStart(2,"0")}`, unit: "Women's Residential", status: i <= 8 ? "occupied" : "available", gender: "Female" });
  const insertedBeds = await db.insert(beds).values(bedData.map(b => ({
    name: b.name,
    unit: b.unit,
    status: b.status,
    gender: b.gender,
  }))).returning();

  // ── 6. Inquiries (180 over 6 months) ─────────────────────────────────────
  console.log("Creating 180 inquiries...");

  const stages = [
    { status: "New Inquiry", count: 22 },
    { status: "Initial Contact", count: 18 },
    { status: "Insurance Verification", count: 15 },
    { status: "Pre-Assessment", count: 12 },
    { status: "Scheduled to Admit", count: 8 },
    { status: "Admitted", count: 18 },
    { status: "Discharged", count: 42 },
    { status: "Did Not Admit", count: 45 },
  ];

  const allInquiryIds: number[] = [];
  const admittedInquiryIds: number[] = [];
  const dischargedInquiryIds: number[] = [];

  for (const { status, count: stageCount } of stages) {
    const batchData = [];
    for (let i = 0; i < stageCount; i++) {
      const isFemale = Math.random() > 0.55;
      const firstName = isFemale ? pick(femaleFirstNames) : pick(maleFirstNames);
      const lastName = pick(lastNames);
      const ins = pick(insuranceProviders);
      const diagnosisIdx = randomBetween(0, diagnoses.length - 1);
      const daysBack = randomBetween(2, 175);
      const assignedUser = pick(admissionsUsers);

      const row: Record<string, unknown> = {
        firstName,
        lastName,
        phone: phoneNumbers(),
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}${randomBetween(1,99)}@gmail.com`,
        dob: `${randomBetween(1960,2000)}-${String(randomBetween(1,12)).padStart(2,"0")}-${String(randomBetween(1,28)).padStart(2,"0")}`,
        insuranceProvider: ins.name,
        insuranceMemberId: `${ins.type.substring(0,3).toUpperCase()}${randomBetween(100000,999999)}`,
        insuranceGroupNumber: `GRP${randomBetween(10000,99999)}`,
        city: pick(["Phoenix","Mesa","Scottsdale","Tempe","Chandler","Gilbert","Peoria","Glendale","Tucson","Flagstaff"]),
        state: "AZ",
        primaryDiagnosis: diagnoses[diagnosisIdx],
        substanceHistory: pick(substanceHistories),
        levelOfCare: pick(levelOfCareOptions),
        referralSource: pick(referralSourceNames),
        assignedTo: assignedUser.id,
        status,
        priority: pick(["low","medium","medium","high","high","urgent"]),
        notes: `Patient referred by ${pick(referralSourceNames)}. Initial contact made by ${assignedUser.name}.`,
        createdAt: daysAgo(daysBack),
        updatedAt: daysAgo(Math.max(0, daysBack - randomBetween(1, 10))),
        inquiryNumber: `INQ-${String(allInquiryIds.length + batchData.length + 1).padStart(6,"0")}`,
        medicalHistory: pick(["Hypertension, managed", "No significant PMH", "Hepatitis C positive", "Diabetes Type 2", "COPD, smoker 20 years", "Prior seizure history related to alcohol withdrawal", "None reported"]),
        mentalHealthHistory: pick(["Major Depressive Disorder, in treatment", "PTSD, trauma history", "Bipolar II Disorder", "Generalized Anxiety Disorder", "No known MH history", "ADHD, unmedicated", "Schizophrenia, on Risperdal"]),
        callDurationSeconds: status !== "New Inquiry" ? randomBetween(180, 1800) : randomBetween(60, 300),
        callDateTime: daysAgo(daysBack),
        callStatus: "completed",
        presentingProblem: pick(substanceHistories),
        primarySubstance: pick(["Alcohol","Heroin/Fentanyl","Methamphetamine","Cocaine","Prescription Opioids","Benzodiazepines","Polysubstance"]),
      };

      if (status === "Did Not Admit") {
        row.nonAdmitReason = pick(nonAdmitReasons);
        row.nonAdmitNotes = "Documented in chart. Patient offered referral resources.";
      }

      if (["Insurance Verification","Pre-Assessment","Scheduled to Admit","Admitted","Discharged"].includes(status)) {
        row.vobData = JSON.stringify({
          provider: ins.name,
          deductible: `$${randomBetween(500,5000)}`,
          deductibleMet: `$${randomBetween(0,2500)}`,
          outOfPocket: `$${randomBetween(1000,8000)}`,
          coveragePercent: `${pick([60,70,80,90])}%`,
          authorizationStatus: ["Submitted","Approved","Pending","Approved"][randomBetween(0,3)],
          authorizationNumber: `AUTH${randomBetween(100000,999999)}`,
        });
      }

      if (["Scheduled to Admit","Admitted","Discharged"].includes(status)) {
        const admitDate = daysAgo(daysBack - randomBetween(3, 10));
        row.appointmentDate = admitDate;
        row.preAssessmentCompleted = "yes";
        row.preAssessmentDate = daysAgo(daysBack - 1);
      }

      batchData.push(row);
    }

    const inserted = await db.insert(inquiries).values(batchData as any).returning({ id: inquiries.id });
    const ids = inserted.map(r => r.id);
    allInquiryIds.push(...ids);

    if (status === "Admitted") admittedInquiryIds.push(...ids);
    if (status === "Discharged") dischargedInquiryIds.push(...ids);
  }

  console.log(`Created ${allInquiryIds.length} inquiries`);

  // ── 7. Activities (calls, notes) ──────────────────────────────────────────
  console.log("Creating activities...");
  const activityTypes = ["call","call","call","note","sms","email","note","call"];
  const activityData = [];
  for (const inqId of allInquiryIds) {
    const numActivities = randomBetween(1, 6);
    for (let a = 0; a < numActivities; a++) {
      activityData.push({
        inquiryId: inqId,
        userId: pick(admissionsUsers).id,
        type: pick(activityTypes),
        subject: pick(["Initial contact attempt","Follow-up call","VOB status update","Pre-assessment scheduled","Insurance update","Clinical review","Admission confirmation","Family call"]),
        body: pick(activityNotes),
        outcome: pick(["Reached patient","Left voicemail","Sent email","Completed","No answer","Transferred to clinical"]),
        completedAt: daysAgo(randomBetween(0, 60)),
        createdAt: daysAgo(randomBetween(0, 170)),
      });
    }
  }
  // Batch insert in chunks of 100
  for (let i = 0; i < activityData.length; i += 100) {
    await db.insert(activities).values(activityData.slice(i, i + 100) as any);
  }
  console.log(`Created ${activityData.length} activities`);

  // ── 8. Insurance verifications ────────────────────────────────────────────
  console.log("Creating insurance verifications...");
  const verifiedInquiries = allInquiryIds.filter((_, i) => {
    const stage = getStageForIndex(i, stages);
    return ["Insurance Verification","Pre-Assessment","Scheduled to Admit","Admitted","Discharged"].includes(stage);
  });
  const vobData = verifiedInquiries.map(inqId => ({
    inquiryId: inqId,
    provider: pick(insuranceProviders).name,
    memberId: `MBR${randomBetween(100000,999999)}`,
    groupNumber: `GRP${randomBetween(10000,99999)}`,
    deductible: `$${randomBetween(500,5000)}`,
    deductibleMet: `$${randomBetween(0,2000)}`,
    outOfPocket: `$${randomBetween(1000,8000)}`,
    coverageDetails: `Behavioral health benefits verified. ${pick([60,70,80,90])}% coverage after deductible. Residential treatment authorized for ${randomBetween(14,45)} days.`,
    verifiedBy: pick(admissionsUsers).id,
    verifiedAt: daysAgo(randomBetween(1, 90)),
    status: pick(["verified","verified","verified","pending"]),
  }));
  if (vobData.length) await db.insert(insuranceVerifications).values(vobData as any);

  // ── 9. Patients (admitted + discharged) ───────────────────────────────────
  console.log("Creating patients...");
  const allAdmittedIds = [...admittedInquiryIds, ...dischargedInquiryIds];
  const allInquiryRows = await db.select().from(inquiries);
  const inquiryMap = new Map(allInquiryRows.map(r => [r.id, r]));

  const insertedPatients = [];
  for (const inqId of allAdmittedIds) {
    const inq = inquiryMap.get(inqId);
    if (!inq) continue;
    const admitDaysAgo = randomBetween(5, 150);
    const isDischarge = dischargedInquiryIds.includes(inqId);
    const admitDate = daysAgo(admitDaysAgo);
    const dischargeDate = isDischarge ? daysAgo(randomBetween(0, admitDaysAgo - 5)) : undefined;

    const [p] = await db.insert(patients).values({
      inquiryId: inqId,
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
    insertedPatients.push(p);

    // Bed assignment for admitted (not discharged)
    if (!isDischarge) {
      const availableBeds = insertedBeds.filter(b => b.status === "occupied").slice(0, 28);
      if (availableBeds.length > 0) {
        const bed = pick(availableBeds);
        await db.insert(patientStays).values({
          inquiryId: inqId,
          patientName: `${inq.firstName} ${inq.lastName}`,
          bedId: bed.id,
          admitDate,
          status: "active",
        } as any);
      }
    }

    // Discharge record
    if (isDischarge && p) {
      await db.insert(discharges).values({
        patientId: p.id,
        dischargeType: pick(["Completed Program","AMA (Against Medical Advice)","Clinical Step-Down","Transfer to Higher Level","Successful Completion"]),
        levelOfCare: pick(["PHP (Partial Hospitalization)","IOP (Intensive Outpatient)","Outpatient","Home with support services"]),
        destinationType: pick(["Sober living home","PHP program","Home","IOP program","Family home"]),
        referralSourceName: pick(referralSourceNames),
        clinicalTransfer: Math.random() > 0.8,
        notes: `Patient completed ${pick(["30","45","60","90"])} day program. ${pick(["Discharged to sober living","Stepping down to PHP","Returning home with outpatient follow-up","Transferring to IOP for continued care"])}.`,
        followUp: Math.random() > 0.4,
        createdBy: pick(admissionsUsers).id,
      } as any);
    }
  }
  console.log(`Created ${insertedPatients.length} patient records`);

  // ── 10. SMS conversations ─────────────────────────────────────────────────
  console.log("Creating SMS conversations...");
  const smsInquiries = pickN(allInquiryIds, 55);
  const smsData = [];
  for (const inqId of smsInquiries) {
    const inq = inquiryMap.get(inqId);
    if (!inq?.phone) continue;
    const numMessages = randomBetween(2, 8);
    let daysBackSms = randomBetween(1, 90);
    for (let m = 0; m < numMessages; m++) {
      const isInbound = m % 2 === 0;
      smsData.push({
        phone: inq.phone,
        direction: isInbound ? "inbound" : "outbound",
        body: isInbound ? pick(smsInbound) : pick(smsOutbound),
        status: "delivered",
        inquiryId: inqId,
        userId: isInbound ? undefined : pick(admissionsUsers).id,
        readAt: daysAgo(daysBackSms - 1),
        createdAt: daysAgo(daysBackSms),
      });
      daysBackSms = Math.max(0, daysBackSms - randomBetween(0, 2));
    }
  }
  for (let i = 0; i < smsData.length; i += 100) {
    await db.insert(smsMessages).values(smsData.slice(i, i + 100) as any);
  }
  console.log(`Created ${smsData.length} SMS messages`);

  // ── 11. AI stage suggestions ──────────────────────────────────────────────
  console.log("Creating AI stage suggestions...");
  const suggestionInquiries = pickN(allInquiryIds, 30);
  const stagePairs: [string, string][] = [
    ["New Inquiry", "Initial Contact"],
    ["Initial Contact", "Insurance Verification"],
    ["Insurance Verification", "Pre-Assessment"],
    ["Pre-Assessment", "Scheduled to Admit"],
  ];
  const suggestionData = suggestionInquiries.map(inqId => {
    const [current, suggested] = pick(stagePairs);
    return {
      inquiryId: inqId,
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

  console.log("\n✅ Demo seed complete!");
  console.log("📊 Summary:");
  console.log(`   Users:            ${staffData.length + 1} (admin + ${staffData.length} staff)`);
  console.log(`   Referral Sources: ${refSourceData.length}`);
  console.log(`   BD Accounts:      ${bdAccounts.length}`);
  console.log(`   BD Activities:    280`);
  console.log(`   Beds:             34`);
  console.log(`   Inquiries:        ${allInquiryIds.length}`);
  console.log(`   Patients:         ${insertedPatients.length}`);
  console.log(`   SMS Messages:     ${smsData.length}`);
  console.log(`   AI Suggestions:   ${suggestionData.length}`);
}

// Helper: map flat index back to its stage (used for VOB filter)
function getStageForIndex(id: number, stages: { status: string; count: number }[]): string {
  // rough approximation — just use id modulo to distribute
  let cumulative = 0;
  const total = stages.reduce((s, st) => s + st.count, 0);
  const pos = id % total;
  for (const { status, count } of stages) {
    cumulative += count;
    if (pos < cumulative) return status;
  }
  return "New Inquiry";
}

if (process.argv[1]?.endsWith("demoSeed.ts") || process.argv[1]?.endsWith("demoSeed.js")) {
  main().catch(err => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
}
