import { Router } from "express";
import { db } from "@workspace/db";
import { referralSources, inquiries } from "@workspace/db/schema";
import { eq, count, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

const router = Router();
router.use(requireAuth);

router.get("/referrals", async (req, res) => {
  try {
    const sources = await db.select().from(referralSources).orderBy(referralSources.name);
    const result = await Promise.all(sources.map(async (s) => {
      const [inqCount] = await db.select({ count: count() }).from(inquiries).where(eq(inquiries.referralSource, s.name));
      const [admittedCount] = await db.select({ count: count() }).from(inquiries).where(and(eq(inquiries.referralSource, s.name), eq(inquiries.status, "admitted")));
      const total = inqCount?.count || 0;
      const admitted = admittedCount?.count || 0;
      return {
        ...s,
        inquiryCount: Number(total),
        conversionRate: total > 0 ? Math.round((Number(admitted) / Number(total)) * 100) : 0,
      };
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referrals", async (req, res) => {
  try {
    const data = req.body;
    const [row] = await db.insert(referralSources).values({
      name: data.name,
      type: data.type,
      contact: data.contact,
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes,
    }).returning();
    res.status(201).json({ ...row, inquiryCount: 0, conversionRate: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/referrals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const update: any = {};
    const fields = ["name","type","contact","phone","email","address","notes","isActive"];
    fields.forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });
    const [row] = await db.update(referralSources).set(update).where(eq(referralSources.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...row, inquiryCount: 0, conversionRate: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/referrals/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(referralSources).where(eq(referralSources.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
