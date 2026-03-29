import { Router } from "express";
import { db } from "@workspace/db";
import { inquiries, activities, settings } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * POST /webhooks/ctm
 * Call Tracking Metrics webhook — no session auth required.
 * Secured by a shared secret token checked against X-CTM-Token header
 * or the "token" query/body field that CTM includes.
 *
 * CTM sends application/x-www-form-urlencoded with the following fields:
 *   caller_number, caller_name, caller_city, caller_state,
 *   called_number, tracking_label, call_status, recording_url,
 *   first_call, duration, agent_name, agent_email
 */
router.post("/webhooks/ctm", async (req, res) => {
  try {
    const [secretRow] = await db
      .select()
      .from(settings)
      .where(eq(settings.key, "ctm_webhook_secret"));

    const storedSecret = secretRow?.value;

    if (storedSecret) {
      const incomingToken =
        req.headers["x-ctm-token"] ||
        req.query.token ||
        req.body?.token;

      if (incomingToken !== storedSecret) {
        res.status(401).json({ error: "Invalid webhook token" });
        return;
      }
    }

    const body = req.body as Record<string, string>;

    const callerName: string = body.caller_number_name || body.caller_name || "";
    const nameParts = callerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "Caller";

    const phone = body.caller_number || "";
    const trackingLabel = body.tracking_label || "";
    const callerCity = body.caller_city || "";
    const callerState = body.caller_state || "";
    const callStatus = body.call_status || "";
    const recordingUrl = body.recording_url || "";
    const duration = body.duration ? parseInt(body.duration, 10) : null;
    const agentName = body.agent_name || "";
    const calledNumber = body.called_number || "";
    const ctmKeyword = body.keyword || body.search_keyword || "";

    // Map CTM tracking label to referral source.
    // If the campaign is Google-based, classify as Google PPC or Google Organic.
    let referralSource = trackingLabel || "Call Tracking Metrics";
    const labelLower = trackingLabel.toLowerCase();
    if (labelLower.includes("google")) {
      const isPPC =
        labelLower.includes("ppc") ||
        labelLower.includes("paid") ||
        labelLower.includes("cpc") ||
        labelLower.includes("adwords") ||
        labelLower.includes("ads");
      const isOrganic =
        labelLower.includes("organic") || labelLower.includes("seo");
      if (isOrganic) {
        referralSource = "Google Organic";
      } else if (isPPC) {
        referralSource = "Google PPC";
      } else {
        referralSource = "Google PPC";
      }
    }

    const locationNote = [callerCity, callerState].filter(Boolean).join(", ");
    const notes = [
      `📞 Inbound call via Call Tracking Metrics`,
      trackingLabel ? `Campaign: ${trackingLabel}` : null,
      calledNumber ? `Tracking number: ${calledNumber}` : null,
      locationNote ? `Caller location: ${locationNote}` : null,
      callStatus ? `Call status: ${callStatus}` : null,
      duration !== null ? `Duration: ${duration}s` : null,
      agentName ? `Answered by: ${agentName}` : null,
      recordingUrl ? `Recording: ${recordingUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const isGoogleSource =
      referralSource === "Google PPC" || referralSource === "Google Organic";

    const [inquiry] = await db
      .insert(inquiries)
      .values({
        firstName,
        lastName,
        phone,
        referralSource,
        searchKeywords: isGoogleSource && ctmKeyword ? ctmKeyword : null,
        status: "new",
        priority: "medium",
        notes,
        updatedAt: new Date(),
      })
      .returning();

    await db.insert(activities).values({
      inquiryId: inquiry.id,
      type: "call",
      subject: `Inbound call from ${firstName} ${lastName}`,
      body: notes,
      createdAt: new Date(),
    });

    res.status(200).json({ ok: true, inquiryId: inquiry.id });
  } catch (err) {
    console.error("[CTM Webhook] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
