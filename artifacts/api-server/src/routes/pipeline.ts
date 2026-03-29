import { Router } from "express";
import { db } from "@workspace/db";
import { pipelineStages, inquiries, users } from "@workspace/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { requireAuth } from "../lib/requireAuth";

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
    const stages = await db.select().from(pipelineStages).where(eq(pipelineStages.isActive, true)).orderBy(asc(pipelineStages.order));
    const allInquiries = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      status: inquiries.status,
      priority: inquiries.priority,
      assignedTo: inquiries.assignedTo,
      assignedToName: users.name,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .leftJoin(users, eq(inquiries.assignedTo, users.id))
    .where(eq(inquiries.status, "new"))
    .orderBy(desc(inquiries.createdAt));

    const statusMap: Record<string, string> = {
      "New Inquiry": "new",
      "Initial Contact": "contacted",
      "Insurance Verification": "qualified",
      "Clinical Assessment": "qualified",
      "Admissions Decision": "qualified",
    };

    const result = await Promise.all(stages.map(async stage => {
      const stageInquiries = await db.select({
        id: inquiries.id,
        firstName: inquiries.firstName,
        lastName: inquiries.lastName,
        status: inquiries.status,
        priority: inquiries.priority,
        assignedTo: inquiries.assignedTo,
        assignedToName: users.name,
        createdAt: inquiries.createdAt,
      })
      .from(inquiries)
      .leftJoin(users, eq(inquiries.assignedTo, users.id))
      .where(eq(inquiries.referralContact, `stage:${stage.id}`));

      const now = new Date();
      const cards = stageInquiries.map(inq => ({
        ...inq,
        daysInStage: Math.floor((now.getTime() - new Date(inq.createdAt!).getTime()) / 86400000),
      }));

      return { stage, inquiries: cards };
    }));

    const allInqs = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      status: inquiries.status,
      priority: inquiries.priority,
      assignedTo: inquiries.assignedTo,
      assignedToName: users.name,
      createdAt: inquiries.createdAt,
      updatedAt: inquiries.updatedAt,
    })
    .from(inquiries)
    .leftJoin(users, eq(inquiries.assignedTo, users.id))
    .where(eq(inquiries.status, "new"));

    const now = new Date();
    const defaultStageMap: Record<number, any[]> = {};
    stages.forEach((s, i) => { defaultStageMap[s.id] = []; });

    allInqs.forEach(inq => {
      if (stages[0]) {
        defaultStageMap[stages[0].id].push({
          ...inq,
          daysInStage: Math.floor((now.getTime() - new Date(inq.createdAt!).getTime()) / 86400000),
        });
      }
    });

    const contacted = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      status: inquiries.status,
      priority: inquiries.priority,
      assignedTo: inquiries.assignedTo,
      assignedToName: users.name,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .leftJoin(users, eq(inquiries.assignedTo, users.id))
    .where(eq(inquiries.status, "contacted"));

    const qualified = await db.select({
      id: inquiries.id,
      firstName: inquiries.firstName,
      lastName: inquiries.lastName,
      status: inquiries.status,
      priority: inquiries.priority,
      assignedTo: inquiries.assignedTo,
      assignedToName: users.name,
      createdAt: inquiries.createdAt,
    })
    .from(inquiries)
    .leftJoin(users, eq(inquiries.assignedTo, users.id))
    .where(eq(inquiries.status, "qualified"));

    const pipeline = stages.map((stage, i) => {
      let stageInquiries: any[] = [];
      if (i === 0) stageInquiries = allInqs.map(inq => ({ ...inq, daysInStage: Math.floor((now.getTime() - new Date(inq.createdAt!).getTime()) / 86400000) }));
      else if (i === 1) stageInquiries = contacted.map(inq => ({ ...inq, daysInStage: Math.floor((now.getTime() - new Date(inq.createdAt!).getTime()) / 86400000) }));
      else if (i >= 2) stageInquiries = qualified.filter((_, idx) => idx % (stages.length - 2) === i - 2).map(inq => ({ ...inq, daysInStage: Math.floor((now.getTime() - new Date(inq.createdAt!).getTime()) / 86400000) }));
      return { stage, inquiries: stageInquiries };
    });

    res.json(pipeline);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/pipeline/stages", async (req, res) => {
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

router.put("/pipeline/stages/reorder", async (req, res) => {
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

router.put("/pipeline/stages/:id", async (req, res) => {
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

router.delete("/pipeline/stages/:id", async (req, res) => {
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
