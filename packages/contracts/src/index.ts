import { z } from "zod";

export const RoleSchema = z.enum(["admin", "operator", "viewer"]);
export type Role = z.infer<typeof RoleSchema>;

export const WorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const CreateWorkflowInputSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(2000).optional()
});

export const RunStatusSchema = z.enum(["queued", "running", "completed", "failed"]);

export const RunSchema = z.object({
  id: z.string().uuid(),
  workflowId: z.string().uuid(),
  status: RunStatusSchema,
  payload: z.record(z.unknown()).optional(),
  result: z.record(z.unknown()).optional(),
  error: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const CreateRunInputSchema = z.object({
  workflowId: z.string().uuid(),
  payload: z.record(z.unknown()).default({})
});

export type Workflow = z.infer<typeof WorkflowSchema>;
export type CreateWorkflowInput = z.infer<typeof CreateWorkflowInputSchema>;
export type Run = z.infer<typeof RunSchema>;
export type CreateRunInput = z.infer<typeof CreateRunInputSchema>;
