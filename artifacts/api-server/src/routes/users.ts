import { Router } from "express";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

router.use(requireAuth);

router.get("/users", async (req, res) => {
  try {
    const result = await db.select({
      id: users.id,
      username: users.username,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/users", async (req, res) => {
  try {
    const { username, password, name, email, role } = req.body;
    if (!username || !password || !name || !email) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const hashed = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({ username, password: hashed, name, email, role: role || "staff" }).returning();
    res.status(201).json({ id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
  } catch (err: any) {
    req.log.error(err);
    if (err.code === "23505") {
      res.status(409).json({ error: "Username already exists" });
      return;
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, email, role, password } = req.body;
    const update: any = {};
    if (name) update.name = name;
    if (email) update.email = email;
    if (role) update.role = role;
    if (password) update.password = await bcrypt.hash(password, 12);
    const [user] = await db.update(users).set(update).where(eq(users.id, id)).returning();
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    res.json({ id: user.id, username: user.username, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(users).where(eq(users.id, id));
    res.json({ message: "User deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
