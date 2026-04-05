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

export default router;
