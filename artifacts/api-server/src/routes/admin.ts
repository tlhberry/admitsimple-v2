import { Router } from "express";
import { db } from "@workspace/db";
import { referralSources } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import multer from "multer";
import * as XLSX from "xlsx";
import { getAnthropicClient } from "../lib/anthropicClient";
import { logAudit } from "../lib/logAudit";

const router = Router();
router.use(requireAuth);

// Admin-only guard
function requireAdmin(req: any, res: any, next: any) {
  const sess = req.session as any;
  if (sess?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const allowed = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/octet-stream",
    ];
    const ext = (file.originalname || "").toLowerCase();
    if (allowed.includes(file.mimetype) || ext.endsWith(".csv") || ext.endsWith(".xlsx") || ext.endsWith(".xls")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV, XLS, and XLSX files are supported"));
    }
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseFile(buffer: Buffer, originalName: string): { headers: string[]; rows: Record<string, string>[] } {
  const ext = originalName.toLowerCase();

  if (ext.endsWith(".csv")) {
    // Use XLSX to parse CSV too (handles encoding well)
    const wb = XLSX.read(buffer, { type: "buffer", raw: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
    if (data.length === 0) return { headers: [], rows: [] };
    const headers = Object.keys(data[0]);
    return { headers, rows: data as Record<string, string>[] };
  }

  // Excel
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
  if (data.length === 0) return { headers: [], rows: [] };
  const headers = Object.keys(data[0]);
  return { headers, rows: data as Record<string, string>[] };
}

const TARGET_FIELDS = [
  "facility_name",
  "contact_name",
  "phone",
  "email",
  "address",
  "city",
  "state",
  "level_of_care",
  "notes",
] as const;

type TargetField = typeof TARGET_FIELDS[number];
type FieldMapping = Partial<Record<TargetField, string>>;

async function aiMapColumns(headers: string[], sampleRows: Record<string, string>[]): Promise<FieldMapping> {
  const sampleJson = JSON.stringify(sampleRows.slice(0, 5), null, 2);
  const prompt = `You are a data import assistant. Given these spreadsheet column headers and sample data, map each column to the most appropriate field.

Available target fields:
- facility_name: Name of the treatment center or referral facility
- contact_name: Contact person's full name
- phone: Phone number
- email: Email address
- address: Street address
- city: City
- state: State (2-letter code)
- level_of_care: Level of care (e.g., detox, residential, PHP, IOP, outpatient)
- notes: Any additional notes or comments

Column headers: ${JSON.stringify(headers)}

Sample data (first 5 rows):
${sampleJson}

Return ONLY a valid JSON object mapping target field names to the column header that best matches. Only include mappings where you are reasonably confident. Example:
{
  "facility_name": "Organization Name",
  "phone": "Phone Number",
  "email": "Email"
}`;

  try {
    const anthropic = await getAnthropicClient();
    const response = await anthropic.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "{}";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return {};
    return JSON.parse(jsonMatch[0]) as FieldMapping;
  } catch {
    return {};
  }
}

// ── POST /api/admin/referral-import — parse + AI map + preview ────────────────
router.post("/admin/referral-import", requireAdmin, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const { headers, rows } = parseFile(req.file.buffer, req.file.originalname);

    if (rows.length === 0) {
      res.status(400).json({ error: "File is empty or has no data rows" });
      return;
    }

    const mapping = await aiMapColumns(headers, rows.slice(0, 20));

    // Return headers, mapping, preview (first 20 for display), and all rows for confirm
    res.json({
      headers,
      mapping,
      preview: rows.slice(0, 20),
      allRows: rows.slice(0, 1000), // cap at 1000 for payload safety
      totalRows: rows.length,
    });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: err.message || "Failed to process file" });
  }
});

// ── POST /api/admin/referral-import/confirm — insert mapped rows ─────────────
router.post("/admin/referral-import/confirm", requireAdmin, async (req, res) => {
  try {
    const { rows, mapping, skipDuplicates = true } = req.body as {
      rows: Record<string, string>[];
      mapping: FieldMapping;
      skipDuplicates: boolean;
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: "No rows to import" });
      return;
    }

    let added = 0;
    let skipped = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const row of rows) {
      try {
        const get = (field: TargetField): string => {
          const col = mapping[field];
          return col ? String(row[col] ?? "").trim() : "";
        };

        const name = get("facility_name");
        if (!name) { skipped++; continue; }

        const contact   = get("contact_name");
        const phone     = get("phone").replace(/[^\d+()\-. ]/g, "").trim();
        const email     = get("email").toLowerCase().trim();
        const city      = get("city");
        const state     = get("state");
        const streetAddr = get("address");
        const address   = [streetAddr, city, state].filter(Boolean).join(", ");
        const loc       = get("level_of_care");
        const notes     = [get("notes"), loc ? `Level of care: ${loc}` : ""].filter(Boolean).join("\n");

        // Duplicate check by name (case-insensitive)
        const [existing] = await db
          .select({ id: referralSources.id })
          .from(referralSources)
          .where(eq(referralSources.name, name))
          .limit(1);

        if (existing) {
          if (skipDuplicates) {
            skipped++;
            continue;
          }
          // Update existing
          await db.update(referralSources).set({
            contact: contact || undefined,
            phone: phone || undefined,
            email: email || undefined,
            address: address || undefined,
            notes: notes || undefined,
          }).where(eq(referralSources.id, existing.id));
          added++;
          continue;
        }

        await db.insert(referralSources).values({
          name,
          type: "other",
          contact: contact || null,
          phone: phone || null,
          email: email || null,
          address: address || null,
          notes: notes || null,
        });
        added++;
      } catch (rowErr: any) {
        failed++;
        errors.push(rowErr.message);
      }
    }

    await logAudit(req, `Referral source import: ${added} added, ${skipped} skipped, ${failed} failed`, "referral_source", null as any);

    res.json({ added, skipped, failed, errors: errors.slice(0, 5) });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: err.message || "Import failed" });
  }
});

export default router;
