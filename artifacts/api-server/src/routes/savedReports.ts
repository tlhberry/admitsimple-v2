import { Router } from "express";
import { db, pool } from "@workspace/db";
import { savedReports, users } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

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

// List saved reports for current user (admin sees all)
router.get("/saved-reports", async (req, res) => {
  try {
    const sess = req.session as any;
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
      .orderBy(desc(savedReports.createdAt));
    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Save a new report
router.post("/saved-reports", async (req, res) => {
  try {
    const sess = req.session as any;
    const { name, sqlQuery, columns, visualizationType } = req.body;
    if (!name || !sqlQuery) {
      res.status(400).json({ error: "name and sqlQuery are required" }); return;
    }
    const err = validateSql(sqlQuery);
    if (err) { res.status(400).json({ error: err }); return; }

    const [row] = await db.insert(savedReports).values({
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

// Run a saved report (execute stored SQL, no AI)
router.post("/saved-reports/:id/run", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [report] = await db.select().from(savedReports).where(eq(savedReports.id, id));
    if (!report) { res.status(404).json({ error: "Not found" }); return; }

    const err = validateSql(report.sqlQuery);
    if (err) { res.status(400).json({ error: err }); return; }

    const result = await pool.query(report.sqlQuery);
    const columns: string[] = result.fields.map((f: any) => f.name);
    const rows: any[][] = result.rows.map((row: any) => columns.map((col: string) => row[col]));
    res.json({ columns, rows, rowCount: rows.length });
  } catch (err: any) {
    req.log.error(err);
    res.status(500).json({ error: err.message || "Query failed" });
  }
});

// Delete a saved report
router.delete("/saved-reports/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(savedReports).where(eq(savedReports.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
