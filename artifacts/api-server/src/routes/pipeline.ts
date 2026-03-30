import { Router } from "express";
import { db } from "@workspace/db";
import { pipelineStages, inquiries, users } from "@workspace/db/schema";
import { eq, asc, desc, notInArray } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";
import { requireAdmin } from "../lib/requireAdmin";

const router = Router();
router.use(requireAuth);

router.get("/pipeline/stages", async (req, res) => {
  try {
    const stages = await db.select().from(pipelineStages).orderBy(asc(pipelineStages.order));
    res.json(stages);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/pipeline/inquiries", async (req, res) => {
  try {
    const stages = await db
      .select()
      .from(pipelineStages)
      .where(eq(pipelineStages.isActive, true))
      .orderBy(asc(pipelineStages.order));

    // Statuses that mean the inquiry is no longer in the active pipeline
    // Note: lowercase "admitted"/"discharged" = old legacy statuses; title-case are pipeline stages
    const excludedStatuses = ["admitted", "declined", "closed", "converted", "Non-Viable", "Referred Out"];

    // Fetch all active inquiries (exclude end-stage statuses)
    const allInquiries = await db
      .select({
        id: inquiries.id,
        firstName: inquiries.firstName,
        lastName: inquiries.lastName,
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
      .where(notInArray(inquiries.status, excludedStatuses))
      .orderBy(desc(inquiries.updatedAt));

    // Map legacy lowercase statuses to the canonical stage name so they
    // still appear correctly after the pipeline stages were renamed.
    const legacyStatusToStageName: Record<string, string> = {
      "new": "New Inquiry",
      "contacted": "Initial Contact",
      "qualified": "Insurance Verification",
      "Clinical Assessment": "Scheduled to Admit", // renamed stage
      "Admissions Decision": "Admitted",           // renamed stage
      "Did Not Admit": "Did Not Admit",            // explicit pass-through
      // anything that already equals a stage name passes through below
    };

    // Build a Set of all active stage names for O(1) lookup
    const stageNames = new Set(stages.map(s => s.name));

    // For each inquiry, resolve its effective stage name
    const resolveStage = (status: string): string => {
      if (stageNames.has(status)) return status;           // exact match (post-drag)
      return legacyStatusToStageName[status] ?? "New Inquiry"; // legacy fallback
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
    const data = req.body;
    const [row] = await db.insert(pipelineStages).values({
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
    const { stages } = req.body;
    for (const s of stages) {
      await db.update(pipelineStages).set({ order: s.order }).where(eq(pipelineStages.id, s.id));
    }
    res.json({ message: "Reordered" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/pipeline/stages/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const update: any = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.order !== undefined) update.order = data.order;
    if (data.color !== undefined) update.color = data.color;
    if (data.description !== undefined) update.description = data.description;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    const [row] = await db.update(pipelineStages).set(update).where(eq(pipelineStages.id, id)).returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/pipeline/stages/:id", requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(pipelineStages).where(eq(pipelineStages.id, id));
    res.json({ message: "Deleted" });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
