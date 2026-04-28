import { Router } from "express";
import { db } from "@workspace/db";
import { users, passwordResetTokens, companies } from "@workspace/db/schema";
import { eq, or, and, gt, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import sgMail from "@sendgrid/mail";
import rateLimit from "express-rate-limit";
import { logAudit, getClientIp } from "../lib/audit";

const router = Router();

// ── Login rate limiter: 10 attempts per 15 min per IP ────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Please wait 15 minutes and try again." },
  keyGenerator: (req) => getClientIp(req as any),
});

router.post("/auth/login", loginLimiter, async (req, res) => {
  const ip = getClientIp(req as any);
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }
    const [user] = await db.select().from(users).where(
      or(eq(users.username, username), eq(users.email, username))
    ).limit(1);
    if (!user) {
      await logAudit({ action: "LOGIN_FAILED", details: `Unknown username: ${username}`, ipAddress: ip });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      await logAudit({ userId: user.id, action: "LOGIN_FAILED", details: "Bad password", ipAddress: ip });
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    if (user.isActive === false) {
      await logAudit({ userId: user.id, action: "LOGIN_BLOCKED", details: "Account disabled", ipAddress: ip });
      res.status(403).json({ error: "Your account has been disabled. Please contact an administrator." });
      return;
    }
    const sess = req.session as any;
    sess.userId = user.id;
    sess.username = user.username;
    sess.name = user.name;
    sess.email = user.email;
    sess.role = user.role;
    sess.initials = user.initials;
    sess.companyId = user.companyId ?? 1;
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );
    await logAudit({ userId: user.id, action: "LOGIN_SUCCESS", ipAddress: ip });
    res.json({ id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, initials: user.initials, createdAt: user.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", async (req, res) => {
  const sess = req.session as any;
  const userId = sess?.userId;
  const ip = getClientIp(req as any);
  req.session.destroy(async () => {
    if (userId) await logAudit({ userId, action: "LOGOUT", ipAddress: ip });
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", (req, res) => {
  const sess = req.session as any;
  if (!sess?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ id: sess.userId, username: sess.username, name: sess.name, email: sess.email, role: sess.role, initials: sess.initials, companyId: sess.companyId });
});

// ── Self-serve signup: create company + admin user atomically ─────────────────
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts. Please try again later." },
  keyGenerator: (req) => getClientIp(req as any),
});

router.post("/auth/signup", signupLimiter, async (req, res) => {
  const ip = getClientIp(req as any);
  try {
    const { facilityName, adminName, email, password, username } = req.body;

    if (!facilityName || !adminName || !email || !password) {
      res.status(400).json({ error: "Facility name, admin name, email and password are required" });
      return;
    }

    // Password complexity
    if (password.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }
    if (!/[A-Z]/.test(password)) { res.status(400).json({ error: "Password must contain at least one uppercase letter" }); return; }
    if (!/[0-9]/.test(password)) { res.status(400).json({ error: "Password must contain at least one number" }); return; }

    // Derive slug from facility name
    const slug = facilityName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) + "-" + crypto.randomBytes(3).toString("hex");

    // Derive username from email if not provided
    const derivedUsername = (username || email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "")).slice(0, 100);

    // Check username uniqueness
    const [existing] = await db.select({ id: users.id }).from(users).where(
      or(eq(users.username, derivedUsername), eq(users.email, email.toLowerCase().trim()))
    ).limit(1);
    if (existing) {
      res.status(409).json({ error: "An account with that email or username already exists" });
      return;
    }

    const hashed = await bcrypt.hash(password, 12);
    const parts = adminName.trim().split(/\s+/);
    const initials = parts.length === 1 ? parts[0][0].toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();

    // Atomic: create company then admin user
    const [company] = await db.insert(companies).values({
      name: facilityName.trim(),
      slug,
      plan: "trial",
      isActive: true,
    }).returning();

    const [user] = await db.insert(users).values({
      companyId: company.id,
      username: derivedUsername,
      password: hashed,
      name: adminName.trim(),
      email: email.toLowerCase().trim(),
      role: "admin",
      initials,
      isActive: true,
    }).returning();

    // Auto-login
    const sess = req.session as any;
    sess.userId = user.id;
    sess.username = user.username;
    sess.name = user.name;
    sess.email = user.email;
    sess.role = user.role;
    sess.initials = user.initials;
    sess.companyId = company.id;
    await new Promise<void>((resolve, reject) =>
      req.session.save((err) => (err ? reject(err) : resolve()))
    );

    await logAudit({ userId: user.id, action: "SIGNUP", details: `Company: ${company.name} (id=${company.id})`, ipAddress: ip });

    // Notify Austin of new signup so BAA can be sent
    const sgApiKey = process.env.SENDGRID_API_KEY;
    if (sgApiKey) {
      sgMail.setApiKey(sgApiKey);
      const signupTime = new Date().toLocaleString("en-US", { timeZone: "America/Chicago", dateStyle: "full", timeStyle: "short" });
      try {
        await sgMail.send({
          to: "austin@admitsimple.com",
          from: { email: "austin@admitsimple.com", name: "AdmitSimple Signups" },
          subject: `New signup: ${company.name}`,
          text: [
            `New AdmitSimple trial signup — send the BAA!`,
            ``,
            `Facility:   ${company.name}`,
            `Admin:      ${user.name}`,
            `Email:      ${user.email}`,
            `Signed up:  ${signupTime} (Central)`,
            `Company ID: ${company.id}`,
            ``,
            `Reply to this email or reach them at ${user.email} to send the BAA.`,
          ].join("\n"),
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#f9fafb;border-radius:12px;padding:32px;">
              <h2 style="margin:0 0 4px;color:#1a2233;">New trial signup</h2>
              <p style="margin:0 0 24px;color:#6b7280;font-size:14px;">Send the BAA to this facility.</p>
              <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e5e7eb;">
                <tr><td style="padding:12px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;width:120px;">Facility</td><td style="padding:12px 16px;font-weight:600;color:#1a2233;border-bottom:1px solid #f3f4f6;">${company.name}</td></tr>
                <tr><td style="padding:12px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">Admin</td><td style="padding:12px 16px;font-weight:600;color:#1a2233;border-bottom:1px solid #f3f4f6;">${user.name}</td></tr>
                <tr><td style="padding:12px 16px;color:#6b7280;font-size:13px;border-bottom:1px solid #f3f4f6;">Email</td><td style="padding:12px 16px;border-bottom:1px solid #f3f4f6;"><a href="mailto:${user.email}" style="color:#5BC8DC;font-weight:600;">${user.email}</a></td></tr>
                <tr><td style="padding:12px 16px;color:#6b7280;font-size:13px;">Signed up</td><td style="padding:12px 16px;color:#1a2233;">${signupTime} (Central)</td></tr>
              </table>
              <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;">Company ID: ${company.id} &mdash; reply directly to reach ${user.email}</p>
            </div>
          `,
          replyTo: user.email,
        });
        req.log.info({ to: "austin@admitsimple.com", company: company.name }, "New signup notification sent");
      } catch (sgErr: any) {
        req.log.error({ sgErr: sgErr?.response?.body ?? sgErr?.message }, "Signup notification email failed");
      }
    }

    res.status(201).json({
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
      initials: user.initials,
      companyId: company.id,
      companyName: company.name,
    });
  } catch (err: any) {
    req.log.error(err);
    if (err.code === "23505") {
      res.status(409).json({ error: "An account with that email or username already exists" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Change own password ───────────────────────────────────────────────────────
const changePwLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many password change attempts. Please wait 15 minutes." },
  keyGenerator: (req) => getClientIp(req as any),
});

router.post("/auth/change-password", changePwLimiter, async (req, res) => {
  const sess = req.session as any;
  const ip = getClientIp(req as any);
  if (!sess?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: "Current password and new password are required" });
      return;
    }
    if (newPassword.length < 8) { res.status(400).json({ error: "New password must be at least 8 characters" }); return; }
    if (!/[A-Z]/.test(newPassword)) { res.status(400).json({ error: "New password must contain at least one uppercase letter" }); return; }
    if (!/[0-9]/.test(newPassword)) { res.status(400).json({ error: "New password must contain at least one number" }); return; }

    const [user] = await db.select().from(users).where(eq(users.id, sess.userId)).limit(1);
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      await logAudit({ userId: user.id, action: "PASSWORD_CHANGE_FAILED", details: "Incorrect current password", ipAddress: ip });
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
    const hashed = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ password: hashed }).where(eq(users.id, user.id));
    await logAudit({ userId: user.id, action: "PASSWORD_CHANGED", details: "User changed own password", ipAddress: ip });
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ── Forgot password ───────────────────────────────────────────────────────────
const forgotPwLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait 15 minutes and try again." },
  keyGenerator: (req) => getClientIp(req as any),
});

router.post("/auth/forgot-password", forgotPwLimiter, async (req, res) => {
  const ip = getClientIp(req as any);
  try {
    const { email } = req.body;
    if (!email) { res.status(400).json({ error: "Email is required" }); return; }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);
    if (!user || user.isActive === false) {
      res.json({ message: "If that email is on file, a reset link has been sent." });
      return;
    }

    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
    await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      const appUrl = process.env.APP_URL || "https://admitsimple.com/app";
      const resetLink = `${appUrl}/reset-password?token=${token}`;
      try {
        const [sgResponse] = await sgMail.send({
          to: user.email,
          from: { email: "austin@admitsimple.com", name: "AdmitSimple" },
          subject: "Reset your AdmitSimple password",
          text: `Hi ${user.name},\n\nClick the link below to reset your password. This link expires in 1 hour.\n\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.\n\n— AdmitSimple`,
          html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;"><h2 style="color:#5BC8DC;">Reset your password</h2><p>Hi ${user.name},</p><p>Click the button below to reset your AdmitSimple password. This link expires in <strong>1 hour</strong>.</p><p style="margin:32px 0;"><a href="${resetLink}" style="background:#5BC8DC;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Reset Password</a></p><p style="color:#888;font-size:13px;">If you didn't request a password reset, you can safely ignore this email.</p></div>`,
        });
        req.log.info({ statusCode: sgResponse.statusCode, to: user.email }, "Password reset email sent");
      } catch (sgErr: any) {
        req.log.error({ sgErr: sgErr?.response?.body ?? sgErr?.message }, "SendGrid failed");
      }
    } else {
      req.log.warn("SENDGRID_API_KEY not set");
    }

    await logAudit({ userId: user.id, action: "PASSWORD_RESET_REQUESTED", ipAddress: ip });
    res.json({ message: "If that email is on file, a reset link has been sent." });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  const ip = getClientIp(req as any);
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) { res.status(400).json({ error: "Token and new password are required" }); return; }
    if (newPassword.length < 8) { res.status(400).json({ error: "Password must be at least 8 characters" }); return; }

    const [resetToken] = await db
      .select().from(passwordResetTokens)
      .where(and(eq(passwordResetTokens.token, token), gt(passwordResetTokens.expiresAt, new Date()), isNull(passwordResetTokens.usedAt)))
      .limit(1);
    if (!resetToken) { res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." }); return; }

    const hashed = await bcrypt.hash(newPassword, 12);
    await db.update(users).set({ password: hashed }).where(eq(users.id, resetToken.userId));
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, resetToken.id));

    await logAudit({ userId: resetToken.userId, action: "PASSWORD_RESET_SUCCESS", ipAddress: ip });
    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
