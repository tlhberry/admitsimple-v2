import { Router } from "express";
import { db } from "@workspace/db";
import { referralSources, inquiries, users, referralAccounts, referralContacts } from "@workspace/db/schema";
import { eq, count, and, sql } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { logAudit } from "../lib/logAudit";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();
router.use(requireAuth);

router.get("/referrals", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const sources = await db
      .select({
        id: referralSources.id,
        name: referralSources.name,
        type: referralSources.type,
        contact: referralSources.contact,
        phone: referralSources.phone,
        email: referralSources.email,
        address: referralSources.address,
        notes: referralSources.notes,
        isActive: referralSources.isActive,
        ownedByUserId: referralSources.ownedByUserId,
        ownerName: users.name,
        createdAt: referralSources.createdAt,
      })
      .from(referralSources)
      .leftJoin(users, eq(referralSources.ownedByUserId, users.id))
      .where(eq(referralSources.companyId, companyId))
      .orderBy(referralSources.name);

    const result = await Promise.all(sources.map(async (s) => {
      const [inqCount] = await db.select({ count: count() }).from(inquiries).where(and(eq(inquiries.companyId, companyId), eq(inquiries.referralSource, s.name)));
      const [admittedCount] = await db.select({ count: count() }).from(inquiries).where(and(eq(inquiries.companyId, companyId), eq(inquiries.referralSource, s.name), eq(inquiries.status, "admitted")));
      const total = inqCount?.count || 0;
      const admitted = admittedCount?.count || 0;
      return { ...s, inquiryCount: Number(total), conversionRate: total > 0 ? Math.round((Number(admitted) / Number(total)) * 100) : 0 };
    }));
    res.json(result);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/referrals", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const data = req.body;
    const sess = req.session as any;
    const [row] = await db.insert(referralSources).values({
      companyId,
      name: data.name,
      type: data.type,
      contact: data.contact,
      phone: data.phone,
      email: data.email,
      address: data.address,
      notes: data.notes,
      ownedByUserId: sess?.userId || null,
    }).returning();
    await logAudit(req, "Created Referral Source", "referral_source", row.id);
    res.status(201).json({ ...row, inquiryCount: 0, conversionRate: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/referrals/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const data = req.body;
    const sess = req.session as any;
    const isAdmin = sess?.role === "admin";
    const update: any = {};
    const fields = ["name","type","contact","phone","email","address","notes","isActive"];
    fields.forEach(f => { if (data[f] !== undefined) update[f] = data[f]; });
    if (data.ownedByUserId !== undefined && isAdmin) {
      update.ownedByUserId = data.ownedByUserId ? parseInt(data.ownedByUserId) : null;
    }
    const [row] = await db.update(referralSources).set(update).where(and(eq(referralSources.id, id), eq(referralSources.companyId, companyId))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    await logAudit(req, "Updated Referral Source", "referral_source", id);
    res.json({ ...row, inquiryCount: 0, conversionRate: 0 });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/referrals/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    await db.delete(referralSources).where(and(eq(referralSources.id, id), eq(referralSources.companyId, companyId)));
    await logAudit(req, "Deleted Referral Source", "referral_source", id);
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/referral-suggestions", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const [sources, accounts, pastInquiries] = await Promise.all([
      db.select({ name: referralSources.name, contact: referralSources.contact, phone: referralSources.phone })
        .from(referralSources).where(eq(referralSources.companyId, companyId)).orderBy(referralSources.name),
      db.select({ name: referralAccounts.name }).from(referralAccounts).where(eq(referralAccounts.companyId, companyId)).orderBy(referralAccounts.name),
      db.selectDistinct({ name: inquiries.referralSource })
        .from(inquiries)
        .where(and(eq(inquiries.companyId, companyId), sql`${inquiries.referralSource} IS NOT NULL AND ${inquiries.referralSource} != ''`)),
    ]);

    const seen = new Set<string>();
    const results: { name: string; type: string; contact?: string; phone?: string }[] = [];

    for (const s of sources) {
      if (s.name && !seen.has(s.name.toLowerCase())) {
        seen.add(s.name.toLowerCase());
        results.push({ name: s.name, type: "source", contact: s.contact || undefined, phone: s.phone || undefined });
      }
    }
    for (const a of accounts) {
      if (a.name && !seen.has(a.name.toLowerCase())) {
        seen.add(a.name.toLowerCase());
        results.push({ name: a.name, type: "account" });
      }
    }
    for (const p of pastInquiries) {
      if (p.name && !seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        results.push({ name: p.name, type: "past" });
      }
    }

    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/referral-contact-suggestions", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const sourceName = (req.query.source as string || "").trim();
    if (!sourceName) { res.json([]); return; }

    const [rsContacts, bdContacts] = await Promise.all([
      db.select({ name: referralSources.contact, phone: referralSources.phone })
        .from(referralSources)
        .where(and(eq(referralSources.companyId, companyId), sql`LOWER(${referralSources.name}) = LOWER(${sourceName})`))
        .limit(5),
      db.select({ name: referralContacts.name, phone: referralContacts.phone })
        .from(referralContacts)
        .leftJoin(referralAccounts, eq(referralContacts.accountId, referralAccounts.id))
        .where(and(eq(referralAccounts.companyId, companyId), sql`LOWER(${referralAccounts.name}) = LOWER(${sourceName})`))
        .orderBy(referralContacts.name),
    ]);

    const seen = new Set<string>();
    const results: { name: string; phone?: string }[] = [];
    for (const c of [...rsContacts, ...bdContacts]) {
      if (c.name && !seen.has(c.name.toLowerCase())) {
        seen.add(c.name.toLowerCase());
        results.push({ name: c.name, phone: c.phone || undefined });
      }
    }
    res.json(results);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
