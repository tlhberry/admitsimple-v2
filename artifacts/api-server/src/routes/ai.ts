import { Router } from "express";
import { db } from "@workspace/db";
import { inquiries, patients, referralSources, pipelineStages } from "@workspace/db/schema";
import { eq, count, gte, lte, and, sql, desc } from "drizzle-orm";
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
- insuranceProvider, insuranceMemberId
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

export default router;
