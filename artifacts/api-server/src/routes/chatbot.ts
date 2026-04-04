import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { inquiries, activities, settings } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { broadcastSSE } from "../lib/sse";

const router = Router();

const anthropic = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
});

const DEFAULT_BRAIN = `You are a compassionate admissions coordinator for an addiction treatment center. You guide potential clients through the insurance verification process with warmth, empathy, and care. You are non-judgmental and supportive. You understand that reaching out takes courage. Keep your tone conversational and never clinical. Always be encouraging.`;

async function loadBrain(): Promise<string> {
  try {
    const rows = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, "chatbot_brain"));
    return rows[0]?.value || DEFAULT_BRAIN;
  } catch {
    return DEFAULT_BRAIN;
  }
}

// POST /chatbot/message — AI response generation (public, no auth)
router.post("/chatbot/message", async (req, res) => {
  try {
    const { messages } = req.body as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
    };
    if (!messages?.length) return res.status(400).json({ error: "messages required" });

    const brain = await loadBrain();
    const response = await anthropic.messages.create({
      model: "claude-opus-4-5",
      max_tokens: 300,
      system: `${brain}\n\nIMPORTANT: Keep every response to 1-3 sentences maximum. This is a mobile chat interface. Be warm but brief. You are helping people check their insurance coverage for addiction treatment.`,
      messages,
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";
    res.json({ reply });
  } catch (err) {
    console.error("[chatbot/message]", err);
    res.status(500).json({ error: "AI unavailable" });
  }
});

// POST /chatbot/submit — create inquiry from chatbot (public, no auth)
router.post("/chatbot/submit", async (req, res) => {
  try {
    const { name, dob, insuranceCarrier, memberId, phone, transcript } = req.body as {
      name: string;
      dob?: string;
      insuranceCarrier?: string;
      memberId?: string;
      phone?: string;
      transcript?: string;
    };

    if (!name?.trim()) return res.status(400).json({ error: "Name is required" });

    const parts = name.trim().split(/\s+/);
    const firstName = parts[0] ?? "Unknown";
    const lastName = parts.slice(1).join(" ") || "—";

    const notes = [
      "Source: Website Chatbot",
      insuranceCarrier ? `Insurance Carrier: ${insuranceCarrier}` : null,
      memberId ? `Member ID: ${memberId}` : null,
      transcript ? `\nChat Transcript:\n${transcript}` : null,
    ].filter(Boolean).join("\n");

    const [inserted] = await db.insert(inquiries).values({
      firstName,
      lastName,
      phone: phone?.trim() || null,
      dob: dob?.trim() || null,
      insuranceProvider: insuranceCarrier?.trim() || null,
      insuranceMemberId: memberId?.trim() || null,
      referralSource: "Website Chatbot",
      status: "new",
      priority: "medium",
      notes,
    }).returning({ id: inquiries.id });

    const inquiryId = inserted.id;
    const inquiryNumber = `INQ-${String(inquiryId).padStart(6, "0")}`;
    await db.update(inquiries).set({ inquiryNumber }).where(eq(inquiries.id, inquiryId));

    await db.insert(activities).values({
      inquiryId,
      userId: null,
      type: "note",
      subject: "Inquiry created via website chatbot",
      body: notes,
    });

    broadcastSSE("inquiry_created", { id: inquiryId, inquiryNumber, firstName, lastName, source: "Website Chatbot" });

    res.json({ ok: true, inquiryId, inquiryNumber });
  } catch (err) {
    console.error("[chatbot/submit]", err);
    res.status(500).json({ error: "Submission failed. Please try again." });
  }
});

export default router;
