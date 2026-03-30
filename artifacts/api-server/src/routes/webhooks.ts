import { Router } from "express";
import { db } from "@workspace/db";
import { inquiries, activities, settings, users } from "@workspace/db/schema";
import { eq, desc, ilike } from "drizzle-orm";
import { broadcastSSE, sendSSEToUser } from "../lib/sse";

const router = Router();

/**
 * POST /webhooks/ctm
 * Call Tracking Metrics webhook — no session auth required.
 * Secured by a shared secret token checked against X-CTM-Token header.
 *
 * CTM sends application/x-www-form-urlencoded with the following fields:
 *   caller_name, caller_number, tracking_number, call_id, duration,
 *   call_start_time, recording_url, source, location (city/state)
 *   plus: caller_city, caller_state, tracking_label, call_status,
 *         agent_name, agent_email, first_call, keyword
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

    // ── Caller identity ────────────────────────────────────────────────────
    const callerName: string = body.caller_name || body.caller_number_name || "";
    const nameParts = callerName.trim().split(/\s+/);
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "Caller";
    const phone = body.caller_number || "";

    // ── CTM raw fields ─────────────────────────────────────────────────────
    const ctmCallId = body.call_id || null;
    // CTM may send `tracking_number` or `called_number`
    const ctmTrackingNumber = body.tracking_number || body.called_number || null;
    // CTM's traffic source field (e.g. "google_ads", "facebook", "organic")
    const ctmSource = body.source || null;
    const callDurationSeconds = body.duration ? parseInt(body.duration, 10) : null;
    const callRecordingUrl = body.recording_url || null;

    // call_start_time may be ISO string or unix timestamp
    let callDateTime: Date | null = null;
    if (body.call_start_time) {
      const parsed = new Date(
        /^\d+$/.test(body.call_start_time)
          ? parseInt(body.call_start_time, 10) * 1000
          : body.call_start_time
      );
      if (!isNaN(parsed.getTime())) callDateTime = parsed;
    }

    // ── Source / referral mapping ──────────────────────────────────────────
    // referralDetails = raw CTM source as-is (e.g. "google_ads")
    const referralDetails = ctmSource || body.tracking_label || null;

    // Derive human-friendly referralSource and internal onlineSource
    const srcLower = (ctmSource || body.tracking_label || "").toLowerCase();
    let referralSource = "Call Tracking Metrics";
    let onlineSource: string | null = null;

    if (srcLower.includes("google")) {
      const isPPC =
        srcLower.includes("ppc") ||
        srcLower.includes("paid") ||
        srcLower.includes("cpc") ||
        srcLower.includes("adwords") ||
        srcLower.includes("ads") ||
        srcLower === "google_ads";
      const isOrganic =
        srcLower.includes("organic") || srcLower.includes("seo");
      if (isOrganic) {
        referralSource = "Google Organic";
        onlineSource = "google_organic";
      } else {
        referralSource = "Google PPC";
        onlineSource = "google_ppc";
      }
    } else if (srcLower.includes("facebook") || srcLower.includes("fb")) {
      referralSource = "Facebook";
      onlineSource = "facebook";
    } else if (srcLower.includes("bing")) {
      referralSource = "Bing Ads";
      onlineSource = "bing_ppc";
    } else if (srcLower.includes("organic") || srcLower.includes("seo")) {
      referralSource = "Organic Search";
      onlineSource = "organic";
    } else if (srcLower.includes("direct")) {
      referralSource = "Direct";
      onlineSource = "direct";
    } else if (srcLower) {
      referralSource = referralDetails || "Call Tracking Metrics";
      onlineSource = srcLower.replace(/\s+/g, "_");
    }

    // All CTM inquiries originate online
    const referralOrigin = "online";

    // ── Location & extra metadata ──────────────────────────────────────────
    const callerCity = body.caller_city || "";
    const callerState = body.caller_state || "";
    const locationNote = [callerCity, callerState].filter(Boolean).join(", ");
    const trackingLabel = body.tracking_label || "";
    const callStatus = body.call_status || "";
    const agentName = body.agent_name || "";
    const ctmKeyword = body.keyword || body.search_keyword || "";

    // ── Auto-generated initial notes (spec: Call ID, Tracking Number, Duration, Time, Location) ──
    const durationDisplay =
      callDurationSeconds !== null
        ? `${Math.floor(callDurationSeconds / 60)}m ${callDurationSeconds % 60}s`
        : null;

    const callTimeDisplay = callDateTime
      ? callDateTime.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      : null;

    const noteLines = [
      `📞 Inbound call via Call Tracking Metrics`,
      ctmCallId ? `Call ID: ${ctmCallId}` : null,
      ctmTrackingNumber ? `Tracking Number: ${ctmTrackingNumber}` : null,
      trackingLabel && trackingLabel !== ctmTrackingNumber
        ? `Campaign: ${trackingLabel}`
        : null,
      durationDisplay ? `Call Duration: ${durationDisplay}` : null,
      callTimeDisplay ? `Call Time: ${callTimeDisplay}` : null,
      locationNote ? `Caller Location: ${locationNote}` : null,
      ctmSource ? `Ad Source: ${ctmSource}` : null,
      callStatus ? `Call Status: ${callStatus}` : null,
      agentName ? `Answered By: ${agentName}` : null,
    ].filter(Boolean);

    if (callRecordingUrl) {
      noteLines.push(`Recording: ${callRecordingUrl}`);
    }

    const notes = noteLines.join("\n");

    // ── Find existing inquiry by phone (dedup) ─────────────────────────────
    let inquiry: typeof inquiries.$inferSelect | null = null;
    if (phone) {
      const [existing] = await db
        .select()
        .from(inquiries)
        .where(eq(inquiries.phone, phone))
        .orderBy(desc(inquiries.createdAt))
        .limit(1);
      if (existing) inquiry = existing;
    }

    // ── Agent-to-user matching (by name, case-insensitive fuzzy) ────────────
    let assignedUserId: number | null = null;
    if (agentName) {
      const [matchedUser] = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(ilike(users.name, `%${agentName.split(" ")[0]}%`))
        .limit(1);
      if (matchedUser) assignedUserId = matchedUser.id;
    }

    const isDirectlyAssigned = assignedUserId !== null;
    const newCallStatus = isDirectlyAssigned ? "active" : "ringing";

    // ── Create or update inquiry ───────────────────────────────────────────
    const isExisting = inquiry !== null;
    if (inquiry) {
      // Update CTM fields + call ownership on existing inquiry
      await db.update(inquiries).set({
        ctmCallId: ctmCallId ?? inquiry.ctmCallId,
        ctmTrackingNumber: ctmTrackingNumber ?? inquiry.ctmTrackingNumber,
        ctmSource: ctmSource ?? inquiry.ctmSource,
        callDurationSeconds: callDurationSeconds ?? inquiry.callDurationSeconds,
        callRecordingUrl: callRecordingUrl ?? inquiry.callRecordingUrl,
        callDateTime: callDateTime ?? inquiry.callDateTime,
        callStatus: newCallStatus,
        ...(isDirectlyAssigned ? {
          assignedTo: assignedUserId,
          isLocked: true,
          lockedAt: new Date(),
        } : {}),
        updatedAt: new Date(),
      }).where(eq(inquiries.id, inquiry.id));
    } else {
      const [created] = await db
        .insert(inquiries)
        .values({
          firstName,
          lastName,
          phone,
          referralSource,
          referralDetails,
          onlineSource,
          referralOrigin,
          ctmCallId,
          ctmTrackingNumber,
          ctmSource,
          callDurationSeconds,
          callRecordingUrl,
          callDateTime,
          searchKeywords: ctmKeyword || null,
          status: "new",
          priority: "medium",
          notes,
          callStatus: newCallStatus,
          ...(isDirectlyAssigned ? {
            assignedTo: assignedUserId,
            isLocked: true,
            lockedAt: new Date(),
          } : {}),
          updatedAt: new Date(),
        })
        .returning();
      inquiry = created;
    }

    // ── Log call activity ──────────────────────────────────────────────────
    const activityBody = [
      callStatus ? `Status: ${callStatus}` : null,
      durationDisplay ? `Duration: ${durationDisplay}` : null,
      agentName ? `Answered by: ${agentName}` : null,
      locationNote ? `Caller location: ${locationNote}` : null,
      callRecordingUrl ? `Recording: ${callRecordingUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    await db.insert(activities).values({
      inquiryId: inquiry.id,
      type: "call",
      subject: `Inbound call from ${firstName} ${lastName}`,
      body: activityBody || notes,
      createdAt: callDateTime ?? new Date(),
    });

    // ── Broadcast real-time event ──────────────────────────────────────────
    const ssePayload = {
      inquiryId: inquiry.id,
      phone,
      callerName: `${firstName} ${lastName}`.trim(),
      source: ctmSource || referralSource,
      callId: ctmCallId,
      isExisting,
      claimable: !isDirectlyAssigned,
      assignedUserId,
      callStatus: newCallStatus,
      timestamp: new Date().toISOString(),
    };

    if (isDirectlyAssigned && assignedUserId) {
      // Only notify the assigned rep
      sendSSEToUser(assignedUserId, "incoming_call", ssePayload);
    } else {
      // All reps — first to claim wins
      broadcastSSE("incoming_call", ssePayload);
    }

    // ── Auto-miss timer (15 seconds if still ringing) ─────────────────────
    if (!isDirectlyAssigned) {
      const inquiryId = inquiry.id;
      setTimeout(async () => {
        try {
          const [current] = await db
            .select({ callStatus: inquiries.callStatus })
            .from(inquiries)
            .where(eq(inquiries.id, inquiryId));

          if (current?.callStatus === "ringing") {
            await db.update(inquiries).set({
              callStatus: "missed",
              updatedAt: new Date(),
            }).where(eq(inquiries.id, inquiryId));

            broadcastSSE("call_status", {
              inquiryId,
              status: "missed",
            });
          }
        } catch {
          // Non-critical; best-effort
        }
      }, 15000);
    }

    res.status(200).json({ ok: true, inquiryId: inquiry.id });
  } catch (err) {
    console.error("[CTM Webhook] Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
