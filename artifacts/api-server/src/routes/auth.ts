import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
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
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
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

export default router;
