import { Router } from "express";
import { db } from "@workspace/db";
import { users, passwordResetTokens } from "@workspace/db/schema";
import { eq, or, and, gt } from "drizzle-orm";
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
    // Accept login by username OR email
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
    // Explicitly save the session before responding to avoid a race condition
    // where subsequent requests arrive at the server before the async Postgres
    // write completes (particularly problematic in production).
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
  res.json({ id: sess.userId, username: sess.username, name: sess.name, email: sess.email, role: sess.role, initials: sess.initials });
});

// ── Change own password (requires current password) ──────────────────────────
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
    // Validate new password complexity
    if (newPassword.length < 8) {
      res.status(400).json({ error: "New password must be at least 8 characters" });
      return;
    }
    if (!/[A-Z]/.test(newPassword)) {
      res.status(400).json({ error: "New password must contain at least one uppercase letter" });
      return;
    }
    if (!/[0-9]/.test(newPassword)) {
      res.status(400).json({ error: "New password must contain at least one number" });
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.id, sess.userId)).limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
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

// ── Forgot password rate limiter: 5 per 15 min per IP ───────────────────────
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
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase().trim())).limit(1);

    // Always respond with success to prevent email enumeration
    if (!user || user.isActive === false) {
      res.json({ message: "If that email is on file, a reset link has been sent." });
      return;
    }

    // Generate a secure token
    const token = crypto.randomBytes(48).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Invalidate old tokens for this user and insert new one
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));
    await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

    const apiKey = process.env.SENDGRID_API_KEY;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      const appUrl = process.env.APP_URL || "https://admitsimple.com/app";
      const resetLink = `${appUrl}/reset-password?token=${token}`;

      await sgMail.send({
        to: user.email,
        from: { email: "austin@admitsimple.com", name: "AdmitSimple" },
        subject: "Reset your AdmitSimple password",
        text: `Hi ${user.name},\n\nClick the link below to reset your password. This link expires in 1 hour.\n\n${resetLink}\n\nIf you didn't request this, you can safely ignore this email.\n\n— AdmitSimple`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;">
            <h2 style="color:#5BC8DC;">Reset your password</h2>
            <p>Hi ${user.name},</p>
            <p>Click the button below to reset your AdmitSimple password. This link expires in <strong>1 hour</strong>.</p>
            <p style="margin:32px 0;">
              <a href="${resetLink}" style="background:#5BC8DC;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:16px;">Reset Password</a>
            </p>
            <p style="color:#888;font-size:13px;">If the button doesn't work, copy this link:<br/><a href="${resetLink}" style="color:#5BC8DC;">${resetLink}</a></p>
            <p style="color:#888;font-size:13px;">If you didn't request a password reset, you can safely ignore this email.</p>
          </div>
        `,
      });
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
    if (!token || !newPassword) {
      res.status(400).json({ error: "Token and new password are required" });
      return;
    }
    if (newPassword.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          gt(passwordResetTokens.expiresAt, new Date()),
          eq(passwordResetTokens.usedAt, null as any),
        ),
      )
      .limit(1);

    if (!resetToken) {
      res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
      return;
    }

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
