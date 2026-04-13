import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getRelevantMemory, buildMemorySummary } from './lib/memory';
import { generateDirectReply, generateMultiStepReply } from './lib/ollama';
import { ChatOpenAI } from '@langchain/openai';

const prisma = new PrismaClient();

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

type NormalizedRunInput = {
  message: string;
  mode: 'direct' | 'multi-step';
  model?: string;
  systemPrompt?: string;
  [key: string]: JsonValue | undefined;
};

const POLL_INTERVAL_MS = Number(process.env.EXECUTOR_POLL_INTERVAL_MS || 1500);

/**
 * -----------------------------
 * Database & Config Helpers
 * -----------------------------
 */
async function getQueuedRun() {
  return await prisma.run.findFirst({
    where: { status: 'queued' },
    orderBy: { createdAt: 'asc' },
  });
}

async function markRunStarted(runId: string) {
  await prisma.run.update({
    where: { id: runId },
    data: { status: 'running' },
  });
}

async function markRunCompleted(runId: string, result: JsonValue) {
  await prisma.run.update({
    where: { id: runId },
    data: { 
      status: 'completed',
      result: JSON.stringify(result)
    },
  });
}

async function markRunFailed(runId: string, errorMessage: string) {
  await prisma.run.update({
    where: { id: runId },
    data: { 
      status: 'failed',
      error: errorMessage
    },
  });
}

async function getRecentCompletedRuns(limit = 20) {
  return await prisma.run.findMany({
    where: { status: 'completed' },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

async function getCloudConfig() {
  const settings = await prisma.globalSettings.findUnique({ where: { id: 'global' } });
  if (!settings || !settings.apiKeys) return null;
  try {
    return JSON.parse(settings.apiKeys);
  } catch (e) {
    return null;
  }
}

/**
 * -----------------------------
 * Core Dispatch logic
 * -----------------------------
 */

function normalizeInput(input: string | null): NormalizedRunInput {
  const fallback: NormalizedRunInput = { message: '', mode: 'multi-step' };
  if (!input) return fallback;
  try {
    const raw = JSON.parse(input);
    return {
      ...raw,
      message: typeof raw.message === 'string' ? raw.message : '',
      mode: raw.mode === 'direct' ? 'direct' : 'multi-step',
      model: typeof raw.model === 'string' ? raw.model : undefined
    };
  } catch (e) {
    return fallback;
  }
}

async function processRunV4(run: any) {
  const normalized = normalizeInput(run.payload);
  const message = normalized.message.trim();
  const mode = normalized.mode;
  const targetModel = normalized.model || 'llama3';

  // 1. Fetch Context / Memory
  const recentRaw = await getRecentCompletedRuns(20);
  const previousRuns = recentRaw.map(r => ({ id: r.id, status: r.status, input: JSON.parse(r.payload || '{}') }));
  
  const steeringRules = normalized.contextSteering ? (typeof normalized.contextSteering === 'string' ? JSON.parse(normalized.contextSteering) : normalized.contextSteering) : null;

  const relevantMemory = getRelevantMemory(message, previousRuns, {
    maxItems: 5,
    minScore: 0.18,
    steeringRules: steeringRules
  });
  const memorySummary = buildMemorySummary(relevantMemory);

  // 2. Cloud Routing Check
  const cloudConfig = await getCloudConfig();
  const isOpenAI = targetModel.startsWith('gpt-');
  
  let finalOutput = '';
  let node = isOpenAI ? 'cloud-agent' : 'local-agent';

  if (isOpenAI && cloudConfig?.openai) {
    console.log(`[executor] Routing to OpenAI: ${targetModel}`);
    const llm = new ChatOpenAI({
      openAIApiKey: cloudConfig.openai,
      modelName: targetModel,
      temperature: 0.7
    });
    const prompt = normalized.systemPrompt 
      ? `${normalized.systemPrompt}\n\nUser: ${message}`
      : message;
    
    const response = await llm.invoke(prompt);
    finalOutput = response.content as string;
  } else {
    // Local / Ollama routing
    if (mode === 'direct') {
      finalOutput = await generateDirectReply({ message, memorySummary });
      node = 'direct-agent';
    } else {
      finalOutput = await generateMultiStepReply({ message, memorySummary, input: normalized });
      node = 'planner-agent';
    }
  }

  return {
    ok: true,
    mode,
    node,
    model: targetModel,
    input: normalized,
    memoryRunCount: relevantMemory.length,
    memorySummary,
    finalOutput,
    steps: [
      { 
        id: `step_mem_${Date.now()}`,
        node: 'memory', 
        status: 'completed',
        output: relevantMemory.length > 0 
          ? `🔍 Found ${relevantMemory.length} relevant context chunks:\n\n${relevantMemory.map((m, i) => `${i+1}. "${m.message.slice(0, 100)}..." (Score: ${m.score.toFixed(2)})`).join('\n')}`
          : '⚠️ No relevant historical context found for this query.'
      },
      { 
        id: `step_gen_${Date.now()}`,
        node, 
        status: 'completed',
        output: finalOutput 
      }
    ]
  };
}

async function loop() {
  console.log('[executor] Pro Worker started (Prisma Polling Active)');

  while (true) {
    try {
      const run = await getQueuedRun();
      if (run) {
        console.log(`[executor] Processing run ${run.id}...`);
        await markRunStarted(run.id);
        try {
          const result = await processRunV4(run);
          await markRunCompleted(run.id, result);
        } catch (error) {
          const errMsg = error instanceof Error ? error.message : String(error);
          await markRunFailed(run.id, errMsg);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (error) {
      console.error('[executor] loop error', error);
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }
  }
}

loop().catch((error) => {
  console.error('[executor] fatal error', error);
  process.exit(1);
});
