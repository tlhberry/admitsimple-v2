import { Router } from "express";
import twilio from "twilio";
import { logger } from "../lib/logger";

const router = Router();

router.post("/demo-request", async (req, res) => {
  const { name, facility, email, phone, notes } = req.body;

  if (!name || !facility || !email || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const toNumber = "+17133035724";

    if (accountSid && authToken && fromNumber) {
      const client = twilio(accountSid, authToken);
      const body = [
        `New Demo Request from AdmitSimple`,
        `Name: ${name}`,
        `Facility: ${facility}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        notes ? `Notes: ${notes}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      await client.messages.create({ body, from: fromNumber, to: toNumber });
    } else {
      logger.warn("Twilio env vars not set — skipping SMS notification");
    }

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to send demo request SMS");
    return res.status(500).json({ error: "Failed to send request" });
  }
});

export default router;
