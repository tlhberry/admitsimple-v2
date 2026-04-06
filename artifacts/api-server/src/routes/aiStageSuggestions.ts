import { Router } from "express";
import { db } from "@workspace/db";
import { inquiries, aiStageSuggestions, pipelineStages, users, activities } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { broadcastSSE } from "../lib/sse";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();
router.use(requireAuth);

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

// ─── Get pending AI stage suggestions ──────────────────────────────────────────
router.get("/ai-suggestions", async (req, res) => {
  try {
    const rows = await db
      .select({
        suggestion: aiStageSuggestions,
        inquiry: {
          id: inquiries.id,
          firstName: inquiries.firstName,
          lastName: inquiries.lastName,
          status: inquiries.status,
        },
      })
      .from(aiStageSuggestions)
      .leftJoin(inquiries, eq(aiStageSuggestions.inquiryId, inquiries.id))
      .where(eq(aiStageSuggestions.status, "pending"))
      .orderBy(desc(aiStageSuggestions.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Accept a suggestion (move inquiry to next stage) ──────────────────────────
router.post("/ai-suggestions/:id/accept", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sess = req.session as any;
    const [suggestion] = await db.select().from(aiStageSuggestions).where(eq(aiStageSuggestions.id, id));
    if (!suggestion) { res.status(404).json({ error: "Not found" }); return; }
    if (suggestion.status !== "pending") { res.status(400).json({ error: "Already resolved" }); return; }

    await db.update(inquiries)
      .set({ status: suggestion.suggestedStage, updatedAt: new Date() })
      .where(eq(inquiries.id, suggestion.inquiryId));

    await db.update(aiStageSuggestions)
      .set({ status: "accepted", resolvedAt: new Date(), resolvedBy: sess.userId })
      .where(eq(aiStageSuggestions.id, id));

    await db.insert(activities).values({
      inquiryId: suggestion.inquiryId,
      userId: sess.userId,
      type: "stage_change",
      description: `AI suggested stage advanced: ${suggestion.currentStage} → ${suggestion.suggestedStage}`,
    } as any);

    broadcastSSE("ai_suggestion_resolved", { suggestionId: id, inquiryId: suggestion.inquiryId, action: "accepted", newStage: suggestion.suggestedStage });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Dismiss a suggestion ──────────────────────────────────────────────────────
router.post("/ai-suggestions/:id/dismiss", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sess = req.session as any;
    const [suggestion] = await db.select().from(aiStageSuggestions).where(eq(aiStageSuggestions.id, id));
    if (!suggestion) { res.status(404).json({ error: "Not found" }); return; }

    await db.update(aiStageSuggestions)
      .set({ status: "dismissed", resolvedAt: new Date(), resolvedBy: sess.userId })
      .where(eq(aiStageSuggestions.id, id));

    broadcastSSE("ai_suggestion_resolved", { suggestionId: id, inquiryId: suggestion.inquiryId, action: "dismissed" });
    res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ─── Core AI stage analysis function (exported for use in other routes) ────────
export async function runAiStageCheck(inquiryId: number, log?: any): Promise<void> {
  try {
    const [inquiry] = await db.select().from(inquiries).where(eq(inquiries.id, inquiryId));
    if (!inquiry) return;

    const stages = await db.select().from(pipelineStages).orderBy(pipelineStages.order);
    const terminalStages = ["Admitted", "Discharged", "Did Not Admit"];
    if (terminalStages.includes(inquiry.status)) return;

    // Check if there's already a pending suggestion for this inquiry
    const existing = await db.select().from(aiStageSuggestions)
      .where(and(eq(aiStageSuggestions.inquiryId, inquiryId), eq(aiStageSuggestions.status, "pending")));
    if (existing.length > 0) return;

    const currentStageIndex = stages.findIndex(s => s.name === inquiry.status);
    if (currentStageIndex === -1 || currentStageIndex >= stages.length - 1) return;

    const currentStage = stages[currentStageIndex];
    const nextStage = stages[currentStageIndex + 1];
    if (!nextStage || terminalStages.includes(nextStage.name)) return;

    const prompt = `You are an AI assistant for an addiction treatment center admissions team.

Analyze this inquiry and determine if it is ready to advance to the next pipeline stage.

Current Stage: ${inquiry.status}
Next Stage: ${nextStage.name}

Patient Info:
- Name: ${inquiry.firstName} ${inquiry.lastName}
- Phone: ${inquiry.phone || "none"}
- Email: ${inquiry.email || "none"}
- DOB: ${inquiry.dob || "not provided"}
- Insurance Provider: ${inquiry.insuranceProvider || "not provided"}
- Insurance Member ID: ${inquiry.insuranceMemberId || "not provided"}
- Primary Diagnosis: ${inquiry.primaryDiagnosis || "not provided"}
- Substance History: ${inquiry.substanceHistory || "not provided"}
- Medical History: ${inquiry.medicalHistory || "not provided"}
- Mental Health History: ${inquiry.mentalHealthHistory || "not provided"}
- Level of Care: ${inquiry.levelOfCare || "not specified"}
- Referral Source: ${inquiry.referralSource || "not provided"}
- Pre-Certification Form: ${inquiry.preCertFormComplete || "no"}
- Nursing Assessment: ${inquiry.nursingAssessmentComplete || "no"}
- Notes: ${inquiry.notes || "none"}
- Priority: ${inquiry.priority}

Stage progression criteria:
- New Inquiry → Initial Contact: Patient has been contacted (phone or email exists, some information gathered)
- Initial Contact → Insurance Verification: Substance use info collected, insurance info provided, ready for VOB
- Insurance Verification → Pre-Assessment: Insurance collected, benefit verification possible, clinical pre-assessment needed
- Pre-Assessment → Scheduled to Admit: Clinical assessment done or notes indicate clinical readiness, insurance verified, scheduling appropriate
- Scheduled to Admit → Admitted: All forms complete, appointment set

Based on this data, should this inquiry advance from "${inquiry.status}" to "${nextStage.name}"?

Respond with ONLY a JSON object (no markdown, no explanation outside the JSON):
{
  "shouldAdvance": true or false,
  "confidence": "low" or "medium" or "high",
  "reasoning": "1-2 sentence explanation of why or why not"
}`;

    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const text = (response.content[0] as any).text.trim();
    let parsed: { shouldAdvance: boolean; confidence: string; reasoning: string };
    try {
      parsed = JSON.parse(text);
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) return;
      parsed = JSON.parse(match[0]);
    }

    if (!parsed.shouldAdvance || parsed.confidence === "low") return;

    const [suggestion] = await db.insert(aiStageSuggestions).values({
      inquiryId,
      currentStage: inquiry.status,
      suggestedStage: nextStage.name,
      reasoning: parsed.reasoning,
      confidence: parsed.confidence,
      status: "pending",
    }).returning();

    broadcastSSE("ai_stage_suggestion", {
      suggestion: {
        ...suggestion,
        inquiry: {
          id: inquiry.id,
          firstName: inquiry.firstName,
          lastName: inquiry.lastName,
          status: inquiry.status,
        },
      },
    });
  } catch (err) {
    if (log) log.error(err, "AI stage check failed");
  }
}

export default router;
