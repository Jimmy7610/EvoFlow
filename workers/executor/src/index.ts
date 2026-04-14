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

  // 2. Fetch Session Documents (for Vision)
  let images: string[] = [];
  if (run.sessionId) {
    const docs = await prisma.chatDocument.findMany({
      where: { 
        sessionId: run.sessionId,
        type: { in: ['png', 'jpg', 'jpeg', 'bmp', 'gif', 'webp', 'image'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 1
    });

    if (docs.length > 0) {
      const lastImg = docs[0];
      console.log(`[executor] Vision Triggered! Processing most recent image: ${lastImg.name}`);
      
      const rawBase64 = lastImg.content && lastImg.content.includes(';base64,') 
        ? lastImg.content.split(';base64,')[1] 
        : (lastImg.content || '');
        
      if (rawBase64) {
        images = [rawBase64];
        console.log(`[executor] Cleaned base64 length: ${rawBase64.length}`);
      }
    }
  }

  // 3. Image Generation Detection
  const isImageGen = message.toLowerCase().includes('generate an image') || 
                     message.toLowerCase().includes('rita en bild') || 
                     message.toLowerCase().includes('create an image');

  // 4. Cloud Routing Check
  const cloudConfig = await getCloudConfig();
  const isOpenAI = targetModel.startsWith('gpt-');
  
  let finalOutput = '';
  let node = isOpenAI ? 'cloud-agent' : 'local-agent';

  if (isImageGen && cloudConfig?.openai) {
    console.log(`[executor] Triggering Image Generation: ${message}`);
    node = 'image-generator';
    try {
      const { generateImage } = await import('./lib/imageGen');
      const imageUrl = await generateImage(message, cloudConfig.openai);
      finalOutput = `🎨 **Generated Image:**\n\n![Generated Image](${imageUrl})\n\nPrompt used: *${message}*`;
    } catch (err) {
      finalOutput = `❌ Failed to generate image: ${err instanceof Error ? err.message : String(err)}`;
    }
  } else if (isOpenAI && cloudConfig?.openai) {
    console.log(`[executor] Routing to OpenAI: ${targetModel}`);
    const llm = new ChatOpenAI({
      openAIApiKey: cloudConfig.openai,
      modelName: targetModel,
      temperature: 0.7
    });
    
    // Convert to messages array for vision if needed
    let content: any = message;
    if (images.length > 0) {
      content = [
        { type: 'text', text: message },
        ...images.map(img => ({
          type: 'image_url',
          image_url: { url: `data:image/png;base64,${img}` }
        }))
      ];
    }

    const response = await llm.invoke(content);
    finalOutput = response.content as string;
  } else {
    // Local / Ollama routing
    if (mode === 'direct') {
      finalOutput = await generateDirectReply({ message, memorySummary }, images);
      node = 'direct-agent';
    } else {
      finalOutput = await generateMultiStepReply({ message, memorySummary, input: normalized }, images);
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
  console.log('[executor] Pro Worker v2.0 - Stabilizing boot...');
  
  // Day 21: Verify DB Connection before loop
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('[executor] Database connection verified.');
  } catch (err) {
    console.error('[executor] Failed to connect to database on startup:', err);
    throw err; // Allow fatal catch to handle restart via API
  }

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
          console.error(`[executor] Error processing run ${run.id}:`, errMsg);
          await markRunFailed(run.id, errMsg);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }
    } catch (error) {
      console.error('[executor] Loop iteration error:', error);
      // Wait a bit longer on loop errors (e.g. DB down) to avoid spamming
      await new Promise((resolve) => setTimeout(resolve, Math.max(POLL_INTERVAL_MS, 5000)));
    }
  }
}

loop().catch((error) => {
  console.error('[executor] FATAL ERROR - Engine Shutting Down:', error);
  process.exit(1);
});
