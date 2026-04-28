import { Router } from "express";
import twilio from "twilio";
import { db } from "@workspace/db";
import { smsMessages, inquiries, activities } from "@workspace/db/schema";
import { eq, desc, sql, isNull, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { broadcastSSEToCompany } from "../lib/sse";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();

// ── GET /api/sms/threads ──────────────────────────────────────────────────────
router.get("/sms/threads", requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
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
         WHERE u.phone = m.phone AND u.direction = 'inbound' AND u.read_at IS NULL
           AND u.company_id = ${companyId}) AS unread_count
      FROM sms_messages m
      LEFT JOIN inquiries i ON i.id = m.inquiry_id
      WHERE m.company_id = ${companyId}
        AND m.id IN (
          SELECT DISTINCT ON (phone) id
          FROM sms_messages
          WHERE company_id = ${companyId}
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

// ── GET /api/sms/thread/:phone ────────────────────────────────────────────────
router.get("/sms/thread/:phone", requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const phone = decodeURIComponent(req.params.phone);
    const msgs = await db
      .select()
      .from(smsMessages)
      .where(and(eq(smsMessages.phone, phone), eq(smsMessages.companyId, companyId)))
      .orderBy(smsMessages.createdAt);

    await db
      .update(smsMessages)
      .set({ readAt: new Date() })
      .where(
        and(
          eq(smsMessages.companyId, companyId),
          sql`${smsMessages.phone} = ${phone}
              AND ${smsMessages.direction} = 'inbound'
              AND ${smsMessages.readAt} IS NULL`
        )
      );

    res.json(msgs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load conversation" });
  }
});

// ── POST /api/sms/send ────────────────────────────────────────────────────────
router.post("/sms/send", requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
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

    let resolvedInquiryId = rawInquiryId ?? null;
    if (!resolvedInquiryId) {
      const [found] = await db
        .select({ id: inquiries.id })
        .from(inquiries)
        .where(and(eq(inquiries.phone, to), eq(inquiries.companyId, companyId)))
        .orderBy(desc(inquiries.createdAt))
        .limit(1);
      if (found) resolvedInquiryId = found.id;
    }

    const client = twilio(accountSid, authToken);
    const msg = await client.messages.create({ body: message, from, to });

    const [saved] = await db.insert(smsMessages).values({
      companyId,
      phone: to,
      direction: "outbound",
      body: message,
      twilioSid: msg.sid,
      status: "sent",
      inquiryId: resolvedInquiryId,
      userId: (req as any).session?.userId ?? null,
    }).returning();

    if (resolvedInquiryId) {
      try {
        await db.insert(activities).values({
          companyId,
          inquiryId: resolvedInquiryId,
          userId: (req as any).session?.userId ?? null,
          type: "sms",
          subject: `SMS sent to ${to}`,
          body: message,
        });
      } catch { /* best-effort */ }
    }

    broadcastSSEToCompany(companyId, "sms_message", { message: saved, phone: to, direction: "outbound" });
    res.json({ ok: true, sid: msg.sid, message: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send SMS" });
  }
});

// ── GET /api/sms/unread-count ─────────────────────────────────────────────────
router.get("/sms/unread-count", requireAuth, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(smsMessages)
      .where(and(eq(smsMessages.companyId, companyId), eq(smsMessages.direction, "inbound"), isNull(smsMessages.readAt)));
    res.json({ count });
  } catch (err) {
    console.error("[SMS unread-count]", err);
    res.status(500).json({ count: 0 });
  }
});

// ── POST /api/webhooks/twilio/sms — public Twilio webhook ─────────────────────
// No requireAuth — routed from Twilio. Uses company_id=1 (default) for new contacts.
// In production, resolve company from Twilio phone number mapping.
router.post("/webhooks/twilio/sms", async (req, res) => {
  try {
    const { From: from, Body: body, MessageSid } = req.body as Record<string, string>;

    if (!from || !body) {
      res.status(400).send("Bad Request");
      return;
    }

    const defaultCompanyId = 1;

    let [inquiry] = await db
      .select({ id: inquiries.id, firstName: inquiries.firstName, lastName: inquiries.lastName })
      .from(inquiries)
      .where(eq(inquiries.phone, from))
      .orderBy(desc(inquiries.createdAt))
      .limit(1);

    if (!inquiry) {
      const [created] = await db.insert(inquiries).values({
        companyId: defaultCompanyId,
        firstName: "Unknown",
        lastName: "Caller",
        phone: from,
        referralSource: "SMS",
        referralOrigin: "online",
        status: "new",
        priority: "medium",
        updatedAt: new Date(),
      }).returning({ id: inquiries.id, firstName: inquiries.firstName, lastName: inquiries.lastName });

      const inquiryNum = `INQ-${created.id.toString().padStart(6, "0")}`;
      await db.update(inquiries).set({ inquiryNumber: inquiryNum }).where(eq(inquiries.id, created.id));
      inquiry = created;
    }

    // Get company_id from existing inquiry
    const [inqFull] = await db.select({ companyId: inquiries.companyId }).from(inquiries).where(eq(inquiries.id, inquiry.id));
    const companyId = inqFull?.companyId ?? defaultCompanyId;

    const [saved] = await db.insert(smsMessages).values({
      companyId,
      phone: from,
      direction: "inbound",
      body,
      twilioSid: MessageSid,
      status: "received",
      inquiryId: inquiry.id,
    }).returning();

    try {
      await db.insert(activities).values({
        companyId,
        inquiryId: inquiry.id,
        type: "sms",
        subject: `Inbound SMS from ${inquiry.firstName} ${inquiry.lastName} (${from})`,
        body,
      });
    } catch { /* best-effort */ }

    broadcastSSEToCompany(companyId, "sms_message", {
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
