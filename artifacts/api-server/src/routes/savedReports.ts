import { Router } from "express";
import { db, pool } from "@workspace/db";
import { savedReports, users } from "@workspace/db/schema";
import { eq, desc, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();
router.use(requireAuth);

const FORBIDDEN = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "CREATE", "GRANT", "REVOKE"];

function validateSql(sql: string): string | null {
  const upper = sql.toUpperCase();
  for (const kw of FORBIDDEN) {
    if (new RegExp(`\\b${kw}\\b`).test(upper)) return `Forbidden keyword: ${kw}`;
  }
  if (!upper.trimStart().startsWith("SELECT")) return "Only SELECT queries allowed";
  return null;
}

router.get("/saved-reports", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const rows = await db
      .select({
        id: savedReports.id,
        name: savedReports.name,
        userId: savedReports.userId,
        sqlQuery: savedReports.sqlQuery,
        columns: savedReports.columns,
        visualizationType: savedReports.visualizationType,
        createdAt: savedReports.createdAt,
        updatedAt: savedReports.updatedAt,
        createdByName: users.name,
      })
      .from(savedReports)
      .leftJoin(users, eq(savedReports.userId, users.id))
      .where(eq(savedReports.companyId, companyId))
      .orderBy(desc(savedReports.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/saved-reports", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const sess = req.session as any;
    const { name, sqlQuery, columns, visualizationType } = req.body;
    if (!name || !sqlQuery) { res.status(400).json({ error: "name and sqlQuery are required" }); return; }
    const err = validateSql(sqlQuery);
    if (err) { res.status(400).json({ error: err }); return; }

    const [row] = await db.insert(savedReports).values({
      companyId,
      name,
      userId: sess.userId,
      sqlQuery,
      columns: columns ?? null,
      visualizationType: visualizationType ?? "table",
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/saved-reports/:id/run", async (req, res) => {
  const client = await pool.connect();
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const [report] = await db
      .select()
      .from(savedReports)
      .where(and(eq(savedReports.id, id), eq(savedReports.companyId, companyId)));
    if (!report) { res.status(404).json({ error: "Not found" }); return; }

    const sqlErr = validateSql(report.sqlQuery);
    if (sqlErr) { res.status(400).json({ error: sqlErr }); return; }

    // ── Isolated execution via RLS ────────────────────────────────────────────
    // Switch to the non-superuser reports_reader role so Postgres RLS policies
    // apply and enforce company_id isolation at the database level.
    // SET LOCAL scopes both the role switch and the session variable to this
    // transaction, which we always roll back (it's read-only).
    await client.query("BEGIN");
    await client.query("SET LOCAL ROLE reports_reader");
    await client.query(`SET LOCAL app.current_company_id = ${companyId}`);

    const result = await client.query(report.sqlQuery);

    // Always roll back — the query is SELECT-only but we want no side effects.
    await client.query("ROLLBACK");

    const columns: string[] = result.fields.map((f: any) => f.name);
    const rows: any[][] = result.rows.map((row: any) => columns.map((col) => row[col]));
    res.json({ columns, rows, rowCount: rows.length });
  } catch (err: any) {
    // Ensure transaction is always cleaned up on error
    try { await client.query("ROLLBACK"); } catch { /* ignore */ }
    req.log.error(err);
    res.status(500).json({ error: err.message || "Query failed" });
  } finally {
    client.release();
  }
});

router.delete("/saved-reports/:id", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    await db.delete(savedReports).where(and(eq(savedReports.id, id), eq(savedReports.companyId, companyId)));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
