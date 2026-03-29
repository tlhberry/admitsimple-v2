import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const router = Router();

router.post("/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: "Username and password required" });
      return;
    }
    const [user] = await db.select().from(users).where(eq(users.username, username)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }
    const sess = req.session as any;
    sess.userId = user.id;
    sess.username = user.username;
    sess.name = user.name;
    sess.email = user.email;
    sess.role = user.role;
    res.json({ id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Logged out" });
  });
});

router.get("/auth/me", (req, res) => {
  const sess = req.session as any;
  if (!sess?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  res.json({ id: sess.userId, username: sess.username, name: sess.name, email: sess.email, role: sess.role });
});

export default router;
