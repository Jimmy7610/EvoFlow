import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/rbac";

const allowedRunStatuses = ["queued", "running", "completed", "failed"] as const;
type AllowedRunStatus = (typeof allowedRunStatuses)[number];

export const runsRouter: Router = Router();

const CreateRunInputSchema = z.object({
  workflowId: z.string().uuid(),
  payload: z.record(z.unknown()).default({})
});

runsRouter.get("/", requireRole("admin", "operator", "viewer"), async (_req, res) => {
  const runs = await prisma.run.findMany({
    include: { workflow: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });

  res.json({ data: runs });
});

runsRouter.post("/", requireRole("admin", "operator"), async (req, res) => {
  const parsed = CreateRunInputSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid run payload", details: parsed.error.flatten() });
    return;
  }

  const run = await prisma.run.create({
    data: {
      workflowId: parsed.data.workflowId,
      payload: parsed.data.payload,
      status: "queued"
    }
  });

  res.status(201).json({ data: run });
});

runsRouter.patch("/:id/status", requireRole("admin", "operator"), async (req, res) => {
  const runId = req.params.id;
  const status = req.body?.status as AllowedRunStatus | undefined;

  if (!runId || !status || !allowedRunStatuses.includes(status)) {
    res.status(400).json({ error: "Invalid status update payload" });
    return;
  }

  const run = await prisma.run.update({
    where: { id: runId },
    data: {
      status,
      error: status === "failed" ? String(req.body?.error ?? "unknown") : null,
      result: status === "completed" ? (req.body?.result ?? {}) : undefined
    }
  });

  res.json({ data: run });
});
