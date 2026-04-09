import { Router } from "express";
import sgMail from "@sendgrid/mail";
import { logger } from "../lib/logger";

const router = Router();

router.post("/demo-request", async (req, res) => {
  const { name, facility, email, phone, notes } = req.body;

  if (!name || !facility || !email || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      const [response] = await sgMail.send({
        to: "austin@admitsimple.com",
        from: "austin@admitsimple.com",
        subject: `Demo Request: ${name} at ${facility}`,
        text: [
          `New demo request from admitsimple.com`,
          ``,
          `Name:     ${name}`,
          `Facility: ${facility}`,
          `Email:    ${email}`,
          `Phone:    ${phone}`,
          notes ? `Notes:    ${notes}` : null,
        ]
          .filter((l) => l !== null)
          .join("\n"),
        html: `
          <h2 style="color:#5BC8DC;">New Demo Request</h2>
          <table style="font-family:sans-serif;font-size:15px;border-collapse:collapse;">
            <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600;">Name</td><td>${name}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600;">Facility</td><td>${facility}</td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600;">Email</td><td><a href="mailto:${email}">${email}</a></td></tr>
            <tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600;">Phone</td><td><a href="tel:${phone}">${phone}</a></td></tr>
            ${notes ? `<tr><td style="padding:6px 16px 6px 0;color:#666;font-weight:600;vertical-align:top;">Notes</td><td>${notes}</td></tr>` : ""}
          </table>
        `,
      });
      logger.info({ statusCode: response.statusCode }, "SendGrid response");
    } else {
      logger.warn("SENDGRID_API_KEY not set — skipping email notification");
    }

    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, "Failed to send demo request email");
    return res.status(500).json({ error: "Failed to send request" });
  }
});

export default router;
