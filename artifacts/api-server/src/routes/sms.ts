import { Router } from "express";
import twilio from "twilio";
import { db } from "@workspace/db";
import { smsMessages, inquiries, activities } from "@workspace/db/schema";
import { eq, desc, sql, isNull, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { broadcastSSE } from "../lib/sse";

const router = Router();

// ── GET /api/sms/threads — thread list (latest message per phone) ──────────────
router.get("/sms/threads", requireAuth, async (req, res) => {
  try {
    // Latest message per phone via DISTINCT ON
    const rows = await db.execute(sql`
      SELECT
        m.id,
        m.phone,
        m.direction,
        m.body,
        m.status,
        m.created_at,
        m.read_at,
        m.inquiry_id,
        i.first_name,
        i.last_name,
        (SELECT COUNT(*) FROM sms_messages u
         WHERE u.phone = m.phone AND u.direction = 'inbound' AND u.read_at IS NULL) AS unread_count
      FROM sms_messages m
      LEFT JOIN inquiries i ON i.id = m.inquiry_id
      WHERE m.id IN (
        SELECT DISTINCT ON (phone) id
        FROM sms_messages
        ORDER BY phone, created_at DESC
      )
      ORDER BY m.created_at DESC
      LIMIT 50
    `);
    res.json(rows.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load threads" });
  }
});

// ── GET /api/sms/thread/:phone — full conversation for a number ───────────────
router.get("/sms/thread/:phone", requireAuth, async (req, res) => {
  try {
    const phone = decodeURIComponent(req.params.phone);
    const msgs = await db
      .select()
      .from(smsMessages)
      .where(eq(smsMessages.phone, phone))
      .orderBy(smsMessages.createdAt);

    // Mark inbound messages as read
    await db
      .update(smsMessages)
      .set({ readAt: new Date() })
      .where(
        sql`${smsMessages.phone} = ${phone}
            AND ${smsMessages.direction} = 'inbound'
            AND ${smsMessages.readAt} IS NULL`
      );

    res.json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

// ── POST /api/sms/send — send outbound SMS + save to DB ──────────────────────
router.post("/sms/send", requireAuth, async (req, res) => {
  try {
    const { to, message, inquiryId: rawInquiryId } = req.body as {
      to?: string; message?: string; inquiryId?: number;
    };
    if (!to || !message) {
      res.status(400).json({ error: "to and message are required" });
      return;
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken  = process.env.TWILIO_AUTH_TOKEN;
    const from       = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !from) {
      res.status(503).json({ error: "Twilio not configured" });
      return;
    }

    // Resolve inquiry
    let resolvedInquiryId = rawInquiryId ?? null;
    if (!resolvedInquiryId) {
      const [found] = await db
        .select({ id: inquiries.id })
        .from(inquiries)
        .where(eq(inquiries.phone, to))
        .orderBy(desc(inquiries.createdAt))
        .limit(1);
      if (found) resolvedInquiryId = found.id;
    }

    // Send via Twilio
    const client = twilio(accountSid, authToken);
    const msg = await client.messages.create({ body: message, from, to });

    // Save to smsMessages
    const [saved] = await db.insert(smsMessages).values({
      phone: to,
      direction: "outbound",
      body: message,
      twilioSid: msg.sid,
      status: "sent",
      inquiryId: resolvedInquiryId,
      userId: (req as any).session?.userId ?? null,
    }).returning();

    // Log activity on inquiry
    if (resolvedInquiryId) {
      try {
        await db.insert(activities).values({
          inquiryId: resolvedInquiryId,
          userId: (req as any).session?.userId ?? null,
          type: "sms",
          subject: `SMS sent to ${to}`,
          body: message,
        });
      } catch { /* best-effort */ }
    }

    // Broadcast so other tabs/users see the sent message
    broadcastSSE("sms_message", {
      message: saved,
      phone: to,
      direction: "outbound",
    });

    res.json({ ok: true, sid: msg.sid, message: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send SMS" });
  }
});

// ── GET /api/sms/unread-count — global unread inbound SMS count ──────────────
router.get("/sms/unread-count", requireAuth, async (_req, res) => {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(smsMessages)
      .where(and(eq(smsMessages.direction, "inbound"), isNull(smsMessages.readAt)));
    res.json({ count });
  } catch (err) {
    console.error("[SMS unread-count]", err);
    res.status(500).json({ count: 0 });
  }
});

// ── POST /api/webhooks/twilio/sms — inbound SMS from Twilio ──────────────────
// No requireAuth — Twilio webhook
router.post("/webhooks/twilio/sms", async (req, res) => {
  try {
    const { From: from, Body: body, MessageSid } = req.body as Record<string, string>;

    if (!from || !body) {
      res.status(400).send("Bad Request");
      return;
    }

    // Find matching inquiry by phone
    let [inquiry] = await db
      .select({ id: inquiries.id, firstName: inquiries.firstName, lastName: inquiries.lastName })
      .from(inquiries)
      .where(eq(inquiries.phone, from))
      .orderBy(desc(inquiries.createdAt))
      .limit(1);

    // Auto-create inquiry if none exists (mirrors voice webhook behavior)
    if (!inquiry) {
      const [created] = await db.insert(inquiries).values({
        firstName: "Unknown",
        lastName:  "Caller",
        phone:     from,
        referralSource: "SMS",
        referralOrigin: "online",
        status:    "new",
        priority:  "medium",
        updatedAt: new Date(),
      }).returning({ id: inquiries.id, firstName: inquiries.firstName, lastName: inquiries.lastName });

      // Assign inquiry number
      const inquiryNum = `INQ-${created.id.toString().padStart(6, "0")}`;
      await db.update(inquiries).set({ inquiryNumber: inquiryNum }).where(eq(inquiries.id, created.id));

      inquiry = created;
    }

    const [saved] = await db.insert(smsMessages).values({
      phone: from,
      direction: "inbound",
      body,
      twilioSid: MessageSid,
      status: "received",
      inquiryId: inquiry.id,
    }).returning();

    // Log activity
    try {
      await db.insert(activities).values({
        inquiryId: inquiry.id,
        type: "sms",
        subject: `Inbound SMS from ${inquiry.firstName} ${inquiry.lastName} (${from})`,
        body,
      });
    } catch { /* best-effort */ }

    broadcastSSE("sms_message", {
      message: saved,
      phone: from,
      direction: "inbound",
      contactName: `${inquiry.firstName} ${inquiry.lastName}`,
    });

    res.setHeader("Content-Type", "text/xml");
    res.send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  } catch (err) {
    console.error("[Twilio SMS]", err);
    res.setHeader("Content-Type", "text/xml");
    res.status(500).send(`<?xml version="1.0" encoding="UTF-8"?><Response></Response>`);
  }
});

export default router;
