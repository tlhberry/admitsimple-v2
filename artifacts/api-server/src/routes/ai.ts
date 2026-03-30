import { Router } from "express";
import { db, pool } from "@workspace/db";
import { inquiries, patients, referralSources, pipelineStages, beds, dailyAiTasks, dailyTaskCompletions, activities } from "@workspace/db/schema";
import { eq, count, gte, lte, and, sql, desc, ne, or, isNull, max } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import Anthropic from "@anthropic-ai/sdk";
import multer from "multer";

const router = Router();
router.use(requireAuth);

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/ai/parse-intake", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }
    const base64Image = req.file.buffer.toString("base64");
    const mediaType = req.file.mimetype as "image/jpeg" | "image/png" | "image/gif" | "image/webp";

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 2000,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: mediaType,
              data: base64Image,
            },
          },
          {
            type: "text",
            text: `You are a medical intake specialist for an addiction treatment center. 
Extract all patient information from this document/screenshot and return it as JSON.
Extract these fields if present:
- firstName, lastName
- phone, email
- dob (date of birth, format MM/DD/YYYY)
- city, state
- insuranceProvider, insuranceMemberId, insuranceGroupNumber, insuranceCarrierPhone
- primaryDiagnosis
- substanceHistory
- medicalHistory
- mentalHealthHistory
- levelOfCare (one of: Detox, RTC, PHP, IOP, OP)
- referralSource
- notes

Return ONLY valid JSON with these field names. Use null for fields not found.
Do not include any explanation, only the JSON object.`,
          }
        ],
      }],
    });

    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      res.status(500).json({ error: "Failed to parse document" });
      return;
    }

    let parsed: any = {};
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = {};
    }

    const fieldsExtracted = Object.values(parsed).filter(v => v !== null && v !== undefined && v !== "").length;
    res.json({ ...parsed, fieldsExtracted });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

// ── Insurance card scan (front + back) ───────────────────────────────────────
const uploadInsuranceCard = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/ai/parse-insurance-card", uploadInsuranceCard.fields([
  { name: "front", maxCount: 1 },
  { name: "back", maxCount: 1 },
]), async (req, res) => {
  try {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const front = files?.front?.[0];
    const back = files?.back?.[0];

    if (!front && !back) {
      res.status(400).json({ error: "At least one insurance card image is required" });
      return;
    }

    const imageContent: any[] = [];
    if (front) {
      imageContent.push({
        type: "image",
        source: { type: "base64", media_type: front.mimetype as any, data: front.buffer.toString("base64") },
      });
      imageContent.push({ type: "text", text: "Above is the FRONT of the insurance card." });
    }
    if (back) {
      imageContent.push({
        type: "image",
        source: { type: "base64", media_type: back.mimetype as any, data: back.buffer.toString("base64") },
      });
      imageContent.push({ type: "text", text: "Above is the BACK of the insurance card." });
    }

    imageContent.push({
      type: "text",
      text: `You are a medical billing specialist. Extract all insurance information from this card and return it as JSON.
Extract these fields if present:
- insuranceProvider (insurance company name)
- insuranceMemberId (member ID, subscriber ID)
- insuranceGroupNumber (group number, group ID)
- insuranceCarrierPhone (customer service / provider phone number on the card)

Return ONLY valid JSON with these exact field names. Use null for fields not found.
Do not include any explanation, only the JSON object.`,
    });

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 500,
      messages: [{ role: "user", content: imageContent }],
    });

    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      res.status(500).json({ error: "Failed to parse insurance card" });
      return;
    }

    let parsed: any = {};
    try {
      const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
    } catch {
      parsed = {};
    }

    const fieldsExtracted = Object.values(parsed).filter(v => v !== null && v !== undefined && v !== "").length;
    res.json({ ...parsed, fieldsExtracted });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

router.post("/ai/insights", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);
    const [totalInquiries] = await db.select({ count: count() }).from(inquiries).where(gte(inquiries.createdAt, thirtyDaysAgo));
    const [admitted] = await db.select({ count: count() }).from(inquiries).where(and(gte(inquiries.createdAt, thirtyDaysAgo), eq(inquiries.status, "admitted")));
    const [census] = await db.select({ count: count() }).from(patients).where(eq(patients.status, "active"));
    const statusCounts = await db.select({ status: inquiries.status, count: count() }).from(inquiries).where(gte(inquiries.createdAt, thirtyDaysAgo)).groupBy(inquiries.status);

    const aggregatedData = {
      period: "last_30_days",
      totalInquiries: Number(totalInquiries.count),
      admitted: Number(admitted.count),
      conversionRate: Number(totalInquiries.count) > 0 ? Math.round((Number(admitted.count) / Number(totalInquiries.count)) * 100) : 0,
      census: Number(census.count),
      statusBreakdown: statusCounts.map(s => ({ status: s.status, count: Number(s.count) })),
    };

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `You are an admissions analytics expert for an addiction treatment center.
Analyze this admissions data and provide actionable insights.

Data: ${JSON.stringify(aggregatedData)}

Provide:
1. Key trends you notice (positive and negative)
2. Conversion rate analysis
3. Capacity and census insights
4. 3-5 specific, actionable recommendations to improve admissions outcomes
5. Any red flags or areas of concern

Format your response with clear sections and bullet points. Be specific and data-driven.`,
      }],
    });

    const text = response.content.find(c => c.type === "text");
    res.json({ text: text?.type === "text" ? text.text : "No insights available.", generatedAt: new Date() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

router.post("/ai/referral-insights", async (req, res) => {
  try {
    const sources = await db.select().from(referralSources);
    const metrics = await Promise.all(sources.map(async s => {
      const [total] = await db.select({ count: count() }).from(inquiries).where(eq(inquiries.referralSource, s.name));
      const [admitted] = await db.select({ count: count() }).from(inquiries).where(and(eq(inquiries.referralSource, s.name), eq(inquiries.status, "admitted")));
      return {
        name: s.name,
        type: s.type,
        totalInquiries: Number(total.count),
        admitted: Number(admitted.count),
        conversionRate: Number(total.count) > 0 ? Math.round((Number(admitted.count) / Number(total.count)) * 100) : 0,
      };
    }));

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `You are a referral relationship strategist for an addiction treatment center.
Analyze these referral source metrics and provide strategic recommendations.

Referral data: ${JSON.stringify(metrics)}

Provide:
1. Ranked analysis of top-performing referral sources
2. Sources needing relationship attention (low conversion)
3. Growth opportunities
4. Specific outreach recommendations
5. Which sources to prioritize for next quarter

Format with clear headings and bullet points.`,
      }],
    });

    const text = response.content.find(c => c.type === "text");
    res.json({ text: text?.type === "text" ? text.text : "No insights available.", generatedAt: new Date() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

router.post("/ai/pipeline-optimize", async (req, res) => {
  try {
    const stages = await db.select().from(pipelineStages).orderBy(pipelineStages.order);
    const now = new Date();
    const pipelineData = {
      stages: stages.map(s => ({ id: s.id, name: s.name, order: s.order })),
      inquiriesByStatus: [] as any[],
    };

    const statusGroups = ["new", "contacted", "qualified", "admitted", "declined", "lost"];
    for (const status of statusGroups) {
      const [c] = await db.select({ count: count() }).from(inquiries).where(eq(inquiries.status, status));
      pipelineData.inquiriesByStatus.push({ status, count: Number(c.count) });
    }

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `You are an admissions pipeline optimizer for an addiction treatment center.
Review this pipeline data and provide specific action recommendations.

Pipeline data: ${JSON.stringify(pipelineData)}

For each stage:
- Identify bottlenecks (high volume or long dwell time)
- Suggest specific next actions for stale inquiries
- Recommend process improvements

Return your response as JSON with this structure:
{
  "bottlenecks": [{"stage": "...", "issue": "...", "recommendation": "..."}],
  "urgentActions": [{"inquiryId": 0, "action": "...", "reason": "..."}],
  "processImprovements": ["...", "..."],
  "overallHealthScore": 85,
  "summary": "..."
}`,
      }],
    });

    const textContent = response.content.find(c => c.type === "text");
    let parsed: any = { bottlenecks: [], urgentActions: [], processImprovements: [], overallHealthScore: 75, summary: "Pipeline analysis complete." };
    if (textContent?.type === "text") {
      try {
        const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = { ...parsed, ...JSON.parse(jsonMatch[0]) };
      } catch {
        parsed.summary = textContent.text;
      }
    }

    res.json({ ...parsed, generatedAt: new Date() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

router.post("/ai/reports", async (req, res) => {
  try {
    const { reportType, dateRangeStart, dateRangeEnd, levelOfCare } = req.body;
    const now = new Date();
    const start = dateRangeStart ? new Date(dateRangeStart) : new Date(now.getTime() - 30 * 86400000);
    const end = dateRangeEnd ? new Date(dateRangeEnd) : now;

    const [total] = await db.select({ count: count() }).from(inquiries).where(and(gte(inquiries.createdAt, start), lte(inquiries.createdAt, end)));
    const [admitted] = await db.select({ count: count() }).from(inquiries).where(and(gte(inquiries.createdAt, start), lte(inquiries.createdAt, end), eq(inquiries.status, "admitted")));
    const statusCounts = await db.select({ status: inquiries.status, count: count() }).from(inquiries).where(and(gte(inquiries.createdAt, start), lte(inquiries.createdAt, end))).groupBy(inquiries.status);

    const data = {
      reportType,
      period: { start: dateRangeStart, end: dateRangeEnd },
      totalInquiries: Number(total.count),
      totalAdmitted: Number(admitted.count),
      conversionRate: Number(total.count) > 0 ? Math.round((Number(admitted.count) / Number(total.count)) * 100) : 0,
      statusBreakdown: statusCounts.map(s => ({ status: s.status, count: Number(s.count) })),
    };

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `You are a healthcare admissions analyst for an addiction treatment center.
Generate a professional ${reportType} report for the period ${dateRangeStart} to ${dateRangeEnd}.

Aggregated data: ${JSON.stringify(data)}

Write a professional report with:
1. Executive Summary (2-3 sentences)
2. Key Findings (3-5 bullet points with specific numbers)
3. Trend Analysis (what changed vs prior period)
4. Referral Source Performance (if applicable)
5. Recommendations (3-5 specific, actionable items)
6. Conclusion

Use professional healthcare/clinical language. Be specific and cite the numbers from the data.
Format with clear headings using markdown.`,
      }],
    });

    const textContent = response.content.find(c => c.type === "text");
    res.json({
      narrative: textContent?.type === "text" ? textContent.text : "Report generation failed.",
      reportData: data,
      generatedAt: new Date(),
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

router.post("/ai/summarize-inquiry", async (req, res) => {
  try {
    const { inquiryId } = req.body;
    const [inq] = await db.select().from(inquiries).where(eq(inquiries.id, parseInt(inquiryId)));
    if (!inq) { res.status(404).json({ error: "Inquiry not found" }); return; }

    const clinicalData = {
      levelOfCare: inq.levelOfCare,
      primaryDiagnosis: inq.primaryDiagnosis,
      substanceHistory: inq.substanceHistory,
      medicalHistory: inq.medicalHistory,
      mentalHealthHistory: inq.mentalHealthHistory,
      insuranceProvider: inq.insuranceProvider,
      status: inq.status,
      priority: inq.priority,
      referralSource: inq.referralSource,
    };

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `Summarize this addiction treatment inquiry for clinical review.
Create a brief clinical summary suitable for treatment team review.

Inquiry data: ${JSON.stringify(clinicalData)}

Write 2-3 paragraphs covering:
- Clinical presentation and primary concerns
- Insurance and financial situation
- Recommended level of care and rationale
- Next steps for the admissions team

Use clinical language appropriate for a treatment team.`,
      }],
    });

    const textContent = response.content.find(c => c.type === "text");
    res.json({ text: textContent?.type === "text" ? textContent.text : "Summary unavailable.", generatedAt: new Date() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

router.post("/ai/custom-query", async (req, res) => {
  try {
    const { question } = req.body;
    const [totalInquiries] = await db.select({ count: count() }).from(inquiries);
    const [activePatients] = await db.select({ count: count() }).from(patients).where(eq(patients.status, "active"));
    const [admitted] = await db.select({ count: count() }).from(inquiries).where(eq(inquiries.status, "admitted"));

    const facilityStats = {
      totalInquiries: Number(totalInquiries.count),
      activePatients: Number(activePatients.count),
      totalAdmitted: Number(admitted.count),
      conversionRate: Number(totalInquiries.count) > 0 ? Math.round((Number(admitted.count) / Number(totalInquiries.count)) * 100) : 0,
    };

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 8192,
      messages: [{
        role: "user",
        content: `You are an AI assistant for an addiction treatment center admissions team.
You have access to the following aggregate facility data:
${JSON.stringify(facilityStats)}

The user asks: "${question}"

Answer their question using the data where relevant. If you cannot answer from the data provided,
say so and explain what additional data would help. Always be helpful and actionable.`,
      }],
    });

    const textContent = response.content.find(c => c.type === "text");
    res.json({ text: textContent?.type === "text" ? textContent.text : "Unable to process query.", generatedAt: new Date() });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI processing failed" });
  }
});

// ─── VOB AI Parse ─────────────────────────────────────────────────────────────

router.post("/ai/vob-parse", upload.single("image"), async (req, res) => {
  try {
    const text = req.body?.text as string | undefined;
    const imageFile = req.file;

    if (!text && !imageFile) {
      res.status(400).json({ error: "Provide text or image" });
      return;
    }

    const systemPrompt = `You are an insurance verification specialist for an addiction treatment center.
Extract structured VOB (Verification of Benefits) data from the provided document.

Return ONLY valid JSON with this exact structure (use empty string "" for unknown fields):
{
  "inNetworkDeductible": "",
  "inNetworkDeductibleMet": "",
  "inNetworkOopMax": "",
  "inNetworkOopMet": "",
  "inNetworkCoinsurance": "",
  "inNetworkCopay": "",
  "hasOon": "Yes",
  "oonDeductible": "",
  "oonDeductibleMet": "",
  "oonOopMax": "",
  "oonOopMet": "",
  "oonCoinsurance": "",
  "preCertRequired": "No",
  "preAuthRequired": "No",
  "preCertDetails": "",
  "substanceUseBenefits": "",
  "mentalHealthBenefits": "",
  "geographicRestrictions": "",
  "additionalNotes": "",
  "coverageSummary": "",
  "quotedCost": "",
  "clientResponsibility": "",
  "facilityType": ""
}

Return ONLY the JSON object. No markdown, no explanation.`;

    const messageContent: any[] = [];

    if (imageFile) {
      messageContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: imageFile.mimetype,
          data: imageFile.buffer.toString("base64"),
        },
      });
    }

    if (text) {
      messageContent.push({ type: "text", text: `VOB Document:\n\n${text}` });
    } else {
      messageContent.push({ type: "text", text: "Extract all VOB information from this image." });
    }

    const aiResponse = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }],
    });

    const raw = (aiResponse.content.find(c => c.type === "text") as any)?.text?.trim() ?? "{}";
    const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();

    let parsed: any;
    try { parsed = JSON.parse(clean); }
    catch { parsed = {}; }

    res.json(parsed);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "VOB parse failed" });
  }
});

// ─── Bed Board AI ────────────────────────────────────────────────────────────

router.post("/ai/bedboard", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    const allBeds = await db.select().from(beds).orderBy(beds.unit, beds.name);

    const total = allBeds.length;
    const available = allBeds.filter(b => b.status === "available").length;
    const occupied = allBeds.filter(b => b.status === "occupied").length;
    const reserved = allBeds.filter(b => b.status === "reserved").length;
    const units = [...new Set(allBeds.map(b => b.unit))];
    const upcomingDischarges = allBeds
      .filter(b => b.expectedDischargeDate && b.status === "occupied")
      .map(b => ({ name: b.name, unit: b.unit, patient: b.currentPatientName, date: b.expectedDischargeDate }));

    const context = JSON.stringify({
      summary: { total, available, occupied, reserved, units },
      beds: allBeds.map(b => ({
        id: b.id, name: b.name, unit: b.unit, status: b.status,
        patient: b.currentPatientName, gender: b.gender,
        expectedDischarge: b.expectedDischargeDate,
      })),
      upcomingDischarges,
    });

    const systemPrompt = `You are a bed board assistant for a residential addiction treatment center.
You help users understand bed availability and customize views.

You MUST return valid JSON only — no explanation, no markdown.

You can return one of these response types:

1. FILTER REQUEST — when user asks to show/filter beds
{"type":"filter","filters":{"unit":"detox","status":"available","gender":"female"}}
All filter fields are optional. Use null to clear a filter.

2. QUESTION ANSWER — when user asks a question about current beds
{"type":"answer","answer":"There are 3 detox beds available today."}

3. PREDICTION — when user asks about future availability
{"type":"prediction","answer":"Based on 2 scheduled discharges in the next 2 days, you should have 4 beds available by then."}

4. GROUP VIEW — when user asks to group or organize the board
{"type":"group","groupBy":"unit"}
groupBy can be: "unit", "status", or "gender"

Current bed data:
${context}

Return ONLY valid JSON. No markdown. No explanation.`;

    const aiResponse = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = (aiResponse.content.find(c => c.type === "text") as any)?.text?.trim() ?? "{}";
    // Strip markdown fences if present
    const clean = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/, "").trim();

    let parsed: any;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = { type: "answer", answer: raw };
    }

    res.json({ ...parsed, beds: allBeds });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "AI bedboard processing failed" });
  }
});

// ─── Natural language report builder ─────────────────────────────────────────

const ALLOWED_TABLES = [
  "users", "inquiries", "patients", "activities",
  "referral_sources", "referral_accounts", "bd_activity_logs",
  "referral_contacts", "audit_logs", "pipeline_stages",
];

const REPORT_SCHEMA_PROMPT = `You are a data analyst for an addiction treatment admissions CRM.
Your job is to convert natural language into SQL queries for a PostgreSQL database.

STRICT RULES:
- ONLY return a SQL SELECT query — nothing else
- NEVER use INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or any write operation
- LIMIT results to 500 rows max (always add LIMIT 500 if not specified)
- Return ONLY the raw SQL query — no markdown, no explanation, no code fences

TABLES AND COLUMNS (all column names are snake_case):

users: id, name, email, role, created_at
  role values: 'admin', 'staff', 'clinical', 'bd_rep'

inquiries: id, first_name, last_name, phone, email, status, level_of_care,
  referral_source, assigned_to (FK → users.id), created_at, search_keywords
  status values: 'new', 'Initial Contact', 'Insurance Verification', 'Clinical Review', 'Admitted', 'Declined', 'Waitlist'
  level_of_care values: 'Detox', 'RTC', 'PHP', 'IOP', 'OP'

patients: id, inquiry_id (FK → inquiries.id), first_name, last_name,
  level_of_care, admit_date, discharge_date, current_stage, status,
  credit_user_id (FK → users.id), assigned_admissions (FK → users.id),
  assigned_clinician (FK → users.id), created_at

activities: id, inquiry_id (FK → inquiries.id), user_id (FK → users.id),
  type, subject, body, created_at
  type values: 'call', 'email', 'note', 'meeting', 'face_to_face', 'other'

bd_activity_logs: id, account_id (FK → referral_accounts.id),
  user_id (FK → users.id), activity_type, notes, activity_date, created_at
  activity_type values: 'face_to_face', 'phone_call', 'email', 'meeting', 'lunch', 'presentation', 'other'

referral_sources: id, name, type, contact, phone, email, is_active,
  owned_by_user_id (FK → users.id), created_at

referral_accounts: id, name, type, address, phone, assigned_bd_rep_id (FK → users.id),
  created_by (FK → users.id), created_at

COMMON QUERY PATTERNS:
- "admits by rep this month" → SELECT u.name, COUNT(p.id) as admits FROM patients p JOIN users u ON p.credit_user_id = u.id WHERE p.admit_date >= date_trunc('month', NOW()) GROUP BY u.name ORDER BY admits DESC LIMIT 500
- "inquiries this week" → WHERE created_at >= date_trunc('week', NOW())
- "last 30 days" → WHERE created_at >= NOW() - INTERVAL '30 days'
- "face to face meetings" → FROM bd_activity_logs WHERE activity_type = 'face_to_face'
- "top referral sources" → SELECT referral_source, COUNT(*) FROM inquiries GROUP BY referral_source ORDER BY count DESC
- "by rep" → JOIN users on the relevant user FK, GROUP BY users.name

NAVIGATION RULE (very important):
- When the query returns individual patient or inquiry rows (not aggregates/counts), ALWAYS include the relevant inquiry ID so users can navigate to it.
- For patients: always SELECT p.inquiry_id, p.first_name, p.last_name, ... FROM patients p ...
- For inquiries: always SELECT i.id AS inquiry_id, i.first_name, i.last_name, ... FROM inquiries i ...
- Column must be named exactly "inquiry_id" so the UI can detect it.
- For aggregate/count queries (GROUP BY), do NOT include inquiry_id.

Return ONLY the SQL query. No explanation. No markdown. No code fences.`;

router.post("/ai/report", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      res.status(400).json({ error: "prompt is required" });
      return;
    }

    // Step 1: Generate SQL from natural language
    const sqlResponse = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 1000,
      system: REPORT_SCHEMA_PROMPT,
      messages: [{ role: "user", content: prompt }],
    });

    const rawSql = (sqlResponse.content.find(c => c.type === "text") as any)?.text?.trim() ?? "";

    // Strip markdown code fences if Claude added them
    const cleanSql = rawSql
      .replace(/^```sql\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/, "")
      .trim();

    // Step 2: Validate — reject any write operations using whole-word matching
    const upperSql = cleanSql.toUpperCase();
    const forbidden = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE"];
    for (const kw of forbidden) {
      // Use word-boundary regex so "created_at" does not match "CREATE"
      if (new RegExp(`\\b${kw}\\b`).test(upperSql)) {
        res.status(400).json({ error: `Query rejected: contains forbidden keyword '${kw}'` });
        return;
      }
    }

    // Validate it starts with SELECT
    if (!upperSql.trimStart().startsWith("SELECT")) {
      res.status(400).json({ error: "Only SELECT queries are allowed" });
      return;
    }

    // Step 3: Execute the query
    const result = await pool.query(cleanSql);
    const columns: string[] = result.fields.map((f: any) => f.name);
    const rows: any[][] = result.rows.map((row: any) => columns.map(col => row[col]));

    // Step 4: Generate a human summary
    const summaryResponse = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 200,
      messages: [{
        role: "user",
        content: `Summarize this report in one short sentence for a business user. Be specific about the numbers.\n\n${JSON.stringify({ columns, rowCount: rows.length, sample: rows.slice(0, 5) })}`,
      }],
    });

    const summary = (summaryResponse.content.find(c => c.type === "text") as any)?.text?.trim() ?? "";

    res.json({ columns, rows, summary, rowCount: rows.length, sql: cleanSql });
  } catch (err: any) {
    req.log.error(err);
    const msg = err?.message ?? "AI report generation failed";
    res.status(500).json({ error: msg });
  }
});

// ─── Daily Admissions Task Board ─────────────────────────────────────────────

function todayStr() {
  return new Date().toISOString().slice(0, 10); // "YYYY-MM-DD"
}

router.get("/ai/tasks", async (req, res) => {
  try {
    const today = todayStr();
    const userId = (req.session as any).userId as number;

    // 1. Check cache
    const cached = await db.select().from(dailyAiTasks).where(eq(dailyAiTasks.taskDate, today));
    let tasksData: any;

    if (cached.length > 0) {
      tasksData = cached[0].tasksData;
    } else {
      // 2. Build inquiry context for AI
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const activeInquiries = await db
        .select({
          id: inquiries.id,
          firstName: inquiries.firstName,
          lastName: inquiries.lastName,
          status: inquiries.status,
          insuranceProvider: inquiries.insuranceProvider,
          insuranceMemberId: inquiries.insuranceMemberId,
          vobData: inquiries.vobData,
          preCertFormComplete: inquiries.preCertFormComplete,
          preScreeningData: inquiries.preScreeningData,
          createdAt: inquiries.createdAt,
          updatedAt: inquiries.updatedAt,
        })
        .from(inquiries)
        .where(
          and(
            ne(inquiries.status, "Admitted"),
            ne(inquiries.status, "Non-Viable"),
            ne(inquiries.status, "Did Not Admit"),
            ne(inquiries.status, "Referred Out"),
          )
        )
        .orderBy(desc(inquiries.updatedAt))
        .limit(100);

      // Get last activity per inquiry
      const activityRows = await db
        .select({
          inquiryId: activities.inquiryId,
          lastActivity: max(activities.createdAt),
        })
        .from(activities)
        .groupBy(activities.inquiryId);

      const activityMap = new Map(activityRows.map(r => [r.inquiryId, r.lastActivity]));

      const enriched = activeInquiries.map(inq => ({
        id: inq.id,
        name: `${inq.firstName} ${inq.lastName}`,
        status: inq.status,
        hasInsurance: !!(inq.insuranceProvider || inq.insuranceMemberId),
        vobComplete: !!(inq.vobData && Object.keys(inq.vobData as any).length > 0),
        preCertComplete: inq.preCertFormComplete === "yes",
        preScreenComplete: !!(inq.preScreeningData && Object.keys(inq.preScreeningData as any).length > 0),
        lastActivityAt: activityMap.get(inq.id) ?? inq.updatedAt,
        createdAt: inq.createdAt,
      }));

      // 3. Call Claude
      const prompt = `You are an admissions coordinator assistant for an addiction treatment center.

Analyze these active inquiries and categorize them into tasks for today.

Inquiry data:
${JSON.stringify(enriched, null, 2)}

Rules:
1. urgent_callbacks: No activity in last 24 hours AND not yet admitted. Priority to newest inquiries.
2. vobs_needed: Has insurance info but VOB (verification of benefits) is NOT complete.
3. prescreens_needed: Insurance verified OR no insurance, but pre-screening form not complete.
4. ready_to_admit: Pre-screening done, VOB done or not needed — fully worked up and ready for admission decision.

Do NOT duplicate a patient across categories. Use best-fit category only.
Do NOT include patients who don't clearly fit any category.

Return ONLY valid JSON with no other text:
{
  "urgent_callbacks": [{"inquiry_id": 1, "patient_name": "John Smith", "task_type": "urgent_callback", "last_activity_time": "ISO timestamp"}],
  "vobs_needed": [{"inquiry_id": 2, "patient_name": "Jane Doe", "task_type": "vob_needed", "last_activity_time": "ISO timestamp"}],
  "prescreens_needed": [{"inquiry_id": 3, "patient_name": "Bob K", "task_type": "prescreen_needed", "last_activity_time": "ISO timestamp"}],
  "ready_to_admit": [{"inquiry_id": 4, "patient_name": "Alice M", "task_type": "ready_to_admit", "last_activity_time": "ISO timestamp"}]
}`;

      const aiResp = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const raw = (aiResp.content.find(c => c.type === "text") as any)?.text?.trim() ?? "{}";
      const jsonStr = raw.replace(/^```json\n?|```$/g, "").trim();
      tasksData = JSON.parse(jsonStr);

      // 4. Cache it
      await db.insert(dailyAiTasks).values({ taskDate: today, tasksData }).onConflictDoUpdate({
        target: dailyAiTasks.taskDate,
        set: { tasksData, generatedAt: new Date() },
      });
    }

    // 5. Apply completions for today/user
    const completions = await db
      .select()
      .from(dailyTaskCompletions)
      .where(and(eq(dailyTaskCompletions.taskDate, today), eq(dailyTaskCompletions.userId, userId)));

    const completedSet = new Set(completions.map(c => `${c.inquiryId}:${c.taskType}`));

    const applyCompletions = (items: any[]) =>
      items.map((t: any) => ({ ...t, completed: completedSet.has(`${t.inquiry_id}:${t.task_type}`) }));

    res.json({
      urgent_callbacks:  applyCompletions(tasksData.urgent_callbacks  ?? []),
      vobs_needed:       applyCompletions(tasksData.vobs_needed        ?? []),
      prescreens_needed: applyCompletions(tasksData.prescreens_needed  ?? []),
      ready_to_admit:    applyCompletions(tasksData.ready_to_admit     ?? []),
      generatedAt: cached[0]?.generatedAt ?? new Date(),
    });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: err?.message ?? "Failed to generate tasks" });
  }
});

router.post("/ai/tasks/complete", async (req, res) => {
  try {
    const today = todayStr();
    const userId = (req.session as any).userId as number;
    const { inquiryId, taskType } = req.body as { inquiryId: number; taskType: string };

    // Only insert if not already completed
    const existing = await db.select().from(dailyTaskCompletions).where(
      and(
        eq(dailyTaskCompletions.taskDate, today),
        eq(dailyTaskCompletions.userId, userId),
        eq(dailyTaskCompletions.inquiryId, inquiryId),
        eq(dailyTaskCompletions.taskType, taskType),
      )
    );
    if (existing.length === 0) {
      await db.insert(dailyTaskCompletions).values({ taskDate: today, userId, inquiryId, taskType });
    }

    res.json({ ok: true });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to save completion" });
  }
});

router.delete("/ai/tasks/complete/:inquiryId/:taskType", async (req, res) => {
  try {
    const today = todayStr();
    const userId = (req.session as any).userId as number;
    const inquiryId = parseInt(req.params.inquiryId);
    const { taskType } = req.params;

    await db.delete(dailyTaskCompletions).where(
      and(
        eq(dailyTaskCompletions.taskDate, today),
        eq(dailyTaskCompletions.userId, userId),
        eq(dailyTaskCompletions.inquiryId, inquiryId),
        eq(dailyTaskCompletions.taskType, taskType),
      )
    );

    res.json({ ok: true });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to remove completion" });
  }
});

// Force-regenerate tasks (clears cache for today)
router.post("/ai/tasks/regenerate", async (req, res) => {
  try {
    const today = todayStr();
    await db.delete(dailyAiTasks).where(eq(dailyAiTasks.taskDate, today));
    res.json({ ok: true, message: "Cache cleared — next GET will regenerate" });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to clear cache" });
  }
});

export default router;
