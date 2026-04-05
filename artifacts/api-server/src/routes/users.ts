import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth } from "../lib/requireAuth";
import { requireAdmin } from "../lib/requireAdmin";
import { logAudit, getClientIp } from "../lib/audit";

const router = Router();
router.use(requireAuth);

function makeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function validatePassword(password: string): string | null {
  if (!password || password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
}

const safeSelect = {
  id: users.id,
  username: users.username,
  name: users.name,
  email: users.email,
  role: users.role,
  initials: users.initials,
  isActive: users.isActive,
  createdAt: users.createdAt,
};

router.get("/users", async (req, res) => {
  try {
    const result = await db.select(safeSelect).from(users);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", requireAdmin, async (req, res) => {
  const ip = getClientIp(req as any);
  const sess = req.session as any;
  try {
    const { username, password, name, email, role } = req.body;
    if (!name || !email) {
      res.status(400).json({ error: "Name and email are required" });
      return;
    }
    const pwError = validatePassword(password);
    if (pwError) {
      res.status(400).json({ error: pwError });
      return;
    }
    const derivedUsername = username || email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
    const hashed = await bcrypt.hash(password, 12);
    const initials = makeInitials(name);
    const [user] = await db.insert(users).values({
      username: derivedUsername,
      password: hashed,
      name,
      email,
      role: role || "admissions",
      initials,
      isActive: true,
    }).returning();
    await logAudit({ userId: sess.userId, action: "USER_CREATED", resourceType: "user", resourceId: user.id, details: `Created user ${user.username}`, ipAddress: ip });
    res.status(201).json({
      id: user.id, username: user.username, name: user.name,
      email: user.email, role: user.role, initials: user.initials,
      isActive: user.isActive, createdAt: user.createdAt,
    });
  } catch (err: any) {
    req.log.error(err);
    if (err.code === "23505") {
      res.status(409).json({ error: "Username or email already exists" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id", requireAdmin, async (req, res) => {
  const ip = getClientIp(req as any);
  const sess = req.session as any;
  try {
    const id = parseInt(req.params.id);
    const { name, email, role, password } = req.body;
    const update: any = {};
    if (name) { update.name = name; update.initials = makeInitials(name); }
    if (email) update.email = email;
    if (role) update.role = role;
    if (password) {
      const pwError = validatePassword(password);
      if (pwError) {
        res.status(400).json({ error: pwError }); return;
      }
      update.password = await bcrypt.hash(password, 12);
    }
    const [user] = await db.update(users).set(update).where(eq(users.id, id)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await logAudit({ userId: sess.userId, action: "USER_UPDATED", resourceType: "user", resourceId: id, ipAddress: ip });
    res.json({
      id: user.id, username: user.username, name: user.name,
      email: user.email, role: user.role, initials: user.initials,
      isActive: user.isActive, createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Toggle active status
router.patch("/users/:id/toggle-active", requireAdmin, async (req, res) => {
  const ip = getClientIp(req as any);
  const sess = req.session as any;
  try {
    const id = parseInt(req.params.id);
    if (id === sess.userId) {
      res.status(400).json({ error: "Cannot deactivate your own account" }); return;
    }
    const [current] = await db.select({ isActive: users.isActive }).from(users).where(eq(users.id, id));
    if (!current) { res.status(404).json({ error: "User not found" }); return; }
    const [user] = await db.update(users).set({ isActive: !current.isActive }).where(eq(users.id, id)).returning();
    await logAudit({ userId: sess.userId, action: current.isActive ? "USER_DEACTIVATED" : "USER_ACTIVATED", resourceType: "user", resourceId: id, ipAddress: ip });
    res.json({
      id: user.id, username: user.username, name: user.name,
      email: user.email, role: user.role, initials: user.initials,
      isActive: user.isActive, createdAt: user.createdAt,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Reset password (admin only)
router.patch("/users/:id/reset-password", requireAdmin, async (req, res) => {
  const ip = getClientIp(req as any);
  const sess = req.session as any;
  try {
    const id = parseInt(req.params.id);
    const { password } = req.body;
    const pwError = validatePassword(password);
    if (pwError) {
      res.status(400).json({ error: pwError }); return;
    }
    const hashed = await bcrypt.hash(password, 12);
    const [user] = await db.update(users).set({ password: hashed }).where(eq(users.id, id)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    await logAudit({ userId: sess.userId, action: "PASSWORD_RESET", resourceType: "user", resourceId: id, ipAddress: ip });
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", requireAdmin, async (req, res) => {
  const ip = getClientIp(req as any);
  const sess = req.session as any;
  try {
    const id = parseInt(req.params.id);
    if (id === sess.userId) {
      res.status(400).json({ error: "Cannot delete your own account" }); return;
    }
    await db.delete(users).where(eq(users.id, id));
    await logAudit({ userId: sess.userId, action: "USER_DELETED", resourceType: "user", resourceId: id, ipAddress: ip });
    res.json({ message: "User deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
