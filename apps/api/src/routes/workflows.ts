import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { requireRole } from "../middleware/rbac";

export const workflowsRouter: Router = Router();

const CreateWorkflowInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional()
});

workflowsRouter.get("/", requireRole("admin", "operator", "viewer"), async (_req, res) => {
  const workflows = await prisma.workflow.findMany({
    orderBy: { createdAt: "desc" }
  });

  res.json({ data: workflows });
});

workflowsRouter.post("/", requireRole("admin", "operator"), async (req, res) => {
  const parsed = CreateWorkflowInputSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid workflow payload", details: parsed.error.flatten() });
    return;
  }

  const workflow = await prisma.workflow.create({ data: parsed.data });
  res.status(201).json({ data: workflow });
});
