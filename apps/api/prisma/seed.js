"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const client_1 = require("@prisma/client");
(0, dotenv_1.config)({ path: ".env" });
(0, dotenv_1.config)({ path: "../.env" });
(0, dotenv_1.config)({ path: "../../.env" });
const prisma = new client_1.PrismaClient();
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
            status: client_1.RunStatus.queued,
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
//# sourceMappingURL=seed.js.map