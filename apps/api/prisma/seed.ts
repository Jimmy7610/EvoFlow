import { config } from "dotenv";
import { PrismaClient, RunStatus } from "@prisma/client";

config({ path: ".env" });
config({ path: "../.env" });
config({ path: "../../.env" });

const prisma = new PrismaClient();

async function main() {
  const workflow = await prisma.workflow.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Sample Workflow",
      description: "Validates scaffold and end-to-end API wiring"
    }
  });

  await prisma.run.create({
    data: {
      workflowId: workflow.id,
      status: RunStatus.queued,
      payload: { initiatedBy: "seed" }
    }
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
