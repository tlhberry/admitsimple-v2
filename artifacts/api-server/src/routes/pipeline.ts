import { Router } from "express";
import { db } from "@workspace/db";
import { pipelineStages, inquiries, users } from "@workspace/db/schema";
import { eq, asc, desc, notInArray, and } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { requireAdmin } from "../lib/requireAdmin";
import { getCompanyId } from "../lib/getCompanyId";

const router = Router();
router.use(requireAuth);

router.get("/pipeline/stages", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const stages = await db.select().from(pipelineStages).where(eq(pipelineStages.companyId, companyId)).orderBy(asc(pipelineStages.order));
    res.json(stages);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pipeline/inquiries", async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const stages = await db
      .select()
      .from(pipelineStages)
      .where(and(eq(pipelineStages.isActive, true), eq(pipelineStages.companyId, companyId)))
      .orderBy(asc(pipelineStages.order));

    const excludedStatuses = ["admitted", "declined", "closed", "converted", "Non-Viable", "Referred Out"];

    const allInquiries = await db
      .select({
        id: inquiries.id,
        firstName: inquiries.firstName,
        lastName: inquiries.lastName,
        phone: inquiries.phone,
        status: inquiries.status,
        priority: inquiries.priority,
        assignedTo: inquiries.assignedTo,
        assignedToName: users.name,
        appointmentDate: inquiries.appointmentDate,
        createdAt: inquiries.createdAt,
        updatedAt: inquiries.updatedAt,
      })
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(and(eq(inquiries.companyId, companyId), notInArray(inquiries.status, excludedStatuses)))
      .orderBy(desc(inquiries.updatedAt));

    const legacyStatusToStageName: Record<string, string> = {
      "new": "New Inquiry",
      "contacted": "Initial Contact",
      "qualified": "Insurance Verification",
      "Clinical Assessment": "Scheduled to Admit",
      "Admissions Decision": "Admitted",
      "Did Not Admit": "Did Not Admit",
    };

    const stageNames = new Set(stages.map(s => s.name));
    const resolveStage = (status: string): string => {
      if (stageNames.has(status)) return status;
      return legacyStatusToStageName[status] ?? "New Inquiry";
    };

    const now = new Date();
    const pipeline = stages.map(stage => {
      const stageInquiries = allInquiries
        .filter(inq => resolveStage(inq.status) === stage.name)
        .map(inq => ({
          ...inq,
          daysInStage: Math.floor(
            (now.getTime() - new Date(inq.updatedAt ?? inq.createdAt!).getTime()) / 86400000
          ),
        }));
      return { stage, inquiries: stageInquiries };
    });

    res.json(pipeline);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/pipeline/stages", requireAdmin, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const data = req.body;
    const [row] = await db.insert(pipelineStages).values({
      companyId,
      name: data.name,
      order: data.order,
      color: data.color || "#3B82F6",
      description: data.description,
    }).returning();
    res.status(201).json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/pipeline/stages/reorder", requireAdmin, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const { stages } = req.body;
    for (const s of stages) {
      await db.update(pipelineStages).set({ order: s.order }).where(and(eq(pipelineStages.id, s.id), eq(pipelineStages.companyId, companyId)));
    }
    res.json({ message: "Reordered" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/pipeline/stages/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    const data = req.body;
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.order !== undefined) update.order = data.order;
    if (data.color !== undefined) update.color = data.color;
    if (data.description !== undefined) update.description = data.description;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    const [row] = await db.update(pipelineStages).set(update).where(and(eq(pipelineStages.id, id), eq(pipelineStages.companyId, companyId))).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/pipeline/stages/:id", requireAdmin, async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const id = parseInt(req.params.id);
    await db.delete(pipelineStages).where(and(eq(pipelineStages.id, id), eq(pipelineStages.companyId, companyId)));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
