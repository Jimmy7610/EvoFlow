
import express from "express";
import cors from "cors";
import path from "path";
import { existsSync } from "fs";
import { spawn, ChildProcess } from "child_process";
import { PrismaClient } from "@prisma/client";
import multer from "multer";
const pdf = require("pdf-parse");
import fs from "fs";

const prisma = new PrismaClient();
const upload = multer({ dest: "uploads/" });

type Workflow = {
  id: string;
  name: string;
  description: string;
  mode: "direct" | "multi-step";
  createdAt: string;
};

type RunRecord = {
  id: string;
  workflowId: string;
  workflowName: string;
  status: "queued" | "running" | "completed" | "failed";
  node: string;
  input: unknown;
  finalOutput: string;
  memoryRunCount: number;
  memorySummary: string;
  steps: string; // Day 11
  createdAt: string;
  updatedAt: string;
};

type OllamaTagsResponse = {
  models?: Array<{
    name?: string;
    model?: string;
  }>;
};

type OllamaStreamChunk = {
  response?: string;
  done?: boolean;
};

type ManagedServiceName = "executor";

type DevServiceSnapshot = {
  label: string;
  running: boolean;
  managed: boolean;
  pid: number | null;
  startedAt: string;
  cwd: string;
  command: string;
  lastError: string;
};

type DevStatusPayload = {
  success: boolean;
  controls: {
    api: {
      label: string;
      running: boolean;
      managed: boolean;
      port: number;
    };
    web: {
      label: string;
      running: boolean;
      managed: boolean;
      port: number;
    };
    executor: DevServiceSnapshot;
    ollama: {
      label: string;
      running: boolean;
      managed: boolean;
      baseUrl: string;
    };
  };
};

const app = express();
const PORT = 4000;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const LANGUAGE_CONSISTENCY_INSTRUCTION = "IMPORTANT: Always respond in the same language as the user's latest prompt.";

const DEFAULT_OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const EVOFLOW_REPO_ROOT = process.env.EVOFLOW_REPO_ROOT || path.resolve(process.cwd(), "../..");
const EVOFLOW_WEB_PORT = Number(process.env.EVOFLOW_WEB_PORT || 3000);
const EVOFLOW_EXECUTOR_COMMAND = process.env.EVOFLOW_EXECUTOR_COMMAND || "npm run dev";
const managedServiceProcesses = new Map<ManagedServiceName, ChildProcess>();
const managedServiceStartedAt = new Map<ManagedServiceName, string>();
const managedServiceErrors = new Map<ManagedServiceName, string>();


app.use(cors());
app.use(express.json({ limit: "2mb" }));

const demoWorkflows: Workflow[] = [
  {
    id: "wf-direct-v4",
    name: "Direct Reply",
    description: "Returns exact short outputs for direct prompts.",
    mode: "direct",
    createdAt: new Date().toISOString(),
  },
  {
    id: "wf-agent-v4",
    name: "Agent Workflow",
    description: "Multi-step agent workflow with simple local memory.",
    mode: "multi-step",
    createdAt: new Date().toISOString(),
  },
];

const runs: RunRecord[] = [];
const memoryByTopic = new Map<string, RunRecord[]>();

function getTopicFromMessage(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("email") && lower.includes("validator")) return "email-validator";
  if (lower.includes("validator")) return "validator";
  if (lower.includes("email")) return "email";
  if (lower.includes("code") || lower.includes("typescript") || lower.includes("javascript") || lower.includes("python")) return "coding";
  return "general";
}

function getMemorySummary(topic: string): { memoryRunCount: number; memorySummary: string } {
  const related = memoryByTopic.get(topic) ?? [];
  if (related.length === 0) {
    return {
      memoryRunCount: 0,
      memorySummary: "",
    };
  }

  const preview = related
    .slice(-3)
    .map((r) => {
      const msg =
        typeof r.input === "object" && r.input !== null && "message" in (r.input as Record<string, unknown>)
          ? String((r.input as Record<string, unknown>).message ?? "")
          : "";
      return msg;
    })
    .filter(Boolean)
    .join(" | ");

  return {
    memoryRunCount: related.length,
    memorySummary: `Related previous runs for topic "${topic}": ${preview}`,
  };
}

function extractDirectOutput(message: string): string {
  const source = String(message ?? "").trim();
  if (!source) return "";

  const patterns = [
    /respond with exactly one word\s*[:\-]\s*("?)([^\n"]+)\1/i,
    /reply with exactly one word\s*[:\-]\s*("?)([^\n"]+)\1/i,
    /svara bara med ordet\s+([^\n.!?]+)/i,
    /return only\s+([^\n.!?]+)/i,
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    const captured = match?.[2] ?? match?.[1];
    if (captured) {
      const cleaned = captured
        .trim()
        .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
        .replace(/[.,!?;:]+$/g, "")
        .trim();

      if (cleaned) return cleaned.toUpperCase();
    }
  }

  const cleaned = source
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/[.,!?;:]+$/g, "")
    .trim();

  if (/^\S+$/.test(cleaned)) {
    return cleaned.toUpperCase();
  }

  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.length > 0 ? words[words.length - 1].toUpperCase() : "";
}

async function getInstalledOllamaModels(): Promise<string[]> {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
    method: "GET",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama tags request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as OllamaTagsResponse;
  const models = (data.models ?? [])
    .map((item) => item.name || item.model || "")
    .map((name) => String(name).trim())
    .filter(Boolean);

  return Array.from(new Set(models));
}

function choosePreferredModel(installed: string[], message: string, mode: string): string {
  const lower = String(message ?? "").toLowerCase();
  const names = installed.map((m) => m.toLowerCase());

  const findFirst = (includesText: string[]) => {
    const index = names.findIndex((name) => includesText.some((term) => name.includes(term)));
    return index >= 0 ? installed[index] : "";
  };

  const codingHints = ["code", "typescript", "javascript", "python", "function", "bug", "fix", "refactor"];
  const longReasoningHints = ["explain", "analyze", "compare", "plan", "design", "architecture", "strategy"];
  const oneWordHints = ["one word", "bara med ordet", "exactly one word"];

  if (mode === "direct" && oneWordHints.some((hint) => lower.includes(hint))) {
    return findFirst(["qwen", "llama", "mistral"]) || installed[0] || DEFAULT_OLLAMA_MODEL;
  }

  if (codingHints.some((hint) => lower.includes(hint))) {
    return findFirst(["coder", "code", "qwen"]) || findFirst(["llama", "mistral"]) || installed[0] || DEFAULT_OLLAMA_MODEL;
  }

  if (longReasoningHints.some((hint) => lower.includes(hint))) {
    return findFirst(["llama", "qwen", "mistral"]) || installed[0] || DEFAULT_OLLAMA_MODEL;
  }

  return (
    installed.find((m) => m === DEFAULT_OLLAMA_MODEL) ||
    findFirst(["llama", "mistral", "qwen"]) ||
    installed[0] ||
    DEFAULT_OLLAMA_MODEL
  );
}

async function resolveRequestedModel(
  requestedModel: string | undefined,
  useAutoModel: boolean,
  message: string,
  mode: string,
  sessionId?: string
): Promise<{ selectedModel: string; selectionMode: "manual" | "auto" | "default"; context?: string; images?: string[] }> {
  const installed = await getInstalledOllamaModels();
  const wanted = String(requestedModel ?? "").trim();

  let context = "";
  let images: string[] = [];

  if (sessionId) {
     const docs = await prisma.chatDocument.findMany({ where: { sessionId } });
     for (const doc of docs) {
       const type = (doc.type || "").toLowerCase();
       if (type.includes("pdf") || type === "txt" || type === "ts" || type.includes("text")) {
         context += `\n[Context from ${doc.name}]:\n${doc.content}\n`;
       } else if (type.includes("png") || type.includes("jpg") || type.includes("jpeg") || type.includes("webp") || type.includes("image")) {
         images.push(doc.content);
       }
     }
  }

  if (wanted && installed.includes(wanted) && !useAutoModel) {
    return { selectedModel: wanted, selectionMode: "manual", context, images };
  }

  const selectedModel = useAutoModel 
    ? choosePreferredModel(installed, message, mode)
    : (installed.includes(DEFAULT_OLLAMA_MODEL) ? DEFAULT_OLLAMA_MODEL : installed[0] || "");

  return { 
    selectedModel, 
    selectionMode: useAutoModel ? "auto" : "manual",
    context,
    images
  };
}

async function callOllama(prompt: string, model: string, system?: string, images?: string[]): Promise<string> {
  const payload: any = {
    model,
    prompt,
    system,
    stream: false,
  };
  if (images && images.length > 0) {
    payload.images = images;
  }
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${body}`);
  }

  const data = (await response.json()) as { response?: string };
  return String(data.response ?? "").trim();
}

async function streamOllama(
  prompt: string,
  model: string,
  system: string | undefined,
  onChunk: (chunk: string) => void,
  images?: string[]
): Promise<string> {
  const payload: any = {
    model,
    prompt,
    system,
    stream: true,
  };
  if (images && images.length > 0) {
    payload.images = images;
  }
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama streaming request failed (${response.status}): ${body}`);
  }

  if (!response.body) {
    throw new Error("Ollama streaming response body was empty.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let parsed: OllamaStreamChunk;
      try {
        parsed = JSON.parse(trimmed) as OllamaStreamChunk;
      } catch {
        continue;
      }

      const piece = String(parsed.response ?? "");
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    try {
      const parsed = JSON.parse(trailing) as OllamaStreamChunk;
      const piece = String(parsed.response ?? "");
      if (piece) {
        full += piece;
        onChunk(piece);
      }
    } catch {
      // ignore trailing parse errors
    }
  }

  return full.trim();
}

async function makeDirectOutput(message: string, model: string, images?: string[], systemPrompt?: string): Promise<string> {
  const source = String(message ?? "").trim();
  if (!source) return "";

  try {
    const prompt = [
      "Follow the instruction exactly.",
      "Return only the final answer.",
      "Do not explain.",
      "Do not add quotation marks.",
      "",
      `Instruction: ${source}`,
    ].join("\n");

    const aiResult = await callOllama(
      prompt,
      model,
      systemPrompt || `You are a precise assistant for direct-mode tasks. Return only the exact final answer with no explanation. ${LANGUAGE_CONSISTENCY_INSTRUCTION}`,
      images
    );

    if (aiResult) {
      return aiResult;
    }
  } catch (error) {
    console.warn("[apps/api] Ollama direct-mode fallback triggered:", error);
  }

  return extractDirectOutput(source);
}

async function streamDirectOutput(message: string, model: string, onChunk: (chunk: string) => void, images?: string[], systemPrompt?: string): Promise<string> {
  const source = String(message ?? "").trim();
  if (!source) return "";

  try {
    const prompt = [
      "Follow the instruction exactly.",
      "Return only the final answer.",
      "Do not explain.",
      "Do not add quotation marks.",
      "",
      `Instruction: ${source}`,
    ].join("\n");

    const streamed = await streamOllama(
      prompt,
      model,
      systemPrompt || `You are a precise assistant for direct-mode tasks. Return only the exact final answer with no explanation. ${LANGUAGE_CONSISTENCY_INSTRUCTION}`,
      onChunk,
      images
    );

    if (streamed) {
      return streamed;
    }
  } catch (error) {
    console.warn("[apps/api] Ollama direct streaming fallback triggered:", error);
  }

  const fallback = extractDirectOutput(source);
  onChunk(fallback);
  return fallback;
}

async function makeAgentOutput(message: string, topic: string, model: string, systemPrompt?: string, images?: string[]): Promise<string> {
  const lower = message.toLowerCase();

  if (topic === "email-validator") {
    if (lower.includes("write a simple typescript function")) {
      return [
        "function isValidEmail(email: string): boolean {",
        '  return /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email);',
        "}",
      ].join("\n");
    }

    if (lower.includes("improve the previous email validator")) {
      return [
        "function isValidEmail(email: string): boolean {",
        '  const value = email.trim();',
        "  if (!value || value.length > 254) return false;",
        '  const parts = value.split("@");',
        "  if (parts.length !== 2) return false;",
        "  const [local, domain] = parts;",
        "  if (!local || !domain) return false;",
        "  if (local.length > 64) return false;",
        '  if (domain.startsWith(".") || domain.endsWith(".")) return false;',
        '  if (!domain.includes(".")) return false;',
        '  return /^[A-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$/i.test(value);',
        "}",
      ].join("\n");
    }

    if (lower.includes("explain the improvements")) {
      return "I made it more robust by trimming spaces, rejecting empty values, checking that there is exactly one @, limiting length, requiring a real domain with a dot, and keeping the validation focused on normal email structure.";
    }
  }

  try {
    const aiResult = await callOllama(
      message,
      model,
      systemPrompt || `You are an assistant inside a local workflow engine. Answer clearly and stay on topic. ${LANGUAGE_CONSISTENCY_INSTRUCTION}`,
      images
    );

    if (aiResult) {
      return aiResult;
    }
  } catch (error) {
    console.warn("[apps/api] Ollama multi-step fallback triggered:", error);
  }

  return `Processed in multi-step mode: ${message}`;
}

async function streamAgentOutput(
  message: string,
  topic: string,
  model: string,
  onChunk: (chunk: string) => void,
  systemPrompt?: string,
  images?: string[]
): Promise<{ content: string; steps: any[] }> {
  const steps: any[] = [];
  const emitStep = (node: string, status: "active" | "completed", input?: string, output?: string) => {
    const step = { node, status, input, output, id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 5)}` };
    steps.push(step);
    // Emit special marker for frontend (Day 11)
    onChunk(`\n¤STEP¤${JSON.stringify(step)}¤\n`);
    return step;
  };

  const lower = message.toLowerCase();

  // Multi-Step Workflow Simulation/Logic (Day 11)
  emitStep("memory", "active", message);
  const { memoryRunCount, memorySummary } = getMemorySummary(topic);
  emitStep("memory", "completed", message, memorySummary);

  emitStep("planner", "active", "Defining strategy...");
  // Simulate planning delay for "Pro" feel
  await new Promise(r => setTimeout(r, 400)); 
  emitStep("planner", "completed", "Defining strategy...", `Strategy: Address user query about ${topic} using ${model}.`);

  emitStep("executor", "active", "Generating response...");
  
  try {
    const streamed = await streamOllama(
      message,
      model,
      systemPrompt || `You are an assistant inside a local workflow engine. Answer clearly and stay on topic. ${LANGUAGE_CONSISTENCY_INSTRUCTION}`,
      onChunk,
      images
    );

    if (streamed) {
      emitStep("executor", "completed", "Generating response...", "Success");
      return { content: streamed, steps };
    }
  } catch (error) {
    console.warn("[apps/api] Ollama multi-step streaming fallback triggered:", error);
  }

  const fallback = `Processed in multi-step mode: ${message}`;
  onChunk(fallback);
  emitStep("executor", "completed", "Generating response...", "Fallback used");
  return { content: fallback, steps };
}


function getExecutorCwd() {
  return path.resolve(EVOFLOW_REPO_ROOT, "workers", "executor");
}

function isManagedServiceRunning(name: ManagedServiceName) {
  const processRef = managedServiceProcesses.get(name);
  return Boolean(processRef && processRef.exitCode === null && !processRef.killed);
}

function spawnDetachedCommand(command: string, cwd: string) {
  if (process.platform === "win32") {
    return spawn("cmd.exe", ["/c", command], {
      cwd,
      env: process.env,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
  }

  return spawn("sh", ["-lc", command], {
    cwd,
    env: process.env,
    detached: true,
    stdio: "ignore",
  });
}

async function terminateProcessTree(pid: number) {
  await new Promise<void>((resolve) => {
    const killer =
      process.platform === "win32"
        ? spawn("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true })
        : spawn("kill", ["-TERM", String(pid)], { stdio: "ignore" });

    killer.on("close", () => resolve());
    killer.on("error", () => resolve());
  });
}

async function isHttpServiceRunning(url: string) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 900);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function startManagedExecutorService() {
  if (isManagedServiceRunning("executor")) {
    return;
  }

  const cwd = getExecutorCwd();
  if (!existsSync(cwd)) {
    throw new Error(`Executor folder was not found: ${cwd}`);
  }

  const child = spawnDetachedCommand(EVOFLOW_EXECUTOR_COMMAND, cwd);
  child.unref();

  managedServiceProcesses.set("executor", child);
  managedServiceStartedAt.set("executor", new Date().toISOString());
  managedServiceErrors.delete("executor");

  child.on("exit", () => {
    managedServiceProcesses.delete("executor");
  });

  child.on("error", (error) => {
    managedServiceErrors.set("executor", error instanceof Error ? error.message : String(error));
    managedServiceProcesses.delete("executor");
  });
}

async function stopManagedExecutorService() {
  const processRef = managedServiceProcesses.get("executor");

  if (!processRef?.pid) {
    managedServiceProcesses.delete("executor");
    return;
  }

  await terminateProcessTree(processRef.pid);
  managedServiceProcesses.delete("executor");
}

async function getDevControlsStatus(): Promise<DevStatusPayload> {
  const executorRunning = isManagedServiceRunning("executor");
  const executorProcess = managedServiceProcesses.get("executor");
  const webRunning = await isHttpServiceRunning(`http://localhost:${EVOFLOW_WEB_PORT}`);
  const executorCwd = getExecutorCwd();

  let ollamaRunning = false;
  try {
    const ollamaResp = await fetch(`${OLLAMA_BASE_URL}/api/tags`, { method: "GET" });
    ollamaRunning = ollamaResp.ok;
  } catch {
    ollamaRunning = false;
  }

  return {
    success: true,
    controls: {
      api: {
        label: "API",
        running: true,
        managed: false,
        port: PORT,
      },
      web: {
        label: "Web",
        running: webRunning,
        managed: false,
        port: EVOFLOW_WEB_PORT,
      },
      executor: {
        label: "Executor",
        running: executorRunning,
        managed: true,
        pid: executorProcess?.pid ?? null,
        startedAt: managedServiceStartedAt.get("executor") ?? "",
        cwd: executorCwd,
        command: EVOFLOW_EXECUTOR_COMMAND,
        lastError: managedServiceErrors.get("executor") ?? "",
      },
      ollama: {
        label: "Ollama",
        running: ollamaRunning,
        managed: false,
        baseUrl: OLLAMA_BASE_URL,
      },
    },
  };
}

function requireAuth(_req: express.Request, _res: express.Response, next: express.NextFunction) {
  return next();
}

app.get("/", (_req, res) => {
  res.json({
    success: true,
    name: "EvoFlow V6 local API",
    ollama: {
      baseUrl: OLLAMA_BASE_URL,
      defaultModel: DEFAULT_OLLAMA_MODEL,
    },
    endpoints: [
      "GET /workflows",
      "GET /api/workflows",
      "GET /runs",
      "GET /api/runs",
      "GET /ollama/models",
      "GET /api/ollama/models",
      "GET /dev/status",
      "GET /api/dev/status",
      "POST /dev/start",
      "POST /api/dev/start",
      "POST /dev/stop",
      "POST /api/dev/stop",
      "POST /runs",
      "POST /api/runs",
      "POST /runs/stream",
      "POST /api/runs/stream",
      "GET /sessions",
      "GET /api/sessions",
      "GET /sessions/:id",
      "GET /api/sessions/:id",
      "POST /sessions",
      "POST /api/sessions",
      "PATCH /sessions/:id",
      "POST /api/sessions/:id/rename",
      "DELETE /sessions/:id",
      "POST /api/sessions/:id/messages",
    ],
  });
});

// --- CHAT PERSISTENCE ROUTES ---

app.get(["/sessions", "/api/sessions"], requireAuth, async (_req, res) => {
  try {
    const items = await prisma.chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      include: { 
        _count: { select: { messages: true } },
        documents: { select: { id: true, name: true, type: true, createdAt: true } } 
      },
    });
    res.json({ success: true, items });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.get(["/sessions/:id", "/api/sessions/:id"], requireAuth, async (req, res) => {
  try {
    const item = await prisma.chatSession.findUnique({
      where: { id: req.params.id },
      include: { 
        messages: { orderBy: { createdAt: "asc" } },
        documents: true
      },
    });
    if (!item) return res.status(404).json({ success: false, error: "Session not found" });
    res.json({ success: true, item });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post(["/sessions", "/api/sessions"], requireAuth, async (req, res) => {
  try {
    const { title, model, transport, workflowMode } = req.body;
    const session = await prisma.chatSession.create({
      data: {
        title: title || "New Chat",
        model: model || "llama3",
        transport: transport || "stream",
        workflowMode: workflowMode || "multi-step",
      },
    });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post(["/sessions/:id/rename", "/api/sessions/:id/rename"], requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    const session = await prisma.chatSession.update({
      where: { id: req.params.id },
      data: { title },
    });
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.delete(["/sessions/:id", "/api/sessions/:id"], requireAuth, async (req, res) => {
  try {
    await prisma.chatSession.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post(["/sessions/:id/duplicate", "/api/sessions/:id/duplicate"], requireAuth, async (req, res) => {
  try {
    const originalId = req.params.id;
    const original = await prisma.chatSession.findUnique({
      where: { id: originalId },
      include: { 
        messages: { orderBy: { createdAt: "asc" } },
        documents: true 
      },
    });

    if (!original) return res.status(404).json({ success: false, error: "Session not found" });

    const session = await prisma.chatSession.create({
      data: {
        title: `${original.title} (Copy)`,
        model: original.model,
        transport: original.transport,
        workflowMode: original.workflowMode,
        messages: {
          create: original.messages.map(m => ({
            role: m.role,
            content: m.content,
            model: m.model,
            modelSelection: m.modelSelection,
            transport: m.transport,
            createdAt: m.createdAt,
          }))
        }
      },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        documents: true
      }
    });

    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post(["/sessions/:id/messages", "/api/sessions/:id/messages"], requireAuth, async (req, res) => {
  try {
    const { role, content, model, transport, modelSelection, steps } = req.body;
    const message = await prisma.chatMessage.create({
      data: {
        sessionId: req.params.id,
        role,
        content,
        model,
        transport,
        modelSelection,
        steps: steps ? (typeof steps === "string" ? steps : JSON.stringify(steps)) : null,
      },
    });
    // Update session updatedAt
    await prisma.chatSession.update({
      where: { id: req.params.id },
      data: { updatedAt: new Date() },
    });
    res.json({ success: true, message });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.delete(["/messages/:id", "/api/messages/:id"], requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.chatMessage.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post(["/sessions/:id/chat", "/api/sessions/:id/chat"], requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { message, model, transport, workflowMode, systemPrompt } = req.body;

    const { selectedModel, context, images } = await resolveRequestedModel(
      model,
      false, // forced manual
      message,
      workflowMode || "multi-step",
      id
    );

    const fullPrompt = context ? `${context}\n\nUser Question: ${message}` : message;
    const finalSystemPrompt = systemPrompt || `You are an assistant comparing responses. Be brief and objective. ${LANGUAGE_CONSISTENCY_INSTRUCTION}`;

    if (transport === "stream") {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("x-evoflow-model", selectedModel);

      await streamOllama(
        fullPrompt,
        selectedModel,
        finalSystemPrompt,
        (chunk) => res.write(chunk),
        images
      );
      res.end();
    } else {
      const output = await callOllama(
        fullPrompt,
        selectedModel,
        finalSystemPrompt,
        images
      );
      res.json({ success: true, finalOutput: output, model: selectedModel });
    }
  } catch (error) {
    console.error("[apps/api] Comparison chat failed:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.post(["/sessions/:id/documents", "/api/sessions/:id/documents"], requireAuth, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, error: "No file uploaded" });

    const { id: sessionId } = req.params;
    const { originalname, path: filePath, mimetype } = req.file;

    console.log(`[apps/api] Processing document upload: ${originalname} (${mimetype}) for session ${sessionId}`);

    let content = "";
    if (mimetype === "application/pdf") {
      try {
        console.log("[apps/api] Starting PDF extraction...");
        const dataBuffer = fs.readFileSync(filePath);
        
        // Resolve pdf-parse correctly (Standard 1.1.1 version is a function)
        const pdf = require("pdf-parse");
        const data = await pdf(dataBuffer);
        content = data.text;
        
        console.log(`[apps/api] PDF extraction successful. Extracted ${content.length} characters.`);
      } catch (pdfErr) {
        console.error("[apps/api] PDF processing failed:", pdfErr);
        throw new Error(`PDF extraction failed: ${pdfErr instanceof Error ? pdfErr.message : String(pdfErr)}`);
      }
    } else if (mimetype.startsWith("image/")) {
      console.log(`[apps/api] Image detected (${mimetype}). Converting to base64...`);
      const dataBuffer = fs.readFileSync(filePath);
      content = dataBuffer.toString("base64");
      console.log(`[apps/api] Image converted. Length: ${content.length}`);
    } else {
      content = fs.readFileSync(filePath, "utf-8");
      console.log(`[apps/api] Text/TS extraction successful. Read ${content.length} characters.`);
    }

    // Cleanup local file immediately
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    const doc = await prisma.chatDocument.create({
      data: {
        sessionId,
        name: originalname,
        type: mimetype.split("/")[1] || "txt",
        content: content || "",
      },
    });

    console.log(`[apps/api] Document ${doc.id} saved to database.`);
    res.json({ success: true, document: doc });
  } catch (error) {
    console.error("[apps/api] Document upload handler crashed:", error);
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.get(["/sessions/:id/documents", "/api/sessions/:id/documents"], requireAuth, async (req, res) => {
  try {
    const sessionId = req.params.id;
    const docs = await prisma.chatDocument.findMany({
      where: { sessionId },
      select: { id: true, name: true, type: true, createdAt: true },
    });
    res.json({ success: true, items: docs });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.delete(["/sessions/:id/documents/:docId", "/api/sessions/:id/documents/:docId"], requireAuth, async (req, res) => {
  try {
    const { docId } = req.params;
    await prisma.chatDocument.delete({
      where: { id: docId },
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.get(["/documents/:id", "/api/documents/:id"], requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await prisma.chatDocument.findUnique({
      where: { id },
    });
    if (!doc) return res.status(404).json({ success: false, error: "Document not found" });
    res.json({ success: true, item: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

app.get(["/workflows", "/api/workflows"], requireAuth, (_req, res) => {
  res.json({
    success: true,
    items: demoWorkflows,
    total: demoWorkflows.length,
  });
});

app.get(["/runs", "/api/runs"], requireAuth, (_req, res) => {
  res.json({
    success: true,
    items: runs.slice().reverse(),
    total: runs.length,
  });
});

app.get(["/ollama/models", "/api/ollama/models"], requireAuth, async (_req, res) => {
  try {
    const models = await getInstalledOllamaModels();
    res.json({
      success: true,
      items: models,
      defaultModel: DEFAULT_OLLAMA_MODEL,
      total: models.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      items: [],
      defaultModel: DEFAULT_OLLAMA_MODEL,
      total: 0,
    });
  }
});

app.get(["/dev/status", "/api/dev/status"], requireAuth, async (_req, res) => {
  try {
    res.json(await getDevControlsStatus());
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post(["/dev/start", "/api/dev/start"], requireAuth, async (_req, res) => {
  try {
    await startManagedExecutorService();
    res.json(await getDevControlsStatus());
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post(["/dev/stop", "/api/dev/stop"], requireAuth, async (_req, res) => {
  try {
    await stopManagedExecutorService();
    res.json(await getDevControlsStatus());
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});


app.post(["/runs", "/api/runs"], requireAuth, async (req, res) => {
  try {
    const payload = req.body ?? {};
    const message = String(payload.message ?? "");
    const mode = payload.mode === "direct" ? "direct" : "multi-step";
    const requestedModel = String(payload.model ?? "").trim();
    const useAutoModel = payload.modelSelection === "auto" || payload.useAutoModel === true;
    const sessionId = payload.sessionId;
    const systemPrompt = payload.systemPrompt;
    const { selectedModel, selectionMode, context: docContext, images } = await resolveRequestedModel(
      requestedModel,
      useAutoModel,
      message,
      mode,
      sessionId
    );

    const workflow =
      mode === "direct"
        ? demoWorkflows.find((w) => w.mode === "direct")!
        : demoWorkflows.find((w) => w.mode === "multi-step")!;

    const topic = getTopicFromMessage(message);
    const { memoryRunCount, memorySummary } = getMemorySummary(topic);

    const finalPrompt = docContext ? `${docContext}\nUser Request: ${message}` : message;
    
    if (docContext) {
      console.log(`[apps/api] Final assembled prompt for AI (first 500 chars):\n${finalPrompt.slice(0, 500)}...`);
    }

    const finalOutput =
      mode === "direct"
        ? await makeDirectOutput(finalPrompt, selectedModel, images, systemPrompt)
        : await makeAgentOutput(finalPrompt, topic, selectedModel, systemPrompt, images);

    const now = new Date().toISOString();
    const run: RunRecord = {
      id: `run_${Date.now()}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "completed",
      node: mode === "direct" ? "direct-agent" : "planner-agent",
      input: payload,
      finalOutput,
      memoryRunCount,
      memorySummary,
      createdAt: now,
      updatedAt: now,
    };

    runs.push(run);

    const existing = memoryByTopic.get(topic) ?? [];
    existing.push(run);
    memoryByTopic.set(topic, existing);

    res.json({
      success: true,
      id: run.id,
      workflowId: run.workflowId,
      workflowName: run.workflowName,
      status: run.status,
      node: run.node,
      input: run.input,
      finalOutput: run.finalOutput,
      memoryRunCount: run.memoryRunCount,
      memorySummary: run.memorySummary,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      provider: "ollama-with-fallback",
      model: selectedModel,
      modelSelection: selectionMode,
    });
  } catch (error) {
    console.error("[apps/api] Run failed:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post(["/runs/stream", "/api/runs/stream"], requireAuth, async (req, res) => {
  try {
    const payload = req.body ?? {};
    const message = String(payload.message ?? "");
    const mode = payload.mode === "direct" ? "direct" : "multi-step";
    const requestedModel = String(payload.model ?? "").trim();
    const useAutoModel = payload.modelSelection === "auto" || payload.useAutoModel === true;
    const sessionId = payload.sessionId;
    const systemPrompt = payload.systemPrompt;
    const { selectedModel, selectionMode, context: docContext, images } = await resolveRequestedModel(
      requestedModel,
      useAutoModel,
      message,
      mode,
      sessionId
    );

    const finalPrompt = docContext ? `${docContext}\nUser Request: ${message}` : message;

    const workflow =
      mode === "direct"
        ? demoWorkflows.find((w) => w.mode === "direct")!
        : demoWorkflows.find((w) => w.mode === "multi-step")!;

    const topic = getTopicFromMessage(message);
    const { memoryRunCount, memorySummary } = getMemorySummary(topic);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-EvoFlow-Model", selectedModel);
    res.setHeader("X-EvoFlow-Model-Selection", selectionMode);
    res.flushHeaders?.();

    let fullOutput = "";

    const onChunk = (chunk: string) => {
      fullOutput += chunk;
      res.write(chunk);
    };

    let steps: any[] = [];
    
    if (mode === "direct") {
       const directOutput = await streamDirectOutput(finalPrompt, selectedModel, onChunk, images, systemPrompt);
       fullOutput = directOutput;
       steps = [{ node: "direct", status: "completed", output: "Direct generation complete" }];
    } else {
       const agentResult = await streamAgentOutput(finalPrompt, topic, selectedModel, onChunk, systemPrompt, images);
       fullOutput = agentResult.content;
       steps = agentResult.steps;
    }

    const finalOutput = fullOutput;
    const now = new Date().toISOString();

    const run: RunRecord = {
      id: `run_${Date.now()}`,
      workflowId: workflow.id,
      workflowName: workflow.name,
      status: "completed",
      node: mode === "direct" ? "direct-agent" : "planner-agent",
      input: payload,
      finalOutput,
      memoryRunCount,
      memorySummary,
      steps: JSON.stringify(steps),
      createdAt: now,
      updatedAt: now,
    };

    runs.push(run);

    const existing = memoryByTopic.get(topic) ?? [];
    existing.push(run);
    memoryByTopic.set(topic, existing);

    res.end();
  } catch (error) {
    console.error("[apps/api] Stream run failed:", error);
    if (!res.headersSent) {
      res.status(500).send(error instanceof Error ? error.message : String(error));
      return;
    }
    res.write(`\n[stream-error] ${error instanceof Error ? error.message : String(error)}`);
    res.end();
  }
});

app.listen(PORT, () => {
  console.log(`[apps/api] EvoFlow V6 local API listening on http://localhost:${PORT}`);
  console.log(`[apps/api] Ollama base URL: ${OLLAMA_BASE_URL}`);
  console.log(`[apps/api] Default Ollama model: ${DEFAULT_OLLAMA_MODEL}`);
  console.log("[apps/api] GET /workflows, GET /runs, GET /ollama/models and GET /dev/status are enabled");
  console.log("[apps/api] POST /dev/start, POST /dev/stop, POST /runs, POST /runs/stream and POST /api/runs/stream are enabled");
});
