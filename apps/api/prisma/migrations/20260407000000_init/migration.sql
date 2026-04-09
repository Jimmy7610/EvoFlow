-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'operator', 'viewer');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'completed', 'failed');

-- CreateTable
CREATE TABLE "User" (
  "id" UUID NOT NULL,
  "email" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'viewer',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workflow" (
  "id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Run" (
  "id" UUID NOT NULL,
  "workflowId" UUID NOT NULL,
  "status" "RunStatus" NOT NULL DEFAULT 'queued',
  "payload" JSONB,
  "result" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Run_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Run_workflowId_idx" ON "Run"("workflowId");
CREATE INDEX "Run_status_idx" ON "Run"("status");

ALTER TABLE "Run" ADD CONSTRAINT "Run_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;
